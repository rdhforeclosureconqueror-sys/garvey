const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { generateLoyaltyBank, validateLoyaltyBank, LOYALTY_ITEM_MODEL } = require('../../archetype-engines/engines/loyalty/generator');

test('loyalty generator emits deterministic 25-question governed-bank shape', () => {
  const a = generateLoyaltyBank({ seed: 'LOYALTY_BANK_A', bankId: 'LOYALTY_BANK_A' });
  const b = generateLoyaltyBank({ seed: 'LOYALTY_BANK_A', bankId: 'LOYALTY_BANK_A' });
  assert.deepEqual(a.questions, b.questions);
  assert.equal(a.questions.length, 25);
  assert.equal(a.validation.ok, true);
  for (const question of a.questions) {
    assert.equal(question.bank_id, 'LOYALTY_BANK_A');
    assert.equal((question.options || []).length, 4);
    for (const option of (question.options || [])) {
      assert.ok(option.primary_archetype);
      assert.ok(option.secondary_archetype);
    }
  }
});

test('loyalty item model captures reusable generation coverage constraints', () => {
  assert.equal(LOYALTY_ITEM_MODEL.id, 'loyalty_item_model_v1');
  assert.equal(LOYALTY_ITEM_MODEL.coverageExpectations.questionsPerGeneratedSet, 25);
  assert.equal(LOYALTY_ITEM_MODEL.dimensions.length, 5);
  assert.ok(LOYALTY_ITEM_MODEL.recurringQuestionForms.length >= 25);
});

test('loyalty governed retake without approved manifest bank is explicitly unavailable', () => {
  const manifestPath = path.join(process.cwd(), 'artifacts', 'loyalty-banks', 'promotion-manifest.json');
  const servicePath = path.join(process.cwd(), 'server', 'archetypeEnginesService.js');
  const original = fs.readFileSync(manifestPath, 'utf8');

  try {
    fs.writeFileSync(manifestPath, JSON.stringify({ generatedAt: '2026-04-15T00:00:00.000Z', statuses: ['generated', 'approved_for_live_candidate'], banks: [] }, null, 2));
    delete require.cache[servicePath];
    const reloaded = require('../../server/archetypeEnginesService');
    const retake = reloaded.getQuestionBanks('loyalty', { retakeAttempt: 1 });
    assert.equal(retake.questionSource, 'generated_validated_bank');
    assert.equal(retake.generatedBankAvailable, false);
    assert.equal(retake.activeQuestions.length, 0);
    assert.equal(retake.diagnostics.generatedReason, 'no_approved_bank');
  } finally {
    fs.writeFileSync(manifestPath, original);
    delete require.cache[servicePath];
    require('../../server/archetypeEnginesService');
  }
});

test('loyalty generated bank validator rejects malformed bank payloads', () => {
  const validation = validateLoyaltyBank([{ question_id: 'x', options: [{}, {}] }]);
  assert.equal(validation.ok, false);
});
