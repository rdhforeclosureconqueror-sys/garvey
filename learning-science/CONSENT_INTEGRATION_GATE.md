# Milestone 2C — caregiver consent gate / NO production rollout

## Existing consent finding
`public/js/assessment-consent.js` and `server/index.js` contain a business-profile assessment consent workflow (`/api/consent/required`, consent_type `business_only_required`). It does **not** establish permission for a parent's child's longitudinal learning-history analytics. No dedicated child-learning-history consent repository or removal flow was verified in this audit.

## Implemented in this PR
- `verifyLearningHistoryConsent.js`: strict child-specific, parent-specific, purpose-specific and versioned grant validation.
- `getLearningHistory.js`: requires a trusted server-side consent resolver before executing any history query. Missing resolver throws; denied, revoked, expired, wrong-purpose, wrong-version and mismatched parent/child grants return no history and never access assessment rows.
- Tests cover consent lifecycle scenarios, existing scope and owner checks.

## Non-negotiable production blockers
1. Create a real, authoritative parent-child consent store including purpose, version, grant/withdrawal timestamps, and audit trail. Consent must be gathered through authenticated, parent-owned child context; not merely an arbitrary browser flag.
2. Implement consent withdrawal and child-data deletion/export/retention controls with secure database-authoritative checks.
3. Integrate only from a trusted HTTP route with `resolveGatesParentSession` and `resolveOwnedGatesChild`; protect against stale sessions and cross-child IDs. Do not allow clients to supply `actor`, `ownedChild`, `resolveConsent`, or `enabled`.
4. Implement secure key storage and rotation for the pseudonymization key.
5. Validate against actual staging PostgreSQL for parent/child cross-access, no authorization leaks, consent withdrawal and deletion.
6. Review applicable child privacy requirements with appropriate counsel before activation.

**Status:** no new HTTP endpoints, no consent migrations, no data ingestion, no production activation, no real student data access in this PR. CI tests are synthetic and cannot substitute for staging privacy verification.

## Lesson bookmark
Education thread next starts at **Lesson 8 — Emotional and Social Development**, once Lessons 1–7 build catch-up is complete.
