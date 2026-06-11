const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const {
  ASSESSMENT_MVP_INITIAL_MIGRATION_ID,
  ASSESSMENT_MVP_MIGRATIONS,
  REQUIRED_ASSESSMENT_MVP_TABLES,
  REQUIRED_ASSESSMENT_MVP_INDEXES,
  REQUIRED_ASSESSMENT_MVP_CONSTRAINTS,
  initializeAssessmentMvpDatabase,
  verifyAssessmentMvpSchema,
} = require('../server/assessmentMvpDb');

const ROOT = path.join(__dirname, '..');
const SKILL_WORLD_CONTENT_DIR = path.join(ROOT, 'public', 'gamehub', 'skill-world', 'content');

function migrationSql() {
  return ASSESSMENT_MVP_MIGRATIONS.flatMap((migration) => migration.statements).join('\n');
}

function tableBlock(tableName) {
  const sql = migrationSql();
  const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName} \\(([\\s\\S]*?)\\n\\s*\\);`, 'i'));
  assert.ok(match, `missing CREATE TABLE block for ${tableName}`);
  return match[1];
}

function hashSkillPackageContent() {
  const files = fs.readdirSync(SKILL_WORLD_CONTENT_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(SKILL_WORLD_CONTENT_DIR, file)));
  }
  return hash.digest('hex');
}

function createMockPool({ applied = [], tables = [], indexes = [], constraints = [], failOnSql = null } = {}) {
  const state = {
    applied: new Set(applied),
    gatesParents: [{ id: 1, email: 'parent@example.com' }],
    gatesChildren: [{ id: 10, parent_id: 1, first_name: 'Learner' }],
  };
  const calls = [];

  return {
    calls,
    state,
    async query(sql, params = []) {
      const normalized = String(sql || '').trim().replace(/\s+/g, ' ');
      calls.push({ sql: normalized, params });

      if (failOnSql && normalized.includes(failOnSql)) {
        throw new Error(`forced migration failure at ${failOnSql}`);
      }

      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') return { rows: [], rowCount: 0 };

      if (normalized.includes('CREATE TABLE IF NOT EXISTS assessment_mvp_schema_migrations')) return { rows: [], rowCount: 0 };

      if (normalized.includes('SELECT migration_id FROM assessment_mvp_schema_migrations')) {
        return { rows: [...state.applied].map((migration_id) => ({ migration_id })), rowCount: state.applied.size };
      }

      if (normalized.includes('INSERT INTO assessment_mvp_schema_migrations')) {
        state.applied.add(params[0]);
        return { rows: [], rowCount: 1 };
      }

      if (normalized.includes('FROM information_schema.tables')) {
        return { rows: tables.map((table_name) => ({ table_name })), rowCount: tables.length };
      }

      if (normalized.includes('FROM pg_indexes')) {
        return { rows: indexes.map((indexname) => ({ indexname })), rowCount: indexes.length };
      }

      if (normalized.includes('FROM information_schema.table_constraints')) {
        return { rows: constraints.map((constraint_name) => ({ constraint_name })), rowCount: constraints.length };
      }

      return { rows: [], rowCount: 0 };
    },
  };
}

test('assessment MVP migration registry defines the persistent foundation only', () => {
  assert.equal(ASSESSMENT_MVP_INITIAL_MIGRATION_ID, 'assessment_mvp_001_persistent_assessment_foundation');
  assert.equal(ASSESSMENT_MVP_MIGRATIONS.length, 1);
  assert.equal(ASSESSMENT_MVP_MIGRATIONS[0].id, ASSESSMENT_MVP_INITIAL_MIGRATION_ID);
  assert.ok(ASSESSMENT_MVP_MIGRATIONS[0].statements.length > 0);
});

test('assessment MVP migration creates history table, all six tables, constraints, and indexes', () => {
  const sql = migrationSql();
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_sessions/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_session_items/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_responses/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_skill_evidence/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_recommendations/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS assessment_item_exposures/i);
  assert.doesNotMatch(sql, /DROP\s+TABLE/i);
  assert.doesNotMatch(sql, /ALTER\s+TABLE\s+gates_/i);
  assert.doesNotMatch(sql, /UPDATE\s+gates_|INSERT\s+INTO\s+gates_|DELETE\s+FROM\s+gates_/i);

  for (const constraintName of REQUIRED_ASSESSMENT_MVP_CONSTRAINTS) {
    assert.match(sql, new RegExp(constraintName, 'i'), `missing constraint ${constraintName}`);
  }
  for (const indexName of REQUIRED_ASSESSMENT_MVP_INDEXES.filter((name) => !name.endsWith('_key'))) {
    assert.match(sql, new RegExp(indexName, 'i'), `missing index ${indexName}`);
  }
});

test('assessment MVP migration includes required foreign-key cascade and restrict behavior', () => {
  const sql = migrationSql();
  assert.match(sql, /FOREIGN KEY \(learner_id\) REFERENCES gates_child_profiles\(id\) ON DELETE RESTRICT/i);
  assert.match(sql, /FOREIGN KEY \(parent_profile_id\) REFERENCES gates_parent_profiles\(id\) ON DELETE RESTRICT/i);
  assert.match(sql, /FOREIGN KEY \(auth_user_id\) REFERENCES users\(id\) ON DELETE SET NULL/i);
  assert.match(sql, /FOREIGN KEY \(prior_session_id\) REFERENCES assessment_sessions\(id\) ON DELETE SET NULL/i);
  assert.match(sql, /FOREIGN KEY \(session_id\) REFERENCES assessment_sessions\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /FOREIGN KEY \(session_item_id\) REFERENCES assessment_session_items\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /FOREIGN KEY \(assessment_session_id\) REFERENCES assessment_sessions\(id\) ON DELETE CASCADE/i);
});

test('assessment MVP migration defines required uniqueness and invalid-value rejection checks', () => {
  const sql = migrationSql();
  assert.match(sql, /CONSTRAINT assessment_sessions_session_id_uq UNIQUE \(session_id\)/i, 'duplicate session IDs are rejected');
  assert.match(sql, /UNIQUE \(session_id, item_identity\)/i, 'duplicate session item identities are rejected');
  assert.match(sql, /UNIQUE \(session_item_id\)/i, 'one response per session item is enforced');
  assert.match(sql, /UNIQUE \(learner_id, item_identity\)/i, 'duplicate learner item exposure is rejected');
  assert.match(sql, /UNIQUE \(learner_id, duplicate_key\)/i, 'duplicate learner duplicate-key exposure is rejected');
  assert.match(sql, /WHERE status = 'in_progress'/i, 'one in-progress session partial unique index exists');

  assert.match(sql, /assessment_role IN \('baseline', 'reassessment'\)/i);
  assert.match(sql, /grade BETWEEN 1 AND 6/i);
  assert.match(sql, /subject IN \('Math', 'English'\)/i);
  assert.match(sql, /status IN \('in_progress', 'completed', 'abandoned', 'expired'\)/i);
  assert.match(sql, /current_question_position >= 0/i);
  assert.match(sql, /lock_version >= 0/i);
  assert.match(sql, /provisional_label IN \('Ready', 'Developing', 'Needs Support', 'Not Enough Evidence'\)/i);
  assert.match(sql, /recommendation_type IN \('current_skill_support', 'prerequisite_support', 'additional_evidence'\)/i);
});

test('assessment session items persist only public item identity and payload fields', () => {
  const itemSql = tableBlock('assessment_session_items');
  assert.match(itemSql, /public_payload JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.doesNotMatch(itemSql, /correct_answer|acceptable_answers|accepted_answers|answer_key|rubric|scoring_key|solution/i);
});

test('initializeAssessmentMvpDatabase is transactional, idempotent, and records migration exactly once', async () => {
  const pool = createMockPool();
  const first = await initializeAssessmentMvpDatabase(pool);
  assert.equal(first.totalMigrations, 1);
  assert.equal(first.appliedCount, 1);
  assert.equal(pool.state.applied.has(ASSESSMENT_MVP_INITIAL_MIGRATION_ID), true);
  assert.equal(pool.calls.filter((call) => call.sql === 'BEGIN').length, 1);
  assert.equal(pool.calls.filter((call) => call.sql === 'COMMIT').length, 1);
  assert.equal(pool.calls.filter((call) => call.sql.includes('INSERT INTO assessment_mvp_schema_migrations')).length, 1);

  const second = await initializeAssessmentMvpDatabase(pool);
  assert.equal(second.totalMigrations, 1);
  assert.equal(second.appliedCount, 0);
  assert.equal(pool.calls.filter((call) => call.sql === 'BEGIN').length, 1, 'second run does not re-apply migration');
  assert.equal(pool.calls.filter((call) => call.sql.includes('INSERT INTO assessment_mvp_schema_migrations')).length, 1, 'migration is recorded exactly once');
});

test('initializeAssessmentMvpDatabase rolls back a failed migration without recording it', async () => {
  const pool = createMockPool({ failOnSql: 'CREATE TABLE IF NOT EXISTS assessment_responses' });
  await assert.rejects(() => initializeAssessmentMvpDatabase(pool), /forced migration failure/);
  assert.equal(pool.calls.some((call) => call.sql === 'BEGIN'), true);
  assert.equal(pool.calls.some((call) => call.sql === 'ROLLBACK'), true);
  assert.equal(pool.calls.some((call) => call.sql === 'COMMIT'), false);
  assert.equal(pool.calls.some((call) => call.sql.includes('INSERT INTO assessment_mvp_schema_migrations')), false);
  assert.equal(pool.state.applied.has(ASSESSMENT_MVP_INITIAL_MIGRATION_ID), false);
});

test('verifyAssessmentMvpSchema reports ready only when tables, indexes, and constraints exist', async () => {
  const readyPool = createMockPool({
    tables: REQUIRED_ASSESSMENT_MVP_TABLES,
    indexes: REQUIRED_ASSESSMENT_MVP_INDEXES,
    constraints: REQUIRED_ASSESSMENT_MVP_CONSTRAINTS,
  });
  const ready = await verifyAssessmentMvpSchema(readyPool);
  assert.equal(ready.ok, true);
  assert.deepEqual(ready.missingTables, []);
  assert.deepEqual(ready.missingIndexes, []);
  assert.deepEqual(ready.missingConstraints, []);

  const incompletePool = createMockPool({
    tables: REQUIRED_ASSESSMENT_MVP_TABLES.slice(0, -1),
    indexes: REQUIRED_ASSESSMENT_MVP_INDEXES.slice(0, -1),
    constraints: REQUIRED_ASSESSMENT_MVP_CONSTRAINTS.slice(0, -1),
  });
  const incomplete = await verifyAssessmentMvpSchema(incompletePool);
  assert.equal(incomplete.ok, false);
  assert.deepEqual(incomplete.missingTables, ['assessment_item_exposures']);
  assert.deepEqual(incomplete.missingIndexes, ['assessment_item_exposures_session_idx']);
  assert.deepEqual(incomplete.missingConstraints, ['assessment_item_exposures_assessment_session_id_fkey']);
});

test('assessment migration leaves existing Gates state and SkillPackage content unchanged in mocked initialization', async () => {
  const beforeHash = hashSkillPackageContent();
  const pool = createMockPool();
  const beforeGatesState = JSON.parse(JSON.stringify({ parents: pool.state.gatesParents, children: pool.state.gatesChildren }));
  await initializeAssessmentMvpDatabase(pool);
  const afterGatesState = JSON.parse(JSON.stringify({ parents: pool.state.gatesParents, children: pool.state.gatesChildren }));
  assert.deepEqual(afterGatesState, beforeGatesState);
  assert.equal(hashSkillPackageContent(), beforeHash);
});

test('child lifecycle remains a separate reviewed migration', () => {
  const sql = migrationSql();
  assert.doesNotMatch(sql, /ALTER TABLE\s+gates_child_profiles/i);
  assert.doesNotMatch(sql, /deactivated_at|deleted_at|profile_status|child_status/i);
});
