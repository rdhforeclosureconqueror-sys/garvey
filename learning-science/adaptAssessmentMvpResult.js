'use strict';

// Internal, read-only bridge from scored Assessment MVP results to Learning Science v1.
// Not an API route. No DB writes. Never pass raw learner responses into events.
// Caller must supply a pseudonymous learner reference resolved AFTER parent-child authorization.
const crypto = require('node:crypto');
const { buildEvidenceEvent } = require('./buildEvidenceEvent');

const SCORE_STATUSES = new Set(['correct', 'incorrect', 'omitted', 'not_scorable']);
function needString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' is required');
  return value;
}
function transformAssessmentMvpResults(completed, context) {
  if (!completed || completed.status !== 'completed') throw new TypeError('completed assessment required');
  if (!context || context.authorizedLearner !== true) throw new TypeError('verified learner context required');
  const learnerRef = needString(context.learner_ref, 'learner_ref');
  const sessionId = needString(completed.session_id, 'session_id');
  const assessmentVersion = needString(context.assessment_version || completed.completed_session?.session_version, 'assessment_version');
  const subject = completed.subject === 'Math' ? 'mathematics' : completed.subject === 'English' ? 'literacy' : null;
  if (!subject) throw new TypeError('unsupported assessment subject');
  if (completed.assessment_role !== 'baseline') throw new TypeError('baseline sessions only until reassessment support is verified');
  if (!Array.isArray(completed.response_results)) throw new TypeError('response_results required');
  const seen = new Set();
  const events = [];
  for (const item of completed.response_results) {
    if (!item || !SCORE_STATUSES.has(item.status)) throw new TypeError('unknown or unsupported assessment response status');
    const itemId = needString(item.item_identity, 'item_identity');
    const packageId = needString(item.source_package_id, 'source_package_id');
    if (seen.has(itemId)) throw new TypeError('duplicate response item_identity');
    seen.add(itemId);
    const digest = crypto.createHash('sha256').update(JSON.stringify([sessionId, itemId, assessmentVersion])).digest('hex');
    const result = item.status === 'omitted' || item.status === 'not_scorable'
      ? { completion_status: 'not_completed' }
      : { completion_status: 'complete', correct: item.status === 'correct', score: item.status === 'correct' ? 1 : 0 };
    events.push(buildEvidenceEvent({
      learner_ref: learnerRef,
      skill_id: packageId,
      task_id: itemId,
      assessment_version: assessmentVersion,
      subject,
      grade_context: completed.grade,
      attempt_type: 'baseline',
      modality: 'other', // MVP result alone cannot prove reading, written or spoken modality.
      source: 'garvey_student_activity',
      support: { type: 'none', hint_count: 0 }, // Unrecorded: do not infer independent performance.
      result,
    }, { event_id: 'mvp_' + digest.slice(0, 32), timestamp: needString(context.timestamp, 'timestamp') }));
  }
  return events;
}
module.exports = { transformAssessmentMvpResults };
