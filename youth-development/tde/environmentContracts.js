"use strict";

const { deterministicId, clamp01 } = require("./constants");

const ENVIRONMENT_CONTRACT_VERSION = "phase4-v1";

const ENVIRONMENT_FACTORS = Object.freeze([
  "challenge_fit",
  "autonomy_level",
  "feedback_clarity",
  "enrichment_access",
  "mentorship_access",
  "boredom_friction_mismatch",
  "strength_use_alignment",
]);

const EVENT_TYPES = Object.freeze([
  "rating",
  "observation",
  "session_note",
  "check_in",
  "artifact_review",
  "other",
]);

const SOURCE_TYPES = Object.freeze(["observer", "facilitator", "system", "self_report", "import"]);

const ENVIRONMENT_HOOK_EVENT_CONTRACT = Object.freeze({
  contract_type: "environment_target_hook_event",
  contract_version: ENVIRONMENT_CONTRACT_VERSION,
  required_fields: Object.freeze([
    "event_id",
    "environment_factor",
    "event_type",
    "source_type",
    "source_ref",
    "confidence_weight",
    "timestamp",
    "calibration_version",
    "trace_ref",
  ]),
  conditionally_required_fields: Object.freeze(["raw_value_or_event_payload", "normalized_value"]),
  deterministic: true,
  extension_only: true,
  separation_rules: Object.freeze([
    "environment_signals_must_not_be_written_to_trait_score_tables",
    "reports_must_not_describe_environment_weakness_as_child_weakness",
  ]),
  enumerations: Object.freeze({ environment_factor: ENVIRONMENT_FACTORS, event_type: EVENT_TYPES, source_type: SOURCE_TYPES }),
});

function normalizeEnvironmentHookEvent(input = {}) {
  const eventPayload = input.event_payload && typeof input.event_payload === "object" ? input.event_payload : null;
  const rawValue = Object.prototype.hasOwnProperty.call(input, "raw_value") ? input.raw_value : null;
  const candidateRaw = eventPayload ? eventPayload : rawValue;

  const normalizedValue = Object.prototype.hasOwnProperty.call(input, "normalized_value")
    ? Number(input.normalized_value)
    : (Number.isFinite(Number(rawValue)) ? clamp01(Number(rawValue)) : null);

  const base = {
    event_id: String(input.event_id || deterministicId("env", {
      factor: input.environment_factor || "unknown",
      ts: input.timestamp || null,
      source_ref: input.source_ref || "unknown",
      event_type: input.event_type || "other",
      payload: candidateRaw,
    })).trim(),
    child_id: String(input.child_id || "").trim(),
    environment_factor: String(input.environment_factor || "").trim(),
    event_type: String(input.event_type || "").trim(),
    source_type: String(input.source_type || "").trim(),
    source_ref: String(input.source_ref || "").trim(),
    raw_value: rawValue,
    event_payload: eventPayload,
    normalized_value: Number.isFinite(normalizedValue) ? clamp01(normalizedValue) : null,
    confidence_weight: clamp01(Number(input.confidence_weight)),
    timestamp: new Date(input.timestamp || Date.now()).toISOString(),
    calibration_version: String(input.calibration_version || "tde-calibration-v0").trim(),
    trace_ref: String(input.trace_ref || deterministicId("trace", input)).trim(),
  };

  return base;
}

function validateEnvironmentHookEvent(event = {}) {
  const errors = [];
  if (!event.child_id) errors.push("child_id_required");
  if (!ENVIRONMENT_FACTORS.includes(event.environment_factor)) errors.push("environment_factor_invalid");
  if (!EVENT_TYPES.includes(event.event_type)) errors.push("event_type_invalid");
  if (!SOURCE_TYPES.includes(event.source_type)) errors.push("source_type_invalid");
  if (!event.source_ref) errors.push("source_ref_required");
  if (!event.event_id) errors.push("event_id_required");
  if (!event.calibration_version) errors.push("calibration_version_required");
  if (!event.trace_ref) errors.push("trace_ref_required");
  if (!event.timestamp || Number.isNaN(new Date(event.timestamp).getTime())) errors.push("timestamp_invalid");
  if (event.raw_value === null && !event.event_payload) errors.push("raw_value_or_event_payload_required");
  if (event.normalized_value !== null && (!Number.isFinite(event.normalized_value) || event.normalized_value < 0 || event.normalized_value > 1)) {
    errors.push("normalized_value_out_of_range");
  }
  if (!Number.isFinite(event.confidence_weight) || event.confidence_weight < 0 || event.confidence_weight > 1) {
    errors.push("confidence_weight_out_of_range");
  }
  return {
    ok: errors.length === 0,
    errors,
  };
}

module.exports = {
  ENVIRONMENT_CONTRACT_VERSION,
  ENVIRONMENT_FACTORS,
  EVENT_TYPES,
  SOURCE_TYPES,
  ENVIRONMENT_HOOK_EVENT_CONTRACT,
  normalizeEnvironmentHookEvent,
  validateEnvironmentHookEvent,
};
