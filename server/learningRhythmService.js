"use strict";

const REVIEW_WINDOW_DAYS = 7;

function asDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampInteger(value, min, max) {
  const number = Math.round(Number(value) || 0);
  return Math.max(min, Math.min(max, number));
}

function dayKey(value) {
  const date = asDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function buildWeeklyLearningRhythm(events = [], now = new Date()) {
  const current = asDate(now) || new Date();
  const normalized = (Array.isArray(events) ? events : [])
    .map((event) => ({ ...event, occurred_at: event?.occurred_at || event?.created_at }))
    .filter((event) => asDate(event.occurred_at))
    .sort((a, b) => asDate(a.occurred_at) - asDate(b.occurred_at));
  const learningEvents = normalized.filter((event) => event.event_type === "learning_activity");
  const parentCheckins = normalized.filter((event) => event.event_type === "parent_checkin");
  const firstActivity = learningEvents[0] ? asDate(learningEvents[0].occurred_at) : null;
  const reviewAvailableAt = firstActivity ? new Date(firstActivity.getTime() + REVIEW_WINDOW_DAYS * 86400000) : null;
  const reviewReady = Boolean(reviewAvailableAt && current >= reviewAvailableAt);
  const activeDays = new Set(learningEvents.map((event) => dayKey(event.occurred_at)).filter(Boolean));
  const activityMinutes = Math.round(learningEvents.reduce((total, event) => total + clampInteger(event.duration_seconds, 0, 1800), 0) / 60);
  const activitiesBySkill = {};
  for (const event of learningEvents) {
    const skillId = String(event.skill_id || event.activity_id || "Learning activity");
    activitiesBySkill[skillId] = (activitiesBySkill[skillId] || 0) + 1;
  }
  const consistency = {
    active_days: activeDays.size,
    learning_moments: learningEvents.length,
    active_minutes: activityMinutes,
    parent_checkins: parentCheckins.length,
  };
  return {
    contract_version: "garvey_learning_rhythm_v1",
    review_status: !firstActivity ? "not_started" : reviewReady ? "ready" : "collecting",
    review_window_days: REVIEW_WINDOW_DAYS,
    first_activity_at: firstActivity ? firstActivity.toISOString() : null,
    review_available_at: reviewAvailableAt ? reviewAvailableAt.toISOString() : null,
    consistency,
    skill_activity: reviewReady ? activitiesBySkill : {},
    parent_explanation_available: reviewReady,
    parent_message: !firstActivity
      ? "Start one learning activity to begin your child’s first seven-day rhythm."
      : reviewReady
        ? "Your first weekly review is ready. Garvey will describe what was practiced and what the system observed."
        : "Your first weekly review unlocks after seven calendar days. Keep building consistency; Garvey is collecting learning activity and parent check-ins first.",
  };
}

module.exports = { REVIEW_WINDOW_DAYS, buildWeeklyLearningRhythm };
