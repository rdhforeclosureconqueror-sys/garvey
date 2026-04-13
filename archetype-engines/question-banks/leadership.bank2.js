"use strict";

const ENGINE = "leadership";
const BANK_ID = "leadership_bank2";

function option(id, text, primary, secondary, signalType) {
  return { id, text, primary, secondary, weightType: secondary ? "primary_secondary" : "primary_only", signalType };
}

module.exports = [
  {
    id: "lead_b2_q1",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ST",
    prompt: "Under pressure, I still keep team focus anchored to the mission.",
    reversePairId: "lead_b2_q2",
    options: [
      option("a", "Rarely", "SD", "RI", "ST"),
      option("b", "Sometimes", "AC", "SD", "ST"),
      option("c", "Often", "VD", "IE", "ST"),
      option("d", "Consistently", "VD", "AC", "ST"),
    ],
  },
  {
    id: "lead_b2_q2",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ST",
    prompt: "Stress causes me to narrow into control and lose the bigger vision.",
    reversePairId: "lead_b2_q1",
    options: [
      option("a", "Rarely", "VD", "AC", "ST"),
      option("b", "Sometimes", "RI", "VD", "ST"),
      option("c", "Often", "SD", "AC", "ST"),
      option("d", "Consistently", "SD", "RI", "ST"),
    ],
  },
  {
    id: "lead_b2_q3",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "In my best leadership future, I influence through trust before authority.",
    reversePairId: "lead_b2_q4",
    options: [
      option("a", "Not important", "SD", "AC", "DS"),
      option("b", "Somewhat important", "VD", "SD", "DS"),
      option("c", "Important", "RI", "IE", "DS"),
      option("d", "Essential", "RI", "VD", "DS"),
    ],
  },
  {
    id: "lead_b2_q4",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "My ideal is to lead mainly through position power, not relational influence.",
    reversePairId: "lead_b2_q3",
    options: [
      option("a", "Not important", "RI", "IE", "DS"),
      option("b", "Somewhat important", "VD", "RI", "DS"),
      option("c", "Important", "SD", "AC", "DS"),
      option("d", "Essential", "SD", "IE", "DS"),
    ],
  },
  {
    id: "lead_b2_q5",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "I see adaptability as a core part of my leadership identity.",
    reversePairId: "lead_b2_q6",
    options: [
      option("a", "Strongly disagree", "SD", "VD", "ID"),
      option("b", "Disagree", "RI", "SD", "ID"),
      option("c", "Agree", "AC", "RI", "ID"),
      option("d", "Strongly agree", "AC", "VD", "ID"),
    ],
  },
  {
    id: "lead_b2_q6",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "I identify most with holding one fixed style regardless of context.",
    reversePairId: "lead_b2_q5",
    options: [
      option("a", "Strongly disagree", "AC", "VD", "ID"),
      option("b", "Disagree", "RI", "AC", "ID"),
      option("c", "Agree", "SD", "RI", "ID"),
      option("d", "Strongly agree", "SD", "VD", "ID"),
    ],
  },
];
