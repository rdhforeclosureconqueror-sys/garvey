const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  APPROVED_ASSESSMENTS,
  buildAssessmentCompletionPayload,
} = require('../server/simbawajumaBridge');

const REQUIRED_METADATA_FIELDS = [
  'id',
  'title',
  'description',
  'estimated_time',
  'category',
  'visibility',
  'recommended_book',
  'recommended_audiobook',
  'recommended_next_assessment',
  'recommended_discord_channel',
  'star_reward_eligible',
];

test('Simba assessment catalog exposes member-facing metadata for every approved assessment', () => {
  assert.ok(APPROVED_ASSESSMENTS.length >= 2);
  for (const assessment of APPROVED_ASSESSMENTS) {
    for (const field of REQUIRED_METADATA_FIELDS) {
      assert.ok(Object.prototype.hasOwnProperty.call(assessment, field), `${assessment.id} missing ${field}`);
    }
    assert.equal(typeof assessment.id, 'string');
    assert.equal(typeof assessment.title, 'string');
    assert.equal(typeof assessment.description, 'string');
    assert.equal(typeof assessment.estimated_time, 'string');
    assert.equal(typeof assessment.category, 'string');
    assert.equal(typeof assessment.visibility, 'string');
    assert.equal(typeof assessment.recommended_book, 'string');
    assert.equal(typeof assessment.recommended_audiobook, 'string');
    assert.equal(typeof assessment.recommended_next_assessment, 'string');
    assert.equal(typeof assessment.recommended_discord_channel, 'string');
    assert.equal(typeof assessment.star_reward_eligible, 'boolean');
  }
});

test('Simba completion payload includes expanded callback fields and recommendations', () => {
  const payload = buildAssessmentCompletionPayload({
    assessmentType: 'business_owner',
    resultId: 'result-123',
    primaryResult: 'Builder',
    completedAt: '2026-06-19T00:00:00.000Z',
    extra: { result_url: '/results/result-123' },
  });

  assert.equal(payload.assessment_type, 'business_owner');
  assert.equal(payload.assessment_name, 'Business Owner Assessment');
  assert.equal(payload.result_id, 'result-123');
  assert.equal(payload.primary_result, 'Builder');
  assert.equal(payload.star_reward_eligible, true);
  assert.equal(payload.completed_at, '2026-06-19T00:00:00.000Z');
  assert.equal(payload.result_url, '/results/result-123');
  assert.deepEqual(payload.recommended_next_steps.map((step) => step.type), [
    'book',
    'audiobook',
    'assessment',
    'discord_channel',
  ]);
});

test('Simba-facing assessment center is skinnable and does not show Garvey branding', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'simbawajuma', 'assessments.html'), 'utf8');
  assert.match(html, /--simba-bg/);
  assert.match(html, /--simba-accent/);
  assert.doesNotMatch(html, /Garvey/);
  assert.match(html, /internal assessment engine/);
});
