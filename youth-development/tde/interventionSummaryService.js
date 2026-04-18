"use strict";

const { summarizeAdherence } = require("./adherenceService");

function toConsistencyStatus(adherence) {
  if (adherence.adherence_status === "STRONG") return "consistent";
  if (adherence.adherence_status === "MODERATE") return "forming";
  return "inconsistent";
}

function buildInterventionSummary(childId, snapshot = {}, commitmentPlan = null, sessions = []) {
  const adherence = summarizeAdherence(commitmentPlan, sessions);
  const consistencyStatus = toConsistencyStatus(adherence);

  const interventionQualityContext = {
    implementation_consistency: consistencyStatus,
    interpretation_guard: "implementation_consistency_informs_confidence_not_child_blame",
    developmental_language_only: true,
    overclaim_guard: "confidence_and_sufficiency_visible",
  };

  const confidenceInterpretation = {
    confidence_adjusted_by_adherence: adherence.adherence_status === "WEAK",
    confidence_note: adherence.adherence_status === "WEAK"
      ? "Confidence is reduced because implementation consistency is still forming."
      : "Confidence impact from implementation consistency is limited at current adherence level.",
  };

  const progressRecords = Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [];
  const traitSignals = progressRecords.at(-1)?.trait_signal_summary || {};
  const environmentSignals = Array.isArray(snapshot.environment_hooks)
    ? snapshot.environment_hooks.map((entry) => String(entry.environment_factor || "unknown"))
    : [];

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    child_id: childId,
    commitment_plan_summary: commitmentPlan ? {
      committed_days_per_week: commitmentPlan.committed_days_per_week,
      preferred_days: commitmentPlan.preferred_days || [],
      preferred_time_window: commitmentPlan.preferred_time_window,
      target_session_length: commitmentPlan.target_session_length,
      facilitator_role: commitmentPlan.facilitator_role,
    } : null,
    planned_vs_completed_sessions: {
      planned_sessions: adherence.planned_sessions,
      completed_sessions: adherence.completed_sessions,
      missed_planned_sessions: adherence.missed_planned_sessions,
    },
    adherence_percentage: adherence.adherence_percentage,
    full_session_completion_rate: adherence.full_session_completion_rate,
    consistency_status: consistencyStatus,
    intervention_quality_context: interventionQualityContext,
    confidence_interpretation: confidenceInterpretation,
    factor_distinction: {
      child_development_signals: traitSignals,
      environment_factors: [...new Set(environmentSignals)],
      implementation_consistency: {
        adherence_status: adherence.adherence_status,
        session_consistency: adherence.session_consistency,
      },
    },
  };
}

module.exports = {
  buildInterventionSummary,
};
