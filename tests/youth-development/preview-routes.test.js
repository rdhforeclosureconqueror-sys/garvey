const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const http = require('http');

const { createYouthDevelopmentRouter } = require('../../server/youthDevelopmentRoutes');
const { YOUTH_DEVELOPMENT_PARENT_SECTION_ORDER } = require('../../server/youthDevelopmentRenderer');

async function startServer() {
  const app = express();
  app.use(createYouthDevelopmentRouter());
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const addr = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
  };
}

test('GET /youth-development/parent-dashboard/preview returns deterministic HTML with safe preview labels', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/youth-development/parent-dashboard/preview`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/html/);

    const html = await response.text();
    assert.match(html, /<p class="preview-banner">Preview \/ test-only output \(deterministic fixture, no production data\)<\/p>/);
    assert.match(html, /Preview fixture only: this output is for renderer verification, not production interpretation\./);
    assert.match(html, /class="hero-panel"/);
    assert.match(html, /class="confidence-meter"/);
    assert.match(html, /Parent dashboard preview mode · isolated youth namespace/);

    const sectionMarkers = [
      '<h2>Overview</h2>',
      '<h2>Trait signals</h2>',
      '<h2>Current strengths</h2>',
      '<h2>Support next</h2>',
      '<h2>Evidence and confidence</h2>',
      '<h2>Next actions</h2>',
    ];

    const positions = sectionMarkers.map((marker) => html.indexOf(marker));
    for (const position of positions) {
      assert.notEqual(position, -1, `expected section marker to exist in preview HTML: ${position}`);
    }
    for (let idx = 1; idx < positions.length; idx += 1) {
      assert.ok(positions[idx - 1] < positions[idx], 'section order changed in preview HTML');
    }

    assert.ok(!html.includes('<script'), 'preview HTML should not contain raw script tags');
    assert.ok(!html.includes('javascript:'), 'preview HTML should not contain javascript URLs');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('GET /api/youth-development/parent-dashboard/preview returns deterministic JSON with section-order contract', async () => {
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/youth-development/parent-dashboard/preview`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/json/);

    const payload = await response.json();
    assert.equal(payload.preview, true);
    assert.equal(payload.test_only, true);
    assert.equal(payload.result.generated_at, '2026-01-01T00:00:00.000Z');
    assert.deepEqual(payload.page_model.rendering_safety.section_order, YOUTH_DEVELOPMENT_PARENT_SECTION_ORDER);

    assert.ok(Array.isArray(payload.notes));
    assert.match(payload.notes.join(' '), /Deterministic fixture data only\./);
    assert.match(payload.notes.join(' '), /No database access\./);

    assert.equal(typeof payload.page_model.hero_summary.overview_text, 'string');
    assert.ok(payload.page_model.hero_summary.overview_text.length > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
