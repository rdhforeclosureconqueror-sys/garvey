"use strict";

const TDE_MIGRATIONS = Object.freeze([
  {
    id: "tde_001_phase2_governance_tables",
    description: "Create extension-only TDE signal/trace/audit tables",
    up: `
      CREATE TABLE IF NOT EXISTS tde_extracted_signals (
        id BIGSERIAL PRIMARY KEY,
        run_id TEXT NOT NULL,
        signal_id TEXT NOT NULL,
        trait_code TEXT,
        signal_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        normalized_value NUMERIC(8,6) NOT NULL,
        confidence_weight NUMERIC(8,6) NOT NULL,
        evidence_status_tag TEXT NOT NULL,
        calibration_version TEXT NOT NULL,
        trace_ref TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (run_id, signal_id)
      );

      CREATE TABLE IF NOT EXISTS tde_trait_score_traces (
        id BIGSERIAL PRIMARY KEY,
        run_id TEXT NOT NULL,
        trait_code TEXT NOT NULL,
        evidence_sufficiency_status TEXT NOT NULL,
        reported_trait_score NUMERIC(8,6),
        internal_partial_score NUMERIC(8,6),
        confidence_score NUMERIC(8,6),
        calibration_version TEXT NOT NULL,
        trace_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_report_statement_traces (
        id BIGSERIAL PRIMARY KEY,
        run_id TEXT NOT NULL,
        statement_id TEXT NOT NULL,
        trait_code TEXT,
        rule_used TEXT NOT NULL,
        calibration_version TEXT NOT NULL,
        statement_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (run_id, statement_id)
      );

      CREATE TABLE IF NOT EXISTS tde_pipeline_audit_log (
        id BIGSERIAL PRIMARY KEY,
        run_id TEXT NOT NULL UNIQUE,
        child_id TEXT,
        session_id TEXT,
        calibration_version TEXT NOT NULL,
        status TEXT NOT NULL,
        audit_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_calibration_version_refs (
        id BIGSERIAL PRIMARY KEY,
        run_id TEXT NOT NULL,
        calibration_version TEXT NOT NULL,
        referenced_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    down: `
      DROP TABLE IF EXISTS tde_calibration_version_refs;
      DROP TABLE IF EXISTS tde_pipeline_audit_log;
      DROP TABLE IF EXISTS tde_report_statement_traces;
      DROP TABLE IF EXISTS tde_trait_score_traces;
      DROP TABLE IF EXISTS tde_extracted_signals;
    `,
  },
]);

async function applyTdeMigrations(pool) {
  await pool.query("CREATE TABLE IF NOT EXISTS tde_schema_migrations (migration_id TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  const existing = await pool.query("SELECT migration_id FROM tde_schema_migrations");
  const done = new Set(existing.rows.map((row) => row.migration_id));
  let appliedCount = 0;
  for (const migration of TDE_MIGRATIONS) {
    if (done.has(migration.id)) continue;
    await pool.query("BEGIN");
    try {
      await pool.query(migration.up);
      await pool.query("INSERT INTO tde_schema_migrations (migration_id) VALUES ($1)", [migration.id]);
      await pool.query("COMMIT");
      appliedCount += 1;
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  }
  return { totalMigrations: TDE_MIGRATIONS.length, appliedCount };
}

module.exports = {
  TDE_MIGRATIONS,
  applyTdeMigrations,
};
