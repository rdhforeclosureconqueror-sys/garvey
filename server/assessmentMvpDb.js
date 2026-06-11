"use strict";

const ASSESSMENT_MVP_MIGRATION_TABLE = "assessment_mvp_schema_migrations";
const ASSESSMENT_MVP_INITIAL_MIGRATION_ID = "assessment_mvp_001_persistent_assessment_foundation";

const ASSESSMENT_MVP_MIGRATIONS = Object.freeze([
  {
    id: ASSESSMENT_MVP_INITIAL_MIGRATION_ID,
    description: "Create additive persistent assessment session, item, response, evidence, recommendation, and exposure tables",
    statements: Object.freeze([
      `CREATE TABLE IF NOT EXISTS assessment_sessions (
        id BIGSERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        learner_id BIGINT NOT NULL,
        parent_profile_id BIGINT NOT NULL,
        auth_user_id INTEGER,
        assessment_role TEXT NOT NULL,
        grade INTEGER NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        session_version TEXT NOT NULL,
        selection_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        current_question_position INTEGER NOT NULL DEFAULT 0,
        prior_session_id BIGINT,
        lock_version INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        CONSTRAINT assessment_sessions_session_id_uq UNIQUE (session_id),
        CONSTRAINT assessment_sessions_learner_id_fkey FOREIGN KEY (learner_id) REFERENCES gates_child_profiles(id) ON DELETE RESTRICT,
        CONSTRAINT assessment_sessions_parent_profile_id_fkey FOREIGN KEY (parent_profile_id) REFERENCES gates_parent_profiles(id) ON DELETE RESTRICT,
        CONSTRAINT assessment_sessions_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT assessment_sessions_prior_session_id_fkey FOREIGN KEY (prior_session_id) REFERENCES assessment_sessions(id) ON DELETE SET NULL,
        CONSTRAINT assessment_sessions_role_chk CHECK (assessment_role IN ('baseline', 'reassessment')),
        CONSTRAINT assessment_sessions_grade_chk CHECK (grade BETWEEN 1 AND 6),
        CONSTRAINT assessment_sessions_subject_chk CHECK (subject IN ('Math', 'English')),
        CONSTRAINT assessment_sessions_status_chk CHECK (status IN ('in_progress', 'completed', 'abandoned', 'expired')),
        CONSTRAINT assessment_sessions_position_chk CHECK (current_question_position >= 0),
        CONSTRAINT assessment_sessions_lock_version_chk CHECK (lock_version >= 0)
      );`,
      `CREATE INDEX IF NOT EXISTS assessment_sessions_parent_learner_status_updated_idx
        ON assessment_sessions(parent_profile_id, learner_id, status, updated_at DESC);`,
      `CREATE INDEX IF NOT EXISTS assessment_sessions_learner_created_idx
        ON assessment_sessions(learner_id, created_at DESC);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS assessment_sessions_one_in_progress_uq
        ON assessment_sessions(learner_id, grade, subject, assessment_role)
        WHERE status = 'in_progress';`,

      `CREATE TABLE IF NOT EXISTS assessment_session_items (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL,
        item_identity TEXT NOT NULL,
        assessment_item_id TEXT NOT NULL,
        package_id TEXT NOT NULL,
        source_question_id TEXT NOT NULL,
        source_bank TEXT NOT NULL,
        source_pointer TEXT,
        duplicate_key TEXT NOT NULL,
        display_order INTEGER NOT NULL,
        question_type TEXT NOT NULL,
        item_version_hash TEXT NOT NULL,
        public_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        delivered_at TIMESTAMPTZ,
        answered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT assessment_session_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
        CONSTRAINT assessment_session_items_identity_uq UNIQUE (session_id, item_identity),
        CONSTRAINT assessment_session_items_public_id_uq UNIQUE (session_id, assessment_item_id),
        CONSTRAINT assessment_session_items_order_uq UNIQUE (session_id, display_order)
      );`,
      `CREATE INDEX IF NOT EXISTS assessment_session_items_session_order_idx
        ON assessment_session_items(session_id, display_order);`,
      `CREATE INDEX IF NOT EXISTS assessment_session_items_package_question_idx
        ON assessment_session_items(package_id, source_question_id);`,

      `CREATE TABLE IF NOT EXISTS assessment_responses (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL,
        session_item_id BIGINT NOT NULL,
        learner_response JSONB NOT NULL,
        normalized_response TEXT,
        response_status TEXT NOT NULL,
        scored BOOLEAN NOT NULL DEFAULT FALSE,
        score_status TEXT NOT NULL DEFAULT 'not_scored',
        score_result JSONB NOT NULL DEFAULT '{}'::jsonb,
        omitted BOOLEAN NOT NULL DEFAULT FALSE,
        scoring_policy_version TEXT NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT assessment_responses_session_id_fkey FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
        CONSTRAINT assessment_responses_session_item_id_fkey FOREIGN KEY (session_item_id) REFERENCES assessment_session_items(id) ON DELETE CASCADE,
        CONSTRAINT assessment_responses_session_item_uq UNIQUE (session_item_id),
        CONSTRAINT assessment_responses_status_chk CHECK (response_status IN ('submitted', 'omitted', 'invalid', 'duplicate_rejected')),
        CONSTRAINT assessment_responses_score_status_chk CHECK (score_status IN ('correct', 'incorrect', 'not_scorable', 'omitted', 'not_scored'))
      );`,
      `CREATE INDEX IF NOT EXISTS assessment_responses_session_submitted_idx
        ON assessment_responses(session_id, submitted_at);`,

      `CREATE TABLE IF NOT EXISTS assessment_skill_evidence (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL,
        package_id TEXT NOT NULL,
        valid_response_count INTEGER NOT NULL DEFAULT 0,
        correct_count INTEGER NOT NULL DEFAULT 0,
        incorrect_count INTEGER NOT NULL DEFAULT 0,
        omitted_count INTEGER NOT NULL DEFAULT 0,
        not_scorable_count INTEGER NOT NULL DEFAULT 0,
        accuracy NUMERIC(6,5),
        provisional_label TEXT NOT NULL,
        evidence_version TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT assessment_skill_evidence_session_id_fkey FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
        CONSTRAINT assessment_skill_evidence_session_package_uq UNIQUE (session_id, package_id),
        CONSTRAINT assessment_skill_evidence_label_chk CHECK (provisional_label IN ('Ready', 'Developing', 'Needs Support', 'Not Enough Evidence'))
      );`,
      `CREATE INDEX IF NOT EXISTS assessment_skill_evidence_session_idx
        ON assessment_skill_evidence(session_id);`,
      `CREATE INDEX IF NOT EXISTS assessment_skill_evidence_package_label_idx
        ON assessment_skill_evidence(package_id, provisional_label);`,

      `CREATE TABLE IF NOT EXISTS assessment_recommendations (
        id BIGSERIAL PRIMARY KEY,
        session_id BIGINT NOT NULL,
        learner_id BIGINT NOT NULL,
        recommended_package_id TEXT NOT NULL,
        recommendation_type TEXT NOT NULL,
        reason_code TEXT NOT NULL,
        priority INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        dismissed_at TIMESTAMPTZ,
        CONSTRAINT assessment_recommendations_session_id_fkey FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
        CONSTRAINT assessment_recommendations_learner_id_fkey FOREIGN KEY (learner_id) REFERENCES gates_child_profiles(id) ON DELETE RESTRICT,
        CONSTRAINT assessment_recommendations_session_package_type_uq UNIQUE (session_id, recommended_package_id, recommendation_type),
        CONSTRAINT assessment_recommendations_status_chk CHECK (status IN ('active', 'completed', 'dismissed')),
        CONSTRAINT assessment_recommendations_type_chk CHECK (recommendation_type IN ('current_skill_support', 'prerequisite_support', 'additional_evidence'))
      );`,
      `CREATE INDEX IF NOT EXISTS assessment_recommendations_learner_status_priority_created_idx
        ON assessment_recommendations(learner_id, status, priority, created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS assessment_recommendations_package_idx
        ON assessment_recommendations(recommended_package_id);`,

      `CREATE TABLE IF NOT EXISTS assessment_item_exposures (
        id BIGSERIAL PRIMARY KEY,
        learner_id BIGINT NOT NULL,
        package_id TEXT NOT NULL,
        source_question_id TEXT NOT NULL,
        source_bank TEXT NOT NULL,
        item_identity TEXT NOT NULL,
        duplicate_key TEXT NOT NULL,
        assessment_session_id BIGINT NOT NULL,
        exposed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT assessment_item_exposures_learner_id_fkey FOREIGN KEY (learner_id) REFERENCES gates_child_profiles(id) ON DELETE RESTRICT,
        CONSTRAINT assessment_item_exposures_assessment_session_id_fkey FOREIGN KEY (assessment_session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
        CONSTRAINT assessment_item_exposures_learner_item_uq UNIQUE (learner_id, item_identity),
        CONSTRAINT assessment_item_exposures_learner_duplicate_uq UNIQUE (learner_id, duplicate_key)
      );`,
      `CREATE INDEX IF NOT EXISTS assessment_item_exposures_learner_package_exposed_idx
        ON assessment_item_exposures(learner_id, package_id, exposed_at DESC);`,
      `CREATE INDEX IF NOT EXISTS assessment_item_exposures_session_idx
        ON assessment_item_exposures(assessment_session_id);`,
    ]),
  },
]);

