/* FILE: server/index.js
   NEW-ONLY SOURCE OF TRUTH (cohesive, no legacy pipeline)

   ✅ Keeps platform behavior endpoints (tenant actions) under /t/:slug/*
   ✅ Moves ALL “intake/questions/results/admin/verify” to /api/*
   ✅ Removes legacy /intake + legacy /verify runner dependencies
   ✅ Startup order:
      await initializeDatabase()
      await seed(pool)
      start server
      start adaptive cycle
*/

"use strict";

const express = require("express");
const path = require("path");

const { pool, initializeDatabase } = require("./db");
const { ensureTenant, getTenantBySlug, getTenantConfig } = require("./tenant");
const { runAdaptiveCycle } = require("./adaptiveEngine");

const { scoreAnswers, getTopRoles } = require("./scoringEngine");
const { seed } = require("./seedQuestions");

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

const ACTION_POINTS = {
  review: 5,
  photo: 10,
  video: 20,
  referral: 15
};

function logEvent(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

function rewardPointsEnabled(config) {
  return config?.reward_system !== false;
}

async function findTenantUser(tenantId, email, client = pool) {
  const existing = await client.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND email = $2",
    [tenantId, email]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await client.query(
    `INSERT INTO users (tenant_id, email)
     VALUES ($1, $2)
     ON CONFLICT (tenant_id, email)
     DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [tenantId, email]
  );

  return created.rows[0];
}

async function tenantMiddleware(req, res, next) {
  try {
    const { slug } = req.params;
    const tenant = await getTenantBySlug(slug);

    if (!tenant) {
      return res.status(404).json({ error: "Tenant not found", tenant_slug: slug });
    }

    req.tenant = tenant;
    req.tenantConfig = (await getTenantConfig(tenant.id)) || {};
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "tenant middleware failed" });
  }
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => res.json({ status: "ok" }));

/* =========================
   PLATFORM ROUTES (behavior engine)
   Kept stable at /t/:slug/*
========================= */

app.get("/join/:slug", async (req, res) => {
  const tenant = await getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
  return res.redirect(`/intake.html?tenant=${tenant.slug}`);
});

app.post("/t/:slug/checkin", tenantMiddleware, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    const user = await findTenantUser(req.tenant.id, email);
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? 5 : 0;

    await pool.query(
      "INSERT INTO visits (tenant_id, user_id, points_awarded) VALUES ($1, $2, $3)",
      [req.tenant.id, user.id, pointsAdded]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
      [pointsAdded, req.tenant.id, user.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      event: "checkin",
      points_added: pointsAdded,
      points: updatedUser.rows[0].points
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "checkin failed" });
  }
});

app.post("/t/:slug/action", tenantMiddleware, async (req, res) => {
  try {
    const { email, action_type: actionType } = req.body;
    if (!email || !actionType) {
      return res.status(400).json({ error: "email and action_type are required" });
    }

    const user = await findTenantUser(req.tenant.id, email);
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? ACTION_POINTS[actionType] || 0 : 0;

    await pool.query(
      "INSERT INTO actions (tenant_id, user_id, action_type, points_awarded) VALUES ($1, $2, $3, $4)",
      [req.tenant.id, user.id, actionType, pointsAdded]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
      [pointsAdded, req.tenant.id, user.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      action_type: actionType,
      points_added: pointsAdded,
      points: updatedUser.rows[0].points
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    const { email, text, media_type: mediaType } = req.body;
    if (!email || !text) return res.status(400).json({ error: "email and text are required" });

    const user = await findTenantUser(req.tenant.id, email);
    const mediaBonus = mediaType === "video" ? 10 : mediaType === "photo" ? 5 : 0;
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? 5 + mediaBonus : 0;

    const reviewResult = await pool.query(
      `INSERT INTO reviews (tenant_id, user_id, text, media_type, points_awarded)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.tenant.id, user.id, text, mediaType || null, pointsAdded]
    );

    const updatedUser = await pool.query(
      "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
      [pointsAdded, req.tenant.id, user.id]
    );

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      review: reviewResult.rows[0],
      points_added: pointsAdded,
      points: updatedUser.rows[0].points
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, referred_email: referredEmail } = req.body;
    if (!email || !referredEmail) {
      return res.status(400).json({ error: "email and referred_email are required" });
    }

    await client.query("BEGIN");

    const referrer = await findTenantUser(req.tenant.id, email, client);
    const referred = await findTenantUser(req.tenant.id, referredEmail, client);
    const pointsEach = rewardPointsEnabled(req.tenantConfig) ? 10 : 0;

    await client.query(
      `INSERT INTO referrals (tenant_id, referrer_user_id, referred_user_id, points_awarded_each)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, referrer_user_id, referred_user_id)
       DO NOTHING`,
      [req.tenant.id, referrer.id, referred.id, pointsEach]
    );

    if (pointsEach > 0) {
      await client.query(
        "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id IN ($3, $4)",
        [pointsEach, req.tenant.id, referrer.id, referred.id]
      );
    }

    const users = await client.query(
      "SELECT email, points FROM users WHERE tenant_id = $1 AND id IN ($2, $3) ORDER BY email",
      [req.tenant.id, referrer.id, referred.id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      tenant: req.tenant.slug,
      points_awarded_each: pointsEach,
      users: users.rows
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    return res.status(500).json({ error: "referral failed" });
  } finally {
    client.release();
  }
});

