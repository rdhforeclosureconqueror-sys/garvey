"use strict";

function normalizeCommitmentPlan(payload = {}) {
  return {
    child_id: String(payload.child_id || "").trim(),
    committed_days_per_week: Number(payload.committed_days_per_week || 0),
    preferred_days: Array.isArray(payload.preferred_days) ? payload.preferred_days.map((entry) => String(entry)) : [],
    preferred_time_window: String(payload.preferred_time_window || ""),
    session_length: Number(payload.session_length || 0),
    facilitator_role: String(payload.facilitator_role || "parent"),
    created_at: payload.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function validateCommitmentPlan(plan = {}) {
  const errors = [];
  if (!plan.child_id) errors.push("child_id_required");
  if (!Number.isFinite(plan.committed_days_per_week) || plan.committed_days_per_week <= 0) errors.push("committed_days_per_week_invalid");
  if (!Array.isArray(plan.preferred_days) || !plan.preferred_days.length) errors.push("preferred_days_required");
  if (!plan.preferred_time_window) errors.push("preferred_time_window_required");
  if (!Number.isFinite(plan.session_length) || plan.session_length <= 0) errors.push("session_length_invalid");
  if (!plan.facilitator_role) errors.push("facilitator_role_required");
  return { ok: errors.length === 0, errors };
}

function summarizeAdherence(plan = null, sessions = []) {
  const completed = sessions.filter((entry) => entry.full_session_completed === true);
  const planned = plan ? Math.max(sessions.length, Number(plan.committed_days_per_week || 0)) : sessions.length;
  const fullCompletionRate = sessions.length ? completed.length / sessions.length : 0;
  const adherencePercentage = planned > 0 ? (completed.length / planned) * 100 : 0;

  const sorted = [...completed].sort((a, b) => Date.parse(a.completed_at || 0) - Date.parse(b.completed_at || 0));
  let consistentGaps = 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const dayGap = Math.round((Date.parse(sorted[i].completed_at) - Date.parse(sorted[i - 1].completed_at)) / 86400000);
    if (dayGap >= 1 && dayGap <= 3) consistentGaps += 1;
  }
  const consistency = completed.length <= 1 ? 0 : consistentGaps / (completed.length - 1);

  return {
    planned_sessions: planned,
    completed_sessions: completed.length,
    total_sessions_recorded: sessions.length,
    full_session_completion_rate: Number(fullCompletionRate.toFixed(4)),
    adherence_percentage: Number(adherencePercentage.toFixed(2)),
    session_consistency: Number(consistency.toFixed(4)),
    adherence_status: adherencePercentage >= 75 ? "STRONG" : adherencePercentage >= 45 ? "MODERATE" : "WEAK",
    confidence_interpretation_required: true,
    separation_guard: "adherence_separate_from_trait_scores",
  };
}

module.exports = {
  normalizeCommitmentPlan,
  validateCommitmentPlan,
  summarizeAdherence,
};
