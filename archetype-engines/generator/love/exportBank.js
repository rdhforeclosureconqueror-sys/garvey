"use strict";

const fs = require("node:fs");
const path = require("node:path");

function exportBank({ bank, outFile }) {
  const target = outFile || path.join("archetype-engines", "question-banks", `${bank.bankId.toLowerCase()}.generated.json`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(bank.questions, null, 2)}\n`, "utf8");
  return target;
}

module.exports = { exportBank };
