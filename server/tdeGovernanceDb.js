"use strict";

const TDE_MIGRATIONS = Object.freeze([
  {
    id: "tde_001_governance_tables",
    description: "Create additive TDE governance persistence tables",
    up: `
      CREATE TABLE IF NOT EXISTS tde_schema_migrations (
        id BIGSERIAL PRIMARY KEY,
        migration_id TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL DEFAULT '',
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS calibration_versions (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
        calibration_version TEXT NOT NULL,
        actor JSONB NOT NULL DEFAULT '{}'::jsonb,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS signal_events (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
        signal_id TEXT NOT NULL,
        trait_code TEXT NOT NULL,
        normalized_value DOUBLE PRECISION,
        confidence_weight DOUBLE PRECISION,
        evidence_status_tag TEXT,
        calibration_version TEXT,
        trace_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trait_score_traces (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
        trait_code TEXT NOT NULL,
        score_status TEXT NOT NULL DEFAULT 'computed',
        score_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        trace_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
        calibration_version TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS report_statement_traces (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
        statement_code TEXT NOT NULL,
        statement_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        trace_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
        calibration_version TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log_events (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
        actor JSONB NOT NULL DEFAULT '{}'::jsonb,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS signal_events_tenant_created_idx ON signal_events(tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS signal_events_signal_id_idx ON signal_events(signal_id);
      CREATE INDEX IF NOT EXISTS trait_score_traces_tenant_created_idx ON trait_score_traces(tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS report_statement_traces_tenant_created_idx ON report_statement_traces(tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS audit_log_events_tenant_occurred_idx ON audit_log_events(tenant_id, occurred_at DESC);
    `,
  },
]);

async function ensureTdeMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tde_schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      migration_id TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function applyTdeMigrations(pool) {
  await ensureTdeMigrationTable(pool);
  const applied = await pool.query("SELECT migration_id FROM tde_schema_migrations");
  const appliedSet = new Set(applied.rows.map((row) => String(row.migration_id || "")));

  for (const migration of TDE_MIGRATIONS) {
    if (appliedSet.has(migration.id)) continue;
    await pool.query("BEGIN");
    try {
      await pool.query(migration.up);
      await pool.query(
        `INSERT INTO tde_schema_migrations (migration_id, description) VALUES ($1, $2)`,
        [migration.id, migration.description]
      );
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      err.message = `tde migration failed (${migration.id}): ${err.message}`;
      throw err;
    }
  }

  return {
    appliedCount: TDE_MIGRATIONS.length - appliedSet.size,
    totalMigrations: TDE_MIGRATIONS.length,
  };
}

function createTdeGovernancePersistence(pool) {
  function sanitizeActor(actor = {}) {
    return {
      tenant_id: actor.tenant_id ?? null,
      user_id: actor.user_id ?? null,
      role: actor.role ?? null,
      email: actor.email ?? null,
    };
  }

  return {
    async writeCalibrationVersion(record = {}) {
      await pool.query(
        `INSERT INTO calibration_versions (tenant_id, calibration_version, actor, metadata)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
        [record.tenant_id ?? null, String(record.calibration_version || ""), JSON.stringify(sanitizeActor(record.actor)), JSON.stringify(record.metadata || {})]
      );
    },

    async writeSignalEvents({ tenant_id = null, signals = [] } = {}) {
      for (const signal of signals) {
        await pool.query(
          `INSERT INTO signal_events (
              tenant_id, signal_id, trait_code, normalized_value, confidence_weight,
              evidence_status_tag, calibration_version, trace_ref, payload
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
          [
            tenant_id,
            String(signal.signal_id || ""),
            String(signal.trait_code || ""),
            signal.normalized_value ?? null,
            signal.confidence_weight ?? null,
            signal.evidence_status_tag || null,
            signal.calibration_version || null,
            JSON.stringify(signal.trace_ref || {}),
            JSON.stringify(signal),
          ]
        );
      }
    },

    async writeTraitScoreTraces({ tenant_id = null, rows = [], trace_ref = null, calibration_version = null } = {}) {
      for (const row of rows) {
        await pool.query(
          `INSERT INTO trait_score_traces (tenant_id, trait_code, score_status, score_payload, trace_ref, calibration_version)
           VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6)`,
          [tenant_id, String(row.trait_code || ""), String(row.status || "computed"), JSON.stringify(row), JSON.stringify(trace_ref || {}), calibration_version]
        );
      }
    },

    async writeReportStatementTraces({ tenant_id = null, rows = [], trace_ref = null, calibration_version = null } = {}) {
      for (const row of rows) {
        await pool.query(
          `INSERT INTO report_statement_traces (tenant_id, statement_code, statement_payload, trace_ref, calibration_version)
           VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)`,
          [tenant_id, String(row.statement_code || ""), JSON.stringify(row), JSON.stringify(trace_ref || {}), calibration_version]
        );
      }
    },

    async writeAuditLogEvents({ tenant_id = null, actor = {}, events = [] } = {}) {
      const normalizedActor = sanitizeActor(actor);
      for (const event of events) {
        await pool.query(
          `INSERT INTO audit_log_events (tenant_id, actor, event_type, severity, payload, occurred_at)
           VALUES ($1,$2::jsonb,$3,$4,$5::jsonb,$6)`,
          [
            tenant_id,
            JSON.stringify(normalizedActor),
            String(event.event_type || "unknown_event"),
            String(event.severity || "info"),
            JSON.stringify(event),
            event.occurred_at || new Date().toISOString(),
          ]
        );
      }
    },
  };
}

module.exports = {
  TDE_MIGRATIONS,
  applyTdeMigrations,
  createTdeGovernancePersistence,
};
