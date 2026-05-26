# Adaptive V2 Runtime Migration Plan (Architecture Report)

Date: 2026-05-26  
Scope reviewed: `public/gamehub/adaptive_learning`, `public/gamehub/adaptive_learning.html`, `public/gamehub/content/adaptive-v2/`, `curriculum-framework/skill-graphs/`, `server/gatesRoutes.js`, `server/index.js`, `docs/adaptive-v2/*`, `tests/gamehub/*`, `tests/gates/*`

## 0) Executive Summary

Adaptive V2 should become the primary Adaptive Learning runtime for **Grades 1–6**, with **Grade 6 as the bridge grade** and Grades 7–8 removed from active runtime selection (preserved as archived legacy artifacts only).  

This plan intentionally defines architecture and migration sequencing only. It does **not** implement runtime wiring, database writes, or Gates scoring in this phase.

---

## 1) Existing Adaptive Runtime Audit

## 1.1 Current active runtime characteristics

The current adaptive runtime shell (`public/gamehub/adaptive_learning` and mirrored `.html`) is still optimized for legacy middle-school behavior:

- Product language explicitly targets **grades 6–8**.
- Grade selector defaults to 7 and exposes **6/7/8** options.
- Inline fallback question bank contains grade-bucketed Math/English items for 6–8.
- Adaptive difficulty logic hard-caps upward/downward movement to 6–8.
- Session result labels still use scoring/readiness framing from the older pilot experience.
- Session history is local-browser storage only (no server persistence).

## 1.2 Old Grade 6–8 content locations

Legacy/active surfaces:

1. **Inline fallback bank in runtime page**: `QUESTION_BANK` array includes grade 6–8 math and english item IDs (e.g., `m6_*`, `m7_*`, `m8_*`, `e6_*`, etc.).
2. **Runtime selector and adaptive bounds**:
   - Selector includes only 6/7/8.
   - Runtime adaptation uses `Math.min(8, ...)` and `Math.max(6, ...)` behavior.
3. **Grade-band telemetry outputs**:
   - Event payloads currently classify into `middle_6`, `middle_7`, `middle_8` bands.

Archive candidates:

- Legacy inline question-bank payload and grade-band mapping code should move to legacy archive module/files, not primary runtime path.

## 1.3 Old grade selector behavior

Observed behavior:

- Starting grade selector currently shows only 6/7/8.
- Default start grade is 7.
- Goal presets adjust difficulty but are still calibrated against a 6–8 band.

Migration implication:

- New active selector must be constrained to **1–6**.
- New default should likely be grade from launch context when available; fallback to grade 3/4 policy decision.

## 1.4 Old question-bank behavior

Current behavior:

- Runtime boots with inline fallback bank, then may replace via shared content loader (`shared.loadQuestionBank` + adapter mapper) when available.
- Selection algorithm prefers current target grade + difficulty, then grade-only, then difficulty-only, then first remaining candidate.

Reusable pieces:

- Selection cascade itself is reusable.
- Shared-content loader bridge is reusable.

Retire/archive-only pieces:

- Inline 6–8 fallback bank as active source-of-truth.
- Any fallback assumptions that grade universe is only 6/7/8.

## 1.5 Old results behavior

Current behavior:

- End-of-session page provides correctness, accuracy %, “highest reach,” readiness label, strengths/developing/gaps, recommended learning path.
- Includes useful “learning, not labels” note.

Reusable:

- Strength/developing/gap structures.
- Recommended next-step generation pattern.
- Per-skill prerequisite explainers.

Needs refinement:

- Terminology should shift to parent-facing assessment/progress language set (Section 5).
- Retain constructive framing; remove any implied pass/fail interpretation.

## 1.6 Old local storage/history behavior

Current behavior:

- Uses a gamehub-specific local storage key with legacy fallback import.
- Stores session history snapshots entirely client-side.

Reusable:

- Local history object shape can seed initial progress model contracts.

Retire later (not now):

- Client-only history as primary record once server tracking exists.

## 1.7 What to reuse vs retire

### Reuse

- Existing shell/layout and navigation hooks.
- GameHub session adapter event pipeline.
- Question selection/adaptive state machinery.
- Skill-level review component structure.

### Retire/archive-only

- Active 7/8 runtime exposure.
- Legacy 6–8 fallback question bank as default experience.
- Middle-school-only grade-band labels as the canonical telemetry taxonomy.

---

## 2) Adaptive V2 Runtime Target (New Intended Experience)

## 2.1 Scope target

- **Active grades: 1–6 only**.
- **Grade 6 = bridge grade** (top of elementary-to-middle transition band).
- Grades 7–8 remain available only as legacy archived artifacts (non-default, non-active path).

## 2.2 Learning flow target

1. **Learn first** (guided instructional mini-lesson / practice setup).
2. **Checkpoint second** (light assessment checkpoint tied to targeted skill).
3. **Adaptive pathing** based on skill evidence:
   - Continue forward in skill graph,
   - Loop reinforcement,
   - Mini-reteach recommendation.

