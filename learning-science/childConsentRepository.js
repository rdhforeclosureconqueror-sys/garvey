'use strict';

// Server-only repository contract. Not mounted, called, or migrated in production.
// Trusted caller MUST resolve authenticated parent, owned canonical child and
// an explicit caregiver action prior to invoking grant/withdraw.
const { PURPOSE, VERSION } = require('./verifyLearningHistoryConsent');

function pos(value, label) {
  const id = String(value ?? '');
  if (!/^[1-9][0-9]*$/.test(id)) throw new TypeError('invalid ' + label);
  return id;
}
function context(input) {
  if (!input || !input.actor || input.actor.authenticated !== true ||
      !input.actor.parentProfile || !input.ownedChild || input.ownedChild.ok !== true ||
      !input.ownedChild.row || input.caregiverActionVerified !== true) {
    throw new TypeError('verified caregiver action and owned child required');
  }
  const authId = pos(input.actor.authUserId, 'auth user');
  const parentId = pos(input.actor.parentProfile.id, 'parent');
  const learnerId = pos(input.ownedChild.learnerId, 'learner');
  if (pos(input.ownedChild.row.id, 'canonical learner') !== learnerId ||
      pos(input.ownedChild.row.parent_id, 'canonical parent') !== parentId) {
    throw new TypeError('child ownership mismatch');
  }
  return { authId, parentId, learnerId };
}

async function changeChildConsent({ pool, actor, ownedChild, caregiverActionVerified = false, action } = {}) {
  if (!pool || typeof pool.connect !== 'function') throw new TypeError('transactional pool required');
  if (action !== 'grant' && action !== 'withdraw') throw new TypeError('invalid consent action');
  const { authId, parentId, learnerId } = context({ actor, ownedChild, caregiverActionVerified });
  const client = await pool.connect();
  let began = false;
  try {
    await client.query('BEGIN');
    began = true;
    // Lock the canonical child row. Ownership must still be correct at commit time.
    const match = await client.query(
      'SELECT id FROM gates_child_profiles WHERE id = $1 AND parent_id = $2 FOR UPDATE',
      [learnerId, parentId]
    );
    if (match.rowCount !== 1) throw new TypeError('canonical child ownership not verified');
    const status = action === 'grant' ? 'granted' : 'revoked';
    const result = await client.query(
      `INSERT INTO garvey_child_learning_consent
         (parent_profile_id, learner_id, purpose, version, status, granted_at, revoked_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,
         CASE WHEN $5 = 'granted' THEN NOW() ELSE NULL END,
         CASE WHEN $5 = 'revoked' THEN NOW() ELSE NULL END, NOW())
       ON CONFLICT (parent_profile_id,learner_id,purpose) DO UPDATE
         SET version = EXCLUDED.version,
             status = EXCLUDED.status,
             granted_at = CASE WHEN EXCLUDED.status = 'granted' THEN NOW()
                               ELSE garvey_child_learning_consent.granted_at END,
             revoked_at = CASE WHEN EXCLUDED.status = 'revoked' THEN NOW() ELSE NULL END,
             expires_at = NULL,
             updated_at = NOW()
       RETURNING parent_profile_id, learner_id, purpose, version, status, granted_at, revoked_at, expires_at`,
      [parentId, learnerId, PURPOSE, VERSION, status]
    );
    await client.query(
      `INSERT INTO garvey_child_learning_consent_audit
        (parent_profile_id, learner_id, auth_user_id, purpose, version, action)
        VALUES ($1,$2,$3,$4,$5,$6)`,
      [parentId, learnerId, authId, PURPOSE, VERSION, status]
    );
    await client.query('COMMIT');
    began = false;
    return { status: result.rows[0]?.status, purpose: PURPOSE, version: VERSION };
  } catch (error) {
    if (began) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Do not expose publicly. Caller-side authentication and active child lifecycle
// enforcement are still required; this is not a production consent endpoint.
async function resolveStoredChildConsent({ pool, parentProfileId, learnerId } = {}) {
  if (!pool || typeof pool.query !== 'function') throw new TypeError('database pool required');
  const parentId = pos(parentProfileId, 'parent');
  const childId = pos(learnerId, 'learner');
  const result = await pool.query(
    `SELECT g.parent_profile_id, g.learner_id, g.purpose, g.version,
            g.status, g.granted_at, g.revoked_at, g.expires_at
       FROM garvey_child_learning_consent g
       JOIN gates_child_profiles c ON c.id = g.learner_id AND c.parent_id = g.parent_profile_id
      WHERE g.parent_profile_id = $1 AND g.learner_id = $2 AND g.purpose = $3
      LIMIT 1`,
    [parentId, childId, PURPOSE]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    granted_at: row.granted_at ? new Date(row.granted_at).toISOString() : null,
    revoked_at: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
  };
}

module.exports = { changeChildConsent, resolveStoredChildConsent };
