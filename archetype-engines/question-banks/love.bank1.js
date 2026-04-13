"use strict";

const ENGINE = "love";
const BANK_ID = "BANK_1";

const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });
const SIGNAL_BY_ARCHETYPE = Object.freeze({
  RS: "closeness_seeking",
  AL: "distance_regulation",
  EC: "verbal_repair",
  AV: "proof_based_trust",
  ES: "novelty_activation",
});

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

function makeQuestion(index, questionClass, questionSubclass, prompt, options) {
  const n = String(index).padStart(2, "0");
  return {
    question_id: `B1_Q${n}`,
    bank_id: BANK_ID,
    display_order: index,
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
  makeQuestion(1, "ST", "st_foundation", "When someone you care about becomes less responsive:", [
    option("A", "I assume something may be wrong.", "RS", "EC", "ST"),
    option("B", "I give them space and don’t overthink it.", "AL", "AV", "ST"),
    option("C", "I check in directly to understand.", "EC", "RS", "ST"),
    option("D", "I shift focus to other things.", "AL", "ES", "ST"),
  ]),
  makeQuestion(2, "BH", "bh_foundation", "I feel most secure in a relationship when:", [
    option("A", "communication is clear and regular.", "RS", "EC", "BH"),
    option("B", "both people keep healthy independence.", "AL", "AV", "BH"),
    option("C", "effort is consistent over time.", "AV", "RS", "BH"),
    option("D", "the relationship feels free and alive.", "ES", "AL", "BH"),
  ]),
  makeQuestion(3, "BH", "bh_foundation", "If I don’t hear from someone important to me:", [
    option("A", "I get uneasy pretty quickly.", "RS", "EC", "BH"),
    option("B", "I assume they’re busy.", "AL", "AV", "BH"),
    option("C", "I reach out and clarify.", "EC", "RS", "BH"),
    option("D", "I wait and redirect my attention.", "AL", "ES", "BH"),
  ]),
  makeQuestion(4, "ID", "id_foundation", "Emotional closeness feels:", [
    option("A", "deeply necessary to me.", "RS", "EC", "ID"),
    option("B", "good, but I still need a lot of space.", "AL", "AV", "ID"),
    option("C", "strongest when openly discussed.", "EC", "ES", "ID"),
    option("D", "less important than reliability.", "AV", "AL", "ID"),
  ]),
  makeQuestion(5, "BH", "bh_foundation", "When someone depends on me emotionally:", [
    option("A", "I feel connected and needed.", "RS", "EC", "BH"),
    option("B", "I feel pressure to protect my space.", "AL", "AV", "BH"),
    option("C", "I respond by talking it through.", "EC", "RS", "BH"),
    option("D", "I respond by being dependable.", "AV", "AL", "BH"),
  ]),
  makeQuestion(6, "ID", "id_foundation", "What matters more in love?", [
    option("A", "hearing how someone feels.", "EC", "RS", "ID"),
    option("B", "seeing what someone consistently does.", "AV", "AL", "ID"),
    option("C", "sharing emotional experiences.", "ES", "EC", "ID"),
    option("D", "seeing proof before trusting words.", "AV", "RS", "ID"),
  ]),
  makeQuestion(7, "SC", "sc_foundation", "If someone says “I love you” but acts inconsistently:", [
    option("A", "the words still matter to me.", "EC", "RS", "SC"),
    option("B", "the words mean little without action.", "AV", "AL", "SC"),
    option("C", "I’d want to talk through the mismatch.", "EC", "AV", "SC"),
    option("D", "I’d lose trust pretty fast.", "AV", "RS", "SC"),
  ]),
  makeQuestion(8, "BH", "bh_foundation", "I feel valued when:", [
    option("A", "someone clearly says it.", "EC", "RS", "BH"),
    option("B", "someone proves it through behavior.", "AV", "AL", "BH"),
    option("C", "we do meaningful things together.", "ES", "EC", "BH"),
    option("D", "they consistently show up.", "AV", "RS", "BH"),
  ]),
  makeQuestion(9, "ID", "id_foundation", "Communication in relationships should be:", [
    option("A", "frequent and emotionally open.", "EC", "RS", "ID"),
    option("B", "calm, light, and not excessive.", "AL", "AV", "ID"),
    option("C", "expressive and energizing.", "EC", "ES", "ID"),
    option("D", "backed up by behavior.", "AV", "AL", "ID"),
  ]),
  makeQuestion(10, "SC", "sc_foundation", "If someone forgets to say something important but shows it:", [
    option("A", "I still want to hear it.", "EC", "RS", "SC"),
    option("B", "the action is enough.", "AV", "AL", "SC"),
    option("C", "both matter equally.", "EC", "AV", "SC"),
    option("D", "actions matter more long-term.", "AV", "RS", "SC"),
  ]),
  makeQuestion(11, "ID", "id_foundation", "The best relationships feel:", [
    option("A", "emotionally deep.", "RS", "EC", "ID"),
    option("B", "stable and predictable.", "AV", "AL", "ID"),
    option("C", "exciting and evolving.", "ES", "EC", "ID"),
    option("D", "balanced between closeness and freedom.", "AL", "ES", "ID"),
  ]),
  makeQuestion(12, "BH", "bh_foundation", "Routine in relationships feels:", [
    option("A", "comforting.", "AV", "RS", "BH"),
    option("B", "helpful, but only in moderation.", "AL", "AV", "BH"),
    option("C", "boring after a while.", "ES", "EC", "BH"),
    option("D", "fine as long as there is room to breathe.", "AL", "ES", "BH"),
  ]),
  makeQuestion(13, "BH", "bh_foundation", "I feel closest when:", [
    option("A", "we talk deeply.", "EC", "RS", "BH"),
    option("B", "we consistently show up for each other.", "AV", "AL", "BH"),
    option("C", "we share memorable experiences.", "ES", "EC", "BH"),
    option("D", "we respect each other’s independence.", "AL", "ES", "BH"),
  ]),
  makeQuestion(14, "ID", "id_foundation", "Spontaneity in relationships:", [
    option("A", "strengthens emotional connection.", "ES", "EC", "ID"),
    option("B", "is less important than stability.", "AV", "AL", "ID"),
    option("C", "is nice but not essential.", "AL", "AV", "ID"),
    option("D", "helps me feel emotionally reassured.", "RS", "ES", "ID"),
  ]),
  makeQuestion(15, "ID", "id_foundation", "Long-term love should prioritize:", [
    option("A", "emotional connection.", "RS", "EC", "ID"),
    option("B", "stability and trust.", "AV", "AL", "ID"),
    option("C", "growth and shared experiences.", "ES", "EC", "ID"),
    option("D", "autonomy with connection.", "AL", "ES", "ID"),
  ]),
  makeQuestion(16, "SC", "sc_foundation", "Your partner plans a surprise date:", [
    option("A", "I value the emotional intention most.", "RS", "EC", "SC"),
    option("B", "I appreciate the effort.", "AV", "AL", "SC"),
    option("C", "I enjoy the experience itself most.", "ES", "EC", "SC"),
    option("D", "I like it, but don’t need it.", "AL", "AV", "SC"),
  ]),
  makeQuestion(17, "ST", "st_foundation", "Your partner cancels plans last minute:", [
    option("A", "I feel emotionally disappointed.", "RS", "EC", "ST"),
    option("B", "I understand and move on.", "AL", "AV", "ST"),
    option("C", "I want to talk about it.", "EC", "RS", "ST"),
    option("D", "I focus on whether this is a pattern.", "AV", "AL", "ST"),
  ]),
  makeQuestion(18, "ST", "st_foundation", "During conflict I tend to:", [
    option("A", "seek reassurance quickly.", "RS", "EC", "ST"),
    option("B", "step back to process on my own.", "AL", "AV", "ST"),
    option("C", "talk it through immediately.", "EC", "RS", "ST"),
    option("D", "wait to see changed behavior.", "AV", "AL", "ST"),
  ]),
  makeQuestion(19, "SC", "sc_foundation", "When reconnecting after distance:", [
    option("A", "I want emotional closeness first.", "RS", "EC", "SC"),
    option("B", "I ease back in gradually.", "AL", "AV", "SC"),
    option("C", "I want to discuss everything.", "EC", "RS", "SC"),
    option("D", "I watch for consistency over time.", "AV", "AL", "SC"),
  ]),
  makeQuestion(20, "ST", "st_foundation", "If trust is broken:", [
    option("A", "I need reassurance.", "RS", "EC", "ST"),
    option("B", "I distance myself.", "AL", "AV", "ST"),
    option("C", "I need open conversation.", "EC", "RS", "ST"),
    option("D", "I look for sustained change.", "AV", "AL", "ST"),
  ]),
  makeQuestion(21, "ID", "id_foundation", "Which feels worse?", [
    option("A", "not feeling emotionally secure.", "RS", "EC", "ID"),
    option("B", "losing independence.", "AL", "ES", "ID"),
    option("C", "being misunderstood.", "EC", "RS", "ID"),
    option("D", "seeing inconsistency.", "AV", "AL", "ID"),
  ]),
  makeQuestion(22, "ID", "id_foundation", "I believe I am someone who:", [
    option("A", "needs emotional closeness.", "RS", "EC", "ID"),
    option("B", "values independence strongly.", "AL", "AV", "ID"),
    option("C", "communicates openly.", "EC", "ES", "ID"),
    option("D", "shows love through actions.", "AV", "AL", "ID"),
  ]),
  makeQuestion(23, "BH", "bh_foundation", "In reality, I often:", [
    option("A", "overthink emotional signals.", "RS", "EC", "BH"),
    option("B", "pull back when overwhelmed.", "AL", "AV", "BH"),
    option("C", "talk things through a lot.", "EC", "RS", "BH"),
    option("D", "focus more on actions than words.", "AV", "AL", "BH"),
  ]),
  makeQuestion(24, "BH", "bh_foundation", "I trust someone when:", [
    option("A", "they reassure me consistently.", "RS", "EC", "BH"),
    option("B", "they respect my boundaries.", "AL", "AV", "BH"),
    option("C", "they communicate clearly.", "EC", "RS", "BH"),
    option("D", "they behave consistently.", "AV", "AL", "BH"),
  ]),
  makeQuestion(25, "ID", "id_foundation", "Love, to me, is:", [
    option("A", "emotional connection.", "RS", "EC", "ID"),
    option("B", "freedom with trust.", "AL", "ES", "ID"),
    option("C", "expression and openness.", "EC", "RS", "ID"),
    option("D", "consistency and proof.", "AV", "AL", "ID"),
  ]),
]);