app.post("/t/:slug/wishlist", tenantMiddleware, async (req, res) => {
  try {
    const { email, product_name: productName } = req.body;
    if (!email || !productName) {
      return res.status(400).json({ error: "email and product_name are required" });
    }

    const user = await findTenantUser(req.tenant.id, email);
    const result = await pool.query(
      "INSERT INTO wishlist (tenant_id, user_id, product_name) VALUES ($1, $2, $3) RETURNING *",
      [req.tenant.id, user.id, productName]
    );

    return res.json({ success: true, tenant: req.tenant.slug, wishlist_entry: result.rows[0] });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "wishlist failed" });
  }
});

/* =========================
   NEW-ONLY API (questions / intake / results / verify)
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "questions fetch failed" });
  }
});

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

    if (!questionRows.length) throw new Error("No matching questions found for scoring");

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
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("api_intake_failed", error);
    return res.status(500).json({ error: "api intake failed", details: error.message });
  } finally {
    client.release();
  }
});

app.get("/api/results/:email", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*
       FROM results r
       JOIN intake_sessions s ON s.id = r.session_id
       WHERE s.email = $1
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 1`,
      [req.params.email]
    );

    if (!result.rows[0]) return res.status(404).json({ error: "result not found" });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "results lookup failed" });
  }
});

app.get("/api/verify/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "DB_OK" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "DB_FAIL" });
  }
});

app.get("/api/verify/questions", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
    return res.json({ status: "QUESTIONS_OK", count: result.rows[0].count });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "QUESTIONS_FAIL" });
  }
});

app.get("/api/verify/scoring", async (req, res) => {
  try {
    const qs = (await pool.query("SELECT * FROM questions ORDER BY id ASC LIMIT 3")).rows;
    const answers = qs.map((q) => ({ qid: q.qid, answer: "A" }));
    const scores = scoreAnswers(answers, qs);
    const top = getTopRoles(scores);
    return res.json({ status: "SCORING_OK", sample: top });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: "SCORING_FAIL" });
  }
});

/* =========================
   SERVER STARTUP
========================= */

(async () => {
  try {
    await initializeDatabase();
    await seed(pool);

    const intervalMs = Number(process.env.ADAPTIVE_INTERVAL_MS || 300000);
    setInterval(async () => {
      try {
        const results = await runAdaptiveCycle();
        logEvent("adaptive_cycle", { tenant_count: Array.isArray(results) ? results.length : null });
      } catch (error) {
        console.error("adaptive_cycle_failed", error);
      }
    }, intervalMs);

    app.listen(PORT, () => console.log(`Garvey server listening on port ${PORT}`));
  } catch (error) {
    console.error("Database initialization failed", error);
    process.exit(1);
  }
})();
