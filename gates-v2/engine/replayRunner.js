'use strict';

const reduceExperience = require('./reducer');

function replayExperience({ experience, session, actions }) {
  let current = structuredClone(session);
  const results = [];
  for (const action of actions || []) {
    const result = reduceExperience({ experience, session: current, action });
    results.push(result);
    if (!result.valid) return { valid: false, errors: result.errors, session: result.nextSession, events: results.flatMap((item) => item.events), results };
    current = result.nextSession;
  }
  return { valid: true, errors: [], session: current, events: results.flatMap((item) => item.events), results };
}

module.exports = { replayExperience };
