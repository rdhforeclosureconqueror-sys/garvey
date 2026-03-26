"use strict";

function normalizeScores(scoresObj = {}, roleKeys = []) {
  const baseKeys = Array.isArray(roleKeys) && roleKeys.length
    ? roleKeys
    : Object.keys(scoresObj || {});

  return baseKeys.reduce((acc, key) => {
    const n = Number(scoresObj?.[key] || 0);
    acc[key] = Number.isFinite(n) ? n : 0;
    return acc;
  }, {});
}

function scoresToPercents(scoresObj = {}) {
  const entries = Object.entries(scoresObj || {});
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);

  if (!entries.length) return {};
  if (total <= 0) {
    return entries.reduce((acc, [key]) => {
      acc[key] = 0;
      return acc;
    }, {});
  }

  const raw = entries.map(([key, value]) => ({
    key,
    exact: (Number(value || 0) / total) * 100,
  }));

  const floored = raw.map((row) => ({ ...row, floor: Math.floor(row.exact) }));
  let remainder = 100 - floored.reduce((sum, row) => sum + row.floor, 0);
  floored.sort((a, b) => (b.exact - b.floor) - (a.exact - a.floor));
  for (let i = 0; i < floored.length && remainder > 0; i += 1) {
    floored[i].floor += 1;
    remainder -= 1;
  }

  return floored.reduce((acc, row) => {
    acc[row.key] = row.floor;
    return acc;
  }, {});
}

function topN(scoresObj = {}, n = 2) {
  return Object.entries(scoresObj || {})
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, n)
    .map(([role, score]) => ({ role, score }));
}

function bottomN(scoresObj = {}, n = 1) {
  return Object.entries(scoresObj || {})
    .sort((a, b) => {
      if (a[1] !== b[1]) return a[1] - b[1];
      return a[0].localeCompare(b[0]);
    })
    .slice(0, n)
    .map(([role, score]) => ({ role, score }));
}

function deriveRoles(scoresObj = {}) {
  return {
    primary: topN(scoresObj, 1)[0]?.role || null,
    secondary: topN(scoresObj, 2)[1]?.role || null,
    weakness: bottomN(scoresObj, 1)[0]?.role || null,
  };
}

function buildGuidance({ primary, secondary, weakness, assessment_type: assessmentType }) {
  const label = assessmentType === "customer" ? "customer profile" : "business system";
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