const REQUIRED_ASSESSMENT_MVP_TABLES = Object.freeze([
  ASSESSMENT_MVP_MIGRATION_TABLE,
  "assessment_sessions",
  "assessment_session_items",
  "assessment_responses",
  "assessment_skill_evidence",
  "assessment_recommendations",
  "assessment_item_exposures",
]);

const REQUIRED_ASSESSMENT_MVP_INDEXES = Object.freeze([
  "assessment_sessions_session_id_uq",
  "assessment_sessions_parent_learner_status_updated_idx",
  "assessment_sessions_learner_created_idx",
  "assessment_sessions_one_in_progress_uq",
  "assessment_session_items_identity_uq",
  "assessment_session_items_public_id_uq",
  "assessment_session_items_order_uq",
  "assessment_session_items_session_order_idx",
  "assessment_session_items_package_question_idx",
  "assessment_responses_session_item_uq",
  "assessment_responses_session_submitted_idx",
  "assessment_skill_evidence_session_package_uq",
  "assessment_skill_evidence_session_idx",
  "assessment_skill_evidence_package_label_idx",
  "assessment_recommendations_session_package_type_uq",
  "assessment_recommendations_learner_status_priority_created_idx",
  "assessment_recommendations_package_idx",
  "assessment_item_exposures_learner_item_uq",
  "assessment_item_exposures_learner_duplicate_uq",
  "assessment_item_exposures_learner_package_exposed_idx",
  "assessment_item_exposures_session_idx",
]);

