"use strict";

const ENGINE = "loyalty";
const BANK_ID = "loyalty_bank2";

function option(id, text, primary, secondary, signalType) {
  return { id, text, primary, secondary, weightType: secondary ? "primary_secondary" : "primary_only", signalType };
}

module.exports = [
  {
    id: "loyal_b2_q1",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ST",
    prompt: "When disappointed, I still give the brand a fair chance to recover.",
    reversePairId: "loyal_b2_q2",
    options: [
      option("a", "Never", "CH", "SF", "ST"),
      option("b", "Sometimes", "SA", "CH", "ST"),
      option("c", "Often", "TD", "ECM", "ST"),
      option("d", "Always", "ECM", "TD", "ST"),
    ],
  },
  {
    id: "loyal_b2_q2",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ST",
    prompt: "Negative moments make me abandon a brand immediately.",
    reversePairId: "loyal_b2_q1",
    options: [
      option("a", "Never", "ECM", "TD", "ST"),
      option("b", "Sometimes", "TD", "SA", "ST"),
      option("c", "Often", "SF", "CH", "ST"),
      option("d", "Always", "SF", "SA", "ST"),
    ],
  },
  {
    id: "loyal_b2_q3",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "In my ideal relationship with a brand, emotional connection matters most.",
    reversePairId: "loyal_b2_q4",
    options: [
      option("a", "Not important", "CH", "SF", "DS"),
      option("b", "Somewhat important", "SA", "CH", "DS"),
      option("c", "Important", "ECM", "TD", "DS"),
      option("d", "Essential", "ECM", "SA", "DS"),
    ],
  },
  {
    id: "loyal_b2_q4",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "In my ideal relationship, transactional efficiency matters more than connection.",
    reversePairId: "loyal_b2_q3",
    options: [
      option("a", "Not important", "ECM", "TD", "DS"),
      option("b", "Somewhat important", "SA", "ECM", "DS"),
      option("c", "Important", "CH", "SF", "DS"),
      option("d", "Essential", "CH", "SA", "DS"),
    ],
  },
  {
    id: "loyal_b2_q5",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "I identify as someone who rewards consistent quality with long-term loyalty.",
    reversePairId: "loyal_b2_q6",
    options: [
      option("a", "Strongly disagree", "CH", "SF", "ID"),
      option("b", "Disagree", "SA", "CH", "ID"),
      option("c", "Agree", "TD", "ECM", "ID"),
      option("d", "Strongly agree", "TD", "SA", "ID"),
    ],
  },
  {
    id: "loyal_b2_q6",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "I identify as someone who switches quickly whenever a better deal appears.",
    reversePairId: "loyal_b2_q5",
    options: [
      option("a", "Strongly disagree", "TD", "ECM", "ID"),
      option("b", "Disagree", "SA", "TD", "ID"),
      option("c", "Agree", "CH", "SF", "ID"),
      option("d", "Strongly agree", "SF", "CH", "ID"),
    ],
  },
];
