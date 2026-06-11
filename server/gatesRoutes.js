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
const { FIRST_GENERATION_BLUEPRINT } = require("../gates/firstGenerationBlueprint");
const { GATES_HABIT_BANK, getGateHabitByKey } = require("../gates/gatesHabitBank");
const { loadIntegratedChildProfile } = require("../integration/identityGatesBridgeService");
const { recordDevelopmentTimelineEvent, listDevelopmentTimeline, summarizeTimelineForChild } = require("../gates/gatesDevelopmentTimeline");
const { ROLES } = require("./accessControl");
const { pool: defaultPool } = require("./db");
const {
  GATES_SESSION_COOKIE,
  GATES_SESSION_TTL_MS,
  GATES_TENANT_SLUG,
  buildGatesSessionCookie,
  formatChildProfileRow,
  normalizeEmail,
  parseCookieHeader,
  resolveGatesParentSession,
  sha256,
} = require("./gatesAuth");


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

async function ensureGatesTenant(client) {
  const existing = await client.query("SELECT id, slug, name FROM tenants WHERE slug = $1 LIMIT 1", [GATES_TENANT_SLUG]);
  if (existing.rows[0]) return existing.rows[0];
  return (await client.query("INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, slug, name", ["The Gates", GATES_TENANT_SLUG])).rows[0];
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
  return resolveGatesParentSession(req, { pool });
}

