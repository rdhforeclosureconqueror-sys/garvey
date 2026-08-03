'use strict';

const { ERROR_CODES } = require('./reducerTypes');
const { error } = require('./validation');
const { findNode } = require('./transitionEngine');

function prepareReplay(experience, session, action) {
  const policy = experience.replay_policy;
  if (!policy.allowed) return { error: error(ERROR_CODES.INVALID_ACTION, 'Replay is not allowed for this experience') };
  if ((session.replay_count || 0) >= policy.max_replays) return { error: error(ERROR_CODES.REPLAY_LIMIT_REACHED, 'The replay limit has been reached') };
  const origin = action.type === 'RESTART'
    ? experience.entry_node_id
    : (action.origin_node_id || policy.origins[0] || experience.entry_node_id);
  if (action.type === 'REPLAY' && session.status !== 'completed') return { error: error(ERROR_CODES.INVALID_ACTION, 'REPLAY is only available after completion') };
  if (action.type === 'REPLAY' && !policy.origins.includes(origin) && origin !== experience.entry_node_id) {
    return { error: error(ERROR_CODES.INVALID_TRANSITION, 'Requested replay origin is not approved') };
  }
  if (!findNode(experience, origin)) return { error: error(ERROR_CODES.INVALID_NODE, `Replay origin does not exist: ${origin}`) };
  return { origin };
}

module.exports = { prepareReplay };
