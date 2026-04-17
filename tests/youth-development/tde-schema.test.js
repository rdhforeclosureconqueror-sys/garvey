const test = require('node:test');
const assert = require('node:assert/strict');

const { TDE_MIGRATIONS, applyTdeMigrations } = require('../../server/youthDevelopmentTdeDb');

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
