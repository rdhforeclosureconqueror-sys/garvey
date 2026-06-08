# Assessment Item Writing Specification v1

Status: **provisional governance standard**. This document and its companion JSON standard describe how future assessment items should be authored, reviewed, classified, and indexed. They are not an item bank, not a runtime item-delivery API, and not psychometric validation.

Companion machine-readable standard: `curriculum-framework/assessment/item-writing-specification.v1.json`.

## 1. Scope and intent

This specification defines the minimum metadata, authoring constraints, public/private data separation, and validation checks required before a future item can be considered for field testing or operational use. It deliberately does not modify production SkillPackages, manifests, routes, renderers, production schemas, voice/audio systems, learner progress systems, dashboards, or curriculum indexes.

Every future assessment item must be written to measure a clear construct, produce interpretable evidence, protect scoring information, and preserve the zero-decision-weight field-test policy established in the accepted assessment framework.

## 2. Required item metadata

Every future item record must include the following metadata fields:

- `item_id`
- `version`
- `package_id`
- `grade`
- `subject`
- `domain`
- `construct`
- `evidence_statement`
- `cognitive_demand`
- `difficulty_target`
- `question_type`
- `stimulus`
- `prompt`
- `visible_prompt`
- `spoken_prompt`
- `visual_requirements`
- `audio_requirements`
- `accessibility_requirements`
- `correct_answer`
- `acceptable_answers`
- `rubric`
- `partial_credit`
- `distractors`
- `distractor_rationales`
- `misconceptions` (protected top-level item misconception taxonomy)
- `misconception_for_each_distractor` (protected per-option mapping)
- `prohibited_clues`
- `reading_level_target`
- `estimated_completion_time`
- `assessment_role_eligibility`
- `review_state`
- `field_test_state`
- `statistical_state`
- `item_status`
- `active_status`
- `source_provenance`
- `change_history`

The JSON standard classifies each field as always required, conditionally required, protected/private, safe for public delivery, reviewer-only, derived rather than author-entered, or statistical metadata.

### Referenced field model

The companion JSON defines every referenced item field with a type, required/conditional classification, visibility classification, and validation expectation. `misconceptions` is a protected top-level item field for the item-level misconception taxonomy. `misconception_for_each_distractor` is a protected option-level mapping from distractor identifiers to entries in that taxonomy. Both are non-public and must remain out of public delivery metadata and public candidate indexes.

The previously symbolic conditional fields are formal fields: `reviewer_notes`, `scoring_anchor_examples`, `human_review_guidance`, `single_correct_option`, `option_ordering_policy`, `all_correct_options`, `select_all_instruction`, `left_options`, `right_options`, `correct_mappings`, `distractor_mappings_or_extra_options`, `accessibility_linearization`, `ordered_elements`, `correct_sequence`, `partial_order_rules`, `drag_keyboard_equivalent`, `interaction_target_regions`, `correct_interactions`, and `alternate_input_equivalent`. Public interaction-support fields may be delivered only when they cannot reveal the answer; scoring, rationale, mapping, and review fields remain protected/private or reviewer-only.

## 3. Public/private separation

Assessment systems must keep public delivery data separate from protected scoring and review data.

### Public item-delivery metadata

Public delivery metadata may include only fields needed to select and render the item without exposing the answer path:

- `item_id`, `version`, `package_id`, `grade`, `subject`, `domain`, and `construct`
- `question_type`, `cognitive_demand`, and `difficulty_target`
- learner-facing `stimulus`, `visible_prompt`, and `spoken_prompt`
- non-revealing `visual_requirements`, `audio_requirements`, and `accessibility_requirements`
- `reading_level_target`, `estimated_completion_time`, `assessment_role_eligibility`, `item_status`, and `active_status`

### Public candidate-index allowlist

Public candidate indexes must use an explicit allowlist and must not expose governance workflow state. Candidate-index metadata may include only:

- `item_id`
- `version`
- `package_id`
- `grade`
- `subject`
- `domain`
- `question_type`
- `difficulty_target`
- `cognitive_demand`
- `assessment_role_eligibility`
- audio availability
- visual requirement summary
- `active_status`
- operational `item_status` when safe
- `estimated_completion_time`
- public prompt/stimulus delivery references where applicable

Public candidate indexes must not include `review_state`, `workflow_state`, `field_test_state`, `statistical_state`, `reviewer_notes`, `statistical_metadata`, `statistical_parameters`, private provenance, approval history, scoring keys, answer keys, rubrics, distractor correctness indicators, or misconception mappings.

