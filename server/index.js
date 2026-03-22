/* FILE: server/index.js (PART 1/3)
   NEW-ONLY SOURCE OF TRUTH (no legacy /intake server routes)

   ✅ /t/:slug/*  = behavior engine endpoints + dashboard + optional site render
   ✅ /api/*      = questions/intake/results/admin/verify/site-generate
   ✅ /voc-intake = optional (only if vocEngine exists)
   ✅ Startup: initializeDatabase() -> seed(pool) -> listen -> adaptive cycle
*/

"use strict";

const express = require("express");
const path = require("path");

const { pool, initializeDatabase } = require("./db");
const {
  ensureTenant,
  getTenantBySlug,
  getTenantConfig,
  DEFAULT_TENANT_CONFIG
} = require("./tenant");

const { seed } = require("./seedQuestions");
const { runAdaptiveCycle } = require("./adaptiveEngine");
const { scoreAnswers, getTopRoles } = require("./scoringEngine");

// Optional VOC engine (won't crash if missing)
let vocEngine = null;
try {
  // eslint-disable-next-line global-require
  vocEngine = require("./vocEngine");
} catch (_) {
  vocEngine = null;
}

// Optional Site Generator (won't crash if missing)
let siteGenerator = null;
try {
  // eslint-disable-next-line global-require
  siteGenerator = require("./siteGenerator");
} catch (_) {
  siteGenerator = null;
}

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  return next();
});

app.use(express.static(path.join(__dirname, "..", "public")));

/* =========================
   CONSTANTS + HELPERS
========================= */

const ACTION_POINTS = Object.freeze({
  review: 5,
  photo: 10,
  video: 20,
  referral: 15
});

const ALLOWED_CONFIG_KEYS = Object.freeze([
  "reward_system",
  "engagement_engine",
  "email_marketing",
  "content_engine",
  "referral_system",
  "automation_blueprints",
  "analytics_engine",
  // adaptive engine fields
  "reward_multiplier",
  "review_incentive_bonus",
  "system_adjustments_log",
  // voc
  "voc_profile",
  // site generator
  "site",
  "features"
]);

function logEvent(event, payload = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...payload }));
}

function sanitizeConfig(config = {}) {
  const sanitized = {};
  for (const key of ALLOWED_CONFIG_KEYS) {
    if (config[key] === undefined) continue;

    if (typeof config[key] === "boolean") sanitized[key] = config[key];
    else if (typeof config[key] === "number") sanitized[key] = config[key];
    else if (Array.isArray(config[key]) || (config[key] && typeof config[key] === "object")) {
      sanitized[key] = config[key];
    }
  }
  return sanitized;
}

function rewardPointsEnabled(config) {
  return config?.reward_system !== false;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function findTenantUser(tenantId, email, client = pool) {
  const normalized = normalizeEmail(email);

  const existing = await client.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND email = $2",
    [tenantId, normalized]
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await client.query(
    `INSERT INTO users (tenant_id, email)
     VALUES ($1, $2)
     ON CONFLICT (tenant_id, email)
     DO UPDATE SET email = EXCLUDED.email
     RETURNING *`,
    [tenantId, normalized]
  );

  return created.rows[0];
}

async function tenantMiddleware(req, res, next) {
  try {
    const slug = String(req.params.slug || "").trim();
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return res.status(404).json({ error: "Tenant not found", tenant_slug: slug });

    req.tenant = tenant;
    req.tenantConfig = (await getTenantConfig(tenant.id)) || {};
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "tenant middleware failed" });
  }
}

/* =========================
   HEALTH + JOIN
========================= */

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/join/:slug", async (req, res) => {
  const tenant = await getTenantBySlug(req.params.slug);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });
  return res.redirect(`/intake.html?tenant=${tenant.slug}`);
});
/* FILE: server/index.js (PART 2/3)
   PLATFORM ROUTES (/t/:slug/*) + DASHBOARD + SITE
*/

