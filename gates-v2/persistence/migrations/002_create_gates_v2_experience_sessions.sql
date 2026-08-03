CREATE TABLE IF NOT EXISTS gates_v2_experience_sessions (
  session_id TEXT PRIMARY KEY, parent_profile_id BIGINT NOT NULL, child_id BIGINT NOT NULL,
  gate_id TEXT NOT NULL, experience_id TEXT NOT NULL, release_id TEXT NOT NULL
    REFERENCES gates_v2_content_releases(release_id) ON DELETE RESTRICT,
  experience_version TEXT NOT NULL, age_band TEXT NOT NULL, locale TEXT NOT NULL,
  narration_variant_id TEXT, feature_variant_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_json JSONB NOT NULL, revision INTEGER NOT NULL CHECK (revision >= 0),
  status TEXT NOT NULL CHECK (status IN ('active','paused','completed','abandoned')),
  started_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ, abandoned_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS gates_v2_sessions_owner_child_idx
  ON gates_v2_experience_sessions(parent_profile_id,child_id,updated_at DESC);
