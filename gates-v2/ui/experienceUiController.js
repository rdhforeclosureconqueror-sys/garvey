'use strict';

class ExperienceUiController {
  constructor(adapter) { this.adapter = adapter; this.sessionId = null; }
  async startExperience() { const result = await this.adapter.startExperience(); this.sessionId = result.session_id; return result; }
  getCurrentProjection() { return this.adapter.getCurrentProjection(this.sessionId); }
  submitAction(action) { return this.adapter.submitAction(this.sessionId, action); }
  replay() { return this.adapter.replay(this.sessionId); }
  restart() { return this.adapter.restart(this.sessionId); }
  exit() { return this.adapter.exit(this.sessionId); }
}

module.exports = { ExperienceUiController };
