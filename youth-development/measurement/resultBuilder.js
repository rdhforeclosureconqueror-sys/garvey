"use strict";

const { YOUTH_DEVELOPMENT_TRAIT_MODEL } = require("./traitModel");

const DEFAULT_RESULT_TYPE = "baseline_trait_profile";
const LOW_CONFIDENCE_THRESHOLD = 55;
const HIGH_CONFIDENCE_THRESHOLD = 75;
const SUPPORT_NEEDED_SCORE_THRESHOLD = 40;
const EMERGING_STRENGTH_SCORE_THRESHOLD = 70;
const POSITIVE_CHANGE_THRESHOLD = 3;
const NEGATIVE_CHANGE_THRESHOLD = -3;

function clampScore(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value <= 0) {
    return 0;
  }

  if (value >= 100) {
    return 100;
  }

  return Number(value.toFixed(4));
}

function normalizeRows(aggregatedRows) {
  if (!Array.isArray(aggregatedRows)) {
    throw new Error("buildYouthDevelopmentResult requires aggregatedRows to be an array");
  }

  return aggregatedRows
    .filter((row) => row && typeof row === "object")
    .filter((row) => typeof row.trait_code === "string")
    .map((row) => ({
      trait_code: row.trait_code,
      baseline_score: clampScore(row.baseline_score),
      current_score: clampScore(row.current_score),
      change_score: Number((Number(row.change_score) || 0).toFixed(4)),
      confidence_score: clampScore(row.confidence_score),
      evidence_mix_score: clampScore(row.evidence_mix_score),
      trend_direction: typeof row.trend_direction === "string" ? row.trend_direction : "stable",
    }))
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));
}

function resolveGeneratedAt(options = {}) {
  const explicit = options.generatedAt ?? options.generated_at;
  if (typeof explicit === "string" && Number.isFinite(Date.parse(explicit))) {
    return new Date(explicit).toISOString();
  }

  if (Number.isFinite(options.generatedAtMs)) {
    return new Date(options.generatedAtMs).toISOString();
  }

  return "1970-01-01T00:00:00.000Z";
}

function buildStatusLabel(row) {
  const score = row.current_score;
  const confidence = row.confidence_score;

  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    if (score >= EMERGING_STRENGTH_SCORE_THRESHOLD) {
      return "potential strength (monitor confidence)";
    }

    if (score <= SUPPORT_NEEDED_SCORE_THRESHOLD) {
      return "support may be needed (low confidence)";
    }

    return "developing (low confidence)";
  }

  if (score >= EMERGING_STRENGTH_SCORE_THRESHOLD && confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return "emerging strength";
  }

  if (score <= SUPPORT_NEEDED_SCORE_THRESHOLD) {
    return "support needed";
  }

  return "developing";
}

function buildTraitProfileRow(row, traitSpec) {
  return Object.freeze({
    trait_code: row.trait_code,
    trait_name: traitSpec?.trait_name ?? row.trait_code,
    baseline_score: row.baseline_score,
    current_score: row.current_score,
    change_score: row.change_score,
    confidence_score: row.confidence_score,
    evidence_mix_score: row.evidence_mix_score,
    trend_direction: row.trend_direction,
    status_label: buildStatusLabel(row),
  });
}

function pickTopStrengths(traitProfile, maxItems = 3) {
  return [...traitProfile]
    .sort((a, b) => {
      if (b.current_score !== a.current_score) {
        return b.current_score - a.current_score;
      }

      if (b.confidence_score !== a.confidence_score) {
        return b.confidence_score - a.confidence_score;
      }

      return a.trait_code.localeCompare(b.trait_code);
    })
    .slice(0, maxItems)
    .map((trait) =>
      Object.freeze({
        trait_code: trait.trait_code,
        trait_name: trait.trait_name,
        status_label: trait.status_label,
        current_score: trait.current_score,
      })
    );
}

function pickFrictionPoints(traitProfile, maxItems = 3) {
  return [...traitProfile]
    .sort((a, b) => {
      if (a.current_score !== b.current_score) {
        return a.current_score - b.current_score;
      }

      if (a.confidence_score !== b.confidence_score) {
        return a.confidence_score - b.confidence_score;
      }

      return a.trait_code.localeCompare(b.trait_code);
    })
    .slice(0, maxItems)
    .map((trait) =>
      Object.freeze({
        trait_code: trait.trait_code,
        trait_name: trait.trait_name,
        status_label: trait.status_label,
        current_score: trait.current_score,
      })
    );
}

function buildDevelopmentLevers(traitProfile, maxItems = 5) {
  const sourceRows = [...traitProfile].sort((a, b) => {
    if (b.change_score !== a.change_score) {
      return b.change_score - a.change_score;
    }

    if (b.current_score !== a.current_score) {
      return b.current_score - a.current_score;
    }

    return a.trait_code.localeCompare(b.trait_code);
  });

  const levers = [];

  for (const trait of sourceRows) {
    const traitSpec = YOUTH_DEVELOPMENT_TRAIT_MODEL.traits[trait.trait_code];
    const lever = traitSpec?.development_levers?.[0];
    if (!lever) {
      continue;
    }

    levers.push(
      Object.freeze({
        trait_code: trait.trait_code,
        trait_name: trait.trait_name,
        lever: lever,
        rationale:
          trait.change_score >= POSITIVE_CHANGE_THRESHOLD
            ? "Recent progress suggests this lever is active and worth maintaining."
            : "This lever is development-ready and can support next-step growth.",
      })
    );

    if (levers.length >= maxItems) {
      break;
    }
  }

  return levers;
}

