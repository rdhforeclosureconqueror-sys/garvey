"use strict";

const crypto = require("crypto");
const express = require("express");
const path = require("path");
const { pool: defaultPool } = require("./db");
const { ensureTenant } = require("./tenant");
const { ROLES } = require("./accessControl");

const PROVIDER = "simbawajuma";
const COOKIE_NAME = "garvey_owner_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const MAX_TOKEN_AGE_SECONDS = 10 * 60;

const SIMBA_ASSESSMENT_CATEGORIES = Object.freeze([
  "Leadership",
  "Community Economics",
  "Rite of Passage",
  "Business",
  "Personal Growth",
  "Family & Youth",
]);

const APPROVED_ASSESSMENTS = Object.freeze([
  {
    id: "business_owner",
    title: "Business Owner Assessment",
    name: "Business Owner Assessment",
    description: "Owner readiness and business archetype assessment.",
    estimated_time: "8–12 minutes",
    access_rule: "Simba member",
    visibility: "member-only",
    category: "Business",
    recommendations: {
      book: "The Ujamaa Business Starter",
      audiobook: "The Ujamaa Business Starter Audio Companion",
      discord_channel: "#business-builders",
      historical_facts: "Cooperative economics practices from Black Wall Street and ujamaa village-building traditions.",
      brain_game: "Resource Builder Sprint",
      swahili_lesson: "Biashara na Ujamaa",
      next_assessment: "customer",
    },
    star_reward_eligible: true,
    simba_points: 50,
    streak_key: "assessment_completion",
    achievements: ["business-pathfinder"],
    href: "/intake.html?assessment=business_owner&surface=simba",
  },
  {
    id: "customer",
    title: "Customer / Voice of Customer",
    name: "Customer / Voice of Customer",
    description: "Customer profile and voice-of-customer archetype assessment.",
    estimated_time: "5–8 minutes",
    access_rule: "Simba member",
    visibility: "member-only",
    category: "Community Economics",
    recommendations: {
      book: "Voice of the Customer Field Guide",
      audiobook: "Voice of the Customer Field Guide Audio Companion",
      discord_channel: "#customer-insights",
      historical_facts: "Mutual aid societies used member listening circles to guide services and local commerce.",
      brain_game: "Market Signals Match",
      swahili_lesson: "Mteja na Soko",
      next_assessment: "business_owner",
    },
    star_reward_eligible: true,
    simba_points: 35,
    streak_key: "assessment_completion",
    achievements: ["customer-listener"],
    href: "/intake.html?assessment=customer&surface=simba",
  },
  {
    id: "love",
    title: "Love Archetype Engine",
    name: "Love Archetype Engine",
    description: "Relationship archetype assessment powered by the internal assessment engine.",
    estimated_time: "10–15 minutes",
    access_rule: "Simba member preview",
    visibility: "public preview",
    category: "Personal Growth",
    recommendations: {
      book: "The Love Archetype Guide",
      audiobook: "The Love Archetype Audio Guide",
      discord_channel: "#relationship-archetypes",
      historical_facts: "Family councils and kinship networks helped preserve relational accountability across the diaspora.",
      brain_game: "Empathy Pattern Match",
      swahili_lesson: "Upendo na Heshima",
      next_assessment: "leadership",
    },
    star_reward_eligible: false,
    simba_points: 0,
    streak_key: "assessment_completion",
    achievements: [],
    href: "/archetype-engines/love/assessment?surface=simba",
  },
  {
    id: "leadership",
    title: "Leadership Archetype Engine",
    name: "Leadership Archetype Engine",
    description: "Leadership profile assessment powered by the internal assessment engine.",
    estimated_time: "10–15 minutes",
    access_rule: "Simba member preview",
    visibility: "public preview",
    category: "Leadership",
    recommendations: {
      book: "The Leadership Archetype Guide",
      audiobook: "The Leadership Archetype Audio Guide",
      discord_channel: "#leadership-lab",
      historical_facts: "Marcus Garvey organized chapters, newspapers, shipping plans, and local leadership structures at global scale.",
      brain_game: "Council Strategy Grid",
      swahili_lesson: "Uongozi wa Jamii",
      next_assessment: "loyalty",
    },
    star_reward_eligible: false,
    simba_points: 0,
    streak_key: "assessment_completion",
    achievements: [],
    href: "/archetype-engines/leadership/assessment?surface=simba",
  },
  {
    id: "loyalty",
    title: "Loyalty Archetype Engine",
    name: "Loyalty Archetype Engine",
    description: "Loyalty and retention profile assessment powered by the internal assessment engine.",
    estimated_time: "10–15 minutes",
    access_rule: "Simba member preview",
    visibility: "public preview",
    category: "Community Economics",
    recommendations: {
      book: "The Loyalty Archetype Guide",
      audiobook: "The Loyalty Archetype Audio Guide",
      discord_channel: "#loyalty-retention",
      historical_facts: "Co-ops strengthened loyalty by returning value to members instead of extracting it from communities.",
      brain_game: "Retention Rhythm",
      swahili_lesson: "Uaminifu na Ushirika",
      next_assessment: "customer",
    },
    star_reward_eligible: false,
    simba_points: 0,
    streak_key: "assessment_completion",
    achievements: [],
    href: "/archetype-engines/loyalty/assessment?surface=simba",
  },
  {
    id: "youth_rite_of_passage",
    title: "Youth Rite of Passage / Gates",
    name: "Youth Rite of Passage / Gates",
    description: "Parent-gated youth development and rite-of-passage flow.",
    estimated_time: "Varies",
    access_rule: "Parent-only; requires Gates auth",
    visibility: "parent-only",
    category: "Rite of Passage",
    recommendations: {
      book: "Parent Guide to Learning Pathways",
      audiobook: "Parent Guide to Learning Pathways Audio Companion",
      discord_channel: "#parent-gates",
      historical_facts: "Rites of passage use elder guidance, service, and skill demonstration to mark growth.",
      brain_game: "Gate Practice Quest",
      swahili_lesson: "Familia na Malezi",
      next_assessment: "assessment_mvp_k6",
    },
    star_reward_eligible: false,
    simba_points: 0,
    streak_key: "family_assessment",
    achievements: [],
    href: "/gates/signup?surface=simba",
    disabled: true,
  },
  {
    id: "assessment_mvp_k6",
    title: "K–6 Assessment MVP",
    name: "K–6 Assessment MVP",
    description: "Grade 1–6 math/English adaptive assessment API requiring a Gates parent and child profile.",
    estimated_time: "Varies",
    access_rule: "Parent-only; requires Gates child context",
    visibility: "parent-only",
    category: "Family & Youth",
    recommendations: {
      book: "Parent Guide to Learning Pathways",
      audiobook: "Parent Guide to Learning Pathways Audio Companion",
      discord_channel: "#parent-gates",
      historical_facts: "Freedom schools paired academic development with identity, family, and community purpose.",
      brain_game: "Adaptive Learning Quest",
      swahili_lesson: "Kujifunza Kila Siku",
      next_assessment: "youth_rite_of_passage",
    },
    star_reward_eligible: false,
    simba_points: 0,
    streak_key: "family_assessment",
    achievements: [],
    href: "/gates/signup?surface=simba",
    disabled: true,
  },
]);

