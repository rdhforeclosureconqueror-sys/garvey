"use strict";

const {
  validateScheduledSessions,
  normalizeScheduledAt,
} = require("./parentCommitmentSetupContract");

function normalizeCompletionScope(scope = {}) {
  const day = String(scope.day || "").trim().toLowerCase();
  const time = String(scope.time || "").trim();
  const scheduledAt = normalizeScheduledAt(scope.scheduled_at || scope.scheduledAt || "");
  return {
    day,
    time,
    scheduled_at: scheduledAt.value,
    scheduled_at_valid: scheduledAt.ok,
  };
}

function resolveScopedScheduledSession({
  scheduledSessions = [],
  childId = "",
  weekNumber = 1,
  sessionId = "",
  scheduleScope = {},
} = {}) {
  const validation = validateScheduledSessions({ scheduled_sessions: scheduledSessions }, { childId, weekNumber });
  if (!validation.ok) {
    return { ok: false, error: "scheduled_sessions_invalid", messages: validation.errors };
  }

  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) return { ok: false, error: "session_id_required" };
  const matches = validation.normalized.filter((entry) => String(entry.session_id) === normalizedSessionId);
  if (matches.length < 1) return { ok: false, error: "session_scope_mismatch", message: "session_id_not_found_in_scoped_week" };
  if (matches.length > 1) return { ok: false, error: "session_scope_ambiguous", message: "multiple_scoped_sessions_match" };

  const scoped = matches[0];
  const normalizedScope = normalizeCompletionScope(scheduleScope);
  if (!normalizedScope.scheduled_at_valid) {
    return { ok: false, error: "scheduled_at_invalid" };
  }
  if (normalizedScope.day && String(scoped.day || "") !== normalizedScope.day) {
    return { ok: false, error: "session_scope_mismatch", message: "day_mismatch" };
  }
  if (normalizedScope.time && String(scoped.time || "") !== normalizedScope.time) {
    return { ok: false, error: "session_scope_mismatch", message: "time_mismatch" };
  }
  if (normalizedScope.scheduled_at && String(scoped.scheduled_at || "") !== normalizedScope.scheduled_at) {
    return { ok: false, error: "session_scope_mismatch", message: "scheduled_at_mismatch" };
  }

  return {
    ok: true,
    normalized_sessions: validation.normalized,
    scoped_session: scoped,
    scope: normalizedScope,
  };
}

function applySessionCompletionToSchedule({
  scheduledSessions = [],
  childId = "",
  weekNumber = 1,
  sessionId = "",
  scheduleScope = {},
  completedAt = new Date().toISOString(),
} = {}) {
  const resolved = resolveScopedScheduledSession({ scheduledSessions, childId, weekNumber, sessionId, scheduleScope });
  if (!resolved.ok) return resolved;

  const completedAtIso = normalizeScheduledAt(completedAt).ok ? new Date(completedAt).toISOString() : new Date().toISOString();
  const updated = resolved.normalized_sessions.map((entry) => {
    if (String(entry.session_id) !== String(sessionId)) return entry;
    return {
      ...entry,
      status: "completed",
      completed_at: entry.completed_at || completedAtIso,
    };
  });
  return {
    ok: true,
    scheduled_sessions: updated,
    completed_session: updated.find((entry) => String(entry.session_id) === String(sessionId)) || null,
  };
}

module.exports = {
  normalizeCompletionScope,
  resolveScopedScheduledSession,
  applySessionCompletionToSchedule,
};
