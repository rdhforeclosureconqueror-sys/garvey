# Garvey Math — Curriculum-wide Teaching Standard

Status: adopted design and implementation contract; **not** a claim that all skills have been migrated.

## Scope and rollout
Apply across math skills, starting with Grade 5, then Grade 2, then Grade 4 and remaining grades. Audit every existing skill package and its Skill World route before marking it complete. Do not force five lessons where the curriculum has fewer distinct conceptual steps: target five meaningful stages aligned to the five practice levels when appropriate; never pad with repetitive pages.

## Lesson → Skill World → Practice contract
1. Each practice level maps to an explicit lesson with a goal, prerequisite, formula/rule, worked example and visual representation of the same example.
2. The lesson shows each transformation and **why** it works, including where conversion factors originate. A static picture is insufficient when the concept requires regrouping or exchange.
3. The student then manipulates an appropriate model: fraction strips, number lines, arrays, base-ten blocks, area/volume models, coordinate grids or measurement tools.
4. Practice hints reinforce the same method using **different numbers**. No current-question answer or intermediate final result may leak before submission.
5. Mixed review combines prior methods, with prompts to select a strategy.

## Visual language
- 🟣 Find / identify: choose an operation, target, shared multiple, or known quantity.
- 🔵 Rename / transform: equivalent fractions, unit conversions, decompositions, or place-value exchanges.
- 🟢 Calculate / verify: operate, simplify and check reasonableness.
- 🟠 Regroup / adjust: borrowing, composing, decomposing and corrections.
- 💡 Remember: one short rule with readable formula and verbal explanation.
- 🎨 See the math: diagram tied to **the active lesson**, never a hard-coded diagram carried into another lesson.
- 🎯 Your turn: one low-stakes retrieval or prediction question.

Color must never be the only signal: always pair with text, shape/icon and accessible labels. Keep contrast and reduced-motion preferences. Use emoji sparingly and consistently rather than as decoration.

## Mobile acceptance criteria
- At 320px CSS viewport and up, no clipped text, horizontal overflow, or overflowing math formulas. Use overflow-wrap:anywhere on long expressions; preferably break formulas at logical steps.
- Touch targets >=44x44 CSS px with visible focus and readable controls.
- No large unbroken text walls. Show one conceptual step per card, progressively disclose extra detail.
- Diagram changes when switching lessons; switching back restores the correct model.
- Support keyboard, screen-reader descriptions, and non-color indicators.
- Do not assume that a student can read mathematical symbols without narration.

## Quality gates per skill
- Verify lesson-to-level mapping, mathematical correctness, example and diagram correspondence, hint answer secrecy, input/scoring, mobile behavior, and navigation.
- Automated tests cover each level's distinct diagram and examples, representative boundary cases, and that hints do not include current answers.
- Run CI, review failures, merge only after green, verify both Render services on the merged commit, and perform iPhone smoke tests.
- Record migrated skills and outstanding gaps. Do not label the full grade complete before every skill is audited.

## Evidence-informed teaching rationale
Use explicit instruction and worked examples to introduce unfamiliar procedures, concrete/visual representations to explain quantities, scaffolded guided practice, and retrieval/independent practice to consolidate learning. Avoid treating decorative colors or emoji alone as proven learning gains; evaluate outcomes with error rates, retention and successful independent transfer.

## Rollout checklist
- [ ] Grade 5: inventory all math packages, map levels to lesson pages and classify visual model needs
- [ ] Grade 5: migrate one non-fraction skill as reusable template; test mobile and math correctness
- [ ] Grade 5: migrate remaining skills, track each package and verify
- [ ] Grade 2: apply age-appropriate interaction and text density
- [ ] Grade 4: resume audit and migrate
- [ ] Remaining grades: repeat audit, tests, deploy and verify
