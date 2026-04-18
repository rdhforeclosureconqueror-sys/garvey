"use strict";

const { summarizeAdherence } = require("./adherenceService");
const { CALIBRATION_VARIABLES } = require("./constants");

function toConfidenceImpact(adherence) {
  return adherence.adherence_status === "WEAK"
    ? `REDUCE_CONFIDENCE_${CALIBRATION_VARIABLES.intervention_engine.adherence_confidence_penalty_multiplier}`
    : "NO_REDUCTION";
}

function evaluateInterventionReadiness(snapshot = {}, commitmentPlan = null, sessions = []) {
  const adherence = summarizeAdherence(commitmentPlan, sessions);

  const interventionDataPresent = sessions.length > 0;
  const hasCommitmentPlan = Boolean(commitmentPlan);
  const adherenceSufficient = adherence.adherence_percentage >= 45;
  const sessionCompletionSufficient = adherence.full_session_completion_rate >= 0.6;
  const confidenceImpact = toConfidenceImpact(adherence);

  const missing = [
    ...(hasCommitmentPlan ? [] : ["commitment_plan_required"]),
    ...(interventionDataPresent ? [] : ["minimum_intervention_data_required"]),
    ...(adherenceSufficient ? [] : ["adherence_sufficiency_not_met"]),
    ...(sessionCompletionSufficient ? [] : ["session_completion_sufficiency_not_met"]),
  ];

  let status = "ready";
  if (!hasCommitmentPlan || !interventionDataPresent) status = "not_ready";
  else if (!adherenceSufficient || !sessionCompletionSufficient) status = "partially_ready";

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

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    tde_availability: tdeAvailable ? "available" : "withheld",
    readiness_status: readiness.readiness_status || "not_ready",
    bridge_mode: tdeAvailable ? "phase9_intervention_aware" : fallbackMode,
    fallback_safe: !tdeAvailable,
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
