const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  APPROVED_ASSESSMENTS,
  buildAssessmentCompletionPayload,
} = require('../server/simbawajumaBridge');
const { buildDeliveryHeaders } = require('../server/simbawajumaEvents');

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
  'recommended_historical_facts',
  'recommended_brain_game',
  'recommended_swahili_lesson',
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
    assert.equal(typeof assessment.recommended_historical_facts, 'string');
    assert.equal(typeof assessment.recommended_brain_game, 'string');
    assert.equal(typeof assessment.recommended_swahili_lesson, 'string');
    assert.ok(['Leadership', 'Community Economics', 'Rite of Passage', 'Business', 'Personal Growth', 'Family & Youth'].includes(assessment.category));
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
    'discord_channel',
    'historical_facts',
    'brain_game',
    'swahili_lesson',
    'assessment',
  ]);
  assert.equal(payload.reward.eligible, true);
  assert.equal(payload.reward.simba_points, 50);
  assert.deepEqual(payload.reward.achievements, ['business-pathfinder']);
});

test('Simba-facing assessment center is skinnable and does not show Garvey branding', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'simbawajuma', 'assessments.html'), 'utf8');
  assert.match(html, /--simba-bg/);
  assert.match(html, /--simba-accent/);
  assert.doesNotMatch(html, /Garvey/);
  assert.match(html, /Welcome to the Assessment Center/);
  assert.match(html, /Continue Your Journey/);
  assert.match(html, /data-category/);
});


test('Garvey callback signs with Simba-compatible signature and secret headers', () => {
  const body = JSON.stringify({ event: 'assessment.completed', result_id: 'result-123' });
  const { headers, signatureValidationResult, signature_algorithm } = buildDeliveryHeaders(body, {
    SIMBAWAJUMAA_WEBHOOK_SECRET: 'shared-secret',
  });

  assert.equal(headers['Content-Type'], 'application/json');
  assert.match(headers['X-Garvey-Signature'], /^sha256=[a-f0-9]{64}$/);
  assert.equal(headers['X-Hub-Signature-256'], headers['X-Garvey-Signature']);
  assert.equal(headers['X-Garvey-Callback-Secret'], 'shared-secret');
  assert.equal(headers.Authorization, 'Bearer shared-secret');
  assert.equal(signatureValidationResult, 'hmac_sha256_hex_plus_callback_secret_headers');
  assert.match(signature_algorithm, /HMAC-SHA256/);
});

test('Simba-facing CTAs use high-contrast dark glossy buttons with gold text', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'simbawajuma', 'assessments.html'), 'utf8');
  assert.match(html, /--simba-cta-bg:linear-gradient/);
  assert.match(html, /color:var\(--simba-accent\)/);
  assert.match(html, /border:1px solid var\(--simba-cta-border\)/);
  assert.match(html, /\.btn:hover,\.btn:focus-visible/);
});

test('Owner results page preserves signed Simba context on business owner result fetch', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'results_owner.html'), 'utf8');
  assert.match(html, /Object\.fromEntries\(Array\.from\(qs\.entries\(\)\)\.concat/);
  assert.match(html, /"x-user-email": email, "x-tenant-slug": tenant/);
});


test('Simba assessment center hides diagnostics behind admin-only lazy panel and adds archetype explorer', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'simbawajuma', 'assessments.html'), 'utf8');
  assert.match(html, /Explore Assessment Archetypes/);
  assert.match(html, /archetypeGrid/);
  assert.match(html, /info_href/);
  assert.match(html, /api\/simbawajuma\/session/);
  assert.match(html, /if\(isAdmin\)\{fetch\('\/api\/archetype-engines\/admin\/simba-sync\/diagnostics'/);
  assert.doesNotMatch(html, /id="callbackDiagnostics"/);
  assert.match(html, /<details class="panel admin-panel">/);
});

test('All Simba ecosystem assessments are star reward eligible through the existing reward instruction', () => {
  const required = ['love', 'leadership', 'loyalty', 'youth_rite_of_passage', 'assessment_mvp_k6'];
  for (const id of required) {
    const assessment = APPROVED_ASSESSMENTS.find((entry) => entry.id === id);
    assert.ok(assessment, `${id} should exist in catalog`);
    assert.equal(assessment.star_reward_eligible, true, `${id} should award stars`);
    assert.ok(Number(assessment.simba_points) > 0, `${id} should expose configurable Simba points`);
    const payload = buildAssessmentCompletionPayload({ assessmentType: id, resultId: `${id}-result`, primaryResult: 'Explorer' });
    assert.equal(payload.reward.eligible, true, `${id} completion should use reward engine`);
    assert.ok(Number(payload.reward.simba_points) > 0, `${id} completion should carry points`);
  }
});
