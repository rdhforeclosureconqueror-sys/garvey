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

## PR E — Grade 1 persistence baseline

- Grade 1-only persistence contracts for checkpoint-attempt write + summary read.
- No Gates scoring writes or mapper activation in PR E.

## PR F — Parent summary/reporting

- Parent-facing Grade 1 persisted summary UI + API contract usage.
- Language compliance pass (Current practice profile, Growth areas, Recommended next step, Recent practice activity).

**Status (2026-05-26): Completed (Grade 1 parent-facing persisted summary only).**
- Runtime now renders persisted parent summary fields: practiced skills, growth areas, needs more practice, current mastery bands, recommended next step, recent practice activity, and last updated timestamp.
- Summary route response includes `parent_summary` and `summary_contract_version=pr_f_v1` for Grade 1 only.
- Empty-state UI copy renders when no saved Grade 1 progress is present.
- No Gates scoring writes, AI voice changes, Grades 2–6 persistence, or raw prompt/answer storage added in PR F.

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



## 11) PR D Persistence Planning (Design-Only, No Writes Yet)

Date: 2026-05-26  
Intent: finalize Adaptive V2 Grade 1 persistence model and write contracts **before** enabling any storage writes.

### 11.1 Existing storage patterns reviewed

- **Gates profile ownership model:** uses `gates_parent_profiles` + `gates_child_profiles` with parent-child ownership checks in routes before reading/writing progress.
- **Gates progress model:** stores canonical per-key progress in `gates_progress.progress_value` (JSONB) and append-only history in `gates_practice_logs.payload` (JSONB), with parent/child and key indexes.
- **Auth/session linking model:** server resolves parent auth session, then scopes all reads/writes to owned `child_id`.
- **Adaptive runtime (current PR C):** keeps Grade 1 progress in local in-memory object only (checkpoint attempts, correct/total, hint usage, local mastery band, next recommended skill), with no server write path.

PR D should follow these proven patterns: ownership-scoped records, one canonical summary row per key, optional append-only event trail, and JSON payloads only for structured data.

### 11.2 Proposed Adaptive V2 persistence schema

All tables below are **design contracts only** for PR D documentation. Implementation and writes stay disabled.

1. `adaptive_v2_sessions`
   - Purpose: learner/session envelope and runtime context.
   - Columns:
     - `id BIGSERIAL PRIMARY KEY`
     - `session_id TEXT NOT NULL UNIQUE` (runtime-generated stable session id)
     - `parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL`
     - `child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE CASCADE`
     - `learner_id TEXT NOT NULL` (non-PII runtime learner key; can mirror child id token)
     - `grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6)`
     - `subject TEXT NOT NULL`
     - `runtime_version TEXT NOT NULL`
     - `started_at TIMESTAMPTZ NOT NULL`
     - `ended_at TIMESTAMPTZ`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Indexes:
     - `(parent_id, child_id, started_at DESC)`
     - `(child_id, created_at DESC)`

2. `adaptive_v2_skill_progress`
   - Purpose: canonical upsert row for current per-skill aggregate progress.
   - Natural key: `(child_id, grade, subject, skill_id)`.
   - Columns:
     - `id BIGSERIAL PRIMARY KEY`
     - `parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL`
     - `child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE CASCADE`
     - `grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6)`
     - `subject TEXT NOT NULL`
     - `skill_id TEXT NOT NULL`
     - `checkpoint_attempts INTEGER NOT NULL DEFAULT 0`
     - `correct_count INTEGER NOT NULL DEFAULT 0`
     - `total_count INTEGER NOT NULL DEFAULT 0`
     - `hint_usage_count INTEGER NOT NULL DEFAULT 0`
     - `local_mastery_band TEXT NOT NULL DEFAULT 'emerging'`
     - `next_recommended_skill_id TEXT`
     - `last_session_id TEXT`
     - `first_evidence_at TIMESTAMPTZ`
     - `last_evidence_at TIMESTAMPTZ`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Constraints:
     - `UNIQUE (child_id, grade, subject, skill_id)`
     - `CHECK (checkpoint_attempts >= 0 AND correct_count >= 0 AND total_count >= 0 AND hint_usage_count >= 0)`
     - `CHECK (correct_count <= total_count)`
     - `CHECK (local_mastery_band IN ('emerging','developing','consistent'))`

