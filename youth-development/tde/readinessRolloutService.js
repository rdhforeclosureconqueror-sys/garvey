"use strict";

const { summarizeAdherence } = require("./adherenceService");
const { CALIBRATION_VARIABLES } = require("./constants");
const { resolveVoiceRolloutMode } = require("./voicePilotService");

function toConfidenceImpact(adherence) {
  return adherence.adherence_status === "WEAK"
    ? `REDUCE_CONFIDENCE_${CALIBRATION_VARIABLES.intervention_engine.adherence_confidence_penalty_multiplier}`
    : "NO_REDUCTION";
}

function evaluateInterventionReadiness(snapshot = {}, commitmentPlan = null, sessions = []) {
  const checkinContext = snapshot.checkin_context || {};
  const adherence = summarizeAdherence(commitmentPlan, sessions);

  const interventionDataPresent = sessions.length > 0;
  const hasCommitmentPlan = Boolean(commitmentPlan);
  const adherenceSufficient = adherence.adherence_percentage >= 45;
  const sessionCompletionSufficient = adherence.full_session_completion_rate >= 0.6;
  const checkinHistoryPresent = checkinContext.history_count >= 1;
  const checkinConsistencySufficient = checkinContext.consistency_status !== "limited";
  const checkinTraceabilityComplete = checkinContext.traceability_status !== "limited";
  const crossSourceAgreementSufficient = checkinContext.cross_source_agreement_status !== "limited";
  const confidenceImpact = toConfidenceImpact(adherence);

  const missing = [
    ...(hasCommitmentPlan ? [] : ["commitment_plan_required"]),
    ...(interventionDataPresent ? [] : ["minimum_intervention_data_required"]),
    ...(adherenceSufficient ? [] : ["adherence_sufficiency_not_met"]),
    ...(sessionCompletionSufficient ? [] : ["session_completion_sufficiency_not_met"]),
    ...(checkinHistoryPresent ? [] : ["development_checkin_history_required"]),
    ...(checkinConsistencySufficient ? [] : ["development_checkin_consistency_required"]),
    ...(checkinTraceabilityComplete ? [] : ["development_checkin_traceability_required"]),
    ...(crossSourceAgreementSufficient ? [] : ["cross_source_agreement_required"]),
  ];

  let status = "ready";
  if (!hasCommitmentPlan || !interventionDataPresent || !checkinHistoryPresent) status = "not_ready";
  else if (!adherenceSufficient || !sessionCompletionSufficient || !checkinConsistencySufficient || !checkinTraceabilityComplete || !crossSourceAgreementSufficient) status = "partially_ready";

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    readiness_status: status,
    readiness_checks: {
      commitment_plan_exists: hasCommitmentPlan,
      minimum_intervention_data_presence: interventionDataPresent,
      adherence_sufficiency: adherenceSufficient,
      session_completion_sufficiency: sessionCompletionSufficient,
      development_checkin_history_presence: checkinHistoryPresent,
      development_checkin_consistency: checkinConsistencySufficient,
      development_checkin_traceability: checkinTraceabilityComplete,
      cross_source_agreement: crossSourceAgreementSufficient,
      intervention_confidence_impact: confidenceImpact,
    },
    adherence,
    reasons: missing,
    explanation: status === "ready"
      ? "Intervention implementation quality is sufficient for TDE availability interpretation."
      : status === "partially_ready"
        ? "Intervention data exists, but consistency is still forming; interpret growth with caution."
        : "Intervention readiness is not met because required implementation data is still missing.",
  };
}

function buildRolloutBridge(readiness = {}, options = {}) {
  const fallbackMode = options.fallback_mode || "extension_safe_fallback";
  const tdeAvailable = readiness.readiness_status !== "not_ready";
  const voiceRolloutMode = resolveVoiceRolloutMode(options.voice_rollout_mode);
  const voicePlaybackMode = voiceRolloutMode === "hidden"
    ? "hidden"
    : voiceRolloutMode === "fallback_only"
      ? "fallback_only"
      : voiceRolloutMode === "preview_only"
        ? "preview_only"
        : "enabled";

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    tde_availability: tdeAvailable ? "available" : "withheld",
    readiness_status: readiness.readiness_status || "not_ready",
    bridge_mode: tdeAvailable ? "phase9_intervention_aware" : fallbackMode,
    fallback_safe: !tdeAvailable,
    voice_rollout: {
      mode: voiceRolloutMode,
      playback_mode: voicePlaybackMode,
      voice_required: false,
      extension_safe: true,
    },
    explanation: tdeAvailable
      ? "TDE extension availability includes intervention consistency checks."
      : "TDE extension remains safely withheld until intervention readiness contracts are met.",
    reasons: readiness.reasons || [],
  };
}

module.exports = {
  evaluateInterventionReadiness,
  buildRolloutBridge,
};
