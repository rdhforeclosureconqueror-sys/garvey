"use strict";
const archetypes = require('../content/loveArchetypes');

const banks = ["current", "desired", "behavior"];
const prompts = {
  current: "In your current relationship patterns, how true is this statement?",
  desired: "In your desired relationship future, how true should this be?",
  behavior: "Under stress, how often does this behavior appear?",
};

const questions = [];
let index = 1;
for (const bank of banks) {
  for (const archetype of archetypes) {
    for (let i = 0; i < 5; i += 1) {
      questions.push({
        id: `love_${bank}_${index}`,
        bank,
        archetypeCode: archetype.code,
        prompt: `${prompts[bank]} (${archetype.name} pattern ${i + 1})`,
        scale: { min: 1, max: 5 },
        reverseScored: i === 4,
      });
      index += 1;
    }
  }
}

module.exports = questions;
