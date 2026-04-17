"use strict";

const OBSERVER_CONTRACT_VERSION = "phase4-v1";

const OBSERVER_ROLES = Object.freeze([
  "parent",
  "guardian",
  "teacher",
  "mentor",
  "coach",
  "specialist",
  "other",
]);

const CONSENT_STATUSES = Object.freeze(["granted", "revoked", "pending", "declined"]);

const PROVENANCE_SOURCE_TYPES = Object.freeze([
  "parent_portal",
  "staff_attestation",
  "signed_form",
  "verbal_documented",
  "system_import",
  "other",
]);

const SUBMISSION_CONTEXTS = Object.freeze([
  "program_enrollment",
  "weekly_progress",
  "checkpoint_review",
  "manual_review",
  "validation_study",
]);

const OBSERVER_CONSENT_CONTRACT = Object.freeze({
  contract_type: "observer_consent_provenance",
  contract_version: OBSERVER_CONTRACT_VERSION,
  required_fields: Object.freeze([
    "observer_id",
    "observer_role",
    "relationship_duration",
    "consent_status",
    "consent_captured_at",
    "consent_source",
    "provenance_source_type",
    "provenance_source_ref",
    "submission_context",
    "tenant_id",
    "audit_ref",
  ]),
  optional_fields: Object.freeze(["user_id"]),
  enumerations: Object.freeze({
    observer_role: OBSERVER_ROLES,
    consent_status: CONSENT_STATUSES,
    provenance_source_type: PROVENANCE_SOURCE_TYPES,
    submission_context: SUBMISSION_CONTEXTS,
  }),
  deterministic: true,
  extension_only: true,
});

module.exports = {
  OBSERVER_CONTRACT_VERSION,
  OBSERVER_ROLES,
  CONSENT_STATUSES,
  PROVENANCE_SOURCE_TYPES,
  SUBMISSION_CONTEXTS,
  OBSERVER_CONSENT_CONTRACT,
};
