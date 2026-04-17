"use strict";

const {
  clamp01,
  DEFAULT_CALIBRATION_VERSION,
  EVIDENCE_STATUS_TAG,
  deterministicId,
} = require("./constants");

const NUMERIC_TYPES = new Set([
  "context_consistency", "rule_adherence", "process_efficiency", "inquiry_depth", "behavior_frequency",
  "justification_quality", "option_diversity", "artifact_quality", "attempt_quality_change", "execution_accuracy",
  "decision_quality", "completion_quality", "error_reduction", "progress_attribution_quality", "domain_commitment_language",
]);
const BINARY_TYPES = new Set(["strategy_use_presence", "strategy_shift_detected"]);
const DELTA_TYPES = new Set(["improvement_delta"]);
const INVERSE_LATENCY_TYPES = new Set(["reengagement_latency"]);

function parseNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeEvidenceValue(evidence) {
  const signalType = String(evidence.signal_type || "").trim();
  if (!signalType) return { ok: false, reason: "missing_signal_type" };

  if (BINARY_TYPES.has(signalType)) {
    const raw = evidence.value;
    const numeric = typeof raw === "boolean" ? (raw ? 1 : 0) : parseNumber(raw);
    if (numeric == null) return { ok: false, reason: "unnormalizable_binary" };
    return { ok: true, normalized_value: clamp01(numeric > 0 ? 1 : 0) };
  }

  if (NUMERIC_TYPES.has(signalType)) {
    const numeric = parseNumber(evidence.value);
    if (numeric == null) return { ok: false, reason: "unnormalizable_numeric" };
    const min = parseNumber(evidence.value_min) ?? 0;
    const max = parseNumber(evidence.value_max) ?? 4;
    if (max <= min) return { ok: false, reason: "invalid_numeric_bounds" };
    return { ok: true, normalized_value: clamp01((numeric - min) / (max - min)) };
  }

  if (DELTA_TYPES.has(signalType)) {
    const delta = parseNumber(evidence.value);
    if (delta == null) return { ok: false, reason: "unnormalizable_delta" };
    const span = parseNumber(evidence.delta_span) ?? 20;
    if (span <= 0) return { ok: false, reason: "invalid_delta_span" };
    return { ok: true, normalized_value: clamp01((delta + span) / (2 * span)) };
  }

  if (INVERSE_LATENCY_TYPES.has(signalType)) {
    const latency = parseNumber(evidence.value);
    if (latency == null) return { ok: false, reason: "unnormalizable_latency" };
    const maxLatency = parseNumber(evidence.latency_max) ?? 60;
    if (maxLatency <= 0) return { ok: false, reason: "invalid_latency_max" };
    return { ok: true, normalized_value: clamp01(1 - latency / maxLatency) };
  }

  return { ok: false, reason: "unsupported_signal_type" };
}

function extractSignalsFromEvidence(payload = {}) {
  const evidence = Array.isArray(payload.evidence) ? payload.evidence : [];
  const calibrationVersion = String(payload.calibration_version || DEFAULT_CALIBRATION_VERSION);
  const traceSeed = {
    child_id: payload.child_id || null,
    session_id: payload.session_id || null,
    calibration_version: calibrationVersion,
  };

  const extracted_signals = [];
  const rejected_evidence = [];

  for (const item of evidence) {
    const normalized = normalizeEvidenceValue(item || {});
    if (!normalized.ok) {
      rejected_evidence.push({
        evidence_id: String(item?.evidence_id || ""),
        signal_type: String(item?.signal_type || ""),
        rejection_reason: normalized.reason,
      });
      continue;
    }

    const sourceType = String(item.source_type || "unknown").trim() || "unknown";
    const traceRef = deterministicId("trace", {
      ...traceSeed,
      evidence_id: item.evidence_id || null,
      signal_type: item.signal_type || null,
      source_id: item.source_id || null,
      observed_at: item.observed_at || null,
    });

    const confidenceWeight = clamp01(parseNumber(item.confidence_weight) ?? 0.7);

    extracted_signals.push(Object.freeze({
      signal_id: deterministicId("sig", { traceRef, normalized: normalized.normalized_value }),
      signal_type: String(item.signal_type),
      trait_code: String(item.trait_code || "").trim() || null,
      source_type: sourceType,
      source_id: String(item.source_id || "unknown"),
      evidence_id: String(item.evidence_id || ""),
      raw_value: item.value ?? null,
      normalized_value: clamp01(normalized.normalized_value),
      confidence_weight: confidenceWeight,
      evidence_status_tag: String(item.evidence_status_tag || EVIDENCE_STATUS_TAG.OPERATIONAL_SYSTEM_CONSTRUCT),
      calibration_version: calibrationVersion,
      trace_ref: traceRef,
      observed_at: item.observed_at || null,
    }));
  }

  extracted_signals.sort((a, b) => `${a.signal_id}`.localeCompare(`${b.signal_id}`));
  rejected_evidence.sort((a, b) => `${a.evidence_id}|${a.signal_type}`.localeCompare(`${b.evidence_id}|${b.signal_type}`));

  return {
    extracted_signals,
    rejected_evidence,
  };
}

module.exports = {
  extractSignalsFromEvidence,
};
