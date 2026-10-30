"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { GRADE4_SKILL_PROFILES, buildGrade4QuestionOutline, validateGrade4Profiles } = require("../../youth-development/content/grade4QuestionGeniusMap");

const contentDir = path.resolve(__dirname, "../../public/gamehub/skill-world/content");
const grade4Files = fs.readdirSync(contentDir).filter((name) => /^G4[EM]_.*\.skill-package\.v1\.json$/.test(name)).sort();

test("every Grade 4 Skill World package has a Garvey task-observation profile", () => {
  assert.equal(grade4Files.length, 20);
  assert.equal(Object.keys(GRADE4_SKILL_PROFILES).length, 20);
  assert.equal(validateGrade4Profiles(), true);
  for (const file of grade4Files) {
    const pack = JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf8"));
    assert.ok(GRADE4_SKILL_PROFILES[pack.skill_id], `${pack.skill_id} needs a profile`);
  }
});

test("every Grade 4 question placement is outlined with exact prompt, task demand, evidence, and guardrail", () => {
  let count = 0;
  for (const file of grade4Files) {
    const pack = JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf8"));
    const outline = buildGrade4QuestionOutline(pack);
    assert.ok(outline);
    for (const item of outline.questions) {
      count += 1;
      assert.ok(item.question_prompt, item.outline_id);
      assert.ok(item.task_demands.length > 2, item.outline_id);
      assert.ok(item.genius_dimension_codes.length > 0, item.outline_id);
      assert.ok(item.observable_evidence.length > 0, item.outline_id);
      assert.match(item.interpretation_boundary, /must not be used alone/i);
    }
  }
  assert.equal(count, 160);
});

test("fraction-equivalence items map to the task actually practiced", () => {
  const pack = JSON.parse(fs.readFileSync(path.join(contentDir, "G4M_FR_001.skill-package.v1.json"), "utf8"));
  const outline = buildGrade4QuestionOutline(pack);
  const item = outline.questions.find((question) => question.question_id === "G4M_FR_001_L1_Q1");
  assert.equal(item.question_prompt, "Write an equivalent fraction for 1/2.");
  assert.equal(item.academic_target, "Fraction equivalence and ordering");
  assert.deepEqual(item.genius_dimension_codes, ["RS", "SR", "FB"]);
  assert.ok(item.task_demands.includes("use a visual fraction model"));
});
