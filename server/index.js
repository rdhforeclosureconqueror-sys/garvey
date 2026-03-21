/* FILE: server/index.js
   NEW-ONLY SOURCE OF TRUTH (cohesive)

   ✅ Platform behavior endpoints (tenant actions) under /t/:slug/*
   ✅ All intake/questions/results/admin/verify under /api/*
   ✅ Website generator:
      - POST /api/site/generate
      - GET  /t/:slug/site
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
const { ensureTenant, getTenantBySlug, getTenantConfig, DEFAULT_TENANT_CONFIG } = require("./tenant");
const { runAdaptiveCycle } = require("./adaptiveEngine");

const { scoreAnswers, getTopRoles } = require("./scoringEngine");
const { seed } = require("./seedQuestions");
const { generateTenantSite } = require("./siteGenerator");

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

const ALLOWED_CONFIG_KEYS = [
  "reward_system",
  "engagement_engine",
  "email_marketing",
  "content_engine",
  "referral_system",
  "automation_blueprints",
  "analytics_engine"
];

function logEvent(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

function sanitizeConfig(config = {}) {
  const sanitized = {};
  for (const key of ALLOWED_CONFIG_KEYS) {
    if (typeof config[key] === "boolean") sanitized[key] = config[key];
  }
  return sanitized;
}

function rewardPointsEnabled(config) {
  return config?.reward_system !== false;
}

async function findTenantUser(tenantId, email, client = pool) {
  const existing = await client.query("SELECT * FROM users WHERE tenant_id = $1 AND email = $2", [
    tenantId,
    email
  ]);
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
  } catch (err) {
    console.error("tenant_middleware_failed", err);
    return res.status(500).json({ error: "tenant middleware failed" });
  }
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => res.json({ status: "ok" }));

/* =========================
   JOIN
========================= */

app.get("/join/:slug", async (req, res) => {
  const tenant = await getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
  return res.redirect(`/intake.html?tenant=${tenant.slug}`);
});

/* =========================
   PLATFORM ROUTES (Behavior Engine)
========================= */

app.post("/t/:slug/checkin", tenantMiddleware, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    const user = await findTenantUser(req.tenant.id, email);
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? 5 : 0;

    await pool.query("INSERT INTO visits (tenant_id, user_id, points_awarded) VALUES ($1, $2, $3)", [
      req.tenant.id,
      user.id,
      pointsAdded
    ]);

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
  } catch (err) {
    console.error("checkin_failed", err);
    return res.status(500).json({ error: "checkin failed" });
  }
});

