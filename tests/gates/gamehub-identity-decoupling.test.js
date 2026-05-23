"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const adaptive = fs.readFileSync("public/gamehub/adaptive_learning", "utf8");
const spelling = fs.readFileSync("public/gamehub/spelling", "utf8");

test("integrated GameHub files do not keep hardcoded child-name defaults", () => {
  assert.equal(/Marley Adaptive Learning System/.test(adaptive), false);
  assert.equal(/value="Marley"/.test(adaptive), false);
  assert.equal(/studentName:\s*opts\.studentName\s*\|\|\s*"Marley"/.test(adaptive), false);
  assert.equal(/studentName:\s*"Marley"/.test(adaptive), false);
});

test("adaptive learning no longer uses marley-specific history key", () => {
  assert.equal(adaptive.includes("marley_learning_history"), false);
  assert.equal(adaptive.includes("gamehub_adaptive_learning_history"), true);
});

test("runtime context contract exists and supports standalone fallback", () => {
  for (const file of [adaptive, spelling]) {
    assert.equal(file.includes("child_display_name"), true);
    assert.equal(file.includes("child_age_band"), true);
    assert.equal(file.includes("profile_id"), true);
    assert.equal(file.includes("session_id"), true);
    assert.equal(file.includes("gate_context"), true);
    assert.equal(file.includes("window.__GATES_GAME_CONTEXT__") || file.includes("window.__GAME_RUNTIME_CONTEXT__"), true);
  }

  assert.equal(adaptive.includes("Demo Learner"), true);
  assert.equal(spelling.includes('child_display_name:"Player"'), true);
});

test("spelling content uses neutral learner wording", () => {
  assert.equal(spelling.includes("She says what it means out loud"), false);
  assert.equal(spelling.includes("The learner says what it means out loud"), true);
  assert.equal(spelling.includes("and the learner taps the right word"), true);
});
