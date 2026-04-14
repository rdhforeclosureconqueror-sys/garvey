const test = require('node:test');
const assert = require('node:assert/strict');

const {
  BANK_REVIEW_STATUSES,
  buildManualChecklist,
  generateReviewSummary,
  toReviewMarkdown,
} = require('../../archetype-engines/generator/love/promotionReviewWorkflow');

test('promotion status taxonomy includes controlled review lifecycle states', () => {
  assert.deepEqual(BANK_REVIEW_STATUSES, [
    'generated',
    'structurally_valid',
    'wording_refined',
    'ready_for_review',
    'approved_for_live_candidate',
    'rejected',
    'superseded',
  ]);
});

test('manual checklist includes all required human review prompts', () => {
  const checklist = buildManualChecklist();
  const prompts = checklist.map((item) => item.prompt);
  assert.equal(checklist.length, 6);
  assert.ok(prompts.some((p) => p.includes('wording feel natural')));
  assert.ok(prompts.some((p) => p.includes('equally respectable')));
  assert.ok(prompts.some((p) => p.includes('prompts feel repetitive')));
  assert.ok(prompts.some((p) => p.includes('archetypes feel recognizable')));
  assert.ok(prompts.some((p) => p.includes('sound noticeably "better"')));
  assert.ok(prompts.some((p) => p.includes('premium enough for live candidate testing')));
});

test('BANK_A review bundle remains non-promoting and review-gated', () => {
  const summary = generateReviewSummary({ bankId: 'BANK_A' });

  assert.equal(summary.bankId, 'BANK_A');
  assert.equal(summary.status, 'ready_for_review');
  assert.notEqual(summary.status, 'approved_for_live_candidate');
  assert.equal(summary.structuralAudit.auditValid, true);
  assert.equal(typeof summary.recommendation, 'string');
  assert.ok(summary.recommendation.includes('manual_review') || summary.recommendation.includes('review_required'));

  const markdown = toReviewMarkdown(summary);
  assert.ok(markdown.includes('does not auto-promote any bank live'));
  assert.ok(markdown.includes('## 5) Manual Review Checklist'));
});
