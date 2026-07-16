"use strict";

const DEFAULT_SKILL_WORLD_TOTAL = 6;
const FAKE_LEARNER_NAMES = new Set(["guest", "nsi", "mar"]);

function toText(value) { return String(value ?? "").trim(); }
function toNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
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

function buildRecentActivity({ assessments, skillWorlds, adaptiveRows, checkpointRows, childId }) {
  const items = [];
  for (const row of assessments) {
    if (normalizeStatus(row.status) === "completed") items.push({ event_type: "assessment_completed", label: `${toText(row.subject) || "Adaptive"} assessment completed`, child_id: childId, status: "completed", score: row.score_percent ?? null, occurred_at: toIso(row.completed_at || row.updated_at || row.created_at) });
  }
  for (const row of checkpointRows) {
    items.push({ event_type: "checkpoint_completed", label: `${toText(row.skill_id) || "Adaptive"} checkpoint completed`, child_id: childId, status: row.is_correct === false ? "completed_with_practice_needed" : "completed", score: row.is_correct === true ? 100 : row.is_correct === false ? 0 : null, occurred_at: toIso(row.created_at || row.updated_at) });
  }
  for (const row of adaptiveRows) {
    const attempts = toNumber(row.checkpoint_attempts);
    if (attempts > 0) items.push({ event_type: "lesson_completed", label: `${toText(row.selected_skill_id) || "Adaptive lesson"} progress saved`, child_id: childId, status: normalizeStatus("in_progress", attempts), score: toNumber(row.total_count) ? Math.round((toNumber(row.correct_count) / Math.max(1, toNumber(row.total_count))) * 100) : null, occurred_at: toIso(row.updated_at || row.created_at) });
  }
  for (const row of skillWorlds) {
    const status = normalizeStatus(row.status, toNumber(row.progress_percent));
    const eventType = status === "completed" ? "skill_world_completed" : toNumber(row.progress_percent) > 0 ? "skill_world_progress_updated" : "skill_world_started";
    items.push({ event_type: eventType, label: `${toText(row.skill_id) || "Skill World"} ${status.replace(/_/g, " ")}`, child_id: childId, status, score: row.score_percent ?? null, occurred_at: toIso(row.updated_at || row.created_at) });
  }
  return items.filter((item) => item.occurred_at).sort((a, b) => String(b.occurred_at).localeCompare(String(a.occurred_at))).slice(0, 12);
}

