"use strict";

const { deterministicId, DEFAULT_CALIBRATION_VERSION } = require("./constants");
const { extractSignalsFromEvidence } = require("./signalExtractionService");
const { scoreTraitsFromSignals } = require("./traitScoringService");
const { generateTraceableStatements } = require("./reportStatementGenerator");
const { normalizePipelineEvidence } = require("./interventionEvidencePipelineAdapter");

async function runTdePipeline(payload, repository) {
  const calibrationVersion = String(payload.calibration_version || DEFAULT_CALIBRATION_VERSION);
  const evidenceMerge = normalizePipelineEvidence(payload);
  if (!evidenceMerge.ok) {
    return {
      ok: false,
      error: evidenceMerge.error,
      validation_errors: evidenceMerge.validation_errors,
      validity_status: evidenceMerge.validity_status,
      contract_id: evidenceMerge.contract_id,
      deterministic: true,
      extension_only: true,
    };
  }

  const runId = deterministicId("tde_run", {
    child_id: payload.child_id || null,
    session_id: payload.session_id || null,
    evidence: evidenceMerge.evidence || [],
    calibration_version: calibrationVersion,
    adherence_context: payload.adherence_context || null,
    intervention_session_evidence: payload.intervention_session_evidence || null,
  });

  const extraction = extractSignalsFromEvidence({
    ...payload,
    evidence: evidenceMerge.evidence,
  });
  const scoring = scoreTraitsFromSignals(extraction.extracted_signals, { adherence_context: payload.adherence_context || {} });
  const statements = generateTraceableStatements(scoring.trait_results, extraction.extracted_signals, {
    calibration_version: calibrationVersion,
    adherence_context: payload.adherence_context || null,
  });

  const status = scoring.missing_contracts.length ? "completed_with_contract_gaps" : "completed";

  await repository.persistSignals(runId, extraction.extracted_signals);
  await repository.persistTraitScores(runId, calibrationVersion, scoring.trait_results);
  await repository.persistStatements(runId, calibrationVersion, statements.statements);
  await repository.persistCalibrationRef(runId, calibrationVersion, "score_traits");
  await repository.persistCalibrationRef(runId, calibrationVersion, "report_statements");
  await repository.persistAuditLog(runId, {
    run_id: runId,
    status,
    child_id: payload.child_id || null,
    session_id: payload.session_id || null,
    calibration_version: calibrationVersion,
    extracted_count: extraction.extracted_signals.length,
    rejected_count: extraction.rejected_evidence.length,
    intervention_evidence_count: evidenceMerge.intervention_signal_evidence.length,
    intervention_validity_status: evidenceMerge.intervention_validity_status,
    intervention_traceability_refs: evidenceMerge.intervention_traceability_refs,
    statement_count: statements.statements.length,
    missing_contracts: scoring.missing_contracts,
  });

  return {
    ok: true,
    run_id: runId,
    calibration_version: calibrationVersion,
    extracted_signals: extraction.extracted_signals,
    rejected_evidence: extraction.rejected_evidence,
    intervention_signal_evidence: evidenceMerge.intervention_signal_evidence,
    intervention_evidence_validity_status: evidenceMerge.intervention_validity_status,
    intervention_traceability_refs: evidenceMerge.intervention_traceability_refs,
    trait_scores: scoring.trait_results,
    missing_contracts: scoring.missing_contracts,
    statements: statements.statements,
    skipped_statements: statements.skipped,
    deterministic: true,
  };
}

module.exports = {
  runTdePipeline,
};
