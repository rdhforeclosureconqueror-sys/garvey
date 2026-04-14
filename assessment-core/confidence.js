"use strict";

function completionQuality(answeredCount = 0, questionCount = 0) {
  const completionPercent = Number(((answeredCount / Math.max(questionCount, 1)) * 100).toFixed(2));
  return { answered: answeredCount, total: questionCount, completionPercent };
}

function confidenceScore({ completionPercent = 0, consistency = 0 } = {}) {
  return Number(((completionPercent * 0.6) + (consistency * 0.4)).toFixed(2));
}

module.exports = { completionQuality, confidenceScore };
