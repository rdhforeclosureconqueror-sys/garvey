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
const QRCode = require("qrcode");

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
  BUSINESS_ARCHETYPES,
  CUSTOMER_ARCHETYPES,
  getQuestions,
  scoreSubmission,
  validateAnswers,
} = require("./intelligenceEngine");
const {
  normalizeScores: normalizeScoreMap,
  scoresToPercents,
  deriveRoles,
  buildGuidance,
} = require("./resultEngine");
const { buildDashboardUrl } = require("./dashboardUrl");
const archetypeLibrary = require("../public/archetypes/library.json");
const {
  PERSONAL_ARCHETYPES,
  BUYER_ARCHETYPES,
  mapCustomerResultToArchetypes,
} = require("./archetypeMap");

// ✅ Kanban
const { initializeKanbanSchema } = require("./kanbanDb");
const kanbanRoutes = require("./kanbanRoutes");
const {
  ensureGarveyBoard,
  ensureDefaultOnboardingCards,
} = require("./kanbanRoutes");
const structureRoutes = require("./structureRoutes");
const foundationRoutes = require("./foundationRoutes");
const executionRoutes = require("./executionRoutes");
const intelligenceRoutes = require("./intelligenceRoutes");
const infrastructureRoutes = require("./infrastructureRoutes");
const routingRoutes = require("./routingRoutes");
const { generateSite } = require("./siteMaterializer");

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

function parseAdminEmails(raw) {
  const base = String(raw || "")
    .split(",")
    .map((x) => String(x || "").trim().toLowerCase())
    .filter(Boolean);
  if (!base.includes("rdhforeclosureconqueror@gmail.com")) {
    base.push("rdhforeclosureconqueror@gmail.com");
  }
  return new Set(base);
}

const ADMIN_EMAIL_ALLOWLIST = parseAdminEmails(
  process.env.ADMIN_EMAILS || "rdhforeclosureconqueror@gmail.com"
);

function isAdminEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(normalized);
}

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  return next();
});
app.use((req, res, next) => {
  const queryEmail = req.query && req.query.email;
  const headerEmail = req.headers["x-user-email"];
  const requestEmail = String(queryEmail || headerEmail || "").trim().toLowerCase();
  req.userEmail = requestEmail;
  req.isAdmin = isAdminEmail(requestEmail);
  return next();
});

app.use(express.static(path.join(__dirname, "..", "public")));
app.use('/dashboardnew', express.static(path.join(__dirname, '..', 'dashboardnew')));

