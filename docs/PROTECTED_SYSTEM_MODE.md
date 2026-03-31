# Garvey Protected System Mode

This document captures the repository protection protocol for implementation sessions.

## Primary Directive
- Extend the system; do not modify, refactor, or rebuild existing functionality unless explicitly instructed.
- Prefer additive, isolated modules over invasive changes.

## Protected Systems (Do Not Modify Unless Explicitly Requested)
1. Kanban board core logic
2. Card creation, rendering, and movement system
3. Return / reward engine
4. Assessment / intake flows
5. Results pages and share/send flows
6. Archetype system and image mapping
7. Existing API contracts used by frontend
8. Tenant/site generation system
9. Existing routing behavior
10. Any working UI unrelated to the current task

## Build-Safe Workflow (Mandatory)
Before changing code:
1. Inspect exact files needed.
2. Build an impact map of files that would be affected.
3. List protected files/systems that must not change.
4. Scope-lock to only necessary files.

During implementation:
- Keep changes minimal and targeted.
- Reuse existing patterns.
- Avoid unrelated cleanup/refactoring.

After implementation:
1. Confirm changed files.
2. Confirm files intentionally untouched.
3. Verify protected systems did not regress.

## Non-Regression Checklist
- Kanban board loads/functions.
- Cards create/edit/move correctly.
- Data persists after refresh.
- Reward/return system functions.
- Assessment/intake flow works.
- Results/share/send flows work.
- Routes behave as before.
- Frontend/API contract compatibility maintained.
- Images/assets still resolve.

## No-Drift Rules
Do not:
- Refactor unrelated code.
- Rename shared structures without explicit task scope.
- Change data contracts silently.
- Change global behavior to solve local issues.
- Introduce breaking changes without explicit instruction.

## Extension Strategy
- Add features as isolated modules.
- Plug into existing systems without altering base logic.
- Reuse card/board patterns where relevant.

## Verification Output Template
Each implementation update should include:
1. What was built.
2. Files modified.
3. Files intentionally not touched.
4. Routes added/used.
5. Data structures added/extended.
6. Proof of functionality.
7. Confirmation of no regressions.
