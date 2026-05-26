# Adaptive Learning System V2 — Phase-by-Phase Implementation & Safety Plan

## Scope and non-goals (this report)

This is an **inspection + planning only** document for converting curriculum source folders in:

- `public/gamehub/content/curriculum-source/`

Constraints for upcoming implementation (not done in this report):

- No bulk conversion of all phases at once.
- No runtime wiring before per-phase inspection/validation.
- No tracking enablement.
- No DB/server writes for Adaptive V2 content flow.
- No scoring/diagnosis logic.
- No breakage to existing Adaptive Learning, GameHub routes, or Gates routes.
- No AI voice behavior changes in this stage.

---

## 1) Discovery: curriculum-source phase folders

Found phase folders:

1. `phase-1b`
2. `Phase 2`
3. `Phase 3`
4. `Phase 4`
5. `Phase 5`
6. `Phase 6`
7. `Phase 7A`
8. `Phase 7B`
9. `Phase 8`
10. `Phase 9`
11. `Phase 11`
12. `Phase 12`
13. `Phase 13`
14. `Phase 14`
15. `Phase 15`
16. `Phase 16`
17. `Phase 17`
18. `Phase 18`

**Phase 10 is intentionally absent** in the current source tree (sequence is `Phase 9` → `Phase 11`).

---

## 2) Per-phase inspection summary

Legend for “type fit”:

- ✅ = strong fit
- ⚠️ = partial/likely fit (needs normalization)
- ❌ = not indicated by current source files

### phase-1b

- File count: **12**
- Grade coverage: **Grade 1–6** (math + reading/english skill-graph sources)
- Subject coverage: **Math, Reading/English**
- Content type: **skill graph definitions** (mostly one file per grade/subject)
- Type fit:
  - roadmap/framework: ❌
  - skill graph: ✅
  - lesson layer: ❌
  - guided practice: ❌
  - checkpoint/assessment: ❌
  - question bank: ❌
  - mastery/progress logic: ⚠️ (graph can feed future mastery logic)
  - parent dashboard: ❌
  - teacher/admin layer: ❌
  - AI voice/tutor layer: ❌
  - production/release layer: ⚠️ (foundational content dependency)
- Ready for conversion: **Yes, first-class candidate**
- Needs normalization: **Yes** (filenames/mixed conventions)
- Depends on earlier phases: **No** (acts as prerequisite foundation)

### Phase 2

- File count: **1**
- Grade coverage: **cross-grade architecture doc** (mentions grade examples)
- Subject coverage: **cross-subject architecture scope**
- Content type: **Learn Layer Architecture — V1**
- Type fit:
  - roadmap/framework: ✅
  - skill graph: ⚠️
  - lesson layer: ✅
  - guided practice: ⚠️
  - checkpoint/assessment: ⚠️
  - question bank: ⚠️
  - mastery/progress logic: ⚠️
  - parent dashboard: ❌
  - teacher/admin layer: ❌
  - AI voice/tutor layer: ❌
  - production/release layer: ⚠️
- Ready for conversion: **Yes (schema-planning phase)**
- Needs normalization: **Low** (single architecture file)
- Depends on earlier phases: **Should follow phase-1b extraction**

### Phase 3

- File count: **1**
- Grade coverage: **cross-grade**
- Subject coverage: **cross-subject**
- Content type: **Parent Dashboard + Mastery Map Architecture**
- Type fit:
  - roadmap/framework: ✅
  - skill graph: ⚠️
  - lesson layer: ⚠️
  - guided practice: ❌
  - checkpoint/assessment: ⚠️
  - question bank: ❌
  - mastery/progress logic: ✅
  - parent dashboard: ✅
  - teacher/admin layer: ❌
  - AI voice/tutor layer: ⚠️
  - production/release layer: ⚠️
- Ready for conversion: **Partially (after base schema + skill graph canonicalization)**
- Needs normalization: **Medium**
- Depends on earlier phases: **phase-1b + Phase 2**

### Phase 4

