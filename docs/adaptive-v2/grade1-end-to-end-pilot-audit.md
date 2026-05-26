# Grade 1 Adaptive V2 End-to-End Pilot Audit

Date: 2026-05-26

Scope reviewed:
- `public/gamehub/adaptive_learning`
- `public/gamehub/adaptive_learning.html`
- `server/adaptiveV2Routes.js`
- `public/gamehub/content/adaptive-v2/grades/grade1/`
- `docs/adaptive-v2/runtime-migration-plan.md`
- `tests/gamehub/*`
- `tests/server*`

## Audit summary

This audit reviewed Grade 1 Adaptive V2 flow coverage from launch through summary and route safety. The current Grade 1 shell is usable as a pilot path, with a complete in-page learning flow (subject/skill selection, lesson snippet, worked example, hint ladder, checkpoint, supportive feedback, and parent-facing profile), plus server-side Grade 1-only progress, summary, candidate Gates signal readout, and voice-safe fallback endpoints.

Two areas should be resolved before expansion work starts:
1. Test suite alignment with current runtime behavior (several legacy assertions now conflict with intentional Grade 1 V2 fetch/persistence behavior and wording).
2. Operational hardening for catalog loading from static hosting configurations that do not expose directory listing.

## End-to-end audit (requested checkpoints)

## 1) Grade 1 launch flow
**What works**
- Grade 1 V2 panel is mounted directly on launch screen and initializes during runtime boot.
- Grade selector in the Grade 1 V2 panel is locked to grade 1.

**What is missing / needs polish**
- Main page header still frames overall shell as grades 1–6 while Grade 1 V2 is the only adaptive-v2 runtime path currently wired in the embedded panel; adding explicit “Grade 1 pilot runtime” context at top-level would reduce ambiguity.

## 2) Subject selection
**What works**
- Subject dropdown supports `math` and `reading-english` and reloads skill list/reactive state on change.

**Needs polish**
- Subject labels are clear but could include short scope hints (e.g., foundational counting, phonics/comprehension) for faster parent/teacher orientation.

## 3) Skill selection
**What works**
- Skill dropdown is generated from paired lesson/checkpoint JSON packages.
- “Start recommended skill” uses local progress recommendation.

**Missing / polish**
- If no skills are found for a selected subject, only a generic empty line is shown; include actionable next steps for content admins.

## 4) Lesson display
**What works**
- Lesson snippet and concept explanation render from lesson package content.

**Needs polish**
- No explicit loading skeleton by section once catalog is loaded; only full-panel loading text exists.

## 5) Worked example display
**What works**
- Worked example includes problem statement + ordered steps.

**Needs polish**
- Could visually emphasize step progression (e.g., step numbers/badges are present via list but minimal guidance text).

## 6) Hint ladder
**What works**
- Three-tier hint ladder renders and supports usage counting.
- Hint usage is persisted via Grade 1 progress write route.

**Needs polish**
- UI does not expose “which hint level used most recently”; this is available conceptually but not surfaced for learner pacing.

## 7) Checkpoint answering
**What works**
- Checkpoint question renders with answer input, check action, and next navigation.
- Correctness evaluation is handled locally and contributes to progress aggregate.

**Needs polish**
- Current answer check is strict lowercase string match; acceptable for pilot but may need normalization improvements for whitespace/format variants.

## 8) Feedback
**What works**
- Supportive feedback messaging is presented for both matched and unmatched answers, with non-punitive language.

**Needs polish**
- Feedback is short and consistent; could optionally include specific worked-example reference for unmatched attempts.

## 9) Persistence
**What works**
- Grade 1 progress posts to `/api/adaptive-v2/progress/checkpoint-attempt` with counters and parent summary snapshot.
- Summary retrieval supports both populated and empty states.
- Grade guardrails enforce Grade 1 + `adaptive_v2` only.

**Needs polish**
- Runtime tests currently include legacy constraints that disallow fetch/network tokens in adaptive page; this now conflicts with intended Grade 1 server-backed persistence.

## 10) Parent summary
**What works**
- Parent summary scaffold includes practiced skills, growth areas, needs-more-practice, mastery bands, next step, and recent activity.
- Empty summary state is explicit and supportive.

**Needs polish**
- In-page local “Current practice profile” and persisted parent summary naming overlap; a clearer distinction could reduce confusion.

## 11) Candidate Gates signal display
**What works**
- Client fetches candidate signals and renders read-only table.
- Empty signal state messaging clearly frames “practice signals” and avoids scoring/final-label framing.
- Server route returns mapped Grade 1 signals without direct Gates table writes.

