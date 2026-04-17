"use strict";

function createTdePersistenceRepository(pool = null) {
  async function persistSignals(runId, signals) {
    if (!pool) return { persisted: 0 };
    for (const signal of signals) {
      await pool.query(
        `INSERT INTO tde_extracted_signals
          (run_id, signal_id, trait_code, signal_type, source_type, source_id, normalized_value, confidence_weight, evidence_status_tag, calibration_version, trace_ref, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
         ON CONFLICT (run_id, signal_id) DO NOTHING`,
        [
          runId,
          signal.signal_id,
          signal.trait_code,
          signal.signal_type,
          signal.source_type,
          signal.source_id,
          signal.normalized_value,
          signal.confidence_weight,
          signal.evidence_status_tag,
          signal.calibration_version,
          signal.trace_ref,
          JSON.stringify(signal),
        ]
      );
    }
    return { persisted: signals.length };
  }

  async function persistTraitScores(runId, calibrationVersion, traits) {
    if (!pool) return { persisted: 0 };
    for (const trait of traits) {
      await pool.query(
        `INSERT INTO tde_trait_score_traces
          (run_id, trait_code, evidence_sufficiency_status, reported_trait_score, internal_partial_score, confidence_score, calibration_version, trace_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [
          runId,
          trait.trait_code,
          trait.evidence_sufficiency_status,
          trait.reported_trait_score,
          trait.internal_partial_score,
          trait.confidence_score,
          calibrationVersion,
          JSON.stringify(trait),
        ]
      );
    }
    return { persisted: traits.length };
  }

  async function persistStatements(runId, calibrationVersion, statements) {
    if (!pool) return { persisted: 0 };
    for (const statement of statements) {
      await pool.query(
        `INSERT INTO tde_report_statement_traces
          (run_id, statement_id, trait_code, rule_used, calibration_version, statement_payload)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (run_id, statement_id) DO NOTHING`,
        [runId, statement.statement_id, statement.trait_code, statement.rule_used, calibrationVersion, JSON.stringify(statement)]
      );
    }
    return { persisted: statements.length };
  }

  async function persistCalibrationRef(runId, calibrationVersion, referencedBy) {
    if (!pool) return { persisted: 0 };
    await pool.query(
      `INSERT INTO tde_calibration_version_refs (run_id, calibration_version, referenced_by) VALUES ($1,$2,$3)`,
      [runId, calibrationVersion, referencedBy]
    );
    return { persisted: 1 };
  }

  async function persistAuditLog(runId, payload) {
    if (!pool) return { persisted: 0 };
    await pool.query(
      `INSERT INTO tde_pipeline_audit_log (run_id, child_id, session_id, calibration_version, status, audit_payload)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       ON CONFLICT (run_id) DO UPDATE SET status = EXCLUDED.status, audit_payload = EXCLUDED.audit_payload`,
      [runId, payload.child_id || null, payload.session_id || null, payload.calibration_version, payload.status, JSON.stringify(payload)]
    );
    return { persisted: 1 };
  }

  return {
    persistSignals,
    persistTraitScores,
    persistStatements,
    persistCalibrationRef,
    persistAuditLog,
  };
}

module.exports = {
  createTdePersistenceRepository,
};
