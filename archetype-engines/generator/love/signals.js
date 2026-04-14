"use strict";

const ARCHETYPES = Object.freeze(["RS", "AL", "EC", "AV", "ES"]);
const CLASS_DISTRIBUTION = Object.freeze({ ID: 5, BH: 6, SC: 6, ST: 6, DS: 2 });
const CLASS_WEIGHTS = Object.freeze({ ID: 1.0, BH: 1.0, SC: 1.25, ST: 1.5, DS: 1.0 });

const SIGNAL_LIBRARY = Object.freeze({
  RS: {
    code: "RS",
    name: "Reassurance Seeker",
    coreSignals: ["reassurance need", "sensitivity to silence", "proximity seeking", "emotional validation focus"],
    baselineSignals: ["check-in preference", "warmth confirmation", "relational clarity"],
    stressSignals: ["urgency for response", "disconnection alarm", "abandonment fear activation"],
    desiredGrowthSignals: ["self-soothing", "paced reassurance requests", "secure uncertainty tolerance"],
    oppositeTensionSignals: ["distance regulation", "low-contact recovery style"],
    scenarioDomains: ["after-conflict repair", "texting latency", "daily connection rituals", "future commitment talks"],
    languageStyle: ["emotion-explicit", "closeness-oriented", "reassurance-seeking"],
    avoidLanguage: ["pathologizing dependency", "needy label", "moralized insecurity"],
  },
  AL: {
    code: "AL",
    name: "Autonomous Lover",
    coreSignals: ["autonomy protection", "distance regulation", "self-containment", "closeness without engulfment"],
    baselineSignals: ["independence rhythms", "solo recharge", "boundary clarity"],
    stressSignals: ["withdrawal impulse", "pressure resistance", "space-seeking"],
    desiredGrowthSignals: ["transparent pacing", "co-regulation access", "proactive reassurance"],
    oppositeTensionSignals: ["urgent closeness bids", "high-frequency check-ins"],
    scenarioDomains: ["post-argument cooldown", "scheduling coordination", "privacy decisions", "cohabitation pacing"],
    languageStyle: ["concise", "boundary-clear", "non-dramatic"],
    avoidLanguage: ["cold/distant shaming", "commitment phobia labels", "moralized independence"],
  },
  EC: {
    code: "EC",
    name: "Expression Connector",
    coreSignals: ["verbal repair", "articulation", "discussion-based closeness", "clarity seeking"],
    baselineSignals: ["naming feelings", "meaning-making", "dialogue preference"],
    stressSignals: ["over-processing risk", "looped conversation", "resolution urgency"],
    desiredGrowthSignals: ["timing sensitivity", "listening depth", "concise repair"],
    oppositeTensionSignals: ["action-only repair", "minimal verbal processing"],
    scenarioDomains: ["misunderstanding debrief", "relationship check-ins", "value alignment", "repair attempts"],
    languageStyle: ["reflective", "specific", "conversation-forward"],
    avoidLanguage: ["therapy-speak overload", "diagnostic labels", "debate framing"],
  },
  AV: {
    code: "AV",
    name: "Action Validator",
    coreSignals: ["action over words", "proof-based trust", "consistency tracking", "reliability-centered bonding"],
    baselineSignals: ["follow-through focus", "effort visibility", "habit reliability"],
    stressSignals: ["skepticism after mismatch", "trust withholding", "evidence scanning"],
    desiredGrowthSignals: ["explicit appreciation", "flexibility with variance", "faster repair acceptance"],
    oppositeTensionSignals: ["promise-heavy language", "emotion-only repair bids"],
    scenarioDomains: ["planning reliability", "promise keeping", "shared responsibilities", "repair accountability"],
    languageStyle: ["concrete", "behavior-specific", "results-oriented"],
    avoidLanguage: ["cynical absolutes", "motive attacks", "moral superiority"],
  },
  ES: {
    code: "ES",
    name: "Experience Seeker",
    coreSignals: ["novelty activation", "stagnation sensitivity", "experiential bonding", "emotional aliveness through shared moments"],
    baselineSignals: ["adventure planning", "playfulness", "variety seeking"],
    stressSignals: ["restlessness", "intensity chasing", "routine fatigue"],
    desiredGrowthSignals: ["sustained depth in routine", "presence without novelty", "consistent rituals"],
    oppositeTensionSignals: ["high structure", "predictability priority"],
    scenarioDomains: ["date planning", "life transitions", "celebration rituals", "conflict reset experiences"],
    languageStyle: ["energizing", "possibility-oriented", "moment-centered"],
    avoidLanguage: ["reckless thrill framing", "avoidance through distraction", "flaky stereotypes"],
  },
});

module.exports = {
  ARCHETYPES,
  CLASS_DISTRIBUTION,
  CLASS_WEIGHTS,
  SIGNAL_LIBRARY,
};
