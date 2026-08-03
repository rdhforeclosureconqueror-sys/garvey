'use strict';

const { ACTION_TYPES, ERROR_CODES } = require('./reducerTypes');
const { error } = require('./validation');

function findNode(experience, nodeId) {
  return experience.nodes.find((node) => node.node_id === nodeId);
}

function resolveTransition(experience, session, action) {
  const node = findNode(experience, session.current_node_id);
  if (!node) return { error: error(ERROR_CODES.INVALID_NODE, `Current node does not exist: ${session.current_node_id}`) };
  if (action.node_id !== undefined && action.node_id !== node.node_id) {
    return { error: error(ERROR_CODES.INVALID_TRANSITION, 'Action node does not match the current node') };
  }

  let option;
  let eventType;
  switch (action.type) {
    case ACTION_TYPES.VIEW_NODE:
      if (node.node_type !== 'content' || !node.next?.next_node_id) return { error: error(ERROR_CODES.INVALID_ACTION, 'VIEW_NODE is only valid for a content node with a next transition') };
      eventType = 'node_viewed';
      return destination(experience, node.next.next_node_id, eventType, { node_id: node.next.next_node_id });
    case ACTION_TYPES.SELECT_CHOICE:
      if (!['choice', 'notice'].includes(node.node_type)) return { error: error(ERROR_CODES.INVALID_ACTION, 'SELECT_CHOICE is only valid for choice and notice nodes') };
      eventType = 'choice_selected';
      break;
    case ACTION_TYPES.COMPLETE_PRACTICE:
      if (node.node_type !== 'practice') return { error: error(ERROR_CODES.INVALID_ACTION, 'COMPLETE_PRACTICE is only valid for practice nodes') };
      eventType = 'practice_completed';
      break;
    case ACTION_TYPES.COMPLETE_REFLECTION:
      if (node.node_type !== 'reflection') return { error: error(ERROR_CODES.INVALID_ACTION, 'COMPLETE_REFLECTION is only valid for reflection nodes') };
      eventType = 'reflection_completed';
      break;
    default:
      return { error: error(ERROR_CODES.INVALID_ACTION, `${action.type} cannot transition a node`) };
  }
  option = (node.options || []).find((item) => item.option_id === action.option_id);
  if (!option) return { error: error(ERROR_CODES.INVALID_TRANSITION, `Option is not available from ${node.node_id}`) };
  return destination(experience, option.next_node_id, eventType, { node_id: node.node_id, option_id: option.option_id });
}

function destination(experience, nodeId, eventType, eventData) {
  if (!findNode(experience, nodeId)) return { error: error(ERROR_CODES.INVALID_NODE, `Destination node does not exist: ${nodeId}`) };
  return { destinationId: nodeId, eventType, eventData };
}

module.exports = { findNode, resolveTransition };
