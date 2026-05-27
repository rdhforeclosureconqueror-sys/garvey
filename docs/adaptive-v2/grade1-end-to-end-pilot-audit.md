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



## Multi-question checkpoint session fix (2026-05-26)
- Grade 1 Adaptive V2 checkpoint runtime now supports true multi-question sessions instead of single-question-only behavior per selected skill.
- Session question count respects 10/15/20 selector when enough Grade 1 content is available, and gracefully caps to available questions.
- Question progression now advances as Question 1 of N, 2 of N, etc., with cross-skill pull within the selected Grade 1 subject to reduce repeated prompts.
- Runtime avoids unnecessary repeats by preferring unseen checkpoint question IDs before reusing previously seen items.
- Session completion renders a supportive summary with aggregate-only progress (attempts, correct/total, hints, mastery band, next recommended skill).
- No Grade 2 runtime was introduced; no new Gates scoring writes were added; AI voice provider behavior remains unchanged; raw prompt/answer text is still not persisted.

## Checkpoint runtime format update (2026-05-26)
- Grade 1 checkpoint runtime now defaults to multiple-choice rendering when `choices` or `options` are present on a checkpoint question.
- If a checkpoint question does not include `choices`/`options`, runtime preserves typed-answer fallback behavior.
- Answer checking now accepts selected choice value through the same correctness comparison pathway used for typed inputs.
- Persistence remains aggregate-only (`isCorrect` + counters) and does not store raw selected answer text.
- This update keeps supportive feedback language and does not introduce Gates scoring writes or pass/fail framing.

## Grade 1 checkpoint option backfill policy (2026-05-27)
- Scope: Grade 1 checkpoint artifacts under `public/gamehub/content/adaptive-v2/grades/grade1/**.checkpoint.v1.json`.
- Policy: preserve existing `choices`/`options`; for missing sets, backfill 3–4 age-appropriate multiple-choice options with exactly one correct answer.
- Generated option metadata now required per backfilled question:
  - `generated_options: true`
  - `option_generation_source: "grade1_checkpoint_backfill"`
- Runtime behavior remains unchanged in safety terms:
  - use multiple-choice UI whenever `choices`/`options` exist,
  - keep typed input as fallback only when options are not present,
  - do not persist raw selected answer text.
- Backfill inspection report:
  - checkpoint questions inspected: **60**
  - questions that already had options: **0**
  - questions backfilled with options: **60**
  - questions needing manual review: **0**

## Start Session runtime-path correction (2026-05-27)
- Confirmed root cause: Start Session previously used legacy runtime question sourcing (`QUESTION_BANK` path), which included Grade 6 “Identify the main idea” items.
- Correction shipped:
  - Grade 1 Start Session now sources questions from Grade 1 Adaptive V2 checkpoint artifacts.
  - Question rendering remains the main session UI (`Question X of N`, answer choices, check, next, results).
  - Grade 1-only enforcement for this path prevents Grade 6 legacy prompts from appearing in Grade 1 sessions.
- Safety constraints preserved:
  - No DB schema changes.
  - No Gates scoring writes introduced.
  - Aggregate progress persistence only; no raw prompt/answer text writes.
  - Supportive results language retained and old prerequisite framing softened.
