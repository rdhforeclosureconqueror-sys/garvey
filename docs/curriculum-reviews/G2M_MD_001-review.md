# G2M_MD_001 — Measure Length Review

## 1. Selected package and sequence rationale

`G2M_MD_001` was selected as the only package reviewed. The repository's explicit Grade 2 Math production sequence in `docs/grade2_math_completion_plan.md` lists `G2M_MD_001` immediately after the approved `G2M_WP_001` (package tasks 007 and 008, respectively). Therefore it is the next unreviewed package; no later package was opened.

## 2. Executive summary

The review stopped during the required visual validation after confirming a reusable defect in the shared `ruler` renderer. For off-zero measurement activity `G2M_MD_001_LVL1_Q6`, the authored problem says a card starts at 2 inches and ends at 8 inches, but both production renderer paths display a bar beginning at zero and state, “Start at 0 ... measure 6 inches.” The renderer consumes only the computed length and cannot represent the authored start and end points.

This is a publication blocker because the visual contradicts the prompt and teaches that the endpoint, rather than the distance between endpoints, is the measurement. Following the required stop condition, shared infrastructure and curriculum content were not modified, and the remaining publication-quality audit is not claimed as complete.

## 3. Educational review

The canonical inventory contains 50 activities across four focused banks and one Mixed bank. Initial inspection found a single repeated generic hint ladder, answer-stating explanations, and ten Mixed activities copied from focused banks. These issues remain unresolved because the shared-renderer stop condition took precedence.

## 4. Mathematical review

The blocker example is mathematically authored correctly: 8 inches minus 2 inches equals 6 inches, and its `answer`, `correct_answer`, and acceptable responses agree. The schema, 50-activity canonical count, and unique IDs pass validation. A complete recomputation and field-by-field certification was halted at the shared renderer defect and is not claimed.

## 5. Mixed transfer review

All ten Mixed prompts repeat focused prompts and consequently reuse their contexts, quantities, visual arrangements, and hint ladders. They are not authentic transfer activities as authored. Remediation was not begun after the stop condition.

## 6. Visual review — shared defect

The shared `ruler` implementation builds ticks from zero, sizes the object bar solely from `length`, and always emits a caption directing the learner to start at zero. It has no representation of an off-zero start or endpoint. Thus `G2M_MD_001_LVL1_Q6` (2 to 8 inches), `G2M_MD_001_LVL1_Q7` (1 to 6 inches), `G2M_MD_001_LVL2_Q6` (3 to 10 centimeters), and `G2M_MD_001_LVL2_Q7` (1 to 6 centimeters) cannot render as authored.

The focused test reproduces the contradiction through both required production paths: the visual registry and complete question-card renderer. The output is nonblank and selects `ruler`, but its placement and semantics are wrong. Shared renderer code was not changed.

## 7. Accessibility review

Canonical activities lack both `visual_description` and `accessible_description`. Read Question audio contains the prompt but omits visual context. Accessibility remediation cannot accurately describe the current production visual as matching the mathematical model because the off-zero renderer output is incorrect.

## 8. Interaction review

Schema, inventory, and ID checks pass. Both production paths select and render the `ruler` renderer, and both fail the off-zero endpoint assertion. Broader interaction and production answer-evaluation certification stopped at the required shared-infrastructure blocker.

## 9. Files changed

- `tests/gamehub/skill-world/g2m-md-001-content-quality.test.js`
- `docs/curriculum-reviews/G2M_MD_001-review.md`

The package JSON was deliberately not changed after discovery of the shared defect.

## 10. Tests executed

- `node --test tests/gamehub/skill-world/g2m-md-001-content-quality.test.js` — expected failure documenting the shared renderer blocker.
- `node --test tests/gamehub/skill-world/bar-model-renderer.test.js`
- `node --test tests/gamehub/skill-world/skill-world-generator.test.js`
- `npm run validate:curriculum-index`
- `git diff --check`
- `git status --short --branch`

Chromium availability is reported in the final delivery. A screenshot cannot cure or supersede the deterministic contradiction reproduced through both production renderer paths.

## 11. Branch

`work`

## 12. Commit SHA

Reported in the final delivery because a commit cannot contain its own immutable SHA.

## 13. Pull request title

`Report G2M_MD_001 shared ruler-renderer blocker`

## 14. Scope confirmation

Review stopped after exactly `G2M_MD_001`. No second package, package content, shared renderer, registry, infrastructure, approved package, other-grade content, assessment, dashboard, route, persistence, replay, or answer-shuffling file was modified.
