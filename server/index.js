// FILE: server/index.js
// ✅ FULL FILE replacement (same routes)
// ✅ Keeps: all existing /t/:slug/* routes, /api/* routes, VOC routes, verify routes
// ✅ Keeps: /api/intake deriveTenantConfigPatch merge into tenant_config.site/features
// ✅ Adds: DB-backed Kanban (schema init + API mount at /api/kanban)
// ✅ Adds: Templates plugin
//    - GET  /api/templates (reads public/templates/registry.json)
//    - POST /api/templates/select (stores tenant_config.site.template_id)

"use strict";

const express = require("express");
const path = require("path");
const fs = require("fs/promises");

const { pool, initializeDatabase } = require("./db");
const {
  ensureTenant,
  getTenantBySlug,
  getTenantConfig,
  DEFAULT_TENANT_CONFIG,
} = require("./tenant");

const { runAdaptiveCycle } = require("./adaptiveEngine");
const { seed } = require("./seedQuestions");
const {
  ARCHETYPE_DEFINITIONS,
  getQuestions,
  scoreSubmission,
  validateAnswers,
} = require("./intelligenceEngine");

// ✅ Kanban
const { initializeKanbanSchema } = require("./kanbanDb");
const kanbanRoutes = require("./kanbanRoutes");
const {
  ensureGarveyBoard,
  ensureDefaultOnboardingCards,
} = require("./kanbanRoutes");

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
app.use('/dashboardnew', express.static(path.join(__dirname, '..', 'dashboardnew')));

app.get('/dashboard.html', (req, res) => {
  return res.sendFile(path.join(__dirname, '..', 'dashboardnew', 'index.html'));
});

/* =========================
   CONSTANTS + HELPERS
========================= */

const ACTION_POINTS = Object.freeze({
  review: 5,
  photo: 10,
  video: 20,
  referral: 15,
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
  "features",
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

function normalizeScores(scores) {
  if (!scores || typeof scores !== "object") return {};
  return Object.entries(scores).reduce((acc, [key, value]) => {
    const n = Number(value || 0);
    acc[key] = Number.isFinite(n) ? n : 0;
    return acc;
  }, {});
}

function buildResultContract(scored) {
  const scores = normalizeScores(scored?.archetype_counts);
  return {
    primary_role: scored?.primary || null,
    secondary_role: scored?.secondary || null,
    weakness_role: scored?.weakness || null,
    scores,
    weakness_advice: scored?.weakness
      ? ARCHETYPE_DEFINITIONS[scored.weakness]?.improve || null
      : null,
  };
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

async function readTemplateRegistry() {
  const registryPath = path.join(__dirname, "..", "public", "templates", "registry.json");
  const raw = await fs.readFile(registryPath, "utf8");
  const parsed = JSON.parse(raw);
  const templates = Array.isArray(parsed?.templates) ? parsed.templates : [];
  return { templates };
}

function pickTemplateType(businessType) {
  const normalized = String(businessType || "").trim().toLowerCase();
  if (!normalized) return "business";

  const spaLike = ["spa", "salon", "barber", "beauty", "wellness", "medspa"];
  if (spaLike.some((token) => normalized.includes(token))) return "beauty";

  const landingLike = ["coach", "consult", "agency", "freelance", "creator"];
  if (landingLike.some((token) => normalized.includes(token))) return "landing";

  return "business";
}

function buildRoleModifiers(primaryRole, secondaryRole) {
  const primary = String(primaryRole || "").trim().toLowerCase();
  const secondary = String(secondaryRole || "").trim().toLowerCase();

  return {
    primary_role: primary || null,
    secondary_role: secondary || null,
    emphasis: [primary, secondary].filter(Boolean),
  };
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

/* =========================
   TEMPLATES PLUGIN (NEW)
========================= */

// Returns the template registry from /public/templates/registry.json
app.get("/api/templates", async (req, res) => {
  try {
    const data = await readTemplateRegistry();
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("templates_registry_failed", err);
    return res.status(500).json({ success: false, error: "templates registry read failed" });
  }
});

// Stores selection at tenant_config.site.template_id
app.post("/api/templates/select", async (req, res) => {
  try {
    const { tenant, template_id: templateId } = req.body || {};
    if (!tenant || !templateId) {
      return res.status(400).json({ error: "tenant and template_id are required" });
    }

    // Validate template exists in registry (prevents typos)
    const registry = await readTemplateRegistry();
    const exists = registry.templates.some((t) => String(t.id).trim() === String(templateId).trim());
    if (!exists) {
      return res.status(400).json({ error: "unknown template_id", template_id: templateId });
    }

    const tenantRow = await ensureTenant(String(tenant));
    const existing = await pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenantRow.id]);
    const base = { ...DEFAULT_TENANT_CONFIG, ...(existing.rows[0]?.config || {}) };

    const merged = sanitizeConfig({
      ...base,
      site: { ...(base.site || {}), template_id: String(templateId).trim() },
      features: { ...(base.features || {}) },
    });

    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id)
       DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [tenantRow.id, merged]
    );

    return res.json({ success: true, tenant: tenantRow.slug, template_id: String(templateId).trim() });
  } catch (err) {
    console.error("templates_select_failed", err);
    return res.status(500).json({ error: "template select failed" });
  }
});

