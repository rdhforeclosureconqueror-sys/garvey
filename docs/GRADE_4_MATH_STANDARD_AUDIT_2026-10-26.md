# Grade 4 Math Teaching-Standard Audit — October 26, 2026

## First-pass decision

Grade 4 Math has the complete structural base to serve a learner today: ten manifested Math packages, five ten-question practice levels per package, full question narration, and a 30-question Grade 4 assessment. It did **not** yet meet the current Grade 5 teaching-help standard at the learner surface. This first standards pass fixes that help gap and installs regression coverage.

## Assessment finding

| Check | Result |
| --- | --- |
| Grade 4 Math package inventory | 10 exact production packages |
| Canonical instructional activities | 500 (50 per package) |
| Assessment-deliverable pool | 259 unique items after safe eligibility checks |
| Baseline assessment | 30 items, three per package |
| Public answer-key fields | Not delivered to learner payloads |
| Hints / explanations / feedback in assessment payloads | Not delivered |
| Scoring | Verified 0/30, 8/30, and 30/30 scenarios |
| Narration | Present for all 500 canonical activities |

Two Geometry assessment stimuli visually show a shape while asking the learner to identify it. Those are valid instructional stimuli: their visible and accessible labels do not name the answer. They are not answer-key leaks.

## What Grade 4 lacked

Before this change, each Grade 4 source activity stored only a three-line generic hint list. The Skill World question card displayed only the first line, and its Hint button did not deliver the established four-step, different-example support. This meant a learner could receive a prompt such as “use the visual model” without the actual rule, worked method, or safe transfer example.

## Remediation in this PR

For every Grade 4 Math practice and drill question, the question card now renders a guided-help panel with a grade-appropriate worked path:

1. Identify the math relationship or rule.
2. Build, label, or organize a model.
3. Work a **different** example.
4. Verify and transfer the method to the learner’s question.

The examples are tailored by Grade 4 skill family: multiplicative comparison, place value, addition/subtraction, multiplication, division, equivalent fractions, fraction-by-whole-number multiplication, measurement conversion, and geometry. The established fraction-addition/subtraction help remains in place, including mixed numbers and story contexts.

This help is intentionally available only in Skill World practice/drill. Assessment delivery remains answer-safe and hint-free.

## Regression coverage

`tests/gamehub/skill-world/g4m-guided-help-standard.test.js` verifies all 500 Grade 4 canonical activities resolve to a non-spoiling worked-help path of at least four steps with a distinct example. It also verifies both mission practice and drill cards expose the panel.

Focused validation for this PR:

```text
node --test \
  tests/gamehub/skill-world/g4m-guided-help-standard.test.js \
  tests/gamehub/skill-world/g4-fraction-no-leak.test.js \
  tests/gamehub/assessment-mvp-grade4-math-quality.test.js \
  tests/gamehub/skill-world/skill-world-generator.test.js \
  tests/gamehub/assessment-mvp-grade5-math-quality.test.js
```

Result: 23 passing, 0 failing.

## Remaining package-by-package work

This is the standards foundation, not Grade 4 final certification. The next passes should audit each package’s authored lesson, active visual, mathematical recomputation, answer aliases, mobile behavior, and duplicate practice choices. The assessment selector currently rejects malformed duplicate-choice multiple-choice items; that keeps them out of assessment delivery, but those source items still deserve package-level cleanup before Grade 4 is called fully certified.
