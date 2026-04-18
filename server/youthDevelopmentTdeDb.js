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
  {
    id: "tde_002_phase3_program_rail_tables",
    description: "Create extension-only TDE 36-week program rail tables",
    up: `
      CREATE TABLE IF NOT EXISTS tde_child_profiles (
        id BIGSERIAL PRIMARY KEY,
        child_id TEXT NOT NULL UNIQUE,
        profile_version TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_program_enrollments (
        id BIGSERIAL PRIMARY KEY,
        enrollment_id TEXT NOT NULL UNIQUE,
        child_id TEXT NOT NULL,
        program_start_date TIMESTAMPTZ NOT NULL,
        current_week INTEGER NOT NULL,
        program_status TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_weekly_progress_records (
        id BIGSERIAL PRIMARY KEY,
        progress_id TEXT NOT NULL UNIQUE,
        enrollment_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        week_number INTEGER NOT NULL,
        completion_status TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_checkpoint_records (
        id BIGSERIAL PRIMARY KEY,
        checkpoint_id TEXT NOT NULL UNIQUE,
        enrollment_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        week_number INTEGER NOT NULL,
        checkpoint_type TEXT NOT NULL,
        environment_review_flag BOOLEAN NOT NULL DEFAULT TRUE,
        confidence_review_flag BOOLEAN NOT NULL DEFAULT TRUE,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_session_records (
        id BIGSERIAL PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        progress_id TEXT NOT NULL,
        enrollment_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        week_number INTEGER NOT NULL,
        session_template_type TEXT NOT NULL,
        observation_entry_type TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_observer_records (
        id BIGSERIAL PRIMARY KEY,
        observer_record_id TEXT NOT NULL UNIQUE,
        child_id TEXT NOT NULL,
        observer_type TEXT NOT NULL,
        observer_reference TEXT NOT NULL,
        linked_entity_type TEXT NOT NULL,
        linked_entity_id TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_active_domain_interests (
        id BIGSERIAL PRIMARY KEY,
        child_id TEXT NOT NULL UNIQUE,
        domains JSONB NOT NULL DEFAULT '[]'::jsonb,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_current_trait_targets (
        id BIGSERIAL PRIMARY KEY,
        child_id TEXT NOT NULL UNIQUE,
        trait_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_current_environment_targets (
        id BIGSERIAL PRIMARY KEY,
        child_id TEXT NOT NULL UNIQUE,
        environment_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_program_week_definitions (
        id BIGSERIAL PRIMARY KEY,
        week_number INTEGER NOT NULL UNIQUE,
        phase_number INTEGER NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    down: `
      DROP TABLE IF EXISTS tde_program_week_definitions;
      DROP TABLE IF EXISTS tde_current_environment_targets;
      DROP TABLE IF EXISTS tde_current_trait_targets;
      DROP TABLE IF EXISTS tde_active_domain_interests;
      DROP TABLE IF EXISTS tde_observer_records;
      DROP TABLE IF EXISTS tde_session_records;
      DROP TABLE IF EXISTS tde_checkpoint_records;
      DROP TABLE IF EXISTS tde_weekly_progress_records;
      DROP TABLE IF EXISTS tde_program_enrollments;
      DROP TABLE IF EXISTS tde_child_profiles;
    `,
  },
  {
    id: "tde_003_phase4_governance_and_summary_tables",
    description: "Create extension-only observer consent, environment hooks, validation export, and summary support tables",
    up: `
      CREATE TABLE IF NOT EXISTS tde_observer_consent_records (
        id BIGSERIAL PRIMARY KEY,
        observer_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        observer_role TEXT NOT NULL,
        relationship_duration TEXT NOT NULL,
        consent_status TEXT NOT NULL,
        consent_captured_at TIMESTAMPTZ NOT NULL,
        consent_source TEXT NOT NULL,
        provenance_source_type TEXT NOT NULL,
        provenance_source_ref TEXT NOT NULL,
        submission_context TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        user_id TEXT,
        audit_ref TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (observer_id, child_id)
      );

      CREATE TABLE IF NOT EXISTS tde_environment_hook_events (
        id BIGSERIAL PRIMARY KEY,
        event_id TEXT NOT NULL UNIQUE,
        child_id TEXT NOT NULL,
        environment_factor TEXT NOT NULL,
        event_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_ref TEXT NOT NULL,
        raw_value TEXT,
        event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        normalized_value NUMERIC(8,6),
        confidence_weight NUMERIC(8,6) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        calibration_version TEXT NOT NULL,
        trace_ref TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_validation_export_logs (
        id BIGSERIAL PRIMARY KEY,
        job_id TEXT NOT NULL UNIQUE,
        study_type TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        audit_ref TEXT NOT NULL,
        calibration_version TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    down: `
      DROP TABLE IF EXISTS tde_validation_export_logs;
      DROP TABLE IF EXISTS tde_environment_hook_events;
      DROP TABLE IF EXISTS tde_observer_consent_records;
    `,
  },
  {
    id: "tde_004_phase7_intervention_engine_tables",
    description: "Create extension-only commitment plan and bounded-autonomy intervention session tables",
    up: `
      CREATE TABLE IF NOT EXISTS tde_commitment_plans (
        id BIGSERIAL PRIMARY KEY,
        child_id TEXT NOT NULL UNIQUE,
        committed_days_per_week INTEGER NOT NULL,
        preferred_days JSONB NOT NULL DEFAULT '[]'::jsonb,
        preferred_time_window TEXT NOT NULL,
        session_length INTEGER NOT NULL,
        facilitator_role TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tde_intervention_sessions (
        id BIGSERIAL PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        child_id TEXT NOT NULL,
        full_session_completed BOOLEAN NOT NULL DEFAULT FALSE,
        duration_minutes INTEGER NOT NULL,
        challenge_level TEXT NOT NULL,
        parent_coaching_style TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        completed_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
    down: `
      DROP TABLE IF EXISTS tde_intervention_sessions;
      DROP TABLE IF EXISTS tde_commitment_plans;
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