app.get('/dashboard.html', (req, res) => {
  const tenant = String(req.query.tenant || "").trim();
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!req.isAdmin && (!tenant || !email)) {
    return res.status(400).send("Missing tenant/email. Open with ?tenant=...&email=... (optional &rid=...&cid=...).");
  }
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

function normalizeSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function randomSlug(prefix = "campaign") {
  return `${normalizeSlug(prefix) || "campaign"}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseAnswersInput(rawAnswers) {
  if (Array.isArray(rawAnswers)) return rawAnswers;
  if (typeof rawAnswers !== "string") return null;
  const trimmed = rawAnswers.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function sanitizeAnswers(answers) {
  return answers.map((item) => ({
    qid: String(item?.qid ?? "").trim(),
    answer: String(item?.answer ?? item?.option ?? item?.value ?? "").trim().toUpperCase(),
  }));
}

function buildResultContract(scored) {
  const scores = normalizeScoreMap(scored?.archetype_counts || {});
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

function buildNextSteps({ assessmentType, tenant }) {
  const t = encodeURIComponent(String(tenant || "").trim());
  if (assessmentType === "customer") {
    return [
      { label: "Claim Rewards", href: `/rewards_premium.html?tenant=${t}` },
      { label: "Send to Business Owner", href: `/results_customer.html?tenant=${t}` },
    ];
  }
  return [
    { label: "Open My Dashboard", href: `/dashboard.html?tenant=${t}` },
    { label: "Start GARVEY Pathway", href: `/garvey_premium.html?tenant=${t}` },
    { label: "View My Site", href: `/t/${t}/site` },
  ];
}

function isNonEmptyObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0;
}

function pickFirstNonEmptyMap(...candidates) {
  for (const candidate of candidates) {
    if (isNonEmptyObject(candidate)) return candidate;
  }
  return {};
}

function buildAssessmentResultPayload({
  assessmentType,
  tenantSlug,
  email,
  submission,
}) {
  const roleKeys = assessmentType === "customer" ? CUSTOMER_ARCHETYPES : BUSINESS_ARCHETYPES;
  const scores = normalizeScoreMap(submission?.archetype_counts || {}, roleKeys);
  const percents = scoresToPercents(scores);
  const roles = deriveRoles(scores);
  const guidance = buildGuidance({ ...roles, assessment_type: assessmentType });
  const base = {
    success: true,
    tenant: tenantSlug,
    email: normalizeEmail(email),
    cid: submission?.cid || submission?.campaign_slug || null,
    assessment_type: assessmentType,
    primary_role: roles.primary,
    secondary_role: roles.secondary,
    weakness_role: roles.weakness,
    scores,
    percents,
    guidance,
    next_steps: buildNextSteps({ assessmentType, tenant: tenantSlug }),
    result_id: submission?.id || null,
    created_at: submission?.created_at || null,
    raw_answers: submission?.raw_answers || null,
  };

  if (assessmentType === "customer") {
    const mapped = mapCustomerResultToArchetypes({
      archetype_counts: submission?.archetype_counts || {},
      personality_counts: submission?.personality_counts || {},
    });
    return {
      ...base,
      customer_archetypes: {
        primary: submission?.personal_primary_archetype || mapped.personal.primary,
        secondary: submission?.personal_secondary_archetype || mapped.personal.secondary,
        weakness: submission?.personal_weakness_archetype || mapped.personal.weakness,
        percents: pickFirstNonEmptyMap(
          submission?.personal_percents,
          mapped.personal.percentages,
          submission?.personal_counts
        ),
      },
      buyer_archetypes: {
        primary: submission?.buyer_primary_archetype || mapped.buyer.primary,
        secondary: submission?.buyer_secondary_archetype || mapped.buyer.secondary,
        weakness: submission?.buyer_weakness_archetype || mapped.buyer.weakness,
        percents: pickFirstNonEmptyMap(
          submission?.buyer_percents,
          mapped.buyer.percentages,
          submission?.buyer_counts
        ),
      },
    };
  }

  return base;
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

function requireTenantReadAccess(req, res) {
  if (req.isAdmin) return null;
  const email = normalizeEmail(req.query.email || req.headers["x-user-email"] || "");
  if (!email) {
    res.status(400).json({
      error: "email query parameter required for tenant dashboard access",
    });
    return false;
  }
  return email;
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
  if (!normalized) return "metropolis";

  const spaLike = ["spa", "salon", "barber", "beauty", "wellness", "medspa"];
  if (spaLike.some((token) => normalized.includes(token))) return "aroma-spa";

  const landingLike = ["coach", "consult", "agency", "freelance", "creator"];
  if (landingLike.some((token) => normalized.includes(token))) return "mobilefriendly";

  return "metropolis";
}

function buildRoleModifiers(primaryRole, secondaryRole) {
  const primary = String(primaryRole || "").trim().toLowerCase();
  const secondary = String(secondaryRole || "").trim().toLowerCase();
  return [...new Set([primary, secondary].filter(Boolean))];
}

function getLibraryEntry(archetypeKey) {
  const key = String(archetypeKey || "").trim().toLowerCase();
  return (archetypeLibrary.archetypes || []).find((entry) => entry.key === key) || null;
}

function emptyPersonalCounts() {
  return PERSONAL_ARCHETYPES.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function emptyBuyerCounts() {
  return BUYER_ARCHETYPES.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

/* =========================
   HEALTH + JOIN
========================= */

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/archetypes/library", async (req, res) => {
  return res.json(archetypeLibrary);
});

app.get("/api/archetypes/groups", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    const cid = String(req.query.cid || "").trim();
    if (!tenantSlug) return res.status(400).json({ error: "tenant is required" });
    const tenantRow = await getTenantBySlug(tenantSlug);
    if (!tenantRow) return res.status(404).json({ error: "tenant not found" });

    const where = ["tenant_id = $1", "assessment_type = 'customer'"];
    const params = [tenantRow.id];
    if (cid) {
      where.push(`COALESCE(cid, campaign_slug) = $${params.length + 1}`);
      params.push(cid);
    }

    const grouped = await pool.query(
      `SELECT personal_primary_archetype, buyer_primary_archetype
       FROM assessment_submissions
       WHERE ${where.join(" AND ")}`,
      params
    );

    const personalCounts = emptyPersonalCounts();
    const buyerCounts = emptyBuyerCounts();
    grouped.rows.forEach((row) => {
      const personalKey = String(row.personal_primary_archetype || "").trim().toLowerCase();
      const buyerKey = String(row.buyer_primary_archetype || "").trim().toLowerCase();
      if (personalCounts[personalKey] !== undefined) personalCounts[personalKey] += 1;
      if (buyerCounts[buyerKey] !== undefined) buyerCounts[buyerKey] += 1;
    });

    return res.json({
      tenant: tenantRow.slug,
      cid: cid || null,
      personal: Object.entries(personalCounts).map(([archetype, count]) => ({ archetype, count })),
      buyer: Object.entries(buyerCounts).map(([archetype, count]) => ({ archetype, count })),
    });
  } catch (err) {
    console.error("archetype_groups_failed", err);
    return res.status(500).json({ error: "archetype groups failed" });
  }
});

app.get("/api/archetypes/group", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    const cid = String(req.query.cid || "").trim();
    const archetype = String(req.query.archetype || "").trim().toLowerCase();
    const lens = String(req.query.lens || "").trim().toLowerCase();
    if (!tenantSlug || !archetype || !["personal", "buyer"].includes(lens)) {
      return res.status(400).json({ error: "tenant, lens, archetype are required" });
    }
    const tenantRow = await getTenantBySlug(tenantSlug);
    if (!tenantRow) return res.status(404).json({ error: "tenant not found" });
    const lensColumn = lens === "personal" ? "personal_primary_archetype" : "buyer_primary_archetype";
    const where = ["tenant_id = $1", "assessment_type = 'customer'", `LOWER(COALESCE(${lensColumn}, '')) = $2`];
    const params = [tenantRow.id, archetype];
    if (cid) {
      where.push(`COALESCE(cid, campaign_slug) = $${params.length + 1}`);
      params.push(cid);
    }

    const customers = await pool.query(
      `SELECT customer_email AS email, customer_name AS name, created_at,
              COALESCE(cid, campaign_slug) AS cid,
              personal_primary_archetype, personal_secondary_archetype, personal_weakness_archetype, personal_counts,
              buyer_primary_archetype, buyer_secondary_archetype, buyer_weakness_archetype, buyer_counts
       FROM assessment_submissions
       WHERE ${where.join(" AND ")}
       ORDER BY created_at DESC, id DESC`,
      params
    );
    const playbook = getLibraryEntry(archetype);
    return res.json({
      archetype,
      lens,
      playbook: playbook ? playbook[lens] : null,
      customers: customers.rows.map((row) => ({
        email: row.email,
        name: row.name,
        created_at: row.created_at,
        cid: row.cid,
        primary: lens === "personal" ? row.personal_primary_archetype : row.buyer_primary_archetype,
        secondary: lens === "personal" ? row.personal_secondary_archetype : row.buyer_secondary_archetype,
        weakness: lens === "personal" ? row.personal_weakness_archetype : row.buyer_weakness_archetype,
        counts: lens === "personal" ? row.personal_counts : row.buyer_counts,
      })),
    });
  } catch (err) {
    console.error("archetype_group_failed", err);
    return res.status(500).json({ error: "archetype group failed" });
  }
});

app.get("/api/archetypes/customer", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    const email = normalizeEmail(req.query.email || "");
    if (!tenantSlug || !email) return res.status(400).json({ error: "tenant and email are required" });
    const tenantRow = await getTenantBySlug(tenantSlug);
    if (!tenantRow) return res.status(404).json({ error: "tenant not found" });
    const latest = await pool.query(
      `SELECT *
       FROM assessment_submissions
       WHERE tenant_id = $1 AND assessment_type = 'customer' AND LOWER(COALESCE(customer_email, '')) = $2
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [tenantRow.id, email]
    );
    if (!latest.rows[0]) return res.status(404).json({ error: "customer not found" });
    return res.json({ tenant: tenantRow.slug, customer: latest.rows[0] });
  } catch (err) {
    console.error("archetype_customer_failed", err);
    return res.status(500).json({ error: "archetype customer failed" });
  }
});

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
app.use("/api/structure", structureRoutes({ pool, ensureTenant }));
app.use("/api/foundation", foundationRoutes({ pool, ensureTenant }));
app.use("/api/execution", executionRoutes({ pool, ensureTenant }));
app.use("/api/intelligence", intelligenceRoutes({ pool, ensureTenant }));
app.use("/api/infrastructure", infrastructureRoutes({ pool, ensureTenant }));
app.use("/api/routing", routingRoutes({ pool, ensureTenant }));
app.use("/api/stability", routingRoutes({ pool, ensureTenant }));