app.post("/t/:slug/checkin", tenantMiddleware, async (req, res) => {
  try {
    const { email } = req.body || {};
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
  } catch (err) {
    console.error(err);
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
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? (ACTION_POINTS[actionType] || 0) : 0;

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
    console.error(err);
    return res.status(500).json({ error: "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    const { email, text, media_type: mediaType } = req.body || {};
    if (!email || !text) return res.status(400).json({ error: "email and text are required" });

    const user = await findTenantUser(req.tenant.id, email);
    const mediaBonus = mediaType === "video" ? 10 : mediaType === "photo" ? 5 : 0;
    const pointsAdded = rewardPointsEnabled(req.tenantConfig) ? (5 + mediaBonus) : 0;

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
    console.error(err);
    return res.status(500).json({ error: "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, referred_email: referredEmail } = req.body || {};
    if (!email || !referredEmail) return res.status(400).json({ error: "email and referred_email are required" });

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
      // ✅ deploy-safe: use ANY(int[]) instead of IN($3,$4)
      await client.query(
        "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = ANY($3::int[])",
        [pointsEach, req.tenant.id, [referrer.id, referred.id]]
      );
    }

    const users = await client.query(
      "SELECT email, points FROM users WHERE tenant_id = $1 AND id = ANY($2::int[]) ORDER BY email",
      [req.tenant.id, [referrer.id, referred.id]]
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
    console.error(err);
    return res.status(500).json({ error: "referral failed" });
  } finally {
    client.release();
  }
});

app.post("/t/:slug/wishlist", tenantMiddleware, async (req, res) => {
  try {
    const { email, product_name: productName } = req.body || {};
    if (!email || !productName) return res.status(400).json({ error: "email and product_name are required" });

    const user = await findTenantUser(req.tenant.id, email);
    const result = await pool.query(
      "INSERT INTO wishlist (tenant_id, user_id, product_name) VALUES ($1, $2, $3) RETURNING *",
      [req.tenant.id, user.id, productName]
    );

    return res.json({ success: true, tenant: req.tenant.slug, wishlist_entry: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "wishlist failed" });
  }
});

app.get("/t/:slug/dashboard", tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const [users, visits, actions, points, topActions, pointsDistribution, dailyActivity] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS total_users FROM users WHERE tenant_id = $1", [tenantId]),
      pool.query("SELECT COUNT(*)::int AS total_visits FROM visits WHERE tenant_id = $1", [tenantId]),
      pool.query("SELECT COUNT(*)::int AS total_actions FROM actions WHERE tenant_id = $1", [tenantId]),
      pool.query("SELECT COALESCE(SUM(points), 0)::int AS total_points FROM users WHERE tenant_id = $1", [tenantId]),
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
    console.error(err);
    return res.status(500).json({ error: "dashboard failed" });
  }
});

/* =========================
   TENANT SITE (optional)
========================= */

app.get("/t/:slug/site", tenantMiddleware, async (req, res) => {
  if (!siteGenerator) return res.status(404).send("siteGenerator not installed");

  try {
    const row = await pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [req.tenant.id]);
    const cfg = { ...DEFAULT_TENANT_CONFIG, ...(row.rows[0]?.config || {}) };

    const generated = siteGenerator.generateTenantSite({
      tenantSlug: req.tenant.slug,
      config: { site: cfg.site || {}, features: cfg.features || {} }
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(generated.pages.landing);
  } catch (err) {
    console.error(err);
    return res.status(500).send("site render failed");
  }
});

app.post("/api/site/generate", async (req, res) => {
  if (!siteGenerator) return res.status(404).json({ error: "siteGenerator not installed" });

  try {
    const { tenant, site = {}, features = {} } = req.body || {};
    if (!tenant) return res.status(400).json({ error: "tenant required" });

    const tenantRow = await ensureTenant(String(tenant));
    const existing = await pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenantRow.id]);
    const base = { ...DEFAULT_TENANT_CONFIG, ...(existing.rows[0]?.config || {}) };

    const merged = sanitizeConfig({
      ...base,
      site: { ...(base.site || {}), ...site },
      features: { ...(base.features || {}), ...features }
    });

    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, merged]
    );

    const generated = siteGenerator.generateTenantSite({
      tenantSlug: tenantRow.slug,
      config: { site: merged.site || {}, features: merged.features || {} }
    });

    return res.json({
      success: true,
      tenant: tenantRow.slug,
      version: generated.version,
      preview: `/t/${tenantRow.slug}/site`,
      pages: Object.keys(generated.pages)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "site generate failed", details: err.message });
  }
});

/* FILE: server/index.js (PART 3/3)
   NEW ENGINE API (/api/*) + VOC + STARTUP
*/

app.get("/api/questions", async (req, res) => {
  try {
    const mode = String(req.query.mode || "25");
    if (!["25", "60"].includes(mode)) return res.status(400).json({ error: "mode must be 25 or 60" });

    const includeWeights = String(req.query.include_weights || "0") === "1";
    const type = mode === "60" ? "full" : "fast";
    const limit = mode === "60" ? 60 : 25;

    const cols = includeWeights ? "qid, question, options, weights, type" : "qid, question, options, type";

    const result = await pool.query(
      `SELECT ${cols}
       FROM questions
       WHERE type = $1
       ORDER BY id ASC
       LIMIT $2`,
      [type, limit]
    );

    const questions = result.rows.map((q) => {
      const shaped = {
        qid: q.qid,
        question: q.question,
        option_a: q.options?.A || "",
        option_b: q.options?.B || "",
        option_c: q.options?.C || "",
        option_d: q.options?.D || "",
        type: q.type
      };
      if (includeWeights) shaped.weights = q.weights || {};
      return shaped;
    });

    return res.json({ mode, type, count: questions.length, questions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "questions fetch failed" });
  }
});

