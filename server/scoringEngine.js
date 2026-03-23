// FILE: server/scoringEngine.js
// ✅ Aligned to server/index.js (expects scoreAnswers(answers, questionRows))
// ✅ Works with BOTH JSON weight shapes:
//    1) option-based: q.weights = { A: {role: n}, B: {...}, C: {...}, D: {...} }
//    2) role-based:   q.weights = { role: n, role2: n, ... }
// ✅ Safe fallback for legacy flat columns (q[role])
// ✅ Lowercase role keys (matches tenant config + rest of server)
// ✅ NEW: deriveTenantConfigPatch() to bridge scoring → tenant_config → siteGenerator (no route changes)

"use strict";

const roles = [
  "architect",
  "operator",
  "steward",
  "builder",
  "connector",
  "protector",
  "nurturer",
  "educator",
  "resource_generator",
];

function emptyScores() {
  const scores = {};
  for (const r of roles) scores[r] = 0;
  return scores;
}

function coerceNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function addRoleWeights(scores, roleWeights) {
  if (!isPlainObject(roleWeights)) return;
  for (const r of roles) {
    if (Object.prototype.hasOwnProperty.call(roleWeights, r)) {
      scores[r] += coerceNumber(roleWeights[r]);
    }
  }
}

function extractLegacyRoleWeight(questionRow, role) {
  return coerceNumber(questionRow?.[role]);
}

function scoreAnswers(answers = [], questions = []) {
  const scores = emptyScores();
  const questionMap = new Map((questions || []).map((q) => [q.qid, q]));

  for (const item of answers || []) {
    if (!item || !item.qid) continue;

    const q = questionMap.get(item.qid);
    if (!q) continue;

    const w = q.weights;

    // Shape 1: option-based weights
    if (
      isPlainObject(w) &&
      (Object.prototype.hasOwnProperty.call(w, "A") ||
        Object.prototype.hasOwnProperty.call(w, "B") ||
        Object.prototype.hasOwnProperty.call(w, "C") ||
        Object.prototype.hasOwnProperty.call(w, "D"))
    ) {
      const option = String(item.answer || "").toUpperCase();
      addRoleWeights(scores, w[option]);
      continue;
    }

    // Shape 2: role-based weights
    if (isPlainObject(w)) {
      addRoleWeights(scores, w);
      continue;
    }

    // Fallback: legacy flat columns per role
    for (const r of roles) {
      scores[r] += extractLegacyRoleWeight(q, r);
    }
  }

  return scores;
}

function getTopRoles(scores) {
  const entries = Object.entries(scores || {}).filter(([, v]) =>
    Number.isFinite(Number(v))
  );

  if (entries.length === 0) {
    return { primary_role: null, secondary_role: null };
  }

  // Stable tiebreaker: score desc, then role name asc
  entries.sort((a, b) => {
    const diff = coerceNumber(b[1]) - coerceNumber(a[1]);
    if (diff !== 0) return diff;
    return String(a[0]).localeCompare(String(b[0]));
  });

  return {
    primary_role: entries[0]?.[0] || null,
    secondary_role: entries[1]?.[0] || null,
  };
}

function clampInt(n, min, max) {
  const x = Math.round(coerceNumber(n));
  return Math.max(min, Math.min(max, x));
}

/**
 * Bridge: scoring → tenant_config patch for siteGenerator consumption.
 * /api/intake can merge this into tenant_config.site + tenant_config.features before sanitizeConfig().
 *
 * Returns: { site: {...}, features: {...} }
 * - Does NOT overwrite business_name by default (avoid clobbering owner edits).
 * - Uses safe optional fields that siteGenerator can ignore if not present.
 */
function deriveTenantConfigPatch({ tenantSlug, primary_role, secondary_role, scores }) {
  const primary = String(primary_role || "").toLowerCase();
  const secondary = String(secondary_role || "").toLowerCase();

  const values = Object.values(scores || {}).map(coerceNumber);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const top =
    primary && scores && Object.prototype.hasOwnProperty.call(scores, primary)
      ? coerceNumber(scores[primary])
      : 0;

  const readiness = clampInt((top / total) * 100, 0, 100);

  const roleHeadlineMap = {
    architect: "Build the plan. Execute with confidence.",
    operator: "Tight operations. Better experiences.",
    steward: "Trust, consistency, and long-term value.",
    builder: "Turn ideas into results—fast.",
    connector: "Grow through community and referrals.",
    protector: "Protect quality, safety, and standards.",
    nurturer: "Care-led experiences customers remember.",
    educator: "Teach, guide, and earn loyalty.",
    resource_generator: "Find leverage, unlock resources, scale smarter.",
  };

  const features = {
    rewards: true,
    quiz: true,
    reviews: true,
    store: false,
  };

  const site = {
    template: primary ? `persona:${primary}` : "",
    headline: roleHeadlineMap[primary] || "",
    subheadline: primary
      ? `Your current focus: ${primary}${secondary ? ` • Next: ${secondary}` : ""}.`
      : "",
    value_props: primary
      ? [
          `Personalized actions for ${primary} strengths`,
          "Earn points for check-ins, reviews, and referrals",
          "Get recommendations that improve over time",
        ]
      : [],
    cta_text: readiness < 50 ? "Take the Assessment" : "Earn Points (Actions)",
    cta_link:
      readiness < 50
        ? `/intake.html?tenant=${encodeURIComponent(tenantSlug || "")}`
        : `/index.html?tenant=${encodeURIComponent(tenantSlug || "")}`,
    meta: {
      readiness,
      primary,
      secondary,
    },
  };

  // conservative persona emphasis
  if (primary === "connector") {
    features.rewards = true;
    features.reviews = true;
  }

  return { site, features };
}

module.exports = {
  roles,
  scoreAnswers,
  getTopRoles,
  deriveTenantConfigPatch,
};
