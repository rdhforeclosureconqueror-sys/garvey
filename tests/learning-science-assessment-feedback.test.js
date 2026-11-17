'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeLearningNextSteps } = require('../assessment-mvp/makeLearningNextSteps');

test('gives a short strengths-and-practice summary from assessed skills', () => {
  const feedback = makeLearningNextSteps({
    skillEvidence: [
      { source_package_id: 'G3_MATH_A', skill: 'Equal groups', provisional_label: 'Ready', valid_scored_responses: 4 },
      { source_package_id: 'G3_MATH_B', skill: 'Place value', provisional_label: 'Developing', valid_scored_responses: 5 },
    ],
    recommendations: [
      { package_id: 'G3_MATH_B', skill: 'Place value', recommendation_type: 'current_skill_support', practice_route: '/skill-world/G3_MATH_B/drill' },
    ],
  });
  assert.equal(feedback.strengths[0].skill, 'Equal groups');
  assert.equal(feedback.strengths[0].label, 'Promising progress');
  assert.equal(feedback.practice[0].skill, 'Place value');
  assert.equal(feedback.practice[0].practice_route, '/skill-world/G3_MATH_B/drill');
  assert.match(feedback.note, /not labels/);
});

test('insufficient evidence never becomes a strength or permanent ability classification', () => {
  const feedback = makeLearningNextSteps({
    skillEvidence: [{ skill: 'Fractions', provisional_label: 'Ready', valid_scored_responses: 1 }],
    recommendations: [{ package_id: 'G3_MATH_X', skill: 'Fractions', recommendation_type: 'additional_evidence' }],
  });
  assert.equal(feedback.strengths.length, 0);
  assert.match(feedback.practice[0].message, /more information/);
  assert.doesNotMatch(JSON.stringify(feedback), /IQ|gifted|diagnosis|low intelligence|mastery certified/i);
});

test('keeps only supported practice actions, deduplicates and limits count', () => {
  const entries = ['A','A','B','C','D'].map(package_id => ({
    package_id, skill: package_id, recommendation_type: 'current_skill_support',
  }));
  const feedback = makeLearningNextSteps({ recommendations: [{ ...entries[0], recommendation_type: 'unknown' }, ...entries] });
  assert.deepEqual(feedback.practice.map(x => x.package_id), ['A','B','C']);
  assert.equal(feedback.practice.every(x => x.practice_route === null), true);
});

test('does not expose raw assessment answers or unsupported route destinations', () => {
  const feedback = makeLearningNextSteps({
    skillEvidence: [{ skill: 'Counts', provisional_label: 'Ready', valid_scored_responses: 4, learner_response: 'private response' }],
    recommendations: [{ package_id: 'MATH_X', skill: 'Counts', recommendation_type: 'current_skill_support', practice_route: 'https://untrusted.example' }],
  });
  assert.equal(feedback.practice[0].practice_route, null);
  assert.equal(JSON.stringify(feedback).includes('private response'), false);
});

test('actual assessment completion returns child-friendly feedback in its result', () => {
  const { createAssessmentSession } = require('../assessment-mvp/createAssessmentSession');
  const { submitAssessmentResponses } = require('../assessment-mvp/submitAssessmentResponses');
  const session = createAssessmentSession({
    grade: 1, subject: 'Math', itemsPerPackage: 1, session_id: 'FEEDBACK_SYNTHETIC',
  });
  const submitted = Object.fromEntries(
    session.internal_scoring_records.map(record => [record.item_identity, 'practice response'])
  );
  const result = submitAssessmentResponses(session, submitted);
  assert.equal(result.status, 'completed');
  assert.ok(result.learning_next_steps);
  assert.equal(Array.isArray(result.learning_next_steps.strengths), true);
  assert.equal(Array.isArray(result.learning_next_steps.practice), true);
  assert.match(result.learning_next_steps.encouragement, /practice/);
  assert.equal(JSON.stringify(result.learning_next_steps).includes('practice response'), false);
});
