const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { createYouthDevelopmentRouter, INTAKE_TEST_FIXTURE } = require('../../server/youthDevelopmentRoutes');
const { createYouthDevelopmentIntakeRouter } = require('../../server/youthDevelopmentIntakeRoutes');

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(createYouthDevelopmentRouter());
  app.use('/api/youth-development/intake', createYouthDevelopmentIntakeRouter());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
  };
}

test('GET /youth-development/intake/test renders internal helpers for repeat testing and keeps endpoint wiring', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/youth-development/intake/test`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/);

    const html = await response.text();
    assert.match(html, /Internal \/ preview \/ test-only UI\./);
    assert.match(html, /class="intro-header"/);
    assert.match(html, /One-click verify/);
    assert.match(html, /Visible confidence/);
    assert.match(html, /Permission required before test start/);
    assert.match(html, /id="consentCheck"/);
    assert.match(html, /id="consentAcceptButton"/);
    assert.match(html, /id="consentDeclineButton"/);
    assert.match(html, /id="consentStatus"/);
    assert.match(html, /id="runTestButton"[^>]*>Run Test<\/button>/);
    assert.match(html, /id="presetStrongButton"/);
    assert.match(html, /id="presetSupportButton"/);
    assert.match(html, /id="presetLowConfidenceButton"/);
    assert.match(html, /id="resetPayloadButton"/);
    assert.match(html, /\/api\/youth-development\/intake\/task-session/);
    assert.match(html, /id="statusText"/);
    assert.match(html, /id="statusNote"/);
    assert.match(html, /id="traitSummaryBlock"/);
    assert.match(html, /id="traitSummaryCount"/);
    assert.match(html, /id="traitSummaryTop"/);
    assert.match(html, /id="traitSummaryLowConfidence"/);
    assert.match(html, /id="traitRows"/);
    assert.match(html, /id="dashboardSummary"/);
    assert.match(html, /id="pageModelSummary"/);
    assert.match(html, /id="rawJson"/);
    assert.match(html, /Raw JSON response \(expand\/collapse\)/);
    assert.match(html, /"schema_version": "1\.0"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('known-good fixture posts successfully to intake endpoint used by test page and supports visible output sections', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const pageResponse = await fetch(`${baseUrl}/youth-development/intake/test`);
    assert.equal(pageResponse.status, 200);
    const html = await pageResponse.text();
    assert.match(html, /function renderTraitRows/);
    assert.match(html, /function renderTraitSummary/);
    assert.match(html, /function renderSummaries/);
    assert.match(html, /function setTestingEnabled/);
    assert.match(html, /Accept permission before starting the test\./);
    assert.match(html, /const endpoint = "\/api\/youth-development\/intake\/task-session";/);

    const response = await fetch(`${baseUrl}/api/youth-development/intake/task-session`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(INTAKE_TEST_FIXTURE),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.mode, 'task_session');
    assert.ok(Array.isArray(payload.aggregated_trait_rows));
    assert.ok(payload.dashboard && typeof payload.dashboard === 'object');
    assert.ok(payload.page_model && typeof payload.page_model === 'object');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('existing youth preview routes remain available with test page route present', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const previewHtml = await fetch(`${baseUrl}/youth-development/parent-dashboard/preview`);
    assert.equal(previewHtml.status, 200);

    const previewJson = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/preview`);
    assert.equal(previewJson.status, 200);
    const payload = await previewJson.json();
    assert.equal(payload.preview, true);
    assert.equal(payload.test_only, true);
    assert.match((payload.notes || []).join(' '), /No database access\./);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /youth-development/intake renders live single-question parent-observation flow', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/youth-development/intake`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Youth Talent Development Intake — Parent Observation Screener v1/);
    assert.match(html, /Question 1 of 25/);
    assert.match(html, /Submit assessment/);
    assert.match(html, /Open Youth Parent Dashboard/);
    assert.match(html, /past 6 to 8 weeks/);
    assert.doesNotMatch(html, /JSON\.stringify\(payload, null, 2\)/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /youth-development/parent-dashboard renders live parent-facing dashboard shell', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/youth-development/parent-dashboard`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Youth Development Parent Dashboard/);
    assert.match(html, /sessionStorage\.getItem\("youthDevelopmentLatestAssessment"\)/);
    assert.match(html, /Take Youth Assessment/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
