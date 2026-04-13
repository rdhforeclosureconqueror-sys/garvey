"use strict";

const ENGINE = "loyalty";
const BANK_ID = "loyalty_bank3";

function option(id, text, primary, secondary, signalType) {
  return { id, text, primary, secondary, weightType: secondary ? "primary_secondary" : "primary_only", signalType };
}

module.exports = [
  {
    id: "loyal_b3_q1",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "I continue subscriptions or repeat orders because it feels effortless.",
    reversePairId: "loyal_b3_q2",
    options: [
      option("a", "Never", "TD", "ECM", "BH"),
      option("b", "Sometimes", "SA", "TD", "BH"),
      option("c", "Often", "CH", "SF", "BH"),
      option("d", "Always", "CH", "SA", "BH"),
    ],
  },
  {
    id: "loyal_b3_q2",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "My repeat purchases are intentional, not habit-based.",
    reversePairId: "loyal_b3_q1",
    options: [
      option("a", "Never", "CH", "SF", "BH"),
      option("b", "Sometimes", "SA", "CH", "BH"),
      option("c", "Often", "TD", "ECM", "BH"),
      option("d", "Always", "TD", "SA", "BH"),
    ],
  },
  {
    id: "loyal_b3_q3",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "I perceive high friction (time/cost/risk) when considering switching brands.",
    reversePairId: "loyal_b3_q4",
    options: [
      option("a", "Not true", "TD", "ECM", "SC"),
      option("b", "Slightly true", "SA", "TD", "SC"),
      option("c", "Mostly true", "SF", "CH", "SC"),
      option("d", "Very true", "SF", "SA", "SC"),
    ],
  },
  {
    id: "loyal_b3_q4",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "Switching to another brand usually feels easy and low-risk.",
    reversePairId: "loyal_b3_q3",
    options: [
      option("a", "Not true", "SF", "CH", "SC"),
      option("b", "Slightly true", "SA", "SF", "SC"),
      option("c", "Mostly true", "TD", "ECM", "SC"),
      option("d", "Very true", "TD", "SA", "SC"),
    ],
  },
  {
    id: "loyal_b3_q5",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "My desired brand relationship is dependable, satisfying, and emotionally positive.",
    reversePairId: "loyal_b3_q6",
    options: [
      option("a", "Low priority", "CH", "SF", "DS"),
      option("b", "Medium priority", "SA", "CH", "DS"),
      option("c", "High priority", "TD", "ECM", "DS"),
      option("d", "Core priority", "ECM", "SA", "DS"),
    ],
  },
  {
    id: "loyal_b3_q6",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "DS",
    prompt: "My desired relationship is mostly low effort and price-driven.",
    reversePairId: "loyal_b3_q5",
    options: [
      option("a", "Low priority", "ECM", "TD", "DS"),
      option("b", "Medium priority", "TD", "ECM", "DS"),
      option("c", "High priority", "CH", "SF", "DS"),
      option("d", "Core priority", "CH", "SA", "DS"),
    ],
  },
];
