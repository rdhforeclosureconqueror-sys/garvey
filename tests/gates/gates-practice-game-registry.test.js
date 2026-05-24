"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  GATES_PRACTICE_GAME_DISCLAIMER,
  GATES_PRACTICE_GAME_REGISTRY,
  getPracticeGamesByGate
} = require("../../gates/gatesPracticeGameRegistry");

test("registry includes all expected optional practice games", () => {
  assert.equal(GATES_PRACTICE_GAME_REGISTRY.length, 9);
  const titles = new Set(GATES_PRACTICE_GAME_REGISTRY.map((entry) => entry.title));
  for (const name of [
    "Rhythm Race",
    "Visual Memory",
    "Picture Puzzle",
    "Brick Burst",
    "Freeze Runner",
    "Distraction Defender",
    "Plasma Hold",
    "Calm Reactor",
    "Switch Matrix"
  ]) {
    assert.equal(titles.has(name), true);
  }
});

test("every registry entry includes required developmental mapping fields", () => {
  for (const entry of GATES_PRACTICE_GAME_REGISTRY) {
    assert.ok(Array.isArray(entry.supported_gates) && entry.supported_gates.length > 0);
    assert.ok(Array.isArray(entry.developmental_capacities) && entry.developmental_capacities.length > 0);
    assert.ok(entry.suggested_age_range);
    assert.ok(entry.recommended_duration);
    assert.ok(Array.isArray(entry.safety_notes) && entry.safety_notes.length > 0);
    assert.ok(Array.isArray(entry.observation_signals) && entry.observation_signals.length > 0);
    assert.ok(Array.isArray(entry.parent_reflection_prompts) && entry.parent_reflection_prompts.length > 0);
  }
});

test("gate filtering returns only supported gate practice games", () => {
  const emotionGames = getPracticeGamesByGate("emotion");
  assert.equal(emotionGames.length > 0, true);
  assert.equal(emotionGames.every((game) => game.supported_gates.includes("emotion")), true);
});

test("registry disclaimer is non-diagnostic and UI section is present in gate detail", () => {
  assert.equal(
    GATES_PRACTICE_GAME_DISCLAIMER,
    "These games are optional developmental practices. They are not tests, grades, or diagnoses."
  );

  const ui = fs.readFileSync("public/gates.js", "utf8");
  for (const marker of [
    "Practice Games for this Gate",
    "What this game practices",
    "Primary Gate fit:",
    "Secondary Gate fit:",
    "Confidence:",
    "Suggested starting style:",
    "Suggested path:",
    "Children may engage with these games in different ways. Practice experiences do not equal grades or diagnoses.",
    "These games are optional developmental practices. They are not tests, grades, or diagnoses."
  ]) {
    assert.ok(ui.includes(marker));
  }
});