async function buildAdaptiveParentDashboardSummary(pool, { childId, parentProfileId = null, childName = "" } = {}) {
  const cid = toText(childId);
  if (!cid) return { ok: false, error: "child_id_required" };
  if (!pool || typeof pool.query !== "function") return { ok: false, error: "pool_required" };
  const parentFilter = parentProfileId ? " AND parent_profile_id::text=$2" : "";
  const params = parentProfileId ? [cid, String(parentProfileId)] : [cid];
  const assessments = await queryOptional(pool, `SELECT session_id, learner_id::text AS child_id, parent_profile_id::text, assessment_role, grade, subject, status, current_question_position, created_at, updated_at, completed_at FROM assessment_sessions WHERE learner_id::text=$1${parentFilter} ORDER BY COALESCE(completed_at, updated_at, created_at) DESC`, params);
  const skillWorldsRaw = await queryOptional(pool, `SELECT child_id::text, parent_profile_id::text, learner_display_name, skill_id, mode, status, progress_percent, attempts, correct, score_percent, hints_used, last_step, curriculum, subject, unit_id, unit_title, lesson_id, lesson_title, checkpoint_id, completed_at, mastery_level, next_recommended_lesson_id, next_recommended_lesson_title, created_at, updated_at FROM skill_world_progress WHERE child_id::text=$1${parentFilter} ORDER BY updated_at DESC`, params);
  const adaptiveRows = await queryOptional(pool, `SELECT child_id::text, parent_profile_id::text, learner_display_name, selected_skill_id, checkpoint_attempts, correct_count, total_count, hint_usage_count, mastery_band, next_recommended_skill_id, created_at, updated_at FROM adaptive_v2_skill_progress WHERE child_id::text=$1${parentFilter} ORDER BY updated_at DESC`, params);
  const checkpointRows = await queryOptional(pool, `SELECT child_id::text, parent_profile_id::text, skill_id, checkpoint_id, is_correct, mastery_band_after, next_recommended_skill_id, created_at FROM adaptive_v2_checkpoint_attempts WHERE child_id::text=$1${parentFilter} ORDER BY created_at DESC LIMIT 25`, params);
  const lessonRows = await queryOptional(pool, `SELECT child_id::text, parent_profile_id::text, learner_display_name, curriculum, subject, unit_id, unit_title, lesson_id, lesson_title, checkpoint_id, skill_world_id, completion_state, completed_at, score_percent, attempts, mastery_level, next_recommended_lesson_id, next_recommended_lesson_title, created_at, updated_at FROM adaptive_v2_lesson_progress WHERE child_id::text=$1${parentFilter} ORDER BY updated_at DESC`, params);
  const skillWorlds = skillWorldsRaw.map((row) => ({
    skill_id: toText(row.skill_id), mode: toText(row.mode || "mission"), status: normalizeStatus(row.status, toNumber(row.progress_percent)), current_lesson_or_step: toText(row.last_step || row.lesson_title || row.lesson_id) || "Not started", progress_percent: Math.max(0, Math.min(100, toNumber(row.progress_percent))), score_percent: toNumber(row.score_percent), attempts: toNumber(row.attempts), correct: toNumber(row.correct), completion_timestamp: toIso(row.completed_at), mastery_level: toText(row.mastery_level) || "emerging", next_recommended_lesson: toText(row.next_recommended_lesson_title || row.next_recommended_lesson_id), curriculum: toText(row.curriculum) || "Skill World", subject: toText(row.subject) || "Skill World", unit: toText(row.unit_title || row.unit_id), lesson: toText(row.lesson_title || row.lesson_id || row.last_step), checkpoint: toText(row.checkpoint_id), last_activity_at: toIso(row.updated_at || row.created_at), child_id: cid,
  }));
  const curriculumProgress = lessonRows.map((row) => ({
    curriculum: toText(row.curriculum), subject: toText(row.subject), unit: toText(row.unit_title || row.unit_id), unit_id: toText(row.unit_id), lesson: toText(row.lesson_title || row.lesson_id), lesson_id: toText(row.lesson_id), checkpoint: toText(row.checkpoint_id), skill_world: toText(row.skill_world_id), completion_state: normalizeStatus(row.completion_state, toNumber(row.score_percent)), completion_timestamp: toIso(row.completed_at), score: toNumber(row.score_percent), attempts: toNumber(row.attempts), mastery_level: toText(row.mastery_level) || "emerging", next_recommended_lesson: toText(row.next_recommended_lesson_title || row.next_recommended_lesson_id), last_activity_at: toIso(row.updated_at || row.created_at), child_id: cid,
  }));
  const completedAssessments = assessments.filter((r) => normalizeStatus(r.status) === "completed");
  const latestAssessment = assessments[0] || null;
  const latestProgress = adaptiveRows[0] || null;
  const completedSkillWorlds = skillWorlds.filter((r) => r.status === "completed").length;
  const inProgressSkill = skillWorlds.find((r) => r.status === "in_progress") || skillWorlds.find((r) => r.status !== "completed") || null;
  const lessonsCompleted = curriculumProgress.filter((r) => r.completion_state === "completed").length || adaptiveRows.filter((r) => toNumber(r.total_count) > 0 && toNumber(r.correct_count) >= toNumber(r.total_count)).length;
  const totalLessons = Math.max(curriculumProgress.length, adaptiveRows.length, lessonsCompleted);
  const checkpointsCompleted = checkpointRows.length;
  const latestScore = latestAssessment?.score_percent ?? (latestProgress && toNumber(latestProgress.total_count) ? Math.round((toNumber(latestProgress.correct_count) / Math.max(1, toNumber(latestProgress.total_count))) * 100) : null);
  const nextRecommendation = toText(curriculumProgress.find((r) => r.next_recommended_lesson)?.next_recommended_lesson) || toText(latestProgress?.next_recommended_skill_id) || (inProgressSkill ? `Continue ${inProgressSkill.skill_id}` : "Open the Adaptive V2 Lesson Hub and start the next recommended activity.");
  const hasProgress = assessments.length > 0 || skillWorlds.length > 0 || adaptiveRows.length > 0 || checkpointRows.length > 0 || curriculumProgress.length > 0;
  return {
    ok: true,
    child_id: cid,
    child_name: toText(childName),
    learner_is_test_or_guest_name: isFakeLearnerName(childName),
    empty_state: !hasProgress,
    status: hasProgress ? (inProgressSkill ? "in_progress" : "active") : "not_started",
    overall_status_label: hasProgress ? (inProgressSkill ? "Adaptive learning in progress" : "Adaptive learning activity saved") : "No adaptive learning progress yet",
    assessments_completed: completedAssessments.length,
    latest_assessment_score: latestScore,
    latest_assessment_completed_at: toIso(latestAssessment?.completed_at || latestAssessment?.updated_at || latestAssessment?.created_at),
    lessons_completed: lessonsCompleted,
    lessons_total: totalLessons,
    checkpoints_completed: checkpointsCompleted,
    skill_worlds_completed: completedSkillWorlds,
    skill_worlds_total: Math.max(DEFAULT_SKILL_WORLD_TOTAL, skillWorlds.length),
    current_skill_world: inProgressSkill?.skill_id || null,
    current_lesson_or_step: inProgressSkill?.current_lesson_or_step || toText(latestProgress?.selected_skill_id) || null,
    progress_percent: inProgressSkill?.progress_percent ?? (latestProgress ? Math.round((toNumber(latestProgress.correct_count) / Math.max(1, toNumber(latestProgress.total_count) || 1)) * 100) : 0),
    score_percent: inProgressSkill?.score_percent ?? latestScore,
    attempts: inProgressSkill?.attempts ?? toNumber(latestProgress?.checkpoint_attempts),
    last_activity_at: latestDate([...assessments, ...skillWorldsRaw, ...adaptiveRows, ...checkpointRows, ...lessonRows], ["completed_at", "updated_at", "created_at"]),
    next_recommended_learning_activity: nextRecommendation,
    assessments,
    skill_worlds: skillWorlds,
    curriculum_progress: curriculumProgress,
    lesson_level_progress: curriculumProgress,
    tracking_gaps: curriculumProgress.length ? [] : ["No adaptive_v2_lesson_progress rows found; legacy aggregate rows may not include curriculum, unit, lesson, checkpoint, completion timestamp, mastery, and next-lesson detail."],
    adaptive_progress: adaptiveRows,
    recent_activity: buildRecentActivity({ assessments, skillWorlds, adaptiveRows, checkpointRows, childId: cid }),
  };
}

module.exports = { buildAdaptiveParentDashboardSummary, isFakeLearnerName, normalizeStatus };
