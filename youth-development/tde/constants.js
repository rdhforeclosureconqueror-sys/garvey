"use strict";

const crypto = require("node:crypto");
const { DEFAULT_CALIBRATION_VERSION, EVIDENCE_STATUS_TAG } = require("../tdeGovernance");

const EXTENSION_SCHEMA_VERSION = "2.0";

const TRAIT_DEFINITIONS = Object.freeze({
  SR: Object.freeze({ code: "SR", name: "Self-Regulation" }),
  CQ: Object.freeze({ code: "CQ", name: "Curiosity / Exploratory Drive" }),
  CR: Object.freeze({ code: "CR", name: "Creativity / Problem Finding" }),
  RS: Object.freeze({ code: "RS", name: "Reasoning / Pattern Recognition" }),
  PS: Object.freeze({ code: "PS", name: "Persistence / Challenge Tolerance" }),
  FB: Object.freeze({ code: "FB", name: "Feedback Responsiveness" }),
  DE: Object.freeze({ code: "DE", name: "Domain Engagement" }),
});

const CALIBRATION_VARIABLES = Object.freeze({
  signal_weight_profiles: Object.freeze({
    sr_default_v1: Object.freeze({ strategy_use_presence: 0.35, context_consistency: 0.35, reengagement_latency: 0.3 }),
    cq_default_v1: Object.freeze({ inquiry_depth: 0.45, option_diversity: 0.3, behavior_frequency: 0.25 }),
    cr_default_v1: Object.freeze({ artifact_quality: 0.4, option_diversity: 0.35, attempt_quality_change: 0.25 }),
    rs_default_v1: Object.freeze({ justification_quality: 0.45, execution_accuracy: 0.35, decision_quality: 0.2 }),
    ps_default_v1: Object.freeze({ attempt_quality_change: 0.4, reengagement_latency: 0.4, completion_quality: 0.2 }),
    fb_default_v1: Object.freeze({ improvement_delta: 0.6, error_reduction: 0.2, attempt_quality_change: 0.2 }),
    de_default_v1: Object.freeze({ domain_commitment_language: 0.45, behavior_frequency: 0.3, progress_attribution_quality: 0.25 }),
  }),
  confidence_formula_weights: Object.freeze({ base_weight_mean_confidence: 0.65, base_weight_evidence_sufficiency: 0.35 }),
  report_statement_thresholds: Object.freeze({ low_max: 0.39, high_min: 0.7 }),
  confidence_label_thresholds: Object.freeze({ low_max: 0.39, medium_max: 0.69 }),
  intervention_engine: Object.freeze({
    adherence_confidence_penalty_threshold: 0.45,
    adherence_confidence_penalty_multiplier: 0.85,
    schedule_realism_max_days_per_week: 5,
    deterministic_session_builder_strategy: "sorted-first-enabled-by-component",
  }),
  developmental_checkins: Object.freeze({
    minimum_history_for_sufficiency: 2,
    minimum_traceability_ratio: 0.9,
    weak_transfer_max_average: 0.45,
    reflection_improving_min_delta: 0.12,
    disagreement_max_delta: 0.35,
    consistency_min_completed_ratio: 0.5,
  }),
});

function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function deterministicId(prefix, payload) {
  const hash = crypto.createHash("sha1").update(stableStringify(payload)).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

module.exports = {
  EXTENSION_SCHEMA_VERSION,
  DEFAULT_CALIBRATION_VERSION,
  EVIDENCE_STATUS_TAG,
  TRAIT_DEFINITIONS,
  CALIBRATION_VARIABLES,
  stableStringify,
  deterministicId,
  clamp01,
};
