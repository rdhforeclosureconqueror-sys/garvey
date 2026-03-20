const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: connectionString.includes("localhost")
          ? false
          : { rejectUnauthorized: false }
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
    CREATE TABLE IF NOT EXISTS tenants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS intake_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      mode TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS intake_responses (
      id SERIAL PRIMARY KEY,
      session_id INTEGER REFERENCES intake_sessions(id) ON DELETE CASCADE,
      question_id INTEGER,
      answer TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      email TEXT,
      tenant TEXT,
      qid TEXT
    );

    CREATE TABLE IF NOT EXISTS intake_results (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
      primary_role TEXT NOT NULL,
      secondary_role TEXT NOT NULL,
      role_scores JSONB NOT NULL,
      recommendations JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- VOC SYSTEM (Phase 11)
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

    -- API RESULTS STORAGE (Phase 9–11)
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      email TEXT,
      tenant TEXT,
      primary_role TEXT,
      secondary_role TEXT,
      scores JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- QUESTIONS ENGINE
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      qid TEXT,
      question TEXT,
      option_a TEXT,
      option_b TEXT,
      option_c TEXT,
      option_d TEXT,
      architect INT DEFAULT 0,
      operator INT DEFAULT 0,
      steward INT DEFAULT 0,
      builder INT DEFAULT 0,
      connector INT DEFAULT 0,
      protector INT DEFAULT 0,
      nurturer INT DEFAULT 0,
      educator INT DEFAULT 0,
      resource_generator INT DEFAULT 0,
      type TEXT
    );

    -- TENANT CONFIG (HYBRID SAFE)
    CREATE TABLE IF NOT EXISTS tenant_config (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      generated_from_session_id INTEGER REFERENCES intake_sessions(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      tenant TEXT UNIQUE,
      reward_system BOOLEAN DEFAULT false,
      email_marketing BOOLEAN DEFAULT false,
      referral_system BOOLEAN DEFAULT false,
      analytics_engine BOOLEAN DEFAULT false,
      engagement_engine BOOLEAN DEFAULT false,
      content_engine BOOLEAN DEFAULT false,
      automation_blueprints BOOLEAN DEFAULT false
    );

    CREATE INDEX IF NOT EXISTS idx_actions_tenant_created_at ON actions(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_visits_tenant_created_at ON visits(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_reviews_tenant_created_at ON reviews(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_referrals_tenant_created_at ON referrals(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_questions_qid ON questions(qid);
  `);
}

module.exports = { pool, initializeDatabase };