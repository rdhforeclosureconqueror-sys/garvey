# Adaptive Grades 1–6 Real Handoff Compatibility Audit

## Executive summary
This audit compares the **Grades 1–6 curriculum handoff** against the current Adaptive Learning runtime to identify what integration work is still required.

Source-of-truth handoff file:
- `docs/adaptive-grades-1-6-curriculum-handoff.md`

Runtime and content references:
- `public/gamehub/adaptive_learning`
- `public/gamehub/adaptive_learning.html`
- `public/gamehub/shared-content-loader.js`
- `public/gamehub/content/question-bank.sample.json`
- `public/gamehub/schema/question-bank-item.schema.json`
- `docs/adaptive-learning-grade-pathway-audit.md`

Guardrail status for this audit:
- documentation-only
- no runtime wiring
- no schema mutation
- no tracking/scoring/db changes

---

## Current Adaptive engine compatibility

The current Adaptive runtime already supports:
- practice session orchestration (start → question loop → results)
- subject/grade/domain/skill/prerequisite metadata usage
- adaptive difficulty movement (difficulty bands 1..3)
- question rendering (`prompt`, `choices`, answer validation)
- explanation-centric feedback
- prerequisite-informed next-step recommendations

Key runtime boundary:
- current adaptive grade targeting is bounded to grades **6..8**.

Interpretation:
- the Grades 1–6 handoff is compatible as a **curriculum layer**, but not yet fully compatible as a **complete runtime behavior set** without additive integration work.

---

## Field-by-field compatibility matrix

| Handoff field or layer | Runtime support now | Adapter needed | Schema expansion needed | Status |
|---|---|---|---|---|
| `id` | Yes | No | No | Runtime-ready now |
| `subject` | Yes | Optional normalization (enum/casing) | No | Runtime-ready now |
| `grade` | Yes (ingestion), bounded adaptivity | Yes (grade-bound handling) | No | Partial |
| `domain` | Yes | No | No | Runtime-ready now |
| `skill` | Yes | No | No | Runtime-ready now |
| `prerequisite_skill` | Yes | No | No | Runtime-ready now |
| `difficulty` | Yes (1..3) | Optional band mapping | No | Runtime-ready now |
| `prompt` | Yes | No | No | Runtime-ready now |
| `choices` | Yes | Optional coercion/sanitization | No | Runtime-ready now |
| `answer` | Yes (via loader mapping) | Existing mapping already present | No | Runtime-ready now |
| `explanation` | Yes (via loader mapping) | Existing mapping already present | No | Runtime-ready now |
| `tags` / metadata extras | Partial | Optional passthrough | Optional | Content-ready |
| research grounding | No direct renderer | Yes | Yes (optional field) | Content-only for now |
| learning progression | No direct renderer | Yes | Yes (optional field) | Content-only for now |
| misconceptions | No direct handler | Yes | Yes (optional field) | Content-only for now |
| mini lessons | No direct renderer | Yes | Yes (optional field) | Future runtime work |
| worked examples | No direct renderer | Yes | Yes (optional field) | Future runtime work |
| hint ladders | No direct renderer | Yes | Yes (optional field) | Future runtime work |
| guided practice blocks | Partial (question loop) | Yes | Yes (optional field) | Partial |
| checkpoints | No checkpoint mode renderer | Yes | Yes (optional field) | Future runtime work |
| adaptive question banks | Partial (question ingestion exists) | Yes (normalizer + bank strategy) | Optional | Partial |

---

## Missing adapters

1. **Curriculum-to-runtime question adapter enrichment**
   - Keep existing `answer -> correct_answer` and `explanation -> correct_explanation` mapping.
   - Add defaults for missing runtime-friendly fields (`wrong_feedback`, `celebration_text`, optional `question_type`).

2. **Grade-band adapter**
   - Current engine clamps to 6..8.
   - Add config-level min/max grade handling for 1..8 compatibility (without rewriting core loop).

3. **Instructional object passthrough adapter**
   - Preserve non-runtime instructional fields (`misconceptions`, `mini_lessons`, `worked_examples`, `hint_ladders`, `checkpoints`) as optional data until renderer phases are enabled.

4. **Adaptive bank selection adapter**
   - Define mapping convention for multiple question banks per skill/difficulty (if provided by handoff), while keeping current fallback behavior stable.

---

## Missing schema fields (optional/additive)

No breaking schema change is required for baseline practice ingestion.

Recommended optional additions for handoff fidelity:
- `wrong_feedback` (string)
- `celebration_text` (string)
- `question_type` (string)
- `passage` (string)
- `research_grounding` (string or array)
- `learning_progression` (string or array)
- `misconceptions` (array of objects)
- `mini_lesson` / `mini_lessons` (object/array)
- `worked_example` / `worked_examples` (object/array)
- `hint_ladder` / `hint_ladders` (array)
- `guided_practice` (array/object)
- `checkpoint` / `checkpoints` (array/object)
- `next_practice_hint` (string)

