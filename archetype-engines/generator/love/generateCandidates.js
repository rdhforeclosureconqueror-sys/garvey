"use strict";

const { SIGNAL_LIBRARY } = require("./signals");
const { seededRandom, shuffle } = require("./utils");

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

const ARCHETYPE_EXPRESSIONS = {
  RS: [
    "seek reassurance directly",
    "check in quickly",
    "assume something is wrong",
    "feel an emotional drop",
    "ask for clarity",
    "move toward closeness",
    "need verbal confirmation",
    "overanalyze silence",
    "request steady emotional contact",
    "name uncertainty early",
  ],
  AL: [
    "create space",
    "downplay urgency",
    "self-regulate internally",
    "detach slightly",
    "avoid over-engagement",
    "maintain independence",
    "set pacing boundaries",
    "take a pause before responding",
    "reconnect after solo processing",
    "protect personal bandwidth",
  ],
  EC: [
    "initiate conversation",
    "clarify verbally",
    "express feelings directly",
    "process out loud",
    "ask grounded questions",
    "name the emotional pattern",
    "invite two-way dialogue",
    "translate tension into words",
    "restate for understanding",
    "debrief misunderstandings",
  ],
  AV: [
    "evaluate actions",
    "look for consistency",
    "wait for behavior",
    "measure follow-through",
    "verify reliability",
    "track repeated effort",
    "anchor trust in proof",
    "compare words to actions",
    "test accountability",
    "reward demonstrated change",
  ],
  ES: [
    "shift to activity",
    "seek stimulation",
    "redirect energy outward",
    "create new engagement",
    "avoid stagnation",
    "introduce novelty",
    "spark playful momentum",
    "change the setting",
    "design a shared experience",
    "re-energize connection",
  ],
};

const SIGNAL_PHRASES = {
  "reassurance need": ["when reassurance feels necessary", "if emotional security feels shaky"],
  "sensitivity to silence": ["when silence stretches", "if responses go quiet"],
  "proximity seeking": ["when distance shows up", "if connection feels far away"],
  "emotional validation focus": ["when you need emotional confirmation", "if feelings need to be acknowledged"],
  "autonomy protection": ["when autonomy matters", "if pressure starts building"],
  "distance regulation": ["when closeness needs pacing", "if taking space helps me reset"],
  "self-containment": ["when you process internally", "if you need solo regulation"],
  "closeness without engulfment": ["when you want closeness without overwhelm", "if you need room and connection"],
  "verbal repair": ["when repair needs words", "if clarity helps reconnection"],
  articulation: ["when clear words build trust", "if naming it reduces confusion"],
  "discussion-based closeness": ["when talking deepens closeness", "if dialogue builds connection"],
  "clarity seeking": ["when clarity is essential", "if assumptions might grow"],
  "action over words": ["when actions carry more weight", "if promises alone feel thin"],
  "proof-based trust": ["when trust needs evidence", "if consistency matters most"],
  "consistency tracking": ["when you watch patterns over time", "if one moment is not enough"],
  "reliability-centered bonding": ["when reliability drives bonding", "if dependable effort signals care"],
  "novelty activation": ["when newness boosts connection", "if routine feels flat"],
  "stagnation sensitivity": ["when stagnation feels heavy", "if energy starts dipping"],
  "experiential bonding": ["when shared experiences reconnect you", "if doing something new restores spark"],
  "emotional aliveness through shared moments": ["when aliveness comes from shared moments", "if fresh moments reset your mood"],
};

