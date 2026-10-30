"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildWeeklyLearningRhythm } = require("../../server/learningRhythmService");

test("weekly rhythm collects consistency before unlocking explanations", () => {
  const rhythm = buildWeeklyLearningRhythm([
    { event_type: "learning_activity", skill_id: "GAMEHUB_SIGHT_MEMORY", duration_seconds: 95, occurred_at: "2026-10-01T15:00:00Z" },
    { event_type: "learning_activity", skill_id: "G4M_FR_001", duration_seconds: 305, occurred_at: "2026-10-03T15:00:00Z" },
    { event_type: "parent_checkin", occurred_at: "2026-10-03T16:00:00Z" },
  ], "2026-10-06T15:00:00Z");
  assert.equal(rhythm.review_status, "collecting");
  assert.equal(rhythm.consistency.active_days, 2);
  assert.equal(rhythm.consistency.learning_moments, 2);
  assert.equal(rhythm.consistency.parent_checkins, 1);
  assert.equal(rhythm.parent_explanation_available, false);
  assert.deepEqual(rhythm.skill_activity, {});
});

test("weekly rhythm unlocks a skill activity review after seven days", () => {
  const rhythm = buildWeeklyLearningRhythm([
    { event_type: "learning_activity", skill_id: "GAMEHUB_SIGHT_MEMORY", duration_seconds: 120, occurred_at: "2026-10-01T15:00:00Z" },
    { event_type: "learning_activity", skill_id: "GAMEHUB_SIGHT_MEMORY", duration_seconds: 180, occurred_at: "2026-10-08T15:00:00Z" },
  ], "2026-10-08T15:00:00Z");
  assert.equal(rhythm.review_status, "ready");
  assert.equal(rhythm.parent_explanation_available, true);
  assert.equal(rhythm.skill_activity.GAMEHUB_SIGHT_MEMORY, 2);
  assert.equal(rhythm.consistency.active_minutes, 5);
});