Schema policy recommendation:
- additive optional-only fields
- preserve required minimal core (`id`, `prompt`, `answer`)

---

## Learn Mode requirements

To support handoff mini lessons, worked examples, and guided practice in runtime:

1. **Renderer surface**
   - Add a learn block container in the session UI (pre-question, post-miss, or mode-driven).

2. **Learn content contract**
   - Define minimal Learn payload shape (title, teaching step, worked example, hint ladder entry points).

3. **Fallback behavior**
   - If Learn fields are absent, runtime continues current assessment-first flow.

4. **Mode gating**
   - Learn rendering should be mode/preset controlled to avoid changing existing behavior unintentionally.

Status: not runtime-enabled yet; compatible as future additive layer.

---

## Checkpoint Mode requirements

To support handoff checkpoints:

1. **Checkpoint payload contract**
   - checkpoint prompt
   - expected response shape (MC/free response/etc.)
   - continuation criteria text

2. **Checkpoint renderer**
   - dedicated checkpoint card/step in session sequence

3. **Checkpoint outcome handling (non-diagnostic)**
   - return-to-practice guidance
   - prerequisite reinforcement messaging
   - no pass/fail or diagnosis language

Status: requires new rendering and sequence wiring; not present today.

---

## Hint ladders and worked examples requirements

Needed integrations:
- adapter support to pass through hint and example structures
- UI component to reveal hints progressively (tier 1 → tier N)
- consistent “worked example” visual pattern tied to active skill
- fallback to current explanation-only feedback when absent

Status: content can be authored now; runtime activation is future phase.

---

## Misconception handling requirements

Needed integrations:
- optional misconception tagging per skill/item
- mapping from misconception tag to targeted feedback snippets
- optional recommendation routing (e.g., prerequisite refresh)

Important boundary:
- misconception handling should remain instructional guidance only
- no diagnosis or high-stakes labeling

Status: schema + adapter + UI messaging work needed; engine core logic can remain largely intact.

---

## Adaptive question banks requirements

Current support:
- shared loader can convert question-bank items into runtime question objects
- runtime selection logic supports grade/difficulty targeting with fallbacks

Needed for full handoff utilization:
- canonical strategy for multiple items per skill and per difficulty level
- optional bank partitioning conventions (subject/domain/skill clusters)
- clear fallback precedence when sparse banks exist

Status: partial compatibility now; enhanced content organization conventions needed.

---

## Adaptive logic requirements

Already compatible:
- streak-based up/down movement logic
- difficulty band progression model

Needs additive updates for Grades 1–6 handoff:
- configurable grade bounds (not hardcoded 6..8)
- potential calibration rules for primary-grade pacing (still within same core logic)

Status: minimal engine parameterization needed; no full rewrite required.

---

## Future progress tracking requirements (without enabling tracking now)

Current state:
- local browser session history only
- no server ingestion, no tracking enablement

Future-ready planning requirements:
- event taxonomy mapping for lesson/checkpoint/hint interactions
- explicit privacy and consent architecture before any remote persistence
- strict separation from scoring/diagnostic pipelines

Status: future architecture only; keep disabled now.

---

## Future AI tutor requirements (without building now)

Future integration prerequisites:
- scoped tutor context contract (skill, prerequisite, recent errors, hint stage)
- safety boundaries for language and claims (non-diagnostic)
- consent/privacy control plane before activation
- fallback non-AI behavior parity

Status: future phase; no implementation now.

---

## Safest minimal Phase 1 integration path

1. Treat `docs/adaptive-grades-1-6-curriculum-handoff.md` as canonical curriculum-layer source.
2. Keep current runtime engine and UI unchanged.
3. Harden adapter normalization for runtime-friendly defaults.
4. Define optional field passthrough contract (no rendering yet).
5. Prepare configurable grade-bound settings for later enablement.

Outcome:
- maximum compatibility progress
- minimal risk to existing Grades 6–8 behavior

---

## Phase 2 Learn + Checkpoint rendering path

- Add Learn block renderer (mini lessons + worked examples + hints)
- Add Checkpoint block renderer
- Add mode flags/presets to control instructional sequence
- Maintain current non-diagnostic messaging and no tracking guardrails

---

## Phase 3 mastery/adaptive expansion path

- expand adaptive bank density per skill
- add misconception-informed feedback routing
- tune grade/difficulty progression calibration for K-6 to middle-school continuum
- maintain shared engine contract and backward compatibility

---

## Phase 4 tracking/AI tutor path (only after privacy/consent architecture)

- implement privacy/consent architecture first
- then optionally add remote progress telemetry
- then optionally add AI tutor assistance under strict safety and governance controls
- preserve no scoring-linkage / no diagnosis constraints unless explicitly re-scoped

---

## Final position
The Grades 1–6 handoff is best treated as a rich curriculum/instructional layer that can connect to the existing Adaptive platform with **additive adapters and phased rendering work**. Core engine replacement is unnecessary; the practical path is incremental compatibility hardening, then instructional rendering, then advanced adaptive enhancements, and only later privacy-governed tracking/AI capabilities.
