"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isValidTime24,
  normalizeStartDate,
  normalizeParentCommitmentPlan,
  validateScheduledSessions,
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

test("rejects invalid preferred time and invalid start date", () => {
  const validation = validateParentCommitmentSetup({
    weekly_frequency: 3,
    preferred_days: ["monday", "wednesday"],
    preferred_time: "5:30pm",
    session_length: 30,
    energy_type: "balanced",
    start_date: "2026-02-30",
  });
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.includes("preferred_time_invalid"));
  assert.ok(validation.errors.includes("start_date_invalid"));
});

test("validates structured preferred time window shape", () => {
  const valid = validateParentCommitmentSetup({
    weekly_frequency: 3,
    preferred_days: ["monday", "wednesday"],
    preferred_time_window: { start_time: "17:30", end_time: "18:30", timezone: "UTC" },
    session_length: 30,
    energy_type: "balanced",
    start_date: "2026-04-19",
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.normalized.preferred_time, "17:30");
  const invalid = validateParentCommitmentSetup({
    weekly_frequency: 3,
    preferred_days: ["monday", "wednesday"],
    preferred_time_window: { start_time: "18:30", end_time: "18:00" },
    session_length: 30,
    energy_type: "balanced",
    start_date: "2026-04-19",
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes("preferred_time_window_invalid_range"));
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

test("scheduled sessions schema validates required fields and scope consistency", () => {
  const valid = validateScheduledSessions({
    scheduled_sessions: [
      { session_id: "wk-1-mon", day: "monday", time: "17:30", status: "planned", week_number: 1, child_id: "child-1", selected_activity_ids: ["act-1"] },
    ],
  }, { childId: "child-1", weekNumber: 1 });
  assert.equal(valid.ok, true);
  assert.equal(valid.normalized.length, 1);

  const invalid = validateScheduledSessions({
    scheduled_sessions: [
      { session_id: "", day: "funday", time: "5pm", status: "done", week_number: 2, child_id: "child-2" },
    ],
  }, { childId: "child-1", weekNumber: 1 });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes("scheduled_sessions[0].session_id_required"));
  assert.ok(invalid.errors.includes("scheduled_sessions[0].day_invalid"));
  assert.ok(invalid.errors.includes("scheduled_sessions[0].time_invalid"));
  assert.ok(invalid.errors.includes("scheduled_sessions[0].status_invalid"));
  assert.ok(invalid.errors.includes("scheduled_sessions[0].child_scope_mismatch"));
  assert.ok(invalid.errors.includes("scheduled_sessions[0].week_scope_mismatch"));
});



test("scheduled sessions enforce canonical scheduled_at timestamp consistency", () => {
  const valid = validateScheduledSessions({
    scheduled_sessions: [
      {
        session_id: "wk-1-mon-1",
        day: "monday",
        time: "17:30",
        status: "planned",
        week_number: 1,
        child_id: "child-1",
        selected_activity_ids: ["act-1"],
        scheduled_at: "2026-04-20T17:30:00.000Z",
      },
    ],
  }, { childId: "child-1", weekNumber: 1 });
  assert.equal(valid.ok, true);
  assert.equal(valid.normalized[0].scheduled_at, "2026-04-20T17:30:00.000Z");

  const invalid = validateScheduledSessions({
    scheduled_sessions: [
      {
        session_id: "wk-1-mon-1",
        day: "monday",
        time: "17:30",
        status: "planned",
        week_number: 1,
        child_id: "child-1",
        selected_activity_ids: ["act-1"],
        scheduled_at: "2026-04-20T18:30:00.000Z",
      },
    ],
  }, { childId: "child-1", weekNumber: 1 });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes("scheduled_sessions[0].scheduled_at_time_mismatch"));
});

test("scheduled sessions reject duplicate session identifiers", () => {
  const invalid = validateScheduledSessions({
    scheduled_sessions: [
      { session_id: "wk-1-mon", day: "monday", time: "17:30", status: "planned", week_number: 1, child_id: "child-1", selected_activity_ids: ["act-1"] },
      { session_id: "wk-1-mon", day: "wednesday", time: "17:30", status: "planned", week_number: 1, child_id: "child-1", selected_activity_ids: ["act-2"] },
    ],
  }, { childId: "child-1", weekNumber: 1 });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.includes("scheduled_sessions[1].session_id_duplicate"));
});

test("time and date helpers enforce canonical formats", () => {
  assert.equal(isValidTime24("00:00"), true);
  assert.equal(isValidTime24("23:59"), true);
  assert.equal(isValidTime24("24:00"), false);
  assert.equal(normalizeStartDate("2026-04-19").ok, true);
  assert.equal(normalizeStartDate("2026-02-30").ok, false);
});
