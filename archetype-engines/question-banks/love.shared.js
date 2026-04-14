"use strict";

const ENGINE = "love";
const ARCHETYPES = Object.freeze(["RS", "AL", "EC", "AV", "ES"]);
const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });
const SIGNAL_BY_ARCHETYPE = Object.freeze({
  RS: "closeness_seeking",
  AL: "distance_regulation",
  EC: "verbal_repair",
  AV: "proof_based_trust",
  ES: "novelty_activation",
});

const CLASS_PROMPTS = Object.freeze({
  ID: [
    "What feels most central to how you love?",
    "Which statement reflects your relationship identity most?",
    "In lasting connection, what defines your core style?",
    "What best describes your natural romantic orientation?",
    "What foundation feels most true to who you are?",
  ],
  BH: [
    "In everyday relationships, what do you do most often?",
    "When things are normal between you and a partner, you usually:",
    "In regular relationship rhythm, you tend to:",
    "Which day-to-day pattern sounds most like you?",
    "When love is steady, your default move is:",
    "In practical relationship behavior, you usually:",
  ],
  SC: [
    "A meaningful moment opens up suddenly. Your first instinct is:",
    "A partner brings up an important life decision. You respond by:",
    "Plans change unexpectedly during a shared weekend. You:",
    "Your partner asks for a reset conversation. You:",
    "A major opportunity appears for both of you. You prioritize:",
    "You are rebuilding trust after a misunderstanding. You focus on:",
  ],
  ST: [
    "Under stress in love, your reflex tends to be:",
    "When tension rises sharply, you are most likely to:",
    "When you feel emotionally overloaded, you typically:",
    "In conflict that feels unresolved, your pattern is:",
    "If you fear disconnection, you most often:",
    "During uncertainty, your stabilizing response is:",
  ],
  DS: [
    "The growth edge I most want in relationships is:",
    "To become more balanced in love, I want to:",
  ],
});

const OPTION_TEXT = Object.freeze({
  RS: "Prioritize closeness, reassurance, and emotional contact.",
  AL: "Protect healthy space, autonomy, and emotional pacing.",
  EC: "Lead with direct dialogue, naming feelings and repair.",
  AV: "Anchor trust in consistency, follow-through, and proof.",
  ES: "Bring novelty, shared experiences, and adaptive energy.",
});

const SECONDARY_ORDER = Object.freeze({
  RS: ["AL", "EC", "AV", "ES"],
  AL: ["EC", "AV", "ES", "RS"],
  EC: ["AV", "ES", "RS", "AL"],
  AV: ["ES", "RS", "AL", "EC"],
  ES: ["RS", "AL", "EC", "AV"],
});

function option(optionId, text, primary, secondary, questionClass) {
  return {
    option_id: optionId,
    text,
    primary_archetype: primary,
    secondary_archetype: secondary,
    weight_type: WEIGHT_BY_CLASS[questionClass],
    signal_type: SIGNAL_BY_ARCHETYPE[primary],
  };
}

function makeQuestion(index, bankId, questionClass, questionSubclass, prompt, options) {
  const bankNum = bankId.split("_")[1];
  const n = String(index).padStart(2, "0");
  return {
    question_id: `B${bankNum}_Q${n}`,
    bank_id: bankId,
    display_order: index,
    engine: ENGINE,
    question_class: questionClass,
    question_subclass: questionSubclass,
    prompt,
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options,
  };
}

function buildBank({ bankId, omissionByClass }) {
  const primarySeen = Object.fromEntries(ARCHETYPES.map((code) => [code, 0]));
  const questions = [];
  let displayOrder = 1;

  for (const [questionClass, omissions] of Object.entries(omissionByClass)) {
    const prompts = CLASS_PROMPTS[questionClass];
    omissions.forEach((omitted, idx) => {
      const primaries = ARCHETYPES.filter((code) => code !== omitted);
      const options = primaries.map((primary, optionIdx) => {
        const cycle = SECONDARY_ORDER[primary];
        const secondary = cycle[primarySeen[primary] % cycle.length];
        primarySeen[primary] += 1;
        return option(String.fromCharCode(65 + optionIdx), OPTION_TEXT[primary], primary, secondary, questionClass);
      });
      questions.push(makeQuestion(
        displayOrder,
        bankId,
        questionClass,
        `${questionClass.toLowerCase()}_balanced`,
        prompts[idx % prompts.length],
        options,
      ));
      displayOrder += 1;
    });
  }

  if (questions.length !== 25) throw new Error(`${bankId} must contain 25 questions`);
  return Object.freeze(questions);
}

module.exports = { ARCHETYPES, buildBank };
