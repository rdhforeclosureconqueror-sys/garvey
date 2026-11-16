"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "..");
const activationPath = path.join(root, "public/gamehub/skill-world/engine/genius-activation.js");
const indexPath = path.join(root, "public/gamehub/skill-world/index.html");
const routePath = path.join(root, "server/adaptiveV2Routes.js");

function loadActivation() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(activationPath, "utf8"), context);
  return context.window.GarveyGeniusActivation;
}

test("a child Genius selection carries an idempotent event key and evidence source", () => {
  const activation = loadActivation();
  const state = {};
  activation.recordChoice(state, "G5M_FR_001", "CQ");
  const choice = state.geniusEvidence.G5M_FR_001;
  assert.equal(choice.genius_code, "CQ");
  assert.equal(choice.source, "child_optional_activation_move");
  assert.match(choice.event_key, /^g5-genius-activation:G5M_FR_001:CQ:/);
});

test("Skill World forwards the selected Genius move as an activity observation", () => {
  const html = fs.readFileSync(indexPath, "utf8");
  assert.match(html, /activity_observation:activityObservation/);
  assert.match(html, /genius_activation_choice:activation\.genius_code/);
  assert.match(html, /event_key:activation\.event_key/);
});

test("server verifies Grade 5 lesson identity before saving activation evidence", () => {
  const route = fs.readFileSync(routePath, "utf8");
  assert.match(route, /getGrade5LearningLanePlan/);
  assert.match(route, /activity_not_registered/);
  assert.match(route, /activity_skill_mismatch/);
  assert.match(route, /optional_genius_activation/);
});
