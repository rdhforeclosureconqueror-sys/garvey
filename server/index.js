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
const crypto = require("crypto");
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
const { ACTIONS, ROLES, deriveActor, evaluatePolicy, deny, normalizeRole } = require("./accessControl");
const { EVENT_NAMES } = require("./events");
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
const evolutionRoutes = require("./evolutionRoutes");
const { generateSite } = require("./siteMaterializer");
const { getTapCrmMode } = require("./tapCrmFeature");
const { createTapCrmRouter, resolvePublicTap } = require("./tapCrmRoutes");
const { buildTapHubViewModel, renderTapHubPage, renderTapHubErrorPage } = require("./tapHubRenderer");

// Optional Site Generator (won't crash if missing)
let siteGenerator = null;
try {
  // eslint-disable-next-line global-require
  siteGenerator = require("./siteGenerator");
} catch (_) {
  siteGenerator = null;
}

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const TAP_CRM_MODE = getTapCrmMode();
const TAP_CRM_ROUTES_MOUNTED = TAP_CRM_MODE !== "off";
const OWNER_SESSION_COOKIE = "garvey_owner_session";
const OWNER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

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
const allowedOrigins = new Set(
  [
    "https://garveyfrontend.onrender.com",
    String(process.env.FRONTEND_ORIGIN || "").trim(),
  ].filter(Boolean)
);

function isAdminEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(normalized);
}

app.use(express.json({ limit: "1mb" }));

function applyCorsHeaders(req, res) {
  const origin = String(req.headers.origin || "").trim();
  const requestHost = String(req.headers.host || "").trim().toLowerCase();
  const requestProto = String(req.headers["x-forwarded-proto"] || req.protocol || "http")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const pathName = String(req.path || "").trim();
  let sameOrigin = false;
  try {
    if (origin) {
      const parsed = new URL(origin);
      sameOrigin = parsed.host.toLowerCase() === requestHost && parsed.protocol.replace(":", "").toLowerCase() === requestProto;
    }
  } catch (_) {
    sameOrigin = false;
  }
  const isCustomerFlowRoute =
    pathName.startsWith("/api/rewards/")
    || pathName === "/api/vocIntake"
    || pathName === "/voc-intake"
    || pathName === "/api/questions";
  if (!origin) return { allowed: true };
  if (!allowedOrigins.has(origin) && !sameOrigin && !isCustomerFlowRoute) return { allowed: false };

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-role, x-user-email, x-tenant-slug");
  return { allowed: true };
}

app.use((req, res, next) => {
  const cors = applyCorsHeaders(req, res);
  if (!cors.allowed) return res.status(403).json({ error: "Not allowed by CORS" });
  return next();
});
app.options("*", (req, res) => {
  const cors = applyCorsHeaders(req, res);
  if (!cors.allowed) return res.status(403).json({ error: "Not allowed by CORS" });
  return res.sendStatus(204);
});
app.use((req, res, next) => {
  const queryEmail = req.query && req.query.email;
  const headerEmail = req.headers["x-user-email"];
  const requestEmail = String(queryEmail || headerEmail || "").trim().toLowerCase();
  req.userEmail = requestEmail;
  req.isAdmin = isAdminEmail(requestEmail);
  return next();
});
app.use(async (req, res, next) => {
  try {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const token = String(cookies[OWNER_SESSION_COOKIE] || "").trim();
    if (!token) return next();

    const tokenHash = sha256(token);
    const sessionResult = await pool.query(
      `SELECT s.user_id, s.tenant_id, s.role, s.expires_at, u.email, t.slug AS tenant_slug, m.onboarding_complete
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN tenants t ON t.id = s.tenant_id
       LEFT JOIN tenant_memberships m
         ON m.tenant_id = s.tenant_id
        AND m.user_id = s.user_id
        AND m.role = s.role
       WHERE s.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );
    const session = sessionResult.rows[0];
    if (!session) return next();
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]).catch(() => {});
      res.setHeader("Set-Cookie", buildOwnerSessionCookie(req, "", 0));
      return next();
    }

    req.authActor = {
      userId: session.user_id,
      email: normalizeEmail(session.email),
      role: session.role,
      tenantSlug: session.tenant_slug,
      onboardingComplete: !!session.onboarding_complete,
      isAdmin: isAdminEmail(session.email),
    };
    return next();
  } catch (err) {
    console.error("owner_session_resolve_failed", err);
    return next();
  }
});

app.get('/dashboard.html', (req, res) => {
  const actor = deriveActor(req);
  if (actor.role === ROLES.BUSINESS_OWNER && actor.tenantSlug) {
    if (!actor.onboardingComplete) {
      const assessmentUrl = `/intake.html?assessment=business_owner&tenant=${encodeURIComponent(
        actor.tenantSlug
      )}&email=${encodeURIComponent(actor.email || "")}`;
      return res.redirect(302, assessmentUrl);
    }
    return res.sendFile(path.join(__dirname, '..', 'dashboardnew', 'index.html'));
  }
  const tenant = String(req.query.tenant || "").trim();
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!req.isAdmin && (!tenant || !email)) {
    return res.status(400).send("Missing tenant/email. Open with ?tenant=...&email=... (optional &rid=...&cid=...).");
  }
  return res.sendFile(path.join(__dirname, '..', 'dashboardnew', 'index.html'));
});

app.use(express.static(path.join(__dirname, "..", "public")));
app.use('/dashboardnew', express.static(path.join(__dirname, '..', 'dashboardnew')));

if (TAP_CRM_ROUTES_MOUNTED) {
  app.use('/api/tap-crm', createTapCrmRouter());
  app.get('/tap-crm', (req, res) => res.redirect(302, '/dashboard/tap-crm'));
  app.get('/dashboard/tap-crm', (req, res) => {
    const actor = deriveActor(req);
    if (!req.authActor || actor.role !== ROLES.BUSINESS_OWNER || !actor.tenantSlug) {
      const nextPath = `/dashboard/tap-crm${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`;
      return res.redirect(302, `/index.html?next=${encodeURIComponent(nextPath)}`);
    }
    if (!actor.onboardingComplete) {
      const assessmentUrl = `/intake.html?assessment=business_owner&tenant=${encodeURIComponent(
        actor.tenantSlug
      )}&email=${encodeURIComponent(actor.email || "")}&next=${encodeURIComponent("/dashboard/tap-crm")}`;
      return res.redirect(302, assessmentUrl);
    }
    return res.sendFile(path.join(__dirname, '..', 'tapcrm', 'index.html'));
  });
  app.get('/tap-crm/t/:tagCode', async (req, res) => {
    try {
      const resolved = await resolvePublicTap(pool, {
        tagCode: req.params.tagCode,
        requestMeta: {
          ip: req.ip,
          user_agent: req.headers['user-agent'] || '',
          source: 'public_route',
        },
      });

      if (resolved.ok) {
        const model = buildTapHubViewModel(resolved.body);
        return res.status(200).type('html').send(renderTapHubPage(model));
      }

      if (resolved.body && resolved.body.error === 'tag_not_found') {
        return res
          .status(404)
          .type('html')
          .send(renderTapHubErrorPage({
            statusCode: 404,
            title: 'Invalid tag',
            message: 'This tag link is not recognized. Please check the code and try again.',
          }));
      }

      if (resolved.body && (resolved.body.error === 'tag_inactive' || resolved.body.error === 'tag_disabled' || resolved.body.error === 'business_inactive')) {
        return res
          .status(resolved.status)
          .type('html')
          .send(renderTapHubErrorPage({
            statusCode: resolved.status,
            title: 'Tag unavailable',
            message: 'This tag is currently inactive or disabled. Please contact the business for help.',
          }));
      }

      return res
        .status(resolved.status)
        .type('html')
        .send(renderTapHubErrorPage({
          statusCode: resolved.status,
          title: 'Tap unavailable',
          message: 'This tag cannot be opened right now. Please try again shortly.',
        }));
    } catch (err) {
      console.error('tap_crm_public_route_failed', err);
      return res
        .status(500)
        .type('html')
        .send(renderTapHubErrorPage({
          statusCode: 500,
          title: 'Tap unavailable',
          message: 'Something went wrong while loading this tap.',
        }));
    }
  });
} else {
  app.get('/api/tap-crm/*', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.get('/tap-crm', (req, res) => res.status(404).send('Not found'));
  app.get('/tap-crm/t/:tagCode', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.get('/dashboard/tap-crm', (req, res) => res.status(404).send('Not found'));
}

/* =========================
   CONSTANTS + HELPERS
========================= */

const REWARD_POINTS = Object.freeze({
  checkin: 15,
  review: 25,
  referral: 30,
  wishlist: 15,
  voc: 50,
});
const REWARD_DAILY_LIMITS = Object.freeze({
  checkin: 1,
  review: 1,
  referral: 3,
  wishlist: 3,
});
const SUPPORT_CONTRIBUTIONS_ENABLED = false;
const OWNER_NOTIFICATION_FALLBACK_EMAIL = "rdhforeclosureconqueror@gmail.com";
const REVIEW_PROOF_STATUSES = new Set(["pending", "approved", "rejected"]);
const FEATURE_MODES = new Set(["off", "internal", "on"]);
const FEATURES = Object.freeze({
  CONSENT_V1: FEATURE_MODES.has(String(process.env.CONSENT_V1_MODE || process.env.CONSENT_V1 || "off").trim().toLowerCase())
    ? String(process.env.CONSENT_V1_MODE || process.env.CONSENT_V1 || "off").trim().toLowerCase()
    : "off",
  TAP_CRM: TAP_CRM_MODE,
});
const INTERNAL_TEST_USERS = new Set(
  String(process.env.INTERNAL_TEST_USERS || "")
    .split(",")
    .map((value) => normalizeEmail(value))
    .filter(Boolean)
);
const SPOTLIGHT_MODERATION_STATUSES = new Set(["pending", "approved", "removed", "flagged"]);
const SPOTLIGHT_CLAIM_STATUSES = new Set(["pending", "approved", "rejected"]);
const spotlightSubmissionRateLimit = new Map();
const CONTRIBUTION_LEDGER_ENTRY_TYPES = new Set(["contribution_add"]);

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

function logOwnerAccessTrace(trace) {
  logEvent("owner_access_trace", trace);
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

function rewardActionWindowSql() {
  return "DATE(created_at AT TIME ZONE 'UTC') = (NOW() AT TIME ZONE 'UTC')::date";
}

async function countDailyRewardActions({ tenantId, userId, actionType, client = pool }) {
  const specs = {
    checkin: { table: "visits", userColumn: "user_id", actionColumn: null },
    review: { table: "reviews", userColumn: "user_id", actionColumn: null },
    referral: { table: "referrals", userColumn: "referrer_user_id", actionColumn: null },
    wishlist: { table: "wishlist", userColumn: "user_id", actionColumn: null },
  };
  const spec = specs[actionType];
  if (!spec) return 0;
  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM ${spec.table}
     WHERE tenant_id = $1
       AND ${spec.userColumn} = $2
       AND ${rewardActionWindowSql()}`,
    [tenantId, userId]
  );
  return Number(result.rows[0]?.total || 0);
}

function buildDailyLimitReachedPayload({ tenant, actionType, points = 0, cid = null, resultId = null }) {
  return {
    success: true,
    tenant: tenant.slug,
    action_type: actionType,
    awarded: false,
    reason: "daily_limit_reached",
    points_added: 0,
    points: Number(points || 0),
    cid: normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null,
  };
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeConsentVersion(value) {
  const normalized = String(value || "").trim();
  return normalized || "v1";
}

function isInternalUser(email) {
  const normalized = normalizeEmail(email);
  return normalized ? INTERNAL_TEST_USERS.has(normalized) : false;
}

function consentTestOverride(req) {
  const queryValue = String(req?.query?.consent_test || "").trim().toLowerCase();
  const bodyValue = String(req?.body?.consent_test || "").trim().toLowerCase();
  const headerValue = String(req?.headers?.["x-consent-test"] || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(queryValue)
    || ["1", "true", "yes", "on"].includes(bodyValue)
    || ["1", "true", "yes", "on"].includes(headerValue);
}

function getConsentFeatureContext(req, email = "") {
  const mode = FEATURES.CONSENT_V1;
  if (mode === "on") return { mode, enabled: true, reason: "full_rollout" };
  if (mode === "off") return { mode, enabled: false, reason: "feature_off" };

  const actor = deriveActor(req);
  const candidateEmail = normalizeEmail(email || actor.email || req?.query?.email || req?.body?.email);
  if (consentTestOverride(req)) {
    return { mode, enabled: true, reason: "consent_test_override" };
  }
  if (isInternalUser(candidateEmail)) {
    return { mode, enabled: true, reason: "internal_user" };
  }
  return { mode, enabled: false, reason: "internal_mode_non_internal_user" };
}

function getTapCrmFeatureContext(req, email = "") {
  const mode = FEATURES.TAP_CRM;
  if (mode === "on") return { mode, enabled: true, reason: "full_rollout" };
  if (mode === "off") return { mode, enabled: false, reason: "feature_off" };

  const actor = deriveActor(req);
  const candidateEmail = normalizeEmail(email || actor.email || req?.query?.email || req?.body?.email);
  if (actor.isAdmin === true) {
    return { mode, enabled: true, reason: "admin_override" };
  }
  if (isInternalUser(candidateEmail)) {
    return { mode, enabled: true, reason: "internal_user" };
  }
  return { mode, enabled: false, reason: "internal_mode_non_internal_user" };
}

function normalizeSessionId(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 128) : null;
}

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.ip || req.socket?.remoteAddress || "").trim() || null;
}

function getRequestUserAgent(req) {
  return normalizeOptionalText(req.headers["user-agent"], 500);
}

async function logConsentEvent({
  client = pool,
  tenantId,
  userId = null,
  sessionId = null,
  consentType,
  consentVersion = "v1",
  eventType,
  value = null,
  consentIpAddress = null,
  consentUserAgent = null,
  metadata = {},
}) {
  await client.query(
    `INSERT INTO consent_event_log (
      tenant_id, user_id, session_id, consent_type, consent_version, event_type, value,
      consent_ip_address, consent_user_agent, metadata
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      tenantId,
      userId || null,
      normalizeSessionId(sessionId),
      String(consentType || "").trim(),
      normalizeConsentVersion(consentVersion),
      String(eventType || "").trim(),
      typeof value === "boolean" ? value : null,
      normalizeOptionalText(consentIpAddress, 120),
      normalizeOptionalText(consentUserAgent, 500),
      metadata && typeof metadata === "object" ? metadata : {},
    ]
  );
}

async function upsertConsentProfile({
  client = pool,
  tenantId,
  userId = null,
  sessionId = null,
  consentVersion = "v1",
  consentIpAddress = null,
  consentUserAgent = null,
  businessConsentAcceptedAt = null,
  networkConsentStatus = null,
  networkConsentUpdatedAt = null,
  profileDeletedAt = undefined,
  clearProfileDeleted = false,
}) {
  if (userId) {
    const existing = await client.query(
      `SELECT id FROM customer_consent_profiles WHERE tenant_id = $1 AND user_id = $2 LIMIT 1`,
      [tenantId, userId]
    );
    if (existing.rows[0]) {
      const updated = await client.query(
        `UPDATE customer_consent_profiles
         SET
           session_id = COALESCE($2, session_id),
           consent_version = COALESCE($3, consent_version),
           business_consent_required_accepted_at = COALESCE($4, business_consent_required_accepted_at),
           network_consent_status = COALESCE($5, network_consent_status),
           network_consent_updated_at = COALESCE($6, network_consent_updated_at),
           profile_deleted_at = CASE WHEN $10 THEN NULL ELSE COALESCE($7, profile_deleted_at) END,
           consent_ip_address = COALESCE($8, consent_ip_address),
           consent_user_agent = COALESCE($9, consent_user_agent),
           updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          existing.rows[0].id,
          normalizeSessionId(sessionId),
          normalizeConsentVersion(consentVersion),
          businessConsentAcceptedAt,
          networkConsentStatus,
          networkConsentUpdatedAt,
          profileDeletedAt === undefined ? null : profileDeletedAt,
          normalizeOptionalText(consentIpAddress, 120),
          normalizeOptionalText(consentUserAgent, 500),
          clearProfileDeleted === true,
        ]
      );
      return updated.rows[0];
    }
  }

  const inserted = await client.query(
    `INSERT INTO customer_consent_profiles (
      tenant_id, user_id, session_id, consent_version,
      business_consent_required_accepted_at, network_consent_status, network_consent_updated_at,
      consent_source_business_id, profile_deleted_at, consent_ip_address, consent_user_agent
    ) VALUES ($1,$2,$3,$4,$5,COALESCE($6,'private'),$7,$8,$9,$10,$11)
    RETURNING *`,
    [
      tenantId,
      userId || null,
      normalizeSessionId(sessionId),
      normalizeConsentVersion(consentVersion),
      businessConsentAcceptedAt,
      networkConsentStatus,
      networkConsentUpdatedAt,
      tenantId,
      profileDeletedAt === undefined ? null : profileDeletedAt,
      normalizeOptionalText(consentIpAddress, 120),
      normalizeOptionalText(consentUserAgent, 500),
    ]
  );
  return inserted.rows[0];
}

