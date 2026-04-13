"use strict";

const ENGINE = "love";
const BANK_ID = "BANK_2";

const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });
const SIGNAL_BY_ARCHETYPE = Object.freeze({ RS: "closeness_seeking", AL: "distance_regulation", EC: "verbal_repair", AV: "proof_based_trust", ES: "novelty_activation" });

function option(optionId, text, primary, secondary, questionClass) {
  return { option_id: optionId, text, primary_archetype: primary, secondary_archetype: secondary, weight_type: WEIGHT_BY_CLASS[questionClass], signal_type: SIGNAL_BY_ARCHETYPE[primary] };
}

function makeQuestion(index, questionClass, questionSubclass, prompt, options) {
  const n = String(index).padStart(2, "0");
  return { question_id: `B2_Q${n}`, bank_id: BANK_ID, display_order: index, engine: ENGINE, question_class: questionClass, question_subclass: questionSubclass, prompt, reverse_pair_id: null, desired_pair_id: null, is_scored: true, is_active: true, options };
}

module.exports = Object.freeze([
  makeQuestion(1, "ID", "id_depth", "I rarely need reassurance to feel secure.", [
    option("A", "strongly agree.", "AL", "AV", "ID"), option("B", "somewhat agree.", "AL", "ES", "ID"), option("C", "somewhat disagree.", "RS", "AV", "ID"), option("D", "strongly disagree.", "RS", "EC", "ID"),
  ]),
  makeQuestion(2, "ST", "st_depth", "When communication slows down, I usually:", [
    option("A", "feel disconnected quickly.", "RS", "EC", "ST"), option("B", "don’t think much of it.", "AL", "AV", "ST"), option("C", "bring it up directly.", "EC", "RS", "ST"), option("D", "distract myself with other things.", "AL", "ES", "ST"),
  ]),
  makeQuestion(3, "ST", "st_depth", "When conflict gets intense, I tend to:", [
    option("A", "need reassurance and repair.", "RS", "EC", "ST"), option("B", "withdraw and regroup alone.", "AL", "AV", "ST"), option("C", "keep the conversation going.", "EC", "RS", "ST"), option("D", "wait for calm and actions.", "AV", "AL", "ST"),
  ]),
  makeQuestion(4, "ST", "st_depth", "If someone gets too emotionally close too quickly:", [
    option("A", "I feel reassured by it.", "RS", "EC", "ST"), option("B", "I feel pressure and distance myself.", "AL", "AV", "ST"), option("C", "I want to talk about expectations.", "EC", "AV", "ST"), option("D", "I prefer to slow it down through actions.", "AV", "AL", "ST"),
  ]),
  makeQuestion(5, "BH", "bh_depth", "After an argument, I am most likely to:", [
    option("A", "check if we’re still okay.", "RS", "EC", "BH"), option("B", "need a lot of space.", "AL", "AV", "BH"), option("C", "keep processing it verbally.", "EC", "RS", "BH"), option("D", "watch whether things improve behaviorally.", "AV", "AL", "BH"),
  ]),
  makeQuestion(6, "ID", "id_depth", "Which feels more natural to you?", [
    option("A", "emotional closeness.", "RS", "EC", "ID"), option("B", "self-reliance.", "AL", "AV", "ID"), option("C", "open dialogue.", "EC", "ES", "ID"), option("D", "steady reliability.", "AV", "AL", "ID"),
  ]),
  makeQuestion(7, "SC", "sc_depth", "Your partner says, “We need to talk later.” You:", [
    option("A", "worry something is wrong.", "RS", "EC", "SC"), option("B", "stay calm and wait.", "AL", "AV", "SC"), option("C", "ask for some context now.", "EC", "RS", "SC"), option("D", "decide to wait for facts, not fear.", "AV", "AL", "SC"),
  ]),
  makeQuestion(8, "SC", "sc_depth", "Your partner is loving but unpredictable. You:", [
    option("A", "keep hoping emotional closeness will stabilize it.", "RS", "EC", "SC"), option("B", "detach a bit and protect yourself.", "AL", "AV", "SC"), option("C", "try to clarify expectations verbally.", "EC", "AV", "SC"), option("D", "lose trust because consistency matters most.", "AV", "RS", "SC"),
  ]),
  makeQuestion(9, "BH", "bh_depth", "I usually feel loved most when:", [
    option("A", "someone checks in emotionally.", "RS", "EC", "BH"), option("B", "someone gives me room without pressure.", "AL", "ES", "BH"), option("C", "someone expresses themselves directly.", "EC", "RS", "BH"), option("D", "someone follows through reliably.", "AV", "AL", "BH"),
  ]),
  makeQuestion(10, "ID", "id_depth", "A strong relationship should be:", [
    option("A", "emotionally safe.", "RS", "EC", "ID"), option("B", "non-restrictive.", "AL", "ES", "ID"), option("C", "communicative.", "EC", "RS", "ID"), option("D", "dependable.", "AV", "AL", "ID"),
  ]),
  makeQuestion(11, "BH", "bh_depth", "When someone is inconsistent, I usually:", [
    option("A", "feel anxious and seek clarity.", "RS", "EC", "BH"), option("B", "step back and detach.", "AL", "AV", "BH"), option("C", "talk about the issue directly.", "EC", "RS", "BH"), option("D", "reduce trust until behavior changes.", "AV", "AL", "BH"),
  ]),
  makeQuestion(12, "SC", "sc_depth", "If your partner forgets an anniversary but apologizes sincerely:", [
    option("A", "the sincerity matters a lot to me.", "EC", "RS", "SC"), option("B", "I’d still need space to process.", "AL", "AV", "SC"), option("C", "I’d want to discuss what happened.", "EC", "AV", "SC"), option("D", "I’d care more about what they do next.", "AV", "AL", "SC"),
  ]),
  makeQuestion(13, "ID", "id_depth", "I’m most fulfilled by a relationship that is:", [
    option("A", "reassuring and emotionally connected.", "RS", "EC", "ID"), option("B", "calm and low-pressure.", "AL", "AV", "ID"), option("C", "expressive and engaging.", "EC", "ES", "ID"), option("D", "stable and practical.", "AV", "AL", "ID"),
  ]),
  makeQuestion(14, "BH", "bh_depth", "I tend to interpret silence as:", [
    option("A", "possible emotional distance.", "RS", "EC", "BH"), option("B", "normal and not alarming.", "AL", "AV", "BH"), option("C", "something worth discussing.", "EC", "RS", "BH"), option("D", "neutral unless behavior shifts.", "AV", "AL", "BH"),
  ]),
  makeQuestion(15, "ID", "id_depth", "Which matters most long-term?", [
    option("A", "feeling emotionally chosen.", "RS", "EC", "ID"), option("B", "preserving personal freedom.", "AL", "ES", "ID"), option("C", "verbal understanding.", "EC", "RS", "ID"), option("D", "consistent follow-through.", "AV", "AL", "ID"),
  ]),
  makeQuestion(16, "SC", "sc_depth", "On a trip together, your plans suddenly change. You:", [
    option("A", "care most about staying emotionally connected.", "RS", "EC", "SC"), option("B", "go with it and stay flexible.", "AL", "ES", "SC"), option("C", "want to talk through the new plan.", "EC", "AV", "SC"), option("D", "care that your partner handles it reliably.", "AV", "AL", "SC"),
  ]),
  makeQuestion(17, "ST", "st_depth", "If you feel ignored, you are more likely to:", [
    option("A", "reach harder for closeness.", "RS", "EC", "ST"), option("B", "emotionally shut down.", "AL", "AV", "ST"), option("C", "ask directly what’s going on.", "EC", "RS", "ST"), option("D", "pull back until actions make sense.", "AV", "AL", "ST"),
  ]),
  makeQuestion(18, "ST", "st_depth", "When someone demands more closeness than I’m ready for:", [
    option("A", "I try to meet it for reassurance.", "RS", "AV", "ST"), option("B", "I feel boxed in.", "AL", "ES", "ST"), option("C", "I try to talk through boundaries.", "EC", "AL", "ST"), option("D", "I respond by becoming more reserved.", "AV", "AL", "ST"),
  ]),
  makeQuestion(19, "BH", "bh_depth", "My affection is most often shown through:", [
    option("A", "emotional availability.", "RS", "EC", "BH"), option("B", "not crowding the other person.", "AL", "ES", "BH"), option("C", "words and discussion.", "EC", "RS", "BH"), option("D", "consistency and practical effort.", "AV", "AL", "BH"),
  ]),
  makeQuestion(20, "ID", "id_depth", "Which statement sounds most like you?", [
    option("A", "“I want to feel deeply connected.”", "RS", "EC", "ID"), option("B", "“I don’t want to lose myself.”", "AL", "ES", "ID"), option("C", "“I need things said clearly.”", "EC", "RS", "ID"), option("D", "“I believe what people do.”", "AV", "AL", "ID"),
  ]),
  makeQuestion(21, "DS", "ds_depth", "In relationships, I want to become someone who:", [
    option("A", "feels secure without constant reassurance.", "RS", "AV", "DS"), option("B", "can stay close without pulling away.", "AL", "EC", "DS"), option("C", "communicates clearly without over-processing.", "EC", "AV", "DS"), option("D", "values emotion as much as consistency.", "AV", "RS", "DS"),
  ]),
  makeQuestion(22, "DS", "ds_depth", "I want to improve by:", [
    option("A", "trusting connection more.", "RS", "EC", "DS"), option("B", "tolerating closeness better.", "AL", "RS", "DS"), option("C", "speaking more simply and directly.", "EC", "AV", "DS"), option("D", "becoming more emotionally expressive.", "AV", "EC", "DS"),
  ]),
  makeQuestion(23, "DS", "ds_depth", "The habit I most need is:", [
    option("A", "self-soothing before seeking reassurance.", "RS", "AV", "DS"), option("B", "staying present when intimacy rises.", "AL", "RS", "DS"), option("C", "listening before processing aloud.", "EC", "AV", "DS"), option("D", "naming feelings, not just actions.", "AV", "EC", "DS"),
  ]),
  makeQuestion(24, "ST", "st_depth", "When my partner needs more from me than usual:", [
    option("A", "I fear losing connection if I fail them.", "RS", "EC", "ST"), option("B", "I feel tempted to retreat.", "AL", "AV", "ST"), option("C", "I start asking a lot of clarifying questions.", "EC", "RS", "ST"), option("D", "I focus on what I can concretely do.", "AV", "AL", "ST"),
  ]),
  makeQuestion(25, "ID", "id_depth", "A healthy relationship feels like:", [
    option("A", "emotional safety.", "RS", "EC", "ID"), option("B", "breathable space.", "AL", "ES", "ID"), option("C", "honest dialogue.", "EC", "RS", "ID"), option("D", "dependable action.", "AV", "AL", "ID"),
  ]),
]);
