"use strict";

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { GATES_CATALOG } = require("../gates/gatesCatalog");
const {
  GATES_ASSESSMENT_VERSION,
  GATES_ASSESSMENT_TITLE,
  GATES_ASSESSMENT_INSTRUCTIONS,
  GATES_ASSESSMENT_DISCLAIMER,
  GATES,
  QUESTIONS,
} = require("../gates/gatesAssessmentQuestions");
const { ROLES } = require("./accessControl");
const { pool: defaultPool } = require("./db");

const GATES_SESSION_COOKIE = "gates_parent_session";
const GATES_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const GATES_TENANT_SLUG = "the-gates";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function buildGatesSessionCookie(req, token, maxAgeSeconds) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").trim().toLowerCase();
  const isSecure = req.secure || forwardedProto === "https" || process.env.NODE_ENV === "production";
  const sameSite = isSecure ? "None" : "Lax";
  const secureAttr = isSecure ? "; Secure" : "";
  const safeMaxAge = Math.max(0, Number(maxAgeSeconds) || 0);
  return `${GATES_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=${sameSite}${secureAttr}; Max-Age=${safeMaxAge}`;
}

async function ensureGatesTenant(client) {
  const existing = await client.query("SELECT id, slug, name FROM tenants WHERE slug = $1 LIMIT 1", [GATES_TENANT_SLUG]);
  if (existing.rows[0]) return existing.rows[0];
  return (await client.query("INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, slug, name", ["The Gates", GATES_TENANT_SLUG])).rows[0];
}

function formatChildProfileRow(row) {
  const rawFirstName = String(row.first_name || "").trim();
  let parsed = null;
  if (rawFirstName.startsWith("{")) {
    try { parsed = JSON.parse(rawFirstName); } catch { parsed = null; }
  }
  return {
    child_id: String(row.id),
    child_name: String(parsed?.child_name || rawFirstName || "").trim(),
    child_age_band: String(parsed?.child_age_band || "").trim() || null,
    child_grade_band: String(parsed?.child_grade_band || "").trim() || null,
    metadata: parsed?.metadata && typeof parsed.metadata === "object" ? parsed.metadata : {},
    profile_status: "ready",
  };
}

function buildStoredChildProfile(payload) {
  return JSON.stringify({
    child_name: payload.child_name,
    child_age_band: payload.child_age_band,
    child_grade_band: payload.child_grade_band,
    metadata: payload.metadata,
  });
}

function parseChildPayload(body) {
  const child_name = String(body?.child_name || "").trim();
  const child_age_band = String(body?.child_age_band || "").trim();
  const child_grade_band = String(body?.child_grade_band || "").trim();
  const metadata = body?.metadata;
  if (!child_name || !child_age_band || !child_grade_band || !metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return { child_name, child_age_band, child_grade_band, metadata };
}

async function resolveGatesSession({ req, pool }) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const token = String(cookies[GATES_SESSION_COOKIE] || "").trim();
  if (!token) {
    console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_session_missing" }));
    return { authenticated: false };
  }

  const tokenHash = sha256(token);
  const sessionResult = await pool.query(
    `SELECT s.id, s.user_id, s.tenant_id, s.role, s.expires_at,
            u.email, gp.id AS parent_profile_id, gp.display_name
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN gates_parent_profiles gp ON LOWER(gp.email) = LOWER(u.email)
     JOIN tenants t ON t.id = s.tenant_id
     WHERE s.token_hash = $1 AND t.slug = $2 AND s.role = $3
     LIMIT 1`,
    [tokenHash, GATES_TENANT_SLUG, ROLES.PARENT]
  );
  const session = sessionResult.rows[0];
  if (!session) {
    console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_session_missing" }));
    return { authenticated: false, clearCookie: true };
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]).catch(() => {});
    console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_session_expired", user_id: session.user_id }));
    return { authenticated: false, clearCookie: true };
  }

  const parentProfile = {
    id: Number(session.parent_profile_id || 0),
    display_name: String(session.display_name || "").trim() || null,
    email: normalizeEmail(session.email),
  };
  console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_session_resolved", user_id: session.user_id }));
  return { authenticated: true, parentProfile };
}

