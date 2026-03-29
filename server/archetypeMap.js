"use strict";

const CANONICAL_ARCHETYPES = [
  "architect",
  "builder",
  "operator",
  "connector",
  "resource-generator",
  "educator",
  "protector",
  "steward",
];

const LEGACY_TO_CANONICAL = {
  Architect: "architect",
  Builder: "builder",
  Operator: "operator",
  Connector: "connector",
  "Resource Generator": "resource-generator",
  Educator: "educator",
  Protector: "protector",
  Nurturer: "steward",
  Steward: "steward",
  "Value Seeker": "resource-generator",
  "Convenience Buyer": "operator",
  "Experience Seeker": "architect",
  "Loyal Supporter": "steward",
  "Social Promoter": "connector",
  "Intentional Buyer": "protector",
  "Trend Explorer": "builder",
};

function initCounts() {
  return CANONICAL_ARCHETYPES.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function mapCountsToCanonical(counts = {}) {
  const mapped = initCounts();
  Object.entries(counts || {}).forEach(([legacyKey, value]) => {
    const canonical = LEGACY_TO_CANONICAL[legacyKey] || null;
    if (!canonical || mapped[canonical] === undefined) return;
    mapped[canonical] += Number(value || 0);
  });
  return mapped;
}

function deriveRoles(counts = {}) {
  const entries = Object.entries(counts || {});
  const sortedHigh = [...entries].sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  const sortedLow = [...entries].sort((a, b) => (a[1] - b[1]) || a[0].localeCompare(b[0]));

  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  const percentages = entries.reduce((acc, [key, value]) => {
    const pct = total > 0 ? Math.round((Number(value || 0) / total) * 100) : 0;
    acc[key] = pct;
    return acc;
  }, {});

  return {
    primary: sortedHigh[0]?.[0] || null,
    secondary: sortedHigh[1]?.[0] || null,
    weakness: sortedLow[0]?.[0] || null,
    percentages,
  };
}

function mapCustomerResultToArchetypes(result = {}) {
  const buyerCounts = mapCountsToCanonical(result.archetype_counts || {});
  const personalSeed = result.personality_counts || result.archetype_counts || {};
  const personalCounts = mapCountsToCanonical(personalSeed);

  return {
    buyer: {
      ...deriveRoles(buyerCounts),
      counts: buyerCounts,
    },
    personal: {
      ...deriveRoles(personalCounts),
      counts: personalCounts,
    },
  };
}

module.exports = {
  CANONICAL_ARCHETYPES,
  LEGACY_TO_CANONICAL,
  mapCountsToCanonical,
  mapCustomerResultToArchetypes,
};
