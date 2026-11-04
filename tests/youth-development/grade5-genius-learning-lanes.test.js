"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  GRADE5_LEARNING_LANE_PLANS,
  getGrade5LearningLanePlan,
  getProjectTemplate,
} = require("../../youth-development/content/grade5GeniusLearningLanes");

test("every current Grade 5 Math and English package has a Garvey learning-lane plan", () => {
  assert.equal(Object.keys(GRADE5_LEARNING_LANE_PLANS).length, 20);
  for (const [skillId, plan] of Object.entries(GRADE5_LEARNING_LANE_PLANS)) {
    assert.ok(/^G5[ME]_/.test(skillId));
    assert.equal(plan.content_id, skillId);
    assert.ok(plan.primary_genius_codes.length > 0);
    assert.ok(plan.primary_genius_codes.every((code) => /^[A-Z]{2}$/.test(code)));
    assert.ok(plan.invitation_genius_codes.every((code) => !plan.primary_genius_codes.includes(code)));
  }
});

test("Grade 5 fractions expose core reasoning practice plus optional curiosity and creativity moves", () => {
  const plan = getGrade5LearningLanePlan("G5M_FR_001");
  assert.deepEqual(plan.primary_genius_codes, ["SR", "RS", "FB"]);
  assert.deepEqual(plan.invitation_genius_codes, ["CQ", "CR"]);
});

test("Grade 5 writing creates an opening for an interest-connected project context", () => {
  const plan = getGrade5LearningLanePlan("G5E_WR_002");
  assert.ok(plan.primary_genius_codes.includes("CR"));
  assert.ok(plan.invitation_genius_codes.includes("DE"));
});

test("the first project lane has a child-owned purpose and all-seven observation opportunities", () => {
  const project = getProjectTemplate("helper_robot_for_seniors");
  assert.ok(project.child_owned_question);
  assert.equal(project.evidence_opportunities.length, 7);
});
