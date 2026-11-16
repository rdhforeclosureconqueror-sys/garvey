# Milestone 2A: Assessment MVP -> Learning Evidence (read-only)

## Existing code audited
- `server/assessmentMvpRoutes.js` authenticates a parent and resolves an owned child before session submission.
- `server/assessmentMvpStore.js` verifies stored session ownership and persists scores in PostgreSQL.
- `assessment-mvp/scoreResponses.js` produces `response_results` with `correct`, `incorrect`, `omitted`, `not_scorable` and `unknown_item` statuses.
- `assessment-mvp/submitAssessmentResponses.js` publishes completed baseline assessment results with skill/package identifiers.
- `learning-science/buildEvidenceEvent.js` (merged PR #932) provides the initial privacy-minimal schema.

## Added in this PR
`learning-science/adaptAssessmentMvpResult.js` converts a **server-provided completed baseline assessment** and authorized, pseudonymous learner context into per-item learning evidence **in memory only**. It:
- preserves actual subject, skill/package ID, task identity, assessment version and grade context;
- distinguishes correct vs incorrect vs omitted/unscorable;
- explicitly records support and modality as unknown (`other`) when source assessment does not report them;
- rejects unknown-item entries and duplicate item identities;
- excludes learner responses and ownership internals;
- creates deterministic event IDs for future idempotent storage;
- refuses reassessment data because independent support and timing are not verified.

## Security: NOT READY FOR LIVE RECORDING
**The `authorizedLearner` option is a caller assertion, not an authorization mechanism.** Never expose the adapter to a browser endpoint or use a client-provided value to satisfy it. A future server integration must invoke the adapter strictly *after* `resolveGatesParentSession`, `resolveOwnedGatesChild`, and session ownership checks using identity derived from the server's trusted database. Use server-secret pseudonymization for learner references, not a plain child ID or child's name. The adapter contains no persistence and does not register an API route.

No frontend changes, database migrations, writes to learner records, or dashboard claims are included in this PR.

## Next PR boundary (Milestone 2B)
1. Determine ownership-safe pseudonymization and lifespan/rotation policy.
2. Audit whether `server/assessmentMvpStore.js` exposes trustworthy item completion timestamps and support metadata.
3. Propose storage with database access control, unique event ID constraints, data retention, parent deletion controls, and consent.
4. Integrate under a disabled-by-default flag; test cross-parent isolation and idempotent retries, then review/merge.
5. Once accepted, render child-specific skill history with no fixed genius or diagnostic labels.

## Education bookmark
**Lesson 8: Emotional and Social Development** is next in the education thread after building out Lessons 1–7.
