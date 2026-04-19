'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { listActivitiesByComponent } = require('../../youth-development/tde/activityBankService');

test('weekly planner activity banks expose expanded parent-facing components', () => {
  const core = listActivitiesByComponent('RULE_BASED_REGULATION');
  const stretch = listActivitiesByComponent('CHALLENGE_SUSTAINED_FOCUS');
  const reflection = listActivitiesByComponent('REFLECTION_COACHING');
  const opening = listActivitiesByComponent('OPENING_ROUTINE');
  const transition = listActivitiesByComponent('TRANSITION_ROUTINE');
  const closing = listActivitiesByComponent('CLOSING_ROUTINE');
  const observation = listActivitiesByComponent('OBSERVATION_SUPPORT');

  assert.equal(core.ok, true);
  assert.equal(stretch.ok, true);
  assert.equal(reflection.ok, true);
  assert.equal(opening.ok, true);
  assert.equal(transition.ok, true);
  assert.equal(closing.ok, true);
  assert.equal(observation.ok, true);

  assert.ok(core.activities.length >= 2);
  assert.ok(stretch.activities.length >= 3);
  assert.ok(reflection.activities.length >= 2);
  assert.ok(opening.activities.length >= 1);
  assert.ok(transition.activities.length >= 1);
  assert.ok(closing.activities.length >= 1);
  assert.ok(observation.activities.length >= 1);
});
