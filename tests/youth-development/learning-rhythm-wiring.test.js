"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("learning rhythm has append-only storage and child-scoped endpoints", () => {
  assert.match(read("server/db.js"), /CREATE TABLE IF NOT EXISTS garvey_learning_activity_events/);
  const routes = read("server/adaptiveV2Routes.js");
  assert.match(routes, /router\.post\("\/api\/skill-world\/parent-checkin"/);
  assert.match(routes, /activity_event_saved/);
  assert.match(routes, /ON CONFLICT \(child_id,event_key\) DO NOTHING/);
});

test("Sight Memory sends a session-bound, mapped observation", () => {
  const game = read("public/gamehub/sight-memory.html");
  assert.match(game, /SIGHT_MEMORY_SESSION_ID/);
  assert.match(game, /practice_tags: \["visual_recall"/);
  assert.match(game, /genius_dimension_codes: \["SR", "RS", "PS"\]/);
  assert.match(game, /activity_observation: observation/);
});

test("parent dashboard gates explanations behind the seven-day rhythm", () => {
  const rhythmService = read("server/learningRhythmService.js");
  const dashboard = read("server/youthDevelopmentRoutes.js");
  assert.match(dashboard, /Seven-Day Learning Rhythm/);
  assert.match(rhythmService, /parent_explanation_available/);
  assert.match(dashboard, /data\.review_status === 'ready'/);
  assert.match(dashboard, /saveGarveyParentCheckin/);
});
