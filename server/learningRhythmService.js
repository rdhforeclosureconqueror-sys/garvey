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

function weeklyParentReview(consistency) {
  const days = consistency.active_days;
  const checkins = consistency.parent_checkins;
  if (days >= 3) {
    return {
      consistency_label: "three_day_rhythm_or_more",
      observation: `A ${days}-day learning rhythm was recorded in this seven-day window. Garvey saw participation on separate days, not a measure of ability or a prediction about school results.`,
      next_action: checkins > 0
        ? "Repeat this same rhythm next week. Keep using the parent check-in to note what helped your child engage."
        : "Repeat this same rhythm next week and add one short parent check-in about what helped your child engage.",
    };
  }
  if (days === 2) return {
    consistency_label: "two_day_rhythm",
    observation: "Two learning days were recorded in this seven-day window. Garvey has a beginning participation pattern, not enough information to make a learning conclusion.",
    next_action: "Choose one more short practice day next week, then keep the schedule steady before comparing patterns.",
  };
  if (days === 1) return {
    consistency_label: "one_day_rhythm",
    observation: "One learning day was recorded in this seven-day window. This is a starting point, not a learning conclusion.",
    next_action: "Choose two additional short practice days next week so Garvey can observe a repeatable participation rhythm.",
  };
  return {
    consistency_label: "no_activity_in_window",
    observation: "No learning activity was recorded in this seven-day window.",
    next_action: "Restart with one short activity, then choose two additional days that are realistic for your family.",
  };
}

function buildWeeklyLearningRhythm(events = [], now = new Date()) {
  const current = asDate(now) || new Date();
  const normalized = (Array.isArray(events) ? events : [])
    .map((event) => ({ ...event, occurred_at: event?.occurred_at || event?.created_at }))
    .filter((event) => asDate(event.occurred_at))
    .sort((a, b) => asDate(a.occurred_at) - asDate(b.occurred_at));
  const learningEvents = normalized.filter((event) => event.event_type === "learning_activity");
  const firstActivity = learningEvents[0] ? asDate(learningEvents[0].occurred_at) : null;
  const reviewAvailableAt = firstActivity ? new Date(firstActivity.getTime() + REVIEW_WINDOW_DAYS * 86400000) : null;
  const reviewReady = Boolean(reviewAvailableAt && current >= reviewAvailableAt);
  // Before the first review, collect from the first activity forward. Once it is
  // ready, the dashboard reports a rolling seven-day participation window.
  const windowStart = firstActivity
    ? (reviewReady ? new Date(current.getTime() - REVIEW_WINDOW_DAYS * 86400000) : firstActivity)
    : null;
  const windowEvents = windowStart
    ? normalized.filter((event) => {
      const occurredAt = asDate(event.occurred_at);
      return occurredAt && occurredAt >= windowStart && occurredAt <= current;
    })
    : [];
  const windowLearningEvents = windowEvents.filter((event) => event.event_type === "learning_activity");
  const parentCheckins = windowEvents.filter((event) => event.event_type === "parent_checkin");
  const activeDays = new Set(windowLearningEvents.map((event) => dayKey(event.occurred_at)).filter(Boolean));
  const activityMinutes = Math.round(windowLearningEvents.reduce((total, event) => total + clampInteger(event.duration_seconds, 0, 1800), 0) / 60);
  const activitiesBySkill = {};
  for (const event of windowLearningEvents) {
    const skillId = String(event.skill_id || event.activity_id || "Learning activity");
    activitiesBySkill[skillId] = (activitiesBySkill[skillId] || 0) + 1;
  }
  const consistency = {
    active_days: activeDays.size,
    learning_moments: windowLearningEvents.length,
    active_minutes: activityMinutes,
    parent_checkins: parentCheckins.length,
  };
  return {
    contract_version: "garvey_learning_rhythm_v1",
    review_status: !firstActivity ? "not_started" : reviewReady ? "ready" : "collecting",
    review_window_days: REVIEW_WINDOW_DAYS,
    window_start_at: windowStart ? windowStart.toISOString() : null,
    window_end_at: firstActivity ? current.toISOString() : null,
    first_activity_at: firstActivity ? firstActivity.toISOString() : null,
    review_available_at: reviewAvailableAt ? reviewAvailableAt.toISOString() : null,
    consistency,
    skill_activity: reviewReady ? activitiesBySkill : {},
    parent_explanation_available: reviewReady,
    parent_review: reviewReady ? weeklyParentReview(consistency) : null,
    parent_message: !firstActivity
      ? "Start one learning activity to begin your child’s first seven-day rhythm."
      : reviewReady
        ? "Your first weekly review is ready. Garvey will describe what was practiced and what the system observed."
        : "Your first weekly review unlocks after seven calendar days. Keep building consistency; Garvey is collecting learning activity and parent check-ins first.",
  };
}

module.exports = { REVIEW_WINDOW_DAYS, buildWeeklyLearningRhythm };
