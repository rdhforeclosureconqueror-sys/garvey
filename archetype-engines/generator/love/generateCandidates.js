"use strict";

const { SIGNAL_LIBRARY } = require("./signals");

const PROMPT_TEMPLATES = {
  ID: [
    "Which relationship rhythm feels most like you at your core?",
    "When love feels most natural, which pattern is closest to you?",
    "Which statement best matches your relationship identity?",
  ],
  BH: [
    "In a normal week with a partner, what do you do most often?",
    "When things are steady, which behavior sounds most like you?",
    "In day-to-day connection, which move comes most naturally?",
  ],
  SC: [
    "A meaningful decision comes up suddenly. You usually:",
    "Plans shift in an important moment. Your first move is to:",
    "Your partner asks for alignment on something big. You tend to:",
  ],
  ST: [
    "When tension spikes, your automatic response is to:",
    "Under relationship stress, you usually:",
    "When disconnection feels close, you tend to:",
  ],
  DS: [
    "The growth edge I want to practice more is:",
    "To feel more balanced in love, I want to:",
    "My next relationship upgrade would be to:",
  ],
};

const OPTION_TEMPLATES = {
  RS: [
    "Ask for reassurance and clear emotional contact.",
    "Move closer and look for warm confirmation.",
  ],
  AL: [
    "Create space to think, then reconnect with intention.",
    "Protect personal pace while staying available.",
  ],
  EC: [
    "Start an honest conversation to name what is happening.",
    "Talk it through clearly so both sides feel understood.",
  ],
  AV: [
    "Focus on consistent follow-through more than promises.",
    "Look for concrete actions that rebuild trust.",
  ],
  ES: [
    "Shift energy through a fresh shared experience.",
    "Create a new moment together to restore connection.",
  ],
};

function generateCandidatesForBlueprint(blueprint) {
  const promptVariants = PROMPT_TEMPLATES[blueprint.questionClass] || PROMPT_TEMPLATES.BH;
  return promptVariants.map((prompt, idx) => ({
    questionId: blueprint.questionId,
    bankId: blueprint.bankId,
    questionClass: blueprint.questionClass,
    prompt,
    optionVariants: blueprint.optionBlueprints.map((ob, optionIndex) => ({
      optionId: String.fromCharCode(65 + optionIndex),
      text: OPTION_TEMPLATES[ob.primary][(idx + optionIndex) % OPTION_TEMPLATES[ob.primary].length],
      primary: ob.primary,
      secondary: ob.secondary,
      signalType: ob.signal.replace(/\s+/g, "_").toLowerCase(),
      desirabilityScoreEstimate: null,
      signalProfileName: SIGNAL_LIBRARY[ob.primary].name,
    })),
    sourceBlueprintId: blueprint.questionId,
  }));
}

function generateCandidatePool(blueprints) {
  return blueprints.map((bp) => ({
    blueprint: bp,
    candidates: generateCandidatesForBlueprint(bp),
  }));
}

module.exports = { generateCandidatesForBlueprint, generateCandidatePool };
