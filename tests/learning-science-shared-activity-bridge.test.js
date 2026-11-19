"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const bridge = require("../public/garvey-learning/garvey-activity-bridge");

test("one shared bridge supports the six Garvey activities in the parent center", () => {
  assert.deepEqual(Object.keys(bridge.ACTIVITY_AREA).sort(), [
    "mission-planner", "rainbow-grammar", "rainbow-syllables", "rainbow-writing", "word-detective", "word-power",
  ]);
  for (const activityId of Object.keys(bridge.ACTIVITY_AREA)) {
    const activity = bridge.createBridge({ activityId });
    const event = activity.start("intro");
    assert.equal(event.activity_id, activityId);
    assert.equal(event.event_type, "task_started");
    assert.equal(event.genius_exploration.evidence_level, "opportunity_only");
  }
});

test("academic skill, executive practice, Genius opportunity and supports remain distinct", () => {
  const activity = bridge.createBridge({ activityId: "rainbow-syllables", clock: () => "2026-11-17T18:00:00Z" });
  const event = activity.record("answer_submitted", {
    taskId: "word_build_2", ruleId: "closed", skillId: "syllable_closed",
    attemptNumber: 2, outcome: "incorrect", supportUsed: ["read_aloud", "hint", "hint"],
    practiceTags: ["sequencing", "rule_switching"], geniusDimensionCodes: ["SR", "RS", "FB"],
    // Any additional/raw child data is intentionally not copied.
    rawAnswer: "private", learnerId: "invalid-direct-client-identity", childName: "private-name",
    score: 0.01,
  });
  assert.deepEqual(event.academic, { skill_area: "phonics", skill_id: "syllable_closed", outcome: "incorrect" });
  assert.deepEqual(event.executive_practice.practice_tags, ["sequencing", "rule_switching"]);
  assert.deepEqual(event.executive_practice.support_used, ["read_aloud", "hint"]);
  assert.deepEqual(event.genius_exploration.opportunity_codes, ["SR", "RS", "FB"]);
  assert.equal(event.genius_exploration.evidence_level, "opportunity_only");
  assert.equal(event.occurred_at, "2026-11-17T18:00:00Z");
  assert.doesNotMatch(JSON.stringify(event), /private|score|learnerId|childName|rawAnswer/);
});

test("offline/no transport works with retry, reflection and completion, capped and in-memory only", () => {
  const session = bridge.createBridge({ activityId: "rainbow-writing", maxEvents: 4 });
  assert.ok(session.record("retry", { taskId: "edit_1", attemptNumber: 2 }));
  assert.ok(session.reflect("used_feedback", "edit_1"));
  assert.ok(session.complete({ taskId: "publish" }));
  assert.equal(session.record("hint_used", { taskId: "after" }), null);
  const snap = session.snapshot();
  assert.equal(snap.completed, true);
  assert.equal(snap.recorded_event_count, 3);
  assert.equal(snap.events[1].reflection_choice, "used_feedback");
  assert.throws(() => { snap.events.push("another"); }, TypeError);
});

test("reserves the last capacity slot for completion and creates idempotent event keys", () => {
  const activity = bridge.createBridge({ activityId: "mission-planner", maxEvents: 3 });
  const first = activity.start("route_a");
  const second = activity.record("rule_changed", { taskId: "route_a", ruleId: "reverse" });
  assert.equal(activity.record("retry", { taskId: "route_a" }), null);
  const done = activity.complete({ taskId: "route_a" });
  assert.ok(done);
  assert.equal(activity.snapshot().completed, true);
  assert.equal(activity.snapshot().recorded_event_count, 3);
  assert.equal(first.event_key, first.session_id + ":1");
  assert.equal(second.event_key, first.session_id + ":2");
  assert.equal(done.event_key, first.session_id + ":3");
  assert.equal(new Set(activity.snapshot().events.map(e => e.event_key)).size, 3);
});

test("completion is still recorded when the event cap is one", () => {
  const activity = bridge.createBridge({ activityId: "rainbow-grammar", maxEvents: 1 });
  assert.equal(activity.start("intro"), null);
  assert.ok(activity.complete());
  assert.equal(activity.snapshot().recorded_event_count, 1);
  assert.equal(activity.snapshot().completed, true);
});

test("an optional host-provided sink receives only explicit event records", () => {
  const events = [];
  const activity = bridge.createBridge({ activityId: "rainbow-grammar", transport: event => events.push(event) });
  activity.start("sky_catch");
  activity.record("rule_changed", { taskId: "sky_catch", ruleId: "noun" });
  activity.complete({ taskId: "sky_catch" });
  assert.equal(events.length, 3);
  assert.equal(events[2].event_type, "activity_completed");
});

test("transport failure never prevents a child from completing the game", () => {
  const a = bridge.createBridge({ activityId: "mission-planner", transport() { throw new Error("offline"); } });
  assert.ok(a.start("mission_1"));
  assert.ok(a.complete());
  assert.equal(a.snapshot().completed, true);
});

test("reject unapproved event types, arbitrary labels, unsupported IDs and invalid reflections", () => {
  assert.throws(() => bridge.createBridge({ activityId: "another-game" }), /unknown/);
  const activity = bridge.createBridge({ activityId: "rainbow-grammar" });
  assert.throws(() => activity.record("low_genius", {}), /event type/);
  assert.throws(() => activity.record("answer_submitted", { taskId: "../steal" }), /taskId/);
  assert.throws(() => activity.record("answer_submitted", { supportUsed: ["diagnosis"] }), /supportUsed/);
  assert.throws(() => activity.record("answer_submitted", { geniusDimensionCodes: ["IQ"] }), /geniusDimensionCodes/);
  assert.throws(() => activity.reflect("low_intelligence"), /reflection/);
  assert.equal(activity.snapshot().recorded_event_count, 0);
});
