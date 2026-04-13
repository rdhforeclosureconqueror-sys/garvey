"use strict";

const ENGINE = "love";
const BANK_ID = "BANK_3";

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
  const questionId = `B3_Q${n}`;
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
    "BH",
    "bh_core",
    "On ordinary days, I create connection by:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
    ]
  ),
  makeQuestion(
    2,
    "SC",
    "sc_core",
    "When schedules clash repeatedly, I:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
    ]
  ),
  makeQuestion(
    3,
    "ST",
    "st_core",
    "If conflict happens in public, I:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
    ]
  ),
  makeQuestion(
    4,
    "ID",
    "id_core",
    "I know I am loved when:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
    ]
  ),
  makeQuestion(
    5,
    "DS",
    "ds_core",
    "The relationship habit I most want to strengthen is:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
    ]
  ),
  makeQuestion(
    6,
    "BH",
    "bh_core",
    "When my partner succeeds, I usually:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
    ]
  ),
  makeQuestion(
    7,
    "SC",
    "sc_core",
    "If intimacy feels routine, I:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
    ]
  ),
  makeQuestion(
    8,
    "ST",
    "st_core",
    "During uncertainty, I seek steadiness through:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
    ]
  ),
  makeQuestion(
    9,
    "ID",
    "id_core",
    "My strongest relational value is:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
    ]
  ),
  makeQuestion(
    10,
    "DS",
    "ds_core",
    "I want our stress responses to become:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
    ]
  ),
  makeQuestion(
    11,
    "BH",
    "bh_core",
    "When expectations are unclear, I:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
    ]
  ),
  makeQuestion(
    12,
    "SC",
    "sc_core",
    "If one of us shuts down, I:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
    ]
  ),
  makeQuestion(
    13,
    "ST",
    "st_core",
    "When I feel lonely inside the relationship, I:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
    ]
  ),
  makeQuestion(
    14,
    "ID",
    "id_core",
    "I naturally contribute love by:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
    ]
  ),
  makeQuestion(
    15,
    "DS",
    "ds_core",
    "I want to be better at receiving:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
    ]
  ),
  makeQuestion(
    16,
    "BH",
    "bh_core",
    "When repair is needed, I usually begin with:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
    ]
  ),
  makeQuestion(
    17,
    "SC",
    "sc_core",
    "If family pressure affects us, I:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
    ]
  ),
  makeQuestion(
    18,
    "ST",
    "st_core",
    "When I sense distance growing, I:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
    ]
  ),
  makeQuestion(
    19,
    "ID",
    "id_core",
    "I protect the relationship most by:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
    ]
  ),
  makeQuestion(
    20,
    "DS",
    "ds_core",
    "A thriving partnership for me includes:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
    ]
  ),
  makeQuestion(
    21,
    "BH",
    "bh_core",
    "When we are both tired, I:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "BH"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "BH"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "BH"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "BH"),
    ]
  ),
  makeQuestion(
    22,
    "SC",
    "sc_core",
    "If we have different conflict tempos, I:",
    [
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "SC"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "SC"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "SC"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "SC"),
    ]
  ),
  makeQuestion(
    23,
    "ST",
    "st_core",
    "When trust is rebuilding, I:",
    [
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ST"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ST"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ST"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ST"),
    ]
  ),
  makeQuestion(
    24,
    "ID",
    "id_core",
    "My attachment under stress tends toward:",
    [
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "ID"),
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "ID"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "ID"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "ID"),
    ]
  ),
  makeQuestion(
    25,
    "DS",
    "ds_core",
    "In the future, I want us to be known for:",
    [
      option("A", "I move toward emotional closeness and check in quickly.", "RS", "EC", "DS"),
      option("B", "I keep space first and regulate before reconnecting.", "AL", "AV", "DS"),
      option("C", "I name feelings directly and open a repair conversation.", "EC", "RS", "DS"),
      option("D", "I look for consistent actions before trusting the moment.", "AV", "AL", "DS"),
    ]
  ),
]);
