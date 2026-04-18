const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { createYouthDevelopmentIntakeRouter } = require('../../server/youthDevelopmentIntakeRoutes');
const { buildRecommendationInputs, generateRecommendations } = require('../../youth-development/tde/recommendationService');
const { evaluateInterventionReadiness } = require('../../youth-development/tde/readinessRolloutService');
const { generateDevelopmentCheckin } = require('../../youth-development/tde/developmentCheckinService');

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

test('phase11 parent-experience includes developmental check-in visibility and evidence distinctions', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const childId = 'child-p11-parent';

    const run = async (week, completedAt, childScore, parentScore, reflectionScore) => {
      const blueprint = generateDevelopmentCheckin({ child_id: childId, program_week: week });
      const completedRes = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin/run`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          program_week: week,
          completed_at: completedAt,
          responses: {
            child: [
              { prompt_id: blueprint.prompts.performance_prompt.prompt_id, response_text: 'strategy use', value: childScore },
              { prompt_id: blueprint.prompts.reflection_prompt.prompt_id, response_text: 'reflection movement', value: reflectionScore },
            ],
            transfer: blueprint.prompts.optional_transfer_prompt
              ? { prompt_id: blueprint.prompts.optional_transfer_prompt.prompt_id, response_text: 'transfer', value: childScore }
              : undefined,
            parent: { parent_id: 'parent-p11', response_text: 'parent context', value: parentScore },
          },
        }),
      });
      assert.equal(completedRes.status, 200);
    };

    await run(10, '2026-04-01T12:00:00.000Z', 2, 2, 1);
    await run(12, '2026-04-15T12:00:00.000Z', 1, 4, 3);

    const parentRes = await fetch(`${app.baseUrl}/api/youth-development/tde/parent-experience/${childId}`);
    assert.equal(parentRes.status, 200);
    const parentPayload = await parentRes.json();
    assert.equal(parentPayload.ok, true);
    assert.ok(parentPayload.developmental_checkin_context.next_expected_checkin.expected_program_week >= 2);
    assert.equal(parentPayload.evidence_streams.session_intervention_evidence.label, 'Session/intervention evidence');
    assert.equal(parentPayload.evidence_streams.developmental_checkin_evidence.label, 'Developmental check-in evidence');
    assert.equal(parentPayload.evidence_streams.parent_observation_evidence.label, 'Parent observation evidence');
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('phase11 recommendation logic responds to check-in evidence and disagreement', () => {
  const snapshot = { progress_records: [], observer_consents: [], environment_hooks: [] };
  const plan = { committed_days_per_week: 3 };
  const sessions = [{ duration_minutes: 30, full_session_completed: true, challenge_level: 'moderate', frustration_recovery_level: 'recovered_with_prompt', parent_coaching_style: 'supportive' }];

  const context = buildRecommendationInputs(snapshot, plan, sessions, { confidence_label: 'early-signal' }, { status: 'limited' }, {
    transfer_strength_status: 'weak',
    reflection_quality_status: 'improving',
    cross_source_disagreement_present: true,
    evidence_sufficiency_status: 'limited',
  });

  const payload = generateRecommendations({ child_id: 'child-p11-rec', ...context });
  const types = new Set(payload.recommendations.map((entry) => entry.type));
  assert.ok(types.has('reduce_transfer_task_complexity'));
  assert.ok(types.has('increase_child_autonomy_gradually'));
  assert.ok(types.has('improve_observation_consistency_before_strong_interpretation'));
  assert.ok(types.has('continue_routine_before_stronger_conclusion'));
});

test('phase11 readiness includes developmental check-in sufficiency and cross-source agreement', () => {
  const readiness = evaluateInterventionReadiness({
    checkin_context: {
      history_count: 2,
      consistency_status: 'limited',
      traceability_status: 'sufficient',
      cross_source_agreement_status: 'limited',
    },
  }, { committed_days_per_week: 3 }, [
    { full_session_completed: true },
    { full_session_completed: true },
    { full_session_completed: false },
  ]);

  assert.equal(readiness.readiness_status, 'partially_ready');
  assert.equal(readiness.readiness_checks.development_checkin_history_presence, true);
  assert.equal(readiness.readiness_checks.development_checkin_consistency, false);
  assert.equal(readiness.readiness_checks.cross_source_agreement, false);
  assert.ok(readiness.reasons.includes('development_checkin_consistency_required'));
  assert.ok(readiness.reasons.includes('cross_source_agreement_required'));
});

test('phase11 additive endpoints and live youth v1 route safety', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const childId = 'child-p11-routes';
    const checkinSummary = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin-summary/${childId}`);
    assert.equal(checkinSummary.status, 200);
    const checkinSummaryPayload = await checkinSummary.json();
    assert.equal(checkinSummaryPayload.ok, true);

    const readiness = await fetch(`${app.baseUrl}/api/youth-development/tde/readiness/${childId}`);
    assert.equal(readiness.status, 200);

    const recommendations = await fetch(`${app.baseUrl}/api/youth-development/tde/recommendations/${childId}`);
    assert.equal(recommendations.status, 200);

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
