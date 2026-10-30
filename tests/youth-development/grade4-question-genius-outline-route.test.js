"use strict";

const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const test = require("node:test");
const { createAdaptiveV2Router } = require("../../server/adaptiveV2Routes");
const { getGrade4SkillWorldGeniusOutline } = require("../../server/grade4QuestionGeniusOutlineService");

async function startServer(app) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test("Grade 4 curriculum outline returns exact question-level task mapping without child data", async (t) => {
  const app = express();
  app.use(createAdaptiveV2Router({ pool: { query: async () => ({ rows: [] }) } }));
  const { server, url } = await startServer(app);
  t.after(() => server.close());
  const response = await fetch(`${url}/api/grade4-skill-world/genius-outline/G4M_FR_001`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.contract_version, "grade4_question_genius_outline_v1");
  assert.equal(body.outline.question_count, 5);
  const first = body.outline.questions.find((question) => question.question_id === "G4M_FR_001_L1_Q1");
  assert.equal(first.question_prompt, "Write an equivalent fraction for 1/2.");
  assert.deepEqual(first.genius_dimension_codes, ["RS", "SR", "FB"]);
  assert.match(first.interpretation_boundary, /must not be used alone/i);
});

test("Grade 4 curriculum outline service does not expose an arbitrary file path", () => {
  assert.equal(getGrade4SkillWorldGeniusOutline("../../server/db"), null);
  assert.equal(getGrade4SkillWorldGeniusOutline("G5M_FR_001"), null);
});
