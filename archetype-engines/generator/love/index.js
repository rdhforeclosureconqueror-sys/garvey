"use strict";

const { buildBlueprints } = require("./blueprints");
const { generateCandidatePool } = require("./generateCandidates");
const { assembleBank } = require("./assembleBank");
const { validateBank } = require("./validateBank");

function generateLoveBank({ seed = "BANK_2026_A", bankId = seed } = {}) {
  const blueprints = buildBlueprints({ bankId, seed });
  const candidatePool = generateCandidatePool(blueprints);
  const assembled = assembleBank({ bankId, seed, candidatePool });
  return {
    ...assembled,
    blueprints,
    candidatePoolSize: candidatePool.reduce((sum, c) => sum + c.candidates.length, 0),
  };
}

module.exports = {
  generateLoveBank,
  validateBank,
};
