"use strict";

const ABSTRACT_FILLER_TERMS = [
  "articulation creates trust",
  "dialogue builds connection",
  "actions carry more weight",
  "space keeps you regulated",
  "emotional bandwidth",
  "attachment wound",
  "nervous-system",
  "healing",
  "optimization",
];

const COMMON_OPENERS = ["i tend to", "my default is", "i usually"];
const COORDINATOR_SPLIT = /\b(and|while|then)\b|,/gi;

function words(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean);
}

function validateCompleteSentence(optionText) {
  const text = String(optionText || "").trim();
  if (!text) return false;
  if (!/^[A-Z]/.test(text)) return false;
  if (!/[.!?]$/.test(text)) return false;
  return words(text).length >= 4;
}

function validateSingleBehavior(optionText) {
  const text = String(optionText || "").trim();
  if (!text) return false;
  const chunks = text.split(COORDINATOR_SPLIT).filter((part) => String(part || "").trim().length > 0);
  return chunks.length <= 3;
}

function validateSingleTrigger(optionText) {
  const text = String(optionText || "").toLowerCase();
  const triggerHits = (text.match(/\bwhen\b/g) || []).length;
  return triggerHits <= 1;
}

function validateNoAbstractFiller(optionText) {
  const text = String(optionText || "").toLowerCase();
  return !ABSTRACT_FILLER_TERMS.some((term) => text.includes(term));
}

function validateNaturalSpeech(optionText) {
  const text = String(optionText || "").trim();
  if (!text) return false;
  if (!/^I\b/.test(text)) return false;
  if (/\bif articulation\b|\bwhen dialogue\b|\bactions carry\b/i.test(text)) return false;
  return true;
}

function validateOptionParityAcrossSet(optionSet = []) {
  if (!Array.isArray(optionSet) || optionSet.length !== 4) return false;
  const lengths = optionSet.map((opt) => words(opt.text || "").length);
  const spread = Math.max(...lengths) - Math.min(...lengths);
  return spread <= 8;
}

function validateDistinctPrimaries(optionSet = []) {
  const primaries = optionSet.map((opt) => opt.primary_archetype || opt.primary).filter(Boolean);
  return new Set(primaries).size === optionSet.length;
}

function validateNoDuplicateOpeners(bank = []) {
  const counts = new Map();
  for (const q of bank) {
    for (const opt of (q.options || [])) {
      const opening = String(opt.text || "").trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
      if (!opening) continue;
      counts.set(opening, (counts.get(opening) || 0) + 1);
    }
  }

  for (const starter of COMMON_OPENERS) {
    const total = Array.from(counts.entries())
      .filter(([key]) => key.startsWith(starter))
      .reduce((sum, [, count]) => sum + count, 0);
    if (total > 8) return false;
  }
  return true;
}

function validateGrammar(optionText) {
  const text = String(optionText || "").trim();
  if (!text) return false;
  if (/\s{2,}/.test(text)) return false;
  if (/\b(I\s+rely\s+on\s+maintain|I\s+respond\s+by\s+verify)\b/i.test(text)) return false;
  const wordCount = words(text).length;
  return wordCount >= 9 && wordCount <= 22;
}

module.exports = {
  validateCompleteSentence,
  validateSingleBehavior,
  validateSingleTrigger,
  validateNoAbstractFiller,
  validateNaturalSpeech,
  validateOptionParityAcrossSet,
  validateDistinctPrimaries,
  validateNoDuplicateOpeners,
  validateGrammar,
};
