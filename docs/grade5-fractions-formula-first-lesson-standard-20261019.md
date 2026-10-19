# Grade 5 fractions — formula-first lesson and hint standard

The G5M_FR_001 skill package now contains five structured `lesson.level_lessons` entries covering LCD, adding, subtracting, mixed-number regrouping, and review. Each entry contains a formula, worked example, visual instruction, and check.

**Important integration requirement:** The existing Skill World renderer may not yet display `lesson.level_lessons`. These entries are structured lesson content, not proof of an interactive lesson UI. Wire the Start Lesson flow to these entries with one section per level, accessible worked visual models, and an example before practice.

Practice Hint / Help should use the same formula with **different numbers from the active question**, and explicitly show the multiplier `LCD ÷ denominator`, followed by `numerator × multiplier` and `denominator × multiplier`. Never show the active question's answer before submission.

For the screenshot's 7/8 − 1/4 worked example: multiples of 8 and 4 share 8; 8 ÷ 4 = 2; 1/4 × 2/2 = 2/8; then 7/8 − 2/8 = 5/8. The formula and the fraction-piece subdivision must both be visible. Mixed-number subtraction needs explicit regrouping.

Follow-up work: render these level lessons in Start Lesson, improve dynamic Hint / Help, test navigation, add CI regression coverage, and verify on iPhone.
