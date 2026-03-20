// ==============================
// FILE: server/db.js
// ==============================
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

    -- NEW-ONLY intake pipeline
    CREATE TABLE IF NOT EXISTS intake_sessions (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'fast',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- NEW-ONLY: question_id stores qid (TEXT like "Q1")
    CREATE TABLE IF NOT EXISTS intake_responses (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES intake_sessions(id) ON DELETE CASCADE,
      question_id TEXT NOT NULL,
      answer TEXT NOT NULL,
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

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      qid TEXT UNIQUE,
      question TEXT NOT NULL,
      options JSONB NOT NULL DEFAULT '{}'::jsonb,
      weights JSONB NOT NULL DEFAULT '{}'::jsonb,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_config (
      id SERIAL PRIMARY KEY,
      tenant_id INTEGER UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
    CREATE INDEX IF NOT EXISTS idx_questions_qid ON questions(qid);
    CREATE INDEX IF NOT EXISTS idx_intake_responses_session ON intake_responses(session_id);
    CREATE INDEX IF NOT EXISTS idx_results_session ON results(session_id);
    CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON users(tenant_id, email);
  `);
}

module.exports = { pool, initializeDatabase };


// ==============================
// FILE: server/seedQuestions.js
// ==============================
"use strict";

const ROLES = [
  "architect",
  "operator",
  "steward",
  "builder",
  "connector",
  "protector",
  "nurturer",
  "educator",
  "resource_generator"
];

function emptyRoleWeights() {
  const w = {};
  for (const r of ROLES) w[r] = 0;
  return w;
}

function optionWeights(i) {
  // Deterministic but varied option-based weights
  const A = emptyRoleWeights();
  const B = emptyRoleWeights();
  const C = emptyRoleWeights();
  const D = emptyRoleWeights();

  A[ROLES[i % ROLES.length]] = 2;
  A[ROLES[(i + 2) % ROLES.length]] = 1;

  B[ROLES[(i + 1) % ROLES.length]] = 2;
  B[ROLES[(i + 4) % ROLES.length]] = 1;

  C[ROLES[(i + 3) % ROLES.length]] = 2;
  C[ROLES[(i + 6) % ROLES.length]] = 1;

  D[ROLES[(i + 5) % ROLES.length]] = 2;
  D[ROLES[(i + 7) % ROLES.length]] = 1;

  return { A, B, C, D };
}

function buildOptions(i) {
  return {
    A: `Option A for Question ${i}`,
    B: `Option B for Question ${i}`,
    C: `Option C for Question ${i}`,
    D: `Option D for Question ${i}`
  };
}

async function seed(pool) {
  const existing = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
  if ((existing.rows[0]?.count || 0) > 0) {
    console.log("Questions already exist");
    return existing.rows[0].count;
  }

  console.log("Seeding questions...");

  for (let i = 1; i <= 60; i += 1) {
    const qid = `Q${i}`;
    const type = i <= 25 ? "fast" : "full";

    await pool.query(
      `INSERT INTO questions (qid, question, options, weights, type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (qid) DO NOTHING`,
      [qid, `Question ${i}`, buildOptions(i), optionWeights(i), type]
    );
  }

  return 60;
}

module.exports = { seed };


// ==============================
// FILE: server/scoringEngine.js
// ==============================
"use strict";

const roles = [
  "architect",
  "operator",
  "steward",
  "builder",
  "connector",
  "protector",
  "nurturer",
  "educator",
  "resource_generator"
];

function emptyScores() {
  const s = {};
  for (const r of roles) s[r] = 0;
  return s;
}

function isObj(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function scoreAnswers(answers = [], questions = []) {
  const scores = emptyScores();
  const map = new Map(questions.map((q) => [q.qid, q]));

  for (const { qid, answer } of answers) {
    const q = map.get(qid);
    if (!q) continue;

    const opt = String(answer || "").toUpperCase();
    const weights = q.weights?.[opt];

    if (!isObj(weights)) continue;

    for (const r of roles) {
      const n = Number(weights[r] || 0);
      scores[r] += Number.isFinite(n) ? n : 0;
    }
  }

  return scores;
}

function getTopRoles(scores) {
  const entries = Object.entries(scores || {});
  entries.sort((a, b) => {
    const diff = Number(b[1] || 0) - Number(a[1] || 0);
    if (diff !== 0) return diff;
    return String(a[0]).localeCompare(String(b[0]));
  });

  return {
    primary_role: entries[0]?.[0] || null,
    secondary_role: entries[1]?.[0] || null
  };
}

module.exports = { roles, scoreAnswers, getTopRoles };


// ==============================
// FILE: server/index.js
// ==============================
"use strict";

const express = require("express");
const path = require("path");

const { pool, initializeDatabase } = require("./db");
const { ensureTenant, getTenantBySlug } = require("./tenant");
const { runAdaptiveCycle } = require("./adaptiveEngine");
const { seed } = require("./seedQuestions");
const { scoreAnswers, getTopRoles } = require("./scoringEngine");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  return next();
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));

/* =========================
   API: QUESTIONS
========================= */

app.get("/api/questions", async (req, res) => {
  try {
    const mode = String(req.query.mode || "25");
    if (!["25", "60"].includes(mode)) {
      return res.status(400).json({ error: "mode must be 25 or 60" });
    }

    const type = mode === "60" ? "full" : "fast";
    const limit = mode === "60" ? 60 : 25;

    const result = await pool.query(
      `SELECT qid, question, options, type
       FROM questions
       WHERE type = $1
       ORDER BY id ASC
       LIMIT $2`,
      [type, limit]
    );

    const questions = result.rows.map((q) => ({
      qid: q.qid,
      question: q.question,
      option_a: q.options?.A || "",
      option_b: q.options?.B || "",
      option_c: q.options?.C || "",
      option_d: q.options?.D || "",
      type: q.type
    }));

    return res.json({ mode, type, count: questions.length, questions });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "questions fetch failed" });
  }
});

/* =========================
   API: INTAKE
========================= */

app.post("/api/intake", async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, tenant, answers = [] } = req.body;

    if (!email || !tenant || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant, answers are required" });
    }

    if (!answers.every((a) => a && a.qid && a.answer)) {
      return res.status(400).json({ error: "Invalid answer format (qid + answer required)" });
    }

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(tenant);

    const session = (
      await client.query(
        `INSERT INTO intake_sessions (tenant_id, email, mode)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [tenantRow.id, email, answers.length > 25 ? "full" : "fast"]
      )
    ).rows[0];

    for (const item of answers) {
      await client.query(
        `INSERT INTO intake_responses (session_id, question_id, answer)
         VALUES ($1, $2, $3)`,
        [session.id, item.qid, item.answer]
      );
    }

    const qids = answers.map((a) => a.qid);
    const questionRows = (await client.query(`SELECT * FROM questions WHERE qid = ANY($1)`, [qids])).rows;

    const scores = scoreAnswers(answers, questionRows);
    const { primary_role, secondary_role } = getTopRoles(scores);

    await client.query(
      `INSERT INTO results (session_id, primary_role, secondary_role, scores)
       VALUES ($1, $2, $3, $4)`,
      [session.id, primary_role, secondary_role, scores]
    );

    const config = {
      reward_system: ["builder", "resource_generator"].includes(primary_role),
      email_marketing: false,
      referral_system: ["connector", "nurturer"].includes(primary_role),
      analytics_engine: primary_role === "operator",
      engagement_engine: ["connector", "educator", "nurturer"].includes(primary_role),
      content_engine: ["educator", "connector"].includes(primary_role),
      automation_blueprints: ["architect", "operator"].includes(primary_role)
    };

    await client.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, config]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      session_id: session.id,
      primary_role,
      secondary_role,
      scores,
      config
    });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return res.status(500).json({ error: "api intake failed", details: e.message });
  } finally {
    client.release();
  }
});

