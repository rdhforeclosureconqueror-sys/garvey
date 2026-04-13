"use strict";

const ENGINE = "loyalty";
const BANK_ID = "loyalty_bank1";

function option(id, text, primary, secondary, signalType) {
  return { id, text, primary, secondary, weightType: secondary ? "primary_secondary" : "primary_only", signalType };
}

module.exports = [
  {
    id: "loyal_b1_q1",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "I stay with brands I deeply trust, even when alternatives appear.",
    reversePairId: "loyal_b1_q2",
    options: [
      option("a", "Strongly disagree", "CH", "SF", "ID"),
      option("b", "Disagree", "SA", "CH", "ID"),
      option("c", "Agree", "TD", "ECM", "ID"),
      option("d", "Strongly agree", "TD", "SA", "ID"),
    ],
  },
  {
    id: "loyal_b1_q2",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "Trust has little effect on my repeat purchase decisions.",
    reversePairId: "loyal_b1_q1",
    options: [
      option("a", "Strongly disagree", "TD", "ECM", "ID"),
      option("b", "Disagree", "SA", "TD", "ID"),
      option("c", "Agree", "CH", "SF", "ID"),
      option("d", "Strongly agree", "CH", "SA", "ID"),
    ],
  },
  {
    id: "loyal_b1_q3",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "If my experience drops, I quickly test competitors.",
    reversePairId: "loyal_b1_q4",
    options: [
      option("a", "Never", "ECM", "TD", "BH"),
      option("b", "Sometimes", "SA", "ECM", "BH"),
      option("c", "Often", "CH", "SF", "BH"),
      option("d", "Always", "CH", "SA", "BH"),
    ],
  },
  {
    id: "loyal_b1_q4",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "Even after setbacks, I work with the brand before switching.",
    reversePairId: "loyal_b1_q3",
    options: [
      option("a", "Never", "CH", "SF", "BH"),
      option("b", "Sometimes", "SA", "CH", "BH"),
      option("c", "Often", "ECM", "TD", "BH"),
      option("d", "Always", "ECM", "SA", "BH"),
    ],
  },
  {
    id: "loyal_b1_q5",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "I view convenience as a major reason I stay loyal.",
    reversePairId: "loyal_b1_q6",
    options: [
      option("a", "Not true", "TD", "ECM", "SC"),
      option("b", "Slightly true", "SA", "TD", "SC"),
      option("c", "Mostly true", "CH", "SF", "SC"),
      option("d", "Very true", "CH", "SA", "SC"),
    ],
  },
  {
    id: "loyal_b1_q6",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "Convenience does not influence whether I remain with a brand.",
    reversePairId: "loyal_b1_q5",
    options: [
      option("a", "Not true", "CH", "SF", "SC"),
      option("b", "Slightly true", "SA", "CH", "SC"),
      option("c", "Mostly true", "TD", "ECM", "SC"),
      option("d", "Very true", "TD", "SA", "SC"),
    ],
  },
];