app.post("/api/campaigns/create", async (req, res) => {
  try {
    const { tenant, label, slug, source = null, medium = null } = req.body || {};
    if (!tenant || !label) return res.status(400).json({ error: "tenant and label are required" });
    const tenantRow = await ensureTenant(String(tenant));
    let candidate = normalizeSlug(slug) || randomSlug(label);
    let attempts = 0;
    while (attempts < 5) {
      const existing = await pool.query(
        "SELECT 1 FROM campaigns WHERE tenant_id = $1 AND slug = $2 LIMIT 1",
        [tenantRow.id, candidate]
      );
      if (!existing.rows[0]) break;
      candidate = randomSlug(label);
      attempts += 1;
    }

    const created = await pool.query(
      `INSERT INTO campaigns (tenant_id, slug, label, source, medium)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, slug, label, source, medium, created_at`,
      [tenantRow.id, candidate, String(label).trim(), source || null, medium || null]
    );
    const campaign = created.rows[0];
    return res.json({
      success: true,
      tenant: tenantRow.slug,
      campaign: { ...campaign, share_links: buildCampaignShareLinks(tenantRow.slug, campaign.slug) },
    });
  } catch (err) {
    console.error("campaign_create_failed", err);
    return res.status(500).json({ error: "campaign create failed", details: err.message });
  }
});

app.get("/api/campaigns/list", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    if (!tenantSlug) return res.status(400).json({ error: "tenant query param is required" });
    const ctx = await getTenantContextBySlug(tenantSlug);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });

    const rows = await pool.query(
      `SELECT c.*,
          COUNT(*) FILTER (WHERE e.event_type = 'visit')::int AS visits,
          COUNT(*) FILTER (WHERE e.event_type = 'customer_assessment')::int AS customer_assessments,
          COUNT(*) FILTER (WHERE e.event_type = 'owner_assessment')::int AS owner_assessments,
          COUNT(*) FILTER (WHERE e.event_type = 'checkin')::int AS checkins,
          COUNT(*) FILTER (WHERE e.event_type = 'review')::int AS reviews,
          COUNT(*) FILTER (WHERE e.event_type = 'referral')::int AS referrals,
          COUNT(*) FILTER (WHERE e.event_type = 'wishlist')::int AS wishlist,
          COUNT(*) FILTER (WHERE e.event_type = 'customer_share_result')::int AS shares,
          MAX(e.created_at) AS last_activity_at
       FROM campaigns c
       LEFT JOIN campaign_events e ON e.campaign_id = c.id
       WHERE c.tenant_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [ctx.tenant.id]
    );
    return res.json({
      success: true,
      tenant: ctx.tenant.slug,
      campaigns: rows.rows.map((row) => ({
        ...row,
        share_links: buildCampaignShareLinks(ctx.tenant.slug, row.slug),
      })),
    });
  } catch (err) {
    console.error("campaign_list_failed", err);
    return res.status(500).json({ error: "campaign list failed" });
  }
});

app.get("/api/campaigns/qr", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    const cid = String(req.query.cid || "").trim();
    const target = String(req.query.target || "voc").trim().toLowerCase();
    const format = String(req.query.format || "png").trim().toLowerCase();
    if (!tenantSlug || !cid) return res.status(400).json({ error: "tenant and cid are required" });
    if (!["voc", "rewards", "landing"].includes(target)) return res.status(400).json({ error: "invalid target" });
    if (!["png", "svg"].includes(format)) return res.status(400).json({ error: "invalid format" });
    const fullUrl = `${req.protocol}://${req.get("host")}${buildCampaignShareLinks(tenantSlug, cid)[target]}`;
    if (format === "svg") {
      const svg = await QRCode.toString(fullUrl, { type: "svg", width: 320, margin: 1 });
      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(svg);
    }
    const png = await QRCode.toBuffer(fullUrl, { type: "png", width: 320, margin: 1 });
    res.setHeader("Content-Type", "image/png");
    return res.send(png);
  } catch (err) {
    console.error("campaign_qr_failed", err);
    return res.status(500).json({ error: "campaign qr failed" });
  }
});

/* =========================
   REWARDS SERVICE HELPERS
========================= */

async function getTenantContextBySlug(slug) {
  const tenant = await getTenantBySlug(String(slug || "").trim());
  if (!tenant) return null;
  const tenantConfig = (await getTenantConfig(tenant.id)) || {};
  return { tenant, tenantConfig };
}