const REQUIRED_ASSESSMENT_MVP_CONSTRAINTS = Object.freeze([
  "assessment_sessions_role_chk",
  "assessment_sessions_grade_chk",
  "assessment_sessions_subject_chk",
  "assessment_sessions_status_chk",
  "assessment_sessions_position_chk",
  "assessment_sessions_lock_version_chk",
  "assessment_session_items_identity_uq",
  "assessment_session_items_public_id_uq",
  "assessment_session_items_order_uq",
  "assessment_responses_session_item_uq",
  "assessment_responses_status_chk",
  "assessment_responses_score_status_chk",
  "assessment_skill_evidence_session_package_uq",
  "assessment_skill_evidence_label_chk",
  "assessment_recommendations_session_package_type_uq",
  "assessment_recommendations_status_chk",
  "assessment_recommendations_type_chk",
  "assessment_item_exposures_learner_item_uq",
  "assessment_item_exposures_learner_duplicate_uq",
  "assessment_sessions_learner_id_fkey",
  "assessment_sessions_parent_profile_id_fkey",
  "assessment_sessions_auth_user_id_fkey",
  "assessment_sessions_prior_session_id_fkey",
  "assessment_session_items_session_id_fkey",
  "assessment_responses_session_id_fkey",
  "assessment_responses_session_item_id_fkey",
  "assessment_skill_evidence_session_id_fkey",
  "assessment_recommendations_session_id_fkey",
  "assessment_recommendations_learner_id_fkey",
  "assessment_item_exposures_learner_id_fkey",
  "assessment_item_exposures_assessment_session_id_fkey",
]);

