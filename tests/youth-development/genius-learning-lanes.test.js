"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  LEARNING_LANES,
  EVIDENCE_LEVELS,
  PROJECT_TEMPLATES,
  createAcademicEvidencePlan,
  buildDimensionSnapshot,
} = require("../../youth-development/content/geniusLearningLanes");

test("academic Genius plans keep primary task demands separate from optional invitations", () => {
  const plan = createAcademicEvidencePlan({
    content_id: "G5M_FR_001",
    primary_codes: ["RS", "SR", "FB"],
    invitation_codes: ["CQ", "CR", "RS"],
  });

  assert.equal(plan.lane, LEARNING_LANES.ACADEMIC);
  assert.deepEqual(plan.primary_genius_codes, ["RS", "SR", "FB"]);
  assert.deepEqual(plan.invitation_genius_codes, ["CQ", "CR"]);
  assert.equal(plan.activation_moves[0].genius_code, "CQ");
});

test("personal projects create observation opportunities across all seven Garvey dimensions", () => {
  const project = PROJECT_TEMPLATES.helper_robot_for_seniors;
  assert.equal(project.genius_dimension_codes.length, 7);
  assert.deepEqual([...project.genius_dimension_codes].sort(), ["CQ", "CR", "DE", "FB", "PS", "RS", "SR"]);
  assert.equal(project.evidence_opportunities.length, 7);
});

test("dimension snapshots communicate current evidence, never a fixed child label", () => {
  const snapshot = buildDimensionSnapshot("RS", [
    { context_id: "fractions", observation_type: "strategy_explanation", independence: "independent" },
    { context_id: "robot-project", observation_type: "alternate_method", independence: "independent" },
    { context_id: "robot-project", observation_type: "strategy_explanation", independence: "independent" },
  ]);

  assert.equal(snapshot.evidence_level, EVIDENCE_LEVELS.STRONGLY_SHOWING);
  assert.match(snapshot.interpretation_boundary, /not a fixed trait/i);
});

test("missing evidence is reported as not yet assessed rather than a weakness", () => {
  const snapshot = buildDimensionSnapshot("DE", []);
  assert.equal(snapshot.evidence_level, EVIDENCE_LEVELS.NOT_YET_ASSESSED);
  assert.equal(snapshot.evidence_level_copy, "Not yet assessed");
});
