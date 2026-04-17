"use strict";

const { clamp01 } = require("./tdeGovernance");

const MIN_SOURCE_DIVERSITY = 2;

function computeAgeBandFromDob(dobIso, assessmentDateIso) {
  const dobMs = Date.parse(dobIso || "");
  const assessmentMs = Date.parse(assessmentDateIso || "");
  if (!Number.isFinite(dobMs) || !Number.isFinite(assessmentMs) || assessmentMs < dobMs) {
    return null;
  }

  const years = Math.floor((assessmentMs - dobMs) / 31_557_600_000);
  if (years <= 0) return "0-4";
  if (years <= 4) return "0-4";
  if (years <= 7) return "5-7";
  if (years <= 9) return "8-9";
  if (years <= 12) return "10-12";
  if (years <= 15) return "13-15";
  return "16+";
}

function resolveAgeBand({ dob, assessment_date, supplied_age_band, derived_from_override }) {
  const computed = dob ? computeAgeBandFromDob(dob, assessment_date) : null;
  const supplied = typeof supplied_age_band === "string" && supplied_age_band.trim()
    ? supplied_age_band.trim()
    : null;

  if (computed) {
    return {
      authoritative_age_band: computed,
      computed_age_band: computed,
      supplied_age_band: supplied,
      mismatch: supplied && supplied !== computed,
      override_used: false,
    };
  }

  if (supplied && derived_from_override === true) {
    return {
      authoritative_age_band: supplied,
      computed_age_band: null,
      supplied_age_band: supplied,
      mismatch: false,
      override_used: true,
    };
  }

  return {
    authoritative_age_band: null,
    computed_age_band: null,
    supplied_age_band: supplied,
    mismatch: false,
    override_used: false,
  };
}

function validateSignal(signal, idx) {
  const errors = [];
  const auditEvents = [];
  const path = `signals[${idx}]`;

  const normalized = Number(signal.normalized_value);
  const confidence = Number(signal.confidence_weight);

  if (!signal || typeof signal !== "object") {
    return { errors: [`${path} must be an object`], auditEvents, normalizedSignal: null };
  }

  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    errors.push(`${path}.normalized_value must be between 0 and 1`);
  }
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    errors.push(`${path}.confidence_weight must be between 0 and 1`);
  }
  if (!signal.evidence_status_tag) errors.push(`${path}.evidence_status_tag is required`);
  if (!signal.calibration_version) errors.push(`${path}.calibration_version is required`);
  if (!signal.trace_ref || typeof signal.trace_ref !== "object") errors.push(`${path}.trace_ref is required`);

  const ageBandResolution = resolveAgeBand({
    dob: signal.dob,
    assessment_date: signal.assessment_date || signal.timestamp,
    supplied_age_band: signal.age_band,
    derived_from_override: signal.derived_from_override,
  });

  if (!ageBandResolution.authoritative_age_band) {
    errors.push(`${path}.age_band unresolved: provide DOB + assessment_date, or age_band with derived_from_override=true when DOB missing`);
  }

  if (ageBandResolution.mismatch) {
    auditEvents.push({
      event_type: "age_band_mismatch_detected",
      severity: "info",
      signal_id: signal.signal_id || null,
      computed_age_band: ageBandResolution.computed_age_band,
      supplied_age_band: ageBandResolution.supplied_age_band,
      authoritative_age_band: ageBandResolution.authoritative_age_band,
    });
  }

  return {
    errors,
    auditEvents,
    normalizedSignal: {
      ...signal,
      normalized_value: clamp01(normalized),
      confidence_weight: clamp01(confidence),
      age_band: ageBandResolution.authoritative_age_band,
      computed_age_band: ageBandResolution.computed_age_band,
      supplied_age_band: ageBandResolution.supplied_age_band,
      age_band_authoritative_source: ageBandResolution.computed_age_band
        ? "computed_from_dob"
        : ageBandResolution.override_used
          ? "override_with_flag"
          : "unresolved",
    },
  };
}

function validateSignalsPayload(payload = {}) {
  const errors = [];
  const auditEvents = [];
  const normalizedSignals = [];

  if (!Array.isArray(payload.signals)) {
    return { ok: false, errors: ["signals must be an array"], auditEvents, normalizedSignals };
  }

  payload.signals.forEach((signal, idx) => {
    const result = validateSignal(signal, idx);
    errors.push(...result.errors);
    auditEvents.push(...result.auditEvents);
    if (result.normalizedSignal) normalizedSignals.push(result.normalizedSignal);
  });

  return {
    ok: errors.length === 0,
    errors,
    auditEvents,
    normalizedSignals,
  };
}

function validateTracePayload(payload = {}) {
  const errors = [];
  const auditEvents = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: ["request body must be an object"], auditEvents, result: null };
  }

  if (!payload.trace_ref || typeof payload.trace_ref !== "object") {
    errors.push("trace_ref is required");
  }
  if (!payload.calibration_version) {
    errors.push("calibration_version is required");
  }

  const traitRows = Array.isArray(payload.trait_rows) ? payload.trait_rows : [];
  const reportedTraitRows = [];
  const internalPartialRows = [];

  for (const row of traitRows) {
    const sourceTypes = Array.isArray(row.source_types) ? new Set(row.source_types.filter(Boolean)) : new Set();
    if (sourceTypes.size < MIN_SOURCE_DIVERSITY) {
      internalPartialRows.push({ ...row, status: "insufficient_source_diversity" });
      auditEvents.push({
        event_type: "insufficient_source_diversity",
        severity: "info",
        trait_code: row.trait_code || null,
        observed_source_diversity: sourceTypes.size,
        minimum_source_diversity: MIN_SOURCE_DIVERSITY,
      });
      continue;
    }
    reportedTraitRows.push(row);
  }

  return {
    ok: errors.length === 0,
    errors,
    auditEvents,
    result: {
      trace_ref: payload.trace_ref || null,
      calibration_version: payload.calibration_version || null,
      reported_trait_rows: reportedTraitRows,
      internal_partial_rows: internalPartialRows,
      minimum_source_diversity: MIN_SOURCE_DIVERSITY,
    },
  };
}

module.exports = {
  MIN_SOURCE_DIVERSITY,
  computeAgeBandFromDob,
  resolveAgeBand,
  validateSignalsPayload,
  validateTracePayload,
};
