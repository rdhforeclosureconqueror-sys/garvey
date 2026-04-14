import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getQuestionBanks, scoreEngineAssessment } = require('../server/archetypeEnginesService');
const LOVE_QUESTIONS = require('../archetype-engines/question-banks/love');

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
      signalType: opt.signalType || opt.signal_type,
    })),
  };
}

function contribution(code, question, option) {
  const m = CLASS_MULTIPLIER[question.questionClass] || 1;
  let s = 0;
  if (option.primary === code) s += 2 * m;
  if (option.secondary === code) s += 1 * m;
  return s;
}

function auditDistribution(questions) {
  const byArch = Object.fromEntries(ARCHETYPES.map((code) => [code, {
    primaryCount: 0,
    secondaryCount: 0,
    weightedMaxContribution: 0,
    byClass: { ID: 0, BH: 0, SC: 0, ST: 0, DS: 0 },
    byBank: { BANK_1: 0, BANK_2: 0, BANK_3: 0 },
  }]));

  for (const q of questions) {
    for (const opt of q.options) {
      byArch[opt.primary].primaryCount += 1;
      byArch[opt.primary].weightedMaxContribution += 2 * CLASS_MULTIPLIER[q.questionClass];
      byArch[opt.primary].byClass[q.questionClass] += 1;
      byArch[opt.primary].byBank[q.bankId] += 1;

      byArch[opt.secondary].secondaryCount += 1;
      byArch[opt.secondary].weightedMaxContribution += 1 * CLASS_MULTIPLIER[q.questionClass];
      byArch[opt.secondary].byClass[q.questionClass] += 1;
      byArch[opt.secondary].byBank[q.bankId] += 1;
    }
  }
  return byArch;
}

function maxPossibleByBank(banks) {
  const result = {};
  for (const [bankId, questions] of Object.entries(banks)) {
    const max = Object.fromEntries(ARCHETYPES.map((code) => [code, 0]));
    for (const q of questions) {
      for (const code of ARCHETYPES) {
        max[code] += Math.max(...q.options.map((opt) => contribution(code, q, opt)));
      }
    }
    result[bankId] = max;
  }
  return result;
}

function dominantAnswers(questions, target) {
  const answers = {};
  for (const q of questions) {
    const best = q.options
      .map((opt) => ({ opt, score: contribution(target, q, opt) }))
      .sort((a, b) => b.score - a.score)[0].opt;
    answers[q.id] = best.id;
  }
  return answers;
}

function runSimulations(banks) {
  const sims = [];
  for (const [bankId, questions] of Object.entries(banks)) {
    for (const target of ARCHETYPES) {
      const answers = dominantAnswers(questions, target);
      const scored = scoreEngineAssessment('love', answers, { bankId });
      sims.push({
        bankId,
        pattern: `${target}-heavy`,
        winner: scored.primaryArchetype?.code,
        secondary: scored.secondaryArchetype?.code,
        hybrid: scored.hybridArchetype?.label || null,
        normalized: scored.normalizedScores,
        raw: scored.rawScores,
      });
    }
  }
  return sims;
}

function pairBalance(questions) {
  const pairCounts = {};
  for (const q of questions) {
    for (const opt of q.options) {
      const pair = `${opt.primary}-${opt.secondary}`;
      pairCounts[pair] = (pairCounts[pair] || 0) + 1;
    }
  }
  const byArchetype = Object.fromEntries(ARCHETYPES.map((code) => [code, 0]));
  for (const [pair, count] of Object.entries(pairCounts)) {
    const [left, right] = pair.split('-');
    byArchetype[left] += count;
    byArchetype[right] += count;
  }
  return { pairCounts, byArchetype };
}

const normalizedQuestions = LOVE_QUESTIONS.map(normalizeQuestion);
const bankPayload = getQuestionBanks('love', { retakeAttempt: 0 });
const normalizedBanks = Object.fromEntries(
  Object.entries(bankPayload.questionBanks).map(([bankId, questions]) => [bankId, questions.map(normalizeQuestion)])
);

const report = {
  generatedAt: new Date().toISOString(),
  totalQuestions: normalizedQuestions.length,
  distribution: auditDistribution(normalizedQuestions),
  pairBalance: pairBalance(normalizedQuestions),
  maxPossibleByBank: maxPossibleByBank(normalizedBanks),
  simulations: runSimulations(normalizedBanks),
};

console.log(JSON.stringify(report, null, 2));
