"use strict";

function normalizeByMaxPossible(rawScores = {}, maxPossibleScores = {}, dimensions = []) {
  return Object.fromEntries(
    dimensions.map((code) => {
      const raw = Number(rawScores[code] || 0);
      const max = Number(maxPossibleScores[code] || 0);
      return [code, Number((max > 0 ? (raw / max) * 100 : 0).toFixed(2))];
    })
  );
}

module.exports = { normalizeByMaxPossible };