function createGatesRouter({ pool = defaultPool } = {}) {
  const router = express.Router();

  const sendGatesShell = (req, res) => res.sendFile(path.join(__dirname, "..", "public", "gates.html"));
  router.get("/gates", sendGatesShell);
  router.get("/gates/signup", sendGatesShell);
  router.get("/gates/dashboard", sendGatesShell);
  router.get("/gates/children", sendGatesShell);
  router.get("/gates/assessment", sendGatesShell);
  router.get("/gates/results/:assessmentId", sendGatesShell);
  router.get("/gates/child/:childId/gates", sendGatesShell);
  router.get("/gates/child/:childId/gates/:gateNumber", sendGatesShell);
  router.get("/gates/child/:childId/reflection/:gateNumber", sendGatesShell);
  router.get("/gates/prototypes/gatequest", sendGatesShell);
  router.get("/gates/child/:childId/prototypes/gatequest", sendGatesShell);

  router.get("/api/gates/health", (req, res) => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: "gates_health_check" }));
    return res.status(200).json({ ok: true, vertical: "the-gates", status: "mounted", version: "foundation" });
  });

  router.get("/api/gates/catalog", (req, res) => res.status(200).json({ gates: GATES_CATALOG }));
  router.get("/api/gates/habit-bank", (req, res) => res.status(200).json({ ok: true, habit_bank: GATES_HABIT_BANK }));
  router.get("/api/gates/prototypes/gatequest/public-launch", (req, res) => {
    return res.status(200).json({
      ok: true,
      prototype: "gatequest",
      launch_url: "/gamehub/gatequest-standalone.html?mode=public",
      non_diagnostic_disclaimer: GATES_ASSESSMENT_DISCLAIMER,
      prototype_disclaimer: "GateQuest is a standalone developmental practice prototype. Scores and activity in this prototype do not affect official Gates assessment outcomes.",
    });
  });
  router.get("/api/gates/children/:childId/prototypes/gatequest/launch", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const childId = Number(req.params.childId);
      if (!Number.isInteger(childId) || childId <= 0) return res.status(400).json({ error: "invalid child id" });
      const child = (await pool.query("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1", [childId])).rows[0];
      if (!child || Number(child.parent_id) !== Number(sessionState.parentProfile.id)) return res.status(403).json({ error: "forbidden" });
      return res.status(200).json({
        ok: true,
        prototype: "gatequest",
        child_id: String(childId),
        launch_url: `/gamehub/gatequest-standalone.html?mode=child&child_id=${encodeURIComponent(String(childId))}`,
        non_diagnostic_disclaimer: GATES_ASSESSMENT_DISCLAIMER,
        prototype_disclaimer: "GateQuest is a standalone developmental practice prototype. Scores and activity in this prototype do not affect official Gates assessment outcomes.",
      });
    } catch {
      return res.status(500).json({ error: "gatequest launch failed" });
    }
  });

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
      return res.json({ ok: true, authenticated: true, role: ROLES.PARENT, parent_profile: { id: account.parent_profile_id, display_name: account.display_name, email: normalizeEmail(account.email) }, next_route: "/gates/children" });
    } catch (err) { return res.status(500).json({ error: "gates signin failed" }); }
  });

  router.get("/api/gates/children", async (req, res) => {
    const sessionState = await resolveGatesSession({ req, pool });
    if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
    const rows = await pool.query(
      "SELECT c.id, c.first_name FROM gates_child_profiles c WHERE c.parent_id = $1",
      [sessionState.parentProfile.id]
    );
    const children = [];
    for (const row of rows.rows) {
      const latest = await pool.query(
        "SELECT id, created_at FROM gates_assessments WHERE parent_id = $1 AND child_id = $2 ORDER BY created_at DESC LIMIT 1",
        [sessionState.parentProfile.id, row.id]
      );
      children.push({
        ...formatChildProfileRow(row),
        latest_assessment: latest.rows[0]
          ? { assessment_id: String(latest.rows[0].id), created_at: latest.rows[0].created_at || null }
          : null,
      });
    }
    return res.json({
      ok: true,
      children,
    });
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
      gates_profile: latestAssessment?.payload?.gates_profile || null,
      gate_map: latestAssessment?.payload?.gate_map || null,
      current_growth_gate: latestAssessment?.payload?.gates_profile?.growth_gate?.gate_key || null,
      blueprint_guidance: latestAssessment?.payload?.gates_profile ? {
        reflection_focus: latestAssessment.payload.gates_profile.reflection_focus || null,
        observation_focus: latestAssessment.payload.gates_profile.observation_focus || null,
        ceremony_readiness_hint: latestAssessment.payload.gates_profile.ceremony_readiness_hint || null,
      } : null,
      latest_gate_map: latestAssessment?.payload?.gate_map || null,
    });
  });

  router.get("/api/gates/children/:childId/reflection/:gateNumber/prototype", async (req, res) => {
    const sessionState = await resolveGatesSession({ req, pool });
    if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });

    const gateNumber = Number(req.params.gateNumber);
    const prototypesByGate = {
      1: {
        gate_name: "Attention",
        world_name: "Forest of Whispers",
        intro_story: "In the Forest of Whispers, small signals can guide us when we notice them with care.",
        prompt: "What is calling for your attention today?",
        symbols: ["whisper", "bird", "path", "light", "stillness"],
        followup_prompt: "What helps you return to the path?",
        followup_options: ["listening", "breathing", "slowing down", "asking for help", "taking one step"],
        ending: "What we give attention to becomes part of us.",
      },
      2: {
        gate_name: "Emotion",
        world_name: "Valley of Weather",
        intro_story: "In the Valley of Weather, feelings move like skies. We can notice them gently and let them pass.",
        prompt: "Which weather feels closest to your feelings today?",
        symbols: ["storm", "fog", "rain", "wind", "sunshine"],
        followup_prompt: "What helps this weather soften?",
        followup_options: ["breathing", "quiet", "movement", "hug", "words", "drawing"],
        ending: "Feelings are messages, not enemies.",
      },
      3: {
        gate_name: "Choice",
        world_name: "Crossing Paths",
        intro_story: "At Crossing Paths, each choice is a gentle step that can shape where we go next.",
        prompt: "Which path would you choose today?",
        symbols: ["easy path", "brave path", "kind path", "quiet path", "helpful path"],
        followup_prompt: "What helps you choose with care?",
        followup_options: ["pausing", "remembering", "asking", "thinking ahead", "trying again"],
        ending: "Every repeated choice becomes a direction.",
      },
    };

    if (!Number.isInteger(gateNumber) || !prototypesByGate[gateNumber]) {
      return res.status(404).json({ error: "reflection prototype not found" });
    }

    const child = await pool.query("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
    if (!child.rows[0]) return res.status(404).json({ error: "reflection prototype not found" });
    if (Number(child.rows[0].parent_id) !== Number(sessionState.parentProfile.id)) {
      return res.status(403).json({ error: "forbidden" });
    }

    console.info(JSON.stringify({
      ts: new Date().toISOString(),
      event: "child_reflection_prototype_viewed",
      parent_user_id: sessionState.parentProfile.id,
      child_id: String(req.params.childId),
      gate_number: gateNumber,
    }));

    return res.status(200).json({
      ok: true,
      prototype: true,
      child_id: String(req.params.childId),
      gate_number: gateNumber,
      ...prototypesByGate[gateNumber],
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
      const fail = ({ status = 400, reason, error, firstInvalidQuestionId = null, firstInvalidValue = null, dbCode = null }) => {
        console.info(JSON.stringify({
          ts: new Date().toISOString(),
          event: "gates_assessment_submit_failed",
          reason,
          child_id_present: Boolean(childId),
          assessment_version: assessmentVersion || null,
          answer_count: Array.isArray(answers) ? answers.length : 0,
          first_invalid_question_id: firstInvalidQuestionId,
          first_invalid_value: firstInvalidValue,
          parent_user_id_present: Boolean(sessionState?.parentProfile?.id),
          db_error_code: dbCode,
        }));
        return res.status(status).json({ error });
      };
      if (!childId) return fail({ reason: "missing_child_id", error: "No child selected" });
      if (assessmentVersion !== GATES_ASSESSMENT_VERSION) return fail({ reason: "assessment_version_mismatch", error: "Assessment version mismatch" });
      if (!Array.isArray(answers) || answers.length === 0) return fail({ reason: "missing_answers", error: "Please answer all questions" });
      if (answers.some((answer) => !String(answer?.question_id || "").trim())) {
        return fail({ reason: "invalid_question_id", error: "Please answer all questions" });
      }
      const child = await client.query("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1 LIMIT 1", [childId]);
      const row = child.rows[0];
      if (!row) return fail({ reason: "child_not_found", error: "Child profile not found for this parent" });
      if (Number(row.parent_id) !== Number(sessionState.parentProfile.id)) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_submit_failed", reason: "child_ownership_denied", child_id_present: true, parent_user_id_present: true }));
        return res.status(403).json({ error: "forbidden" });
      }
      let scored;
      try {
        scored = scoreGatesAssessment(answers);
      } catch (error) {
        const reason = String(error?.message || error);
        const firstInvalid = Array.isArray(answers)
          ? answers.find((answer) => {
              const questionId = String(answer?.question_id || "").trim();
              const value = String(answer?.value || "").trim().toLowerCase();
              if (!questionId) return true;
              if (!QUESTIONS.find((question) => question.question_id === questionId)) return true;
              return !["rarely", "sometimes", "often", "consistently"].includes(value);
            })
          : null;
        return fail({
          reason,
          error: reason === "invalid_option_value" ? "Invalid answer value" : "Please answer all questions",
          firstInvalidQuestionId: firstInvalid ? String(firstInvalid.question_id || "").trim() || null : null,
          firstInvalidValue: firstInvalid ? String(firstInvalid.value || "").trim() || null : null,
        });
      }
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_stage_scores_calculated", child_id: childId, gate_count: scored.gate_scores.length }));
      const gatesProfile = buildGatesProfile(scored);
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_stage_profile_generated", child_id: childId }));
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
      await recordDevelopmentTimelineEvent(client, { child_id: childId, parent_user_id: sessionState.parentProfile.id, event_type: "assessment_completed", title: "Gates assessment completed", summary: "A new Gates profile was created from parent observations.", source_type: "assessment_submit", source_id: assessmentId });
      await recordDevelopmentTimelineEvent(client, { child_id: childId, parent_user_id: sessionState.parentProfile.id, event_type: "growth_gate_selected", gate_number: gatesProfile?.growth_gate?.gate_number || null, gate_key: gatesProfile?.growth_gate?.gate_key || null, title: `Growth Gate identified: ${gatesProfile?.growth_gate?.name || "Attention"}`, summary: `${gatesProfile?.growth_gate?.name || "Attention"} became the current focus for Walking the Gate.`, source_type: "assessment_submit", source_id: assessmentId });
      for (const gateDef of GATES_PROGRESS_GATE_DEFS) {
        await client.query(
          "INSERT INTO gates_progress (parent_id, child_id, progress_key, progress_value, created_at, updated_at) VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW()) ON CONFLICT (parent_id, child_id, progress_key) DO NOTHING",
          [sessionState.parentProfile.id, childId, gateDef.gate_key, JSON.stringify({ gate_number: gateDef.gate_number, gate_key: gateDef.gate_key, name: gateDef.name, status: "not_started", progress_percent: 0, current_focus: false, evidence: {} })]
        );
      }
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_saved", assessment_id: assessmentId }));
      await client.query("COMMIT");
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_progress_initialized", child_id: childId }));
      return res.status(201).json({ ok: true, assessment_id: assessmentId, child_id: childId, gates_profile: gatesProfile, gate_map: gatesProfile.gate_map, confidence_summary: scored.confidence_summary, next_route: `/gates/results/${assessmentId}` });
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.info(JSON.stringify({
        ts: new Date().toISOString(),
        event: "gates_assessment_submit_failed",
        reason: "database_or_server_error",
        child_id_present: Boolean(String(req.body?.child_id || "").trim()),
        assessment_version: String(req.body?.assessment_version || "").trim() || null,
        answer_count: Array.isArray(req.body?.answers) ? req.body.answers.length : 0,
        parent_user_id_present: true,
        db_error_code: err?.code || null,
      }));
      return res.status(500).json({ error: "Unable to save assessment" });
    } finally {
      client.release();
    }
  });

  router.get("/api/gates/assessment/:assessmentId", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const assessmentId = String(req.params.assessmentId || "").trim();
      const found = await pool.query(
        `SELECT id, parent_id, child_id, payload, created_at
         FROM gates_assessments
         WHERE CAST(id AS text) = $1 OR (payload->>'assessment_id') = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [assessmentId]
      );
      const row = found.rows[0];
      if (!row) return res.status(404).json({ error: "assessment_not_found" });
      if (Number(row.parent_id) !== Number(sessionState.parentProfile.id)) return res.status(403).json({ error: "forbidden" });
      const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
      const recommendations = generateGatesRecommendations({
        child_id: String(row.child_id || ""),
        gates_profile: payload.gates_profile || {},
        gate_scores: payload.gate_scores || [],
        current_growth_gate: payload.gates_profile?.current_growth_gate?.gate_key || payload.current_growth_gate || null,
        child_age_band: "",
      });
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_assessment_result_loaded", parent_id: sessionState.parentProfile.id, assessment_id: assessmentId }));
      return res.json({
        ok: true,
        assessment_id: String(row.id),
        child_id: String(row.child_id),
        gates_profile: payload.gates_profile || null,
        gate_map: payload.gate_map || payload.gates_profile?.gate_map || [],
        confidence_summary: payload.confidence_summary || null,
        recommendations,
        current_growth_gate: payload.gates_profile?.growth_gate?.gate_key || null,
        practice_progress: [],
        blueprint_guidance: payload.gates_profile ? { reflection_focus: payload.gates_profile.reflection_focus, observation_focus: payload.gates_profile.observation_focus, ceremony_readiness_hint: payload.gates_profile.ceremony_readiness_hint } : null,
        created_at: row.created_at || null,
      });
    } catch (err) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_results_load_failed", reason: "server_error", assessment_id: String(req.params.assessmentId || "") }));
      return res.status(500).json({ error: "gates assessment load failed" });
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
      return res.json({ ok: true, child_id: String(req.params.childId), practice_progress: progress, progress });
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
      await recordDevelopmentTimelineEvent(client, { child_id: req.params.childId, parent_user_id: sessionState.parentProfile.id, event_type: "practice_progress_updated", gate_number: parsed.gate_number, gate_key: gateDef.gate_key, title: "Practice progress updated", summary: "A family practice moment was recorded for this Gate.", source_type: "practice_progress_update", source_id: `${req.params.childId}:${gateDef.gate_key}:${parsed.progress_percent}` });
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
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_blueprint_recommendations_generated", child_id: req.params.childId, count: recommendations.length }));

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

  router.get("/api/gates/children/:childId/timeline", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const child = await pool.query("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
      if (!child.rows[0] || Number(child.rows[0].parent_id) !== Number(sessionState.parentProfile.id)) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_timeline_ownership_denied", child_id: req.params.childId, parent_user_id: sessionState.parentProfile.id }));
        return res.status(403).json({ error: "forbidden" });
      }
      const timeline = await listDevelopmentTimeline(pool, { child_id: req.params.childId, parent_user_id: sessionState.parentProfile.id, limit: 5 });
      const summary = summarizeTimelineForChild(timeline);
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_timeline_loaded", child_id: req.params.childId, parent_user_id: sessionState.parentProfile.id }));
      return res.status(200).json({ ok: true, child_id: String(req.params.childId), timeline, summary });
    } catch (err) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "gates_timeline_load_failed", child_id: req.params.childId, error: String(err?.message || err) }));
      return res.status(500).json({ error: "gates timeline load failed" });
    }
  });



  router.get("/api/gates/children/:childId/integrated-profile", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const result = await loadIntegratedChildProfile({ pool, parentId: sessionState.parentProfile.id, childId: req.params.childId });
      if (!result.ok) {
        console.info(JSON.stringify({ ts: new Date().toISOString(), event: "integrated_child_profile_missing_sources", child_id: req.params.childId }));
        return res.status(404).json({ error: result.error || "not_found" });
      }
      const presence = result.integrated_profile?.source_presence || {};
      const count = [presence.gates, presence.identity, presence.tde].filter(Boolean).length;
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "identity_gates_bridge_composed", child_id: req.params.childId, source_count: count }));
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: count === 3 ? "integrated_child_profile_loaded" : "integrated_child_profile_partial", child_id: req.params.childId }));
      return res.json({ ok: true, integrated_profile: result.integrated_profile });
    } catch (err) {
      console.info(JSON.stringify({ ts: new Date().toISOString(), event: "integrated_child_profile_missing_sources", child_id: req.params.childId, error: String(err?.message || err) }));
      return res.status(500).json({ error: "integrated_profile_load_failed" });
    }
  });

  router.get("/api/gates/children/:childId/habit-bank", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const child = await pool.query("SELECT id, parent_id FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
      const childRow = child.rows[0];
      if (!childRow || Number(childRow.parent_id) !== Number(sessionState.parentProfile.id)) return res.status(403).json({ error: "forbidden" });
      const latest = await pool.query("SELECT payload FROM gates_assessments WHERE parent_id = $1 AND child_id = $2 ORDER BY created_at DESC LIMIT 1", [sessionState.parentProfile.id, req.params.childId]);
      const payload = latest.rows[0]?.payload || {};
      const gatesProfile = payload.gates_profile || {};
      const growthGateKey = gatesProfile?.growth_gate?.gate_key || gatesProfile?.current_growth_gate?.gate_key || payload.current_growth_gate || null;
      const integratedProfile = await loadIntegratedChildProfile({ pool, parentId: sessionState.parentProfile.id, childId: req.params.childId }).catch(() => null);
      const prioritized = getGateHabitByKey(growthGateKey);
      return res.json({
        ok: true,
        child_id: String(req.params.childId),
        current_growth_gate: growthGateKey,
        gates_profile: gatesProfile || null,
        integrated_identity_preview: integratedProfile?.ok ? integratedProfile.integrated_profile : null,
        recommended_habits: prioritized ? [prioritized, ...GATES_HABIT_BANK.filter((g) => g.gate_key !== prioritized.gate_key)] : GATES_HABIT_BANK,
      });
    } catch {
      return res.status(500).json({ error: "gates child habit bank failed" });
    }
  });

  router.get("/api/gates/children/:childId/gates/:gateNumber", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (!sessionState.authenticated) return res.status(401).json({ error: "unauthenticated" });
      const child = await pool.query("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1", [req.params.childId]);
      const row = child.rows[0];
      if (!row || Number(row.parent_id) !== Number(sessionState.parentProfile.id)) return res.status(403).json({ error: "forbidden" });
      const gateNumber = Number(req.params.gateNumber);
      const blueprint = FIRST_GENERATION_BLUEPRINT.find((g) => Number(g.gate_number) === gateNumber);
      if (!blueprint) return res.status(404).json({ error: "gate_not_found" });

      const latest = await pool.query("SELECT id, payload, created_at FROM gates_assessments WHERE parent_id = $1 AND child_id = $2 ORDER BY created_at DESC LIMIT 1", [sessionState.parentProfile.id, req.params.childId]);
      const payload = latest.rows[0]?.payload || {};
      const gateStage = (payload.gate_map || payload.gates_profile?.gate_map || []).find((g) => Number(g.gate_number) === gateNumber) || null;
      const progRows = await pool.query("SELECT progress_key, progress_value, updated_at FROM gates_progress WHERE parent_id = $1 AND child_id = $2", [sessionState.parentProfile.id, req.params.childId]);
      const progressByKey = new Map(progRows.rows.map((r) => [String(r.progress_key || ""), r]));
      const gateProgress = buildProgressResponse(GATES_PROGRESS_GATE_DEFS.find((g) => g.gate_number === gateNumber), progressByKey.get(blueprint.gate_key));
      return res.json({ ok:true, child_id:String(req.params.childId), gate_number:gateNumber, gate_key: blueprint.gate_key, stage: gateStage?.current_stage || "emerging", gate: blueprint, practice_progress: gateProgress });
    } catch {
      return res.status(500).json({ error: "gates gate detail failed" });
    }
  });

  router.post("/api/gates/auth/signout", async (req, res) => {
    try { const cookies = parseCookieHeader(req.headers.cookie || ""); const token = String(cookies[GATES_SESSION_COOKIE] || "").trim(); if (token) await pool.query("DELETE FROM auth_sessions WHERE token_hash = $1", [sha256(token)]); res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0)); return res.json({ ok: true, authenticated: false }); } catch { return res.status(500).json({ error: "gates signout failed" }); }
  });

  router.get("/api/gates/auth/session", async (req, res) => {
    try {
      const sessionState = await resolveGatesSession({ req, pool });
      if (sessionState.clearCookie) res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0));
      if (!sessionState.authenticated) return res.json({ ok: true, authenticated: false, next_route: "/gates/signup" });
      return res.json({ ok: true, authenticated: true, role: ROLES.PARENT, parent_profile: sessionState.parentProfile, next_route: "/gates/children" });
    } catch { return res.status(500).json({ error: "gates session failed" }); }
  });

  return router;
}

module.exports = { createGatesRouter };
