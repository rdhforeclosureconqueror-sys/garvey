"use strict";

const { normalizeInterventionEvidenceToSignals } = require("./interventionSignalIntegrationService");
const { getComponentTypeByActivityId } = require("./activityBankService");

function normalizePipelineEvidence(payload = {}) {
  const baseEvidence = Array.isArray(payload.evidence) ? payload.evidence : [];
  const sessionEvidencePayload = payload.intervention_session_evidence;

  if (!sessionEvidencePayload) {
    return {
      ok: true,
      evidence: baseEvidence,
      intervention_signal_evidence: [],
      intervention_validity_status: null,
      intervention_traceability_refs: null,
      deterministic: true,
      extension_only: true,
    };
  }

  const integrated = normalizeInterventionEvidenceToSignals(sessionEvidencePayload, {
    component_by_activity_id: (activityId) => getComponentTypeByActivityId(activityId),
  });

  if (!integrated.ok) {
    return {
      ok: false,
      error: "intervention_session_evidence_invalid",
      validation_errors: integrated.validation_errors || [],
      validity_status: integrated.validity_status || "INVALID",
      contract_id: "phase8_session_evidence_contract_v1",
      deterministic: true,
      extension_only: true,
    };
  }

  return {
    ok: true,
    evidence: [...baseEvidence, ...integrated.intervention_signal_evidence],
    intervention_signal_evidence: integrated.intervention_signal_evidence,
    intervention_validity_status: integrated.validity_status,
    intervention_traceability_refs: integrated.traceability_refs,
    deterministic: true,
    extension_only: true,
  };
}

module.exports = {
  normalizePipelineEvidence,
};
