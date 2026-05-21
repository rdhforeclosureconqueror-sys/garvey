const test = require('node:test');
const assert = require('node:assert/strict');

const { GATES_MIGRATIONS, applyGatesMigrations, verifyGatesSchema } = require('../../server/gatesDb');

const EXPECTED_TABLES = [
  'gates_schema_migrations',
  'gates_parent_profiles',
  'gates_child_profiles',
  'gates_assessments',
  'gates_progress',
  'gates_practice_recommendations',
  'gates_practice_logs',
  'gates_story_content',
  'gates_guidance_messages',
  'gates_development_timeline',
];

const EXPECTED_INDEXES = [
  'gates_parent_profiles_email_lower_uq',
  'gates_child_profiles_parent_id_idx',
  'gates_assessments_parent_child_idx',
  'gates_progress_parent_child_idx',
  'gates_practice_recommendations_parent_child_idx',
  'gates_practice_logs_parent_child_idx',
  'gates_story_content_story_key_idx',
  'gates_guidance_messages_guidance_key_idx',
  'gates_progress_parent_child_key_uq',
  'gates_practice_recommendations_parent_child_key_uq',
  'gates_practice_logs_parent_child_gate_idx',
  'gates_development_timeline_event_id_uq',
  'gates_development_timeline_child_occurred_idx',
  'gates_development_timeline_parent_child_idx',
  'gates_development_timeline_event_type_idx',
  'gates_development_timeline_gate_number_idx',
];

test('GATES_MIGRATIONS define additive, non-destructive infrastructure', () => {
  assert.ok(GATES_MIGRATIONS.length > 0);
  const body = GATES_MIGRATIONS.flatMap((migration) => {
    assert.match(migration.id, /^gates-/);
    return migration.statements;
  }).join('\n');
  for (const tableName of EXPECTED_TABLES) {
    if (tableName === 'gates_schema_migrations') continue;
    assert.match(body, new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}`));
  }
  assert.doesNotMatch(body, /DROP\s+TABLE/i);
  assert.doesNotMatch(body, /ALTER\s+TABLE\s+(?!gates_)/i);
  assert.match(body, /CREATE UNIQUE INDEX IF NOT EXISTS gates_parent_profiles_email_lower_uq\s+ON gates_parent_profiles \(LOWER\(email\)\)/i);
  assert.doesNotMatch(body, /UNIQUE\s*\(\s*LOWER\(email\)\s*\)/i);
});

test('applyGatesMigrations is repeatable and only applies pending migrations', async () => {
  const applied = new Set();
  const calls = [];
  const pool = {
    async query(sql, params = []) {
      const normalized = String(sql).trim().replace(/\s+/g, ' ');
      calls.push(normalized);
      if (normalized.includes('SELECT 1 FROM gates_schema_migrations WHERE id = $1')) {
        return { rowCount: applied.has(params[0]) ? 1 : 0, rows: [] };
      }
      if (normalized.startsWith('INSERT INTO gates_schema_migrations')) {
        applied.add(params[0]);
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  const first = await applyGatesMigrations(pool);
  const second = await applyGatesMigrations(pool);

  assert.equal(first.totalMigrations, GATES_MIGRATIONS.length);
  assert.equal(first.appliedCount, GATES_MIGRATIONS.length);
  assert.equal(second.appliedCount, 0);
  assert.ok(calls.some((entry) => entry === 'BEGIN'));
  assert.ok(calls.some((entry) => entry === 'COMMIT'));
});

test('verifyGatesSchema reports ok when all tables and indexes exist', async () => {
  const pool = {
    async query(sql) {
      if (String(sql).includes('information_schema.tables')) {
        return { rows: EXPECTED_TABLES.map((table_name) => ({ table_name })) };
      }
      return { rows: EXPECTED_INDEXES.map((indexname) => ({ indexname })) };
    },
  };

  const report = await verifyGatesSchema(pool);
  assert.equal(report.ok, true);
  assert.deepEqual(report.missingTables, []);
  assert.deepEqual(report.missingIndexes, []);
});

test('verifyGatesSchema reports missing objects without touching non-Gates tables', async () => {
  const observedSql = [];
  const pool = {
    async query(sql) {
      observedSql.push(String(sql));
      if (String(sql).includes('information_schema.tables')) {
        return {
          rows: [
            { table_name: 'gates_schema_migrations' },
            { table_name: 'gates_parent_profiles' },
          ],
        };
      }
      return {
        rows: [{ indexname: 'gates_parent_profiles_email_lower_uq' }],
      };
    },
  };

  const report = await verifyGatesSchema(pool);
  assert.equal(report.ok, false);
  assert.ok(report.missingTables.includes('gates_child_profiles'));
  assert.ok(report.missingIndexes.includes('gates_story_content_story_key_idx'));
  assert.ok(observedSql.every((sql) => !/DROP\s+TABLE|ALTER\s+TABLE/i.test(sql)));
});
