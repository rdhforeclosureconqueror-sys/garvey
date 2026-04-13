"use strict";

const ENGINE = "love";
const BANK_ID = "BANK_3";

const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });
const SIGNAL_BY_ARCHETYPE = Object.freeze({ RS: "closeness_seeking", AL: "distance_regulation", EC: "verbal_repair", AV: "proof_based_trust", ES: "novelty_activation" });

function option(optionId, text, primary, secondary, questionClass) {
  return { option_id: optionId, text, primary_archetype: primary, secondary_archetype: secondary, weight_type: WEIGHT_BY_CLASS[questionClass], signal_type: SIGNAL_BY_ARCHETYPE[primary] };
}

function makeQuestion(index, questionClass, questionSubclass, prompt, options) {
  const n = String(index).padStart(2, "0");
  return { question_id: `B3_Q${n}`, bank_id: BANK_ID, display_order: index, engine: ENGINE, question_class: questionClass, question_subclass: questionSubclass, prompt, reverse_pair_id: null, desired_pair_id: null, is_scored: true, is_active: true, options };
}

module.exports = Object.freeze([
  makeQuestion(1, "ST", "st_behavioral", "If I feel my partner pulling away:", [
    option("A", "I try to reconnect immediately.", "RS", "EC", "ST"), option("B", "I detach slightly too.", "AL", "AV", "ST"), option("C", "I analyze what changed and bring it up.", "EC", "RS", "ST"), option("D", "I distract myself and keep moving.", "AL", "ES", "ST"),
  ]),
  makeQuestion(2, "BH", "bh_behavioral", "When someone compliments me:", [
    option("A", "it reassures me deeply.", "RS", "EC", "BH"), option("B", "I appreciate it, but don’t rely on it.", "AL", "AV", "BH"), option("C", "I enjoy the emotional exchange.", "EC", "ES", "BH"), option("D", "I value it more if it matches actions.", "AV", "RS", "BH"),
  ]),
  makeQuestion(3, "ID", "id_behavioral", "Which is more important long-term?", [
    option("A", "emotional closeness.", "RS", "EC", "ID"), option("B", "personal freedom.", "AL", "ES", "ID"), option("C", "shared emotional language.", "EC", "RS", "ID"), option("D", "consistency and reliability.", "AV", "AL", "ID"),
  ]),
  makeQuestion(4, "BH", "bh_behavioral", "In past relationships, I’ve often:", [
    option("A", "needed reassurance.", "RS", "EC", "BH"), option("B", "felt overwhelmed by closeness.", "AL", "AV", "BH"), option("C", "focused heavily on communication.", "EC", "RS", "BH"), option("D", "valued actions over words.", "AV", "AL", "BH"),
  ]),
  makeQuestion(5, "ID", "id_behavioral", "I rarely need reassurance to feel secure.", [
    option("A", "strongly agree.", "AL", "AV", "ID"), option("B", "somewhat agree.", "AL", "ES", "ID"), option("C", "somewhat disagree.", "RS", "AV", "ID"), option("D", "strongly disagree.", "RS", "EC", "ID"),
  ]),
  makeQuestion(6, "ST", "st_behavioral", "If my partner says “I need space,” I usually:", [
    option("A", "worry and seek connection.", "RS", "EC", "ST"), option("B", "respect it and step back.", "AL", "AV", "ST"), option("C", "ask what exactly that means.", "EC", "RS", "ST"), option("D", "wait to see how they act next.", "AV", "AL", "ST"),
  ]),
  makeQuestion(7, "SC", "sc_behavioral", "Your partner gives you a heartfelt message but is late often. You:", [
    option("A", "value the emotion first.", "EC", "RS", "SC"), option("B", "keep your independence and expectations low.", "AL", "ES", "SC"), option("C", "want to discuss the mismatch.", "EC", "AV", "SC"), option("D", "care more about reliability than words.", "AV", "AL", "SC"),
  ]),
  makeQuestion(8, "BH", "bh_behavioral", "I feel most drawn to partners who are:", [
    option("A", "warm and emotionally attentive.", "RS", "EC", "BH"), option("B", "calm and self-contained.", "AL", "AV", "BH"), option("C", "expressive and engaging.", "EC", "ES", "BH"), option("D", "steady and reliable.", "AV", "AL", "BH"),
  ]),
  makeQuestion(9, "BH", "bh_behavioral", "When I miss someone, I usually:", [
    option("A", "reach out for connection.", "RS", "EC", "BH"), option("B", "sit with it privately.", "AL", "AV", "BH"), option("C", "send something expressive.", "EC", "RS", "BH"), option("D", "plan a dependable action.", "AV", "AL", "BH"),
  ]),
  makeQuestion(10, "SC", "sc_behavioral", "If your partner is quiet all evening:", [
    option("A", "I feel insecure and check in.", "RS", "EC", "SC"), option("B", "I let them be.", "AL", "AV", "SC"), option("C", "I ask what’s going on.", "EC", "RS", "SC"), option("D", "I watch whether this becomes a pattern.", "AV", "AL", "SC"),
  ]),
  makeQuestion(11, "ID", "id_behavioral", "My ideal relationship has:", [
    option("A", "a lot of closeness.", "RS", "EC", "ID"), option("B", "room for individuality.", "AL", "ES", "ID"), option("C", "open emotional discussion.", "EC", "RS", "ID"), option("D", "practical dependability.", "AV", "AL", "ID"),
  ]),
  makeQuestion(12, "ST", "st_behavioral", "When I feel rejected, I’m most likely to:", [
    option("A", "intensify closeness-seeking.", "RS", "EC", "ST"), option("B", "protect myself by shutting down.", "AL", "AV", "ST"), option("C", "seek verbal explanation.", "EC", "RS", "ST"), option("D", "re-evaluate trust based on behavior.", "AV", "AL", "ST"),
  ]),
  makeQuestion(13, "BH", "bh_behavioral", "I show commitment mostly by:", [
    option("A", "staying emotionally available.", "RS", "EC", "BH"), option("B", "respecting boundaries and space.", "AL", "ES", "BH"), option("C", "keeping communication open.", "EC", "RS", "BH"), option("D", "following through consistently.", "AV", "AL", "BH"),
  ]),
  makeQuestion(14, "SC", "sc_behavioral", "Your partner forgets to text back but shows up for you the next day. You:", [
    option("A", "still feel emotionally unsettled.", "RS", "EC", "SC"), option("B", "don’t make much of it.", "AL", "AV", "SC"), option("C", "want to mention the communication gap.", "EC", "RS", "SC"), option("D", "care more that they showed up.", "AV", "AL", "SC"),
  ]),
  makeQuestion(15, "ID", "id_behavioral", "Which type of reassurance matters most?", [
    option("A", "emotional closeness.", "RS", "EC", "ID"), option("B", "freedom without pressure.", "AL", "ES", "ID"), option("C", "clear words.", "EC", "RS", "ID"), option("D", "consistent behavior.", "AV", "AL", "ID"),
  ]),
  makeQuestion(16, "ST", "st_behavioral", "During uncertainty, I usually:", [
    option("A", "scan for emotional signs.", "RS", "EC", "ST"), option("B", "minimize dependence.", "AL", "AV", "ST"), option("C", "increase discussion.", "EC", "RS", "ST"), option("D", "focus on observable facts.", "AV", "AL", "ST"),
  ]),
  makeQuestion(17, "SC", "sc_behavioral", "Your partner proposes a spontaneous weekend away. You:", [
    option("A", "love the shared closeness.", "RS", "ES", "SC"), option("B", "want to make sure it doesn’t feel smothering.", "AL", "ES", "SC"), option("C", "enjoy the expressive energy.", "EC", "ES", "SC"), option("D", "need to know the plan is solid.", "AV", "AL", "SC"),
  ]),
  makeQuestion(18, "BH", "bh_behavioral", "I’m most likely to stay in a relationship when:", [
    option("A", "it feels emotionally secure.", "RS", "EC", "BH"), option("B", "it doesn’t cost me my independence.", "AL", "ES", "BH"), option("C", "it stays communicative and clear.", "EC", "RS", "BH"), option("D", "it remains reliable over time.", "AV", "AL", "BH"),
  ]),
  makeQuestion(19, "ST", "st_behavioral", "If my partner becomes distant after conflict:", [
    option("A", "I become more emotionally urgent.", "RS", "EC", "ST"), option("B", "I take even more space.", "AL", "AV", "ST"), option("C", "I push for conversation.", "EC", "RS", "ST"), option("D", "I wait for changed actions.", "AV", "AL", "ST"),
  ]),
  makeQuestion(20, "BH", "bh_behavioral", "I usually feel safest with someone who:", [
    option("A", "reassures me emotionally.", "RS", "EC", "BH"), option("B", "doesn’t pressure me.", "AL", "ES", "BH"), option("C", "talks clearly and honestly.", "EC", "RS", "BH"), option("D", "is steady and dependable.", "AV", "AL", "BH"),
  ]),
  makeQuestion(21, "DS", "ds_behavioral", "I want to become more balanced by:", [
    option("A", "regulating before reaching for reassurance.", "RS", "AV", "DS"), option("B", "staying emotionally present instead of withdrawing.", "AL", "RS", "DS"), option("C", "balancing talking with listening.", "EC", "AV", "DS"), option("D", "pairing consistency with emotional expression.", "AV", "EC", "DS"),
  ]),
  makeQuestion(22, "DS", "ds_behavioral", "The growth edge I most relate to is:", [
    option("A", "trusting without overchecking.", "RS", "AV", "DS"), option("B", "staying open under pressure.", "AL", "EC", "DS"), option("C", "speaking clearly without overexplaining.", "EC", "AV", "DS"), option("D", "expressing care verbally, not just practically.", "AV", "RS", "DS"),
  ]),
  makeQuestion(23, "DS", "ds_behavioral", "If I were more balanced in love, I would:", [
    option("A", "feel calmer during silence.", "RS", "AV", "DS"), option("B", "feel closer without losing myself.", "AL", "RS", "DS"), option("C", "communicate directly but lightly.", "EC", "ES", "DS"), option("D", "stay reliable while sharing more emotion.", "AV", "EC", "DS"),
  ]),
  makeQuestion(24, "ST", "st_behavioral", "When someone I love is upset with me:", [
    option("A", "I worry about losing connection.", "RS", "EC", "ST"), option("B", "I need distance to think.", "AL", "AV", "ST"), option("C", "I want to talk immediately.", "EC", "RS", "ST"), option("D", "I want to know what behavior needs to change.", "AV", "AL", "ST"),
  ]),
  makeQuestion(25, "ID", "id_behavioral", "The strongest relationship foundation is:", [
    option("A", "emotional security.", "RS", "EC", "ID"), option("B", "healthy autonomy.", "AL", "ES", "ID"), option("C", "honest communication.", "EC", "RS", "ID"), option("D", "steady trustworthiness.", "AV", "AL", "ID"),
  ]),
]);
