"use strict";

const { SIGNAL_LIBRARY } = require("./signals");

const PROMPT_TEMPLATES = {
  ID: [
    "At your core in love, which pattern feels most natural?",
    "When connection feels grounded, which response sounds most like you?",
    "In your closest relationships, which tendency is most true for you?",
    "Which of these patterns best reflects your default relationship style?",
    "When you're being your full self with a partner, you usually:",
    "In day-to-day closeness, which rhythm feels most accurate to you?",
  ],
  BH: [
    "On an ordinary week together, what are you most likely to do?",
    "During steady stretches in a relationship, your pattern is usually:",
    "When nothing dramatic is happening, your most common move is:",
    "In everyday connection, which behavior tends to show up first?",
    "In regular relationship flow, which habit sounds most like you?",
    "Across a typical week with your partner, you usually:",
  ],
  SC: [
    "A meaningful decision lands unexpectedly. You typically:",
    "When plans change around something important, your first response is to:",
    "Your partner wants alignment on a big next step. You usually:",
    "An important choice has to be made quickly. You tend to:",
    "A relationship crossroads comes up sooner than expected. You usually:",
    "When timing gets tight around a major decision, you instinctively:",
  ],
  ST: [
    "When tension rises between you, your automatic move is to:",
    "In moments of disconnection or friction, you most often:",
    "When a conflict feels active, your first instinct is to:",
    "When stress hits the relationship, your reflex is to:",
    "When communication gets strained, you tend to:",
    "In a heated relational moment, you usually:",
  ],
  DS: [
    "The growth move I most want to practice in love is:",
    "To become more balanced in relationships, I want to get better at:",
    "My next relationship upgrade would be:",
    "If I focused on one stretch area in love right now, it would be:",
    "The pattern I want to strengthen next is:",
    "A more mature version of me in relationship would practice:",
  ],
};

const DOMAIN_FRAGMENTS = {
  "after-conflict repair": ["after a rough conversation", "after an argument", "during repair after conflict"],
  "texting latency": ["when replies are delayed", "when communication pace slows", "when texts go quiet"],
  "daily connection rituals": ["in small daily moments", "in your regular check-in rhythm", "in everyday closeness"],
  "future commitment talks": ["when discussing where things are going", "in long-term commitment talks", "when future plans come up"],
  "post-argument cooldown": ["during cooldown after friction", "after you both need a beat", "as emotions settle"],
  "scheduling coordination": ["while coordinating busy schedules", "when calendars collide", "while planning shared time"],
  "privacy decisions": ["when privacy boundaries come up", "when personal space gets negotiated", "when boundaries need clarity"],
  "cohabitation pacing": ["when sharing more life space", "as commitment logistics deepen", "while pacing bigger together-steps"],
  "misunderstanding debrief": ["after a misunderstanding", "when intentions got crossed", "once confusion shows up"],
  "relationship check-ins": ["during relationship check-ins", "while talking about how things are going", "in regular state-of-us conversations"],
  "value alignment": ["when values differ", "when priorities need alignment", "when your principles get tested"],
  "repair attempts": ["during a repair attempt", "when one of you reaches to reconnect", "while trying to reset after tension"],
  "planning reliability": ["when making practical plans", "while setting shared expectations", "when follow-through matters"],
  "promise keeping": ["when promises are on the line", "after words need to become action", "when reliability gets tested"],
  "shared responsibilities": ["around shared responsibilities", "when household or life tasks need balance", "while carrying day-to-day commitments"],
  "repair accountability": ["when trust needs rebuilding", "during accountability conversations", "when repair needs visible effort"],
  "date planning": ["while planning dates", "when creating quality time", "when deciding how to spend time together"],
  "life transitions": ["during life transitions", "when routines are changing", "in seasons of change"],
  "celebration rituals": ["around celebrations", "when marking milestones", "in moments worth celebrating"],
  "conflict reset experiences": ["when trying to reset after tension", "when you need a fresh relational start", "after emotional heaviness"],
};

