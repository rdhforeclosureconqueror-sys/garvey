const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { createYouthDevelopmentIntakeRouter } = require('../../server/youthDevelopmentIntakeRoutes');
const {
  buildParentExperienceViewModel,
  buildHistoricalAnalytics,
  buildRoadmapViewModel,
  buildSupportActions,
  getTrustContent,
} = require('../../youth-development/tde/parentExperienceService');

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

const snapshot = {
  enrollment: {
    child_id: 'child-phase5',
    current_week: 13,
    active_domain_interests: ['systems_thinking', 'creative_problem_solving', 'literacy_expression'],
    current_trait_targets: ['SR', 'PS', 'FB'],
    current_environment_targets: ['challenge_fit', 'mentorship_access'],
  },
  progress_records: [
    { week_number: 1, completion_status: 'complete', checkpoint_record: { checkpoint_id: 'cp1', checkpoint_type: 'baseline_checkpoint' } },
    { week_number: 2, completion_status: 'complete' },
    { week_number: 7, completion_status: 'complete' },
    { week_number: 12, completion_status: 'complete', checkpoint_record: { checkpoint_id: 'cp12', checkpoint_type: 'reassessment_checkpoint' } },
  ],
  observer_consents: [{ observer_id: 'obs-1', consent_status: 'granted' }],
  environment_hooks: [{ environment_factor: 'challenge_fit' }, { environment_factor: 'mentorship_access' }],
};

test('phase-5 parent experience view model is deterministic and keeps confidence/data sufficiency visible', () => {
  const first = buildParentExperienceViewModel('child-phase5', snapshot);
  const second = buildParentExperienceViewModel('child-phase5', snapshot);
  assert.deepEqual(first, second);

  assert.equal(first.current_phase.phase_number, 2);
  assert.equal(first.current_week.week_number, 13);
  assert.equal(first.roadmap_position.total_weeks, 36);
  assert.ok(Array.isArray(first.completed_checkpoints));
  assert.equal(first.next_checkpoint.week_number, 24);
  assert.ok(first.confidence_context.confidence_label);
  assert.ok(first.data_sufficiency_context.status);
  assert.equal(first.factor_separation.separation_guard, 'child_and_environment_factors_reported_separately');
  assert.equal(first.historical_analytics.schema_version, 'parent_multi_week_analytics_v1');
  assert.equal(Array.isArray(first.historical_analytics.trend_history.weeks), true);
  assert.ok(first.historical_analytics.streak_contract.contract_version);
  assert.ok(first.historical_analytics.week_over_week.direction);
});

test('phase-5 historical analytics contract provides stable multi-week payload and streak behavior', () => {
  const analytics = buildHistoricalAnalytics(snapshot.progress_records, 12);
  assert.equal(analytics.schema_version, 'parent_multi_week_analytics_v1');
  assert.equal(analytics.trend_history.window_weeks, 4);
  assert.equal(Array.isArray(analytics.trend_history.weeks), true);
  assert.equal(analytics.week_over_week.comparison_available, true);
  assert.equal(typeof analytics.week_over_week.current_week_completion_percent, 'number');
  assert.equal(analytics.streak_contract.contract_version, 'parent_consistency_streak_v1');
  assert.equal(typeof analytics.streak_contract.current_streak_weeks, 'number');
});

test('phase-5 roadmap model includes full 36-week progression and checkpoint status', () => {
  const model = buildRoadmapViewModel(24);
  assert.equal(model.phases.length, 3);
  assert.equal(model.weeks.length, 36);
  assert.equal(model.current_position.week_number, 24);

  const checkpoints = model.checkpoints.map((entry) => entry.week_number);
  assert.deepEqual(checkpoints, [1, 12, 24, 36]);
  assert.equal(model.checkpoints.find((entry) => entry.week_number === 24).status, 'active');
});

test('phase-5 support actions contract is valid and tied to trait/environment logic', () => {
  const payload = buildSupportActions(snapshot, { confidence_label: 'early-signal', rationale: 'test' }, { status: 'limited' });
  assert.ok(payload.support_actions.length >= 2);

  for (const action of payload.support_actions) {
    assert.ok(action.action_id);
    assert.ok(action.title);
    assert.ok(action.why_this_matters);
    assert.ok(action.linked_trait_or_environment_factor);
    assert.ok(action.suggested_timing);
    assert.ok(action.effort_level);
    assert.ok(action.trace_ref || action.rule_ref);
    assert.ok(action.confidence_context?.confidence_label);
  }
});

test('phase-5 trust content contract exposes required trust sections', () => {
  const trust = getTrustContent();
  assert.equal(trust.ok, true);
  assert.equal(trust.extension_only, true);
  assert.ok(trust.trust_sections.system_explanation);
  assert.ok(trust.trust_sections.how_it_works);
  assert.ok(trust.trust_sections.developmental_not_diagnostic_explanation);
  assert.ok(trust.trust_sections.pattern_over_time_explanation);
  assert.ok(trust.trust_sections.next_step_plan_explanation);
  assert.ok(trust.trust_sections.confidence_data_sufficiency_explanation);
});

test('phase-5 extension endpoints are additive and feature-gated', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const trustRes = await fetch(`${app.baseUrl}/api/youth-development/tde/trust-content`);
    assert.equal(trustRes.status, 200);

    const parentRes = await fetch(`${app.baseUrl}/api/youth-development/tde/parent-experience/child-phase5`);
    const parent = await parentRes.json();
    assert.equal(parentRes.status, 200);
    assert.equal(parent.extension_only, true);
    assert.ok(parent.historical_analytics);
    assert.equal(Array.isArray(parent.historical_analytics.trend_history.weeks), true);
    assert.ok(parent.historical_analytics.streak_contract);

    const roadmapRes = await fetch(`${app.baseUrl}/api/youth-development/tde/roadmap/child-phase5`);
    const roadmap = await roadmapRes.json();
    assert.equal(roadmapRes.status, 200);
    assert.equal(roadmap.weeks.length, 36);

    const actionsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/support-actions/child-phase5`);
    const actions = await actionsRes.json();
    assert.equal(actionsRes.status, 200);
    assert.ok(Array.isArray(actions.support_actions));
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('phase-5 does not regress live youth v1 routes', async () => {
  delete process.env.TDE_EXTENSION_MODE;
  const app = mountApp();
  try {
    const intakeResponse = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intakeResponse.status, 200);

    const assessResponse = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessResponse.status, 200);

    const parentDashboard = await fetch(`${app.baseUrl}/youth-development/parent-dashboard`);
    assert.equal(parentDashboard.status, 200);

    const tdeParentRes = await fetch(`${app.baseUrl}/api/youth-development/tde/parent-experience/child-phase5`);
    assert.equal(tdeParentRes.status, 404);
  } finally {
    await app.close();
  }
});