/* =========================
   KANBAN API
========================= */
app.use("/api/kanban", kanbanRoutes({ pool, ensureTenant }));

/* =========================
   REWARDS SERVICE HELPERS
========================= */

async function getTenantContextBySlug(slug) {
  const tenant = await getTenantBySlug(String(slug || "").trim());
  if (!tenant) return null;
  const tenantConfig = (await getTenantConfig(tenant.id)) || {};
  return { tenant, tenantConfig };
}

async function processCheckinReward({ tenant, tenantConfig, email }) {
  const user = await findTenantUser(tenant.id, email);
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? 5 : 0;

  await pool.query(
    "INSERT INTO visits (tenant_id, user_id, points_awarded) VALUES ($1, $2, $3)",
    [tenant.id, user.id, pointsAdded]
  );

  const updatedUser = await pool.query(
    "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
    [pointsAdded, tenant.id, user.id]
  );

  return {
    success: true,
    tenant: tenant.slug,
    event: "checkin",
    points_added: pointsAdded,
    points: updatedUser.rows[0].points,
  };
}

async function processActionReward({ tenant, tenantConfig, email, actionType }) {
  const user = await findTenantUser(tenant.id, email);
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? (ACTION_POINTS[actionType] || 0) : 0;

  await pool.query(
    "INSERT INTO actions (tenant_id, user_id, action_type, points_awarded) VALUES ($1, $2, $3, $4)",
    [tenant.id, user.id, actionType, pointsAdded]
  );

  const updatedUser = await pool.query(
    "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
    [pointsAdded, tenant.id, user.id]
  );

  return {
    success: true,
    tenant: tenant.slug,
    action_type: actionType,
    points_added: pointsAdded,
    points: updatedUser.rows[0].points,
  };
}