async function initializeAssessmentMvpDatabase(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessment_mvp_schema_migrations (
      migration_id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await pool.query("SELECT migration_id FROM assessment_mvp_schema_migrations");
  const applied = new Set(existing.rows.map((row) => row.migration_id));
  let appliedCount = 0;

  for (const migration of ASSESSMENT_MVP_MIGRATIONS) {
    if (applied.has(migration.id)) continue;

    await pool.query("BEGIN");
    try {
      for (const statement of migration.statements) {
        await pool.query(statement);
      }
      await pool.query(
        "INSERT INTO assessment_mvp_schema_migrations (migration_id, applied_at) VALUES ($1, NOW()) ON CONFLICT (migration_id) DO NOTHING",
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
    totalMigrations: ASSESSMENT_MVP_MIGRATIONS.length,
  };
}

async function verifyAssessmentMvpSchema(pool) {
  const tableResult = await pool.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [REQUIRED_ASSESSMENT_MVP_TABLES]
  );
  const indexResult = await pool.query(
    `SELECT indexname
       FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])`,
    [REQUIRED_ASSESSMENT_MVP_INDEXES]
  );
  const constraintResult = await pool.query(
    `SELECT constraint_name
       FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND constraint_name = ANY($1::text[])`,
    [REQUIRED_ASSESSMENT_MVP_CONSTRAINTS]
  );

  const foundTables = new Set(tableResult.rows.map((row) => row.table_name));
  const foundIndexes = new Set(indexResult.rows.map((row) => row.indexname));
  const foundConstraints = new Set(constraintResult.rows.map((row) => row.constraint_name));
  const missingTables = REQUIRED_ASSESSMENT_MVP_TABLES.filter((name) => !foundTables.has(name));
  const missingIndexes = REQUIRED_ASSESSMENT_MVP_INDEXES.filter((name) => !foundIndexes.has(name));
  const missingConstraints = REQUIRED_ASSESSMENT_MVP_CONSTRAINTS.filter((name) => !foundConstraints.has(name));

  return {
    ok: missingTables.length === 0 && missingIndexes.length === 0 && missingConstraints.length === 0,
    requiredTables: REQUIRED_ASSESSMENT_MVP_TABLES,
    requiredIndexes: REQUIRED_ASSESSMENT_MVP_INDEXES,
    requiredConstraints: REQUIRED_ASSESSMENT_MVP_CONSTRAINTS,
    missingTables,
    missingIndexes,
    missingConstraints,
  };
}

module.exports = {
  ASSESSMENT_MVP_INITIAL_MIGRATION_ID,
  ASSESSMENT_MVP_MIGRATIONS,
  REQUIRED_ASSESSMENT_MVP_TABLES,
  REQUIRED_ASSESSMENT_MVP_INDEXES,
  REQUIRED_ASSESSMENT_MVP_CONSTRAINTS,
  initializeAssessmentMvpDatabase,
  verifyAssessmentMvpSchema,
};
