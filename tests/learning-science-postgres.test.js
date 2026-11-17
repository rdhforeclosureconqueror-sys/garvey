'use strict';

// Runs ONLY when GARVEY_TEST_DATABASE_URL points to an isolated test PostgreSQL.
// Never use a production database. CI uses a disposable postgres service.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { CHILD_LEARNING_CONSENT_SQL } = require('../learning-science/childConsentSchema');
const { changeChildConsent, resolveStoredChildConsent } = require('../learning-science/childConsentRepository');
const { verifyLearningHistoryConsent } = require('../learning-science/verifyLearningHistoryConsent');

const url = process.env.GARVEY_TEST_DATABASE_URL;
const allow = process.env.GARVEY_ALLOW_DISPOSABLE_PG_TEST === 'yes';
const isLocal = (() => {
  try { return ['localhost','127.0.0.1','::1'].includes(new URL(url).hostname); }
  catch { return false; }
})();
test('PostgreSQL: isolated scoped grant/withdraw/rollback contract', { skip: !(allow && isLocal) }, async () => {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000 });
  const client = await pool.connect();
  const schema = 'garvey_consent_ci_' + crypto.randomBytes(6).toString('hex');
  const actor = { authenticated: true, authUserId: 901, parentProfile: { id: 201 } };
  const child = { ok: true, learnerId: '301', row: { id: 301, parent_id: 201 } };
  // Do not release this dedicated connection until schema teardown.
  const scopedPool = {
    connect: async () => ({ query: (...args) => client.query(...args), release() {} }),
    query: (...args) => client.query(...args),
  };
  try {
    await client.query('CREATE SCHEMA ' + schema);
    await client.query('SET search_path TO ' + schema);
    await client.query('CREATE TABLE gates_parent_profiles(id BIGINT PRIMARY KEY)');
    await client.query('CREATE TABLE gates_child_profiles(id BIGINT PRIMARY KEY, parent_id BIGINT NOT NULL REFERENCES gates_parent_profiles(id))');
    for (const sql of CHILD_LEARNING_CONSENT_SQL) await client.query(sql);
    await client.query('INSERT INTO gates_parent_profiles(id) VALUES (201),(202)');
    await client.query('INSERT INTO gates_child_profiles(id,parent_id) VALUES (301,201),(302,202)');
    const opts = { pool: scopedPool, actor, ownedChild: child, caregiverActionVerified: true };
    const granted = await changeChildConsent({ ...opts, action: 'grant' });
    assert.equal(granted.status, 'granted');
    let stored = await resolveStoredChildConsent({ pool: scopedPool, parentProfileId: 201, learnerId: 301 });
    assert.equal(verifyLearningHistoryConsent(stored, { parentId: 201, learnerId: 301 }), true);
    assert.equal(await resolveStoredChildConsent({ pool: scopedPool, parentProfileId: 202, learnerId: 301 }), null);
    assert.equal((await changeChildConsent({ ...opts, action: 'withdraw' })).status, 'revoked');
    stored = await resolveStoredChildConsent({ pool: scopedPool, parentProfileId: 201, learnerId: 301 });
    assert.equal(verifyLearningHistoryConsent(stored, { parentId: 201, learnerId: 301 }), false);
    const audit = await client.query('SELECT action FROM garvey_child_learning_consent_audit ORDER BY id ASC');
    assert.deepEqual(audit.rows.map(r => r.action), ['granted','revoked']);
    // If audit is unavailable, the state change must roll back too.
    await client.query('DROP TABLE garvey_child_learning_consent_audit');
    await assert.rejects(changeChildConsent({ ...opts, action: 'grant' }), /garvey_child_learning_consent_audit/);
    stored = await resolveStoredChildConsent({ pool: scopedPool, parentProfileId: 201, learnerId: 301 });
    assert.equal(stored.status, 'revoked');
  } finally {
    try {
      await client.query('SET search_path TO public');
      await client.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
    } finally {
      client.release();
      await pool.end();
    }
  }
});