## 2.3 Skill and path model target

- Grade/subject skill routing should align to `curriculum-framework/skill-graphs/grade1..grade6`.
- Runtime content source-of-truth should be `public/gamehub/content/adaptive-v2/` manifests + grade skill assets.
- Selection should prioritize skill-graph adjacency (prerequisite and next-skill edges), not just grade+difficulty heuristics.

## 2.4 Parent-facing summaries target

Summaries should present:

- what was practiced,
- what evidence was observed,
- growth area(s),
- next recommended skill,
- suggested follow-up practice type.

No shame/pass-fail framing.

---

## 3) Database + Tracking Architecture Plan (Design Only)

## 3.1 Principles

- Minimum necessary data collection.
- Event-level telemetry for product improvement and progress continuity.
- No raw sensitive free-text overcollection.
- Child privacy by design, parent consent gates before persistent writes.

## 3.2 Proposed entities

1. `adaptive_sessions`
   - `session_id`, `child_id`, `started_at`, `ended_at`, `runtime_version`, `grade_context`, `subject_context`, `completion_state`.
2. `adaptive_skill_attempts`
   - per-skill evidence rows with `skill_id`, `checkpoint_id` (nullable), `outcome_band`, `attempt_index`, `duration_band`.
3. `adaptive_checkpoint_attempts`
   - checkpoint-level summary: `checkpoint_id`, `score_band`, `items_seen`, `items_correct`, `recommendation_type`.
4. `adaptive_progress_snapshots`
   - periodic denormalized summary for fast parent views: `current_grade_band`, `active_growth_areas`, `next_recommended_skill`, `updated_at`.

## 3.3 Event write candidates (future)

Write-safe events:

- `adaptive_session_started`
- `adaptive_skill_presented`
- `adaptive_response_submitted`
- `adaptive_checkpoint_completed`
- `adaptive_path_recommended`
- `adaptive_session_completed`

Each event should avoid raw answer text where possible and store normalized IDs + bands.

## 3.4 What should never be written

- Raw free-text child reflections by default (unless explicit consent + clear purpose).
- Full passage content duplication in telemetry tables.
- PII beyond required account linkage.
- Device fingerprinting/hidden identifiers.
- Any “diagnosis-like” inferred labels.

## 3.5 Skill mastery storage model

Use evidence bands, not absolute labels:

- `emerging`, `developing`, `consistent` (example taxonomy).
- Store with recency window + confidence weight derived from repeated attempts.
- Never present as permanent trait.

## 3.6 Parent consent/privacy handling (later phase)

Future controls required before enabling writes:

- parent consent flag/version,
- data retention policy reference,
- clear disclosure of what is stored and why,
- opt-out path for non-essential analytics.

---

## 4) Gates Scoring / Gate Signal Plan (Design Only)

## 4.1 Goal

Adaptive V2 should contribute **developmental practice signals** to Gates, not standalone diagnostic proof.

## 4.2 Candidate signal mapping

Potential mappings (to validate with Gates team):

- Persistence after error (`recovery_after_miss`, continued attempts) → persistence-related Gate signals.
- Practice completion consistency over time → routine/commitment signals.
- Skill progression across prerequisites → learning momentum signal.

## 4.3 What counts as a signal

Counts:

- repeated behavior patterns over multiple sessions,
- completion and return frequency,
- improvement trend bands.

Does not count as proof:

- one session,
- one checkpoint outcome,
- one hard skill area,
- any single low-confidence event.

## 4.4 Guardrails for developmental (not punitive) scoring

- Use floor/ceiling limits so low activity does not heavily penalize.
- Time-decay stale evidence.
- Require minimum evidence threshold before surfacing Gate influence.
- UI copy must state “practice signal,” not “final determination.”

---

## 5) Parent-Facing Language Plan

## 5.1 Preferred terms

- **Assessment**: brief evidence moment in learning.
- **Checkpoint**: targeted skill check after learn/practice.
- **Practice profile**: current pattern of practice evidence.
- **Growth area**: skill area benefiting from more support.
- **Next recommended skill**: immediate suggested instructional next step.

## 5.2 Prohibited/avoid terms

- Pass/fail labels.
- “Deficit,” “disorder,” “diagnosis,” or medicalized phrasing (unless formally approved later).
- Identity framing (“is bad at math”) vs situational evidence framing (“needs support with fraction equivalence this week”).

## 5.3 Example tone rules

- Use “not yet / still building” over “failed.”
- Lead with strengths before growth areas.
- Tie recommendations to concrete next action.

---

## 6) Replacement Strategy (Old Adaptive 6–8 → V2 Runtime)

## 6.1 Strategy summary

1. Archive legacy 6–8 content path and mark as non-active.
2. Keep existing shell where useful to reduce regression risk.
3. Replace active content source with Adaptive V2 grade1–6 manifests/skills.
4. Remove 7/8 from active grade selectors and runtime bounds.
5. Preserve legacy launch path only behind explicit archive/dev toggle (not default GameHub entry).

