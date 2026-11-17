# Milestone 2B — Read-only learning history security gate

## Verified repository assets
- `server/assessmentMvpDb.js` creates PostgreSQL `assessment_sessions`, `assessment_session_items`, `assessment_responses`, `assessment_skill_evidence`; individual item and session IDs are database-unique.
- `server/assessmentMvpStore.js` already has ownership-scoped `getLearnerAssessmentHistory`, transactional submission and duplicate session completion rejection.
- `server/gatesAuth.js` contains parent session and child ownership resolvers. Its child resolver reports that a canonical child lifecycle/deactivation field is **not present**.
- PR #933 merged the in-memory baseline-to-evidence adapter; it intentionally has no production route or persistence.

## This PR
- `learning-science/getLearningHistory.js` is an **internal-only, read-only** service. It is not imported into the main app, has no HTTP route, runs no migrations and does not write.
- Disabled by default. `enabled: true` can be supplied only by a future trusted server invocation after actual authentication and child ownership resolution; it is NOT equivalent to user consent.
- SQL requires matching `auth_user_id`, `parent_profile_id`, `learner_id` plus a canonical child/parent relationship, completed baseline sessions, and a bounded limit.
- No names, birthdates, raw answers, original learner database ID or session ID are returned in the projection. The pseudonymous learner reference and stable event identifier use a secret-keyed SHA-256 HMAC, not ordinary hashing of predictable numeric IDs.
- Distinguishes correct, incorrect, omitted and unscorable. Explicitly marks modality and support as unknown, so baseline evidence cannot accidentally count as independently demonstrated proficiency.

## Constraints and remaining blockers
1. **Do not enable for real learners** until caregiver consent and purpose-specific authorization are reviewed. Existing assessment authorization alone is insufficient approval for new longitudinal analytics.
2. Child account lifecycle and revocation/deletion paths need design: deactivated/removed children must not remain queryable, and deletion/retention behavior must be explicit.
3. A 32+-byte server secret must be configured securely, never in client JS, source control, or logs. Rotation strategy should be documented; rotating HMAC keys changes pseudonyms unless handled explicitly.
4. Service-to-route integration must never rely on caller-crafted `actor`, `ownedChild` or `enabled` fields; resolve those exclusively on the trusted server and enforce user/parent/child ownership with DB filters.
5. This read is **not** a database-enforced row-level security policy. Cross-tenant checks must be tested against a real test PostgreSQL database, along with the existing ownership tests.
6. No new evidence table is necessary for this phase; it projects existing scores. Future guided supports, delayed retrieval, verified modality, retention scheduling and child dashboard need separate recording contracts, consent and tests.
7. Not live-verified; no UI integration or real child-data processing was attempted.

## Acceptance before enabling
- Synthetic cross-parent, cross-child and expired-session tests.
- Consent refusal and withdrawal tests.
- Record deletion/export and retention-policy tests.
- Stable pseudonyms for an authorized history, no PII leakage, no raw answers, no inflated mastery claims.
- CI plus staging PostgreSQL tests; review -> fix -> merge -> deploy -> verify after gating is satisfied.

## Lesson bookmark
Return to **Educational Neuroscience Lesson 8: Emotional & Social Development** in the separate learning thread after the Lessons 1–7 implementation catch-up.
