# Grade 4 Guided Math Hints — implementation contract

## Audit findings
- `public/gamehub/skill-world/index.html` copies existing hint text into feedback on `#hint` and `#drill-hint`.
- `answerFeedback` and `drillFeedback` reveal the correct answer immediately on an incorrect response.
- `G4M_FR_001` worked-example hints are generic, not procedural.
- The photographed unlike-denominator exercise is `G5M_FR_001` (Grade 5), not Grade 4.

## Required behavior
1. Hints teach using a mathematically valid **different problem**, never the active question or its answer.
2. Use numbered, individually revealable steps: identify operation, find common denominator (when relevant), rename fractions by multiplying numerator and denominator equally, operate on numerators, simplify, check.
3. Use fraction bars/circles tied to the example values; audio reads each instructional step.
4. Wrong answers provide a non-spoiling prompt and allow a retry. Reveal the correct answer only through an explicitly chosen Show Answer action; record that choice.
5. Keep original question and response state intact when opening/closing help; preserve mastery and attempt persistence.
6. For common denominator questions, teach using alternate denominator pairs; don't reveal the current pair's LCD.
7. Never generate misleading examples: equivalent-fraction tasks use equivalence examples; ordering uses comparison examples; addition/subtraction use the same operation and appropriate difficulty.
8. Correct inaccurate 'Build an equation' instructions where the equation is already presented.
9. Avoid duplicate Next/Continue controls or inadvertent skipping.

## Acceptance tests
- Grade 4 `G4M_FR_001`, `G4M_FR_002`, `G4M_FR_003`: correct instructional examples by question family, mathematical correctness, no answer leakage, keyboard/audio access, and mobile layout.
- Grade 5 `G5M_FR_001`: common denominators, equivalent fractions, unlike-fraction addition and subtraction; step-by-step examples are different from the active problem.
- Wrong-answer retry does not reveal the correct answer; Show Answer does; persistence and score remain correct.
- Run `node tests/gamehub/skill-world/skill-world-generator.test.js` plus targeted regression tests.
- Review, fix, merge, deploy and verify only after tests pass.
