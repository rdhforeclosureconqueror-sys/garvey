"use strict";

const crypto = require("crypto");
const { ROLES } = require("./accessControl");

const OWNER_SESSION_COOKIE = "garvey_owner_session";
const OWNER_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

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
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return ADMIN_EMAIL_ALLOWLIST.has(normalized);
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

function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
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

async function authenticateOwnerCredentials(pool, email, password) {
  const normalized = normalizeEmail(email);
  const secret = String(password || "");
  if (!normalized || !secret) return null;
  const found = await pool.query(
    `SELECT u.id AS user_id, u.email, u.password_hash, t.id AS tenant_id, t.slug AS tenant_slug, m.role, m.onboarding_complete
     FROM users u
     JOIN tenant_memberships m ON m.user_id = u.id
     JOIN tenants t ON t.id = m.tenant_id
     WHERE LOWER(COALESCE(u.email, '')) = $1
       AND m.role = $2
     ORDER BY u.created_at DESC`,
    [normalized, ROLES.BUSINESS_OWNER]
  );
  return found.rows.find((row) => row.password_hash && verifyPasswordHash(secret, row.password_hash)) || null;
}

async function authenticateGarveyUser(pool, email, password) {
  return authenticateOwnerCredentials(pool, email, password);
}

function resolveGarveyAuthActor(account) {
  if (!account) return null;
  return {
    userId: account.user_id,
    tenantId: account.tenant_id,
    email: normalizeEmail(account.email),
    role: account.role,
    tenantSlug: account.tenant_slug,
    onboardingComplete: !!account.onboarding_complete,
    isAdmin: isAdminEmail(account.email),
  };
}

module.exports = {
  OWNER_SESSION_COOKIE,
  OWNER_SESSION_TTL_MS,
  normalizeEmail,
  parseAdminEmails,
  isAdminEmail,
  createPasswordHash,
  verifyPasswordHash,
  sha256,
  createSessionToken,
  buildOwnerSessionCookie,
  authenticateOwnerCredentials,
  authenticateGarveyUser,
  resolveGarveyAuthActor,
};
