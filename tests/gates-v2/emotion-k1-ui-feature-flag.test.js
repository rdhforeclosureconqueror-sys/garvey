'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { FLAG, enabled, createGatesV2PilotUiRouter } = require('../../server/gatesV2PilotUiRoute');

test('UI pilot feature flag defaults off', () => { assert.equal(FLAG, 'gates_emotion_k1_ui_pilot_v1'); assert.equal(enabled({}), false); });

async function serve(env, path) {
  const app = express(); app.use(express.json()); app.use('/gates-v2-child', createGatesV2PilotUiRouter({ env }));
  const server = app.listen(0); await new Promise((resolve) => server.once('listening', resolve));
  try { return await fetch(`http://127.0.0.1:${server.address().port}${path}`, { redirect: 'manual' }); } finally { server.close(); }
}

test('disabled and unauthorized routes fail closed while owner token establishes protected access', async () => {
  assert.equal((await serve({}, '/gates-v2-child/')).status, 404);
  const env = { GATES_EMOTION_K1_UI_PILOT_V1: 'true', GATES_EMOTION_K1_UI_PILOT_OWNER_TOKEN: 'owner-secret' };
  assert.equal((await serve(env, '/gates-v2-child/')).status, 404);
  const authorized = await serve(env, '/gates-v2-child/?pilot_token=owner-secret');
  assert.equal(authorized.status, 303); assert.match(authorized.headers.get('set-cookie'), /HttpOnly/); assert.equal(authorized.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
});