### Protected data

Protected fields must remain server-side or in reviewer/scoring systems only:

- `correct_answer`
- `acceptable_answers`
- `rubric`
- `partial_credit`
- `distractors` when correctness or answer metadata is represented
- `distractor_rationales`
- `misconceptions` top-level taxonomy
- `misconception_for_each_distractor` option-level mappings
- `prohibited_clues`
- reviewer notes
- source details that are private or license-sensitive
- statistical metadata and parameters

Public candidate indexes must not expose protected answer, scoring, rubric, rationale, or statistical fields. A candidate index may reference an item by opaque `item_id` and public classification metadata, but it must not include the scoring key or any rationale that would help a learner infer the answer.

## 4. Item-writing rules

All future items must satisfy these rules:

1. Measure one clear construct unless intentional integration is documented in `integrated_construct_rationale` and approved during curriculum review.
2. Use age-appropriate language.
3. Avoid trick wording and unnecessarily complex syntax.
4. Avoid accidental clues in text, option length, formatting, ordering, images, audio emphasis, file names, alt text, or metadata.
5. Use plausible misconception-based distractors for multiple-choice and multi-select items.
6. Keep unrelated reading load minimal in Math.
7. Maintain semantic equivalence between `visible_prompt` and `spoken_prompt`.
8. Ensure audio does not reveal the answer through wording, stress, pacing, pronunciation, tone, sound effects, or silence.
9. Avoid unrelated cultural knowledge unless that knowledge is explicitly part of the construct.
10. Prevent duplicate or near-duplicate operational items within the same form.
11. Use only canonical item-status values from the accepted framework: `instruction_only`, `practice`, `progress_monitoring_candidate`, `diagnostic_candidate`, `mastery_candidate`, `field_test`, `reviewed_candidate`, `validated_operational`, `suspended`, and `retired`.
12. Use `validated_operational` items only for operational mastery decisions.
13. Preserve field-test isolation: field-test items may collect item statistics but have zero decision weight.

## 5. Question-type-specific requirements

### Constructed response

Constructed-response items require:

- a protected `correct_answer` or scoring target
- protected `acceptable_answers`
- a protected rubric
- partial-credit rules or an explicit statement that partial credit is disabled
- anchor examples for reviewer/scorer calibration
- human-review guidance when automated scoring is insufficient

### Multiple choice

Multiple-choice items require:

- exactly one correct option
- plausible distractors
- a protected rationale for each distractor
- an explicit misconception represented by each distractor
- option-ordering policy
- checks for clues from option length, grammar, determiners, or parallelism

### Multi-select

Multi-select items require:

- all correct options
- clear select-all instruction
- plausible distractors
- a rationale and misconception for each distractor
- exact protected `multi_select_scoring` configuration
- checks that the number of correct options is not cued accidentally

The protected `multi_select_scoring` configuration must be deterministic and include `scoring_mode`, `correct_option_weight`, `incorrect_option_penalty`, `minimum_score`, `maximum_score`, `omission_behavior`, `negative_scores_allowed`, `normalization_rule`, and `partial_credit_enabled`. Allowed `scoring_mode` values are `all_or_nothing`, `additive`, and `additive_with_incorrect_penalty`. Negative scores are allowed only when explicitly configured; otherwise the minimum-score floor applies. The normalization rule must specify the exact transformation from raw score to reported score. Generic partial-credit prose is insufficient.

### Matching

Matching items require:

- left-side options
- right-side options
- protected correct mappings
- distractor mappings or extra options where appropriate
- keyboard and screen-reader linearization
- checks that visual layout does not reveal relationships

### Ordering

Ordering items require:

- ordered elements
- protected correct sequence
- partial-order rules when more than one sequence is acceptable
- drag-and-drop keyboard equivalent
- checks that labels, numbering, or image metadata do not reveal the sequence

### Visual interaction

Visual-interaction items require:

- interaction target regions
- protected correct interactions
- alternate input equivalents
- alt text that supports access without revealing the answer
- checks for non-answer-revealing visuals, contrast, and target sizing

## 6. Representative valid item example

