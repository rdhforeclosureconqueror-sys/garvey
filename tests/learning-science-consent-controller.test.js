'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createChildConsentController } = require('../learning-science/childConsentController');

const actor = { authenticated: true, authUserId: 101, parentProfile: { id: 201 } };
const child = { ok: true, learnerId: '301', row: { id: 301, parent_id: 201 } };
const expectedOrigin = 'https://garvey.example.test';
function rig({ enabled = true, session = actor, owned = child, csrf = true, consent = null } = {}) {
  const calls = [];
  const controller = createChildConsentController({
    pool: {},
    enabled,
    expectedOrigin,
    resolveParentSession: async () => { calls.push('session'); return session; },
    resolveOwnedChild: async ({ parentProfileId, childId }) => {
      calls.push('child');
      assert.equal(parentProfileId, 201);
      assert.equal(childId, '301');
      return owned;
    },
    verifyCsrf: async () => { calls.push('csrf'); return csrf; },
    changeConsent: async (input) => { calls.push('write'); return { status: input.action === 'grant' ? 'granted' : 'revoked', purpose: 'child_learning_history', version: 'child-learning-history-v1' }; },
    getConsent: async () => { calls.push('read'); return consent; },
  });
  const request = (action = 'grant') => ({
    params: { childId: '301' },
    headers: { origin: expectedOrigin, 'content-type': 'application/json' },
    body: { action, acknowledged: true },
  });
  return { controller, calls, request };
}

test('disabled controller returns not found without touching authentication or DB', async () => {
  const r = rig({ enabled: false });
  assert.deepEqual(await r.controller.mutate(r.request()), { status: 404, body: { ok: false, error: 'not_found' } });
  assert.deepEqual(r.calls, []);
});

test('authenticated and owned parent can grant and withdraw after CSRF verification', async () => {
  const r = rig();
  const grant = await r.controller.mutate(r.request());
  assert.equal(grant.status, 200);
  assert.equal(grant.body.status, 'granted');
  assert.deepEqual(r.calls, ['session', 'child', 'csrf', 'write']);
  r.calls.length = 0;
  const withdraw = await r.controller.mutate(r.request('withdraw'));
  assert.equal(withdraw.status, 200);
  assert.equal(withdraw.body.status, 'revoked');
  assert.deepEqual(r.calls, ['session', 'child', 'csrf', 'write']);
});

test('stale login and wrong-child ownership stop consent before any write', async () => {
  const stale = rig({ session: { authenticated: false } });
  assert.equal((await stale.controller.mutate(stale.request())).status, 401);
  assert.deepEqual(stale.calls, ['session']);
  const wrong = rig({ owned: { ok: false, status: 403 } });
  assert.equal((await wrong.controller.mutate(wrong.request())).status, 403);
  assert.deepEqual(wrong.calls, ['session', 'child']);
});

test('missing, foreign or malformed Origin cannot pass even with a valid cookie', async () => {
  for (const origin of [undefined, 'https://attacker.example', 'http://garvey.example.test', 'https://garvey.example.test.evil']) {
    const r = rig();
    const req = r.request();
    if (origin === undefined) delete req.headers.origin;
    else req.headers.origin = origin;
    const result = await r.controller.mutate(req);
    assert.equal(result.status, 403);
    assert.equal(result.body.error, 'invalid_origin');
    assert.equal(r.calls.includes('write'), false);
  }
});

test('CSRF verification and explicit acknowledgement are required before mutation', async () => {
  const invalid = rig({ csrf: false });
  const response = await invalid.controller.mutate(invalid.request());
  assert.equal(response.status, 403);
  assert.equal(invalid.calls.includes('write'), false);
  const unconfirmed = rig();
  const req = unconfirmed.request();
  req.body.acknowledged = false;
  const outcome = await unconfirmed.controller.mutate(req);
  assert.equal(outcome.status, 400);
  assert.equal(unconfirmed.calls.includes('write'), false);
});

test('disallows forms and invalid child IDs before modification', async () => {
  const r = rig();
  const form = r.request();
  form.headers['content-type'] = 'application/x-www-form-urlencoded';
  assert.equal((await r.controller.mutate(form)).status, 415);
  const bad = r.request();
  bad.params.childId = 'alice';
  assert.equal((await r.controller.mutate(bad)).status, 400);
  assert.equal(r.calls.includes('write'), false);
});

test('read resolves owned child but never exposes consent audit or raw records', async () => {
  const r = rig({ consent: {
    purpose: 'child_learning_history', version: 'child-learning-history-v1',
    status: 'granted', parent_profile_id: '201', learner_id: '301',
    granted_at: '2026-01-01T00:00:00Z', private_notes: 'do not expose',
  } });
  const response = await r.controller.read(r.request());
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true, consent_status: 'granted' });
  assert.equal(JSON.stringify(response).includes('private_notes'), false);
  assert.deepEqual(r.calls, ['session', 'child', 'read']);
});

test('controller fails configuration without independent CSRF verifier or HTTPS origin', () => {
  assert.throws(() => createChildConsentController({ resolveParentSession() {}, resolveOwnedChild() {}, expectedOrigin }), /verifyCsrf/);
  assert.throws(() => createChildConsentController({ resolveParentSession() {}, resolveOwnedChild() {}, verifyCsrf() {}, expectedOrigin: 'http://unsafe.test' }), /HTTPS/);
});