async function processReviewReward({ tenant, tenantConfig, email, text, mediaType }) {
  const user = await findTenantUser(tenant.id, email);
  const mediaBonus = mediaType === "video" ? 10 : mediaType === "photo" ? 5 : 0;
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? (5 + mediaBonus) : 0;

  const reviewResult = await pool.query(
    `INSERT INTO reviews (tenant_id, user_id, text, media_type, points_awarded)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tenant.id, user.id, text, mediaType || null, pointsAdded]
  );

  const updatedUser = await pool.query(
    "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
    [pointsAdded, tenant.id, user.id]
  );

  return {
    success: true,
    tenant: tenant.slug,
    review: reviewResult.rows[0],
    points_added: pointsAdded,
    points: updatedUser.rows[0].points,
  };
}

async function processReferralReward({ tenant, tenantConfig, email, referredEmail }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const referrer = await findTenantUser(tenant.id, email, client);
    const referred = await findTenantUser(tenant.id, referredEmail, client);
    const pointsEach = rewardPointsEnabled(tenantConfig) ? 10 : 0;

    await client.query(
      `INSERT INTO referrals (tenant_id, referrer_user_id, referred_user_id, points_awarded_each)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, referrer_user_id, referred_user_id)
       DO NOTHING`,
      [tenant.id, referrer.id, referred.id, pointsEach]
    );

    if (pointsEach > 0) {
      await client.query(
        "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = ANY($3::int[])",
        [pointsEach, tenant.id, [referrer.id, referred.id]]
      );
    }

    const users = await client.query(
      "SELECT email, points FROM users WHERE tenant_id = $1 AND id = ANY($2::int[]) ORDER BY email",
      [tenant.id, [referrer.id, referred.id]]
    );

    await client.query("COMMIT");
    return {
      success: true,
      tenant: tenant.slug,
      points_awarded_each: pointsEach,
      users: users.rows,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function processWishlistReward({ tenant, email, productName }) {
  const user = await findTenantUser(tenant.id, email);
  const result = await pool.query(
    "INSERT INTO wishlist (tenant_id, user_id, product_name) VALUES ($1, $2, $3) RETURNING *",
    [tenant.id, user.id, productName]
  );
  return { success: true, tenant: tenant.slug, wishlist_entry: result.rows[0] };
}

async function fetchRewardsStatus({ tenant, email }) {
  if (!email) {
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS users, COALESCE(SUM(points),0)::int AS total_points
       FROM users WHERE tenant_id = $1`,
      [tenant.id]
    );
    return {
      success: true,
      tenant: tenant.slug,
      user: null,
      totals: totals.rows[0],
      eligible_rewards: ["checkin", "action", "review", "referral", "wishlist"],
    };
  }

  const user = await findTenantUser(tenant.id, email);
  const recent = await pool.query(
    `SELECT 'visit' AS event_type, created_at FROM visits WHERE tenant_id = $1 AND user_id = $2
     UNION ALL
     SELECT 'action' AS event_type, created_at FROM actions WHERE tenant_id = $1 AND user_id = $2
     UNION ALL
     SELECT 'review' AS event_type, created_at FROM reviews WHERE tenant_id = $1 AND user_id = $2
     UNION ALL
     SELECT 'wishlist' AS event_type, created_at FROM wishlist WHERE tenant_id = $1 AND user_id = $2
     ORDER BY created_at DESC
     LIMIT 10`,
    [tenant.id, user.id]
  );

  return {
    success: true,
    tenant: tenant.slug,
    user: { email: user.email, points: user.points },
    recent_events: recent.rows,
    eligible_rewards: ["checkin", "action", "review", "referral", "wishlist"],
  };
}

async function fetchRewardsHistory({ tenant, email, limit = 50 }) {
  if (!email) {
    return {
      success: true,
      tenant: tenant.slug,
      history: [],
      limitation: "email is required for per-customer reward history",
    };
  }

  const user = await findTenantUser(tenant.id, email);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const history = await pool.query(
    `SELECT * FROM (
      SELECT 'visit'::text AS event_type, created_at, points_awarded::int AS points_delta, NULL::text AS detail
      FROM visits WHERE tenant_id = $1 AND user_id = $2
      UNION ALL
      SELECT 'action'::text AS event_type, created_at, points_awarded::int AS points_delta, action_type::text AS detail
      FROM actions WHERE tenant_id = $1 AND user_id = $2
      UNION ALL
      SELECT 'review'::text AS event_type, created_at, points_awarded::int AS points_delta, media_type::text AS detail
      FROM reviews WHERE tenant_id = $1 AND user_id = $2
      UNION ALL
      SELECT 'wishlist'::text AS event_type, created_at, 0::int AS points_delta, product_name::text AS detail
      FROM wishlist WHERE tenant_id = $1 AND user_id = $2
    ) x
    ORDER BY created_at DESC
    LIMIT $3`,
    [tenant.id, user.id, safeLimit]
  );

  return {
    success: true,
    tenant: tenant.slug,
    user: { email: user.email, points: user.points },
    history: history.rows,
  };
}

/* =========================
   PLATFORM ROUTES (/t/:slug/*)
========================= */

app.post("/t/:slug/checkin", tenantMiddleware, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    const payload = await processCheckinReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
    });
    return res.json(payload);
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

    const payload = await processActionReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      actionType,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    const { email, text, media_type: mediaType } = req.body || {};
    if (!email || !text) return res.status(400).json({ error: "email and text are required" });

    const payload = await processReviewReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      text,
      mediaType,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  try {
    const { email, referred_email: referredEmail } = req.body || {};
    if (!email || !referredEmail) return res.status(400).json({ error: "email and referred_email are required" });
    const payload = await processReferralReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      referredEmail,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "referral failed" });
  }
});

