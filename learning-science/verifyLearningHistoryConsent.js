'use strict';

// Pure policy gate for child learning-history analytics. It must receive a consent
// record from a TRUSTED server-owned repository, never directly from the browser.
const PURPOSE = 'child_learning_history';
const VERSION = 'child-learning-history-v1';

function positiveId(value) {
  const s = String(value ?? '');
  return /^[1-9][0-9]*$/.test(s) ? s : null;
}

function consentTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    return NaN;
  }
  return Date.parse(value);
}

function verifyLearningHistoryConsent(record, { parentId, learnerId, at = new Date() } = {}) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  if (record.purpose !== PURPOSE || record.version !== VERSION || record.status !== 'granted') return false;
  if (positiveId(record.parent_profile_id) !== positiveId(parentId) ||
      positiveId(record.learner_id) !== positiveId(learnerId) ||
      !positiveId(parentId) || !positiveId(learnerId)) return false;
  if (record.revoked_at != null || record.deleted_at != null) return false;
  const checkedAt = new Date(at).getTime();
  const grantedAt = consentTimestamp(record.granted_at);
  if (!Number.isFinite(checkedAt) || !Number.isFinite(grantedAt) || grantedAt > checkedAt) return false;
  if (record.expires_at != null) {
    const expires = consentTimestamp(record.expires_at);
    if (!Number.isFinite(expires) || expires <= checkedAt) return false;
  }
  return true;
}

module.exports = { PURPOSE, VERSION, verifyLearningHistoryConsent };
