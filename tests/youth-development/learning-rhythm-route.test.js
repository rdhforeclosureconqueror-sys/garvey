"use strict";

const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const test = require("node:test");
const { createAdaptiveV2Router } = require("../../server/adaptiveV2Routes");

async function startServer(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test("Sight Memory saves one child-owned progress record and one immutable learning event", async (t) => {
  const queries = [];
  const pool = { query: async (sql, params) => { queries.push({ sql, params }); return { rows: [], rowCount: 1 }; } };
  const app = express();
  app.use(express.json());
  app.use(createAdaptiveV2Router({ pool, listYouthChildProfiles: async () => [{ child_id: "child-1", child_name: "SJ", parent_profile_id: 7 }] }));
  const { server, url } = await startServer(app);
  t.after(() => server.close());
  const response = await fetch(`${url}/api/skill-world/progress`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({
      child_id: "child-1", tenant: "garvey", email: "parent@example.com", program_context: "youth_development", source_registry: "youth_development",
      skill_id: "GAMEHUB_SIGHT_MEMORY", mode: "child", status: "completed", progress_percent: 100, attempts: 5, correct: 4, score_percent: 80,
      profile: { content_id: "gamehub/sight-memory" }, state_snapshot: {},
      activity_observation: { event_key: "session-1:round:1", session_id: "session-1", activity_id: "gamehub/sight-memory", skill_id: "GAMEHUB_SIGHT_MEMORY", duration_seconds: 90, practice_tags: ["visual_recall"], genius_dimension_codes: ["SR", "RS", "PS"], evidence: { correct: 4, attempts: 5 } }
    })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).activity_event_saved, true);
  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /INSERT INTO skill_world_progress/);
  assert.match(queries[1].sql, /INSERT INTO garvey_learning_activity_events/);
  assert.equal(queries[1].params[3], "session-1:round:1");
  assert.equal(queries[1].params[7], 90);
});

test("parent check-in is separately saved to the same child rhythm", async (t) => {
  const queries = [];
  const pool = { query: async (sql, params) => { queries.push({ sql, params }); return { rows: [], rowCount: 1 }; } };
  const app = express();
  app.use(express.json());
  app.use(createAdaptiveV2Router({ pool, listYouthChildProfiles: async () => [{ child_id: "child-1", child_name: "SJ", parent_profile_id: 7 }] }));
  const { server, url } = await startServer(app);
  t.after(() => server.close());
  const response = await fetch(`${url}/api/skill-world/parent-checkin`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ child_id: "child-1", tenant: "garvey", email: "parent@example.com", program_context: "youth_development", source_registry: "youth_development", event_key: "parent-checkin:child-1:2026-10-01", note: "Stayed focused with the emoji order." })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).parent_checkin_saved, true);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /'parent_checkin'/);
});
