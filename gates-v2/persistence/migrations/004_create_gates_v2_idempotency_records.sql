CREATE TABLE IF NOT EXISTS gates_v2_idempotency_records (
  session_id TEXT NOT NULL REFERENCES gates_v2_experience_sessions(session_id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_json JSONB NOT NULL,
  resulting_revision INTEGER NOT NULL CHECK (resulting_revision >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS gates_v2_idempotency_created_idx
  ON gates_v2_idempotency_records(created_at);