/* =========================
   API: RESULTS
========================= */

app.get("/api/results/:email", async (req, res) => {
  try {
    const email = String(req.params.email || "");
    const result = await pool.query(
      `SELECT r.*
       FROM results r
       JOIN intake_sessions s ON s.id = r.session_id
       WHERE s.email = $1
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 1`,
      [email]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "result not found" });
    return res.json(result.rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "results lookup failed" });
  }
});

/* =========================
   API: VERIFY (new-only)
========================= */

app.get("/api/verify/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "DB_OK" });
  } catch (e) {
    return res.status(500).json({ status: "DB_FAIL" });
  }
});

app.get("/api/verify/questions", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
    return res.json({ status: "QUESTIONS_OK", count: result.rows[0].count });
  } catch (e) {
    return res.status(500).json({ status: "QUESTIONS_FAIL" });
  }
});

/* =========================
   SERVER START
========================= */

(async () => {
  try {
    await initializeDatabase();
    await seed(pool);

    const intervalMs = Number(process.env.ADAPTIVE_INTERVAL_MS || 300000);
    setInterval(async () => {
      try {
        await runAdaptiveCycle();
      } catch (e) {
        console.error("adaptive_cycle_failed", e);
      }
    }, intervalMs);

    app.listen(PORT, () => console.log(`Garvey server listening on port ${PORT}`));
  } catch (e) {
    console.error("Database initialization failed", e);
    process.exit(1);
  }
})();


// ==============================
// FILE: public/intake.html
// ==============================
/*
  Replace with the intake.html I already gave you that includes API_BASE autodetect.
  (If you want, paste your current dashboard/admin/voc next and I’ll rewrite them same way.)
*/
