"use strict";

const { Pool } = require("pg");
const { initializeKanbanSchema } = require("./kanbanDb");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: connectionString.includes("localhost")
          ? false
          : { rejectUnauthorized: false },
      }
    : {
        host: process.env.PGHOST || "127.0.0.1",
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "garvey",
      }
);

async function initializeDatabase() {
  console.log("🧠 Initializing database...");

  // ==================================================
  // CORE TABLES
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT,
      tenant_id INTEGER REFERENCES tenants(id),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tenant_config (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      config JSONB DEFAULT '{}'::jsonb
    );

    CREATE TABLE IF NOT EXISTS tenant_sites (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      html TEXT
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      label TEXT NOT NULL,
      source TEXT,
      medium TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (tenant_id, slug)
    );

    CREATE TABLE IF NOT EXISTS campaign_events (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      customer_email TEXT,
      customer_name TEXT,
      meta JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
  `).catch(() => {});
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email_unique ON users(tenant_id, email);`);

  // ==================================================
  // QUESTIONS TABLE (PHASE 2 CORE)
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      qid TEXT UNIQUE,

      -- LEGACY SUPPORT
      question TEXT,
      options JSONB DEFAULT '{}'::jsonb,
      weights JSONB DEFAULT '{}'::jsonb,
      type TEXT,

      -- NEW SYSTEM (PHASE 2)
      assessment_type TEXT,
      question_text TEXT,

      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,

      mapping_a JSONB DEFAULT '{}'::jsonb,
      mapping_b JSONB DEFAULT '{}'::jsonb,
      mapping_c JSONB DEFAULT '{}'::jsonb,
      mapping_d JSONB DEFAULT '{}'::jsonb
    );
  `);

  // ==================================================
  // SAFE MIGRATIONS (NO BREAKING CHANGES)
  // ==================================================

  await pool.query(`
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS assessment_type TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_text TEXT;

    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_a TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_b TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_c TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_d TEXT;

    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_a JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_b JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_c JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_d JSONB DEFAULT '{}'::jsonb;
  `);

  // ==================================================
  // INDEXES (PERFORMANCE)
  // ==================================================

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_questions_qid ON questions(qid);
    CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
    CREATE INDEX IF NOT EXISTS idx_questions_assessment ON questions(assessment_type);
  `);

  // ==================================================
  // INTAKE + RESULTS
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS intake_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      email TEXT,
      name TEXT,
      mode TEXT,
      campaign_id INTEGER,
      campaign_slug TEXT,
      source TEXT,
      medium TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS intake_responses (
      id SERIAL PRIMARY KEY,
      session_id INTEGER,
      question_id INTEGER,
      answer TEXT
    );

    CREATE TABLE IF NOT EXISTS intake_results (
      id SERIAL PRIMARY KEY,
      session_id INTEGER,
      results JSONB
    );

    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      data JSONB
    );
  `);

  // ==================================================
  // ACTION SYSTEM
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS actions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      user_id INTEGER,
      action_type TEXT,
      points_awarded INTEGER DEFAULT 0,
      campaign_id INTEGER,
      campaign_slug TEXT,
      action TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      user_id INTEGER,
      text TEXT,
      media_type TEXT,
      media_note TEXT,
      points_awarded INTEGER DEFAULT 0,
      campaign_id INTEGER,
      campaign_slug TEXT,
      review TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      referrer_user_id INTEGER,
      referred_user_id INTEGER,
      points_awarded_each INTEGER DEFAULT 0,
      campaign_id INTEGER,
      campaign_slug TEXT,
      referral TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (tenant_id, referrer_user_id, referred_user_id)
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      user_id INTEGER,
      product_name TEXT,
      campaign_id INTEGER,
      campaign_slug TEXT,
      item TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE visits ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE visits ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;
    ALTER TABLE visits ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE visits ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS action_type TEXT;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS text TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_type TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_note TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_user_id INTEGER;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_user_id INTEGER;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS points_awarded_each INTEGER DEFAULT 0;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS product_name TEXT;
    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS mode TEXT;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS medium TEXT;
  `);

  // ==================================================
  // VOC SYSTEM
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS voc_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      email TEXT,
      name TEXT,
      campaign_id INTEGER,
      campaign_slug TEXT,
      source TEXT,
      medium TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS voc_responses (
      id SERIAL PRIMARY KEY,
      session_id INTEGER,
      data JSONB
    );

    CREATE TABLE IF NOT EXISTS voc_results (
      id SERIAL PRIMARY KEY,
      session_id INTEGER,
      results JSONB
    );
  `);

  await pool.query(`
    ALTER TABLE voc_sessions ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE voc_sessions ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE voc_sessions ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE voc_sessions ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE voc_sessions ADD COLUMN IF NOT EXISTS source TEXT;
    ALTER TABLE voc_sessions ADD COLUMN IF NOT EXISTS medium TEXT;
    ALTER TABLE voc_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessment_submissions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      session_id INTEGER,
      assessment_type TEXT NOT NULL,
      primary_archetype TEXT,
      secondary_archetype TEXT,
      weakness_archetype TEXT,
      personality_primary TEXT,
      personality_secondary TEXT,
      personality_weakness TEXT,
      archetype_counts JSONB DEFAULT '{}'::jsonb,
      personality_counts JSONB DEFAULT '{}'::jsonb,
      raw_answers JSONB DEFAULT '[]'::jsonb,
      campaign_id INTEGER,
      campaign_slug TEXT,
      customer_name TEXT,
      customer_email TEXT,
      buyer_primary_archetype TEXT,
      buyer_secondary_archetype TEXT,
      buyer_weakness_archetype TEXT,
      buyer_counts JSONB DEFAULT '{}'::jsonb,
      personal_primary_archetype TEXT,
      personal_secondary_archetype TEXT,
      personal_weakness_archetype TEXT,
      personal_counts JSONB DEFAULT '{}'::jsonb,
      cid TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS customer_name TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS customer_email TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS buyer_primary_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS buyer_secondary_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS buyer_weakness_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS buyer_counts JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personal_primary_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personal_secondary_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personal_weakness_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personal_counts JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS cid TEXT;
  `);

  // ==================================================
  // KANBAN SYSTEM (CANONICAL + SAFE UPGRADE)
  // ==================================================

  // Canonical schema for fresh installs.
  await initializeKanbanSchema(pool);

  // Safe upgrades for existing lightweight tables.
  await pool.query(`
    ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS board_key TEXT;
    ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS name TEXT;
    ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE kanban_boards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE kanban_columns ADD COLUMN IF NOT EXISTS phase TEXT;
    ALTER TABLE kanban_columns ADD COLUMN IF NOT EXISTS position INT;
    ALTER TABLE kanban_columns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE kanban_columns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS board_id BIGINT;
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS phase TEXT;
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS content TEXT;
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS title TEXT;
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS due_date DATE;
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS position INT DEFAULT 0;
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system';
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT '';
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE kanban_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS tenant_id BIGINT;
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS board_id BIGINT;
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS event TEXT;
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS actor TEXT DEFAULT 'system';
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS event_type TEXT;
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS from_column_id BIGINT;
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS to_column_id BIGINT;
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE kanban_card_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);

  await pool.query(`
    WITH first_tenant AS (
      SELECT id FROM tenants ORDER BY id ASC LIMIT 1
    )
    UPDATE kanban_boards b
    SET tenant_id = first_tenant.id
    FROM first_tenant
    WHERE b.tenant_id IS NULL;

    UPDATE kanban_boards
    SET
      board_key = COALESCE(NULLIF(TRIM(board_key), ''), 'garvey'),
      name = COALESCE(NULLIF(TRIM(name), ''), 'GARVEY Board'),
      created_at = COALESCE(created_at, NOW()),
      updated_at = COALESCE(updated_at, NOW());

    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY tenant_id, COALESCE(NULLIF(TRIM(board_key), ''), 'garvey')
          ORDER BY id ASC
        ) AS rn
      FROM kanban_boards
      WHERE tenant_id IS NOT NULL
    )
    UPDATE kanban_boards b
    SET board_key = CONCAT(COALESCE(NULLIF(TRIM(b.board_key), ''), 'garvey'), '-', b.id)
    FROM ranked r
    WHERE b.id = r.id AND r.rn > 1;

    UPDATE kanban_columns c
    SET
      phase = COALESCE(NULLIF(TRIM(c.phase), ''), 'G'),
      position = COALESCE(c.position, c.id::int),
      created_at = COALESCE(c.created_at, NOW()),
      updated_at = COALESCE(c.updated_at, NOW());

    UPDATE kanban_cards k
    SET
      board_id = COALESCE(k.board_id, c.board_id),
      phase = COALESCE(NULLIF(TRIM(k.phase), ''), c.phase, 'G'),
      title = COALESCE(NULLIF(TRIM(k.title), ''), NULLIF(TRIM(k.content), ''), 'Card #' || k.id),
      description = COALESCE(k.description, ''),
      priority = COALESCE(NULLIF(TRIM(k.priority), ''), 'normal'),
      position = COALESCE(k.position, k.id::int),
      status = COALESCE(NULLIF(TRIM(k.status), ''), 'open'),
      created_by = COALESCE(NULLIF(TRIM(k.created_by), ''), 'system'),
      assigned_to = COALESCE(k.assigned_to, ''),
      created_at = COALESCE(k.created_at, NOW()),
      updated_at = COALESCE(k.updated_at, NOW())
    FROM kanban_columns c
    WHERE c.id = k.column_id;

    UPDATE kanban_cards
    SET
      phase = COALESCE(NULLIF(TRIM(phase), ''), 'G'),
      title = COALESCE(NULLIF(TRIM(title), ''), 'Card #' || id),
      description = COALESCE(description, ''),
      priority = COALESCE(NULLIF(TRIM(priority), ''), 'normal'),
      position = COALESCE(position, id::int),
      status = COALESCE(NULLIF(TRIM(status), ''), 'open'),
      created_by = COALESCE(NULLIF(TRIM(created_by), ''), 'system'),
      assigned_to = COALESCE(assigned_to, ''),
      created_at = COALESCE(created_at, NOW()),
      updated_at = COALESCE(updated_at, NOW());

    UPDATE kanban_card_events e
    SET
      board_id = COALESCE(e.board_id, c.board_id),
      tenant_id = COALESCE(e.tenant_id, b.tenant_id),
      event_type = COALESCE(NULLIF(TRIM(e.event_type), ''), NULLIF(TRIM(e.event), ''), 'migrated'),
      actor = COALESCE(NULLIF(TRIM(e.actor), ''), 'system'),
      payload = COALESCE(e.payload, '{}'::jsonb),
      created_at = COALESCE(e.created_at, NOW())
    FROM kanban_cards c
    JOIN kanban_boards b ON b.id = c.board_id
    WHERE c.id = e.card_id;

    UPDATE kanban_card_events
    SET
      event_type = COALESCE(NULLIF(TRIM(event_type), ''), 'migrated'),
      actor = COALESCE(NULLIF(TRIM(actor), ''), 'system'),
      payload = COALESCE(payload, '{}'::jsonb),
      created_at = COALESCE(created_at, NOW());
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS kanban_boards_tenant_board_key_uq
      ON kanban_boards(tenant_id, board_key)
      WHERE tenant_id IS NOT NULL AND board_key IS NOT NULL;
    CREATE INDEX IF NOT EXISTS kanban_boards_tenant_idx ON kanban_boards(tenant_id);
    CREATE INDEX IF NOT EXISTS kanban_columns_board_phase_idx ON kanban_columns(board_id, phase, position);
    CREATE INDEX IF NOT EXISTS kanban_cards_board_phase_idx ON kanban_cards(board_id, phase, column_id, position);
    CREATE INDEX IF NOT EXISTS kanban_events_tenant_board_idx ON kanban_card_events(tenant_id, board_id, created_at DESC);
  `);

  // ==================================================
  // STRUCTURE SYSTEM (PHASE 2)
  // ==================================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS structure_cards (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
      kanban_card_id BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
      card_type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      column_name TEXT NOT NULL DEFAULT 'Needed',
      status TEXT NOT NULL DEFAULT 'Needed',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, card_type)
    );

    CREATE TABLE IF NOT EXISTS structure_roles (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      role_name TEXT NOT NULL,
      owner_name TEXT,
      owner_email TEXT,
      backup_name TEXT,
      backup_email TEXT,
      responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
      decision_rights INT NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, role_name)
    );

    CREATE TABLE IF NOT EXISTS structure_operator_assignments (
      id BIGSERIAL PRIMARY KEY,
      tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
      operator_name TEXT,
      operator_email TEXT,
      mode TEXT NOT NULL DEFAULT 'manual',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS structure_cards_tenant_idx ON structure_cards(tenant_id, card_type);
    CREATE INDEX IF NOT EXISTS structure_roles_tenant_idx ON structure_roles(tenant_id, role_name);
    CREATE INDEX IF NOT EXISTS structure_operator_tenant_idx ON structure_operator_assignments(tenant_id);
  `);

  console.log("✅ Database ready");
}

module.exports = {
  pool,
  initializeDatabase,
};
