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

const APPROVED_ASSESSMENTS = Object.freeze([
  {
    id: "business_owner",
    title: "Business Owner Assessment",
    name: "Business Owner Assessment",
    description: "Owner readiness and business archetype assessment.",
    estimated_time: "8–12 minutes",
    access_rule: "Simba member",
    visibility: "member-only",
    category: "business",
    recommended_book: "The Ujamaa Business Starter",
    recommended_audiobook: "The Ujamaa Business Starter Audio Companion",
    recommended_next_assessment: "customer",
    recommended_discord_channel: "#business-builders",
    star_reward_eligible: true,
    href: "/intake.html?assessment=business_owner",
  },
  {
    id: "customer",
    title: "Customer / Voice of Customer",
    name: "Customer / Voice of Customer",
    description: "Customer profile and voice-of-customer archetype assessment.",
    estimated_time: "5–8 minutes",
    access_rule: "Simba member",
    visibility: "member-only",
    category: "customer_discovery",
    recommended_book: "Voice of the Customer Field Guide",
    recommended_audiobook: "Voice of the Customer Field Guide Audio Companion",
    recommended_next_assessment: "business_owner",
    recommended_discord_channel: "#customer-insights",
    star_reward_eligible: true,
    href: "/intake.html?assessment=customer",
  },
  {
    id: "love",
    title: "Love Archetype Engine",
    name: "Love Archetype Engine",
    description: "Relationship archetype assessment powered by the internal assessment engine.",
    estimated_time: "10–15 minutes",
    access_rule: "Simba member preview",
    visibility: "public preview",
    category: "relationships",
    recommended_book: "The Love Archetype Guide",
    recommended_audiobook: "The Love Archetype Audio Guide",
    recommended_next_assessment: "leadership",
    recommended_discord_channel: "#relationship-archetypes",
    star_reward_eligible: false,
    href: "/archetype-engines/love/assessment",
  },
  {
    id: "leadership",
    title: "Leadership Archetype Engine",
    name: "Leadership Archetype Engine",
    description: "Leadership profile assessment powered by the internal assessment engine.",
    estimated_time: "10–15 minutes",
    access_rule: "Simba member preview",
    visibility: "public preview",
    category: "leadership",
    recommended_book: "The Leadership Archetype Guide",
    recommended_audiobook: "The Leadership Archetype Audio Guide",
    recommended_next_assessment: "loyalty",
    recommended_discord_channel: "#leadership-lab",
    star_reward_eligible: false,
    href: "/archetype-engines/leadership/assessment",
  },
  {
    id: "loyalty",
    title: "Loyalty Archetype Engine",
    name: "Loyalty Archetype Engine",
    description: "Loyalty and retention profile assessment powered by the internal assessment engine.",
    estimated_time: "10–15 minutes",
    access_rule: "Simba member preview",
    visibility: "public preview",
    category: "retention",
    recommended_book: "The Loyalty Archetype Guide",
    recommended_audiobook: "The Loyalty Archetype Audio Guide",
    recommended_next_assessment: "customer",
    recommended_discord_channel: "#loyalty-retention",
    star_reward_eligible: false,
    href: "/archetype-engines/loyalty/assessment",
  },
  {
    id: "youth_rite_of_passage",
    title: "Youth Rite of Passage / Gates",
    name: "Youth Rite of Passage / Gates",
    description: "Parent-gated youth development and rite-of-passage flow.",
    estimated_time: "Varies",
    access_rule: "Parent-only; requires Gates auth",
    visibility: "parent-only",
    category: "youth_development",
    recommended_book: "Parent Guide to Learning Pathways",
    recommended_audiobook: "Parent Guide to Learning Pathways Audio Companion",
    recommended_next_assessment: "assessment_mvp_k6",
    recommended_discord_channel: "#parent-gates",
    star_reward_eligible: false,
    href: "/gates/signup",
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
    category: "k6_learning",
    recommended_book: "Parent Guide to Learning Pathways",
    recommended_audiobook: "Parent Guide to Learning Pathways Audio Companion",
    recommended_next_assessment: "youth_rite_of_passage",
    recommended_discord_channel: "#parent-gates",
    star_reward_eligible: false,
    href: "/gates/signup",
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

function getAssessmentMetadata(id) {
  return APPROVED_ASSESSMENTS.find((entry) => entry.id === id) || null;
}

function recommendedNextStepsFor(id) {
  const metadata = getAssessmentMetadata(id);
  if (!metadata) return [];
  return [
    metadata.recommended_book ? { type: "book", value: metadata.recommended_book } : null,
    metadata.recommended_audiobook ? { type: "audiobook", value: metadata.recommended_audiobook } : null,
    metadata.recommended_next_assessment ? { type: "assessment", value: metadata.recommended_next_assessment } : null,
    metadata.recommended_discord_channel ? { type: "discord_channel", value: metadata.recommended_discord_channel } : null,
  ].filter(Boolean);
}

function buildAssessmentCompletionPayload({ assessmentType, resultId, primaryResult, completedAt, extra = {} } = {}) {
  const metadata = getAssessmentMetadata(assessmentType) || {};
  return {
    assessment_type: assessmentType,
    assessment_name: metadata.title || metadata.name || assessmentType,
    result_id: resultId,
    primary_result: primaryResult || null,
    recommended_next_steps: recommendedNextStepsFor(assessmentType),
    star_reward_eligible: Boolean(metadata.star_reward_eligible),
    completed_at: completedAt || new Date().toISOString(),
    ...extra,
  };
}

function assessmentPathFor(id) {
  const found = APPROVED_ASSESSMENTS.find((entry) => entry.id === id && !entry.disabled);
  return found ? found.href : "/simbawajuma/assessments";
}

function appendContext(urlPath, { tenant, email }) {
  if (!urlPath || urlPath.startsWith("http")) return urlPath || "/simbawajuma/assessments";
  const url = new URL(urlPath, "http://garvey.local");
  if (tenant && !url.searchParams.has("tenant")) url.searchParams.set("tenant", tenant);
  if (email && !url.searchParams.has("email")) url.searchParams.set("email", email);
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
      });
      res.setHeader("Set-Cookie", buildSessionCookie(req, linked.sessionToken, Math.floor(SESSION_TTL_MS / 1000)));
      return res.redirect(302, nextPath);
    } catch (err) {
      return res.status(err.statusCode || 500).send(`Simba Wajuma transfer failed: ${err.message || "unknown error"}`);
    }
  });

  router.get("/api/simbawajuma/assessments", (req, res) => {
    return res.json({ provider: PROVIDER, surface: "embedded_assessment_engine", assessments: APPROVED_ASSESSMENTS });
  });

  router.get("/simbawajuma/assessments", (req, res) => {
    return res.sendFile(path.join(__dirname, "..", "public", "simbawajuma", "assessments.html"));
  });

  return router;
}

module.exports = {
  PROVIDER,
  APPROVED_ASSESSMENTS,
  verifyTransferToken,
  findOrCreateLinkedUser,
  getAssessmentMetadata,
  recommendedNextStepsFor,
  buildAssessmentCompletionPayload,
  createSimbaWajumaRouter,
};
