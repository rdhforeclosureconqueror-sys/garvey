# Adaptive V2 Content Factory Contracts (Phase 6)

## Scope

This document formalizes **Phase 6 Content Factory System — V1** into offline Adaptive V2 content-factory contracts only.

In scope:
- Source intake contract for production curriculum skill files.
- Deterministic normalization and generation contract shapes.
- Validation and review-flag contract rules.
- Tiny pseudo-output fixture shape for planning-only validation.

Out of scope:
- Production lesson conversion.
- Runtime wiring.
- Adaptive engine changes.
- Tracking/DB writes.
- Scoring/diagnosis logic.
- Gates logic and AI voice behavior changes.

Control layer references:
- `public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json`
- `docs/adaptive-v2/learn-layer-contracts.md`
- `public/gamehub/content/adaptive-v2/schemas/lesson-package.schema.json`
- `public/gamehub/content/adaptive-v2/schemas/checkpoint.schema.json`

Source:
- `public/gamehub/content/curriculum-source/Phase 6/Content Factory System — V1`

---

## Phase 6 concepts extracted

1. **Source intake**
   - Intake must start from indexed curriculum entries and canonical source pointers.
2. **Normalization**
   - Raw source segments normalize into canonical fields (`grade`, `subject`, `domain`, `skill`, objective, misconception tags, hints).
3. **Lesson package generation**
   - Generate one lesson package per target skill according to Learn Layer contracts.
4. **Checkpoint generation**
   - Generate checkpoint payloads with deterministic IDs and pass-threshold metadata.
5. **Validation**
   - Enforce required schema fields and deterministic reproducibility checks.
6. **Review flags**
   - Mark entries requiring human review when routing ambiguity, missing required fields, or unsupported content patterns occur.
7. **Deterministic output**
   - Same input + same ruleset must produce byte-stable output IDs/order/keys.
8. **Grade/subject/skill routing**
   - Route conversion by manifest-indexed `phase_id`, inferred grade/subject, and per-skill keys.

---

## Proposed conversion pipeline (contracts only)

1. **Intake**
   - Read curriculum index entries where `conversion_status` is planning-eligible.
   - Resolve source file path and phase metadata.
2. **Normalize**
   - Parse source sections into canonical unit blocks.
   - Canonicalize strings, IDs, and route labels.
3. **Generate lesson package**
   - Emit `lesson-package.schema.json` compliant objects.
4. **Generate checkpoint**
   - Emit `checkpoint.schema.json` compliant objects.
5. **Validate**
   - Run schema checks + contract-level deterministic checks.
6. **Review gate**
   - Emit review flags and reasons where confidence is low.
7. **Publish planning artifacts**
   - Save generated planning outputs and conversion report only (no runtime wiring).

---

## Required inputs

- Curriculum control index (`curriculum-index.v1.json`) entries.
- Source curriculum file pointers for a target phase/skill.
- Learn Layer contract expectations from Phase 2.
- Content-factory configuration:
  - `schema_version`
  - deterministic id policy prefixes
  - normalization profile version

---

## Expected outputs

Per routed skill (planning/output contracts only):

- One `lesson_package` object compliant with `lesson-package.schema.json`.
- One `checkpoint` object compliant with `checkpoint.schema.json`.
- One conversion report row containing:
  - intake key
  - routing tuple (`phase_id`, `grade`, `subject`, `skill`)
  - deterministic output IDs
  - validation result
  - review flags array

---

## Validation rules

1. **Schema compliance**
   - Lesson package/checkpoint satisfy existing schemas.
2. **Deterministic ID rules**
   - IDs are stable from deterministic components; no random/clock components.
3. **Deterministic ordering**
   - Arrays and object key emission are stable by documented sort rules.
4. **Routing completeness**
   - `phase_id`, `grade`, `subject`, and `skill` must be present after normalization.
5. **Minimum evidence checks**
   - Lesson package required units present.
   - Checkpoint has required core fields and at least one item.
6. **Review flag policy**
   - Must flag when ambiguity/missing required mappings occur.

---

## Tiny pseudo-output fixture policy

Phase 6 uses a small pseudo-output example fixture for contract testing only.
No production curriculum files are converted in this phase.

Fixture artifact:
- `public/gamehub/content/adaptive-v2/fixtures/phase-6-content-factory-example.json`

---

## Remaining work before Grade 1 production conversion

1. Finalize deterministic ID recipe and normalization profile versions.
2. Approve controlled vocabularies for cognitive/difficulty/misconception labels.
3. Build first real converter pass for Grade 1 (`Phase 7A/7B`) with review queue.
4. Add batch validators for all generated artifacts pre-merge.
5. Run human QA rubric pass on generated outputs before runtime integration.
