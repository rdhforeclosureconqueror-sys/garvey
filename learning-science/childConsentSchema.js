'use strict';

// Additive schema proposal ONLY. It is not registered in server/db.js.
const CHILD_LEARNING_CONSENT_SQL = Object.freeze([
  `CREATE TABLE IF NOT EXISTS garvey_child_learning_consent (
    parent_profile_id BIGINT NOT NULL REFERENCES gates_parent_profiles(id) ON DELETE CASCADE,
    learner_id BIGINT NOT NULL REFERENCES gates_child_profiles(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL CHECK (purpose = 'child_learning_history'),
    version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('granted','revoked')),
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (parent_profile_id, learner_id, purpose),
    CONSTRAINT garvey_child_consent_state_chk CHECK
      ((status = 'granted' AND granted_at IS NOT NULL AND revoked_at IS NULL)
       OR (status = 'revoked' AND revoked_at IS NOT NULL))
  )`,
  `CREATE TABLE IF NOT EXISTS garvey_child_learning_consent_audit (
    id BIGSERIAL PRIMARY KEY,
    parent_profile_id BIGINT NOT NULL REFERENCES gates_parent_profiles(id) ON DELETE CASCADE,
    learner_id BIGINT NOT NULL REFERENCES gates_child_profiles(id) ON DELETE CASCADE,
    auth_user_id BIGINT NOT NULL,
    purpose TEXT NOT NULL,
    version TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('granted','revoked')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS garvey_child_learning_consent_audit_parent_child_idx
    ON garvey_child_learning_consent_audit(parent_profile_id, learner_id, occurred_at DESC)`
]);

module.exports = { CHILD_LEARNING_CONSENT_SQL };
