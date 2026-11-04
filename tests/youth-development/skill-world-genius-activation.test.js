"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..", "..");
const activationPath = path.join(root, "public/gamehub/skill-world/engine/genius-activation.js");
const indexPath = path.join(root, "public/gamehub/skill-world/index.html");

function loadActivation() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(activationPath, "utf8"), context);
  return context.window.GarveyGeniusActivation;
}

test("Grade 5 Skill World has a child-facing optional Genius activation panel", () => {
  const activation = loadActivation();
  const html = activation.render("G5M_FR_001", {});
  assert.match(html, /Today, this lesson can activate/);
  assert.match(html, /Thinking &amp; Problem Solving/);
  assert.match(html, /Curiosity &amp; Love of Learning/);
  assert.match(html, /This is a chance to practice—not a label/);
});

test("child activation choices are stored as lesson-specific optional evidence", () => {
  const activation = loadActivation();
  const state = {};
  activation.recordChoice(state, "G5E_WR_002", "DE");
  assert.equal(state.geniusEvidence.G5E_WR_002.genius_code, "DE");
  assert.equal(state.geniusEvidence.G5E_WR_002.source, "child_optional_activation_move");
});

test("Skill World loads, renders, and persists the activation choice with normal progress", () => {
  const html = fs.readFileSync(indexPath, "utf8");
  assert.match(html, /engine\/genius-activation\.js/);
  assert.match(html, /GarveyGeniusActivation\.render\(id,state\)/);
  assert.match(html, /data-genius-choice/);
  assert.match(html, /GarveyGeniusActivation\.recordChoice\(state,id,code\)/);
  assert.match(html, /savePersistedSkillWorld\(\)/);
});