async function getConsentProfileBySubmission(client, submissionRow) {
  const tenantId = Number(submissionRow?.tenant_id || 0);
  const userId = Number(submissionRow?.user_id || 0);
  if (!tenantId || !userId) return null;
  const consent = await client.query(
    `SELECT * FROM customer_consent_profiles
     WHERE tenant_id = $1 AND user_id = $2
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [tenantId, userId]
  );
  return consent.rows[0] || null;
}

function canActorReadCustomerResult({ actor, submissionTenantSlug, submissionEmail, consentProfile, enforceConsent = true }) {
  if (!actor) return { allow: false, reason: "missing actor" };
  if (actor.isAdmin) return { allow: true, scope: "full" };
  if (!enforceConsent) {
    const policy = evaluatePolicy({
      actor,
      action: ACTIONS.RESULTS_READ_CUSTOMER,
      resourceTenantSlug: submissionTenantSlug,
    });
    if (!policy.allow) return { allow: false, reason: policy.reason };
    return { allow: true, scope: "full" };
  }
  if (consentProfile && consentProfile.profile_deleted_at) {
    return { allow: false, reason: "profile deleted" };
  }
  const actorRole = normalizeRole(actor.role);
  const actorTenant = String(actor.tenantSlug || "").trim().toLowerCase();
  const sameTenant = !!(actorTenant && actorTenant === String(submissionTenantSlug || "").trim().toLowerCase());
  const sameEmail = normalizeEmail(actor.email) && normalizeEmail(actor.email) === normalizeEmail(submissionEmail);

  if (actorRole === ROLES.CUSTOMER) {
    if (!sameEmail) return { allow: false, reason: "customer email mismatch" };
    return { allow: true, scope: "full" };
  }

  if (actorRole === ROLES.BUSINESS_OWNER) {
    if (sameTenant) return { allow: true, scope: "full" };
    if (consentProfile?.network_consent_status === "network") {
      return { allow: true, scope: "limited" };
    }
    return { allow: false, reason: "network consent is private" };
  }

  return { allow: false, reason: "actor role not allowed" };
}

function applyLimitedNetworkView(payload) {
  if (!payload || typeof payload !== "object") return payload;
  return {
    result_id: payload.result_id,
    assessment_type: payload.assessment_type,
    tenant: payload.tenant,
    cid: payload.cid || null,
    customer_archetypes: payload.customer_archetypes || {},
    buyer_archetypes: payload.buyer_archetypes || {},
    customer_name: null,
    customer_email: null,
    network_view: "limited_summary",
  };
}

async function assertRequiredBusinessConsent({ client = pool, tenantId, userId, enforceConsent = true }) {
  if (!enforceConsent) return;
  const result = await client.query(
    `SELECT business_consent_required_accepted_at, profile_deleted_at
     FROM customer_consent_profiles
     WHERE tenant_id = $1 AND user_id = $2
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [tenantId, userId]
  );
  const row = result.rows[0];
  if (!row || !row.business_consent_required_accepted_at) {
    const err = new Error("required consent must be accepted before assessment");
    err.statusCode = 403;
    throw err;
  }
  if (row.profile_deleted_at) {
    const err = new Error("profile is deleted; re-consent is required");
    err.statusCode = 403;
    throw err;
  }
}

function normalizeReviewRating(ratingRaw) {
  if (ratingRaw == null || String(ratingRaw).trim() === "") return null;
  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 6) {
    const err = new Error("rating must be an integer from 1 to 6");
    err.statusCode = 400;
    throw err;
  }
  return rating;
}

function normalizeReviewProofStatus(statusRaw) {
  const status = String(statusRaw || "").trim().toLowerCase();
  if (!REVIEW_PROOF_STATUSES.has(status)) {
    const err = new Error("proof_status must be pending, approved, or rejected");
    err.statusCode = 400;
    throw err;
  }
  return status;
}

function requireTextField(value, fieldName, maxLength = 2000) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    const err = new Error(`${fieldName} is required`);
    err.statusCode = 400;
    throw err;
  }
  if (normalized.length > maxLength) {
    const err = new Error(`${fieldName} exceeds max length ${maxLength}`);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function normalizeOptionalText(value, maxLength = 2000) {
  const normalized = String(value || "").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function mergeReviewMediaNote({ mediaNote, mediaUrl, mediaPhotoUrl, mediaVideoUrl }) {
  const existingNote = normalizeOptionalText(mediaNote, 1800);
  const payload = {
    media_url: normalizeOptionalText(mediaUrl, 1000),
    media_photo_url: normalizeOptionalText(mediaPhotoUrl, 1000),
    media_video_url: normalizeOptionalText(mediaVideoUrl, 1000),
  };
  const hasPayload = !!(payload.media_url || payload.media_photo_url || payload.media_video_url);
  if (!existingNote && !hasPayload) return null;
  if (!hasPayload) return existingNote;
  if (!existingNote) return JSON.stringify(payload);
  return JSON.stringify({ note: existingNote, ...payload });
}

function normalizeContributionAmount(value, fieldName = "amount") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    const err = new Error(`${fieldName} must be a positive number`);
    err.statusCode = 400;
    throw err;
  }
  const rounded = Math.round(numeric * 100) / 100;
  if (rounded <= 0) {
    const err = new Error(`${fieldName} must be at least 0.01`);
    err.statusCode = 400;
    throw err;
  }
  return rounded;
}

function normalizeNonNegativeAmount(value, fieldName = "amount") {
  if (value == null || String(value).trim() === "") return 0;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    const err = new Error(`${fieldName} must be zero or a positive number`);
    err.statusCode = 400;
    throw err;
  }
  return Math.round(numeric * 100) / 100;
}

function parseContributionAccessGate(config) {
  const gate = config?.site?.contribution_access_gate || {};
  const minimumRaw = Number(gate.minimum_balance);
  const minimumBalance = Number.isFinite(minimumRaw) && minimumRaw > 0
    ? Math.round(minimumRaw * 100) / 100
    : 0;
  return {
    enabled: gate.enabled === true,
    minimum_balance: minimumBalance,
  };
}

function contributionsEnabled(config) {
  return config?.features?.contributions_enabled !== false;
}

function assertContributionsEnabled(config) {
  if (contributionsEnabled(config)) return;
  const err = new Error("contributions are disabled for this tenant");
  err.statusCode = 403;
  throw err;
}

function assertContributionAccessGate({ tenantConfig, balance }) {
  const gate = parseContributionAccessGate(tenantConfig);
  if (!gate.enabled) return gate;
  if (Number(balance?.contribution_balance || 0) >= gate.minimum_balance) return gate;
  const err = new Error(`minimum contribution balance of ${gate.minimum_balance} is required`);
  err.statusCode = 403;
  throw err;
}

function assertContributionActorEmailBinding({ actor, requestedEmail }) {
  if (!actor?.email) {
    const err = new Error("authenticated actor email is required for contribution support allocation");
    err.statusCode = 401;
    throw err;
  }
  if (requestedEmail && normalizeEmail(requestedEmail) !== normalizeEmail(actor.email)) {
    const err = new Error("email does not match authenticated actor");
    err.statusCode = 403;
    throw err;
  }
  return normalizeEmail(actor.email);
}

async function getContributionBalance({ tenantId, userId, client = pool }) {
  const balanceResult = await client.query(
    `SELECT
       COALESCE((
         SELECT SUM(cl.amount)::numeric
         FROM contribution_ledger cl
         WHERE cl.tenant_id = $1
           AND cl.user_id = $2
           AND cl.entry_type = 'contribution_add'
       ), 0::numeric) AS total_contributions,
       COALESCE((
         SELECT SUM(sa.amount)::numeric
         FROM support_allocations sa
         WHERE sa.tenant_id = $1
           AND sa.user_id = $2
       ), 0::numeric) AS total_support_allocations`,
    [tenantId, userId]
  );
  const row = balanceResult.rows[0] || {};
  const totalContributions = Number(row.total_contributions || 0);
  const totalSupportAllocations = Number(row.total_support_allocations || 0);
  return {
    total_contributions: totalContributions,
    total_support_allocations: totalSupportAllocations,
    contribution_balance: Math.max(0, Math.round((totalContributions - totalSupportAllocations) * 100) / 100),
  };
}

function normalizeSpotlightRating(ratingRaw) {
  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 6) {
    const err = new Error("rating must be an integer from 1 to 6");
    err.statusCode = 400;
    throw err;
  }
  return rating;
}

function normalizeSpotlightModerationStatus(statusRaw) {
  const status = String(statusRaw || "").trim().toLowerCase();
  if (!SPOTLIGHT_MODERATION_STATUSES.has(status)) {
    const err = new Error("moderation_status must be pending, approved, removed, or flagged");
    err.statusCode = 400;
    throw err;
  }
  return status;
}

function normalizeSpotlightClaimStatus(statusRaw) {
  const status = String(statusRaw || "").trim().toLowerCase();
  if (!SPOTLIGHT_CLAIM_STATUSES.has(status)) {
    const err = new Error("claim_status must be pending, approved, or rejected");
    err.statusCode = 400;
    throw err;
  }
  return status;
}

function makeSpotlightBusinessDedupeKey({ businessName, link, location }) {
  const normalizedName = String(businessName || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const normalizedLink = String(link || "").toLowerCase().trim();
  const normalizedLocation = String(location || "").toLowerCase().replace(/\s+/g, " ").trim();
  return `${normalizedName}|${normalizedLink}|${normalizedLocation}`;
}

function enforceSpotlightRateLimit(req) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim() || "unknown";
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 12;
  const existing = (spotlightSubmissionRateLimit.get(ip) || []).filter((ts) => now - ts < windowMs);
  if (existing.length >= limit) {
    const err = new Error("too many spotlight submissions from this IP, try again later");
    err.statusCode = 429;
    throw err;
  }
  existing.push(now);
  spotlightSubmissionRateLimit.set(ip, existing);
}

async function isSpotlightEnabledForTenantId(tenantId) {
  const normalizedTenantId = Number(tenantId);
  if (!Number.isInteger(normalizedTenantId) || normalizedTenantId <= 0) return false;
  const cfg = await getTenantConfig(normalizedTenantId);
  return cfg?.features?.spotlight_enabled === true;
}

