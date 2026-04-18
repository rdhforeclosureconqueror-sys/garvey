const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { buildInsightLayer } = require("../../youth-development/tde/insightService");
const {
  buildPatternHistory,
  buildPersonalizationModifiers,
  buildAdaptiveRecommendationExplanation,
} = require("../../youth-development/tde/personalizationService");
const { buildRecommendationInputs, generateRecommendations } = require("../../youth-development/tde/recommendationService");
const { buildSessionPlan } = require("../../youth-development/tde/sessionBuilderService");
const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");

function buildSnapshot(childId = "child-phase18") {
  return {
    enrollment: { child_id: childId, current_week: 12 },
    progress_records: [
      { week_number: 10, trait_signal_summary: { SR: 0.45, PS: 0.42, DE: 0.5 } },
      { week_number: 11, trait_signal_summary: { SR: 0.38, PS: 0.36, DE: 0.43 } },
    ],
    intervention_sessions: [
      { session_id: "s-1", child_id: childId, full_session_completed: true, duration_minutes: 22, challenge_level: "moderate", parent_coaching_style: "supportive" },
      { session_id: "s-2", child_id: childId, full_session_completed: false, duration_minutes: 30, challenge_level: "high", parent_coaching_style: "directive" },
    ],
    development_checkins: [
      {
        checkin_id: "c-1",
        completed_at: "2026-04-01T10:00:00.000Z",
        summary: { transfer_attempt_quality: 2.6 },
        evidence_map: [{ evidence_id: "e-1", trait_code: "SR", value: 2, value_max: 4, source_actor: "child", trace_ref: "trace-e-1" }],
      },
      {
        checkin_id: "c-2",
        completed_at: "2026-04-12T10:00:00.000Z",
        summary: { transfer_attempt_quality: 1.7 },
        evidence_map: [{ evidence_id: "e-2", trait_code: "SR", value: 1, value_max: 4, source_actor: "child", trace_ref: "trace-e-2" }],
      },
    ],
    environment_hooks: [
      {
        event_id: "env-1",
        trait_code: "SR",
        normalized_value: 0.4,
        trace_ref: "trace-env-1",
        timestamp: "2026-04-05T10:00:00.000Z",
      },
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

test("phase18 deterministic personalization outputs and regression pattern detection", () => {
  const snapshot = buildSnapshot();
  const insights = buildInsightLayer(snapshot, { child_id: "child-phase18" });
  const first = buildPersonalizationModifiers(snapshot, insights, { child_id: "child-phase18" });
  const second = buildPersonalizationModifiers(snapshot, insights, { child_id: "child-phase18" });
  const history = buildPatternHistory(snapshot, { child_id: "child-phase18" });

  assert.deepEqual(first, second);
  assert.equal(history.pattern_history.regression_signal.present, true);
  assert.equal(history.pattern_history.improving_trend.present, false);
  assert.equal(first.modifiers.recommendation_modifiers.intensity, "reduced");
});

test("phase18 recommendation adaptation and explanation remain traceable", () => {
  const snapshot = buildSnapshot();
  const insights = buildInsightLayer(snapshot, { child_id: "child-phase18-rec" });
  const history = buildPatternHistory(snapshot, { child_id: "child-phase18-rec" });
  const personalization = buildPersonalizationModifiers(snapshot, insights, {
    child_id: "child-phase18-rec",
    pattern_history: history,
  });

  const context = buildRecommendationInputs(snapshot, { committed_days_per_week: 3, preferred_days: ["Mon", "Wed", "Fri"] }, snapshot.intervention_sessions, { confidence_label: "moderate" }, { status: "sufficient" }, {});
  const recommendations = generateRecommendations({
    child_id: "child-phase18-rec",
    ...context,
    personalization_modifiers: personalization.modifiers,
  });
  const explanation = buildAdaptiveRecommendationExplanation(recommendations, personalization);

  assert.equal(Array.isArray(recommendations.recommendations), true);
  assert.equal(recommendations.recommendations.every((entry) => Boolean(entry.adaptive_adjustments && entry.adaptive_adjustments.trace)), true);
  assert.equal(explanation.explanation_schema_version, "phase18-v1");
});

test("phase18 session adaptation hooks are optional and deterministic", () => {
  const payload = {
    child_id: "child-session-hooks",
    phase_number: 2,
    session_date: "2026-04-18",
    personalization_modifiers: {
      session_planning_modifiers: {
        preferred_challenge_level: "low",
        reflection_prompt_count: 2,
        deterministic_activity_bias: "attention_and_regulation_first",
        rule_path: "personalization/modifiers/session_planning/v1",
      },
    },
  };

  const one = buildSessionPlan(payload);
  const two = buildSessionPlan(payload);

  assert.deepEqual(one, two);
  assert.equal(one.session_plan.adaptation_hooks.hooks_applied, true);
  assert.equal(one.session_plan.adaptation_hooks.adaptation.preferred_challenge_level, "low");
});

test("phase18 additive routes and live youth v1 non-regression", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase18-route";
  const repository = {
    getProgramSnapshot: async () => buildSnapshot(childId),
    getCommitmentPlan: async () => ({ child_id: childId, committed_days_per_week: 3, preferred_days: ["Mon", "Wed", "Fri"], preferred_time_window: "after_school", target_session_length: 25, facilitator_role: "parent" }),
    listInterventionSessions: async () => buildSnapshot(childId).intervention_sessions,
  };
  const app = mountApp(repository);

  try {
    const personalizationRes = await fetch(`${app.baseUrl}/api/youth-development/tde/personalization/${childId}`);
    assert.equal(personalizationRes.status, 200);

    const historyRes = await fetch(`${app.baseUrl}/api/youth-development/tde/pattern-history/${childId}`);
    assert.equal(historyRes.status, 200);

    const explanationRes = await fetch(`${app.baseUrl}/api/youth-development/tde/recommendations/${childId}/explanation`);
    assert.equal(explanationRes.status, 200);

    const intakeRes = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intakeRes.status, 200);

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
