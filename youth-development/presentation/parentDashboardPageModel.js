"use strict";

const DEFAULT_PAGE_TYPE = "youth_parent_dashboard_page";
const DEFAULT_PAGE_TITLE = "Youth Development Dashboard";
const DEFAULT_PAGE_SUBTITLE = "Parent-facing snapshot of current development signals.";
const LOW_CONFIDENCE_THRESHOLD = 55;
const DEFAULT_MAX_ITEMS = 5;

const SECTION_ORDER = Object.freeze([
  "hero_summary",
  "trait_cards",
  "strengths",
  "support",
  "evidence",
  "action",
]);

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

function toSafeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : fallback;
}

function clampMaxItems(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_ITEMS;
  }

  return Math.floor(value);
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function toKey(value, fallback) {
  const safe = toSafeString(value);
  return safe || fallback;
}

function buildHeroSummarySection(dashboard, maxItems) {
  const cards = toSafeArray(dashboard?.overview_cards);
  const highPriorityTraits = cards
    .filter((card) => card && typeof card === "object")
    .filter(
      (card) =>
        card.priority_level === "support_now" ||
        card.priority_level === "evidence_needed" ||
        card.priority_level === "build_next"
    )
    .sort((a, b) => {
      if (a.priority_level !== b.priority_level) {
        return String(a.priority_level).localeCompare(String(b.priority_level));
      }

      if (toSafeNumber(a.current_score) !== toSafeNumber(b.current_score)) {
        return toSafeNumber(a.current_score) - toSafeNumber(b.current_score);
      }

      return toSafeString(a.trait_code).localeCompare(toSafeString(b.trait_code));
    })
    .slice(0, maxItems)
    .map((card) =>
      Object.freeze({
        trait_code: toKey(card.trait_code, "unknown_trait"),
        trait_label: toSafeString(card.trait_name || card.trait_code),
        priority_level: toSafeString(card.priority_level),
      })
    );

  const needsConfidenceNotice = cards.some(
    (card) => card && typeof card === "object" && toSafeNumber(card.confidence_score) < LOW_CONFIDENCE_THRESHOLD
  );

  const overviewText =
    highPriorityTraits.length > 0
      ? toSafeString("This snapshot highlights where to keep momentum, where to support next, and where additional observations can improve confidence.")
      : toSafeString("This snapshot summarizes current development signals and highlights practical parent-facing next steps.");

  return Object.freeze({
    section_key: "hero_summary",
    section_title: toSafeString("Overview"),
    overview_text: overviewText,
    high_priority_traits: highPriorityTraits,
    confidence_notice: needsConfidenceNotice
      ? toSafeString("Some signals have limited confidence; review patterns with additional observations before making major decisions.")
      : "",
    empty_state: highPriorityTraits.length === 0 ? toSafeString("No high-priority traits are flagged right now.") : "",
  });
}

function buildTraitCardsSection(dashboard) {
  const cards = toSafeArray(dashboard?.overview_cards)
    .filter((card) => card && typeof card === "object")
    .map((card) =>
      Object.freeze({
        trait_code: toKey(card.trait_code, "unknown_trait"),
        trait_label: toSafeString(card.trait_name || card.trait_code),
        current_score: toSafeNumber(card.current_score),
        change_score: toSafeNumber(card.change_score),
        confidence_score: toSafeNumber(card.confidence_score),
        trend_direction: toSafeString(card.trend_direction || "stable"),
        status_label: toSafeString(card.status_label),
        priority_level: toSafeString(card.priority_level),
      })
    )
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));

  return Object.freeze({
    section_key: "trait_cards",
    section_title: toSafeString("Trait signals"),
    cards,
    empty_state: cards.length === 0 ? toSafeString("Trait cards are not available yet.") : "",
  });
}

function buildStrengthsSection(dashboard) {
  const items = toSafeArray(dashboard?.strengths?.ranked_strengths)
    .filter((item) => item && typeof item === "object")
    .map((item) =>
      Object.freeze({
        trait_code: toKey(item.trait_code, "unknown_trait"),
        trait_label: toSafeString(item.trait_name || item.trait_code),
        current_score: toSafeNumber(item.current_score),
        confidence_score: toSafeNumber(item.confidence_score),
        keep_doing_copy: toSafeString(item.why_currently_strong),
      })
    )
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));

  return Object.freeze({
    section_key: "strengths",
    title: toSafeString("Current strengths"),
    items,
    keep_doing_copy:
      items.length > 0
        ? toSafeString("Keep routines stable in these areas and reinforce what is already working.")
        : toSafeString("Strength indicators will appear as more evidence is collected."),
    empty_state: items.length === 0 ? toSafeString("No strengths are currently ranked.") : "",
  });
}

