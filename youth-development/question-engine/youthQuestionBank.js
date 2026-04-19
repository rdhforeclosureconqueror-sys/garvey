"use strict";

const { ASSESSMENT_CONTENT_BANKS, ANSWER_SCALE_1_TO_4 } = require("../content/assessmentContentBanks");

const PARENT_INSTRUCTIONS = "Answer based on what you have observed in the past 6 to 8 weeks. There are no perfect answers. This screener is meant to identify current developmental patterns, not fixed labels. Your results are best treated as a starting point and should be confirmed over time with more evidence.";

const YOUTH_QUESTION_BANK = Object.freeze(
  ASSESSMENT_CONTENT_BANKS.parent_baseline_intake
    .filter((item) => item.active)
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((item) => Object.freeze({
      id: item.item_id,
      prompt: item.prompt_text,
      respondent: item.response_schema.respondent || "parent_guardian",
      answer_scale: ANSWER_SCALE_1_TO_4,
      primary_trait: item.target_traits[0],
      secondary_trait: item.target_traits[1] || null,
    }))
);

module.exports = {
  YOUTH_QUESTION_BANK,
  YOUTH_PARENT_INSTRUCTIONS: PARENT_INSTRUCTIONS,
  YOUTH_ANSWER_SCALE: ANSWER_SCALE_1_TO_4,
};
