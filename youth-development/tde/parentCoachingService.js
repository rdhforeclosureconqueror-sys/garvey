"use strict";

const { CALIBRATION_VARIABLES } = require("./constants");
const { summarizeAdherence } = require("./adherenceService");
const { summarizeDevelopmentCheckins } = require("./developmentCheckinService");

const FACILITATION_STATES = Object.freeze([
  "supportive_and_effective",
  "overly_directive",
  "inconsistent_support",
  "low_engagement",
  "reflection_support_needed",
  "challenge_calibration_support_needed",
  "insufficient_data",
]);

function clamp01(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  if (num <= 0) return 0;
  if (num >= 1) return 1;
  return num;
}

function average(values = []) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function normalizeStyle(style) {
  const value = String(style || "supportive").trim().toLowerCase();
  return value || "supportive";
}

function buildParentImplementationPattern(snapshot = {}, adherence = {}, checkinSummary = {}) {
  const sessions = Array.isArray(snapshot.intervention_sessions) ? snapshot.intervention_sessions : [];
  const latestSessions = sessions.slice(-4);
  const styleCounts = latestSessions.reduce((acc, session) => {
    const style = normalizeStyle(session.parent_coaching_style);
    acc[style] = (acc[style] || 0) + 1;
    return acc;
  }, {});

  const directiveRate = latestSessions.length
    ? Number(((styleCounts.directive || 0) / latestSessions.length).toFixed(3))
    : 0;
  const supportiveRate = latestSessions.length
    ? Number(((styleCounts.supportive || 0) / latestSessions.length).toFixed(3))
    : 0;

  const challengeValues = latestSessions
    .map((session) => {
      const raw = String(session.challenge_level || "").trim().toLowerCase();
      if (raw === "high") return 1;
      if (raw === "moderate") return 0.6;
      if (raw === "low") return 0.3;
      return null;
    })
    .filter((entry) => entry !== null);

  const challengeAverage = challengeValues.length ? Number(average(challengeValues).toFixed(3)) : null;

  const reflectionDelta = Number(checkinSummary?.changes_since_prior_checkin?.reflection_quality_delta || 0);
  const reflectionTrend = reflectionDelta > 0
    ? "improving"
    : reflectionDelta < 0
      ? "declining"
      : "flat";

  return {
    session_count: sessions.length,
    latest_window_count: latestSessions.length,
    style_distribution: styleCounts,
    directive_rate: directiveRate,
    supportive_rate: supportiveRate,
    adherence_percentage: Number(adherence?.adherence_percentage || 0),
    adherence_status: String(adherence?.adherence_status || "WEAK"),
    session_consistency: Number(adherence?.session_consistency || 0),
    reflection_delta: Number(reflectionDelta.toFixed(3)),
    reflection_trend: reflectionTrend,
    challenge_average: challengeAverage,
    challenge_window_count: challengeValues.length,
  };
}

function buildChildPattern(insights = {}, trajectory = {}) {
  const pillarInsights = Array.isArray(insights.pillar_insights) ? insights.pillar_insights : [];
  const childAverages = pillarInsights
    .map((entry) => Number(entry?.child_pattern?.average_signal))
    .filter((value) => Number.isFinite(value));

  return {
    trajectory_state: String(trajectory.trajectory_state || "insufficient_data"),
    trajectory_confidence: String(trajectory?.confidence_context?.confidence_label || "low"),
    child_signal_average: childAverages.length ? Number(average(childAverages).toFixed(3)) : null,
    interpretation: childAverages.length
      ? "Child developmental movement is interpreted from child-facing evidence streams only."
      : "Child developmental pattern remains provisional pending additional child-facing evidence.",
  };
}

function buildEnvironmentPattern(insights = {}, snapshot = {}) {
  const pillarInsights = Array.isArray(insights.pillar_insights) ? insights.pillar_insights : [];
  const environmentAverages = pillarInsights
    .map((entry) => Number(entry?.environment_pattern?.average_signal))
    .filter((value) => Number.isFinite(value));
  const hooks = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks : [];

  return {
    event_count: hooks.length,
    average_environment_signal: environmentAverages.length ? Number(average(environmentAverages).toFixed(3)) : null,
    interpretation: hooks.length
      ? "Environment/context pattern is tracked independently from child and parent implementation patterns."
      : "Environment/context stream is currently sparse and limits interpretation confidence.",
  };
}

