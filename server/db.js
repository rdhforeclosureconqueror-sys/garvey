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

// 🔥 IMPORT SEED FUNCTION
const { seed } = require("./seedQuestions");

async function initializeDatabase() {
  console.log("🧠 Initializing database...");

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
    mode TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS intake_responses (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES intake_sessions(id) ON DELETE CASCADE,
    question_id INTEGER,
    answer TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
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

  CREATE TABLE IF NOT EXISTS results (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES intake_sessions(id) ON DELETE CASCADE,
    primary_role TEXT,
    secondary_role TEXT,
    scores JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- 🔥 QUESTIONS TABLE (JSON SYSTEM)
  CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    qid TEXT UNIQUE,
    question TEXT,
    options JSONB,
    weights JSONB,
    type TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_questions_qid ON questions(qid);

  `);

  // 🔥 AUTO-SEED LOGIC (CRITICAL FIX)
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM questions`);
  const count = result.rows[0].count;

  if (count === 0) {
    console.log("🌱 No questions found → seeding now...");
    await seed();
    console.log("✅ Questions seeded automatically");
  } else {
    console.log(`✅ Questions already exist (${count})`);
  }
}

module.exports = { pool, initializeDatabase };
