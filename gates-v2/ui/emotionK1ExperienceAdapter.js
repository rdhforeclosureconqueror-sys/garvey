'use strict';

const crypto = require('node:crypto');
const experience = require('../content/fixtures/example-only/emotion-block-tower.example.json');
const { reduceExperience, ACTION_TYPES } = require('../engine');

const SAFE_PROJECTION_KEYS = Object.freeze(['fixture_id', 'revision', 'status', 'gate_title', 'current_node', 'permitted_controls']);

class EmotionK1ExperienceAdapter {
  constructor({ id = () => crypto.randomUUID() } = {}) {
    this.id = id;
    this.sessions = new Map();
  }

  startExperience() {
    const sessionId = this.id();
    const result = reduceExperience({ experience, session: { session_id: sessionId }, action: { type: ACTION_TYPES.START_EXPERIENCE } });
    if (!result.valid) return this.#failure(result);
    this.sessions.set(sessionId, { state: result.nextSession, paths: new Set(), repairPracticed: false });
    return this.#response(sessionId, result);
  }

  getCurrentProjection(sessionId) {
    const record = this.sessions.get(sessionId);
    if (!record) return { ok: false, status: 404, error: 'Experience session was not found. Please start again.' };
    const projected = reduceExperience({ experience, session: record.state, action: { type: 'NOT_A_TRANSITION' } }).projection;
    return { ok: true, session_id: sessionId, projection: this.#decorate(projected), summary: this.#summary(record) };
  }

  submitAction(sessionId, action, internal = false) {
    const record = this.sessions.get(sessionId);
    if (!record) return { ok: false, status: 404, error: 'Experience session was not found. Please start again.' };
    const node = record.state.current_node_id;
    const normalized = this.#normalizeAction(node, action, internal);
    const result = reduceExperience({ experience, session: record.state, action: normalized });
    if (!result.valid) return this.#failure(result);
    record.state = result.nextSession;
    if (node === 'first_action' && normalized.option_id) record.paths.add(normalized.option_id);
    if (node === 'repair_choice' && normalized.option_id) record.repairPracticed = true;
    return this.#response(sessionId, result);
  }

  replay(sessionId) {
    return this.submitAction(sessionId, { type: ACTION_TYPES.REPLAY, origin_node_id: 'first_action' }, true);
  }

  restart(sessionId) {
    return this.submitAction(sessionId, { type: ACTION_TYPES.RESTART }, true);
  }

  exit(sessionId) {
    const record = this.sessions.get(sessionId);
    if (!record) return { ok: false, status: 404, error: 'Experience session was not found.' };
    return { ok: true, summary: this.#summary(record) };
  }

  #normalizeAction(nodeId, action = {}, internal = false) {
    if (!action || typeof action !== 'object' || Array.isArray(action)) return { type: 'UNSUPPORTED_ACTION', node_id: nodeId };
    if (internal && action.type) return { type: action.type, option_id: action.option_id, node_id: nodeId, origin_node_id: action.origin_node_id };
    const allowedKeys = new Set(['option_id']);
    if (Object.keys(action).some((key) => !allowedKeys.has(key))) return { type: 'UNSUPPORTED_ACTION', node_id: nodeId };
    if (action.option_id !== undefined && typeof action.option_id !== 'string') return { type: 'UNSUPPORTED_ACTION', node_id: nodeId };
    const node = experience.nodes.find((candidate) => candidate.node_id === nodeId);
    const types = { content: ACTION_TYPES.VIEW_NODE, notice: ACTION_TYPES.SELECT_CHOICE, choice: ACTION_TYPES.SELECT_CHOICE, practice: ACTION_TYPES.COMPLETE_PRACTICE, reflection: ACTION_TYPES.COMPLETE_REFLECTION };
    return { type: types[node?.node_type], option_id: action.option_id, node_id: nodeId };
  }

  #decorate(projection) {
    if (!projection) return null;
    const safe = Object.fromEntries(SAFE_PROJECTION_KEYS.filter((key) => projection[key] !== undefined).map((key) => [key, projection[key]]));
    safe.gate_title = 'Emotion Gate';
    safe.experience_notice = 'Early Gates learning experience — example-only and not official curriculum';
    return safe;
  }

  #summary(record) {
    return {
      gate_practiced: 'Emotion Gate',
      experience_status: record.state.status === 'completed' ? 'completed' : 'paused',
      tools_introduced: ['Notice a feeling', 'Notice a body clue', 'Pause and breathe', 'Choose and repair'],
      paths_explored: record.paths.size,
      repair_practiced: record.repairPracticed,
      family_practice: 'Try naming your emotional weather and taking one slow breath together.'
    };
  }

  #response(sessionId, result) {
    return { ok: true, session_id: sessionId, projection: this.#decorate(result.projection), completed: result.completed, summary: this.#summary(this.sessions.get(sessionId)) };
  }

  #failure(result) {
    return { ok: false, status: 400, error: result.errors?.[0]?.message || 'That action is not available. Please try again.', code: result.errors?.[0]?.code };
  }
}

module.exports = { EmotionK1ExperienceAdapter, SAFE_PROJECTION_KEYS };
