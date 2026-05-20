# Integrated Profile Source Provenance (Pilot Hardening)

## Ownership Rules

Integrated profile composition is now ownership-safe by default:

- Child ownership is verified first from `gates_child_profiles` (`id` + `parent_id`).
- Gates source is loaded only with explicit `parent_id + child_id` scoping.
- TDE source is loaded by `child_id`, then ownership-verified against payload-level `child_id` and `parent_id`/`parent_user_id` before composition.
- Identity source is loaded only through explicit join linkage (`engine_results.assessment_id -> engine_assessments.id`) with parent and child filters, and optional tenant filter.
- Unverified sources are rejected and excluded from composition.

## Provenance Model

`integrated_profile.source_provenance` contains per-source metadata:

- `source`: canonical source name.
- `source_id`: selected record identifier.
- `created_at`: selected source creation timestamp.
- `ownership_verified`: boolean ownership status.

`integrated_profile.source_availability` tracks each source composition outcome (`verified`, `unavailable`, `rejected_ownership`, etc.).

## Safe Degradation Philosophy

When a source cannot be safely verified:

- it is excluded from integrated composition,
- no aggressive inference is performed,
- profile returns partial, safe output,
- Gates-only flow remains intact.

Safety chooses incompleteness over unsafe synthesis.

## Deterministic Composition

Determinism guarantees are enforced by:

- explicit ownership-constrained filters,
- deterministic selection ordering (`ORDER BY created_at DESC, id/result_id DESC`),
- no global latest-result reads,
- stable base contract defaults for missing sources.

Same child + same scoped data sources yields the same integrated output.

## Pilot Safety Rationale

This hardening eliminates global leakage vectors and cross-owner composition ambiguity while preserving the existing integrated profile philosophy and Gates scoring behavior.