function parseCookieHeader(rawCookie = "") {
  return String(rawCookie || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const idx = pair.indexOf("=");
      if (idx <= 0) return acc;
      const key = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordHash(password, encodedHash) {
  const raw = String(encodedHash || "");
  const [scheme, salt, stored] = raw.split("$");
  if (scheme !== "scrypt" || !salt || !stored) return false;
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  const a = Buffer.from(stored, "hex");
  const b = Buffer.from(derived, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildOwnerSessionCookie(req, token, maxAgeSeconds) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").trim().toLowerCase();
  const isSecure = req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
  const sameSite = isSecure ? "None" : "Lax";
  const secureAttr = isSecure ? "; Secure" : "";
  const safeMaxAge = Math.max(0, Number(maxAgeSeconds) || 0);
  return `${OWNER_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}${secureAttr}; Max-Age=${safeMaxAge}`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
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

async function createCampaignRecord({
  tenantId,
  label,
  slug = null,
  source = null,
  medium = null,
  client = pool,
}) {
  const normalizedLabel = String(label || "").trim();
  if (!normalizedLabel) {
    const err = new Error("label is required");
    err.statusCode = 400;
    throw err;
  }
  let candidate = normalizeSlug(slug) || randomSlug(normalizedLabel);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await client.query(
      "SELECT 1 FROM campaigns WHERE tenant_id = $1 AND slug = $2 LIMIT 1",
      [tenantId, candidate]
    );
    if (!existing.rows[0]) break;
    candidate = randomSlug(normalizedLabel);
    attempts += 1;
  }
  const created = await client.query(
    `INSERT INTO campaigns (tenant_id, slug, label, source, medium)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, slug, label, source, medium, created_at`,
    [tenantId, candidate, normalizedLabel, source || null, medium || null]
  );
  return created.rows[0];
}

async function ensureOwnerDefaultCampaign({ tenantId, tenantSlug, client = pool }) {
  const existing = await client.query(
    `SELECT id, slug, label, source, medium, created_at
     FROM campaigns
     WHERE tenant_id = $1
       AND source = 'owner-default'
     ORDER BY created_at ASC
     LIMIT 1`,
    [tenantId]
  );
  if (existing.rows[0]) {
    return { campaign: existing.rows[0], created: false };
  }
  const created = await createCampaignRecord({
    tenantId,
    label: "Default QR",
    slug: `${normalizeSlug(tenantSlug) || "tenant"}-default-qr`,
    source: "owner-default",
    medium: "qr",
    client,
  });
  return { campaign: created, created: true };
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
      { label: "View My Results", href: `/results_customer.html?tenant=${t}` },
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

async function findTenantUser(tenantId, email, client = pool, name = "") {
  const normalized = normalizeEmail(email);
  const normalizedName = String(name || "").trim();

  const existing = await client.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND email = $2",
    [tenantId, normalized]
  );
  if (existing.rows[0]) {
    const existingUser = existing.rows[0];
    if (normalizedName && normalizedName !== String(existingUser.name || "").trim()) {
      const updated = await client.query(
        `UPDATE users
         SET name = $3
         WHERE tenant_id = $1
           AND email = $2
         RETURNING *`,
        [tenantId, normalized, normalizedName]
      );
      return updated.rows[0] || existingUser;
    }
    return existingUser;
  }

  const created = await client.query(
    `INSERT INTO users (tenant_id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, email)
     DO UPDATE SET email = EXCLUDED.email,
                   name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name)
     RETURNING *`,
    [tenantId, normalized, normalizedName || null]
  );

  return created.rows[0];
}

async function findTenantUserExisting(tenantId, email, client = pool) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const existing = await client.query(
    "SELECT * FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1",
    [tenantId, normalized]
  );
  return existing.rows[0] || null;
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

async function ownerEmailHasTenantAccess(tenantId, email, client = pool) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;
  const result = await client.query(
    `SELECT 1
     FROM users u
     LEFT JOIN tenant_memberships m
       ON m.user_id = u.id
      AND m.tenant_id = u.tenant_id
      AND m.role = 'business_owner'
     LEFT JOIN assessment_submissions a
       ON a.user_id = u.id
      AND a.tenant_id = u.tenant_id
      AND a.assessment_type = 'business_owner'
     LEFT JOIN intake_sessions s
       ON s.tenant_id = u.tenant_id
      AND LOWER(COALESCE(s.email, '')) = LOWER(u.email)
      AND s.mode = 'business_owner'
     WHERE u.tenant_id = $1
       AND LOWER(COALESCE(u.email, '')) = $2
       AND (m.id IS NOT NULL OR a.id IS NOT NULL OR s.id IS NOT NULL)
     LIMIT 1`,
    [tenantId, normalizedEmail]
  );
  return !!result.rows[0];
}

async function resolveOwnerRecipient({ tenantId, campaignId = null, client = pool }) {
  const params = [tenantId];
  let campaignClause = "";
  if (campaignId) {
    params.push(campaignId);
    campaignClause = `CASE WHEN src.campaign_id = $2 THEN 0 ELSE 1 END,`;
  }

  const result = await client.query(
    `SELECT src.owner_email, src.owner_rid
     FROM (
       SELECT
         LOWER(COALESCE(u.email, '')) AS owner_email,
         a.id::text AS owner_rid,
         a.campaign_id,
         a.created_at
       FROM assessment_submissions a
       JOIN users u ON u.id = a.user_id
       WHERE a.tenant_id = $1
         AND a.assessment_type = 'business_owner'
         AND COALESCE(u.email, '') <> ''

       UNION ALL

       SELECT
         LOWER(COALESCE(s.email, '')) AS owner_email,
         NULL::text AS owner_rid,
         s.campaign_id,
         s.created_at
       FROM intake_sessions s
       WHERE s.tenant_id = $1
         AND s.mode = 'business_owner'
         AND COALESCE(s.email, '') <> ''
     ) src
     ORDER BY ${campaignClause} src.created_at DESC
     LIMIT 1`,
    params
  );

  const ownerEmail = normalizeEmail(result.rows[0]?.owner_email || "");
  const ownerRid = String(result.rows[0]?.owner_rid || "").trim() || null;
  if (ownerEmail) {
    return { ownerEmail, ownerRid, usedFallback: false };
  }
  return {
    ownerEmail: OWNER_NOTIFICATION_FALLBACK_EMAIL,
    ownerRid: null,
    usedFallback: true,
  };
}

async function requireTenantReadAccess(req, res) {
  const actor = deriveActor(req);
  if (actor.role === ROLES.ANONYMOUS && !actor.isAdmin) {
    return deny(res, 401, "authentication required", "Provide x-user-role and tenant context");
  }

  const policy = evaluatePolicy({
    actor,
    action: ACTIONS.DASHBOARD_READ,
    resourceTenantSlug: req.tenant?.slug,
  });
  if (!policy.allow) {
    return deny(res, 403, "forbidden", policy.reason);
  }

  if (actor.isAdmin) return actor;

  if (actor.role === ROLES.BUSINESS_OWNER) {
    if (!actor.email) return deny(res, 400, "owner email required", "Provide email query param or x-user-email header");
    const hasAccess = await ownerEmailHasTenantAccess(req.tenant.id, actor.email);
    if (!hasAccess) return deny(res, 403, "forbidden", "owner access denied for tenant");
  }

  return actor;
}

function requirePolicyAction(req, res, { action, resourceTenantSlug }) {
  const actor = deriveActor(req);
  if (actor.role === ROLES.ANONYMOUS && !actor.isAdmin) {
    return { ok: false, actor: null, response: deny(res, 401, "authentication required", "Provide x-user-role and tenant context") };
  }
  const decision = evaluatePolicy({ actor, action, resourceTenantSlug });
  if (!decision.allow) {
    return { ok: false, actor, response: deny(res, 403, "forbidden", decision.reason) };
  }
  return { ok: true, actor, decision };
}

async function requireOwnerTenantMembership(req, res, tenantId, actor) {
  if (actor.isAdmin || actor.role !== ROLES.BUSINESS_OWNER) return true;
  const trustedSessionActor = req.authActor || null;
  if (
    trustedSessionActor
    && String(trustedSessionActor.userId || "").trim()
    && normalizeRole(trustedSessionActor.role) === ROLES.BUSINESS_OWNER
    && normalizeEmail(trustedSessionActor.email) === normalizeEmail(actor.email)
  ) {
    return true;
  }
  if (!actor.email) {
    deny(res, 400, "owner email required", "Provide email query param or x-user-email header");
    return false;
  }
  const hasAccess = await ownerEmailHasTenantAccess(tenantId, actor.email);
  if (!hasAccess) {
    deny(
      res,
      403,
      "forbidden",
      "owner access denied for tenant: sign in with owner session or complete owner onboarding/profile for this tenant"
    );
    return false;
  }
  return true;
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

app.get("/api/verify/runtime", (req, res) => {
  const commit =
    String(
      process.env.RENDER_GIT_COMMIT
      || process.env.RENDER_COMMIT
      || process.env.GIT_COMMIT
      || process.env.COMMIT_SHA
      || ""
    ).trim() || null;
  const service = String(process.env.RENDER_SERVICE_NAME || "").trim() || null;
  return res.json({
    status: "ok",
    service,
    commit,
    fail_open_contributions_logic: "config?.features?.contributions_enabled !== false",
  });
});

app.post("/api/owner/signup", async (req, res) => {
  const client = await pool.connect();
  try {
    const businessName = String(req.body?.business_name || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!businessName || !email || !password) {
      return res.status(400).json({ error: "business_name, email, and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "password must be at least 8 characters" });
    }

    await client.query("BEGIN");

    const baseSlug = normalizeSlug(businessName) || "business";
    let finalSlug = baseSlug;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const existing = await client.query("SELECT id FROM tenants WHERE slug = $1", [finalSlug]);
      if (!existing.rows[0]) break;
      finalSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const tenant = (
      await client.query("INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING *", [businessName, finalSlug])
    ).rows[0];

    const passwordHash = createPasswordHash(password);
    const user = (
      await client.query(
        `INSERT INTO users (email, tenant_id, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, tenant_id`,
        [email, tenant.id, passwordHash]
      )
    ).rows[0];

    await client.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role, onboarding_complete)
       VALUES ($1, $2, $3, FALSE)
       ON CONFLICT (tenant_id, user_id)
       DO UPDATE SET role = EXCLUDED.role
      `,
      [tenant.id, user.id, ROLES.BUSINESS_OWNER]
    );

    const defaultCampaign = await ensureOwnerDefaultCampaign({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      client,
    });
    console.info("owner_default_campaign_provisioned", {
      tenant: tenant.slug,
      owner_email: email,
      campaign_slug: defaultCampaign.campaign?.slug || null,
      created: !!defaultCampaign.created,
    });

    const token = createSessionToken();
    await client.query(
      `INSERT INTO auth_sessions (user_id, tenant_id, role, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' milliseconds')::interval)`,
      [user.id, tenant.id, ROLES.BUSINESS_OWNER, sha256(token), String(OWNER_SESSION_TTL_MS)]
    );

    await client.query("COMMIT");
    res.setHeader("Set-Cookie", buildOwnerSessionCookie(req, token, Math.floor(OWNER_SESSION_TTL_MS / 1000)));
    return res.status(201).json({
      success: true,
      tenant: tenant.slug,
      business_name: tenant.name || businessName,
      role: ROLES.BUSINESS_OWNER,
      onboarding_complete: false,
      default_campaign_slug: defaultCampaign.campaign?.slug || null,
      next_route: `/intake.html?assessment=business_owner&tenant=${encodeURIComponent(tenant.slug)}&email=${encodeURIComponent(email)}`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("owner_default_campaign_provision_failed", {
      error: err.message,
      business_name: String(req.body?.business_name || "").trim() || null,
      owner_email: normalizeEmail(req.body?.email || "") || null,
    });
    console.error("owner_signup_failed", err);
    return res.status(500).json({ error: "owner signup failed" });
  } finally {
    client.release();
  }
});

app.post("/api/owner/signin", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const found = await pool.query(
      `SELECT u.id AS user_id, u.email, u.password_hash, t.id AS tenant_id, t.slug AS tenant_slug, m.role, m.onboarding_complete
       FROM users u
       JOIN tenant_memberships m ON m.user_id = u.id
       JOIN tenants t ON t.id = m.tenant_id
       WHERE LOWER(COALESCE(u.email, '')) = $1
         AND m.role = $2
       ORDER BY u.created_at DESC`,
      [email, ROLES.BUSINESS_OWNER]
    );
    const account = found.rows.find(
      (row) => row.password_hash && verifyPasswordHash(password, row.password_hash)
    );
    if (!account) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const token = createSessionToken();
    await pool.query(
      `INSERT INTO auth_sessions (user_id, tenant_id, role, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' milliseconds')::interval)`,
      [account.user_id, account.tenant_id, account.role, sha256(token), String(OWNER_SESSION_TTL_MS)]
    );

    res.setHeader("Set-Cookie", buildOwnerSessionCookie(req, token, Math.floor(OWNER_SESSION_TTL_MS / 1000)));
    const nextRoute = account.onboarding_complete
      ? `/dashboard.html?tenant=${encodeURIComponent(account.tenant_slug)}&email=${encodeURIComponent(account.email)}`
      : `/intake.html?assessment=business_owner&tenant=${encodeURIComponent(account.tenant_slug)}&email=${encodeURIComponent(account.email)}`;
    return res.json({
      success: true,
      tenant: account.tenant_slug,
      role: account.role,
      onboarding_complete: !!account.onboarding_complete,
      next_route: nextRoute,
    });
  } catch (err) {
    console.error("owner_signin_failed", err);
    return res.status(500).json({ error: "owner signin failed" });
  }
});

app.post("/api/owner/signout", async (req, res) => {
  try {
    const cookies = parseCookieHeader(req.headers.cookie || "");
    const token = String(cookies[OWNER_SESSION_COOKIE] || "").trim();
    if (token) {
      await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [sha256(token)]);
    }
    res.setHeader("Set-Cookie", buildOwnerSessionCookie(req, "", 0));
    return res.json({ success: true });
  } catch (err) {
    console.error("owner_signout_failed", err);
    return res.status(500).json({ error: "owner signout failed" });
  }
});

app.get("/api/owner/session", async (req, res) => {
  const actor = deriveActor(req);
  if (actor.role !== ROLES.BUSINESS_OWNER || !actor.userId || !actor.tenantSlug) {
    return res.json({ authenticated: false });
  }
  let hasTenantOwnerAccess = false;
  try {
    const tenantRow = await getTenantBySlug(actor.tenantSlug);
    if (tenantRow) {
      hasTenantOwnerAccess = await ownerEmailHasTenantAccess(tenantRow.id, actor.email);
    }
  } catch (_) {
    hasTenantOwnerAccess = false;
  }
  return res.json({
    authenticated: true,
    tenant: actor.tenantSlug,
    email: actor.email,
    role: actor.role,
    is_admin: !!actor.isAdmin,
    has_tenant_owner_access: hasTenantOwnerAccess,
    onboarding_complete: !!actor.onboardingComplete,
  });
});

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
app.use("/api/evolution", evolutionRoutes({ pool, ensureTenant }));

app.post("/api/campaigns/create", async (req, res) => {
  let failurePoint = "init";
  const trace = {
    route: "/api/campaigns/create",
    requested_tenant: String(req.query?.tenant || req.body?.tenant || "").trim().toLowerCase() || null,
    requested_email: normalizeEmail(req.query?.email || req.body?.email || req.userEmail || req.headers["x-user-email"] || "") || null,
    actor_email: null,
    actor_role: null,
    actor_tenant: null,
    session_tenant: null,
    session_email: null,
    auth_actor_exists: false,
    policy_result: null,
    membership_result: null,
    denial_source: null,
  };
  console.info("campaign_create_enter", {
    event: "campaign_create_enter",
    requested_tenant: trace.requested_tenant,
    requested_email: trace.requested_email,
    body_tenant: String(req.body?.tenant || "").trim().toLowerCase() || null,
    body_email: normalizeEmail(req.body?.email || "") || null,
    body_label: String(req.body?.label || "").trim() || null,
    body_slug: String(req.body?.slug || "").trim().toLowerCase() || null,
    auth_actor_exists: !!req.authActor,
    client_trace: String(req.headers["x-garvey-campaign-trace"] || "").trim() || null,
  });
  try {
    failurePoint = "validate_input";
    const { tenant, label, slug, source = null, medium = null } = req.body || {};
    if (!label) {
      trace.denial_source = "campaigns/create#validate_input";
      console.warn("campaign_create_deny", {
        event: "campaign_create_deny",
        denial_source: trace.denial_source,
        reason: "label_missing",
        requested_tenant: trace.requested_tenant,
        requested_email: trace.requested_email,
      });
      logOwnerAccessTrace(trace);
      return res.status(400).json({ error: "label is required" });
    }

    failurePoint = "resolve_actor";
    const derivedActor = deriveActor(req);
    const sessionTenantSlug = String(req.authActor?.tenantSlug || "").trim().toLowerCase();
    const sessionEmail = normalizeEmail(req.authActor?.email || "");
    trace.auth_actor_exists = !!req.authActor;
    trace.session_tenant = sessionTenantSlug || null;
    trace.session_email = sessionEmail || null;

    failurePoint = "resolve_tenant";
    const requestedTenantSlug = String(req.query?.tenant || tenant || "").trim().toLowerCase();
    if (!requestedTenantSlug) {
      trace.denial_source = "campaigns/create#resolve_tenant";
      console.warn("campaign_create_deny", {
        event: "campaign_create_deny",
        denial_source: trace.denial_source,
        reason: "tenant_missing",
        requested_tenant: trace.requested_tenant,
        requested_email: trace.requested_email,
      });
      logOwnerAccessTrace(trace);
      return res.status(400).json({ error: "tenant is required" });
    }

    const tenantRow = await getTenantBySlug(requestedTenantSlug);
    if (!tenantRow) {
      trace.denial_source = "campaigns/create#resolve_tenant";
      console.warn("campaign_create_deny", {
        event: "campaign_create_deny",
        denial_source: trace.denial_source,
        reason: "tenant_not_found",
        requested_tenant: trace.requested_tenant,
        requested_email: trace.requested_email,
      });
      logOwnerAccessTrace(trace);
      return res.status(404).json({ error: "tenant not found" });
    }

    const actor = {
      ...derivedActor,
      tenantSlug: requestedTenantSlug || derivedActor.tenantSlug,
      email: trace.requested_email || derivedActor.email,
    };
    trace.actor_email = actor.email || null;
    trace.actor_role = actor.role || null;
    trace.actor_tenant = actor.tenantSlug || null;

    failurePoint = "policy_check";
    const policyDecision = evaluatePolicy({
      actor,
      action: ACTIONS.CAMPAIGN_CREATE,
      resourceTenantSlug: tenantRow.slug,
    });
    trace.policy_result = policyDecision.allow ? "allow" : `deny:${policyDecision.reason}`;
    if (!policyDecision.allow) {
      trace.denial_source = "accessControl.evaluatePolicy";
      console.warn("campaign_create_deny", {
        event: "campaign_create_deny",
        denial_source: trace.denial_source,
        reason: policyDecision.reason,
        requested_tenant: trace.requested_tenant,
        requested_email: trace.requested_email,
      });
      logOwnerAccessTrace(trace);
      return deny(res, 403, "forbidden", policyDecision.reason);
    }

    failurePoint = "membership_check";
    const membershipPassed = await requireOwnerTenantMembership(req, res, tenantRow.id, actor);
    trace.membership_result = membershipPassed ? "allow" : "deny";
    if (!membershipPassed) {
      trace.denial_source = "requireOwnerTenantMembership";
      console.warn("campaign_create_deny", {
        event: "campaign_create_deny",
        denial_source: trace.denial_source,
        reason: "membership_failed",
        requested_tenant: trace.requested_tenant,
        requested_email: trace.requested_email,
      });
      logOwnerAccessTrace(trace);
      return;
    }

    failurePoint = "create_campaign";
    const campaign = await createCampaignRecord({
      tenantId: tenantRow.id,
      label,
      slug,
      source,
      medium,
      client: pool,
    });
    return res.json({
      success: true,
      tenant: tenantRow.slug,
      campaign: { ...campaign, share_links: buildCampaignShareLinks(tenantRow.slug, campaign.slug) },
    });
  } catch (err) {
    logOwnerAccessTrace({
      ...trace,
      failure_point: failurePoint,
      denial_source: trace.denial_source || "campaign_create_exception",
      error: err.message,
    });
    console.error("campaign_create_failed", err);
    return res.status(500).json({ error: "campaign create failed", details: err.message });
  } finally {
    if (!trace.denial_source) {
      logOwnerAccessTrace({
        ...trace,
        policy_result: trace.policy_result || "allow",
        membership_result: trace.membership_result || "allow",
        denial_source: null,
      });
    }
  }
});

app.get("/api/campaigns/list", async (req, res) => {
  let failurePoint = "init";
  const trace = {
    route: "/api/campaigns/list",
    requested_tenant: String(req.query.tenant || "").trim().toLowerCase() || null,
    actor_email: null,
    actor_role: null,
    actor_tenant: null,
    policy_passed: null,
    membership_passed: null,
    query_result: null,
  };
  try {
    failurePoint = "resolve_actor";
    const actor = deriveActor(req);
    trace.actor_email = actor.email || null;
    trace.actor_role = actor.role || null;
    trace.actor_tenant = actor.tenantSlug || null;
    const tenantSlug = String(req.query.tenant || "").trim();
    const actorEmail = normalizeEmail(req.query.email || req.userEmail || req.headers["x-user-email"] || "");
    if (!tenantSlug) return res.status(400).json({ error: "tenant query param is required" });
    failurePoint = "resolve_tenant_context";
    const ctx = await getTenantContextBySlug(tenantSlug);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    failurePoint = "policy_check";
    const access = requirePolicyAction(req, res, {
      action: ACTIONS.CAMPAIGN_READ,
      resourceTenantSlug: ctx.tenant.slug,
    });
    trace.policy_passed = !!access.ok;
    if (!access.ok) return;
    failurePoint = "membership_check";
    const membershipPassed = await requireOwnerTenantMembership(req, res, ctx.tenant.id, access.actor);
    trace.membership_passed = membershipPassed;
    if (!membershipPassed) return;

    failurePoint = "campaign_list_query";
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
    const campaignRows = Array.isArray(rows?.rows) ? rows.rows : [];
    trace.query_result = campaignRows.length;
    console.log("campaign_list_query", {
      tenant: ctx.tenant.slug,
      email: actorEmail || null,
      result_length: campaignRows.length,
    });
    logOwnerAccessTrace(trace);
    return res.json({
      success: true,
      tenant: ctx.tenant.slug,
      campaigns: campaignRows.map((row) => ({
        ...row,
        share_links: buildCampaignShareLinks(ctx.tenant.slug, row.slug),
      })),
    });
  } catch (err) {
    logOwnerAccessTrace({
      ...trace,
      failure_point: failurePoint,
      error_message: err.message,
    });
    console.error("campaign_list_failed", err);
    return res.status(500).json({ error: "campaign list failed" });
  }
});

app.get("/api/campaigns/qr", async (req, res) => {
  try {
    const tenantSlug = String(req.query.tenant || "").trim();
    const cid = String(req.query.cid || "").trim();
    const target = String(req.query.target || "rewards").trim().toLowerCase();
    const format = String(req.query.format || "png").trim().toLowerCase();
    if (!tenantSlug || !cid) return res.status(400).json({ error: "tenant and cid are required" });
    if (!["voc", "rewards", "landing"].includes(target)) return res.status(400).json({ error: "invalid target" });
    if (!["png", "svg"].includes(format)) return res.status(400).json({ error: "invalid format" });
    const ctx = await getTenantContextBySlug(tenantSlug);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const access = requirePolicyAction(req, res, { action: ACTIONS.QR_GENERATE, resourceTenantSlug: ctx.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, ctx.tenant.id, access.actor))) return;
    const campaign = await resolveCampaignForTenantStrict(ctx.tenant.id, cid);
    const fullUrl = `${req.protocol}://${req.get("host")}${buildCampaignShareLinks(tenantSlug, campaign.slug)[target]}`;
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
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "campaign qr failed" });
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

async function resolveCampaignForTenantStrict(tenantId, cid, client = pool) {
  const slug = normalizeSlug(cid);
  if (!slug) return null;
  const campaign = await resolveCampaignForTenant(tenantId, slug, client);
  if (!campaign) {
    const err = new Error("invalid campaign id for tenant");
    err.statusCode = 400;
    throw err;
  }
  return campaign;
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

async function hasApprovedReviewProofForProduct(tenantId, productId, client = pool) {
  const result = await client.query(
    `SELECT 1
     FROM reviews
     WHERE tenant_id = $1
       AND product_id = $2
       AND proof_status = 'approved'
     LIMIT 1`,
    [tenantId, productId]
  );
  return !!result.rows[0];
}

async function processCheckinReward({ tenant, tenantConfig, email, name = "", cid = null, resultId = null }) {
  const user = await findTenantUser(tenant.id, email, pool, name);
  const campaign = await resolveCampaignForTenantStrict(tenant.id, cid);
  const existingToday = await countDailyRewardActions({ tenantId: tenant.id, userId: user.id, actionType: "checkin" });
  if (existingToday >= REWARD_DAILY_LIMITS.checkin) {
    return {
      ...buildDailyLimitReachedPayload({ tenant, actionType: "checkin", points: user.points, cid: campaign?.slug || cid, resultId }),
      event: "checkin",
    };
  }
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? REWARD_POINTS.checkin : 0;

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
    email: user.email,
    name: user.name || null,
    event: "checkin",
    points_added: pointsAdded,
    points: updatedUser.rows[0].points,
    cid: campaign?.slug || normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null,
  };
}

async function processActionReward({ tenant, tenantConfig, email, name = "", actionType, cid = null, resultId = null }) {
  const user = await findTenantUser(tenant.id, email, pool, name);
  const campaign = await resolveCampaignForTenantStrict(tenant.id, cid);
  const normalizedActionType = String(actionType || "").trim().toLowerCase();
  const dailyLimit = REWARD_DAILY_LIMITS[normalizedActionType];
  if (dailyLimit) {
    const existingToday = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM actions
       WHERE tenant_id = $1
         AND user_id = $2
         AND action_type = $3
         AND ${rewardActionWindowSql()}`,
      [tenant.id, user.id, normalizedActionType]
    );
    if (Number(existingToday.rows[0]?.total || 0) >= dailyLimit) {
      return buildDailyLimitReachedPayload({
        tenant,
        actionType: normalizedActionType,
        points: user.points,
        cid: campaign?.slug || cid,
        resultId,
      });
    }
  }
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? (REWARD_POINTS[normalizedActionType] || 0) : 0;

  await pool.query(
    "INSERT INTO actions (tenant_id, user_id, action_type, points_awarded, campaign_id, campaign_slug) VALUES ($1, $2, $3, $4, $5, $6)",
    [tenant.id, user.id, normalizedActionType, pointsAdded, campaign?.id || null, campaign?.slug || null]
  );
  await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "action", customerEmail: email, meta: { action_type: normalizedActionType, result_id: String(resultId ?? "").trim() || null } });

  const updatedUser = await pool.query(
    "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
    [pointsAdded, tenant.id, user.id]
  );

  return {
    success: true,
    tenant: tenant.slug,
    email: user.email,
    name: user.name || null,
    action_type: normalizedActionType,
    points_added: pointsAdded,
    points: updatedUser.rows[0].points,
    cid: campaign?.slug || normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null,
  };
}

async function processReviewReward({
  tenant,
  tenantConfig,
  email,
  name = "",
  text,
  mediaType,
  cid = null,
  mediaNote = null,
  mediaUrl = null,
  mediaPhotoUrl = null,
  mediaVideoUrl = null,
  resultId = null,
  productId = null,
  rating = null,
}) {
  const user = await findTenantUser(tenant.id, email, pool, name);
  const campaign = await resolveCampaignForTenantStrict(tenant.id, cid);
  const existingToday = await countDailyRewardActions({ tenantId: tenant.id, userId: user.id, actionType: "review" });
  if (existingToday >= REWARD_DAILY_LIMITS.review) {
    return buildDailyLimitReachedPayload({
      tenant,
      actionType: "review",
      points: user.points,
      cid: campaign?.slug || cid,
      resultId,
    });
  }
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? REWARD_POINTS.review : 0;
  const normalizedRating = normalizeReviewRating(rating);
  let normalizedProductId = null;
  if (Number.isInteger(Number(productId)) && Number(productId) > 0) {
    const productCheck = await pool.query("SELECT id FROM products WHERE tenant_id = $1 AND id = $2 LIMIT 1", [
      tenant.id,
      Number(productId),
    ]);
    if (!productCheck.rows[0]) {
      const err = new Error("product not found for tenant");
      err.statusCode = 400;
      throw err;
    }
    normalizedProductId = Number(productId);
  }

  const reviewResult = await pool.query(
    `INSERT INTO reviews (tenant_id, user_id, product_id, text, media_type, points_awarded, campaign_id, campaign_slug, media_note, rating, proof_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
     RETURNING *`,
    [
      tenant.id,
      user.id,
      normalizedProductId,
      text,
      mediaType || null,
      pointsAdded,
      campaign?.id || null,
      campaign?.slug || null,
      mergeReviewMediaNote({ mediaNote, mediaUrl, mediaPhotoUrl, mediaVideoUrl }),
      normalizedRating,
    ]
  );
  await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "review", customerEmail: email, meta: { media_type: mediaType || null, result_id: String(resultId ?? "").trim() || null, product_id: normalizedProductId } });
  if (normalizedProductId) {
    await recordCampaignEvent({
      tenantId: tenant.id,
      campaignId: campaign?.id || null,
      eventType: EVENT_NAMES.REVIEW_PRODUCT_LINKED,
      customerEmail: email,
      meta: { product_id: normalizedProductId, review_id: reviewResult.rows[0].id },
    });
  }

  const updatedUser = await pool.query(
    "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3 RETURNING points",
    [pointsAdded, tenant.id, user.id]
  );

  return {
    success: true,
    tenant: tenant.slug,
    email: user.email,
    name: user.name || null,
    review: reviewResult.rows[0],
    points_added: pointsAdded,
    points: updatedUser.rows[0].points,
    cid: campaign?.slug || normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null,
  };
}

async function processReferralReward({ tenant, tenantConfig, email, name = "", referredEmail, cid = null, resultId = null }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const referrer = await findTenantUser(tenant.id, email, client, name);
    const referred = await findTenantUser(tenant.id, referredEmail, client);
    const campaign = await resolveCampaignForTenantStrict(tenant.id, cid, client);
    const referralCount = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM referrals
       WHERE tenant_id = $1
         AND referrer_user_id = $2
         AND ${rewardActionWindowSql()}`,
      [tenant.id, referrer.id]
    );
    if (Number(referralCount.rows[0]?.total || 0) >= REWARD_DAILY_LIMITS.referral) {
      await client.query("COMMIT");
      return buildDailyLimitReachedPayload({
        tenant,
        actionType: "referral",
        points: referrer.points,
        cid: campaign?.slug || cid,
        resultId,
      });
    }
    const pointsEach = rewardPointsEnabled(tenantConfig) ? REWARD_POINTS.referral : 0;

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
      email: referrer.email,
      name: referrer.name || null,
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

async function processWishlistReward({ tenant, tenantConfig, email, name = "", productName, cid = null, resultId = null }) {
  const user = await findTenantUser(tenant.id, email, pool, name);
  const campaign = await resolveCampaignForTenantStrict(tenant.id, cid);
  const existingToday = await countDailyRewardActions({ tenantId: tenant.id, userId: user.id, actionType: "wishlist" });
  if (existingToday >= REWARD_DAILY_LIMITS.wishlist) {
    return buildDailyLimitReachedPayload({
      tenant,
      actionType: "wishlist",
      points: user.points,
      cid: campaign?.slug || cid,
      resultId,
    });
  }
  const pointsAdded = rewardPointsEnabled(tenantConfig) ? REWARD_POINTS.wishlist : 0;
  const result = await pool.query(
    "INSERT INTO wishlist (tenant_id, user_id, product_name, campaign_id, campaign_slug) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [tenant.id, user.id, productName, campaign?.id || null, campaign?.slug || null]
  );
  await recordCampaignEvent({ tenantId: tenant.id, campaignId: campaign?.id || null, eventType: "wishlist", customerEmail: email, meta: { product_name: productName, result_id: String(resultId ?? "").trim() || null } });
  await pool.query(
    "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3",
    [pointsAdded, tenant.id, user.id]
  );
  const updatedUser = await pool.query(
    "SELECT points FROM users WHERE tenant_id = $1 AND id = $2",
    [tenant.id, user.id]
  );
  return {
    success: true,
    tenant: tenant.slug,
    email: user.email,
    name: user.name || null,
    wishlist_entry: result.rows[0],
    points_added: pointsAdded,
    points: Number(updatedUser.rows[0]?.points || 0),
    cid: campaign?.slug || normalizeSlug(cid) || null,
    crid: String(resultId ?? "").trim() || null
  };
}

async function fetchRewardsStatus({ tenant, tenantConfig, email, name = "" }) {
  const googleReviewUrl = normalizeOptionalText(tenantConfig?.site?.google_review_url, 1200);
  if (!email) {
    const totals = await pool.query(
      `SELECT COUNT(*)::int AS users, COALESCE(SUM(points),0)::int AS total_points
       FROM users WHERE tenant_id = $1`,
      [tenant.id]
    );
    return {
      success: true,
      tenant: tenant.slug,
      email: null,
      name: null,
      user: null,
      totals: totals.rows[0],
      google_review_url: googleReviewUrl,
      eligible_rewards: ["checkin", "action", "review", "referral", "wishlist", "contribution"],
    };
  }

  const user = await findTenantUser(tenant.id, email, pool, name);
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
    email: user.email,
    name: user.name || null,
    user: { email: user.email, points: user.points, name: user.name || null },
    google_review_url: googleReviewUrl,
    recent_events: recent.rows,
    eligible_rewards: ["checkin", "action", "review", "referral", "wishlist", "contribution"],
  };
}

async function fetchRewardsHistory({ tenant, email, limit = 50 }) {
  if (!email) {
    return {
      success: true,
      tenant: tenant.slug,
      email: null,
      name: null,
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
    email: user.email,
    name: user.name || null,
    user: { email: user.email, points: user.points },
    history: history.rows,
  };
}

async function fetchContributionStatus({ tenant, tenantConfig, email }) {
  assertContributionsEnabled(tenantConfig);
  if (!email) {
    return {
      success: true,
      tenant: tenant.slug,
      contribution_balance: 0,
      user: null,
      support_history: [],
      contribution_access_gate: parseContributionAccessGate(tenantConfig),
      limitation: "email is required for contribution status",
    };
  }
  const user = await findTenantUser(tenant.id, email);
  const balance = await getContributionBalance({ tenantId: tenant.id, userId: user.id });
  const recentSupport = await pool.query(
    `SELECT sa.id, sa.business_id, sa.amount::float8 AS amount, sa.note, sa.created_at,
            sb.business_name, sb.website_link AS link, sb.location_text AS location
     FROM support_allocations sa
     JOIN spotlight_businesses sb ON sb.id = sa.business_id
     WHERE sa.tenant_id = $1
       AND sa.user_id = $2
     ORDER BY sa.created_at DESC
     LIMIT 10`,
    [tenant.id, user.id]
  );
  const supportRows = Array.isArray(recentSupport?.rows) ? recentSupport.rows : [];
  const gate = parseContributionAccessGate(tenantConfig);
  console.log("contributions_status_query", {
    tenant: tenant.slug,
    email: normalizeEmail(email),
    result_length: supportRows.length,
  });
  return {
    success: true,
    tenant: tenant.slug,
    user: { id: user.id, email: user.email },
    contribution_balance: balance.contribution_balance,
    total_contributions: balance.total_contributions,
    total_support_allocations: balance.total_support_allocations,
    contribution_access_gate: {
      ...gate,
      has_access: gate.enabled ? balance.contribution_balance >= gate.minimum_balance : true,
    },
    support_history: supportRows,
  };
}

async function fetchContributionHistory({ tenant, tenantConfig, email, limit = 50 }) {
  assertContributionsEnabled(tenantConfig);
  if (!email) {
    return {
      success: true,
      tenant: tenant.slug,
      contribution_history: [],
      support_history: [],
      limitation: "email is required for contribution history",
    };
  }
  const user = await findTenantUser(tenant.id, email);
  const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const contributionHistory = await pool.query(
    `SELECT id, entry_type, amount::float8 AS amount, note, created_by_email, metadata, created_at
     FROM contribution_ledger
     WHERE tenant_id = $1
       AND user_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [tenant.id, user.id, safeLimit]
  );
  const supportHistory = await pool.query(
    `SELECT sa.id, sa.business_id, sa.amount::float8 AS amount, sa.note, sa.metadata, sa.created_at,
            sb.business_name, sb.website_link AS link, sb.location_text AS location
     FROM support_allocations sa
     JOIN spotlight_businesses sb ON sb.id = sa.business_id
     WHERE sa.tenant_id = $1
       AND sa.user_id = $2
     ORDER BY sa.created_at DESC
     LIMIT $3`,
    [tenant.id, user.id, safeLimit]
  );
  const contributionRows = Array.isArray(contributionHistory?.rows) ? contributionHistory.rows : [];
  const supportRows = Array.isArray(supportHistory?.rows) ? supportHistory.rows : [];
  const balance = await getContributionBalance({ tenantId: tenant.id, userId: user.id });
  console.log("contributions_history_query", {
    tenant: tenant.slug,
    email: normalizeEmail(email),
    result_length: contributionRows.length + supportRows.length,
  });
  return {
    success: true,
    tenant: tenant.slug,
    user: { id: user.id, email: user.email },
    contribution_balance: balance.contribution_balance,
    contribution_history: contributionRows,
    support_history: supportRows,
  };
}

/* =========================
   PLATFORM ROUTES (/t/:slug/*)
========================= */

app.post("/t/:slug/checkin", tenantMiddleware, async (req, res) => {
  try {
    const { email, name, cid } = req.body || {};
    if (!email) return res.status(400).json({ error: "email is required" });

    const payload = await processCheckinReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      name,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "checkin failed" });
  }
});

app.post("/t/:slug/action", tenantMiddleware, async (req, res) => {
  try {
    const { email, name, action_type: actionType, cid } = req.body || {};
    if (!email || !actionType) {
      return res.status(400).json({ error: "email and action_type are required" });
    }

    const payload = await processActionReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      name,
      actionType,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "action failed" });
  }
});

app.post("/t/:slug/review", tenantMiddleware, async (req, res) => {
  try {
    const {
      email,
      name,
      text,
      media_type: mediaType,
      media_note: mediaNote,
      media_url: mediaUrl,
      media_photo_url: mediaPhotoUrl,
      media_video_url: mediaVideoUrl,
      cid,
      product_id: productId,
      rating,
    } = req.body || {};
    if (!email || !text) return res.status(400).json({ error: "email and text are required" });

    const payload = await processReviewReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      name,
      text,
      mediaType,
      mediaNote,
      mediaUrl,
      mediaPhotoUrl,
      mediaVideoUrl,
      cid,
      productId,
      rating,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "review failed" });
  }
});

app.post("/t/:slug/referral", tenantMiddleware, async (req, res) => {
  try {
    const { email, name, referred_email: referredEmail, cid } = req.body || {};
    if (!email || !referredEmail) return res.status(400).json({ error: "email and referred_email are required" });
    const payload = await processReferralReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      name,
      referredEmail,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "referral failed" });
  }
});

app.post("/t/:slug/wishlist", tenantMiddleware, async (req, res) => {
  try {
    const { email, name, product_name: productName, cid } = req.body || {};
    if (!email || !productName) return res.status(400).json({ error: "email and product_name are required" });

    const payload = await processWishlistReward({
      tenant: req.tenant,
      tenantConfig: req.tenantConfig,
      email,
      name,
      productName,
      cid,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "wishlist failed" });
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
    const name = String(req.query.name || "").trim();
    const payload = await fetchRewardsStatus({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, name });
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
    const { tenant, email, name, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email) return res.status(400).json({ error: "tenant and email are required" });
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processCheckinReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, name, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "rewards checkin failed" });
  }
});

app.post("/api/rewards/action", async (req, res) => {
  try {
    const { tenant, email, name, action_type: actionType, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !actionType) {
      return res.status(400).json({ error: "tenant, email and action_type are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processActionReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, name, actionType, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "rewards action failed" });
  }
});

app.post("/api/rewards/review", async (req, res) => {
  try {
    const {
      tenant,
      email,
      name,
      text,
      media_type: mediaType,
      media_note: mediaNote,
      media_url: mediaUrl,
      media_photo_url: mediaPhotoUrl,
      media_video_url: mediaVideoUrl,
      cid,
      result_id: resultIdRaw,
      crid: cridRaw,
      product_id: productId,
      rating,
    } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !text) return res.status(400).json({ error: "tenant, email and text are required" });
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processReviewReward({
      tenant: ctx.tenant,
      tenantConfig: ctx.tenantConfig,
      email,
      name,
      text,
      mediaType,
      mediaNote,
      mediaUrl,
      mediaPhotoUrl,
      mediaVideoUrl,
      cid,
      resultId,
      productId,
      rating,
    });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "rewards review failed" });
  }
});

app.post("/api/rewards/referral", async (req, res) => {
  try {
    const { tenant, email, name, referred_email: referredEmail, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !referredEmail) {
      return res.status(400).json({ error: "tenant, email and referred_email are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processReferralReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, name, referredEmail, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "rewards referral failed" });
  }
});

app.post("/api/rewards/wishlist", async (req, res) => {
  try {
    const { tenant, email, name, product_name: productName, cid, result_id: resultIdRaw, crid: cridRaw } = req.body || {};
    const resultId = String(resultIdRaw ?? cridRaw ?? "").trim();
    if (!tenant || !email || !productName) {
      return res.status(400).json({ error: "tenant, email and product_name are required" });
    }
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    const payload = await processWishlistReward({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, name, productName, cid, resultId });
    return res.json(payload);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "rewards wishlist failed" });
  }
});

app.get("/api/contributions/status", async (req, res) => {
  let failurePoint = "init";
  const trace = {
    route: "/api/contributions/status",
    requested_tenant: String(req.query.tenant || "").trim().toLowerCase() || null,
    actor_email: null,
    actor_role: null,
    actor_tenant: null,
    policy_passed: null,
    membership_passed: null,
    query_result: null,
  };
  try {
    failurePoint = "resolve_actor";
    const actor = deriveActor(req);
    trace.actor_email = actor.email || null;
    trace.actor_role = actor.role || null;
    trace.actor_tenant = actor.tenantSlug || null;
    const tenantSlug = String(req.query.tenant || "").trim();
    if (!tenantSlug) return res.status(400).json({ error: "tenant query param is required" });
    failurePoint = "resolve_tenant_context";
    const ctx = await getTenantContextBySlug(tenantSlug);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    failurePoint = "policy_check";
    const access = requirePolicyAction(req, res, {
      action: ACTIONS.CAMPAIGN_READ,
      resourceTenantSlug: ctx.tenant.slug,
    });
    trace.policy_passed = !!access.ok;
    if (!access.ok) return;
    failurePoint = "membership_check";
    const membershipPassed = await requireOwnerTenantMembership(req, res, ctx.tenant.id, access.actor);
    trace.membership_passed = membershipPassed;
    if (!membershipPassed) return;
    const email = String(req.query.email || "").trim();
    failurePoint = "fetch_contribution_status";
    const payload = await fetchContributionStatus({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email });
    trace.query_result = Array.isArray(payload?.support_history) ? payload.support_history.length : null;
    logOwnerAccessTrace(trace);
    return res.json(payload);
  } catch (err) {
    logOwnerAccessTrace({
      ...trace,
      failure_point: failurePoint,
      error_message: err.message,
    });
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "contribution status failed" });
  }
});

app.get("/api/contributions/history", async (req, res) => {
  let failurePoint = "init";
  const trace = {
    route: "/api/contributions/history",
    requested_tenant: String(req.query.tenant || "").trim().toLowerCase() || null,
    actor_email: null,
    actor_role: null,
    actor_tenant: null,
    policy_passed: null,
    membership_passed: null,
    query_result: null,
  };
  try {
    failurePoint = "resolve_actor";
    const actor = deriveActor(req);
    trace.actor_email = actor.email || null;
    trace.actor_role = actor.role || null;
    trace.actor_tenant = actor.tenantSlug || null;
    const tenantSlug = String(req.query.tenant || "").trim();
    if (!tenantSlug) return res.status(400).json({ error: "tenant query param is required" });
    failurePoint = "resolve_tenant_context";
    const ctx = await getTenantContextBySlug(tenantSlug);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    failurePoint = "policy_check";
    const access = requirePolicyAction(req, res, {
      action: ACTIONS.CAMPAIGN_READ,
      resourceTenantSlug: ctx.tenant.slug,
    });
    trace.policy_passed = !!access.ok;
    if (!access.ok) return;
    failurePoint = "membership_check";
    const membershipPassed = await requireOwnerTenantMembership(req, res, ctx.tenant.id, access.actor);
    trace.membership_passed = membershipPassed;
    if (!membershipPassed) return;
    const email = String(req.query.email || "").trim();
    const limit = Number(req.query.limit || 50);
    failurePoint = "fetch_contribution_history";
    const payload = await fetchContributionHistory({ tenant: ctx.tenant, tenantConfig: ctx.tenantConfig, email, limit });
    trace.query_result = {
      contribution_rows: Array.isArray(payload?.contribution_history) ? payload.contribution_history.length : null,
      support_rows: Array.isArray(payload?.support_history) ? payload.support_history.length : null,
    };
    logOwnerAccessTrace(trace);
    return res.json(payload);
  } catch (err) {
    logOwnerAccessTrace({
      ...trace,
      failure_point: failurePoint,
      error_message: err.message,
    });
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "contribution history failed" });
  }
});

app.post("/api/contributions/add", async (req, res) => {
  if (!SUPPORT_CONTRIBUTIONS_ENABLED) {
    return res.status(503).json({ error: "support contributions are temporarily unavailable", reason: "coming_soon" });
  }
  const client = await pool.connect();
  try {
    const actor = deriveActor(req);
    if (!actor.isAdmin) return res.status(403).json({ error: "admin access required for contribution additions" });
    const { tenant, email, amount: amountRaw, note, metadata } = req.body || {};
    if (!tenant || !email) return res.status(400).json({ error: "tenant and email are required" });
    const amount = normalizeContributionAmount(amountRaw);
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    assertContributionsEnabled(ctx.tenantConfig);
    const user = await findTenantUser(ctx.tenant.id, email, client);
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO contribution_ledger (tenant_id, user_id, entry_type, amount, note, created_by_email, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        ctx.tenant.id,
        user.id,
        "contribution_add",
        amount,
        normalizeOptionalText(note, 500),
        normalizeEmail(actor.email || req.userEmail || "system"),
        metadata && typeof metadata === "object" ? metadata : {},
      ]
    );
    const balance = await getContributionBalance({ tenantId: ctx.tenant.id, userId: user.id, client });
    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      tenant: ctx.tenant.slug,
      user: { id: user.id, email: user.email },
      contribution_balance: balance.contribution_balance,
      total_contributions: balance.total_contributions,
      total_support_allocations: balance.total_support_allocations,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "contribution add failed" });
  } finally {
    client.release();
  }
});

app.post("/api/contributions/contribute", async (req, res) => {
  if (!SUPPORT_CONTRIBUTIONS_ENABLED) {
    return res.status(503).json({ error: "support contributions are temporarily unavailable", reason: "coming_soon" });
  }
  const client = await pool.connect();
  try {
    const { tenant, email: requestedEmail, amount: amountRaw, note, metadata } = req.body || {};
    if (!tenant || !requestedEmail) return res.status(400).json({ error: "tenant and email are required" });
    const actor = deriveActor(req);
    const actorEmail = assertContributionActorEmailBinding({ actor, requestedEmail });
    const amount = normalizeContributionAmount(amountRaw);
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    assertContributionsEnabled(ctx.tenantConfig);
    const user = await findTenantUser(ctx.tenant.id, actorEmail, client);
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO contribution_ledger (tenant_id, user_id, entry_type, amount, note, created_by_email, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        ctx.tenant.id,
        user.id,
        "contribution_add",
        amount,
        normalizeOptionalText(note, 500),
        actorEmail,
        metadata && typeof metadata === "object" ? metadata : { source: "customer_rewards_portal" },
      ]
    );
    const balance = await getContributionBalance({ tenantId: ctx.tenant.id, userId: user.id, client });
    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      tenant: ctx.tenant.slug,
      user: { id: user.id, email: user.email },
      contribution: { amount, note: normalizeOptionalText(note, 500) },
      contribution_balance: balance.contribution_balance,
      total_contributions: balance.total_contributions,
      total_support_allocations: balance.total_support_allocations,
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "contribution submit failed" });
  } finally {
    client.release();
  }
});

app.post("/api/contributions/support", async (req, res) => {
  if (!SUPPORT_CONTRIBUTIONS_ENABLED) {
    return res.status(503).json({ error: "support contributions are temporarily unavailable", reason: "coming_soon" });
  }
  const client = await pool.connect();
  try {
    const actor = deriveActor(req);
    const { tenant, email, business_id: businessIdRaw, amount: amountRaw, note, metadata } = req.body || {};
    if (!tenant || !businessIdRaw) {
      return res.status(400).json({ error: "tenant, business_id, and amount are required" });
    }
    const actorEmail = assertContributionActorEmailBinding({ actor, requestedEmail: email });
    const businessId = Number(businessIdRaw);
    if (!Number.isInteger(businessId) || businessId <= 0) return res.status(400).json({ error: "invalid business_id" });
    const amount = normalizeContributionAmount(amountRaw);
    const ctx = await getTenantContextBySlug(tenant);
    if (!ctx) return res.status(404).json({ error: "tenant not found" });
    assertContributionsEnabled(ctx.tenantConfig);

    await client.query("BEGIN");
    const user = await findTenantUser(ctx.tenant.id, actorEmail, client);
    await client.query("SELECT id FROM users WHERE id = $1 AND tenant_id = $2 FOR UPDATE", [user.id, ctx.tenant.id]);

    const businessResult = await client.query(
      `SELECT id, tenant_id, business_name
       FROM spotlight_businesses
       WHERE id = $1
         AND tenant_id = $2
       LIMIT 1`,
      [businessId, ctx.tenant.id]
    );
    const business = businessResult.rows[0];
    if (!business) {
      const err = new Error("business not found for tenant");
      err.statusCode = 404;
      throw err;
    }

    const balance = await getContributionBalance({ tenantId: ctx.tenant.id, userId: user.id, client });
    const gate = assertContributionAccessGate({ tenantConfig: ctx.tenantConfig, balance });
    if (amount > balance.contribution_balance) {
      const err = new Error("insufficient contribution balance for support allocation");
      err.statusCode = 400;
      throw err;
    }

    await client.query(
      `INSERT INTO support_allocations (tenant_id, user_id, business_id, amount, note, metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [ctx.tenant.id, user.id, business.id, amount, normalizeOptionalText(note, 500), metadata && typeof metadata === "object" ? metadata : {}]
    );
    const afterBalance = await getContributionBalance({ tenantId: ctx.tenant.id, userId: user.id, client });
    const summary = await client.query(
      `SELECT
         COALESCE(SUM(amount), 0)::float8 AS total_support,
         COUNT(DISTINCT user_id)::int AS supporter_count
       FROM support_allocations
       WHERE tenant_id = $1
         AND business_id = $2`,
      [ctx.tenant.id, business.id]
    );
    await client.query("COMMIT");
    return res.status(201).json({
      success: true,
      tenant: ctx.tenant.slug,
      business: { id: business.id, business_name: business.business_name },
      user: { id: user.id, email: user.email },
      allocated_amount: amount,
      contribution_balance: afterBalance.contribution_balance,
      contribution_access_gate: {
        ...gate,
        has_access: gate.enabled ? afterBalance.contribution_balance >= gate.minimum_balance : true,
      },
      business_support_totals: summary.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "support allocation failed" });
  } finally {
    client.release();
  }
});

app.get("/t/:slug/products", tenantMiddleware, async (req, res) => {
  let failurePoint = "init";
  const trace = {
    route: "/t/:slug/products",
    requested_tenant: String(req.params.slug || "").trim().toLowerCase() || null,
    actor_email: null,
    actor_role: null,
    actor_tenant: null,
    policy_passed: null,
    membership_passed: null,
    query_result: null,
  };
  try {
    failurePoint = "resolve_actor";
    const actor = deriveActor(req);
    trace.actor_email = actor.email || null;
    trace.actor_role = actor.role || null;
    trace.actor_tenant = actor.tenantSlug || null;
    failurePoint = "policy_check";
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    trace.policy_passed = !!access.ok;
    if (!access.ok) return;
    failurePoint = "membership_check";
    const membershipPassed = await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor);
    trace.membership_passed = membershipPassed;
    if (!membershipPassed) return;
    failurePoint = "products_query";
    const result = await pool.query(
      `SELECT id, tenant_id, name, description, image_url, external_product_url, price_text, is_active, sort_order, created_at, updated_at
       FROM products
       WHERE tenant_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [req.tenant.id]
    );
    const productRows = Array.isArray(result?.rows) ? result.rows : [];
    trace.query_result = productRows.length;
    const featured = new Set(
      Array.isArray(req.tenantConfig?.site?.proof_showcase_featured_product_ids)
        ? req.tenantConfig.site.proof_showcase_featured_product_ids.map((id) => Number(id))
        : []
    );
    const rows = await Promise.all(
      productRows.map(async (row) => ({
        ...row,
        showcase_eligible: await hasApprovedReviewProofForProduct(req.tenant.id, row.id),
        featured_for_showcase: featured.has(Number(row.id)),
      }))
    );
    console.log("products_query", {
      tenant: req.tenant.slug,
      email: normalizeEmail(access.actor?.email || ""),
      result_length: rows.length,
    });
    logOwnerAccessTrace(trace);
    return res.json({ products: rows, proof_showcase_enabled: req.tenantConfig?.features?.proof_showcase_enabled === true });
  } catch (err) {
    logOwnerAccessTrace({
      ...trace,
      failure_point: failurePoint,
      error_message: err.message,
    });
    console.error(err);
    return res.status(500).json({ error: "products fetch failed" });
  }
});

app.get("/t/:slug/products/public", tenantMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name
       FROM products
       WHERE tenant_id = $1
         AND is_active = TRUE
       ORDER BY sort_order ASC, id ASC`,
      [req.tenant.id]
    );
    return res.json({ products: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "public products fetch failed" });
  }
});

app.post("/t/:slug/products", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const { name, description, image_url, external_product_url, price_text, is_active, sort_order } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ error: "name is required" });
    const created = await pool.query(
      `INSERT INTO products (tenant_id, name, description, image_url, external_product_url, price_text, is_active, sort_order, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
       RETURNING *`,
      [req.tenant.id, String(name).trim(), description || null, image_url || null, external_product_url || null, price_text || null, is_active !== false, Number(sort_order || 0) || 0]
    );
    await recordCampaignEvent({ tenantId: req.tenant.id, eventType: EVENT_NAMES.PRODUCT_CREATED, customerEmail: access.actor.email, meta: { product_id: created.rows[0].id } });
    return res.status(201).json({ product: { ...created.rows[0], showcase_eligible: false } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "product create failed" });
  }
});