const CLASS_TONE_SCHEMAS = {
  ID: {
    emotional: ["I naturally {expression} {scenario} {signal}.", "At my core, I {expression} {signal} {scenario}.", "I feel most like myself when I {expression} {scenario} {signal}."],
    neutral: ["I usually {expression} {scenario} {signal}.", "My default is to {expression} {scenario} {signal}.", "I tend to {expression} {scenario} {signal}."],
    logical: ["My baseline strategy is to {expression} {signal} {scenario}.", "I rely on {expression} {scenario} {signal}.", "I default to {expression} because it works for me {scenario} {signal}."],
    energetic: ["I quickly {expression} {scenario} {signal}.", "I jump into {expression} {scenario} {signal}.", "I actively {expression} {scenario} {signal}."],
  },
  BH: {
    emotional: ["Most weeks, I {expression} {scenario} {signal}.", "In regular connection, I often {expression} {scenario} {signal}.", "Over time, I keep {expression} {scenario} {signal}."],
    neutral: ["Habitually, I {expression} {scenario} {signal}.", "My routine move is to {expression} {scenario} {signal}.", "Week to week, I {expression} {scenario} {signal}."],
    logical: ["As a pattern, I {expression} {signal} {scenario}.", "My practical habit is to {expression} {scenario} {signal}.", "I repeatedly {expression} because it keeps things workable {scenario} {signal}."],
    energetic: ["I tend to quickly {expression} {scenario} {signal}.", "I actively keep {expression} in motion {scenario} {signal}.", "I regularly jump to {expression} {scenario} {signal}."],
  },
  SC: {
    emotional: ["In that moment, I {expression} {scenario} {signal}.", "When the situation turns, I feel pulled to {expression} {scenario} {signal}.", "My first response is to {expression} {scenario} {signal}."],
    neutral: ["In this scenario, I {expression} {scenario} {signal}.", "My likely response is to {expression} {scenario} {signal}.", "I usually respond by {expression} {scenario} {signal}."],
    logical: ["Given the situation, I {expression} {signal} {scenario}.", "My decision move is to {expression} {scenario} {signal}.", "I respond by trying to {expression} {scenario} {signal}."],
    energetic: ["I quickly respond by {expression} {scenario} {signal}.", "I move fast to {expression} {scenario} {signal}.", "I immediately {expression} {scenario} {signal}."],
  },
  ST: {
    emotional: ["Under stress, I {expression} {scenario} {signal}.", "When tension spikes, I feel myself {expression} {scenario} {signal}.", "In conflict, I emotionally default to {expression} {scenario} {signal}."],
    neutral: ["When stressed, I usually {expression} {scenario} {signal}.", "My stress response is to {expression} {scenario} {signal}.", "During friction, I tend to {expression} {scenario} {signal}."],
    logical: ["In high tension, I {expression} to restore stability {scenario} {signal}.", "My conflict regulation move is to {expression} {scenario} {signal}.", "Under pressure, I use {expression} as my regulating step {scenario} {signal}."],
    energetic: ["When conflict heats up, I quickly {expression} {scenario} {signal}.", "I react fast by {expression} {scenario} {signal}.", "In tense moments, I immediately {expression} {scenario} {signal}."],
  },
  DS: {
    emotional: ["I am practicing how to {expression} {scenario} {signal}.", "My growth edge is learning to {expression} {scenario} {signal}.", "To grow, I want to {expression} {scenario} {signal}."],
    neutral: ["I am working on {expression} {scenario} {signal}.", "My development focus is to {expression} {scenario} {signal}.", "I am intentionally building the habit to {expression} {scenario} {signal}."],
    logical: ["My next growth strategy is to {expression} {scenario} {signal}.", "To mature this pattern, I aim to {expression} {scenario} {signal}.", "I want to improve by {expression} {scenario} {signal}."],
    energetic: ["I am actively training myself to {expression} {scenario} {signal}.", "I am putting energy into {expression} {scenario} {signal}.", "I am deliberately pushing toward {expression} {scenario} {signal}."],
  },
};

const TONES = ["emotional", "neutral", "logical", "energetic"];
const SUPERLATIVE_TOKENS = ["best", "ideal", "always", "never", "perfect", "superior", "right way"];

function inferTone(text) {
  const lower = text.toLowerCase();
  if (/\bquickly|immediately|actively|jump|fast\b/.test(lower)) return "energetic";
  if (/\bstrategy|stability|practical|baseline|regulation\b/.test(lower)) return "logical";
  if (/\bfeel|emotion|stress|tension|conflict\b/.test(lower)) return "emotional";
  return "neutral";
}

function inferExpressionSignature(option) {
  if (option.expression) return `${option.primary || option.primary_archetype}:${option.expression}`;
  const cleaned = option.text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  return `${option.primary || option.primary_archetype}:${cleaned.slice(2, 6).join(" ")}`;
}

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

function similaritySignature(text) {
  return text.toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
}