const OPTION_BEHAVIORS = {
  RS: {
    ID: [
      "ask for a clear check-in instead of guessing where you stand",
      "move closer and name that reassurance helps you settle",
      "say directly you need warmth and a steady response",
      "reach out for emotional contact when distance starts to feel loud",
      "request a grounding touchpoint so your nervous system can calm",
      "name the reassurance you need instead of holding it in",
    ],
    BH: [
      "send a quick check-in text when connection feels quiet",
      "ask where you both stand before uncertainty snowballs",
      "look for warm confirmation through small daily touchpoints",
      "initiate closeness when silence starts feeling personal",
      "ask for reassurance early rather than spiraling alone",
      "create predictable emotional check-ins during the week",
    ],
    SC: [
      "ask for clarity on what this decision means for the relationship",
      "request reassurance before locking in the next step",
      "check that emotional security is part of the plan",
      "pause long enough to confirm you're still emotionally aligned",
      "ask directly how connected you'll stay through the change",
      "seek a reassuring plan for how you stay close while deciding",
    ],
    ST: [
      "name that you need reassurance before trying to solve the issue",
      "ask for a calming check-in before the conversation escalates",
      "move toward repair by asking for steady emotional contact",
      "say clearly when silence is amplifying your stress",
      "request a short reconnection moment before continuing the conflict",
      "anchor the moment with direct reassurance requests",
    ],
    DS: [
      "ask for reassurance without over-reading every delay",
      "name your need clearly while giving your partner room to respond",
      "practice self-soothing before sending a second follow-up",
      "separate real disconnection from normal response gaps",
      "request clarity once, then give space for follow-through",
      "ground yourself first, then ask for what you need",
    ],
  },
  AL: {
    ID: [
      "protect your pace while staying emotionally available",
      "take space to think, then reconnect with intention",
      "ask for breathing room before revisiting heavy topics",
      "keep your autonomy intact while remaining engaged",
      "slow the tempo so you can respond with clarity instead of pressure",
      "signal care while guarding your need for personal bandwidth",
    ],
    BH: [
      "build in solo recharge time and return when you're grounded",
      "set a clear boundary and follow through on reconnect timing",
      "step back briefly rather than react while overloaded",
      "maintain your own rhythm without disappearing",
      "protect independent time while communicating your return point",
      "take a short pause, then come back with focus",
    ],
    SC: [
      "ask for time to process before giving a final answer",
      "protect decision pace so you don't commit from pressure",
      "clarify boundaries before agreeing to next steps",
      "slow the decision down to align with your real capacity",
      "choose space for reflection before making a joint call",
      "request a defined pause so you can respond deliberately",
    ],
    ST: [
      "take a brief timeout to regulate before re-engaging",
      "name your need for space and set a return time",
      "pause the exchange before it becomes reactive",
      "step back to reset, then come back to the hard part",
      "protect your bandwidth so the conversation stays respectful",
      "decompress first, then restart the conversation intentionally",
    ],
    DS: [
      "ask for space without going fully silent",
      "pair boundaries with proactive reassurance",
      "signal your return time so distance does not feel like withdrawal",
      "stay open while protecting your autonomy",
      "share your pace needs before conflict hardens",
      "practice giving context when you need room",
    ],
  },
  EC: {
    ID: [
      "talk it through so both people feel accurately understood",
      "name what's happening in real time before assumptions grow",
      "open a direct conversation to create mutual clarity",
      "process out loud to reconnect through understanding",
      "ask focused questions until both viewpoints feel clear",
      "bring words to tension quickly so it doesn't calcify",
    ],
    BH: [
      "start honest check-ins instead of leaving things implied",
      "name your feelings clearly and invite your partner's perspective",
      "debrief misunderstandings before they linger",
      "translate emotional shifts into clear language",
      "use direct conversation to keep the bond clean",
      "make room for dialogue even when things seem mostly fine",
    ],
    SC: [
      "talk through tradeoffs before deciding",
      "ask clarifying questions until expectations are explicit",
      "map both perspectives so the decision feels shared",
      "name concerns early and resolve them together",
      "use a focused conversation to align on meaning and timing",
      "frame the decision with transparent communication first",
    ],
    ST: [
      "start a calm repair conversation and stay with the core issue",
      "name the rupture directly and ask what each of you needs",
      "slow the conflict down with clear language and listening",
      "invite a two-way debrief instead of arguing in loops",
      "restate what you heard before pushing your point",
      "work toward repair by talking through the impact",
    ],
    DS: [
      "speak more concisely when emotions run high",
      "listen for understanding before trying to fix",
      "ask one clear question at a time in hard conversations",
      "trade over-processing for cleaner repair dialogue",
      "focus on timing so conversations land better",
      "balance honesty with emotional pacing",
    ],
  },
  AV: {
    ID: [
      "watch for consistent follow-through more than polished words",
      "trust actions that repeat, not promises that spike",
      "look for patterns over one-time gestures",
      "anchor trust in reliability you can actually observe",
      "measure connection by what gets done over time",
      "value steady effort above emotional speeches",
    ],
    BH: [
      "notice whether commitments are kept week after week",
      "track consistency before relaxing your guard",
      "look for concrete proof when trust feels uncertain",
      "pay attention to repeated behaviors, not isolated moments",
      "validate care through follow-through on small promises",
      "watch whether effort holds when life gets busy",
    ],
    SC: [
      "ask for a plan with clear responsibilities and follow-through",
      "choose the option backed by consistent action",
      "wait for concrete steps before fully buying in",
      "prefer commitments that come with visible execution",
      "align on who will do what and by when",
      "look for proof of reliability before taking the leap",
    ],
    ST: [
      "look for changed behavior before declaring the issue resolved",
      "ask for concrete repair actions, not vague apologies",
      "pause trust until consistency returns",
      "track whether accountability shows up after the conflict",
      "rebuild closeness through visible follow-through",
      "wait for dependable patterns before resetting fully",
    ],
    DS: [
      "recognize good-faith effort sooner instead of waiting for perfection",
      "appreciate progress while still valuing consistency",
      "allow one miss without rewriting the whole pattern",
      "name what follow-through would rebuild trust faster",
      "reward reliability when you see it",
      "balance standards with flexibility in repair",
    ],
  },
  ES: {
    ID: [
      "reset energy through shared novelty when things feel stale",
      "bring in a fresh plan to restore emotional aliveness",
      "create meaningful new moments to reconnect",
      "shift the mood with a new shared experience",
      "seek spontaneity that brings you both back online",
      "renew connection by changing the environment together",
    ],
    BH: [
      "suggest a new micro-adventure when routine gets flat",
      "refresh the bond with playful shared plans",
      "redirect heavy energy into a new shared moment",
      "propose something different to re-open connection",
      "use novelty to shake off emotional stuckness",
      "plan a fresh experience that creates momentum",
    ],
    SC: [
      "look for a next step that keeps the relationship feeling alive",
      "choose the path with room for growth and new experiences",
      "bring creativity into the decision so connection stays energized",
      "reframe the decision as an opportunity to evolve together",
      "prefer options that prevent the relationship from going stagnant",
      "add novelty to the plan so both of you stay engaged",
    ],
    ST: [
      "break the tension cycle with a fresh reset activity",
      "shift the emotional state with a new shared experience",
      "suggest a change of setting to reset the conversation",
      "interrupt conflict spiral by redirecting energy together",
      "bring playful movement into a stuck moment",
      "create a new experience that softens the emotional charge",
    ],
    DS: [
      "stay present in calm moments without needing constant novelty",
      "build depth in routine, not only in intensity",
      "practice tolerating slower relational seasons",
      "keep connection alive without chasing stimulation",
      "balance excitement with consistency",
      "use novelty intentionally instead of impulsively",
    ],
  },
};

