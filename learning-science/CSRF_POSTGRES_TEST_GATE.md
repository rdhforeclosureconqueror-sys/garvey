# Milestone 2F — session-bound CSRF + disposable PostgreSQL integration

## Added
- `consentCsrf.js`: server-only HMAC-SHA256 CSRF tokens bound to the existing HttpOnly Gates session cookie, purpose and issuance time. Random nonce; ten-minute lifetime; timing-safe signature comparison. This module is **not exposed as an HTTP token-issuance endpoint**, and does not activate consent controls.
- Synthetic tests verify same-session binding, missing/altered token rejection, expiry and key requirements.
- `tests/learning-science-postgres.test.js`: integration test against a disposable local PostgreSQL instance. Creates a random isolated schema with minimal parent/child fixtures, executes staged consent table DDL, tests grant, withdrawal, cross-parent read denial and atomic rollback when audit persistence fails, then drops schema.
- GitHub Actions adds `postgres-consent-integration` with a disposable PostgreSQL 16 service and explicit, localhost-only test database opt-in. Existing unit test job runs independently.

## Hard safety boundaries
- Never point `GARVEY_TEST_DATABASE_URL` at production; integration test additionally requires `GARVEY_ALLOW_DISPOSABLE_PG_TEST=yes` and an actual local hostname. It creates tables and drops a schema. Use only disposable CI/test DBs.
- No schema migration registered in `server/db.js`. No parent-facing routes are mounted; no consent endpoints, live user data, or profile mutations.
- The CSRF helper must be issued **only after authenticated parent session verification** on a same-origin, no-store endpoint, and verified after a fresh authentication check with the server secret. The helper alone is not an authentication system or proof of caregiver authority. CSRF tokens cannot prevent same-origin XSS.
- The existing parent consent controller accepts an injected verifier; a future route integration must wire this specific verifier, not a permissive stub.
- Real PostgreSQL integration still needs cross-session concurrency, production-equivalent schema, deletion/retention policy tests, and confirmed restricted DB roles. The disposable test fixtures intentionally provide minimal canonical tables rather than deploying a full environment.
- Data privacy requirements and consent wording still require review before activating any minor's education records.

## Workflow
Next: review → fix → merge → report for this draft PR. Then proceed to the parent-facing, authenticated consent experience with secure CSRF issuance and actual migrations behind guarded deployment stages.

## Education bookmark
Lesson 8 — Emotional and Social Development, in separate education thread.
