const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { createYouthDevelopmentIntakeRouter } = require('../../server/youthDevelopmentIntakeRoutes');
const { buildRecommendationInputs, generateRecommendations } = require('../../youth-development/tde/recommendationService');
const { evaluateInterventionReadiness, buildRolloutBridge } = require('../../youth-development/tde/readinessRolloutService');
const { buildInterventionSummary } = require('../../youth-development/tde/interventionSummaryService');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  app.use('/api/youth-development/intake', createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

function buildFixture() {
  const snapshot = {
    progress_records: [
      { week_number: 1, trait_signal_summary: { SR: 0.4 }, checkpoint_record: { checkpoint_id: 'cp-1' } },
      { week_number: 2, trait_signal_summary: { SR: 0.45 } },
    ],
    observer_consents: [{ consent_status: 'granted' }],
    environment_hooks: [{ environment_factor: 'home_routine' }],
    checkin_context: {
      history_count: 2,
      consistency_status: 'sufficient',
      traceability_status: 'sufficient',
      cross_source_agreement_status: 'sufficient',
    },
  };
  const commitmentPlan = {
    child_id: 'child-p9',
    committed_days_per_week: 3,
    preferred_days: ['mon', 'wed', 'fri'],
    preferred_time_window: '17:00-19:00',
    target_session_length: 30,
    facilitator_role: 'parent',
  };
  const sessions = [
    { full_session_completed: true, duration_minutes: 32, challenge_level: 'high', parent_coaching_style: 'directive', frustration_recovery_level: 'recovered_with_prompt', completed_at: '2026-04-01T12:00:00.000Z' },
    { full_session_completed: false, duration_minutes: 30, challenge_level: 'high', parent_coaching_style: 'directive', frustration_recovery_level: 'did_not_recover', completed_at: '2026-04-02T12:00:00.000Z' },
  ];
  return { snapshot, commitmentPlan, sessions };
}

test('phase9 recommendation determinism and traceability', () => {
  const { snapshot, commitmentPlan, sessions } = buildFixture();
  const context = buildRecommendationInputs(snapshot, commitmentPlan, sessions, { confidence_label: 'early-signal' }, { status: 'limited' });

  const first = generateRecommendations({ child_id: 'child-p9', ...context });
  const second = generateRecommendations({ child_id: 'child-p9', ...context });
  assert.deepEqual(first, second);
  assert.ok(first.recommendations.length >= 1);

  for (const recommendation of first.recommendations) {
    assert.equal(recommendation.governance.logic_type, 'rule_based_operational_logic');
    assert.equal(recommendation.governance.validated_truth_claim, false);
    assert.ok(recommendation.trace.rule_id);
    assert.equal(recommendation.trace.trace_label, 'rule_based_operational_logic');
  }
});

test('phase9 parent summary includes adherence-aware confidence and factor distinction', () => {
  const { snapshot, commitmentPlan, sessions } = buildFixture();
  const summary = buildInterventionSummary('child-p9', snapshot, commitmentPlan, sessions);
  assert.equal(summary.ok, true);
  assert.equal(summary.confidence_interpretation.confidence_adjusted_by_adherence, true);
  assert.equal(summary.intervention_quality_context.developmental_language_only, true);
  assert.ok(summary.factor_distinction.child_development_signals);
  assert.ok(Array.isArray(summary.factor_distinction.environment_factors));
  assert.ok(summary.factor_distinction.implementation_consistency.adherence_status);
});

test('phase9 readiness distinguishes ready/partial/not-ready and rollout bridge fallback safety', () => {
  const { snapshot, commitmentPlan, sessions } = buildFixture();

  const partial = evaluateInterventionReadiness(snapshot, commitmentPlan, sessions);
  assert.equal(partial.readiness_status, 'partially_ready');

  const readySessions = [...sessions, { full_session_completed: true, duration_minutes: 28, challenge_level: 'moderate', parent_coaching_style: 'supportive', frustration_recovery_level: 'recovered_independently', completed_at: '2026-04-03T12:00:00.000Z' }];
  const ready = evaluateInterventionReadiness(snapshot, commitmentPlan, readySessions);
  assert.equal(ready.readiness_status, 'ready');

  const notReady = evaluateInterventionReadiness({}, null, []);
  assert.equal(notReady.readiness_status, 'not_ready');

  const fallbackRollout = buildRolloutBridge(notReady);
  assert.equal(fallbackRollout.fallback_safe, true);
  assert.equal(fallbackRollout.tde_availability, 'withheld');
});

test('phase9 extension endpoints are additive and live youth v1 routes remain non-regressed', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const commitmentRes = await fetch(`${app.baseUrl}/api/youth-development/tde/commitment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-p9-route',
        committed_days_per_week: 3,
        preferred_days: ['mon', 'wed', 'fri'],
        preferred_time_window: '17:00-19:00',
        session_length: 30,
        facilitator_role: 'parent',
      }),
    });
    assert.equal(commitmentRes.status, 200);

    for (const [id, completed, date] of [[1, true, '2026-04-01T12:00:00.000Z'], [2, false, '2026-04-02T12:00:00.000Z']]) {
      const completeRes = await fetch(`${app.baseUrl}/api/youth-development/tde/session/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          child_id: 'child-p9-route',
          session_id: `sess-p9-${id}`,
          selected_activity_ids: ['rbr_breathe_count_01', 'attn_body_scan_01', 'chal_focus_ladder_01', 'refl_coach_prompt_01'],
          component_completion_flags: { RULE_BASED_REGULATION: true, ATTENTION_MINDFULNESS: true, CHALLENGE_SUSTAINED_FOCUS: true, REFLECTION_COACHING: true },
          duration_minutes: 30,
          challenge_level: 'high',
          parent_coaching_style: 'directive',
          child_effort_rating: 3,
          frustration_recovery_level: completed ? 'recovered_with_prompt' : 'did_not_recover',
          focus_duration_minutes: 15,
          prompting_needed: 'high',
          child_choice_count: 1,
          reflection_response: 'trying',
          notes: 'phase9 route',
          full_session_completed: completed,
          completed_at: date,
        }),
      });
      assert.equal(completeRes.status, 200);
    }

    const recRes = await fetch(`${app.baseUrl}/api/youth-development/tde/recommendations/child-p9-route`);
    assert.equal(recRes.status, 200);
    const rec = await recRes.json();
    assert.equal(rec.ok, true);

    const summaryRes = await fetch(`${app.baseUrl}/api/youth-development/tde/intervention-summary/child-p9-route`);
    assert.equal(summaryRes.status, 200);

    const readinessRes = await fetch(`${app.baseUrl}/api/youth-development/tde/readiness/child-p9-route`);
    assert.equal(readinessRes.status, 200);

    const rolloutRes = await fetch(`${app.baseUrl}/api/youth-development/tde/rollout/child-p9-route`);
    assert.equal(rolloutRes.status, 200);

    const intakeResponse = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intakeResponse.status, 200);

    const assessResponse = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessResponse.status, 200);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});
