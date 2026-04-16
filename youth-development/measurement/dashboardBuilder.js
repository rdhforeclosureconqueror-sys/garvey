"use strict";

const { YOUTH_DEVELOPMENT_TRAIT_MODEL } = require("./traitModel");

const DEFAULT_DASHBOARD_TYPE = "parent_development_dashboard";
const DEFAULT_GENERATED_AT = "1970-01-01T00:00:00.000Z";

const LOW_SCORE_THRESHOLD = 40;
const HIGH_SCORE_THRESHOLD = 70;
const LOW_CONFIDENCE_THRESHOLD = 55;
const HIGH_CONFIDENCE_THRESHOLD = 75;
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

function clampChange(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(4));
}

function toSafeString(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .trim();
}

function resolveGeneratedAt(input) {
  if (typeof input === "string" && Number.isFinite(Date.parse(input))) {
    return new Date(input).toISOString();
  }

  return DEFAULT_GENERATED_AT;
}

function resolveTraitName(traitCode, providedName) {
  if (typeof providedName === "string" && providedName.trim()) {
    return toSafeString(providedName);
  }

  return toSafeString(YOUTH_DEVELOPMENT_TRAIT_MODEL.traits[traitCode]?.trait_name ?? traitCode);
}

function normalizeTrendDirection(value) {
  if (typeof value !== "string") {
    return "stable";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "increasing" || normalized === "decreasing" || normalized === "stable") {
    return normalized;
  }

  return "stable";
}

function resolveStatusLabel(trait) {
  if (typeof trait?.status_label === "string" && trait.status_label.trim()) {
    return toSafeString(trait.status_label);
  }

  if (trait.confidence_score < LOW_CONFIDENCE_THRESHOLD) {
    return toSafeString("developing pattern (more evidence needed)");
  }

  if (trait.current_score >= HIGH_SCORE_THRESHOLD) {
    return toSafeString("currently strong");
  }

  if (trait.current_score <= LOW_SCORE_THRESHOLD) {
    return toSafeString("currently needs support");
  }

  return toSafeString("currently developing");
}

function resolvePriorityLevel(trait) {
  const score = trait.current_score;
  const confidence = trait.confidence_score;
  const change = trait.change_score;

  if (confidence < LOW_CONFIDENCE_THRESHOLD) {
    return "evidence_needed";
  }

  if (score <= LOW_SCORE_THRESHOLD || change <= NEGATIVE_CHANGE_THRESHOLD) {
    return "support_now";
  }

  if (score >= HIGH_SCORE_THRESHOLD && change >= POSITIVE_CHANGE_THRESHOLD && confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return "maintain_momentum";
  }

  if (score >= HIGH_SCORE_THRESHOLD) {
    return "keep_steady";
  }

  if (change >= POSITIVE_CHANGE_THRESHOLD) {
    return "build_next";
  }

  return "monitor";
}

function normalizeTraitProfile(result) {
  const rows = Array.isArray(result?.trait_profile) ? result.trait_profile : [];

  return rows
    .filter((row) => row && typeof row === "object" && typeof row.trait_code === "string")
    .map((row) => ({
      trait_code: row.trait_code,
      trait_name: resolveTraitName(row.trait_code, row.trait_name),
      current_score: clampScore(row.current_score),
      change_score: clampChange(row.change_score),
      confidence_score: clampScore(row.confidence_score),
      trend_direction: normalizeTrendDirection(row.trend_direction),
      status_label: resolveStatusLabel(row),
    }))
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));
}

function buildOverviewCards(traits) {
  return traits.map((trait) =>
    Object.freeze({
      trait_code: trait.trait_code,
      trait_name: trait.trait_name,
      current_score: trait.current_score,
      change_score: trait.change_score,
      confidence_score: trait.confidence_score,
      status_label: trait.status_label,
      trend_direction: trait.trend_direction,
      priority_level: resolvePriorityLevel(trait),
    })
  );
}

function buildStrengthsSection(traits, maxItems) {
  const ranked = [...traits]
    .filter((trait) => trait.current_score >= HIGH_SCORE_THRESHOLD)
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
        current_score: trait.current_score,
        confidence_score: trait.confidence_score,
        why_currently_strong:
          trait.change_score >= POSITIVE_CHANGE_THRESHOLD
            ? toSafeString("What to keep doing: recent progress and consistency suggest current routines are helping.")
            : toSafeString("What to keep doing: this area is showing stable strength under current support conditions."),
      })
    );

  return Object.freeze({
    ranked_strengths: ranked,
  });
}

function buildSupportSection(traits, maxItems) {
  const supportNeeds = [...traits]
    .filter(
      (trait) =>
        trait.current_score <= LOW_SCORE_THRESHOLD ||
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
    })
    .slice(0, maxItems)
    .map((trait) =>
      Object.freeze({
        trait_code: trait.trait_code,
        trait_name: trait.trait_name,
        current_score: trait.current_score,
        confidence_score: trait.confidence_score,
        why_support_recommended:
          trait.confidence_score < LOW_CONFIDENCE_THRESHOLD
            ? toSafeString("Where more evidence is needed: confidence is limited, so add observations before strong conclusions.")
            : toSafeString("What to support next: this area is currently lower or declining and may benefit from targeted practice."),
        caution_marker:
          trait.confidence_score < LOW_CONFIDENCE_THRESHOLD
            ? toSafeString("Interpret cautiously due to low confidence.")
            : "",
      })
    );

  return Object.freeze({
    current_support_needs: supportNeeds,
  });
}

