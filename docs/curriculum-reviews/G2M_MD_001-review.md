# G2M_MD_001 — Measure Length Fresh Review

## 1. Selected package and sequence rationale

`G2M_MD_001 — Measure Length` was the only package opened. It is the requested restart target after approval of the shared off-zero ruler correction. No other package was reviewed.

## 2. Executive summary

This was a fresh audit from the canonical source; no conclusion from the earlier blocked review was reused. The approved ruler correction now preserves authored off-zero endpoints in both production paths. During the required no-answer-leakage inspection, however, a different reusable shared-renderer defect was found: every canonical ruler visual explicitly states the computed answer in its accessible name and visible caption before the learner responds.

For `G2M_MD_001_LVL1_Q6`, whose answer is 6 inches, production output says both “spanning 6 inches” and “The distance is 6 inches.” The same shared behavior affects all 24 canonical ruler activities through the visual registry and complete question-card renderer. This is not authored curriculum metadata and cannot be repaired within the allowed package, test, and report files.

The instruction for a newly discovered reusable shared-renderer defect requires an immediate stop and forbids modifying shared infrastructure in this curriculum pull request. Accordingly, this report does not claim publication approval, and no curriculum remediation was retained after the blocker was confirmed.

## 3. Educational review

The stop occurred at required production visual validation. Before stopping, the canonical inventory and schema were confirmed: 50 activities in five banks of 10, with 50 unique IDs. A full educational certification, including unique Focus/Strategy/Verify ladders, explanation remediation, progression, vocabulary, and duplicate analysis, is intentionally not claimed because publication review cannot continue past the shared blocker.

## 4. Mathematical review

The blocker fixture is internally consistent in the authored prompt and answer fields: start 2 inches, end 8 inches, interval 6 inches, and correct answer 6. The fixed renderer now preserves start 2, end 8, and span 6. A complete recomputation of all 50 activities was stopped when production output exposed the computed span as the answer.

## 5. Mixed transfer review

Mixed transfer certification was not completed. No Mixed content was changed. This avoids presenting an incomplete content pass as publication-ready after the required stop condition was reached.

## 6. Visual review

All 24 ruler activities select the `ruler` renderer. The focused regression confirms that the approved off-zero fix is working through both required production paths. The new blocker is answer leakage: the renderer's `aria-label` includes “spanning [answer] [unit],” and its visible caption includes “The distance is [answer] [unit].” Thus the visual supplies the response rather than only representing the authored endpoints.

The defect is reusable shared behavior, not an activity-specific authoring error. Shared renderer, CSS, registry, and infrastructure files were not modified.

Chromium, Playwright, and Puppeteer are unavailable in the environment, so screenshots were not captured. Deterministic HTML inspection was performed through the production visual registry and full production question-card renderer.

## 7. Accessibility review

The same defect is an accessibility blocker because assistive technology receives the correct answer in the ruler's accessible name before interaction. Authoring `visual_description` or `accessible_description` cannot override or cure the answer-revealing shared output. A complete accessibility remediation was therefore not attempted.

## 8. Interaction review

Both production paths render the corrected off-zero geometry and no longer reset the authored start to zero. However, the question-card interaction presents a visual whose caption and accessible name disclose the correct response before submission. Production answer evaluation and the remaining interaction matrix were not certified after this blocker.

## 9. Files changed

- `tests/gamehub/skill-world/g2m-md-001-content-quality.test.js` — fresh canonical/schema check, approved off-zero regression, and a focused failing regression for shared answer leakage.
- `docs/curriculum-reviews/G2M_MD_001-review.md` — fresh blocker report.

The canonical package JSON was left unchanged because the defect is shared infrastructure and the publication audit stopped immediately.

## 10. Tests executed

The required commands and outcomes are reported in the final delivery. The focused content-quality test is expected to fail only at the regression proving shared ruler answer leakage.

## 11. Branch

`work`

## 12. Commit SHA

Reported in the final delivery because a commit cannot contain its own immutable SHA.

## 13. Pull request title

`Report G2M_MD_001 ruler answer-leakage blocker`

## 14. Scope confirmation

Exactly one package, `G2M_MD_001`, was reviewed. No shared renderer, CSS, registry, infrastructure, approved package, other-grade content, assessment, dashboard, route, persistence, replay behavior, or answer-shuffling file was modified. No second package was begun.
