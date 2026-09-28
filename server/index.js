Warning: truncated output (original token count: 80015)
Total output lines: 8026

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

const { pool, initializeDatabase, dbConnectionResolution } = require("./db");
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
const { createArchetypeEnginesRouter } = require("./archetypeEnginesRoutes");
const { initializeArchetypeEngineSchema } = require("./archetypeEnginesService");
const { createYouthDevelopmentRouter } = require("./youthDevelopmentRoutes");
const { createYouthDevelopmentIntakeRouter } = require("./youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentTdeRouter } = require("./youthDevelopmentTdeRoutes");
const { createAssessmentVoiceRouter } = require("./assessmentVoiceRoutes");
const { createSkillWorldAudioRouter } = require("./skillWorldAudioRoutes");
const { createTdePersistenceRepository } = require("../youth-development/tde/persistenceRepository");
const { createVoiceService } = require("../youth-development/tde/voiceService");
const { selectLatestYouthSubmission } = require("./youthLatestSelection");
const { PROGRAM_PHASES } = require("../youth-development/tde/programRail");
const {
  defaultExecutionState,
  normalizeExecutionState,
  validateWeeklyExecutionActionPayload,
  applyWeeklyExecutionAction,
} = require("../youth-development/tde/weeklyExecutionContract");
const {
  normalizeParentCommitmentPlan,
  validateParentCommitmentSetup,
  validateScheduledSessions,
  convert12To24,
} = require("../youth-development/tde/parentCommitmentSetupContract");
const {
  applySessionCompletionToSchedule,
} = require("../youth-development/tde/parentSessionMutationIntegrity");
const { generateSite } = require("./siteMaterializer");
const { createWebsiteRouter, authorizeWebsiteOwner } = require("./websiteRoutes");
const { websiteSignupReturnPath } = require("./websiteReturnPath");
const { getTapCrmMode } = require("./tapCrmFeature");
const { createTapCrmRouter, resolvePublicTap } = require("./tapCrmRoutes");
const { buildTapHubViewModel, renderTapHubPage, renderTapHubErrorPage } = require("./tapHubRenderer");
const { createGatesRouter } = require("./gatesRoutes");
const { createAdaptiveV2Router } = require("./adaptiveV2Routes");
const { createAssessmentMvpRouter } = require("./assessmentMvpRoutes");
const youthProfileRegistry = require("./youthDevelopmentProfiles");
const { createSimbaWajumaRouter, buildAssessmentCompletionPayload, verifyTransferToken } = require("./simbawajumaBridge");
const { queueExternalEvent, retryQueuedExternalEvents } = require("./simbawajumaEvents");
const { createLeaderWithinRouter } = require("./leaderWithinRoutes");
const { createGatesV2ChildRouter } = require("./gatesV2ChildUiRoute");

// Optional Site Generator (won't crash if missing)
let siteGenerator = null;
try {
  // eslint-disable-next-line global-require
  siteGenerator = require("./siteGenerator");
} catch (_) {
  siteGenerator = null;
}

const app = express();
setInterval(() => {
  retryQueuedExternalEvents({ pool }).catch((err) => console.error("simbawajuma_callback_retry_failed", err));
}, Number(process.env.SIMBAWAJUMAA_RETRY_INTERVAL_MS || 120000)).unref?.();

app.set("trust proxy", 1);
const PORT = Number(process.env.PORT || 3000);
const TAP_CRM_MODE = getTapCrmMode();
const TAP_CRM_ROUTES_MOUNTED = TAP_CRM_MODE !== "off";
const { OWNER_SESSION_COOKIE, OWNER_SESSION_TTL_MS, isAdminEmail, createPasswordHash, verifyPasswordHash, sha256, createSessionToken, buildOwnerSessionCookie, authenticateOwnerCredentials, normalizeEmail } = require("./authService");
const allowedOrigins = new Set(
  [
    "https://garveyfrontend.onrender.com",
    String(process.env.FRONTEND_ORIGIN || "").trim(),
  ].filter(Boolean)
);


app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

function buildVersionPayload() {
  return {
    commit_sha: String(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || process.env.COMMIT_SHA || "unknown"),
    build_timestamp: String(process.env.BUILD_TIMESTAMP || process.env.RENDER_BUILD_TIMESTAMP || process.env.BUILD_TIME || "unknown"),
    environment_name: String(process.env.RENDER_ENVIRONMENT || process.env.NODE_ENV || "development"),
    service_name: String(process.env.RENDER_SERVICE_NAME || process.env.SERVICE_NAME || "garvey"),
  };
}

app.get("/api/version", (req, res) => res.json(buildVersionPayload()));

function authRequestId() { return `auth_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`; }
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
  if (!allowedOrigins.has(origin) && !sameOrigin && !isCustomerFlowRoute) return { allowed: false, reason: "origin_rejected" };

  res.header("Access-Control-Allow-Origin", origin);
  res.header("Vary", "Origin");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-role, x-user-email, x-tenant-slug, x-csrf-token");
  return { allowed: true };
}