function classifyFacilitationState(patterns = {}, calibration = {}) {
  const minSessions = Number(calibration.minimum_sessions_for_parent_state || 3);
  const directiveThreshold = Number(calibration.directive_rate_for_overly_directive || 0.67);
  const lowAdherenceThreshold = Number(calibration.low_adherence_percentage_max || 45);
  const lowConsistencyThreshold = Number(calibration.low_consistency_max || 0.4);
  const reflectionFloor = Number(calibration.reflection_delta_floor || -0.05);
  const highChallengeMax = Number(calibration.high_challenge_with_weak_completion_rate || 0.8);
  const lowChallengeMin = Number(calibration.low_challenge_with_flat_trajectory_max || 0.45);

  if (patterns.session_count < minSessions) {
    return {
      facilitation_state: "insufficient_data",
      confidence_label: "low",
      confidence_score: 0.22,
      reason_codes: ["minimum_parent_session_history_not_met"],
      traceability: {
        session_count: patterns.session_count,
        minimum_required_sessions: minSessions,
        rule_path: "parent_coaching/facilitation_state/insufficient_data/v1",
      },
    };
  }

  const weakCompletion = patterns.adherence_percentage <= lowAdherenceThreshold;
  const inconsistentSupport = patterns.session_consistency <= lowConsistencyThreshold;
  const directivePressure = patterns.directive_rate >= directiveThreshold;
  const reflectionSupportNeeded = patterns.reflection_delta <= reflectionFloor;
  const challengeHigh = Number.isFinite(patterns.challenge_average) && patterns.challenge_average >= highChallengeMax && weakCompletion;
  const challengeLow = Number.isFinite(patterns.challenge_average)
    && patterns.challenge_average <= lowChallengeMin
    && ["plateauing", "stable"].includes(patterns.child_trajectory_state);

  if (weakCompletion && patterns.adherence_percentage <= Number(calibration.low_engagement_adherence_percentage_max || 35)) {
    return {
      facilitation_state: "low_engagement",
      confidence_label: "moderate",
      confidence_score: 0.64,
      reason_codes: ["adherence_below_low_engagement_threshold", "implementation_routine_not_stable"],
      traceability: {
        adherence_percentage: patterns.adherence_percentage,
        threshold: Number(calibration.low_engagement_adherence_percentage_max || 35),
        rule_path: "parent_coaching/facilitation_state/low_engagement/v1",
      },
    };
  }

  if (directivePressure && (patterns.child_trajectory_state === "plateauing" || patterns.child_trajectory_state === "regressing")) {
    return {
      facilitation_state: "overly_directive",
      confidence_label: "moderate",
      confidence_score: 0.67,
      reason_codes: ["directive_style_concentration_high", "child_ownership_growth_limited"],
      traceability: {
        directive_rate: patterns.directive_rate,
        threshold: directiveThreshold,
        child_trajectory_state: patterns.child_trajectory_state,
        rule_path: "parent_coaching/facilitation_state/overly_directive/v1",
      },
    };
  }

  if (inconsistentSupport) {
    return {
      facilitation_state: "inconsistent_support",
      confidence_label: "moderate",
      confidence_score: 0.63,
      reason_codes: ["session_consistency_low", "support_cadence_variable"],
      traceability: {
        session_consistency: patterns.session_consistency,
        threshold: lowConsistencyThreshold,
        rule_path: "parent_coaching/facilitation_state/inconsistent_support/v1",
      },
    };
  }

  if (reflectionSupportNeeded) {
    return {
      facilitation_state: "reflection_support_needed",
      confidence_label: "moderate",
      confidence_score: 0.61,
      reason_codes: ["reflection_quality_not_improving", "reflection_prompt_use_needs_support"],
      traceability: {
        reflection_delta: patterns.reflection_delta,
        threshold: reflectionFloor,
        rule_path: "parent_coaching/facilitation_state/reflection_support_needed/v1",
      },
    };
  }

  if (challengeHigh || challengeLow) {
    return {
      facilitation_state: "challenge_calibration_support_needed",
      confidence_label: "moderate",
      confidence_score: 0.6,
      reason_codes: [challengeHigh ? "challenge_may_be_too_high_for_current_consistency" : "challenge_may_be_too_low_for_current_growth_window"],
      traceability: {
        challenge_average: patterns.challenge_average,
        weak_completion: weakCompletion,
        child_trajectory_state: patterns.child_trajectory_state,
        rule_path: "parent_coaching/facilitation_state/challenge_calibration_support_needed/v1",
      },
    };
  }

  return {
    facilitation_state: "supportive_and_effective",
    confidence_label: "high",
    confidence_score: 0.78,
    reason_codes: ["supportive_style_present", "adherence_and_consistency_adequate", "no_primary_parent_limiter_detected"],
    traceability: {
      supportive_rate: patterns.supportive_rate,
      adherence_percentage: patterns.adherence_percentage,
      session_consistency: patterns.session_consistency,
      rule_path: "parent_coaching/facilitation_state/supportive_and_effective/v1",
    },
  };
}

