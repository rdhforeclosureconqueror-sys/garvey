"use strict";

const { Pool } = require("pg");

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
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS campaign_id INTEGER;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS campaign_slug TEXT;
  `);

  // ==================================================
  // KANBAN SYSTEM
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS kanban_boards (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS kanban_columns (
      id SERIAL PRIMARY KEY,
      board_id INTEGER,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS kanban_cards (
      id SERIAL PRIMARY KEY,
      column_id INTEGER,
      content TEXT
    );

    CREATE TABLE IF NOT EXISTS kanban_card_events (
      id SERIAL PRIMARY KEY,
      card_id INTEGER,
      event TEXT
    );
  `);

  console.log("✅ Database ready");
}

module.exports = {
  pool,
  initializeDatabase,
};
