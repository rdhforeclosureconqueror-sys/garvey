const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { createYouthDevelopmentTdeRouter } = require('../../server/youthDevelopmentTdeRoutes');

function makeMemoryPersistence() {
  const state = {
    calibration_versions: [],
    signal_events: [],
    trait_score_traces: [],
    report_statement_traces: [],
    audit_log_events: [],
  };
  return {
    state,
    writeCalibrationVersion: async (entry) => state.calibration_versions.push(entry),
    writeSignalEvents: async ({ signals = [] }) => state.signal_events.push(...signals),
    writeTraitScoreTraces: async ({ rows = [] }) => state.trait_score_traces.push(...rows),
    writeReportStatementTraces: async ({ rows = [] }) => state.report_statement_traces.push(...rows),
    writeAuditLogEvents: async ({ events = [] }) => state.audit_log_events.push(...events),
  };
}

async function startServer() {
  const app = express();
  const persistence = makeMemoryPersistence();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter());
  app.use('/api/youth-development/tde', createYouthDevelopmentTdeRouter({ persistence }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  return { server, baseUrl: `http://127.0.0.1:${addr.port}`, persistence };
}

test('TDE extension routes mount additively and do not break baseline youth v1 route', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const health = await fetch(`${baseUrl}/api/youth-development/tde/health`);
    assert.equal(health.status, 200);

    const baseline = await fetch(`${baseUrl}/api/youth-development/questions`);
    assert.equal(baseline.status, 200);
    const body = await baseline.json();
    assert.equal(body.ok, true);
    assert.equal(body.question_count, 25);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('TDE contracts and feature-flags endpoints return extension contracts', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const contractsRes = await fetch(`${baseUrl}/api/youth-development/tde/contracts`);
    assert.equal(contractsRes.status, 200);
    const contracts = await contractsRes.json();
    assert.equal(contracts.ok, true);
    assert.ok(contracts.contracts.signal_schema);
    assert.ok(Array.isArray(contracts.missing_contracts));

    const flagsRes = await fetch(`${baseUrl}/api/youth-development/tde/feature-flags`);
    assert.equal(flagsRes.status, 200);
    const flags = await flagsRes.json();
    assert.equal(flags.ok, true);
    assert.equal(flags.feature_flags.trait_reporting_single_source_behavior, 'no_reported_score');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /signals/validate persists normalized signals and audit events in extension store', async () => {
  const { server, baseUrl, persistence } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/tde/signals/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        signals: [
          {
            signal_id: 'sig-1',
            trait_code: 'SR',
            signal_type: 'strategy_use_presence',
            normalized_value: 0.7,
            confidence_weight: 0.8,
            evidence_status_tag: 'RESEARCH_BACKED_CONSTRUCT',
            calibration_version: 'tde-calibration-v0',
            trace_ref: { x: 1 },
            dob: '2018-01-01',
            assessment_date: '2026-01-01T00:00:00.000Z',
            age_band: '13-15',
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(persistence.state.signal_events.length, 1);
    assert.equal(persistence.state.audit_log_events.length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('POST /trace/validate applies insufficient source-diversity default and persists both reported/internal rows', async () => {
  const { server, baseUrl, persistence } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/tde/trace/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        trace_ref: { run_id: 'r1' },
        calibration_version: 'tde-calibration-v0',
        trait_rows: [
          { trait_code: 'SR', source_types: ['task_event'], score: 50 },
          { trait_code: 'CQ', source_types: ['task_event', 'observation'], score: 78 },
        ],
      }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.trace.reported_trait_rows.length, 1);
    assert.equal(payload.trace.internal_partial_rows.length, 1);
    assert.equal(persistence.state.trait_score_traces.length, 2);
    assert.equal(persistence.state.audit_log_events.length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
