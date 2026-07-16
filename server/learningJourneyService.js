"use strict";

const DEFAULT_SKILL_WORLD_TOTAL = 6;
const DEFAULT_LESSON_TOTAL = 12;
const FAKE_LEARNER_NAMES = new Set(["guest", "nsi", "mar"]);

function toText(value) { return String(value ?? "").trim(); }
function toNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function toIso(value) { if (!value) return null; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toISOString(); }
function isFakeLearnerName(value) { const n = toText(value).toLowerCase(); return FAKE_LEARNER_NAMES.has(n) || n.startsWith("guest ") || n.startsWith("nsi ") || n.startsWith("mar "); }
function normalizeStatus(value, progress = 0) {
  const status = toText(value).toLowerCase().replace(/\s+/g, "_");
  if (status === "completed" || progress >= 100) return "completed";
  if (status === "in_progress" || status === "started" || progress > 0) return "in_progress";
  return "not_started";
}
function latestDate(rows, fields) {
  let best = null;
  for (const row of rows || []) for (const field of fields) {
    const v = row && row[field];
    if (!v) continue;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime()) && (!best || d > best)) best = d;
  }
  return best ? best.toISOString() : null;
}
function safeRows(result) { return Array.isArray(result?.rows) ? result.rows : []; }
async function queryOptional(pool, sql, params) {
  try { return safeRows(await pool.query(sql, params)); }
  catch (err) {
    if (err && (err.code === "42P01" || /does not exist/i.test(String(err.message || "")))) return [];
    throw err;
  }
}
function scoreFrom(row) {
  const total = toNumber(row?.total_count);
  if (!total) return null;
  return Math.round((toNumber(row?.correct_count) / Math.max(1, total)) * 100);
}
function masteryFrom(row, fallbackScore = null) {
  const band = toText(row?.mastery_band || row?.mastery_band_after).toLowerCase();
  if (band === "consistent") return 90;
  if (band === "developing") return 70;
  if (band === "emerging") return 45;
  return fallbackScore;
}
function titleForSkill(skillId) {
  const text = toText(skillId).replace(/[-_]+/g, " ").toLowerCase();
  return text ? text.replace(/\b\w/g, (m) => m.toUpperCase()) : "Adaptive Learning";
}
function recommendationFor({ latestProgress, checkpointRows, inProgressSkill, skillWorlds, assessments }) {
  const score = scoreFrom(latestProgress);
  const mastery = masteryFrom(latestProgress, score);
  const attempts = toNumber(latestProgress?.checkpoint_attempts);
  const incorrect = checkpointRows.filter((r) => r.is_correct === false);
  const sameSkillErrors = incorrect.filter((r) => toText(r.skill_id) === toText(latestProgress?.selected_skill_id)).length;
  const lowSkillWorld = skillWorlds.find((s) => s.status !== "completed" && (s.score_percent < 70 || s.attempts >= 3));
  if (inProgressSkill) return { type: "skill_world", activity_id: inProgressSkill.skill_id, title: `Continue ${titleForSkill(inProgressSkill.skill_id)} Skill World`, reason: "A Skill World is already in progress.", launch_route: `/gamehub/skill-world/?skill=${encodeURIComponent(inProgressSkill.skill_id)}`, estimated_minutes: 12, confidence: 0.86 };
  if (lowSkillWorld) return { type: "skill_world", activity_id: lowSkillWorld.skill_id, title: `${titleForSkill(lowSkillWorld.skill_id)} Skill World`, reason: "Recent Skill World attempts show this skill needs another mission before advancing.", launch_route: `/gamehub/skill-world/?skill=${encodeURIComponent(lowSkillWorld.skill_id)}`, estimated_minutes: 12, confidence: 0.82 };
  if (sameSkillErrors >= 2 || (mastery !== null && mastery < 70) || (score !== null && score < 70)) {
    const id = toText(latestProgress?.selected_skill_id) || toText(incorrect[0]?.skill_id) || "grade-1-practice";
    return { type: "practice", activity_id: id, title: `${titleForSkill(id)} Practice`, reason: "Mastery or repeated checkpoint errors show practice is better than the next lesson right now.", launch_route: `/gamehub/adaptive-grade1-v2.html?practice=${encodeURIComponent(id)}`, estimated_minutes: 10, confidence: 0.9 };
  }
  if (((score !== null && score >= 95) || (mastery !== null && mastery >= 95)) && attempts <= 2) {
    const id = toText(latestProgress?.next_recommended_skill_id) || "grade-1-enrichment";
    return { type: "enrichment", activity_id: id, title: `${titleForSkill(id)} Enrichment`, reason: "Strong mastery supports skipping repetitive practice and unlocking enrichment.", launch_route: `/gamehub/adaptive-grade1-v2.html?enrichment=${encodeURIComponent(id)}`, estimated_minutes: 15, confidence: 0.78 };
  }
  if (toText(latestProgress?.next_recommended_skill_id)) return { type: "lesson", activity_id: toText(latestProgress.next_recommended_skill_id), title: `Next Mission: ${titleForSkill(latestProgress.next_recommended_skill_id)}`, reason: "Current lesson mastery is ready for the next prerequisite-aligned lesson.", launch_route: `/gamehub/adaptive-grade1-v2.html?lesson=${encodeURIComponent(latestProgress.next_recommended_skill_id)}`, estimated_minutes: 12, confidence: 0.8 };
  if ((assessments || []).some((a) => normalizeStatus(a.status) === "in_progress")) return { type: "checkpoint", activity_id: "assessment-checkpoint", title: "Finish Your Checkpoint", reason: "There is an unfinished assessment checkpoint.", launch_route: "/assessment-mvp/", estimated_minutes: 8, confidence: 0.76 };
  return { type: "lesson", activity_id: "adaptive-v2-start", title: "Start Adaptive Learning", reason: "No saved journey activity exists yet.", launch_route: "/gamehub/adaptive-grade1-v2.html", estimated_minutes: 12, confidence: 0.55 };
}
function buildRecentActivity({ assessments, skillWorlds, adaptiveRows, checkpointRows, childId }) {
  const items = [];
  for (const row of assessments) if (normalizeStatus(row.status) === "completed") items.push({ event_type: "assessment_completed", label: `${toText(row.subject) || "Adaptive"} assessment completed`, child_id: childId, status: "completed", score: row.score_percent ?? null, occurred_at: toIso(row.completed_at || row.updated_at || row.created_at) });
  for (const row of checkpointRows) items.push({ event_type: "checkpoint_completed", label: `${toText(row.skill_id) || "Adaptive"} checkpoint completed`, child_id: childId, status: row.is_correct === false ? "completed_with_practice_needed" : "completed", score: row.is_correct === true ? 100 : row.is_correct === false ? 0 : null, occurred_at: toIso(row.created_at || row.updated_at) });
  for (const row of adaptiveRows) if (toNumber(row.checkpoint_attempts) > 0) items.push({ event_type: "lesson_completed", label: `${toText(row.selected_skill_id) || "Adaptive lesson"} progress saved`, child_id: childId, status: normalizeStatus("in_progress", toNumber(row.checkpoint_attempts)), score: scoreFrom(row), occurred_at: toIso(row.updated_at || row.created_at) });
  for (const row of skillWorlds) items.push({ event_type: row.status === "completed" ? "skill_world_completed" : row.progress_percent > 0 ? "skill_world_progress_updated" : "skill_world_started", label: `${toText(row.skill_id) || "Skill World"} ${row.status.replace(/_/g, " ")}`, child_id: childId, status: row.status, score: row.score_percent ?? null, occurred_at: toIso(row.last_activity_at) });
  return items.filter((item) => item.occurred_at).sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at))).slice(0, 12);
}
async function buildLearningJourney(pool, { childId, parentProfileId = null, childName = "" } = {}) {
  const cid = toText(childId);
  if (!cid) return { ok: false, error: "child_id_required" };
  if (!pool || typeof pool.query !== "function") return { ok: false, error: "pool_required" };
  const parentFilter = parentProfileId ? " AND parent_profile_id::text=$2" : "";
  const params = parentProfileId ? [cid, String(parentProfileId)] : [cid];
  const assessments = await queryOptional(pool, `SELECT session_id, learner_id::text AS child_id, parent_profile_id::text, assessment_role, grade, subject, status, current_question_position, created_at, updated_at, completed_at FROM assessment_sessions WHERE learner_id::text=$1${parentFilter} ORDER BY COALESCE(completed_at, updated_at, created_at) DESC`, params);
  const skillWorldsRaw = await queryOptional(pool, `SELECT child_id::text, parent_profile_id::text, learner_display_name, skill_id, mode, status, progress_percent, attempts, correct, score_percent, hints_used, last_step, created_at, updated_at FROM skill_world_progress WHERE child_id::text=$1${parentFilter} ORDER BY updated_at DESC`, params);
  const adaptiveRows = await queryOptional(pool, `SELECT child_id::text, parent_profile_id::text, learner_display_name, grade, runtime_version, selected_skill_id, checkpoint_attempts, correct_count, total_count, hint_usage_count, mastery_band, next_recommended_skill_id, created_at, updated_at FROM adaptive_v2_skill_progress WHERE child_id::text=$1${parentFilter} ORDER BY updated_at DESC`, params);
  const checkpointRows = await queryOptional(pool, `SELECT child_id::text, parent_profile_id::text, skill_id, checkpoint_id, is_correct, mastery_band_after, next_recommended_skill_id, created_at FROM adaptive_v2_checkpoint_attempts WHERE child_id::text=$1${parentFilter} ORDER BY created_at DESC LIMIT 50`, params);
  const skillWorlds = skillWorldsRaw.map((row) => ({ skill_id: toText(row.skill_id), mode: toText(row.mode || "mission"), status: normalizeStatus(row.status, toNumber(row.progress_percent)), current_lesson_or_step: toText(row.last_step) || "Not started", progress_percent: clamp(toNumber(row.progress_percent), 0, 100), score_percent: toNumber(row.score_percent), attempts: toNumber(row.attempts), correct: toNumber(row.correct), hints_used: toNumber(row.hints_used), last_activity_at: toIso(row.updated_at || row.created_at), child_id: cid }));
  const latestProgress = adaptiveRows[0] || null;
  const inProgressSkill = skillWorlds.find((r) => r.status === "in_progress") || null;
  const recommendation = recommendationFor({ latestProgress, checkpointRows, inProgressSkill, skillWorlds, assessments });
  const completedAssessments = assessments.filter((r) => normalizeStatus(r.status) === "completed");
  const completedLessons = adaptiveRows.filter((r) => toNumber(r.total_count) > 0 && toNumber(r.correct_count) >= toNumber(r.total_count));
  const currentSubject = toText(latestProgress?.selected_skill_id).toLowerCase().includes("read") ? "Reading" : toText(assessments[0]?.subject) || "Math";
  const latestScore = assessments[0]?.score_percent ?? scoreFrom(latestProgress);
  const mastery = masteryFrom(latestProgress, latestScore);
  const hasProgress = assessments.length > 0 || skillWorlds.length > 0 || adaptiveRows.length > 0 || checkpointRows.length > 0;
  return {
    ok: true, service: "learning_journey", contract_version: "learning_journey_v1", child_id: cid, child_name: toText(childName), learner_is_test_or_guest_name: isFakeLearnerName(childName), empty_state: !hasProgress,
    current: { curriculum: "Adaptive V2", subject: currentSubject, grade: toText(latestProgress?.grade) || toText(assessments[0]?.grade) || "1", unit: titleForSkill(latestProgress?.selected_skill_id || recommendation.activity_id), lesson: toText(latestProgress?.selected_skill_id) || null, checkpoint: toText(checkpointRows[0]?.checkpoint_id) || null, skill_world: inProgressSkill?.skill_id || null, mastery_score: mastery, completion_status: hasProgress ? (inProgressSkill ? "in_progress" : "active") : "not_started", streak: 0, recommendation },
    history: { completed_lessons: completedLessons, skill_worlds: skillWorlds, completed_skill_worlds: skillWorlds.filter((r) => r.status === "completed"), completed_checkpoints: checkpointRows, assessment_history: assessments, scores: { latest_score: latestScore, skill_world_scores: skillWorlds.map((s) => ({ skill_id: s.skill_id, score_percent: s.score_percent })) }, attempts: { checkpoint_attempts: toNumber(latestProgress?.checkpoint_attempts), skill_world_attempts: skillWorlds.reduce((sum, s) => sum + s.attempts, 0) }, completion_timestamps: { last_activity_at: latestDate([...assessments, ...skillWorldsRaw, ...adaptiveRows, ...checkpointRows], ["completed_at", "updated_at", "created_at"]) }, mastery_changes: checkpointRows.map((r) => ({ skill_id: r.skill_id, checkpoint_id: r.checkpoint_id, mastery_band: r.mastery_band_after, occurred_at: toIso(r.created_at) })) },
    parent_view: { title: `${toText(childName) || "Your child"}'s Learning Journey`, subject: currentSubject, current_unit: titleForSkill(latestProgress?.selected_skill_id || recommendation.activity_id), current_lesson: toText(latestProgress?.selected_skill_id) || "Ready to begin", mastery: mastery === null ? "Forming" : `${mastery}%`, estimated_time_remaining: `${recommendation.estimated_minutes} minutes for the next activity`, completed_lessons: completedLessons.length, remaining_lessons: Math.max(0, DEFAULT_LESSON_TOTAL - completedLessons.length), current_skill_world: inProgressSkill?.skill_id || "None in progress", next_recommended_activity: recommendation.title },
    child_view: { headline: "Continue Your Adventure", you_are_learning: titleForSkill(latestProgress?.selected_skill_id || recommendation.activity_id), next_mission: recommendation.title, estimated_time: `${recommendation.estimated_minutes} minutes`, reward_after_completion: "Badge + XP" },
    ai_coach_context: { may_say: recommendation.reason, must_not_guess_curriculum_position: true, source: "Learning Journey" },
    recent_activity: buildRecentActivity({ assessments, skillWorlds, adaptiveRows, checkpointRows, childId: cid }),
    learning_legacy_next_recommended_skill_id: toText(latestProgress?.next_recommended_skill_id) || null,
    source_tables: ["assessment_sessions", "adaptive_v2_skill_progress", "adaptive_v2_checkpoint_attempts", "skill_world_progress"]
  };
}
module.exports = { buildLearningJourney, isFakeLearnerName, normalizeStatus, recommendationFor };
