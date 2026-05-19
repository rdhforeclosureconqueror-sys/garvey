const test = require("node:test");
const assert = require("node:assert/strict");

const { QUESTIONS } = require("../../gates/gatesAssessmentQuestions");
const { scoreGatesAssessment } = require("../../gates/gatesScoring");

function buildAnswers(value = "often") {
  return QUESTIONS.map((q) => ({ question_id: q.question_id, value }));
}

test("valid answers score successfully", () => {
  const result = scoreGatesAssessment(buildAnswers("often"));
  assert.equal(Array.isArray(result.gate_scores), true);
  assert.equal(result.gate_scores.length, 10);
  assert.equal(result.primary_gates.length, 3);
});

test("invalid question ID fails", () => {
  assert.throws(() => scoreGatesAssessment([{ question_id: "bad_id", value: "often" }]));
});

test("invalid option value fails", () => {
  assert.throws(() => scoreGatesAssessment([{ question_id: QUESTIONS[0].question_id, value: "always" }]));
});

test("all 10 Gates represented", () => {
  const result = scoreGatesAssessment(buildAnswers("sometimes"));
  const gateNumbers = new Set(result.gate_scores.map((g) => g.gate_number));
  assert.equal(gateNumbers.size, 10);
});

test("primary Gates deterministic", () => {
  const answers = buildAnswers("rarely");
  const a = scoreGatesAssessment(answers).primary_gates;
  const b = scoreGatesAssessment(answers).primary_gates;
  assert.deepEqual(a, b);
});

test("growth Gate deterministic", () => {
  const answers = buildAnswers("rarely");
  const a = scoreGatesAssessment(answers).current_growth_gate;
  const b = scoreGatesAssessment(answers).current_growth_gate;
  assert.equal(a, b);
});

test("scoring avoids diagnostic language", () => {
  const result = JSON.stringify(scoreGatesAssessment(buildAnswers("often"))).toLowerCase();
  for (const banned of ["diagnosis", "diagnostic", "medical", "pathology", "iq", "disorder"]) {
    assert.equal(result.includes(banned), false);
  }
});
