# G5M_OA_001 Publication Review

## Selection and sequence rationale

`G5M_OA_001 — Expressions, Patterns, and the Coordinate Plane` is the first Grade 5 Math package in the published completion-plan skill map and the first package in its stated dependency-order production sequence. This audit stops at that package.

## Executive summary

Fresh review of all 50 canonical Practice Center activities found repetitive template prompts, repeated coordinate points, generic hint ladders, answer-only explanations, and missing activity accessibility descriptions. All 50 activities were rewritten or refined, mathematically recomputed, and deterministically exercised through production visuals, cards, evaluation, and interaction state. The package is certified for production publication.

## Educational review

The five banks retain a 10/10/10/10/10 progression: translating contextual language into grouped expressions; evaluating grouping symbols; applying two-step input-output rules; reading first-quadrant ordered pairs; and authentic mixed transfer. Every activity now has a distinct prompt and model/data set, an activity-specific `Focus`, `Strategy`, and `Verify` ladder, and an explanation that connects operations or coordinates to reasoning rather than merely announcing an answer. Vocabulary consistently uses expression, parentheses/grouping symbols, input, output, rule, coordinate plane, x-coordinate, y-coordinate, and ordered pair at Grade 5 depth.

## Mathematical review

All expression fields and tokenized `expression_parts` agree; evaluated expressions perform grouped addition before multiplication; every pattern row and requested output satisfies its authored two-step rule; and every ordered-pair answer agrees with authored x/y visual data. Duplicated answer fields, acceptable answers, and multiple-choice keys are synchronized. All choice sets contain four normalized-unique choices and one key.

## Visual review

Every canonical activity was rendered through `visual-model-registry.js` and through `renderQuestionCard`. The package uses the registered `expression_builder`, `pattern_table`, `coordinate_plane`, and `ordered_pair_plot` renderers. Deterministic checks found no blank output, placeholder, unsupported renderer, or fallback. Visual metadata agrees with each authored problem and does not label a solution as the correct answer.

## Accessibility review

Every activity now supplies both `visual_description` and `accessible_description`. Coordinate narration identifies the accessible grid, axes, range, and point label without speaking the point's coordinates. Expression and pattern descriptions communicate the available tiles/table rows without assembling or announcing the answer. Every `Read Question` control includes the complete question plus meaningful visual context where needed and never consists of the isolated answer.

## Interaction review

All four authored interaction types (`expression_response`, `short_response`, `multiple_choice`, and `coordinate_response`) render with production controls. Correct and incorrect evaluation was checked for every canonical activity. Submission locking, retry reset, second submission, attempt count, correct count, and interaction-state updates were exercised for all 50 activities. Acceptable equivalent expression and ordered-pair formats remain supported.

## Validation coverage

The focused suite covers schema validity, bank counts, unique IDs, mathematical recomputation, answer consistency, prompt/context/hint uniqueness, explanation quality, duplicate answer-set detection, accessibility/audio safety, renderer registration and output, fallback/placeholder/leakage checks, question-card rendering, option synchronization, production evaluation, submission, retry, and state mutation.

## Scope confirmation and certification

Only `G5M_OA_001`, its focused validation test, and this review document were changed. No shared renderer, registry, CSS, infrastructure, assessment, other package, other grade, routing, persistence, replay, or shuffling file was modified. Exactly one Grade 5 Math package was reviewed. **Final certification: approved for production publication.**
