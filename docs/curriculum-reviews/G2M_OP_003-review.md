# G2M_OP_003 — Fluency With Addition and Subtraction Within 20 Review

## 1. Selected package

`G2M_OP_003` was the only package reviewed. The complete canonical inventory comprises 10 questions in each of `G2M_OP_003_LVL1`, `G2M_OP_003_LVL2`, `G2M_OP_003_LVL3`, `G2M_OP_003_LVL4`, and `G2M_OP_003_MIXED`, for 50 questions total. No sampling was used.

## 2. Executive summary

All 50 canonical activities were individually reviewed and recomputed. The revised package provides mathematically exact facts within 20, renderer-complete model metadata, unique Focus–Strategy–Verify ladders, reasoning-based explanations with inverse checks, balanced multiple-choice positions, ten new Mixed transfer contexts, accurate accessible descriptions, and full Read Question audio. No shared infrastructure defect was found and no shared infrastructure was changed.

The original package's principal publication blockers were a single repeated generic hint ladder, explanations that only announced an answer, concentrated multiple-choice keys, absent visual/accessibility descriptions, incomplete audio context, incomplete number-bond fields, and a Mixed bank copied from focused activities.

## 3. Educational review

The progression is appropriate for Grade 2 fluency within 20: Level 1 makes a ten; Level 2 applies doubles and near doubles; Level 3 connects addition and subtraction fact families; Level 4 finds unknown parts and addends; Mixed selects among those strategies in new situations. Vocabulary now consistently uses child-friendly terms such as *addend*, *whole*, *part*, *double*, *near double*, *remaining*, and *inverse operation* in context.

Every activity has three activity-specific hints labeled Focus, Strategy, and Verify. Focus identifies the useful mathematical structure; Strategy carries out a fact strategy with the authored values; Verify checks the result, normally with the inverse operation. All 50 hint ladders are distinct. Explanations show the intermediate fact or decomposition, explain why the method preserves or relates quantities, and model an inverse check rather than merely stating the answer.

Canonical prompt duplicates: 0. Canonical hint-ladder duplicates: 0. Multiple-choice options are locally unique. The sequence retains 16 multiple-choice and 34 short-response interactions.

## 4. Mathematical review

Every operand, intermediate fact, result, `answer`, `correct_answer`, `acceptable_answers`, `value`, operation tag, number-bond part/whole field, and ten-frame quantity was independently checked. All operands and results are nonnegative whole numbers no greater than 20. Addition activities have exact totals; subtraction activities have exact differences; missing-addend activities have parts that sum to the whole; missing-subtrahend activities distinguish the amount removed from the amount remaining.

Number bonds now explicitly provide `whole`, `parts`, `part_a`, and `part_b` consistent with the equation. Ten-frame metadata lists the exact two joined quantities. The 50 answers use 14 values: 5 (1), 6 (5), 7 (5), 8 (7), 9 (4), 10 (3), 11 (1), 12 (4), 13 (8), 14 (4), 15 (2), 16 (3), 17 (2), and 18 (1).

## 5. Mixed transfer review

All ten copied Mixed questions were replaced with original, age-appropriate contexts involving counters, apples, birds, beanbags, books, stickers, shells, crayons, children, and buttons. Mixed now requires learners to recognize make-ten, doubles/near-doubles, related-fact, fact-family, and unknown-part structures without strategy labels in the prompt. It reuses no focused prompt, ordered arithmetic pair, equation, or context. The ten Mixed prompts and ten Mixed arithmetic pairs are also unique within Mixed.

## 6. Visual review

All 50 canonical visuals were rendered and inspected programmatically through both the visual registry and full production question-card path. The inventory is 14 `ten_frame`, 16 `number_bond`, 11 `addition_model`, and 9 `subtraction_model` activities. Each output was nonblank, carried the exact requested `data-renderer`, and contained no fallback, placeholder, unavailable, or unsupported state.

The review checked quantities, whole/part relationships, addition groupings, subtraction starting/removed/remaining quantities, renderer selection, labels, and descriptions. Number-bond metadata was completed so the renderer receives explicit parts rather than inferring them from prompt text. No shared renderer defect was discovered.

Playwright, Puppeteer, and a Chromium executable are unavailable in this environment, so browser screenshots could not be captured. The required fallback was completed: every activity was exercised through both the visual registry and complete question-card renderer, for 100 renderer-path validations.

## 7. Accessibility review

Every activity contains matching, meaningful `visual_description` and `accessible_description` fields. Addition descriptions name both joined quantities and the total. Subtraction descriptions identify the starting quantity, quantity removed, and quantity remaining; unknown-removal descriptions explicitly distinguish the unknown removed amount from the known remainder. Number-bond descriptions name the whole and both parts.

Every Read Question control includes the complete prompt followed by its visual context. Mathematical symbols are spoken naturally as “plus,” “minus,” and “equals”; question marks are described as an unknown rather than read as punctuation. Audio never consists only of the answer.

## 8. Interaction review

All 50 canonical question cards render through `SkillWorldRenderer.renderQuestionCard`, and every authored correct response evaluates successfully through the production `evaluateAnswer` path. No unsupported interaction appeared. All 16 multiple-choice sets contain four unique options and mirror `choices`; correct positions are balanced exactly 4/4/4/4 across positions 1–4.

## 9. Files changed

- `public/gamehub/skill-world/content/G2M_OP_003.skill-package.v1.json`
- `tests/gamehub/skill-world/g2m-op-003-content-quality.test.js`
- `docs/curriculum-reviews/G2M_OP_003-review.md`

## 10. Tests executed

- `node --test tests/gamehub/skill-world/g2m-op-003-content-quality.test.js`
- `node --test tests/gamehub/skill-world/skill-world-generator.test.js`
- `npm run validate:curriculum-index`
- `git diff --check`
- `git status --short --branch`

The focused nine-test suite covers schema; bank counts; IDs; arithmetic and answer fields; operation, number-bond, and ten-frame metadata; unique hints; reasoning explanations and inverse verification; duplicates; Mixed transfer; option uniqueness and position balance; visual metadata and registry compatibility; accessibility and audio; full question-card rendering; and production answer evaluation.

## 11. Branch

`work`

## 12. Commit SHA

The exact immutable SHA is reported in the final delivery and pull request because a commit cannot embed its own SHA.

## 13. Pull request title

`Review G2M_OP_003 fluency content and visuals`

## 14. Scope confirmation

Work stopped after exactly `G2M_OP_003`. Only the three authorized package, focused-test, and review-report files were changed. No approved package, Grade 1 or Grade 3 content, assessment, routing, dashboard, persistence, replay, answer-shuffling, shared renderer, or infrastructure file was modified.
