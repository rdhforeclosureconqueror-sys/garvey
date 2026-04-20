"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applySessionCompletionToSchedule,
} = require("../../youth-development/tde/parentSessionMutationIntegrity");

test("applies session completion when scope matches canonical schedule", () => {
  const result = applySessionCompletionToSchedule({
    scheduledSessions: [
      {
        session_id: "wk1-mon",
        child_id: "child-1",
        week_number: 1,
        day: "monday",
        time: "17:30",
        scheduled_at: "2026-04-20T17:30:00.000Z",
        status: "planned",
        selected_activity_ids: ["act-1"],
      },
    ],
    childId: "child-1",
    weekNumber: 1,
    sessionId: "wk1-mon",
    scheduleScope: { day: "monday", time: "17:30", scheduled_at: "2026-04-20T17:30:00.000Z" },
    completedAt: "2026-04-20T18:00:00.000Z",
  });
  assert.equal(result.ok, true);
  assert.equal(result.completed_session.status, "completed");
  assert.equal(result.completed_session.completed_at, "2026-04-20T18:00:00.000Z");
});

test("rejects completion when provided scope does not match canonical schedule", () => {
  const result = applySessionCompletionToSchedule({
    scheduledSessions: [
      {
        session_id: "wk1-mon",
        child_id: "child-1",
        week_number: 1,
        day: "monday",
        time: "17:30",
        status: "planned",
        selected_activity_ids: ["act-1"],
      },
    ],
    childId: "child-1",
    weekNumber: 1,
    sessionId: "wk1-mon",
    scheduleScope: { day: "wednesday" },
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "session_scope_mismatch");
});

test("rejects completion when session is absent from scoped week", () => {
  const result = applySessionCompletionToSchedule({
    scheduledSessions: [
      {
        session_id: "wk1-mon",
        child_id: "child-1",
        week_number: 1,
        day: "monday",
        time: "17:30",
        status: "planned",
        selected_activity_ids: ["act-1"],
      },
    ],
    childId: "child-1",
    weekNumber: 1,
    sessionId: "wk1-wed",
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "session_scope_mismatch");
});
