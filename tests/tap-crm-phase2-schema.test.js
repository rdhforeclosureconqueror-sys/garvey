const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TAP_CRM_MIGRATIONS,
  applyTapCrmMigrations,
  verifyTapCrmSchema,
} = require('../server/tapCrmDb');

function createMockPool({ appliedRows = [], tables = [], indexes = [] } = {}) {
  const calls = [];

  return {
    calls,
    async query(sql, params = []) {
      const normalized = String(sql).trim().replace(/\s+/g, ' ');
      calls.push({ sql: normalized, params });

      if (normalized.includes('SELECT migration_id FROM tap_crm_schema_migrations')) {
        return { rows: appliedRows };
      }

      if (normalized.includes('FROM information_schema.tables')) {
        return { rows: tables.map((table_name) => ({ table_name })) };
      }

      if (normalized.includes('FROM pg_indexes')) {
        return { rows: indexes.map((indexname) => ({ indexname })) };
      }

      return { rows: [] };
    },
  };
}

test('tap crm migrations are reversible and isolated', () => {
  assert.ok(TAP_CRM_MIGRATIONS.length > 0);
  for (const migration of TAP_CRM_MIGRATIONS) {
    assert.match(migration.id, /^tap_crm_/);
    assert.match(migration.up, /(CREATE TABLE IF NOT EXISTS tap_crm_|CREATE UNIQUE INDEX IF NOT EXISTS tap_crm_|CREATE INDEX IF NOT EXISTS tap_crm_|ALTER TABLE tap_crm_)/);
    assert.match(migration.down, /(DROP TABLE IF EXISTS tap_crm_|DROP INDEX IF EXISTS tap_crm_)/);
  }
});

test('applyTapCrmMigrations runs only pending migrations', async () => {
  const pool = createMockPool({ appliedRows: [] });
  const result = await applyTapCrmMigrations(pool);

  assert.equal(result.totalMigrations, TAP_CRM_MIGRATIONS.length);
  assert.equal(result.appliedCount, TAP_CRM_MIGRATIONS.length);
  assert.ok(pool.calls.some((call) => call.sql === 'BEGIN'));
  assert.ok(pool.calls.some((call) => call.sql.includes('INSERT INTO tap_crm_schema_migrations')));
});

test('verifyTapCrmSchema reports clean schema when all objects exist', async () => {
  const pool = createMockPool({
    tables: [
      'tap_crm_schema_migrations',
      'tap_crm_contacts',
      'tap_crm_tags',
      'tap_crm_contact_tags',
      'tap_crm_pipeline_items',
      'tap_crm_business_config',
      'tap_crm_tap_events',
      'tap_crm_bookings',
    ],
    indexes: [
      'tap_crm_contacts_tenant_stage_idx',
      'tap_crm_tags_tenant_key_idx',
      'tap_crm_contact_tags_tenant_contact_idx',
      'tap_crm_pipeline_items_tenant_stage_idx',
      'tap_crm_tags_tenant_tag_code_idx',
      'tap_crm_tags_tenant_label_idx',
      'tap_crm_tags_tag_code_idx',
      'tap_crm_tap_events_tenant_created_idx',
      'tap_crm_tap_events_tag_created_idx',
      'tap_crm_tap_events_tenant_event_type_idx',
      'tap_crm_bookings_tenant_date_idx',
      'tap_crm_bookings_tag_date_idx',
    ],
  });

  const report = await verifyTapCrmSchema(pool);

  assert.equal(report.ok, true);
  assert.deepEqual(report.missingTables, []);
  assert.deepEqual(report.missingIndexes, []);
});
