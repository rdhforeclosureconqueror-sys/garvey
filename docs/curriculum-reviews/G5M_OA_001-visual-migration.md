# G5M_OA_001 — expressions, patterns and coordinates migration audit

This is the **first non-fraction implementation target** under [Garvey Math Teaching Standard](../garvey-math-teaching-standard.md). It is an audit and test plan, not a declaration of finished implementation.

## Existing package
`public/gamehub/skill-world/content/G5M_OA_001.skill-package.v1.json` exists and declares five levels: write expressions, evaluate expressions, patterns, ordered pairs and mixed. Existing generic `lesson.concept_explanation` and `hint_ladder` do not meet the approved lesson-by-level teaching depth. Example existing generic hint: “Read the question and name the model first.” This does not show the needed operation or formula.

## Required lessons and visual interactions
| Level | Teach | Worked example | Interaction |
| --- | --- | --- | --- |
| 1 · Write expressions | translate “sum of”/“times” into grouped expressions | “Add 2 and 5, then multiply by 3” → (2+5)×3 | tap word cues, assemble expression tiles and parentheses |
| 2 · Evaluate | parentheses first, then multiplication/division, then addition/subtraction | (4+2)×3 → 6×3 → 18 | tap the next valid operation and move tiles through steps |
| 3 · Patterns | repeated rule; input/output table; check every row | start 2, add 3: 2,5,8,11 | choose rule, fill table, highlight differences |
| 4 · Coordinates | origin, x across then y up; ordered pairs | (3,2) = right 3, up 2 | tap grid intersection; display axes, not answer for live question |
| 5 · Mixed | identify strategy then apply | distinct example from each lesson | choose model, explain strategy, solve |

## Consistent visual language
🟣 Find = interpret question; 🔵 Transform = group/rename or map to coordinates; 🟢 Calculate/check = evaluate/verify; 🟠 Adjust = correct grouping or orientation. Each stage must have a concise rule card, short worked example, changing model and retrieval prompt.

## Known content gaps to fix
- Replace generic lesson prose with five substantive level-specific pages.
- Replace generic hints with four math-specific steps and a **different-number** worked example; never leak current answer.
- Add test coverage that models differ between expression, table and coordinate levels.
- Verify coordinate grids do not preplot the correct answer during practice.
- Validate all 10 questions per level, answer normalization and narration.
- Test iPhone viewport for math wrapping and 44px touch targets.

## Release criteria
Review → implement → CI → merge → verify both Render services → iPhone smoke test. Only mark this package migrated when all criteria pass.