3. `adaptive_v2_checkpoint_attempts`
   - Purpose: append-only attempt ledger for audit/debug and trend views.
   - Columns:
     - `id BIGSERIAL PRIMARY KEY`
     - `attempt_id TEXT NOT NULL UNIQUE`
     - `session_id TEXT NOT NULL`
     - `parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL`
     - `child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE CASCADE`
     - `grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 6)`
     - `subject TEXT NOT NULL`
     - `skill_id TEXT NOT NULL`
     - `checkpoint_id TEXT`
     - `attempt_index INTEGER NOT NULL`
     - `is_correct BOOLEAN NOT NULL`
     - `hint_used BOOLEAN NOT NULL DEFAULT FALSE`
     - `mastery_band_after TEXT`
     - `next_recommended_skill_id TEXT`
     - `occurred_at TIMESTAMPTZ NOT NULL`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Indexes:
     - `(child_id, skill_id, occurred_at DESC)`
     - `(session_id, occurred_at ASC)`

4. `adaptive_v2_parent_summaries`
   - Purpose: parent-visible denormalized summary snapshots (read optimized).
   - Natural key: `(child_id, summary_key)`.
   - Columns:
     - `id BIGSERIAL PRIMARY KEY`
     - `parent_id BIGINT REFERENCES gates_parent_profiles(id) ON DELETE SET NULL`
     - `child_id BIGINT REFERENCES gates_child_profiles(id) ON DELETE CASCADE`
     - `summary_key TEXT NOT NULL` (for example: `grade1:math:latest`)
     - `summary_payload JSONB NOT NULL DEFAULT '{}'::jsonb`
     - `generated_from_session_id TEXT`
     - `generated_at TIMESTAMPTZ NOT NULL`
     - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
     - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
   - Constraints:
     - `UNIQUE (child_id, summary_key)`

### 11.3 Field mapping from PR C local progress to PR D schema

- `grade1V2State.progress.checkpointAttempts` → `adaptive_v2_skill_progress.checkpoint_attempts`
- `grade1V2State.progress.correctCount` → `adaptive_v2_skill_progress.correct_count`
- `grade1V2State.progress.totalCount` → `adaptive_v2_skill_progress.total_count`
- `grade1V2State.progress.hintUsage` → `adaptive_v2_skill_progress.hint_usage_count`
- `grade1V2State.progress.localMasteryBand` → `adaptive_v2_skill_progress.local_mastery_band`
- `grade1V2State.progress.nextRecommendedSkill` → `adaptive_v2_skill_progress.next_recommended_skill_id`
- Per-checkpoint submit action in runtime → one row in `adaptive_v2_checkpoint_attempts`

### 11.4 Do-not-store rules (hard requirements)

1. **No raw typed free text by default.**
   - Do not persist open text answer input from checkpoint boxes unless an explicit approved policy/version says otherwise.
   - Persist normalized booleans/counts/IDs only (`is_correct`, `hint_used`, `skill_id`, timestamps).

2. **No clinical/diagnosis labeling.**
   - Never store fields implying diagnosis, disorder, deficit classification, or medicalized category.

3. **No shame/pass-fail identity labels.**
   - No persisted status values such as `failed`, `bad student`, `low ability`.
   - Use supportive mastery bands only (`emerging/developing/consistent`) and situational evidence framing.

4. **No unnecessary prompt/answer text duplication.**
   - Do not store full prompt copy, passage text, or answer strings in persistence tables.
   - Reference content by IDs (`skill_id`, `checkpoint_id`, item id if needed later).

### 11.5 API route plan (contracts only; writes disabled)

PR D may introduce route contracts + validation behind feature gates, but must keep effective writes off.

Proposed endpoints:

- `POST /api/adaptive-v2/progress/session/start`
  - Validates child ownership + payload shape.
  - Returns `session_id` and `write_enabled: false` until later enablement.

- `POST /api/adaptive-v2/progress/checkpoint-attempt`
  - Validates IDs/count-safe fields only.
  - In PR D behavior: can dry-run validation and return accepted schema echo; no DB mutation.

- `GET /api/adaptive-v2/progress/summary/:childId`
  - Returns latest parent-visible summary (or empty scaffold) using approved language contract.

