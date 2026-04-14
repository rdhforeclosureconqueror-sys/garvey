"use strict";

const { ARCHETYPES, CLASS_DISTRIBUTION, CLASS_WEIGHTS } = require("./signals");
const { pairKey } = require("./pairScheduler");
const { desirabilityWarnings } = require("./desirabilityRules");
const { validateOptionDiversity } = require("./generateCandidates");
const { validateCompleteSentence, validateSingleBehavior, validateSingleTrigger, validateNoAbstractFiller, validateNaturalSpeech, validateOptionParityAcrossSet, validateDistinctPrimaries, validateNoDuplicateOpeners, validateGrammar, validateSayItOutLoud } = require("./validators");

function normalize(question) {
  return {
    ...question,
    question_class: question.question_class || question.questionClass,
    options: question.options || question.optionVariants,
  };
}

function validateBank(bankId, questions) {
  const normalized = questions.map(normalize);
  const classCounts = Object.fromEntries(Object.keys(CLASS_DISTRIBUTION).map((cls) => [cls, 0]));
  const primaryCounts = Object.fromEntries(ARCHETYPES.map((a) => [a, 0]));
  const secondaryCounts = Object.fromEntries(ARCHETYPES.map((a) => [a, 0]));
  const classPrimaryMatrix = Object.fromEntries(Object.keys(CLASS_DISTRIBUTION).map((cls) => [cls, Object.fromEntries(ARCHETYPES.map((a) => [a, 0]))]));
  const pairCounts = {};
  const failures = [];
  const warnings = [];

  if (normalized.length !== 25) failures.push(`Expected 25 questions, got ${normalized.length}`);

  for (const q of normalized) {
    classCounts[q.question_class] = (classCounts[q.question_class] || 0) + 1;
    const primaries = new Set();
    for (const opt of q.options) {
      const primary = opt.primary_archetype || opt.primary;
      const secondary = opt.secondary_archetype || opt.secondary;
      primaryCounts[primary] += 1;
      secondaryCounts[secondary] += 1;
      classPrimaryMatrix[q.question_class][primary] += 1;
      primaries.add(primary);
      const pKey = pairKey(primary, secondary);
      pairCounts[pKey] = (pairCounts[pKey] || 0) + 1;
    }
    if (primaries.size !== 4) failures.push(`${q.question_id || q.questionId} has duplicate primary archetypes`);
    if (!validateDistinctPrimaries(q.options)) failures.push(`${q.question_id || q.questionId} failed validateDistinctPrimaries`);
    if (!validateOptionParityAcrossSet(q.options)) failures.push(`${q.question_id || q.questionId} failed validateOptionParityAcrossSet`);
    const diversityFailures = validateOptionDiversity(q.options);
    for (const failure of diversityFailures) {
      failures.push(`${q.question_id || q.questionId} failed option diversity validation: ${failure}`);
    }
    for (const opt of q.options) {
      const text = opt.text || "";
      if (!validateCompleteSentence(text)) failures.push(`${q.question_id || q.questionId}/${opt.option_id || opt.id} failed validateCompleteSentence`);
      if (!validateSingleBehavior(text)) failures.push(`${q.question_id || q.questionId}/${opt.option_id || opt.id} failed validateSingleBehavior`);
      if (!validateSingleTrigger(text)) failures.push(`${q.question_id || q.questionId}/${opt.option_id || opt.id} failed validateSingleTrigger`);
      if (!validateNoAbstractFiller(text)) failures.push(`${q.question_id || q.questionId}/${opt.option_id || opt.id} failed validateNoAbstractFiller`);
      if (!validateNaturalSpeech(text)) failures.push(`${q.question_id || q.questionId}/${opt.option_id || opt.id} failed validateNaturalSpeech`);
      if (!validateGrammar(text)) failures.push(`${q.question_id || q.questionId}/${opt.option_id || opt.id} failed validateGrammar`);
      if (!validateSayItOutLoud(text)) failures.push(`${q.question_id || q.questionId}/${opt.option_id || opt.id} failed validateSayItOutLoud`);
    }
    warnings.push(...desirabilityWarnings(q.options));
  }

  if (!validateNoDuplicateOpeners(normalized)) failures.push("Bank failed validateNoDuplicateOpeners");

  for (const [cls, expected] of Object.entries(CLASS_DISTRIBUTION)) {
    if (classCounts[cls] !== expected) failures.push(`Class ${cls} expected ${expected}, got ${classCounts[cls] || 0}`);
    for (const a of ARCHETYPES) {
      if (classPrimaryMatrix[cls][a] < 1) failures.push(`Class ${cls} missing primary coverage for ${a}`);
    }
  }

  const expectedPrimaryPerArchetype = (normalized.length * 4) / ARCHETYPES.length;
  for (const a of ARCHETYPES) {
    if (primaryCounts[a] !== expectedPrimaryPerArchetype) {
      failures.push(`Primary count mismatch ${a}: expected ${expectedPrimaryPerArchetype}, got ${primaryCounts[a]}`);
    }
  }

  const pairValues = Object.values(pairCounts);
  if (pairValues.length) {
    const spread = Math.max(...pairValues) - Math.min(...pairValues);
    if (spread > 3) failures.push(`Pair distribution spread too high: ${spread}`);
  }

  const weightedPrimaryOpportunity = Object.fromEntries(ARCHETYPES.map((a) => [a, 0]));
  const weightedSecondaryOpportunity = Object.fromEntries(ARCHETYPES.map((a) => [a, 0]));

  for (const q of normalized) {
    const w = CLASS_WEIGHTS[q.question_class] || 1;
    for (const opt of q.options) {
      const p = opt.primary_archetype || opt.primary;
      const s = opt.secondary_archetype || opt.secondary;
      weightedPrimaryOpportunity[p] += 2 * w;
      weightedSecondaryOpportunity[s] += 1 * w;
    }
  }

  const primaryOppValues = Object.values(weightedPrimaryOpportunity);
  if (Math.max(...primaryOppValues) - Math.min(...primaryOppValues) > 2.5) {
    failures.push("Weighted primary opportunity spread exceeded threshold");
  }

  if (!normalized.some((q) => q.reverse_pair_id || q.reversePairId)) {
    warnings.push("No contradiction/reversal links found");
  }
  if (classCounts.DS !== 2) failures.push("DS class must be exactly 2");

  return {
    bankId,
    valid: failures.length === 0,
    classCounts,
    primaryCounts,
    classPrimaryMatrix,
    pairCounts,
    weightedPrimaryOpportunity,
    weightedSecondaryOpportunity,
    warnings,
    failures,
  };
}

module.exports = { validateBank };
