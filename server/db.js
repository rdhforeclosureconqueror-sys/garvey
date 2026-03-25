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
  `);

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
      action TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      review TEXT
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      referral TEXT
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER,
      item TEXT
    );
  `);

  // ==================================================
  // VOC SYSTEM
  // ==================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS voc_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER
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
