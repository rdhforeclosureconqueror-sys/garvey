"use strict";

const { processTaskResult } = require("../measurement/signalProcessor");
const { aggregateTraitScores } = require("../measurement/traitAggregator");
const { buildYouthDevelopmentResult } = require("../measurement/resultBuilder");
const { buildYouthDevelopmentDashboard } = require("../measurement/dashboardBuilder");
const { buildParentDashboardPageModel } = require("../presentation/parentDashboardPageModel");
const { YOUTH_DEVELOPMENT_TASK_MODEL } = require("../measurement/taskModel");

const SUPPORTED_SCHEMA_VERSION = "1.0";
const ALLOWED_OPTIONS = new Set(["baseline_cutoff_timestamp", "ignore_contaminated", "allowed_contamination_flags"]);

function toIsoOrNull(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms).toISOString();
}

function parseOptionalIso(value, fieldPath, errors, warnings) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = toIsoOrNull(value);
  if (!normalized) {
    errors.push(`${fieldPath} must be a valid ISO-8601 timestamp when provided`);
    return undefined;
  }

  if (typeof value === "string" && value !== normalized) {
    warnings.push(`${fieldPath} normalized to canonical ISO format`);
  }

  return normalized;
}

function parseRequiredIso(value, fieldPath, errors, warnings) {
  if (typeof value !== "string" || !value.trim()) {
    errors.push(`${fieldPath} is required and must be an ISO-8601 timestamp`);
    return null;
  }

  const normalized = toIsoOrNull(value);
  if (!normalized) {
    errors.push(`${fieldPath} must be a valid ISO-8601 timestamp`);
    return null;
  }

  if (value !== normalized) {
    warnings.push(`${fieldPath} normalized to canonical ISO format`);
  }

  return normalized;
}

function validateTask(task, errors, path) {
  if (!task || typeof task !== "object") {
    errors.push(`${path} must be an object`);
    return;
  }

  const taskClass = String(task.task_class || "").trim();
  if (!taskClass) {
    errors.push(`${path}.task_class is required`);
  }

  const taskClassSpec = YOUTH_DEVELOPMENT_TASK_MODEL.task_classes[taskClass];
  if (!taskClassSpec) {
    errors.push(`${path}.task_class '${taskClass}' is unsupported`);
    return;
  }

  const evidenceSource = String(task.evidence_source || "").trim();
  if (!evidenceSource) {
    errors.push(`${path}.evidence_source is required`);
    return;
  }

  if (!taskClassSpec.allowed_evidence_sources.includes(evidenceSource)) {
    errors.push(`${path}.evidence_source '${evidenceSource}' is unsupported for task_class '${taskClass}'`);
  }
}

function normalizeOptions(rawOptions, errors, warnings) {
  const options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};

  Object.keys(options).forEach((key) => {
    if (!ALLOWED_OPTIONS.has(key)) {
      warnings.push(`options.${key} is unrecognized and ignored`);
    }
  });

  const normalized = {};

  const baselineCutoff = parseOptionalIso(
    options.baseline_cutoff_timestamp,
    "options.baseline_cutoff_timestamp",
    errors,
    warnings
  );
  if (baselineCutoff) normalized.baseline_cutoff_timestamp = baselineCutoff;

  if (options.ignore_contaminated !== undefined) {
    if (typeof options.ignore_contaminated !== "boolean") {
      errors.push("options.ignore_contaminated must be boolean when provided");
    } else {
      normalized.ignore_contaminated = options.ignore_contaminated;
    }
  }

  if (options.allowed_contamination_flags !== undefined) {
    if (!Array.isArray(options.allowed_contamination_flags)) {
      errors.push("options.allowed_contamination_flags must be an array when provided");
    } else {
      normalized.allowed_contamination_flags = options.allowed_contamination_flags
        .map((flag) => String(flag || "").trim())
        .filter(Boolean);
    }
  }

  return normalized;
}

function validateAndNormalizeTaskSessionPayload(payload = {}) {
  const errors = [];
  const warnings = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["request body must be a JSON object"], warnings };
  }

  const schemaVersion = String(payload.schema_version || "").trim();
  if (!schemaVersion) {
    errors.push("schema_version is required");
  } else if (schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    errors.push(`schema_version '${schemaVersion}' is unsupported`);
  }

  const sessionId = String(payload.session_id || "").trim();
  if (!sessionId) {
    errors.push("session_id is required");
  }

  const childId = String(payload.child_id || "").trim();
  if (!childId) {
    errors.push("child_id is required");
  }

  const submittedAt = parseRequiredIso(payload.submitted_at, "submitted_at", errors, warnings);

  if (!Array.isArray(payload.task_results)) {
    errors.push("task_results must be an array");
  }

  const normalizedTaskResults = [];
  if (Array.isArray(payload.task_results)) {
    payload.task_results.forEach((entry, idx) => {
      const basePath = `task_results[${idx}]`;
      if (!entry || typeof entry !== "object") {
        errors.push(`${basePath} must be an object`);
        return;
      }

      if (!entry.task || typeof entry.task !== "object") {
        errors.push(`${basePath}.task is required and must be an object`);
      }

      if (!entry.raw_input || typeof entry.raw_input !== "object") {
        errors.push(`${basePath}.raw_input is required and must be an object`);
      }

      validateTask(entry.task, errors, `${basePath}.task`);

      const rawInput = entry.raw_input && typeof entry.raw_input === "object" ? { ...entry.raw_input } : null;
      if (rawInput) {
        const rawTs = parseRequiredIso(rawInput.timestamp, `${basePath}.raw_input.timestamp`, errors, warnings);
        if (rawTs) rawInput.timestamp = rawTs;

        if (!rawInput.metrics || typeof rawInput.metrics !== "object" || Array.isArray(rawInput.metrics)) {
          errors.push(`${basePath}.raw_input.metrics must be an object`);
        }
      }

      if (entry.task && rawInput) {
        normalizedTaskResults.push({ task: { ...entry.task }, raw_input: rawInput });
      }
    });
  }

  const options = normalizeOptions(payload.options, errors, warnings);

  if (errors.length) {
    return { ok: false, errors, warnings };
  }

  return {
    ok: true,
    warnings,
    value: {
      schema_version: SUPPORTED_SCHEMA_VERSION,
      session_id: sessionId,
      child_id: childId,
      submitted_at: submittedAt,
      task_results: normalizedTaskResults,
      options,
    },
  };
}

