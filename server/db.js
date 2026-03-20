const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

// 🔥 CREATE POOL
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

// 🔥 IMPORT SEED (SAFE — NO CIRCULAR DEP)
const { seed } = require("./seedQuestions");

// 🔥 INIT FUNCTION
async function initializeDatabase() {
console.log("🧠 Initializing database...");

// ✅ CREATE TABLES
await pool.query(`

```
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
  question_id TEXT,
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
```

`);

// 🔥 CHECK IF QUESTIONS EXIST
const result = await pool.query(
`SELECT COUNT(*)::int AS count FROM questions`
);

const count = result.rows[0].count;

// 🔥 AUTO-SEED (SAFE)
if (count === 0) {
console.log("🌱 No questions found → seeding now...");
await seed(pool); // ✅ CRITICAL FIX
console.log("✅ Questions seeded successfully");
} else {
console.log(`✅ Questions already exist (${count})`);
}
}

// 🔥 EXPORTS
module.exports = {
pool,
initializeDatabase
};
