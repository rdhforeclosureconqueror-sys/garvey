"use strict";

const CANONICAL_DAYS = Object.freeze(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
const DAY_ALIASES = Object.freeze({
  mon: "monday",
  monday: "monday",
  tue: "tuesday",
  tues: "tuesday",
  tuesday: "tuesday",
  wed: "wednesday",
  weds: "wednesday",
  wednesday: "wednesday",
  thu: "thursday",
  thur: "thursday",
  thurs: "thursday",
  thursday: "thursday",
  fri: "friday",
  friday: "friday",
  sat: "saturday",
  saturday: "saturday",
  sun: "sunday",
  sunday: "sunday",
});
const SESSION_LENGTHS = Object.freeze([15, 30, 45]);
const ENERGY_TYPES = Object.freeze(["calm", "balanced", "high-energy"]);
const WEEKLY_FREQUENCY_VALUES = Object.freeze([2, 3, 4, 5]);

function toInt(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.trunc(numeric);
}

function normalizeWeeklyFrequency(payload = {}) {
  const candidates = [
    payload.weekly_frequency,
    payload.days_per_week,
    payload.committed_days_per_week,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = candidate.trim().toLowerCase();
      const match = normalized.match(/^([2-5])x$/);
      if (match) return Number(match[1]);
    }
    const numeric = toInt(candidate, 0);
    if (numeric > 0) return numeric;
  }
  return 0;
}

function normalizePreferredDays(days) {
  if (!Array.isArray(days)) return [];
  const normalized = days
    .map((day) => DAY_ALIASES[String(day || "").trim().toLowerCase()] || "")
    .filter(Boolean);
  return [...new Set(normalized)];
}

function normalizePreferredTime(payload = {}) {
  const direct = String(payload.preferred_time || "").trim();
  if (direct) return direct;
  return String(payload.preferred_time_window || "").trim();
}

function normalizeSessionLength(payload = {}) {
  return toInt(payload.session_length ?? payload.session_duration_minutes ?? payload.target_session_length, 0);
}

function normalizeEnergyType(payload = {}) {
  return String(payload.energy_type || "").trim().toLowerCase();
}

function normalizeParentCommitmentPlan(payload = {}) {
  const weeklyFrequency = normalizeWeeklyFrequency(payload);
  const preferredDays = normalizePreferredDays(payload.preferred_days);
  const preferredTime = normalizePreferredTime(payload);
  const sessionLength = normalizeSessionLength(payload);
  const energyType = normalizeEnergyType(payload);
  const startDate = String(payload.start_date || "").trim() || new Date().toISOString().slice(0, 10);
  return {
    child_id: String(payload.child_id || "").trim(),
    weekly_frequency: weeklyFrequency,
    days_per_week: weeklyFrequency,
    committed_days_per_week: weeklyFrequency,
    preferred_days: preferredDays,
    preferred_time: preferredTime,
    preferred_time_window: preferredTime,
    session_length: sessionLength,
    session_duration_minutes: sessionLength,
    target_session_length: sessionLength,
    energy_type: energyType,
    facilitator_role: "parent",
    start_date: startDate,
  };
}

function validateParentCommitmentSetup(payload = {}) {
  const normalized = normalizeParentCommitmentPlan(payload);
  const errors = [];
  if (!WEEKLY_FREQUENCY_VALUES.includes(normalized.weekly_frequency)) errors.push("weekly_frequency_invalid");
  if (!Array.isArray(normalized.preferred_days) || normalized.preferred_days.length < 1) {
    errors.push("preferred_days_required");
  } else if (normalized.preferred_days.some((day) => !CANONICAL_DAYS.includes(day))) {
    errors.push("preferred_days_invalid");
  }
  if (!normalized.preferred_time) errors.push("preferred_time_required");
  if (!SESSION_LENGTHS.includes(normalized.session_length)) errors.push("session_length_invalid");
  if (!ENERGY_TYPES.includes(normalized.energy_type)) errors.push("energy_type_invalid");
  return { ok: errors.length === 0, errors, normalized };
}

function isParentCommitmentSetupComplete(payload = {}) {
  return validateParentCommitmentSetup(payload).ok;
}

module.exports = {
  CANONICAL_DAYS,
  SESSION_LENGTHS,
  ENERGY_TYPES,
  WEEKLY_FREQUENCY_VALUES,
  normalizeWeeklyFrequency,
  normalizeParentCommitmentPlan,
  validateParentCommitmentSetup,
  isParentCommitmentSetupComplete,
};
