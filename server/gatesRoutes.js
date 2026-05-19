"use strict";

const express = require("express");
const path = require("path");
const crypto = require("crypto");
const { GATES_CATALOG } = require("../gates/gatesCatalog");
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

  router.post("/api/gates/auth/signin", async (req, res) => {
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
      if (!account) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_signin_failed", email }));
        return res.status(401).json({ error: "invalid credentials" });
      }
      const token = createSessionToken();
      await pool.query(
        `INSERT INTO auth_sessions (user_id, tenant_id, role, token_hash, expires_at)
         VALUES ($1, $2, $3, $4, NOW() + ($5 || ' milliseconds')::interval)`,
        [account.user_id, account.tenant_id, ROLES.PARENT, sha256(token), String(GATES_SESSION_TTL_MS)]
      );
      res.setHeader("Set-Cookie", buildGatesSessionCookie(req, token, Math.floor(GATES_SESSION_TTL_MS / 1000)));
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_signin_success", user_id: account.user_id }));
      return res.json({ ok: true, authenticated: true, role: ROLES.PARENT, parent_profile: { id: account.parent_profile_id, display_name: account.display_name, email: normalizeEmail(account.email) }, next_route: "/gates/dashboard" });
    } catch (err) {
      console.error("gates_auth_signin_failed", err);
      return res.status(500).json({ error: "gates signin failed" });
    }
  });

  router.post("/api/gates/auth/signout", async (req, res) => {
    try {
      const cookies = parseCookieHeader(req.headers.cookie || "");
      const token = String(cookies[GATES_SESSION_COOKIE] || "").trim();
      if (token) await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [sha256(token)]);
      res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0));
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_signout_success" }));
      return res.json({ ok: true, authenticated: false });
    } catch (err) {
      console.error("gates_auth_signout_failed", err);
      return res.status(500).json({ error: "gates signout failed" });
    }
  });

  router.get("/api/gates/auth/session", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (sessionState.clearCookie) res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0));
      if (!sessionState.authenticated) return res.json({ ok: true, authenticated: false });
      return res.json({ ok: true, authenticated: true, role: ROLES.PARENT, parent_profile: sessionState.parentProfile });
    } catch (err) {
      console.error("gates_auth_session_failed", err);
      return res.status(500).json({ error: "gates session failed" });
    }
  });

  return router;
}

module.exports = { createGatesRouter };
