'use strict';

class PersistenceError extends Error {
  constructor(code, message = code, details) {
    super(message); this.name = 'PersistenceError'; this.code = code;
    if (details !== undefined) this.details = details;
  }
}
const fail = (code, message, details) => { throw new PersistenceError(code, message, details); };
module.exports = { PersistenceError, fail };
