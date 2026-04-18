const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { buildInsightLayer } = require("../../youth-development/tde/insightService");
const { buildGrowthTrajectory } = require("../../youth-development/tde/growthTrajectoryService");
const { buildParentCoachingSummary, buildParentGuidance } = require("../../youth-development/tde/parentCoachingService");
const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");

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

function buildSnapshot(childId = "child-phase21") {
  return {
    enrollment: { child_id: childId, current_week: 10 },
    commitment_plan: { child_id: childId, committed_days_per_week: 3 },
    progress_records: [
      { week_number: 1, progress_id: "p1", trait_signal_summary: { SR: 0.55, CQ: 0.56, CR: 0.54, RS: 0.57, PS: 0.54, FB: 0.56, DE: 0.55 }, checkpoint_record: { checkpoint_type: "baseline_checkpoint" } },
      { week_number: 4, progress_id: "p4", trait_signal_summary: { SR: 0.57, CQ: 0.58, CR: 0.56, RS: 0.58, PS: 0.56, FB: 0.57, DE: 0.57 } },
      { week_number: 8, progress_id: "p8", trait_signal_summary: { SR: 0.58, CQ: 0.58, CR: 0.57, RS: 0.58, PS: 0.56, FB: 0.58, DE: 0.58 } },
      { week_number: 10, progress_id: "p10", trait_signal_summary: { SR: 0.58, CQ: 0.58, CR: 0.57, RS: 0.58, PS: 0.56, FB: 0.58, DE: 0.58 }, checkpoint_record: { checkpoint_type: "reassessment_checkpoint" } },
    ],
    intervention_sessions: [
      { session_id: "s1", completed_at: "2026-03-01T10:00:00.000Z", full_session_completed: true, challenge_level: "moderate", parent_coaching_style: "directive" },
      { session_id: "s2", completed_at: "2026-03-05T10:00:00.000Z", full_session_completed: true, challenge_level: "moderate", parent_coaching_style: "directive" },
      { session_id: "s3", completed_at: "2026-03-09T10:00:00.000Z", full_session_completed: true, challenge_level: "moderate", parent_coaching_style: "directive" },
      { session_id: "s4", completed_at: "2026-03-13T10:00:00.000Z", full_session_completed: true, challenge_level: "moderate", parent_coaching_style: "supportive" },
    ],
    development_checkins: [
      {
        checkin_id: "c1",
        completed_at: "2026-03-02T10:00:00.000Z",
        checkin_due: true,
        evidence_map: [
          { prompt_id: "p1", signal_type: "improvement_delta", source_actor: "child", value: 3, trace_ref: "t1" },
          { prompt_id: "p2", signal_type: "improvement_delta", source_actor: "parent", value: 3, trace_ref: "t2" },
        ],
      },
      {
        checkin_id: "c2",
        completed_at: "2026-03-16T10:00:00.000Z",
        checkin_due: true,
        evidence_map: [
          { prompt_id: "p3", signal_type: "improvement_delta", source_actor: "child", value: 2, trace_ref: "t3" },
          { prompt_id: "p4", signal_type: "improvement_delta", source_actor: "parent", value: 2, trace_ref: "t4" },
        ],
      },
    ],
    environment_hooks: [
      { event_id: "e1", trait_code: "SR", event_type: "support_change", environment_factor: "home_routine", normalized_value: 0.6, trace_ref: "env1" },
      { event_id: "e2", trait_code: "FB", event_type: "support_change", environment_factor: "mentor_feedback_loop", normalized_value: 0.62, trace_ref: "env2" },
    ],
    observer_consents: [{ consent_status: "granted" }],
  };
}

test("phase21 deterministic facilitation-state classification", () => {
  const snapshot = buildSnapshot();
  const insights = buildInsightLayer(snapshot, { child_id: snapshot.enrollment.child_id });
  const trajectory = buildGrowthTrajectory(snapshot, { insights }, { child_id: snapshot.enrollment.child_id });

  const first = buildParentCoachingSummary(snapshot, { insights, trajectory }, { child_id: snapshot.enrollment.child_id });
  const second = buildParentCoachingSummary(snapshot, { insights, trajectory }, { child_id: snapshot.enrollment.child_id });

  assert.deepEqual(first, second);
  assert.equal(first.facilitation_state, "overly_directive");
  assert.equal(first.facilitation_guidance.explanation_trace.reason_codes.includes("directive_style_concentration_high"), true);
});

