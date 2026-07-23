# G2M_GM_001 — Shapes, Arrays, and Partitioning Publication Review

## Executive Summary

**Publication decision: blocked by shared infrastructure.** The audit selected exactly `G2M_GM_001`, the next approved Grade 2 Math package, and confirmed its canonical inventory of five banks with ten activities each. Required visual validation of the first canonical activity, `G2M_GM_001_LVL1_Q1`, immediately exposed a reusable defect in the production `shape_identification` renderer. The activity asks the learner to identify the shape with three sides, but the visual's accessible label says **“triangle shape model”** and its visible caption begins **“triangle model.”** Both reveal the authored answer before the learner responds.

The same defect occurs through the production visual registry and the production question-card path. Under the audit's fail-closed stop rule, review stopped immediately. No curriculum content was rewritten, and this document does not claim a completed audit of all 50 activities.

## Educational Review

Only the package inventory and the first activity were reached before the mandatory stop. The first prompt uses Grade 2 vocabulary and asks about a defining attribute, but its instructional validity is defeated by the visual giving the answer. Educational quality, progression, duplication, hints, and explanations across the remaining activities were not certified.

## Mathematical Review

The blocking activity's authored relationship is mathematically correct: a triangle has three sides, and `triangle` is its authored answer. Full recomputation of every geometry relationship and every authored answer was not completed after the shared-renderer defect triggered the required stop.

## Mixed Review

The Mixed bank exists with ten canonical activities. Authentic transfer, focused-context reuse, prompt duplication, hint-ladder reuse, and explanation reuse were not certified because the audit stopped during the first focused activity's production rendering.

## Visual Review

`G2M_GM_001_LVL1_Q1` selects the intended `shape_identification` renderer with no fallback or placeholder. However, the shared renderer derives the shape name from `question.shape` and emits it in both the `aria-label` and visible caption. For an identification prompt whose correct answer is the same shape name, that behavior is direct answer leakage.

The package-specific blocker regression exercises both required production paths and fails until the shared renderer stops exposing the unknown shape name. The full fail-closed package presentation and remaining 49 activities were not audited after the stop condition. Shared renderer code was deliberately not modified in this curriculum change.

## Accessibility Review

The shared visual's accessible name reveals `triangle`, the answer being assessed. That makes the first activity inaccessible as an answer-safe assessment even before auditing the package-authored `visual_description`, `accessible_description`, and Read Question audio fields. Accessibility completeness for the package was not certified.

## Regression Tests

The package-specific regression verifies package identity, exact level-bank identities, 50 canonical activities, unique matching IDs, and production schema validity. Its blocker assertion renders the first activity through the production visual registry and production question-card renderer, verifies selection of `shape_identification`, and rejects the answer-bearing accessible label and caption. The assertion is intentionally red while the shared defect remains.

## Files Changed

- `docs/curriculum-reviews/g2m-gm-001-review.md` — records the shared-renderer publication blocker and the deliberately limited audit scope.
- `tests/gamehub/skill-world/g2m-gm-001-content-quality.test.js` — package identity/schema guard and focused blocker regression.

The curriculum package JSON was not modified after discovery of the shared infrastructure blocker.

## Testing

- `node --test tests/gamehub/skill-world/g2m-gm-001-content-quality.test.js` — expected blocker failure: the shared renderer exposes `triangle` through both production paths.
- `npm run validate:curriculum-index`
- `git diff --check`

## Commit SHA

Reported in the final delivery because a commit cannot include its own immutable SHA.

## Scope Confirmation

Exactly one package, `G2M_GM_001`, was opened. Only this review and its package-specific blocker regression were added. No curriculum JSON, shared renderer, registry, schema, other package, or application infrastructure was modified.
