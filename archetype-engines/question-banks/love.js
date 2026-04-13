"use strict";

const ENGINE = "love";
const BANK_IDS = ["BANK_1", "BANK_2", "BANK_3"];
const ARCHETYPES = [
  { code: "RS", label: "Reassurance Seeker" },
  { code: "AL", label: "Autonomous Lover" },
  { code: "EC", label: "Expression Connector" },
  { code: "AV", label: "Action Validator" },
  { code: "ES", label: "Experience Seeker" },
];
const QUESTION_CLASSES = ["ID", "BH", "SC", "ST", "DS"];

function option(optionId, text, primary, secondary, weightType, signalType) {
  return {
    option_id: optionId,
    text,
    primary_archetype: primary,
    secondary_archetype: secondary,
    weight_type: weightType,
    signal_type: signalType,
  };
}

function makeOptions(questionClass, favorCode, contrastCode) {
  return [
    option("a", "Strongly disagree", contrastCode, favorCode, "standard", questionClass),
    option("b", "Disagree", contrastCode, null, "baseline", questionClass),
    option("c", "Agree", favorCode, contrastCode, "baseline", questionClass),
    option("d", "Strongly agree", favorCode, null, "standard", questionClass),
  ];
}

function buildQuestion(bankId, displayOrder, questionClass, archetype, reversePairId = null) {
  const contrast = ARCHETYPES.find((candidate) => candidate.code !== archetype.code)?.code || "RS";
  return {
    question_id: `love_${bankId.toLowerCase()}_${displayOrder}`,
    bank_id: bankId,
    display_order: displayOrder,
    question_class: questionClass,
    question_subclass: `${questionClass}_core`,
    prompt: `${archetype.label}: ${questionClass} reflection #${displayOrder}`,
    reverse_pair_id: reversePairId,
    desired_pair_id: questionClass === "DS" ? `love_${bankId.toLowerCase()}_${displayOrder - 20}` : null,
    is_scored: true,
    is_active: true,
    options: makeOptions(questionClass, archetype.code, contrast),
    engine: ENGINE,
  };
}

const questions = [];
for (const bankId of BANK_IDS) {
  let order = 1;
  for (const questionClass of QUESTION_CLASSES) {
    for (const archetype of ARCHETYPES) {
      questions.push(buildQuestion(bankId, order, questionClass, archetype));
      order += 1;
    }
  }

  // Add deterministic contradiction pairing by adjacent pairs in same class.
  for (let idx = questions.length - 25; idx < questions.length; idx += 2) {
    const a = questions[idx];
    const b = questions[idx + 1];
    if (!a || !b) continue;
    a.reverse_pair_id = b.question_id;
    b.reverse_pair_id = a.question_id;
  }
}

module.exports = Object.freeze(questions);
