"use strict";

const { deterministicId } = require("./constants");
const {
  OBSERVER_CONSENT_CONTRACT,
  OBSERVER_ROLES,
  CONSENT_STATUSES,
  PROVENANCE_SOURCE_TYPES,
  SUBMISSION_CONTEXTS,
} = require("./observerContracts");

function normalizeObserverConsent(payload = {}) {
  return {
    observer_id: String(payload.observer_id || "").trim(),
    child_id: String(payload.child_id || "").trim(),
    observer_role: String(payload.observer_role || "").trim(),
    relationship_duration: String(payload.relationship_duration || "").trim(),
    consent_status: String(payload.consent_status || "pending").trim(),
    consent_captured_at: new Date(payload.consent_captured_at || Date.now()).toISOString(),
    consent_source: String(payload.consent_source || "").trim(),
    provenance_source_type: String(payload.provenance_source_type || "").trim(),
    provenance_source_ref: String(payload.provenance_source_ref || "").trim(),
    submission_context: String(payload.submission_context || "program_enrollment").trim(),
    tenant_id: String(payload.tenant_id || "").trim(),
    user_id: payload.user_id ? String(payload.user_id).trim() : null,
    audit_ref: String(payload.audit_ref || deterministicId("audit", payload)).trim(),
    policy_version: String(payload.policy_version || OBSERVER_CONSENT_CONTRACT.contract_version).trim(),
    captured_by: String(payload.captured_by || "extension_api").trim(),
  };
}

function validateObserverConsent(consent = {}, options = {}) {
  const errors = [];
  if (!consent.child_id) errors.push("child_id_required");
  if (!consent.observer_id) errors.push("observer_id_required");
  if (!OBSERVER_ROLES.includes(consent.observer_role)) errors.push("observer_role_invalid");
  if (!consent.relationship_duration) errors.push("relationship_duration_required");
  if (!CONSENT_STATUSES.includes(consent.consent_status)) errors.push("consent_status_invalid");
  if (!consent.consent_source) errors.push("consent_source_required");
  if (!consent.consent_captured_at || Number.isNaN(new Date(consent.consent_captured_at).getTime())) errors.push("consent_captured_at_invalid");
  if (!PROVENANCE_SOURCE_TYPES.includes(consent.provenance_source_type)) errors.push("provenance_source_type_invalid");
  if (!consent.provenance_source_ref) errors.push("provenance_source_ref_required");
  if (!SUBMISSION_CONTEXTS.includes(consent.submission_context)) errors.push("submission_context_invalid");
  if (!consent.tenant_id) errors.push("tenant_id_required");
  if (!consent.audit_ref) errors.push("audit_ref_required");

  if (options.requireGrantedConsent && consent.consent_status !== "granted") errors.push("consent_not_granted");

  return {
    ok: errors.length === 0,
    errors,
    missing_contracts: errors.filter((entry) => entry.endsWith("_required") || entry.includes("invalid")),
  };
}

async function captureObserverConsent(payload, repository) {
  const consent = normalizeObserverConsent(payload);
  const validation = validateObserverConsent(consent);
  if (!validation.ok) {
    return {
      ok: false,
      error: "observer_consent_invalid",
      missing_contracts: validation.missing_contracts,
      validation_errors: validation.errors,
      consent,
      deterministic: true,
      extension_only: true,
    };
  }

  const persisted = await repository.persistObserverConsent(consent);
  return {
    ok: true,
    consent,
    persistence: persisted,
    deterministic: true,
    extension_only: true,
  };
}

module.exports = {
  normalizeObserverConsent,
  validateObserverConsent,
  captureObserverConsent,
};