- File count: **1**
- Grade coverage: **cross-grade**
- Subject coverage: **cross-subject**
- Content type: **Teacher Admin Dashboard + Learning Analytics Engine**
- Type fit:
  - roadmap/framework: ✅
  - skill graph: ❌
  - lesson layer: ❌
  - guided practice: ❌
  - checkpoint/assessment: ⚠️
  - question bank: ❌
  - mastery/progress logic: ✅
  - parent dashboard: ⚠️
  - teacher/admin layer: ✅
  - AI voice/tutor layer: ❌
  - production/release layer: ⚠️
- Ready for conversion: **Deferred** (analytics/admin should not introduce tracking now)
- Needs normalization: **Medium**
- Depends on earlier phases: **Phase 2 + Phase 3 + content phases**

### Phase 5

- File count: **1**
- Grade coverage: **cross-grade adaptive engine intent**
- Subject coverage: **cross-subject engine intent**
- Content type: **Adaptive Engine 2.0 — Diamond Brain**
- Type fit:
  - roadmap/framework: ✅
  - skill graph: ⚠️
  - lesson layer: ⚠️
  - guided practice: ⚠️
  - checkpoint/assessment: ⚠️
  - question bank: ⚠️
  - mastery/progress logic: ✅
  - parent dashboard: ⚠️
  - teacher/admin layer: ⚠️
  - AI voice/tutor layer: ⚠️
  - production/release layer: ⚠️
- Ready for conversion: **Deferred to “logic spec only”** (no scoring/diagnosis implementation now)
- Needs normalization: **High**
- Depends on earlier phases: **Phase 2 + phase-1b + production lesson data phases**

### Phase 6

- File count: **1**
- Grade coverage: **cross-grade content process**
- Subject coverage: **cross-subject content process**
- Content type: **Content Factory System — V1**
- Type fit:
  - roadmap/framework: ✅
  - skill graph: ⚠️
  - lesson layer: ✅
  - guided practice: ✅
  - checkpoint/assessment: ⚠️
  - question bank: ✅
  - mastery/progress logic: ⚠️
  - parent dashboard: ❌
  - teacher/admin layer: ⚠️
  - AI voice/tutor layer: ⚠️
  - production/release layer: ✅
- Ready for conversion: **Yes (offline pipeline design)**
- Needs normalization: **Medium**
- Depends on earlier phases: **Phase 2 + phase-1b**

### Phase 7A

- File count: **10**
- Grade coverage: **Grade 1**
- Subject coverage: **Math**
- Content type: **production skill files (number sense, operations, geometry/measurement, data/patterns)**
- Type fit:
  - roadmap/framework: ❌
  - skill graph: ⚠️
  - lesson layer: ✅
  - guided practice: ✅
  - checkpoint/assessment: ⚠️
  - question bank: ⚠️
  - mastery/progress logic: ❌
  - parent dashboard: ❌
  - teacher/admin layer: ❌
  - AI voice/tutor layer: ❌
  - production/release layer: ✅
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **phase-1b + Phase 2 schema decisions**

### Phase 7B

- File count: **10**
- Grade coverage: **Grade 1**
- Subject coverage: **Reading/English**
- Content type: **production skill files (reading foundations/comprehension, language/writing)**
- Type fit: similar to 7A; lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **phase-1b + Phase 2 schema decisions**

### Phase 8

- File count: **10**
- Grade coverage: **Grade 2**
- Subject coverage: **Math**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **7A pattern + shared schema/loader**

### Phase 9

- File count: **10**
- Grade coverage: **Grade 2**
- Subject coverage: **Reading/English**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **7B pattern + shared schema/loader**

### Phase 11

- File count: **10**
- Grade coverage: **Grade 3**
- Subject coverage: **Math**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused from 7A/8**

### Phase 12

- File count: **10**
- Grade coverage: **Grade 3**
- Subject coverage: **Reading/English**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused from 7B/9**

### Phase 13

- File count: **10**
- Grade coverage: **Grade 4**
- Subject coverage: **Math**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused**

### Phase 14

- File count: **10**
- Grade coverage: **Grade 4**
- Subject coverage: **Reading/English**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused**

