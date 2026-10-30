"use strict";

const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const test = require("node:test");
const { createAdaptiveV2Router } = require("../../server/adaptiveV2Routes");
const { buildWeeklyLearningRhythm } = require("../../server/learningRhythmService");

async function startServer(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

function requestPayload(overrides = {}) {
  return {
    child_id: "child-safe", tenant: "garvey", email: "parent@example.com",
    program_context: "youth_development", source_registry: "youth_development",
    skill_id: "GAMEHUB_SIGHT_MEMORY", mode: "child", status: "completed",
    progress_percent: 100, attempts: 5, correct: 4, score_percent: 80,
    profile: { content_id: "gamehub/sight-memory" }, state_snapshot: {},
    activity_observation: {
      event_key: "test-session:round:1", session_id: "test-session",
      activity_id: "gamehub/sight-memory", skill_id: "GAMEHUB_SIGHT_MEMORY",
      duration_seconds: 90, practice_tags: ["fabricated_tag"],
      genius_dimension_codes: ["MADE_UP"], evidence: { correct: 4, attempts: 5 },
    },
    ...overrides,
  };
}

function riskApp({ query, children = [{ child_id: "child-safe", child_name: "Safe", parent_profile_id: 1 }] } = {}) {
  const app = express();
  app.use(express.json());
  app.use(createAdaptiveV2Router({ pool: { query }, listYouthChildProfiles: async () => children }));
  return app;
}

test("forged browser tags and dimension labels are replaced by the server curriculum map", async (t) => {
  const queries = [];
  const { server, url } = await startServer(riskApp({ query: async (sql, params) => {
    queries.push({ sql, params }); return { rows: [{ event_key: "test-session:round:1" }], rowCount: 1 };
  } }));
  t.after(() => server.close());
  const response = await fetch(`${url}/api/skill-world/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestPayload()) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).activity_event_saved, true);
  assert.deepEqual(JSON.parse(queries[1].params[8]), ["visual_recall", "ordered_recall", "working_hold", "selective_attention", "rule_switching"]);
  assert.deepEqual(JSON.parse(queries[1].params[9]), ["SR", "RS", "PS"]);
});

test("unknown or mismatched activity telemetry cannot create a learning-rhythm event", async (t) => {
  const queries = [];
  const { server, url } = await startServer(riskApp({ query: async (sql, params) => {
    queries.push({ sql, params }); return { rows: [], rowCount: 1 };
  } }));
  t.after(() => server.close());
  const unknown = requestPayload({ activity_observation: { event_key: "x", activity_id: "not-a-garvey-activity" } });
  const unknownResponse = await fetch(`${url}/api/skill-world/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(unknown) });
  const unknownBody = await unknownResponse.json();
  assert.equal(unknownBody.activity_event_saved, false);
  assert.equal(unknownBody.activity_event_rejected, "activity_not_registered");
  assert.equal(queries.length, 1, "core progress write may save, but no activity event is created");

  const mismatch = requestPayload({ skill_id: "G4M_FR_001" });
  const mismatchResponse = await fetch(`${url}/api/skill-world/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(mismatch) });
  const mismatchBody = await mismatchResponse.json();
  assert.equal(mismatchBody.activity_event_saved, false);
  assert.equal(mismatchBody.activity_event_rejected, "activity_skill_mismatch");
});

test("a duplicate event key does not inflate learning moments", async (t) => {
  let activityInsertCount = 0;
  const { server, url } = await startServer(riskApp({ query: async (sql) => {
    if (/garvey_learning_activity_events/.test(sql)) {
      activityInsertCount += 1;
      return activityInsertCount === 1 ? { rows: [{ event_key: "test-session:round:1" }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    return { rows: [], rowCount: 1 };
  } }));
  t.after(() => server.close());
  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(`${url}/api/skill-world/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestPayload()) });
    const body = await response.json();
    assert.equal(body.activity_event_saved, index === 0);
  }
});

test("another parent cannot write activity or check-in data for this child", async (t) => {
  const queries = [];
  const { server, url } = await startServer(riskApp({ query: async (sql, params) => { queries.push({ sql, params }); return { rows: [], rowCount: 1 }; }, children: [] }));
  t.after(() => server.close());
  const progress = await fetch(`${url}/api/skill-world/progress`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(requestPayload()) });
  assert.equal(progress.status, 404);
  assert.equal((await progress.json()).error, "youth_development_child_profile_not_found");
  const checkin = await fetch(`${url}/api/skill-world/parent-checkin`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ child_id: "child-safe", tenant: "garvey", email: "other@example.com", program_context: "youth_development", event_key: "parent-checkin:other" }) });
  assert.equal(checkin.status, 404);
  assert.equal(queries.length, 0);
});

test("malformed durations cannot inflate time and seven-day review cannot say results early", () => {
  const collecting = buildWeeklyLearningRhythm([
    { event_type: "learning_activity", skill_id: "GAMEHUB_SIGHT_MEMORY", duration_seconds: 999999, occurred_at: "2026-10-01T12:00:00Z" },
    { event_type: "learning_activity", skill_id: "GAMEHUB_SIGHT_MEMORY", duration_seconds: -50, occurred_at: "2026-10-02T12:00:00Z" },
  ], "2026-10-07T11:59:59Z");
  assert.equal(collecting.consistency.active_minutes, 30, "duration is capped at 30 minutes per event");
  assert.equal(collecting.review_status, "collecting");
  assert.equal(collecting.parent_explanation_available, false);
  assert.deepEqual(collecting.skill_activity, {});
  assert.match(collecting.parent_message, /collecting learning activity/i);
});
