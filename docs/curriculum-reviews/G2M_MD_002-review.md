# G2M_MD_002 — Time and Money Publication Review

## 1. Selected package and sequence rationale

`G2M_MD_002 — Time and Money` is the only selected package. The canonical Grade 2 Math production order in `docs/grade2_math_production_readiness_report.md` places it immediately after the approved `G2M_MD_001 — Measure Length`, so no package was skipped and no later package was opened.

## 2. Executive summary

**Publication decision: blocked; remediation not begun.** The required first rendering inspection found a reusable shared-renderer defect: production clock and money visuals print the answer while the learner is being asked to derive it. Per the audit stop rule, work stopped immediately. The package JSON remains unchanged, the remaining content audit was not represented as complete, and a focused regression test records the blocker.

## 3. Educational review

Not completed because the shared-renderer blocker required an immediate stop. Initial inspection also showed that the existing activities will need a fresh review of prompts, activity-specific Focus/Strategy/Verify hints, reasoning explanations, progression, and duplication after the renderer is repaired outside this curriculum change.

## 4. Mathematical review

Not completed because the audit stopped at the shared infrastructure defect. The package passed its baseline schema, identity, canonical-count, unique-ID, and ID-consistency checks only; that baseline is not a certification of every mathematical field.

## 5. Mixed transfer review

Not begun. No Mixed activity was rewritten or approved, and no focused or Mixed content was changed.

## 6. Visual review

The production visual registry and complete production question-card path both leak answers. For analog-clock questions that ask what time is shown, the shared renderer emits the exact digital time in a bold caption. For money-counting questions that ask how much money is shown, the shared renderer emits running totals and a `Total shown` caption containing `total_cents`. The focused regression checks every affected canonical analog-clock reading and money-counting activity through both production paths and reports the leaking activity/path pairs.

This is a reusable defect in `public/gamehub/skill-world/renderers/visual-model-registry.js`, not an authored-content defect that can be safely repaired in the selected package JSON. Shared infrastructure was not modified. Visual inspection and package remediation must resume from the beginning after the shared renderer is fixed and its regression passes.

## 7. Accessibility review

Not completed because the audit stopped at the renderer blocker. Complete prompt-plus-visual Read Question output and non-answer-revealing descriptions still require exhaustive review after the blocker is removed.

## 8. Interaction review

Not completed because the audit stopped at the renderer blocker. Options/choices, answer positions, acceptable-answer evaluation, submission, and state updates remain uncertified.

## 9. Files changed

- `tests/gamehub/skill-world/g2m-md-002-content-quality.test.js` — focused baseline and two-path answer-leakage regression.
- `docs/curriculum-reviews/G2M_MD_002-review.md` — blocker record and sequence decision.

The selected package JSON was deliberately not modified.

## 10. Tests and checks executed

The package-specific regression, required shared renderer suites, generator suite, curriculum-index validation, whitespace check, and repository-status check were run. The focused suite is expected to fail only on the documented shared-renderer answer leakage until the infrastructure repair is made in a separate change.

## 11. Browser-verification status

Browser verification was not performed after the deterministic production render paths exposed the blocking shared defect. No screenshot review is claimed. The visual audit must restart after repair.

## 12. Branch

`work`

## 13. Commit SHA

Reported in the final delivery because a commit cannot contain its own immutable SHA.

## 14. Pull request title

`Document G2M_MD_002 shared renderer publication blocker`

## 15. Scope confirmation

Exactly one package, `G2M_MD_002`, was selected. The audit stopped immediately upon discovering the shared renderer defect. Only its package-specific test and review document were added; no package content, shared infrastructure, approved package, later package, assessment, route, dashboard, persistence, replay behavior, or answer shuffling was changed. No second package was begun.
