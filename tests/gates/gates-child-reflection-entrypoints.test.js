"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const js = fs.readFileSync("public/gates.js", "utf8");

test("results page and walking the gate include child reflection entry for supported growth gates", () => {
  assert.ok(js.includes("Walking the Gate"));
  assert.ok(js.includes("renderChildReflectionCta(childId, growthGate.gate_number)"));
  assert.ok(js.includes("Let your child explore this Gate"));
});

test("gate detail page includes child reflection entry for gates 1-3", () => {
  assert.ok(js.includes("renderChildReflectionCta(childId, gate.gate_number)"));
});

test("gates map includes child reflection CTA only through supported-gate helper", () => {
  assert.ok(js.includes("renderChildReflectionCta(childId, g.gate_number)"));
  assert.ok(js.includes("function isChildReflectionSupportedGate(gateNumber)"));
  assert.ok(js.includes("gate >= 1 && gate <= 3"));
});

test("child reflection CTA uses required route format", () => {
  assert.ok(js.includes('href="/gates/child/${childId}/reflection/${gateNumber}"'));
});

test("child reflection CTA language stays optional and non-scoring", () => {
  assert.ok(js.includes("Optional child reflection"));
  assert.ok(js.includes("A gentle story-based reflection, not a test. No right or wrong answers."));
  assert.equal(/Optional child reflection[\s\S]{0,240}\b(score|grade|quiz)\b/i.test(js), false);
});

test("child reflection entry click trace event is emitted with safe payload", () => {
  assert.ok(js.includes("child_reflection_entry_clicked"));
  assert.ok(js.includes("data-child-id"));
  assert.ok(js.includes("data-gate-number"));
});