function base64urlDecode(value) {
  return Buffer.from(String(value || "").replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function base64urlJson(value) {
  return JSON.parse(base64urlDecode(value).toString("utf8"));
}

function hmac(data, secret) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildSessionCookie(req, token, maxAgeSeconds) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").trim().toLowerCase();
  const isSecure = req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
  const sameSite = isSecure ? "None" : "Lax";
  const secureAttr = isSecure ? "; Secure" : "";
  const safeMaxAge = Math.max(0, Number(maxAgeSeconds) || 0);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}${secureAttr}; Max-Age=${safeMaxAge}`;
}

function verifyTransferToken(token, env = process.env) {
  const secret = String(env.SIMBAWAJUMAA_TOKEN_SECRET || "").trim();
  if (!secret) {
    const err = new Error("SIMBAWAJUMAA_TOKEN_SECRET is not configured");
    err.statusCode = 503;
    throw err;
  }
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    const err = new Error("malformed transfer token");
    err.statusCode = 401;
    throw err;
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const signed = `${encodedHeader}.${encodedPayload}`;
  const expected = hmac(signed, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const err = new Error("invalid transfer token signature");
    err.statusCode = 401;
    throw err;
  }
  const header = base64urlJson(encodedHeader);
  if (header.alg && header.alg !== "HS256") {
    const err = new Error("unsupported transfer token algorithm");
    err.statusCode = 401;
    throw err;
  }
  const payload = base64urlJson(encodedPayload);
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || Number(payload.exp) <= now) {
    const err = new Error("transfer token expired");
    err.statusCode = 401;
    throw err;
  }
  if (payload.iat && Number(payload.iat) < now - MAX_TOKEN_AGE_SECONDS) {
    const err = new Error("transfer token is too old");
    err.statusCode = 401;
    throw err;
  }
  const allowedIssuer = String(env.SIMBAWAJUMAA_ALLOWED_ISSUER || "").trim();
  if (allowedIssuer && String(payload.issuer || payload.iss || "") !== allowedIssuer) {
    const err = new Error("transfer token issuer not allowed");
    err.statusCode = 401;
    throw err;
  }
  if (!String(payload.external_user_id || "").trim()) {
    const err = new Error("external_user_id is required");
    err.statusCode = 400;
    throw err;
  }
  if (!normalizeEmail(payload.email)) {
    const err = new Error("email is required");
    err.statusCode = 400;
    throw err;
  }
  return payload;
}

function withLegacyRecommendationFields(assessment) {
  const recommendations = assessment.recommendations || {};
  return {
    ...assessment,
    recommended_book: recommendations.book || "",
    recommended_audiobook: recommendations.audiobook || "",
    recommended_discord_channel: recommendations.discord_channel || "",
    recommended_historical_facts: recommendations.historical_facts || "",
    recommended_brain_game: recommendations.brain_game || "",
    recommended_swahili_lesson: recommendations.swahili_lesson || "",
    recommended_next_assessment: recommendations.next_assessment || "",
  };
}

function getAssessmentCatalog() {
  return APPROVED_ASSESSMENTS.map(withLegacyRecommendationFields);
}

function getAssessmentMetadata(id) {
  return getAssessmentCatalog().find((entry) => entry.id === id) || null;
}

function recommendedNextStepsFor(id) {
  const metadata = getAssessmentMetadata(id);
  if (!metadata) return [];
  return [
    metadata.recommended_book ? { type: "book", value: metadata.recommended_book } : null,
    metadata.recommended_audiobook ? { type: "audiobook", value: metadata.recommended_audiobook } : null,
    metadata.recommended_discord_channel ? { type: "discord_channel", value: metadata.recommended_discord_channel } : null,
    metadata.recommended_historical_facts ? { type: "historical_facts", value: metadata.recommended_historical_facts } : null,
    metadata.recommended_brain_game ? { type: "brain_game", value: metadata.recommended_brain_game } : null,
    metadata.recommended_swahili_lesson ? { type: "swahili_lesson", value: metadata.recommended_swahili_lesson } : null,
    metadata.recommended_next_assessment ? { type: "assessment", value: metadata.recommended_next_assessment } : null,
  ].filter(Boolean);
}

function buildRewardInstruction(metadata) {
  return {
    eligible: Boolean(metadata?.star_reward_eligible),
    simba_points: metadata?.star_reward_eligible ? Number(metadata.simba_points || 0) : 0,
    streak_key: metadata?.streak_key || "assessment_completion",
    achievements: Array.isArray(metadata?.achievements) ? metadata.achievements : [],
    discord_notification: {
      enabled: Boolean(metadata?.star_reward_eligible),
      channel: metadata?.recommended_discord_channel || metadata?.recommendations?.discord_channel || "",
      event_type: "assessment.completed",
    },
  };
}

function buildAssessmentCompletionPayload({ assessmentType, resultId, primaryResult, completedAt, extra = {} } = {}) {
  const metadata = getAssessmentMetadata(assessmentType) || {};
  return {
    assessment_type: assessmentType,
    assessment_name: metadata.title || metadata.name || assessmentType,
    result_id: resultId,
    primary_result: primaryResult || null,
    recommended_next_steps: recommendedNextStepsFor(assessmentType),
    recommendations: metadata.recommendations || {},
    star_reward_eligible: Boolean(metadata.star_reward_eligible),
    reward: buildRewardInstruction(metadata),
    completed_at: completedAt || new Date().toISOString(),
    ...extra,
  };
}

function assessmentPathFor(id) {
  const found = APPROVED_ASSESSMENTS.find((entry) => entry.id === id && !entry.disabled);
  return found ? found.href : "/simbawajuma/assessments";
}

function appendContext(urlPath, { tenant, email, token }) {
  if (!urlPath || urlPath.startsWith("http")) return urlPath || "/simbawajuma/assessments";
  const url = new URL(urlPath, "http://garvey.local");
  if (tenant && !url.searchParams.has("tenant")) url.searchParams.set("tenant", tenant);
  if (email && !url.searchParams.has("email")) url.searchParams.set("email", email);
  if (token && !url.searchParams.has("token")) url.searchParams.set("token", token);
  return `${url.pathname}${url.search}`;
}

async function findOrCreateLinkedUser(payload, { pool = defaultPool } = {}) {
  const defaultTenant = String(process.env.SIMBAWAJUMAA_DEFAULT_TENANT || "simbawajuma").trim().toLowerCase();
  const email = normalizeEmail(payload.email);
  const externalUserId = String(payload.external_user_id || "").trim();
  const externalMembershipId = String(payload.external_membership_id || "").trim() || null;
  const displayName = String(payload.display_name || "").trim() || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tenant = await ensureTenant(defaultTenant);
    const existingLink = await client.query(
      `SELECT i.*, u.email, u.tenant_id
         FROM user_external_identities i
         JOIN users u ON u.id = i.user_id
        WHERE i.provider = $1 AND i.external_user_id = $2
        LIMIT 1`,
      [PROVIDER, externalUserId]
    );

    let user = null;
    if (existingLink.rows[0]) {
      user = (await client.query("SELECT * FROM users WHERE id = $1", [existingLink.rows[0].user_id])).rows[0];
    } else {
      user = (await client.query("SELECT * FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1", [tenant.id, email])).rows[0];
      if (!user) {
        user = (await client.query(
          `INSERT INTO users (tenant_id, email, name)
           VALUES ($1,$2,$3)
           ON CONFLICT (tenant_id, email)
           DO UPDATE SET email = EXCLUDED.email,
                         name = COALESCE(NULLIF(EXCLUDED.name, ''), users.name)
           RETURNING *`,
          [tenant.id, email, displayName]
        )).rows[0];
      }
      await client.query(
        `INSERT INTO user_external_identities (user_id, provider, external_user_id, external_membership_id, email, metadata)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         ON CONFLICT (provider, external_user_id)
         DO UPDATE SET user_id = EXCLUDED.user_id,
                       external_membership_id = EXCLUDED.external_membership_id,
                       email = EXCLUDED.email,
                       metadata = EXCLUDED.metadata,
                       updated_at = NOW()`,
        [user.id, PROVIDER, externalUserId, externalMembershipId, email, JSON.stringify(payload)]
      );
    }

    await client.query(
      `INSERT INTO tenant_memberships (tenant_id, user_id, role, onboarding_complete)
       VALUES ($1,$2,$3,TRUE)
       ON CONFLICT (tenant_id, user_id)
       DO UPDATE SET role = COALESCE(tenant_memberships.role, EXCLUDED.role)`,
      [tenant.id, user.id, ROLES.CUSTOMER]
    );

    const sessionToken = createSessionToken();
    await client.query(
      `INSERT INTO auth_sessions (user_id, tenant_id, role, token_hash, expires_at)
       VALUES ($1,$2,$3,$4,NOW() + ($5 || ' milliseconds')::interval)`,
      [user.id, tenant.id, ROLES.CUSTOMER, sha256(sessionToken), String(SESSION_TTL_MS)]
    );

    await client.query("COMMIT");
    return { tenant, user, sessionToken, externalUserId, externalMembershipId, email };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function createSimbaWajumaRouter(options = {}) {
  const router = express.Router();
  const pool = options.pool || defaultPool;

  router.post("/api/simbawajuma/verify-transfer", async (req, res) => {
    try {
      const token = String(req.body?.token || "").trim();
      const payload = verifyTransferToken(token);
      const linked = await findOrCreateLinkedUser(payload, { pool });
      const nextPath = appendContext(assessmentPathFor(payload.redirect_assessment), {
        tenant: linked.tenant.slug,
        email: linked.email,
        token,
      });
      res.setHeader("Set-Cookie", buildSessionCookie(req, linked.sessionToken, Math.floor(SESSION_TTL_MS / 1000)));
      return res.json({ success: true, provider: PROVIDER, tenant: linked.tenant.slug, email: linked.email, user_id: linked.user.id, next_route: nextPath });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ error: err.message || "transfer verification failed" });
    }
  });

  router.get("/simbawajuma/start", async (req, res) => {
    try {
      const token = String(req.query.token || "").trim();
      const payload = verifyTransferToken(token);
      const linked = await findOrCreateLinkedUser(payload, { pool });
      const nextPath = appendContext(assessmentPathFor(payload.redirect_assessment), {
        tenant: linked.tenant.slug,
        email: linked.email,
        token,
      });
      res.setHeader("Set-Cookie", buildSessionCookie(req, linked.sessionToken, Math.floor(SESSION_TTL_MS / 1000)));
      return res.redirect(302, nextPath);
    } catch (err) {
      return res.status(err.statusCode || 500).send(`Simba Wajuma transfer failed: ${err.message || "unknown error"}`);
    }
  });

  router.get("/api/simbawajuma/assessments", (req, res) => {
    return res.json({
      provider: PROVIDER,
      surface: "simba_assessment_center",
      engine: "internal_assessment_engine",
      categories: SIMBA_ASSESSMENT_CATEGORIES,
      assessments: getAssessmentCatalog(),
    });
  });

  router.get("/api/simbawajuma/dashboard", (req, res) => {
    const assessments = getAssessmentCatalog();
    const suggested = assessments.find((entry) => !entry.disabled) || null;
    return res.json({
      provider: PROVIDER,
      title: "Continue Your Journey",
      assessments_started: [],
      assessments_completed: [],
      suggested_next_assessment: suggested,
      progress_percentage: 0,
      note: "Member-specific progress is supplied by Simba when available; this fallback keeps legacy assessment engine routes backward compatible.",
    });
  });

  router.get("/simbawajuma/assessments", (req, res) => {
    return res.sendFile(path.join(__dirname, "..", "public", "simbawajuma", "assessments.html"));
  });

  return router;
}

module.exports = {
  PROVIDER,
  SIMBA_ASSESSMENT_CATEGORIES,
  APPROVED_ASSESSMENTS: getAssessmentCatalog(),
  getAssessmentCatalog,
  verifyTransferToken,
  findOrCreateLinkedUser,
  getAssessmentMetadata,
  recommendedNextStepsFor,
  buildAssessmentCompletionPayload,
  createSimbaWajumaRouter,
};
