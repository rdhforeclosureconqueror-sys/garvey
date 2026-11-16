'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEvidenceEvent } = require('../learning-science/buildEvidenceEvent');

const baseline = {
  learner_ref: 'learner_demo12345',
  skill_id: 'g3.math.equal_groups',
  task_id: 'task_arrays_01',
  assessment_version: 'skill-assessment-v1',
  grade_context: 3,
  subject: 'mathematics',
  attempt_type: 'baseline',
  modality: 'interactive',
  source: 'synthetic_test',
  support: { type: 'none', hint_count: 0 },
  result: { completion_status: 'complete', correct: true, score: 1 },
};
const make = (overrides = {}) => buildEvidenceEvent({ ...baseline, ...overrides }, { timestamp: '2026-11-16T18:00:00Z', event_id: 'demo-event-01' });

test('records a skill-specific observation with version and no child name', () => {
  const event = make();
  assert.equal(event.learner_ref, 'learner_demo12345');
  assert.equal(event.skill_id, 'g3.math.equal_groups');
  assert.equal(event.attempt_type, 'baseline');
  assert.equal(event.timestamp, '2026-11-16T18:00:00Z');
  assert.equal('child_name' in event, false);
  assert.equal('diagnosis' in event, false);
});

test('distinguishes guided from independent attempts', () => {
  const guided = make({ attempt_type: 'guided', support: { type: 'visual', hint_count: 2 } });
  assert.equal(guided.support.hint_count, 2);
  assert.throws(() => make({ attempt_type: 'independent', support: { type: 'visual', hint_count: 2 } }), /independent/);
});

test('rejects unsupported grades, learner names, and out-of-range scores', () => {
  assert.throws(() => make({ grade_context: 7 }), /grade_context/);
  assert.throws(() => make({ learner_ref: 'Jane Student' }), /learner_ref/);
  assert.throws(() => make({ result: { completion_status: 'complete', score: 1.2 } }), /score/);
});

test('does not score an unfinished task', () => {
  assert.throws(() => make({ result: { completion_status: 'not_completed', correct: false } }), /incomplete/);
});

test('requires provenance before attaching delayed retrieval interval', () => {
  assert.throws(() => make({ attempt_type: 'delayed_retrieval', retrieval_interval_days: 7 }), /prior_learning_event_id/);
  const event = make({ attempt_type: 'delayed_retrieval', retrieval_interval_days: 7, prior_learning_event_id: 'teaching-event-001' });
  assert.equal(event.retrieval_interval_days, 7);
  assert.equal(event.prior_learning_event_id, 'teaching-event-001');
});

test('keeps mathematics and literacy evidence separate for uneven learner profiles', () => {
  const math = make({ skill_id: 'g5.math.ratios', subject: 'mathematics', grade_context: 5 });
  const literacy = make({ skill_id: 'g3.reading.decoding', subject: 'literacy', grade_context: 3 });
  assert.notEqual(math.skill_id, literacy.skill_id);
  assert.notEqual(math.subject, literacy.subject);
});

test('rejects invalid caller event identifiers and explanation observations', () => {
  assert.throws(() => buildEvidenceEvent(baseline, { event_id: '', timestamp: '2026-11-16T18:00:00Z' }), /event_id/);
  assert.throws(() => make({ result: { completion_status: 'complete', explanation_observed: 'yes' } }), /explanation_observed/);
});

test('rejects unsupported evidence source and missing timezone', () => {
  assert.throws(() => make({ source: 'unverified_external_source' }), /source/);
  assert.throws(() => buildEvidenceEvent(baseline, { timestamp: '2026-11-16T18:00:00' }), /timestamp/);
});
