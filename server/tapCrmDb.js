"use strict";

const TAP_CRM_MIGRATIONS = Object.freeze([
  {
    id: "tap_crm_001_init",
    description: "Create isolated Tap CRM core tables and indexes",
    up: `
      CREATE TABLE IF NOT EXISTS tap_crm_contacts (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        external_ref TEXT NOT NULL DEFAULT '',
        first_name TEXT NOT NULL DEFAULT '',
        last_name TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        lifecycle_stage TEXT NOT NULL DEFAULT 'lead',
        attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, email)
      );

      CREATE TABLE IF NOT EXISTS tap_crm_tags (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        label TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, key)
      );

      CREATE TABLE IF NOT EXISTS tap_crm_contact_tags (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        contact_id BIGINT NOT NULL REFERENCES tap_crm_contacts(id) ON DELETE CASCADE,
        tag_id BIGINT NOT NULL REFERENCES tap_crm_tags(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (tenant_id, contact_id, tag_id)
      );

      CREATE TABLE IF NOT EXISTS tap_crm_pipeline_items (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        contact_id BIGINT NOT NULL REFERENCES tap_crm_contacts(id) ON DELETE CASCADE,
        stage TEXT NOT NULL DEFAULT 'new',
        value_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'USD',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS tap_crm_contacts_tenant_stage_idx
        ON tap_crm_contacts(tenant_id, lifecycle_stage, created_at DESC);
      CREATE INDEX IF NOT EXISTS tap_crm_tags_tenant_key_idx
        ON tap_crm_tags(tenant_id, key);
      CREATE INDEX IF NOT EXISTS tap_crm_contact_tags_tenant_contact_idx
        ON tap_crm_contact_tags(tenant_id, contact_id);
      CREATE INDEX IF NOT EXISTS tap_crm_pipeline_items_tenant_stage_idx
        ON tap_crm_pipeline_items(tenant_id, stage, created_at DESC);
    `,
    down: `
      DROP TABLE IF EXISTS tap_crm_pipeline_items;
      DROP TABLE IF EXISTS tap_crm_contact_tags;
      DROP TABLE IF EXISTS tap_crm_tags;
      DROP TABLE IF EXISTS tap_crm_contacts;
    `,
  },
  {
    id: "tap_crm_002_public_tap_resolution",
    description: "Add tag status + business config + tap event logging for public route resolution",
    up: `
      CREATE TABLE IF NOT EXISTS tap_crm_business_config (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        hub_status TEXT NOT NULL DEFAULT 'active',
        disabled_reason TEXT NOT NULL DEFAULT '',
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tap_crm_tap_events (
        id BIGSERIAL PRIMARY KEY,
        tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
        tag_id BIGINT REFERENCES tap_crm_tags(id) ON DELETE SET NULL,
        tag_code TEXT NOT NULL DEFAULT '',
        outcome TEXT NOT NULL DEFAULT 'rejected',
        reason TEXT NOT NULL DEFAULT '',
        request_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE tap_crm_tags ADD COLUMN IF NOT EXISTS tag_code TEXT;
      ALTER TABLE tap_crm_tags ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
      ALTER TABLE tap_crm_tags ADD COLUMN IF NOT EXISTS destination_path TEXT NOT NULL DEFAULT '/tap-crm';
      ALTER TABLE tap_crm_tags ADD COLUMN IF NOT EXISTS last_tap_at TIMESTAMPTZ;
      ALTER TABLE tap_crm_tags ADD COLUMN IF NOT EXISTS disabled_reason TEXT NOT NULL DEFAULT '';

      UPDATE tap_crm_tags
      SET tag_code = COALESCE(NULLIF(tag_code, ''), key)
      WHERE tag_code IS NULL OR tag_code = '';

      ALTER TABLE tap_crm_tags ALTER COLUMN tag_code SET NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS tap_crm_tags_tenant_tag_code_idx
        ON tap_crm_tags(tenant_id, tag_code);
      CREATE INDEX IF NOT EXISTS tap_crm_tags_tag_code_idx
        ON tap_crm_tags(LOWER(tag_code));
      CREATE INDEX IF NOT EXISTS tap_crm_tap_events_tenant_created_idx
        ON tap_crm_tap_events(tenant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS tap_crm_tap_events_tag_created_idx
        ON tap_crm_tap_events(tag_code, created_at DESC);
    `,
    down: `
      DROP TABLE IF EXISTS tap_crm_tap_events;
      DROP TABLE IF EXISTS tap_crm_business_config;

      DROP INDEX IF EXISTS tap_crm_tags_tenant_tag_code_idx;
      DROP INDEX IF EXISTS tap_crm_tags_tag_code_idx;

      ALTER TABLE tap_crm_tags DROP COLUMN IF EXISTS tag_code;
      ALTER TABLE tap_crm_tags DROP COLUMN IF EXISTS status;
      ALTER TABLE tap_crm_tags DROP COLUMN IF EXISTS destination_path;
      ALTER TABLE tap_crm_tags DROP COLUMN IF EXISTS last_tap_at;
      ALTER TABLE tap_crm_tags DROP COLUMN IF EXISTS disabled_reason;
    `,
  },
  {
    id: "tap_crm_003_tag_label_uniqueness",
    description: "Enforce one label per tenant to improve operator conflict recovery",
    up: `
      CREATE UNIQUE INDEX IF NOT EXISTS tap_crm_tags_tenant_label_idx
        ON tap_crm_tags(tenant_id, LOWER(label));
    `,
    down: `
      DROP INDEX IF EXISTS tap_crm_tags_tenant_label_idx;
    `,
  },
]);

async function ensureTapCrmMigrationTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tap_crm_schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      migration_id TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function applyTapCrmMigrations(pool) {
  await ensureTapCrmMigrationTable(pool);

  const applied = await pool.query("SELECT migration_id FROM tap_crm_schema_migrations");
  const appliedSet = new Set(applied.rows.map((row) => String(row.migration_id || "")));

  for (const migration of TAP_CRM_MIGRATIONS) {
    if (appliedSet.has(migration.id)) {
      continue;
    }

    await pool.query("BEGIN");
    try {
      await pool.query(migration.up);
      await pool.query(
        `
          INSERT INTO tap_crm_schema_migrations (migration_id, description)
          VALUES ($1, $2)
        `,
        [migration.id, migration.description]
      );
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      err.message = `tap_crm migration failed (${migration.id}): ${err.message}`;
      throw err;
    }
  }

  return {
    appliedCount: TAP_CRM_MIGRATIONS.length - appliedSet.size,
    totalMigrations: TAP_CRM_MIGRATIONS.length,
  };
}

async function verifyTapCrmSchema(pool) {
  const requiredTables = [
    "tap_crm_schema_migrations",
    "tap_crm_contacts",
    "tap_crm_tags",
    "tap_crm_contact_tags",
    "tap_crm_pipeline_items",
    "tap_crm_business_config",
    "tap_crm_tap_events",
  ];

  const requiredIndexes = [
    "tap_crm_contacts_tenant_stage_idx",
    "tap_crm_tags_tenant_key_idx",
    "tap_crm_contact_tags_tenant_contact_idx",
    "tap_crm_pipeline_items_tenant_stage_idx",
    "tap_crm_tags_tenant_tag_code_idx",
    "tap_crm_tags_tenant_label_idx",
    "tap_crm_tags_tag_code_idx",
    "tap_crm_tap_events_tenant_created_idx",
    "tap_crm_tap_events_tag_created_idx",
  ];

  const tableResult = await pool.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])
    `,
    [requiredTables]
  );

  const indexResult = await pool.query(
    `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = ANY($1::text[])
    `,
    [requiredIndexes]
  );

  const seenTables = new Set(tableResult.rows.map((row) => row.table_name));
  const seenIndexes = new Set(indexResult.rows.map((row) => row.indexname));

  const missingTables = requiredTables.filter((tableName) => !seenTables.has(tableName));
  const missingIndexes = requiredIndexes.filter((indexName) => !seenIndexes.has(indexName));

  return {
    ok: missingTables.length === 0 && missingIndexes.length === 0,
    missingTables,
    missingIndexes,
    expected: {
      tables: requiredTables,
      indexes: requiredIndexes,
    },
  };
}

module.exports = {
  TAP_CRM_MIGRATIONS,
  applyTapCrmMigrations,
  verifyTapCrmSchema,
};
