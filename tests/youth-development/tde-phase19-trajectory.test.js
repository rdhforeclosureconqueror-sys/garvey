const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { buildGrowthTrajectory, buildMilestoneComparison } = require("../../youth-development/tde/growthTrajectoryService");
const { buildRecommendationInputs, generateRecommendations } = require("../../youth-development/tde/recommendationService");
const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");

function buildSnapshot(childId = "child-phase19") {
  return {
    enrollment: { child_id: childId, current_week: 12 },
    progress_records: [
      { week_number: 1, progress_id: "p1", trait_signal_summary: { SR: 0.40, CQ: 0.41, CR: 0.38, RS: 0.43, PS: 0.39, FB: 0.37, DE: 0.36 }, checkpoint_record: { checkpoint_type: "baseline_checkpoint" } },
      { week_number: 4, progress_id: "p4", trait_signal_summary: { SR: 0.44, CQ: 0.42, CR: 0.41, RS: 0.45, PS: 0.40, FB: 0.39, DE: 0.40 } },
      { week_number: 8, progress_id: "p8", trait_signal_summary: { SR: 0.48, CQ: 0.46, CR: 0.44, RS: 0.49, PS: 0.45, FB: 0.43, DE: 0.45 } },
      { week_number: 12, progress_id: "p12", trait_signal_summary: { SR: 0.54, CQ: 0.50, CR: 0.48, RS: 0.55, PS: 0.50, FB: 0.48, DE: 0.51 }, checkpoint_record: { checkpoint_type: "reassessment_checkpoint" } },
    ],
    intervention_sessions: [
      { session_id: "s1", full_session_completed: true, duration_minutes: 22, challenge_level: "moderate", parent_coaching_style: "supportive" },
      { session_id: "s2", full_session_completed: true, duration_minutes: 20, challenge_level: "moderate", parent_coaching_style: "supportive" },
      { session_id: "s3", full_session_completed: true, duration_minutes: 24, challenge_level: "high", parent_coaching_style: "supportive" },
      { session_id: "s4", full_session_completed: false, duration_minutes: 18, challenge_level: "high", parent_coaching_style: "directive" },
    ],
    development_checkins: [
      { checkin_id: "c1", completed_at: "2026-02-01T10:00:00.000Z", summary: { transfer_attempt_quality: 2.1 } },
      { checkin_id: "c2", completed_at: "2026-03-15T10:00:00.000Z", summary: { transfer_attempt_quality: 2.4 } },
    ],
    environment_hooks: [
      { event_id: "e1", trait_code: "SR", environment_factor: "feedback_clarity", event_type: "support_change", normalized_value: 0.7, trace_ref: "trace-e1" },
      { event_id: "e2", trait_code: "SR", environment_factor: "autonomy_level", event_type: "routine_change", normalized_value: 0.6, trace_ref: "trace-e2" },
      { event_id: "e3", trait_code: "DE", environment_factor: "enrichment_access", event_type: "support_change", normalized_value: 0.8, trace_ref: "trace-e3" },
    ],
    observer_consents: [{ consent_status: "granted" }],
  };
}

function mountApp(repository) {
  const app = express();
  app.use(express.json());
  app.use("/api/youth-development/tde", createYouthDevelopmentTdeRouter({ repository }));
  app.use("/api/youth-development/intake", createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("phase19 deterministic trajectory classification and recommendation additive integration", () => {
  const snapshot = buildSnapshot();
  const first = buildGrowthTrajectory(snapshot, {}, { child_id: "child-phase19" });
  const second = buildGrowthTrajectory(snapshot, {}, { child_id: "child-phase19" });
  assert.deepEqual(first, second);
  assert.equal(first.trajectory_state, "improving");

  const context = buildRecommendationInputs(snapshot, { committed_days_per_week: 3 }, snapshot.intervention_sessions, { confidence_label: "moderate" }, { status: "sufficient" }, {}, {
    trajectory_state: first.trajectory_state,
    trajectory_confidence: first.confidence_context.confidence_label,
  });
  const recommendations = generateRecommendations({ child_id: "child-phase19", ...context, personalization_modifiers: {} });
  assert.equal(recommendations.recommendations.some((entry) => entry.type === "increase_autonomy_with_consistent_improvement"), true);
});

test("phase19 sparse-data downgrade and milestone comparison correctness", () => {
  const sparse = {
    enrollment: { child_id: "child-sparse" },
    progress_records: [{ week_number: 1, progress_id: "p1", trait_signal_summary: { SR: 0.5 } }],
    intervention_sessions: [],
    development_checkins: [],
    environment_hooks: [],
  };
  const trajectory = buildGrowthTrajectory(sparse, {}, { child_id: "child-sparse" });
  assert.equal(trajectory.trajectory_state, "insufficient_data");

  const comparison = buildMilestoneComparison(buildSnapshot("child-milestone"), { child_id: "child-milestone" });
  const sr = comparison.pillar_comparisons.find((entry) => entry.pillar_code === "SR");
  assert.equal(sr.direction, "up");
  assert.equal(sr.delta, 0.14);
});

test("phase19 separates environment interpretation from adherence limitations", () => {
  const snapshot = buildSnapshot();
  snapshot.intervention_sessions = [
    { session_id: "a", full_session_completed: false },
    { session_id: "b", full_session_completed: false },
    { session_id: "c", full_session_completed: true },
  ];
  const trajectory = buildGrowthTrajectory(snapshot, {}, { child_id: "child-separation" });
  const sr = trajectory.pillar_trajectories.find((entry) => entry.pillar_code === "SR");

  assert.equal(sr.environment_context.likely_contributed, true);
  assert.equal(sr.adherence_interpretation.interpretation_limited, true);
});

test("phase19 additive route safety and live youth v1 non-regression", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase19-route";
  const repository = {
    getProgramSnapshot: async () => buildSnapshot(childId),
    getCommitmentPlan: async () => ({ child_id: childId, committed_days_per_week: 3, preferred_days: ["Mon", "Wed", "Fri"] }),
    listInterventionSessions: async () => buildSnapshot(childId).intervention_sessions,
  };
  const app = mountApp(repository);

  try {
    const trajectoryRes = await fetch(`${app.baseUrl}/api/youth-development/tde/growth-trajectory/${childId}`);
    assert.equal(trajectoryRes.status, 200);

    const milestoneRes = await fetch(`${app.baseUrl}/api/youth-development/tde/milestone-comparison/${childId}`);
    assert.equal(milestoneRes.status, 200);

    const tdeExistingRes = await fetch(`${app.baseUrl}/api/youth-development/tde/recommendations/${childId}`);
    assert.equal(tdeExistingRes.status, 200);

    const assessRes = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessRes.status, 200);
  } finally {
    delete process.env.TDE_EXTENSION_MODE;
    await app.close();
  }
});