function buildEvidenceSection(result, traits) {
  const evidenceSummary = result?.evidence_summary ?? {};
  const sourcesUsed = Array.isArray(evidenceSummary.sources_used)
    ? [...new Set(evidenceSummary.sources_used.map((value) => toSafeString(value)).filter(Boolean))].sort()
    : [];

  const caveats = Array.isArray(evidenceSummary.confidence_caveats)
    ? [...new Set(evidenceSummary.confidence_caveats.map((value) => toSafeString(value)).filter(Boolean))]
    : [];

  const lowConfidenceFlags = traits
    .filter((trait) => trait.confidence_score < LOW_CONFIDENCE_THRESHOLD)
    .map((trait) =>
      Object.freeze({
        trait_code: trait.trait_code,
        trait_name: trait.trait_name,
        confidence_score: trait.confidence_score,
        caution: toSafeString("Where more evidence is needed: gather repeated observations across settings."),
      })
    );

  return Object.freeze({
    sources_used: sourcesUsed,
    confidence_caveats: caveats,
    low_confidence_flags: lowConfidenceFlags,
  });
}

function buildActionSection(result, traits, maxItems) {
  const sourceLevers = Array.isArray(result?.summary?.strongest_development_levers)
    ? result.summary.strongest_development_levers
    : [];

  const topRecommendedDevelopmentLevers = sourceLevers
    .filter((lever) => lever && typeof lever === "object" && typeof lever.trait_code === "string")
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code))
    .slice(0, maxItems)
    .map((lever) =>
      Object.freeze({
        trait_code: lever.trait_code,
        trait_name: resolveTraitName(lever.trait_code, lever.trait_name),
        lever: toSafeString(lever.lever),
        rationale: toSafeString(lever.rationale),
      })
    );

  const nextStepPrompts = traits
    .slice()
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code))
    .slice(0, maxItems)
    .map((trait) => {
      const priorityLevel = resolvePriorityLevel(trait);

      if (priorityLevel === "maintain_momentum" || priorityLevel === "keep_steady") {
        return Object.freeze({
          trait_code: trait.trait_code,
          prompt: toSafeString(`What to keep doing for ${trait.trait_name}: continue routines that are already supporting this growth pattern.`),
        });
      }

      if (priorityLevel === "evidence_needed") {
        return Object.freeze({
          trait_code: trait.trait_code,
          prompt: toSafeString(`Where more evidence is needed for ${trait.trait_name}: collect more examples across home and learning settings.`),
        });
      }

      return Object.freeze({
        trait_code: trait.trait_code,
        prompt: toSafeString(`What to support next for ${trait.trait_name}: choose one small, repeatable support action this week.`),
      });
    });

  const environmentSupportNotes = Array.isArray(result?.summary?.environment_notes)
    ? [...new Set(result.summary.environment_notes.map((note) => toSafeString(note)).filter(Boolean))].sort()
    : [];

  return Object.freeze({
    top_recommended_development_levers: topRecommendedDevelopmentLevers,
    parent_next_step_prompts: nextStepPrompts,
    environment_support_notes: environmentSupportNotes,
  });
}

function buildYouthDevelopmentDashboard(result, options = {}) {
  const normalizedTraits = normalizeTraitProfile(result);
  const maxItems = Number.isFinite(options.maxItems) && options.maxItems > 0 ? Math.floor(options.maxItems) : 5;

  const dashboard = Object.freeze({
    metadata: Object.freeze({
      domain_code: toSafeString(result?.domain_code ?? YOUTH_DEVELOPMENT_TRAIT_MODEL.domain_code),
      dashboard_type: toSafeString(options.dashboard_type ?? DEFAULT_DASHBOARD_TYPE),
      generated_at: resolveGeneratedAt(result?.generated_at ?? options.generated_at),
    }),
    overview_cards: buildOverviewCards(normalizedTraits),
    strengths: buildStrengthsSection(normalizedTraits, maxItems),
    support: buildSupportSection(normalizedTraits, maxItems),
    evidence: buildEvidenceSection(result, normalizedTraits),
    action: buildActionSection(result, normalizedTraits, maxItems),
    rendering_safety: Object.freeze({
      deterministic_structure: true,
      no_future_guarantees: true,
      no_fixed_labels: true,
      website_safe_strings_only: true,
    }),
  });

  return dashboard;
}

module.exports = {
  buildYouthDevelopmentDashboard,
  DASHBOARD_BUILDER_RULES: Object.freeze({
    priority_level:
      "Rule order: evidence_needed if confidence_score < 55; support_now if current_score <= 40 or change_score <= -3; maintain_momentum if current_score >= 70 and change_score >= 3 and confidence_score >= 75; keep_steady if current_score >= 70; build_next if change_score >= 3; otherwise monitor.",
    determinism:
      "Trait rows are normalized, sorted by trait_code, strings sanitized, and output keys are always present in a fixed section layout.",
    parent_phrasing:
      "Action and support sections include parent-facing language for what to keep doing, what to support next, and where more evidence is needed.",
  }),
};
