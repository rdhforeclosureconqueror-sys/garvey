"use strict";

const { COMPONENT_TYPES } = require("./activityBankService");

const CHALLENGE_LEVELS = new Set(["low", "moderate", "high"]);
const COACHING_STYLE_VALUES = new Set(["supportive", "directive", "neutral", "co_regulating"]);
const PROMPTING_VALUES = new Set(["none", "low", "moderate", "high"]);

const SESSION_EVIDENCE_CONTRACT = Object.freeze({
  contract_id: "phase8_session_evidence_contract_v1",
  extension_only: true,
  deterministic: true,
  required_component_count: 4,
  required_component_categories: Object.freeze([...COMPONENT_TYPES]),
  required_fields: Object.freeze([
    "selected_activity_ids",
    "component_completion_flags",
    "full_session_completed",
    "duration_minutes",
    "challenge_level",
    "parent_coaching_style",
    "child_effort_rating",
    "frustration_recovery_level",
    "focus_duration_minutes",
    "prompting_needed",
    "child_choice_count",
    "reflection_response",
    "notes",
  ]),
  validity_statuses: Object.freeze(["VALID", "INVALID"]),
  traceability_requirements: Object.freeze([
    "session_id_required_for_traceability",
    "selected_activity_ids_must_map_to_required_categories",
    "trace_refs_emitted_for_transformed_evidence",
  ]),
});

function toBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCompletionFlags(flags = {}) {
  const normalized = {};
  for (const component of COMPONENT_TYPES) {
    normalized[component] = toBoolean(flags[component]);
  }
  return normalized;
}

function normalizeSessionEvidence(input = {}) {
  const completionFlags = normalizeCompletionFlags(input.component_completion_flags || {});
  return {
    selected_activity_ids: Array.isArray(input.selected_activity_ids)
      ? input.selected_activity_ids.map((entry) => String(entry || "").trim()).filter(Boolean)
      : [],
    component_completion_flags: completionFlags,
    full_session_completed: COMPONENT_TYPES.every((component) => completionFlags[component] === true),
    duration_minutes: toNumber(input.duration_minutes),
    challenge_level: String(input.challenge_level || "moderate").trim().toLowerCase(),
    parent_coaching_style: String(input.parent_coaching_style || "neutral").trim().toLowerCase(),
    child_effort_rating: toNumber(input.child_effort_rating),
    frustration_recovery_level: String(input.frustration_recovery_level || "unknown").trim(),
    focus_duration_minutes: toNumber(input.focus_duration_minutes),
    prompting_needed: String(input.prompting_needed || "moderate").trim().toLowerCase(),
    child_choice_count: toNumber(input.child_choice_count),
    reflection_response: String(input.reflection_response || "").trim(),
    notes: String(input.notes || "").trim(),
  };
}

function validateSessionEvidenceContract(input = {}, options = {}) {
  const normalized = normalizeSessionEvidence(input);
  const errors = [];

  const componentMap = typeof options.component_by_activity_id === "function"
    ? options.component_by_activity_id
    : (() => null);

  if (normalized.selected_activity_ids.length !== SESSION_EVIDENCE_CONTRACT.required_component_count) {
    errors.push("selected_activity_ids_must_include_4_entries");
  }

  const categoriesSeen = new Set();
  for (const activityId of normalized.selected_activity_ids) {
    const category = componentMap(activityId);
    if (!category) {
      errors.push(`activity_component_unknown:${activityId}`);
      continue;
    }
    categoriesSeen.add(category);
  }

  for (const requiredCategory of COMPONENT_TYPES) {
    if (!categoriesSeen.has(requiredCategory)) errors.push(`missing_required_category:${requiredCategory}`);
    if (normalized.component_completion_flags[requiredCategory] !== true) {
      errors.push(`component_not_completed:${requiredCategory}`);
    }
  }

  if (!Number.isFinite(normalized.duration_minutes) || normalized.duration_minutes <= 0) errors.push("duration_minutes_invalid");
  if (!CHALLENGE_LEVELS.has(normalized.challenge_level)) errors.push("challenge_level_invalid");
  if (!COACHING_STYLE_VALUES.has(normalized.parent_coaching_style)) errors.push("parent_coaching_style_invalid");
  if (normalized.child_effort_rating < 0 || normalized.child_effort_rating > 5) errors.push("child_effort_rating_invalid");
  if (!Number.isFinite(normalized.focus_duration_minutes) || normalized.focus_duration_minutes < 0) errors.push("focus_duration_minutes_invalid");
  if (!PROMPTING_VALUES.has(normalized.prompting_needed)) errors.push("prompting_needed_invalid");
  if (!Number.isFinite(normalized.child_choice_count) || normalized.child_choice_count < 0) errors.push("child_choice_count_invalid");
  if (!normalized.reflection_response) errors.push("reflection_response_required");

  const status = errors.length ? "INVALID" : "VALID";
  return {
    ok: status === "VALID",
    validity_status: status,
    errors,
    normalized,
    contract_id: SESSION_EVIDENCE_CONTRACT.contract_id,
    traceability_refs: {
      session_id: String(input.session_id || "").trim() || null,
      child_id: String(input.child_id || "").trim() || null,
      activity_ids: normalized.selected_activity_ids,
    },
  };
}

module.exports = {
  SESSION_EVIDENCE_CONTRACT,
  normalizeSessionEvidence,
  validateSessionEvidenceContract,
};
