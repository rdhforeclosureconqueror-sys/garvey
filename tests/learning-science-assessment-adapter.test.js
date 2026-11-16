'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { transformAssessmentMvpResults } = require('../learning-science/adaptAssessmentMvpResult');

const context = {
  authorizedLearner: true,
  learner_ref: 'learner_pseudonym123',
  timestamp: '2026-11-16T23:00:00Z',
};
const completed = {
  session_id: 'amvp_synthetic_session_01',
  assessment_role: 'baseline',
  grade: 4,
  subject: 'Math',
  status: 'completed',
  completed_session: { session_version: 'assessment-mvp-v4' },
  response_results: [
    { item_identity: 'task_001', source_package_id: 'g4.math.fractions', status: 'correct', scored: true },
    { item_identity: 'task_002', source_package_id: 'g4.math.fractions', status: 'incorrect', scored: true, normalized_response: 'my private answer' },
    { item_identity: 'task_003', source_package_id: 'g4.math.place_value', status: 'omitted', scored: false },
    { item_identity: 'task_004', source_package_id: 'g4.math.place_value', status: 'not_scorable', scored: false, reason_code: 'unsupported_item_type' },
  ],
};

test('maps scored Assessment MVP items into distinct per-skill evidence, without learner answers', () => {
  const events = transformAssessmentMvpResults(completed, context);
  assert.equal(events.length, 4);
  assert.deepEqual(events.map(e => e.result.correct), [true, false, undefined, undefined]);
  assert.deepEqual(events.map(e => e.result.completion_status), ['complete', 'complete', 'not_completed', 'not_completed']);
  assert.equal(events[0].subject, 'mathematics');
  assert.equal(events[0].skill_id, 'g4.math.fractions');
  assert.equal(events[2].skill_id, 'g4.math.place_value');
  assert.equal(events[0].support.type, 'other');
  assert.equal(events[0].attempt_type, 'baseline');
  assert.equal(events[0].modality, 'other');
  assert.equal(JSON.stringify(events).includes('my private answer'), false);
  assert.equal(JSON.stringify(events).includes('normalized_response'), false);
});

test('produces deterministic IDs for idempotent downstream writes', () => {
  const left = transformAssessmentMvpResults(completed, context);
  const right = transformAssessmentMvpResults(completed, context);
  assert.deepEqual(left.map(e => e.event_id), right.map(e => e.event_id));
});

test('requires verified learner context; never accepts free-form learner names as IDs', () => {
  assert.throws(() => transformAssessmentMvpResults(completed, { ...context, authorizedLearner: false }), /verified learner/);
  assert.throws(() => transformAssessmentMvpResults(completed, { ...context, learner_ref: 'Mary Smith' }), /learner_ref/);
});

test('rejects unknown items and duplicate item identities rather than silently recording them', () => {
  assert.throws(() => transformAssessmentMvpResults({ ...completed, response_results: [{ item_identity: 'unknown', status: 'unknown_item' }] }, context), /unsupported/);
  assert.throws(() => transformAssessmentMvpResults({ ...completed, response_results: [completed.response_results[0], completed.response_results[0]] }, context), /duplicate/);
});

test('never infers independent or delayed retrieval from reassessment without verified metadata', () => {
  assert.throws(() => transformAssessmentMvpResults({ ...completed, assessment_role: 'reassessment' }, context), /baseline sessions only/);
});

test('adapts English evidence separately from mathematics', () => {
  const events = transformAssessmentMvpResults({ ...completed, subject: 'English', grade: 2 }, context);
  assert.equal(events[0].subject, 'literacy');
  assert.equal(events[0].grade_context, 2);
});

test('rejects contradictory scored status and mismatched assessment version', () => {
  assert.throws(() => transformAssessmentMvpResults({
    ...completed,
    response_results: [{ ...completed.response_results[0], scored: false }],
  }, context), /scoring status is inconsistent/);
  assert.throws(() => transformAssessmentMvpResults({
    ...completed,
    response_results: [{ ...completed.response_results[2], scored: true }],
  }, context), /scoring status is inconsistent/);
  assert.throws(() => transformAssessmentMvpResults(completed, {
    ...context, assessment_version: 'untrusted-version',
  }), /assessment_version mismatch/);
});