app.put("/t/:slug/products/:productId", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: "invalid product id" });
    const { name, description, image_url, external_product_url, price_text, is_active, sort_order } = req.body || {};
    if (!String(name || "").trim()) return res.status(400).json({ error: "name is required" });
    const updated = await pool.query(
      `UPDATE products
       SET name = $3, description = $4, image_url = $5, external_product_url = $6, price_text = $7, is_active = $8, sort_order = $9, updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`,
      [req.tenant.id, productId, String(name).trim(), description || null, image_url || null, external_product_url || null, price_text || null, is_active !== false, Number(sort_order || 0) || 0]
    );
    if (!updated.rows[0]) return res.status(404).json({ error: "product not found" });
    await recordCampaignEvent({ tenantId: req.tenant.id, eventType: EVENT_NAMES.PRODUCT_UPDATED, customerEmail: access.actor.email, meta: { product_id: productId } });
    return res.json({ product: { ...updated.rows[0], showcase_eligible: await hasApprovedReviewProofForProduct(req.tenant.id, productId) } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "product update failed" });
  }
});

app.delete("/t/:slug/products/:productId", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: "invalid product id" });
    const deleted = await pool.query("DELETE FROM products WHERE tenant_id = $1 AND id = $2 RETURNING id", [req.tenant.id, productId]);
    if (!deleted.rows[0]) return res.status(404).json({ error: "product not found" });
    await recordCampaignEvent({ tenantId: req.tenant.id, eventType: EVENT_NAMES.PRODUCT_DELETED, customerEmail: access.actor.email, meta: { product_id: productId } });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "product delete failed" });
  }
});

