"use strict";

const INTERVENTION_ENVIRONMENT_EXTENSION_CONTRACT = Object.freeze({
  contract_id: "phase8_environment_extension_contract_v1",
  extension_only: true,
  deterministic: true,
  output_scope: "environment_extension_only",
  explicit_separation_guard: "environment_outputs_must_not_be_mapped_as_child_trait_scores",
  fields: Object.freeze([
    "schedule_realism",
    "adherence_consistency",
    "parent_coaching_style_quality",
    "challenge_calibration",
  ]),
  enums: Object.freeze({
    schedule_realism: ["REALISTIC", "OVERSTRETCHED", "UNKNOWN"],
    challenge_calibration: ["LOW", "MATCHED", "HIGH", "UNKNOWN"],
  }),
});

function toCoachingStyleQuality(value) {
  const style = String(value || "").trim().toLowerCase();
  if (style === "supportive" || style === "co_regulating") return "STRONG";
  if (style === "neutral") return "MODERATE";
  if (style) return "NEEDS_SUPPORT";
  return "UNKNOWN";
}

function toChallengeCalibration(value) {
  const level = String(value || "").trim().toLowerCase();
  if (level === "moderate") return "MATCHED";
  if (level === "low") return "LOW";
  if (level === "high") return "HIGH";
  return "UNKNOWN";
}

module.exports = {
  INTERVENTION_ENVIRONMENT_EXTENSION_CONTRACT,
  toCoachingStyleQuality,
  toChallengeCalibration,
};
