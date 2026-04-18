const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const {
  generateDevelopmentCheckin,
  runDevelopmentCheckin,
} = require('../../youth-development/tde/developmentCheckinService');
const { validateDevelopmentCheckinContract } = require('../../youth-development/tde/developmentCheckinContract');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  const port = server.address().port;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test('phase12 weekly cadence and deterministic generation', () => {
  const w1 = generateDevelopmentCheckin({ child_id: 'child-p12', program_week: 1, age_band: '8-10' });
  const w2 = generateDevelopmentCheckin({ child_id: 'child-p12', program_week: 2, age_band: '8-10' });
  assert.equal(w1.checkin_due, true);
  assert.equal(w2.checkin_due, true);
  assert.equal(w1.cadence_weeks, 1);
  assert.deepEqual(w2, generateDevelopmentCheckin({ child_id: 'child-p12', program_week: 2, age_band: '8-10' }));
});

test('phase12 contract validation valid + invalid and no quiz outputs', () => {
  const checkin = generateDevelopmentCheckin({ child_id: 'child-p12-contract', program_week: 6 });
  const valid = validateDevelopmentCheckinContract({
    checkin,
    evidence_map: [
      { evidence_id: 'e1', trace_ref: 't1', source_type: 'development_checkin', source_id: 'child:c1', source_actor: 'child', prompt_type: 'performance', raw_response: 'I used one plan and adjusted once.' },
      { evidence_id: 'e2', trace_ref: 't2', source_type: 'development_checkin', source_id: 'parent:p1', source_actor: 'parent', prompt_type: 'observation', raw_response: 'I saw consistent effort.' },
    ],
  });
  assert.equal(valid.ok, true);

  const invalid = validateDevelopmentCheckinContract({
    checkin,
    evidence_map: [
      { evidence_id: 'e1', trace_ref: 't1', source_type: 'development_checkin', source_id: 'child:c1', source_actor: 'child', prompt_type: 'performance', raw_response: 'Correct answer: 4' },
    ],
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes('binary_correctness_language_detected'));
  assert.ok(invalid.errors.includes('minimum_two_evidence_sources_required'));
});

test('phase12 run enforces multi-source and non-overriding pipeline integration', async () => {
  const repository = {
    persistDevelopmentCheckin: async (record) => ({ ok: true, stored: record.checkin_id }),
  };
  const blueprint = generateDevelopmentCheckin({ child_id: 'child-p12-run', program_week: 4 });
  const result = await runDevelopmentCheckin({
    child_id: 'child-p12-run',
    program_week: 4,
    responses: {
      child: [
        { prompt_id: blueprint.prompts.performance_prompt.prompt_id, response_text: 'I used a timer and restarted after pause', value: 3 },
        { prompt_id: blueprint.prompts.reflection_prompt.prompt_id, response_text: 'I calmed down faster this time', value: 3 },
      ],
      parent: { parent_id: 'parent-12', response_text: 'Observed improved persistence at home', value: 3 },
    },
  }, repository);

  assert.equal(result.ok, true);
  assert.equal(result.pipeline_integration.non_override_policy, 'does_not_replace_session_or_intervention_evidence');
  assert.equal(result.checkin.pipeline_evidence_link.requires_additional_source_for_trait_scoring, true);
});

test('phase12 routes: weekly history, summary fields, voice schema, and v1 non-regression', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const childId = 'child-p12-routes';
    const blueprint = generateDevelopmentCheckin({ child_id: childId, program_week: 3 });

    const runRes = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        program_week: 3,
        responses: {
          child: [
            { prompt_id: blueprint.prompts.performance_prompt.prompt_id, response_text: 'I planned my first move.', value: 3 },
            { prompt_id: blueprint.prompts.reflection_prompt.prompt_id, response_text: 'I stayed focused longer.', value: 3 },
          ],
          parent: { parent_id: 'p12', response_text: 'Saw steady effort.', value: 3 },
        },
      }),
    });
    assert.equal(runRes.status, 200);

    const historyRes = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin/${childId}`);
    assert.equal(historyRes.status, 200);
    const history = await historyRes.json();
    assert.equal(history.checkins.length, 1);

    const summaryRes = await fetch(`${app.baseUrl}/api/youth-development/tde/checkin-summary/${childId}`);
    assert.equal(summaryRes.status, 200);
    const summary = await summaryRes.json();
    assert.ok(summary.consistency);
    assert.ok(summary.trend_signals);
    assert.ok(summary.confidence_contribution);
    assert.ok(Array.isArray(summary.missing_data_flags));

    const voiceContractRes = await fetch(`${app.baseUrl}/api/youth-development/tde/contracts/voice`);
    assert.equal(voiceContractRes.status, 200);

    const v1Res = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(v1Res.status, 200);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('phase12 voice fields exist and are valid on child-facing prompts', () => {
  const checkin = generateDevelopmentCheckin({ child_id: 'child-p12-voice', program_week: 8, age_band: '11-13' });
  const prompts = [
    checkin.prompts.performance_prompt,
    checkin.prompts.reflection_prompt,
    checkin.prompts.optional_transfer_prompt,
  ].filter(Boolean);

  for (const prompt of prompts) {
    assert.equal(typeof prompt.voice_ready, 'boolean');
    assert.equal(typeof prompt.voice_text, 'string');
    assert.ok(prompt.voice_text.length > 0);
    assert.ok(['short', 'medium'].includes(prompt.voice_pacing));
    assert.equal(typeof prompt.voice_chunk_id, 'string');
    assert.ok(prompt.voice_chunk_id.length > 0);
  }
});
