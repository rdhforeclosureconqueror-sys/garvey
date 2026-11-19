"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { LESSONS, getGeniusLesson, evaluateGeniusEvidence } = require("../../youth-development/content/grade5GeniusEvidencePilot");
const { GENIUS_DIMENSIONS } = require("../../youth-development/content/curriculumGeniusMap");

test("pilot IDs are explicit and activation codes use the authoritative seven dimensions", () => {
  assert.equal(Object.keys(LESSONS).length, 6);
  for (const [id, lesson] of Object.entries(LESSONS)) {
    assert.match(id, /^G5[ME]_/);
    assert.ok(lesson.activation.length);
    for (const code of lesson.opportunities) assert.ok(GENIUS_DIMENSIONS[code]);
    for (const move of lesson.activation) {
      assert.ok(move.prompt.length > 15);
      for (const code of move.codes) assert.ok(GENIUS_DIMENSIONS[code]);
    }
  }
  assert.equal(getGeniusLesson("G5M_NOT_A_REAL_SKILL"), null);
});

test("an actual observed pattern test yields co-activation, not a trait ranking", () => {
  const row = evaluateGeniusEvidence({
    skill_id: "G5M_FR_001", activation_id: "test_pattern",
    signal: "tested_pattern_on_new_item", observed: true,
    evidence_id: "practice-session-1:item-3", content_version: "1.0.0", difficulty: 3,
  });
  assert.deepEqual(row.dimension_codes, ["RS", "CQ"]);
  assert.equal(row.combination_observed, true);
  assert.equal(row.interpretation, "observed_in_this_activity");
  assert.equal(Object.hasOwn(row, "trait_score"), false);
});

test("no records from mere exposure, unobserved reflection, invalid or unrelated signals", () => {
  const base = {skill_id: "G5M_FR_001", activation_id: "test_pattern", signal: "tested_pattern_on_new_item"};
  assert.equal(evaluateGeniusEvidence({...base, observed: false, evidence_id: "a"}), null);
  assert.equal(evaluateGeniusEvidence({...base, observed: true}), null);
  assert.equal(evaluateGeniusEvidence({...base, observed: true, evidence_id: "a", signal: "clicked_next"}), null);
  assert.equal(evaluateGeniusEvidence({...base, observed: true, evidence_id: "a", signal: "linked_skill_to_chosen_project"}), null);
  assert.equal(evaluateGeniusEvidence({...base, observed: true, evidence_id: "a", source: "unknown"}), null);
  assert.equal(evaluateGeniusEvidence({...base, observed: true, evidence_id: "a", skill_id: "OTHER"}), null);
});