function buildGuidance(summary = {}) {
  const state = summary.facilitation_state || "insufficient_data";
  const implementation = summary.separated_patterns?.parent_facilitation_pattern || {};
  const child = summary.separated_patterns?.child_development_pattern || {};

  const doingWell = [];
  const supportLimits = [];
  const nextAdjustments = [];

  if (implementation.supportive_rate >= 0.5) doingWell.push("You are maintaining a supportive coaching tone in a majority of recent sessions.");
  if (implementation.adherence_percentage >= 75) doingWell.push("Session follow-through is strong, which helps the child practice consistently.");
  if (implementation.session_consistency >= 0.5) doingWell.push("Your session cadence is becoming predictable, supporting routine formation.");

  if (state === "overly_directive") {
    supportLimits.push("Current guidance style may be too directive, which can reduce child ownership of strategy use.");
    nextAdjustments.push("In the next session, ask the child to pick one strategy before offering corrections.");
  }
  if (state === "low_engagement") {
    supportLimits.push("The largest limiter appears to be schedule/adherence fit rather than child capability.");
    nextAdjustments.push("Reduce weekly plan size by one session and protect those sessions as non-negotiable.");
  }
  if (state === "inconsistent_support") {
    supportLimits.push("Support timing appears inconsistent, which can dilute progress signals.");
    nextAdjustments.push("Use a fixed day/time plan for the next two weeks before changing challenge level.");
  }
  if (state === "reflection_support_needed") {
    supportLimits.push("Reflection prompts appear underused or not yet improving reflection quality.");
    nextAdjustments.push("End each session with one reflection question: 'What helped you improve this attempt?'");
  }
  if (state === "challenge_calibration_support_needed") {
    supportLimits.push("Challenge level may be misaligned with the current implementation window.");
    nextAdjustments.push("Adjust challenge by one step (up or down) and observe completion and confidence changes for one week.");
  }
  if (state === "insufficient_data") {
    supportLimits.push("There is not yet enough implementation evidence for a confident facilitation interpretation.");
    nextAdjustments.push("Collect at least three completed sessions with coaching style + challenge entries.");
  }

  if (!doingWell.length) {
    doingWell.push("You are continuing to provide support while the system collects enough implementation evidence for stronger pattern interpretation.");
  }

  return {
    what_parent_is_doing_well: doingWell,
    support_style_limiters: supportLimits,
    challenge_fit_interpretation: implementation.challenge_average === null
      ? "Challenge-fit signal is limited due to sparse challenge-level data."
      : implementation.challenge_average >= 0.8
        ? "Challenge may currently be set high relative to implementation consistency."
        : implementation.challenge_average <= 0.45
          ? "Challenge may currently be set low relative to growth opportunity."
          : "Challenge level appears broadly aligned with the current implementation window.",
    reflection_prompt_interpretation: implementation.reflection_trend === "improving"
      ? "Reflection prompt quality is improving in recent check-ins."
      : "Reflection prompting support is still needed to strengthen strategy ownership.",
    scheduling_vs_child_need_interpretation: implementation.adherence_percentage <= 45
      ? "Adherence and scheduling fit are the primary constraints right now, not child weakness."
      : "Implementation scheduling is not the primary limiter in the current window.",
    recommended_next_adjustment: nextAdjustments[0] || "Continue current supportive approach and review trajectory after additional sessions.",
    child_pattern_context: child.interpretation || "Child pattern interpretation remains separate and non-clinical.",
    non_blaming_language: true,
    non_clinical_language: true,
  };
}

