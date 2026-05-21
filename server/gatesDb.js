"use strict";

const GATES_MIGRATIONS = [
  {
    id: "gates-001-foundation",
    statements: [
      `CREATE TABLE IF NOT EXISTS gates_schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS gates_parent_profiles (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        display_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS gates_parent_profiles_email_lower_uq
        ON gates_parent_profiles (LOWER(email));`,
      `CREATE TABLE IF NOT EXISTS gates_child_profiles (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL,
        first_name TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS gates_child_profiles_parent_id_idx
        ON gates_child_profiles(parent_id);`,
      `CREATE TABLE IF NOT EXISTS gates_assessments (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL,
        child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE SET NULL,
        assessment_key TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS gates_assessments_parent_child_idx
        ON gates_assessments(parent_id, child_id, created_at DESC);`,
      `CREATE TABLE IF NOT EXISTS gates_progress (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL,
        child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE SET NULL,
        progress_key TEXT,
        progress_value JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS gates_progress_parent_child_idx
        ON gates_progress(parent_id, child_id, updated_at DESC);`,
      `CREATE TABLE IF NOT EXISTS gates_practice_recommendations (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL,
        child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE SET NULL,
        recommendation_key TEXT,
        recommendation JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS gates_practice_recommendations_parent_child_idx
        ON gates_practice_recommendations(parent_id, child_id, created_at DESC);`,
      `CREATE TABLE IF NOT EXISTS gates_practice_logs (
        id BIGSERIAL PRIMARY KEY,
        parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL,
        child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE SET NULL,
        log_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS gates_practice_logs_parent_child_idx
        ON gates_practice_logs(parent_id, child_id, created_at DESC);`,
      `CREATE TABLE IF NOT EXISTS gates_story_content (
        id BIGSERIAL PRIMARY KEY,
        story_key TEXT,
        content JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS gates_story_content_story_key_idx
        ON gates_story_content(story_key);`,
      `CREATE TABLE IF NOT EXISTS gates_guidance_messages (
        id BIGSERIAL PRIMARY KEY,
        guidance_key TEXT,
        message JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE INDEX IF NOT EXISTS gates_guidance_messages_guidance_key_idx
        ON gates_guidance_messages(guidance_key);`,
    ],
  },
  {
    id: "gates-002-runtime-contract-alignment",
    statements: [
      `ALTER TABLE gates_practice_recommendations
        ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`,
      `ALTER TABLE gates_practice_recommendations
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`,
      `UPDATE gates_practice_recommendations
        SET payload = recommendation
        WHERE (payload IS NULL OR payload = '{}'::jsonb)
          AND recommendation IS NOT NULL;`,
      `ALTER TABLE gates_practice_logs
        ADD COLUMN IF NOT EXISTS gate_key TEXT;`,
      `ALTER TABLE gates_practice_logs
        ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;`,
      `ALTER TABLE gates_practice_logs
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`,
      `UPDATE gates_practice_logs
        SET payload = log_data
        WHERE (payload IS NULL OR payload = '{}'::jsonb)
          AND log_data IS NOT NULL;`,
      `CREATE UNIQUE INDEX IF NOT EXISTS gates_progress_parent_child_key_uq
        ON gates_progress(parent_id, child_id, progress_key);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS gates_practice_recommendations_parent_child_key_uq
        ON gates_practice_recommendations(parent_id, child_id, recommendation_key);`,
      `CREATE INDEX IF NOT EXISTS gates_practice_logs_parent_child_gate_idx
        ON gates_practice_logs(parent_id, child_id, gate_key, created_at DESC);`,
    ],
  },
  {
    id: "gates-003-development-timeline-foundation",
    statements: [
      `CREATE TABLE IF NOT EXISTS gates_development_timeline (
        id BIGSERIAL PRIMARY KEY,
        timeline_event_id TEXT NOT NULL,
        child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE CASCADE,
        parent_user_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        gate_number INTEGER,
        gate_key TEXT,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        source_type TEXT NOT NULL,
        source_id TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS gates_development_timeline_event_id_uq
        ON gates_development_timeline (timeline_event_id);`,
      `CREATE INDEX IF NOT EXISTS gates_development_timeline_child_occurred_idx
        ON gates_development_timeline (child_id, occurred_at DESC);`,
      `CREATE INDEX IF NOT EXISTS gates_development_timeline_parent_child_idx
        ON gates_development_timeline (parent_user_id, child_id);`,
      `CREATE INDEX IF NOT EXISTS gates_development_timeline_event_type_idx
        ON gates_development_timeline (event_type);`,
      `CREATE INDEX IF NOT EXISTS gates_development_timeline_gate_number_idx
        ON gates_development_timeline (gate_number);`,
    ],
  },
];

async function applyGatesMigrations(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS gates_schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  let appliedCount = 0;
  for (const migration of GATES_MIGRATIONS) {
    const existing = await pool.query("SELECT 1 FROM gates_schema_migrations WHERE id = $1", [migration.id]);
    if (existing.rowCount > 0) continue;

    await pool.query("BEGIN");
    try {
      for (const statement of migration.statements) {
        await pool.query(statement);
      }
      await pool.query(
        "INSERT INTO gates_schema_migrations (id, applied_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING",
        [migration.id]
      );
      await pool.query("COMMIT");
      appliedCount += 1;
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  return {
    appliedCount,
    totalMigrations: GATES_MIGRATIONS.length,
  };
}

async function verifyGatesSchema(pool) {
  const requiredTables = [
    "gates_schema_migrations",
    "gates_parent_profiles",
    "gates_child_profiles",
    "gates_assessments",
    "gates_progress",
    "gates_practice_recommendations",
    "gates_practice_logs",
    "gates_story_content",
    "gates_guidance_messages",
    "gates_development_timeline",
  ];

  const requiredIndexes = [
    "gates_parent_profiles_email_lower_uq",
    "gates_child_profiles_parent_id_idx",
    "gates_assessments_parent_child_idx",
    "gates_progress_parent_child_idx",
    "gates_practice_recommendations_parent_child_idx",
    "gates_practice_logs_parent_child_idx",
    "gates_story_content_story_key_idx",
    "gates_guidance_messages_guidance_key_idx",
    "gates_progress_parent_child_key_uq",
    "gates_practice_recommendations_parent_child_key_uq",
    "gates_practice_logs_parent_child_gate_idx",
    "gates_development_timeline_event_id_uq",
    "gates_development_timeline_child_occurred_idx",
    "gates_development_timeline_parent_child_idx",
    "gates_development_timeline_event_type_idx",
    "gates_development_timeline_gate_number_idx",
  ];

  const tableResult = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [requiredTables]
  );
  const indexResult = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
    [requiredIndexes]
  );

  const foundTables = new Set(tableResult.rows.map((row) => row.table_name));
  const foundIndexes = new Set(indexResult.rows.map((row) => row.indexname));
  const missingTables = requiredTables.filter((name) => !foundTables.has(name));
  const missingIndexes = requiredIndexes.filter((name) => !foundIndexes.has(name));

  return {
    ok: missingTables.length === 0 && missingIndexes.length === 0,
    missingTables,
    missingIndexes,
  };
}

module.exports = {
  GATES_MIGRATIONS,
  applyGatesMigrations,
  verifyGatesSchema,
};