test("phase21 sparse-data downgrade returns insufficient_data and low confidence", () => {
  const sparse = {
    enrollment: { child_id: "child-sparse" },
    commitment_plan: { child_id: "child-sparse", committed_days_per_week: 3 },
    intervention_sessions: [{ session_id: "s1", full_session_completed: true, parent_coaching_style: "supportive", challenge_level: "moderate" }],
    development_checkins: [],
    progress_records: [],
    environment_hooks: [],
  };
  const summary = buildParentCoachingSummary(sparse, {}, { child_id: "child-sparse" });
  assert.equal(summary.facilitation_state, "insufficient_data");
  assert.equal(summary.confidence_context.sparse_data, true);
});

test("phase21 parent-vs-child separation does not collapse parent implementation into child weakness", () => {
  const snapshot = buildSnapshot("child-separation");
  snapshot.intervention_sessions = [
    { session_id: "a", completed_at: "2026-03-01T10:00:00.000Z", full_session_completed: false, challenge_level: "high", parent_coaching_style: "supportive" },
    { session_id: "b", completed_at: "2026-03-07T10:00:00.000Z", full_session_completed: false, challenge_level: "high", parent_coaching_style: "supportive" },
    { session_id: "c", completed_at: "2026-03-14T10:00:00.000Z", full_session_completed: true, challenge_level: "high", parent_coaching_style: "supportive" },
  ];

  const summary = buildParentCoachingSummary(snapshot, {}, { child_id: "child-separation" });
  assert.equal(summary.parent_guidance.scheduling_vs_child_need_interpretation.includes("not child weakness"), true);
  assert.equal(summary.separated_patterns.separation_guard, "parent_child_environment_patterns_reported_separately");
});

test("phase21 coaching recommendation correctness for reflection-support-needed", () => {
  const snapshot = buildSnapshot("child-reflection");
  snapshot.intervention_sessions = [
    { session_id: "s1", completed_at: "2026-03-01T10:00:00.000Z", full_session_completed: true, challenge_level: "moderate", parent_coaching_style: "supportive" },
    { session_id: "s2", completed_at: "2026-03-04T10:00:00.000Z", full_session_completed: true, challenge_level: "moderate", parent_coaching_style: "supportive" },
    { session_id: "s3", completed_at: "2026-03-07T10:00:00.000Z", full_session_completed: true, challenge_level: "moderate", parent_coaching_style: "supportive" },
  ];
  snapshot.development_checkins = [
    {
      checkin_id: "c1",
      completed_at: "2026-03-02T10:00:00.000Z",
      checkin_due: true,
      evidence_map: [
        { prompt_id: "a", signal_type: "improvement_delta", source_actor: "child", value: 4, trace_ref: "x1" },
        { prompt_id: "b", signal_type: "improvement_delta", source_actor: "parent", value: 4, trace_ref: "x2" },
      ],
    },
    {
      checkin_id: "c2",
      completed_at: "2026-03-12T10:00:00.000Z",
      checkin_due: true,
      evidence_map: [
        { prompt_id: "c", signal_type: "improvement_delta", source_actor: "child", value: 2, trace_ref: "x3" },
        { prompt_id: "d", signal_type: "improvement_delta", source_actor: "parent", value: 2, trace_ref: "x4" },
      ],
    },
  ];

  const summary = buildParentCoachingSummary(snapshot, {}, { child_id: "child-reflection" });
  const guidance = buildParentGuidance(summary);

  assert.equal(summary.facilitation_state, "reflection_support_needed");
  assert.equal(guidance.parent_guidance.recommended_next_adjustment.includes("reflection"), true);
});

test("phase21 additive route safety and no regression in live youth v1 routes", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase21-route";
  const snapshot = buildSnapshot(childId);
  const repository = {
    getProgramSnapshot: async () => snapshot,
    getCommitmentPlan: async () => snapshot.commitment_plan,
    listInterventionSessions: async () => snapshot.intervention_sessions,
  };
  const app = mountApp(repository);

  try {
    const parentCoachingRes = await fetch(`${app.baseUrl}/api/youth-development/tde/parent-coaching/${childId}`);
    assert.equal(parentCoachingRes.status, 200);

    const parentGuidanceRes = await fetch(`${app.baseUrl}/api/youth-development/tde/parent-guidance/${childId}`);
    assert.equal(parentGuidanceRes.status, 200);

    const existingTdeRes = await fetch(`${app.baseUrl}/api/youth-development/tde/recommendations/${childId}`);
    assert.equal(existingTdeRes.status, 200);

    const liveV1Res = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(liveV1Res.status, 200);
  } finally {
    delete process.env.TDE_EXTENSION_MODE;
    await app.close();
  }
});
