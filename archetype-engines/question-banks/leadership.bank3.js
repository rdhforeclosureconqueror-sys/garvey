"use strict";

const ENGINE = "leadership";
const BANK_ID = "leadership_bank3";

function option(id, text, primary, secondary, signalType) {
  return { id, text, primary, secondary, weightType: secondary ? "primary_secondary" : "primary_only", signalType };
}

module.exports = [
  {
    id: "lead_b3_q1",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "In real operations, I create accountability rhythms people can trust.",
    reversePairId: "lead_b3_q2",
    options: [
      option("a", "Rarely", "RI", "VD", "BH"),
      option("b", "Sometimes", "AC", "RI", "BH"),
      option("c", "Often", "SD", "VD", "BH"),
      option("d", "Consistently", "SD", "AC", "BH"),
    ],
  },
  {
    id: "lead_b3_q2",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "I frequently leave execution vague and rely on charisma alone.",
    reversePairId: "lead_b3_q1",
    options: [
      option("a", "Rarely", "SD", "AC", "BH"),
      option("b", "Sometimes", "VD", "SD", "BH"),
      option("c", "Often", "IE", "RI", "BH"),
      option("d", "Consistently", "IE", "VD", "BH"),
    ],
  },
  {
    id: "lead_b3_q3",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "People describe my leadership presence as clear, motivating, and human.",
    reversePairId: "lead_b3_q4",
    options: [
      option("a", "Rarely", "SD", "AC", "SC"),
      option("b", "Sometimes", "VD", "SD", "SC"),
      option("c", "Often", "IE", "RI", "SC"),
      option("d", "Consistently", "IE", "VD", "SC"),
    ],
  },
  {
    id: "lead_b3_q4",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "Others often experience me as disconnected from their perspective.",
    reversePairId: "lead_b3_q3",
    options: [
      option("a", "Rarely", "RI", "IE", "SC"),
      option("b", "Sometimes", "AC", "RI", "SC"),
      option("c", "Often", "SD", "AC", "SC"),
      option("d", "Consistently", "SD", "VD", "SC"),
    ],
  },
  {
    id: "lead_b3_q5",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "My desired leadership outcome is high performance with adaptability and trust.",
    reversePairId: "lead_b3_q6",
    options: [
      option("a", "Low priority", "SD", "VD", "DS"),
      option("b", "Medium priority", "VD", "SD", "DS"),
      option("c", "High priority", "AC", "RI", "DS"),
      option("d", "Core priority", "AC", "IE", "DS"),
    ],
  },
  {
    id: "lead_b3_q6",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "I prefer my long-term leadership impact to be efficiency only, even at relational cost.",
    reversePairId: "lead_b3_q5",
    options: [
      option("a", "Low priority", "RI", "AC", "DS"),
      option("b", "Medium priority", "IE", "RI", "DS"),
      option("c", "High priority", "SD", "VD", "DS"),
      option("d", "Core priority", "SD", "AC", "DS"),
    ],
  },
];
