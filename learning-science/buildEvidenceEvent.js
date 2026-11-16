'use strict';

// Lesson 1–7 learning evidence foundation. Pure adapter: no persistence, diagnosis,
// identity resolution, access-control bypass, or production assessment wiring.
const crypto = require('node:crypto');

const SUBJECTS = new Set(['literacy', 'mathematics', 'executive_support', 'project', 'other']);
const ROLES = new Set(['baseline', 'guided', 'independent', 'delayed_retrieval', 'transfer']);
const MODALITIES = new Set(['spoken', 'written', 'reading', 'interactive', 'multimodal', 'other']);
const SUPPORTS = new Set(['none', 'visual', 'written_steps', 'modeling', 'spoken_prompt', 'chunking', 'other']);
const STATUSES = new Set(['complete', 'partial', 'not_completed']);
const SOURCES = new Set(['garvey_student_activity', 'teacher_observation', 'caregiver_observation', 'synthetic_test']);

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' must be a nonempty string');
  if (value.length > 160) throw new RangeError(label + ' is too long');
  return value.trim();
}
function oneOf(value, choices, label) {
  if (!choices.has(value)) throw new TypeError('invalid ' + label);
  return value;
}
function buildEvidenceEvent(input, options = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('input must be an object');
  // Require a vetted pseudonymous learner reference; never build it from a name.
  const learner_ref = requiredString(input.learner_ref, 'learner_ref');
  if (!/^learner_[A-Za-z0-9_-]{8,}$/.test(learner_ref)) throw new TypeError('learner_ref must be an opaque learner_ identifier');
  const grade_context = Number(input.grade_context);
  if (!Number.isInteger(grade_context) || grade_context < 1 || grade_context > 6) throw new RangeError('grade_context must be 1–6');
  const support = input.support || {};
  const hint_count = support.hint_count ?? 0;
  if (!Number.isInteger(hint_count) || hint_count < 0) throw new RangeError('hint_count must be a nonnegative integer');
  const support_type = oneOf(support.type || 'none', SUPPORTS, 'support.type');
  if (support_type === 'none' && hint_count > 0) throw new TypeError('hint_count requires a support type');
  const result = input.result || {};
  const completion_status = oneOf(result.completion_status, STATUSES, 'result.completion_status');
  if (result.correct !== undefined && result.correct !== null && typeof result.correct !== 'boolean') throw new TypeError('result.correct must be a boolean or null');
  if (result.score !== undefined && (typeof result.score !== 'number' || !Number.isFinite(result.score) || result.score < 0 || result.score > 1)) throw new RangeError('result.score must be between 0 and 1');
  if (completion_status === 'not_completed' && (result.correct != null || result.score != null)) throw new TypeError('incomplete attempts cannot have a scored outcome');
  const attempt_type = oneOf(input.attempt_type, ROLES, 'attempt_type');
  if (attempt_type === 'independent' && (support_type !== 'none' || hint_count > 0)) throw new TypeError('independent attempts cannot include assistance');
  const retrieval_interval_days = input.retrieval_interval_days;
  if (retrieval_interval_days !== undefined) {
    if (!['delayed_retrieval', 'transfer'].includes(attempt_type)) throw new TypeError('retrieval interval only applies to delayed or transfer attempts');
    if (typeof retrieval_interval_days !== 'number' || !Number.isFinite(retrieval_interval_days) || retrieval_interval_days < 0) throw new RangeError('invalid retrieval interval');
    if (!input.prior_learning_event_id) throw new TypeError('retrieval interval requires prior_learning_event_id');
  }
  const timestamp = options.timestamp || new Date().toISOString();
  if (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp)) || !/(Z|[+-]\d\d:\d\d)$/.test(timestamp)) throw new TypeError('timestamp must be an ISO timestamp with timezone');
  const event = {
    schema_version: '1.0.0',
    event_id: options.event_id || crypto.randomUUID(),
    learner_ref,
    skill_id: requiredString(input.skill_id, 'skill_id'),
    task_id: requiredString(input.task_id, 'task_id'),
    assessment_version: requiredString(input.assessment_version, 'assessment_version'),
    timestamp,
    subject: oneOf(input.subject, SUBJECTS, 'subject'),
    grade_context,
    attempt_type,
    modality: oneOf(input.modality, MODALITIES, 'modality'),
    support: { type: support_type, hint_count },
    result: { completion_status },
    source: oneOf(input.source, SOURCES, 'source'),
  };
  if (result.correct !== undefined) event.result.correct = result.correct;
  if (result.score !== undefined) event.result.score = result.score;
  if (typeof result.explanation_observed === 'boolean') event.result.explanation_observed = result.explanation_observed;
  if (retrieval_interval_days !== undefined) {
    event.retrieval_interval_days = retrieval_interval_days;
    event.prior_learning_event_id = requiredString(input.prior_learning_event_id, 'prior_learning_event_id');
  }
  // Free-text child data, diagnostic labels and guessed neural traits are intentionally not accepted.
  return event;
}

module.exports = { buildEvidenceEvent };
