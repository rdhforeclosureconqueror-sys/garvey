"use strict";

const BANK_1 = require("../question-banks/loyalty.bank1");
const BANK_2 = require("../question-banks/loyalty.bank2");
const BANK_3 = require("../question-banks/loyalty.bank3");

const ALL_AUTHORED_BANKS = Object.freeze([BANK_1, BANK_2, BANK_3]);

const DIMENSIONS = Object.freeze([
  { code: "TD", label: "Trust Dependence", role: "confidence_and_reliability" },
  { code: "SA", label: "Satisfaction Attachment", role: "value_and_outcome_quality" },
  { code: "ECM", label: "Emotional Commitment", role: "identity_and_belonging" },
  { code: "CH", label: "Convenience Habit", role: "ease_and_routine" },
  { code: "SF", label: "Switching Friction", role: "cost_of_change" },
]);

const LOYALTY_TONE_CONSTRAINTS = Object.freeze({
  sentenceStyle: "first_person_concrete",
  avoid: ["clinical_jargon", "grandiose_claims", "romanticized_brand_language"],
  preserve: ["human_readability", "everyday_relationship_framing", "clear_tradeoff_language"],
});

function extractCoverageStats() {
  const classDistribution = {};
  const subclassCounts = {};
  const signalTypes = new Set();

  for (const bank of ALL_AUTHORED_BANKS) {
    for (const question of bank) {
      classDistribution[question.question_class] = (classDistribution[question.question_class] || 0) + 1;
      subclassCounts[question.question_subclass] = (subclassCounts[question.question_subclass] || 0) + 1;
      for (const option of question.options || []) {
        if (option.signal_type) signalTypes.add(option.signal_type);
      }
    }
  }

  return {
    questionClassDistribution: classDistribution,
    recurringQuestionForms: Object.keys(subclassCounts).sort(),
    signalTypeCount: signalTypes.size,
  };
}

const BANK_1_FORMS = Object.freeze(BANK_1.map((question) => Object.freeze({
  displayOrder: question.display_order,
  questionClass: question.question_class,
  questionSubclass: question.question_subclass,
  promptPattern: question.prompt,
  answerShape: (question.options || []).map((option) => ({
    optionId: option.option_id,
    weightType: option.weight_type,
    primaryDimension: option.primary_dimension,
    secondaryDimension: option.secondary_dimension,
    signalType: option.signal_type,
  })),
})));

const coverage = extractCoverageStats();

const LOYALTY_ITEM_MODEL = Object.freeze({
  id: "loyalty_item_model_v1",
  sourceBanks: Object.freeze([
    "archetype-engines/engines/loyalty/question-banks/loyalty.bank1.js",
    "archetype-engines/engines/loyalty/question-banks/loyalty.bank2.js",
    "archetype-engines/engines/loyalty/question-banks/loyalty.bank3.js",
  ]),
  dimensions: DIMENSIONS,
  thematicCategories: Object.freeze([
    "trust_reliability",
    "satisfaction_value",
    "emotional_connection",
    "habit_and_default_behavior",
    "switching_cost_and_exit_friction",
  ]),
  toneConstraints: LOYALTY_TONE_CONSTRAINTS,
  coverageExpectations: Object.freeze({
    questionsPerGeneratedSet: 25,
    optionCountPerQuestion: 4,
    dimensionPresence: DIMENSIONS.map((item) => item.code),
    classDistributionAcrossAuthoredBanks: coverage.questionClassDistribution,
    minimumSignalVariety: 25,
  }),
  recurringQuestionForms: BANK_1_FORMS,
  authoredBankCoverage: coverage,
});

module.exports = {
  LOYALTY_ITEM_MODEL,
  ALL_AUTHORED_BANKS,
};