function buildParentCoachingSummary(snapshot = {}, inputs = {}, options = {}) {
  const childId = String(options.child_id || snapshot?.enrollment?.child_id || "").trim();
  const sessions = Array.isArray(snapshot.intervention_sessions) ? snapshot.intervention_sessions : [];
  const adherence = summarizeAdherence(snapshot.commitment_plan || null, sessions);
  const checkinSummary = summarizeDevelopmentCheckins(Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins : [], {
    current_week: snapshot?.enrollment?.current_week || snapshot?.progress_records?.at(-1)?.week_number || 1,
  });

  const insights = inputs.insights || { pillar_insights: [], confidence_context: { confidence_label: "low" } };
  const trajectory = inputs.trajectory || { trajectory_state: "insufficient_data", confidence_context: { confidence_label: "low" } };

  const parentPattern = buildParentImplementationPattern(snapshot, adherence, checkinSummary);
  const childPattern = buildChildPattern(insights, trajectory);
  const environmentPattern = buildEnvironmentPattern(insights, snapshot);

  const classificationInput = {
    ...parentPattern,
    child_trajectory_state: childPattern.trajectory_state,
  };

  const facilitation = classifyFacilitationState(classificationInput, CALIBRATION_VARIABLES.parent_coaching || {});
  const guidance = buildGuidance({
    facilitation_state: facilitation.facilitation_state,
    separated_patterns: {
      parent_facilitation_pattern: parentPattern,
      child_development_pattern: childPattern,
    },
  });

  const missingContracts = [
    ...(sessions.length < Number(CALIBRATION_VARIABLES.parent_coaching.minimum_sessions_for_parent_state || 3)
      ? ["parent_facilitation_session_history_required"]
      : []),
    ...((Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins.length : 0) === 0
      ? ["development_checkin_history_required_for_reflection_context"]
      : []),
    ...(Array.isArray(snapshot.environment_hooks) && snapshot.environment_hooks.length ? [] : ["environment_context_events_required"]),
    ...(insights?.pillar_insights ? [] : ["insight_layer_required"]),
    ...(trajectory?.trajectory_state ? [] : ["growth_trajectory_required"]),
  ];

  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    parent_coaching_schema_version: "phase21-v1",
    facilitation_states_supported: FACILITATION_STATES,
    facilitation_state: facilitation.facilitation_state,
    confidence_context: {
      confidence_label: facilitation.confidence_label,
      confidence_score: clamp01(facilitation.confidence_score),
      sparse_data: facilitation.facilitation_state === "insufficient_data",
      note: facilitation.facilitation_state === "insufficient_data"
        ? "Sparse implementation evidence yields low-confidence parent facilitation interpretation."
        : "Facilitation state is deterministic and should be interpreted as coaching support guidance only.",
    },
    separated_patterns: {
      child_development_pattern: childPattern,
      environment_context_pattern: environmentPattern,
      parent_facilitation_pattern: parentPattern,
      separation_guard: "parent_child_environment_patterns_reported_separately",
    },
    parent_guidance: guidance,
    facilitation_guidance: {
      state_summary: `Facilitation is currently classified as ${facilitation.facilitation_state}.`,
      explanation_trace: {
        reason_codes: facilitation.reason_codes,
        traceability: facilitation.traceability,
        rule_path: "parent_coaching/facilitation_guidance/v1",
      },
    },
    missing_contracts: [...new Set(missingContracts)].sort(),
    contracts_status: missingContracts.length ? "incomplete" : "complete",
    non_clinical: true,
  };
}

function buildParentGuidance(summary = {}) {
  return {
    ok: true,
    child_id: String(summary.child_id || ""),
    deterministic: true,
    extension_only: true,
    parent_guidance_schema_version: "phase21-v1",
    facilitation_state: summary.facilitation_state || "insufficient_data",
    confidence_context: summary.confidence_context || { confidence_label: "low", confidence_score: 0.2, sparse_data: true },
    parent_guidance: summary.parent_guidance || {},
    explanation_traceability: summary?.facilitation_guidance?.explanation_trace || {
      reason_codes: ["parent_coaching_summary_required"],
      traceability: { rule_path: "parent_coaching/facilitation_guidance/v1" },
      rule_path: "parent_coaching/facilitation_guidance/v1",
    },
    separated_patterns: summary.separated_patterns || {},
    missing_contracts: Array.isArray(summary.missing_contracts) ? summary.missing_contracts : ["parent_coaching_summary_required"],
    contracts_status: summary.contracts_status || "incomplete",
    non_clinical: true,
  };
}

module.exports = {
  FACILITATION_STATES,
  buildParentCoachingSummary,
  buildParentGuidance,
};
