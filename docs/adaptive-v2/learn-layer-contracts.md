# Adaptive V2 Learn Layer Contracts (Phase 2)

## Scope

This document formalizes **Phase 2 Learn Layer Architecture — V1** into offline Adaptive V2 content contracts only.

In scope:
- Contract modeling for Learn Layer data shape.
- JSON schema stubs for lesson packages and checkpoints.
- Small fixture examples for validation/planning.

Out of scope:
- Runtime wiring.
- Adaptive engine changes.
- Tracking/DB writes.
- Scoring/diagnosis logic.
- Gates logic and AI voice behavior changes.
- Production lesson conversion.

Control layer reference:
- `public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json`

Source:
- `public/gamehub/content/curriculum-source/Phase 2/Learn Layer Architecture — V1`

---

## Phase 2 concepts extracted

1. **Lesson snippet (Mini Lesson)**
   - Brief pre-teach layer with objective, vocabulary, concept explanation, misconception warning, and summary.
2. **Worked example**
   - Structured "how + why" demonstration with ordered steps and reflection.
3. **Hint ladder**
   - Three-stage hints (`hint_1`, `hint_2`, `hint_3`) moving from light prompt to near-solution support.
4. **Guided practice**
   - Low-stakes scaffolded practice item set with support type and coaching feedback.
5. **Checkpoint**
   - 3–5 item verification loop, default pass threshold concept of 80%.
6. **Feedback**
   - Coaching feedback captured in guided practice; checkpoint feedback notes modeled in schema.
7. **Next practice recommendation**
   - Post-checkpoint recommendation shape (`adaptive_practice`, `lesson_support_loop`, `mini_reteach`, etc.) captured in `pathway_recommendation`.
8. **Mastery support metadata**
   - Non-runtime metadata for learner support signals (attempts, hint dependency, confidence, status bands).

---

## Contract: Lesson Package (planning shape)

A Lesson Package bundles the core Learn Layer units for a single skill.

### Required fields
- `schema_version`
- `lesson_package_id`
- `phase_id`
- `skill`
- `lesson_snippet`
- `worked_example`
- `hint_ladder`
- `guided_practice`
- `checkpoint_ref`

### Optional fields
- `grade`
- `subject`
- `domain`
- `objective`
- `next_practice_recommendation`
- `mastery_support_metadata`
- `source_metadata`

---

## Contract: Checkpoint (planning shape)

Checkpoint remains content-level verification metadata only.

### Required fields
- `schema_version`
- `checkpoint_id`
- `skill`
- `questions`
- `pass_threshold`

### Optional fields
- `max_items`
- `feedback_rules`
- `pathway_recommendation`
- `source_metadata`

---

## Field guidance (required vs optional)

- Required fields represent minimum contract compliance for Phase 2 planning validation.
- Optional fields represent extensibility for later phases (runtime decisions, richer metadata), without enabling runtime behavior now.
- `pass_threshold` defaults to `0.8` in examples (80%), while still configurable.

---

## Fixtures and schema artifacts

- Lesson package schema:
  - `public/gamehub/content/adaptive-v2/schemas/lesson-package.schema.json`
- Checkpoint schema:
  - `public/gamehub/content/adaptive-v2/schemas/checkpoint.schema.json`
- Planning fixtures:
  - `public/gamehub/content/adaptive-v2/fixtures/phase-2-contract-examples.json`

Fixtures are intentionally tiny and non-production.

---

## Remaining work before production content conversion

1. Add a per-phase conversion mapping doc for production lesson files (Phase 7A+ onward).
2. Define controlled vocabularies/enums for `support_type`, `pathway_recommendation.pathway`, and mastery status labels.
3. Decide canonical ID strategy (`lesson_package_id`, `checkpoint_id`, cross-file refs).
4. Build offline conversion scripts for production sources without runtime coupling.
5. Add CI-level JSON schema validation for all future converted assets.
6. Start phased content conversion only after contract sign-off.