### Phase 15

- File count: **10**
- Grade coverage: **Grade 5**
- Subject coverage: **Math**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused**

### Phase 16

- File count: **10**
- Grade coverage: **Grade 5**
- Subject coverage: **Reading/English**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused**

### Phase 17

- File count: **10**
- Grade coverage: **Grade 6**
- Subject coverage: **Math**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused**

### Phase 18

- File count: **10**
- Grade coverage: **Grade 6**
- Subject coverage: **Reading/English**
- Content type: **production skill files**
- Type fit: lesson/prod heavy
- Ready for conversion: **Yes**
- Needs normalization: **Low-medium**
- Depends on earlier phases: **schema + loader reused**

---

## 3) Master implementation plan (safe sequencing)

## Recommended execution order

0. **Shared Curriculum Manifest/Index (new pre-phase)**
1. **phase-1b** (skill graph canonicalization)
2. **Phase 2** (learn-layer schema contracts)
3. **Phase 6** (content factory pipeline contracts)
4. **Phase 7A + 7B** (Grade 1 first conversion slice)
5. **Phase 8 + 9** (Grade 2 slice)
6. **Phase 11 + 12** (Grade 3 slice)
7. **Phase 13 + 14** (Grade 4 slice)
8. **Phase 15 + 16** (Grade 5 slice)
9. **Phase 17 + 18** (Grade 6 slice)
10. **Phase 3** (parent/mastery map data contracts only)
11. **Phase 4** (teacher/admin read-only contracts only)
12. **Phase 5** (adaptive logic spec only; no scoring/diagnosis runtime)

> Intentional: keep architecture-only phases that can trigger runtime/data-policy risk (3/4/5) after stable content ingestion scaffolding.

## Per-step template

For each step, implementation should include:

- Input folder (source)
- Output folder (generated canonical artifacts)
- Schema needed
- Loader needed
- Tests needed
- Runtime touchpoints (if any)
- Risk level
- Do-not-proceed checkpoint

### Step 0 — Shared Curriculum Manifest/Index (recommended first build)

- Input: all folders under `public/gamehub/content/curriculum-source/`
- Output: `public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json`
- Schema: `curriculum_index.v1` (phase_id, grade, subject, skill_id, source_file, normalization_status)
- Loader: offline index builder only
- Tests:
  - manifest schema validation
  - duplicate skill id detection
  - missing phase detection (allow explicit gap for Phase 10)
- Runtime touchpoints: none
- Risk: **Low**
- Do not proceed until:
  - all phases registered
  - Phase 10 absence explicitly encoded as allowed gap

### Step 1 — phase-1b skill graph canonicalization

- Input: `.../phase-1b/`
- Output: `public/gamehub/content/adaptive-v2/skill-graphs/`
- Schema: `skill_graph.v1`
- Loader: offline skill-graph parser + normalizer
- Tests: DAG validation, orphan node validation, cross-grade key validation
- Runtime touchpoints: none
- Risk: **Low/Medium**
- Do not proceed until: all grade 1–6 math + reading graphs parse cleanly

### Step 2 — Phase 2 contracts

- Input: `.../Phase 2/`
- Output: `docs/adaptive-v2/schemas/learn-layer-contracts.md` (+ JSON schema stubs)
- Schema: lesson, practice, checkpoint container schemas (structure only)
- Loader: none yet
- Tests: schema lint + fixture validation
- Runtime touchpoints: none
- Risk: **Medium**
- Do not proceed until: schema approved and backward-compatible envelope defined

### Step 3 — Phase 6 content factory contracts

- Input: `.../Phase 6/`
- Output: `scripts/adaptive-v2/` (offline generators/validators)
- Schema: generated lesson package manifest
- Loader: offline conversion CLI only
- Tests: deterministic generation snapshots
- Runtime touchpoints: none
- Risk: **Medium**
- Do not proceed until: deterministic build passes twice with same checksum

### Steps 4–9 — Grade-by-grade production conversion

