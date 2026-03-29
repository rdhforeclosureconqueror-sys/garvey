"use strict";

const PERSONAL_ARCHETYPES = [
  "architect",
  "builder",
  "operator",
  "resource_generator",
  "connector",
  "educator",
  "protector",
  "steward",
];

const BUYER_ARCHETYPES = [
  "value_seeker",
  "loyal_supporter",
  "convenience_buyer",
  "experience_seeker",
  "social_promoter",
  "intentional_buyer",
  "trend_explorer",
];

const PERSONAL_TO_BUYER = Object.freeze({
  architect: "experience_seeker",
  builder: "trend_explorer",
  operator: "convenience_buyer",
  resource_generator: "value_seeker",
  connector: "social_promoter",
  educator: "intentional_buyer",
  protector: "intentional_buyer",
  steward: "loyal_supporter",
});

const LEGACY_PERSONAL_ALIASES = Object.freeze({
  Architect: "architect",
  Builder: "builder",
  Operator: "operator",
  Connector: "connector",
  "Resource Generator": "resource_generator",
  "Resource-Generator": "resource_generator",
  Educator: "educator",
  Protector: "protector",
  Nurturer: "steward",
  Steward: "steward",
});

const LEGACY_BUYER_ALIASES = Object.freeze({
  "Value Seeker": "value_seeker",
  "Loyal Supporter": "loyal_supporter",
  "Convenience Buyer": "convenience_buyer",
  "Experience Seeker": "experience_seeker",
  "Social Promoter": "social_promoter",
  "Intentional Buyer": "intentional_buyer",
  "Trend Explorer": "trend_explorer",
});

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function initCounts(keys = []) {
  return keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function canonicalizePersonalKey(rawKey) {
  const slug = normalizeKey(rawKey);
  if (!slug) return "";
  if (PERSONAL_ARCHETYPES.includes(slug)) return slug;
  return LEGACY_PERSONAL_ALIASES[rawKey] || "";
}

function canonicalizeBuyerKey(rawKey) {
  const slug = normalizeKey(rawKey);
  if (!slug) return "";
  if (BUYER_ARCHETYPES.includes(slug)) return slug;
  return LEGACY_BUYER_ALIASES[rawKey] || "";
}

function mapCountsToPersonal(counts = {}) {
  const mapped = initCounts(PERSONAL_ARCHETYPES);
  Object.entries(counts || {}).forEach(([rawKey, value]) => {
    const canonical = canonicalizePersonalKey(rawKey);
    if (!canonical) return;
    mapped[canonical] += Number(value || 0);
  });
  return mapped;
}

function mapCountsToBuyer(counts = {}) {
  const mapped = initCounts(BUYER_ARCHETYPES);
  Object.entries(counts || {}).forEach(([rawKey, value]) => {
    const canonical = canonicalizeBuyerKey(rawKey);
    if (!canonical) return;
    mapped[canonical] += Number(value || 0);
  });
  return mapped;
}

function mapPersonalCountsToBuyer(personalCounts = {}) {
  const buyerCounts = initCounts(BUYER_ARCHETYPES);
  Object.entries(personalCounts || {}).forEach(([rawKey, value]) => {
    const personalKey = canonicalizePersonalKey(rawKey);
    if (!personalKey) return;
    const buyerKey = PERSONAL_TO_BUYER[personalKey];
    if (!buyerKey || buyerCounts[buyerKey] === undefined) return;
    buyerCounts[buyerKey] += Number(value || 0);
  });
  return buyerCounts;
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
  const personalSeed = result.personality_counts || result.personal_counts || {};
  const personalCounts = mapCountsToPersonal(personalSeed);

  const buyerSeed = result.buyer_counts || result.archetype_counts || {};
  const buyerCounts = Object.values(buyerSeed || {}).some((v) => Number(v || 0) > 0)
    ? mapCountsToBuyer(buyerSeed)
    : mapPersonalCountsToBuyer(personalCounts);

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
  PERSONAL_ARCHETYPES,
  BUYER_ARCHETYPES,
  PERSONAL_TO_BUYER,
  mapCountsToPersonal,
  mapCountsToBuyer,
  mapPersonalCountsToBuyer,
  mapCustomerResultToArchetypes,
};
