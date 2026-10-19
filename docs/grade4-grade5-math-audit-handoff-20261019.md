# Math Audit Handoff — October 19, 2026

## Priority and resumption order
1. Finish **Grade 5 Math** across all ten production skills, starting with **G5M_OA_001 — Expressions, Patterns, and the Coordinate Plane**.
2. Return to **Grade 2** and finish the subjects needed by the younger child.
3. Resume **Grade 4 Math** from the paused checkpoint below; then complete other grades.

## Grade 4 checkpoint — PAUSED, NOT FULLY CERTIFIED
- Completed initial focused review of **G4M_FR_002 — Add and Subtract Fractions**.
- PR #802 merged (fraction-bar operand visuals and like-denominator four-step help).
- PR #803 merged (word-problem fraction bars, subtraction circles, and operation language).
- PR #804 merged as commit **46c9488d749e06ba1ccf1b144268f795c63abdd7** (mixed-number and fraction-story four-step hints, regrouping example).
- Automated CI passed for #804. Verify the new commit is live on BOTH Render services; mobile/browser E2E remains **not certified**.
- Remaining Grade 4 work: audit all G4M_FR_002 levels and all other Grade 4 math skills for operand-accurate diagrams, non-spoiling hints with formulas and a different worked example, scoring, answer validation, audio, and real mobile behavior. Do not mark Grade 4 complete.

## Grade 5 Math — start here
- Skill map: `docs/grade5_math_completion_plan.md`.
- First audit target: `G5M_OA_001` — write/evaluate expressions, patterns, and coordinate plane.
- For each skill: inspect question banks, renderer behavior, hint pedagogy, answer validation and feedback; add regressions; review → fix → merge → deploy → verify.
- **Tutoring standard:** four useful step-by-step hints with the rule/formula and a solved DIFFERENT example, never the student's answer; models must represent the problem rather than precomputed result; every focused level and Mixed should have 10–12 real questions.
- Do not claim an area certified solely because a route or CI test passes.
