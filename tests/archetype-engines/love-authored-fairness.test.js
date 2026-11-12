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

test("published Love bank gives all five archetypes equal primary opportunity", () => {
  const { primary } = auditCoverage(bank);
  for (const code of CODES) assert.equal(primary[code], 20, `${code} must have 20 primary-choice opportunities`);
});

test("audit: authored Love bank needs paired questions before claiming response consistency", { todo: "All authored reverse_pair_id fields are null; no contradiction-pair reliability evidence" }, () => {
  assert.ok(bank.some(q => q.reverse_pair_id && bank.some(other => other.question_id === q.reverse_pair_id)));
});

const CLASS_MULTIPLIERS = { ID: 1, BH: 1, SC: 1.25, ST: 1.5, DS: 1 };
function scoreSelectedAnswers(questions, selected) {
  const totals = Object.fromEntries(CODES.map(code => [code, 0]));
  const maxima = Object.fromEntries(CODES.map(code => [code, 0]));
  for (const q of questions) {
    const weight = CLASS_MULTIPLIERS[q.question_class];
    assert.ok(weight, `Unknown class ${q.question_class}`);
    for (const code of CODES) {
      maxima[code] += Math.max(...q.options.map(o => (o.primary_archetype === code ? 2 : 0) * weight + (o.secondary_archetype === code ? 1 : 0) * weight));
    }
    const o = selected(q);
    if (!o) continue;
    totals[o.primary_archetype] += 2 * weight;
    if (o.secondary_archetype) totals[o.secondary_archetype] += weight;
  }
  return Object.fromEntries(CODES.map(code => [code, maxima[code] ? 100 * totals[code] / maxima[code] : 0]));
}

test("each Love archetype can become the top-ranked result under consistent selections", () => {
  for (const code of CODES) {
    const scores = scoreSelectedAnswers(bank, q => q.options.find(o => o.primary_archetype === code) || q.options.find(o => o.secondary_archetype === code) || q.options[0]);
    const winner = Object.entries(scores).sort((a,b) => b[1]-a[1])[0][0];
    assert.equal(winner, code, `${code} should win its consistent-answer simulation: ${JSON.stringify(scores)}`);
  }
});

test("authored Love question choices do not repeat a primary archetype within a question", () => {
  for (const q of bank) {
    assert.equal(new Set(q.options.map(o => o.primary_archetype)).size, 4, `${q.question_id} repeats a primary archetype`);
  }
});
