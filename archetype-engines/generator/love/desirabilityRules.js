"use strict";

const VIRTUOUS_WORDS = [
  "always",
  "perfect",
  "best",
  "mature",
  "healthy",
  "ideal",
  "secure",
  "evolved",
  "enlightened",
  "high value",
];

const NEGATIVE_WORDS = [
  "never",
  "dramatic",
  "selfish",
  "clingy",
  "cold",
  "chaotic",
  "toxic",
  "needy",
  "immature",
  "unstable",
];

const ELEVATED_STYLE_WORDS = ["spiritual", "transcend", "higher self", "awakening", "elevated"];
const CHAOTIC_STYLE_WORDS = ["explode", "meltdown", "volatile", "derail"];

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

function estimateDesirability(text) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of VIRTUOUS_WORDS) if (lower.includes(word)) score += 2;
  for (const word of NEGATIVE_WORDS) if (lower.includes(word)) score -= 2;
  if (lower.length > 140) score -= 1;
  return score;
}

function desirabilityWarnings(options) {
  const scored = options.map((opt) => {
    const lower = opt.text.toLowerCase();
    return {
      id: opt.optionId || opt.option_id,
      score: estimateDesirability(opt.text),
      elevated: containsAny(lower, ELEVATED_STYLE_WORDS),
      chaotic: containsAny(lower, CHAOTIC_STYLE_WORDS),
      virtueHits: VIRTUOUS_WORDS.filter((word) => lower.includes(word)).length,
      negativeHits: NEGATIVE_WORDS.filter((word) => lower.includes(word)).length,
    };
  });

  const values = scored.map((s) => s.score);
  const spread = Math.max(...values) - Math.min(...values);
  const warnings = [];

  if (spread >= 3) {
    warnings.push(`Large desirability spread (${spread}) between options: ${scored.map((s) => `${s.id}:${s.score}`).join(", ")}`);
  }

  const elevatedCount = scored.filter((s) => s.elevated).length;
  if (elevatedCount === 1) {
    warnings.push("One option sounds disproportionately spiritually/intellectually elevated versus peers");
  }

  const chaoticCount = scored.filter((s) => s.chaotic).length;
  if (chaoticCount === 1) {
    warnings.push("One option sounds disproportionately emotionally chaotic versus peers");
  }

  const virtueSkew = Math.max(...scored.map((s) => s.virtueHits)) - Math.min(...scored.map((s) => s.virtueHits));
  if (virtueSkew >= 2) {
    warnings.push("Virtue-signaling language is uneven across options");
  }

  const negativeSkew = Math.max(...scored.map((s) => s.negativeHits)) - Math.min(...scored.map((s) => s.negativeHits));
  if (negativeSkew >= 2) {
    warnings.push("Negative-loading language is uneven across options");
  }

  return warnings;
}

module.exports = {
  estimateDesirability,
  desirabilityWarnings,
};
