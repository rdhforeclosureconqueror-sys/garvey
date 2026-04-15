"use strict";

const crypto = require("node:crypto");
const { LEADERSHIP_ITEM_MODEL, LEADERSHIP_AUTHORED_BANK_1 } = require("./itemModel");
const { validateLeadershipBank } = require("../validation/audit");

function stablePick(seed, key, options = []) {
  if (!Array.isArray(options) || options.length === 0) return "";
  const hash = crypto.createHash("sha256").update(`${seed}:${key}`).digest("hex");
  const idx = parseInt(hash.slice(0, 8), 16) % options.length;
  return options[idx];
}

const PROMPT_SUFFIXES = Object.freeze([
  "in a real leadership moment.",
  "when outcomes and people both matter.",
  "under day-to-day execution pressure.",
  "when the team needs clarity now.",
]);

const OPTION_PREFIXES = Object.freeze([
  "Most often,",
  "In practice,",
  "Usually,",
  "When it matters,",
]);

function normalizePrompt(prompt, seed, order) {
  const base = String(prompt || "").replace(/\s+/g, " ").trim().replace(/[:?.!]+$/, "");
  const suffix = stablePick(seed, `prompt:${order}`, PROMPT_SUFFIXES);
  return `${base}: ${suffix}`;
}

function normalizeOptionText(text, seed, questionId, optionId) {
  const prefix = stablePick(seed, `option:${questionId}:${optionId}`, OPTION_PREFIXES);
  const body = String(text || "").replace(/\s+/g, " ").trim().replace(/^[A-Z]/, (c) => c.toLowerCase());
  return `${prefix} ${body}.`;
}

function toGeneratedQuestion(question, { bankId, seed, pairIdMap = {} }) {
  const generatedId = String(question.question_id || "").replace("LEAD_B1_", "LEAD_G_");
  return {
    question_id: generatedId,
    bank_id: bankId,
    display_order: question.display_order,
    engine: "leadership",
    question_class: question.question_class,
    question_subclass: question.question_subclass,
    prompt: normalizePrompt(question.prompt, seed, question.display_order),
    reverse_pair_id: question.reverse_pair_id ? (pairIdMap[question.reverse_pair_id] || null) : null,
    desired_pair_id: question.desired_pair_id ? (pairIdMap[question.desired_pair_id] || null) : null,
    is_scored: true,
    is_active: true,
    options: (question.options || []).map((option) => ({
      option_id: option.option_id,
      text: normalizeOptionText(option.text, seed, generatedId, option.option_id),
      primary_dimension: option.primary_dimension,
      secondary_dimension: option.secondary_dimension,
      primary_archetype: option.primary_archetype || option.primary_dimension,
      secondary_archetype: option.secondary_archetype || option.secondary_dimension,
      weight_type: option.weight_type,
      signal_type: option.signal_type,
    })),
  };
}

function generateLeadershipBank({ seed = "LEADERSHIP_BANK_A", bankId = "LEADERSHIP_BANK_A" } = {}) {
  const pairIdMap = Object.fromEntries(
    LEADERSHIP_AUTHORED_BANK_1.map((question) => [question.question_id, String(question.question_id || "").replace("LEAD_B1_", "LEAD_G_")])
  );
  const questions = LEADERSHIP_AUTHORED_BANK_1.map((question) => toGeneratedQuestion(question, { bankId, seed, pairIdMap }));
  const validation = validateLeadershipBank(questions, { itemModel: LEADERSHIP_ITEM_MODEL });

  return {
    bankId,
    seed,
    questionCount: questions.length,
    itemModelId: LEADERSHIP_ITEM_MODEL.id,
    questions,
    validation,
  };
}

module.exports = {
  LEADERSHIP_ITEM_MODEL,
  generateLeadershipBank,
  validateLeadershipBank,
};
