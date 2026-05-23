(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.GameHubSessionAdapter = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGameHubSessionAdapterModule() {
  const CANONICAL_EVENT_NAMES = Object.freeze([
    'game_session_started',
    'game_session_ended',
    'activity_selected',
    'round_started',
    'round_completed',
    'level_changed',
    'retry_started',
    'recovery_after_miss',
    'challenge_selected',
    'accuracy_summary',
    'persistence_signal'
  ]);

  const FORBIDDEN_KEY_PATTERNS = [
    /child/i,
    /name/i,
    /answer/i,
    /question/i,
    /diagnostic/i,
    /grade/i,
    /score/i,
    /verdict/i,
    /text/i,
    /free[_-]?text/i
  ];

  let activeSession = null;
  let emittedEvents = [];

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function isForbiddenKey(key) {
    return FORBIDDEN_KEY_PATTERNS.some((pattern) => pattern.test(key));
  }

  function sanitizeValue(value) {
    if (value == null) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
      return value
        .map((entry) => sanitizeValue(entry))
        .filter((entry) => entry !== undefined);
    }
    if (isPlainObject(value)) {
      const sanitized = {};
      Object.keys(value).forEach((key) => {
        if (isForbiddenKey(key)) return;
        const sanitizedValue = sanitizeValue(value[key]);
        if (sanitizedValue !== undefined) {
          sanitized[key] = sanitizedValue;
        }
      });
      return sanitized;
    }
    return undefined;
  }

  function sanitizePayload(payload) {
    if (!isPlainObject(payload)) return {};
    const sanitized = sanitizeValue(payload);
    return isPlainObject(sanitized) ? sanitized : {};
  }

  function startSession(context) {
    activeSession = {
      started_at: Date.now(),
      context: sanitizePayload(context),
      status: 'active'
    };
    return activeSession;
  }

  function endSession(summary) {
    const sanitizedSummary = sanitizePayload(summary);
    if (!activeSession) {
      return {
        ended: false,
        reason: 'no_active_session',
        summary: sanitizedSummary
      };
    }

    activeSession = {
      ...activeSession,
      status: 'ended',
      ended_at: Date.now(),
      summary: sanitizedSummary
    };

    return { ended: true, summary: sanitizedSummary };
  }

  function emit(eventName, payload) {
    if (!CANONICAL_EVENT_NAMES.includes(eventName)) {
      return { accepted: false, reason: 'unsupported_event' };
    }

    const record = {
      eventName,
      payload: sanitizePayload(payload),
      timestamp: Date.now()
    };
    emittedEvents.push(record);
    return { accepted: true, event: record };
  }

  function getSessionSnapshot() {
    return {
      session: activeSession ? { ...activeSession } : null,
      events: emittedEvents.slice(),
      canonical_events: CANONICAL_EVENT_NAMES.slice()
    };
  }

  return {
    CANONICAL_EVENT_NAMES,
    startSession,
    endSession,
    emit,
    getSessionSnapshot
  };
});
