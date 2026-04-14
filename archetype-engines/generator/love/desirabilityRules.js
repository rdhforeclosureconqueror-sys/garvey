"use strict";

const VIRTUOUS_WORDS = ["always", "perfect", "best", "mature", "healthy", "ideal"];
const NEGATIVE_WORDS = ["never", "dramatic", "selfish", "clingy", "cold", "chaotic"];

function estimateDesirability(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of VIRTUOUS_WORDS) if (lower.includes(word)) score += 2;
  for (const word of NEGATIVE_WORDS) if (lower.includes(word)) score -= 2;
  if (lower.length > 140) score -= 1;
  return score;
}

function desirabilityWarnings(options) {
  const scored = options.map((opt) => ({ id: opt.optionId || opt.option_id, score: estimateDesirability(opt.text) }));
  const values = scored.map((s) => s.score);
  const spread = Math.max(...values) - Math.min(...values);
  if (spread >= 4) {
    return [`Large desirability spread (${spread}) between options: ${scored.map((s) => `${s.id}:${s.score}`).join(", ")}`];
  }
  return [];
}

module.exports = {
  estimateDesirability,
  desirabilityWarnings,
};
