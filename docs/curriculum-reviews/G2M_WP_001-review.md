# G2M_WP_001 — Addition and Subtraction Word Problems Review

## 1. Selected package and sequence rationale

`G2M_WP_001` was selected because the repository's Grade 2 Math production sequence places it immediately after the approved `G2M_OP_003` package. No later package was opened for review.

## 2. Executive summary

The review stopped during required visual validation after confirming a reusable defect in the shared `bar_model` renderer. The renderer exposes an unknown answer as a labeled known whole and always appends another unknown segment. For example, `G2M_WP_001_LVL1_Q1` asks learners to find the whole from parts 24 and 18, but the production visual displays **42 — whole**, displays both known parts, and then adds a second **? — unknown** segment.

This is a publication blocker: it gives away the answer, represents four quantities when the story has three, and makes the accessible mathematical intent unreliable. Per the audit instruction to stop and not change shared infrastructure in this curriculum PR, no curriculum content was modified and the remaining publication-quality audit was not represented as complete.

## 3. Educational review

The canonical inventory contains 50 activities across four focused banks and one Mixed bank. Initial inspection found repeated generic hint ladders, answer-stating explanations, and Mixed prompts copied verbatim from focused banks. These issues remain unresolved because the shared-renderer stop condition took precedence.

## 4. Mathematical review

All 50 canonical authored answers were recomputed as an initial integrity check. Their top-level equations and answer fields are arithmetically consistent. A complete field-by-field publication audit was halted at the shared renderer defect and is not claimed.

## 5. Mixed transfer review

The ten Mixed activities reuse focused prompts, arithmetic pairs, visual arrangements, and contexts. They are not authentic transfer activities in their current form. Remediation was not begun after the stop condition.

## 6. Visual review — shared defect

The shared `bar_model` implementation chooses `correct_answer` as its displayed `whole` whenever `total` is absent, then unconditionally appends a missing unknown segment. This cannot correctly represent all problem structures used by this package:

- In result-unknown addition, it reveals the result as the whole and adds a redundant unknown.
- In subtraction, it labels the difference as the whole rather than the starting quantity and adds another unknown.
- In comparison, it labels the difference as the whole and does not provide a structurally valid comparison model.

The focused test reproduces the defect through the production visual registry using `G2M_WP_001_LVL1_Q1`. Shared renderer code was not changed.

## 7. Accessibility review

Canonical activities do not currently contain both `visual_description` and `accessible_description`. Read Question audio repeats the prompt but omits a description of the rendered visual context. Completion of this review is blocked because the underlying bar representation is mathematically inaccurate.

## 8. Interaction review

Schema, inventory, ID, and authored arithmetic checks pass. Production visual-registry validation fails on the shared `bar_model` defect. Full question-card interaction validation and production answer-evaluation certification were not completed after the required stop.

## 9. Files changed

- `tests/gamehub/skill-world/g2m-wp-001-content-quality.test.js`
- `docs/curriculum-reviews/G2M_WP_001-review.md`

The package JSON was deliberately not changed after discovering the shared defect.

## 10. Tests executed

- `node --test tests/gamehub/skill-world/g2m-wp-001-content-quality.test.js` — expected failure documenting the shared renderer blocker.
- `node --test tests/gamehub/skill-world/skill-world-generator.test.js`
- `npm run validate:curriculum-index`
- `git diff --check`
- `git status --short --branch`

Chromium availability is checked in the final delivery. Browser inspection cannot supersede the deterministic incorrect renderer output.

## 11. Branch

`work`

## 12. Commit SHA

Reported in the final delivery because a commit cannot contain its own immutable SHA.

## 13. Pull request title

`Report G2M_WP_001 shared bar-model blocker`

## 14. Scope confirmation

Review stopped after exactly `G2M_WP_001`. No second package, shared renderer, infrastructure, approved package, other-grade content, assessment, dashboard, route, persistence, replay, or answer-shuffling file was modified.
