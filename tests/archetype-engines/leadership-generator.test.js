const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  generateLeadershipBank,
  validateLeadershipBank,
  LEADERSHIP_ITEM_MODEL,
} = require('../../archetype-engines/engines/leadership/generator');

test('leadership generator emits deterministic 25-question canonical bank', () => {
  const a = generateLeadershipBank({ seed: 'LEADERSHIP_BANK_A', bankId: 'LEADERSHIP_BANK_A' });
  const b = generateLeadershipBank({ seed: 'LEADERSHIP_BANK_A', bankId: 'LEADERSHIP_BANK_A' });

  assert.deepEqual(a.questions, b.questions);
  assert.equal(a.questions.length, 25);
  assert.equal(a.validation.ok, true);

  for (const question of a.questions) {
    assert.equal(question.engine, 'leadership');
    assert.equal(question.bank_id, 'LEADERSHIP_BANK_A');
    assert.equal((question.options || []).length, 4);
    for (const option of question.options || []) {
      assert.ok(['VD', 'SD', 'RI', 'IE', 'AC'].includes(option.primary_dimension));
      assert.ok(['VD', 'SD', 'RI', 'IE', 'AC'].includes(option.secondary_dimension));
      assert.equal(option.primary_archetype, option.primary_dimension);
      assert.equal(option.secondary_archetype, option.secondary_dimension);
    }
  }
});

test('leadership item model captures authored bank1 constraints for reuse', () => {
  assert.equal(LEADERSHIP_ITEM_MODEL.id, 'leadership_item_model_v1');
  assert.equal(LEADERSHIP_ITEM_MODEL.coverageExpectations.questionsPerGeneratedSet, 25);
  assert.deepEqual(LEADERSHIP_ITEM_MODEL.coverageExpectations.requiredDimensionCodes, ['VD', 'SD', 'RI', 'IE', 'AC']);
  assert.ok(LEADERSHIP_ITEM_MODEL.questionClasses.includes('ID'));
  assert.ok(LEADERSHIP_ITEM_MODEL.questionClasses.includes('BH'));
  assert.ok(LEADERSHIP_ITEM_MODEL.questionClasses.includes('SC'));
  assert.ok(LEADERSHIP_ITEM_MODEL.questionClasses.includes('ST'));
  assert.ok(LEADERSHIP_ITEM_MODEL.questionClasses.includes('DS'));
});

test('leadership validator accepts valid generated bank', () => {
  const generated = generateLeadershipBank({ seed: 'LEADERSHIP_BANK_A', bankId: 'LEADERSHIP_BANK_A' });
  const validation = validateLeadershipBank(generated.questions);
  assert.equal(validation.ok, true);
});

test('leadership validator rejects malformed generated bank payloads', () => {
  const malformed = [{ question_id: 'x', options: [{}, {}] }];
  const validation = validateLeadershipBank(malformed);
  assert.equal(validation.ok, false);
});

test('leadership governed retake without approved manifest bank is explicitly unavailable', () => {
  const manifestPath = path.join(process.cwd(), 'artifacts', 'leadership-banks', 'promotion-manifest.json');
  const servicePath = path.join(process.cwd(), 'server', 'archetypeEnginesService.js');
  const original = fs.readFileSync(manifestPath, 'utf8');

  try {
    fs.writeFileSync(manifestPath, JSON.stringify({ generatedAt: '2026-04-15T00:00:00.000Z', statuses: ['generated', 'approved_for_live_candidate'], banks: [] }, null, 2));
    delete require.cache[servicePath];
    const reloaded = require('../../server/archetypeEnginesService');
    const retake = reloaded.getQuestionBanks('leadership', { retakeAttempt: 1 });
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
