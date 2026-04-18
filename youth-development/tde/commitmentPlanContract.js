"use strict";

const DAYS = Object.freeze(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
const FACILITATOR_ROLES = Object.freeze(["parent", "guardian", "mentor", "coach"]);

const COMMITMENT_PLAN_CONTRACT = Object.freeze({
  contract_id: "phase8_commitment_plan_contract_v1",
  extension_only: true,
  deterministic: true,
  required_fields: Object.freeze([
    "child_id",
    "phase",
    "committed_days_per_week",
    "preferred_days",
    "preferred_time_window",
    "target_session_length",
    "facilitator_role",
  ]),
  timestamp_expectations: Object.freeze({
    created_at: "set on first create; preserved on update when provided",
    updated_at: "set at normalization-time for every submission",
  }),
});

function toInt(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.trunc(numeric);
}

function normalizeCommitmentPlan(payload = {}) {
  const now = new Date().toISOString();
  const preferredDays = Array.isArray(payload.preferred_days)
    ? payload.preferred_days.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    child_id: String(payload.child_id || "").trim(),
    phase: toInt(payload.phase, 1),
    committed_days_per_week: toInt(payload.committed_days_per_week, 0),
    preferred_days: preferredDays,
    preferred_time_window: String(payload.preferred_time_window || "").trim(),
    target_session_length: toInt(payload.target_session_length ?? payload.session_length, 0),
    facilitator_role: String(payload.facilitator_role || "").trim().toLowerCase(),
    created_at: payload.created_at || now,
    updated_at: now,
  };
}

function validateCommitmentPlan(plan = {}) {
  const errors = [];

  if (!plan.child_id) errors.push("child_id_required");
  if (!Number.isInteger(plan.phase) || plan.phase < 1) errors.push("phase_invalid");
  if (!Number.isInteger(plan.committed_days_per_week) || plan.committed_days_per_week < 1 || plan.committed_days_per_week > 7) {
    errors.push("committed_days_per_week_invalid");
  }

  if (!Array.isArray(plan.preferred_days) || !plan.preferred_days.length) {
    errors.push("preferred_days_required");
  } else {
    const unique = new Set(plan.preferred_days);
    if (unique.size !== plan.preferred_days.length) errors.push("preferred_days_duplicate_entries");
    if ([...unique].some((day) => !DAYS.includes(day))) errors.push("preferred_days_invalid_values");
  }

  if (!plan.preferred_time_window) errors.push("preferred_time_window_required");
  if (!Number.isInteger(plan.target_session_length) || plan.target_session_length <= 0) errors.push("target_session_length_invalid");
  if (!FACILITATOR_ROLES.includes(plan.facilitator_role)) errors.push("facilitator_role_invalid");

  return { ok: errors.length === 0, errors, contract_id: COMMITMENT_PLAN_CONTRACT.contract_id };
}

module.exports = {
  COMMITMENT_PLAN_CONTRACT,
  normalizeCommitmentPlan,
  validateCommitmentPlan,
};
