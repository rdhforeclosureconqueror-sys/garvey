'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { changeChildConsent, resolveStoredChildConsent } = require('../learning-science/childConsentRepository');
const { CHILD_LEARNING_CONSENT_SQL } = require('../learning-science/childConsentSchema');
const { verifyLearningHistoryConsent } = require('../learning-science/verifyLearningHistoryConsent');

const actor = { authenticated: true, authUserId: 101, parentProfile: { id: 201 } };
const ownedChild = { ok: true, learnerId: '301', row: { id: 301, parent_id: 201 } };

function transactionMock({ ownerExists = true, auditFailure = false } = {}) {
  const calls = [];
  let released = false;
  const client = {
    async query(sql, args) {
      calls.push({ sql, args });
      if (/^SELECT id FROM gates_child_profiles/.test(sql)) {
        return ownerExists ? { rowCount: 1, rows: [{ id: 301 }] } : { rowCount: 0, rows: [] };
      }
      if (/^INSERT INTO garvey_child_learning_consent_audit/.test(sql) && auditFailure) throw Error('audit unavailable');
      if (/^INSERT INTO garvey_child_learning_consent/.test(sql)) {
        return { rows: [{ status: args[4] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release() { released = true; },
  };
  return { pool: { connect: async () => client }, calls, get released() { return released; } };
}

test('grant and withdrawal lock an owned child and atomically audit every change', async () => {
  for (const [action, expected] of [['grant','granted'], ['withdraw','revoked']]) {
    const mock = transactionMock();
    const result = await changeChildConsent({ pool: mock.pool, actor, ownedChild, caregiverActionVerified: true, action });
    assert.equal(result.status, expected);
    assert.equal(mock.calls[0].sql, 'BEGIN');
    assert.deepEqual(mock.calls[1].args, ['301', '201']);
    assert.match(mock.calls[2].sql, /ON CONFLICT/);
    assert.deepEqual(mock.calls[2].args, ['201','301','child_learning_history','child-learning-history-v1',expected]);
    assert.deepEqual(mock.calls[3].args, ['201','301','101','child_learning_history','child-learning-history-v1',expected]);
    assert.equal(mock.calls[4].sql, 'COMMIT');
    assert.equal(mock.released, true);
  }
});

test('rejects missing caregiver action, parent auth, and cross-child context before DB access', async () => {
  const pool = { connect: async () => { throw Error('database should not be reached'); } };
  for (const input of [
    { caregiverActionVerified: false },
    { actor: { ...actor, authenticated: false } },
    { ownedChild: { ...ownedChild, row: { ...ownedChild.row, parent_id: 202 } } },
    { ownedChild: { ...ownedChild, learnerId: '302' } },
  ]) {
    await assert.rejects(changeChildConsent({
      pool, actor, ownedChild, caregiverActionVerified: true, action: 'grant', ...input,
    }), /verified caregiver|ownership mismatch/);
  }
});

test('ownership change rolls back and does not insert consent', async () => {
  const mock = transactionMock({ ownerExists: false });
  await assert.rejects(changeChildConsent({ pool: mock.pool, actor, ownedChild, caregiverActionVerified: true, action: 'grant' }), /ownership not verified/);
  assert.deepEqual(mock.calls.map(c => c.sql), ['BEGIN','SELECT id FROM gates_child_profiles WHERE id = $1 AND parent_id = $2 FOR UPDATE','ROLLBACK']);
  assert.equal(mock.released, true);
});

test('audit failure rolls back state write and releases connection', async () => {
  const mock = transactionMock({ auditFailure: true });
  await assert.rejects(changeChildConsent({ pool: mock.pool, actor, ownedChild, caregiverActionVerified: true, action: 'withdraw' }), /audit unavailable/);
  assert.equal(mock.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(mock.released, true);
});

test('read resolver scopes by canonical parent and child, and returns no consent for missing row', async () => {
  const seen = [];
  const pool = { query: async (sql, args) => {
    seen.push({ sql, args });
    return { rows: [] };
  } };
  assert.equal(await resolveStoredChildConsent({ pool, parentProfileId: '201', learnerId: '301' }), null);
  assert.match(seen[0].sql, /c.parent_id = g.parent_profile_id/);
  assert.deepEqual(seen[0].args, ['201','301','child_learning_history']);
  assert.doesNotMatch(seen[0].sql, /first_name|learner_response/);
});

test('withdrawn consent is rejected by existing consent policy', async () => {
  const pool = { query: async () => ({ rows: [{
    parent_profile_id: '201', learner_id: '301', purpose: 'child_learning_history',
    version: 'child-learning-history-v1', status: 'revoked',
    granted_at: new Date('2026-01-01T00:00:00Z'),
    revoked_at: new Date('2026-11-16T12:00:00Z'),
  }] }) };
  const result = await resolveStoredChildConsent({ pool, parentProfileId: '201', learnerId: '301' });
  assert.equal(verifyLearningHistoryConsent(result, { parentId:'201', learnerId:'301', at:'2026-11-16T13:00:00Z' }), false);
});

test('schema is additive but not registered in runtime migrations', () => {
  assert.ok(CHILD_LEARNING_CONSENT_SQL.every(statement => /CREATE (TABLE|INDEX) IF NOT EXISTS/.test(statement)));
  assert.match(CHILD_LEARNING_CONSENT_SQL[0], /PRIMARY KEY \(parent_profile_id, learner_id, purpose\)/);
  assert.match(CHILD_LEARNING_CONSENT_SQL[1], /auth_user_id/);
});