- Input: each production phase folder pair
- Output: `public/gamehub/content/adaptive-v2/grades/<grade>/<subject>/skills/*.json`
- Schema: `skill_lesson_package.v1`
- Loader: file-system loader (offline + optional read-only runtime adapter later)
- Tests:
  - schema validation
  - required fields present
  - naming normalization
  - no duplicate skill ids
- Runtime touchpoints: optional read-only “dark load” checks only (no route switch)
- Risk: **Low** if isolated by grade slice
- Do not proceed until each grade pair passes validation and smoke checks

### Step 10 — Phase 3 parent/mastery map (contracts only)

- Input: `.../Phase 3/`
- Output: `docs/adaptive-v2/contracts/parent-mastery-map.v1.md`
- Schema: read-only summary projection contract
- Loader: none/runtime stub only
- Tests: contract fixture tests
- Runtime touchpoints: none (no UI wire)
- Risk: **Medium/High** (can bleed into current dashboard)
- Do not proceed until: explicit “no dashboard route mutation” verification passes

### Step 11 — Phase 4 teacher/admin layer (read-only only)

- Input: `.../Phase 4/`
- Output: `docs/adaptive-v2/contracts/teacher-admin.v1.md`
- Schema: read-only analytics payload shape
- Loader: none
- Tests: contract fixtures only
- Runtime touchpoints: none
- Risk: **High** (tracking temptation)
- Do not proceed until: tracking/db write diff check is clean

### Step 12 — Phase 5 adaptive logic spec only

- Input: `.../Phase 5/`
- Output: `docs/adaptive-v2/contracts/adaptive-logic-spec.v1.md`
- Schema: future decision input/output contract placeholders
- Loader: none
- Tests: static policy tests (no scoring implementation)
- Runtime touchpoints: none
- Risk: **High**
- Do not proceed until: explicit confirmation that scoring/diagnosis remains disabled

---

## 4) Safety plan (gate checks before advancing phases)

Before moving from any step N to step N+1, run mandatory checks:

1. **Route stability checks**
   - Existing GameHub playable routes still respond and render.
   - Existing Gates discovery routes still respond.
   - Existing Adaptive Learning launcher path still responds.

2. **Content integrity checks**
   - New/updated Adaptive V2 artifacts pass schema validation.
   - Manifest/index references only existing source files.
   - No duplicate skill IDs; no dangling graph edges.

3. **Generated asset checks**
   - Any generated JSON/artifact passes JSON parse + schema.
   - Deterministic regeneration checksum unchanged (where expected).

4. **Policy guard checks**
   - No new tracking flags enabled.
   - No DB write/query migrations introduced for V2 ingestion.
   - No scoring/diagnosis code paths enabled.
   - No AI voice behavior changes before designated voice phase.

5. **Diff risk checks**
   - Touch-set restricted to planned phase files + docs/scripts.
   - No modifications to existing GameHub/Gates route handlers unless explicitly in a future approved phase.

Suggested automation strategy:

- A single `npm run adaptive-v2:preflight` (future) that aggregates:
  - route smoke tests
  - schema validation
  - policy assertions (no forbidden module imports or write-path calls)

---

## 5) AI voice inspection note (no wiring yet)

Current AI voice functionality is present in youth-development surfaces and routes, not in this new curriculum-source import path yet.

Observed locations:

- Server endpoints and voice service wiring:
  - `server/youthDevelopmentTdeRoutes.js` (`/voice/*` routes and service integration)
- UI controls + playback orchestration + fallback browser speech behavior:
  - `server/youthDevelopmentRoutes.js` (voice controls, fetch to voice endpoints, provider/fallback playback logic)

How Adaptive V2 could eventually connect (future, not now):

- Provide optional **read-only voice-ready text fields** in converted lesson artifacts (e.g., `playable_text_fallback`, `voice_text`), but do not call voice services yet.
- Add a thin adapter later that maps Adaptive V2 lesson sections into existing voice section payload format expected by `/api/youth-development/voice/sections/:childId` patterns (or a sibling endpoint), preserving existing fallback behavior.
- Keep voice provider selection, diagnostics, and playback state handling in current voice modules; avoid duplicating audio orchestration in Adaptive V2.

