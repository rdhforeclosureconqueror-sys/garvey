"use strict";

function contradictionConsistency(questions = [], answerIndexes = {}) {
  const pairDeltas = [];
  for (const question of questions) {
    const reverseId = question.reverse_pair_id;
    if (!reverseId || question.question_id > reverseId) continue;
    if (answerIndexes[question.question_id] === undefined || answerIndexes[reverseId] === undefined) continue;
    pairDeltas.push(Math.abs(answerIndexes[question.question_id] - answerIndexes[reverseId]));
  }
  const contradiction = pairDeltas.length
    ? Number(((pairDeltas.reduce((a, b) => a + b, 0) / (pairDeltas.length * 3)) * 100).toFixed(2))
    : 0;
  return { contradiction, consistency: Number((100 - contradiction).toFixed(2)) };
}

module.exports = { contradictionConsistency };
