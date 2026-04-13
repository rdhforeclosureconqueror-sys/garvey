"use strict";

const ENGINE = "leadership";
const BANK_ID = "leadership_bank1";

function option(id, text, primary, secondary, signalType) {
  return { id, text, primary, secondary, weightType: secondary ? "primary_secondary" : "primary_only", signalType };
}

module.exports = [
  {
    id: "lead_b1_q1",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "I naturally set a clear future direction before asking others to execute.",
    reversePairId: "lead_b1_q2",
    options: [
      option("a", "Strongly disagree", "SD", "AC", "ID"),
      option("b", "Disagree", "RI", "SD", "ID"),
      option("c", "Agree", "VD", "IE", "ID"),
      option("d", "Strongly agree", "VD", "AC", "ID"),
    ],
  },
  {
    id: "lead_b1_q2",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "ID",
    prompt: "I avoid setting direction until all details are fully certain.",
    reversePairId: "lead_b1_q1",
    options: [
      option("a", "Strongly disagree", "VD", "IE", "ID"),
      option("b", "Disagree", "AC", "VD", "ID"),
      option("c", "Agree", "SD", "RI", "ID"),
      option("d", "Strongly agree", "SD", "AC", "ID"),
    ],
  },
  {
    id: "lead_b1_q3",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "I translate big goals into repeatable systems people can follow.",
    reversePairId: "lead_b1_q4",
    options: [
      option("a", "Rarely", "RI", "VD", "SC"),
      option("b", "Sometimes", "AC", "RI", "SC"),
      option("c", "Often", "SD", "VD", "SC"),
      option("d", "Consistently", "SD", "AC", "SC"),
    ],
  },
  {
    id: "lead_b1_q4",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "SC",
    prompt: "My leadership style is mostly improvised rather than structured.",
    reversePairId: "lead_b1_q3",
    options: [
      option("a", "Rarely", "SD", "AC", "SC"),
      option("b", "Sometimes", "VD", "SD", "SC"),
      option("c", "Often", "RI", "IE", "SC"),
      option("d", "Consistently", "RI", "VD", "SC"),
    ],
  },
  {
    id: "lead_b1_q5",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "I calibrate my message so different people understand and act.",
    reversePairId: "lead_b1_q6",
    options: [
      option("a", "Rarely", "SD", "AC", "BH"),
      option("b", "Sometimes", "VD", "SD", "BH"),
      option("c", "Often", "RI", "IE", "BH"),
      option("d", "Consistently", "IE", "RI", "BH"),
    ],
  },
  {
    id: "lead_b1_q6",
    bankId: BANK_ID,
    engine: ENGINE,
    questionClass: "BH",
    prompt: "Even when stakes are high, I communicate with little adaptation to audience needs.",
    reversePairId: "lead_b1_q5",
    options: [
      option("a", "Rarely", "IE", "RI", "BH"),
      option("b", "Sometimes", "RI", "IE", "BH"),
      option("c", "Often", "SD", "VD", "BH"),
      option("d", "Consistently", "SD", "AC", "BH"),
    ],
  },
];
