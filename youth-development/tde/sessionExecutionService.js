"use strict";

const { normalizeInterventionEvidenceToSignals } = require("./interventionSignalIntegrationService");
const { validateSessionEvidenceContract } = require("./sessionEvidenceContract");

function validateSessionEvidence(input = {}, options = {}) {
  const result = validateSessionEvidenceContract(input, options);
  return {
    ok: result.ok,
    errors: result.errors,
    normalized: result.normalized,
    validity_status: result.validity_status,
    traceability_refs: result.traceability_refs,
  };
}

function buildInterventionEvidence(session = {}, options = {}) {
  const result = normalizeInterventionEvidenceToSignals(session, options);
  return result.ok ? result.intervention_signal_evidence : [];
}

module.exports = {
  validateSessionEvidence,
  buildInterventionEvidence,
};
