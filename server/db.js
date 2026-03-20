/* FILE: server/db.js
   NEW-only schema, but deployment-safe (idempotent).
   - Creates tables if missing
   - Adds missing columns if table already exists
   - Fixes column types if old DB differs (e.g., question_id int -> text)
   - Adds FK constraints + indexes if missing

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
       BASE TABLES
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
      points_awarded INTEGER NOT NULL,
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
       NEW INTAKE PIPELINE
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
      question_id TEXT NOT NULL,  -- qid like "Q1"
      answer TEXT NOT NULL,       -- "A" | "B" | "C" | "D"
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
      primary_role TEXT NOT NULL,
      secondary_role TEXT NOT NULL,
      scores JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* =========================
       QUESTIONS (JSONB engine)
    ========================= */

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      qid TEXT UNIQUE,
      question TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '{}'::jsonb,
      weights JSONB NOT NULL DEFAULT '{}'::jsonb,
      type TEXT NOT NULL
    );

    /* =========================
       TENANT CONFIG (new-only)
    ========================= */

    CREATE TABLE IF NOT EXISTS tenant_config (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    /* =========================
       MIGRATIONS / COMPATIBILITY
       (Only to satisfy NEW server contract)
    ========================= */

    -- Ensure required columns exist (fixes: "column session_id does not exist")
    ALTER TABLE IF EXISTS results ADD COLUMN IF NOT EXISTS session_id INTEGER;
    ALTER TABLE IF EXISTS results ADD COLUMN IF NOT EXISTS primary_role TEXT;
    ALTER TABLE IF EXISTS results ADD COLUMN IF NOT EXISTS secondary_role TEXT;
    ALTER TABLE IF EXISTS results ADD COLUMN IF NOT EXISTS scores JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE IF EXISTS results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE IF EXISTS intake_sessions ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE IF EXISTS intake_sessions ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE IF EXISTS intake_sessions ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'fast';
    ALTER TABLE IF EXISTS intake_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE IF EXISTS intake_responses ADD COLUMN IF NOT EXISTS session_id INTEGER;
    ALTER TABLE IF EXISTS intake_responses ADD COLUMN IF NOT EXISTS question_id TEXT;
    ALTER TABLE IF EXISTS intake_responses ADD COLUMN IF NOT EXISTS answer TEXT;
    ALTER TABLE IF EXISTS intake_responses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS qid TEXT;
    ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS question TEXT;
    ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS weights JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE IF EXISTS questions ADD COLUMN IF NOT EXISTS type TEXT;

    ALTER TABLE IF EXISTS tenant_config ADD COLUMN IF NOT EXISTS tenant_id INTEGER;
    ALTER TABLE IF EXISTS tenant_config ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE IF EXISTS tenant_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    /* =========================
       TYPE FIXES (safe)
    ========================= */

    -- If an older DB had intake_responses.question_id as INTEGER, migrate it to TEXT.
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='intake_responses'
          AND column_name='question_id'
          AND data_type <> 'text'
      ) THEN
        EXECUTE 'ALTER TABLE intake_responses ALTER COLUMN question_id TYPE TEXT USING question_id::text';
      END IF;
    END $$;

    /* =========================
       FK CONSTRAINTS (add if missing)
    ========================= */

    -- results.session_id -> intake_sessions.id
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'results_session_id_fkey'
      ) THEN
        BEGIN
          EXECUTE 'ALTER TABLE results
                   ADD CONSTRAINT results_session_id_fkey
                   FOREIGN KEY (session_id) REFERENCES intake_sessions(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN
          -- ignore if created concurrently
        END;
      END IF;
    END $$;

    -- intake_responses.session_id -> intake_sessions.id
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'intake_responses_session_id_fkey'
      ) THEN
        BEGIN
          EXECUTE 'ALTER TABLE intake_responses
                   ADD CONSTRAINT intake_responses_session_id_fkey
                   FOREIGN KEY (session_id) REFERENCES intake_sessions(id) ON DELETE CASCADE';
        EXCEPTION WHEN duplicate_object THEN
        END;
      END IF;
    END $$;

    /* =========================
       INDEXES
    ========================= */

    CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_qid_unique ON questions(qid);
    CREATE INDEX IF NOT EXISTS idx_questions_qid ON questions(qid);

    CREATE INDEX IF NOT EXISTS idx_intake_sessions_tenant_id ON intake_sessions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_intake_responses_session_id ON intake_responses(session_id);
    CREATE INDEX IF NOT EXISTS idx_intake_responses_question_id ON intake_responses(question_id);

    CREATE INDEX IF NOT EXISTS idx_results_session_id ON results(session_id);

    CREATE INDEX IF NOT EXISTS idx_actions_tenant_created_at ON actions(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_visits_tenant_created_at ON visits(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_reviews_tenant_created_at ON reviews(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_referrals_tenant_created_at ON referrals(tenant_id, created_at);
  `);
}

module.exports = { pool, initializeDatabase };
