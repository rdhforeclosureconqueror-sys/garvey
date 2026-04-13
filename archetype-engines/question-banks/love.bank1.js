"use strict";

const ENGINE = "love";
const BANK_ID = "BANK_1";

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
  const questionId = `B1_Q${n}`;
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
    "ST",
    "st_core",
    "When someone you care about becomes less responsive:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
    ]
  ),
  makeQuestion(
    2,
    "ID",
    "id_core",
    "In love, my default way of feeling secure is:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
    ]
  ),
  makeQuestion(
    3,
    "BH",
    "bh_core",
    "When conflict starts, I usually:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
    ]
  ),
  makeQuestion(
    4,
    "SC",
    "sc_core",
    "After a hard week, connection feels strongest when:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
    ]
  ),
  makeQuestion(
    5,
    "DS",
    "ds_core",
    "In my ideal relationship, reassurance is:",
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
    "I feel most bonded when my partner:",
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
    "If plans suddenly change, I tend to:",
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
    "During a misunderstanding over text, I usually:",
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
    "When I feel emotionally flooded, I:",
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
    "I want our communication style to include:",
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
    "Trust grows for me primarily through:",
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
    "When my partner needs space, I typically:",
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
    "If we have different social energy, I:",
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
    "When I fear disconnection, I am most likely to:",
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
    "In the long run, I want love to feel:",
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
    "My first instinct after conflict is to:",
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
    "I show care most consistently by:",
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
    "On an important decision, I prefer we:",
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
    "Under pressure, my relational pattern is to:",
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
    "I most want a partner who:",
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
    "I interpret silence from someone I love as:",
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
    "When affection styles differ, I:",
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
    "If one of us feels unseen, I believe we should:",
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
    "When trust feels shaky, I usually:",
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
    "Our healthiest rhythm would be:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
    ]
  ),
]);
