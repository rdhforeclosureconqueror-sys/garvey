# Authenticated Garvey activity-evidence gate — Lessons 1–7
## Status
**Reviewable server-side implementation; not mounted or enabled on production routes.** This intentionally does not claim that the three Rainbow games or Mission Planner have started saving to child profiles.

## Reuse — no second score or profile system
- Source is the existing `GarveyActivityBridge` event from game interactions.
- Destination is the existing PostgreSQL `garvey_learning_activity_events` table, which already has `UNIQUE(child_id,event_key)`.
- Use only server-resolved Gates parent session and `gates_child_profiles` canonical ownership. The older youth routes' email/tenant query fallback **must not** be used to authorize learning-history writes.
- The existing `garvey_child_learning_consent` purpose `child_learning_history` is enforced under transaction. The write checks and locks child ownership then locks consent before insertion.
- The controller requires HTTPS origin, JSON content type and session-bound CSRF validation; disabled by default.
- The read path requires caregiver consent and filters **both** child ID and parent-profile ID. Bounded recent event projection contains no essay text or raw answers.
- Events contain task outcome, supports, practice opportunities and an optional bounded reflection. They do not produce a Genius classification or new intelligence score.

## Verification and next gate
Current tests use synthetic caregivers, learner rows, SQL spies and simulated transactions. They verify rejection of wrong child, revoked consent, unauthenticated actor, CSRF failures and duplicate saves. They are **not** an end-to-end browser or production PostgreSQL persistence acceptance test.

Before activation:
1. Wire the proven server-side Gates session resolver and owned-child resolver into an authenticated API router.
2. Ensure the existing parent/caregiver consent flow is provisioned and callable, with an explicit caregiver decision.
3. Wire the server's existing session-bound CSRF verifier and an approved production HTTPS origin. No query-string actor identity.
4. Add the child-selected identity context in the existing parent-controlled page, then connect the bridge's optional `transport(event)` in an authenticated session—**never** accept child ID from an unverified game query parameter.
5. Verify on a staging database: correct child write/readback, replay idempotency, consent withdrawal, cross-parent denial and child switch isolation.
6. Only then expose the parent four-card narrative with accurate evidence count and skill-specific next practice. Lessons 1–7 still require spaced retrieval and assisted/independent distinctions.

Canonical tracker: https://github.com/rdhforeclosureconqueror-sys/garvey/issues/943
