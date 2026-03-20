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

// 🔥 IMPORT SEED
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

  -- 🔥 QUESTIONS TABLE
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

  // 🔥 AUTO-SEED
  const result = await pool.query(`SELECT COUNT(*)::int AS count FROM questions`);
  const count = result.rows[0].count;

  if (count === 0) {
    console.log("🌱 Seeding questions...");
    await seed();
    console.log("✅ Questions seeded");
  } else {
    console.log(`✅ Questions exist (${count})`);
  }
}

module.exports = { pool, initializeDatabase };