function runTaskSessionPipeline(normalizedPayload) {
  const warnings = [];
  const signals = [];

  for (const entry of normalizedPayload.task_results) {
    const emitted = processTaskResult(entry.task, entry.raw_input);
    if (!Array.isArray(emitted) || !emitted.length) {
      warnings.push(`task '${entry.task.task_id || "unknown"}' emitted no signals`);
      continue;
    }

    signals.push(...emitted);
  }

  const aggregatedRows = aggregateTraitScores(signals, normalizedPayload.options || {});
  const result = buildYouthDevelopmentResult(aggregatedRows, {
    generated_at: normalizedPayload.submitted_at,
  });
  const dashboard = buildYouthDevelopmentDashboard(result, { maxItems: 5 });
  const pageModel = buildParentDashboardPageModel(dashboard, {
    page_title: "Youth Development Parent Dashboard",
    page_subtitle: "Computed from submitted task-session data.",
    maxItems: 5,
  });

  return {
    metadata: {
      schema_version: normalizedPayload.schema_version,
      session_id: normalizedPayload.session_id,
      child_id: normalizedPayload.child_id,
      submitted_at: normalizedPayload.submitted_at,
      options_applied: {
        ignore_contaminated: normalizedPayload.options.ignore_contaminated,
        baseline_cutoff_timestamp: normalizedPayload.options.baseline_cutoff_timestamp,
        allowed_contamination_flags: normalizedPayload.options.allowed_contamination_flags,
      },
    },
    processed_signal_count: signals.length,
    aggregated_trait_rows: aggregatedRows,
    result,
    dashboard,
    page_model: pageModel,
    warnings,
  };
}

function validateDirectSignalsPayload(payload = {}) {
  const errors = [];
  const warnings = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["request body must be a JSON object"], warnings };
  }

  if (!Array.isArray(payload.signals)) {
    errors.push("signals must be an array");
  }

  const normalizedSignals = [];
  if (Array.isArray(payload.signals)) {
    payload.signals.forEach((signal, idx) => {
      const path = `signals[${idx}]`;
      if (!signal || typeof signal !== "object") {
        errors.push(`${path} must be an object`);
        return;
      }

      const timestamp = parseRequiredIso(signal.timestamp, `${path}.timestamp`, errors, warnings);
      const normalizedSignal = Number(signal.normalized_signal);
      const confidenceWeight = Number(signal.confidence_weight);

      if (!Number.isFinite(normalizedSignal)) errors.push(`${path}.normalized_signal must be numeric`);
      if (!Number.isFinite(confidenceWeight)) errors.push(`${path}.confidence_weight must be numeric`);
      if (typeof signal.trait_code !== "string" || !signal.trait_code.trim()) errors.push(`${path}.trait_code is required`);
      if (typeof signal.task_class !== "string" || !signal.task_class.trim()) errors.push(`${path}.task_class is required`);
      if (typeof signal.evidence_source !== "string" || !signal.evidence_source.trim()) errors.push(`${path}.evidence_source is required`);

      if (timestamp && Number.isFinite(normalizedSignal) && Number.isFinite(confidenceWeight)) {
        normalizedSignals.push({
          ...signal,
          timestamp,
          normalized_signal: normalizedSignal,
          confidence_weight: confidenceWeight,
        });
      }
    });
  }

  const options = normalizeOptions(payload.options, errors, warnings);
  const submittedAt = parseOptionalIso(payload.submitted_at, "submitted_at", errors, warnings) || new Date().toISOString();

  if (errors.length) return { ok: false, errors, warnings };

  return {
    ok: true,
    warnings,
    value: {
      signals: normalizedSignals,
      options,
      submitted_at: submittedAt,
    },
  };
}

function runSignalsPipeline(normalizedPayload) {
  const aggregatedRows = aggregateTraitScores(normalizedPayload.signals, normalizedPayload.options || {});
  const result = buildYouthDevelopmentResult(aggregatedRows, {
    generated_at: normalizedPayload.submitted_at,
  });
  const dashboard = buildYouthDevelopmentDashboard(result, { maxItems: 5 });
  const pageModel = buildParentDashboardPageModel(dashboard, {
    page_title: "Youth Development Parent Dashboard",
    page_subtitle: "Computed from submitted normalized signals.",
    maxItems: 5,
  });

  return {
    metadata: {
      submitted_at: normalizedPayload.submitted_at,
      options_applied: {
        ignore_contaminated: normalizedPayload.options.ignore_contaminated,
        baseline_cutoff_timestamp: normalizedPayload.options.baseline_cutoff_timestamp,
        allowed_contamination_flags: normalizedPayload.options.allowed_contamination_flags,
      },
    },
    processed_signal_count: normalizedPayload.signals.length,
    aggregated_trait_rows: aggregatedRows,
    result,
    dashboard,
    page_model: pageModel,
    warnings: [],
  };
}

module.exports = {
  validateAndNormalizeTaskSessionPayload,
  runTaskSessionPipeline,
  validateDirectSignalsPayload,
  runSignalsPipeline,
};
