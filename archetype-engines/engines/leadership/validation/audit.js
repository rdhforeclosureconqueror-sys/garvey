"use strict";

const { LEADERSHIP_ITEM_MODEL } = require("../generator/itemModel");

function normalizePrompt(prompt) {
  return String(prompt || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSimilarity(a, b) {
  const setA = new Set(normalizePrompt(a).split(" ").filter(Boolean));
  const setB = new Set(normalizePrompt(b).split(" ").filter(Boolean));
  if (!setA.size || !setB.size) return 0;
  const intersection = Array.from(setA).filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union ? intersection / union : 0;
}

function hasSchemaFields(question = {}) {
  const required = [
    "question_id",
    "bank_id",
    "display_order",
    "engine",
    "question_class",
    "question_subclass",
    "prompt",
    "is_scored",
    "is_active",
    "options",
  ];
  return required.every((field) => Object.prototype.hasOwnProperty.call(question, field));
}

function validateLeadershipBank(bank = [], { itemModel = LEADERSHIP_ITEM_MODEL } = {}) {
  const expectedCount = Number(itemModel?.coverageExpectations?.questionsPerGeneratedSet || 25);
  const expectedOptions = Number(itemModel?.optionMappingRules?.optionsPerQuestion || 4);
  const validDimensions = new Set((itemModel?.coverageExpectations?.requiredDimensionCodes || []).map((code) => String(code || "").trim().toUpperCase()));
  const validSignals = new Set((itemModel?.signalTypes || []).map((value) => String(value || "").trim()));
  const validWeights = new Set((itemModel?.weightTypes || []).map((value) => String(value || "").trim()));

  if (!Array.isArray(bank) || bank.length !== expectedCount) {
    return { ok: false, reason: "invalid_question_count", details: { expected: expectedCount, actual: Array.isArray(bank) ? bank.length : 0 } };
  }

  const questionIds = new Set();
  const prompts = [];
  const coverage = Object.fromEntries([...validDimensions].map((code) => [code, { primary: 0, secondary: 0 }]));

  for (const question of bank) {
    if (!hasSchemaFields(question)) return { ok: false, reason: "schema_incomplete", details: { question_id: question?.question_id || null } };
    if (String(question.engine || "") !== "leadership") return { ok: false, reason: "invalid_engine", details: { question_id: question.question_id } };
    if (questionIds.has(question.question_id)) return { ok: false, reason: "duplicate_question_id", details: { question_id: question.question_id } };
    questionIds.add(question.question_id);

    if (!Array.isArray(question.options) || question.options.length !== expectedOptions) {
      return { ok: false, reason: "invalid_option_shape", details: { question_id: question.question_id, option_count: Array.isArray(question.options) ? question.options.length : 0 } };
    }

    const seenOptionIds = new Set();
    for (const option of question.options) {
      const primary = String(option.primary_dimension || "").trim().toUpperCase();
      const secondary = String(option.secondary_dimension || "").trim().toUpperCase();
      const primaryArch = String(option.primary_archetype || "").trim().toUpperCase();
      const secondaryArch = String(option.secondary_archetype || "").trim().toUpperCase();
      const weight = String(option.weight_type || "").trim();
      const signal = String(option.signal_type || "").trim();

      if (!option.option_id || seenOptionIds.has(option.option_id)) {
        return { ok: false, reason: "invalid_option_id", details: { question_id: question.question_id, option_id: option.option_id || null } };
      }
      seenOptionIds.add(option.option_id);

      if (!validDimensions.has(primary) || !validDimensions.has(secondary)) {
        return { ok: false, reason: "invalid_dimension_mapping", details: { question_id: question.question_id, option_id: option.option_id } };
      }
      if (primary !== primaryArch || secondary !== secondaryArch) {
        return { ok: false, reason: "archetype_dimension_mismatch", details: { question_id: question.question_id, option_id: option.option_id } };
      }
      if (!validWeights.has(weight)) {
        return { ok: false, reason: "invalid_weight_type", details: { question_id: question.question_id, option_id: option.option_id, weight_type: weight } };
      }
      if (!validSignals.has(signal)) {
        return { ok: false, reason: "invalid_signal_type", details: { question_id: question.question_id, option_id: option.option_id, signal_type: signal } };
      }

      coverage[primary].primary += 1;
      coverage[secondary].secondary += 1;
    }

    prompts.push({ id: question.question_id, text: question.prompt });
  }

  for (const [code, count] of Object.entries(coverage)) {
    const total = Number(count.primary || 0) + Number(count.secondary || 0);
    if (total <= 0) return { ok: false, reason: "dimension_coverage_gap", details: { code, count } };
  }

  const idSet = new Set(Array.from(questionIds));
  for (const question of bank) {
    if (question.reverse_pair_id && !idSet.has(question.reverse_pair_id)) {
      return { ok: false, reason: "invalid_reverse_pair", details: { question_id: question.question_id, reverse_pair_id: question.reverse_pair_id } };
    }
    if (question.desired_pair_id && !idSet.has(question.desired_pair_id)) {
      return { ok: false, reason: "invalid_desired_pair", details: { question_id: question.question_id, desired_pair_id: question.desired_pair_id } };
    }
  }

  const normalizedPromptMap = new Map();
  for (const prompt of prompts) {
    const normalized = normalizePrompt(prompt.text);
    if (normalizedPromptMap.has(normalized)) {
      return { ok: false, reason: "duplicate_prompt", details: { question_id: prompt.id, duplicate_of: normalizedPromptMap.get(normalized) } };
    }
    normalizedPromptMap.set(normalized, prompt.id);
  }

  for (let i = 0; i < prompts.length; i += 1) {
    for (let j = i + 1; j < prompts.length; j += 1) {
      if (tokenSimilarity(prompts[i].text, prompts[j].text) >= 0.92) {
        return {
          ok: false,
          reason: "prompt_similarity_too_high",
          details: { question_a: prompts[i].id, question_b: prompts[j].id },
        };
      }
    }
  }

  return {
    ok: true,
    reason: null,
    details: {
      questionCount: bank.length,
      coverage,
      signalTypeCount: validSignals.size,
      weightTypeCount: validWeights.size,
    },
  };
}

function runLeadershipBankAudit({ questionBanks = {}, sourceRouting = {}, attribution = {}, itemModel = LEADERSHIP_ITEM_MODEL } = {}) {
  const bankCounts = Object.fromEntries(Object.entries(questionBanks).map(([k, v]) => [k, (v || []).length]));
  const validationByBank = {};

  for (const [bankId, questions] of Object.entries(questionBanks || {})) {
    validationByBank[bankId] = validateLeadershipBank(questions || [], { itemModel });
  }

  return {
    bankCounts,
    validationByBank,
    classDistribution: itemModel.coverageExpectations.classDistribution,
    contradictionCoverage: itemModel.contradictionPairPatterns,
    desiredCoverage: itemModel.desiredPairPatterns,
    toneConstraints: itemModel.toneConstraints,
    retakeSourceRouting: sourceRouting,
    authoredFirstAttempt: sourceRouting.firstAttempt === "authored_bank_1",
    promotionManifestGovernance: sourceRouting.manifestGoverned === true,
    attributionContinuity: attribution,
  };
}

function runLeadershipSkeletonAudit(args = {}) {
  return runLeadershipBankAudit(args);
}

module.exports = {
  validateLeadershipBank,
  runLeadershipBankAudit,
  runLeadershipSkeletonAudit,
};
