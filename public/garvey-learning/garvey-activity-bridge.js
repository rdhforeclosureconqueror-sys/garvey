(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GarveyActivityBridge = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // One shared, source-only activity event contract. No network or identity
  // resolution here: the authenticated Garvey host is the sole writer.
  const ACTIVITY_AREA = Object.freeze({
    "rainbow-syllables": "phonics",
    "rainbow-writing": "writing",
    "rainbow-grammar": "grammar",
    "word-power": "vocabulary",
    "word-detective": "vocabulary",
    "mission-planner": "executive_support",
  });
  const TYPES = new Set([
    "task_started", "rule_changed", "answer_submitted",
    "retry", "hint_used", "support_used", "plan_revised",
    "reflection_submitted", "activity_completed",
  ]);
  const OUTCOMES = new Set(["correct", "incorrect", "unscored", "not_applicable"]);
  const SUPPORTS = new Set(["read_aloud", "visual", "example", "hint", "chunking", "none"]);
  const TAGS = new Set([
    "sequencing", "rule_switching", "working_hold", "selective_attention",
    "self_reflection", "persistence", "language_explanation", "symbolic_translation",
  ]);
  const DIMENSIONS = new Set(["SR", "RS", "PS", "FB", "CQ", "CR", "DE"]);
  const REFLECTIONS = new Set([
    "planned_first", "read_rule", "tried_again", "used_feedback",
    "used_support", "changed_strategy", "want_more_practice", "ready_to_continue",
  ]);
  const MAX_EVENTS = 100;

  function id(value, field) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(value))
      throw new TypeError("invalid " + field);
    return value;
  }
  function option(value, allowed, name) {
    if (!allowed.has(value)) throw new TypeError("invalid " + name);
    return value;
  }
  function uniqueAllowed(input, allowed, label) {
    if (!Array.isArray(input) || input.length > 12) throw new TypeError("invalid " + label);
    const values = [...new Set(input)];
    for (const value of values) option(value, allowed, label);
    return values;
  }
  function sessionId() {
    const webCrypto = typeof crypto !== "undefined" ? crypto : null;
    if (webCrypto && typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID();
    // Standalone offline fallback is non-identifying and not a durable learner ID.
    return "ephemeral-" + Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
  }
  function createBridge({ activityId, transport = null, clock = () => new Date().toISOString(), maxEvents = MAX_EVENTS } = {}) {
    if (!Object.prototype.hasOwnProperty.call(ACTIVITY_AREA, activityId)) throw new TypeError("unknown Garvey activity");
    if (transport != null && typeof transport !== "function") throw new TypeError("transport must be a function");
    if (typeof clock !== "function") throw new TypeError("clock must be a function");
    if (!Number.isInteger(maxEvents) || maxEvents < 1 || maxEvents > MAX_EVENTS) throw new TypeError("invalid event limit");
    const session_id = sessionId();
    const observations = [];
    let completed = false;
    let lastTask = null;

    function record(eventType, observation = {}) {
      option(eventType, TYPES, "event type");
      if (completed) return null;
      if (!observation || typeof observation !== "object" || Array.isArray(observation))
        throw new TypeError("observation must be a structured object");
      // Reserve the last event slot for the actual completion milestone.
      if (observations.length >= maxEvents ||
          (eventType !== "activity_completed" && observations.length >= maxEvents - 1)) return null;
      const task_id = id(observation.taskId || "activity", "taskId");
      const rule_id = observation.ruleId == null ? null : id(observation.ruleId, "ruleId");
      const skill_id = observation.skillId == null ? null : id(observation.skillId, "skillId");
      const attempt_number = observation.attemptNumber == null ? null : observation.attemptNumber;
      if (attempt_number !== null && (!Number.isInteger(attempt_number) || attempt_number < 1 || attempt_number > 999))
        throw new TypeError("invalid attemptNumber");
      const outcome = option(observation.outcome || "not_applicable", OUTCOMES, "outcome");
      const support_used = uniqueAllowed(observation.supportUsed || [], SUPPORTS, "supportUsed");
      const practice_tags = uniqueAllowed(observation.practiceTags || [], TAGS, "practiceTags");
      const genius_dimension_codes = uniqueAllowed(observation.geniusDimensionCodes || [], DIMENSIONS, "geniusDimensionCodes");
      const reflection = observation.reflection == null ? null
        : option(observation.reflection, REFLECTIONS, "reflection");
      if (eventType === "reflection_submitted" && reflection == null)
        throw new TypeError("reflection choice required");
      const occurred_at = clock();
      if (typeof occurred_at !== "string" || Number.isNaN(Date.parse(occurred_at))) throw new TypeError("invalid timestamp");

      // Explicit fields only; never forward raw answers, child names, free-text
      // stories, profile IDs, browser storage, or externally supplied scores.
      const event = Object.freeze({
        schema_version: "1",
        event_name: "garvey_activity_event",
        activity_id: activityId,
        session_id,
        event_key: session_id + ":" + String(observations.length + 1),
        event_type: eventType, task_id, rule_id,
        academic: Object.freeze({ skill_area: ACTIVITY_AREA[activityId], skill_id, outcome }),
        executive_practice: Object.freeze({ practice_tags: Object.freeze(practice_tags), attempt_number, support_used: Object.freeze(support_used) }),
        genius_exploration: Object.freeze({ opportunity_codes: Object.freeze(genius_dimension_codes), evidence_level: "opportunity_only" }),
        reflection_choice: reflection,
        occurred_at,
      });
      observations.push(event);
      if (eventType === "task_started") lastTask = task_id;
      if (eventType === "activity_completed") completed = true;
      if (transport) {
        // The authenticated host supplies transport and binds the canonical
        // child server-side. No retry/storage queue or browser-controlled user ID.
        try {
          const result = transport(event);
          if (result && typeof result.catch === "function") result.catch(() => undefined);
        } catch (_) { /* a network fault must never break the game */ }
      }
      return event;
    }
    return Object.freeze({
      start: (taskId = "activity", observation = {}) => record("task_started", { ...observation, taskId }),
      record,
      reflect: (choice, taskId = lastTask || "activity") =>
        record("reflection_submitted", { taskId, reflection: choice, practiceTags: ["self_reflection"] }),
      complete: (observation = {}) => record("activity_completed", observation),
      snapshot: () => Object.freeze({
        activity_id: activityId,
        completed,
        recorded_event_count: observations.length,
        // Readable only in this in-memory page session. No localStorage.
        events: Object.freeze(observations.slice()),
      }),
    });
  }
  return Object.freeze({ createBridge, ACTIVITY_AREA, MAX_EVENTS });
});
