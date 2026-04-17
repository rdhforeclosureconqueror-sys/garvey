const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');

const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');
const { createYouthDevelopmentIntakeRouter } = require('../../server/youthDevelopmentIntakeRoutes');

function mountApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter());
  app.use('/api/youth-development/intake', createYouthDevelopmentIntakeRouter());
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

test('live youth v1 intake route remains unchanged', async () => {
  const app = mountApp();
  try {
    const response = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.contract_type, 'trait_mapping');
    assert.equal(payload.calibration_version, 'tde-calibration-v0');
  } finally {
    await app.close();
  }
});
