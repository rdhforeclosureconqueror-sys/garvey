# G2M_NS_001 — Count, Read, and Write Numbers to 1,000 Content Quality Review

## 1. Executive summary

All 52 canonical questions were reviewed. The revision replaces generic instruction with question-specific teaching, gives every activity a unique focus–apply–verify hint ladder, expands all eight multiple-choice activities to four plausible choices, balances their authored keys, and replaces two repeated Mixed targets with new transfer contexts. No renderer or shared runtime change was needed.

## 2. Package selection and curriculum inventory

Repository inspection found exactly the following Grade 2 English packages. “Canonical” means the questions in `level_banks`, the student-facing Skill Practice inventory.

| Package ID | Package Title | Domain | Canonical Question Count | Review Status |
|---|---|---|---:|---|
| G2E_FL_001 | Grade 2 Sight Words and Fluency | Fluency | 50 | Completed |
| G2E_RC_001 | Ask and Answer Questions About Text | Reading Comprehension | 50 | Completed |
| G2E_RC_002 | Story Structure and Retelling | Reading Comprehension | 50 | Completed |
| G2E_RC_003 | Main Idea and Key Details | Reading Comprehension | 50 | Completed |
| G2E_RF_001 | Advanced Phonics and Word Analysis | Reading Foundations | 52 | Completed |
| G2E_RF_002 | Prefixes, Suffixes, and Base Words | Reading Foundations / Vocabulary | 50 | Completed |
| G2E_VOC_001 | Vocabulary and Context Clues | Vocabulary | 50 | Completed |
| G2E_WR_001 | Write Opinion Pieces | Writing / Composition | 50 | Completed |
| G2E_WR_002 | Write Informative/Explanatory Text | Writing / Composition | 50 | Completed |
| G2E_WR_003 | Narrative Writing With Sequence | Writing / Composition | 50 | Completed |

Grade 2 ELA is fully complete, so the decision rule requires beginning Math. `G2M_NS_001` is the first logical unaudited package because counting, reading, and writing numbers establishes number sense before place-value comparison, operations, measurement, data, and geometry.

| Package ID | Package Title | Domain | Canonical Question Count | Review Status |
|---|---|---|---:|---|
| G2M_NS_001 | Count, Read, and Write Numbers to 1,000 | Number Sense / Base Ten | 52 | Completed in this review |
| G2M_NS_002 | Compare Three-Digit Numbers | Number and Operations in Base Ten | 52 | Unaudited |
| G2M_PV_001 | Place Value to Hundreds | Number and Operations in Base Ten | 52 | Unaudited |
| G2M_OP_003 | Fluency With Addition and Subtraction Within 20 | Operations and Algebraic Thinking | 50 | Unaudited |
| G2M_OP_001 | Add Within 100 | Operations / Base Ten | 50 | Unaudited |
| G2M_OP_002 | Subtract Within 100 | Operations / Base Ten | 50 | Unaudited |
| G2M_WP_001 | Addition and Subtraction Word Problems | Operations and Algebraic Thinking | 50 | Unaudited |
| G2M_MD_001 | Measure Length | Measurement and Data | 50 | Unaudited |
| G2M_MD_002 | Time and Money | Measurement and Data | 50 | Unaudited |
| G2M_MD_003 | Data, Graphs, and Line Plots | Measurement and Data | 50 | Unaudited |
| G2M_GM_001 | Shapes, Arrays, and Partitioning | Geometry | 50 | Unaudited |

## 3. Original curriculum defects

The original 52-question bank reused only three hint ladders, producing 49 duplicate ladders. Explanations such as “The pattern counts by 1” named a rule but did not model an operation or verification. Feedback was identical throughout. Multiple-choice items offered only three options, keys were concentrated at A (5 of 8), and distractors sometimes represented arbitrary numbers rather than a specific counting or place-value error. One focused prompt was repeated in Mixed, and the Mixed bank reused the focused target “1,000 in word form.”

## 4. Educational improvements

Every explanation now identifies the counting or place-value operation, applies it, and describes a check. Every hint ladder focuses on the activity’s own number, applies an appropriate strategy, and ends in verification without presenting the answer alone. Correct feedback connects success to the rule; corrective feedback directs attention to place values or equal jumps.

## 5. Domain-specific improvements

The review verified all values stay within 1,000, all completed sequences have constant differences matching their authored steps, and word forms correctly represent hundreds, tens, and ones. The progression remains within Grade 2: counting by 1, 5, 10, and 100; crossing tens and hundreds; and translating between numerals and word forms. No Grade 3 computation was introduced.

## 6. Interaction types verified

`number_sequence` (24), `short_response` (20), and `multiple_choice` (8) all render without fallback UI. Correct responses evaluate true and representative wrong responses evaluate false. Existing interaction support was sufficient.

## 7. Files changed

