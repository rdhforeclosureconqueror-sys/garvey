# Garvey Genius Growth — Grade 5 Implementation Pilot

## Decision
**Extend Skill World; do not rebuild Math and English.** Preserve grade-level standards, question banks, hints, mastery and existing assessment data. Add optional Genius invitations and separate observed-evidence events. This is a limited pilot, not a deployed child dashboard or a validated psychological measure.

## What is implemented in this branch
- `youth-development/content/grade5GeniusEvidencePilot.js`: six real Grade 5 skill IDs (three Math, three English), tagged opportunities, optional child-facing prompts, validated signals and a pure event formatter.
- `tests/youth-development/grade5-genius-evidence-pilot.test.js`: checks category IDs, co-occurrence behavior, missing evidence, and invalid events.
- No database migration, page integration, endpoint, or production feature flag yet. These need the next implementation and testing pass.

## Principles
1. Keep the **seven existing** Garvey categories: SR Focus & Self-Control; CQ Curiosity & Love of Learning; CR Creativity & Idea Thinking; RS Thinking & Problem Solving (including pattern recognition); PS Effort & Resilience; FB Learning From Feedback; DE Interests & Passion Areas. Do not create new Genius types.
2. **Tagging an activity means opportunity, never observed proficiency.** Record evidence only for an actual response, explanation, creative artifact, or documented choice. Every record must trace to a real lesson ID, prompt, evidence ID, source and content version.
3. Show child's own initial assessment and parent observations **separately** from measured lesson behavior. Do not rank a child based on an uncalibrated mix.
4. Do not interpret silence, use of a hint, slow response, disability accommodations, or choosing to skip as a weak Genius.
5. An activity may record **multiple codes in one observed event**, so combinations are visible without inventing new labels. Combination counts are evidence of co-occurrence in that task, not proof of underlying traits or causality.
6. Store minimal child data; keep existing parent/child authorization and retention rules; never expose another child's records.

## Integration contract for next stage
- Present at most one relevant optional invitation alongside the standard Skill World lesson after normal instruction.
- Only emit a signal after the child submits the relevant work or reflection. If unverified free text, store the reflection as the child's self-report rather than claiming correctness or proficiency.
- Store: owned child ID, consent/authorization context, `skill_id`, content version, task difficulty, activation ID, observed signal, evidence reference, source, timestamp and session ID. Derive mapped codes through the mapping module server-side.
- Use idempotent event IDs and ownership validation. Never accept client-submitted Genius scores or dimension codes as proof.
- Report academics from normal mastery records. Report Genius opportunities offered, actually attempted, and observed events **separately** for a comparable timeframe.
- Compare like difficulty and version; show insufficient-opportunity status when evidence is sparse. A change in opportunities offered must not masquerade as improvement.
- Assess pattern recognition from a new item where the child identifies/tests a rule, **not** mere accuracy on a familiar pattern problem.
- Before numerical levels or rankings: define observable rubrics, independent teacher/child annotations, inter-rater agreement, and sensitivity to grade, context and item difficulty. The prior illustrative 1–4 ratings are not validated scores.

## Worked example: Marleigh (design illustration, not a fabricated platform record)
- `G5M_FR_001` fractions: choose `test_pattern`, explain a rule and test on an unseen fraction problem; if the action is truly observed, map `RS + CQ`.
- `G5E_WR_001` writing: choose a real problem she cares about, write an evidence-backed case for her home-assistance robot; if she actually links the skill to the project, record `DE + CR` through the documented prompt. Written work still needs academic scoring independently.
- Compare future independent demonstrations to baseline self-reflection, while retaining the distinction between what she *said*, what an adult *observed*, and what the software *verified*.

## Next steps
1. Review the six pilot package IDs and the optional prompts with teacher/child usability checks. Inspect each lesson runtime's event hooks.
2. Wire one Grade 5 Math lesson and one English lesson behind a feature flag. Capture actual evidence server-side with child ownership and consent; add integration and live-flow tests.
3. Show the seven child cards with `observed / emerging / more opportunities needed` and *why*, plus observed co-activation moments.
4. Expand coverage across Grade 5, then other grades using audited skill-specific prompts—not generic tags assigned to every question.
5. Pilot with genuine student work before deciding numeric scaling or growth charts.

## Acceptance test
A parent can trace a report statement to **a specific academic task and observed child action**, and the system can distinguish no opportunity, skipped invitation, attempted invitation and observed evidence.