function buildOptionText({ template, expression, scenarioPhrase, signalPhrase }) {
  return template
    .replace("{expression}", expression)
    .replace("{scenario}", scenarioPhrase)
    .replace("{signal}", signalPhrase)
    .replace(/\s+/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}

function normalizeSpeechLead(text) {
  return text
    .replace(/^At my core,\s+I\s+/i, "I ")
    .replace(/^I feel most like myself when I\s+/i, "I ")
    .replace(/^My default is to\s+/i, "I default to ")
    .replace(/^My baseline strategy is to\s+/i, "I ")
    .replace(/^My practical habit is to\s+/i, "I ")
    .replace(/^My routine move is to\s+/i, "I ")
    .replace(/^Most weeks,\s+I\s+/i, "I ")
    .replace(/^In regular connection,\s+I often\s+/i, "I ")
    .replace(/^Over time,\s+I keep\s+/i, "I keep ")
    .replace(/^Week to week,\s+I\s+/i, "I ")
    .replace(/^Habitually,\s+I\s+/i, "I ")
    .replace(/^As a pattern,\s+I\s+/i, "I ")
    .replace(/^Given the situation,\s+I\s+/i, "I ")
    .replace(/^In this scenario,\s+I\s+/i, "I ")
    .replace(/^My likely response is to\s+/i, "I ")
    .replace(/^My first response is to\s+/i, "I ")
    .replace(/^When the situation turns,\s+I feel pulled to\s+/i, "I ")
    .replace(/^In that moment,\s+I\s+/i, "I ")
    .replace(/^When stressed,\s+I usually\s+/i, "I ")
    .replace(/^When stressed,\s+I\s+/i, "I ")
    .replace(/^Under stress,\s+I\s+/i, "I ")
    .replace(/^In tense moments,\s+I immediately\s+/i, "I ")
    .replace(/^In high tension,\s+I\s+/i, "I ")
    .replace(/^During friction,\s+I tend to\s+/i, "I ")
    .replace(/^My stress response is to\s+/i, "I ")
    .replace(/^My conflict regulation move is to\s+/i, "I ")
    .replace(/^When conflict heats up,\s+I quickly\s+/i, "I ")
    .replace(/^To grow,\s+I want to\s+/i, "I want to ")
    .replace(/^To mature this pattern,\s+I aim to\s+/i, "I aim to ")
    .replace(/^My next growth strategy is to\s+/i, "I want to ")
    .replace(/^My growth edge is learning to\s+/i, "I am learning to ")
    .replace(/^Under pressure,\s+I use\s+(.+?)\s+as my regulating step\s+/i, "I $1 ")
    .replace(/^In conflict,\s+I emotionally default to\s+/i, "I ")
    .replace(/^When tension spikes,\s+I feel myself\s+/i, "I ")
    .replace(/^I respond by trying to\s+/i, "I ")
    .replace(/^I quickly respond by\s+/i, "I ")
    .replace(/^I react fast by\s+/i, "I ")
    .replace(/^I repeatedly\s+/i, "I ")
    .replace(/^I am intentionally building the habit to\s+/i, "I am practicing ")
    .replace(/^I am intentionally building\s+/i, "I am practicing ");
}

function normalizeQualityPhrasing(text) {
  let normalized = text
    .replace(/\bbecause it works for me\b/gi, "")
    .replace(/\brespond by\s+trying to\b/gi, "")
    .replace(/\brespond by\s+([a-z]+)/gi, "$1")
    .replace(/\brespond by verify\b/gi, "verify")
    .replace(/\bI rely on\s+([a-z][a-z\s-]*)\s+when\b/i, "I use $1 when")
    .replace(/\bdialogue builds connection\b/gi, "talking helps us reconnect")
    .replace(/\bactions carry more weight\b/gi, "consistent actions matter more to me")
    .replace(/\barticulation creates trust\b/gi, "clear words help me trust")
    .replace(/\bspace keeps you regulated\b/gi, "space helps me reset")
    .replace(/\bemotional bandwidth\b/gi, "emotional energy")
    .replace(/\bnervous-system\b/gi, "body stress")
    .replace(/\bhealing\b/gi, "recovery")
    .replace(/\boptimization\b/gi, "improvement")
    .replace(/\bwhile\b/gi, "during");

  const whenMatches = normalized.match(/\bwhen\b/gi) || [];
  if (whenMatches.length > 1) {
    let seen = 0;
    normalized = normalized.replace(/\bwhen\b/gi, (match) => {
      seen += 1;
      return seen > 1 ? "as" : match;
    });
  }

  normalized = normalized.replace(/\bif\b/gi, "because");
  normalized = normalized.replace(/\s+,/g, ",");
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

function applyToneCue(text, tone) {
  if (tone === "energetic" && !/\bquickly|immediately|actively|jump|fast\b/i.test(text)) {
    return text.replace(/^I\s+/i, "I quickly ");
  }
  return text;
}

function buildOptionVariant({ blueprint, ob, idx, optionIndex, tone }) {
  const rand = seededRandom(`${blueprint.questionId}:${idx}:${optionIndex}:${ob.primary}`);
  const expressionLibrary = ARCHETYPE_EXPRESSIONS[ob.primary] || ARCHETYPE_EXPRESSIONS.EC;
  const expression = expressionLibrary[Math.floor(rand() * expressionLibrary.length) % expressionLibrary.length];
  const classSchemas = CLASS_TONE_SCHEMAS[blueprint.questionClass] || CLASS_TONE_SCHEMAS.BH;
  const toneTemplates = classSchemas[tone] || classSchemas.neutral;
  const template = toneTemplates[Math.floor(rand() * toneTemplates.length) % toneTemplates.length];
  const scenarioOptions = DOMAIN_FRAGMENTS[blueprint.scenarioDomain] || [];
  const scenarioPhrase = scenarioOptions.length
    ? choose(scenarioOptions, idx + optionIndex + blueprint.questionId.length)
    : "in relationship moments";
  const signalOptions = SIGNAL_PHRASES[ob.signal] || [`when ${ob.signal}`, `if ${ob.signal}`];
  const signalPhrase = choose(signalOptions, idx + optionIndex);
  const rawText = buildOptionText({ template, expression, scenarioPhrase, signalPhrase });
  const normalizedText = applyToneCue(normalizeQualityPhrasing(normalizeSpeechLead(rawText)), tone);
  const text = toSentenceCase(normalizedText);

  return {
    optionId: String.fromCharCode(65 + optionIndex),
    text,
    primary: ob.primary,
    secondary: ob.secondary,
    signalType: ob.signal.replace(/\s+/g, "_").toLowerCase(),
    desirabilityScoreEstimate: null,
    signalProfileName: SIGNAL_LIBRARY[ob.primary].name,
    expression,
    tone,
  };
}

function hasParallelStructure(options) {
  const starts = options.map((opt) => similaritySignature(opt.text));
  return new Set(starts).size < options.length;
}

function optionAppearsMoreCorrect(options) {
  const withSuperlatives = options.map((opt) => SUPERLATIVE_TOKENS.some((token) => opt.text.toLowerCase().includes(token)));
  return withSuperlatives.filter(Boolean).length === 1;
}

function validateOptionDiversity(optionVariants) {
  const failures = [];
  const expressionSet = new Set(optionVariants.map((o) => inferExpressionSignature(o)));
  if (expressionSet.size !== optionVariants.length) failures.push("expressions_repeat_within_question");

  const tones = new Set(optionVariants.map((o) => o.tone || inferTone(o.text)));
  if (tones.size === 1) failures.push("tone_identical_across_options");

  if (hasParallelStructure(optionVariants)) failures.push("similar_wording_structure");
  if (optionAppearsMoreCorrect(optionVariants)) failures.push("one_option_sounds_more_correct");

  return failures;
}

function generateCandidatesForBlueprint(blueprint) {
  const promptVariants = PROMPT_TEMPLATES[blueprint.questionClass] || PROMPT_TEMPLATES.BH;

  return promptVariants.map((_, idx) => {
    const tones = shuffle(TONES, seededRandom(`${blueprint.questionId}:tones:${idx}`));
    const optionVariants = blueprint.optionBlueprints.map((ob, optionIndex) => buildOptionVariant({
      blueprint,
      ob,
      idx,
      optionIndex,
      tone: tones[optionIndex % tones.length],
    }));

    const diversityFailures = validateOptionDiversity(optionVariants);
    if (diversityFailures.length) return null;

    return {
      questionId: blueprint.questionId,
      bankId: blueprint.bankId,
      questionClass: blueprint.questionClass,
      prompt: buildPrompt(blueprint, idx),
      optionVariants,
      sourceBlueprintId: blueprint.questionId,
    };
  }).filter(Boolean);
}

function generateCandidatePool(blueprints) {
  return blueprints.map((bp) => {
    const candidates = generateCandidatesForBlueprint(bp);
    if (!candidates.length) {
      throw new Error(`No valid candidates generated for ${bp.questionId}; option diversity validation rejected all variants`);
    }
    return {
      blueprint: bp,
      candidates,
    };
  });
}

module.exports = { generateCandidatesForBlueprint, generateCandidatePool, validateOptionDiversity };
