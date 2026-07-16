"use strict";

const crypto = require("crypto");
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

function parsePositiveIntegerId(value) {
  const raw = String(value ?? "").trim();
  if (!/^[1-9]\d*$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return parsed;
}

async function resolveGatesParentSession(req, options = {}) {
  const pool = options.pool || defaultPool;
  const cookies = parseCookieHeader(req.headers.cookie || "");
  const token = String(cookies[GATES_SESSION_COOKIE] || "").trim();
  if (!token) {
    console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_session_missing" }));
    return { authenticated: false, clearCookie: false, reason: "missing" };
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
    return { authenticated: false, clearCookie: true, reason: "not_found" };
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]).catch(() => {});
    console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_session_expired", user_id: session.user_id }));
    return { authenticated: false, clearCookie: true, reason: "expired" };
  }

  const parentProfile = {
    id: Number(session.parent_profile_id || 0),
    display_name: String(session.display_name || "").trim() || null,
    email: normalizeEmail(session.email),
  };
  console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_auth_session_resolved", user_id: session.user_id }));
  return { authenticated: true, authUserId: Number(session.user_id), parentProfile };
}

function isExcludedAdaptiveLearner(childProfile) {
  const name = String(childProfile?.child_name || "").trim().toLowerCase();
  const id = String(childProfile?.child_id || "").trim().toLowerCase();
  if (!name && !id) return true;
  const fake = new Set(["guest", "nsi", "nis", "mar", "test", "demo", "local-learner"]);
  if (fake.has(name) || fake.has(id)) return true;
  if (/^(guest|test|demo|orphan)(\b|[-_ ]|$)/i.test(name)) return true;
  return false;
}

async function listOwnedCanonicalGatesChildren({ pool = defaultPool, parentProfileId }) {
  const result = await pool.query(
    "SELECT id, parent_id, first_name FROM gates_child_profiles WHERE parent_id = $1 ORDER BY id ASC",
    [parentProfileId]
  );
  return result.rows
    .map(formatChildProfileRow)
    .filter((child) => !isExcludedAdaptiveLearner(child))
    .map((child) => ({
      ...child,
      parent_profile_id: Number(parentProfileId),
      ownership_verified: true,
    }));
}

async function resolveCanonicalLearnerForRequest(req, { pool = defaultPool, childId = null } = {}) {
  const session = await resolveGatesParentSession(req, { pool });
  if (!session.authenticated) return { ok: false, status: 401, error: "unauthenticated", session };
  const children = await listOwnedCanonicalGatesChildren({ pool, parentProfileId: session.parentProfile.id });
  const selected = childId
    ? children.find((child) => String(child.child_id) === String(childId))
    : (children.length === 1 ? children[0] : null);
  if (childId && !selected) return { ok: false, status: 403, error: "canonical_child_not_owned", session, children };
  if (!selected) return { ok: false, status: 400, error: children.length ? "child_context_required" : "no_owned_canonical_children", session, children };
  return {
    ok: true,
    session,
    children,
    child: selected,
    resolver: {
      child_id: selected.child_id,
      child_display_name: selected.child_name,
      parent_profile_id: session.parentProfile.id,
      auth_user_id: session.authUserId,
      ownership_verified: true,
    },
  };
}

function requireGatesParentSession(options = {}) {
  return async function gatesParentSessionMiddleware(req, res, next) {
    try {
      const sessionState = await resolveGatesParentSession(req, options);
      if (sessionState.clearCookie) res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0));
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      req.gatesParentSession = sessionState;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

async function resolveOwnedGatesChild({ pool = defaultPool, parentProfileId, childId }) {
  const parsedChildId = parsePositiveIntegerId(childId);
  if (!parsedChildId) return { ok: false, status: 400, error: "malformed_child_id" };

  const result = await pool.query(
    "SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1",
    [parsedChildId]
  );
  const row = result.rows[0];
  if (!row) return { ok: false, status: 404, error: "child_not_found" };
  if (Number(row.parent_id) !== Number(parentProfileId)) return { ok: false, status: 403, error: "forbidden" };

  return {
    ok: true,
    childId: parsedChildId,
    learnerId: String(row.id),
    row,
    childProfile: formatChildProfileRow(row),
    lifecycleNote: "Inactive or deactivated child enforcement is unavailable because gates_child_profiles has no canonical lifecycle fields.",
  };
}

function requireOwnedGatesChild(options = {}) {
  return async function gatesChildOwnershipMiddleware(req, res, next) {
    try {
      const sessionState = req.gatesParentSession || await resolveGatesParentSession(req, options);
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const childId = typeof options.childId === "function" ? options.childId(req) : req.params.childId;
      const ownership = await resolveOwnedGatesChild({ pool: options.pool || defaultPool, parentProfileId: sessionState.parentProfile.id, childId });
      if (!ownership.ok) return res.status(ownership.status).json({ error: ownership.error });
      req.gatesParentSession = sessionState;
      req.gatesOwnedChild = ownership;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = {
  GATES_SESSION_COOKIE,
  GATES_SESSION_TTL_MS,
  GATES_TENANT_SLUG,
  buildGatesSessionCookie,
  formatChildProfileRow,
  normalizeEmail,
  parseCookieHeader,
  isExcludedAdaptiveLearner,
  listOwnedCanonicalGatesChildren,
  parsePositiveIntegerId,
  resolveCanonicalLearnerForRequest,
  requireGatesParentSession,
  requireOwnedGatesChild,
  resolveGatesParentSession,
  resolveOwnedGatesChild,
  sha256,
};