function buildSupportSection(dashboard) {
  const items = toSafeArray(dashboard?.support?.current_support_needs)
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const confidenceScore = toSafeNumber(item.confidence_score);
      const lowConfidenceNotice = confidenceScore < LOW_CONFIDENCE_THRESHOLD ? toSafeString(item.caution_marker) : "";

      return Object.freeze({
        trait_code: toKey(item.trait_code, "unknown_trait"),
        trait_label: toSafeString(item.trait_name || item.trait_code),
        current_score: toSafeNumber(item.current_score),
        confidence_score: confidenceScore,
        support_next_copy: toSafeString(item.why_support_recommended),
        low_confidence_notice: lowConfidenceNotice,
      });
    })
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));

  return Object.freeze({
    section_key: "support",
    title: toSafeString("Support next"),
    items,
    support_next_copy:
      items.length > 0
        ? toSafeString("Choose one focused support action per item and review patterns after repeated practice.")
        : toSafeString("No immediate support items are flagged right now."),
    empty_state: items.length === 0 ? toSafeString("Support recommendations are currently empty.") : "",
  });
}

function buildEvidenceSection(dashboard) {
  const sourcesUsed = toSafeArray(dashboard?.evidence?.sources_used)
    .map((source) => toSafeString(source))
    .filter(Boolean)
    .sort();

  const confidenceCaveats = toSafeArray(dashboard?.evidence?.confidence_caveats)
    .map((caveat) => toSafeString(caveat))
    .filter(Boolean);

  const lowConfidenceFlags = toSafeArray(dashboard?.evidence?.low_confidence_flags)
    .filter((item) => item && typeof item === "object")
    .map((item) =>
      Object.freeze({
        trait_code: toKey(item.trait_code, "unknown_trait"),
        trait_label: toSafeString(item.trait_name || item.trait_code),
        confidence_score: toSafeNumber(item.confidence_score),
        caution: toSafeString(item.caution),
      })
    )
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));

  return Object.freeze({
    section_key: "evidence",
    title: toSafeString("Evidence and confidence"),
    sources_used: sourcesUsed,
    confidence_caveats: confidenceCaveats,
    low_confidence_flags: lowConfidenceFlags,
    empty_state:
      sourcesUsed.length === 0 && confidenceCaveats.length === 0 && lowConfidenceFlags.length === 0
        ? toSafeString("Evidence details are not available yet.")
        : "",
  });
}

function buildActionSection(dashboard, maxItems) {
  const topDevelopmentLevers = toSafeArray(dashboard?.action?.top_recommended_development_levers)
    .filter((lever) => lever && typeof lever === "object")
    .slice(0, maxItems)
    .map((lever) =>
      Object.freeze({
        trait_code: toKey(lever.trait_code, "unknown_trait"),
        trait_label: toSafeString(lever.trait_name || lever.trait_code),
        lever: toSafeString(lever.lever),
        rationale: toSafeString(lever.rationale),
      })
    )
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));

  const nextStepPrompts = toSafeArray(dashboard?.action?.parent_next_step_prompts)
    .filter((prompt) => prompt && typeof prompt === "object")
    .slice(0, maxItems)
    .map((prompt) =>
      Object.freeze({
        trait_code: toKey(prompt.trait_code, "unknown_trait"),
        prompt: toSafeString(prompt.prompt),
      })
    )
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));

  const environmentNotes = toSafeArray(dashboard?.action?.environment_support_notes)
    .map((note) => toSafeString(note))
    .filter(Boolean)
    .sort();

  return Object.freeze({
    section_key: "action",
    title: toSafeString("Next actions"),
    top_development_levers: topDevelopmentLevers,
    next_step_prompts: nextStepPrompts,
    environment_notes: environmentNotes,
    empty_state:
      topDevelopmentLevers.length === 0 && nextStepPrompts.length === 0 && environmentNotes.length === 0
        ? toSafeString("Action recommendations will populate when dashboard inputs are available.")
        : "",
  });
}

function buildParentDashboardPageModel(dashboard, options = {}) {
  const maxItems = clampMaxItems(options.maxItems);

  const pageModel = Object.freeze({
    page_type: toSafeString(options.page_type || DEFAULT_PAGE_TYPE),
    page_title: toSafeString(options.page_title || DEFAULT_PAGE_TITLE),
    page_subtitle: toSafeString(options.page_subtitle || DEFAULT_PAGE_SUBTITLE),
    hero_summary: buildHeroSummarySection(dashboard, maxItems),
    trait_cards: buildTraitCardsSection(dashboard),
    strengths: buildStrengthsSection(dashboard),
    support: buildSupportSection(dashboard),
    evidence: buildEvidenceSection(dashboard),
    action: buildActionSection(dashboard, maxItems),
    rendering_safety: Object.freeze({
      deterministic_section_order: true,
      section_order: SECTION_ORDER,
      website_safe_strings_only: true,
      no_future_guarantees: true,
      no_fixed_labels: true,
    }),
  });

  return pageModel;
}

module.exports = {
  buildParentDashboardPageModel,
  PARENT_DASHBOARD_PAGE_MODEL_RULES: Object.freeze({
    section_order:
      "hero_summary -> trait_cards -> strengths -> support -> evidence -> action, with stable keys and fallback-safe empty states.",
    safety:
      "All strings are sanitized for website rendering; output avoids future guarantees and keeps UI labels data-driven.",
    contract:
      "Input is buildYouthDevelopmentDashboard(...); output is a framework-agnostic parent dashboard page model contract.",
  }),
};
