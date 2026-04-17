"use strict";

const { EVIDENCE_STATUS_TAG, DEFAULT_CALIBRATION_VERSION } = require("./tdeGovernance");

const TDE_FEATURE_FLAGS = Object.freeze({
  tde_extension_enabled: true,
  tde_persistence_enabled: true,
  tde_validate_endpoints_enabled: true,
  trait_reporting_single_source_behavior: "no_reported_score",
});

const TDE_SIGNAL_SCHEMA = Object.freeze({
  schema_version: "1.0",
  required_fields: Object.freeze([
    "signal_id",
    "trait_code",
    "signal_type",
    "normalized_value",
    "confidence_weight",
    "evidence_status_tag",
    "calibration_version",
    "trace_ref",
    "timestamp",
  ]),
  bounded_fields: Object.freeze({
    normalized_value: Object.freeze({ min: 0, max: 1 }),
    confidence_weight: Object.freeze({ min: 0, max: 1 }),
  }),
  allowed_evidence_status_tags: Object.values(EVIDENCE_STATUS_TAG),
  age_band_policy: Object.freeze({
    authoritative_source: "dob_plus_assessment_date_when_dob_exists",
    allow_override_when_dob_missing_only: true,
    override_requires_flag: "derived_from_override",
    mismatch_behavior: "preserve_both_and_audit_computed_authoritative",
  }),
});

const TDE_TRAIT_MAPPING_SCHEMA = Object.freeze({
  schema_version: "1.0",
  calibration_version: DEFAULT_CALIBRATION_VERSION,
  minimum_source_diversity_default: 2,
  below_minimum_behavior: Object.freeze({
    reported_trait_score: "not_emitted",
    internal_partial_calculation: "stored_for_audit",
    status: "insufficient_source_diversity",
  }),
  missing_contract_behavior: "surface_explicitly",
});

const TDE_TRACEABILITY_SCHEMA = Object.freeze({
  schema_version: "1.0",
  required_trace_fields: Object.freeze(["trace_ref", "calibration_version"]),
  optional_trace_fields: Object.freeze(["trait_score_traces", "report_statement_traces", "source_diversity"]),
});

const TDE_CALIBRATION_SCHEMA = Object.freeze({
  schema_version: "1.0",
  owner_shape: Object.freeze(["tenant_id", "user_id", "role", "email"]),
  null_preservation_required: true,
  calibration_variable_policy: "mark_explicitly_and_do_not_overclaim",
});

const TDE_AUDIT_LOG_SCHEMA = Object.freeze({
  schema_version: "1.0",
  required_fields: Object.freeze(["event_type", "tenant_id", "occurred_at", "payload"]),
  supported_event_types: Object.freeze([
    "age_band_mismatch_detected",
    "missing_contract_detected",
    "signal_validation_failed",
    "trace_validation_failed",
    "insufficient_source_diversity",
  ]),
});

function getTdeContracts() {
  return {
    signal_schema: TDE_SIGNAL_SCHEMA,
    trait_mapping_schema: TDE_TRAIT_MAPPING_SCHEMA,
    traceability_schema: TDE_TRACEABILITY_SCHEMA,
    calibration_schema: TDE_CALIBRATION_SCHEMA,
    audit_log_schema: TDE_AUDIT_LOG_SCHEMA,
    feature_flags: TDE_FEATURE_FLAGS,
  };
}

module.exports = {
  TDE_FEATURE_FLAGS,
  TDE_SIGNAL_SCHEMA,
  TDE_TRAIT_MAPPING_SCHEMA,
  TDE_TRACEABILITY_SCHEMA,
  TDE_CALIBRATION_SCHEMA,
  TDE_AUDIT_LOG_SCHEMA,
  getTdeContracts,
};
