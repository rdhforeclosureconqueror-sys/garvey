-- additive TDE governance tables (phase 1)
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
