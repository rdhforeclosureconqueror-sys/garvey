"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  SESSION_LIFECYCLE_EVENTS,
  ALLOWED_PRACTICE_EVENT_EXAMPLES,
  FORBIDDEN_EVENT_EXAMPLES,
  SAFE_DEVELOPMENTAL_SIGNALS,
  FORBIDDEN_METRICS,
  PARENT_LANGUAGE_CONTRACT,
  CHILD_LANGUAGE_CONTRACT,
  FUTURE_ARCHITECTURE_PLANNING,
  SAFETY_GUARDRAILS,
  isForbiddenSignalToken
} = require("../../gates/gatePracticeSignalSchema");

test("defines only the allowed practice session lifecycle events", () => {
  assert.deepEqual(SESSION_LIFECYCLE_EVENTS, [
    "session_start",
    "session_pause",
    "session_resume",
    "session_complete",
    "session_exit"
  ]);
});

test("includes expected allowed and forbidden event examples", () => {
  assert.equal(ALLOWED_PRACTICE_EVENT_EXAMPLES.includes("retry_after_mistake"), true);
  assert.equal(ALLOWED_PRACTICE_EVENT_EXAMPLES.includes("resumed_after_pause"), true);

  for (const forbidden of [
    "IQ",
    "intelligence_score",
    "failure_rating",
    "low_performer",
    "disorder_prediction",
    "ranking_percentile",
    "child_comparison"
  ]) {
    assert.equal(FORBIDDEN_EVENT_EXAMPLES.includes(forbidden), true);
    assert.equal(isForbiddenSignalToken(forbidden), true);
  }
});

test("provides safe developmental signals and forbids unsafe metrics", () => {
  for (const signal of [
    "sustained attention practice",
    "impulse pause practice",
    "emotional recovery practice",
    "working memory repetition",
    "flexibility adaptation",
    "persistence after challenge"
  ]) {
    assert.equal(SAFE_DEVELOPMENTAL_SIGNALS.includes(signal), true);
  }

  for (const metric of [
    "diagnostic scoring",
    "predictive mental health labeling",
    "cross-child ranking",
    "addiction loops",
    "streak pressure",
    "monetized compulsion systems",
    "manipulative retention mechanics"
  ]) {
    assert.equal(FORBIDDEN_METRICS.includes(metric), true);
    assert.equal(isForbiddenSignalToken(metric), true);
  }
});

test("defines parent-facing and child-facing language contracts", () => {
  assert.equal(PARENT_LANGUAGE_CONTRACT.good_examples.length, 3);
  assert.equal(PARENT_LANGUAGE_CONTRACT.forbidden_examples.length, 3);

  assert.equal(CHILD_LANGUAGE_CONTRACT.required.includes("calm tone"), true);
  assert.equal(CHILD_LANGUAGE_CONTRACT.required.includes("optional pacing"), true);
  assert.equal(CHILD_LANGUAGE_CONTRACT.prohibited.includes("shame language"), true);
  assert.equal(CHILD_LANGUAGE_CONTRACT.prohibited.includes("streak guilt"), true);
});

test("documents future architecture boundaries and safety guardrails", () => {
  assert.equal(FUTURE_ARCHITECTURE_PLANNING.includes("api contracts"), true);
  assert.equal(FUTURE_ARCHITECTURE_PLANNING.includes("timeline integration"), true);
  assert.equal(FUTURE_ARCHITECTURE_PLANNING.includes("pattern engine integration"), true);
  assert.equal(FUTURE_ARCHITECTURE_PLANNING.includes("consent boundaries"), true);
  assert.equal(FUTURE_ARCHITECTURE_PLANNING.includes("data retention boundaries"), true);
  assert.equal(FUTURE_ARCHITECTURE_PLANNING.includes("anonymized analytics boundaries"), true);

  assert.equal(SAFETY_GUARDRAILS.includes("parent-controlled access"), true);
  assert.equal(SAFETY_GUARDRAILS.includes("no public leaderboards"), true);
  assert.equal(SAFETY_GUARDRAILS.includes("no ad targeting from child data"), true);
  assert.equal(SAFETY_GUARDRAILS.includes("no biometric inference"), true);
});

test("architecture doc includes all required sections and prohibitions", () => {
  const doc = fs.readFileSync("docs/gate-practice-signal-architecture.md", "utf8");

  for (const snippet of [
    "session_start",
    "session_pause",
    "session_resume",
    "session_complete",
    "session_exit",
    "diagnostic scoring",
    "predictive mental health labeling",
    "cross-child ranking",
    "no public leaderboards",
    "no ad targeting from child data",
    "no biometric inference",
    "no hidden profiling"
  ]) {
    assert.equal(doc.includes(snippet), true);
  }
});
