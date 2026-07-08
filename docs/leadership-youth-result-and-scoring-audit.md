# The Leader Within youth result and scoring audit

## Result architecture

The leadership result route is `/archetype-engines/leadership/result/:resultId` and is parsed by `public/archetype-engines/experience.js`. The same shared `renderResult` function renders adult leadership, youth leadership, love, and loyalty result payloads. Result payloads are scored and canonicalized by `server/archetypeEnginesService.js`, while routes, consent, assessment start, scoring, and result retrieval are handled by `server/archetypeEnginesRoutes.js`.

Adult versus youth mode is detected from stored payload attribution fields such as `audience_type`, `assessment_variant`, and `source_application`. Garvey first-party youth mode is represented by `audience_type=youth`, `source_application=garvey`, `program_context=leader_within`, and `first_party_program=true`. PocketPT-originated youth results keep PocketPT return behavior.

The legacy shared result renderer includes the operational diagnostic sections: Result ID, Score Visualization, Top 3 Breakdown, Output Contract, JSON Summary Block, Leadership Pattern, Balanced vs Unbalanced Leadership, Pressure Response, Identity vs Behavior Gap, Team Experience, Leadership Blind Spots, Weekly Balancing Habits, 30/90 Day Growth Path, and Full Archetype Spectrum. These remain available in the adult/shared result renderer and protected operational tools, but the Garvey Leader Within youth participant path now exits into a participant-safe renderer before those diagnostic sections are rendered.

AI voice is bound in `public/archetype-engines/experience.js` through the shared `AssessmentVoice` controller. Youth participant mode now binds only a youth story script to `section_key=youth_leadership_story` with the button label `Listen to My Leadership Story`.

## Youth participant result view

For Garvey Leader Within youth results, the participant view renders these sections in order: Result Identity, Personal Affirmation, What This May Look Like in Your Life, Your Natural Strengths, When Your Strength Becomes Too Strong, Your Supporting Strength, What to Practice Next, When You Feel Pressure, Your Leadership Practice for This Week, Your Next 7-Day Goal, Audio Experience, and Return to Youth Development.

The youth participant view hides by default: Result ID, internal codes as primary labels, Output Contract, JSON summary blocks, raw scores, weighted score payloads, desired gap values, identity-behavior gap values, stress percentages, confidence percentage, consistency percentage, internal balance-state labels, overexpressed/underexpressed terms, canonical scoring fields, maxPossibleScores, rawScores, normalizedScores, signal values, technical mapping data, adult workplace language, and developer metadata.

## Archetype-specific youth copy

Youth-facing copy is sourced from the `LEADERSHIP_YOUTH_COPY` object in `public/archetype-engines/experience.js`. It covers all five leadership archetypes: Vision Drive, Structure Drive, Relational Intelligence, Influence Expression, and Adaptive Control. Each archetype includes a personal affirmation, youth-life examples, strengths, imbalance explanation, pressure response, reset strategy, balancing practices, weekly practice, and suggested seven-day goals. Primary-secondary combinations are composed from primary copy plus secondary support strengths rather than creating 25 unrelated systems.

## Scoring and bank audit

The audit script is `scripts/audit-leadership-youth-scoring.mjs`. It compares adult Bank 1 and youth Bank 1 across bank ID, question ID, visible option position, dimensions, weight type, signal type, reverse pair ID, desired pair ID, question class, subclass, scored flag, display order, option IDs, and archetype mappings. It writes machine-readable results to `artifacts/leadership-audits/youth-scoring-audit.json`.

Audit result: adult and youth banks both contain 25 questions; parity passed with zero mapping differences. Youth wording did not alter IDs, weights, signals, reverse pairs, desired pairs, dimensions, or scoring semantics. No scoring weights or mappings were changed.

## Answer-position bias finding

The manual all-first-option result is reproducible and expected under the current visible option ordering. In the current youth bank, primary archetype placement by visible position is fully clustered: Vision Drive appears as option 1 on all 25 questions, Structure Drive appears as option 2 on all 25 questions, Relational Intelligence appears as option 3 on all 25 questions, and Adaptive Control appears as option 4 on all 25 questions. Influence Expression appears as a secondary mapping rather than as a visible primary option position. Therefore repeated same-position answering functions as a hidden archetype shortcut. This is an option-ordering flaw, not evidence of a scoring weight defect.

Recommended backward-compatible correction: introduce deterministic presentation-order rotation or attempt-stable randomization that preserves option IDs and scoring mappings, stores answer option IDs rather than visible indexes, keeps active attempts stable, remains accessible, and leaves historical results compatible. This correction was not implemented in this pass because it requires UI persistence and accessibility validation.

## Multiple question banks

Leadership Bank 2 and Bank 3 files already exist in the repository for adult/generated leadership paths, and the service has promotion manifest and governed-source concepts. However, the current Garvey youth program is wired to the youth Bank 1 authored variant. Because the current youth bank has a confirmed visible option-order flaw, Banks 2 and 3 were not promoted for youth production in this pass. Outcome B/C hybrid: youth participant result view completed, scoring audited, and additional youth banks deferred until presentation-order governance is corrected and measurement-equivalent authored youth banks can be validated safely.

## Limitations

This assessment is a development guide, not a diagnosis. It should not be used to label a child permanently or rank children. Scores are interpretable only in relation to the authored question bank, selected options, completion, and consistency logic. The current youth bank has validated scoring parity with the adult bank, but visible option ordering can bias patterned same-position responses.