No AI voice code changes are recommended in current conversion phases.

---

## 6) Recommendation for the next build

**Recommended next build: start with a shared curriculum manifest/index first (before Phase 2 conversion work).**

Reason:

- It de-risks all downstream conversion by establishing canonical phase/grade/subject/skill inventory.
- It safely encodes the intentional Phase 10 gap.
- It enables phased conversion with strict validation gates and no runtime impact.

After manifest/index is stable, proceed to **phase-1b** then **Phase 2**, then first production slice (**Phase 7A/7B**).

---

## Appendix A — quick phase inventory counts

- `phase-1b`: 12 files
- `Phase 2`: 1 file
- `Phase 3`: 1 file
- `Phase 4`: 1 file
- `Phase 5`: 1 file
- `Phase 6`: 1 file
- `Phase 7A`: 10 files
- `Phase 7B`: 10 files
- `Phase 8`: 10 files
- `Phase 9`: 10 files
- `Phase 11`: 10 files
- `Phase 12`: 10 files
- `Phase 13`: 10 files
- `Phase 14`: 10 files
- `Phase 15`: 10 files
- `Phase 16`: 10 files
- `Phase 17`: 10 files
- `Phase 18`: 10 files

---

## Control Layer 0 (new): Shared Curriculum Manifest/Index (required before Phase 2 conversion)

A master index now exists at:

- `public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json`

And is governed by schema:

- `public/gamehub/content/adaptive-v2/schemas/curriculum-index.schema.json`

This manifest is now the **first control layer** before any Phase 2 conversion work. It provides a safe inventory-only map of curriculum-source inputs and explicitly enforces that:

- source discovery is complete and auditable,
- `Phase 10` absence is documented and allowed,
- every referenced source file physically exists,
- no duplicate source entries are present,
- no runtime wiring/tracking/scoring/diagnosis/db behaviors are introduced at this stage.

Validation command:

- `npm run validate:curriculum-index`

Gate policy update:

- **Phase 2 conversion is blocked** unless the curriculum index validator passes.
- Passing this validator means it is safe to proceed to Phase 2 conversion planning/implementation (still without runtime wiring).

---

## Phase 2 contract status update (2026-05-26)

Status: **Completed for planning/contracts only** (no runtime wiring).

Delivered artifacts:
- `docs/adaptive-v2/learn-layer-contracts.md`
- `public/gamehub/content/adaptive-v2/schemas/lesson-package.schema.json`
- `public/gamehub/content/adaptive-v2/schemas/checkpoint.schema.json`
- `public/gamehub/content/adaptive-v2/fixtures/phase-2-contract-examples.json`
- `scripts/adaptive-v2/validate-phase2-contract-fixtures.mjs`

Notes:
- Contracts capture Learn Layer components: mini lesson snippet, worked example, hint ladder, guided practice, checkpoint, feedback hooks, pathway recommendation, and mastery support metadata.
- Artifacts are stub-level and intentionally non-production.
- Production lesson files remain unconverted pending Phase 2 contract sign-off and later per-phase conversion passes.


## Phase 6 contract status update (2026-05-26)

Status: **Completed for planning/contracts only** (no runtime wiring).

Artifacts added:
- `docs/adaptive-v2/content-factory-contracts.md`
- `public/gamehub/content/adaptive-v2/fixtures/phase-6-content-factory-example.json`
- `scripts/adaptive-v2/validate-phase6-content-factory-fixture.mjs`

Key outcomes:
- Formalized intake, normalization, generation, validation, review-flag, deterministic-output, and routing contracts from Phase 6 source intent.
- Added tiny pseudo-output fixture only; no production lesson conversion performed.
- Preserved non-goals: no runtime wiring, no engine logic changes, no tracking/DB writes, no scoring/diagnosis behavior changes.

Remaining before Grade 1 production conversion:
- Finalize deterministic ID and normalization-profile policy.
- Approve routing/misconception vocabularies.
- Execute first controlled conversion pass for `Phase 7A/7B` with review queue and schema validation.