app.use((req, res, next) => {
  const cors = applyCorsHeaders(req, res);
  if (!cors.allowed) return res.status(403).json({ ok: false, error: "origin_rejected", message: "This sign-in request could not be accepted.", request_id: authRequestId() });
  return next();
});
app.options("*", (req, res) => {
  const cors = applyCorsHeaders(req, res);
  if (!cors.allowed) return res.status(403).json({ ok: false, error: "origin_rejected", message: "This sign-in request could not be accepted.", request_id: authRequestId() });
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
      tenantId: session.tenant_id,
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

app.get("/archetype-engines/:engine/result/:resultId", (req, res, next) => {
  const engine = String(req.params.engine || "").trim().toLowerCase();
  if (!["love", "leadership", "loyalty"].includes(engine)) return next();
  return res.sendFile(path.join(__dirname, "..", "public", "archetype-engines", "experience.html"));
});

app.get("/archetype-engines/:engine/result/:resultId/story", (req, res, next) => {
  const engine = String(req.params.engine || "").trim().toLowerCase();
  if (!["love", "leadership", "loyalty"].includes(engine)) return next();
  return res.sendFile(path.join(__dirname, "..", "public", "archetype-engines", "experience.html"));
});

app.get("/archetype-engines/:engine/archetype/:slug", (req, res, next) => {
  const engine = String(req.params.engine || "").trim().toLowerCase();
  if (!["love", "leadership", "loyalty"].includes(engine)) return next();
  return res.sendFile(path.join(__dirname, "..", "public", "archetype-engines", "experience.html"));
});

app.get("/archetype-engines/:engine/browse", (req, res, next) => {
  const engine = String(req.params.engine || "").trim().toLowerCase();
  if (!["love", "leadership", "loyalty"].includes(engine)) return next();
  return res.sendFile(path.join(__dirname, "..", "public", "archetype-engines", "experience.html"));
});

app.get("/archetype-engines/:engine/assessment", (req, res, next) => {
  const engine = String(req.params.engine || "").trim().toLowerCase();
  if (!["love", "leadership", "loyalty"].includes(engine)) return next();
  return res.sendFile(path.join(__dirname, "..", "public", "archetype-engines", "experience.html"));
});

app.get("/skill-world/:skillId/drill", (req, res) => {
  return res.sendFile(path.join(__dirname, "..", "public", "gamehub", "skill-world", "index.html"));
});

app.get("/skill-world/:skillId", (req, res) => {
  return res.sendFile(path.join(__dirname, "..", "public", "gamehub", "skill-world", "index.html"));
});

app.use("/generated-audio/skill-world", express.static(path.join(__dirname, "..", "public", "generated-audio", "skill-world")));
app.use(createLeaderWithinRouter(pool));
// Public launch-ready child route remains explicitly scoped before general static serving.
app.use('/gates-v2-child', createGatesV2ChildRouter());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use('/dashboardnew', express.static(path.join(__dirname, '..', 'dashboardnew')));
app.use(createGatesRouter());
app.use(createAdaptiveV2Router({ pool, listYouthChildProfiles: listYouthChildProfilesForAccount }));
app.use("/api/assessment-mvp", createAssessmentMvpRouter({ pool, resolveOwnedChild: resolveYouthDevelopmentOrGatesOwnedChild }));
app.use(createSimbaWajumaRouter({ pool }));
console.log(JSON.stringify({ ts: new Date().toISOString(), event: "gates_router_mounted" }));

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


function safeInternalReturnPath(value, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 300) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  try {
    const parsed = new URL(raw, "https://garvey.local");
    if (parsed.origin !== "https://garvey.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_) {
    return fallback;
  }
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

function normalizeChildDisplayName(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  return normalized.slice(0, 120);
}

function normalizeChildScopeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function deriveChildScopeId({ tenantSlug, email, childName }) {
  const nameSlug = normalizeSlug(childName || "child") || "child";
  const digest = sha256(`${tenantSlug}|${email}|${nameSlug}`).slice(0, 12);
  return `child-${nameSlug}-${digest}`;
}

function buildChildProfileFromInput(accountCtx = {}, requestBody = {}) {
  const tenantSlug = String(accountCtx?.tenant || "").trim().toLowerCase();
  const email = normalizeEmail(accountCtx?.email || "");
  const childName = normalizeChildDisplayName(requestBody?.child_name || requestBody?.childName || "");
  const explicitChildId = normalizeChildScopeId(requestBody?.child_id || requestBody?.childId || "");
  const ageBand = String(requestBody?.child_age_band || requestBody?.childAgeBand || "").trim();
  const gradeBand = String(requestBody?.child_grade_band || requestBody?.childGradeBand || "").trim();
  const childId = explicitChildId || (tenantSlug && email ? deriveChildScopeId({ tenantSlug, email, childName }) : "");
  return {
    child_id: childId || null,
    child_name: childName || null,
    child_age_band: ageBand || null,
    child_grade_band: gradeBand || null,
    profile_status: childName ? "ready" : "identity_incomplete",
  };
}

function deriveLegacyChildScopeIdFromRow({ tenantSlug = "", email = "", rawAnswers = {}, customerName = "" }) {
  const normalizedTenant = String(tenantSlug || "").trim().toLowerCase();
  const normalizedEmail = normalizeEmail(email || "");
  if (!normalizedTenant || !normalizedEmail) return "";
  const ownershipProfile = rawAnswers?.ownership?.child_profile || {};
  const persistedChildName = normalizeChildDisplayName(ownershipProfile?.child_name || "");
  const fallbackChildName = normalizeChildDisplayName(customerName || "");
  const candidateName = persistedChildName || fallbackChildName;
  if (!candidateName) return "";
  return deriveChildScopeId({ tenantSlug: normalizedTenant, email: normalizedEmail, childName: candidateName });
}

function mapYouthAssessmentHistoryEntry({ row, tenantSlug = "", email = "" }) {
  const raw = row?.raw_answers && typeof row.raw_answers === "object" ? row.raw_answers : {};
  const payload = extractYouthAssessmentPayloadFromRaw(raw);
  const ownership = raw?.ownership && typeof raw.ownership === "object" ? raw.ownership : {};
  const childProfile = ownership?.child_profile && typeof ownership.child_profile === "object"
    ? ownership.child_profile
    : {};
  const normalizedChildId = normalizeChildScopeId(childProfile?.child_id || "")
    || deriveLegacyChildScopeIdFromRow({
      tenantSlug,
      email,
      rawAnswers: raw,
      customerName: row?.customer_name || "",
    })
    || null;
  const highest = payload?.interpretation?.highest_trait || {};
  const lowest = payload?.interpretation?.lowest_trait || {};
  return {
    submission_id: row?.id || null,
    saved_at: row?.created_at || null,
    child_profile: {
      child_id: normalizedChildId,
      child_name: normalizeChildDisplayName(childProfile?.child_name || row?.customer_name || "") || null,
      child_age_band: childProfile?.child_age_band || null,
      child_grade_band: childProfile?.child_grade_band || null,
    },
    interpretation: {
      highest_trait: highest || {},
      lowest_trait: lowest || {},
    },
    completion: payload?.completion || {},
  };
}

function extractYouthAssessmentPayloadFromRaw(rawAnswers = {}) {
  const raw = rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {};
  const nestedPayload = raw?.payload && typeof raw.payload === "object" ? raw.payload : null;
  if (nestedPayload) return nestedPayload;

  const legacyPayload = raw?.result_payload && typeof raw.result_payload === "object" ? raw.result_payload : null;
  if (legacyPayload) return legacyPayload;

  const hasLegacyTopLevelPayload = Boolean(
    (raw?.result && typeof raw.result === "object")
    || (raw?.dashboard && typeof raw.dashboard === "object")
    || (raw?.page_model && typeof raw.page_model === "object")
    || (raw?.trait_reports && Array.isArray(raw.trait_reports))
    || (raw?.aggregated_trait_rows && Array.isArray(raw.aggregated_trait_rows))
    || (raw?.completion && typeof raw.completion === "object")
    || (raw?.interpretation && typeof raw.interpretation === "object")
  );
  if (!hasLegacyTopLevelPayload) return null;

  return {
    interpretation: raw?.interpretation || raw?.scoring?.interpretation || {},
    completion: raw?.completion || raw?.scoring?.completion || {},
    result: raw?.result || {},
    dashboard: raw?.dashboard || {},
    page_model: raw?.page_model || {},
    trait_reports: Array.isArray(raw?.trait_reports) ? raw.trait_reports : [],
    aggregated_trait_rows: Array.isArray(raw?.aggregated_trait_rows)
      ? raw.aggregated_trait_rows
      : (Array.isArray(raw?.scoring?.trait_rows) ? raw.scoring.trait_rows : []),
  };
}

function resolvePhaseForWeek(weekNumber) {
  const week = Number(weekNumber);
  if (!Number.isInteger(week) || week < 1) return null;
  return PROGRAM_PHASES.find((phase) => week >= phase.start_week && week <= phase.end_week) || null;
}

function buildProgramBridgePayload({
  tenant,
  email,
  childProfile,
  assessmentComplete,
  enrollment,
}) {
  const childId = normalizeChildScopeId(childProfile?.child_id || "");
  const childName = normalizeChildDisplayName(childProfile?.child_name || "") || "Child";
  const profileReady = childProfile?.profile_status === "ready" && Boolean(childId);
  const currentWeek = Math.max(1, Math.min(36, Number(enrollment?.current_week) || 1));
  const phase = resolvePhaseForWeek(currentWeek);
  const hasEnrollment = Boolean(enrollment && enrollment.enrollment_id);
  const programStatus = String(enrollment?.program_status || (hasEnrollment ? "active" : "not_started")).trim().toLowerCase();
  const canLaunch = Boolean(assessmentComplete && profileReady);
  const ctaLabel = hasEnrollment ? "Continue Program" : "Start Program";
  const ctaUrl = canLaunch
    ? `/youth-development/program?tenant=${encodeURIComponent(tenant)}&email=${encodeURIComponent(email)}&child_id=${encodeURIComponent(childId)}`
    : "";
  const nextAction = !assessmentComplete
    ? "Complete intake walkthrough"
    : (!profileReady ? "Complete child profile setup" : (hasEnrollment ? `Continue Week ${currentWeek}` : "Start Program"));
  const blockedReason = assessmentComplete
    ? (!profileReady ? "child_profile_missing" : null)
    : "assessment_incomplete";
  const ctaContract = {
    label: ctaLabel,
    href: ctaUrl,
    action: hasEnrollment ? "continue_program" : "start_program",
    blocked_reason: canLaunch ? null : blockedReason,
  };

  return {
    ok: true,
    child_id: childId || null,
    child_name: childName,
    assessment_complete: assessmentComplete === true,
    setup_needed: !profileReady,
    launch_allowed: canLaunch,
    has_enrollment: hasEnrollment,
    enrollment_id: enrollment?.enrollment_id || null,
    program_status: programStatus,
    program_status_label: hasEnrollment ? (programStatus === "active" ? "In progress" : "Paused") : (canLaunch ? "Ready to start" : "Setup needed"),
    current_week: canLaunch ? currentWeek : null,
    current_phase_name: phase?.phase_name || null,
    next_recommended_action: nextAction,
    parent_summary: !assessmentComplete
      ? "Assessment incomplete. Complete intake before launching the program."
      : (!profileReady ? "Program setup is incomplete because child profile scope is missing." : (hasEnrollment ? `${childName} is enrolled and ready to continue the guided program.` : `${childName} is ready to start the guided development program.`)),
    cta: canLaunch ? { label: ctaLabel, href: ctaUrl } : null,
    parent_program_state: {
      child_scope: {
        child_id: childId || null,
        child_name: childName,
        profile_ready: profileReady,
      },
      program: {
        status: programStatus,
        status_label: hasEnrollment ? (programStatus === "active" ? "In progress" : "Paused") : (canLaunch ? "Ready to start" : "Setup needed"),
        has_enrollment: hasEnrollment,
        enrollment_id: enrollment?.enrollment_id || null,
        current_phase_name: phase?.phase_name || null,
        current_week: canLaunch ? currentWeek : null,
      },
      next_action: nextAction,
      blocked_reason: canLaunch ? null : blockedReason,
      cta: ctaContract,
    },
  };
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

function buildResultCidTrace(row) {
  const submissionCid = normalizeSlug(row?.submission_cid ?? row?.cid);
  const submissionCampaignSlug = normalizeSlug(row?.submission_campaign_slug ?? row?.campaign_slug);
  const vocSessionCid = normalizeSlug(row?.voc_session_cid);
  const intakeSessionCid = normalizeSlug(row?.intake_session_cid);
  const campaignJoinCid = normalizeSlug(row?.campaign_join_cid);
  const campaignEventCid = normalizeSlug(row?.campaign_event_cid);

  const orderedSources = [
    { source: "submission.cid", value: submissionCid },
    { source: "submission.campaign_slug", value: submissionCampaignSlug },
    { source: "voc_sessions.campaign_slug", value: vocSessionCid },
    { source: "intake_sessions.campaign_slug", value: intakeSessionCid },
    { source: "campaigns.slug", value: campaignJoinCid },
    { source: "campaign_events.meta.campaign_slug", value: campaignEventCid },
  ];

  const resolved = orderedSources.find((entry) => entry.value)?.value || null;
  const resolvedFrom = orderedSources.find((entry) => entry.value)?.source || null;

  return {
    submissionCid,
    submissionCampaignSlug,
    vocSessionCid,
    intakeSessionCid,
    campaignJoinCid,
    campaignEventCid,
    resolved,
    resolvedFrom,
    orderedSources,
  };
}

function logResultCidTrace(route, row, trace) {
  console.info("[results-cid-trace]", JSON.stringify({
    route,
    tenant: String(row?.tenant_slug || "").trim() || null,
    result_id: row?.id ?? null,
    session_id: row?.session_id ?? null,
    submission_cid: trace.submissionCid,
    submission_campaign_slug: trace.submissionCampaignSlug,
    voc_session_cid: trace.vocSessionCid,
    intake_session_cid: trace.intakeSessionCid,
    campaign_join_cid: trace.campaignJoinCid,
    campaign_event_cid: trace.campaignEventCid,
    final_cid: trace.resolved,
    final_cid_source: trace.resolvedFrom,
  }));
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

async function findCustomerResultCampaignLink({
  tenantId,
  crid,
  email,
  client = pool,
}) {
  const resultId = String(crid || "").trim();
  if (!resultId) return null;
  const normalizedEmail = normalizeEmail(email);
  const probe = await client.query(
    `
      SELECT
        a.id,
        a.session_id,
        a.campaign_id,
        a.cid AS submission_cid,
        a.campaign_slug AS submission_campaign_slug,
        vs.campaign_slug AS voc_session_cid,
        isess.campaign_slug AS intake_session_cid,
        c.slug AS campaign_join_cid
      FROM assessment_submissions a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN voc_sessions vs ON vs.id = a.session_id AND vs.tenant_id = a.tenant_id
      LEFT JOIN intake_sessions isess ON isess.id = a.session_id AND isess.tenant_id = a.tenant_id
      LEFT JOIN campaigns c ON c.id = COALESCE(a.campaign_id, vs.campaign_id, isess.campaign_id)
      WHERE a.tenant_id = $1
        AND a.id::text = $2
        AND a.assessment_type = 'customer'
        AND LOWER(COALESCE(u.email, '')) = LOWER($3)
      LIMIT 1
    `,
    [tenantId, resultId, normalizedEmail]
  );
  if (!probe.rows[0]) return null;
  const row = probe.rows[0];
  const trace = buildResultCidTrace({
    submission_cid: row.submission_cid,
    submission_campaign_slug: row.submission_campaign_slug,
    voc_session_cid: row.voc_session_cid,
    intake_session_cid: row.intake_session_cid,
    campaign_join_cid: row.campaign_join_cid,
  });
  return {
    resultId: String(row.id),
    sessionId: row.session_id || null,
    campaignId: row.campaign_id || null,
    cid: trace.resolved,
    cidSource: trace.resolvedFrom,
  };
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

async function resolveOwnerRecipient({ tenantId, campaignId = null, cli…50015 tokens truncated…s: {}, sources: {} },
      leadership: { assessment_type: "leadership", starts: 0, completions: 0, events: {}, sources: {} },
      loyalty: { assessment_type: "loyalty", starts: 0, completions: 0, events: {}, sources: {} },
    });
    const families = familySeed();
    for (const row of engineStarts.rows || []) {
      const key = String(row.engine_type || "").toLowerCase();
      if (!families[key]) continue;
      const source = sourceFromContext(parseContext(row.campaign_context));
      families[key].starts += 1;
      families[key].sources[source] = (families[key].sources[source] || 0) + 1;
    }
    for (const row of engineCompletions.rows || []) {
      const key = String(row.engine_type || "").toLowerCase();
      if (!families[key]) continue;
      const source = sourceFromContext(parseContext(row.campaign_context));
      families[key].completions += 1;
      families[key].sources[source] = (families[key].sources[source] || 0) + 1;
    }
    for (const row of engineEvents.rows || []) {
      const key = String(row.engine_type || "").toLowerCase();
      if (!families[key]) continue;
      const eventKey = String(row.page_key || "").trim().toLowerCase();
      if (!eventKey) continue;
      families[key].events[eventKey] = (families[key].events[eventKey] || 0) + 1;
    }
    const vocTotal = Number(vocCounts.rows[0]?.total || 0);
    families.voc.starts = vocTotal;
    families.voc.completions = vocTotal;
    for (const row of vocSourceRows.rows || []) {
      const key = String(row.source_key || "other").trim().toLowerCase() || "other";
      families.voc.sources[key] = Number(row.total || 0);
    }

    return res.json({
      tenant: req.tenant.slug,
      visits_by_day: visitsByDay.rows,
      growth: growth.rows,
      archetypes: archetypes.rows,
      owner_assessment: ownerAssessment.rows[0] || null,
      customer_assessment: customerAssessment.rows[0] || null,
      assessment_families: families,
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

app.post("/api/system/activate-full", async (req, res) => {
  if (!authorizeWebsiteOwner(req, res)) return;
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

    const dbByQid = new Map(rows.map((row) => [String(row.qid || "").trim(), row]));
    const catalogQuestions = getQuestions(assessmentType);
    const sourceRows = catalogQuestions.length ? catalogQuestions.map((catalogQuestion) => dbByQid.get(catalogQuestion.qid) || {
      qid: catalogQuestion.qid,
      assessment_type: assessmentType,
      question_text: catalogQuestion.text,
      option_a: catalogQuestion.options?.[0]?.text || "",
      option_b: catalogQuestion.options?.[1]?.text || "",
      option_c: catalogQuestion.options?.[2]?.text || "",
      option_d: catalogQuestion.options?.[3]?.text || "",
      mapping_a: JSON.stringify(catalogQuestion.options?.[0]?.maps || []),
      mapping_b: JSON.stringify(catalogQuestion.options?.[1]?.maps || []),
      mapping_c: JSON.stringify(catalogQuestion.options?.[2]?.maps || []),
      mapping_d: JSON.stringify(catalogQuestion.options?.[3]?.maps || []),
    }) : rows;
    const normalized = sourceRows.map((row) => ({
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
    queueExternalEvent({
      eventType: "assessment.completed",
      userId: user.id,
      externalUserId: normalizeEmail(email),
      email: normalizeEmail(email),
      payload: buildAssessmentCompletionPayload({
        assessmentType: "business_owner",
        resultId: submission.id,
        primaryResult: scored.primary,
        completedAt: submission.created_at || new Date().toISOString(),
        extra: {
          email: normalizeEmail(email),
          member_id: normalizeEmail(email),
          submission_id: submission.id,
          points_awarded: 0,
          result_url: `/api/results/${encodeURIComponent(normalizeEmail(email))}?type=business_owner&tenant=${encodeURIComponent(tenantRow.slug)}`,
          secondary_result: scored.secondary,
          weakness_role: scored.weakness,
          score: Object.values(scored.archetype_counts || {}).reduce((sum, value) => sum + Number(value || 0), 0),
          strengths: [
            scored.primary ? `Your primary business owner pattern is ${scored.primary}.` : null,
            scored.secondary ? `${scored.secondary} supports your execution style.` : null,
          ].filter(Boolean),
          growth_edges: [scored.weakness ? `Strengthen ${scored.weakness} with one focused weekly action.` : null].filter(Boolean),
          recommendations: scored.recommendations,
          archetype_definition: scored.primary ? ARCHETYPE_DEFINITIONS[scored.primary] : null,
          ...resultContract,
        },
      }),
    }).catch((err) => console.error("simbawajuma_owner_assessment_event_queue_failed", err));
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
    if (actor.role === ROLES.ANONYMOUS && !actor.isAdmin && !String(req.query.token || req.query.transfer_token || "").trim()) {
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
        a.cid AS submission_cid,
        a.campaign_slug AS submission_campaign_slug,
        vs.campaign_slug AS voc_session_cid,
        isess.campaign_slug AS intake_session_cid,
        c.slug AS campaign_join_cid,
        (
          SELECT NULLIF(TRIM(ce.meta->>'campaign_slug'), '')
          FROM campaign_events ce
          WHERE ce.tenant_id = a.tenant_id
            AND ce.meta->>'result_id' = a.id::text
          ORDER BY ce.created_at DESC, ce.id DESC
          LIMIT 1
        ) AS campaign_event_cid,
        COALESCE(
          a.cid,
          a.campaign_slug,
          vs.campaign_slug,
          isess.campaign_slug,
          c.slug,
          (
            SELECT NULLIF(TRIM(ce.meta->>'campaign_slug'), '')
            FROM campaign_events ce
            WHERE ce.tenant_id = a.tenant_id
              AND ce.meta->>'result_id' = a.id::text
            ORDER BY ce.created_at DESC, ce.id DESC
            LIMIT 1
          )
        ) AS resolved_cid
      FROM assessment_submissions a
      JOIN users u ON u.id = a.user_id
      JOIN tenants t ON t.id = a.tenant_id
      LEFT JOIN voc_sessions vs ON vs.id = a.session_id
        AND vs.tenant_id = a.tenant_id
        AND LOWER(COALESCE(vs.email, '')) = LOWER(COALESCE(u.email, ''))
      LEFT JOIN intake_sessions isess ON isess.id = a.session_id
        AND isess.tenant_id = a.tenant_id
        AND LOWER(COALESCE(isess.email, '')) = LOWER(COALESCE(u.email, ''))
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
    const cidTrace = buildResultCidTrace(row);
    logResultCidTrace("GET /api/results/:email", row, cidTrace);

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
          cid: cidTrace.resolved,
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
      const simbaParticipantAccess = hasSimbaParticipantResultAccess(req, { row, requestedEmail: email, actor });
      if (!simbaParticipantAccess.allow) {
        return deny(res, 403, "forbidden", policy.reason);
      }
      res.setHeader("X-Garvey-Result-Access", simbaParticipantAccess.reason);
    }
    const payload = buildAssessmentResultPayload({
      assessmentType: row.assessment_type,
      tenantSlug: row.tenant_slug,
      email,
      submission: {
        ...row,
        cid: cidTrace.resolved,
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
        a.cid AS submission_cid,
        a.campaign_slug AS submission_campaign_slug,
        vs.campaign_slug AS voc_session_cid,
        isess.campaign_slug AS intake_session_cid,
        c.slug AS campaign_join_cid,
        (
          SELECT NULLIF(TRIM(ce.meta->>'campaign_slug'), '')
          FROM campaign_events ce
          WHERE ce.tenant_id = a.tenant_id
            AND ce.meta->>'result_id' = a.id::text
          ORDER BY ce.created_at DESC, ce.id DESC
          LIMIT 1
        ) AS campaign_event_cid,
        COALESCE(
          a.cid,
          a.campaign_slug,
          vs.campaign_slug,
          isess.campaign_slug,
          c.slug,
          (
            SELECT NULLIF(TRIM(ce.meta->>'campaign_slug'), '')
            FROM campaign_events ce
            WHERE ce.tenant_id = a.tenant_id
              AND ce.meta->>'result_id' = a.id::text
            ORDER BY ce.created_at DESC, ce.id DESC
            LIMIT 1
          )
        ) AS resolved_cid
      FROM assessment_submissions a
      JOIN users u ON u.id = a.user_id
      JOIN tenants t ON t.id = a.tenant_id
      LEFT JOIN voc_sessions vs ON vs.id = a.session_id
        AND vs.tenant_id = a.tenant_id
        AND LOWER(COALESCE(vs.email, '')) = LOWER(COALESCE(u.email, ''))
      LEFT JOIN intake_sessions isess ON isess.id = a.session_id
        AND isess.tenant_id = a.tenant_id
        AND LOWER(COALESCE(isess.email, '')) = LOWER(COALESCE(u.email, ''))
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
    const cidTrace = buildResultCidTrace(row);
    logResultCidTrace("GET /api/results/customer/:crid", row, cidTrace);
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
        cid: cidTrace.resolved,
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
  const requiredForVoc = true;
  return res.json({
    feature: "CONSENT_V1",
    mode: feature.mode,
    enabled: feature.enabled,
    reason: feature.reason,
    required_for_voc: requiredForVoc,
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
    const requireForVoc = req.body?.require_for_voc === true;
    const feature = getConsentFeatureContext(req, email);
    if (!feature.enabled && !requireForVoc) {
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
      businessConsentAcceptedAt: null,
      networkConsentStatus: "private",
      networkConsentUpdatedAt: nowIso,
      profileDeletedAt: nowIso,
    });
    await client.query(
      `UPDATE assessment_submissions
       SET customer_email = NULL,
           customer_name = NULL,
           raw_answers = NULL,
           archetype_counts = '{}'::jsonb,
           personality_counts = '{}'::jsonb,
           primary_archetype = NULL,
           secondary_archetype = NULL,
           weakness_archetype = NULL,
           personality_primary = NULL,
           personality_secondary = NULL,
           personality_weakness = NULL,
           buyer_primary_archetype = NULL,
           buyer_secondary_archetype = NULL,
           buyer_weakness_archetype = NULL,
           buyer_counts = '{}'::jsonb,
           personal_primary_archetype = NULL,
           personal_secondary_archetype = NULL,
           personal_weakness_archetype = NULL,
           personal_counts = '{}'::jsonb
       WHERE tenant_id = $1
         AND user_id = $2
         AND assessment_type = 'customer'`,
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
      metadata: { anonymized_submissions: true, scope: "assessment_voc" },
    });
    await client.query("COMMIT");
    return res.json({
      ok: true,
      tenant: tenantRow.slug,
      email,
      profile_deleted_at: nowIso,
      revoked_scope: "assessment_voc",
      revoked_data: {
        consent_profile: "soft_deleted",
        assessment_profile_fields: "scrubbed",
        customer_submission_rows: "retained_anonymized",
      },
      requires_reconsent_for_voc: true,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("consent_profile_delete_failed", err);
    return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "profile delete failed" });
  } finally {
    client.release();
  }
});

app.post("/api/consent/assessment/revoke", async (req, res) => {
  return res.redirect(307, "/api/consent/profile/delete");
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

    const {
      email,
      tenant,
      name,
      cid,
      source_type: sourceTypeRaw,
      entry_marker: entryMarkerRaw,
      source_marker: sourceMarkerRaw,
      tap_tag: tapTagRaw,
      tap_session: tapSessionRaw,
      initial_request_url: initialRequestUrlRaw,
      crid: cridRaw,
      result_id: resultIdRaw,
      answers: rawAnswers = [],
    } = req.body || {};
    const sourceType = String(sourceTypeRaw || "").trim().toLowerCase() || "direct";
    const entryMarker = String(entryMarkerRaw || "").trim();
    const sourceMarker = String(sourceMarkerRaw || "").trim();
    const tapTag = String(tapTagRaw || "").trim();
    const tapSession = String(tapSessionRaw || "").trim();
    const initialRequestUrl = String(initialRequestUrlRaw || "").trim();
    const linkedResultId = String(resultIdRaw ?? cridRaw ?? "").trim();
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
      enforceConsent: true,
    });

    const requestedCid = normalizeSlug(cid);
    const linkedCampaign = !requestedCid && linkedResultId
      ? await findCustomerResultCampaignLink({
        tenantId: tenantRow.id,
        crid: linkedResultId,
        email,
        client,
      })
      : null;
    const tapFallbackCampaign = !requestedCid && !linkedCampaign?.cid && sourceType === "tap"
      ? await resolveTapFallbackCampaign({
        tenantId: tenantRow.id,
        tenantSlug: tenantRow.slug,
        client,
      })
      : null;
    const effectiveCid = requestedCid || linkedCampaign?.cid || tapFallbackCampaign?.slug || null;
    const campaign = await resolveCampaignForTenantStrict(tenantRow.id, effectiveCid, client, {
      logLabel: "voc_intake_campaign_resolution",
      tenantSlug: tenantRow.slug,
      resultId: linkedResultId || null,
    });
    console.info("[voc-intake-cid-trace]", JSON.stringify({
      tenant: tenantRow.slug,
      email: normalizeEmail(email),
      source_type: sourceType,
      entry_marker: entryMarker || null,
      source_marker: sourceMarker || null,
      tap_tag: tapTag || null,
      tap_session: tapSession || null,
      initial_request_url: initialRequestUrl || null,
      linked_result_id: linkedResultId || null,
      linked_result_session_id: linkedCampaign?.sessionId || null,
      linked_campaign_id: linkedCampaign?.campaignId || null,
      linked_campaign_cid: linkedCampaign?.cid || null,
      linked_campaign_cid_source: linkedCampaign?.cidSource || null,
      requested_cid: requestedCid || null,
      tap_fallback_campaign_cid: tapFallbackCampaign?.slug || null,
      tap_fallback_campaign_source: tapFallbackCampaign?.source || null,
      final_cid: campaign?.slug || effectiveCid || null,
    }));
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
        campaign?.slug || effectiveCid || null,
        safeAnswers,
        campaign?.id || null,
        campaign?.slug || null,
      ]
    )).rows[0];
    console.info("[voc-intake-result-trace]", JSON.stringify({
      tenant: tenantRow.slug,
      email: normalizeEmail(email),
      source_type: sourceType,
      result_id: String(submission.id ?? "").trim() || null,
      cid: campaign?.slug || effectiveCid || null,
      linked_result_id: linkedResultId || null,
    }));
    await recordCampaignEvent({ tenantId: tenantRow.id, campaignId: campaign?.id || null, eventType: "customer_assessment", customerEmail: email, customerName: name, client, meta: { result_id: String(submission.id ?? "").trim() || null, campaign_slug: campaign?.slug || effectiveCid || null } });
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
        campaign_slug: campaign?.slug || effectiveCid || null,
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
    queueExternalEvent({
      eventType: "assessment.completed",
      userId: user.id,
      externalUserId: normalizeEmail(email),
      email: normalizeEmail(email),
      payload: buildAssessmentCompletionPayload({
        assessmentType: "customer",
        resultId: submission.id,
        primaryResult: scored.primary,
        completedAt: submission.created_at || new Date().toISOString(),
        extra: {
          email: normalizeEmail(email),
          member_id: normalizeEmail(email),
          submission_id: submission.id,
          points_awarded: vocPointsAdded,
          result_url: `/api/results/customer/${encodeURIComponent(String(submission.id))}`,
          secondary_result: scored.secondary,
          weakness_role: scored.weakness,
          score: Object.values(scored.archetype_counts || {}).reduce((sum, value) => sum + Number(value || 0), 0),
          strengths: [
            scored.primary ? `Your primary customer pattern is ${scored.primary}.` : null,
            scored.secondary ? `${scored.secondary} is your secondary customer signal.` : null,
          ].filter(Boolean),
          growth_edges: [scored.weakness ? `Watch for ${scored.weakness} as the next customer growth edge.` : null].filter(Boolean),
          recommendations: scored.recommendations,
          archetype_definition: scored.primary ? ARCHETYPE_DEFINITIONS[scored.primary] : null,
          ...resultContract,
        },
      }),
    }).catch((err) => console.error("simbawajuma_customer_assessment_event_queue_failed", err));

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
      cid: campaign?.slug || effectiveCid || null,
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
    await initializeArchetypeEngineSchema(pool);

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
    console.error("Database initialization failed", {
      message: err && err.message,
      code: err && err.code,
      host: err && err.hostname,
      db_resolution: dbConnectionResolution && dbConnectionResolution.diagnostics,
    });
    console.error(err);
    process.exit(1);
  }
})();
