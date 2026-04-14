"use strict";

const ENGINE = "loyalty";
const BANK_ID = "AUTHORED_BANK_1";
const SIGNAL_BY_CODE = Object.freeze({
  TD: "trust_assurance",
  SA: "value_satisfaction",
  ECM: "emotional_bonding",
  CH: "habit_convenience",
  SF: "switching_barrier",
});
const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });

function option(optionId, text, primary, secondary, questionClass) {
  return {
    option_id: optionId,
    text,
    primary_archetype: primary,
    secondary_archetype: secondary,
    weight_type: WEIGHT_BY_CLASS[questionClass],
    signal_type: SIGNAL_BY_CODE[primary],
  };
}

function question(displayOrder, questionClass, questionSubclass, prompt, options) {
  const n = String(displayOrder).padStart(2, "0");
  return {
    question_id: `Q${n}`,
    bank_id: BANK_ID,
    display_order: displayOrder,
    engine: ENGINE,
    question_class: questionClass,
    question_subclass: questionSubclass,
    prompt,
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options,
  };
}

module.exports = Object.freeze([
  question(1, "ID", "trust_anchor", "When you stay loyal to a brand, what matters most first?", [
    option("A", "I trust them to do what they promise consistently.", "TD", "SA", "ID"),
    option("B", "I stay because quality and outcomes stay high.", "SA", "TD", "ID"),
    option("C", "I feel emotionally connected to what they stand for.", "ECM", "TD", "ID"),
    option("D", "I stay because it is embedded in my routine.", "CH", "SF", "ID"),
  ]),
  question(2, "BH", "satisfaction_anchor", "In normal usage, what most keeps you coming back?", [
    option("A", "Reliable delivery that reinforces trust.", "TD", "SA", "BH"),
    option("B", "Consistent value for the price paid.", "SA", "TD", "BH"),
    option("C", "Feeling recognized and emotionally understood.", "ECM", "SA", "BH"),
    option("D", "Ease, speed, and low effort every time.", "CH", "SA", "BH"),
  ]),
  question(3, "SC", "disruption_response", "A competitor offers a lower price. What is your first thought?", [
    option("A", "Price matters less if I trust my current provider.", "TD", "SF", "SC"),
    option("B", "I compare value and results before deciding.", "SA", "TD", "SC"),
    option("C", "I hesitate to switch if I feel emotionally attached.", "ECM", "CH", "SC"),
    option("D", "I might stay because switching feels like a hassle.", "SF", "CH", "SC"),
  ]),
  question(4, "ST", "disruption_response", "When service quality drops suddenly, stress pushes you to:", [
    option("A", "Question whether trust has been broken.", "TD", "SA", "ST"),
    option("B", "Recalculate whether value still justifies loyalty.", "SA", "TD", "ST"),
    option("C", "Feel disappointed because the relationship feels weaker.", "ECM", "TD", "ST"),
    option("D", "Delay action while deciding if switching is worth it.", "SF", "CH", "ST"),
  ]),
  question(5, "BH", "emotional_bond", "What signal most strengthens your loyalty over time?", [
    option("A", "Honesty and follow-through during difficult moments.", "TD", "ECM", "BH"),
    option("B", "Reliable satisfaction without constant monitoring.", "SA", "TD", "BH"),
    option("C", "A sense of shared identity and belonging.", "ECM", "TD", "BH"),
    option("D", "A familiar routine that keeps things simple.", "CH", "SF", "BH"),
  ]),
  question(6, "ID", "routine_habit", "Which loyalty rhythm fits you best?", [
    option("A", "I stay with brands that consistently earn my trust.", "TD", "SA", "ID"),
    option("B", "I stay with brands that keep delivering clear value.", "SA", "TD", "ID"),
    option("C", "I stay where I feel emotionally connected.", "ECM", "CH", "ID"),
    option("D", "I stay with what is easiest to keep using.", "CH", "SF", "ID"),
  ]),
  question(7, "SC", "switching_friction", "A renewal decision is due. What weighs most for you?", [
    option("A", "Whether I still trust them with important outcomes.", "TD", "SA", "SC"),
    option("B", "Whether benefits clearly beat alternatives.", "SA", "TD", "SC"),
    option("C", "Whether the relationship still feels meaningful.", "ECM", "TD", "SC"),
    option("D", "Whether switching costs feel too high right now.", "SF", "CH", "SC"),
  ]),
  question(8, "ST", "trust_anchor", "After a communication mistake, what happens first internally?", [
    option("A", "I check if credibility has been damaged.", "TD", "ECM", "ST"),
    option("B", "I evaluate whether value is still acceptable.", "SA", "TD", "ST"),
    option("C", "I feel relational distance from the brand.", "ECM", "TD", "ST"),
    option("D", "I postpone changing because inertia is strong.", "CH", "SF", "ST"),
  ]),
  question(9, "BH", "routine_habit", "Across a normal month, what best predicts repeat behavior for you?", [
    option("A", "Trust built by consistent delivery.", "TD", "SA", "BH"),
    option("B", "Satisfaction built by dependable outcomes.", "SA", "TD", "BH"),
    option("C", "Emotional resonance with the brand story.", "ECM", "SA", "BH"),
    option("D", "Convenience embedded into my routine.", "CH", "SF", "BH"),
  ]),
  question(10, "SC", "disruption_response", "Your preferred option is temporarily unavailable. What do you do first?", [
    option("A", "Wait briefly if trust in recovery is high.", "TD", "SF", "SC"),
    option("B", "Compare alternatives based on expected value.", "SA", "TD", "SC"),
    option("C", "Stay patient because the relationship matters.", "ECM", "TD", "SC"),
    option("D", "Stick with nearest substitute for convenience.", "CH", "SA", "SC"),
  ]),
  question(11, "ID", "emotional_bond", "When loyalty is healthiest for you, what is true?", [
    option("A", "Trust and reliability feel unmistakable.", "TD", "SA", "ID"),
    option("B", "Value remains consistently worth it.", "SA", "TD", "ID"),
    option("C", "There is a meaningful emotional connection.", "ECM", "TD", "ID"),
    option("D", "The relationship is effortless to maintain.", "CH", "SF", "ID"),
  ]),
  question(12, "BH", "satisfaction_anchor", "If a friend asks why you stay loyal, what do you usually say?", [
    option("A", "They are trustworthy when it counts.", "TD", "ECM", "BH"),
    option("B", "They consistently deliver what I need.", "SA", "TD", "BH"),
    option("C", "I feel connected to who they are.", "ECM", "SA", "BH"),
    option("D", "It is easy and familiar to keep using them.", "CH", "SF", "BH"),
  ]),
  question(13, "SC", "switching_friction", "A competitor is slightly better but switching takes effort. You tend to:", [
    option("A", "Stay if trust in current provider remains strong.", "TD", "SF", "SC"),
    option("B", "Switch only if value gap is clearly material.", "SA", "SF", "SC"),
    option("C", "Delay switching because emotional tie still matters.", "ECM", "SF", "SC"),
    option("D", "Stay because friction outweighs the upside.", "SF", "CH", "SC"),
  ]),
  question(14, "ST", "routine_habit", "When choices become overwhelming, stress pushes you to:", [
    option("A", "Default to whoever has earned trust.", "TD", "CH", "ST"),
    option("B", "Default to whichever option feels most reliable in value.", "SA", "CH", "ST"),
    option("C", "Default to the brand that feels most familiar emotionally.", "ECM", "CH", "ST"),
    option("D", "Default to what is already set up and hardest to change.", "SF", "CH", "ST"),
  ]),
  question(15, "BH", "trust_anchor", "How do brands most often keep your loyalty?", [
    option("A", "By being transparent and dependable repeatedly.", "TD", "SA", "BH"),
    option("B", "By maintaining quality and practical usefulness.", "SA", "TD", "BH"),
    option("C", "By creating belonging, not just transactions.", "ECM", "TD", "BH"),
    option("D", "By making continuation easier than reconsideration.", "CH", "SF", "BH"),
  ]),
  question(16, "SC", "loyalty_growth", "You need to choose one long-term provider. What do you prioritize first?", [
    option("A", "Proven trustworthiness over time.", "TD", "SF", "SC"),
    option("B", "Sustained value across changing needs.", "SA", "TD", "SC"),
    option("C", "Emotional fit with your identity and values.", "ECM", "TD", "SC"),
    option("D", "Smooth onboarding and low switching burden.", "CH", "SF", "SC"),
  ]),
  question(17, "ST", "disruption_response", "If a brand lets you down twice, where do you go first?", [
    option("A", "I reassess whether trust can be repaired.", "TD", "SA", "ST"),
    option("B", "I reassess whether value still offsets risk.", "SA", "TD", "ST"),
    option("C", "I feel the emotional bond weaken quickly.", "ECM", "TD", "ST"),
    option("D", "I hesitate to switch unless friction drops.", "SF", "CH", "ST"),
  ]),
  question(18, "ID", "loyalty_growth", "Which statement sounds most like you?", [
    option("A", "I stay loyal when trust remains intact.", "TD", "SA", "ID"),
    option("B", "I stay loyal when satisfaction remains high.", "SA", "TD", "ID"),
    option("C", "I stay loyal when emotional connection remains strong.", "ECM", "TD", "ID"),
    option("D", "I stay loyal when switching feels unnecessary.", "SF", "CH", "ID"),
  ]),
  question(19, "SC", "trust_anchor", "A company admits a mistake and offers recovery. What matters most?", [
    option("A", "Whether actions rebuild credibility quickly.", "TD", "SA", "SC"),
    option("B", "Whether recovery restores practical value.", "SA", "TD", "SC"),
    option("C", "Whether response feels sincere and human.", "ECM", "TD", "SC"),
    option("D", "Whether recovery keeps effort low for me.", "CH", "SF", "SC"),
  ]),
  question(20, "ST", "switching_friction", "When your routine is disrupted, you are most likely to:", [
    option("A", "Seek a provider with stronger trust signals.", "TD", "CH", "ST"),
    option("B", "Seek a provider with clearer value proof.", "SA", "CH", "ST"),
    option("C", "Seek a provider that feels relationally aligned.", "ECM", "CH", "ST"),
    option("D", "Stay put unless switching becomes very easy.", "SF", "CH", "ST"),
  ]),
  question(21, "BH", "satisfaction_anchor", "What most increases renewal confidence for you?", [
    option("A", "Trust signals stay consistent quarter after quarter.", "TD", "SA", "BH"),
    option("B", "Value outcomes remain reliably strong.", "SA", "TD", "BH"),
    option("C", "The relationship still feels meaningful, not transactional.", "ECM", "SA", "BH"),
    option("D", "Continuity remains easy and low effort.", "CH", "SF", "BH"),
  ]),
  question(22, "SC", "loyalty_growth", "A long-standing habit no longer fits perfectly. What do you do?", [
    option("A", "Keep loyalty if trust remains high during adjustment.", "TD", "CH", "SC"),
    option("B", "Re-evaluate based on current value fit.", "SA", "TD", "SC"),
    option("C", "Stay if emotional connection still feels authentic.", "ECM", "TD", "SC"),
    option("D", "Maintain default unless an easy alternative appears.", "CH", "SF", "SC"),
  ]),
  question(23, "BH", "routine_habit", "When you recommend a brand, what are you usually recommending?", [
    option("A", "Their trustworthiness when stakes are high.", "TD", "SA", "BH"),
    option("B", "Their dependable quality and value delivery.", "SA", "TD", "BH"),
    option("C", "Their emotional fit and customer care.", "ECM", "TD", "BH"),
    option("D", "Their convenience and low-friction experience.", "CH", "SF", "BH"),
  ]),
  question(24, "DS", "loyalty_growth", "If you could strengthen one loyalty pattern now, what would it be?", [
    option("A", "Stay loyal based on trust, not just familiarity.", "TD", "CH", "DS"),
    option("B", "Track value more clearly before renewing.", "SA", "TD", "DS"),
    option("C", "Choose brands that align emotionally and practically.", "ECM", "SA", "DS"),
    option("D", "Reduce lock-in and choose from genuine preference.", "SF", "TD", "DS"),
  ]),
  question(25, "DS", "loyalty_growth", "What growth move matters most for your loyalty decisions next?", [
    option("A", "Reward consistent trust signals faster.", "TD", "SA", "DS"),
    option("B", "Balance satisfaction with periodic re-evaluation.", "SA", "TD", "DS"),
    option("C", "Keep emotional commitment grounded in real value.", "ECM", "SA", "DS"),
    option("D", "Avoid staying only because switching is hard.", "SF", "CH", "DS"),
  ]),
]);