app.post("/t/:slug/action", tenantMiddleware, async (req, res) => {
  try {
    const { email, action_type: actionType } = req.body || {};
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
  } catch (err) {
    console.error("action_failed", err);
    return res.status(500).json({ error: "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    const { email, text, media_type: mediaType } = req.body || {};
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
  } catch (err) {
    console.error("review_failed", err);
    return res.status(500).json({ error: "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, referred_email: referredEmail } = req.body || {};
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
      await client.query("UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id IN ($3, $4)", [
        pointsEach,
        req.tenant.id,
        referrer.id,
        referred.id
      ]);
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
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("referral_failed", err);
    return res.status(500).json({ error: "referral failed" });
  } finally {
    client.release();
  }
});

app.post("/t/:slug/wishlist", tenantMiddleware, async (req, res) => {
  try {
    const { email, product_name: productName } = req.body || {};
    if (!email || !productName) {
      return res.status(400).json({ error: "email and product_name are required" });
    }

    const user = await findTenantUser(req.tenant.id, email);
    const result = await pool.query(
      "INSERT INTO wishlist (tenant_id, user_id, product_name) VALUES ($1, $2, $3) RETURNING *",
      [req.tenant.id, user.id, productName]
    );

    return res.json({ success: true, tenant: req.tenant.slug, wishlist_entry: result.rows[0] });
  } catch (err) {
    console.error("wishlist_failed", err);
    return res.status(500).json({ error: "wishlist failed" });
  }
});

app.get("/t/:slug/dashboard", tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const [users, visits, actions, points, topActions, pointsDistribution, dailyActivity] =
      await Promise.all([
        pool.query("SELECT COUNT(*)::int AS total_users FROM users WHERE tenant_id = $1", [tenantId]),
        pool.query("SELECT COUNT(*)::int AS total_visits FROM visits WHERE tenant_id = $1", [tenantId]),
        pool.query("SELECT COUNT(*)::int AS total_actions FROM actions WHERE tenant_id = $1", [tenantId]),
        pool.query("SELECT COALESCE(SUM(points), 0)::int AS total_points FROM users WHERE tenant_id = $1", [
          tenantId
        ]),
        pool.query(
          `SELECT action_type, COUNT(*)::int AS action_count
           FROM actions WHERE tenant_id = $1
           GROUP BY action_type
           ORDER BY action_count DESC, action_type ASC
           LIMIT 5`,
          [tenantId]
        ),
        pool.query(
          `SELECT
              CASE
                WHEN points < 10 THEN '0-9'
                WHEN points < 25 THEN '10-24'
                WHEN points < 50 THEN '25-49'
                ELSE '50+'
              END AS bucket,
              COUNT(*)::int AS user_count
           FROM users
           WHERE tenant_id = $1
           GROUP BY bucket
           ORDER BY bucket`,
          [tenantId]
        ),
        pool.query(
          `SELECT activity_day, SUM(activity_count)::int AS activity_count
           FROM (
              SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM visits WHERE tenant_id = $1 GROUP BY DATE(created_at)
              UNION ALL
              SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM actions WHERE tenant_id = $1 GROUP BY DATE(created_at)
              UNION ALL
              SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM reviews WHERE tenant_id = $1 GROUP BY DATE(created_at)
              UNION ALL
              SELECT DATE(created_at) AS activity_day, COUNT(*)::int AS activity_count FROM referrals WHERE tenant_id = $1 GROUP BY DATE(created_at)
           ) a
           GROUP BY activity_day
           ORDER BY activity_day DESC
           LIMIT 14`,
          [tenantId]
        )
      ]);

    return res.json({
      tenant: req.tenant.slug,
      total_users: users.rows[0].total_users,
      total_visits: visits.rows[0].total_visits,
      total_actions: actions.rows[0].total_actions,
      total_points: points.rows[0].total_points,
      top_actions: topActions.rows,
      points_distribution: pointsDistribution.rows,
      daily_activity: dailyActivity.rows
    });
  } catch (err) {
    console.error("dashboard_failed", err);
    return res.status(500).json({ error: "dashboard failed" });
  }
});

/* =========================
   NEW-ONLY API (Questions / Intake / Results / Admin / Verify)
========================= */

app.get("/api/questions", async (req, res) => {
  try {
    const mode = String(req.query.mode || "25");
    if (!["25", "60"].includes(mode)) return res.status(400).json({ error: "mode must be 25 or 60" });

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
  } catch (err) {
    console.error("questions_fetch_failed", err);
    return res.status(500).json({ error: "questions fetch failed" });
  }
});

app.post("/api/intake", async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, tenant, answers = [] } = req.body || {};

    if (!email || !tenant || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant, and non-empty answers are required" });
    }

    if (!answers.every((a) => a && a.qid && a.answer)) {
      return res.status(400).json({ error: "Invalid answer format (qid + answer required)" });
    }

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(String(tenant).trim());
    const mode = answers.length > 25 ? "full" : "fast";

    const session = (
      await client.query(
        `INSERT INTO intake_sessions (tenant_id, email, mode)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [tenantRow.id, email, mode]
      )
    ).rows[0];

    for (const item of answers) {
      await client.query(
        `INSERT INTO intake_responses (session_id, question_id, answer)
         VALUES ($1, $2, $3)`,
        [session.id, item.qid, String(item.answer).toUpperCase()]
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

    const nextConfig = sanitizeConfig({
      ...DEFAULT_TENANT_CONFIG,
      reward_system: ["builder", "resource_generator"].includes(primary_role),
      email_marketing: false,
      referral_system: ["connector", "nurturer"].includes(primary_role),
      analytics_engine: primary_role === "operator",
      engagement_engine: ["connector", "educator", "nurturer"].includes(primary_role),
      content_engine: ["educator", "connector"].includes(primary_role),
      automation_blueprints: ["architect", "operator"].includes(primary_role)
    });

    await client.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, nextConfig]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      session_id: session.id,
      primary_role,
      secondary_role,
      scores,
      config: nextConfig
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("api_intake_failed", err);
    return res.status(500).json({ error: "api intake failed", details: err.message });
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
  } catch (err) {
    console.error("results_lookup_failed", err);
    return res.status(500).json({ error: "results lookup failed" });
  }
});

/* Admin config (for public/admin.html) */
app.get("/api/admin/config/:tenant", async (req, res) => {
  try {
    const tenant = await getTenantBySlug(req.params.tenant);
    if (!tenant) return res.status(404).json({ error: "tenant not found" });

    const row = await pool.query(`SELECT config, updated_at FROM tenant_config WHERE tenant_id = $1`, [tenant.id]);
    if (!row.rows[0]) return res.json({ tenant: tenant.slug, config: { ...DEFAULT_TENANT_CONFIG }, updated_at: null });

    return res.json({ tenant: tenant.slug, ...row.rows[0] });
  } catch (err) {
    console.error("admin_config_fetch_failed", err);
    return res.status(500).json({ error: "admin config fetch failed" });
  }
});

app.post("/api/admin/config", async (req, res) => {
  try {
    const { tenant, config = {} } = req.body || {};
    if (!tenant) return res.status(400).json({ error: "tenant is required" });

    const tenantRow = await ensureTenant(String(tenant).trim());

    const existing = await pool.query(`SELECT config FROM tenant_config WHERE tenant_id = $1`, [tenantRow.id]);
    const merged = {
      ...DEFAULT_TENANT_CONFIG,
      ...(existing.rows[0]?.config || {}),
      ...sanitizeConfig(config)
    };

    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, merged]
    );

    return res.json({ tenant: tenantRow.slug, config: merged });
  } catch (err) {
    console.error("admin_config_update_failed", err);
    return res.status(500).json({ error: "api admin config update failed" });
  }
});

/* Verify */
app.get("/api/verify/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "DB_OK" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "DB_FAIL" });
  }
});

app.get("/api/verify/questions", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
    return res.json({ status: "QUESTIONS_OK", count: result.rows[0].count });
  } catch (err) {
    console.error(err);
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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "SCORING_FAIL" });
  }
});

/* =========================
   WEBSITE GENERATOR (Command B)
========================= */

app.post("/api/site/generate", async (req, res) => {
  try {
    const { tenant, site = {}, features = {} } = req.body || {};
    if (!tenant) return res.status(400).json({ error: "tenant is required" });

    const tenantRow = await ensureTenant(String(tenant).trim());
    const config = { site, features };

    const generated = generateTenantSite({ tenantSlug: tenantRow.slug, config });

    await pool.query(
      `INSERT INTO tenant_sites (tenant_id, pages, version, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET pages = EXCLUDED.pages, version = EXCLUDED.version, updated_at = NOW()`,
      [tenantRow.id, generated.pages, generated.version]
    );

    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, config]
    );

    return res.json({
      success: true,
      tenant: tenantRow.slug,
      preview: `/t/${tenantRow.slug}/site`,
      pages: Object.keys(generated.pages)
    });
  } catch (err) {
    console.error("site_generate_failed", err);
    return res.status(500).json({ error: "site generation failed", details: err.message });
  }
});

app.get("/t/:slug/site", async (req, res) => {
  try {
    const tenant = await getTenantBySlug(req.params.slug);
    if (!tenant) return res.status(404).send("Tenant not found");

    const siteRow = await pool.query(`SELECT pages, version FROM tenant_sites WHERE tenant_id = $1`, [tenant.id]);

    if (!siteRow.rows[0]) {
      const cfgRow = await pool.query(`SELECT config FROM tenant_config WHERE tenant_id = $1`, [tenant.id]);
      const cfg = cfgRow.rows[0]?.config || {};
      const generated = generateTenantSite({ tenantSlug: tenant.slug, config: cfg });

      await pool.query(
        `INSERT INTO tenant_sites (tenant_id, pages, version, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET pages = EXCLUDED.pages, version = EXCLUDED.version, updated_at = NOW()`,
        [tenant.id, generated.pages, generated.version]
      );

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(generated.pages.landing);
    }

    const landing = siteRow.rows[0].pages?.landing;
    if (!landing) return res.status(500).send("Landing page missing");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(landing);
  } catch (err) {
    console.error("site_render_failed", err);
    return res.status(500).send("Site render failed");
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
      } catch (err) {
        console.error("adaptive_cycle_failed", err);
      }
    }, intervalMs);

    app.listen(PORT, () => console.log(`Garvey server listening on port ${PORT}`));
  } catch (err) {
    console.error("Database initialization failed", err);
    process.exit(1);
  }
})();
