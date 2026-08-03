'use strict';

const projectChildFixture = require('../validation/projectChildFixture');
const { ACTION_TYPES, ERROR_CODES } = require('./reducerTypes');
const { createEvent } = require('./eventFactory');
const { completeSession, isApprovedCompletionNode } = require('./completion');
const { validateInput, error } = require('./validation');
const { findNode, resolveTransition } = require('./transitionEngine');
const { prepareReplay } = require('./replay');

const copy = (value) => value === undefined ? undefined : structuredClone(value);

function failure(experience, session, errors, warnings = []) {
  const safeSession = copy(session);
  return { valid: false, errors, warnings, nextSession: safeSession, events: [], projection: project(experience, safeSession), completed: safeSession?.status === 'completed' };
}

function project(experience, session) {
  if (!experience || !session?.current_node_id) return null;
  const result = projectChildFixture(experience, { ...session, fixture_id: session.session_id });
  return result.valid ? result.projection : null;
}

function initialSession(experience, supplied) {
  return {
    session_id: supplied.session_id,
    revision: 1,
    gate_id: experience.gate_id,
    experience_id: experience.experience_id,
    experience_version: experience.experience_version,
    current_node_id: experience.entry_node_id,
    node_history: [experience.entry_node_id],
    selected_choices: [],
    practice_completion: [],
    reflection_completion: [],
    replay_count: 0,
    completion: { completed: false, node_id: null, revision: null },
    completion_history: [],
    status: 'active',
  };
}

function reduceExperience({ experience, session, action } = {}) {
  const inputErrors = validateInput(experience, session, action);
  if (inputErrors.length) return failure(experience, session, inputErrors);

  if (action.type === ACTION_TYPES.START_EXPERIENCE) {
    if (session.current_node_id || session.revision) return failure(experience, session, [error(ERROR_CODES.INVALID_ACTION, 'Session has already started')]);
    let next = initialSession(experience, session);
    if (!findNode(experience, next.current_node_id)) return failure(experience, session, [error(ERROR_CODES.INVALID_NODE, 'Entry node does not exist')]);
    const events = [createEvent('experience_started', next, { node_id: next.current_node_id }), createEvent('node_viewed', next, { node_id: next.current_node_id })];
    if (isApprovedCompletionNode(experience, next.current_node_id)) {
      next = completeSession(experience, next);
      events.push(createEvent('experience_completed', next, { node_id: next.current_node_id }));
    }
    return success(experience, next, events);
  }

  const current = findNode(experience, session.current_node_id);
  if (!current) return failure(experience, session, [error(ERROR_CODES.INVALID_NODE, `Current node does not exist: ${session.current_node_id}`)]);

  if ([ACTION_TYPES.REPLAY, ACTION_TYPES.RESTART].includes(action.type)) {
    const replay = prepareReplay(experience, session, action);
    if (replay.error) return failure(experience, session, [replay.error]);
    const previousCompletion = session.completion?.completed ? [copy(session.completion)] : [];
    const next = {
      ...copy(session), revision: session.revision + 1, current_node_id: replay.origin,
      node_history: [...session.node_history, replay.origin], replay_count: (session.replay_count || 0) + 1,
      selected_choices: [], practice_completion: [], reflection_completion: [],
      completion: { completed: false, node_id: null, revision: null },
      completion_history: [...(session.completion_history || []), ...previousCompletion], status: 'active',
    };
    return success(experience, next, [createEvent('replay_started', next, { origin_node_id: replay.origin, replay_count: next.replay_count }), createEvent('node_viewed', next, { node_id: replay.origin })]);
  }

  if (session.status === 'completed' || session.completion?.completed) return failure(experience, session, [error(ERROR_CODES.SESSION_COMPLETE, 'The experience is already complete')]);
  const transition = resolveTransition(experience, session, action);
  if (transition.error) return failure(experience, session, [transition.error]);
  let next = { ...copy(session), revision: session.revision + 1, current_node_id: transition.destinationId, node_history: [...session.node_history, transition.destinationId] };
  if (action.type === ACTION_TYPES.SELECT_CHOICE) next.selected_choices = [...session.selected_choices, { node_id: current.node_id, option_id: action.option_id }];
  if (action.type === ACTION_TYPES.COMPLETE_PRACTICE) next.practice_completion = [...session.practice_completion, { node_id: current.node_id, option_id: action.option_id }];
  if (action.type === ACTION_TYPES.COMPLETE_REFLECTION) next.reflection_completion = [...session.reflection_completion, { node_id: current.node_id, option_id: action.option_id }];
  const events = [createEvent(transition.eventType, next, transition.eventData)];
  if (transition.eventType !== 'node_viewed') events.push(createEvent('node_viewed', next, { node_id: next.current_node_id }));
  if (isApprovedCompletionNode(experience, next.current_node_id)) {
    next = completeSession(experience, next);
    events.push(createEvent('experience_completed', next, { node_id: next.current_node_id }));
  }
  return success(experience, next, events);
}

function success(experience, nextSession, events) {
  return { valid: true, errors: [], warnings: [], nextSession, events, projection: project(experience, nextSession), completed: nextSession.status === 'completed' };
}

module.exports = reduceExperience;
module.exports.reduceExperience = reduceExperience;
