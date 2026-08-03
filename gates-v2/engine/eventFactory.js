'use strict';

function createEvent(type, session, data = {}) {
  return Object.freeze({
    type,
    session_id: session.session_id,
    experience_id: session.experience_id,
    experience_version: session.experience_version,
    gate_id: session.gate_id,
    revision: session.revision,
    ...data,
  });
}

module.exports = { createEvent };
