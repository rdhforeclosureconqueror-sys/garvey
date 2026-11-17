# Milestone 2E — authenticated caregiver consent controller (NOT MOUNTED)

## Source review
- `server/gatesAuth.js` resolves the existing Gates parent login and checks child ownership.
- The existing Gates cookie uses `SameSite=None; Secure` in secure production configurations; **CSRF protection is mandatory** for consent mutations.
- `learning-science/childConsentRepository.js` has an unregistered PostgreSQL consent schema and transaction contract (PR #936).
- The business consent endpoint is not equivalent to child learning-history permission.

## This PR
- `childConsentController.js` creates an **internal, disabled-by-default** controller (not mounted to Express).
- Every request must resolve the parent session and then resolve that parent's canonical child through injected server-only callbacks.
- Mutation additionally requires a configured HTTPS exact Origin, JSON content type, a separately injected **session-bound CSRF verifier** that returns true, and explicit caregiver acknowledgment.
- Calls the existing transactional grant/withdraw repository only after those gates. Reads return only a granted/not_granted status.
- Pure synthetic tests cover denied cookies, wrong-child access, foreign Origin, CSRF failure, explicit acknowledgment, disabled mode and no PII in the status read.

## Still required before any actual endpoint or real data use
1. Implement and test a real session-bound CSRF token issuance/verification and configure a production HTTPS origin. Do not pass a stub verifier that always returns true.
2. Provide clear parental consent/withdrawal language, version display, records of explicit consent, and an account settings view. Do not confuse `acknowledged` Boolean in a synthetic request with verified consent.
3. Wire the controller to `resolveGatesParentSession` and `resolveOwnedGatesChild` ONLY on a real trusted server, with rate limiting and route error handling. Client must never provide trusted `actor`, `ownedChild`, `enabled` or `verifyCsrf` parameters.
4. Register and verify consent migrations in a **disposable staging database** before production; test row-level access behavior, concurrency, rollback, and schema teardown. There is no staging DB connection in this milestone.
5. Design child lifecycle/deletion/export/retention and withdrawal consequences. Cascading audit FKs alone do not guarantee erasure while other assessment tables retain restrictive references.
6. Arrange appropriate privacy/legal review for data about minors.
7. Keep history disabled by default; only enable after an authorized consent store is live and read access rechecks fresh consent on every request.

## Completion status
Unit-tested prototype only. No production route, no new UI, no migration, no real children's records accessed or modified, no live deployment verification. PR must be held for review.

## Education bookmark
**Lesson 8: Emotional and Social Development** resumes in the separate education conversation after Lessons 1–7 build catch-up.