function choose(list, index) {
  return list[index % list.length];
}

function toSentenceCase(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildPrompt(blueprint, idx) {
  const classTemplates = PROMPT_TEMPLATES[blueprint.questionClass] || PROMPT_TEMPLATES.BH;
  const base = choose(classTemplates, idx);
  const domainOptions = DOMAIN_FRAGMENTS[blueprint.scenarioDomain] || [];
  if (!domainOptions.length) return base;

  const domainPhrase = choose(domainOptions, idx + blueprint.questionId.length);
  if (base.includes("You usually:") || base.includes("you usually:") || base.endsWith("to:")) {
    return `${base} ${toSentenceCase(domainPhrase)}.`;
  }
  return `${base} (${toSentenceCase(domainPhrase)}).`;
}

function buildOptionText({ primary, questionClass, idx, optionIndex, scenarioDomain }) {
  const byClass = OPTION_BEHAVIORS[primary] || OPTION_BEHAVIORS.EC;
  const variants = byClass[questionClass] || byClass.BH;
  const scenarioBias = scenarioDomain ? scenarioDomain.length % variants.length : 0;
  const variant = choose(variants, idx + optionIndex + scenarioBias);
  return `${toSentenceCase(variant)}.`;
}

function generateCandidatesForBlueprint(blueprint) {
  const promptVariants = PROMPT_TEMPLATES[blueprint.questionClass] || PROMPT_TEMPLATES.BH;
  return promptVariants.map((_, idx) => ({
    questionId: blueprint.questionId,
    bankId: blueprint.bankId,
    questionClass: blueprint.questionClass,
    prompt: buildPrompt(blueprint, idx),
    optionVariants: blueprint.optionBlueprints.map((ob, optionIndex) => ({
      optionId: String.fromCharCode(65 + optionIndex),
      text: buildOptionText({
        primary: ob.primary,
        questionClass: blueprint.questionClass,
        idx,
        optionIndex,
        scenarioDomain: blueprint.scenarioDomain,
      }),
      primary: ob.primary,
      secondary: ob.secondary,
      signalType: ob.signal.replace(/\s+/g, "_").toLowerCase(),
      desirabilityScoreEstimate: null,
      signalProfileName: SIGNAL_LIBRARY[ob.primary].name,
    })),
    sourceBlueprintId: blueprint.questionId,
  }));
}

function generateCandidatePool(blueprints) {
  return blueprints.map((bp) => ({
    blueprint: bp,
    candidates: generateCandidatesForBlueprint(bp),
  }));
}

module.exports = { generateCandidatesForBlueprint, generateCandidatePool };
