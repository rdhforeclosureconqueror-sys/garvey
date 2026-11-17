'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { getLearningHistory, opaqueLearnerRef, projectHistoryRows } = require('../learning-science/getLearningHistory');

const secret = 'server-test-key-do-not-use-in-production-1234567890';
const actor = { authenticated: true, authUserId: 101, parentProfile: { id: 201 } };
const ownedChild = { ok: true, learnerId: '301', row: { id: 301, parent_id: 201 } };
const consent = {
  purpose: 'child_learning_history', version: 'child-learning-history-v1',
  status: 'granted', parent_profile_id: '201', learner_id: '301',
  granted_at: '2026-01-01T00:00:00Z',
};
const resolveConsent = async () => consent;
const row = { session_id: 'amvp_demo', session_version: 'v4', assessment_role: 'baseline',
  grade: 3, subject: 'Math', completed_at: '2026-11-16T20:00:00Z',
  item_identity: 'item_01', package_id: 'g3.math.equal_groups', score_status: 'correct', scored: true };

test('feature is disabled by default and never touches database', async () => {
  const pool = { query: () => { throw Error('unexpected query'); } };
  assert.deepEqual(await getLearningHistory({ pool, actor, ownedChild, secret }), { enabled: false, history: [] });
});

test('read-only query scopes actor, parent and learner and excludes raw answers', async () => {
  let calls = 0;
  const pool = { query: async (sql, args) => {
    calls += 1;
    assert.match(sql, /s.auth_user_id = \$1/);
    assert.match(sql, /s.parent_profile_id = \$2/);
    assert.match(sql, /s.learner_id = \$3/);
    assert.match(sql, /c.parent_id = s.parent_profile_id/);
    assert.match(sql, /s.status = 'completed'/);
    assert.doesNotMatch(sql, /learner_response|normalized_response|first_name/);
    assert.deepEqual(args, ['101','201','301',100]);
    return { rows: [row, { ...row, item_identity: 'item_02', score_status: 'incorrect', scored: true }] };
  } };
  const output = await getLearningHistory({ pool, actor, ownedChild, secret, enabled: true, resolveConsent });
  assert.equal(calls, 1);
  assert.equal(output.history.length, 2);
  assert.deepEqual(output.history.map(e => e.result.correct), [true, false]);
  assert.equal(output.history[0].support.type, 'other');
  assert.equal(output.history[0].attempt_type, 'baseline');
  assert.ok(output.history[0].learner_ref.startsWith('learner_'));
  assert.ok(output.history[0].event_id.startsWith('history_'));
  assert.notEqual(output.history[0].event_id, output.history[1].event_id);
  assert.equal(JSON.stringify(output).includes('301'), false);
});

test('rejects missing parent authorization and cross-parent child context before any query', async () => {
  const pool = { query: async () => { throw Error('must not query'); } };
  await assert.rejects(getLearningHistory({ pool, actor: { ...actor, authenticated: false }, ownedChild, secret, enabled: true, resolveConsent }), /authenticated parent/);
  await assert.rejects(getLearningHistory({ pool, actor, ownedChild: { ...ownedChild, row: { parent_id: 202 } }, secret, enabled: true, resolveConsent }), /ownership mismatch/);
  await assert.rejects(getLearningHistory({ pool, actor, ownedChild: { ...ownedChild, ok: false }, secret, enabled: true, resolveConsent }), /verified owned child/);
});

test('pseudonyms are stable per child and different across parent or child', () => {
  const ref = opaqueLearnerRef({ secret, learnerId: '301', parentId: '201' });
  assert.equal(ref, opaqueLearnerRef({ secret, learnerId: '301', parentId: '201' }));
  assert.notEqual(ref, opaqueLearnerRef({ secret, learnerId: '302', parentId: '201' }));
  assert.notEqual(ref, opaqueLearnerRef({ secret, learnerId: '301', parentId: '202' }));
  assert.throws(() => opaqueLearnerRef({ secret: 'weak', learnerId: '301', parentId: '201' }), /32 bytes/);
});

test('projection fails closed on unexpected statuses or inconsistent scored flags', () => {
  assert.throws(() => projectHistoryRows([{ ...row, score_status: 'unknown_item' }], { learnerRef: 'learner_demo123456', secret }), /unknown score status/);
  assert.throws(() => projectHistoryRows([{ ...row, score_status: 'correct', scored: false }], { learnerRef: 'learner_demo123456', secret }), /contradictory/);
  const skipped = projectHistoryRows([{ ...row, score_status: 'omitted', scored: false }], { learnerRef: 'learner_demo123456', secret });
  assert.deepEqual(skipped[0].result, { completion_status: 'not_completed' });
});

test('history caps result size and requires server-only pseudonymization secret', async () => {
  const pool = { query: async () => ({ rows: [] }) };
  await assert.rejects(getLearningHistory({ pool, actor, ownedChild, secret, enabled: true, resolveConsent, limit: 201 }), /limit/);
  await assert.rejects(getLearningHistory({ pool, actor, ownedChild, secret: 'short', enabled: true, resolveConsent }), /32 bytes/);
});

test('history refuses incomplete ownership proof and mismatched canonical child id', async () => {
  const pool = { query: async () => { throw Error('must not query'); } };
  await assert.rejects(
    getLearningHistory({ pool, actor, ownedChild: { ok: true, learnerId: '301' }, secret, enabled: true, resolveConsent }),
    /verified owned child/
  );
  await assert.rejects(
    getLearningHistory({ pool, actor, ownedChild: { ok: true, learnerId: '302', row: { id: 301, parent_id: 201 } }, secret, enabled: true, resolveConsent }),
    /ownership mismatch/
  );
});

test('history fails closed on duplicate item entries and missing assessment version', () => {
  assert.throws(() => projectHistoryRows([row, row], { learnerRef: 'learner_demo123456', secret }), /duplicate history event/);
  assert.throws(() => projectHistoryRows([{ ...row, session_version: '' }], { learnerRef: 'learner_demo123456', secret }), /missing assessment version/);
  assert.throws(() => projectHistoryRows([row], { learnerRef: 'learner_demo123456', secret: '' }), /pseudonymization key/);
});

test('history access is blocked without a trusted consent resolver', async () => {
  const pool = { query: async () => { throw Error('should not query'); } };
  await assert.rejects(getLearningHistory({ pool, actor, ownedChild, secret, enabled: true }), /consent resolver required/);
});

test('missing, withdrawn and different-child caregiver consent cannot reach history query', async () => {
  const pool = { query: async () => { throw Error('should not query'); } };
  for (const record of [null, { ...consent, status: 'revoked' }, { ...consent, learner_id: '302' },
    { ...consent, purpose: 'business_only_required' }, { ...consent, revoked_at: '2026-02-01T00:00:00Z' }]) {
    const outcome = await getLearningHistory({ pool, actor, ownedChild, secret, enabled: true, resolveConsent: async () => record });
    assert.deepEqual(outcome, { enabled: false, history: [], reason: 'caregiver_consent_required' });
  }
});
