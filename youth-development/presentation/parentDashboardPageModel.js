"use strict";

const DEFAULT_PAGE_TYPE = "youth_parent_dashboard_page";
const DEFAULT_PAGE_TITLE = "Youth Development Dashboard";
const DEFAULT_PAGE_SUBTITLE = "Parent-facing snapshot of current development signals.";
const LOW_CONFIDENCE_THRESHOLD = 55;
const LOW_SCORE_THRESHOLD = 40;
const HIGH_SCORE_THRESHOLD = 70;
const POSITIVE_CHANGE_THRESHOLD = 3;
const NEGATIVE_CHANGE_THRESHOLD = -3;
const DEFAULT_MAX_ITEMS = 5;

const SECTION_ORDER = Object.freeze([
  "hero_summary",
  "insight_narrative",
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

function toPriorityLabel(priorityLevel) {
  if (priorityLevel === "support_now") return "support now";
  if (priorityLevel === "evidence_needed") return "evidence needed";
  if (priorityLevel === "build_next") return "build next";
  return "monitor";
}

function buildTraitNarrative(card) {
  const traitLabel = toSafeString(card?.trait_name || card?.trait_code || "This trait");
  const score = toSafeNumber(card?.current_score);
  const change = toSafeNumber(card?.change_score);
  const confidence = toSafeNumber(card?.confidence_score);
  const trend = toSafeString(card?.trend_direction || "stable");

  const meaning = score >= HIGH_SCORE_THRESHOLD
    ? `${traitLabel} is currently a reliable strength that your child can build from in daily routines.`
    : score <= LOW_SCORE_THRESHOLD
      ? `${traitLabel} is currently a growth area that may need extra structure and repetition.`
      : `${traitLabel} is developing and can improve with consistent, low-pressure practice.`;

  const behavior = trend === "increasing"
    ? `Recent observations suggest this is showing up more consistently over time.`
    : trend === "decreasing"
      ? `Recent observations suggest this is showing up less consistently and may need tighter scaffolding.`
      : `Recent observations suggest this is steady, with no major directional shift yet.`;

  const whyItMatters = score >= HIGH_SCORE_THRESHOLD
    ? `When this remains strong, it often supports confidence and transfer into new challenges.`
    : score <= LOW_SCORE_THRESHOLD
      ? `If this remains low, everyday transitions and learning tasks may become harder to sustain.`
      : `This matters because steady improvement here can reduce friction in school and home routines.`;

  const emotionalContext = confidence < LOW_CONFIDENCE_THRESHOLD
    ? `This may feel mixed right now; confidence is still limited, so treat this as a working signal while collecting more examples.`
    : `This pattern is grounded in current evidence and can be discussed with your child in practical, non-judgmental language.`;

  return Object.freeze({
    what_this_means: toSafeString(meaning),
    behavior_look_fors: toSafeString(behavior),
    why_it_matters: toSafeString(whyItMatters),
    emotional_context: toSafeString(emotionalContext),
    progress_look_fors: change >= POSITIVE_CHANGE_THRESHOLD
      ? toSafeString("Progress looks like this pattern holding across multiple settings, not just in one moment.")
      : toSafeString("Progress looks like more frequent successful attempts and fewer breakdown moments week to week."),
  });
}

function buildPriorityNarrative(card) {
  const score = toSafeNumber(card?.current_score);
  const change = toSafeNumber(card?.change_score);
  const confidence = toSafeNumber(card?.confidence_score);
  const traitLabel = toSafeString(card?.trait_name || card?.trait_code || "This trait");

  const whyPriority = confidence < LOW_CONFIDENCE_THRESHOLD
    ? `This is prioritized because confidence is still limited and stronger observation quality is needed before major decisions.`
    : score <= LOW_SCORE_THRESHOLD || change <= NEGATIVE_CHANGE_THRESHOLD
      ? `This is prioritized because current level or recent direction indicates active support is needed now.`
      : `This is prioritized because current momentum can be converted into stable day-to-day growth.`;

  const riskIfIgnored = confidence < LOW_CONFIDENCE_THRESHOLD
    ? `If ignored, the family may overreact to one data point or miss patterns that matter across contexts.`
    : score <= LOW_SCORE_THRESHOLD || change <= NEGATIVE_CHANGE_THRESHOLD
      ? `If ignored, this area can create repeated friction in routines, transitions, and learning persistence.`
      : `If ignored, recent progress may flatten and become harder to restart later.`;

  const progressLooksLike = change >= POSITIVE_CHANGE_THRESHOLD
    ? `${traitLabel} remains stable or improving while confidence holds or rises.`
    : `${traitLabel} shows fewer low-moment breakdowns and a more consistent baseline over repeated observations.`;

  return Object.freeze({
    why_priority: toSafeString(whyPriority),
    risk_if_ignored: toSafeString(riskIfIgnored),
    progress_looks_like: toSafeString(progressLooksLike),
  });
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
        priority_level: toSafeString(toPriorityLabel(card.priority_level)),
        trend_direction: toSafeString(card.trend_direction || "stable"),
        priority_narrative: buildPriorityNarrative(card),
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
      Object.freeze(Object.assign({
        trait_code: toKey(card.trait_code, "unknown_trait"),
        trait_label: toSafeString(card.trait_name || card.trait_code),
        current_score: toSafeNumber(card.current_score),
        change_score: toSafeNumber(card.change_score),
        confidence_score: toSafeNumber(card.confidence_score),
        trend_direction: toSafeString(card.trend_direction || "stable"),
        status_label: toSafeString(card.status_label),
        priority_level: toSafeString(card.priority_level),
      }, buildTraitNarrative(card)))
    )
    .sort((a, b) => a.trait_code.localeCompare(b.trait_code));

  return Object.freeze({
    section_key: "trait_cards",
    section_title: toSafeString("Trait signals"),
    cards,
    empty_state: cards.length === 0 ? toSafeString("Trait cards are not available yet.") : "",
  });
}

function buildInsightNarrativeSection(dashboard) {
  const strongest = toSafeArray(dashboard?.strengths?.ranked_strengths)
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => Number(b?.current_score || 0) - Number(a?.current_score || 0))[0];
  const highestSupportNeed = toSafeArray(dashboard?.support?.current_support_needs)
    .filter((item) => item && typeof item === "object")
    .sort((a, b) => Number(a?.current_score || 0) - Number(b?.current_score || 0))[0];
  const topLever = toSafeArray(dashboard?.action?.top_recommended_development_levers)
    .filter((item) => item && typeof item === "object")[0];

  const opening = strongest
    ? `Your child is currently showing the strongest pattern in ${toSafeString(strongest.trait_name || strongest.trait_code)}.`
    : "This dashboard is beginning to identify emerging strengths for your child.";
  const focusArea = highestSupportNeed
    ? `A helpful next focus area is ${toSafeString(highestSupportNeed.trait_name || highestSupportNeed.trait_code)}, where steady practice can make daily progress easier to see.`
    : "No immediate support flags are present right now, so continue consistent routines and observation.";
  const nextStep = topLever
    ? `A practical next step is to apply this lever: ${toSafeString(topLever.lever)}.`
    : "As more evidence is collected, this section will recommend specific next-step levers.";

  return Object.freeze({
    section_key: "insight_narrative",
    section_title: toSafeString("Parent insight narrative"),
    opening,
    focus_area: focusArea,
    next_step: nextStep,
    empty_state: toSafeString("Narrative insight will appear as soon as trait and support signals are available."),
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
        actionable_next_step: toSafeString("What to do next: keep the current routine, then increase challenge in one small, predictable way."),
        parent_coaching_note: toSafeString("Use specific praise tied to behavior (not identity) so the child can repeat the exact action."),
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
        actionable_next_step: confidenceScore < LOW_CONFIDENCE_THRESHOLD
          ? toSafeString("What to do next: collect two additional observations in different settings before changing expectations.")
          : toSafeString("What to do next: choose one scaffolded practice task and repeat it on a predictable schedule."),
        risk_if_ignored: confidenceScore < LOW_CONFIDENCE_THRESHOLD
          ? toSafeString("If ignored, interpretation may drift without enough evidence.")
          : toSafeString("If ignored, this area may create repeated frustration in daily routines."),
        progress_signal: toSafeString("Progress looks like fewer support prompts and more independent attempts across the week."),
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
    insight_narrative: buildInsightNarrativeSection(dashboard),
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
      "hero_summary -> insight_narrative -> trait_cards -> strengths -> support -> evidence -> action, with stable keys and fallback-safe empty states.",
    safety:
      "All strings are sanitized for website rendering; output avoids future guarantees and keeps UI labels data-driven.",
    contract:
      "Input is buildYouthDevelopmentDashboard(...); output is a framework-agnostic parent dashboard page model contract.",
  }),
};
