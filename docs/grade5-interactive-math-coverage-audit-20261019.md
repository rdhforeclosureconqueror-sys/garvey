# Grade 5 Math — interactive learning coverage audit (2026-10-19)

## Goal
Every Grade 5 Math question should provide an **appropriate, manipulable, mobile-friendly mathematical model**, modeled on the working Fraction Lab (PR #807). No model may disclose the correct response before the learner submits. The visual must be relevant to the question, not a generic tap counter.

## Verified repository inventory
Ten published Grade 5 skill packages exist in `public/gamehub/skill-world/content/`. Their declared visual-model types are:

| Package | Skill area | Declared models | Proposed learner action |
| --- | --- | --- | --- |
| G5M_OA_001 | Expressions, patterns, coordinates | expression_builder, ordered_pair_plot, pattern_table, coordinate_plane | Drag operations/parentheses; extend patterns; plot points on touch grid |
| G5M_NBT_001 | Place value and rounding | place_value_chart, rounding_model, decimal_grid, number_line | Move digits between columns; shade decimal grids; drag rounding marker |
| G5M_NBT_002 | Whole-number operations | algorithm_steps, area_model, partial_products_model, division_model, remainder_model | Build area arrays and partial products; place quotient digits; group remainders |
| G5M_NBT_003 | Decimal operations | decimal_grid, algorithm_steps, place_value_chart, word_problem_model | Align decimal places, model tenths/hundredths, construct equation |
| G5M_FR_001 | Add/subtract fractions | fraction_bar, equation_builder, fraction_circle, word_problem_model | Existing tap-to-build/take-away Fraction Lab; extend to equivalent-piece regrouping |
| G5M_FR_002 | Multiply fractions | fraction_area_model, equation_builder, fraction_bar, multiplication_model, word_problem_model | Shade rows and columns to discover overlapping area |
| G5M_FR_003 | Divide fractions | fraction_division_model, fraction_bar, division_model, word_problem_model | Group unit fractions and count how many fit |
| G5M_MD_001 | Measurement and volume | rectangular_prism_model, measurement_conversion_table, volume_model, line_plot | Stack unit cubes; convert units; place data marks |
| G5M_GM_001 | Coordinate geometry | coordinate_plane, graph_interpretation, ordered_pair_plot, pattern_table | Plot and drag points; inspect graph rules |
| G5M_GM_002 | Classify shapes | hierarchy_diagram, geometry_card_sort, shape_identification, attribute_sort | Sort shapes by properties and nested families |

**Important:** Presence of a visual renderer is **not** evidence of learner interaction. This audit identifies package/model coverage and desired interaction, not a completed browser-by-browser interaction certification.

## Definition of done — per question and per skill
1. The student can tap, drag, sort, build, place, or manipulate the model meaningfully before submitting.
2. Model pieces, scales, units, and quantities match the prompt exactly; no invented mathematical facts.
3. Visual, aria-label, alt text, DOM attributes, and pre-answer feedback do not disclose the result.
4. Guided Help works a **different-number** example, one step at a time, including mixed-number regrouping where applicable.
5. Touch targets are comfortable on iPhone; keyboard and screen-reader alternatives work.
6. Reset, next question, question changes, and returning to the page clear interaction state correctly.
7. All five Practice Center levels (including Mixed), Guided Mission practice/checkpoint, and representative word problems have regression coverage.
8. Tests exercise interactions, not merely assert that HTML contains a model class; CI must pass before merge.
9. Confirm deployment commit on both Render services and complete real-device tap testing.

## Release sequence
- **Wave 1:** Stabilize FR_001 subtraction (including regrouping and sequential target boundaries), then build FR_002 overlap shading and FR_003 unit-fraction grouping.
- **Wave 2:** NBT_001 place-value/decimal grid and NBT_003 decimal alignment, followed by NBT_002 multi-digit operations.
- **Wave 3:** OA_001 and GM_001 touch coordinate plane, expression builder, and pattern rules.
- **Wave 4:** MD_001 unit cubes/conversions/line plots and GM_002 shape sorting/classification.
- For each wave: inventory question formats → implement shared interaction behavior → add test fixtures across levels → review → fix → CI → merge → deploy → verify on iPhone.

## Screenshot-based feedback from the live Fraction Lab
- The built 2 1/4 and 3/4 bars and progress counters are visible and functional.
- The **Hint / Help** area is long and vertically separated from the manipulable model. Prefer a compact expandable guided step panel beside/below the model with no answer leak.
- The prompt currently appears **below** the interactive model in the screenshot. Move or repeat the prompt above the model so the student knows the task before interacting.
- “Show Answer / Continue” is visible before submission; audit the reveal policy and avoid accidental answer leakage.
- Verify that “Compare equal-sized pieces” and “Take away” handle borrowing/regrouping for 2 1/4 − 3/4, and do not merely remove arbitrary blue pieces without teaching the regrouping.

## Tracking
Audit initiated; **not** a claim that all Grade 5 questions have been converted. Record actual interaction implementation and CI evidence separately for each skill.

## 2026-10-24 iPhone coordinate follow-up and whole-grade audit checkpoint
- User-supplied iPhone screenshots confirm the graph, x/y axes, question prompt, and answer controls are now contained in the visible card after responsive PR #840. This is a **single-device visual smoke check**, not certification of 320px, tablet, desktop, keyboard, or every graph type.
- The coordinate visual still displayed an unsolicited x/y movement procedure before Hint/Help. Remove that automatic caption; retain the different-number four-step coordinate worked example inside Help.
- Guided Help is educationally useful but visually long on phones; audit progressive disclosure, repeated \"Reveal step\" headings, spacing, and accessibility without shortening the actual mathematical explanation.
- Grade 5 has **10 published math skill packages** (inventory above). OA_001 received the five-lesson work, interactive pattern/coordinate activities, and layout fixes. This does **not** certify OA_001's entire question bank or the remaining nine skills.
- Next audit order: OA_001 all five levels plus Mixed and checkpoint; GM_001 coordinate geometry and pattern table; NBT_001/002/003; FR_001/002/003; MD_001; GM_002. Record pass/fail per level for model accuracy, no answer leaks, different-number hints, scoring, reset, audio, responsive 320/375/390/tablet/desktop, and 44px touch targets.
- Open concern: pattern-table renderer may reveal `q.rule` in the question visual. Determine whether the rule is already given in the prompt before suppressing it; do not blindly hide necessary data.
- No whole-grade certification claim until each package's representative questions and mobile interactions have passed regression and real-device checks.

## 2026-10-25 — OA pattern-table answer-leak audit
- Inspected 13 `pattern_table` questions in `G5M_OA_001` Level 3: three requested inputs already had their final output shown in `pattern_rows` (questions 3, 6, 7). Replaced those three output cells with `?` while preserving each question's `correct_answer`, rule, other examples, and scoring.
- Inspected `G5M_GM_001` pattern-table level-bank references: one mixed-level question uses the renderer; no input-target output leak of this type was found in that item.
- Showing a rule in the visual is legitimate where it is already stated in the prompt; this audit therefore did not remove those rule labels.
- Scope limited to this verified defect. Remaining Grade 5 skills/levels, browser interactions, and responsive checks are NOT certified by this fix.
