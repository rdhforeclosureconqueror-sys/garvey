"use strict";

function createAssessmentEngine(config = {}) {
  const engineType = String(config.engineType || "").trim();
  if (!engineType) throw new Error("createAssessmentEngine requires engineType");

  const resolveQuestionBank = typeof config.resolveQuestionBank === "function" ? config.resolveQuestionBank : (() => ({}));
  const generateQuestions = typeof config.generateQuestions === "function" ? config.generateQuestions : (() => []);
  const scoreAssessment = typeof config.scoreAssessment === "function" ? config.scoreAssessment : (() => null);
  const interpretResults = typeof config.interpretResults === "function" ? config.interpretResults : (result => result);
  const diagnosticsMetadata = typeof config.diagnosticsMetadata === "function" ? config.diagnosticsMetadata : (() => ({}));

  return Object.freeze({
    engineType,
    resolveQuestionBank(opts = {}) {
      return resolveQuestionBank(opts);
    },
    generateQuestions(opts = {}) {
      return generateQuestions(opts);
    },
    scoreAssessment(answers = {}, opts = {}) {
      return scoreAssessment(answers, opts);
    },
    interpretResults(scored = {}, opts = {}) {
      return interpretResults(scored, opts);
    },
    diagnosticsMetadata(opts = {}) {
      return diagnosticsMetadata(opts);
    },
  });
}

module.exports = { createAssessmentEngine };
