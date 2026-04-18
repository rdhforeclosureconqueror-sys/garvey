"use strict";

const { CALIBRATION_VARIABLES } = require("./constants");

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function buildTrendRows(progressRecords = []) {
  return progressRecords
    .filter((entry) => entry && typeof entry === "object" && entry.trait_signal_summary && typeof entry.trait_signal_summary === "object")
    .sort((a, b) => Number(a.week_number || 0) - Number(b.week_number || 0))
    .map((entry) => {
      const scores = Object.values(entry.trait_signal_summary || {}).map((value) => clamp01(Number(value)));
      return {
        week_number: Number(entry.week_number || 0),
        average_trait_score: Number(average(scores).toFixed(3)),
      };
    });
}

function toAdherenceRate(sessions = []) {
  if (!sessions.length) return null;
  const completeCount = sessions.filter((entry) => entry.full_session_completed === true).length;
  return Number((completeCount / sessions.length).toFixed(3));
}

function buildPatternHistory(snapshot = {}, options = {}) {
  const childId = String(options.child_id || snapshot?.enrollment?.child_id || "").trim();
  const progressRecords = Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [];
  const sessions = Array.isArray(snapshot.intervention_sessions) ? snapshot.intervention_sessions : [];
  const checkins = Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [];

  const calibration = CALIBRATION_VARIABLES.personalization_layer || {};
  const improvingDelta = Number(calibration.improving_delta_min || 0.05);
  const stagnationDelta = Number(calibration.stagnation_delta_abs_max || 0.03);
  const regressionDelta = Number(calibration.regression_delta_max || -0.05);
  const inconsistencyGap = Number(calibration.inconsistency_completion_gap || 0.4);

  const trendRows = buildTrendRows(progressRecords);
  const latest = trendRows.at(-1);
  const prior = trendRows.at(-2);
  const scoreDelta = latest && prior
    ? Number((latest.average_trait_score - prior.average_trait_score).toFixed(3))
    : 0;

  const adherenceRate = toAdherenceRate(sessions);
  const latestTransfer = checkins.at(-1)?.summary?.transfer_attempt_quality ?? null;
  const priorTransfer = checkins.at(-2)?.summary?.transfer_attempt_quality ?? null;
  const transferDelta = Number.isFinite(Number(latestTransfer)) && Number.isFinite(Number(priorTransfer))
    ? Number((Number(latestTransfer) - Number(priorTransfer)).toFixed(3))
    : null;

  const improving = trendRows.length >= 2 && scoreDelta >= improvingDelta;
  const stagnation = trendRows.length >= 2 && Math.abs(scoreDelta) <= stagnationDelta;
  const regression = trendRows.length >= 2 && scoreDelta <= regressionDelta;
  const inconsistency = Number.isFinite(adherenceRate)
    ? Math.abs((latest?.average_trait_score || 0) - adherenceRate) >= inconsistencyGap
    : false;

  const signalsUsed = [
    progressRecords.length > 0 ? "progress_records" : null,
    sessions.length > 0 ? "intervention_sessions" : null,
    checkins.length > 0 ? "development_checkins" : null,
  ].filter(Boolean);

  let confidenceLabel = "low";
  if (signalsUsed.length >= 3 && trendRows.length >= 3) confidenceLabel = "moderate";
  if (signalsUsed.length >= 3 && trendRows.length >= 5 && Number.isFinite(adherenceRate) && adherenceRate >= 0.7) confidenceLabel = "high";

  const missingContracts = [];
  if (!progressRecords.length) missingContracts.push("missing_progress_records_for_pattern_trend");
  if (!sessions.length) missingContracts.push("missing_intervention_sessions_for_pattern_stability");
  if (!checkins.length) missingContracts.push("missing_development_checkins_for_transfer_pattern");

  const patternHistory = {
    improving_trend: {
      present: improving,
      score_delta: scoreDelta,
      threshold: improvingDelta,
      rule_path: "personalization/pattern_history/improving_trend/v1",
      traceability: {
        latest_week: latest?.week_number || null,
        prior_week: prior?.week_number || null,
      },
    },
    stagnation_pattern: {
      present: stagnation,
      score_delta: scoreDelta,
      threshold_abs_max: stagnationDelta,
      rule_path: "personalization/pattern_history/stagnation_pattern/v1",
      traceability: {
        latest_week: latest?.week_number || null,
        prior_week: prior?.week_number || null,
      },
    },
    inconsistency_pattern: {
      present: inconsistency,
      completion_rate: adherenceRate,
      latest_trait_average: latest?.average_trait_score || 0,
      threshold_gap: inconsistencyGap,
      rule_path: "personalization/pattern_history/inconsistency_pattern/v1",
      traceability: {
        session_count: sessions.length,
        latest_week: latest?.week_number || null,
      },
    },
    regression_signal: {
      present: regression,
      score_delta: scoreDelta,
      threshold_max: regressionDelta,
      transfer_delta: transferDelta,
      rule_path: "personalization/pattern_history/regression_signal/v1",
      traceability: {
        latest_transfer_quality: Number.isFinite(Number(latestTransfer)) ? Number(latestTransfer) : null,
        prior_transfer_quality: Number.isFinite(Number(priorTransfer)) ? Number(priorTransfer) : null,
      },
    },
  };

  return {
    child_id: childId,
    deterministic: true,
    extension_only: true,
    pattern_history_schema_version: "phase18-v1",
    confidence_context: {
      confidence_label: confidenceLabel,
      signal_stream_count: signalsUsed.length,
      progress_points: trendRows.length,
      rule_path: "personalization/pattern_history/confidence/v1",
    },
    pattern_history: patternHistory,
    missing_contracts: missingContracts,
    contracts_status: missingContracts.length ? "incomplete" : "complete",
  };
}

