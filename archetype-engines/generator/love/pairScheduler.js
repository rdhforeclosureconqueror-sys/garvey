"use strict";

const { ARCHETYPES } = require("./signals");

function pairKey(a, b) {
  return [a, b].sort().join("-");
}

function createPairScheduler() {
  const pairCounts = Object.fromEntries(
    ARCHETYPES.flatMap((a, idx) => ARCHETYPES.slice(idx + 1).map((b) => [pairKey(a, b), 0])),
  );
  const secondaryCounts = Object.fromEntries(ARCHETYPES.map((c) => [c, 0]));

  function chooseSecondary(primary, candidates) {
    const scored = candidates
      .filter((code) => code !== primary)
      .map((secondary) => {
        const key = pairKey(primary, secondary);
        const pairPenalty = pairCounts[key] * 10;
        const secondaryPenalty = secondaryCounts[secondary] * 3;
        const biasPenalty = (key === "AL-AV" || key === "EC-RS") ? 2 : 0;
        return { secondary, score: pairPenalty + secondaryPenalty + biasPenalty };
      })
      .sort((a, b) => a.score - b.score || a.secondary.localeCompare(b.secondary));

    return scored[0].secondary;
  }

  function record(primary, secondary) {
    pairCounts[pairKey(primary, secondary)] += 1;
    secondaryCounts[secondary] += 1;
  }

  return {
    pairCounts,
    secondaryCounts,
    chooseSecondary,
    record,
  };
}

module.exports = { createPairScheduler, pairKey };
