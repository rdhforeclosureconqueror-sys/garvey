"use strict";
const express = require("express");
const { mapAdaptiveV2Grade1ToGatesSignals } = require("./adaptiveV2Grade1GatesSignalMapper");
const { resolveCanonicalLearnerForRequest } = require("./gatesAuth");
const { buildAdaptiveParentDashboardSummary } = require("./adaptiveParentDashboardSummary");
const { buildLearningJourney } = require("./learningJourneyService");
const { getCurriculumGeniusMapping } = require("../youth-development/content/curriculumGeniusMap");
const { getGrade4SkillWorldGeniusOutline } = require("./grade4QuestionGeniusOutlineService");

const ALLOWED_MASTERY_BANDS = new Set(["emerging", "developing", "consistent"]);

const VOICE_ALLOWED_SECTIONS = new Set(["lesson_snippet", "worked_example", "hints", "checkpoint_instructions", "supportive_feedback", "next_practice_recommendation"]);

function cleanVoiceText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 280);
}

function isVoiceUnsafe(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return true;
  if (/\b(pass|fail|diagnos|disorder|condition|deficit)\b/i.test(t)) return true;
  if (/\b(ssn|social security|dob|date of birth|email|phone|address|password|token)\b/i.test(t)) return true;
  if (/\b(answer key|correct answer|raw prompt)\b/i.test(t)) return true;
  if (/[^\s]+@[^\s]+\.[^\s]+/.test(t)) return true;
  return false;
}

function toBand(v) {
  const n = String(v || "").trim().toLowerCase();
  return ALLOWED_MASTERY_BANDS.has(n) ? n : "emerging";
}

async function resolveOptionalOwnedChild(req, childId, pool, listYouthChildProfiles = null) {
  if (listYouthChildProfiles && isYouthDevelopmentRequest(req, req.body || {})) {
    const youthIdentity = await resolveYouthDevelopmentOwnedChild(req, childId, listYouthChildProfiles);
    if (youthIdentity) return youthIdentity;
    const err = new Error("youth_development_child_profile_not_found");
    err.status = 404;
    err.error = "youth_development_child_profile_not_found";
    throw err;
  }
  const identity = await resolveCanonicalLearnerForRequest(req, { pool, childId });
  if (!identity.ok && identity.status === 401) return { session: identity.session || { authenticated: false }, ownedChild: null };
  if (!identity.ok) {
    const err = new Error(identity.error);
    err.status = identity.status;
    err.error = identity.error;
    throw err;
  }
  return {
    session: identity.session,
    ownedChild: {
      ok: true,
      childId: Number(identity.child.child_id),
      learnerId: String(identity.child.child_id),
      childProfile: identity.child,
      canonicalResolver: identity.resolver,
    },
  };
}

async function resolveRequiredOwnedChild(req, childId, pool, listYouthChildProfiles = null) {
  if (listYouthChildProfiles && isYouthDevelopmentRequest(req, req.body || {})) {
    const youthIdentity = await resolveYouthDevelopmentOwnedChild(req, childId, listYouthChildProfiles);
    if (youthIdentity) return youthIdentity;
    const err = new Error("youth_development_child_profile_not_found");
    err.status = 404;
    err.error = "youth_development_child_profile_not_found";
    throw err;
  }
  const identity = await resolveCanonicalLearnerForRequest(req, { pool, childId });
  if (!identity.ok) {
    const err = new Error(identity.error);
    err.status = identity.status;
    err.error = identity.error;
    throw err;
  }
  return {
    session: identity.session,
    ownedChild: {
      ok: true,
      childId: Number(identity.child.child_id),
      learnerId: String(identity.child.child_id),
      childProfile: identity.child,
      canonicalResolver: identity.resolver,
    },
  };
}

function logRejectedProgressWrite({ route, childId, reason, status }) {
  console.info(JSON.stringify({
    ts: new Date().toISOString(),
    event: "adaptive_progress_write_rejected",
    route,
    submitted_child_id: String(childId || ""),
    rejection_reason: String(reason || "unknown"),
    status: Number(status || 400)
  }));
}

