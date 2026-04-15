"use strict";

const crypto = require("node:crypto");
const { LOYALTY_ITEM_MODEL } = require("./itemModel");
const BANK_1 = require("../question-banks/loyalty.bank1");

function stablePick(seed, key, options = []) {
  if (!Array.isArray(options) || options.length === 0) return "";
  const hash = crypto.createHash("sha256").update(`${seed}:${key}`).digest("hex");
  const idx = parseInt(hash.slice(0, 8), 16) % options.length;
  return options[idx];
}

const PROMPT_SUFFIXES = Object.freeze([
  "when the relationship is tested.",
  "in a real everyday moment.",
  "when things are mostly steady.",
  "when expectations are clear.",
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
  const body = String(text || "").replace(/\s+/g, " ").trim().replace(/^[a-z]/, (c) => c.toLowerCase());
  return `${prefix} ${body}.`;
}

function toGeneratedQuestion(question, { bankId, seed }) {
  const generatedId = String(question.question_id || "").replace("LOY_B1_", "LOY_G_");
  return {
    question_id: generatedId,
    bank_id: bankId,
    display_order: question.display_order,
    engine: "loyalty",
    question_class: question.question_class,
    question_subclass: question.question_subclass || "generated",
    prompt: normalizePrompt(question.prompt, seed, question.display_order),
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: (question.options || []).map((option) => ({
      option_id: option.option_id,
      text: normalizeOptionText(option.text, seed, generatedId, option.option_id),
      primary_archetype: option.primary_archetype || option.primary_dimension,
      secondary_archetype: option.secondary_archetype || option.secondary_dimension,
      weight_type: option.weight_type || "standard",
      signal_type: option.signal_type || "generated_signal",
    })),
  };
}

function validateLoyaltyBank(bank = []) {
  if (!Array.isArray(bank) || bank.length !== LOYALTY_ITEM_MODEL.coverageExpectations.questionsPerGeneratedSet) {
    return { ok: false, reason: "invalid_question_count" };
  }
  for (const question of bank) {
    if (!Array.isArray(question.options) || question.options.length !== 4) return { ok: false, reason: "invalid_option_shape" };
    for (const option of question.options) {
      if (!option.primary_archetype || !option.secondary_archetype) return { ok: false, reason: "missing_dimension_mapping" };
    }
  }
  return { ok: true, reason: null };
}

function generateLoyaltyBank({ seed = "LOYALTY_BANK_A", bankId = "LOYALTY_BANK_A" } = {}) {
  const questions = BANK_1.map((question) => toGeneratedQuestion(question, { bankId, seed }));
  const validation = validateLoyaltyBank(questions);
  return {
    bankId,
    seed,
    questionCount: questions.length,
    itemModelId: LOYALTY_ITEM_MODEL.id,
    questions,
    validation,
  };
}

module.exports = {
  LOYALTY_ITEM_MODEL,
  generateLoyaltyBank,
  validateLoyaltyBank,
};
