import pg from 'pg';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { applyTapCrmMigrations, verifyTapCrmSchema, TAP_CRM_MIGRATIONS } = require('../server/tapCrmDb');

const { Pool } = pg;
const adminConfig = {
  host: process.env.PGHOST || '127.0.0.1',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGADMIN_DB || 'postgres',
};
const verifyDbName = process.env.TAP_CRM_VERIFY_DB || 'tapcrm_phase2_verify';

const requiredTables = [
  'tap_crm_schema_migrations',
  'tap_crm_contacts',
  'tap_crm_tags',
  'tap_crm_contact_tags',
  'tap_crm_pipeline_items',
  'tap_crm_business_config',
  'tap_crm_tap_events',
];
const requiredIndexes = [
  'tap_crm_contacts_tenant_stage_idx',
  'tap_crm_tags_tenant_key_idx',
  'tap_crm_contact_tags_tenant_contact_idx',
  'tap_crm_pipeline_items_tenant_stage_idx',
  'tap_crm_tags_tenant_tag_code_idx',
  'tap_crm_tags_tag_code_idx',
  'tap_crm_tap_events_tenant_created_idx',
  'tap_crm_tap_events_tag_created_idx',
];

async function listTables(pool) {
  const r = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[]) ORDER BY table_name ASC`,
    [requiredTables]
  );
  return r.rows.map((x) => x.table_name);
}

async function listIndexes(pool) {
  const r = await pool.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname = ANY($1::text[]) ORDER BY indexname ASC`,
    [requiredIndexes]
  );
  return r.rows.map((x) => x.indexname);
}

async function main() {
  const adminPool = new Pool(adminConfig);
  let verifyPool;

  try {
    await adminPool.query(`DROP DATABASE IF EXISTS ${verifyDbName}`);
    await adminPool.query(`CREATE DATABASE ${verifyDbName}`);

    verifyPool = new Pool({ ...adminConfig, database: verifyDbName });

    // Minimal dependency for foreign keys in Tap CRM schema.
    await verifyPool.query(`
      CREATE TABLE tenants (
        id BIGSERIAL PRIMARY KEY,
        slug TEXT UNIQUE
      );
      INSERT INTO tenants (slug) VALUES ('demo-runtime');
    `);

    const upResult = await applyTapCrmMigrations(verifyPool);
    const tablesAfterUp = await listTables(verifyPool);
    const indexesAfterUp = await listIndexes(verifyPool);
    const migrationRowsAfterUp = await verifyPool.query(
      `SELECT migration_id FROM tap_crm_schema_migrations ORDER BY migration_id ASC`
    );

    const verifyAfterUp = await verifyTapCrmSchema(verifyPool);

    const downSql = TAP_CRM_MIGRATIONS.find((m) => m.id === 'tap_crm_001_init').down;
    await verifyPool.query('BEGIN');
    await verifyPool.query(`DELETE FROM tap_crm_schema_migrations WHERE migration_id = 'tap_crm_001_init'`);
    await verifyPool.query(downSql);
    await verifyPool.query('COMMIT');

    await verifyPool.query('DROP TABLE IF EXISTS tap_crm_schema_migrations');

    const tablesAfterDown = await listTables(verifyPool);
    const indexesAfterDown = await listIndexes(verifyPool);
    const migrationTableAfterDown = await verifyPool.query(
      `SELECT to_regclass('public.tap_crm_schema_migrations') AS table_name`
    );

    const upAgainResult = await applyTapCrmMigrations(verifyPool);
    const tablesAfterReUp = await listTables(verifyPool);
    const indexesAfterReUp = await listIndexes(verifyPool);
    const migrationRowsAfterReUp = await verifyPool.query(
      `SELECT migration_id FROM tap_crm_schema_migrations ORDER BY migration_id ASC`
    );
    const verifyAfterReUp = await verifyTapCrmSchema(verifyPool);

    const report = {
      database: verifyDbName,
      step1_up_execution: {
        migrationResult: upResult,
        tablesAfterUp,
        indexesAfterUp,
        migrationRowsAfterUp: migrationRowsAfterUp.rows.map((r) => r.migration_id),
      },
      step2_schema_verify_after_up: verifyAfterUp,
      step3_down_execution: {
        tablesAfterDown,
        indexesAfterDown,
        migrationTablePresentAfterDown: migrationTableAfterDown.rows[0]?.table_name !== null,
      },
      step4_reup_after_down: {
        migrationResult: upAgainResult,
        tablesAfterReUp,
        indexesAfterReUp,
        migrationRowsAfterReUp: migrationRowsAfterReUp.rows.map((r) => r.migration_id),
        verifyAfterReUp,
      },
    };

    console.log(JSON.stringify(report, null, 2));
  } finally {
    await verifyPool?.end().catch(() => {});
    await adminPool.query(`DROP DATABASE IF EXISTS ${verifyDbName}`).catch(() => {});
    await adminPool.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
