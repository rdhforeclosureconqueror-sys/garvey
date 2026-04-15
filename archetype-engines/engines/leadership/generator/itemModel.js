"use strict";

const BANK_1 = require("../question-banks/leadership.bank1");

const DIMENSIONS = Object.freeze([
  { code: "VD", label: "Vision Drive", role: "future_direction" },
  { code: "SD", label: "Structure Drive", role: "execution_rigor" },
  { code: "RI", label: "Relational Intelligence", role: "human_attunement" },
  { code: "IE", label: "Influence Expression", role: "message_mobilization" },
  { code: "AC", label: "Adaptive Control", role: "contextual_recalibration" },
]);

const LEADERSHIP_TONE_CONSTRAINTS = Object.freeze({
  sentenceStyle: "first_person_leadership_reflection",
  avoid: ["clinical_jargon", "inflated_executive_speak", "abstract_without_action"],
  preserve: ["clear_behavior_language", "decision_context_clarity", "human_readability"],
});

function dedupeSorted(values = []) {
  return Object.freeze(Array.from(new Set(values.filter(Boolean))).sort());
}

function buildCoverageStats() {
  const classDistribution = {};
  const subclassCounts = {};
  const signalTypes = new Set();
  const weightTypes = new Set();
  const contradictionPairs = [];
  const desiredPairs = [];
  const primaryDimensionCounts = {};
  const secondaryDimensionCounts = {};

  for (const question of BANK_1) {
    classDistribution[question.question_class] = (classDistribution[question.question_class] || 0) + 1;
    subclassCounts[question.question_subclass] = (subclassCounts[question.question_subclass] || 0) + 1;

    if (question.reverse_pair_id) contradictionPairs.push([question.question_id, question.reverse_pair_id]);
    if (question.desired_pair_id) desiredPairs.push([question.question_id, question.desired_pair_id]);

    for (const option of question.options || []) {
      if (option.signal_type) signalTypes.add(option.signal_type);
      if (option.weight_type) weightTypes.add(option.weight_type);
      if (option.primary_dimension) primaryDimensionCounts[option.primary_dimension] = (primaryDimensionCounts[option.primary_dimension] || 0) + 1;
      if (option.secondary_dimension) secondaryDimensionCounts[option.secondary_dimension] = (secondaryDimensionCounts[option.secondary_dimension] || 0) + 1;
    }
  }

  return {
    questionClassDistribution: Object.freeze(classDistribution),
    questionSubclassCounts: Object.freeze(subclassCounts),
    signalTypes: dedupeSorted(Array.from(signalTypes)),
    weightTypes: dedupeSorted(Array.from(weightTypes)),
    contradictionPairPatterns: Object.freeze(contradictionPairs),
    desiredPairPatterns: Object.freeze(desiredPairs),
    primaryDimensionCounts: Object.freeze(primaryDimensionCounts),
    secondaryDimensionCounts: Object.freeze(secondaryDimensionCounts),
  };
}

const coverage = buildCoverageStats();

const RECURRING_FORMS = Object.freeze(BANK_1.map((question) => Object.freeze({
  questionId: question.question_id,
  displayOrder: question.display_order,
  questionClass: question.question_class,
  questionSubclass: question.question_subclass,
  promptPattern: question.prompt,
  contradictionPairId: question.reverse_pair_id,
  desiredPairId: question.desired_pair_id,
  optionShape: Object.freeze((question.options || []).map((option) => Object.freeze({
    optionId: option.option_id,
    primaryDimension: option.primary_dimension,
    secondaryDimension: option.secondary_dimension,
    primaryArchetype: option.primary_archetype,
    secondaryArchetype: option.secondary_archetype,
    weightType: option.weight_type,
    signalType: option.signal_type,
  }))),
})));

const LEADERSHIP_ITEM_MODEL = Object.freeze({
  id: "leadership_item_model_v1",
  sourceBanks: Object.freeze([
    "archetype-engines/engines/leadership/question-banks/leadership.bank1.js",
  ]),
  dimensions: DIMENSIONS,
  toneConstraints: LEADERSHIP_TONE_CONSTRAINTS,
  questionClasses: Object.freeze(Object.keys(coverage.questionClassDistribution).sort()),
  questionSubclasses: dedupeSorted(Object.keys(coverage.questionSubclassCounts)),
  signalTypes: coverage.signalTypes,
  weightTypes: coverage.weightTypes,
  optionMappingRules: Object.freeze({
    optionsPerQuestion: 4,
    optionIds: Object.freeze(["A", "B", "C", "D"]),
    primaryAndSecondaryMustBeDimensions: true,
    archetypeDimensionParityRequired: true,
  }),
  contradictionPairPatterns: coverage.contradictionPairPatterns,
  desiredPairPatterns: coverage.desiredPairPatterns,
  coverageExpectations: Object.freeze({
    questionsPerGeneratedSet: 25,
    optionCountPerQuestion: 4,
    requiredDimensionCodes: DIMENSIONS.map((item) => item.code),
    classDistribution: coverage.questionClassDistribution,
    subclassCoverageCount: Object.keys(coverage.questionSubclassCounts).length,
    minimumSignalVariety: coverage.signalTypes.length,
    minimumWeightVariety: coverage.weightTypes.length,
  }),
  recurringQuestionForms: RECURRING_FORMS,
  authoredBankCoverage: coverage,
});

module.exports = {
  LEADERSHIP_ITEM_MODEL,
  LEADERSHIP_AUTHORED_BANK_1: Object.freeze(BANK_1.map((question) => Object.freeze(question))),
};
