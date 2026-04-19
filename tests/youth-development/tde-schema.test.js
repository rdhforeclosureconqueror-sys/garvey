const test = require('node:test');
const assert = require('node:assert/strict');

const { TDE_MIGRATIONS, applyTdeMigrations, verifyTdeSchema } = require('../../server/youthDevelopmentTdeDb');

test('tde migrations are isolated and reversible', () => {
  assert.ok(TDE_MIGRATIONS.length > 0);
  for (const migration of TDE_MIGRATIONS) {
    assert.match(migration.id, /^tde_/);
    assert.match(migration.up, /CREATE TABLE IF NOT EXISTS tde_/);
    assert.match(migration.down, /DROP TABLE IF EXISTS tde_/);
  }
});

test('applyTdeMigrations executes pending migrations', async () => {
  const calls = [];
  const pool = {
    async query(sql) {
      const normalized = String(sql).trim().replace(/\s+/g, ' ');
      calls.push(normalized);
      if (normalized.includes('SELECT migration_id FROM tde_schema_migrations')) return { rows: [] };
      return { rows: [] };
    },
  };

  const result = await applyTdeMigrations(pool);
  assert.equal(result.totalMigrations, TDE_MIGRATIONS.length);
  assert.equal(result.appliedCount, TDE_MIGRATIONS.length);
  assert.ok(calls.some((sql) => sql === 'BEGIN'));
});


test('phase-3 program rail migration includes additive extension tables', () => {
  const migration = TDE_MIGRATIONS.find((entry) => entry.id === 'tde_002_phase3_program_rail_tables');
  assert.ok(migration);
  assert.match(migration.up, /CREATE TABLE IF NOT EXISTS tde_program_enrollments/);
  assert.match(migration.up, /CREATE TABLE IF NOT EXISTS tde_weekly_progress_records/);
  assert.match(migration.up, /CREATE TABLE IF NOT EXISTS tde_checkpoint_records/);
});

test('phase-4 migration includes governance gap closure tables', () => {
  const migration = TDE_MIGRATIONS.find((entry) => entry.id === 'tde_003_phase4_governance_and_summary_tables');
  assert.ok(migration);
  assert.match(migration.up, /CREATE TABLE IF NOT EXISTS tde_observer_consent_records/);
  assert.match(migration.up, /CREATE TABLE IF NOT EXISTS tde_environment_hook_events/);
  assert.match(migration.up, /CREATE TABLE IF NOT EXISTS tde_validation_export_logs/);
});

test('verifyTdeSchema reports missing required TDE tables', async () => {
  const pool = {
    async query() {
      return {
        rows: [
          { table_name: 'tde_schema_migrations' },
          { table_name: 'tde_child_profiles' },
        ],
      };
    },
  };

  const result = await verifyTdeSchema(pool);
  assert.equal(result.ok, false);
  assert.ok(result.missingTables.includes('tde_program_enrollments'));
});