```json
{
  "item_id": "item-g3m-frac-compare-001",
  "version": "1.0.0",
  "package_id": "G3M_FR_001",
  "grade": 3,
  "subject": "Math",
  "domain": "Fractions",
  "construct": "Compare unit fractions with like numerators using visual area models",
  "evidence_statement": "Learner identifies which of two same-numerator fractions is greater from equal-size area models.",
  "cognitive_demand": "skill_concept",
  "difficulty_target": "medium",
  "question_type": "multiple_choice",
  "stimulus": {
    "type": "image_pair",
    "description": "Two same-size rectangles partitioned into thirds and fourths."
  },
  "prompt": "Which fraction is greater?",
  "visible_prompt": "Which fraction is greater?",
  "spoken_prompt": "Which fraction is greater?",
  "visual_requirements": {
    "equal_whole_size": true,
    "alt_text": "Two equal-size rectangles show two thirds and two fourths."
  },
  "audio_requirements": {
    "read_options_verbatim": true,
    "no_answer_revealing_emphasis": true
  },
  "accessibility_requirements": {
    "screen_reader_equivalent": true,
    "keyboard_selectable_options": true
  },
  "correct_answer": "2/3",
  "acceptable_answers": ["2/3", "two thirds"],
  "rubric": {"full_credit": "Selects 2/3."},
  "partial_credit": {"enabled": false, "reason": "Single-key selected response."},
  "distractors": ["2/4", "1/3", "1/4"],
  "distractor_rationales": [
    {"distractor": "2/4", "misconception": "Compares denominators as larger pieces without attending to area."},
    {"distractor": "1/3", "misconception": "Confuses numerator count with displayed shaded parts."},
    {"distractor": "1/4", "misconception": "Selects smallest displayed unit fraction."}
  ],
  "prohibited_clues": ["Do not make the correct model larger.", "Do not emphasize 'thirds' in audio."],
  "reading_level_target": {"grade": 3, "math_unrelated_reading_load": "minimal"},
  "estimated_completion_time": 45,
  "assessment_role_eligibility": ["progress_monitoring", "grade_mastery"],
  "review_state": "draft",
  "field_test_state": "not_field_tested",
  "statistical_state": "not_available",
  "item_status": "mastery_candidate",
  "active_status": "inactive",
  "source_provenance": {"authoring_source": "internal_draft", "license": "internal"},
  "change_history": []
}
```

This example is valid because it has one clear construct, minimal unrelated reading load, semantically equivalent visible and spoken prompts, protected scoring data, and misconception-based distractors.

## 7. Representative invalid item examples

### Invalid: accidental clue and weak distractors

```json
{
  "item_id": "item-g3m-frac-invalid-001",
  "question_type": "multiple_choice",
  "visible_prompt": "Carefully choose the ONLY large correct fraction: 2/3.",
  "spoken_prompt": "Carefully choose the only large correct fraction, two thirds.",
  "correct_answer": "2/3",
  "distractors": ["cat", "blue", "yesterday"],
  "distractor_rationales": []
}
```

Problems:

- The prompt reveals the answer.
- Distractors are not plausible and are not tied to misconceptions.
- The visible and spoken prompts include answer-revealing wording.
- Required metadata is missing.

### Invalid: protected scoring data in public index

```json
{
  "candidate_index_entry": {
    "item_id": "item-g4e-mainidea-002",
    "construct": "Identify main idea",
    "correct_answer": "The passage is mainly about migration.",
    "rubric": {"full_credit": "Mentions migration."}
  }
}
```

Problems:

- `correct_answer` and `rubric` are protected fields.
- Public candidate indexes must not expose answer or scoring data.

## 8. Candidate indexes without answer exposure

Future candidate indexes should reference items like this:

```json
{
  "item_id": "item-g3m-frac-compare-001",
  "version": "1.0.0",
  "package_id": "G3M_FR_001",
  "grade": 3,
  "subject": "Math",
  "domain": "Fractions",
  "construct": "Compare unit fractions with like numerators using visual area models",
  "question_type": "multiple_choice",
  "item_status": "reviewed_candidate",
  "assessment_role_eligibility": ["progress_monitoring"],
  "estimated_completion_time": 45
}
```

The index points to a candidate item but does not expose `correct_answer`, `acceptable_answers`, `rubric`, `partial_credit`, distractor rationales, misconception mappings, or statistical parameters.

## 9. Limitations and expert-review requirements

This specification is provisional. Automated validation can catch missing metadata, illegal status values, public/private classification errors, and some structural risks, but it cannot establish content validity, fairness, developmental appropriateness, accessibility adequacy, or psychometric quality by itself.

Expert review remains required for:

- curriculum alignment
- subject-matter correctness
- construct clarity
- developmental appropriateness
- accessibility and modality equivalence
- bias and sensitivity
- audio and visual non-disclosure
- field-test interpretation
- statistical quality and differential-item-functioning review
- standard setting before operational mastery use