Gating requirements before any write path is live:

- global feature flag (example `ADAPTIVE_V2_PROGRESS_WRITE_ENABLED=false` by default),
- explicit parent consent/version check,
- ownership check (`parent_id` owns `child_id`),
- payload-level denylist for prohibited fields.

### 11.6 Tests required before enabling writes

1. **Schema + migration tests**
   - New tables/constraints/indexes exist as designed.
   - Unique keys prevent duplicate per-skill canonical rows.

2. **Guardrail tests (writes still off)**
   - With write flag off, route calls do not mutate DB and return explicit non-write state.
   - Consent missing/invalid blocks write intent.

3. **Validation/privacy tests**
   - Payloads containing raw free text fields are rejected/sanitized.
   - Payloads containing prohibited clinical/pass-fail labels are rejected.
   - `correct_count > total_count` rejected.

4. **Ownership/auth tests**
   - Parent cannot access/update another parent’s child progress scope.
   - Unauthenticated calls are rejected.

5. **Contract consistency tests**
   - Local PR C progress keys map 1:1 to API payload contract fields.
   - Parent summary response uses approved terms only (`assessment`, `checkpoint`, `practice profile`, `growth area`, `next recommended skill`).

### 11.7 Explicit non-goals reaffirmed for PR D

- No runtime behavior changes.
- No database writes enabled.
- No adaptive tracking turned on.
- No Gates scoring integration.
- No AI voice integration.
- No Grades 2–6 wiring.

### 11.5 PR E implementation status (2026-05-26)

PR E enables **controlled Grade 1 Adaptive V2 persistence only**.

Activated:
- `POST /api/adaptive-v2/progress/checkpoint-attempt`
- `GET /api/adaptive-v2/progress/summary/:childId`
- Database tables for Grade 1 Adaptive V2 progress snapshots and checkpoint attempt logs.
- Runtime restore flow for previously practiced Grade 1 Adaptive V2 skills, counters, mastery band, and next recommendation.

Safety/constraints enforced:
- Grade 1 only (`grade='1'`) and runtime version `adaptive_v2` only.
- No Gates scoring writes, no Gates contribution mapping, no AI voice writes.
- No raw checkpoint prompt/answer text persisted.
- No diagnostic/clinical/pass-fail labels introduced in persistence payloads.
- Additive-only rollout with route-level guards to preserve rollback ability.


## 12) PR G — Adaptive V2 Grade 1 → Gates Signal Planning (Design-Only)

Date: 2026-05-26  
Intent: define **planning contracts only** for how Grade 1 Adaptive V2 progress can inform Gates developmental signals.  
Non-goals in PR G: no Gates scoring implementation, no new Gates writes, no Adaptive runtime behavior changes.

### 12.1 Existing Gates signal/scoring architecture (as reviewed)

- Gates assessment scoring (`gates/gatesScoring.js`) is currently survey-answer based and computes per-gate normalized stage bands from weighted response options.
- Gates practice signal architecture (`gates/gatePracticeSignalSchema.js` + `docs/gate-practice-signal-architecture.md`) defines developmental-only event examples, safety guardrails, and forbidden metrics/language.
- Gates practice registry (`gates/gatesPracticeGameRegistry.js`) maps games to supported gate keys and parent-facing observation prompts.
- Adaptive Grade 1 progress persistence (`server/adaptiveV2Routes.js`) currently stores Grade 1 aggregates and checkpoint-attempt rows, but has no runtime mapper into Gates.

### 12.2 Proposed mapping: Adaptive Grade 1 progress → developmental Gates signals

Adaptive evidence should map into **signal candidates** (not score outputs) aligned with target gate themes:

1. **Persistence after challenge**
   - Candidate source evidence: repeated attempts after misses; continuing through checkpoint completion.
   - Proposed gate alignment: `discipline`, `repair` supportive signals.

2. **Attention/focus through lesson + checkpoint**
   - Candidate source evidence: lesson-to-checkpoint follow-through within a session; checkpoint completion without abandoning flow.
   - Proposed gate alignment: `attention` supportive signals.

3. **Discipline/consistency**
   - Candidate source evidence: return sessions over time; sustained skill-practice completion across sessions.
   - Proposed gate alignment: `discipline` supportive signals.