function createGatesRouter({ pool = defaultPool } = {}) {
  const router = express.Router();

  router.get("/gates", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "gates.html")));

  router.get("/api/gates/health", (req, res) => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: "gates_health_check" }));
    return res.status(200).json({ ok: true, vertical: "the-gates", status: "mounted", version: "foundation" });
  });

  router.get("/api/gates/catalog", (req, res) => res.status(200).json({ gates: GATES_CATALOG }));

  router.get("/api/gates/assessment/questions", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_questions_load_failed", reason: "unauthenticated" }));
        return res.status(401).json({ error: "unauthenticated" });
      }
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_questions_loaded", parent_id: sessionState.parentProfile.id }));
      return res.status(200).json({
        ok: true,
        assessment_version: GATES_ASSESSMENT_VERSION,
        title: GATES_ASSESSMENT_TITLE,
        instructions: GATES_ASSESSMENT_INSTRUCTIONS,
        non_diagnostic_disclaimer: GATES_ASSESSMENT_DISCLAIMER,
        gates: GATES,
        questions: QUESTIONS,
      });
    } catch (err) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_questions_load_failed", reason: "server_error" }));
      return res.status(500).json({ error: "gates assessment questions load failed" });
    }
  });

  router.post("/api/gates/auth/signup", async (req, res) => {
    const client = await pool.connect();
    try {
      const parentName = String(req.body?.parent_name || "").trim();
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      if (!parentName || !email || !password) return res.status(400).json({ error: "parent_name, email, and password are required" });
      if (password.length < 8) return res.status(400).json({ error: "password must be at least 8 characters" });

      await client.query("BEGIN");
      const tenant = await ensureGatesTenant(client);
      const passwordHash = createPasswordHash(password);
      const user = (await client.query(
        `INSERT INTO users (email, tenant_id, password_hash) VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id, email`, [email, tenant.id, passwordHash]
      )).rows[0];
      const parentProfile = (await client.query(
        `INSERT INTO gates_parent_profiles (email, display_name, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         ON CONFLICT ((LOWER(email))) DO UPDATE SET display_name = EXCLUDED.display_name, updated_at = NOW()
         RETURNING id, display_name, email`, [email, parentName]
      )).rows[0];
      await client.query(
        `INSERT INTO tenant_memberships (tenant_id, user_id, role, onboarding_complete)
         VALUES ($1, $2, $3, TRUE)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [tenant.id, user.id, ROLES.PARENT]
      );

      const token = createSessionToken();
      await client.query(
        `INSERT INTO auth_sessions (user_id, tenant_id, role, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + ($5 || ' milliseconds')::interval)`,
        [user.id, tenant.id, ROLES.PARENT, sha256(token), String(GATES_SESSION_TTL_MS)]
      );

      await client.query("COMMIT");
      res.setHeader("Set-Cookie", buildGatesSessionCookie(req, token, Math.floor(GATES_SESSION_TTL_MS / 1000)));
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_signup_success", user_id: user.id }));
      return res.status(201).json({ ok: true, authenticated: true, role: ROLES.PARENT, parent_profile: parentProfile, next_route: "/gates/children" });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error("gates_auth_signup_failed", err);
      return res.status(500).json({ error: "gates signup failed" });
    } finally {
      client.release();
    }
  });

  router.post("/api/gates/auth/signin", async (req, res) => { /* unchanged */
    try {
      const email = normalizeEmail(req.body?.email);
      const password = String(req.body?.password || "");
      if (!email || !password) return res.status(400).json({ error: "email and password are required" });
      const found = await pool.query(
        `SELECT u.id AS user_id, u.email, u.password_hash, t.id AS tenant_id, gp.id AS parent_profile_id, gp.display_name
         FROM users u
         JOIN tenant_memberships m ON m.user_id = u.id
         JOIN tenants t ON t.id = m.tenant_id
         LEFT JOIN gates_parent_profiles gp ON LOWER(gp.email) = LOWER(u.email)
         WHERE LOWER(COALESCE(u.email, '')) = $1 AND m.role = $2 AND t.slug = $3
         ORDER BY u.created_at DESC`,
        [email, ROLES.PARENT, GATES_TENANT_SLUG]
      );
      const account = found.rows.find((row) => row.password_hash && verifyPasswordHash(password, row.password_hash));
      if (!account) return res.status(401).json({ error: "invalid credentials" });
      const token = createSessionToken();
      await pool.query(`INSERT INTO auth_sessions (user_id, tenant_id, role, token_hash, expires_at) VALUES ($1, $2, $3, $4, NOW() + ($5 || ' milliseconds')::interval)`, [account.user_id, account.tenant_id, ROLES.PARENT, sha256(token), String(GATES_SESSION_TTL_MS)]);
      res.setHeader("Set-Cookie", buildGatesSessionCookie(req, token, Math.floor(GATES_SESSION_TTL_MS / 1000)));
      return res.json({ ok: true, authenticated: true, role: ROLES.PARENT, parent_profile: { id: account.parent_profile_id, display_name: account.display_name, email: normalizeEmail(account.email) }, next_route: "/gates/dashboard" });
    } catch (err) { return res.status(500).json({ error: "gates signin failed" }); }
  });

  router.get("/api/gates/children", async (req, res) => {
    const sessionState = await resolveGatesSession({ req, pool });
    if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
    const rows = await pool.query("SELECT id, first_name FROM gates_child_profiles WHERE parent_id = $1 ORDER BY created_at DESC", [sessionState.parentProfile.id]);
    return res.json({ ok: true, children: rows.rows.map(formatChildProfileRow) });
  });

  router.post("/api/gates/children", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const payload = parseChildPayload(req.body);
      if (!payload) return res.status(400).json({ error: "invalid child profile payload" });
      const created = await pool.query(
        "INSERT INTO gates_child_profiles (parent_id, first_name, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, first_name",
        [sessionState.parentProfile.id, buildStoredChildProfile(payload)]
      );
      const childProfile = formatChildProfileRow(created.rows[0]);
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_child_profile_created", parent_id: sessionState.parentProfile.id, child_id: childProfile.child_id }));
      return res.status(201).json({ ok: true, child_profile: childProfile, next_route: "/gates/assessment" });
    } catch (err) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_child_profile_create_failed", error: String(err?.message || err) }));
      return res.status(500).json({ error: "gates child profile create failed" });
    }
  });

  router.get("/api/gates/children/:childId/profile", async (req, res) => {
    const sessionState = await resolveGatesSession({ req, pool });
    if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
    const child = await pool.query("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
    const row = child.rows[0];
    if (!row || Number(row.parent_id) !== Number(sessionState.parentProfile.id)) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_child_ownership_denied", parent_id: sessionState.parentProfile.id, child_id: req.params.childId }));
      return res.status(403).json({ error: "forbidden" });
    }
    const profile = formatChildProfileRow(row);
    console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_child_profile_loaded", parent_id: sessionState.parentProfile.id, child_id: profile.child_id }));
    return res.json({ ok: true, child_profile: profile });
  });

  router.post("/api/gates/auth/signout", async (req, res) => {
    try { const cookies = parseCookieHeader(req.headers.cookie || ""); const token = String(cookies[GATES_SESSION_COOKIE] || "").trim(); if (token) await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [sha256(token)]); res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0)); return res.json({ ok: true, authenticated: false }); } catch { return res.status(500).json({ error: "gates signout failed" }); }
  });

  router.get("/api/gates/auth/session", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (sessionState.clearCookie) res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0));
      if (!sessionState.authenticated) return res.json({ ok: true, authenticated: false });
      return res.json({ ok: true, authenticated: true, role: ROLES.PARENT, parent_profile: sessionState.parentProfile });
    } catch { return res.status(500).json({ error: "gates session failed" }); }
  });

  return router;
}

module.exports = { createGatesRouter };