function buildSupportNeeds(traitProfile, maxItems = 5) {
  const supportRows = [...traitProfile]
    .filter(
      (trait) =>
        trait.current_score <= SUPPORT_NEEDED_SCORE_THRESHOLD ||
        trait.change_score <= NEGATIVE_CHANGE_THRESHOLD ||
        trait.confidence_score < LOW_CONFIDENCE_THRESHOLD
    )
    .sort((a, b) => {
      if (a.current_score !== b.current_score) {
        return a.current_score - b.current_score;
      }

      if (a.change_score !== b.change_score) {
        return a.change_score - b.change_score;
      }

      return a.trait_code.localeCompare(b.trait_code);
    });

  return supportRows.slice(0, maxItems).map((trait) => {
    const traitSpec = YOUTH_DEVELOPMENT_TRAIT_MODEL.traits[trait.trait_code];
    const supportNeed = traitSpec?.example_support_needs?.[0] ?? "Needs additional scaffolded practice in this area.";

    return Object.freeze({
      trait_code: trait.trait_code,
      trait_name: trait.trait_name,
      support_need: supportNeed,
      reason:
        trait.confidence_score < LOW_CONFIDENCE_THRESHOLD
          ? "Signal confidence is low; gather additional evidence before strong interpretation."
          : "Current indicators suggest this area would benefit from targeted support.",
    });
  });
}

function buildEvidenceSummary(traitProfile, options = {}) {
  const evidenceSummary = options.evidenceSummary ?? {};
  const providedSources = Array.isArray(evidenceSummary.sources_used) ? evidenceSummary.sources_used : [];

  const lowConfidenceFlags = traitProfile
    .filter((trait) => trait.confidence_score < LOW_CONFIDENCE_THRESHOLD)
    .map((trait) =>
      Object.freeze({
        trait_code: trait.trait_code,
        trait_name: trait.trait_name,
        confidence_score: trait.confidence_score,
        message: "Interpret as provisional and collect more cross-context evidence.",
      })
    );

  const confidenceCaveats = Array.isArray(evidenceSummary.confidence_caveats)
    ? [...evidenceSummary.confidence_caveats]
    : [];

  if (lowConfidenceFlags.length) {
    confidenceCaveats.push(
      "Some trait signals are low-confidence; avoid hard conclusions and re-check with additional observations."
    );
  }

  const sourcesUsed = providedSources.length
    ? [...new Set(providedSources)].sort()
    : Object.keys(YOUTH_DEVELOPMENT_TRAIT_MODEL.evidence_sources).sort();

  return Object.freeze({
    sources_used: sourcesUsed,
    confidence_caveats: [...new Set(confidenceCaveats)],
    low_confidence_flags: lowConfidenceFlags,
  });
}

function buildEnvironmentNotes(traitProfile, options = {}) {
  const notes = [];

  if (Array.isArray(options.environmentNotes)) {
    notes.push(...options.environmentNotes.filter((note) => typeof note === "string" && note.trim()));
  }

  if (traitProfile.some((trait) => trait.confidence_score < LOW_CONFIDENCE_THRESHOLD)) {
    notes.push("Confidence is mixed across contexts; prioritize repeated observation windows.");
  }

  return [...new Set(notes)];
}

function buildYouthDevelopmentResult(aggregatedRows, options = {}) {
  const rows = normalizeRows(aggregatedRows);
  const traitProfile = rows.map((row) => buildTraitProfileRow(row, YOUTH_DEVELOPMENT_TRAIT_MODEL.traits[row.trait_code]));

  const evidenceSummary = buildEvidenceSummary(traitProfile, options);

  return Object.freeze({
    domain_code: YOUTH_DEVELOPMENT_TRAIT_MODEL.domain_code,
    result_type: options.result_type ?? DEFAULT_RESULT_TYPE,
    generated_at: resolveGeneratedAt(options),
    trait_profile: traitProfile,
    summary: Object.freeze({
      top_strengths: pickTopStrengths(traitProfile),
      current_friction_points: pickFrictionPoints(traitProfile),
      strongest_development_levers: buildDevelopmentLevers(traitProfile),
      support_needs: buildSupportNeeds(traitProfile),
      environment_notes: buildEnvironmentNotes(traitProfile, options),
    }),
    evidence_summary: evidenceSummary,
    language_safety: Object.freeze({
      no_fixed_labels: true,
      no_future_guarantees: true,
      developmental_language_only: true,
      guidance: [
        "Describe traits as current developmental patterns, not permanent identity labels.",
        "Avoid deterministic predictions or guarantees about future outcomes.",
        "Use growth-oriented language tied to observable behavior and support context.",
      ],
    }),
  });
}

module.exports = {
  buildYouthDevelopmentResult,
  RESULT_BUILDER_RULES: Object.freeze({
    status_label:
      "Rule-based from current_score + confidence_score thresholds: high score/high confidence => emerging strength; low score => support needed; otherwise developing; low-confidence variants are marked explicitly.",
    ranking:
      "top_strengths and current_friction_points are deterministically ranked by score, confidence, and trait_code tie-breaks.",
    determinism:
      "Rows are normalized and sorted by trait_code, and generated_at defaults to a fixed epoch unless provided.",
  }),
};