4. **Truth/learning accuracy**
   - Candidate source evidence: mastery trend band changes across multiple checkpoint attempts (never a single-score interpretation).
   - Proposed gate alignment: `truth` supportive signals.

5. **Repair/recovery after missed checkpoints**
   - Candidate source evidence: re-attempt behavior and next-step follow-through after misses.
   - Proposed gate alignment: `repair` supportive signals.

### 12.3 What must NOT count as Gates evidence

The mapper must explicitly reject these as standalone evidence:

- one missed question,
- raw score alone,
- one session alone,
- clinical diagnosis framing,
- pass/fail judgment language.

### 12.4 Safe aggregate signal proposal (Grade 1 only)

PR G planning proposes a lightweight aggregate envelope generated from existing Grade 1 fields:

- `skill_practice_completion_band`
  - derived from completed skill/checkpoint flow frequency over a rolling window.
- `checkpoint_attempt_count_band`
  - bucketed attempt-count range (for example: `early`, `building`, `established`).
- `hint_usage_band`
  - bucketed hint usage (for example: `low`, `moderate`, `high`) without punitive interpretation.
- `mastery_band_trend`
  - trend descriptor from repeated `emerging/developing/consistent` evidence.
- `repeated_practice_flag`
  - indicates whether return practice occurred across multiple sessions/days.
- `next_step_follow_through_band`
  - indicates how often recommended-next-skill actions were followed.

All outputs remain descriptive “practice signal candidates,” never diagnostic labels.

### 12.5 API/data-flow plan (no implementation yet)

Planned flow contract:

1. Adaptive runtime continues current Grade 1 writes to Adaptive tables/routes only.
2. A future **read-only mapper job/function** (server-side) reads Adaptive Grade 1 aggregates by `child_id`.
3. Mapper computes safe aggregate bands and emits an in-memory `adaptive_gate_signal_candidates` object.
4. Gates routes can optionally read this object for preview/reporting once approved.
5. No write-back to Gates scoring/progress tables until dedicated implementation PR and governance sign-off.

Recommended future payload shape (design only):

```json
{
  "child_id": "<id>",
  "runtime_version": "adaptive_v2",
  "grade": 1,
  "evidence_window_days": 14,
  "signals": {
    "persistence_after_challenge": { "band": "building", "confidence": "early" },
    "attention_focus_followthrough": { "band": "consistent", "confidence": "medium" },
    "discipline_consistency": { "band": "building", "confidence": "early" },
    "truth_learning_accuracy": { "band": "developing", "confidence": "early" },
    "repair_recovery": { "band": "building", "confidence": "early" }
  },
  "guardrails": {
    "single_session_not_sufficient": true,
    "no_pass_fail_language": true,
    "non_diagnostic_only": true
  }
}
```

### 12.6 Tests required before implementation

Pre-implementation tests should be added first (red/contract tests), including:

1. **Mapper evidence-threshold tests**
   - verify single session/single miss cannot produce elevated confidence.

2. **Forbidden-evidence exclusion tests**
   - verify raw score-only payloads are rejected for signal generation.

3. **Banding contract tests**
   - verify stable bucket mapping for attempts, hints, mastery trend, and follow-through.

4. **Language safety tests**
   - verify output copy/tokens exclude diagnosis and pass/fail terms.

5. **No-write guarantee tests**
   - verify PR G planning path does not insert/update Gates scoring/progress records.

6. **Grade-scope tests**
   - verify mapper scope remains Grade 1 only; Grades 2–6 persistence remains disabled.

### 12.7 Registry/docs alignment updates required in implementation PR (not this PR G plan)

- Extend gates signal docs/registry metadata with Adaptive V2 as a `tracking_ready: false` source until scoring integration is formally enabled.
- Keep all GameHub and Gates summaries explicitly developmental, non-diagnostic, and non-pass/fail.
- Preserve current disclaimer contracts in Gates practice docs and game registry.


## 13) PR H — Adaptive V2 Grade 1 Candidate Gates Signal Mapper (Read-Only)

Date: 2026-05-26  
Intent: implement a **read-only** mapper that converts persisted Grade 1 Adaptive V2 progress into candidate Gates-aligned developmental signals.  
Non-goals in PR H: no Gates scoring, no Gates database writes, no child ranking, and no diagnosis/pass-fail outputs.