**Needs polish**
- Add timestamp/source recency note in UI to clarify when signals were last refreshed.

## 12) Voice controls
**What works**
- UI includes listen controls for lesson/example/hints plus stop voice.
- Server voice endpoint restricts allowed sections and blocks unsafe/private text patterns.
- Fallback mode is explicitly browser speech-friendly and readable without voice.

**Needs polish**
- Add inline user-facing indicator if server voice route rejects a request (currently state tracks errors but feedback is minimal).

## 13) Empty states
**What works**
- Catalog loading, missing content, missing parent summary, and empty Gates signals all have explicit user-facing messages.
- Server summary/signals routes return structured empty states.

**Needs polish**
- Subject with zero skills and checkpoint with zero questions should present stronger operational guidance for maintainers.

## 14) Error states
**What works**
- API routes return explicit 400 errors for invalid grade/runtime, invalid voice section, and unsafe text.

**Needs polish**
- UI handling for network failures is partial; additional visible retry/status affordance would improve supportability.

## 15) Existing GameHub/Gates route safety
**What works**
- Grade 1-only guards are enforced in progress + voice routes.
- Candidate Gates route is read-only mapping and tested to avoid writes.
- Server tests verify no prompt/answer leakage and no diagnosis/pass/fail terminology in candidate signal payloads.

**Needs polish**
- Keep regression tests synced with intentional runtime behavior so route safety checks remain high-signal rather than blocked by outdated assumptions.

## What works overall
- End-to-end Grade 1 learning interaction exists and is navigable.
- Content is sourced from Grade 1 lesson/checkpoint packages for math and reading/english.
- Persistence, parent summary, candidate signal readout, and voice-safe fallback endpoints are in place.
- Route-level safeguards for Grade 1 scope and safe voice text handling are implemented.

## What is missing overall
- Test suite updates to reflect current intentional Grade 1 runtime behavior (networked persistence and revised wording).
- Additional robustness for static hosting where directory index parsing (`fetch(dir + '/')`) may not return browsable links.
- Improved user-facing error/retry feedback around network/path failures.

## What needs polish overall
- Clarify top-level runtime framing between broad 1–6 shell language and active Grade 1 pilot path.
- Improve answer normalization for checkpoint input matching.
- Distinguish local profile vs persisted parent summary labels to reduce ambiguity.

## Test commands
- `node --test tests/server-adaptive-v2-routes.test.js`
- `node --test tests/gamehub/pr36-adaptive-content-ux-readiness.test.js`
- `node --test tests/gamehub/adaptive-learning-session-instrumentation.test.js`
- `node --test tests/server-adaptive-v2-routes.test.js tests/gamehub/pr36-adaptive-content-ux-readiness.test.js tests/gamehub/adaptive-learning-session-instrumentation.test.js`

## Pilot readiness perspective
Grade 1 Adaptive V2 is close to pilot-ready as an end-to-end usable flow and already demonstrates core learning-loop, persistence, summary, voice, and candidate signal surfaces.

For a cleaner Grade 1 pilot operation window, complete the following before declaring launch-complete:
1. Align/refresh failing tests to current intended behavior and wording contracts.
2. Harden catalog file discovery for non-directory-listing static deployments.
3. Add visible in-UI retry/status feedback for persistence and signals fetch failures.

## Grade 2 runtime start perspective (after fixes)
After the above fixes are completed and green in CI, it is reasonable to begin Grade 2 runtime work in a controlled branch while preserving the current constraints:
- keep Grade 1-only guards where intended,
- keep candidate signal mapping read-only,
- avoid schema expansion as part of Grade 2 runtime introduction unless separately approved.


## Grade 1 Pilot Hardening Status (2026-05-26)
- ✅ Legacy tests updated to align with server-backed Grade 1 Adaptive V2 persistence and intentional fetch usage.
- ✅ Grade 1 content catalog now loads from explicit manifest (`grade1-artifact-manifest.v1.json`) to avoid directory listing dependency on static hosts.
- ✅ Runtime now surfaces visible retry/status feedback for content load, checkpoint package load, persistence save/load, Gates candidate signal fetch, and voice fallback/rejection.
- ✅ Guardrails re-validated: no raw prompt/answer storage, no Gates scoring writes, no diagnosis/pass-fail language.
- **Readiness:** Grade 1 is pilot-ready.
- **Next step:** Grade 2 runtime can begin per migration plan scope.
