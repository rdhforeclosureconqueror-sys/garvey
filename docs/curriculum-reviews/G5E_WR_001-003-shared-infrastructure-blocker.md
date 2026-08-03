# Grade 5 English Writing Publication Audit — Shared Infrastructure Blocker

## Blocker Summary

The fresh publication audit selected `G5E_WR_001`, `G5E_WR_002`, and `G5E_WR_003` as the exact next three packages in the authoritative dependency order after `G5E_RC_001`, `G5E_RC_002`, and `G5E_RC_003`. Curriculum remediation was stopped and discarded when the required combined validation run exposed a shared production-readiness infrastructure defect.

## Failing Shared Suite

The shared `grades4-6-english-production-readiness` suite fails its hub integration contract. Its final assertion requires the legacy source pattern `skillWorldPackages.filter((pkg)=>Number(pkg.grade)===Number(grade)).map(renderGeneratedMission)`, `Start Skill World`, and the older generated-mission rendering path. The current shared Adaptive Learning hub instead loads manifest packages into `state.packages`, filters them through `selectedPackages()`, renders them through `renderLessonCard`, and labels the primary route `Start Lesson`.

This mismatch predates and is independent of the three selected writing packages. The shared suite and current shared hub cannot both satisfy their checked contract as presently written. The publication-quality package suite, shared visual infrastructure suite, shared generator suite, and manifest suite passed within the same combined run before the shared readiness assertion failed.

## Reproduction

```bash
node --test tests/gamehub/skill-world/shared-visual-infrastructure.test.js tests/gamehub/skill-world/skill-world-generator.test.js tests/gamehub/grades4-6-english-production-readiness.test.js tests/gamehub/grade1-skill-world-manifest-hub.test.js
```

Observed result after discarding provisional package work: 43 tests passed and 1 test failed. The failure is `Grades 4-6 English hub filters and route actions are manifest-driven without hardcoded English placeholders`, at `tests/gamehub/grades4-6-english-production-readiness.test.js:242`.

## Required Infrastructure Resolution

Determine the canonical shared hub contract, then align the shared readiness suite with it. If the current Adaptive Learning hub is canonical, the suite should verify manifest loading, `state.packages` grade/subject filtering, `renderLessonCard`, `/skill-world/:skillId` and `/skill-world/:skillId/drill` route generation, and the current `Start Lesson`/`Practice This Skill` labels. If the legacy contract is canonical, restore that contract in the shared hub and verify all manifest-driven routes before resuming publication work.

## Scope and Stop Confirmation

No curriculum package remediation, publication certification, package-specific quality test, renderer change, or fourth-package work is included. All provisional changes to `G5E_WR_001`, `G5E_WR_002`, and `G5E_WR_003` were discarded immediately after discovery. The three-package publication audit must restart from a completely fresh state after the shared infrastructure fix is merged.

## Publication Status

**BLOCKED — NOT CERTIFIED.** Wait for the shared infrastructure fix before restarting the Grade 5 English publication audit.