### 13.1 Implemented scope

- Added a Grade 1-only read mapper that transforms persisted Adaptive V2 progress aggregates into candidate signal entries with:
  - gate key + gate name
  - signal category
  - confidence band
  - supporting aggregate only
  - `source: adaptive_v2_grade1`
- Added optional read-only route: `GET /api/adaptive-v2/gates-signals/:childId`.
- Route performs read queries only against `adaptive_v2_skill_progress` and returns empty-state payload when no Grade 1 record exists.

### 13.2 Guardrails preserved

- No writeback to Gates tables or scoring records.
- No raw prompts/answers in mapper output.
- Grade 1-only persistence guard remains unchanged on checkpoint attempt writes.
- Output remains developmental candidate mapping only (not official Gates score output).
- Grades 2–6 persistence and mapper activation remain disabled.


## 14) PR I — Parent-Facing Display of Read-Only Adaptive V2 Grade 1 Candidate Gates Signals

Date: 2026-05-26  
Intent: surface Grade 1 Adaptive V2 candidate Gates signals in parent-facing UI as read-only guidance.

### 14.1 Implemented scope

- Adaptive Learning Grade 1 panel now fetches candidate signals from `GET /api/adaptive-v2/gates-signals/:childId`.
- Added parent-facing section title: **Possible Gates Practice Signals**.
- Added display fields:
  - gate name,
  - signal category,
  - confidence band,
  - supporting aggregate summary.
- Added safety copy: “These are practice signals, not scores, grades, or diagnoses.”
- Added empty state copy: “Complete a few practice checkpoints to see possible practice signals.”

### 14.2 Guardrails preserved

- Read-only display only; no Gates scoring/writeback added.
- No Gates database schema/field updates.
- No child ranking outputs.
- No diagnosis or pass/fail framing.
- No raw prompt/answer leakage in the parent-facing candidate signals section.
- Grades 2–6 persistence remains disabled.

## 15) PR J — Adaptive V2 Grade 1 AI Voice Integration Planning (Design-Only, Report)

Date: 2026-05-26  
Intent: define how Adaptive V2 Grade 1 can connect to the existing AI voice system **without implementing voice wiring yet**.

Non-goals in PR J: no AI voice implementation, no voice route changes, no provider behavior changes, no Gates scoring changes, no Grades 2–6 runtime enablement, and no diagnosis/pass-fail language.

### 15.1 Existing voice routes/services inventory (repo audit)

Current reusable voice infrastructure already exists in two patterns:

1. **Assessment voice router (generic provider-audio + fallback pattern)**
   - Route family: `/api/assessment/voice/*`.
   - Core behaviors:
     - provider-preferred `POST /section` synthesis via upstream `/speak`,
     - browser fallback mode when upstream unavailable,
     - short-lived stream token cache (`/stream/:token`),
     - config + warmup readiness endpoints.
   - Key characteristics to reuse for Adaptive V2:
     - optional/non-blocking voice,
     - explicit `voice_mode` (`provider_audio` vs `fallback_browser_speech`),
     - narrow `voice_text` payload surface,
     - route diagnostics that do not require exposing private content.

2. **Youth-development/TDE voice stack (voice-ready content registry + status surfaces)**
   - Route families: `/api/youth-development/voice/*` and `/api/youth-development/tde/voice/*`.
   - Service pattern includes:
     - voice-ready chunk registration (`voice_text`, `voice_chunk_id`, `voice_ready`),
     - per-child readiness/status endpoints,
     - optional gateway/provider delivery with fallback,
     - voice analytics/pilot visibility that remain additive and non-blocking.
   - Key characteristics to reuse for Adaptive V2:
     - readable-without-voice guarantee,
     - playback diagnostics and availability status,
     - section-level voice content model rather than full-report monoliths.

Conclusion from audit: Adaptive V2 Grade 1 can connect using existing architecture conventions (provider optionality + fallback + chunked voice-safe text) without introducing new provider behavior.

### 15.2 Adaptive V2 Grade 1 text surfaces that are voice-ready candidates

For Grade 1 runtime, these content units are appropriate for future voice rendering (as short section-level blocks):

1. **Lesson snippet**
   - One concise instructional explanation for current skill.
2. **Worked example**
   - One step-by-step short model example.
