"use strict";

const { deterministicId } = require("./constants");
const { COMPONENT_TYPES } = require("./activityBankService");

function toBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function normalizeCompletionFlags(flags = {}) {
  const normalized = {};
  for (const component of COMPONENT_TYPES) {
    normalized[component] = toBoolean(flags[component]);
  }
  return normalized;
}

function validateSessionEvidence(input = {}) {
  const errors = [];
  const selectedIds = Array.isArray(input.selected_activity_ids) ? input.selected_activity_ids.map((entry) => String(entry)) : [];
  const completionFlags = normalizeCompletionFlags(input.component_completion_flags || {});

  if (selectedIds.length !== COMPONENT_TYPES.length) errors.push("selected_activity_ids_must_include_4_entries");
  if (Object.keys(completionFlags).length !== COMPONENT_TYPES.length) errors.push("component_completion_flags_incomplete");

  for (const component of COMPONENT_TYPES) {
    if (completionFlags[component] !== true) {
      errors.push(`component_not_completed:${component}`);
    }
  }

  if (!input.reflection_response || !String(input.reflection_response).trim()) errors.push("reflection_response_required");
  if (!Number.isFinite(Number(input.duration_minutes)) || Number(input.duration_minutes) <= 0) errors.push("duration_minutes_invalid");
  return {
    ok: errors.length === 0,
    errors,
    normalized: {
      selected_activity_ids: selectedIds,
      component_completion_flags: completionFlags,
      full_session_completed: COMPONENT_TYPES.every((component) => completionFlags[component] === true),
      duration_minutes: Number(input.duration_minutes || 0),
      challenge_level: String(input.challenge_level || "moderate"),
      parent_coaching_style: String(input.parent_coaching_style || "neutral"),
      child_effort_rating: Number(input.child_effort_rating || 0),
      frustration_recovery_level: String(input.frustration_recovery_level || "unknown"),
      focus_duration_minutes: Number(input.focus_duration_minutes || 0),
      prompting_needed: String(input.prompting_needed || "moderate"),
      child_choice_count: Number(input.child_choice_count || 0),
      reflection_response: String(input.reflection_response || ""),
      notes: String(input.notes || ""),
    },
  };
}

function buildInterventionEvidence(session = {}) {
  const observedAt = String(session.completed_at || new Date().toISOString());
  return [
    {
      evidence_id: deterministicId("isl", { session_id: session.session_id, signal_type: "rule_adherence" }),
      source_type: "observation",
      source_id: `session:${session.session_id}`,
      signal_type: "rule_adherence",
      value: session.child_effort_rating,
      value_min: 0,
      value_max: 5,
      trait_code: "SR",
      evidence_status_tag: "INTERVENTION_SESSION_LOG",
      observed_at: observedAt,
    },
    {
      evidence_id: deterministicId("isl", { session_id: session.session_id, signal_type: "behavior_frequency" }),
      source_type: "task_event",
      source_id: `session:${session.session_id}`,
      signal_type: "behavior_frequency",
      value: session.child_choice_count,
      value_min: 0,
      value_max: 5,
      trait_code: "DE",
      evidence_status_tag: "INTERVENTION_SESSION_LOG",
      observed_at: observedAt,
    },
    {
      evidence_id: deterministicId("isl", { session_id: session.session_id, signal_type: "reengagement_latency" }),
      source_type: "observation",
      source_id: `session:${session.session_id}`,
      signal_type: "reengagement_latency",
      value: Math.max(1, Number(session.duration_minutes || 1) - Number(session.focus_duration_minutes || 0)),
      latency_max: Math.max(1, Number(session.duration_minutes || 1)),
      trait_code: "PS",
      evidence_status_tag: "INTERVENTION_SESSION_LOG",
      observed_at: observedAt,
    },
  ];
}

module.exports = {
  validateSessionEvidence,
  buildInterventionEvidence,
};
