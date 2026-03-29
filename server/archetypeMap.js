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
  architect: "architect",
  builder: "builder",
  operator: "operator",
  connector: "connector",
  resource_generator: "resource_generator",
  resource_generator_: "resource_generator",
  resource_generators: "resource_generator",
  resourcegenerator: "resource_generator",
  educator: "educator",
  protector: "protector",
  nurturer: "steward",
  steward: "steward",
});

const LEGACY_BUYER_ALIASES = Object.freeze({
  value_seeker: "value_seeker",
  loyal_supporter: "loyal_supporter",
  convenience_buyer: "convenience_buyer",
  experience_seeker: "experience_seeker",
  social_promoter: "social_promoter",
  intentional_buyer: "intentional_buyer",
  trend_explorer: "trend_explorer",
});

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function initCounts(keys = []) {
  return keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

function hasAnyPositiveValues(counts = {}) {
  return Object.values(counts || {}).some((value) => toSafeNumber(value) > 0);
}

function canonicalizePersonalKey(rawKey) {
  const slug = normalizeKey(rawKey);
  if (!slug) return "";
  if (PERSONAL_ARCHETYPES.includes(slug)) return slug;
  return LEGACY_PERSONAL_ALIASES[slug] || "";
}

function canonicalizeBuyerKey(rawKey) {
  const slug = normalizeKey(rawKey);
  if (!slug) return "";
  if (BUYER_ARCHETYPES.includes(slug)) return slug;
  return LEGACY_BUYER_ALIASES[slug] || "";
}

function mapCountsToPersonal(counts = {}) {
  const mapped = initCounts(PERSONAL_ARCHETYPES);

  Object.entries(counts || {}).forEach(([rawKey, value]) => {
    const canonical = canonicalizePersonalKey(rawKey);
    if (!canonical) return;
    mapped[canonical] += toSafeNumber(value);
  });

  return mapped;
}

function mapCountsToBuyer(counts = {}) {
  const mapped = initCounts(BUYER_ARCHETYPES);

  Object.entries(counts || {}).forEach(([rawKey, value]) => {
    const canonical = canonicalizeBuyerKey(rawKey);
    if (!canonical) return;
    mapped[canonical] += toSafeNumber(value);
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

    buyerCounts[buyerKey] += toSafeNumber(value);
  });

  return buyerCounts;
}

function deriveRoles(counts = {}) {
  const entries = Object.entries(counts || {});
  const total = entries.reduce((sum, [, value]) => sum + toSafeNumber(value), 0);

  const percentages = entries.reduce((acc, [key, value]) => {
    acc[key] = total > 0 ? Math.round((toSafeNumber(value) / total) * 100) : 0;
    return acc;
  }, {});

  if (total <= 0) {
    return {
      primary: null,
      secondary: null,
      weakness: null,
      percentages,
    };
  }

  const sortedHigh = [...entries].sort((a, b) => {
    const diff = toSafeNumber(b[1]) - toSafeNumber(a[1]);
    return diff || a[0].localeCompare(b[0]);
  });

  const sortedLow = [...entries].sort((a, b) => {
    const diff = toSafeNumber(a[1]) - toSafeNumber(b[1]);
    return diff || a[0].localeCompare(b[0]);
  });

  return {
    primary: sortedHigh[0]?.[0] || null,
    secondary: sortedHigh[1]?.[0] || null,
    weakness: sortedLow[0]?.[0] || null,
    percentages,
  };
}

function mapCustomerResultToArchetypes(result = {}) {
  const personalSeedCandidates = [
    result.personality_counts,
    result.personal_counts,
    result.archetype_counts,
  ];

  const personalSeed =
    personalSeedCandidates.find((candidate) => hasAnyPositiveValues(candidate || {})) || {};

  const personalCounts = mapCountsToPersonal(personalSeed);

  const buyerSeedCandidates = [
    result.buyer_counts,
  ];

  const explicitBuyerSeed =
    buyerSeedCandidates.find((candidate) => hasAnyPositiveValues(candidate || {})) || {};

  const buyerCounts = hasAnyPositiveValues(explicitBuyerSeed)
    ? mapCountsToBuyer(explicitBuyerSeed)
    : mapPersonalCountsToBuyer(personalCounts);

  return {
    personal: {
      ...deriveRoles(personalCounts),
      counts: personalCounts,
    },
    buyer: {
      ...deriveRoles(buyerCounts),
      counts: buyerCounts,
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