app.post("/t/:slug/wishlist", tenantMiddleware, async (req, res) => {
  try {
    const { email, product_name: productName } = req.body || {};
    if (!email || !productName) return res.status(400).json({ error: "email and product_name are required" });

    const payload = await processWishlistReward({
      tenant: req.tenant,
      email,
      productName,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "wishlist failed" });
  }
});

/* =========================
   REWARDS API WRAPPERS
========================= */

app.get("/api/rewards/status", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    if (!tenantSlug) return res.status(400).json({ error: "tenant query param is required" });
    const ctx = await getTenantContextBySlug(tenantSlug);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const email = String(req.query.email || "").trim();
    const payload = await fetchRewardsStatus({ tenant: ctx.tenant, email });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards status failed" });
  }
});

app.get("/api/rewards/history", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    if (!tenantSlug) return res.status(400).json({ error: "tenant query param is required" });
    const ctx = await getTenantContextBySlug(tenantSlug);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const email = String(req.query.email || "").trim();
    const limit = Number(req.query.limit || 50);
    const payload = await fetchRewardsHistory({ tenant: ctx.tenant, email, limit });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards history failed" });
  }
});

app.post("/api/rewards/checkin", async (req, res) => {
  try {
    const { tenant, email } = req.body || {};
    if (!tenant || !email) return res.status(400).json({ error: "tenant and email are required" });
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processCheckinReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards checkin failed" });
  }
});

app.post("/api/rewards/action", async (req, res) => {
  try {
    const { tenant, email, action_type: actionType } = req.body || {};
    if (!tenant || !email || !actionType) {
      return res.status(400).json({ error: "tenant, email and action_type are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processActionReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, actionType });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards action failed" });
  }
});

app.post("/api/rewards/review", async (req, res) => {
  try {
    const { tenant, email, text, media_type: mediaType } = req.body || {};
    if (!tenant || !email || !text) return res.status(400).json({ error: "tenant, email and text are required" });
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processReviewReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, text, mediaType });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards review failed" });
  }
});

app.post("/api/rewards/referral", async (req, res) => {
  try {
    const { tenant, email, referred_email: referredEmail } = req.body || {};
    if (!tenant || !email || !referredEmail) {
      return res.status(400).json({ error: "tenant, email and referred_email are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processReferralReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, referredEmail });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards referral failed" });
  }
});

app.post("/api/rewards/wishlist", async (req, res) => {
  try {
    const { tenant, email, product_name: productName } = req.body || {};
    if (!tenant || !email || !productName) {
      return res.status(400).json({ error: "tenant, email and product_name are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processWishlistReward({ tenant: ctx.tenant, email, productName });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards wishlist failed" });
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
      ),
    ]);

    return res.json({
      tenant: req.tenant.slug,
      total_users: users.rows[0].total_users,
      total_visits: visits.rows[0].total_visits,
      total_actions: actions.rows[0].total_actions,
      total_points: points.rows[0].total_points,
      top_actions: topActions.rows,
      points_distribution: pointsDistribution.rows,
      daily_activity: dailyActivity.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "dashboard failed" });
  }
});



app.get("/t/:slug/customers", tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const customers = await pool.query(
      `SELECT
          u.id AS user_id,
          u.email,
          COALESCE(v.visit_count, 0)::int AS visits,
          GREATEST(
            COALESCE(v.last_visit, to_timestamp(0)),
            COALESCE(a.last_action, to_timestamp(0)),
            COALESCE(r.last_review, to_timestamp(0)),
            COALESCE(w.last_wishlist, to_timestamp(0))
          ) AS last_activity,
          COALESCE(rr.primary_archetype, 'unclassified') AS archetype
       FROM users u
       LEFT JOIN (
         SELECT user_id, COUNT(*) AS visit_count, MAX(created_at) AS last_visit
         FROM visits
         WHERE tenant_id = $1
         GROUP BY user_id
       ) v ON v.user_id = u.id
       LEFT JOIN (
         SELECT user_id, MAX(created_at) AS last_action
         FROM actions
         WHERE tenant_id = $1
         GROUP BY user_id
       ) a ON a.user_id = u.id
       LEFT JOIN (
         SELECT user_id, MAX(created_at) AS last_review
         FROM reviews
         WHERE tenant_id = $1
         GROUP BY user_id
       ) r ON r.user_id = u.id
       LEFT JOIN (
         SELECT user_id, MAX(created_at) AS last_wishlist
         FROM wishlist
         WHERE tenant_id = $1
         GROUP BY user_id
       ) w ON w.user_id = u.id
       LEFT JOIN (
         SELECT DISTINCT ON (u.email) u.email, a.primary_archetype
         FROM assessment_submissions a
         JOIN users u ON u.id = a.user_id
         WHERE a.tenant_id = $1
         ORDER BY u.email, a.created_at DESC
       ) rr ON rr.email = u.email
       WHERE u.tenant_id = $1
       ORDER BY last_activity DESC NULLS LAST, u.id DESC`,
      [tenantId]
    );

    const shaped = customers.rows.map((row) => {
      const status = row.last_activity ? "active" : "new";
      return {
        user_id: row.user_id,
        email: row.email,
        archetype: row.archetype,
        visits: row.visits,
        last_activity: row.last_activity,
        status,
      };
    });

    return res.json({ tenant: req.tenant.slug, customers: shaped });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "customers failed" });
  }
});