app.get("/t/:slug/showcase", tenantMiddleware, async (req, res) => {
  try {
    const features = req.tenantConfig?.features || {};
    if (features.proof_showcase_enabled !== true) {
      return res.json({ enabled: false, items: [] });
    }
    const featuredIds = Array.isArray(req.tenantConfig?.site?.proof_showcase_featured_product_ids)
      ? req.tenantConfig.site.proof_showcase_featured_product_ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];
    const rows = await pool.query(
      `SELECT
         p.id AS product_id,
         p.name,
         p.description,
         p.image_url,
         p.external_product_url,
         p.price_text,
         p.sort_order,
         r.id AS review_id,
         r.text AS customer_quote,
         r.rating,
         r.media_type,
         r.media_note,
         r.created_at AS review_created_at
       FROM products p
       JOIN LATERAL (
         SELECT rv.*
         FROM reviews rv
         WHERE rv.tenant_id = p.tenant_id
           AND rv.product_id = p.id
           AND rv.proof_status = 'approved'
         ORDER BY rv.created_at DESC
         LIMIT 1
       ) r ON TRUE
       WHERE p.tenant_id = $1
         AND p.is_active = TRUE
         AND ($2::int[] IS NULL OR p.id = ANY($2::int[]))
       ORDER BY p.sort_order ASC, p.id ASC`,
      [req.tenant.id, featuredIds.length ? featuredIds : null]
    );
    return res.json({ enabled: true, items: rows.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "showcase fetch failed" });
  }
});

