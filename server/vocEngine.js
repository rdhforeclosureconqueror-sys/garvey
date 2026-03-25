"use strict";

const { scoreSubmission, validateAnswers } = require("./intelligenceEngine");

function normalizeAnswers(answers = []) {
  return (answers || []).map((a, idx) => {
    if (a && typeof a === "object") return { qid: a.qid || `CU${idx + 1}`, answer: a.answer || a.choice };
    return { qid: `CU${idx + 1}`, answer: a };
  });
}

function scoreVOCAnswers(answers = []) {
  const normalized = normalizeAnswers(answers);
  const validation = validateAnswers("customer", normalized);
  if (!validation.ok) {
    throw new Error(validation.error);
  }
  return scoreSubmission("customer", normalized);
}

function generateVOCProfile(scored) {
  return {
    customer_profile: scored.primary,
    engagement_style: scored.personality_primary,
    buying_trigger: scored.secondary,
    friction_point: scored.weakness,
    loyalty_driver: scored.personality_secondary,
    scores: scored.archetype_counts,
    personality_counts: scored.personality_counts,
  };
}

function mergeVOCIntoConfig(existingConfig = {}, vocResult = {}) {
  return {
    ...(existingConfig || {}),
    voc_profile: {
      customer_profile: vocResult.customer_profile || null,
      personality: vocResult.engagement_style || null,
      weakness: vocResult.friction_point || null,
      updated_at: new Date().toISOString(),
    },
  };
}

module.exports = {
  scoreVOCAnswers,
  generateVOCProfile,
  mergeVOCIntoConfig,
};
