const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { generateDevelopmentCheckin } = require('../../youth-development/tde/developmentCheckinService');
const { validateDevelopmentCheckinContract } = require('../../youth-development/tde/developmentCheckinContract');
const { extractSignalsFromEvidence } = require('../../youth-development/tde/signalExtractionService');
const { scoreTraitsFromSignals } = require('../../youth-development/tde/traitScoringService');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  app.use('/api/youth-development', express.Router().get('/assess', (_req, res) => res.status(200).json({ ok: true })));
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('developmental check-in generation is deterministic and biweekly', () => {
  const payload = { child_id: 'child-p10', program_week: 10 };
  const first = generateDevelopmentCheckin(payload);
  const second = generateDevelopmentCheckin(payload);
  assert.deepEqual(first, second);
  assert.equal(first.checkin_due, true);

  const oddWeek = generateDevelopmentCheckin({ child_id: 'child-p10', program_week: 11 });
  assert.equal(oddWeek.checkin_due, false);
});

test('development check-in contract rejects invalid structure and quiz language', () => {
  const checkin = generateDevelopmentCheckin({ child_id: 'child-p10', program_week: 12 });
  checkin.prompts.performance_based_prompts[0].prompt_text = 'What is the right answer in this quiz?';

  const invalid = validateDevelopmentCheckinContract({
    checkin,
    evidence_map: [
      {
        evidence_id: 'e1',
        trace_ref: 't1',
        source_type: 'development_checkin',
        source_id: 'child:child-p10',
        source_actor: 'child',
      },
    ],
  });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes('developmental_language_violation'));
  assert.ok(invalid.errors.includes('minimum_two_evidence_sources_required'));
  assert.ok(invalid.errors.includes('multi_signal_capture_child_parent_required'));
});

test('check-in route enforces multi-source evidence and persists child history', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();

  try {
    const badRes = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-p10-route',
        program_week: 12,
        responses: {
          child: [{ prompt_id: generateDevelopmentCheckin({ child_id: 'child-p10-route', program_week: 12 }).prompts.performance_based_prompts[0].prompt_id, response_text: 'I stayed with a strategy', value: 3 }],
        },
      }),
    });
    assert.equal(badRes.status, 400);

    const blueprint = generateDevelopmentCheckin({ child_id: 'child-p10-route', program_week: 12 });
    const goodRes = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-p10-route',
        program_week: 12,
        completed_at: '2026-04-18T12:00:00.000Z',
        responses: {
          child: [
            { prompt_id: blueprint.prompts.performance_based_prompts[0].prompt_id, response_text: 'I planned before starting', value: 3 },
            { prompt_id: blueprint.prompts.reflection_prompts[0].prompt_id, response_text: 'I noticed better focus on the second try', value: 3 },
          ],
          parent: { parent_id: 'parent-1', response_text: 'Child used a plan with less reminding across home tasks', value: 3 },
        },
      }),
    });

    assert.equal(goodRes.status, 200);
    const goodPayload = await goodRes.json();
    assert.equal(goodPayload.ok, true);
    assert.equal(goodPayload.checkin.evidence_source_type, 'development_checkin');

    const historyRes = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin/child-p10-route`);
    assert.equal(historyRes.status, 200);
    const history = await historyRes.json();
    assert.equal(history.ok, true);
    assert.equal(history.checkins.length, 1);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('check-in evidence contributes confidence without forcing single-source trait update', () => {
  const checkin = generateDevelopmentCheckin({ child_id: 'child-p10-score', program_week: 12 });
  const evidence = [
    {
      evidence_id: 'dc-child-sr',
      source_type: 'development_checkin',
      source_id: 'child:child-p10-score',
      signal_type: 'strategy_use_presence',
      trait_code: 'SR',
      value: 1,
      confidence_weight: 0.7,
    },
    {
      evidence_id: 'dc-parent-sr',
      source_type: 'development_checkin',
      source_id: 'parent:parent-1',
      signal_type: 'context_consistency',
      trait_code: 'SR',
      value: 3,
      value_max: 4,
      confidence_weight: 0.75,
    },
    {
      evidence_id: 'dc-child-cq',
      source_type: 'development_checkin',
      source_id: 'child:child-p10-score',
      signal_type: 'inquiry_depth',
      trait_code: 'CQ',
      value: 3,
      value_max: 4,
      confidence_weight: 0.65,
    },
  ];

  const extraction = extractSignalsFromEvidence({
    child_id: checkin.child_id,
    session_id: checkin.checkin_id,
    evidence,
  });

  const scored = scoreTraitsFromSignals(extraction.extracted_signals);
  const sr = scored.trait_results.find((entry) => entry.trait_code === 'SR');
  const cq = scored.trait_results.find((entry) => entry.trait_code === 'CQ');

  assert.equal(sr.evidence_sufficiency_status, 'SUFFICIENT');
  assert.ok(sr.confidence_score > 0);
  assert.equal(cq.reported_trait_score, null);
  assert.equal(cq.evidence_sufficiency_status, 'INSUFFICIENT_SOURCE_DIVERSITY');
});

test('phase10 check-in endpoints are additive and v1 route remains accessible', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const contractRes = await fetch(`${app.baseUrl}/api/youth-development/tde/contracts/development-checkin`);
    assert.equal(contractRes.status, 200);

    const v1Res = await fetch(`${app.baseUrl}/api/youth-development/assess`);
    assert.equal(v1Res.status, 200);
    const v1Payload = await v1Res.json();
    assert.equal(v1Payload.ok, true);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});
