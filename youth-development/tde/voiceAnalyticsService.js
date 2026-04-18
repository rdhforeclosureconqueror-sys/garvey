"use strict";

const KNOWN_VOICE_EVENTS = Object.freeze([
  "child_checkin_playback_requested",
  "child_replay_requested",
  "parent_section_playback_requested",
  "fallback_used",
  "provider_unavailable",
  "malformed_gateway_downgrade_used",
  "voice_not_shown_unavailable_or_unsupported",
]);

function createVoiceAnalyticsService() {
  const totals = new Map();
  const byChild = new Map();

  for (const eventName of KNOWN_VOICE_EVENTS) totals.set(eventName, 0);

  function increment(map, key) {
    map.set(key, Number(map.get(key) || 0) + 1);
  }

  function record(eventName, payload = {}) {
    const event = String(eventName || "").trim();
    if (!KNOWN_VOICE_EVENTS.includes(event)) return { ok: false, ignored: true, reason: "unknown_event" };

    increment(totals, event);

    const childId = String(payload.child_id || "").trim();
    if (childId) {
      const childEvents = byChild.get(childId) || new Map();
      increment(childEvents, event);
      byChild.set(childId, childEvents);
    }

    return {
      ok: true,
      deterministic: true,
      extension_only: true,
      recorded_event: event,
    };
  }

  function toObject(map) {
    return Array.from(map.entries()).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }

  function getSummary(options = {}) {
    const childId = String(options.child_id || "").trim();
    const childEvents = childId ? byChild.get(childId) : null;

    return {
      ok: true,
      deterministic: true,
      extension_only: true,
      known_events: KNOWN_VOICE_EVENTS,
      totals: toObject(totals),
      child_id: childId || null,
      child_totals: childEvents ? toObject(childEvents) : null,
      analytics_non_blocking: true,
    };
  }

  return {
    knownEvents: KNOWN_VOICE_EVENTS,
    record,
    getSummary,
  };
}

module.exports = {
  createVoiceAnalyticsService,
  KNOWN_VOICE_EVENTS,
};
