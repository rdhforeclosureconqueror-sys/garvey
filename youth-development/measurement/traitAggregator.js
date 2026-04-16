"use strict";

const { YOUTH_DEVELOPMENT_TASK_MODEL } = require("./taskModel");
const { YOUTH_DEVELOPMENT_TRAIT_MODEL } = require("./traitModel");

const BASELINE_LABELS = new Set(["baseline", "base", "initial", "pre"]);
const CURRENT_LABELS = new Set(["current", "latest", "post", "followup", "follow_up"]);

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 100) {
    return 100;
  }

  return Number(value.toFixed(4));
}

function toTimestamp(value) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeWindowLabel(signal) {
  const value =
    signal.measurement_window ??
    signal.window_type ??
    signal.window ??
    signal.period ??
    null;

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (BASELINE_LABELS.has(normalized)) {
    return "baseline";
  }

  if (CURRENT_LABELS.has(normalized)) {
    return "current";
  }

  return null;
}

function weightedMean(signals) {
  let numerator = 0;
  let denominator = 0;

  for (const signal of signals) {
    const normalized = clamp01(signal.normalized_signal);
    const confidence = clamp01(signal.confidence_weight);
    numerator += normalized * confidence;
    denominator += confidence;
  }

  if (!denominator) {
    return 0;
  }

  return numerator / denominator;
}

function computeConsistency(signals) {
  if (signals.length <= 1) {
    return 1;
  }

  const values = signals.map((signal) => clamp01(signal.normalized_signal));
  const mean = values.reduce((acc, value) => acc + value, 0) / values.length;
  const variance = values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length;

  return clamp01(1 - Math.sqrt(variance));
}

function resolveEvidenceMixSignals(signals) {
  const allowedEvidenceSources = new Set(Object.keys(YOUTH_DEVELOPMENT_TRAIT_MODEL.evidence_sources));

  return signals.filter(
    (signal) =>
      typeof signal.task_class === "string" &&
      typeof signal.evidence_source === "string" &&
      allowedEvidenceSources.has(signal.evidence_source)
  );
}

function computeEvidenceMixScore(traitCode, signals) {
  if (!signals.length) {
    return 0;
  }

  const mapping = YOUTH_DEVELOPMENT_TASK_MODEL.trait_task_mapping[traitCode];
  const traitSpec = YOUTH_DEVELOPMENT_TRAIT_MODEL.traits[traitCode];
  const validSignals = resolveEvidenceMixSignals(signals);
  if (!validSignals.length) {
    return 0;
  }

  const taskCounts = new Map();
  const sourceCounts = new Map();
  for (const signal of validSignals) {
    taskCounts.set(signal.task_class, (taskCounts.get(signal.task_class) ?? 0) + 1);
    sourceCounts.set(signal.evidence_source, (sourceCounts.get(signal.evidence_source) ?? 0) + 1);
  }

  const allowedTaskClasses = mapping?.allowed_task_classes ?? [];
  const allowedEvidence = traitSpec?.allowed_evidence_sources ?? [];

  const taskCoverage = allowedTaskClasses.length
    ? taskCounts.size / allowedTaskClasses.length
    : 0;
  const sourceCoverage = allowedEvidence.length
    ? sourceCounts.size / allowedEvidence.length
    : 0;

  const dominance = Math.max(...sourceCounts.values()) / validSignals.length;
  const dominancePenalty = Math.max(0, dominance - 0.65) * 0.6;

  const requiredTaskClasses = mapping?.minimum_evidence_mix?.required_task_classes ?? [];
  const missingRequired = requiredTaskClasses.filter((taskClass) => !taskCounts.has(taskClass));
  const missingPenalty = requiredTaskClasses.length
    ? (missingRequired.length / requiredTaskClasses.length) * 0.45
    : 0;

  const mix = 0.55 * clamp01(taskCoverage) + 0.45 * clamp01(sourceCoverage) - dominancePenalty - missingPenalty;
  return clampScore(clamp01(mix) * 100);
}

