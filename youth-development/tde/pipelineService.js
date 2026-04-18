"use strict";

const { deterministicId, DEFAULT_CALIBRATION_VERSION } = require("./constants");
const { extractSignalsFromEvidence } = require("./signalExtractionService");
const { scoreTraitsFromSignals } = require("./traitScoringService");
const { generateTraceableStatements } = require("./reportStatementGenerator");

async function runTdePipeline(payload, repository) {
  const calibrationVersion = String(payload.calibration_version || DEFAULT_CALIBRATION_VERSION);
  const runId = deterministicId("tde_run", {
    child_id: payload.child_id || null,
    session_id: payload.session_id || null,
    evidence: payload.evidence || [],
    calibration_version: calibrationVersion,
    adherence_context: payload.adherence_context || null,
  });

  const extraction = extractSignalsFromEvidence(payload);
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
    statement_count: statements.statements.length,
    missing_contracts: scoring.missing_contracts,
  });

  return {
    ok: true,
    run_id: runId,
    calibration_version: calibrationVersion,
    extracted_signals: extraction.extracted_signals,
    rejected_evidence: extraction.rejected_evidence,
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
