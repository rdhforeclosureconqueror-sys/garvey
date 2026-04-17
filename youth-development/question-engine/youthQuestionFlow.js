"use strict";

const { YOUTH_QUESTION_BANK } = require("./youthQuestionBank");

const QUESTION_INDEX = Object.freeze(Object.fromEntries(YOUTH_QUESTION_BANK.map((question, idx) => [question.id, idx])));

function normalizeAnswers(input) {
  if (!input || typeof input !== "object") {
    return {};
  }

  if (Array.isArray(input.answers)) {
    return input.answers.reduce((acc, answer) => {
      if (answer && typeof answer === "object" && typeof answer.question_id === "string") {
        acc[answer.question_id] = answer.value;
      }
      return acc;
    }, {});
  }

  if (input.answers && typeof input.answers === "object" && !Array.isArray(input.answers)) {
    return { ...input.answers };
  }

  return {};
}

function validateAnswers(input) {
  const normalized = normalizeAnswers(input);
  const errors = [];
  const answerPairs = [];

  for (const question of YOUTH_QUESTION_BANK) {
    const rawValue = normalized[question.id];
    if (!Number.isFinite(rawValue)) {
      errors.push(`missing answer for ${question.id}`);
      continue;
    }
    const value = Number(rawValue);
    if (![1, 2, 3, 4].includes(value)) {
      errors.push(`invalid answer value for ${question.id}; expected 1..4`);
      continue;
    }
    answerPairs.push({ question_id: question.id, category: question.category, value });
  }

  return {
    ok: errors.length === 0,
    errors,
    answers: answerPairs,
  };
}

function getQuestionFlowState(input = {}) {
  const normalizedAnswers = normalizeAnswers(input);
  const answeredIds = YOUTH_QUESTION_BANK
    .filter((question) => Number.isFinite(Number(normalizedAnswers[question.id])))
    .map((question) => question.id);

  const nextQuestion = YOUTH_QUESTION_BANK.find((question) => !answeredIds.includes(question.id)) || null;
  const currentIndex = nextQuestion ? QUESTION_INDEX[nextQuestion.id] : YOUTH_QUESTION_BANK.length;

  return {
    total_questions: YOUTH_QUESTION_BANK.length,
    answered_count: answeredIds.length,
    completion_ratio: Number((answeredIds.length / YOUTH_QUESTION_BANK.length).toFixed(4)),
    completed: answeredIds.length === YOUTH_QUESTION_BANK.length,
    current_index: currentIndex,
    next_question: nextQuestion,
    answered_question_ids: answeredIds,
  };
}

module.exports = {
  getQuestionFlowState,
  validateAnswers,
};