3. **Hints**
   - Micro-hints (one idea at a time), not long paragraphs.
4. **Checkpoint instructions**
   - Clear “what to do now” prompt text.
5. **Supportive feedback**
   - Growth-oriented acknowledgment and gentle next-action cue.
6. **Next practice recommendation**
   - Simple “try this next” suggestion tied to selected skill.
7. **Parent summary (optional)**
   - Short family-facing recap suitable for read-aloud when present.

All items remain text-first in PR J planning; voice is future additive playback only.

### 15.3 Voice-safe text contract for Adaptive V2 Grade 1 (proposed)

Adaptive V2 should adopt a strict voice-safe contract before wiring any endpoint:

1. **No raw private data**
   - Do not place raw personal identifiers, account metadata, or sensitive free-text into voice payload fields.
2. **No unnecessary child identity in voice payloads**
   - Voice text blocks should be identity-minimized; avoid unnecessary naming inside spoken strings.
3. **No diagnosis/pass-fail framing**
   - Use developmental, supportive language only.
4. **Short readable sections**
   - Section-level chunks only; avoid large narrative blobs.
   - Prefer single-purpose strings for readability and replay.
5. **Readable-without-voice requirement**
   - Voice content must remain equivalent to on-screen text; voice never required for progression.
6. **Fallback-first resilience**
   - If provider/gateway unavailable, browser speech fallback remains acceptable with no core flow blocking.

Suggested canonical payload shape for later implementation planning:

- `surface` (e.g., `adaptive_v2_grade1`)
- `section_key` (e.g., `lesson_snippet`, `worked_example`, `hint_1`, `checkpoint_instruction`, `supportive_feedback`, `next_practice`, `parent_summary`)
- `voice_text` (sanitized, short, identity-minimized)
- `voice_chunk_id` (deterministic chunk id)
- `voice_ready` (boolean)
- `readable_without_voice` (always true)

### 15.4 Endpoint strategy recommendation

Recommendation: **add a sibling Adaptive V2 voice endpoint in a future implementation PR, while reusing existing internal voice patterns and fallback behavior**.

Rationale:

- Reusing the existing assessment route directly would work technically, but a sibling endpoint gives clearer ownership, safer contract evolution, and explicit Adaptive scoping.
- Changing existing youth/assessment voice routes is unnecessary and out-of-scope; sibling route avoids regression risk.
- Client-side browser speech only is viable as temporary bootstrap, but it loses provider-readiness observability and route-level diagnostics already proven in current voice stacks.

Planned direction (future PR, not implemented here):

- New route family concept: `/api/adaptive-v2/voice/*` (sibling).
- Internally reuse established patterns:
  - provider-preferred + fallback mode,
  - section/chunk text model,
  - status/config endpoint for voice availability,
  - non-blocking behavior with `readable_without_voice=true`.

### 15.5 Pre-implementation test plan (required before voice wiring)

Before any implementation, add/extend tests to lock the contract:

1. **Route contract tests (Adaptive sibling endpoint)**
   - config/status endpoint returns availability + fallback metadata.
   - section synthesis endpoint returns provider mode or fallback mode deterministically.

2. **Voice-safe content tests**
   - only approved `section_key` values accepted for Grade 1 voice payloads.
   - `voice_text` length/readability constraints enforced.
   - payload rejects/normalizes forbidden diagnosis/pass-fail language patterns.

3. **Privacy/identity minimization tests**
   - no raw child private fields echoed in response body.
   - no unnecessary identity leakage in diagnostics fields.

4. **Fallback/non-blocking tests**
   - provider/gateway outage results in `fallback_browser_speech` (or equivalent fallback mode), never a blocked adaptive lesson/checkpoint flow.

5. **Grade scope tests**
   - Grade 1-only runtime scope remains enforced for Adaptive V2 voice rollout.
   - Grades 2–6 voice runtime remains disabled.

6. **Regression tests (no unrelated behavior drift)**
   - no changes to existing voice route contracts,
   - no Gates scoring changes,
   - no adaptive checkpoint persistence contract regressions.

### 15.6 PR J output summary

This PR J update is documentation-only planning that:

- audits existing AI voice routes/services,
- defines Grade 1 Adaptive voice-ready text surfaces,
- specifies a voice-safe text contract,
- recommends sibling Adaptive V2 voice endpoints over modifying existing routes,
- and enumerates required tests before any voice implementation.

