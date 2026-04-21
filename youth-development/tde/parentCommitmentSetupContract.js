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
const SCHEDULED_SESSION_STATUS_VALUES = Object.freeze(["planned", "in_progress", "completed", "missed"]);
const TIME_24H_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;
const TIME_12H_PATTERN = /^([1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i;
const ISO_DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CANONICAL_DAY_BY_UTC_INDEX = Object.freeze(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);

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
  if (direct) return toCanonicalPreferredTime(direct);
  const window = payload.preferred_time_window;
  if (window && typeof window === "object" && !Array.isArray(window)) {
    return toCanonicalPreferredTime(String(window.start_time || window.start || "").trim());
  }
  return toCanonicalPreferredTime(String(window || "").trim());
}

function normalizeSessionLength(payload = {}) {
  return toInt(payload.session_length ?? payload.session_duration_minutes ?? payload.target_session_length, 0);
}

function normalizeEnergyType(payload = {}) {
  return String(payload.energy_type || "").trim().toLowerCase();
}

function isValidTime24(value) {
  return TIME_24H_PATTERN.test(String(value || "").trim());
}

function isValidTime12(value) {
  return TIME_12H_PATTERN.test(String(value || "").trim());
}

function convert24To12(value) {
  const raw = String(value || "").trim();
  const match = raw.match(TIME_24H_PATTERN);
  if (!match) return "";
  const hour24 = Number(match[1]);
  const minute = String(match[2]).padStart(2, "0");
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

function convert12To24(value) {
  const raw = String(value || "").trim();
  const match = raw.match(TIME_12H_PATTERN);
  if (!match) return "";
  const hour12 = Number(match[1]);
  const minute = String(match[2]);
  const suffix = String(match[3] || "").toUpperCase();
  let hour24 = hour12 % 12;
  if (suffix === "PM") hour24 += 12;
  return `${String(hour24).padStart(2, "0")}:${minute}`;
}

function toCanonicalPreferredTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match12 = raw.match(TIME_12H_PATTERN);
  if (match12) {
    const hour = Number(match12[1]);
    const minute = String(match12[2]).padStart(2, "0");
    const suffixRaw = String(match12[3] || "").toUpperCase();
    return `${hour}:${minute} ${suffixRaw}`;
  }
  if (isValidTime24(raw)) return convert24To12(raw);
  return raw;
}

function normalizeStartDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return { ok: true, value: new Date().toISOString().slice(0, 10), source: "defaulted" };
  const direct = raw.match(ISO_DATE_ONLY_PATTERN);
  if (direct) {
    const normalized = `${direct[1]}-${direct[2]}-${direct[3]}`;
    const parsed = new Date(`${normalized}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
      return { ok: false, value: "", source: "invalid" };
    }
    return { ok: true, value: normalized, source: "provided" };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { ok: false, value: "", source: "invalid" };
  return { ok: true, value: parsed.toISOString().slice(0, 10), source: "provided" };
}

function normalizePreferredTimeWindow(payload = {}) {
  const rawWindow = payload.preferred_time_window;
  if (!rawWindow || typeof rawWindow === "string") {
    return {
      kind: "time",
      start_time: normalizePreferredTime(payload),
      end_time: "",
      timezone: "",
      label: String(rawWindow || "").trim(),
    };
  }
  if (typeof rawWindow === "object" && !Array.isArray(rawWindow)) {
    return {
      kind: "window",
      start_time: toCanonicalPreferredTime(String(rawWindow.start_time || rawWindow.start || "").trim()),
      end_time: toCanonicalPreferredTime(String(rawWindow.end_time || rawWindow.end || "").trim()),
      timezone: String(rawWindow.timezone || "").trim(),
      label: String(rawWindow.label || "").trim(),
    };
  }
  return { kind: "invalid", start_time: "", end_time: "", timezone: "", label: "" };
}

function normalizeParentCommitmentPlan(payload = {}) {
  const weeklyFrequency = normalizeWeeklyFrequency(payload);
  const preferredDays = normalizePreferredDays(payload.preferred_days);
  const preferredTime = normalizePreferredTime(payload);
  const preferredTimeWindow = normalizePreferredTimeWindow(payload);
  const sessionLength = normalizeSessionLength(payload);
  const energyType = normalizeEnergyType(payload);
  const startDate = normalizeStartDate(payload.start_date).value;
  return {
    child_id: String(payload.child_id || "").trim(),
    weekly_frequency: weeklyFrequency,
    days_per_week: weeklyFrequency,
    committed_days_per_week: weeklyFrequency,
    preferred_days: preferredDays,
    preferred_time: preferredTime,
    preferred_time_window: preferredTime,
    preferred_time_window_detail: preferredTimeWindow,
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
  if (!normalized.preferred_time) {
    errors.push("preferred_time_required");
  } else if (!isValidTime12(normalized.preferred_time)) {
    errors.push("preferred_time_invalid");
  }
  const preferredWindow = normalizePreferredTimeWindow(payload);
  if (preferredWindow.kind === "invalid") {
    errors.push("preferred_time_window_invalid");
  } else if (preferredWindow.kind === "window") {
    if (!isValidTime12(preferredWindow.start_time) || !isValidTime12(preferredWindow.end_time)) {
      errors.push("preferred_time_window_invalid");
    } else if (convert12To24(preferredWindow.start_time) >= convert12To24(preferredWindow.end_time)) {
      errors.push("preferred_time_window_invalid_range");
    }
  } else if (String(payload.preferred_time_window || "").trim() && !isValidTime12(normalized.preferred_time_window)) {
    errors.push("preferred_time_window_invalid");
  }
  if (!normalizeStartDate(payload.start_date).ok) errors.push("start_date_invalid");
  if (!SESSION_LENGTHS.includes(normalized.session_length)) errors.push("session_length_invalid");
  if (!ENERGY_TYPES.includes(normalized.energy_type)) errors.push("energy_type_invalid");
  return { ok: errors.length === 0, errors, normalized };
}

function normalizeScheduledSessionEntry(entry = {}, { childId = "", weekNumber = 1 } = {}) {
  const fallbackTime = "17:30";
  const normalizedDay = DAY_ALIASES[String(entry.day || "").trim().toLowerCase()] || "";
  const normalized = {
    session_id: String(entry.session_id || "").trim(),
    child_id: String(entry.child_id || childId || "").trim() || undefined,
    week_number: Number(entry.week_number || weekNumber || 1),
    day: normalizedDay,
    day_label: String(entry.day_label || (normalizedDay ? normalizedDay.slice(0, 1).toUpperCase() + normalizedDay.slice(1) : "")).trim(),
    time: String(entry.time || "").trim() || fallbackTime,
    status: String(entry.status || "planned").trim().toLowerCase(),
    core_activity_title: String(entry.core_activity_title || "").trim(),
    stretch_activity_title: String(entry.stretch_activity_title || "").trim(),
    selected_activity_ids: Array.isArray(entry.selected_activity_ids) ? [...new Set(entry.selected_activity_ids.map((id) => String(id || "").trim()).filter(Boolean))] : [],
    lesson_plan_block_ids: Array.isArray(entry.lesson_plan_block_ids) ? [...new Set(entry.lesson_plan_block_ids.map((id) => String(id || "").trim()).filter(Boolean))] : [],
  };
  if (entry.completed_at) normalized.completed_at = String(entry.completed_at);
  if (entry.started_at) normalized.started_at = String(entry.started_at);
  if (entry.scheduled_at !== undefined && entry.scheduled_at !== null && String(entry.scheduled_at).trim()) {
    normalized.scheduled_at = String(entry.scheduled_at).trim();
  }
  return normalized;
}

function normalizeScheduledAt(value) {
  const raw = String(value || "").trim();
  if (!raw) return { ok: true, value: "" };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { ok: false, value: "", error: "scheduled_at_invalid" };
  return { ok: true, value: parsed.toISOString() };
}

function validateScheduledSessions(payload = {}, { childId = "", weekNumber = 1 } = {}) {
  const rawSessions = Array.isArray(payload.scheduled_sessions) ? payload.scheduled_sessions : [];
  const errors = [];
  const normalized = [];
  const sessionIds = new Set();
  rawSessions.forEach((entry, idx) => {
    const item = normalizeScheduledSessionEntry(entry, { childId, weekNumber });
    const key = `scheduled_sessions[${idx}]`;
    if (!item.session_id) errors.push(`${key}.session_id_required`);
    if (item.session_id) {
      if (sessionIds.has(item.session_id)) errors.push(`${key}.session_id_duplicate`);
      sessionIds.add(item.session_id);
    }
    if (!CANONICAL_DAYS.includes(item.day)) errors.push(`${key}.day_invalid`);
    if (!isValidTime24(item.time)) errors.push(`${key}.time_invalid`);
    if (!SCHEDULED_SESSION_STATUS_VALUES.includes(item.status)) errors.push(`${key}.status_invalid`);
    if (item.child_id && childId && item.child_id !== childId) errors.push(`${key}.child_scope_mismatch`);
    if (!Number.isInteger(item.week_number) || item.week_number < 1 || item.week_number > 36) {
      errors.push(`${key}.week_number_invalid`);
    } else if (Number(weekNumber) && Number(item.week_number) !== Number(weekNumber)) {
      errors.push(`${key}.week_scope_mismatch`);
    }
    const hasActivityReference = item.selected_activity_ids.length > 0
      || item.lesson_plan_block_ids.length > 0
      || Boolean(item.core_activity_title);
    if ((item.status === "in_progress" || item.status === "completed") && !hasActivityReference) {
      errors.push(`${key}.activity_reference_required`);
    }
    const scheduledAt = normalizeScheduledAt(item.scheduled_at);
    if (!scheduledAt.ok) {
      errors.push(`${key}.scheduled_at_invalid`);
    } else if (scheduledAt.value) {
      item.scheduled_at = scheduledAt.value;
      const parsed = new Date(item.scheduled_at);
      const scheduledDay = CANONICAL_DAY_BY_UTC_INDEX[parsed.getUTCDay()];
      const scheduledTime = parsed.toISOString().slice(11, 16);
      if (item.day && scheduledDay !== item.day) errors.push(`${key}.scheduled_at_day_mismatch`);
      if (item.time && scheduledTime !== item.time) errors.push(`${key}.scheduled_at_time_mismatch`);
    }
    normalized.push(item);
  });
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
  SCHEDULED_SESSION_STATUS_VALUES,
  normalizeWeeklyFrequency,
  normalizeStartDate,
  isValidTime24,
  isValidTime12,
  convert24To12,
  convert12To24,
  toCanonicalPreferredTime,
  normalizeParentCommitmentPlan,
  validateParentCommitmentSetup,
  validateScheduledSessions,
  normalizeScheduledSessionEntry,
  normalizeScheduledAt,
  isParentCommitmentSetupComplete,
};
