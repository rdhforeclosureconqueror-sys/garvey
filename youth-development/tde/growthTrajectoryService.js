"use strict";

const { CALIBRATION_VARIABLES, TRAIT_DEFINITIONS } = require("./constants");

const PILLAR_ORDER = Object.freeze(["SR", "CQ", "CR", "RS", "PS", "FB", "DE"]);
const TRAJECTORY_STATES = new Set(["improving", "stable", "plateauing", "inconsistent", "regressing", "insufficient_data"]);

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

function stddev(values = []) {
  if (values.length <= 1) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => ((Number(value) || 0) - mean) ** 2));
  return Math.sqrt(variance);
}

function toAdherenceRate(sessions = []) {
  if (!sessions.length) return null;
  const completeCount = sessions.filter((entry) => entry.full_session_completed === true).length;
  return Number((completeCount / sessions.length).toFixed(3));
}

function scoreFromMilestone(entry = {}, pillarCode) {
  const summary = entry && typeof entry.trait_signal_summary === "object" ? entry.trait_signal_summary : null;
  if (!summary) return null;
  const value = Number(summary[pillarCode]);
  if (!Number.isFinite(value)) return null;
  return clamp01(value);
}

function extractPillarSeries(snapshot = {}, pillarCode) {
  const progressRecords = Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [];
  return progressRecords
    .map((entry) => ({
      week_number: Number(entry.week_number || 0),
      progress_id: String(entry.progress_id || `week-${entry.week_number || "unknown"}`),
      score: scoreFromMilestone(entry, pillarCode),
      checkpoint_type: entry?.checkpoint_record?.checkpoint_type || null,
      completed_at: entry.completed_at || null,
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.week_number - b.week_number);
}

function classifyDirection(series = [], calibration = {}) {
  const minPoints = Number(calibration.min_points_for_direction || 3);
  const improvingMin = Number(calibration.improving_delta_min || 0.05);
  const regressingMax = Number(calibration.regressing_delta_max || -0.05);
  const stableAbsMax = Number(calibration.stable_delta_abs_max || 0.02);
  const plateauAbsMax = Number(calibration.plateau_delta_abs_max || 0.03);
  const inconsistentStdMin = Number(calibration.inconsistent_stddev_min || 0.09);

  if (series.length < minPoints) {
    return {
      state: "insufficient_data",
      confidence: "low",
      recent_delta: null,
      medium_delta: null,
      volatility: null,
      reason: "minimum_points_not_met",
    };
  }

  const scores = series.map((entry) => entry.score);
  const latest = scores.at(-1);
  const prior = scores.at(-2);
  const mediumAnchor = scores.at(Math.max(0, scores.length - 4));
  const recentDelta = Number((latest - prior).toFixed(3));
  const mediumDelta = Number((latest - mediumAnchor).toFixed(3));
  const volatility = Number(stddev(scores.slice(-4)).toFixed(3));

  let state = "stable";
  if (volatility >= inconsistentStdMin && Math.abs(mediumDelta) <= plateauAbsMax) {
    state = "inconsistent";
  } else if (mediumDelta >= improvingMin && recentDelta >= stableAbsMax) {
    state = "improving";
  } else if (mediumDelta <= regressingMax && recentDelta <= -stableAbsMax) {
    state = "regressing";
  } else if (Math.abs(mediumDelta) <= plateauAbsMax && Math.abs(recentDelta) <= stableAbsMax) {
    state = "plateauing";
  } else if (Math.abs(mediumDelta) <= plateauAbsMax) {
    state = "stable";
  }

  let confidence = "moderate";
  if (series.length >= 6 && volatility <= inconsistentStdMin / 2) confidence = "high";
  if (state === "inconsistent") confidence = "low";

  return {
    state,
    confidence,
    recent_delta: recentDelta,
    medium_delta: mediumDelta,
    volatility,
    reason: "direction_rules_applied",
  };
}

function buildPillarTrajectory(snapshot = {}, pillarCode, contexts = {}) {
  const calibration = CALIBRATION_VARIABLES.growth_trajectory || {};
  const series = extractPillarSeries(snapshot, pillarCode);
  const direction = classifyDirection(series, calibration);
  const adherenceRate = toAdherenceRate(contexts.sessions || []);
  const lowAdherenceThreshold = Number(calibration.low_adherence_max || 0.6);
  const adherenceLimited = Number.isFinite(adherenceRate) && adherenceRate < lowAdherenceThreshold;

  const environmentHooks = Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks : [];
  const pillarHooks = environmentHooks.filter((entry) => {
    const code = String(entry.trait_code || entry?.event_payload?.trait_code || "").trim();
    return code === pillarCode || !code;
  });
  const envShiftCount = pillarHooks.filter((entry) => String(entry.event_type || "").includes("change") || String(entry.environment_factor || "").includes("friction")).length;
  const environmentLikelyContributed = pillarHooks.length >= 2 && envShiftCount >= 1;

  const confidenceNotes = [];
  if (direction.state === "insufficient_data") confidenceNotes.push("insufficient milestone points for directional interpretation");
  if (adherenceLimited) confidenceNotes.push("adherence inconsistency limits interpretation confidence");
  if (!pillarHooks.length) confidenceNotes.push("environment context stream sparse for this pillar");

  return {
    pillar_code: pillarCode,
    pillar_name: TRAIT_DEFINITIONS[pillarCode].name,
    trajectory_state: direction.state,
    confidence_label: direction.confidence,
    recent_direction: direction.recent_delta,
    medium_window_direction: direction.medium_delta,
    confidence_limits: confidenceNotes,
    environment_context: {
      likely_contributed: environmentLikelyContributed,
      hook_count: pillarHooks.length,
      interpretation_note: environmentLikelyContributed
        ? "Environment/context shifts likely influenced observed pillar direction."
        : "No strong environment/context contribution isolated in current window.",
      traceability: pillarHooks.slice(-3).map((entry) => ({
        event_id: entry.event_id || null,
        environment_factor: entry.environment_factor || null,
        event_type: entry.event_type || null,
        trace_ref: entry.trace_ref || null,
      })),
      rule_path: "growth_trajectory/pillar/environment_context/v1",
    },
    adherence_interpretation: {
      interpretation_limited: adherenceLimited,
      adherence_rate: adherenceRate,
      threshold_max: lowAdherenceThreshold,
      note: adherenceLimited
        ? "Adherence inconsistency can explain part of observed movement and limits direct growth interpretation."
        : "Adherence consistency is currently adequate for directional interpretation.",
      rule_path: "growth_trajectory/pillar/adherence_interpretation/v1",
    },
    traceability: {
      series_points: series.slice(-6).map((entry) => ({
        week_number: entry.week_number,
        progress_id: entry.progress_id,
        score: entry.score,
      })),
      classification_inputs: {
        recent_delta: direction.recent_delta,
        medium_delta: direction.medium_delta,
        volatility: direction.volatility,
      },
      rule_path: "growth_trajectory/pillar/classification/v1",
    },
  };
}

function buildOverallTrajectoryState(pillarSummaries = []) {
  const states = pillarSummaries.map((entry) => entry.trajectory_state).filter((value) => TRAJECTORY_STATES.has(value));
  if (!states.length) return "insufficient_data";

  const counts = states.reduce((acc, state) => {
    acc[state] = (acc[state] || 0) + 1;
    return acc;
  }, {});

  if ((counts.insufficient_data || 0) >= 4) return "insufficient_data";
  if ((counts.regressing || 0) >= 3) return "regressing";
  if ((counts.inconsistent || 0) >= 3) return "inconsistent";
  if ((counts.improving || 0) >= 4) return "improving";
  if ((counts.plateauing || 0) >= 3) return "plateauing";
  return "stable";
}

function buildMilestoneComparison(snapshot = {}, options = {}) {
  const childId = String(options.child_id || snapshot?.enrollment?.child_id || "").trim();
  const records = (Array.isArray(snapshot.progress_records) ? snapshot.progress_records : [])
    .filter((entry) => entry && typeof entry.trait_signal_summary === "object")
    .sort((a, b) => Number(a.week_number || 0) - Number(b.week_number || 0));

  const milestoneRows = records.filter((entry) => entry.checkpoint_record && typeof entry.checkpoint_record === "object");
  const first = milestoneRows[0] || records[0] || null;
  const latest = milestoneRows.at(-1) || records.at(-1) || null;

  const missingContracts = [];
  if (!records.length) missingContracts.push("missing_progress_records_for_milestone_comparison");
  if (!milestoneRows.length) missingContracts.push("missing_checkpoint_records_for_milestone_interpretation");

  const pillarComparisons = PILLAR_ORDER.map((pillarCode) => {
    const baseline = scoreFromMilestone(first || {}, pillarCode);
    const current = scoreFromMilestone(latest || {}, pillarCode);
    const delta = (Number.isFinite(baseline) && Number.isFinite(current)) ? Number((current - baseline).toFixed(3)) : null;
    return {
      pillar_code: pillarCode,
      pillar_name: TRAIT_DEFINITIONS[pillarCode].name,
      baseline_score: baseline,
      latest_score: current,
      delta,
      direction: delta === null ? "insufficient_data" : (delta >= 0.05 ? "up" : (delta <= -0.05 ? "down" : "flat")),
      traceability: {
        baseline_week: first?.week_number || null,
        latest_week: latest?.week_number || null,
        baseline_progress_id: first?.progress_id || null,
        latest_progress_id: latest?.progress_id || null,
      },
    };
  });

  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    milestone_comparison_schema_version: "phase19-v1",
    window: {
      baseline_week: first?.week_number || null,
      latest_week: latest?.week_number || null,
      baseline_checkpoint_type: first?.checkpoint_record?.checkpoint_type || null,
      latest_checkpoint_type: latest?.checkpoint_record?.checkpoint_type || null,
    },
    pillar_comparisons: pillarComparisons,
    missing_contracts: missingContracts,
    contracts_status: missingContracts.length ? "incomplete" : "complete",
  };
}

function buildGrowthTrajectory(snapshot = {}, inputs = {}, options = {}) {
  const childId = String(options.child_id || snapshot?.enrollment?.child_id || inputs?.insights?.child_id || "").trim();
  const sessions = Array.isArray(snapshot.intervention_sessions) ? snapshot.intervention_sessions : [];
  const pillarSummaries = PILLAR_ORDER.map((pillarCode) => buildPillarTrajectory(snapshot, pillarCode, { sessions }));
  const overallState = buildOverallTrajectoryState(pillarSummaries);

  const insights = inputs.insights || {};
  const patternHistory = inputs.pattern_history || {};
  const milestoneComparison = inputs.milestone_comparison || buildMilestoneComparison(snapshot, { child_id: childId });

  const confidenceSignals = [
    insights?.confidence_context?.confidence_label || "low",
    patternHistory?.confidence_context?.confidence_label || "low",
    ...pillarSummaries.map((entry) => entry.confidence_label),
  ];
  const highCount = confidenceSignals.filter((value) => value === "high").length;
  const lowCount = confidenceSignals.filter((value) => value === "low").length;
  const confidenceLabel = lowCount >= 4 ? "low" : (highCount >= 4 ? "high" : "moderate");

  const missingContracts = [
    ...(insights?.missing_contracts || []),
    ...(patternHistory?.missing_contracts || []),
    ...(milestoneComparison?.missing_contracts || []),
  ];

  return {
    ok: true,
    child_id: childId,
    deterministic: true,
    extension_only: true,
    growth_trajectory_schema_version: "phase19-v1",
    trajectory_state: overallState,
    confidence_context: {
      confidence_label: confidenceLabel,
      note: confidenceLabel === "low"
        ? "Directional interpretation is low-confidence and should remain provisional."
        : "Directional interpretation is bounded and non-clinical.",
      rule_path: "growth_trajectory/confidence/v1",
    },
    trajectory_explanation: {
      summary: `Overall developmental direction is currently classified as ${overallState}.`,
      non_clinical: true,
      predictive_claim: false,
      based_on: {
        baseline_data_present: Boolean(snapshot?.enrollment),
        weekly_checkins_count: Array.isArray(snapshot.development_checkins) ? snapshot.development_checkins.length : 0,
        intervention_history_count: sessions.length,
        pattern_history_present: Boolean(patternHistory?.pattern_history),
        insight_layer_present: Boolean(insights?.pillar_insights),
        milestone_rows: Array.isArray(snapshot.progress_records) ? snapshot.progress_records.length : 0,
        environment_context_events: Array.isArray(snapshot.environment_hooks) ? snapshot.environment_hooks.length : 0,
      },
      rule_path: "growth_trajectory/explanation/v1",
    },
    pillar_trajectories: pillarSummaries,
    milestone_comparison_summary: {
      window: milestoneComparison.window,
      upward_pillars: milestoneComparison.pillar_comparisons.filter((entry) => entry.direction === "up").map((entry) => entry.pillar_code),
      downward_pillars: milestoneComparison.pillar_comparisons.filter((entry) => entry.direction === "down").map((entry) => entry.pillar_code),
      flat_pillars: milestoneComparison.pillar_comparisons.filter((entry) => entry.direction === "flat").map((entry) => entry.pillar_code),
      rule_path: "growth_trajectory/milestone_comparison_summary/v1",
    },
    missing_contracts: [...new Set(missingContracts)].sort(),
    contracts_status: missingContracts.length ? "incomplete" : "complete",
  };
}

module.exports = {
  buildGrowthTrajectory,
  buildMilestoneComparison,
};