function computeConfidenceScore(traitCode, signals, evidenceMixScore) {
  if (!signals.length) {
    return 0;
  }

  const avgConfidence =
    signals.reduce((acc, signal) => acc + clamp01(signal.confidence_weight), 0) / signals.length;
  const consistency = computeConsistency(signals);
  const diversity = clamp01(evidenceMixScore / 100);

  const confidence = 0.45 * avgConfidence + 0.35 * consistency + 0.2 * diversity;
  return clampScore(clamp01(confidence) * 100);
}

function linearSlopePerDay(signals) {
  if (signals.length < 2) {
    return 0;
  }

  const points = signals
    .map((signal) => ({
      x: toTimestamp(signal.timestamp),
      y: clamp01(signal.normalized_signal),
    }))
    .filter((point) => point.x > 0)
    .sort((a, b) => a.x - b.x);

  if (points.length < 2) {
    return 0;
  }

  const x0 = points[0].x;
  const normPoints = points.map((point) => ({
    x: (point.x - x0) / 86_400_000,
    y: point.y,
  }));

  const n = normPoints.length;
  const sumX = normPoints.reduce((acc, point) => acc + point.x, 0);
  const sumY = normPoints.reduce((acc, point) => acc + point.y, 0);
  const sumXY = normPoints.reduce((acc, point) => acc + point.x * point.y, 0);
  const sumX2 = normPoints.reduce((acc, point) => acc + point.x * point.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (!denominator) {
    return 0;
  }

  return (n * sumXY - sumX * sumY) / denominator;
}

function resolveTrendDirection(signals) {
  const slope = linearSlopePerDay(signals);
  if (slope > 0.003) {
    return "increasing";
  }

  if (slope < -0.003) {
    return "decreasing";
  }

  return "stable";
}

function checkTraitConstraints(traitCode, signals) {
  const mapping = YOUTH_DEVELOPMENT_TASK_MODEL.trait_task_mapping[traitCode];
  if (!mapping) {
    return false;
  }

  if (!signals.length) {
    return false;
  }

  const allowedTaskClasses = new Set(mapping.allowed_task_classes ?? []);
  if (signals.some((signal) => !allowedTaskClasses.has(signal.task_class))) {
    return false;
  }

  const minimumTotalSignals = mapping.minimum_evidence_mix?.minimum_total_signals_per_window ?? 0;
  if (signals.length < minimumTotalSignals) {
    return false;
  }

  const presentTaskClasses = new Set(signals.map((signal) => signal.task_class));
  const requiredTaskClasses = mapping.minimum_evidence_mix?.required_task_classes ?? [];
  if (requiredTaskClasses.some((taskClass) => !presentTaskClasses.has(taskClass))) {
    return false;
  }

  const minimumLongitudinalWindows = mapping.minimum_evidence_mix?.minimum_longitudinal_windows;
  if (minimumLongitudinalWindows) {
    const windows = new Set(
      signals
        .map((signal) => {
          const label = normalizeWindowLabel(signal);
          if (label) {
            return label;
          }

          if (typeof signal.timestamp === "string" && signal.timestamp.length >= 10) {
            return signal.timestamp.slice(0, 10);
          }

          return null;
        })
        .filter(Boolean)
    );

    if (windows.size < minimumLongitudinalWindows) {
      return false;
    }
  }

  return true;
}

function resolveSignalWindow(signal, oldestTimestamp, baselineCutoffTimestamp) {
  const explicitLabel = normalizeWindowLabel(signal);
  if (explicitLabel) {
    return explicitLabel;
  }

  if (signal.is_baseline === true) {
    return "baseline";
  }

  if (signal.is_current === true) {
    return "current";
  }

  const timestamp = toTimestamp(signal.timestamp);
  if (baselineCutoffTimestamp && timestamp) {
    return timestamp <= baselineCutoffTimestamp ? "baseline" : "current";
  }

  return timestamp === oldestTimestamp ? "baseline" : "current";
}

function shouldRejectForContamination(signal, options) {
  const flags = Array.isArray(signal.contamination_flags) ? signal.contamination_flags.filter(Boolean) : [];
  if (!flags.length) {
    return false;
  }

  if (Array.isArray(options.allowed_contamination_flags) && options.allowed_contamination_flags.length) {
    const allowed = new Set(options.allowed_contamination_flags);
    return flags.some((flag) => !allowed.has(flag));
  }

  return options.ignore_contaminated !== false;
}

function sortSignalsDeterministically(signals) {
  return [...signals].sort((a, b) => {
    const traitCompare = String(a.trait_code).localeCompare(String(b.trait_code));
    if (traitCompare !== 0) {
      return traitCompare;
    }

    const timestampCompare = toTimestamp(a.timestamp) - toTimestamp(b.timestamp);
    if (timestampCompare !== 0) {
      return timestampCompare;
    }

    const taskCompare = String(a.task_id ?? "").localeCompare(String(b.task_id ?? ""));
    if (taskCompare !== 0) {
      return taskCompare;
    }

    return String(a.signal_type ?? "").localeCompare(String(b.signal_type ?? ""));
  });
}

function aggregateTraitScores(signals = [], options = {}) {
  if (!Array.isArray(signals)) {
    throw new Error("aggregateTraitScores requires an array of signals");
  }

  const sortedSignals = sortSignalsDeterministically(signals)
    .filter((signal) => signal && typeof signal === "object")
    .filter((signal) => typeof signal.trait_code === "string")
    .filter((signal) => Number.isFinite(signal.normalized_signal))
    .filter((signal) => Number.isFinite(signal.confidence_weight))
    .filter((signal) => !shouldRejectForContamination(signal, options));

  const grouped = new Map();
  for (const signal of sortedSignals) {
    if (!grouped.has(signal.trait_code)) {
      grouped.set(signal.trait_code, []);
    }

    grouped.get(signal.trait_code).push(signal);
  }

  const baselineCutoffTimestamp = toTimestamp(options.baseline_cutoff_timestamp);
  const rows = [];

  for (const [traitCode, traitSignals] of grouped.entries()) {
    if (!checkTraitConstraints(traitCode, traitSignals)) {
      continue;
    }

    const timestamps = traitSignals.map((signal) => toTimestamp(signal.timestamp)).filter((value) => value > 0);
    const oldestTimestamp = timestamps.length ? Math.min(...timestamps) : 0;

    const baselineSignals = [];
    const currentSignals = [];

    for (const signal of traitSignals) {
      const bucket = resolveSignalWindow(signal, oldestTimestamp, baselineCutoffTimestamp);
      if (bucket === "baseline") {
        baselineSignals.push(signal);
      } else {
        currentSignals.push(signal);
      }
    }

    const baselineWeighted = weightedMean(baselineSignals.length ? baselineSignals : traitSignals);
    const currentWeighted = weightedMean(currentSignals.length ? currentSignals : traitSignals);
    const evidenceMixScore = computeEvidenceMixScore(traitCode, traitSignals);
    const confidenceScore = computeConfidenceScore(traitCode, traitSignals, evidenceMixScore);

    const baselineScore = clampScore(baselineWeighted * 100);
    const currentScore = clampScore(currentWeighted * 100);
    const rawChangeScore = currentScore - baselineScore;
    const changeScore = Math.max(-100, Math.min(100, Number(rawChangeScore.toFixed(4))));

    rows.push(
      Object.freeze({
        trait_code: traitCode,
        baseline_score: baselineScore,
        current_score: currentScore,
        change_score: changeScore,
        confidence_score: confidenceScore,
        evidence_mix_score: evidenceMixScore,
        trend_direction: resolveTrendDirection(traitSignals),
      })
    );
  }

  return rows.sort((a, b) => a.trait_code.localeCompare(b.trait_code));
}

module.exports = {
  aggregateTraitScores,
  AGGREGATION_NOTES: Object.freeze({
    weighted_mean: "weighted_mean = Σ(normalized_signal * confidence_weight) / Σ(confidence_weight)",
    change: "change_score = current_score - baseline_score",
    confidence:
      "confidence_score = 100 * (0.45*avg_confidence_weight + 0.35*consistency + 0.20*evidence_diversity)",
    trend: "trend_direction comes from linear slope of normalized_signal over time (per day)",
  }),
};
