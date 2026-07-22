# G2M_OP_002 — Subtract Within 100 Review

## 1. Executive summary

All 50 canonical activities in `G2M_OP_002` were reviewed individually. The package now contains mathematically exact subtraction and place-value metadata, activity-specific Focus–Strategy–Verify hints, explanations that teach method and rationale and verify by inverse addition, balanced multiple-choice keys, ten original Mixed transfer situations, meaningful visual descriptions, and complete Read Question audio. No shared infrastructure was changed.

## 2. Original defects

The original package repeated one generic hint ladder and brief answer-confirmation explanations. It concentrated correct multiple-choice answers in one position, omitted visual and accessible descriptions, and read equations without visual context. Mixed copied all ten arithmetic pairs from Levels 1–4, including prompts and visual arrangements, rather than measuring transfer.

## 3. Educational improvements

The sequence remains appropriate for Grade 2: subtract tens, subtract a one-digit amount without decomposing, subtract two-digit amounts without decomposing, and then decompose a ten. Each canonical activity now has exactly three unique hints labeled Focus, Strategy, and Verify. Each explanation identifies the place-value method, explains why decomposition preserves value when required, and models an addition check.

## 4. Mathematical improvements

All 50 differences were independently recalculated. The audit checks minuend, subtrahend, difference, value, ones, tens, decomposition flag, correct answer, and acceptable answers. Every problem stays within 100 and has a nonnegative whole-number difference. The regrouping flag is true exactly when the minuend has fewer ones than the subtrahend.

## 5. Visual review

Every one of the 50 canonical activities is visual. The inventory is 14 `base_ten_blocks`, 13 `number_line`, 12 `place_value_chart`, and 11 `subtraction_model` activities. All 50 were rendered through the visual registry and the complete question-card path. Output was nonblank, identified the requested renderer, and contained no fallback, unavailable, or placeholder state. Descriptions identify the starting amount, amount removed, and difference and accurately explain what each renderer displays.

## 6. Accessibility review

Every activity now has matching `visual_description` and `accessible_description` fields naming all three mathematically relevant quantities. Every Read Question control reads the entire prompt in natural language and follows it with the meaningful visual description. Equation prompts say “minus” rather than relying on speech synthesis to interpret a symbol.

## 7. Interaction review

All 50 question cards render through the production interaction renderer, and all 50 correct answers evaluate successfully. The inventory remains 20 multiple-choice and 30 short-response activities. Multiple-choice options are unique within each activity, all 20 option sets are distinct, and correct positions are balanced 5/5/5/5.

## 8. Questions reviewed

The complete canonical inventory was reviewed: 10 questions in each of `G2M_OP_002_LVL1`, `G2M_OP_002_LVL2`, `G2M_OP_002_LVL3`, `G2M_OP_002_LVL4`, and `G2M_OP_002_MIXED`, for 50 total. No sampling was used.

## 9. Files changed

- `public/gamehub/skill-world/content/G2M_OP_002.skill-package.v1.json`
- `tests/gamehub/skill-world/g2m-op-002-content-quality.test.js`
- `docs/curriculum-reviews/G2M_OP_002-review.md`

## 10. Duplicate counts

Canonical prompt duplicates: 0. Canonical visual signatures (minuend, subtrahend, renderer) duplicated: 0. Canonical hint-ladder duplicates: 0. Multiple-choice answer-set duplicates: 0. Focused-to-Mixed prompt duplicates: 0. Focused-to-Mixed arithmetic-pair duplicates: 0. Focused-to-Mixed visual-signature duplicates: 0.

## 11. Answer distribution

The 50 answers have 26 distinct values. Frequencies are: 20 (3), 21 (1), 22 (2), 24 (2), 25 (4), 26 (2), 30 (1), 32 (1), 33 (2), 34 (3), 35 (2), 41 (3), 42 (2), 43 (1), 44 (2), 45 (1), 46 (2), 47 (2), 50 (5), 51 (1), 62 (2), 63 (1), 64 (1), 70 (2), 81 (1), and 92 (1). Multiple-choice correct positions are exactly 5 in each of positions 1–4.

## 12. Representative examples

- `G2M_OP_002_LVL1_Q1` uses base-ten blocks to reason about 80 minus 30 as tens.
- `G2M_OP_002_LVL2_Q4` uses a place-value chart for subtracting 6 from 39 without decomposition.
- `G2M_OP_002_LVL3_Q4` uses a backward number line for 85 minus 41.
- `G2M_OP_002_LVL4_Q1` decomposes 1 ten to solve 52 minus 28 and verifies with 24 plus 28.
- `G2M_OP_002_MIXED_Q10` applies decomposition to a new seed-packet context using 60 minus 27.

## 13. Tests added

The focused nine-test suite validates package identity and schema; IDs and bank totals; every answer and arithmetic field; three unique instructional hints; teaching explanations; unique and balanced choices; prompt, answer-set, visual, and Mixed duplication; renderer compatibility; accessibility and visual consistency; question-card interactions; answer evaluation; and Read Question completeness.

## 14. Browser verification

Playwright, Puppeteer, and a Chromium executable were checked and are unavailable in this environment, so a browser screenshot could not be taken. As the documented environment fallback, all 50 visual activities were rendered to HTML through both the registry and full question-card renderer. The focused test inspects the renderer marker, nonblank output, and absence of fallback or placeholder text for every visual—100 renderer executions total across the two paths.

## 15. Deferred infrastructure issues

None. The four existing reusable renderers produced valid content for all activities, so review did not stop for an infrastructure defect.

## 16. Branch

`review/g2m-op-002`

## 17. Commit SHA

The commit is the branch `HEAD` containing this review; its exact immutable SHA is reported in the final delivery and pull request because a commit cannot embed its own SHA.

## 18. PR title

`Review G2M_OP_002 subtraction content and visuals`

## 19. Scope confirmation

`G2M_OP_002` is the logical next package after the approved `G2M_OP_001`: the available sequence continues from `G2M_OP_001` to `G2M_OP_002`, then `G2M_OP_003`. Work stopped after exactly this one Grade 2 Math package. No approved package, Grade 1 or Grade 3 content, assessment, dashboard, routing, persistence, replay, answer-shuffling, or shared renderer infrastructure file was modified.
