const test = require("node:test");
const assert = require("node:assert/strict");

const { QUESTIONS } = require("../../gates/gatesAssessmentQuestions");
const { scoreGatesAssessment } = require("../../gates/gatesScoring");
const { buildGatesProfile } = require("../../gates/gatesProfileBuilder");
const { generateGatesRecommendations } = require("../../gates/gatesRecommendations");

function answers(value) {
  return QUESTIONS.map((q) => ({ question_id: q.question_id, value }));
}

test("higher answers produce non-emerging stages", () => {
  const scored = scoreGatesAssessment(answers("consistently"));
  assert.equal(scored.gate_scores.every((g) => g.current_stage === "integrating"), true);
  assert.equal(scored.gate_scores.every((g) => g.normalized_score === 1), true);
});

test("all gates do not default to emerging with high answers", () => {
  const scored = scoreGatesAssessment(answers("often"));
  assert.equal(scored.gate_scores.some((g) => g.current_stage !== "emerging"), true);
  assert.equal(scored.gate_scores.every((g) => g.current_stage === "integrating"), true);
});

test("normalized score calculations are correct", () => {
  const scored = scoreGatesAssessment(answers("sometimes"));
  assert.equal(scored.gate_scores[0].raw_score, 4);
  assert.equal(scored.gate_scores[0].max_score, 8);
  assert.equal(scored.gate_scores[0].normalized_score, 0.5);
  assert.equal(scored.gate_scores[0].current_stage, "practicing");
});

test("blueprint recommendations and walking the gate content are present", () => {
  const profile = buildGatesProfile(scoreGatesAssessment(answers("often")));
  const recs = generateGatesRecommendations({ child_id: "child_1", current_growth_gate: profile.growth_gate.gate_key });
  const categories = recs.map((r) => r.category);
  for (const key of ["reflection", "journal", "observation", "practice", "ceremony"]) assert.equal(categories.includes(key), true);
  assert.equal(recs.some((r) => /Practice Sprint/i.test(r.title)), false);
  assert.ok(profile.reflection_focus);
  assert.ok(profile.journal_prompt);
  assert.ok(profile.observation_focus);
  assert.ok(profile.suggested_next_practice);
  assert.ok(profile.ceremony_readiness_hint);
});
