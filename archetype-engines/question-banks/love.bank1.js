"use strict";

const ENGINE = "love";
const BANK_ID = "AUTHORED_BANK_1";
const SIGNAL_BY_ARCHETYPE = Object.freeze({
  RS: "closeness_seeking",
  AL: "distance_regulation",
  EC: "verbal_repair",
  AV: "proof_based_trust",
  ES: "novelty_activation",
});
const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });

function option(optionId, text, primary, secondary, questionClass) {
  return {
    option_id: optionId,
    text,
    primary_archetype: primary,
    secondary_archetype: secondary,
    weight_type: WEIGHT_BY_CLASS[questionClass],
    signal_type: SIGNAL_BY_ARCHETYPE[primary],
  };
}

function question(displayOrder, questionClass, prompt, options) {
  const n = String(displayOrder).padStart(2, "0");
  return {
    question_id: `Q${n}`,
    bank_id: BANK_ID,
    display_order: displayOrder,
    engine: ENGINE,
    question_class: questionClass,
    question_subclass: `${questionClass.toLowerCase()}_balanced`,
    prompt,
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options,
  };
}

module.exports = Object.freeze([
  question(1, "ID", "In love, what usually feels most natural to you?", [
    option("A", "I feel most settled when the bond feels emotionally secure.", "RS", "EC", "ID"),
    option("B", "I feel best when closeness leaves room for independence.", "AL", "ES", "ID"),
    option("C", "I feel closest when feelings can be talked through clearly.", "EC", "RS", "ID"),
    option("D", "I trust love most when it is backed by steady follow-through.", "AV", "AL", "ID"),
  ]),
  question(2, "BH", "When you care about someone, what do you usually do first to stay connected?", [
    option("A", "I check in quickly if something feels off between us.", "RS", "EC", "BH"),
    option("B", "I stay connected without needing constant contact.", "AL", "AV", "BH"),
    option("C", "I start a real conversation about how things are going.", "EC", "RS", "BH"),
    option("D", "I show up consistently and let my actions speak.", "AV", "AL", "BH"),
  ]),
  question(3, "SC", "Your partner gets quieter than usual for a day. What do you do?", [
    option("A", "I ask if we are okay because distance gets my attention fast.", "RS", "EC", "SC"),
    option("B", "I give them room and wait before reaching in.", "AL", "AV", "SC"),
    option("C", "I bring it up directly so we can clear the air.", "EC", "RS", "SC"),
    option("D", "I watch whether this is a one-time moment or a pattern.", "AV", "AL", "SC"),
  ]),
  question(4, "ST", "In conflict, what is your first stress reaction?", [
    option("A", "I want reassurance that the relationship is still safe.", "RS", "EC", "ST"),
    option("B", "I need a little distance before I can respond well.", "AL", "AV", "ST"),
    option("C", "I want to talk through it right away.", "EC", "RS", "ST"),
    option("D", "I need to see changed behavior before I fully relax.", "AV", "AL", "ST"),
  ]),
  question(5, "BH", "What usually makes you feel most loved over time?", [
    option("A", "Being emotionally checked on in a way that feels genuine.", "RS", "EC", "BH"),
    option("B", "Being trusted without feeling crowded or managed.", "AL", "ES", "BH"),
    option("C", "Being spoken to openly and honestly.", "EC", "RS", "BH"),
    option("D", "Seeing dependable effort again and again.", "AV", "AL", "BH"),
  ]),
  question(6, "ID", "Which kind of relationship rhythm fits you best?", [
    option("A", "Frequent emotional reassurance and clear closeness.", "RS", "EC", "ID"),
    option("B", "Steady connection with healthy space built in.", "AL", "AV", "ID"),
    option("C", "Open dialogue that keeps things emotionally clear.", "EC", "RS", "ID"),
    option("D", "Reliable action that builds trust over time.", "AV", "AL", "ID"),
  ]),
  question(7, "SC", "Your partner says something loving but forgets to follow through. What stands out most?", [
    option("A", "I feel uneasy and want to check what changed.", "RS", "EC", "SC"),
    option("B", "I step back and lower my expectations for a bit.", "AL", "AV", "SC"),
    option("C", "I want to talk about the mismatch directly.", "EC", "AV", "SC"),
    option("D", "I focus on the broken follow-through more than the words.", "AV", "RS", "SC"),
  ]),
  question(8, "ST", "When you feel emotionally unsure, what do you tend to do?", [
    option("A", "I reach for closeness so I know where we stand.", "RS", "EC", "ST"),
    option("B", "I pull inward and sort myself out privately.", "AL", "AV", "ST"),
    option("C", "I ask direct questions to get clarity.", "EC", "RS", "ST"),
    option("D", "I look harder at behavior to decide what is real.", "AV", "AL", "ST"),
  ]),
  question(9, "BH", "During ordinary weeks together, how do you usually keep the bond alive?", [
    option("A", "I check for emotional connection in small ways.", "RS", "EC", "BH"),
    option("B", "I make room for both closeness and breathing space.", "AL", "ES", "BH"),
    option("C", "I keep conversation moving so nothing important stays buried.", "EC", "RS", "BH"),
    option("D", "I stay dependable in practical ways that build trust.", "AV", "AL", "BH"),
  ]),
  question(10, "SC", "Plans change around something important you were looking forward to. What do you do first?", [
    option("A", "I need reassurance that we still matter.", "RS", "EC", "SC"),
    option("B", "I regroup quietly before deciding how I feel.", "AL", "AV", "SC"),
    option("C", "I talk it through so we both understand what happened.", "EC", "RS", "SC"),
    option("D", "I focus on whether the change was handled responsibly.", "AV", "AL", "SC"),
  ]),
  question(11, "ID", "What matters most to you when love is healthy?", [
    option("A", "Feeling chosen, safe, and emotionally secure.", "RS", "EC", "ID"),
    option("B", "Feeling connected without losing yourself.", "AL", "ES", "ID"),
    option("C", "Feeling understood through honest conversation.", "EC", "RS", "ID"),
    option("D", "Feeling able to trust what someone actually does.", "AV", "AL", "ID"),
  ]),
  question(12, "BH", "When your partner is under pressure, how do you usually respond?", [
    option("A", "I check in and make sure we are still okay.", "RS", "EC", "BH"),
    option("B", "I give support without pushing for too much closeness.", "AL", "AV", "BH"),
    option("C", "I ask what they are feeling and try to talk it through.", "EC", "RS", "BH"),
    option("D", "I look for concrete ways to help and follow through.", "AV", "AL", "BH"),
  ]),
  question(13, "SC", "After a rough conversation, what feels most natural to you?", [
    option("A", "I look for reassurance that the bond is still intact.", "RS", "EC", "SC"),
    option("B", "I take space first so I do not react too fast.", "AL", "AV", "SC"),
    option("C", "I circle back quickly to clear up misunderstanding.", "EC", "RS", "SC"),
    option("D", "I want repair to show up in behavior, not only words.", "AV", "AL", "SC"),
  ]),
  question(14, "ST", "When someone you love becomes inconsistent, what does stress push you toward?", [
    option("A", "I over-read distance and want immediate reassurance.", "RS", "EC", "ST"),
    option("B", "I detach and rely on myself more.", "AL", "AV", "ST"),
    option("C", "I press for clarity so things feel understandable again.", "EC", "RS", "ST"),
    option("D", "I become more watchful of promises and follow-through.", "AV", "AL", "ST"),
  ]),
  question(15, "BH", "How do you most often show commitment?", [
    option("A", "I stay emotionally available and responsive.", "RS", "EC", "BH"),
    option("B", "I respect boundaries and avoid crowding the relationship.", "AL", "ES", "BH"),
    option("C", "I keep communication open, even when it is uncomfortable.", "EC", "RS", "BH"),
    option("D", "I do what I said I would do.", "AV", "AL", "BH"),
  ]),
  question(16, "SC", "You are planning time together after a busy stretch. What are you most likely to do?", [
    option("A", "I check in about how we are feeling first.", "RS", "EC", "SC"),
    option("B", "I make space for connection without packing the schedule too tightly.", "AL", "ES", "SC"),
    option("C", "I talk through what kind of time would feel best for us.", "EC", "RS", "SC"),
    option("D", "I make a plan we can actually follow through on.", "AV", "AL", "SC"),
  ]),
  question(17, "ST", "When trust feels shaky, where do you go first?", [
    option("A", "I seek reassurance so the relationship feels steady again.", "RS", "EC", "ST"),
    option("B", "I slow down contact and protect my emotional space.", "AL", "AV", "ST"),
    option("C", "I ask direct questions until things make sense.", "EC", "RS", "ST"),
    option("D", "I look for consistent action before relaxing.", "AV", "AL", "ST"),
  ]),
  question(18, "ID", "Which statement sounds most like you?", [
    option("A", "I need to feel the bond is safe.", "RS", "EC", "ID"),
    option("B", "I need closeness that still leaves room to breathe.", "AL", "ES", "ID"),
    option("C", "I need love to be speakable and clear.", "EC", "RS", "ID"),
    option("D", "I need trust to be visible in behavior.", "AV", "AL", "ID"),
  ]),
  question(19, "SC", "Your partner says, “We should talk later.” What is your first internal move?", [
    option("A", "I wonder if something is wrong between us.", "RS", "EC", "SC"),
    option("B", "I stay calm and wait until the time comes.", "AL", "AV", "SC"),
    option("C", "I ask for a little context so I know what to expect.", "EC", "RS", "SC"),
    option("D", "I hold off judgment until I see what actually follows.", "AV", "AL", "SC"),
  ]),
  question(20, "ST", "When you feel ignored, what are you most likely to do?", [
    option("A", "I move toward the person and try to reconnect.", "RS", "EC", "ST"),
    option("B", "I pull back and act like I do not need much.", "AL", "AV", "ST"),
    option("C", "I say something directly about the disconnect.", "EC", "RS", "ST"),
    option("D", "I take note and start questioning reliability.", "AV", "AL", "ST"),
  ]),
  question(21, "BH", "What usually helps you trust someone deeply?", [
    option("A", "Feeling emotionally reassured in a steady way.", "RS", "EC", "BH"),
    option("B", "Seeing that they respect your space and autonomy.", "AL", "ES", "BH"),
    option("C", "Knowing you can talk honestly without guessing.", "EC", "RS", "BH"),
    option("D", "Watching their behavior stay consistent over time.", "AV", "AL", "BH"),
  ]),
  question(22, "SC", "A routine between you starts feeling flat. What do you naturally do?", [
    option("A", "I look for reassurance that we are still emotionally close.", "RS", "ES", "SC"),
    option("B", "I make a little more room so things do not feel tight.", "AL", "ES", "SC"),
    option("C", "I bring it up and talk about how to reconnect.", "EC", "ES", "SC"),
    option("D", "I focus on keeping the relationship stable and dependable.", "AV", "AL", "SC"),
  ]),
  question(23, "BH", "When you miss your partner, what are you most likely to do?", [
    option("A", "I reach out and look for emotional contact.", "RS", "EC", "BH"),
    option("B", "I sit with it quietly before making a move.", "AL", "AV", "BH"),
    option("C", "I send something that opens conversation.", "EC", "RS", "BH"),
    option("D", "I do something thoughtful that shows steadiness.", "AV", "AL", "BH"),
  ]),
  question(24, "DS", "If you could strengthen one love habit right now, what would it be?", [
    option("A", "Calming myself before asking for reassurance.", "RS", "AV", "DS"),
    option("B", "Staying open instead of pulling away too fast.", "AL", "RS", "DS"),
    option("C", "Speaking clearly without over-processing everything.", "EC", "AV", "DS"),
    option("D", "Pairing reliability with more visible emotional warmth.", "AV", "EC", "DS"),
  ]),
  question(25, "DS", "What growth move matters most to you now?", [
    option("A", "Feeling secure without over-checking the bond.", "RS", "AV", "DS"),
    option("B", "Staying close without feeling trapped by closeness.", "AL", "RS", "DS"),
    option("C", "Saying what I feel in a simpler, cleaner way.", "EC", "AV", "DS"),
    option("D", "Letting actions and tenderness work together more fully.", "AV", "EC", "DS"),
  ]),
]);
