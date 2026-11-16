'use strict';

// Read-only, internal prototype for Learning Science. NOT registered as an API route.
// No DB migration, persistence, raw answers, or real-learner activation.
// Caller must first resolve an authenticated parent and owned child using gatesAuth.
const crypto = require('node:crypto');
const STATUSES = new Set(['correct', 'incorrect', 'omitted', 'not_scorable']);
const SUBJECTS = { Math: 'mathematics', English: 'literacy' };
const SQL = `
SELECT s.session_id, s.session_version, s.assessment_role, s.grade,
       s.subject, s.completed_at, i.item_identity, i.package_id,
       r.score_status, r.scored
  FROM assessment_sessions s
  JOIN gates_child_profiles c
    ON c.id = s.learner_id AND c.parent_id = s.parent_profile_id
  JOIN assessment_session_items i ON i.session_id = s.id
  JOIN assessment_responses r ON r.session_item_id = i.id AND r.session_id = s.id
 WHERE s.status = 'completed'
   AND s.assessment_role = 'baseline'
   AND s.auth_user_id = $1
   AND s.parent_profile_id = $2
   AND s.learner_id = $3
 ORDER BY s.completed_at DESC, s.id DESC, i.display_order ASC
 LIMIT $4`;

function positiveId(value, label) {
  const s = String(value ?? '');
  if (!/^[1-9][0-9]*$/.test(s)) throw new TypeError('invalid ' + label);
  return s;
}

function opaqueLearnerRef({ secret, learnerId, parentId }) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new TypeError('server-only pseudonymization key of at least 32 bytes required');
  }
  const digest = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(['garvey-learning-history-v1', parentId, learnerId]))
    .digest('hex');
  return 'learner_' + digest.slice(0, 32);
}

function projectHistoryRows(rows, { learnerRef }) {
  if (!Array.isArray(rows)) throw new TypeError('database rows required');
  const history = [];
  for (const row of rows) {
    if (!row || row.assessment_role !== 'baseline' || !SUBJECTS[row.subject]) {
      throw new TypeError('unexpected assessment history row');
    }
    if (!STATUSES.has(row.score_status)) throw new TypeError('unknown score status');
    const wasScored = row.score_status === 'correct' || row.score_status === 'incorrect';
    if (row.scored !== wasScored) throw new TypeError('contradictory score status');
    if (typeof row.package_id !== 'string' || !row.package_id || typeof row.item_identity !== 'string' || !row.item_identity) {
      throw new TypeError('missing skill or item identity');
    }
    if (!Number.isInteger(Number(row.grade)) || Number(row.grade) < 1 || Number(row.grade) > 6) {
      throw new TypeError('invalid grade');
    }
    if (!row.completed_at || Number.isNaN(new Date(row.completed_at).getTime())) {
      throw new TypeError('invalid completion timestamp');
    }
    history.push({
      learner_ref: learnerRef,
      skill_id: row.package_id,
      task_id: row.item_identity,
      subject: SUBJECTS[row.subject],
      grade_context: Number(row.grade),
      attempt_type: 'baseline',
      assessment_version: String(row.session_version || ''),
      timestamp: new Date(row.completed_at).toISOString(),
      result: wasScored
        ? { completion_status: 'complete', correct: row.score_status === 'correct' }
        : { completion_status: 'not_completed' },
      support: { type: 'other' }, // Unknown, never claim independent work.
    });
  }
  return history;
}

/**
 * Entry point for a future trusted server integration ONLY. The DB independently
 * scopes rows by user, parent and child, including the child's canonical parent.
 */
async function getLearningHistory({ pool, actor, ownedChild, secret, enabled = false, limit = 100 } = {}) {
  if (enabled !== true) return { enabled: false, history: [] };
  if (!pool || typeof pool.query !== 'function') throw new TypeError('database pool required');
  if (!actor || actor.authenticated !== true || !actor.parentProfile) throw new TypeError('authenticated parent required');
  if (!ownedChild || ownedChild.ok !== true) throw new TypeError('verified owned child required');
  const authUserId = positiveId(actor.authUserId, 'auth user');
  const parentId = positiveId(actor.parentProfile.id, 'parent');
  const learnerId = positiveId(ownedChild.learnerId, 'learner');
  if (ownedChild.row && String(ownedChild.row.parent_id) !== parentId) throw new TypeError('child ownership mismatch');
  const bounded = Number(limit);
  if (!Number.isInteger(bounded) || bounded < 1 || bounded > 200) throw new RangeError('limit must be 1..200');
  const learnerRef = opaqueLearnerRef({ secret, learnerId, parentId });
  const result = await pool.query(SQL, [authUserId, parentId, learnerId, bounded]);
  return { enabled: true, history: projectHistoryRows(result.rows, { learnerRef }) };
}

module.exports = { getLearningHistory, opaqueLearnerRef, projectHistoryRows };
