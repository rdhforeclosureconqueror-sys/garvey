"use strict";

const SESSION_LIFECYCLE_EVENTS = Object.freeze([
  "session_start",
  "session_pause",
  "session_resume",
  "session_complete",
  "session_exit"
]);

const ALLOWED_PRACTICE_EVENT_EXAMPLES = Object.freeze([
  "retry_after_mistake",
  "completed_round",
  "pause_selected",
  "calming_recovered",
  "attention_returned",
  "gradual_improvement",
  "consistent_practice",
  "frustration_exit",
  "resumed_after_pause"
]);

const FORBIDDEN_EVENT_EXAMPLES = Object.freeze([
  "IQ",
  "intelligence_score",
  "failure_rating",
  "low_performer",
  "disorder_prediction",
  "ranking_percentile",
  "child_comparison"
]);

const SAFE_DEVELOPMENTAL_SIGNALS = Object.freeze([
  "sustained attention practice",
  "impulse pause practice",
  "emotional recovery practice",
  "working memory repetition",
  "flexibility adaptation",
  "persistence after challenge"
]);

const FORBIDDEN_METRICS = Object.freeze([
  "diagnostic scoring",
  "predictive mental health labeling",
  "cross-child ranking",
  "addiction loops",
  "streak pressure",
  "monetized compulsion systems",
  "manipulative retention mechanics"
]);

const PARENT_LANGUAGE_CONTRACT = Object.freeze({
  good_examples: Object.freeze([
    "Your child practiced calming after frustration.",
    "Your child returned to the activity after pausing.",
    "Attention endurance increased during practice."
  ]),
  forbidden_examples: Object.freeze([
    "Your child is below average.",
    "Your child failed.",
    "Your child shows signs of disorder."
  ])
});

const CHILD_LANGUAGE_CONTRACT = Object.freeze({
  required: Object.freeze([
    "calm tone",
    "optional pacing",
    "pause affordances",
    "encouragement without pressure"
  ]),
  prohibited: Object.freeze([
    "shame language",
    "failure labels",
    "countdown stress",
    "streak guilt"
  ])
});

const FUTURE_ARCHITECTURE_PLANNING = Object.freeze([
  "api contracts",
  "session ingestion flow",
  "timeline integration",
  "pattern engine integration",
  "consent boundaries",
  "data retention boundaries",
  "anonymized analytics boundaries"
]);

const SAFETY_GUARDRAILS = Object.freeze([
  "parent-controlled access",
  "no public leaderboards",
  "no social comparison",
  "no ad targeting from child data",
  "no biometric inference",
  "no hidden profiling"
]);

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

function isForbiddenSignalToken(token) {
  const normalized = normalizeToken(token);
  return FORBIDDEN_EVENT_EXAMPLES.map(normalizeToken).includes(normalized)
    || FORBIDDEN_METRICS.map(normalizeToken).includes(normalized);
}

module.exports = {
  SESSION_LIFECYCLE_EVENTS,
  ALLOWED_PRACTICE_EVENT_EXAMPLES,
  FORBIDDEN_EVENT_EXAMPLES,
  SAFE_DEVELOPMENTAL_SIGNALS,
  FORBIDDEN_METRICS,
  PARENT_LANGUAGE_CONTRACT,
  CHILD_LANGUAGE_CONTRACT,
  FUTURE_ARCHITECTURE_PLANNING,
  SAFETY_GUARDRAILS,
  isForbiddenSignalToken
};
