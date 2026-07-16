"use strict";

const { buildLearningJourney, isFakeLearnerName, normalizeStatus } = require("./learningJourneyService");

async function buildAdaptiveParentDashboardSummary(pool, opts = {}) {
  const journey = await buildLearningJourney(pool, opts);
  if (!journey.ok) return journey;
  return {
    ok: true,
    child_id: journey.child_id,
    child_name: journey.child_name,
    learner_is_test_or_guest_name: journey.learner_is_test_or_guest_name,
    empty_state: journey.empty_state,
    status: journey.current.completion_status,
    overall_status_label: journey.empty_state ? "No adaptive learning progress yet" : journey.current.skill_world ? "Adaptive learning in progress" : "Adaptive learning activity saved",
    assessments_completed: journey.history.assessment_history.filter((r) => normalizeStatus(r.status) === "completed").length,
    latest_assessment_score: journey.history.scores.latest_score,
    latest_assessment_completed_at: journey.history.completion_timestamps.last_activity_at,
    lessons_completed: journey.history.completed_lessons.length,
    lessons_total: Math.max(12, journey.history.completed_lessons.length),
    checkpoints_completed: journey.history.completed_checkpoints.length,
    skill_worlds_completed: journey.history.completed_skill_worlds.length,
    skill_worlds_total: Math.max(6, journey.history.completed_skill_worlds.length),
    current_skill_world: journey.current.skill_world,
    current_lesson_or_step: journey.current.skill_world || journey.current.lesson,
    progress_percent: journey.current.mastery_score || 0,
    score_percent: journey.history.scores.latest_score,
    attempts: journey.history.attempts.checkpoint_attempts,
    last_activity_at: journey.history.completion_timestamps.last_activity_at,
    next_recommended_learning_activity: journey.learning_legacy_next_recommended_skill_id || journey.current.recommendation.activity_id || journey.current.recommendation.title,
    next_recommendation: journey.current.recommendation,
    learning_journey: journey,
    assessments: journey.history.assessment_history,
    skill_worlds: journey.history.skill_worlds,
    adaptive_progress: journey.history.completed_lessons,
    recent_activity: journey.recent_activity,
  };
}
module.exports = { buildAdaptiveParentDashboardSummary, isFakeLearnerName, normalizeStatus };
