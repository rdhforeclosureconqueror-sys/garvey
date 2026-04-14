const test = require('node:test');
const assert = require('node:assert/strict');

const LOVE_QUESTIONS = require('../../archetype-engines/question-banks/love');
const {
  getQuestionBanks,
  scoreEngineAssessment,
  SIGNAL_MULTIPLIER,
} = require('../../server/archetypeEnginesService');

const ARCHETYPES = ['RS', 'AL', 'EC', 'AV', 'ES'];
const CLASS_MULTIPLIER = { ID: 1.0, BH: 1.0, SC: 1.25, ST: 1.5, DS: 1.0 };

function normalizeQuestion(q) {
  return {
    id: q.id || q.question_id,
    bankId: q.bankId || q.bank_id,
    questionClass: q.questionClass || q.question_class,
    options: (q.options || []).map((opt) => ({
      id: opt.id || opt.option_id,
      primary: opt.primary || opt.primary_archetype,
      secondary: opt.secondary || opt.secondary_archetype,
      weightType: opt.weightType || opt.weight_type,
    })),
  };
}

function optionContribution(code, q, opt) {
  const m = CLASS_MULTIPLIER[q.questionClass] || 1;
  let score = 0;
  if (opt.primary === code) score += 2 * m;
  if (opt.secondary === code) score += 1 * m;
  return score;
}

function computeMaxPossible(questions) {
  const max = Object.fromEntries(ARCHETYPES.map((code) => [code, 0]));
  for (const q of questions) {
    for (const code of ARCHETYPES) {
      max[code] += Math.max(...q.options.map((opt) => optionContribution(code, q, opt)));
    }
  }
  return max;
}

function dominantAnswers(questions, targetCode) {
  return Object.fromEntries(questions.map((q) => {
    const best = q.options
      .map((opt) => ({ opt, score: optionContribution(targetCode, q, opt) }))
      .sort((a, b) => b.score - a.score)[0].opt;
    return [q.id, best.id];
  }));
}

test('love scorer formula uses canonical class multipliers (single-application)', () => {
  const questions = LOVE_QUESTIONS.map(normalizeQuestion);
  const stQuestion = questions.find((q) => q.questionClass === 'ST' && q.options.some((opt) => opt.primary === 'EC'));
  assert.ok(stQuestion);
  const ecOption = stQuestion.options.find((opt) => opt.primary === 'EC');
  assert.ok(ecOption);

  const result = scoreEngineAssessment('love', { [stQuestion.id]: ecOption.id }, { bankId: stQuestion.bankId });

  // EC should receive 2 * ST(1.5) = 3.0 raw points, not 4.5.
  assert.equal(result.rawScores.EC, 3);
});

test('love normalization uses per-archetype max-possible scores for active bank', () => {
  const banks = getQuestionBanks('love', { retakeAttempt: 0 }).questionBanks;
  for (const [bankId, rawQuestions] of Object.entries(banks)) {
    const questions = rawQuestions.map(normalizeQuestion);
    const max = computeMaxPossible(questions);
    const answers = dominantAnswers(questions, 'RS');
    const scored = scoreEngineAssessment('love', answers, { bankId });

    for (const code of ARCHETYPES) {
      assert.equal(scored.maxPossibleScores[code], max[code]);
      const expected = max[code] > 0 ? Number(((scored.rawScores[code] / max[code]) * 100).toFixed(2)) : 0;
      assert.equal(scored.normalizedScores[code], expected);
    }
  }
});

test('bank-scoped scoring does not inject unanswered questions from other banks', () => {
  const banks = getQuestionBanks('love', { retakeAttempt: 0 }).questionBanks;
  const b1Questions = banks.BANK_1.map(normalizeQuestion);
  const answers = dominantAnswers(b1Questions, 'AL');

  const scoredWithBank = scoreEngineAssessment('love', answers, { bankId: 'BANK_1' });
  const scoredInferred = scoreEngineAssessment('love', answers);

  assert.equal(scoredWithBank.questionCount, 25);
  assert.equal(scoredInferred.questionCount, 25);
  assert.deepEqual(scoredWithBank.rawScores, scoredInferred.rawScores);
});

test('each archetype can deterministically win when its mapped answers dominate (per bank)', () => {
  const banks = getQuestionBanks('love', { retakeAttempt: 0 }).questionBanks;
  for (const [bankId, rawQuestions] of Object.entries(banks)) {
    const questions = rawQuestions.map(normalizeQuestion);
    for (const target of ARCHETYPES) {
      const answers = dominantAnswers(questions, target);
      const scored = scoreEngineAssessment('love', answers, { bankId });
      assert.equal(scored.primaryArchetype?.code, target, `${bankId} expected ${target}, got ${scored.primaryArchetype?.code}`);
    }
  }
});

test('distribution audit confirms balanced primary/secondary representation and no ES underrepresentation', () => {
  const counts = Object.fromEntries(ARCHETYPES.map((code) => [code, { primary: 0, secondary: 0 }]));
  for (const q of LOVE_QUESTIONS.map(normalizeQuestion)) {
    for (const opt of q.options) {
      counts[opt.primary].primary += 1;
      counts[opt.secondary].secondary += 1;
    }
  }

  for (const code of ARCHETYPES) {
    assert.equal(counts[code].primary, 60);
    assert.equal(counts[code].secondary, 60);
  }
});

test('question class keys map exactly to required handoff multipliers', () => {
  assert.deepEqual(SIGNAL_MULTIPLIER, { ID: 1, BH: 1, SC: 1.25, ST: 1.5, DS: 1 });
});

test('each bank enforces 5/6/6/6/2 class distribution and per-question distinct primaries', () => {
  const banks = getQuestionBanks('love', { retakeAttempt: 0 }).questionBanks;
  for (const [bankId, rawQuestions] of Object.entries(banks)) {
    const questions = rawQuestions.map(normalizeQuestion);
    const classCounts = questions.reduce((acc, q) => {
      acc[q.questionClass] = (acc[q.questionClass] || 0) + 1;
      return acc;
    }, {});
    assert.deepEqual(classCounts, { ID: 5, BH: 6, SC: 6, ST: 6, DS: 2 }, `${bankId} class distribution mismatch`);

    for (const q of questions) {
      const primaries = q.options.map((opt) => opt.primary);
      assert.equal(new Set(primaries).size, 4, `${bankId}:${q.id} must expose 4 distinct primary archetypes`);
    }
  }
});

test('unordered archetype pairs are perfectly balanced across all banks', () => {
  const unordered = {};
  for (const q of LOVE_QUESTIONS.map(normalizeQuestion)) {
    for (const opt of q.options) {
      const key = [opt.primary, opt.secondary].sort().join('-');
      unordered[key] = (unordered[key] || 0) + 1;
    }
  }
  assert.equal(Object.keys(unordered).length, 10);
  for (const count of Object.values(unordered)) assert.equal(count, 30);
});
