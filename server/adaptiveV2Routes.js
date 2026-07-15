"use strict";
const express = require("express");
const { mapAdaptiveV2Grade1ToGatesSignals } = require("./adaptiveV2Grade1GatesSignalMapper");
const { resolveGatesParentSession, resolveOwnedGatesChild } = require("./gatesAuth");
const { buildAdaptiveParentDashboardSummary } = require("./adaptiveParentDashboardSummary");

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

async function resolveOptionalOwnedChild(req, childId, pool) {
  const session = await resolveGatesParentSession(req, { pool });
  if (!session.authenticated) return { session, ownedChild: null };
  const ownedChild = await resolveOwnedGatesChild({ pool, parentProfileId: session.parentProfile.id, childId });
  if (!ownedChild.ok) {
    const err = new Error(ownedChild.error);
    err.status = ownedChild.status;
    err.error = ownedChild.error;
    throw err;
  }
  return { session, ownedChild };
}

async function resolveRequiredOwnedChild(req, childId, pool) {
  const identity = await resolveOptionalOwnedChild(req, childId, pool);
  if (!identity.session.authenticated) {
    const err = new Error("unauthenticated");
    err.status = 401;
    err.error = "unauthenticated";
    throw err;
  }
  if (!identity.ownedChild) {
    const err = new Error("child_context_required");
    err.status = 400;
    err.error = "child_context_required";
    throw err;
  }
  return identity;
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

function createAdaptiveV2Router({ pool }) {
  const router = express.Router();

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
    try { identity = await resolveRequiredOwnedChild(req, childId, pool); } catch (err) {
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
    try { identity = await resolveRequiredOwnedChild(req, childId, pool); } catch (err) {
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
    return res.json({ ok: true });
  });

  router.get("/api/skill-world/progress/:childId/:skillId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    const skillId = String(req.params.skillId || "").trim().toUpperCase();
    let identity;
    try { identity = await resolveOptionalOwnedChild(req, childId, pool); } catch (err) { return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" }); }
    const r = await pool.query("SELECT * FROM skill_world_progress WHERE child_id=$1 AND skill_id=$2 ORDER BY updated_at DESC LIMIT 1", [childId, skillId]);
    return res.json({ ok: true, empty_state: !r.rows.length, progress: r.rows[0] || null, authenticated: identity.session.authenticated });
  });

  router.get("/api/adaptive-v2/parent-dashboard/:childId", async (req, res) => {
    const childId = String(req.params.childId || "").trim();
    let identity;
    try { identity = await resolveOptionalOwnedChild(req, childId, pool); } catch (err) { return res.status(err.status || 403).json({ ok: false, error: err.error || "forbidden" }); }
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
