'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { applyLeaderWithinMigrations } = require('../server/leaderWithinDb');

const migrationSql = fs.readFileSync('server/leaderWithinDb.js', 'utf8');

function createMigrationPool({ existingNamedObject = false } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql) {
      const normalized = String(sql || '').replace(/\s+/g, ' ').trim();
      calls.push(normalized);
      if (
        existingNamedObject &&
        normalized.includes('ADD CONSTRAINT leader_within_cohort_facilitators_account_unique') &&
        !normalized.includes('FROM pg_class')
      ) {
        const error = new Error('relation "leader_within_cohort_facilitators_account_unique" already exists');
        error.code = '42P07';
        throw error;
      }
      return { rows: [], rowCount: 0 };
    },
  };
}

test('Leader Within account assignment migration checks pg_constraint and pg_class before adding the named unique constraint', () => {
  assert.match(migrationSql, /FROM pg_constraint[\s\S]*conname = 'leader_within_cohort_facilitators_account_unique'/);
  assert.match(migrationSql, /FROM pg_class[\s\S]*relname = 'leader_within_cohort_facilitators_account_unique'/);
  assert.match(migrationSql, /named_constraint_exists OR named_relation_exists/);
  assert.match(migrationSql, /UNIQUE \(cohort_id, facilitator_account_id\)/);
});

test('Leader Within account assignment migration audits semantic equivalence before no-oping existing objects', () => {
  assert.match(migrationSql, /named_constraint_is_correct/);
  assert.match(migrationSql, /named_unique_index_is_correct/);
  assert.match(migrationSql, /array_agg\(attribute_catalog\.attname::text ORDER BY key_catalog\.ordinality\) AS column_names/);
  assert.match(migrationSql, /indexed_columns\.column_names = ARRAY\['cohort_id', 'facilitator_account_id'\]::text\[\]/);
  assert.match(migrationSql, /does not exactly enforce UNIQUE \(cohort_id, facilitator_account_id\)/);
});

test('Leader Within account assignment migration detects existing correct unique constraints and indexes', () => {
  assert.match(migrationSql, /constraint_catalog\.contype = 'u'/);
  assert.match(migrationSql, /index_metadata\.indisunique = TRUE/);
  assert.match(migrationSql, /IF named_constraint_is_correct OR named_unique_index_is_correct THEN/);
  assert.match(migrationSql, /skipping constraint creation/);
});

test('Leader Within account assignment migration can add the constraint when no named object exists', () => {
  assert.match(migrationSql, /IF named_constraint_exists OR named_relation_exists THEN[\s\S]*ELSE[\s\S]*ALTER TABLE leader_within_cohort_facilitators ADD CONSTRAINT leader_within_cohort_facilitators_account_unique UNIQUE \(cohort_id, facilitator_account_id\)/);
});

test('Leader Within account assignment migration checks duplicate data before adding the unique constraint', () => {
  assert.match(migrationSql, /WHERE cohort_id IS NOT NULL\s+AND facilitator_account_id IS NOT NULL/);
  assert.match(migrationSql, /GROUP BY cohort_id, facilitator_account_id\s+HAVING COUNT\(\*\) > 1/);
  assert.match(migrationSql, /duplicate \(cohort_id, facilitator_account_id\) rows exist/);
});

test('Leader Within catalog column comparison uses compatible text arrays', () => {
  assert.doesNotMatch(migrationSql, /array_agg\(attribute_catalog\.attname ORDER BY key_catalog\.ordinality\)/);
  assert.doesNotMatch(migrationSql, /indexed_columns\.column_names = ARRAY\['cohort_id', 'facilitator_account_id'\](?!::text\[\])/);
  assert.match(migrationSql, /array_agg\(attribute_catalog\.attname::text ORDER BY key_catalog\.ordinality\) AS column_names/);
  assert.match(migrationSql, /ARRAY\['cohort_id', 'facilitator_account_id'\]::text\[\]/);
});

test('Leader Within migration completes without surfacing PostgreSQL 42883 array operator errors', async () => {
  const pool = createMigrationPool();
  await assert.doesNotReject(() => applyLeaderWithinMigrations(pool), /42883/);
  assert.equal(pool.calls.some((sql) => sql.includes("ARRAY['cohort_id', 'facilitator_account_id']::text[]")), true);
});

test('Leader Within migration does not rethrow 42P07 when the named relation already exists', async () => {
  const pool = createMigrationPool({ existingNamedObject: true });
  await assert.doesNotReject(() => applyLeaderWithinMigrations(pool));
  assert.equal(pool.calls.some((sql) => sql.includes('FROM pg_class') && sql.includes('leader_within_cohort_facilitators_account_unique')), true);
});
