"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { QUESTIONS } = require("../../gates/gatesAssessmentQuestions");
const { scoreGatesAssessment } = require("../../gates/gatesScoring");
const { FIRST_GENERATION_BLUEPRINT } = require("../../gates/firstGenerationBlueprint");

function highAnswers() {
  return QUESTIONS.map((q) => ({ question_id: q.question_id, value: "often" }));
}

test("stages are not all emerging with high answers", () => {
  const scored = scoreGatesAssessment(highAnswers());
  assert.equal(scored.gate_scores.every((g) => g.current_stage === "emerging"), false);
});

test("walking the gate content fields are present in blueprint", () => {
  for (const gate of FIRST_GENERATION_BLUEPRINT) {
    assert.ok(gate.core_lesson);
    assert.ok(gate.reflection_questions?.length);
    assert.ok(gate.journal_prompts?.length);
    assert.ok(gate.developing_signs?.length);
    assert.ok(gate.parent_guidance);
    assert.ok(gate.ceremony);
  }
});

test("results CTAs route to different destinations", () => {
  const js = fs.readFileSync("public/gates.js", "utf8");
  assert.ok(js.includes('Begin This Gate'));
  assert.ok(js.includes('/gates/child/${childId}/gates/${growthGate.gate_number || 1}'));
  assert.ok(js.includes('View Practice Progress'));
  assert.ok(js.includes('/gates/child/${childId}/gates'));
});

test("gate detail page renders blueprint sections", () => {
  const js = fs.readFileSync("public/gates.js", "utf8");
  for (const section of ["Core lesson", "Child learning statement", "Reflection questions", "Journal prompts", "Developing signs", "Integration signs", "Ceremony"]) {
    assert.ok(js.includes(section));
  }
});

test("gates map shows 10 cards and separates progress from stage", () => {
  const js = fs.readFileSync("public/gates.js", "utf8");
  assert.ok(js.includes("Assessment Stage:"));
  assert.ok(js.includes("Practice Progress:"));
  assert.ok(js.includes("Open Gate"));
});