function buildCampaignShareLinks(tenantSlug, cid) {
  const query = `tenant=${encodeURIComponent(tenantSlug)}&cid=${encodeURIComponent(cid)}`;
  return {
    voc: `/voc.html?${query}`,
    rewards: `/rewards.html?${query}`,
    landing: `/index.html?${query}`,
  };
}

async function resolveCampaignForTenant(tenantId, cid, client = pool) {
  const slug = normalizeSlug(cid);
  if (!slug) return null;
  const result = await client.query(
    "SELECT * FROM campaigns WHERE tenant_id = $1 AND slug = $2 LIMIT 1",
    [tenantId, slug]
  );
  return result.rows[0] || null;
}

async function recordCampaignEvent({
  tenantId,
  campaignId = null,
  eventType,
  customerEmail = null,
  customerName = null,
  meta = {},
  client = pool,
}) {
  await client.query(
    `INSERT INTO campaign_events (
      tenant_id, campaign_id, event_type, customer_email, customer_name, meta
    ) VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, campaignId, eventType, customerEmail ? normalizeEmail(customerEmail) : null, customerName || null, meta]
  );
}

async function processCheckinReward({ tenant, tenantConfig, email, cid = null, resultId = null }) {
  const user = await findTenantUser(tenant.id, email);
  const campaign = await resolveCampaignForTenant(tenant.id, cid);
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? 5 : 0;

  await pool.query(
    "INSERT INTO visits (tenant_id, user_id, points_awarded, campaign_id, campaign_slug) VALUES ($1, $2, $3, $4, $5)",
    [tenant.id, user.id, pointsAdded, campaign?.id || null, campaign?.slug || null]
  );
  await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "checkin", customerEmail: email, meta: { result_id: String(resultId ?? "").trim() || null } });

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
    cid: campaign?.slug || normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null,
  };
}

async function processActionReward({ tenant, tenantConfig, email, actionType, cid = null, resultId = null }) {
  const user = await findTenantUser(tenant.id, email);
  const campaign = await resolveCampaignForTenant(tenant.id, cid);
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? (ACTION_POINTS[actionType] || 0) : 0;

  await pool.query(
    "INSERT INTO actions (tenant_id, user_id, action_type, points_awarded, campaign_id, campaign_slug) VALUES ($1, $2, $3, $4, $5, $6)",
    [tenant.id, user.id, actionType, pointsAdded, campaign?.id || null, campaign?.slug || null]
  );
  await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "action", customerEmail: email, meta: { action_type: actionType, result_id: String(resultId ?? "").trim() || null } });

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
    cid: campaign?.slug || normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null,
  };
}

async function processReviewReward({ tenant, tenantConfig, email, text, mediaType, cid = null, mediaNote = null, resultId = null }) {
  const user = await findTenantUser(tenant.id, email);
  const campaign = await resolveCampaignForTenant(tenant.id, cid);
  const mediaBonus = mediaType === "video" ? 10 : mediaType === "photo" ? 5 : 0;
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? (5 + mediaBonus) : 0;

  const reviewResult = await pool.query(
    `INSERT INTO reviews (tenant_id, user_id, text, media_type, points_awarded, campaign_id, campaign_slug, media_note)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [tenant.id, user.id, text, mediaType || null, pointsAdded, campaign?.id || null, campaign?.slug || null, mediaNote || null]
  );
  await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "review", customerEmail: email, meta: { media_type: mediaType || null, result_id: String(resultId ?? "").trim() || null } });

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
    cid: campaign?.slug || normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null,
  };
}

async function processReferralReward({ tenant, tenantConfig, email, referredEmail, cid = null, resultId = null }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const referrer = await findTenantUser(tenant.id, email, client);
    const referred = await findTenantUser(tenant.id, referredEmail, client);
    const campaign = await resolveCampaignForTenant(tenant.id, cid, client);
    const pointsEach = rewardPointsEnabled(tenantConfig) ? 10 : 0;

    await client.query(
      `INSERT INTO referrals (tenant_id, referrer_user_id, referred_user_id, points_awarded_each, campaign_id, campaign_slug)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (tenant_id, referrer_user_id, referred_user_id)
       DO NOTHING`,
      [tenant.id, referrer.id, referred.id, pointsEach, campaign?.id || null, campaign?.slug || null]
    );
    await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "referral", customerEmail: email, client, meta: { referred_email: normalizeEmail(referredEmail), result_id: String(resultId ?? "").trim() || null } });

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
      cid: campaign?.slug || normalizeSlug(cid) || null,
      crid: String(resultId ?? "").trim() || null,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function processWishlistReward({ tenant, email, productName, cid = null, resultId = null }) {
  const user = await findTenantUser(tenant.id, email);
  const campaign = await resolveCampaignForTenant(tenant.id, cid);
  const result = await pool.query(
    "INSERT INTO wishlist (tenant_id, user_id, product_name, campaign_id, campaign_slug) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [tenant.id, user.id, productName, campaign?.id || null, campaign?.slug || null]
  );
  await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "wishlist", customerEmail: email, meta: { product_name: productName, result_id: String(resultId ?? "").trim() || null } });
  return { success: true, tenant: tenant.slug, wishlist_entry: result.rows[0], cid: campaign?.slug || normalizeSlug(cid) || null, crid: String(resultId ?? "").trim() || null };
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
    const { email, cid } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    const payload = await processCheckinReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "checkin failed" });
  }
});

app.post("/t/:slug/action", tenantMiddleware, async (req, res) => {
  try {
    const { email, action_type: actionType, cid } = req.body || {};
    if (!email || !actionType) {
      return res.status(400).json({ error: "email and action_type are required" });
    }

    const payload = await processActionReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      actionType,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    const { email, text, media_type: mediaType, media_note: mediaNote, cid } = req.body || {};
    if (!email || !text) return res.status(400).json({ error: "email and text are required" });

    const payload = await processReviewReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      text,
      mediaType,
      mediaNote,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  try {
    const { email, referred_email: referredEmail, cid } = req.body || {};
    if (!email || !referredEmail) return res.status(400).json({ error: "email and referred_email are required" });
    const payload = await processReferralReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      referredEmail,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "referral failed" });
  }
});

