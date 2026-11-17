# Milestone 2D — caregiver consent repository (staged, OFF)

## Changes
- `childConsentSchema.js`: additive PostgreSQL schema proposal (current scoped consent and action audit). **Not registered** in `server/db.js`; no production migration is performed.
- `childConsentRepository.js`: a server-only transaction contract for consent grant/withdrawal, first requiring a trusted, authenticated parent, canonical owned child, and server-confirmed caregiver action. It locks the child's canonical row, checks current ownership, atomically upserts scoped consent and records the audit event. A separate read resolver joins canonical parent-child ownership.
- Synthetic tests cover ownership mismatch, transaction rollback, missing consent, withdrawal, and the existing consent-validation gate.

## Why this is not production-ready
1. `caregiverActionVerified: true` is a **trusted-caller assertion**, not an authentication or parental-identity verification system. It is unsafe if sourced from an HTTP request body or any browser input. Do not import this repository into public routes until authenticated session/CSRF protection and verified parent action are designed and tested.
2. No parent-facing consent language, explicit opt-in UI, confirmation/versioning, or withdrawal UI exists yet.
3. The database schema is a reviewed proposal and has **not been migrated to a test or production database**. Test real transaction behavior and concurrency on disposable staging PostgreSQL before registration.
4. Audit records carry parent/learner IDs and must have explicit retention and deletion/export policies; consent withdrawal is **not** equivalent to erasure of historical assessment records. Do not conflate these user actions.
5. Current child lifecycle/deactivation enforcement is incomplete; require valid active child authorization before any live flow.
6. Determine applicable legal requirements for children's education and privacy records, and ensure the caregiver has authority to consent.
7. Consent must be withdrawn promptly and revalidated on reads; never cache an old granted state as authorization.
8. Add a controlled migration with verification and rollback planning, authenticated grant/revoke endpoints and negative-access integration tests in a subsequent PR. Add no new user routes until gates pass.

## Existing assessment data
Keep assessment responses in the existing tables. The learning-science service remains disabled by default. Never duplicate raw children's answers in the consent audit.

## Education bookmark
Continue with **Lesson 8: Emotional and Social Development** in the separate education thread after Lessons 1–7 build catch-up.
