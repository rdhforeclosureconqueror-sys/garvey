"use strict";

const ANSWER_SCALE = Object.freeze([
  Object.freeze({ value: 1, label: "Rarely true" }),
  Object.freeze({ value: 2, label: "Sometimes true" }),
  Object.freeze({ value: 3, label: "Often true" }),
  Object.freeze({ value: 4, label: "Very often true" }),
]);

const PARENT_INSTRUCTIONS = "Answer based on what you have observed in the past 6 to 8 weeks. There are no perfect answers. This screener is meant to identify current developmental patterns, not fixed labels. Your results are best treated as a starting point and should be confirmed over time with more evidence.";

function makeQuestion(id, prompt, primary_trait, secondary_trait) {
  return Object.freeze({
    id,
    prompt,
    respondent: "parent_guardian",
    answer_scale: ANSWER_SCALE,
    primary_trait,
    secondary_trait,
  });
}

const YOUTH_QUESTION_BANK = Object.freeze([
  makeQuestion("YT_POBS_Q01", "Before starting something important, my child makes some kind of plan, even a simple one.", "SR", "RS"),
  makeQuestion("YT_POBS_Q02", "When my child gets distracted, they can usually get themselves back on track without a lot of reminding.", "SR", "PS"),
  makeQuestion("YT_POBS_Q03", "My child notices mistakes in their work and tries to fix them on their own.", "SR", "FB"),
  makeQuestion("YT_POBS_Q04", "When a task has several steps, my child can keep track of what comes next.", "SR", "RS"),

  makeQuestion("YT_POBS_Q05", "My child asks “why,” “how,” or “what if” questions that go beyond the basic directions.", "CQ", "RS"),
  makeQuestion("YT_POBS_Q06", "When something interests my child, they keep exploring it even after the main activity is over.", "CQ", "DE"),
  makeQuestion("YT_POBS_Q07", "My child looks for extra information or examples without being told to.", "CQ", "DE"),
  makeQuestion("YT_POBS_Q08", "My child enjoys figuring out how something works instead of only being given the answer.", "CQ", "RS"),

  makeQuestion("YT_POBS_Q09", "My child comes up with more than one way to solve a problem.", "CR", "RS"),
  makeQuestion("YT_POBS_Q10", "My child makes unusual or surprising connections between ideas, objects, or experiences.", "CR", "CQ"),
  makeQuestion("YT_POBS_Q11", "During play, projects, or problem-solving, my child changes or improves the original idea instead of only copying it.", "CR", "DE"),
  makeQuestion("YT_POBS_Q12", "My child notices possibilities, uses, or questions that other people often miss.", "CR", "CQ"),

  makeQuestion("YT_POBS_Q13", "My child notices patterns, rules, or similarities quickly.", "RS", "CQ"),
  makeQuestion("YT_POBS_Q14", "When my child explains an answer, they can usually tell why they think it is right.", "RS", "SR"),
  makeQuestion("YT_POBS_Q15", "My child can use what they learned in one situation to help in a different one.", "RS", "FB"),
  makeQuestion("YT_POBS_Q16", "My child likes puzzles, sorting, strategy games, or figuring out how pieces fit together.", "RS", "DE"),

  makeQuestion("YT_POBS_Q17", "When work gets hard, my child usually keeps trying before giving up.", "PS", "SR"),
  makeQuestion("YT_POBS_Q18", "After getting something wrong, my child can recover and try again.", "PS", "FB"),
  makeQuestion("YT_POBS_Q19", "My child is willing to try a different approach when the first one does not work.", "PS", "CR"),

  makeQuestion("YT_POBS_Q20", "When someone gives helpful correction, my child usually uses it on the next try.", "FB", "PS"),
  makeQuestion("YT_POBS_Q21", "My child improves more after specific feedback than after general encouragement alone.", "FB", "SR"),
  makeQuestion("YT_POBS_Q22", "My child remembers past corrections and applies them later in a similar situation.", "FB", "RS"),

  makeQuestion("YT_POBS_Q23", "My child returns to certain topics or activities again and again on their own.", "DE", "CQ"),
  makeQuestion("YT_POBS_Q24", "When my child is highly interested in something, they spend extra time on it without needing pressure.", "DE", "PS"),
  makeQuestion("YT_POBS_Q25", "Over time, I can see my child’s knowledge, skill, or depth growing in at least one area they care about.", "DE", "CR"),
]);

module.exports = {
  YOUTH_QUESTION_BANK,
  YOUTH_PARENT_INSTRUCTIONS: PARENT_INSTRUCTIONS,
  YOUTH_ANSWER_SCALE: ANSWER_SCALE,
};
