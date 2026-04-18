"use strict";

const { summarizeAdherence } = require("./adherenceService");

const DEFAULT_RECOMMENDATION_RULES = Object.freeze([
  Object.freeze({
    rule_id: "rule_lower_weekly_commitment_when_adherence_weak",
    recommendation_type: "lower_weekly_commitment",
    label: "Lower weekly commitment",
    rationale: "Weekly commitment can be adjusted to improve follow-through consistency before interpreting growth movement.",
    conditions: Object.freeze({ adherence_status_in: ["WEAK"], planned_sessions_min: 3 }),
    output: Object.freeze({
      action: "Reduce committed days by one for the next cycle.",
      parent_language: "Consider a smaller weekly plan to protect consistency and confidence.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
  Object.freeze({
    rule_id: "rule_shorten_sessions_when_completion_low",
    recommendation_type: "shorten_sessions",
    label: "Shorten session length",
    rationale: "Lower full-session completion often indicates session load is too high for current routine fit.",
    conditions: Object.freeze({ full_session_completion_rate_below: 0.7, avg_duration_min: 28 }),
    output: Object.freeze({
      action: "Use shorter sessions until full-session completion stabilizes.",
      parent_language: "Shorter sessions can help maintain steady developmental participation.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
  Object.freeze({
    rule_id: "rule_simplify_activity_options_when_recovery_low",
    recommendation_type: "simplify_activity_options",
    label: "Simplify activity options",
    rationale: "Frequent frustration without recovery suggests the activity menu may be too complex for current support conditions.",
    conditions: Object.freeze({ frustration_recovery_low: true }),
    output: Object.freeze({
      action: "Offer fewer, clearer activity choices in each session.",
      parent_language: "Simpler options can support re-engagement without reducing developmental expectations.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
  Object.freeze({
    rule_id: "rule_increase_challenge_gradually",
    recommendation_type: "increase_challenge_gradually",
    label: "Increase challenge gradually",
    rationale: "When calibration is too easy and adherence is stable, challenge can increase in a paced way.",
    conditions: Object.freeze({ challenge_calibration_in: ["TOO_EASY"], adherence_status_in: ["STRONG", "MODERATE"] }),
    output: Object.freeze({
      action: "Increase challenge one step at a time across upcoming sessions.",
      parent_language: "Gradual challenge shifts help preserve confidence while extending growth opportunities.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
  Object.freeze({
    rule_id: "rule_shift_coaching_style_to_reflection",
    recommendation_type: "shift_coaching_style_toward_reflection",
    label: "Shift coaching style toward reflection",
    rationale: "Directive coaching can be balanced with reflection prompts to strengthen self-monitoring.",
    conditions: Object.freeze({ parent_coaching_style_in: ["directive", "corrective"] }),
    output: Object.freeze({
      action: "Add one reflection prompt after each challenge task.",
      parent_language: "Reflection-focused coaching can support developmental ownership of strategies.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
  Object.freeze({
    rule_id: "rule_add_mindfulness_attention_when_focus_low",
    recommendation_type: "add_mindfulness_attention_activities",
    label: "Add mindfulness and attention activities",
    rationale: "Inconsistent focus and weak recovery can benefit from short regulation and attention routines.",
    conditions: Object.freeze({ frustration_recovery_low: true, challenge_calibration_in: ["TOO_HARD", "MIXED"] }),
    output: Object.freeze({
      action: "Add brief regulation and attention activities before challenge tasks.",
      parent_language: "Mindfulness and attention routines can improve session readiness.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
  Object.freeze({
    rule_id: "rule_increase_domain_aligned_activities_when_growth_flat",
    recommendation_type: "increase_domain_aligned_activities",
    label: "Increase domain-aligned activities",
    rationale: "Flat growth movement with stable implementation may indicate need for stronger domain alignment.",
    conditions: Object.freeze({ trait_growth_movement_in: ["FLAT", "MIXED"], adherence_status_in: ["STRONG", "MODERATE"] }),
    output: Object.freeze({
      action: "Increase activities linked to active domain interests.",
      parent_language: "Domain-aligned activities can make practice more meaningful and sustained.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
  Object.freeze({
    rule_id: "rule_review_schedule_before_growth_interpretation",
    recommendation_type: "review_schedule_fit_before_interpreting_weak_growth",
    label: "Review schedule fit before interpreting weak growth",
    rationale: "Low adherence or confidence-limited evidence should be interpreted as implementation context, not developmental conclusion.",
    conditions: Object.freeze({ requires_schedule_review: true }),
    output: Object.freeze({
      action: "Review routine fit and data sufficiency before drawing growth conclusions.",
      parent_language: "Interpret growth carefully when implementation consistency is still forming.",
    }),
    trace_label: "rule_based_operational_logic",
  }),
]);

function toChallengeCalibration(sessions = []) {
  if (!sessions.length) return "MIXED";
  const counts = sessions.reduce((acc, session) => {
    const level = String(session.challenge_level || "moderate").toLowerCase();
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});
  const maxEntry = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ["moderate"];
  if (maxEntry[0] === "low") return "TOO_EASY";
  if (maxEntry[0] === "high") return "TOO_HARD";
  return "MIXED";
}

function toFrustrationRecovery(sessions = []) {
  if (!sessions.length) return "UNKNOWN";
  const lowStates = new Set(["did_not_recover", "recovered_with_prompt"]);
  const lowCount = sessions.filter((entry) => lowStates.has(String(entry.frustration_recovery_level || ""))).length;
  return lowCount / sessions.length >= 0.5 ? "LOW" : "STABLE";
}

function toTraitGrowthMovement(progressRecords = []) {
  const rows = progressRecords
    .filter((entry) => entry && typeof entry === "object" && entry.trait_signal_summary)
    .sort((a, b) => Number(a.week_number || 0) - Number(b.week_number || 0));

  if (rows.length < 2) return "INSUFFICIENT";
  const latest = rows.at(-1).trait_signal_summary || {};
  const prior = rows.at(-2).trait_signal_summary || {};

  const changes = Object.keys(latest).map((trait) => Number(latest[trait] || 0) - Number(prior[trait] || 0));
  if (!changes.length) return "INSUFFICIENT";
  const avg = changes.reduce((sum, value) => sum + value, 0) / changes.length;
  if (avg >= 0.05) return "IMPROVING";
  if (avg <= -0.05) return "DECLINING";
  return "FLAT";
}

function matchesConditions(rule, inputs) {
  const c = rule.conditions || {};
  if (c.adherence_status_in && !c.adherence_status_in.includes(inputs.adherence_level)) return false;
  if (c.full_session_completion_rate_below !== undefined && !(inputs.full_session_completion_rate < c.full_session_completion_rate_below)) return false;
  if (c.parent_coaching_style_in && !c.parent_coaching_style_in.includes(inputs.parent_coaching_style)) return false;
  if (c.challenge_calibration_in && !c.challenge_calibration_in.includes(inputs.challenge_calibration)) return false;
  if (c.trait_growth_movement_in && !c.trait_growth_movement_in.includes(inputs.trait_growth_movement)) return false;
  if (c.planned_sessions_min !== undefined && !(inputs.planned_sessions >= c.planned_sessions_min)) return false;
  if (c.avg_duration_min !== undefined && !(inputs.average_session_duration_minutes >= c.avg_duration_min)) return false;
  if (c.frustration_recovery_low && inputs.frustration_recovery !== "LOW") return false;
  if (c.requires_schedule_review && !inputs.requires_schedule_review) return false;
  return true;
}

function buildRecommendationInputs(snapshot = {}, plan = null, sessions = [], confidenceContext = {}, sufficiencyContext = {}) {
  const adherence = summarizeAdherence(plan, sessions);
  const latestSession = sessions.at(-1) || {};

  const environmentSignals = Array.isArray(snapshot.environment_hooks)
    ? snapshot.environment_hooks.map((entry) => String(entry.environment_factor || "unknown"))
    : [];

  const inputs = {
    adherence_level: adherence.adherence_status,
    planned_sessions: adherence.planned_sessions,
    full_session_completion_rate: adherence.full_session_completion_rate,
    challenge_calibration: toChallengeCalibration(sessions),
    parent_coaching_style: String(latestSession.parent_coaching_style || "supportive").toLowerCase(),
    frustration_recovery: toFrustrationRecovery(sessions),
    trait_growth_movement: toTraitGrowthMovement(snapshot.progress_records || []),
    environment_signals: [...new Set(environmentSignals)],
    confidence_status: confidenceContext.confidence_label || "early-signal",
    data_sufficiency_status: sufficiencyContext.status || "limited",
    average_session_duration_minutes: sessions.length
      ? Number((sessions.reduce((sum, entry) => sum + Number(entry.duration_minutes || 0), 0) / sessions.length).toFixed(2))
      : 0,
  };

  inputs.requires_schedule_review = (
    inputs.adherence_level === "WEAK"
    || inputs.data_sufficiency_status !== "sufficient"
    || inputs.confidence_status === "early-signal"
  );

  return { adherence, inputs };
}

function generateRecommendations(context = {}, options = {}) {
  const rules = Array.isArray(options.rules) && options.rules.length ? options.rules : DEFAULT_RECOMMENDATION_RULES;
  const recommendations = rules
    .filter((rule) => matchesConditions(rule, context.inputs || {}))
    .map((rule) => ({
      recommendation_id: `${rule.rule_id}:${context.child_id}`,
      type: rule.recommendation_type,
      label: rule.label,
      action: rule.output.action,
      parent_language: rule.output.parent_language,
      rationale: rule.rationale,
      trace: {
        rule_id: rule.rule_id,
        trace_label: rule.trace_label,
        matched_inputs: {
          adherence_level: context.inputs.adherence_level,
          full_session_completion_rate: context.inputs.full_session_completion_rate,
          challenge_calibration: context.inputs.challenge_calibration,
          parent_coaching_style: context.inputs.parent_coaching_style,
          frustration_recovery: context.inputs.frustration_recovery,
          trait_growth_movement: context.inputs.trait_growth_movement,
          confidence_status: context.inputs.confidence_status,
          data_sufficiency_status: context.inputs.data_sufficiency_status,
        },
      },
      governance: {
        logic_type: "rule_based_operational_logic",
        validated_truth_claim: false,
        non_clinical: true,
        editable_config: true,
      },
    }));

  return {
    ok: true,
    extension_only: true,
    deterministic: true,
    child_id: context.child_id,
    recommendation_engine: {
      name: "phase9_rule_engine_v1",
      logic_type: "rule_based_operational_logic",
      configurable: true,
      validated_truth_claim: false,
      non_clinical: true,
    },
    recommendation_inputs: context.inputs,
    adherence_summary: context.adherence,
    recommendations,
  };
}

module.exports = {
  DEFAULT_RECOMMENDATION_RULES,
  buildRecommendationInputs,
  generateRecommendations,
  toChallengeCalibration,
  toFrustrationRecovery,
  toTraitGrowthMovement,
};
