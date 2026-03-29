"use strict";

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeScores(scoresObj = {}, roleKeys = []) {
  const source = (scoresObj && typeof scoresObj === "object") ? scoresObj : {};
  const keys = Array.isArray(roleKeys) && roleKeys.length
    ? roleKeys
    : Object.keys(source);

  return keys.reduce((acc, key) => {
    acc[String(key)] = toSafeNumber(source[key]);
    return acc;
  }, {});
}

function sortHighToLowThenName(entries = []) {
  return [...entries].sort((a, b) => {
    const aScore = toSafeNumber(a[1]);
    const bScore = toSafeNumber(b[1]);
    if (bScore !== aScore) return bScore - aScore;
    return String(a[0]).localeCompare(String(b[0]));
  });
}

function sortLowToHighThenName(entries = []) {
  return [...entries].sort((a, b) => {
    const aScore = toSafeNumber(a[1]);
    const bScore = toSafeNumber(b[1]);
    if (aScore !== bScore) return aScore - bScore;
    return String(a[0]).localeCompare(String(b[0]));
  });
}

function scoresToPercents(scoresObj = {}) {
  const entries = Object.entries(scoresObj || {}).map(([key, value]) => [
    String(key),
    toSafeNumber(value),
  ]);

  if (!entries.length) return {};

  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  if (total <= 0) {
    return entries.reduce((acc, [key]) => {
      acc[key] = 0;
      return acc;
    }, {});
  }

  const raw = entries.map(([key, value]) => {
    const exact = (value / total) * 100;
    const floor = Math.floor(exact);
    const remainder = exact - floor;

    return {
      key,
      exact,
      floor,
      remainder,
    };
  });

  let pointsLeft = 100 - raw.reduce((sum, row) => sum + row.floor, 0);

  raw.sort((a, b) => {
    if (b.remainder !== a.remainder) return b.remainder - a.remainder;
    return a.key.localeCompare(b.key);
  });

  for (let i = 0; i < raw.length && pointsLeft > 0; i += 1) {
    raw[i].floor += 1;
    pointsLeft -= 1;
  }

  raw.sort((a, b) => a.key.localeCompare(b.key));

  return raw.reduce((acc, row) => {
    acc[row.key] = row.floor;
    return acc;
  }, {});
}

function topN(scoresObj = {}, n = 2) {
  const safeN = Math.max(0, Number(n) || 0);
  return sortHighToLowThenName(Object.entries(scoresObj || {}))
    .slice(0, safeN)
    .map(([role, score]) => ({
      role,
      score: toSafeNumber(score),
    }));
}

function bottomN(scoresObj = {}, n = 1) {
  const safeN = Math.max(0, Number(n) || 0);
  return sortLowToHighThenName(Object.entries(scoresObj || {}))
    .slice(0, safeN)
    .map(([role, score]) => ({
      role,
      score: toSafeNumber(score),
    }));
}

function deriveRoles(scoresObj = {}) {
  const orderedHigh = topN(scoresObj, 2);
  const orderedLow = bottomN(scoresObj, 1);

  const primary = orderedHigh[0]?.role || null;
  const secondary = orderedHigh[1]?.role || null;
  const weakness = orderedLow[0]?.role || null;

  return {
    primary,
    secondary,
    weakness,
  };
}

function buildGuidance({ primary, secondary, weakness, assessment_type: assessmentType }) {
  const isCustomer = String(assessmentType || "").trim().toLowerCase() === "customer";
  const label = isCustomer ? "customer profile" : "business system";

  return {
    strengthen_strength: primary
      ? `Double down on ${primary} in your ${label} decisions this week.`
      : "Double down on your strongest pattern this week.",
    support_secondary: secondary
      ? `Use ${secondary} as a support trait to stabilize consistency.`
      : "Develop a secondary support trait for balance.",
    fix_weakness: weakness
      ? `Set one weekly micro-action focused on improving ${weakness}.`
      : "Set one weekly micro-action focused on your growth area.",
  };
}

module.exports = {
  normalizeScores,
  scoresToPercents,
  topN,
  bottomN,
  deriveRoles,
  buildGuidance,
};