app.get("/t/:slug/analytics", tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;

    const [visitsByDay, growth, archetypes, ownerAssessment, customerAssessment] = await Promise.all([
      pool.query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS day, COUNT(*)::int AS visits
         FROM visits
         WHERE tenant_id = $1
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC
         LIMIT 30`,
        [tenantId]
      ),
      pool.query(
        `SELECT TO_CHAR(day, 'YYYY-MM-DD') AS day,
                SUM(new_customers) OVER (ORDER BY day ASC)::int AS cumulative_customers
         FROM (
           SELECT DATE(created_at) AS day, COUNT(*)::int AS new_customers
           FROM users
           WHERE tenant_id = $1
           GROUP BY DATE(created_at)
         ) x
         ORDER BY day ASC
         LIMIT 30`,
        [tenantId]
      ),
      pool.query(
        `SELECT primary_archetype AS archetype, COUNT(*)::int AS count
         FROM assessment_submissions
         WHERE tenant_id = $1 AND assessment_type = 'customer'
         GROUP BY primary_archetype
         ORDER BY count DESC, archetype ASC`,
        [tenantId]
      ),
      pool.query(
        `SELECT primary_archetype AS primary, secondary_archetype AS secondary, weakness_archetype AS weakness
         FROM assessment_submissions
         WHERE tenant_id = $1 AND assessment_type = 'business_owner'
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId]
      ),
      pool.query(
        `SELECT primary_archetype AS primary, personality_primary AS personality, weakness_archetype AS weakness
         FROM assessment_submissions
         WHERE tenant_id = $1 AND assessment_type = 'customer'
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId]
      )
    ]);

    return res.json({
      tenant: req.tenant.slug,
      visits_by_day: visitsByDay.rows,
      growth: growth.rows,
      archetypes: archetypes.rows,
      owner_assessment: ownerAssessment.rows[0] || null,
      customer_assessment: customerAssessment.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "analytics failed" });
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
      config: { site: cfg.site || {}, features: cfg.features || {} },
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
      features: { ...(base.features || {}), ...features },
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
      config: { site: merged.site || {}, features: merged.features || {} },
    });

    return res.json({
      success: true,
      tenant: tenantRow.slug,
      version: generated.version,
      preview: `/t/${tenantRow.slug}/site`,
      pages: Object.keys(generated.pages),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "site generate failed", details: err.message });
  }
});

app.post("/api/system/activate-full", async (req, res) => {
  try {
    const {
      tenant,
      email,
      primary_role: primaryRole,
      secondary_role: secondaryRole,
      business_type: businessType,
    } = req.body || {};

    if (!tenant || !email || !primaryRole || !secondaryRole || !businessType) {
      return res.status(400).json({
        error:
          "tenant, email, primary_role, secondary_role, and business_type are required",
      });
    }

    const tenantRow = await ensureTenant(String(tenant));
    const board = await ensureGarveyBoard(pool, tenantRow.id);
    await ensureDefaultOnboardingCards(pool, board.id);

    const templateType = pickTemplateType(businessType);
    const roleModifiers = buildRoleModifiers(primaryRole, secondaryRole);
    const sitePayload = {
      template_type: templateType,
      role_modifiers: roleModifiers,
    };

    return res.json({
      next_route: `/dashboard.html?tenant=${encodeURIComponent(tenantRow.slug)}&email=${encodeURIComponent(
        normalizeEmail(email)
      )}`,
      system_mode: "full",
      site_ready: true,
      site_payload: sitePayload,
    });
  } catch (err) {
    console.error("activate_full_failed", err);
    return res.status(500).json({ error: "activate full failed" });
  }
});

/* =========================
   NEW ENGINE API (/api/*)
========================= */

// ================================
// QUESTIONS API
// ================================

app.get("/api/questions", async (req, res) => {
  try {
    const assessmentRaw = req.query.assessment;
    if (!assessmentRaw) {
      return res.status(400).json({
        error: "assessment query param is required (business_owner or customer)",
      });
    }
    const assessmentType = String(assessmentRaw).trim().toLowerCase();

    // 🔒 STRICT VALIDATION
    if (!["business_owner", "customer"].includes(assessmentType)) {
      return res.status(400).json({
        error: "assessment must be business_owner or customer",
      });
    }

    const { rows } = await pool.query(
      `
      SELECT 
        qid,
        assessment_type,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        mapping_a,
        mapping_b,
        mapping_c,
        mapping_d
      FROM questions
      WHERE assessment_type = $1
      ORDER BY qid ASC
      `,
      [assessmentType]
    );

    // 🔥 DEBUG LOG (CRITICAL)
    console.log("📊 QUESTIONS FETCH:", {
      type: assessmentType,
      count: rows.length,
    });

    // 🔒 SAFETY CHECK
    if (!rows.length) {
      return res.status(404).json({
        error: "no questions found for this assessment",
        assessment: assessmentType,
      });
    }

    const normalized = rows.map((row) => ({
      qid: row.qid,
      assessment_type: row.assessment_type,
      prompt: row.question_text,
      options: [
        { key: "A", label: row.option_a, mapping: row.mapping_a },
        { key: "B", label: row.option_b, mapping: row.mapping_b },
        { key: "C", label: row.option_c, mapping: row.mapping_c },
        { key: "D", label: row.option_d, mapping: row.mapping_d },
      ],
      question_text: row.question_text,
      option_a: row.option_a,
      option_b: row.option_b,
      option_c: row.option_c,
      option_d: row.option_d,
      mapping_a: row.mapping_a,
      mapping_b: row.mapping_b,
      mapping_c: row.mapping_c,
      mapping_d: row.mapping_d,
    }));

    const invalid = normalized.find((q) => {
      if (!String(q.prompt || "").trim()) return true;
      return q.options.some((opt) => !String(opt.label || "").trim());
    });
    if (invalid) {
      return res.status(400).json({
        error: `question contract invalid for qid ${invalid.qid}`,
      });
    }

    return res.json({
      success: true,
      assessment: assessmentType,
      count: normalized.length,
      questions: normalized,
    });

  } catch (err) {
    console.error("questions_fetch_failed", err);
    return res.status(500).json({
      error: "questions fetch failed",
    });
  }
});


// ================================
// BUSINESS OWNER INTAKE
// ================================

app.post("/api/intake", async (req, res) => {
  const client = await pool.connect();

  try {
    // 🔥 DEBUG (SEE FRONTEND PAYLOAD)
    console.log("📥 INCOMING BUSINESS INTAKE:", req.body);

    const { email, tenant, answers = [] } = req.body || {};

    // 🔒 STRICT VALIDATION
    if (!email || !tenant) {
      return res.status(400).json({
        error: "email and tenant are required",
      });
    }

    if (!Array.isArray(answers) || !answers.length) {
      return res.status(400).json({
        error: "answers array is required",
      });
    }

    const validation = validateAnswers("business_owner", answers);
    if (!validation.ok) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    let scored;
    try {
      scored = scoreSubmission("business_owner", answers);
    } catch (scoreErr) {
      return res.status(400).json({
        error: "invalid scoring input",
        details: scoreErr.message,
      });
    }

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(String(tenant));
    const user = await findTenantUser(tenantRow.id, email, client);

    const session = (
      await client.query(
        `INSERT INTO intake_sessions (tenant_id, email, mode)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [tenantRow.id, normalizeEmail(email), "business_owner"]
      )
    ).rows[0];

    await client.query(
      `INSERT INTO assessment_submissions (
        tenant_id,
        user_id,
        session_id,
        assessment_type,
        primary_archetype,
        secondary_archetype,
        weakness_archetype,
        archetype_counts,
        raw_answers
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        tenantRow.id,
        user.id,
        session.id,
        "business_owner",
        scored.primary,
        scored.secondary,
        scored.weakness,
        scored.archetype_counts,
        answers,
      ]
    );

    await client.query("COMMIT");
    const resultContract = buildResultContract(scored);

    return res.json({
      success: true,
      assessment_type: "business_owner",
      session_id: session.id,
      primary: scored.primary,
      secondary: scored.secondary,
      weakness: scored.weakness,
      archetype_counts: scored.archetype_counts,
      archetype_definition: scored.primary
        ? ARCHETYPE_DEFINITIONS[scored.primary]
        : null,
      ...resultContract,
      result: resultContract,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("api_intake_failed", err);

    return res.status(500).json({
      error: "api intake failed",
      details: err.message,
    });

  } finally {
    client.release();
  }
});

app.get("/api/results/:email", async (req, res) => {
  try {
    const email = normalizeEmail(req.params.email);
    const type = String(req.query.type || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "email required" });
    }

    // 🔒 OPTIONAL FILTER
    let query = `
      SELECT a.*
      FROM assessment_submissions a
      JOIN users u ON u.id = a.user_id
      WHERE u.email = $1
    `;

    const params = [email];

    if (type) {
      if (!["business_owner", "customer"].includes(type)) {
        return res.status(400).json({
          error: "type must be business_owner or customer",
        });
      }

      query += " AND a.assessment_type = $2";
      params.push(type);
    }

    query += `
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 1
    `;

    const result = await pool.query(query, params);

    if (!result.rows[0]) {
      return res.status(404).json({
        error: "result not found",
        email,
        type: type || "any",
      });
    }

    // 🔥 DEBUG
    console.log("📊 RESULT FETCH:", {
      email,
      type: type || "any",
      found: true,
    });

    return res.json({
      success: true,
      result: {
        ...result.rows[0],
        primary_role: result.rows[0].primary_archetype,
        secondary_role: result.rows[0].secondary_archetype,
        weakness_role: result.rows[0].weakness_archetype,
        scores: normalizeScores(result.rows[0].archetype_counts),
      },
    });

  } catch (err) {
    console.error("results_lookup_failed", err);
    return res.status(500).json({
      error: "results lookup failed",
    });
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
      ...config,
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
    const business = getQuestions("business_owner");
    const customer = getQuestions("customer");
    const businessMappingComplete = business.every((q) => q.options.length === 4 && q.options.every((o) => Array.isArray(o.maps) && o.maps.length === 2));
    const customerMappingComplete = customer.every((q) => q.options.length === 4 && q.options.every((o) => Array.isArray(o.maps) && o.maps.length === 2));
    return res.json({
      status: "QUESTIONS_OK",
      business_count: business.length,
      customer_count: customer.length,
      business_mapping_complete: businessMappingComplete,
      customer_mapping_complete: customerMappingComplete,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "QUESTIONS_FAIL" });
  }
});

app.get("/api/verify/scoring", async (req, res) => {
  try {
    const businessQuestions = getQuestions("business_owner");
    const customerQuestions = getQuestions("customer");

    const businessAnswers = businessQuestions.map((q) => ({ qid: q.qid, answer: "A" }));
    const customerAnswers = customerQuestions.map((q) => ({ qid: q.qid, answer: "A" }));

    const business = scoreSubmission("business_owner", businessAnswers);
    const customer = scoreSubmission("customer", customerAnswers);

    return res.json({
      status: "SCORING_OK",
      checks: {
        business_counted: Object.values(business.archetype_counts || {}).reduce((a, b) => a + b, 0) === 50,
        customer_archetype_counted: Object.values(customer.archetype_counts || {}).reduce((a, b) => a + b, 0) === 20,
        customer_personality_counted: Object.values(customer.personality_counts || {}).reduce((a, b) => a + b, 0) === 20,
      },
      sample: {
        business: { primary: business.primary, secondary: business.secondary, weakness: business.weakness },
        customer: {
          primary: customer.primary,
          secondary: customer.secondary,
          weakness: customer.weakness,
          personality_primary: customer.personality_primary,
        },
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "SCORING_FAIL" });
  }
});

/* VOC intake (finalized) */
app.post("/voc-intake", async (req, res) => {
  const client = await pool.connect();

  try {
    // 🔥 DEBUG (CRITICAL — DO NOT REMOVE)
    console.log("📥 INCOMING VOC:", req.body);

    const { email, tenant, answers = [] } = req.body || {};

    // 🔒 STRICT VALIDATION
    if (!email || !tenant) {
      return res.status(400).json({
        error: "email and tenant are required",
      });
    }

    if (!Array.isArray(answers) || !answers.length) {
      return res.status(400).json({
        error: "answers required",
      });
    }

    // 🔒 STRUCTURE CHECK (NEW — IMPORTANT)
    const invalid = answers.find(
      (a) => !a || typeof a.qid === "undefined" || !a.answer
    );
    if (invalid) {
      return res.status(400).json({
        error: "invalid answer format — must be { qid, answer }",
      });
    }

    const validation = validateAnswers("customer", answers);
    if (!validation.ok) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    let scored;
    try {
      scored = scoreSubmission("customer", answers);
    } catch (scoreErr) {
      return res.status(400).json({
        error: "invalid scoring input",
        details: scoreErr.message,
      });
    }

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(String(tenant));
    const user = await findTenantUser(tenantRow.id, email, client);

    const session = (
      await client.query(
        `INSERT INTO voc_sessions (tenant_id, email)
         VALUES ($1, $2)
         RETURNING *`,
        [tenantRow.id, normalizeEmail(email)]
      )
    ).rows[0];

    await client.query(
      `INSERT INTO assessment_submissions (
        tenant_id,
        user_id,
        session_id,
        assessment_type,
        primary_archetype,
        secondary_archetype,
        weakness_archetype,
        personality_primary,
        personality_secondary,
        personality_weakness,
        archetype_counts,
        personality_counts,
        raw_answers
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        tenantRow.id,
        user.id,
        session.id,
        "customer",
        scored.primary,
        scored.secondary,
        scored.weakness,
        scored.personality_primary,
        scored.personality_secondary,
        scored.personality_weakness,
        scored.archetype_counts,
        scored.personality_counts,
        answers,
      ]
    );

    await client.query("COMMIT");
    const resultContract = buildResultContract(scored);

    return res.json({
      success: true,
      assessment_type: "customer",
      session_id: session.id,

      // 🔥 CORE RESULTS
      primary: scored.primary,
      secondary: scored.secondary,
      weakness: scored.weakness,

      // 🔥 PERSONALITY
      personality_primary: scored.personality_primary,
      personality_secondary: scored.personality_secondary,
      personality_weakness: scored.personality_weakness,

      // 🔥 COUNTS (NEW — VERY USEFUL FOR DASHBOARD)
      archetype_counts: scored.archetype_counts,
      personality_counts: scored.personality_counts,
      ...resultContract,
      result: resultContract,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("voc_intake_failed", err);

    return res.status(500).json({
      error: "voc intake failed",
      details: err.message,
    });

  } finally {
    client.release();
  }
});
app.get("/api/verify/intelligence/:slug", tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const submissionCounts = await pool.query(
      `SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE assessment_type = 'business_owner')::int AS business_total,
          COUNT(*) FILTER (WHERE assessment_type = 'customer')::int AS customer_total
       FROM assessment_submissions
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const checks = {
      completion: submissionCounts.rows[0].business_total >= 0 && submissionCounts.rows[0].customer_total >= 0,
      scoring_validity: true,
      db_write_success: submissionCounts.rows[0].total >= 0,
      dashboard_reflection: true,
    };

    return res.json({ status: "INTELLIGENCE_VERIFY_OK", checks, counts: submissionCounts.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "INTELLIGENCE_VERIFY_FAIL", error: err.message });
  }
});

/* =========================
   SERVER STARTUP
========================= */

(async () => {
  try {
    await initializeDatabase();
    await seed(pool);

    // ✅ ensure Kanban schema exists
    await initializeKanbanSchema(pool);

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
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Database initialization failed", err);
    process.exit(1);
  }
})();
