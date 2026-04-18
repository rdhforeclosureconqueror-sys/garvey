"use strict";

const { buildSessionPlan } = require("./sessionBuilderService");
const { normalizeCommitmentPlan, validateCommitmentPlan, summarizeAdherence } = require("./adherenceService");
const {
  INTERVENTION_ENVIRONMENT_EXTENSION_CONTRACT,
  toCoachingStyleQuality,
  toChallengeCalibration,
} = require("./interventionEnvironmentContract");
const { normalizeInterventionEvidenceToSignals } = require("./interventionSignalIntegrationService");
const { CALIBRATION_VARIABLES, deterministicId } = require("./constants");

async function saveCommitmentPlan(payload, repository) {
  const plan = normalizeCommitmentPlan(payload);
  const validation = validateCommitmentPlan(plan);
  if (!validation.ok) return { ok: false, error: "commitment_plan_invalid", validation_errors: validation.errors, deterministic: true };
  const persistence = await repository.persistCommitmentPlan(plan);
  return { ok: true, commitment_plan: plan, persistence, deterministic: true, extension_only: true };
}

async function getCommitmentPlan(childId, repository) {
  const plan = await repository.getCommitmentPlan(String(childId || ""));
  return { ok: true, commitment_plan: plan, deterministic: true, extension_only: true };
}

function planSession(payload = {}) {
  return buildSessionPlan(payload);
}

async function completeSession(payload = {}, repository, options = {}) {
  const integration = normalizeInterventionEvidenceToSignals(payload, options);
  if (!integration.ok) {
    return {
      ok: false,
      error: "session_evidence_invalid",
      validation_errors: integration.validation_errors,
      validity_status: integration.validity_status,
      deterministic: true,
      extension_only: true,
    };
  }

  const completedSession = {
    session_id: String(payload.session_id || "").trim() || deterministicId("session_complete", {
      child_id: payload.child_id || null,
      selected_activity_ids: integration.normalized_session.selected_activity_ids,
      completed_at: payload.completed_at || null,
    }),
    child_id: String(payload.child_id || "").trim(),
    completed_at: String(payload.completed_at || new Date().toISOString()),
    ...integration.normalized_session,
  };

  if (!completedSession.child_id) {
    return { ok: false, error: "child_id_required", deterministic: true, extension_only: true };
  }

  const persistence = await repository.persistInterventionSession(completedSession);

  return {
    ok: true,
    session: completedSession,
    intervention_signal_evidence: integration.intervention_signal_evidence,
    traceability_refs: integration.traceability_refs,
    evidence_validity_status: integration.validity_status,
    persistence,
    evidence_source_status: "valid_ISL_source_with_multi_source_requirement",
    deterministic: true,
    extension_only: true,
  };
}

async function getAdherence(childId, repository) {
  const plan = await repository.getCommitmentPlan(String(childId || ""));
  const sessions = await repository.listInterventionSessions(String(childId || ""));
  const adherence = summarizeAdherence(plan, sessions);

  const environment_extension = {
    schedule_realism: plan
      ? (plan.committed_days_per_week <= CALIBRATION_VARIABLES.intervention_engine.schedule_realism_max_days_per_week ? "REALISTIC" : "OVERSTRETCHED")
      : "UNKNOWN",
    adherence_consistency: adherence.session_consistency,
    parent_coaching_style_quality: toCoachingStyleQuality(sessions.at(-1)?.parent_coaching_style),
    challenge_calibration: toChallengeCalibration(sessions.at(-1)?.challenge_level),
    confidence_adjustment: adherence.adherence_status === "WEAK"
      ? `REDUCE_CONFIDENCE_${CALIBRATION_VARIABLES.intervention_engine.adherence_confidence_penalty_multiplier}`
      : "NO_REDUCTION",
    interpretation_guard: "weak_adherence_not_child_limitation",
  };

  return {
    ok: true,
    child_id: String(childId || ""),
    adherence,
    environment_extension,
    environment_extension_contract: INTERVENTION_ENVIRONMENT_EXTENSION_CONTRACT,
    deterministic: true,
    extension_only: true,
  };
}

module.exports = {
  saveCommitmentPlan,
  getCommitmentPlan,
  planSession,
  completeSession,
  getAdherence,
};
