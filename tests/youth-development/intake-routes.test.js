const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');
const fs = require('node:fs');
const path = require('node:path');

const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { createYouthDevelopmentIntakeRouter } = require('../../server/youthDevelopmentIntakeRoutes');

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter());
  app.use(createYouthDevelopmentIntakeRouter());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
  };
}

function buildValidPayload() {
  return {
    schema_version: '1.0',
    session_id: 'session-1',
    child_id: 'child-1',
    submitted_at: '2026-03-01T12:00:00.000Z',
    task_results: [
      {
        task: {
          task_id: 'YT_B1_CQ_01',
          trait_code: 'CQ',
          task_class: 'SCT',
          expected_signal_types: ['inquiry_depth', 'justification_quality', 'decision_quality'],
          scoring_type: 'rubric',
          evidence_source: 'child_scenario',
        },
        raw_input: {
          timestamp: '2026-03-01T12:01:00.000Z',
          metrics: {
            inquiry_depth: 3,
            justification_quality: 3,
            decision_quality: 2,
          },
          measurement_window: 'current',
          is_current: true,
        },
      },
    ],
    options: {
      ignore_contaminated: true,
    },
  };
}

test('POST /api/youth-development/intake/task-session returns 200 with computed JSON for valid payload', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/intake/task-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildValidPayload()),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();

    assert.equal(payload.ok, true);
    assert.equal(payload.mode, 'task_session');
    assert.ok(payload.processed_signal_count > 0);
    assert.ok(Array.isArray(payload.aggregated_trait_rows));
    assert.ok(Array.isArray(payload.result.trait_profile));
    assert.equal(payload.metadata.session_id, 'session-1');
    assert.equal(payload.metadata.child_id, 'child-1');
    assert.equal(payload.result.generated_at, '2026-03-01T12:00:00.000Z');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/intake/task-session returns 400 for invalid payload shape', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/intake/task-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ schema_version: '1.0', task_results: {} }),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error, 'invalid_task_session_payload');
    assert.match(payload.validation_errors.join(' '), /task_results must be an array/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /api/youth-development/intake/task-session returns 400 for unsupported task_class/evidence_source', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const badPayload = buildValidPayload();
    badPayload.task_results[0].task.task_class = 'NOPE';
    badPayload.task_results[0].task.evidence_source = 'child_task';

    const response = await fetch(`${baseUrl}/api/youth-development/intake/task-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(badPayload),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error, 'invalid_task_session_payload');
    assert.match(payload.validation_errors.join(' '), /unsupported/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('contamination strict default is preserved (contaminated PRF-only signals do not survive aggregation)', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const payload = {
      schema_version: '1.0',
      session_id: 'session-sr',
      child_id: 'child-sr',
      submitted_at: '2026-03-01T12:00:00.000Z',
      task_results: [
        {
          task: {
            task_id: 'YT_B1_SR_01',
            trait_code: 'SR',
            task_class: 'PRF',
            expected_signal_types: ['rule_adherence', 'process_efficiency', 'completion_quality'],
            scoring_type: 'analytic',
            evidence_source: 'child_task',
          },
          raw_input: {
            timestamp: '2026-03-01T12:01:00.000Z',
            metrics: { rule_adherence: 8, process_efficiency: 7, completion_quality: 6 },
            measurement_window: 'current',
          },
        },
      ],
    };

    const response = await fetch(`${baseUrl}/api/youth-development/intake/task-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.processed_signal_count > 0, true);
    assert.deepEqual(body.aggregated_trait_rows, []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('intake implementation introduces no DB/storage behavior in intake route/adapter files', () => {
  const routeSource = fs.readFileSync(path.join(__dirname, '../../server/youthDevelopmentIntakeRoutes.js'), 'utf8');
  const adapterSource = fs.readFileSync(path.join(__dirname, '../../youth-development/intake/intakeAdapter.js'), 'utf8');

  assert.doesNotMatch(routeSource, /pool\.query|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i);
  assert.doesNotMatch(adapterSource, /pool\.query|INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM/i);
  assert.doesNotMatch(routeSource, /require\("\.\/db"\)|require\("\.\.\/server\/db"\)/);
  assert.doesNotMatch(adapterSource, /require\("\.\.\/\.\.\/server\/db"\)|require\("\.\.\/measurement\/db"\)/);
});

test('existing youth preview routes remain unchanged while intake route is added', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/preview`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.preview, true);
    assert.equal(payload.test_only, true);
    assert.match((payload.notes || []).join(' '), /No database access\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
