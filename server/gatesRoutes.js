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
const { scoreGatesAssessment } = require("../gates/gatesScoring");
const { buildGatesProfile } = require("../gates/gatesProfileBuilder");
const { generateGatesRecommendations } = require("../gates/gatesRecommendations");
const { ROLES } = require("./accessControl");
const { pool: defaultPool } = require("./db");

const GATES_SESSION_COOKIE = "gates_parent_session";
const GATES_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const GATES_TENANT_SLUG = "the-gates";


const GATES_PROGRESS_STATUSES = new Set(["not_started", "emerging", "practicing", "integrated", "revisit"]);
const GATES_PROGRESS_GATE_DEFS = GATES.map((gate, index) => ({
  gate_number: index + 1,
  gate_key: String(gate.gate_key || ""),
  name: String(gate.name || ""),
}));

function parseProgressUpdatePayload(body) {
  const gateNumber = Number(body?.gate_number);
  const status = String(body?.status || "").trim();
  const progressPercent = Number(body?.progress_percent);
  const parentNote = body?.parent_note == null ? null : String(body.parent_note);
  const observedResponse = body?.observed_response == null ? null : String(body.observed_response);
  const payload = body?.payload;

  if (!Number.isInteger(gateNumber) || gateNumber < 1 || gateNumber > 10) return null;
  if (!GATES_PROGRESS_STATUSES.has(status)) return null;
  if (!Number.isFinite(progressPercent) || progressPercent < 0 || progressPercent > 100) return null;
  if (parentNote != null && parentNote.length > 1000) return null;
  if (observedResponse != null && observedResponse.length > 1000) return null;
  if (payload != null && (typeof payload !== "object" || Array.isArray(payload))) return null;

  return {
    gate_number: gateNumber,
    status,
    progress_percent: progressPercent,
    parent_note: parentNote,
    observed_response: observedResponse,
    payload: payload && typeof payload === "object" ? payload : {},
  };
}