## 6.2 Safe archive approach

- Move legacy bank/config to clearly named `legacy/` folder or module section.
- Add explicit `legacy_runtime: true` metadata for archive content.
- Ensure production selector and default route never call legacy by accident.

---

## 7) Phased Implementation Plan (PR Sequence)

## PR A — Archive old 6–8 and add V2 runtime selector

- Archive 6–8 active bank/modules.
- Update active selector to grades 1–6.
- Switch runtime config flags from preview semantics to production-intent routing (still no DB writes).
- Add compatibility guard so shell still loads.

**Status (2026-05-26): Completed (shell/range migration only).**
- Active runtime selector now presents grades 1–6 only.
- Visible shell label updated to **“Adaptive Learning V2 — Grades 1–6”**.
- Parent-facing checkpoint copy now states checkpoints are guidance, not pass/fail labels.
- Legacy grade 6–8 fallback content remains in repository but is treated as archive/fallback-only in active runtime filtering.
- No DB writes, tracking enablement, Gates scoring connection, or AI voice wiring added in PR A.

## PR B — Grade 1 V2 runtime

- Wire Grade 1 learn+checkpoint loop from `adaptive-v2` content assets.
- Validate skill graph linkage for grade1 math + reading english.

**Status (2026-05-26): Completed (Grade 1 runtime wiring only, local state).**
- Grade 1 V2 runtime panel added to the active Adaptive shell with subject + skill selection and “start recommended skill” support.
- Grade 1 Math and Reading/English lesson packages and checkpoints now load from `public/gamehub/content/adaptive-v2/grades/grade1/*` at runtime.
- Learner flow supports lesson snippet, worked example, hint ladder, checkpoint response input, supportive feedback messaging, and next-practice recommendation display.
- State for PR B remains local/in-memory in browser runtime flow.
- No DB writes, tracking enablement, Gates scoring connection, AI voice wiring, or Grades 2–6 runtime wiring added in PR B.

## PR C — Local progress model

- Introduce structured local progress contract mirroring future server schema.
- Add migration from legacy history payload shape.

**Status (2026-05-26): Completed (Grade 1 local pilot progress model only).**
- Grade 1 runtime now keeps an in-memory progress object for: current selected skill, checkpoint attempts, correct count, total count, hint usage, local mastery band, and next recommended skill.
- Parent-facing panel now renders **Current practice profile**, **Growing skills**, **Needs more practice**, and **Suggested next step** using constructive language.
- Progress remains local/in-memory only and resets on page reload.
- No DB writes, server persistence, Gates scoring, AI voice wiring, or Grades 2–6 runtime wiring were added in PR C.

## PR D — Database write model (gated/off by default)

- Add server contracts and feature flag scaffolding.
- No writes without explicit consent + config enablement.

## PR E — Gates signal mapping

- Add explicit mapper from adaptive events to gated signal payloads.
- Include minimum evidence thresholds and non-punitive guardrails.

## PR F — Parent summary/reporting

- Parent-facing summary API/view contracts.
- Language compliance pass (assessment/checkpoint/practice profile/growth area terminology).

## Later — AI voice integration

- Only after content/runtime/data contracts stabilize.

---

## 8) Tests Needed

## 8.1 Runtime activation tests

- Old grades 7/8 not in active selector.
- Active selector includes grades 1–6 only.
- Grade 1 runtime boot path loads learn-first then checkpoint-second flow.
- Existing adaptive shell still renders successfully.

## 8.2 Data safety tests

- Database writes are disabled/guarded until enabled by explicit config + consent.
- Tracking payload schema rejects raw sensitive free-text fields.
- Event payloads include IDs/bands only where expected.

## 8.3 Gates integration tests

- Gates mapper only consumes explicit approved adaptive signals.
- Single-session outcomes cannot produce high-confidence gate impact.
- Developmental scoring guardrails enforced (thresholds, decay, floor/ceiling behavior).

## 8.4 Language compliance tests

- Parent summary copy uses approved terms:
  - assessment,
  - checkpoint,
  - practice profile,
  - growth area,
  - next recommended skill.
- No pass/fail strings in parent-facing runtime/reporting surfaces.
- No clinical diagnosis language in adaptive/gates parent summary surfaces.

---

## 9) Decisions required before implementation starts

1. Grade-selector default policy when grade context is missing.
2. Final mastery taxonomy names (`emerging/developing/consistent` vs alternatives).
3. Consent model and retention windows for adaptive telemetry.
4. Exact Gates mapping table ownership and approval process.
5. Legacy archive discoverability (internal only vs parent-visible “legacy”).

---

## 10) Out of Scope Confirmation (This Report)

This report intentionally excludes implementation. No changes are proposed here for:

- runtime wiring execution,
- database writes,
- Gates scoring calculation,
- production event persistence.

