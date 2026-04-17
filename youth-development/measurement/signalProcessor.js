"use strict";

const { YOUTH_DEVELOPMENT_TASK_MODEL } = require("./taskModel");
const {
  DEFAULT_CALIBRATION_VERSION,
  resolveEvidenceStatusTag,
  resolveSourceType,
  createDeterministicSignalId,
} = require("../tdeGovernance");

const RUBRIC_LEVEL_MAP = Object.freeze({
  0: 0.0,
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1.0,
  novice: 0.2,
  emerging: 0.4,
  developing: 0.6,
  proficient: 0.8,
  advanced: 1.0,
});

const EVIDENCE_RELIABILITY = Object.freeze({
  child_task: 0.9,
  child_scenario: 0.82,
  child_retry: 0.88,
  assessor_observation: 0.8,
  teacher_observation: 0.74,
  parent_observation: 0.68,
});

const SCORING_TYPE_RELIABILITY = Object.freeze({
  analytic: 0.95,
  rubric: 0.85,
  frequency: 0.75,
  delta: 0.9,
  observation: 0.7,
});

const PRESENCE_SIGNALS = new Set(["strategy_use_presence", "strategy_shift_detected"]);
const REENGAGEMENT_METRICS = new Set(["reengagement_latency"]);

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

function getTaskClassSpec(taskClass) {
  const spec = YOUTH_DEVELOPMENT_TASK_MODEL.task_classes[taskClass];
  if (!spec) {
    throw new Error(`Unsupported task_class: ${taskClass}`);
  }

  return spec;
}

function toIsoTimestamp(rawInput) {
  if (typeof rawInput.timestamp === "string" && rawInput.timestamp.trim()) {
    return new Date(rawInput.timestamp).toISOString();
  }

  return new Date().toISOString();
}

function normalizeRubricValue(value) {
  if (typeof value === "number") {
    if (value <= 1) {
      return clamp01(value);
    }

    if (value <= 4) {
      return clamp01(value / 4);
    }
  }

  if (typeof value === "string") {
    const normalized = RUBRIC_LEVEL_MAP[value.trim().toLowerCase()];
    if (typeof normalized === "number") {
      return normalized;
    }
  }

  return 0;
}

function normalizeFrequency(value, expectedMax = 10) {
  if (!Number.isFinite(value) || expectedMax <= 0) {
    return 0;
  }

  return clamp01(value / expectedMax);
}

function normalizeLatency(value, expectedMax = 60) {
  if (!Number.isFinite(value) || expectedMax <= 0) {
    return 0;
  }

  return clamp01(1 - value / expectedMax);
}

function normalizeDelta(deltaValue, span = 20) {
  if (!Number.isFinite(deltaValue) || span <= 0) {
    return 0.5;
  }

  return clamp01((deltaValue + span) / (2 * span));
}

function inferCompleteness(rawInput) {
  const expected = Array.isArray(rawInput.expected_signal_types) ? rawInput.expected_signal_types.length : 0;
  const available = rawInput.metrics && typeof rawInput.metrics === "object" ? Object.keys(rawInput.metrics).length : 0;

  if (!expected) {
    return available > 0 ? 0.8 : 0;
  }

  return clamp01(available / expected);
}

