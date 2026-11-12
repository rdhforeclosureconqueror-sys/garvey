"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const bank = require("../../archetype-engines/question-banks/love.bank1");

const CODES = ["RS", "AL", "EC", "AV", "ES"];

function auditCoverage(questions) {
  const primary = Object.fromEntries(CODES.map(code => [code, 0]));
  const secondary = Object.fromEntries(CODES.map(code => [code, 0]));
  for (const q of questions) {
    assert.equal(q.options.length, 4, `${q.question_id}: expected four answers`);
    for (const o of q.options) {
      assert.ok(CODES.includes(o.primary_archetype), `${q.question_id}: unknown primary`);
      primary[o.primary_archetype]++;
      if (o.secondary_archetype) {
        assert.ok(CODES.includes(o.secondary_archetype), `${q.question_id}: unknown secondary`);
        secondary[o.secondary_archetype]++;
      }
    }
  }
  return { primary, secondary };
}

test("authored Love bank has 25 questions and valid archetype references", () => {
  assert.equal(bank.length, 25);
  const coverage = auditCoverage(bank);
  assert.equal(Object.values(coverage.primary).reduce((a,b)=>a+b,0), 100);
});

test("audit: published Love bank must offer every archetype as a primary choice", { todo: "Current authored bank offers ES only as a secondary signal; redesign question choices before enabling this gate" }, () => {
  const { primary } = auditCoverage(bank);
  for (const code of CODES) assert.ok(primary[code] > 0, `${code} has zero primary-choice opportunities`);
});

test("audit: authored Love bank needs paired questions before claiming response consistency", { todo: "All authored reverse_pair_id fields are null; no contradiction-pair reliability evidence" }, () => {
  assert.ok(bank.some(q => q.reverse_pair_id && bank.some(other => other.question_id === q.reverse_pair_id)));
});
