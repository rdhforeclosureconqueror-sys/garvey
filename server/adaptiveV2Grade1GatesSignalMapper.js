"use strict";

const { FORBIDDEN_EVENT_EXAMPLES, FORBIDDEN_METRICS } = require("../gates/gatePracticeSignalSchema");

const SOURCE = "adaptive_v2_grade1";
const SIGNAL_CATEGORY_MAP = Object.freeze([
  { gate_key: "discipline", gate_name: "Discipline", signal_category: "persistence_after_challenge" },
  { gate_key: "attention", gate_name: "Attention", signal_category: "attention_follow_through" },
  { gate_key: "truth", gate_name: "Truth", signal_category: "learning_accuracy_trend" },
  { gate_key: "repair", gate_name: "Repair", signal_category: "recovery_after_miss" }
]);

function hintUsageBand(v) {
  const n = Number(v || 0);
  if (n <= 1) return "low";
  if (n <= 3) return "moderate";
  return "high";
}

function checkpointAttemptBand(v) {
  const n = Number(v || 0);
  if (n <= 1) return "early";
  if (n <= 4) return "building";
  return "established";
}

function confidenceBand({ practicedSkillCount, checkpointAttemptCount, repeatedPractice }) {
  if (repeatedPractice && checkpointAttemptCount >= 5 && practicedSkillCount >= 2) return "high";
  if (checkpointAttemptCount >= 2 || practicedSkillCount >= 1) return "medium";
  return "early";
}

function toSafeAggregate(progressRow) {
  const attempted = Number(progressRow?.checkpoint_attempts || 0);
  const practicedSkillCount = progressRow?.selected_skill_id ? 1 : 0;
  const masteryBand = String(progressRow?.mastery_band || "emerging").trim().toLowerCase() || "emerging";
  const nextRecommendedSkillId = String(progressRow?.next_recommended_skill_id || "").trim();
  const repeatedPractice = attempted >= 2;
  return {
    practiced_skill_count: practicedSkillCount,
    checkpoint_attempt_count: attempted,
    checkpoint_attempt_count_band: checkpointAttemptBand(attempted),
    hint_usage_band: hintUsageBand(progressRow?.hint_usage_count),
    mastery_band: masteryBand,
    repeated_practice: repeatedPractice,
    next_step_follow_through: nextRecommendedSkillId ? "available" : "unknown"
  };
}

function mapAdaptiveV2Grade1ToGatesSignals({ childId, progressRow, grade = "1", runtimeVersion = "adaptive_v2" }) {
  if (String(grade) !== "1" || String(runtimeVersion) !== "adaptive_v2") {
    return { ok: true, child_id: String(childId || ""), source: SOURCE, signals: [], empty_state: true };
  }
  if (!progressRow || typeof progressRow !== "object") {
    return { ok: true, child_id: String(childId || ""), source: SOURCE, signals: [], empty_state: true };
  }

  const supporting_aggregate = toSafeAggregate(progressRow);
  const confidence = confidenceBand({
    practicedSkillCount: supporting_aggregate.practiced_skill_count,
    checkpointAttemptCount: supporting_aggregate.checkpoint_attempt_count,
    repeatedPractice: supporting_aggregate.repeated_practice
  });

  const signals = SIGNAL_CATEGORY_MAP.map((def) => ({
    gate_key: def.gate_key,
    gate_name: def.gate_name,
    signal_category: def.signal_category,
    confidence_band: confidence,
    source: SOURCE,
    supporting_aggregate
  }));

  const blockedTerms = [...FORBIDDEN_EVENT_EXAMPLES, ...FORBIDDEN_METRICS].map((v) => String(v || "").toLowerCase());
  const serialized = JSON.stringify({ signals }).toLowerCase();
  if (blockedTerms.some((t) => t && serialized.includes(t))) {
    return { ok: true, child_id: String(childId || ""), source: SOURCE, signals: [], empty_state: true };
  }

  return { ok: true, child_id: String(childId || ""), source: SOURCE, signals, empty_state: false };
}

module.exports = { mapAdaptiveV2Grade1ToGatesSignals };
