/* FILE: server/db.js
   New engine schema + safe bootstrapping migrations.

   Goal: Deploy never bricks because an old DB is missing a column/table.
   This file will:
   ✅ create tables if missing
   ✅ add missing columns if older DB exists
   ✅ keep schema aligned with server/index.js

   Exports ONLY: { pool, initializeDatabase }
*/
"use strict";

const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
      }
    : {
        host: process.env.PGHOST || "127.0.0.1",
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "garvey"
      }
);

async function initializeDatabase() {
  await pool.query(`
    /* =========================
       TENANTS + USERS
    ========================= */
    CREATE TABLE IF NOT EXISTS tenants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (tenant_id, email)
    );

    /* =========================
       BEHAVIOR TRACKING
    ========================= */
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points_awarded INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS actions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action_type TEXT NOT NULL,
      points_awarded INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS wishlist (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      media_type TEXT,
      points_awarded INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      points_awarded_each INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (tenant_id, referrer_user_id, referred_user_id)
    );

    /* =========================
       INTAKE (new engine)
    ========================= */
    CREATE TABLE IF NOT EXISTS intake_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'fast',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS intake_responses (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,   -- qid like "Q1"
      answer TEXT NOT NULL,        -- A/B/C/D
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
      primary_role TEXT NOT NULL DEFAULT '',
      secondary_role TEXT NOT NULL DEFAULT '',
      scores JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* =========================
       QUESTIONS (JSONB engine)
    ========================= */
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      qid TEXT UNIQUE,
      question TEXT NOT NULL DEFAULT '',
      options JSONB NOT NULL DEFAULT '{}'::jsonb,
      weights JSONB NOT NULL DEFAULT '{}'::jsonb,
      type TEXT NOT NULL DEFAULT 'fast',
      assessment_type TEXT,
      question_text TEXT,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      mapping_a JSONB,
      mapping_b JSONB,
      mapping_c JSONB,
      mapping_d JSONB
    );

    /* =========================
       TENANT CONFIG
    ========================= */


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
      archetype_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
      personality_counts JSONB,
      raw_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* =========================
       TENANT CONFIG
    ========================= */
    CREATE TABLE IF NOT EXISTS tenant_config (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* =========================
       VOC (optional tables)
    ========================= */
    CREATE TABLE IF NOT EXISTS voc_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS voc_responses (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES voc_sessions(id) ON DELETE CASCADE,
      question_id INTEGER NOT NULL,
      answer TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS voc_results (
      session_id INTEGER PRIMARY KEY REFERENCES voc_sessions(id) ON DELETE CASCADE,
      customer_profile TEXT NOT NULL,
      engagement_style TEXT NOT NULL,
      buying_trigger TEXT NOT NULL,
      friction_point TEXT NOT NULL,
      loyalty_driver TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* =========================
       SAFE MIGRATIONS (ADD MISSING COLS ONLY)
       (No type changes, no drops)
    ========================= */

    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug TEXT;
    ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE visits ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE visits ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE visits ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE visits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE actions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS action_type TEXT;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE actions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS product_name TEXT;
    ALTER TABLE wishlist ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS text TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS media_type TEXT;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referrer_user_id INTEGER;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_user_id INTEGER;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS points_awarded_each INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE referrals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'fast';
    ALTER TABLE intake_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE intake_responses ADD COLUMN IF NOT EXISTS session_id INTEGER;
    ALTER TABLE intake_responses ADD COLUMN IF NOT EXISTS question_id TEXT;
    ALTER TABLE intake_responses ADD COLUMN IF NOT EXISTS answer TEXT;
    ALTER TABLE intake_responses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE results ADD COLUMN IF NOT EXISTS session_id INTEGER;
    ALTER TABLE results ADD COLUMN IF NOT EXISTS primary_role TEXT NOT NULL DEFAULT '';
    ALTER TABLE results ADD COLUMN IF NOT EXISTS secondary_role TEXT NOT NULL DEFAULT '';
    ALTER TABLE results ADD COLUMN IF NOT EXISTS scores JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE questions ADD COLUMN IF NOT EXISTS qid TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS question TEXT NOT NULL DEFAULT '';
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS weights JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'fast';

    ALTER TABLE questions ADD COLUMN IF NOT EXISTS assessment_type TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_text TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_a TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_b TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_c TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_d TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_a JSONB;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_b JSONB;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_c JSONB;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS mapping_d JSONB;


    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS user_id INTEGER;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS session_id INTEGER;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS assessment_type TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS primary_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS secondary_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS weakness_archetype TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personality_primary TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personality_secondary TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personality_weakness TEXT;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS archetype_counts JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS personality_counts JSONB;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS raw_answers JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE assessment_submissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE tenant_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    /* =========================
       INDEXES
    ========================= */
    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_visits_tenant_created_at ON visits(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_actions_tenant_created_at ON actions(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_reviews_tenant_created_at ON reviews(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_referrals_tenant_created_at ON referrals(tenant_id, created_at);


    CREATE INDEX IF NOT EXISTS idx_assessment_submissions_tenant_created ON assessment_submissions(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_assessment_submissions_user ON assessment_submissions(tenant_id, user_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_qid_unique ON questions(qid);
    CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);

    CREATE INDEX IF NOT EXISTS idx_questions_assessment_type ON questions(assessment_type);

    CREATE INDEX IF NOT EXISTS idx_intake_responses_session_id ON intake_responses(session_id);
    CREATE INDEX IF NOT EXISTS idx_intake_responses_question_id ON intake_responses(question_id);

    CREATE INDEX IF NOT EXISTS idx_results_session_id ON results(session_id);
  `);
}

module.exports = { pool, initializeDatabase };
