"use strict";

const { GATES, QUESTIONS } = require("./gatesAssessmentQuestions");

const OPTION_WEIGHTS = Object.freeze({ rarely: 1, sometimes: 2, often: 3, consistently: 4 });
const STAGE_BY_RATIO = Object.freeze([
  { max: 0.24, stage: "emerging" },
  { max: 0.49, stage: "developing" },
  { max: 0.74, stage: "practicing" },
  { max: 1, stage: "integrating" },
]);

function buildQuestionIndex() {
  const byId = new Map();
  const questionsByGate = new Map();
  for (const question of QUESTIONS) {
    byId.set(question.question_id, question);
    const list = questionsByGate.get(question.gate_number) || [];
    list.push(question);
    questionsByGate.set(question.gate_number, list);
  }
  return { byId, questionsByGate };
}

function validateAndNormalizeAnswers(answers) {
  if (!Array.isArray(answers)) throw new Error("answers_must_be_array");
  const { byId } = buildQuestionIndex();
  const seen = new Set();
  const normalized = [];
  for (const answer of answers) {
    const questionId = String(answer?.question_id || "").trim();
    const value = String(answer?.value || "").trim().toLowerCase();
    if (!questionId || !byId.has(questionId)) throw new Error("invalid_question_id");
    if (seen.has(questionId)) throw new Error("duplicate_question_id");
    if (!Object.hasOwn(OPTION_WEIGHTS, value)) throw new Error("invalid_option_value");
    seen.add(questionId);
    normalized.push({ question_id: questionId, value });
  }
  return normalized;
}

function stageFromNormalized(normalizedScore) {
  for (const entry of STAGE_BY_RATIO) {
    if (normalizedScore <= entry.max) return entry.stage;
  }
  return "integrating";
}

function scoreGatesAssessment(answers) {
  const normalizedAnswers = validateAndNormalizeAnswers(answers);
  const { byId, questionsByGate } = buildQuestionIndex();
  const answerByQuestionId = new Map(normalizedAnswers.map((a) => [a.question_id, a.value]));

  const gateScores = GATES.map((gate) => {
    const gateQuestions = questionsByGate.get(gate.gate_number) || [];
    const maxScore = gateQuestions.length * 4;
    let rawScore = 0;
    for (const question of gateQuestions) {
      const value = answerByQuestionId.get(question.question_id);
      if (!value) continue;
      rawScore += OPTION_WEIGHTS[value];
    }
    const normalizedScore = maxScore > 0 ? Number((rawScore / maxScore).toFixed(3)) : 0;
    return {
      gate_number: gate.gate_number,
      gate_key: gate.gate_key,
      name: gate.name,
      raw_score: rawScore,
      max_score: maxScore,
      normalized_score: normalizedScore,
      current_stage: stageFromNormalized(normalizedScore),
    };
  });

  const sorted = [...gateScores].sort((a, b) => b.normalized_score - a.normalized_score || a.gate_number - b.gate_number);
  const primary = sorted.slice(0, 3).map((gate) => gate.gate_key);
  const growth = [...gateScores].sort((a, b) => a.normalized_score - b.normalized_score || a.gate_number - b.gate_number)[0] || null;

  const answeredCount = normalizedAnswers.length;
  const totalQuestions = QUESTIONS.length;
  const completionRatio = totalQuestions > 0 ? Number((answeredCount / totalQuestions).toFixed(3)) : 0;

  const confidenceSummary = {
    answered_count: answeredCount,
    total_questions: totalQuestions,
    completion_ratio: completionRatio,
    confidence_band: completionRatio >= 0.9 ? "high" : (completionRatio >= 0.6 ? "medium" : "early"),
  };

  return {
    gate_scores: gateScores,
    primary_gates: primary,
    current_growth_gate: growth ? growth.gate_key : null,
    confidence_summary: confidenceSummary,
    normalized_answers: normalizedAnswers,
    normalized_scores: gateScores.map((gate) => ({ gate_key: gate.gate_key, normalized_score: gate.normalized_score })),
    question_index_size: byId.size,
  };
}

module.exports = { scoreGatesAssessment, validateAndNormalizeAnswers, stageFromNormalized };
