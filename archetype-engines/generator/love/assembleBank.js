"use strict";

const { seededRandom } = require("./utils");
const { validateBank } = require("./validateBank");

function assembleBank({ bankId, seed, candidatePool }) {
  const rand = seededRandom(`${seed || bankId}:assemble`);
  const selected = candidatePool.map(({ blueprint, candidates }, idx) => {
    const chosen = candidates[Math.floor(rand() * candidates.length) % candidates.length];
    return {
      question_id: `Q${String(idx + 1).padStart(2, "0")}`,
      bank_id: bankId,
      display_order: idx + 1,
      engine: "love",
      question_class: chosen.questionClass,
      question_subclass: `${chosen.questionClass.toLowerCase()}_generated`,
      prompt: chosen.prompt,
      reverse_pair_id: blueprint.reversePairId || null,
      desired_pair_id: blueprint.desiredSelfEligible ? `DES_${blueprint.questionId}` : null,
      is_scored: true,
      is_active: true,
      options: chosen.optionVariants.map((opt) => ({
        option_id: opt.optionId,
        text: opt.text,
        primary_archetype: opt.primary,
        secondary_archetype: opt.secondary,
        weight_type: chosen.questionClass === "ID"
          ? "identity"
          : chosen.questionClass === "BH"
            ? "standard"
            : chosen.questionClass === "SC"
              ? "scenario"
              : chosen.questionClass === "ST"
                ? "stress"
                : "desired",
        signal_type: opt.signalType,
      })),
    };
  });

  const audit = validateBank(bankId, selected);
  return { bankId, questions: selected, audit };
}

module.exports = { assembleBank };
