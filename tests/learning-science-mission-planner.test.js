"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const game = require("../public/genius-practice/mission-planner-engine");
const { getCurriculumGeniusMapping, GENIUS_DIMENSIONS } =
  require("../youth-development/content/curriculumGeniusMap");

const htmlPath = path.join(__dirname, "../public/genius-practice/mission-planner.html");
const dashboardPath = path.join(__dirname, "../server/youthDevelopmentRoutes.js");

function play(state, route) {
  let current = state;
  for (const id of route) current = game.choose(current, id);
  return game.check(current);
}

test("three practice missions each offer a different planning rule", () => {
  assert.equal(game.MISSIONS.length, 3);
  assert.deepEqual(game.MISSIONS.map(m => m.order.join("")), ["abc", "cba", "bac"]);
  assert.equal(new Set(game.MISSIONS.map(m => m.id)).size, 3);
  for (const mission of game.MISSIONS) {
    assert.equal(new Set(mission.order).size, game.ITEMS.length);
    assert.ok(mission.order.every(id => game.ITEMS.some(item => item.id === id)));
  }
});

test("child can complete all three missions without a timer or assessment label", () => {
  let state = game.createState();
  for (const mission of game.MISSIONS) {
    const result = play(state, mission.order);
    assert.equal(result.outcome, "complete");
    state = result.state;
  }
  assert.equal(game.currentMission(state), null);
  const summary = game.snapshot(state);
  assert.equal(summary.done, true);
  assert.equal(summary.missions_completed, 3);
  assert.equal(summary.attempts, 3);
  assert.deepEqual(summary.genius_dimension_codes, ["SR", "RS", "PS", "FB"]);
  assert.equal(JSON.stringify(summary).includes("learner_id"), false);
});

test("rule changes require adaptation; incorrect route invites another attempt", () => {
  let state = play(game.createState(), ["a", "b", "c"]).state;
  assert.equal(game.currentMission(state).id, "reverse-route");
  let wrong = play(state, ["a", "b", "c"]);
  assert.equal(wrong.outcome, "retry");
  assert.equal(wrong.state.missionIndex, 1);
  assert.deepEqual(wrong.state.selected, []);
  assert.equal(wrong.state.attempts, 2);
  assert.equal(wrong.state.revisions, 1);
  const revised = play(wrong.state, ["c", "b", "a"]);
  assert.equal(revised.outcome, "complete");
  assert.equal(revised.state.missionIndex, 2);
  assert.equal(revised.state.completedMissions[1].attemptsOnMission, 2);
});

test("duplicate, invalid and incomplete choices are ignored; undo lets a child correct plan", () => {
  const start = game.createState();
  const first = game.choose(start, "b");
  assert.strictEqual(game.choose(first, "b"), first);
  assert.strictEqual(game.choose(first, "invalid"), first);
  assert.equal(game.check(first).outcome, "incomplete");
  assert.deepEqual(start.selected, []);
  const undone = game.undo(first);
  assert.deepEqual(undone.selected, []);
  assert.equal(undone.revisions, 1);
  assert.equal(undone.attempts, 0);
});

test("reflection follows completion and does not create diagnostic scores", () => {
  let state = game.createState();
  assert.strictEqual(game.reflect(state, "planned_first"), state);
  for (const mission of game.MISSIONS) state = play(state, mission.order).state;
  state = game.reflect(state, "planned_first");
  assert.equal(game.snapshot(state).reflection, "planned_first");
  assert.strictEqual(game.reflect(state, "untrusted response"), state);
  assert.doesNotMatch(JSON.stringify(game.snapshot(state)), /IQ|intelligence_score|diagnosis|trait_score/i);
});

test("game is accessible from parent dashboard and bound to existing genius dimension map", () => {
  const mapping = getCurriculumGeniusMapping("genius-practice/mission-planner");
  assert.equal(mapping.route, "/genius-practice/mission-planner.html");
  for (const code of mapping.activity.genius_dimension_codes) assert.ok(GENIUS_DIMENSIONS[code]);
  for (const tag of mapping.activity.practice_tags) assert.ok(tag);
  const html = fs.readFileSync(htmlPath, "utf8");
  const parentDashboard = fs.readFileSync(dashboardPath, "utf8");
  assert.match(parentDashboard, /href="\/genius-practice\/mission-planner\.html"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<script src="\/genius-practice\/mission-planner-engine\.js"><\/script>/);
  assert.match(html, /Play again/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|fetch\(/);
});
