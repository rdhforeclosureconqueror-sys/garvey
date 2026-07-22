# G2M_MD_002 — Time and Money Publication Review

## 1. Selected package and sequence rationale

`G2M_MD_002 — Time and Money` is the only package opened in this audit. The authoritative production order in `curriculum-framework/plans/grade2-math-completion-plan.v1.json` places `G2M_MD_002` immediately after the approved `G2M_MD_001` package (package tasks 008 and 009 respectively). The production content manifest likewise lists `G2M_MD_002` directly after `G2M_MD_001`. Therefore `G2M_MD_002`, not a later measurement or geometry package, is the next unreviewed package.

## 2. Executive summary

**Publication decision: blocked by a shared renderer defect.** The required fresh audit began with the selected package's identity, schema, canonical inventory, and production visual paths. The package has five canonical banks of 10 activities (50 total) and passes the initial identity/schema/count/ID checks. During required production rendering, the first canonical `money_counting` activity exposed its correct answer in the shared visual output. In accordance with the stop-immediately rule, package remediation and the remainder of certification stopped. The package JSON was not changed, no later package was opened, and this document does not claim publication certification.

## 3. Educational review

The educational audit is **not certified**. Initial source inspection found repeated prompts, generic hint ladders, and answer-restating explanations that will require a fresh exhaustive remediation only after the renderer blocker is repaired. No content edits were retained because shared-infrastructure discovery requires the curriculum audit to stop.

## 4. Mathematical review

The mathematical audit is **not certified**. Package identity, canonical counts, unique IDs, ID consistency, and schema validity were checked. The remaining authored operands, time fields, coin values, totals, acceptable answers, and duplicated representations must be recomputed in a new audit after the blocker is resolved.

## 5. Mixed transfer review

The Mixed bank is **not certified**. Initial inspection shows that its activities copy focused prompts, contexts, values, and coin arrangements. Rewriting was intentionally not performed after discovery of the shared-renderer blocker.

## 6. Visual review and blocker

The shared production `money_counting` renderer leaks the solution. For `G2M_MD_002_LVL4_Q1`, whose learner task is to total a quarter, dime, and penny, registry output prints cumulative values including `penny → 36¢` and a caption stating `Total shown: 36 cents`. The complete production question-card path embeds the same disclosure. The output is nonblank and selects `data-renderer="money_counting"`, so this is not a fallback-selection problem; it is answer leakage in reusable shared rendering infrastructure.

A focused package regression now renders the canonical activity through both required production paths and rejects the disclosed answer. It fails on the registry path first, accurately preserving the blocker. Per scope restrictions, the shared renderer was not modified in this curriculum change. No additional canonical activity was reviewed after this defect was established.

## 7. Accessibility review

Accessibility certification is **blocked**. The money renderer's visible and semantic output gives away the total, so meaningful non-answer-revealing visual context cannot be certified. Full `visual_description`, `accessible_description`, and Read Question review remains pending for all canonical activities.

## 8. Interaction review

Interaction certification is **blocked**. Initial schema and renderer selection checks ran, but option synchronization, answer-position balance, acceptable-answer evaluation, submission behavior, and state updates were not certified after the mandatory stop.

## 9. Files changed

- `tests/gamehub/skill-world/g2m-md-002-content-quality.test.js` — focused identity/schema coverage and a failing regression for answer leakage through both production rendering paths.
- `docs/curriculum-reviews/G2M_MD_002-review.md` — sequence decision, blocker evidence, audit status, and scope record.

The selected package JSON remains unchanged because remediation stopped at the shared-infrastructure defect.

## 10. Validation status

The package-focused test is expected to fail until the shared `money_counting` renderer stops printing cumulative and final totals. Required shared tests and repository checks were run and are reported in the final delivery. A failing focused blocker regression is not a package certification.

## 11. Browser-verification status

Playwright, Puppeteer, and Chromium are unavailable in this environment. No browser screenshot review is claimed. Deterministic rendering through the registry and complete question-card path reproduced the blocker; browser verification was not pursued after the mandatory stop.

## 12. Branch and commit

Branch: `work`. The immutable commit SHA is reported in the final delivery.

## 13. Pull request title

`Block G2M_MD_002 publication on money renderer answer leakage`

## 14. Scope confirmation

Exactly one package, `G2M_MD_002`, was selected and opened. No second package was begun. Changes are limited to its package-specific test and review document. No package content, shared renderer, registry, CSS, generator, infrastructure, approved package, other curriculum package, assessment, dashboard, route, persistence, replay, or answer-shuffling file was modified.
