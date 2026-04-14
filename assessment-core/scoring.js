"use strict";

const QUESTION_CLASS_MULTIPLIERS = Object.freeze({ ID: 1.0, BH: 1.0, SC: 1.25, ST: 1.5, DS: 1.0 });
const PRIMARY_WEIGHT = 2;
const SECONDARY_WEIGHT = 1;

function normalizeQuestion(question = {}) {
  return {
    question_id: question.question_id || question.id,
    bank_id: question.bank_id || question.bankId,
    display_order: question.display_order || question.displayOrder || null,
    engine: question.engine || null,
    question_class: String(question.question_class || question.questionClass || "BH").toUpperCase(),
    question_subclass: question.question_subclass || question.questionSubclass || null,
    prompt: question.prompt || "",
    reverse_pair_id: question.reverse_pair_id || question.reversePairId || null,
    desired_pair_id: question.desired_pair_id || question.desiredPairId || null,
    is_scored: question.is_scored !== false && question.isScored !== false,
    is_active: question.is_active !== false && question.isActive !== false,
    options: (question.options || []).map((option) => ({
      option_id: option.option_id || option.id,
      text: option.text || "",
      primary_dimension: option.primary_dimension || option.primary_archetype || option.primary,
      secondary_dimension: option.secondary_dimension || option.secondary_archetype || option.secondary || null,
      weight_type: option.weight_type || option.weightType || "standard",
      signal_type: option.signal_type || option.signalType || String(question.question_class || question.questionClass || "BH").toUpperCase(),
      direction_value: option.direction_value ?? option.directionValue ?? null,
    })),
  };
}

function scoreOptionForDimension(question, option, dimensionCode) {
  if (!option || !dimensionCode) return 0;
  const multiplier = QUESTION_CLASS_MULTIPLIERS[question.question_class] || 1.0;
  let score = 0;
  if (option.primary_dimension === dimensionCode) score += PRIMARY_WEIGHT * multiplier;
  if (option.secondary_dimension === dimensionCode) score += SECONDARY_WEIGHT * multiplier;
  return score;
}

function computeMaxPossibleScores(questions = [], dimensions = []) {
  const result = Object.fromEntries(dimensions.map((code) => [code, 0]));
  for (const question of questions) {
    if (!question.is_scored) continue;
    for (const dimensionCode of dimensions) {
      let bestForDimension = 0;
      for (const option of question.options || []) {
        bestForDimension = Math.max(bestForDimension, scoreOptionForDimension(question, option, dimensionCode));
      }
      result[dimensionCode] += bestForDimension;
    }
  }
  return result;
}

module.exports = {
  QUESTION_CLASS_MULTIPLIERS,
  PRIMARY_WEIGHT,
  SECONDARY_WEIGHT,
  normalizeQuestion,
  scoreOptionForDimension,
  computeMaxPossibleScores,
};