function inferConsistency(metricEntries) {
  if (metricEntries.length <= 1) {
    return 0.8;
  }

  const values = metricEntries.map(([, v]) => clamp01(v.normalized_signal));
  const mean = values.reduce((acc, v) => acc + v, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;

  return clamp01(1 - Math.sqrt(variance));
}

function computeConfidence(task, rawInput, metricEntries) {
  const evidenceReliability = EVIDENCE_RELIABILITY[task.evidence_source] ?? 0.7;
  const scoringReliability = SCORING_TYPE_RELIABILITY[task.scoring_type] ?? 0.75;
  const completeness = inferCompleteness(rawInput);
  const consistency = inferConsistency(metricEntries);

  return clamp01(
    0.35 * evidenceReliability +
      0.3 * scoringReliability +
      0.2 * completeness +
      0.15 * consistency
  );
}

function buildSignal(metricName, normalized, task, rawInput, confidenceWeight, contaminationFlags) {
  const timestamp = toIsoTimestamp(rawInput);
  const sourceType = resolveSourceType(task.evidence_source);
  const signalId = createDeterministicSignalId([
    task.task_id,
    task.trait_code,
    task.task_class,
    metricName,
    rawInput.source_id || "",
    timestamp,
  ]);
  const normalizedValue = clamp01(normalized);
  const boundedConfidence = clamp01(confidenceWeight);

  return Object.freeze({
    signal_id: signalId,
    signal_type: metricName,
    trait_code: task.trait_code,
    task_id: task.task_id,
    task_class: task.task_class,
    raw_value: rawInput.metrics?.[metricName] ?? null,
    raw_signal: rawInput.metrics?.[metricName] ?? null,
    normalized_value: normalizedValue,
    normalized_signal: normalizedValue,
    confidence_weight: boundedConfidence,
    evidence_source: task.evidence_source,
    source_type: sourceType,
    source_id: String(rawInput.source_id || task.task_id || task.trait_code || "unknown"),
    timestamp,
    age_band: String(rawInput.age_band || task.age_band || "UNSPECIFIED"),
    evidence_status_tag: resolveEvidenceStatusTag(task.trait_code, task.evidence_status_tag),
    calibration_version: String(rawInput.calibration_version || DEFAULT_CALIBRATION_VERSION),
    trace_ref: Object.freeze({
      task_id: task.task_id || null,
      metric_name: metricName,
      raw_input_timestamp: timestamp,
      metric_key: `metrics.${metricName}`,
    }),
    contamination_flags: contaminationFlags,
  });
}

function extractObsSignals(task, rawInput) {
  const signals = new Map();

  for (const metric of task.expected_signal_types || []) {
    const value = rawInput.metrics?.[metric];

    if (value == null) {
      continue;
    }

    if (typeof value === "number") {
      if (PRESENCE_SIGNALS.has(metric)) {
        signals.set(metric, { normalized_signal: clamp01(value > 0 ? 1 : 0) });
      } else {
        signals.set(metric, { normalized_signal: normalizeFrequency(value, rawInput.frequency_max ?? 10) });
      }
      continue;
    }

    signals.set(metric, { normalized_signal: normalizeRubricValue(value) });
  }

  return signals;
}

function extractSctSignals(task, rawInput) {
  const signals = new Map();

  for (const metric of task.expected_signal_types || []) {
    const value = rawInput.metrics?.[metric];
    if (value == null) {
      continue;
    }

    const normalized = task.scoring_type === "analytic" ? normalizeFrequency(Number(value), rawInput.analytic_max ?? 10) : normalizeRubricValue(value);

    signals.set(metric, { normalized_signal: normalized });
  }

  return signals;
}

function extractPrfSignals(task, rawInput) {
  const signals = new Map();

  for (const metric of task.expected_signal_types || []) {
    const value = rawInput.metrics?.[metric];
    if (value == null) {
      continue;
    }

    let normalized;
    if (REENGAGEMENT_METRICS.has(metric)) {
      normalized = normalizeLatency(Number(value), rawInput.latency_max ?? 60);
    } else if (task.scoring_type === "frequency") {
      normalized = normalizeFrequency(Number(value), rawInput.frequency_max ?? 10);
    } else if (task.scoring_type === "analytic") {
      normalized = normalizeFrequency(Number(value), rawInput.analytic_max ?? 10);
    } else {
      normalized = normalizeRubricValue(value);
    }

    signals.set(metric, { normalized_signal: normalized });
  }

  return signals;
}

function isComparableRetry(rawInput) {
  const baselineId = rawInput.baseline_attempt?.attempt_id;
  const retryId = rawInput.retry_attempt?.attempt_id;
  const baselineDemand = rawInput.baseline_attempt?.demand_signature;
  const retryDemand = rawInput.retry_attempt?.demand_signature;

  return Boolean(baselineId && retryId && baselineDemand && retryDemand && baselineDemand === retryDemand);
}

function extractRetSignals(task, rawInput) {
  if (!isComparableRetry(rawInput)) {
    return { signals: new Map(), blocked: true, reason: "RETRY_NOT_COMPARABLE" };
  }

  const signals = new Map();

  for (const metric of task.expected_signal_types || []) {
    const value = rawInput.metrics?.[metric];
    if (value == null) {
      continue;
    }

    let normalized;
    if (metric === "improvement_delta" || metric === "attempt_quality_change" || metric === "error_reduction") {
      normalized = normalizeDelta(Number(value), rawInput.delta_span ?? 20);
    } else if (metric === "strategy_shift_detected") {
      normalized = clamp01(value ? 1 : 0);
    } else if (metric === "reengagement_latency") {
      normalized = normalizeLatency(Number(value), rawInput.latency_max ?? 60);
    } else {
      normalized = normalizeFrequency(Number(value), rawInput.frequency_max ?? 10);
    }

    signals.set(metric, { normalized_signal: normalized });
  }

  return { signals, blocked: false };
}

function extractRefSignals(task, rawInput) {
  const signals = new Map();

  for (const metric of task.expected_signal_types || []) {
    const value = rawInput.metrics?.[metric];
    if (value == null) {
      continue;
    }

    const normalized = task.scoring_type === "analytic" ? normalizeFrequency(Number(value), rawInput.analytic_max ?? 10) : normalizeRubricValue(value);

    signals.set(metric, { normalized_signal: normalized });
  }

  return signals;
}

function validateAntiContamination(task, rawInput, metricEntries) {
  const flags = [];
  const metricNames = new Set(metricEntries.map(([metric]) => metric));

  if (task.trait_code === "SR") {
    const hasRegulationMarker = metricNames.has("strategy_use_presence") || metricNames.has("context_consistency");
    if (!hasRegulationMarker) {
      flags.push("SR_PS_SEPARATION_RISK");
    }
  }

  if (task.trait_code === "PS") {
    const hasPersistenceMarker = metricNames.has("attempt_quality_change") || metricNames.has("reengagement_latency");
    if (!hasPersistenceMarker) {
      flags.push("PS_SR_SEPARATION_RISK");
    }
  }

  if (task.trait_code === "CQ") {
    const hasInquiryMarker = metricNames.has("inquiry_depth") || metricNames.has("behavior_frequency");
    if (!hasInquiryMarker) {
      flags.push("CQ_CR_SEPARATION_RISK");
    }
  }

  if (task.trait_code === "CR") {
    const hasCreationMarker = metricNames.has("artifact_quality") || metricNames.has("option_diversity");
    if (!hasCreationMarker) {
      flags.push("CR_CQ_SEPARATION_RISK");
    }
  }

  if (task.trait_code === "FB") {
    if (task.task_class !== "RET" && rawInput.requires_retry_delta !== false) {
      flags.push("FB_RET_DELTA_REQUIRED");
    }
    const hasDelta = rawInput.metrics?.improvement_delta != null;
    if (task.task_class === "RET" && !hasDelta) {
      flags.push("FB_MISSING_IMPROVEMENT_DELTA");
    }
  }

  if (task.trait_code === "DE") {
    const windows = Number(rawInput.longitudinal_windows ?? 1);
    if (windows < 2) {
      flags.push("DE_LONGITUDINAL_REQUIRED");
    }
  }

  return flags;
}

function processTaskResult(task, rawInput) {
  if (!task || typeof task !== "object") {
    throw new Error("processTaskResult requires a task object");
  }

  if (!rawInput || typeof rawInput !== "object") {
    throw new Error("processTaskResult requires a rawInput object");
  }

  const taskClassSpec = getTaskClassSpec(task.task_class);
  if (!taskClassSpec.allowed_evidence_sources.includes(task.evidence_source)) {
    throw new Error(`Invalid evidence_source '${task.evidence_source}' for task_class '${task.task_class}'`);
  }

  let extracted;
  if (task.task_class === "OBS") {
    extracted = { signals: extractObsSignals(task, rawInput), blocked: false };
  } else if (task.task_class === "SCT") {
    extracted = { signals: extractSctSignals(task, rawInput), blocked: false };
  } else if (task.task_class === "PRF") {
    extracted = { signals: extractPrfSignals(task, rawInput), blocked: false };
  } else if (task.task_class === "RET") {
    extracted = extractRetSignals(task, rawInput);
  } else if (task.task_class === "REF") {
    extracted = { signals: extractRefSignals(task, rawInput), blocked: false };
  } else {
    throw new Error(`Unhandled task_class '${task.task_class}'`);
  }

  if (extracted.blocked) {
    return [];
  }

  const metricEntries = [...extracted.signals.entries()];
  const contaminationFlags = validateAntiContamination(task, rawInput, metricEntries);
  const confidenceWeight = computeConfidence(task, rawInput, metricEntries);

  return metricEntries.map(([metricName, payload]) =>
    buildSignal(metricName, payload.normalized_signal, task, rawInput, confidenceWeight, contaminationFlags)
  );
}

module.exports = {
  processTaskResult,
  NORMALIZATION_RULES: Object.freeze({
    rubric: "Rubric values map to fixed 0-1 anchors (0/1/2/3/4 and novice→advanced).",
    frequency: "Frequency values are min-max scaled by provided maxima and clamped to [0,1].",
    delta: "Delta values are centered and bounded with (delta + span)/(2*span).",
    latency: "Latency is inverted against a maximum reference window and clamped.",
  }),
};