app.post("/t/:slug/showcase/feature-selection", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const featuredProductIds = Array.isArray(req.body?.featured_product_ids) ? req.body.featured_product_ids : [];
    const normalizedIds = [...new Set(featuredProductIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
    if (!normalizedIds.length) {
      const existingCfg = await getTenantConfig(req.tenant.id);
      const next = {
        ...existingCfg,
        site: { ...(existingCfg.site || {}), proof_showcase_featured_product_ids: [] },
        features: { ...(existingCfg.features || {}) },
      };
      await pool.query(
        `INSERT INTO tenant_config (tenant_id, config, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (tenant_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
        [req.tenant.id, next]
      );
      return res.json({ featured_product_ids: [] });
    }
    const eligible = await pool.query(
      `SELECT DISTINCT p.id
       FROM products p
       JOIN reviews r ON r.tenant_id = p.tenant_id AND r.product_id = p.id AND r.proof_status = 'approved'
       WHERE p.tenant_id = $1
         AND p.is_active = TRUE
         AND p.id = ANY($2::int[])`,
      [req.tenant.id, normalizedIds]
    );
    const eligibleIds = eligible.rows.map((r) => Number(r.id));
    if (eligibleIds.length !== normalizedIds.length) {
      return res.status(400).json({ error: "only showcase-eligible active products may be featured" });
    }
    const existingCfg = await getTenantConfig(req.tenant.id);
    const next = {
      ...existingCfg,
      site: { ...(existingCfg.site || {}), proof_showcase_featured_product_ids: eligibleIds },
      features: { ...(existingCfg.features || {}) },
    };
    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [req.tenant.id, next]
    );
    return res.json({ featured_product_ids: eligibleIds });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "showcase selection update failed" });
  }
});

app.post("/t/:slug/showcase/settings", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const enabled = req.body?.proof_showcase_enabled === true;
    const existingCfg = await getTenantConfig(req.tenant.id);
    const next = {
      ...existingCfg,
      site: { ...(existingCfg.site || {}) },
      features: { ...(existingCfg.features || {}), proof_showcase_enabled: enabled },
    };
    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [req.tenant.id, next]
    );
    return res.json({ proof_showcase_enabled: enabled });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "showcase settings update failed" });
  }
});

app.post("/t/:slug/contributions/settings", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.GARVEY_UPDATE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const enabled = req.body?.contributions_enabled === true;
    const accessGateEnabled = req.body?.contribution_access_gate?.enabled === true;
    const minimumBalance = normalizeNonNegativeAmount(
      req.body?.contribution_access_gate?.minimum_balance ?? 0,
      "contribution_access_gate.minimum_balance"
    );
    const existingCfg = await getTenantConfig(req.tenant.id);
    const next = {
      ...existingCfg,
      site: {
        ...(existingCfg.site || {}),
        contribution_access_gate: {
          enabled: accessGateEnabled,
          minimum_balance: accessGateEnabled ? minimumBalance : 0,
        },
      },
      features: { ...(existingCfg.features || {}), contributions_enabled: enabled },
    };
    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [req.tenant.id, next]
    );
    return res.json({
      contributions_enabled: next.features.contributions_enabled === true,
      contribution_access_gate: next.site.contribution_access_gate,
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "contribution settings update failed" });
  }
});

app.get("/t/:slug/review-link", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.GARVEY_READ, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    return res.json({
      tenant: req.tenant.slug,
      google_review_url: normalizeOptionalText(req.tenantConfig?.site?.google_review_url, 1200),
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "review link fetch failed" });
  }
});

app.post("/t/:slug/review-link", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.GARVEY_UPDATE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const googleReviewUrl = normalizeOptionalText(req.body?.google_review_url, 1200);
    const existingCfg = await getTenantConfig(req.tenant.id);
    const next = {
      ...existingCfg,
      site: { ...(existingCfg.site || {}), google_review_url: googleReviewUrl || null },
      features: { ...(existingCfg.features || {}) },
    };
    await pool.query(
      `INSERT INTO tenant_config (tenant_id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()`,
      [req.tenant.id, next]
    );
    return res.json({ tenant: req.tenant.slug, google_review_url: next.site.google_review_url });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "review link update failed" });
  }
});

app.get("/t/:slug/contributions/access", tenantMiddleware, async (req, res) => {
  try {
    assertContributionsEnabled(req.tenantConfig);
    const email = String(req.query.email || "").trim();
    if (!email) return res.status(400).json({ error: "email query param is required" });
    const user = await findTenantUser(req.tenant.id, email);
    const balance = await getContributionBalance({ tenantId: req.tenant.id, userId: user.id });
    const gate = parseContributionAccessGate(req.tenantConfig);
    return res.json({
      tenant: req.tenant.slug,
      user: { id: user.id, email: user.email },
      contribution_balance: balance.contribution_balance,
      contribution_access_gate: gate,
      has_access: gate.enabled ? balance.contribution_balance >= gate.minimum_balance : true,
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "contribution access check failed" });
  }
});

app.post("/t/:slug/showcase/track", tenantMiddleware, async (req, res) => {
  try {
    const { event_type: eventTypeRaw, product_id: productIdRaw, cid } = req.body || {};
    const eventType = String(eventTypeRaw || "").trim().toLowerCase();
    const allowed = new Set([
      EVENT_NAMES.SHOWCASE_IMPRESSION,
      EVENT_NAMES.SHOWCASE_VIEW_PRODUCT_CLICK,
      EVENT_NAMES.SHOWCASE_WISHLIST_SAVE,
    ]);
    if (!allowed.has(eventType)) return res.status(400).json({ error: "invalid showcase event type" });
    const productId = Number(productIdRaw);
    if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ error: "invalid product id" });
    const campaign = await resolveCampaignForTenant(req.tenant.id, cid);
    await recordCampaignEvent({
      tenantId: req.tenant.id,
      campaignId: campaign?.id || null,
      eventType,
      customerEmail: normalizeEmail(req.query.email || req.body?.email || ""),
      meta: { product_id: productId },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "showcase tracking failed" });
  }
});

app.get("/t/:slug/reviews", tenantMiddleware, async (req, res) => {
  let failurePoint = "init";
  const trace = {
    route: "/t/:slug/reviews",
    requested_tenant: String(req.params.slug || "").trim().toLowerCase() || null,
    actor_email: null,
    actor_role: null,
    actor_tenant: null,
    policy_passed: null,
    membership_passed: null,
    query_result: null,
  };
  try {
    failurePoint = "resolve_actor";
    const actor = deriveActor(req);
    trace.actor_email = actor.email || null;
    trace.actor_role = actor.role || null;
    trace.actor_tenant = actor.tenantSlug || null;
    failurePoint = "policy_check";
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    trace.policy_passed = !!access.ok;
    if (!access.ok) return;
    failurePoint = "membership_check";
    const membershipPassed = await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor);
    trace.membership_passed = membershipPassed;
    if (!membershipPassed) return;
    const statusRaw = String(req.query.status || "").trim().toLowerCase();
    const statusFilter = statusRaw ? normalizeReviewProofStatus(statusRaw) : null;
    const limit = Math.max(1, Math.min(Number(req.query.limit || 100) || 100, 200));
    failurePoint = "reviews_query";
    const rows = await pool.query(
      `SELECT r.id, r.tenant_id, r.user_id, r.product_id, r.text, r.media_type, r.media_note, r.rating, r.proof_status, r.created_at,
              u.email AS customer_email,
              p.name AS product_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id AND u.tenant_id = r.tenant_id
       LEFT JOIN products p ON p.id = r.product_id AND p.tenant_id = r.tenant_id
       WHERE r.tenant_id = $1
         AND ($2::text IS NULL OR r.proof_status = $2)
       ORDER BY r.created_at DESC
       LIMIT $3`,
      [req.tenant.id, statusFilter, limit]
    );
    const reviewRows = Array.isArray(rows?.rows) ? rows.rows : [];
    trace.query_result = reviewRows.length;
    console.log("reviews_query", {
      tenant: req.tenant.slug,
      email: normalizeEmail(access.actor?.email || ""),
      result_length: reviewRows.length,
    });
    logOwnerAccessTrace(trace);
    return res.json({ reviews: reviewRows });
  } catch (err) {
    logOwnerAccessTrace({
      ...trace,
      failure_point: failurePoint,
      error_message: err.message,
    });
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "reviews fetch failed" });
  }
});

app.post("/t/:slug/reviews/:reviewId/moderation", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.PRODUCTS_MANAGE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const reviewId = Number(req.params.reviewId);
    if (!Number.isInteger(reviewId) || reviewId <= 0) return res.status(400).json({ error: "invalid review id" });
    const proofStatus = normalizeReviewProofStatus(req.body?.proof_status);
    const updated = await pool.query(
      `UPDATE reviews
       SET proof_status = $3
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, tenant_id, user_id, product_id, text, media_type, media_note, rating, proof_status, created_at`,
      [req.tenant.id, reviewId, proofStatus]
    );
    if (!updated.rows[0]) return res.status(404).json({ error: "review not found" });
    return res.json({ review: updated.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "review moderation failed" });
  }
});

app.post("/api/spotlight/submissions", async (req, res) => {
  try {
    enforceSpotlightRateLimit(req);
    const businessName = requireTextField(req.body?.business_name, "business_name", 180);
    const websiteLink = normalizeOptionalText(req.body?.link, 500);
    const locationText = normalizeOptionalText(req.body?.location, 240);
    if (!websiteLink && !locationText) return res.status(400).json({ error: "link or location is required" });
    const category = requireTextField(req.body?.category, "category", 140);
    const communityImpact = requireTextField(req.body?.community_impact, "community_impact", 3000);
    const whyISupport = requireTextField(req.body?.why_i_support, "why_i_support", 3000);
    const rating = normalizeSpotlightRating(req.body?.rating);
    const mediaType = normalizeOptionalText(req.body?.media_type, 20);
    const mediaUrl = normalizeOptionalText(req.body?.media_url, 1000);
    if (mediaUrl && !mediaType) return res.status(400).json({ error: "media_type is required when media_url is provided" });
    const tenantSlug = normalizeOptionalText(req.body?.tenant_slug, 120);
    const submitterEmail = normalizeOptionalText(req.body?.submitter_email, 320);
    const submitterName = normalizeOptionalText(req.body?.submitter_name, 180);

    if (!tenantSlug) return res.status(403).json({ error: "spotlight is disabled for this context" });
    const tenantResult = await pool.query("SELECT id, slug FROM tenants WHERE slug = $1 LIMIT 1", [tenantSlug]);
    const onboardedTenant = tenantResult.rows[0] || null;
    if (!onboardedTenant) return res.status(403).json({ error: "spotlight is disabled for this context" });
    if (!(await isSpotlightEnabledForTenantId(onboardedTenant.id))) {
      return res.status(403).json({ error: "spotlight is disabled for this tenant" });
    }
    const dedupeKey = makeSpotlightBusinessDedupeKey({ businessName, link: websiteLink, location: locationText });

    const businessInsert = await pool.query(
      `INSERT INTO spotlight_businesses (tenant_id, business_name, website_link, location_text, category, is_onboarded, dedupe_key, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (dedupe_key)
       DO UPDATE SET
         tenant_id = COALESCE(spotlight_businesses.tenant_id, EXCLUDED.tenant_id),
         is_onboarded = spotlight_businesses.is_onboarded OR EXCLUDED.is_onboarded,
         category = COALESCE(NULLIF(spotlight_businesses.category, ''), EXCLUDED.category),
         website_link = COALESCE(NULLIF(spotlight_businesses.website_link, ''), EXCLUDED.website_link),
         location_text = COALESCE(NULLIF(spotlight_businesses.location_text, ''), EXCLUDED.location_text),
         updated_at = NOW()
       RETURNING id, tenant_id, business_name, website_link, location_text, category, is_onboarded`,
      [onboardedTenant.id, businessName, websiteLink, locationText, category, true, dedupeKey]
    );
    const business = businessInsert.rows[0];

    const spamKey = `${business.id}:${String(submitterEmail || "").toLowerCase()}:${rating}:${communityImpact.slice(0, 120).toLowerCase()}:${whyISupport.slice(0, 120).toLowerCase()}`;
    const spamCheck = await pool.query(
      `SELECT id FROM spotlight_posts
       WHERE dedupe_key = $1
         AND created_at >= NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [spamKey]
    );
    if (spamCheck.rows[0]) {
      return res.status(409).json({ error: "duplicate spotlight submission detected" });
    }

    const insertedPost = await pool.query(
      `INSERT INTO spotlight_posts (
         business_id, submitter_name, submitter_email, community_impact, why_i_support, rating, media_type, media_url, moderation_status, dedupe_key
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9)
       RETURNING id, business_id, submitter_name, submitter_email, community_impact, why_i_support, rating, media_type, media_url, moderation_status, created_at`,
      [business.id, submitterName, submitterEmail ? normalizeEmail(submitterEmail) : null, communityImpact, whyISupport, rating, mediaType, mediaUrl, spamKey]
    );

    return res.status(201).json({
      spotlight_post: insertedPost.rows[0],
      business: {
        ...business,
        business_type: business.is_onboarded ? "onboarded" : "standalone",
        tenant_slug: onboardedTenant?.slug || null,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "spotlight submission failed" });
  }
});

app.get("/api/spotlight/feed", async (req, res) => {
  try {
    const status = "approved";
    const limit = Math.max(1, Math.min(Number(req.query.limit || 50) || 50, 200));
    const includeAllStatuses = req.isAdmin && req.query.all_statuses === "true";
    const requestedStatus = normalizeOptionalText(req.query.status, 20);
    const adminStatus = requestedStatus ? normalizeSpotlightModerationStatus(requestedStatus) : "approved";
    const effectiveStatus = includeAllStatuses ? adminStatus : status;
    const rows = await pool.query(
      `SELECT
         sp.id,
         sp.business_id,
         sp.community_impact,
         sp.why_i_support,
         sp.rating,
         sp.media_type,
         sp.media_url,
         sp.moderation_status,
         sp.moderation_note,
         sp.created_at,
         sb.business_name,
         sb.website_link AS link,
         sb.location_text AS location,
         sb.category,
         sb.is_onboarded,
         sb.tenant_id,
         t.slug AS tenant_slug,
         COALESCE(ss.total_support, 0)::float8 AS total_support,
         COALESCE(ss.supporter_count, 0)::int AS supporter_count
       FROM spotlight_posts sp
       JOIN spotlight_businesses sb ON sb.id = sp.business_id
       LEFT JOIN tenants t ON t.id = sb.tenant_id
       LEFT JOIN tenant_config tc ON tc.tenant_id = sb.tenant_id
       LEFT JOIN LATERAL (
         SELECT
           SUM(sa.amount)::numeric AS total_support,
           COUNT(DISTINCT sa.user_id)::int AS supporter_count
         FROM support_allocations sa
         WHERE sa.business_id = sb.id
       ) ss ON TRUE
       WHERE COALESCE((tc.config->'features'->>'spotlight_enabled')::boolean, false) = true
         AND ($1::boolean = true OR sp.moderation_status = $2)
       ORDER BY sp.created_at DESC
       LIMIT $3`,
      [includeAllStatuses, effectiveStatus, limit]
    );
    return res.json({
      feed: rows.rows.map((row) => ({
        ...row,
        business_type: row.is_onboarded ? "onboarded" : "standalone",
        claim_cta: row.is_onboarded !== true,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "spotlight feed failed" });
  }
});

app.post("/api/spotlight/posts/:postId/moderation", async (req, res) => {
  try {
    const postId = Number(req.params.postId);
    if (!Number.isInteger(postId) || postId <= 0) return res.status(400).json({ error: "invalid spotlight post id" });
    const status = normalizeSpotlightModerationStatus(req.body?.moderation_status);
    const note = normalizeOptionalText(req.body?.moderation_note, 1000);

    const postLookup = await pool.query(
      `SELECT sp.id, sb.tenant_id, t.slug AS tenant_slug
       FROM spotlight_posts sp
       JOIN spotlight_businesses sb ON sb.id = sp.business_id
       LEFT JOIN tenants t ON t.id = sb.tenant_id
       WHERE sp.id = $1
       LIMIT 1`,
      [postId]
    );
    const post = postLookup.rows[0];
    if (!post) return res.status(404).json({ error: "spotlight post not found" });
    if (!(await isSpotlightEnabledForTenantId(post.tenant_id))) {
      return res.status(403).json({ error: "spotlight is disabled for this tenant" });
    }

    const isAdminModerator = req.isAdmin;
    const isOwnerModerator = req.authActor?.role === ROLES.BUSINESS_OWNER
      && post.tenant_slug
      && req.authActor?.tenantSlug === post.tenant_slug;
    if (!isAdminModerator && !isOwnerModerator) {
      return res.status(403).json({ error: "moderation requires admin or owning business account" });
    }

    const updated = await pool.query(
      `UPDATE spotlight_posts
       SET moderation_status = $2,
           moderation_note = $3,
           moderated_by_email = $4,
           moderated_at = NOW()
       WHERE id = $1
       RETURNING id, business_id, moderation_status, moderation_note, moderated_by_email, moderated_at`,
      [postId, status, note, normalizeEmail(req.userEmail || req.authActor?.email || "system")]
    );
    return res.json({ spotlight_post: updated.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "spotlight moderation failed" });
  }
});

app.post("/api/spotlight/businesses/:businessId/claim", async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    if (!Number.isInteger(businessId) || businessId <= 0) return res.status(400).json({ error: "invalid business id" });
    const claimantName = requireTextField(req.body?.claimant_name, "claimant_name", 180);
    const claimantEmail = requireTextField(req.body?.claimant_email, "claimant_email", 320);
    const claimantPhone = normalizeOptionalText(req.body?.claimant_phone, 80);
    const message = normalizeOptionalText(req.body?.message, 2000);
    const verificationContext = req.body?.verification_context && typeof req.body.verification_context === "object"
      ? req.body.verification_context
      : {};

    const businessLookup = await pool.query(
      `SELECT id, tenant_id, business_name, is_onboarded
       FROM spotlight_businesses
       WHERE id = $1
       LIMIT 1`,
      [businessId]
    );
    const business = businessLookup.rows[0];
    if (!business) return res.status(404).json({ error: "business not found" });
    if (!(await isSpotlightEnabledForTenantId(business.tenant_id))) {
      return res.status(403).json({ error: "spotlight is disabled for this tenant" });
    }
    if (business.is_onboarded) {
      return res.status(400).json({ error: "business is already onboarded; use standard owner onboarding and verification channels" });
    }

    const insertedClaim = await pool.query(
      `INSERT INTO spotlight_claim_requests (
         business_id, claimant_name, claimant_email, claimant_phone, message, verification_context, claim_status
       ) VALUES ($1,$2,$3,$4,$5,$6,'pending')
       RETURNING id, business_id, claimant_name, claimant_email, claimant_phone, message, verification_context, claim_status, created_at`,
      [businessId, claimantName, normalizeEmail(claimantEmail), claimantPhone, message, verificationContext]
    );
    return res.status(201).json({
      claim_request: insertedClaim.rows[0],
      bridge_notice: "Claim requests are reviewed manually and do not auto-convert spotlight entries into tenant records.",
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "spotlight claim request failed" });
  }
});

app.get("/api/spotlight/businesses/:businessId/support", async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    if (!Number.isInteger(businessId) || businessId <= 0) return res.status(400).json({ error: "invalid business id" });
    const limit = Math.max(1, Math.min(Number(req.query.limit || 25) || 25, 100));
    const businessLookup = await pool.query(
      `SELECT sb.id, sb.tenant_id, sb.business_name, t.slug AS tenant_slug
       FROM spotlight_businesses sb
       LEFT JOIN tenants t ON t.id = sb.tenant_id
       WHERE sb.id = $1
       LIMIT 1`,
      [businessId]
    );
    const business = businessLookup.rows[0];
    if (!business) return res.status(404).json({ error: "business not found" });
    if (!(await isSpotlightEnabledForTenantId(business.tenant_id))) {
      return res.status(403).json({ error: "spotlight is disabled for this tenant" });
    }

    const businessTenantContext = business.tenant_slug
      ? await getTenantContextBySlug(business.tenant_slug)
      : null;
    if (!businessTenantContext) {
      return res.status(403).json({ error: "contributions are disabled for this tenant" });
    }
    assertContributionsEnabled(businessTenantContext.tenantConfig);

    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0)::float8 AS total_support,
         COUNT(DISTINCT user_id)::int AS supporter_count
       FROM support_allocations
       WHERE business_id = $1`,
      [businessId]
    );
    const history = await pool.query(
      `SELECT sa.id, sa.user_id, sa.amount::float8 AS amount, sa.note, sa.created_at
       FROM support_allocations sa
       WHERE sa.business_id = $1
       ORDER BY sa.created_at DESC
       LIMIT $2`,
      [businessId, limit]
    );
    return res.json({
      business,
      total_support: totals.rows[0].total_support,
      supporter_count: totals.rows[0].supporter_count,
      support_history: history.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "business support lookup failed" });
  }
});

app.get("/api/spotlight/claims", async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ error: "admin access required" });
    const requestedStatus = normalizeOptionalText(req.query.status, 20);
    const status = requestedStatus ? normalizeSpotlightClaimStatus(requestedStatus) : null;
    const limit = Math.max(1, Math.min(Number(req.query.limit || 100) || 100, 500));

    const rows = await pool.query(
      `SELECT
         scr.id AS claim_id,
         scr.business_id,
         sb.business_name,
         scr.claimant_name,
         scr.claimant_email,
         scr.claim_status AS status,
         scr.created_at
       FROM spotlight_claim_requests scr
       JOIN spotlight_businesses sb ON sb.id = scr.business_id
       LEFT JOIN tenant_config tc ON tc.tenant_id = sb.tenant_id
       WHERE COALESCE((tc.config->'features'->>'spotlight_enabled')::boolean, false) = true
         AND ($1::text IS NULL OR scr.claim_status = $1)
       ORDER BY scr.created_at DESC
       LIMIT $2`,
      [status, limit]
    );

    return res.json({ claims: rows.rows });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "spotlight claim queue failed" });
  }
});

app.post("/api/spotlight/claims/:claimId/moderation", async (req, res) => {
  try {
    if (!req.isAdmin) return res.status(403).json({ error: "admin access required" });
    const claimId = Number(req.params.claimId);
    if (!Number.isInteger(claimId) || claimId <= 0) return res.status(400).json({ error: "invalid claim id" });
    const claimStatus = normalizeSpotlightClaimStatus(req.body?.claim_status);
    const note = normalizeOptionalText(req.body?.review_note, 1000);
    const claimLookup = await pool.query(
      `SELECT scr.id, sb.tenant_id
       FROM spotlight_claim_requests scr
       JOIN spotlight_businesses sb ON sb.id = scr.business_id
       WHERE scr.id = $1
       LIMIT 1`,
      [claimId]
    );
    const claim = claimLookup.rows[0];
    if (!claim) return res.status(404).json({ error: "claim request not found" });
    if (!(await isSpotlightEnabledForTenantId(claim.tenant_id))) {
      return res.status(403).json({ error: "spotlight is disabled for this tenant" });
    }
    const updated = await pool.query(
      `UPDATE spotlight_claim_requests
       SET claim_status = $2, review_note = $3, reviewed_by_email = $4, reviewed_at = NOW()
       WHERE id = $1
       RETURNING id, business_id, claim_status, review_note, reviewed_by_email, reviewed_at`,
      [claimId, claimStatus, note, normalizeEmail(req.userEmail || "system")]
    );
    if (!updated.rows[0]) return res.status(404).json({ error: "claim request not found" });
    return res.json({ claim_request: updated.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "spotlight claim moderation failed" });
  }
});

app.get("/t/:slug/dashboard", tenantMiddleware, async (req, res) => {
  try {
    const tenantReadActor = await requireTenantReadAccess(req, res);
    if (!tenantReadActor || !tenantReadActor.role) return;
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
    const tenantReadActor = await requireTenantReadAccess(req, res);
    if (!tenantReadActor || !tenantReadActor.role) return;
    const tenantId = req.tenant.id;
    const customers = await pool.query(
      `SELECT
          u.id AS user_id,
          u.email,
          u.name,
          u.points,
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
         SELECT DISTINCT ON (a.user_id)
           a.user_id,
           a.id AS result_id,
           a.created_at AS assessment_completed_at,
           a.primary_archetype,
           a.personal_primary_archetype,
           a.buyer_primary_archetype
         FROM assessment_submissions a
         WHERE a.tenant_id = $1
           AND a.assessment_type = 'customer'
           AND a.user_id IS NOT NULL
         ORDER BY a.user_id, a.created_at DESC, a.id DESC
       ) rr ON rr.user_id = u.id
       WHERE u.tenant_id = $1
       ORDER BY last_activity DESC NULLS LAST, u.id DESC`,
      [tenantId]
    );

    const shaped = customers.rows.map((row) => {
      const status = row.last_activity ? "active" : "new";
      return {
        user_id: row.user_id,
        name: row.name || null,
        email: row.email,
        points: Number(row.points || 0),
        archetype: row.archetype,
        personal_archetype: row.personal_primary_archetype || null,
        buyer_archetype: row.buyer_primary_archetype || null,
        result_id: row.result_id ? String(row.result_id) : null,
        assessment_completed: !!row.result_id,
        assessment_completed_at: row.assessment_completed_at || null,
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

app.get("/t/:slug/customers/:userId/profile", tenantMiddleware, async (req, res) => {
  function isMissingRelationError(err) {
    const code = String(err?.code || "").trim();
    if (code === "42P01") return true; // undefined_table
    const message = String(err?.message || "").toLowerCase();
    return message.includes("does not exist");
  }

  async function safeActivityMetric(poolRef, { tenantId, userId, table, mode }) {
    const userColumn = table === "referrals" ? "referrer_user_id" : "user_id";
    const metric = String(mode || "count").toLowerCase() === "max" ? "max" : "count";
    const query = metric === "max"
      ? `SELECT MAX(created_at) AS value FROM ${table} WHERE tenant_id = $1 AND ${userColumn} = $2`
      : `SELECT COUNT(*)::int AS value FROM ${table} WHERE tenant_id = $1 AND ${userColumn} = $2`;
    try {
      const result = await poolRef.query(query, [tenantId, userId]);
      return result.rows[0]?.value ?? (metric === "max" ? null : 0);
    } catch (err) {
      if (isMissingRelationError(err)) return metric === "max" ? null : 0;
      throw err;
    }
  }

  try {
    const tenantReadActor = await requireTenantReadAccess(req, res);
    if (!tenantReadActor || !tenantReadActor.role) return;
    const tenantId = req.tenant.id;
    const userId = Number(req.params.userId || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "valid userId is required" });
    }

    const userRow = await pool.query(
      `SELECT id, email, name, points, created_at
       FROM users
       WHERE tenant_id = $1 AND id = $2
       LIMIT 1`,
      [tenantId, userId]
    );
    const customer = userRow.rows[0];
    if (!customer) return res.status(404).json({ error: "customer not found" });

    const [visits, actions, reviews, referrals, wishlist, lastVisit, lastAction, lastReview, lastReferral, lastWishlist] = await Promise.all([
      safeActivityMetric(pool, { tenantId, userId, table: "visits", mode: "count" }),
      safeActivityMetric(pool, { tenantId, userId, table: "actions", mode: "count" }),
      safeActivityMetric(pool, { tenantId, userId, table: "reviews", mode: "count" }),
      safeActivityMetric(pool, { tenantId, userId, table: "referrals", mode: "count" }),
      safeActivityMetric(pool, { tenantId, userId, table: "wishlist", mode: "count" }),
      safeActivityMetric(pool, { tenantId, userId, table: "visits", mode: "max" }),
      safeActivityMetric(pool, { tenantId, userId, table: "actions", mode: "max" }),
      safeActivityMetric(pool, { tenantId, userId, table: "reviews", mode: "max" }),
      safeActivityMetric(pool, { tenantId, userId, table: "referrals", mode: "max" }),
      safeActivityMetric(pool, { tenantId, userId, table: "wishlist", mode: "max" }),
    ]);

    let assessment = null;
    try {
      const latestAssessment = await pool.query(
        `SELECT a.*
         FROM assessment_submissions a
         WHERE a.tenant_id = $1
           AND a.assessment_type = 'customer'
           AND a.user_id = $2
         ORDER BY a.created_at DESC, a.id DESC
         LIMIT 1`,
        [tenantId, userId]
      );
      assessment = latestAssessment.rows[0] || null;
    } catch (assessmentErr) {
      console.error("customer_profile_assessment_lookup_failed", {
        tenant: req.tenant.slug,
        userId,
        error: assessmentErr?.message || assessmentErr,
      });
      assessment = null;
    }

    const missingSections = [];
    if (!assessment) missingSections.push("assessment");
    if (!assessment?.personal_primary_archetype) missingSections.push("personal_archetype");
    if (!assessment?.buyer_primary_archetype) missingSections.push("buyer_archetype");

    const activitySummary = {
      visits: Number(visits || 0),
      actions: Number(actions || 0),
      reviews: Number(reviews || 0),
      referrals: Number(referrals || 0),
      wishlist: Number(wishlist || 0),
      last_visit: lastVisit || null,
      last_action: lastAction || null,
      last_review: lastReview || null,
      last_referral: lastReferral || null,
      last_wishlist: lastWishlist || null,
    };
    const hasActivity = Object.values(activitySummary).some((value) => value !== null && value !== 0);
    if (!hasActivity) missingSections.push("activity");

    const personalPlaybook = assessment?.personal_primary_archetype
      ? getLibraryEntry(assessment.personal_primary_archetype)?.buyer || null
      : null;
    const buyerPlaybook = assessment?.buyer_primary_archetype
      ? getLibraryEntry(assessment.buyer_primary_archetype)?.buyer || null
      : null;

    return res.json({
      tenant: req.tenant.slug,
      customer: {
        id: customer.id,
        name: customer.name || null,
        email: customer.email,
        points: Number(customer.points || 0),
        created_at: customer.created_at,
      },
      assessment: assessment ? {
        id: String(assessment.id),
        created_at: assessment.created_at,
        primary_archetype: assessment.primary_archetype,
        secondary_archetype: assessment.secondary_archetype,
        weakness_archetype: assessment.weakness_archetype,
        archetype_counts: assessment.archetype_counts || {},
        personal: {
          primary: assessment.personal_primary_archetype,
          secondary: assessment.personal_secondary_archetype,
          weakness: assessment.personal_weakness_archetype,
          counts: assessment.personal_counts || {},
          marketing_angle: personalPlaybook?.messaging_that_converts || [],
        },
        buyer: {
          primary: assessment.buyer_primary_archetype,
          secondary: assessment.buyer_secondary_archetype,
          weakness: assessment.buyer_weakness_archetype,
          counts: assessment.buyer_counts || {},
          marketing_angle: buyerPlaybook?.messaging_that_converts || [],
        },
      } : null,
      activity_summary: activitySummary,
      recommended_marketing_angle:
        (buyerPlaybook?.messaging_that_converts && buyerPlaybook.messaging_that_converts[0])
        || (personalPlaybook?.messaging_that_converts && personalPlaybook.messaging_that_converts[0])
        || "Lead with relevance to their primary archetype and a specific next step.",
      profile_state: assessment
        ? (missingSections.length ? "partial" : "complete")
        : "no_assessment",
      missing_sections: missingSections,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "customer profile failed" });
  }
});

app.get("/t/:slug/segments", tenantMiddleware, async (req, res) => {
  try {
    const tenantReadActor = await requireTenantReadAccess(req, res);
    if (!tenantReadActor || !tenantReadActor.role) return;
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

app.post("/t/:slug/messages", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.GARVEY_UPDATE, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;

    const senderEmail = normalizeEmail(access.actor.email || req.body?.sender_email || "");
    const targetType = String(req.body?.target_type || "").trim().toLowerCase();
    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();
    const targetEmail = normalizeEmail(req.body?.target_email || "");
    const targetLens = String(req.body?.target_lens || "").trim().toLowerCase();
    const targetArchetype = String(req.body?.target_archetype || "").trim().toLowerCase();

    if (!senderEmail || !subject || !body) {
      return res.status(400).json({ error: "sender email, subject, and body are required" });
    }
    if (!["single", "group"].includes(targetType)) {
      return res.status(400).json({ error: "target_type must be single or group" });
    }
    if (targetType === "single" && !targetEmail) {
      return res.status(400).json({ error: "target_email is required for single target" });
    }
    if (targetType === "group" && (!["personal", "buyer"].includes(targetLens) || !targetArchetype)) {
      return res.status(400).json({ error: "target_lens and target_archetype are required for group target" });
    }

    const created = await pool.query(
      `INSERT INTO owner_customer_messages (
          tenant_id, sender_email, target_type, target_email, target_lens, target_archetype, subject, body, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, sender_email, target_type, target_email, target_lens, target_archetype, subject, body, created_at`,
      [
        req.tenant.id,
        senderEmail,
        targetType,
        targetType === "single" ? targetEmail : null,
        targetType === "group" ? targetLens : null,
        targetType === "group" ? targetArchetype : null,
        subject,
        body,
        JSON.stringify({ tenant: req.tenant.slug }),
      ]
    );

    return res.json({ success: true, message: created.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "message create failed" });
  }
});

app.get("/t/:slug/messages", tenantMiddleware, async (req, res) => {
  try {
    const access = requirePolicyAction(req, res, { action: ACTIONS.DASHBOARD_READ, resourceTenantSlug: req.tenant.slug });
    if (!access.ok) return;
    if (!(await requireOwnerTenantMembership(req, res, req.tenant.id, access.actor))) return;
    const rows = await pool.query(
      `SELECT m.id,
              m.sender_email,
              m.target_type,
              m.target_email,
              u.name AS target_name,
              m.target_lens,
              m.target_archetype,
              m.subject,
              m.body,
              m.created_at
       FROM owner_customer_messages m
       LEFT JOIN users u
         ON u.tenant_id = m.tenant_id
        AND LOWER(COALESCE(u.email, '')) = LOWER(COALESCE(m.target_email, ''))
       WHERE m.tenant_id = $1
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 50`,
      [req.tenant.id]
    );
    return res.json({ tenant: req.tenant.slug, messages: rows.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "messages list failed" });
  }
});

app.get("/t/:slug/messages/inbox", tenantMiddleware, async (req, res) => {
  try {
    const email = normalizeEmail(req.query.email || req.headers["x-user-email"] || "");
    if (!email) return res.status(400).json({ error: "email is required" });

    const inbox = await pool.query(
      `SELECT m.id, m.sender_email, m.subject, m.body, m.created_at, m.target_type, m.target_lens, m.target_archetype
       FROM owner_customer_messages m
       WHERE m.tenant_id = $1
         AND (
           LOWER(COALESCE(m.target_email, '')) = $2
           OR (
             m.target_type = 'group'
             AND EXISTS (
               SELECT 1
               FROM assessment_submissions a
               WHERE a.tenant_id = m.tenant_id
                 AND a.assessment_type = 'customer'
                 AND LOWER(COALESCE(a.customer_email, '')) = $2
                 AND (
                   (LOWER(COALESCE(m.target_lens, '')) = 'personal' AND LOWER(COALESCE(a.personal_primary_archetype, '')) = LOWER(COALESCE(m.target_archetype, '')))
                   OR
                   (LOWER(COALESCE(m.target_lens, '')) = 'buyer' AND LOWER(COALESCE(a.buyer_primary_archetype, '')) = LOWER(COALESCE(m.target_archetype, '')))
                 )
             )
           )
         )
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT 100`,
      [req.tenant.id, email]
    );
    const customer = await findTenantUserExisting(req.tenant.id, email);
    return res.json({ tenant: req.tenant.slug, email, name: customer?.name || null, messages: inbox.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "customer inbox failed" });
  }
});

app.get("/t/:slug/campaigns/summary", tenantMiddleware, async (req, res) => {
  try {
    const tenantReadActor = await requireTenantReadAccess(req, res);
    if (!tenantReadActor || !tenantReadActor.role) return;
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
    const tenantReadActor = await requireTenantReadAccess(req, res);
    if (!tenantReadActor || !tenantReadActor.role) return;
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
    const consentFeature = getConsentFeatureContext(req, email);

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
    const user = await findTenantUser(tenantRow.id, email, client, name);
    await assertRequiredBusinessConsent({
      client,
      tenantId: tenantRow.id,
      userId: user.id,
      enforceConsent: consentFeature.enabled,
    });

    const campaign = await resolveCampaignForTenantStrict(tenantRow.id, cid, client);
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
    await client.query(
      `UPDATE tenant_memberships
       SET onboarding_complete = TRUE
       WHERE tenant_id = $1
         AND user_id = $2
         AND role = $3`,
      [tenantRow.id, user.id, ROLES.BUSINESS_OWNER]
    );
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
    console.log({
      email: normalizeEmail(email),
      tenant: tenantRow.slug,
      type: "business_owner",
      result_id: submission.id,
    });

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

    return res.status(err.statusCode || 500).json({
      error: err.statusCode ? err.message : "api intake failed",
      details: err.message,
    });

  } finally {
    client.release();
  }
});

app.get("/api/results/:email", async (req, res) => {
  try {
    const email = normalizeEmail(req.params.email);
    const requestedType = String(req.query.type || "").trim().toLowerCase();
    const normalizedType =
      requestedType === "bus_owner" ? "business_owner" : requestedType;
    const tenantSlug = String(req.query.tenant || "").trim().toLowerCase();
    console.log({
      requested_email: email,
      requested_tenant: tenantSlug || null,
      requested_type: requestedType || null,
    });
    const actor = deriveActor(req);
    const consentFeature = getConsentFeatureContext(req, email);
    if (actor.role === ROLES.ANONYMOUS && !actor.isAdmin) {
      return deny(res, 401, "authentication required", "Provide x-user-role and tenant context");
    }

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

    if (normalizedType) {
      if (!["business_owner", "customer"].includes(normalizedType)) {
        return res.status(400).json({
          error: "type must be business_owner or customer",
        });
      }

      query += " AND a.assessment_type = $2";
      params.push(normalizedType);
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
      const tenantMismatchProbe = await pool.query(
        `
          SELECT t.slug AS tenant_slug
          FROM assessment_submissions a
          JOIN users u ON u.id = a.user_id
          JOIN tenants t ON t.id = a.tenant_id
          WHERE u.email = $1
            AND ($2 = '' OR a.assessment_type = $2)
          ORDER BY a.created_at DESC, a.id DESC
          LIMIT 1
        `,
        [email, normalizedType || ""]
      );
      const fallbackTenant = tenantMismatchProbe.rows[0]?.tenant_slug || null;
      if (tenantSlug && fallbackTenant && fallbackTenant !== tenantSlug) {
        console.warn("tenant mismatch on result lookup", {
          requested_tenant: tenantSlug,
          actual_tenant: fallbackTenant,
          email,
          type: normalizedType || "any",
        });
      }

      return res.status(200).json({
        found: false,
        reason: "No result found for this user",
        email,
        tenant: tenantSlug || null,
        type: normalizedType || "any",
      });
    }

    // 🔥 DEBUG
    console.log("📊 RESULT FETCH:", {
      email,
      tenant: tenantSlug || null,
      type: normalizedType || "any",
      found: true,
    });

    const row = result.rows[0];
    if (row.assessment_type === "customer") {
      if (!consentFeature.enabled) {
        const legacyPolicy = evaluatePolicy({
          actor,
          action: ACTIONS.RESULTS_READ_OWNER,
          resourceTenantSlug: row.tenant_slug,
        });
        if (!legacyPolicy.allow) {
          return deny(res, 403, "forbidden", legacyPolicy.reason);
        }
      }
      const consentProfile = await getConsentProfileBySubmission(pool, row);
      const decision = canActorReadCustomerResult({
        actor,
        submissionTenantSlug: row.tenant_slug,
        submissionEmail: email,
        consentProfile,
        enforceConsent: consentFeature.enabled,
      });
      if (!decision.allow) {
        return deny(res, 403, "forbidden", decision.reason);
      }
      const payload = buildAssessmentResultPayload({
        assessmentType: row.assessment_type,
        tenantSlug: row.tenant_slug,
        email,
        submission: {
          ...row,
          cid: row.resolved_cid || row.cid || row.campaign_slug || null,
        },
      });
      const finalPayload = (consentFeature.enabled && decision.scope === "limited")
        ? applyLimitedNetworkView(payload)
        : payload;
      return res.json({
        ...finalPayload,
        result: finalPayload,
        consent_scope: consentFeature.enabled ? (decision.scope || "full") : "legacy",
        consent_enabled: consentFeature.enabled,
      });
    }

    const policy = evaluatePolicy({
      actor,
      action: ACTIONS.RESULTS_READ_OWNER,
      resourceTenantSlug: row.tenant_slug,
    });
    if (!policy.allow) {
      return deny(res, 403, "forbidden", policy.reason);
    }
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
    const consentFeature = getConsentFeatureContext(req);
    const actor = deriveActor(req);
    if (actor.role === ROLES.ANONYMOUS && !actor.isAdmin) {
      return deny(res, 401, "authentication required", "Provide x-user-role and tenant context");
    }

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
    const consentProfile = await getConsentProfileBySubmission(pool, row);
    const decision = canActorReadCustomerResult({
      actor,
      submissionTenantSlug: row.tenant_slug,
      submissionEmail: row.email,
      consentProfile,
      enforceConsent: consentFeature.enabled,
    });
    if (!decision.allow) {
      return deny(res, 403, "forbidden", decision.reason);
    }
    const payload = buildAssessmentResultPayload({
      assessmentType: "customer",
      tenantSlug: row.tenant_slug,
      email: row.email,
      submission: {
        ...row,
        cid: row.resolved_cid || row.cid || row.campaign_slug || null,
      },
    });

    const finalPayload = (consentFeature.enabled && decision.scope === "limited")
      ? applyLimitedNetworkView(payload)
      : payload;
    return res.json({
      ...finalPayload,
      result: finalPayload,
      consent_scope: consentFeature.enabled ? (decision.scope || "full") : "legacy",
      consent_enabled: consentFeature.enabled,
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
    const campaign = await resolveCampaignForTenantStrict(ctx.tenant.id, cid);
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
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "customer share failed" });
  }
});

app.get("/api/features/consent", async (req, res) => {
  const email = normalizeEmail(req.query?.email);
  const feature = getConsentFeatureContext(req, email);
  return res.json({
    feature: "CONSENT_V1",
    mode: feature.mode,
    enabled: feature.enabled,
    reason: feature.reason,
  });
});

app.get("/api/features/tap-crm", async (req, res) => {
  const email = normalizeEmail(req.query?.email);
  const feature = getTapCrmFeatureContext(req, email);
  return res.json({
    feature: "TAP_CRM",
    mode: feature.mode,
    enabled: feature.enabled,
    reason: feature.reason,
    routes_mounted: TAP_CRM_ROUTES_MOUNTED,
  });
});

app.post("/api/consent/required", async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantSlug = String(req.body?.tenant || "").trim().toLowerCase();
    const email = normalizeEmail(req.body?.email);
    const sessionId = normalizeSessionId(req.body?.session_id);
    const consentVersion = normalizeConsentVersion(req.body?.consent_version);
    const accepted = req.body?.accepted === true;
    const feature = getConsentFeatureContext(req, email);
    if (!feature.enabled) {
      return res.json({ ok: true, skipped: true, feature_mode: feature.mode, reason: feature.reason });
    }
    if (!tenantSlug || (!email && !sessionId)) {
      return res.status(400).json({ error: "tenant and (email or session_id) are required" });
    }
    if (!accepted) {
      return res.status(400).json({ error: "explicit consent acceptance is required" });
    }

    await client.query("BEGIN");
    const tenantRow = await ensureTenant(tenantSlug);
    const user = email ? await findTenantUser(tenantRow.id, email, client) : null;
    const consentIpAddress = getRequestIp(req);
    const consentUserAgent = getRequestUserAgent(req);
    const acceptedAt = new Date().toISOString();

    const profile = await upsertConsentProfile({
      client,
      tenantId: tenantRow.id,
      userId: user?.id || null,
      sessionId,
      consentVersion,
      consentIpAddress,
      consentUserAgent,
      businessConsentAcceptedAt: acceptedAt,
      networkConsentStatus: "private",
      networkConsentUpdatedAt: null,
      clearProfileDeleted: true,
    });
    await logConsentEvent({
      client,
      tenantId: tenantRow.id,
      userId: user?.id || null,
      sessionId,
      consentType: "business_only_required",
      consentVersion,
      eventType: "consent_accepted",
      value: true,
      consentIpAddress,
      consentUserAgent,
      metadata: { source: "qr_onboarding" },
    });
    await client.query("COMMIT");
    return res.json({
      ok: true,
      tenant: tenantRow.slug,
      user_id: user?.id || null,
      session_id: sessionId || null,
      consent_type: "business_only_required",
      business_consent_required_accepted_at: profile.business_consent_required_accepted_at,
      consent_version: profile.consent_version,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("consent_required_failed", err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "consent required failed" });
  } finally {
    client.release();
  }
});

app.post("/api/consent/network", async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantSlug = String(req.body?.tenant || "").trim().toLowerCase();
    const email = normalizeEmail(req.body?.email);
    const consentVersion = normalizeConsentVersion(req.body?.consent_version);
    const value = req.body?.value === true;
    const feature = getConsentFeatureContext(req, email);
    if (!feature.enabled) {
      return res.json({
        ok: true,
        skipped: true,
        feature_mode: feature.mode,
        reason: feature.reason,
        network_consent_status: "private",
      });
    }
    if (!tenantSlug || !email) return res.status(400).json({ error: "tenant and email are required" });

    await client.query("BEGIN");
    const tenantRow = await ensureTenant(tenantSlug);
    const user = await findTenantUser(tenantRow.id, email, client, name);
    const consentIpAddress = getRequestIp(req);
    const consentUserAgent = getRequestUserAgent(req);
    const updatedAt = new Date().toISOString();
    const profile = await upsertConsentProfile({
      client,
      tenantId: tenantRow.id,
      userId: user.id,
      consentVersion,
      consentIpAddress,
      consentUserAgent,
      networkConsentStatus: value ? "network" : "private",
      networkConsentUpdatedAt: updatedAt,
    });
    await logConsentEvent({
      client,
      tenantId: tenantRow.id,
      userId: user.id,
      consentType: "network_optional",
      consentVersion,
      eventType: value ? "consent_changed" : "consent_revoked",
      value,
      consentIpAddress,
      consentUserAgent,
      metadata: { scope: "network_sharing" },
    });
    await client.query("COMMIT");
    return res.json({
      ok: true,
      tenant: tenantRow.slug,
      email,
      consent_type: "network_optional",
      network_consent_status: profile.network_consent_status,
      network_consent_updated_at: profile.network_consent_updated_at,
      consent_version: profile.consent_version,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("consent_network_failed", err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "network consent save failed" });
  } finally {
    client.release();
  }
});

app.get("/api/consent/state", async (req, res) => {
  try {
    const tenantSlug = String(req.query?.tenant || "").trim().toLowerCase();
    const email = normalizeEmail(req.query?.email);
    const feature = getConsentFeatureContext(req, email);
    if (!feature.enabled) {
      return res.json({
        tenant: tenantSlug || null,
        email,
        has_profile: false,
        business_consent_required_accepted_at: null,
        network_consent_status: "private",
        network_consent_updated_at: null,
        profile_deleted_at: null,
        consent_version: "v1",
        feature_mode: feature.mode,
        consent_enabled: false,
      });
    }
    if (!tenantSlug || !email) return res.status(400).json({ error: "tenant and email are required" });
    const tenantRow = await getTenantBySlug(tenantSlug);
    if (!tenantRow) return res.status(404).json({ error: "tenant not found" });
    const user = await findTenantUserExisting(tenantRow.id, email);
    if (!user) {
      return res.json({
        tenant: tenantRow.slug,
        email,
        has_profile: false,
        business_consent_required_accepted_at: null,
        network_consent_status: "private",
        network_consent_updated_at: null,
        profile_deleted_at: null,
        consent_version: "v1",
      });
    }
    const profile = await pool.query(
      `SELECT * FROM customer_consent_profiles WHERE tenant_id = $1 AND user_id = $2 ORDER BY updated_at DESC NULLS LAST, id DESC LIMIT 1`,
      [tenantRow.id, user.id]
    );
    const row = profile.rows[0] || null;
    return res.json({
      tenant: tenantRow.slug,
      email,
      has_profile: !!row,
      business_consent_required_accepted_at: row?.business_consent_required_accepted_at || null,
      network_consent_status: row?.network_consent_status || "private",
      network_consent_updated_at: row?.network_consent_updated_at || null,
      profile_deleted_at: row?.profile_deleted_at || null,
      consent_version: row?.consent_version || "v1",
    });
  } catch (err) {
    console.error("consent_state_failed", err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "consent state failed" });
  }
});

app.post("/api/consent/profile/delete", async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantSlug = String(req.body?.tenant || "").trim().toLowerCase();
    const email = normalizeEmail(req.body?.email);
    const consentVersion = normalizeConsentVersion(req.body?.consent_version);
    const feature = getConsentFeatureContext(req, email);
    if (!feature.enabled) {
      return res.json({ ok: true, skipped: true, feature_mode: feature.mode, reason: feature.reason });
    }
    if (!tenantSlug || !email) return res.status(400).json({ error: "tenant and email are required" });

    await client.query("BEGIN");
    const tenantRow = await ensureTenant(tenantSlug);
    const user = await findTenantUser(tenantRow.id, email, client, name);
    const nowIso = new Date().toISOString();
    await upsertConsentProfile({
      client,
      tenantId: tenantRow.id,
      userId: user.id,
      consentVersion,
      consentIpAddress: getRequestIp(req),
      consentUserAgent: getRequestUserAgent(req),
      networkConsentStatus: "private",
      networkConsentUpdatedAt: nowIso,
      profileDeletedAt: nowIso,
    });
    await client.query(
      `UPDATE assessment_submissions
       SET customer_email = NULL,
           customer_name = NULL
       WHERE tenant_id = $1
         AND user_id = $2`,
      [tenantRow.id, user.id]
    );
    await logConsentEvent({
      client,
      tenantId: tenantRow.id,
      userId: user.id,
      consentType: "profile",
      consentVersion,
      eventType: "profile_deleted",
      value: false,
      consentIpAddress: getRequestIp(req),
      consentUserAgent: getRequestUserAgent(req),
      metadata: { anonymized_submissions: true },
    });
    await client.query("COMMIT");
    return res.json({ ok: true, tenant: tenantRow.slug, email, profile_deleted_at: nowIso });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("consent_profile_delete_failed", err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "profile delete failed" });
  } finally {
    client.release();
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
  const adminCheck = requirePolicyAction(req, res, { action: ACTIONS.TENANT_ADMIN, resourceTenantSlug: String(req.params.tenant || "").trim().toLowerCase() });
  if (!adminCheck.ok || !adminCheck.actor.isAdmin) return deny(res, 403, "forbidden", "admin role required");
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
  const requestedTenant = String(req.body?.tenant || "").trim().toLowerCase();
  const adminCheck = requirePolicyAction(req, res, { action: ACTIONS.TENANT_ADMIN, resourceTenantSlug: requestedTenant });
  if (!adminCheck.ok || !adminCheck.actor.isAdmin) return deny(res, 403, "forbidden", "admin role required");
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
    const user = await findTenantUser(tenantRow.id, email, client, name);
    await assertRequiredBusinessConsent({
      client,
      tenantId: tenantRow.id,
      userId: user.id,
      enforceConsent: consentFeature.enabled,
    });

    const campaign = await resolveCampaignForTenantStrict(tenantRow.id, cid, client);
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
    const ownerRecipient = await resolveOwnerRecipient({
      tenantId: tenantRow.id,
      campaignId: campaign?.id || null,
      client,
    });
    await recordCampaignEvent({
      tenantId: tenantRow.id,
      campaignId: campaign?.id || null,
      eventType: "customer_share_result",
      customerEmail: email,
      customerName: name,
      client,
      meta: {
        result_id: String(submission.id ?? "").trim() || null,
        campaign_slug: campaign?.slug || normalizeSlug(cid) || null,
        owner_email: ownerRecipient.ownerEmail,
        owner_rid: ownerRecipient.ownerRid,
        auto_notified: true,
        used_admin_fallback: ownerRecipient.usedFallback,
      },
    });
    const vocPointsAdded = rewardPointsEnabled((await getTenantConfig(tenantRow.id)) || {}) ? REWARD_POINTS.voc : 0;
    if (vocPointsAdded > 0) {
      await client.query(
        "UPDATE users SET points = points + $1 WHERE tenant_id = $2 AND id = $3",
        [vocPointsAdded, tenantRow.id, user.id]
      );
    }

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
      owner_email: ownerRecipient.ownerEmail,
      owner_rid: ownerRecipient.ownerRid,
      owner_notification_auto: true,
      owner_notification_fallback: ownerRecipient.usedFallback,
      points_added: vocPointsAdded,
    });

  } catch (err) {
    await client.query("ROLLBACK");

    console.error("voc_intake_failed", err);

    return res.status(err.statusCode || 500).json({
      error: err.statusCode ? err.message : "voc intake failed",
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
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          event: "tap_crm_runtime",
          mode: TAP_CRM_MODE,
          routes_mounted: TAP_CRM_ROUTES_MOUNTED,
        })
      );
    });
  } catch (err) {
    console.error("Database initialization failed", err);
    process.exit(1);
  }
})();
