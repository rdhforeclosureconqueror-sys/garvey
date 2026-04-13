"use strict";

const BANK_1 = require("./love.bank1");
const BANK_2 = require("./love.bank2");
const BANK_3 = require("./love.bank3");

const BANKS = Object.freeze([BANK_1, BANK_2, BANK_3]);

for (const [idx, bank] of BANKS.entries()) {
  if (!Array.isArray(bank) || bank.length !== 25) {
    throw new Error(`love.bank${idx + 1} must export exactly 25 questions`);
  }
}

module.exports = Object.freeze([...BANK_1, ...BANK_2, ...BANK_3]);
