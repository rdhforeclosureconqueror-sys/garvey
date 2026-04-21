const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentIntakeRouter } = require('../../server/youthDevelopmentIntakeRoutes');
const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  app.use('/api/youth-development/intake', createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  return {
    baseUrl,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const pipelinePayload = {
  child_id: 'child-1',
  session_id: 'sess-1',
  evidence: [
    { evidence_id: 'e1', source_type: 'task_event', source_id: 'task-a', signal_type: 'strategy_use_presence', value: 1, trait_code: 'SR' },
    { evidence_id: 'e2', source_type: 'observation', source_id: 'teacher-1', signal_type: 'context_consistency', value: 3, value_max: 4, trait_code: 'SR' },
  ],
};

test('extension routes are feature-gated by default', async () => {
  delete process.env.TDE_EXTENSION_MODE;
  const app = mountApp();
  try {
    const response = await fetch(`${app.baseUrl}/api/youth-development/tde/pipeline/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pipelinePayload),
    });
    assert.equal(response.status, 404);
  } finally {
    await app.close();
  }
});

test('extension pipeline endpoint deterministic and contracts endpoint available when enabled', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const contracts = await fetch(`${app.baseUrl}/api/youth-development/tde/contracts/trait-mapping`);
    assert.equal(contracts.status, 200);

    const run1 = await fetch(`${app.baseUrl}/api/youth-development/tde/pipeline/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pipelinePayload),
    });
    const run2 = await fetch(`${app.baseUrl}/api/youth-development/tde/pipeline/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pipelinePayload),
    });
    const p1 = await run1.json();
    const p2 = await run2.json();
    assert.deepEqual(p1, p2);
    assert.equal(p1.ok, true);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('phase-3 program endpoints expose deterministic rail and allow extension enrollment/progress', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const phasesRes = await fetch(`${app.baseUrl}/api/youth-development/tde/program/phases`);
    const phases = await phasesRes.json();
    assert.equal(phasesRes.status, 200);
    assert.equal(phases.phases.length, 3);

    const weeksRes = await fetch(`${app.baseUrl}/api/youth-development/tde/program/weeks`);
    const weeks = await weeksRes.json();
    assert.equal(weeksRes.status, 200);
    assert.equal(weeks.weeks.length, 36);

    const week1Res = await fetch(`${app.baseUrl}/api/youth-development/tde/program/weeks/1`);
    const week1 = await week1Res.json();
    assert.equal(week1Res.status, 200);
    assert.equal(week1.week.week_number, 1);
    assert.equal(week1.week.checkpoint_flag, true);

    const checkpointsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/program/checkpoints`);
    const checkpoints = await checkpointsRes.json();
    assert.equal(checkpointsRes.status, 200);
    assert.deepEqual(checkpoints.checkpoints.map((entry) => entry.week_number), [1, 12, 24, 36]);

    const enrollmentRes = await fetch(`${app.baseUrl}/api/youth-development/tde/program/enroll`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        child_id: 'child-phase3-1',
        child_profile_tde: { child_id: 'child-phase3-1', profile_version: 'phase3-v1' },
        active_domain_interests: ['quant_reasoning'],
        current_trait_targets: ['SR', 'PS'],
        current_environment_targets: ['home_routine'],
      }),
    });
    const enrollment = await enrollmentRes.json();
    assert.equal(enrollmentRes.status, 200);
    assert.equal(enrollment.ok, true);

    const progressRes = await fetch(`${app.baseUrl}/api/youth-development/tde/program/progress`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        enrollment_id: enrollment.enrollment.enrollment_id,
        child_id: 'child-phase3-1',
        week_number: 12,
        completion_status: 'complete',
        trait_signal_summary: { SR: 0.61 },
      }),
    });
    const progress = await progressRes.json();
    assert.equal(progressRes.status, 200);
    assert.equal(progress.ok, true);
    assert.equal(progress.progress.week_number, 12);
    assert.equal(progress.progress.checkpoint_record.week_number, 12);
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});

test('live youth v1 routes remain unchanged', async () => {
  const app = mountApp();
  try {
    const intakeResponse = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intakeResponse.status, 200);
    const intakePayload = await intakeResponse.json();
    assert.equal(intakePayload.ok, true);
    assert.equal(intakePayload.contract_type, 'trait_mapping');
    assert.equal(intakePayload.calibration_version, 'tde-calibration-v0');

    const assessResponse = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessResponse.status, 200);
    const assessPayload = await assessResponse.json();
    assert.equal(assessPayload.ok, true);
    assert.ok(Array.isArray(assessPayload.aggregated_trait_rows));
  } finally {
    await app.close();
  }
});

test('voice asset resolution endpoint exists and validates required asset_ref', async () => {
  process.env.TDE_EXTENSION_MODE = 'on';
  const app = mountApp();
  try {
    const missingRef = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/assets/resolve`);
    assert.equal(missingRef.status, 400);
    const missingPayload = await missingRef.json();
    assert.equal(missingPayload.error, 'asset_ref_required');

    const unresolved = await fetch(`${app.baseUrl}/api/youth-development/tde/voice/assets/resolve?child_id=child-1&asset_ref=asset%3A%2F%2Fvoice%2Fabc`);
    assert.equal(unresolved.status, 200);
    const unresolvedPayload = await unresolved.json();
    assert.equal(unresolvedPayload.ok, false);
    assert.equal(typeof unresolvedPayload.asset_ref, 'string');
  } finally {
    await app.close();
    delete process.env.TDE_EXTENSION_MODE;
  }
});
