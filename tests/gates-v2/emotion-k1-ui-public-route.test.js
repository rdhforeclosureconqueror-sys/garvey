'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createGatesV2ChildRouter } = require('../../server/gatesV2ChildUiRoute');

async function serve(path, options, routerOptions) {
  const app = express(); app.use('/gates-v2-child', createGatesV2ChildRouter(routerOptions));
  const server = app.listen(0); await new Promise((resolve) => server.once('listening', resolve));
  try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: 'manual', ...options }); } finally { server.close(); }
}

test('public child route and intended assets work without flag token auth or cookies', async () => {
  for (const path of ['/gates-v2-child/', '/gates-v2-child/emotion-k1.html', '/gates-v2-child/emotion-k1.css', '/gates-v2-child/emotion-k1.js']) {
    const response = await serve(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie'), null);
  }
  const tokenLike = await serve('/gates-v2-child/?access=owner-secret');
  assert.equal(tokenLike.status, 200);
  assert.equal(tokenLike.headers.get('set-cookie'), null);
});

test('unknown Gates V2 child paths and malformed requests fail safely', async () => {
  assert.equal((await serve('/gates-v2-child/not-here')).status, 404);
  const api = await serve('/gates-v2-child/api/not-here');
  assert.equal(api.status, 404);
  assert.deepEqual(await api.json(), { ok: false, error: 'That Gates V2 child path is not available.', message: 'Endpoint not found.' });
  const bad = await serve('/gates-v2-child/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { ok: false, error: 'That request could not be used. Please try again.', message: 'Invalid JSON request body.' });
});

test('Start Adventure endpoint always returns JSON for success and adapter failures', async () => {
  const response = await serve('/gates-v2-child/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  const payload = await response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.projection.gate_title, 'Emotion Gate');
  assert.equal(payload.projection.current_node.node_id, 'opening');

  const broken = await serve('/gates-v2-child/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, { adapter: { startExperience() { throw new Error('fixture unavailable'); } } });
  assert.equal(broken.status, 500);
  assert.match(broken.headers.get('content-type') || '', /application\/json/);
  assert.deepEqual(await broken.json(), { ok: false, error: 'The Emotion Gate could not start. Please try again.', message: 'fixture unavailable' });
});

test('static frontend directory has an index entrypoint for /gates-v2-child/', () => {
  const fs = require('node:fs');
  const index = fs.readFileSync('public/gates-v2-child/index.html', 'utf8');
  assert.match(index, /Emotion Gate Adventure/);
  assert.match(index, /\/gates-v2-child\/emotion-k1.css/);
  assert.match(index, /\/gates-v2-child\/emotion-k1.js/);
});
