const test = require("node:test");
const assert = require("node:assert/strict");

const { scoreGatesAssessment } = require("../../gates/gatesScoring");
const { QUESTIONS } = require("../../gates/gatesAssessmentQuestions");
const { buildGatesProfile } = require("../../gates/gatesProfileBuilder");

function fullAnswers() {
  return QUESTIONS.map((q) => ({ question_id: q.question_id, value: "often" }));
}

test("profile summary generated", () => {
  const profile = buildGatesProfile(scoreGatesAssessment(fullAnswers()));
  assert.ok(profile.summary.length > 0);
});

test("primary Gates generated", () => {
  const profile = buildGatesProfile(scoreGatesAssessment(fullAnswers()));
  assert.equal(profile.primary_gates.length, 3);
});

test("current growth Gate generated", () => {
  const profile = buildGatesProfile(scoreGatesAssessment(fullAnswers()));
  assert.ok(profile.current_growth_gate && profile.current_growth_gate.gate_key);
});

test("10 Gates map generated", () => {
  const profile = buildGatesProfile(scoreGatesAssessment(fullAnswers()));
  assert.equal(profile.gate_map.length, 10);
});

test("disclaimer present", () => {
  const profile = buildGatesProfile(scoreGatesAssessment(fullAnswers()));
  assert.ok(typeof profile.non_diagnostic_disclaimer === "string" && profile.non_diagnostic_disclaimer.length > 0);
});

test("no diagnostic/medical/pathology/IQ wording", () => {
  const profile = buildGatesProfile(scoreGatesAssessment(fullAnswers()));
  const raw = JSON.stringify({
    summary: profile.summary,
    strengths: profile.strengths,
    support_needs: profile.support_needs,
    current_growth_gate: profile.current_growth_gate,
  }).toLowerCase();
  for (const banned of ["medical", "pathology", "iq", "diagnosis", "disorder"]) {
    assert.equal(raw.includes(banned), false);
  }
});
