"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildDashboardAssessmentInsights } = require("../server/dashboardAssessmentInsights");

function fakePool({ hasSession = true } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, args) {
      calls.push({ sql, args });
      if (/FROM assessment_sessions/.test(sql)) return { rows: hasSession ?
        [{ id: 11, grade: 1, subject: "Math" }] : [] };
      if (/FROM assessment_skill_evidence/.test(sql)) return { rows: [
        { package_id: "MATH_EXAMPLE_A", provisional_label: "Ready", valid_response_count: 4 },
        { package_id: "MATH_EXAMPLE_B", provisional_label: "Developing", valid_response_count: 4 },
      ] };
      if (/FROM assessment_recommendations/.test(sql)) return { rows: [
        { recommended_package_id: "MATH_EXAMPLE_B", recommendation_type: "current_skill_support" },
      ] };
      throw new Error("Unexpected SQL");
    },
  };
}

test("returns helpful learning actions scoped to canonical child and parent", async () => {
  const pool = fakePool();
  const result = await buildDashboardAssessmentInsights(pool, { childId: "301", parentProfileId: "201" });
  assert.equal(result.available, true);
  assert.equal(result.strengths[0].label, "Promising progress");
  assert.equal(result.practice[0].practice_route, "/skill-world/MATH_EXAMPLE_B/drill");
  assert.deepEqual(pool.calls[0].args, ["301", "201"]);
  assert.match(pool.calls[0].sql, /parent_profile_id = \$2/);
  assert.match(pool.calls[0].sql, /status = 'completed'/);
  assert.deepEqual(pool.calls.slice(1).map(c => c.args), [[11], [11]]);
  assert.doesNotMatch(JSON.stringify(result), /learner_response|scoring_key|correct_answer/i);
});

test("does not query database without both canonical identities", async () => {
  const pool = fakePool();
  const outcome = await buildDashboardAssessmentInsights(pool, { childId: "301" });
  assert.equal(outcome.available, false);
  assert.deepEqual(pool.calls, []);
});

test("an account with no completed assessments gets a gentle empty state", async () => {
  const pool = fakePool({ hasSession: false });
  const result = await buildDashboardAssessmentInsights(pool, { childId: 301, parentProfileId: 201 });
  assert.deepEqual(result, { available: false, reason: "no_completed_assessment" });
  assert.equal(pool.calls.length, 1);
});

test("parent dashboard renders assessment insights on empty and active adaptive progress", () => {
  const src = fs.readFileSync(path.join(__dirname, "../server/youthDevelopmentRoutes.js"), "utf8");
  assert.match(src, /function renderAssessmentLearningInsights\(insights\)/);
  assert.equal((src.match(/renderAssessmentLearningInsights\(summary.assessment_learning_insights\)/g) || []).length, 2);
  assert.match(src, /\/api\/youth-development\/parent-dashboard\/adaptive-summary/);
});

test("adaptive dashboard response includes learning insights from a child-scoped source", () => {
  const src = fs.readFileSync(path.join(__dirname, "../server/adaptiveParentDashboardSummary.js"), "utf8");
  assert.match(src, /assessment_learning_insights: assessmentInsights/);
  assert.match(src, /parentProfileId: opts.parentProfileId/);
});
