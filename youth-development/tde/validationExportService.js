"use strict";

const { deterministicId } = require("./constants");

const VALIDATION_STUDY_TYPES = Object.freeze([
  "inter_rater_reliability",
  "test_retest",
  "cross_task_consistency",
  "age_band_slice",
  "observer_role_slice",
  "language_access_bias_review",
]);

const VALIDATION_SCHEMA = Object.freeze({
  contract_type: "tde_validation_export",
  contract_version: "phase4-v1",
  supported_study_types: VALIDATION_STUDY_TYPES,
  required_request_fields: Object.freeze(["study_type", "tenant_id", "requested_by", "selection"]),
  selection_fields: Object.freeze(["child_ids", "age_band", "observer_roles", "language_code", "date_range", "checkpoint_weeks"]),
  deterministic: true,
  extension_only: true,
  traceability_requirements: Object.freeze(["job_id", "generated_at", "audit_ref", "calibration_version"]),
});

function normalizeValidationExportRequest(payload = {}) {
  return {
    job_id: String(payload.job_id || deterministicId("vexp", payload)).trim(),
    study_type: String(payload.study_type || "").trim(),
    tenant_id: String(payload.tenant_id || "").trim(),
    requested_by: String(payload.requested_by || "").trim(),
    audit_ref: String(payload.audit_ref || deterministicId("audit", payload)).trim(),
    calibration_version: String(payload.calibration_version || "tde-calibration-v0").trim(),
    selection: payload.selection && typeof payload.selection === "object" ? payload.selection : {},
    generated_at: new Date().toISOString(),
  };
}

function validateValidationExportRequest(request = {}) {
  const errors = [];
  if (!VALIDATION_STUDY_TYPES.includes(request.study_type)) errors.push("study_type_invalid");
  if (!request.tenant_id) errors.push("tenant_id_required");
  if (!request.requested_by) errors.push("requested_by_required");
  if (!request.selection || typeof request.selection !== "object") errors.push("selection_required");
  if (!request.audit_ref) errors.push("audit_ref_required");
  return { ok: errors.length === 0, errors };
}

async function generateValidationExport(payload, repository) {
  const request = normalizeValidationExportRequest(payload);
  const validation = validateValidationExportRequest(request);

  if (!validation.ok) {
    return {
      ok: false,
      error: "validation_export_invalid",
      validation_errors: validation.errors,
      request,
      deterministic: true,
      extension_only: true,
    };
  }

  const dataset = await repository.getValidationDataset(request);
  const exportPayload = {
    job_id: request.job_id,
    study_type: request.study_type,
    tenant_id: request.tenant_id,
    requested_by: request.requested_by,
    generated_at: request.generated_at,
    calibration_version: request.calibration_version,
    audit_ref: request.audit_ref,
    selection: request.selection,
    dataset,
    traceable: true,
    additive: true,
  };

  const persisted = await repository.persistValidationExportLog(exportPayload);
  return {
    ok: true,
    export: exportPayload,
    persistence: persisted,
    deterministic: true,
    extension_only: true,
  };
}

module.exports = {
  VALIDATION_SCHEMA,
  generateValidationExport,
};
