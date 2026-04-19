const test = require('node:test');
const assert = require('node:assert/strict');

const {
  defaultExecutionState,
  validateWeeklyExecutionActionPayload,
  applyWeeklyExecutionAction,
  normalizeExecutionState,
} = require('../../youth-development/tde/weeklyExecutionContract');

test('weekly execution payload validator enforces scoped required fields and allowed actions', () => {
  const invalid = validateWeeklyExecutionActionPayload({
    tenant: 'demo',
    email: 'parent@example.com',
    child_id: 'child-1',
    week_number: 1,
    action_type: 'save_reflection',
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join(' '), /note is required/);

  const valid = validateWeeklyExecutionActionPayload({
    tenant: 'demo',
    email: 'parent@example.com',
    child_id: 'child-1',
    week_number: 1,
    action_type: 'mark_step_complete',
    step_key: 'core_activity',
  });
  assert.equal(valid.ok, true);
});

test('state machine blocks continue_to_next_step until current step is complete', () => {
  const start = applyWeeklyExecutionAction({
    currentState: defaultExecutionState(),
    actionType: 'start_week',
    weekNumber: 1,
  });
  assert.equal(start.state.week_status, 'in_progress');

  const blocked = applyWeeklyExecutionAction({
    currentState: start.state,
    actionType: 'continue_to_next_step',
    weekNumber: 1,
  });
  assert.equal(blocked.ok, true);
  assert.equal(blocked.state.week_status, 'blocked');
  assert.match(blocked.state.blocked_reason, /Complete core_activity first/);
});

test('state machine reaches ready_for_next_week only after all required completions', () => {
  let state = defaultExecutionState();
  state = applyWeeklyExecutionAction({ currentState: state, actionType: 'start_week', weekNumber: 1 }).state;

  for (const step of ['core_activity', 'stretch_challenge', 'reflection_checkin', 'observation_support']) {
    const outcome = applyWeeklyExecutionAction({ currentState: state, actionType: 'mark_step_complete', stepKey: step, weekNumber: 1 });
    state = outcome.state;
  }
  state = applyWeeklyExecutionAction({ currentState: state, actionType: 'save_reflection', note: 'done', weekNumber: 1 }).state;
  assert.notEqual(state.week_status, 'ready_for_next_week');

  state = applyWeeklyExecutionAction({ currentState: state, actionType: 'save_observation', note: 'done', weekNumber: 1 }).state;
  assert.equal(state.week_status, 'ready_for_next_week');
  assert.equal(state.next_week_available, true);
});

test('continue_next_week is blocked before ready state and succeeds when ready', () => {
  const blocked = applyWeeklyExecutionAction({
    currentState: normalizeExecutionState({ week_status: 'in_progress' }, 1),
    actionType: 'continue_next_week',
    weekNumber: 1,
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.invalid_action, 'progression_guard_failed');

  const success = applyWeeklyExecutionAction({
    currentState: normalizeExecutionState({ week_status: 'ready_for_next_week' }, 1),
    actionType: 'continue_next_week',
    weekNumber: 1,
  });
  assert.equal(success.ok, true);
  assert.equal(success.state.week_status, 'completed');
});
