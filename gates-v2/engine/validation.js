'use strict';

const validateDevelopmentExperience = require('../validation/validateDevelopmentExperience');
const validateExperienceGraph = require('../validation/validateExperienceGraph');
const { ACTION_TYPES, ERROR_CODES } = require('./reducerTypes');

const error = (code, message, details) => Object.freeze({ code, message, ...(details ? { details } : {}) });

function validateInput(experience, session, action) {
  if (!experience || typeof experience !== 'object') return [error(ERROR_CODES.INVALID_EXPERIENCE, 'Experience is required')];
  const contract = validateDevelopmentExperience(experience);
  if (!contract.valid) {
    return [error(ERROR_CODES.INVALID_EXPERIENCE, 'Experience does not satisfy the Gates V2 contract', { errors: contract.errors })];
  }
  if (!action || typeof action !== 'object' || Array.isArray(action)) return [error(ERROR_CODES.INVALID_ACTION, 'Action must be an object')];
  if (!Object.values(ACTION_TYPES).includes(action.type)) return [error(ERROR_CODES.UNKNOWN_ACTION, `Unsupported action type: ${String(action.type)}`)];
  if (action.type === ACTION_TYPES.START_EXPERIENCE) {
    const graph = validateExperienceGraph(experience);
    if (!graph.valid) return [error(ERROR_CODES.INVALID_EXPERIENCE, 'Experience graph is invalid', { errors: graph.errors })];
    if (!session || typeof session !== 'object' || !session.session_id) return [error(ERROR_CODES.INVALID_ACTION, 'START_EXPERIENCE requires a session_id')];
    return [];
  }
  if (!session || typeof session !== 'object') return [error(ERROR_CODES.INVALID_ACTION, 'An active session is required')];
  for (const key of ['session_id', 'experience_id', 'experience_version', 'gate_id', 'current_node_id']) {
    if (session[key] === undefined) return [error(ERROR_CODES.INVALID_ACTION, `Session is missing ${key}`)];
  }
  if (session.experience_id !== experience.experience_id || session.experience_version !== experience.experience_version || session.gate_id !== experience.gate_id) {
    return [error(ERROR_CODES.INVALID_ACTION, 'Session does not belong to this experience')];
  }
  return [];
}

module.exports = { error, validateInput };
