'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PURPOSE, VERSION, verifyLearningHistoryConsent } = require('../learning-science/verifyLearningHistoryConsent');

const context = { parentId: '201', learnerId: '301', at: '2026-11-16T12:00:00Z' };
const record = { purpose: PURPOSE, version: VERSION, status: 'granted',
  parent_profile_id: '201', learner_id: '301',
  granted_at: '2026-02-01T12:00:00Z' };

test('only a current purpose-specific caregiver grant passes', () => {
  assert.equal(verifyLearningHistoryConsent(record, context), true);
  for (const alteration of [
    { purpose: 'business_only_required' },
    { version: 'old-version' },
    { status: 'pending' },
    { status: 'revoked' },
    { learner_id: '302' },
    { parent_profile_id: '202' },
    { revoked_at: '2026-03-01T00:00:00Z' },
    { deleted_at: '2026-03-01T00:00:00Z' },
    { granted_at: '2027-01-01T00:00:00Z' },
    { granted_at: 'invalid' },
    { granted_at: '2026-02-01' },
    { granted_at: '2026-02-01T12:00:00' },
    { expires_at: '2026-11-15T00:00:00Z' },
    { expires_at: 'invalid' },
    { expires_at: '2027-01-01T00:00:00' },
  ]) {
    assert.equal(verifyLearningHistoryConsent({ ...record, ...alteration }, context), false);
  }
  assert.equal(verifyLearningHistoryConsent(null, context), false);
});
test('future expiration is accepted but an expired grant is refused', () => {
  assert.equal(verifyLearningHistoryConsent({ ...record, expires_at: '2027-01-01T00:00:00Z' }, context), true);
  assert.equal(verifyLearningHistoryConsent({ ...record, expires_at: '2026-11-16T12:00:00Z' }, context), false);
});
