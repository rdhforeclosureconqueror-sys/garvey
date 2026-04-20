"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeParentCommitmentPlan,
  validateParentCommitmentSetup,
} = require("../../youth-development/tde/parentCommitmentSetupContract");

test("normalizes legacy weekly frequency values and canonical setup fields", () => {
  const normalized = normalizeParentCommitmentPlan({
    child_id: "child-1",
    weekly_frequency: "5x",
    preferred_days: ["Mon", "wed", "fri"],
    preferred_time_window: "17:00",
    target_session_length: 45,
    energy_type: "High-Energy",
  });
  assert.equal(normalized.weekly_frequency, 5);
  assert.equal(normalized.days_per_week, 5);
  assert.deepEqual(normalized.preferred_days, ["monday", "wednesday", "friday"]);
  assert.equal(normalized.preferred_time, "17:00");
  assert.equal(normalized.session_length, 45);
  assert.equal(normalized.energy_type, "high-energy");
});

test("rejects incomplete or malformed setup payloads", () => {
  const validation = validateParentCommitmentSetup({
    weekly_frequency: "0x",
    preferred_days: [],
    preferred_time: "",
    session_length: 10,
    energy_type: "unknown",
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.includes("weekly_frequency_invalid"));
  assert.ok(validation.errors.includes("preferred_days_required"));
  assert.ok(validation.errors.includes("preferred_time_required"));
  assert.ok(validation.errors.includes("session_length_invalid"));
  assert.ok(validation.errors.includes("energy_type_invalid"));
});

test("accepts canonical setup payload", () => {
  const validation = validateParentCommitmentSetup({
    weekly_frequency: 3,
    preferred_days: ["monday", "wednesday"],
    preferred_time: "17:30",
    session_length: 30,
    energy_type: "balanced",
  });
  assert.equal(validation.ok, true);
  assert.equal(validation.normalized.weekly_frequency, 3);
});