app.post("/api/intake", async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, tenant, answers = [] } = req.body || {};
    if (!email || !tenant || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant, answers are required" });
    }
    if (!answers.every((a) => a && a.qid && a.answer)) {
      return res.status(400).json({ error: "Invalid answer format (qid + answer required)" });
    }

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(String(tenant));
    const intakeMode = answers.length > 25 ? "full" : "fast";

    const session = (
      await client.query(
        `INSERT INTO intake_sessions (tenant_id, email, mode)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [tenantRow.id, normalizeEmail(email), intakeMode]
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
    const questionRows = (await client.query("SELECT * FROM questions WHERE qid = ANY($1)", [qids])).rows;
    if (!questionRows.length) throw new Error("No matching questions found for scoring");

    const scores = scoreAnswers(answers, questionRows);
    const { primary_role, secondary_role } = getTopRoles(scores);

    await client.query(
      `INSERT INTO results (session_id, primary_role, secondary_role, scores)
       VALUES ($1, $2, $3, $4)`,
      [session.id, primary_role, secondary_role, scores]
    );

    const config = sanitizeConfig({
      ...DEFAULT_TENANT_CONFIG,
      reward_system: ["builder", "resource_generator"].includes(primary_role),
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
    const email = normalizeEmail(req.params.email);
    if (!email) return res.status(400).json({ error: "email required" });

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "results lookup failed" });
  }
});

/* Admin config endpoints used by public/admin.html */
app.get("/api/admin/config", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    if (!tenantSlug) return res.status(400).json({ error: "tenant query param required" });

    const tenantRow = await getTenantBySlug(tenantSlug);
    if (!tenantRow) return res.status(404).json({ error: "tenant not found" });

    const cfg = await pool.query("SELECT config, updated_at FROM tenant_config WHERE tenant_id = $1", [tenantRow.id]);
    const config = { ...DEFAULT_TENANT_CONFIG, ...(cfg.rows[0]?.config || {}) };

    return res.json({ tenant: tenantRow.slug, config, updated_at: cfg.rows[0]?.updated_at || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "api admin config fetch failed" });
  }
});

app.get("/api/admin/config/:tenant", async (req, res) => {
  try {
    const tenantSlug = String(req.params.tenant || "").trim();
    const tenantRow = await getTenantBySlug(tenantSlug);
    if (!tenantRow) return res.status(404).json({ error: "tenant not found" });

    const cfg = await pool.query("SELECT config, updated_at FROM tenant_config WHERE tenant_id = $1", [tenantRow.id]);
    const config = { ...DEFAULT_TENANT_CONFIG, ...(cfg.rows[0]?.config || {}) };

    return res.json({ tenant: tenantRow.slug, config, updated_at: cfg.rows[0]?.updated_at || null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "api admin config fetch failed" });
  }
});

app.post("/api/admin/config", async (req, res) => {
  try {
    const { tenant, config = {} } = req.body || {};
    if (!tenant) return res.status(400).json({ error: "tenant required" });

    const tenantRow = await ensureTenant(String(tenant));
    const existing = await pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenantRow.id]);

    const merged = sanitizeConfig({
      ...DEFAULT_TENANT_CONFIG,
      ...(existing.rows[0]?.config || {}),
      ...config
    });

    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, merged]
    );

    return res.json({ tenant: tenantRow.slug, config: merged });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "api admin config update failed" });
  }
});

/* Verify endpoints */
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
    const r = await pool.query("SELECT COUNT(*)::int AS count FROM questions");
    return res.json({ status: "QUESTIONS_OK", count: r.rows[0].count });
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

/* VOC intake (optional) */
app.post("/voc-intake", async (req, res) => {
  if (!vocEngine) return res.status(404).json({ error: "VOC engine not installed" });

  const client = await pool.connect();
  try {
    const { email, tenant_slug: tenantSlug, answers = [] } = req.body || {};
    if (!email || !tenantSlug || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: "email, tenant_slug, and answers are required" });
    }

    const tenant = await ensureTenant(String(tenantSlug));

    await client.query("BEGIN");

    const session = (
      await client.query("INSERT INTO voc_sessions (tenant_id, email) VALUES ($1, $2) RETURNING *", [
        tenant.id,
        normalizeEmail(email)
      ])
    ).rows[0];

    for (let i = 0; i < answers.length; i += 1) {
      await client.query("INSERT INTO voc_responses (session_id, question_id, answer) VALUES ($1, $2, $3)", [
        session.id,
        i + 1,
        answers[i]
      ]);
    }

    const scores = vocEngine.scoreVOCAnswers(answers);
    const vocResult = vocEngine.generateVOCProfile(scores);

    await client.query(
      `INSERT INTO voc_results (session_id, customer_profile, engagement_style, buying_trigger, friction_point, loyalty_driver)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        session.id,
        vocResult.customer_profile,
        vocResult.engagement_style,
        vocResult.buying_trigger,
        vocResult.friction_point,
        vocResult.loyalty_driver
      ]
    );

    const existingCfg = await client.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenant.id]);
    const mergedConfig = vocEngine.mergeVOCIntoConfig(
      { ...DEFAULT_TENANT_CONFIG, ...(existingCfg.rows[0]?.config || {}) },
      vocResult
    );

    await client.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenant.id, sanitizeConfig(mergedConfig)]
    );

    await client.query("COMMIT");
    return res.json(vocResult);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "VOC intake failed" });
  } finally {
    client.release();
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

    app.listen(PORT, () => {
      console.log(`Garvey server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Database initialization failed", err);
    process.exit(1);
  }
})();
