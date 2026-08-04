'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createGatesV2ChildRouter } = require('../../server/gatesV2ChildUiRoute');

async function serve(path, options) {
  const app = express(); app.use('/gates-v2-child', createGatesV2ChildRouter());
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
  assert.deepEqual(await api.json(), { ok: false, error: 'That Gates V2 child path is not available.' });
  const bad = await serve('/gates-v2-child/api/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { ok: false, error: 'That request could not be used. Please try again.' });
});