- `public/gamehub/skill-world/content/G2M_NS_001.skill-package.v1.json`
- `tests/gamehub/skill-world/g2m-ns-001-content-quality.test.js`
- `docs/curriculum-reviews/G2M_NS_001-review.md`

## 8. Questions reviewed

All 52 canonical questions were reviewed: 10 each in Levels 1–4 and 12 in Mixed. The review also synchronized matching mission-bank records so learners receive the corrected instructional language in both experiences.

## 9. Weak distractors replaced

All eight multiple-choice activities now display four choices. New distractors model authentic errors: skipping a boundary number, reversing tens and ones, confusing 905 with 950 or 590, using the wrong skip-count increment, and changing the wrong place when adding 100.

## 10. Answer-key corrections

No mathematically false canonical key was found. Two Mixed targets were changed to eliminate repeated assessment material, with their keys and supporting metadata updated consistently. A final precision pass also corrected the place-value metadata and teaching for 1,000 and 864, and replaced incorrect counting-by-1 language on the “100 more” and “100 less” activities with addition and subtraction by 100. All sequence keys were recalculated by the focused test.

## 11. Duplicate counts before and after

Duplicate counts are occurrences beyond the first.

| Measure | Before | After |
|---|---:|---:|
| Normalized prompts | 1 | 0 |
| Hint ladders | 49 | 0 |
| Displayed answer sets | 0 | 0 |
| Duplicate choices within an item | 0 | 0 |

## 12. Focused-to-Mixed duplication before and after

| Measure | Before | After |
|---|---:|---:|
| Identical prompts | 1 | 0 |
| Identical number sequences | 0 | 0 |
| Identical displayed answer sets | 0 | 0 |
| Repeated focused word-form target identified in manual review | 1 | 0 |

## 13. Answer-position distribution before and after

Distribution covers the eight activities with displayed choices. Runtime shuffling was not changed.

| Position | Before | After |
|---|---:|---:|
| A | 5 (62.5%) | 2 (25%) |
| B | 2 (25%) | 2 (25%) |
| C | 1 (12.5%) | 2 (25%) |
| D | 0 (0%) | 2 (25%) |

## 14. Curriculum scorecard

Scores use a five-point scale.

| Dimension | Before | After | Evidence |
|---|---:|---:|---|
| Mathematical correctness | 4 | 5 | Every sequence and key is programmatically verified |
| Grade 2 alignment | 4 | 5 | Scope stays within 1,000 and approved skip-count rules |
| Prompt clarity | 3 | 5 | Tasks and requested representations are explicit |
| Explanation quality | 1 | 5 | Operation, application, and check are taught |
| Hint quality | 1 | 5 | 52 unique focus–apply–verify ladders |
| Distractor quality | 2 | 5 | Four choices tied to realistic misconceptions |
| Answer integrity | 2 | 5 | One key and a 2/2/2/2 authored distribution |
| Mixed transfer | 2 | 5 | New prompts, sequences, targets, and answer sets |
| Accessibility | 4 | 5 | Contextual Read Question narration retained |
| **Overall** | **2.6** | **5.0** | Publication-quality content plus focused gates |

## 15. Representative review examples

For `996, 997, 998, 999, __`, the original explanation only labeled the count-by-1 pattern. The revision tells learners to add 1 to 999, identifies 1,000, and asks them to confirm the constant jump. For counting by 100 from 318, distractors now distinguish changing the hundreds digit correctly from changing tens, subtracting, or adding only 90.

## 16. Accessibility and Listen review

Every canonical question retains a **Read Question** control whose audio text equals the complete prompt. Equations and sequences are presented in context, no image-only information is required, and no audio field consists only of the correct answer. The test renders all 52 controls and rejects isolated **Listen** answer controls.

## 17. Tests added

The focused suite validates existence, banks, counts, IDs, schema, instructional fields, placeholders, unique ladders, choices, one displayed key, balance, numeric values, sequence operations, units, prompt and answer-set uniqueness, Mixed separation, renderer paths, evaluation, and contextual audio.

## 18. Test commands and exact totals

- `node --test tests/gamehub/skill-world/g2m-ns-001-content-quality.test.js`: 11 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo.
- `node --test tests/gamehub/skill-world/skill-world-generator.test.js`: 1 passed, 0 failed, 0 skipped, 0 cancelled, 0 todo.
- `git diff --check`: passed with no output.

## 19. Deferred items

None. No runtime defect or regression in an approved package was discovered.

## 20. Branch

`fix/g2m-ns-001-content-quality`

## 21. Commit SHA

`8b92ec9` (content, focused tests, and initial review document).

## 22. PR title

`Improve Count, Read, and Write Numbers to 1,000 content quality`

## 23. Scope confirmation

Only `G2M_NS_001`, its focused validation suite, and this review were changed. No approved Grade 2 ELA package, other Math package, shared runtime, assessment, dashboard, authentication, persistence, routing, replay randomization, or answer shuffling was modified. Work stops after exactly one package.