function normalizeYouthAccountContext(req, input = {}) {
  const body = input || {};
  const query = req.query || {};
  return {
    tenant: String(body.tenant || body.tenant_slug || query.tenant || query.tenant_slug || req.authActor?.tenantSlug || req.headers["x-tenant-slug"] || "").trim().toLowerCase(),
    email: String(body.email || query.email || req.authActor?.email || req.headers["x-user-email"] || "").trim().toLowerCase(),
  };
}

function isYouthDevelopmentRequest(req, input = {}) {
  const programContext = String(input.program_context || req.query?.program_context || "").trim().toLowerCase();
  const sourceRegistry = String(input.source_registry || req.query?.source_registry || "").trim().toLowerCase();
  return programContext === "youth_development" || sourceRegistry === "youth_development";
}

function safeActivityList(value, limit = 12) {
  return (Array.isArray(value) ? value : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeLearningActivityObservation(value, fallback = {}) {
  const observation = value && typeof value === "object" ? value : {};
  const durationSeconds = Math.max(0, Math.min(1800, Math.round(Number(observation.duration_seconds || fallback.duration_seconds || 0))));
  const activityId = String(observation.activity_id || fallback.activity_id || "").trim().slice(0, 160);
  const mapping = getCurriculumGeniusMapping(activityId);
  const submittedSkillId = String(fallback.skill_id || "").trim().slice(0, 160).toUpperCase();
  // Browser telemetry is useful evidence, but it is not an authority for what
  // was practiced. The registry is the authority for activity, skill, tags,
  // and Garvey dimension codes.
  const expectedSkillId = mapping
    ? String(mapping.progress_skill_id || mapping.content_id || "").toUpperCase()
    : "";
  const eventError = !mapping
    ? "activity_not_registered"
    : submittedSkillId !== expectedSkillId
      ? "activity_skill_mismatch"
      : null;
  return {
    event_key: String(observation.event_key || fallback.event_key || "").trim().slice(0, 160),
    session_id: String(observation.session_id || fallback.session_id || "").trim().slice(0, 160),
    activity_id: activityId,
    skill_id: expectedSkillId || submittedSkillId,
    duration_seconds: durationSeconds,
    practice_tags: mapping ? [...mapping.activity.practice_tags] : [],
    genius_dimension_codes: mapping ? [...mapping.activity.genius_dimension_codes] : [],
    observation: observation && typeof observation === "object" ? observation : {},
    event_error: eventError,
  };
}

function youthOwnedChildPayload({ child, accountCtx, authUserId = null }) {
  return {
    session: {
      authenticated: true,
      authUserId: authUserId == null ? null : Number(authUserId),
      parentProfile: { id: child.parent_profile_id || child.parent_id || null, email: accountCtx.email },
      programContext: "youth_development",
      sourceRegistry: "youth_development",
    },
    ownedChild: {
      ok: true,
      childId: /^\d+$/.test(String(child.child_id)) ? Number(child.child_id) : String(child.child_id),
      learnerId: String(child.child_id),
      childProfile: { ...child, ownership_verified: true },
      canonicalResolver: {
        child_id: String(child.child_id),
        child_display_name: child.child_name || "Learner",
        parent_profile_id: child.parent_profile_id || child.parent_id || null,
        auth_user_id: authUserId || null,
        program_context: "youth_development",
        source_registry: "youth_development",
        ownership_verified: true,
      },
    },
  };
}

async function resolveYouthDevelopmentOwnedChild(req, childId, listYouthChildProfiles) {
  const accountCtx = normalizeYouthAccountContext(req, req.body || {});
  if (!accountCtx.tenant || !accountCtx.email) return null;
  const children = await listYouthChildProfiles({ accountCtx, request: req });
  const selected = (Array.isArray(children) ? children : []).find((child) => String(child?.child_id || "") === String(childId));
  console.info(JSON.stringify({
    ts: new Date().toISOString(),
    event: "youth_development_learner_ownership_resolved",
    authenticated_user_id: req.authActor?.userId || null,
    parent_profile_id: selected?.parent_profile_id || selected?.parent_id || null,
    program_context: "youth_development",
    source_registry: "youth_development",
    normalized_child_id: String(childId || ""),
    ownership_query: "listYouthChildProfiles(accountCtx) -> tde_child_profiles latest profile per child, then legacy assessment_submissions, then match child_id",
    primary_table_queried: "tde_child_profiles",
    legacy_table_queried: "assessment_submissions",
    where_clause: "tde_child_profiles payload tenant/email match account; legacy assessment_submissions by tenant/email only for missing child_ids",
    rows_returned: children.length,
    ownership_result: selected ? "verified" : "not_found",
  }));
  if (!selected) return null;
  return youthOwnedChildPayload({ child: selected, accountCtx, authUserId: req.authActor?.userId || null });
}

function createAdaptiveV2Router({ pool, listYouthChildProfiles = null }) {
  const router = express.Router();

  // Curriculum metadata only. This route never reads or writes child progress,
  // and deliberately sits outside the adaptive-assessment flow.
  router.get("/api/grade4-skill-world/genius-outline/:skillId", (req, res) => {
    const outline = getGrade4SkillWorldGeniusOutline(req.params.skillId);
    if (!outline) return res.status(404).json({ ok: false, error: "grade4_skill_outline_not_found" });
    return res.json({ ok: true, contract_version: "grade4_question_genius_outline_v1", outline });
  });

  router.post("/api/adaptive-v2/progress/checkpoint-attempt", async (req, res) => {
    const b = req.body || {};
    if (String(b.grade || "") !== "1" || String(b.runtime_version || "") !== "adaptive_v2") {
      return res.status(400).json({ ok: false, error: "grade1_adaptive_v2_only" });
    }
    const childId = String(b.child_id || "").trim();
    const skillId = String(b.skill_id || "").trim();
    if (!childId || !skillId) {
      logRejectedProgressWrite({ route: "adaptive_v2_checkpoint_attempt", childId, reason: "child_id_and_skill_id_required", status: 400 });
      return res.status(400).json({ ok: false, error: "child_id_and_skill_id_required" });
    }
    let identity;
    try { identity = await resolveRequiredOwnedChild(req, childId, pool, listYouthChildProfiles); } catch (err) {
      logRejectedProgressWrite({ route: "adaptive_v2_checkpoint_attempt", childId, reason: err.error || "forbidden", status: err.status || 403 });
      return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" });
    }

    const checkpointAttempts = Number(b.checkpoint_attempts || 0);
    const correctCount = Number(b.correct_count || 0);
    const totalCount = Number(b.total_count || 0);
    const hintUsage = Number(b.hint_usage_count || 0);
    const masteryBand = toBand(b.mastery_band);
    const nextRecommendedSkillId = String(b.next_recommended_skill_id || "").trim() || null;

    await pool.query(
      `INSERT INTO adaptive_v2_skill_progress
      (child_id, grade, runtime_version, selected_skill_id, checkpoint_attempts, correct_count, total_count, hint_usage_count, mastery_band, next_recommended_skill_id, parent_summary_snapshot, parent_profile_id, auth_user_id, learner_display_name)
      VALUES ($1,'1','adaptive_v2',$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12)
      ON CONFLICT (child_id, grade, runtime_version)
      DO UPDATE SET selected_skill_id=EXCLUDED.selected_skill_id, checkpoint_attempts=EXCLUDED.checkpoint_attempts, correct_count=EXCLUDED.correct_count,
        total_count=EXCLUDED.total_count, hint_usage_count=EXCLUDED.hint_usage_count, mastery_band=EXCLUDED.mastery_band,
        next_recommended_skill_id=EXCLUDED.next_recommended_skill_id, parent_summary_snapshot=EXCLUDED.parent_summary_snapshot, parent_profile_id=EXCLUDED.parent_profile_id, auth_user_id=EXCLUDED.auth_user_id, learner_display_name=EXCLUDED.learner_display_name, updated_at=NOW()`,
      [childId, skillId, checkpointAttempts, correctCount, totalCount, hintUsage, masteryBand, nextRecommendedSkillId, JSON.stringify(b.parent_summary_snapshot || {}), identity.session.authenticated ? identity.session.parentProfile.id : null, identity.session.authenticated ? identity.session.authUserId : null, identity.ownedChild?.childProfile?.child_name || null]
    );

    await pool.query(
      `INSERT INTO adaptive_v2_checkpoint_attempts
      (child_id, grade, runtime_version, skill_id, checkpoint_id, is_correct, mastery_band_after, next_recommended_skill_id, parent_profile_id, auth_user_id)
      VALUES ($1,'1','adaptive_v2',$2,$3,$4,$5,$6,$7,$8)`,
      [childId, skillId, String(b.checkpoint_id || "checkpoint").trim(), !!b.is_correct, masteryBand, nextRecommendedSkillId, identity.session.authenticated ? identity.session.parentProfile.id : null, identity.session.authenticated ? identity.session.authUserId : null]
    );

    return res.json({ ok: true });
  });

  router.get("/api/adaptive-v2/progress/summary/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    const result = await pool.query(
      `SELECT selected_skill_id, checkpoint_attempts, correct_count, total_count, hint_usage_count,
              mastery_band, next_recommended_skill_id, parent_summary_snapshot, created_at, updated_at
       FROM adaptive_v2_skill_progress
       WHERE child_id=$1 AND grade='1' AND runtime_version='adaptive_v2'
       LIMIT 1`,
      [childId]
    );
    if (!result.rows.length) {
      return res.json({ ok: true, empty_state: true, progress: null, parent_summary: null, summary_contract_version: 'pr_f_v1' });
    }
    const progress = result.rows[0];
    const snap = (progress.parent_summary_snapshot && typeof progress.parent_summary_snapshot === 'object') ? progress.parent_summary_snapshot : {};
    const parentSummary = {
      current_practice_profile: String(snap.current_practice_profile || '').trim() || 'Current Grade 1 practice profile is forming as checkpoint activity is completed.',
      practiced_skills: Array.isArray(snap.practiced_skills) ? snap.practiced_skills.map((v) => String(v || '').trim()).filter(Boolean) : [],
      growing_skills: Array.isArray(snap.growing_skills) ? snap.growing_skills.map((v) => String(v || '').trim()).filter(Boolean) : [],
      needs_more_practice: Array.isArray(snap.needs_more_practice) ? snap.needs_more_practice.map((v) => String(v || '').trim()).filter(Boolean) : [],
      current_mastery_bands: Array.isArray(snap.current_mastery_bands) ? snap.current_mastery_bands.map((v) => String(v || '').trim()).filter(Boolean) : [String(progress.mastery_band || 'emerging')],
      recommended_next_step: String(snap.recommended_next_step || progress.next_recommended_skill_id || '').trim() || 'Continue with the current Grade 1 skill and complete one more checkpoint.',
      recent_practice_activity: String(snap.recent_practice_activity || '').trim() || `Checkpoint attempts: ${Number(progress.checkpoint_attempts || 0)} • Correct: ${Number(progress.correct_count || 0)}/${Number(progress.total_count || 0)} • Hint views: ${Number(progress.hint_usage_count || 0)}`,
      last_updated_at: progress.updated_at || progress.created_at || null
    };
    return res.json({ ok: true, empty_state: false, progress, parent_summary: parentSummary, summary_contract_version: 'pr_f_v1' });
  });

  router.post("/api/skill-world/progress", async (req, res) => {
    const b = req.body || {};
    const childId = String(b.child_id || "").trim();
    const skillId = String(b.skill_id || "").trim().toUpperCase();
    if (!childId || !skillId) {
      logRejectedProgressWrite({ route: "skill_world_progress", childId, reason: "child_id_and_skill_id_required", status: 400 });
      return res.status(400).json({ ok: false, error: "child_id_and_skill_id_required" });
    }
    let identity;
    try { identity = await resolveRequiredOwnedChild(req, childId, pool, listYouthChildProfiles); } catch (err) {
      logRejectedProgressWrite({ route: "skill_world_progress", childId, reason: err.error || "forbidden", status: err.status || 403 });
      return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" });
    }
    const mode = String(b.mode || "mission").trim() || "mission";
    const status = String(b.status || "in_progress").trim() || "in_progress";
    await pool.query(`INSERT INTO skill_world_progress
      (child_id,parent_profile_id,auth_user_id,learner_display_name,skill_id,mode,status,progress_percent,attempts,correct,score_percent,hints_used,last_step,profile,state_snapshot)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb)
      ON CONFLICT (child_id, skill_id, mode) DO UPDATE SET status=EXCLUDED.status, progress_percent=EXCLUDED.progress_percent, attempts=EXCLUDED.attempts, correct=EXCLUDED.correct, score_percent=EXCLUDED.score_percent, hints_used=EXCLUDED.hints_used, last_step=EXCLUDED.last_step, profile=EXCLUDED.profile, state_snapshot=EXCLUDED.state_snapshot, parent_profile_id=EXCLUDED.parent_profile_id, auth_user_id=EXCLUDED.auth_user_id, learner_display_name=EXCLUDED.learner_display_name, updated_at=NOW()`,
      [childId, identity.session.authenticated ? identity.session.parentProfile.id : null, identity.session.authenticated ? identity.session.authUserId : null, identity.ownedChild?.childProfile?.child_name || null, skillId, mode, status, Number(b.progress_percent||0), Number(b.attempts||0), Number(b.correct||0), Number(b.score_percent||0), Number(b.hints_used||0), String(b.last_step||''), JSON.stringify(b.profile||{}), JSON.stringify(b.state_snapshot||{})]);
    const observation = normalizeLearningActivityObservation(b.activity_observation, { skill_id: skillId, activity_id: b.profile?.content_id });
    let eventSaved = false;
    let eventRejected = null;
    if (observation.event_key && observation.activity_id && !observation.event_error) {
      const eventInsert = await pool.query(`INSERT INTO garvey_learning_activity_events
        (child_id,parent_profile_id,auth_user_id,event_key,event_type,session_id,activity_id,skill_id,duration_seconds,practice_tags,genius_dimension_codes,observation)
        VALUES ($1,$2,$3,$4,'learning_activity',$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb)
        ON CONFLICT (child_id,event_key) DO NOTHING
        RETURNING event_key`,
        [childId, identity.session.authenticated ? identity.session.parentProfile.id : null, identity.session.authenticated ? identity.session.authUserId : null, observation.event_key, observation.session_id || null, observation.activity_id, observation.skill_id || skillId, observation.duration_seconds, JSON.stringify(observation.practice_tags), JSON.stringify(observation.genius_dimension_codes), JSON.stringify(observation.observation)]);
      eventSaved = Number(eventInsert.rowCount || eventInsert.rows?.length || 0) > 0;
    } else if (observation.event_error) {
      eventRejected = observation.event_error;
    }
    return res.json({ ok: true, activity_event_saved: eventSaved, activity_event_rejected: eventRejected });
  });

  router.post("/api/skill-world/parent-checkin", async (req, res) => {
    const b = req.body || {};
    const childId = String(b.child_id || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    let identity;
    try { identity = await resolveRequiredOwnedChild(req, childId, pool, listYouthChildProfiles); } catch (err) {
      return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" });
    }
    const eventKey = String(b.event_key || "").trim().slice(0, 160);
    if (!eventKey) return res.status(400).json({ ok: false, error: "event_key_required" });
    const note = String(b.note || "").trim().slice(0, 1200);
    await pool.query(`INSERT INTO garvey_learning_activity_events
      (child_id,parent_profile_id,auth_user_id,event_key,event_type,activity_id,skill_id,observation)
      VALUES ($1,$2,$3,$4,'parent_checkin','parent_checkin','PARENT_CHECKIN',$5::jsonb)
      ON CONFLICT (child_id,event_key) DO NOTHING`,
      [childId, identity.session.authenticated ? identity.session.parentProfile.id : null, identity.session.authenticated ? identity.session.authUserId : null, eventKey, JSON.stringify({ note })]);
    return res.json({ ok: true, parent_checkin_saved: true });
  });

  router.get("/api/skill-world/progress/:childId/:skillId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    const skillId = String(req.params.skillId || "").trim().toUpperCase();
    let identity;
    try { identity = await resolveOptionalOwnedChild(req, childId, pool, listYouthChildProfiles); } catch (err) { return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" }); }
    const r = await pool.query("SELECT * FROM skill_world_progress WHERE child_id=$1 AND skill_id=$2 ORDER BY updated_at DESC LIMIT 1", [childId, skillId]);
    return res.json({ ok: true, empty_state: !r.rows.length, progress: r.rows[0] || null, authenticated: identity.session.authenticated });
  });


  router.get("/api/learning-journey/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });
    let identity;
    try { identity = await resolveOptionalOwnedChild(req, childId, pool, listYouthChildProfiles); } catch (err) { return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" }); }
    const child = identity.ownedChild?.childProfile || null;
    const journey = await buildLearningJourney(pool, {
      childId,
      parentProfileId: identity.session.authenticated ? identity.session.parentProfile.id : null,
      childName: child?.child_name || "",
    });
    return res.json({ ...journey, child, diagnostics: { route: "/api/learning-journey/:childId", authenticated: identity.session.authenticated } });
  });

  router.get("/api/adaptive-v2/parent-dashboard/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    let identity;
    try { identity = await resolveOptionalOwnedChild(req, childId, pool, listYouthChildProfiles); } catch (err) { return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" }); }
    const child = identity.ownedChild?.childProfile || null;
    const summary = await buildAdaptiveParentDashboardSummary(pool, {
      childId,
      parentProfileId: identity.session.authenticated ? identity.session.parentProfile.id : null,
      childName: child?.child_name || "",
    });
    return res.json({
      ...summary,
      child,
      next_recommendation: summary.next_recommended_learning_activity,
      diagnostics: { route: "/api/adaptive-v2/parent-dashboard/:childId", authenticated: identity.session.authenticated },
    });
  });

  router.post("/api/adaptive-v2/voice/sections", async (req, res) => {
    const b = req.body || {};
    if (String(b.grade || "") !== "1" || String(b.runtime_version || "") !== "adaptive_v2") {
      return res.status(400).json({ ok: false, error: "grade1_adaptive_v2_only" });
    }
    const sectionKey = String(b.section_key || "").trim().toLowerCase();
    if (!VOICE_ALLOWED_SECTIONS.has(sectionKey)) {
      return res.status(400).json({ ok: false, error: "section_not_allowed" });
    }
    const text = cleanVoiceText(b.text_content || b.voice_text);
    if (isVoiceUnsafe(text)) {
      return res.status(400).json({ ok: false, error: "unsafe_or_private_text" });
    }
    return res.json({
      ok: true,
      grade: "1",
      runtime_version: "adaptive_v2",
      section_key: sectionKey,
      playable_text: text,
      provider_status: "fallback",
      voice_mode: "fallback_browser_speech",
      fallback_reason: "adaptive_v2_grade1_voice_safe_fallback",
      audio_url: null,
      readable_without_voice: true
    });
  });

  router.get("/api/adaptive-v2/gates-signals/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    if (!childId) return res.status(400).json({ ok: false, error: "child_id_required" });

    const result = await pool.query(
      `SELECT selected_skill_id, checkpoint_attempts, hint_usage_count, mastery_band, next_recommended_skill_id
       FROM adaptive_v2_skill_progress
       WHERE child_id=$1 AND grade='1' AND runtime_version='adaptive_v2'
       LIMIT 1`,
      [childId]
    );

    if (!result.rows.length) {
      return res.json({ ok: true, child_id: childId, source: "adaptive_v2_grade1", empty_state: true, signals: [] });
    }

    return res.json(mapAdaptiveV2Grade1ToGatesSignals({
      childId,
      progressRow: result.rows[0],
      grade: "1",
      runtimeVersion: "adaptive_v2"
    }));
  });

  return router;
}

module.exports = { createAdaptiveV2Router };
