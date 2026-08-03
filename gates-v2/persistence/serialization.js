'use strict';
const { fail } = require('./persistenceTypes');
const clone = value => structuredClone(value);
function serialize(value) { return JSON.stringify(value); }
function deserialize(value, code = 'INVALID_STORED_SESSION_STATE') {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : clone(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) fail(code);
    return parsed;
  } catch (error) { if (error.code) throw error; fail(code); }
}
function deserializeSessionState(value) {
  const state = deserialize(value);
  if (!state.session_id || !Number.isInteger(state.revision) || !state.status || !Array.isArray(state.node_history)) fail('INVALID_STORED_SESSION_STATE');
  return state;
}
module.exports = { clone, serialize, deserialize, deserializeSessionState };
