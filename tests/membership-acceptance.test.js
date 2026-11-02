"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { runMembershipAcceptance } = require("../server/membershipAcceptance");
test("synthetic membership acceptance suite passes and never claims integration readiness", () => {
  const result = runMembershipAcceptance();
  assert.equal(result.failed, 0);
  assert.equal(result.passed, 11);
  assert.equal(result.not_configured, 6);
  assert.equal(result.synthetic, true);
  assert.ok(result.cases.some(x => x.name.includes("Stripe test-mode") && x.status === "NOT_CONFIGURED"));
});