No runtime voice wiring or route/provider implementation is included in PR J.

### 15.8 PR K implementation status (2026-05-26)

PR K implements **Grade 1 Adaptive V2 voice support only** using the PR J guardrails.

Delivered:
- Added sibling route: `POST /api/adaptive-v2/voice/sections`.
- Enforced Grade 1 + `adaptive_v2` runtime guard.
- Enforced section allowlist for voice-safe blocks only:
  - `lesson_snippet`
  - `worked_example`
  - `hints`
  - `checkpoint_instructions`
  - `supportive_feedback`
  - `next_practice_recommendation`
- Added short-text sanitation and unsafe/private text rejection for voice payloads.
- Added Grade 1 runtime UI controls:
  - Listen to lesson
  - Listen to example
  - Listen to hint
  - Stop voice
- Kept voice non-blocking with browser speech fallback behavior.
- Runtime now shows clear Grade 1 voice status copy: “Voice is starting…”, “Voice is playing.”, “Voice unavailable in this browser. Please read the text on screen.”, and “Voice stopped.”
- When voice route responds with `voice_mode: fallback_browser_speech`, the client immediately invokes `speechSynthesis.speak(...)` from the same button click path.

Confirmed constraints:
- No changes to existing assessment or youth-development voice routes.
- No voice provider behavior changes.
- No Gates scoring added.
- No Grades 2–6 voice runtime wiring.
- No diagnosis or pass/fail language introduced in voice pathing.


## Multi-question checkpoint session fix (2026-05-26)
- Grade 1 Adaptive V2 checkpoint runtime now supports true multi-question sessions instead of single-question-only behavior per selected skill.
- Session question count respects 10/15/20 selector when enough Grade 1 content is available, and gracefully caps to available questions.
- Question progression now advances as Question 1 of N, 2 of N, etc., with cross-skill pull within the selected Grade 1 subject to reduce repeated prompts.
- Runtime avoids unnecessary repeats by preferring unseen checkpoint question IDs before reusing previously seen items.
- Session completion renders a supportive summary with aggregate-only progress (attempts, correct/total, hints, mastery band, next recommended skill).
- No Grade 2 runtime was introduced; no new Gates scoring writes were added; AI voice provider behavior remains unchanged; raw prompt/answer text is still not persisted.

## Runtime cutover update (2026-05-27)
- Main learner **Start Session** flow in `public/gamehub/adaptive_learning` is now the active Grade 1 Adaptive V2 runtime path.
- Root cause of prior mismatch: the start button continued to call `startSession(...)` against `filterBank(...)` / `QUESTION_BANK` (legacy 6–8 source), while Grade 1 V2 lived in a separate checkpoint panel.
- Cutover behavior:
  - Grade 1 start sessions map directly from Grade 1 Adaptive V2 checkpoint artifacts into the primary session UI.
  - Question count selection (10/15/20) remains preserved.
  - Legacy 6–8 content remains archived in-repo and is not deleted, but is disabled from the active Grade 1 runtime path.
- Learner-facing panel update:
  - Separate Grade 1 checkpoint panel is now internal/dev-only (hidden from runtime start experience).

---

## 9) Runtime Wiring Addendum (2026-05-27)

### 9.1 Lesson hub launch path

- Canonical lesson hub route: `/gamehub/adaptive-v2-hub.html`.
- This hub is now the shared launch surface from Youth Development/Gates and Rite of Passage child profile/dashboard surfaces.

### 9.2 Grade behavior

- Grade list exposes 1–6.
- Grade 1 is active and routes to the existing Grade 1 Adaptive V2 learn/start flow.
- Grades 2–6 are explicitly marked “coming soon” and return no broken-state runtime actions.

### 9.3 Mapping metadata contract

Adaptive lesson skills may map to these development areas:

1. Focus & Self-Control
2. Curiosity & Love of Learning
3. Creativity & Idea Thinking
4. Thinking & Problem Solving
5. Effort & Resilience
6. Learning From Feedback
7. Interests & Passion Areas

Secondary mapping is allowed to Gates and Rite of Passage areas as optional signal overlays. Adaptive Learning remains school-skill-based and should not be treated as the Rite of Passage assessment/book system.