app.post("/t/:slug/wishlist", tenantMiddleware, async (req, res) => {
  try {
    const { email, product_name: productName, cid } = req.body || {};
    if (!email || !productName) return res.status(400).json({ error: "email and product_name are required" });

    const payload = await processWishlistReward({
      tenant: req.tenant,
      email,
      productName,
      cid,
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
    const { tenant, email, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email) return res.status(400).json({ error: "tenant and email are required" });
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processCheckinReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards checkin failed" });
  }
});

app.post("/api/rewards/action", async (req, res) => {
  try {
    const { tenant, email, action_type: actionType, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !actionType) {
      return res.status(400).json({ error: "tenant, email and action_type are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processActionReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, actionType, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards action failed" });
  }
});

app.post("/api/rewards/review", async (req, res) => {
  try {
    const { tenant, email, text, media_type: mediaType, media_note: mediaNote, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !text) return res.status(400).json({ error: "tenant, email and text are required" });
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processReviewReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, text, mediaType, mediaNote, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards review failed" });
  }
});

app.post("/api/rewards/referral", async (req, res) => {
  try {
    const { tenant, email, referred_email: referredEmail, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !referredEmail) {
      return res.status(400).json({ error: "tenant, email and referred_email are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processReferralReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, referredEmail, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards referral failed" });
  }
});

app.post("/api/rewards/wishlist", async (req, res) => {
  try {
    const { tenant, email, product_name: productName, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !productName) {
      return res.status(400).json({ error: "tenant, email and product_name are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processWishlistReward({ tenant: ctx.tenant, email, productName, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "rewards wishlist failed" });
  }
});

app.get("/t/:slug/dashboard", tenantMiddleware, async (req, res) => {
  try {
    if (requireTenantReadAccess(req, res) === false) return;
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
    if (requireTenantReadAccess(req, res) === false) return;
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

app.get("/t/:slug/segments", tenantMiddleware, async (req, res) => {
  try {
    if (requireTenantReadAccess(req, res) === false) return;
    const tenantId = req.tenant.id;
    const [total, distribution, recent] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total_customer_assessments
         FROM assessment_submissions
         WHERE tenant_id = $1 AND assessment_type = 'customer'`,
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
        `SELECT u.email, a.primary_archetype AS primary_role, a.secondary_archetype AS secondary_role,
                a.weakness_archetype AS weakness_role, a.created_at
         FROM assessment_submissions a
         JOIN users u ON u.id = a.user_id
         WHERE a.tenant_id = $1 AND a.assessment_type = 'customer'
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 20`,
        [tenantId]
      ),
    ]);

    const totalCount = Number(total.rows[0]?.total_customer_assessments || 0);
    const distributionRows = distribution.rows;
    const distributionTotal = distributionRows.reduce((sum, row) => sum + Number(row.count || 0), 0) || 1;
    const distributionWithPercents = distributionRows.map((row) => ({
      archetype: row.archetype,
      count: Number(row.count || 0),
      percent: Math.round((Number(row.count || 0) / distributionTotal) * 100),
    }));

    return res.json({
      tenant: req.tenant.slug,
      total_customer_assessments: totalCount,
      distribution: distributionWithPercents,
      recent_results: recent.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "segments failed" });
  }
});

app.get("/t/:slug/campaigns/summary", tenantMiddleware, async (req, res) => {
  try {
    if (requireTenantReadAccess(req, res) === false) return;
    const tenantId = req.tenant.id;
    const campaignsResult = await pool.query(
      `SELECT c.id, c.slug, c.label,
          COUNT(*) FILTER (WHERE e.event_type = 'visit')::int AS visits,
          COUNT(*) FILTER (WHERE e.event_type = 'customer_assessment')::int AS customer_assessments,
          COUNT(*) FILTER (WHERE e.event_type = 'checkin')::int AS checkins,
          COUNT(*) FILTER (WHERE e.event_type = 'review')::int AS reviews,
          COUNT(*) FILTER (WHERE e.event_type = 'referral')::int AS referrals,
          COUNT(*) FILTER (WHERE e.event_type = 'wishlist')::int AS wishlist,
          COUNT(*) FILTER (WHERE e.event_type = 'customer_share_result')::int AS shares,
          MAX(e.created_at) AS last_activity_at
       FROM campaigns c
       LEFT JOIN campaign_events e ON e.campaign_id = c.id
       WHERE c.tenant_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [tenantId]
    );
    const campaigns = campaignsResult.rows.map((row) => ({
      slug: row.slug,
      label: row.label,
      counts: {
        visits: row.visits,
        customer_assessments: row.customer_assessments,
        checkins: row.checkins,
        reviews: row.reviews,
        referrals: row.referrals,
        wishlist: row.wishlist,
        shares: row.shares,
      },
      last_activity_at: row.last_activity_at,
    }));
    const totals = campaigns.reduce(
      (acc, c) => {
        Object.entries(c.counts).forEach(([k, v]) => { acc[k] = (acc[k] || 0) + Number(v || 0); });
        return acc;
      },
      { visits: 0, customer_assessments: 0, checkins: 0, reviews: 0, referrals: 0, wishlist: 0, shares: 0 }
    );
    return res.json({ success: true, tenant: req.tenant.slug, campaigns, totals });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "campaign summary failed" });
  }
});

app.get("/t/:slug/analytics", tenantMiddleware, async (req, res) => {
  try {
    if (requireTenantReadAccess(req, res) === false) return;
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
  try {
    const {
      tenant,
      template_type: templateTypeRaw,
      role_modifiers: roleModifiers,
      site = {},
    } = req.body || {};
    const templateType = templateTypeRaw || site.template_type || site.template_id;

    if (!tenant || !templateType) {
      return res.status(400).json({ error: "tenant and template_type are required" });
    }

    if (Object.keys(site || {}).length) {
      const tenantRow = await ensureTenant(String(tenant));
      const existing = await pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenantRow.id]);
      const base = { ...DEFAULT_TENANT_CONFIG, ...(existing.rows[0]?.config || {}) };
      const merged = sanitizeConfig({
        ...base,
        site: { ...(base.site || {}), ...site },
      });

      await pool.query(
        `INSERT INTO tenant_config (tenant_id, config, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (tenant_id)
         DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        [tenantRow.id, merged]
      );
    }

    const generatedSite = await generateSite({
      tenant,
      template_type: templateType,
      role_modifiers: Array.isArray(roleModifiers) ? roleModifiers : [],
    });

    return res.json(generatedSite);
  } catch (err) {
    if (err.code === "TEMPLATE_NOT_FOUND") {
      return res.status(404).json({ error: err.message });
    }
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
    let site;
    try {
      site = await generateSite({
        tenant: tenantRow.slug,
        template_type: sitePayload.template_type,
        role_modifiers: sitePayload.role_modifiers,
      });
    } catch (siteErr) {
      if (siteErr.code === "TEMPLATE_NOT_FOUND") {
        return res.status(404).json({
          next_route: `/dashboard.html?tenant=${encodeURIComponent(tenantRow.slug)}&email=${encodeURIComponent(
            normalizeEmail(email)
          )}`,
          system_mode: "full",
          site_ready: false,
          site_payload: sitePayload,
          error: siteErr.message,
        });
      }
      throw siteErr;
    }

    return res.json({
      next_route: site.site_url,
      system_mode: "full",
      site_ready: true,
      site_payload: sitePayload,
      site_url: site.site_url,
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

    const { email, tenant, name, cid, answers: rawAnswers = [] } = req.body || {};
    const answers = parseAnswersInput(rawAnswers);

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

    const normalizedAnswers = sanitizeAnswers(answers);
    const validation = validateAnswers("business_owner", normalizedAnswers);
    if (!validation.ok) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    let scored;
    try {
      scored = scoreSubmission("business_owner", normalizedAnswers);
    } catch (scoreErr) {
      return res.status(400).json({
        error: "invalid scoring input",
        details: scoreErr.message,
      });
    }
    const safeAnswers = JSON.stringify(normalizedAnswers);

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(String(tenant));
    const user = await findTenantUser(tenantRow.id, email, client);

    const campaign = await resolveCampaignForTenant(tenantRow.id, cid, client);
    const session = (
      await client.query(
        `INSERT INTO intake_sessions (tenant_id, email, name, mode, campaign_id, campaign_slug, source, medium)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [tenantRow.id, normalizeEmail(email), name || null, "business_owner", campaign?.id || null, campaign?.slug || null, campaign?.source || null, campaign?.medium || null]
      )
    ).rows[0];

    const submission = (await client.query(
      `INSERT INTO assessment_submissions (
        tenant_id,
        user_id,
        session_id,
        assessment_type,
        primary_archetype,
        secondary_archetype,
        weakness_archetype,
        archetype_counts,
        raw_answers,
        campaign_id,
        campaign_slug
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, created_at, raw_answers, archetype_counts`,
      [
        tenantRow.id,
        user.id,
        session.id,
        "business_owner",
        scored.primary,
        scored.secondary,
        scored.weakness,
        scored.archetype_counts,
        safeAnswers,
        campaign?.id || null,
        campaign?.slug || null,
      ]
    )).rows[0];
    await recordCampaignEvent({ tenantId: tenantRow.id, campaignId: campaign?.id || null, eventType: "owner_assessment", customerEmail: email, customerName: name, client });

    await client.query("COMMIT");
    const payload = buildAssessmentResultPayload({
      assessmentType: "business_owner",
      tenantSlug: tenantRow.slug,
      email,
      submission: {
        ...submission,
        archetype_counts: scored.archetype_counts,
        primary_archetype: scored.primary,
        secondary_archetype: scored.secondary,
        weakness_archetype: scored.weakness,
      },
    });
    const resultContract = buildResultContract(scored);

    return res.json({
      ...payload,
      session_id: session.id,
      primary: payload.primary_role,
      secondary: payload.secondary_role,
      weakness: payload.weakness_role,
      archetype_counts: payload.scores,
      archetype_definition: scored.primary
        ? ARCHETYPE_DEFINITIONS[scored.primary]
        : null,
      ...resultContract,
      result: payload,
      cid: campaign?.slug || normalizeSlug(cid) || null,
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
    const tenantSlug = String(req.query.tenant || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "email required" });
    }

    // 🔒 OPTIONAL FILTER
    let query = `
      SELECT
        a.*,
        t.slug AS tenant_slug,
        COALESCE(
          a.cid,
          a.campaign_slug,
          vs.campaign_slug,
          isess.campaign_slug,
          c.slug
        ) AS resolved_cid
      FROM assessment_submissions a
      JOIN users u ON u.id = a.user_id
      JOIN tenants t ON t.id = a.tenant_id
      LEFT JOIN voc_sessions vs ON vs.id = a.session_id
      LEFT JOIN intake_sessions isess ON isess.id = a.session_id
      LEFT JOIN campaigns c ON c.id = COALESCE(a.campaign_id, vs.campaign_id, isess.campaign_id)
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

    if (tenantSlug) {
      query += ` AND t.slug = $${params.length + 1}`;
      params.push(tenantSlug);
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

    const row = result.rows[0];
    const payload = buildAssessmentResultPayload({
      assessmentType: row.assessment_type,
      tenantSlug: row.tenant_slug,
      email,
      submission: {
        ...row,
        cid: row.resolved_cid || row.cid || row.campaign_slug || null,
      },
    });

    return res.json({
      ...payload,
      result: payload,
    });

  } catch (err) {
    console.error("results_lookup_failed", err);
    return res.status(500).json({
      error: "results lookup failed",
    });
  }
});

app.get("/api/results/customer/:crid", async (req, res) => {
  try {
    const crid = String(req.params.crid || "").trim();
    const tenantSlug = String(req.query.tenant || "").trim().toLowerCase();

    if (!crid) {
      return res.status(400).json({ error: "crid required" });
    }

    let query = `
      SELECT
        a.*,
        u.email,
        t.slug AS tenant_slug,
        COALESCE(
          a.cid,
          a.campaign_slug,
          vs.campaign_slug,
          isess.campaign_slug,
          c.slug
        ) AS resolved_cid
      FROM assessment_submissions a
      JOIN users u ON u.id = a.user_id
      JOIN tenants t ON t.id = a.tenant_id
      LEFT JOIN voc_sessions vs ON vs.id = a.session_id
      LEFT JOIN intake_sessions isess ON isess.id = a.session_id
      LEFT JOIN campaigns c ON c.id = COALESCE(a.campaign_id, vs.campaign_id, isess.campaign_id)
      WHERE a.id::text = $1
        AND a.assessment_type = 'customer'
    `;
    const params = [crid];

    if (tenantSlug) {
      query += ` AND t.slug = $${params.length + 1}`;
      params.push(tenantSlug);
    }

    query += " LIMIT 1";

    const result = await pool.query(query, params);
    if (!result.rows[0]) {
      return res.status(404).json({
        error: "result not found",
        crid,
        tenant: tenantSlug || null,
      });
    }

    const row = result.rows[0];
    const payload = buildAssessmentResultPayload({
      assessmentType: "customer",
      tenantSlug: row.tenant_slug,
      email: row.email,
      submission: {
        ...row,
        cid: row.resolved_cid || row.cid || row.campaign_slug || null,
      },
    });

    return res.json({
      ...payload,
      result: payload,
    });
  } catch (err) {
    console.error("results_lookup_crid_failed", err);
    return res.status(500).json({
      error: "results lookup failed",
    });
  }
});

app.post("/api/customer/share-result", async (req, res) => {
  try {
    const {
      tenant,
      customer_email: customerEmail,
      customer_name: customerName,
      cid,
      result_id: resultId,
      owner_email: ownerEmail,
      owner_rid: ownerRid,
    } = req.body || {};
    const normalizedResultId = String(resultId ?? "").trim();
    const normalizedOwnerEmail = normalizeEmail(ownerEmail);
    const normalizedOwnerRid = String(ownerRid ?? "").trim();
    if (!tenant || !customerEmail) return res.status(400).json({ error: "tenant and customer_email are required" });
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const campaign = await resolveCampaignForTenant(ctx.tenant.id, cid);
    await recordCampaignEvent({
      tenantId: ctx.tenant.id,
      campaignId: campaign?.id || null,
      eventType: "customer_share_result",
      customerEmail,
      customerName,
      meta: {
        result_id: normalizedResultId || null,
        campaign_slug: campaign?.slug || normalizeSlug(cid) || null,
        owner_email: normalizedOwnerEmail || null,
        owner_rid: normalizedOwnerRid || null,
      },
    });
    return res.json({
      success: true,
      dashboard_url: buildDashboardUrl({
        tenant: ctx.tenant.slug,
        email: customerEmail,
        cid: campaign?.slug || normalizeSlug(cid) || "",
        crid: normalizedResultId,
        owner_email: normalizedOwnerEmail,
        owner_rid: normalizedOwnerRid,
      }),
      cid: campaign?.slug || normalizeSlug(cid) || null,
      crid: normalizedResultId || null,
      owner_email: normalizedOwnerEmail || null,
      owner_rid: normalizedOwnerRid || null,
    });
  } catch (err) {
    console.error("customer_share_failed", err);
    return res.status(500).json({ error: "customer share failed" });
  }
});

app.get("/api/tenant/lookup", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant ?? "").trim();
    const query = String(req.query.q ?? "").trim();
    if (!tenantSlug || !query) {
      return res.status(400).json({ error: "tenant and q are required" });
    }
    const tenantRow = await getTenantBySlug(tenantSlug);
    if (!tenantRow) return res.status(404).json({ error: "tenant not found" });

    const pattern = `%${query.toLowerCase()}%`;
    const result = await pool.query(
      `SELECT DISTINCT email, name
       FROM (
         SELECT LOWER(u.email) AS email, NULL::TEXT AS name
         FROM users u
         WHERE u.tenant_id = $1
           AND LOWER(COALESCE(u.email, '')) LIKE $2
         UNION
         SELECT LOWER(s.email) AS email, s.name
         FROM intake_sessions s
         WHERE s.tenant_id = $1
           AND s.mode = 'business_owner'
           AND (
             LOWER(COALESCE(s.email, '')) LIKE $2
             OR LOWER(COALESCE(s.name, '')) LIKE $2
           )
       ) owner_candidates
       WHERE COALESCE(email, '') <> ''
       ORDER BY email
       LIMIT 10`,
      [tenantRow.id, pattern]
    );

    return res.json({
      tenant: tenantRow.slug,
      matches: result.rows.map((row) => ({
        email: normalizeEmail(row.email),
        name: String(row.name ?? "").trim() || null,
      })),
    });
  } catch (err) {
    console.error("tenant_lookup_failed", err);
    return res.status(500).json({ error: "tenant lookup failed" });
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
async function handleVocIntake(req, res) {
  const client = await pool.connect();

  try {
    // 🔥 DEBUG (CRITICAL — DO NOT REMOVE)
    console.log("📥 INCOMING VOC:", req.body);

    const { email, tenant, name, cid, answers: rawAnswers = [] } = req.body || {};
    const answers = parseAnswersInput(rawAnswers);

    // 🔒 STRICT VALIDATION
    const missingFields = [];
    if (!tenant) missingFields.push("tenant");
    if (!email) missingFields.push("email");
    if (!name) missingFields.push("name");
    if (!Array.isArray(answers) || !answers.length) missingFields.push("answers");
    if (missingFields.length) {
      return res.status(400).json({
        error: `missing required field(s): ${missingFields.join(", ")}`,
      });
    }

    // 🔒 STRUCTURE CHECK (NEW — IMPORTANT)
    const normalizedAnswers = sanitizeAnswers(answers);
    const invalid = normalizedAnswers.find((a) => !a || !a.qid || !a.answer);
    if (invalid) {
      return res.status(400).json({
        error: "invalid answer format — must be { qid, answer }",
      });
    }

    const validation = validateAnswers("customer", normalizedAnswers);
    if (!validation.ok) {
      return res.status(400).json({
        error: validation.error,
      });
    }

    let scored;
    try {
      scored = scoreSubmission("customer", normalizedAnswers);
    } catch (scoreErr) {
      return res.status(400).json({
        error: "invalid scoring input",
        details: scoreErr.message,
      });
    }
    const mappedArchetypes = mapCustomerResultToArchetypes(scored);
    const safeAnswers = JSON.stringify(normalizedAnswers);

    await client.query("BEGIN");

    const tenantRow = await ensureTenant(String(tenant));
    const user = await findTenantUser(tenantRow.id, email, client);

    const campaign = await resolveCampaignForTenant(tenantRow.id, cid, client);
    const session = (
      await client.query(
        `INSERT INTO voc_sessions (tenant_id, email, name, campaign_id, campaign_slug, source, medium)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [tenantRow.id, normalizeEmail(email), name || null, campaign?.id || null, campaign?.slug || null, campaign?.source || null, campaign?.medium || null]
      )
    ).rows[0];

    const submission = (await client.query(
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
        customer_name,
        customer_email,
        buyer_primary_archetype,
        buyer_secondary_archetype,
        buyer_weakness_archetype,
        buyer_counts,
        personal_primary_archetype,
        personal_secondary_archetype,
        personal_weakness_archetype,
        personal_counts,
        cid,
        raw_answers,
        campaign_id,
        campaign_slug
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      RETURNING id, created_at, raw_answers, archetype_counts, personality_counts`,
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
        name || null,
        normalizeEmail(email),
        mappedArchetypes.buyer.primary,
        mappedArchetypes.buyer.secondary,
        mappedArchetypes.buyer.weakness,
        mappedArchetypes.buyer.counts,
        mappedArchetypes.personal.primary,
        mappedArchetypes.personal.secondary,
        mappedArchetypes.personal.weakness,
        mappedArchetypes.personal.counts,
        campaign?.slug || normalizeSlug(cid) || null,
        safeAnswers,
        campaign?.id || null,
        campaign?.slug || null,
      ]
    )).rows[0];
    await recordCampaignEvent({ tenantId: tenantRow.id, campaignId: campaign?.id || null, eventType: "customer_assessment", customerEmail: email, customerName: name, client, meta: { result_id: String(submission.id ?? "").trim() || null, campaign_slug: campaign?.slug || normalizeSlug(cid) || null } });

    await client.query("COMMIT");
    const payload = buildAssessmentResultPayload({
      assessmentType: "customer",
      tenantSlug: tenantRow.slug,
      email,
      submission: {
        ...submission,
        archetype_counts: scored.archetype_counts,
        personality_counts: scored.personality_counts,
        primary_archetype: scored.primary,
        secondary_archetype: scored.secondary,
        weakness_archetype: scored.weakness,
        buyer_primary_archetype: mappedArchetypes.buyer.primary,
        buyer_secondary_archetype: mappedArchetypes.buyer.secondary,
        buyer_weakness_archetype: mappedArchetypes.buyer.weakness,
        buyer_counts: mappedArchetypes.buyer.counts,
        personal_primary_archetype: mappedArchetypes.personal.primary,
        personal_secondary_archetype: mappedArchetypes.personal.secondary,
        personal_weakness_archetype: mappedArchetypes.personal.weakness,
        personal_counts: mappedArchetypes.personal.counts,
      },
    });
    const resultContract = buildResultContract(scored);

    return res.json({
      ...payload,
      session_id: session.id,

      // 🔥 CORE RESULTS
      primary: payload.primary_role,
      secondary: payload.secondary_role,
      weakness: payload.weakness_role,

      // 🔥 PERSONALITY
      personality_primary: scored.personality_primary,
      personality_secondary: scored.personality_secondary,
      personality_weakness: scored.personality_weakness,

      // 🔥 COUNTS (NEW — VERY USEFUL FOR DASHBOARD)
      archetype_counts: payload.scores,
      personality_counts: scored.personality_counts,
      ...resultContract,
      result: payload,
      cid: campaign?.slug || normalizeSlug(cid) || null,
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
}

app.post("/voc-intake", handleVocIntake);
app.post("/api/vocIntake", handleVocIntake);
app.get("/api/verify/intelligence/:slug", tenantMiddleware, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const [kpiRes, scoreRes, gapRes, actionRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM intelligence_kpis WHERE tenant_id=$1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::int AS total FROM readiness_scores WHERE tenant_id=$1`, [tenantId]),
      pool.query(`SELECT COUNT(*)::int AS total FROM gap_records WHERE tenant_id=$1 AND status='open'`, [tenantId]),
      pool.query(`SELECT COUNT(*)::int AS total FROM recommended_actions WHERE tenant_id=$1`, [tenantId]),
    ]);

    const counts = {
      kpis: kpiRes.rows[0].total,
      readiness_scores: scoreRes.rows[0].total,
      open_gaps: gapRes.rows[0].total,
      actions: actionRes.rows[0].total,
    };

    const checks = {
      score_updates: counts.readiness_scores > 0,
      gap_detected: counts.open_gaps > 0,
      task_created: counts.actions > 0,
      completion_rules_met:
        counts.kpis > 0 && counts.readiness_scores > 0 && counts.open_gaps > 0,
    };

    return res.json({ status: "INTELLIGENCE_VERIFY_OK", checks, counts });
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
