"use strict";

const ENGINE = "love";
const BANK_ID = "BANK_2";

const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });

function option(optionId, text, primary, secondary, questionClass) {
  return {
    option_id: optionId,
    text,
    primary_archetype: primary,
    secondary_archetype: secondary,
    weight_type: WEIGHT_BY_CLASS[questionClass],
    signal_type: questionClass,
  };
}

function makeQuestion(index, questionClass, questionSubclass, prompt, options) {
  const n = String(index).padStart(2, "0");
  const questionId = `B2_Q${n}`;
  return {
    question_id: questionId,
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
  makeQuestion(
    1,
    "ID",
    "id_core",
    "Two things can be true in love: closeness matters and:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
    ]
  ),
  makeQuestion(
    2,
    "BH",
    "bh_core",
    "When I say I am fine but I am not, I usually:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
    ]
  ),
  makeQuestion(
    3,
    "SC",
    "sc_core",
    "If my partner apologizes but repeats the behavior, I:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
    ]
  ),
  makeQuestion(
    4,
    "ST",
    "st_core",
    "When intimacy rises quickly, I may:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
    ]
  ),
  makeQuestion(
    5,
    "DS",
    "ds_core",
    "I want to be known for this in relationships:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
    ]
  ),
  makeQuestion(
    6,
    "ID",
    "id_core",
    "I believe emotional safety is built by:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
    ]
  ),
  makeQuestion(
    7,
    "BH",
    "bh_core",
    "I test trust—intentionally or not—by:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
    ]
  ),
  makeQuestion(
    8,
    "SC",
    "sc_core",
    "If we disagree about boundaries, I:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
    ]
  ),
  makeQuestion(
    9,
    "ST",
    "st_core",
    "When I feel criticized, my first move is to:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
    ]
  ),
  makeQuestion(
    10,
    "DS",
    "ds_core",
    "A deeper relationship for me includes:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
    ]
  ),
  makeQuestion(
    11,
    "ID",
    "id_core",
    "I carry this contradiction in love:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
    ]
  ),
  makeQuestion(
    12,
    "BH",
    "bh_core",
    "When I miss someone, I usually:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
    ]
  ),
  makeQuestion(
    13,
    "SC",
    "sc_core",
    "If repair is taking too long, I:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
    ]
  ),
  makeQuestion(
    14,
    "ST",
    "st_core",
    "When old wounds are triggered, I tend to:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
    ]
  ),
  makeQuestion(
    15,
    "DS",
    "ds_core",
    "I want conflict to leave us:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
    ]
  ),
  makeQuestion(
    16,
    "ID",
    "id_core",
    "Commitment means, to me:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
    ]
  ),
  makeQuestion(
    17,
    "BH",
    "bh_core",
    "When I need reassurance, I am most likely to:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
    ]
  ),
  makeQuestion(
    18,
    "SC",
    "sc_core",
    "If my partner processes slower than me, I:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
    ]
  ),
  makeQuestion(
    19,
    "ST",
    "st_core",
    "When I feel misunderstood, I often:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
    ]
  ),
  makeQuestion(
    20,
    "DS",
    "ds_core",
    "I most want to practice this growth edge:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
    ]
  ),
  makeQuestion(
    21,
    "ID",
    "id_core",
    "I define loyalty in love as:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
    ]
  ),
  makeQuestion(
    22,
    "BH",
    "bh_core",
    "In hard conversations, I usually emphasize:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
    ]
  ),
  makeQuestion(
    23,
    "SC",
    "sc_core",
    "If stress is external but tension is internal, I:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
    ]
  ),
  makeQuestion(
    24,
    "ST",
    "st_core",
    "When I think abandonment might happen, I:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
    ]
  ),
  makeQuestion(
    25,
    "DS",
    "ds_core",
    "I want our relationship to be a place where:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
    ]
  ),
]);