function buildPersonalizationModifiers(snapshot = {}, insights = {}, options = {}) {
  const childId = String(options.child_id || snapshot?.enrollment?.child_id || insights?.child_id || "").trim();
  const history = options.pattern_history || buildPatternHistory(snapshot, { child_id: childId });
  const confidenceLabel = String(history?.confidence_context?.confidence_label || insights?.confidence_context?.confidence_label || "low");

  const modifiers = {
    recommendation_modifiers: {
      intensity: history.pattern_history.regression_signal.present ? "reduced" : (history.pattern_history.improving_trend.present ? "increased" : "baseline"),
      frequency: history.pattern_history.stagnation_pattern.present ? "higher_touchpoint_frequency" : "baseline",
      intervention_type_bias: history.pattern_history.inconsistency_pattern.present
        ? ["consistency_support", "short_cycle_reflection"]
        : ["domain_alignment", "gradual_challenge"],
      confidence_cap: confidenceLabel === "low" ? "conservative" : "normal",
      rule_path: "personalization/modifiers/recommendations/v1",
    },
    session_planning_modifiers: {
      preferred_challenge_level: history.pattern_history.regression_signal.present ? "low" : "moderate",
      reflection_prompt_count: history.pattern_history.improving_trend.present ? 2 : 1,
      deterministic_activity_bias: history.pattern_history.inconsistency_pattern.present ? "attention_and_regulation_first" : "core_sequence",
      rule_path: "personalization/modifiers/session_planning/v1",
    },
    parent_guidance_modifiers: {
      guidance_tone: history.pattern_history.regression_signal.present ? "stabilize_then_scale" : "growth_with_structure",
      guidance_emphasis: history.pattern_history.stagnation_pattern.present ? "routine_quality_checks" : "routine_continuation",
      confidence_language: confidenceLabel === "low"
        ? "early_signal_language"
        : "pattern_over_time_language",
      rule_path: "personalization/modifiers/parent_guidance/v1",
    },
  };

  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    personalization_schema_version: "phase18-v1",
    based_on: {
      insight_schema_version: insights?.insight_schema_version || "phase17-v1",
      pattern_history_schema_version: history.pattern_history_schema_version,
    },
    confidence_context: {
      confidence_label: confidenceLabel,
      rule_path: "personalization/confidence/v1",
    },
    modifiers,
    traceability: {
      pattern_flags: {
        improving_trend: history.pattern_history.improving_trend.present,
        stagnation_pattern: history.pattern_history.stagnation_pattern.present,
        inconsistency_pattern: history.pattern_history.inconsistency_pattern.present,
        regression_signal: history.pattern_history.regression_signal.present,
      },
      source_paths: [
        "insight_layer/pillar/*",
        "personalization/pattern_history/*",
      ],
      rule_path: "personalization/traceability/v1",
    },
    missing_contracts: [...new Set([...(history.missing_contracts || []), ...((insights && insights.missing_contracts) || [])])].sort(),
    contracts_status: (history.contracts_status === "complete" && insights?.contracts_status !== "incomplete") ? "complete" : "incomplete",
  };
}

function buildAdaptiveRecommendationExplanation(recommendationPayload = {}, personalization = {}) {
  const recommendations = Array.isArray(recommendationPayload.recommendations) ? recommendationPayload.recommendations : [];
  const modifiers = personalization?.modifiers?.recommendation_modifiers || {};
  return {
    ok: true,
    child_id: recommendationPayload.child_id || personalization.child_id || null,
    deterministic: true,
    extension_only: true,
    explanation_schema_version: "phase18-v1",
    modifiers_applied: modifiers,
    recommendation_deltas: recommendations.map((entry) => ({
      recommendation_id: entry.recommendation_id,
      type: entry.type,
      adaptation_summary: {
        intensity: entry.adaptive_adjustments?.intensity || "baseline",
        frequency: entry.adaptive_adjustments?.frequency || "baseline",
        type_bias: entry.adaptive_adjustments?.type_bias || "none",
      },
      trace: entry.adaptive_adjustments?.trace || null,
    })),
    missing_contracts: personalization.missing_contracts || [],
  };
}

module.exports = {
  buildPatternHistory,
  buildPersonalizationModifiers,
  buildAdaptiveRecommendationExplanation,
};