function buildProgressResponse(baseGate, progressRow) {
  const value = progressRow?.progress_value && typeof progressRow.progress_value === "object" ? progressRow.progress_value : {};
  return {
    gate_number: baseGate.gate_number,
    gate_key: baseGate.gate_key,
    name: baseGate.name,
    status: GATES_PROGRESS_STATUSES.has(String(value.status || "")) ? String(value.status) : "not_started",
    progress_percent: Number.isFinite(Number(value.progress_percent)) ? Number(value.progress_percent) : 0,
    current_focus: Boolean(value.current_focus),
    last_activity_at: progressRow?.updated_at || null,
    evidence: value.evidence && typeof value.evidence === "object" && !Array.isArray(value.evidence) ? value.evidence : {},
  };
}

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
    const latest = await pool.query(
      "SELECT id, payload, created_at FROM gates_assessments WHERE parent_id = $1 AND child_id = $2 ORDER BY created_at DESC LIMIT 1",
      [sessionState.parentProfile.id, req.params.childId]
    );
    const latestAssessment = latest.rows[0] || null;
    return res.json({
      ok: true,
      child_profile: profile,
      latest_assessment: latestAssessment ? {
        assessment_id: latestAssessment.id,
        created_at: latestAssessment.created_at || null,
      } : null,
      latest_gates_profile: latestAssessment?.payload?.gates_profile || null,
      latest_gate_map: latestAssessment?.payload?.gate_map || null,
    });
  });

  router.post("/api/gates/assessment/submit", async (req, res) => {
    console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_submit_received" }));
    const client = await pool.connect();
    try {
      const sessionState = await resolveGatesSession({ req, pool: client });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const childId = String(req.body?.child_id || "").trim();
      const assessmentVersion = String(req.body?.assessment_version || "").trim();
      const answers = req.body?.answers;
      if (!childId || assessmentVersion !== GATES_ASSESSMENT_VERSION || !Array.isArray(answers)) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_validation_failed", reason: "invalid_payload_shape" }));
        return res.status(400).json({ error: "invalid payload" });
      }
      const child = await client.query("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1 LIMIT 1", [childId]);
      const row = child.rows[0];
      if (!row) return res.status(400).json({ error: "invalid payload" });
      if (Number(row.parent_id) !== Number(sessionState.parentProfile.id)) {
        return res.status(403).json({ error: "forbidden" });
      }
      let scored;
      try {
        scored = scoreGatesAssessment(answers);
      } catch (error) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_validation_failed", reason: String(error?.message || error) }));
        return res.status(400).json({ error: "invalid payload" });
      }
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_scored", child_id: childId }));
      const gatesProfile = buildGatesProfile(scored);
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_profile_generated", child_id: childId }));
      const assessmentId = `ga_${crypto.randomUUID().replaceAll("-", "")}`;
      const payload = {
        assessment_id: assessmentId,
        child_id: childId,
        assessment_version: assessmentVersion,
        raw_answers: answers,
        normalized_scores: scored.normalized_scores,
        gate_scores: scored.gate_scores,
        gates_profile: gatesProfile,
        gate_map: gatesProfile.gate_map,
        confidence_summary: scored.confidence_summary,
      };
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO gates_assessments (parent_id, child_id, assessment_key, payload, created_at) VALUES ($1, $2, $3, $4::jsonb, NOW())",
        [sessionState.parentProfile.id, childId, assessmentVersion, JSON.stringify(payload)]
      );
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_saved", assessment_id: assessmentId }));
      for (const gate of scored.gate_scores) {
        const existing = await client.query(
          "SELECT id FROM gates_progress WHERE parent_id = $1 AND child_id = $2 AND progress_key = $3 LIMIT 1",
          [sessionState.parentProfile.id, childId, gate.gate_key]
        );
        if (existing.rows[0]) {
          await client.query("UPDATE gates_progress SET progress_value = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(gate), existing.rows[0].id]);
        } else {
          await client.query(
            "INSERT INTO gates_progress (parent_id, child_id, progress_key, progress_value, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())",
            [sessionState.parentProfile.id, childId, gate.gate_key, JSON.stringify(gate)]
          );
        }
      }
      await client.query("COMMIT");
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_initialized", child_id: childId }));
      return res.status(201).json({ ok: true, assessment_id: assessmentId, child_id: childId, gates_profile: gatesProfile, gate_map: gatesProfile.gate_map, confidence_summary: scored.confidence_summary, next_route: `/gates/results/${assessmentId}` });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_submit_failed", error: String(err?.message || err) }));
      return res.status(500).json({ error: "gates assessment submit failed" });
    } finally {
      client.release();
    }
  });


  router.get("/api/gates/children/:childId/progress", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const child = await pool.query("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
      const childRow = child.rows[0];
      if (!childRow || Number(childRow.parent_id) !== Number(sessionState.parentProfile.id)) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_ownership_denied", parent_id: sessionState.parentProfile.id, child_id: req.params.childId }));
        return res.status(403).json({ error: "forbidden" });
      }
      const rows = await pool.query("SELECT progress_key, progress_value, updated_at FROM gates_progress WHERE parent_id = $1 AND child_id = $2", [sessionState.parentProfile.id, req.params.childId]);
      const byKey = new Map(rows.rows.map((r) => [String(r.progress_key || ""), r]));
      const progress = GATES_PROGRESS_GATE_DEFS.map((gate) => buildProgressResponse(gate, byKey.get(gate.gate_key)));
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_loaded", parent_id: sessionState.parentProfile.id, child_id: req.params.childId }));
      return res.json({ ok: true, child_id: String(req.params.childId), progress });
    } catch (err) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_update_failed", child_id: req.params.childId, error: String(err?.message || err) }));
      return res.status(500).json({ error: "gates progress load failed" });
    }
  });

  router.post("/api/gates/children/:childId/progress", async (req, res) => {
    const client = await pool.connect();
    try {
      const sessionState = await resolveGatesSession({ req, pool: client });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const child = await client.query("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
      const childRow = child.rows[0];
      if (!childRow || Number(childRow.parent_id) !== Number(sessionState.parentProfile.id)) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_ownership_denied", parent_id: sessionState.parentProfile.id, child_id: req.params.childId }));
        return res.status(403).json({ error: "forbidden" });
      }
      const parsed = parseProgressUpdatePayload(req.body);
      if (!parsed) return res.status(400).json({ error: "invalid payload" });
      const gateDef = GATES_PROGRESS_GATE_DEFS.find((gate) => gate.gate_number === parsed.gate_number);
      if (!gateDef) return res.status(400).json({ error: "invalid payload" });
      const nowIso = new Date().toISOString();
      const progressValue = {
        gate_number: parsed.gate_number,
        gate_key: gateDef.gate_key,
        name: gateDef.name,
        status: parsed.status,
        progress_percent: parsed.progress_percent,
        current_focus: parsed.status === "practicing",
        evidence: parsed.payload,
      };
      await client.query("BEGIN");
      const existing = await client.query("SELECT id FROM gates_progress WHERE parent_id = $1 AND child_id = $2 AND progress_key = $3 LIMIT 1", [sessionState.parentProfile.id, req.params.childId, gateDef.gate_key]);
      if (existing.rows[0]) {
        await client.query("UPDATE gates_progress SET progress_value = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(progressValue), existing.rows[0].id]);
      } else {
        await client.query("INSERT INTO gates_progress (parent_id, child_id, progress_key, progress_value, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())", [sessionState.parentProfile.id, req.params.childId, gateDef.gate_key, JSON.stringify(progressValue)]);
      }
      await client.query("INSERT INTO gates_practice_logs (parent_id, child_id, gate_key, payload, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())", [sessionState.parentProfile.id, req.params.childId, gateDef.gate_key, JSON.stringify({ gate_number: parsed.gate_number, status: parsed.status, progress_percent: parsed.progress_percent, parent_note: parsed.parent_note, observed_response: parsed.observed_response, payload: parsed.payload, logged_at: nowIso })]);
      await client.query("COMMIT");
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_practice_log_created", parent_id: sessionState.parentProfile.id, child_id: req.params.childId, gate_key: gateDef.gate_key }));
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_updated", parent_id: sessionState.parentProfile.id, child_id: req.params.childId, gate_key: gateDef.gate_key }));
      return res.status(200).json({ ok: true, child_id: String(req.params.childId), gate_key: gateDef.gate_key });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_update_failed", child_id: req.params.childId, error: String(err?.message || err) }));
      return res.status(500).json({ error: "gates progress update failed" });
    } finally {
      client.release();
    }
  });


  router.get("/api/gates/children/:childId/recommendations", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });

      const child = await pool.query("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
      const row = child.rows[0];
      if (!row || Number(row.parent_id) !== Number(sessionState.parentProfile.id)) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_recommendations_ownership_denied", parent_id: sessionState.parentProfile.id, child_id: req.params.childId }));
        return res.status(403).json({ error: "forbidden" });
      }

      const latest = await pool.query(
        "SELECT id, payload, created_at FROM gates_assessments WHERE parent_id = $1 AND child_id = $2 ORDER BY created_at DESC LIMIT 1",
        [sessionState.parentProfile.id, req.params.childId]
      );
      const latestAssessment = latest.rows[0];
      if (!latestAssessment?.payload) return res.json({ ok: true, child_id: String(req.params.childId), recommendations: [] });

      const childProfile = formatChildProfileRow(row);
      const recommendations = generateGatesRecommendations({
        child_id: String(req.params.childId),
        gates_profile: latestAssessment.payload.gates_profile || {},
        gate_scores: latestAssessment.payload.gate_scores || [],
        current_growth_gate: latestAssessment.payload.gates_profile?.current_growth_gate?.gate_key || latestAssessment.payload.current_growth_gate || null,
        child_age_band: childProfile.child_age_band || "",
      });
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_recommendations_generated", child_id: req.params.childId, count: recommendations.length }));

      for (const rec of recommendations) {
        const existing = await pool.query(
          "SELECT id FROM gates_practice_recommendations WHERE parent_id = $1 AND child_id = $2 AND recommendation_key = $3 LIMIT 1",
          [sessionState.parentProfile.id, req.params.childId, rec.recommendation_id]
        );
        if (existing.rows[0]) {
          await pool.query("UPDATE gates_practice_recommendations SET payload = $1::jsonb, updated_at = NOW() WHERE id = $2", [JSON.stringify(rec), existing.rows[0].id]);
        } else {
          await pool.query(
            "INSERT INTO gates_practice_recommendations (parent_id, child_id, recommendation_key, payload, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW())",
            [sessionState.parentProfile.id, req.params.childId, rec.recommendation_id, JSON.stringify(rec)]
          );
        }
      }

      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_recommendations_loaded", child_id: req.params.childId, count: recommendations.length }));
      return res.json({ ok: true, child_id: String(req.params.childId), recommendations });
    } catch (err) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_recommendations_generation_failed", error: String(err?.message || err) }));
      return res.status(500).json({ error: "gates recommendations failed" });
    }
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
