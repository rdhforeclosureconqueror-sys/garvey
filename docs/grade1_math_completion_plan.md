# Grade 1 Math Completion Plan (Skill World MVP)

## Executive Summary
This plan converts the Grade 1 K–6 audit into a contractor-ready, executable backlog for Skill World generation. It prioritizes full Grade 1 standards completion first (P0), then depth/rigor improvements (P1), then enrichment/polish (P2). Each work item explicitly names whether to extend an existing skill or create a new one, the visual models to use in SkillPackage JSON, required question types, misconception tags, dependencies, and testable acceptance criteria.

The proposed implementation sequence starts with Number & Operations in Base Ten and Operations/Algebraic Thinking closure, then completes Measurement/Data/Geometry gaps, and finally adds rigor and polish.

## Source Inputs Used
- `docs/k6_math_coverage_audit_2026-05-28.md`
- `docs/skill-world-generator.md`
- `public/gamehub/skill-world/content/G1M_DP_001.skill-package.v1.json`
- `public/gamehub/skill-world/content/G1M_OP_003.skill-package.v1.json`
- `curriculum-framework/skill-graphs/grade1/math/graph.v1.json`

## Existing Grade 1 Skills (Current Graph)
- Number Sense + Counting: `G1M_NS_002`, `G1M_NS_003`, `G1M_NS_004`
- Place Value: `G1M_PV_001`, `G1M_PV_002`, `G1M_PV_003`
- Addition + Subtraction: `G1M_AS_001`, `G1M_AS_002`, `G1M_AS_003`
- Word Problems: `G1M_WP_001`, `G1M_WP_002`, `G1M_WP_003`
- Measurement + Time: `G1M_MT_001`, `G1M_MT_002`, `G1M_MT_003`
- Geometry: `G1M_GEO_001`, `G1M_GEO_002`, `G1M_GEO_003`
- Data & Patterns (already present in content): `G1M_DP_001`

## Visual Model Baseline (Already Seen in Existing Packages)
Known available/used renderers from existing Grade 1 packages:
- `number_bond`
- `addition_model`
- `sorting_visual`
- `pattern_completion`

Recommended additional visual models for Grade 1 completion work:
- `base_ten_blocks`
- `place_value_chart`
- `number_line_0_120`
- `comparison_cards`
- `equation_balance`
- `story_problem_scene`
- `length_compare`
- `iterated_units_ruler`
- `analog_clock`
- `picture_graph`
- `bar_graph_basic`
- `shape_composer`
- `shape_partition`

## Backlog (Executable JSON)

```json
[
  {
    "work_id": "G1-P0-001",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_NS_002",
    "title": "Extend counting sequence range through 120",
    "domain": "Number Sense + Counting",
    "standards_gap": "Count/read/sequence numbers beyond 20 up to 120",
    "recommended_action": "Extend skill package banks to include forward/backward count sequences across decade transitions to 120.",
    "visual_models_needed": ["number_line_0_120", "comparison_cards"],
    "question_types_needed": ["short_response", "multiple_choice", "sequence_build"],
    "misconception_tags_needed": ["decade_transition_skip", "digit_reversal", "backward_count_drop"],
    "acceptance_criteria": [
      "SkillPackage includes >=6 guided_practice, >=12 adaptive_question_bank, >=4 checkpoint items spanning 0-120.",
      "Checkpoint includes at least 2 items crossing 99->100 and 109->110 transitions.",
      "Schema validation passes and generator route renders all question types without fallback placeholders."
    ],
    "depends_on": []
  },
  {
    "work_id": "G1-P0-002",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_PV_001",
    "title": "Deepen tens/ones and ten as a unit",
    "domain": "Place Value",
    "standards_gap": "Understand 10 as ten ones; identify tens and ones in two-digit numbers",
    "recommended_action": "Add item families for composing/decomposing 2-digit numbers to 99/120 and tens/ones identification.",
    "visual_models_needed": ["base_ten_blocks", "place_value_chart"],
    "question_types_needed": ["multiple_choice", "short_response", "drag_and_drop"],
    "misconception_tags_needed": ["ones_tens_swap", "ten_not_unitized", "digit_name_value_confusion"],
    "acceptance_criteria": [
      "Includes explicit prompts for '10 ones = 1 ten' and mixed tens/ones decoding tasks.",
      "At least 8 questions require labeling both tens and ones correctly.",
      "Mastery run demonstrates >=80% on mixed representation set (blocks, numerals, chart)."
    ],
    "depends_on": ["G1-P0-001"]
  },
  {
    "work_id": "G1-P0-003",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_NS_004",
    "title": "Compare two-digit numbers with symbols",
    "domain": "Number Sense + Counting",
    "standards_gap": "Compare 2-digit numbers using tens/ones and >, <, =",
    "recommended_action": "Add comparison reasoning prompts requiring tens-first then ones comparison and symbol selection.",
    "visual_models_needed": ["place_value_chart", "comparison_cards"],
    "question_types_needed": ["multiple_choice", "short_response", "true_false"],
    "misconception_tags_needed": ["compare_ones_first_error", "symbol_direction_error", "digit_size_heuristic"],
    "acceptance_criteria": [
      "Checkpoint includes at least 4 symbolic comparison items and 2 explanation items.",
      "Item set includes equal tens/different ones and different tens cases.",
      "All comparison items include misconception_tag coverage in misconception_bank."
    ],
    "depends_on": ["G1-P0-002"]
  },
  {
    "work_id": "G1-P0-004",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_AS_003",
    "title": "Equation meaning, true/false, and unknowns in all positions",
    "domain": "Operations",
    "standards_gap": "Equal sign meaning, true/false equations, unknowns all positions",
    "recommended_action": "Expand equation structures (a+b=?, a+?=c, ?+b=c, c-a=?, c-?=b, ?-a=b) and balance reasoning.",
    "visual_models_needed": ["equation_balance", "number_bond", "addition_model"],
    "question_types_needed": ["short_response", "multiple_choice", "true_false"],
    "misconception_tags_needed": ["equal_sign_as_answer", "operation_choice_confusion", "unknown_position_blindness"],
    "acceptance_criteria": [
      "Checkpoint includes at least one item per unknown-position template.",
      "At least 3 true/false equation items with both true and false cases.",
      "Learner explanation prompts require stating why both sides are equal."
    ],
    "depends_on": []
  },
  {
    "work_id": "G1-P0-005",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_OP_003",
    "title": "Add/subtract within 20 rigor: three addends and unknown-addend subtraction",
    "domain": "Operations",
    "standards_gap": "Three-addend addition; subtraction as unknown-addend problem",
    "recommended_action": "Expand number-bond fluency package to include 3-addend sums <=20 and subtraction-to-missing-addend transformations.",
    "visual_models_needed": ["number_bond", "addition_model", "number_line_0_120"],
    "question_types_needed": ["short_response", "multiple_choice"],
    "misconception_tags_needed": ["three_addend_drop_term", "subtract_not_inverse", "counting_on_error"],
    "acceptance_criteria": [
      "Adaptive bank includes >=6 three-addend items and >=6 subtraction-as-unknown-addend items.",
      "Checkpoint includes at least 2 items requiring two-step mental strategy.",
      "Question metadata includes misconception tags for each new item family."
    ],
    "depends_on": ["G1-P0-004"]
  },
  {
    "work_id": "G1-P0-006",
    "priority": "P0",
    "type": "NEW_SKILL",
    "skill_id": "G1M_NBT_005",
    "title": "Add within 100 using place value",
    "domain": "Place Value / Operations",
    "standards_gap": "Add within 100 using place value understanding",
    "recommended_action": "Create new skill package focused on adding tens and ones (without mandatory standard algorithm) using models and reasoning.",
    "visual_models_needed": ["base_ten_blocks", "place_value_chart", "number_line_0_120"],
    "question_types_needed": ["short_response", "multiple_choice", "explain_choice"],
    "misconception_tags_needed": ["ones_only_addition", "tens_carry_ignored", "place_value_misalignment"],
    "acceptance_criteria": [
      "Guided practice progresses from tens-only to mixed tens/ones sums within 100.",
      "Checkpoint has >=4 mixed problems and >=1 explanation prompt.",
      "Recommended next/remediation links are wired to existing Grade 1 operation/place-value skills."
    ],
    "depends_on": ["G1-P0-002", "G1-P0-003"]
  },
  {
    "work_id": "G1-P0-007",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_PV_001",
    "title": "Ten more / ten less and subtract multiples of 10",
    "domain": "Place Value",
    "standards_gap": "Find 10 more/less; add/subtract multiples of 10 in range",
    "recommended_action": "Add place-value jump and mental strategy item sets for +/-10 and subtracting 10,20,... from 2-digit numbers.",
    "visual_models_needed": ["number_line_0_120", "place_value_chart"],
    "question_types_needed": ["short_response", "multiple_choice"],
    "misconception_tags_needed": ["changes_ones_instead_of_tens", "negative_boundary_confusion", "decade_jump_error"],
    "acceptance_criteria": [
      "Includes >=10 items distributed across +10, -10, and -multiple-of-10 cases.",
      "At least 3 items cross decade boundaries.",
      "Checkpoint accuracy target configured at mastery_threshold >=80."
    ],
    "depends_on": ["G1-P0-002"]
  },
  {
    "work_id": "G1-P0-008",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_MT_002",
    "title": "Measure length with repeated units",
    "domain": "Measurement",
    "standards_gap": "Measure length by iterating same-size units",
    "recommended_action": "Expand measurement tasks to enforce zero alignment, gap-free unit iteration, and same-unit comparisons.",
    "visual_models_needed": ["iterated_units_ruler", "length_compare"],
    "question_types_needed": ["multiple_choice", "short_response", "error_analysis"],
    "misconception_tags_needed": ["endpoint_not_zero", "unit_gap_overlap", "mixed_unit_compare"],
    "acceptance_criteria": [
      "Checkpoint includes at least 2 items detecting misaligned start points.",
      "Item set includes indirect comparison task using measured lengths.",
      "Misconception bank defines feedback for each measurement error pattern."
    ],
    "depends_on": []
  },
  {
    "work_id": "G1-P0-009",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_MT_001",
    "title": "Order three objects by length",
    "domain": "Measurement",
    "standards_gap": "Order 3 objects by measurable length",
    "recommended_action": "Add direct and indirect comparison triads with shortest/longest/middle prompts.",
    "visual_models_needed": ["length_compare"],
    "question_types_needed": ["multiple_choice", "drag_and_drop", "short_response"],
    "misconception_tags_needed": ["visual_bias_thickness", "middle_item_misorder", "comparison_transitivity_break"],
    "acceptance_criteria": [
      "Includes at least 6 triad-ordering items with varied orientation.",
      "At least 2 prompts ask for middle-length object explicitly.",
      "Checkpoint includes one indirect-comparison ordering item."
    ],
    "depends_on": ["G1-P0-008"]
  },
  {
    "work_id": "G1-P0-010",
    "priority": "P0",
    "type": "NEW_SKILL",
    "skill_id": "G1M_MT_004",
    "title": "Tell and write time to hour and half-hour",
    "domain": "Measurement + Time",
    "standards_gap": "Tell and write time in hours and half-hours",
    "recommended_action": "Create dedicated clock-reading skill package with analog clocks and matched digital/write formats.",
    "visual_models_needed": ["analog_clock"],
    "question_types_needed": ["multiple_choice", "short_response", "matching"],
    "misconception_tags_needed": ["hour_hand_precision_error", "half_hour_minute_confusion", "clock_label_reversal"],
    "acceptance_criteria": [
      "Includes both read-clock and set/identify-clock style prompts.",
      "Checkpoint includes balanced hour and half-hour items.",
      "Acceptable answers include common formatting variants (e.g., 3:30, 03:30)."
    ],
    "depends_on": []
  },
  {
    "work_id": "G1-P0-011",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_DP_001",
    "title": "Represent and interpret data in up to three categories",
    "domain": "Data & Patterns",
    "standards_gap": "Organize/represent/interpret category data; answer more/less/how many",
    "recommended_action": "Extend current sorting/pattern package into category count representation and interpretation question sets.",
    "visual_models_needed": ["picture_graph", "bar_graph_basic", "sorting_visual"],
    "question_types_needed": ["multiple_choice", "short_response", "true_false"],
    "misconception_tags_needed": ["category_count_mismatch", "more_less_inversion", "total_vs_category_confusion"],
    "acceptance_criteria": [
      "Includes datasets with 2 and 3 categories and count interpretation prompts.",
      "Checkpoint includes at least one 'how many more/less' comparative question.",
      "Misconception bank includes feedback for graph-read vs count errors."
    ],
    "depends_on": []
  },
  {
    "work_id": "G1-P0-012",
    "priority": "P0",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_GEO_003",
    "title": "Defining/non-defining attributes and partitioning",
    "domain": "Geometry",
    "standards_gap": "Distinguish defining attributes; partition circles/rectangles into halves/fourths",
    "recommended_action": "Extend attribute reasoning and add equal-share partition tasks for circles and rectangles.",
    "visual_models_needed": ["shape_partition", "shape_composer"],
    "question_types_needed": ["multiple_choice", "short_response", "true_false"],
    "misconception_tags_needed": ["attribute_nondefining_overweight", "unequal_partition_accepted", "fraction_name_mismatch"],
    "acceptance_criteria": [
      "Item bank includes both defining vs non-defining attribute classification tasks.",
      "At least 4 partition tasks across halves and fourths with equal-share checks.",
      "Checkpoint includes one counterexample where equal-looking but unequal parts are rejected."
    ],
    "depends_on": []
  },
  {
    "work_id": "G1-P1-013",
    "priority": "P1",
    "type": "EXTEND_EXISTING_SKILL",
    "skill_id": "G1M_GEO_001",
    "title": "Compose 2D and 3D shapes",
    "domain": "Geometry",
    "standards_gap": "Compose larger shapes from smaller components",
    "recommended_action": "Add composition/decomposition puzzles for 2D and introductory 3D combinations.",
    "visual_models_needed": ["shape_composer"],
    "question_types_needed": ["drag_and_drop", "multiple_choice"],
    "misconception_tags_needed": ["shape_part_identity_loss", "rotation_rejection", "face_vs_shape_confusion"],
    "acceptance_criteria": [
      "Includes at least 3 2D compose tasks and 2 3D compose tasks.",
      "Checkpoint requires selecting all valid compositions for a target shape.",
      "Question prompts explicitly accept rotated equivalent shapes where appropriate."
    ],
    "depends_on": ["G1-P0-012"]
  },
  {
    "work_id": "G1-P1-014",
    "priority": "P1",
    "type": "ENGINE_SUPPORT",
    "skill_id": "ENGINE_VIS_001",
    "title": "Add/confirm visual renderers needed for Grade 1 completion",
    "domain": "Platform / Generator",
    "standards_gap": "New skill packages require additional visual models",
    "recommended_action": "Implement or confirm renderer support and graceful fallback for planned models.",
    "visual_models_needed": ["base_ten_blocks", "place_value_chart", "number_line_0_120", "equation_balance", "iterated_units_ruler", "analog_clock", "picture_graph", "bar_graph_basic", "shape_partition", "shape_composer"],
    "question_types_needed": ["render_validation"],
    "misconception_tags_needed": [],
    "acceptance_criteria": [
      "Renderer registry documents support status for each planned visual_model.",
      "Generator test suite includes at least one fixture per newly supported model.",
      "No planned Grade 1 package renders fallback placeholder text in happy path."
    ],
    "depends_on": []
  },
  {
    "work_id": "G1-P2-015",
    "priority": "P2",
    "type": "ENGINE_SUPPORT",
    "skill_id": "ENGINE_QTYPE_001",
    "title": "Add optional richer interaction question types",
    "domain": "Platform / Generator",
    "standards_gap": "Some planned tasks benefit from interaction types beyond current usage",
    "recommended_action": "Introduce/confirm support for sequence_build, matching, drag_and_drop, explain_choice, and error_analysis prompt handling.",
    "visual_models_needed": [],
    "question_types_needed": ["sequence_build", "matching", "drag_and_drop", "explain_choice", "error_analysis"],
    "misconception_tags_needed": [],
    "acceptance_criteria": [
      "Question-type handlers documented and tested in generator tests.",
      "Each new type has one passing fixture package and validation coverage.",
      "Backward compatibility with existing multiple_choice and short_response is preserved."
    ],
    "depends_on": ["G1-P1-014"]
  }
]
```

## SkillPackage JSON Files to Create/Update Next (Recommended Conversion Order)
1. Extend `G1M_NS_002.skill-package.v1.json` (counting to 120)
2. Extend `G1M_PV_001.skill-package.v1.json` (tens/ones + ten more/less)
3. Extend `G1M_NS_004.skill-package.v1.json` (2-digit compare + symbols)
4. Extend `G1M_AS_003.skill-package.v1.json` (equation rigor)
5. Extend `G1M_OP_003.skill-package.v1.json` (3 addends + unknown-addend subtraction)
6. Create `G1M_NBT_005.skill-package.v1.json` (add within 100)
7. Extend `G1M_MT_002.skill-package.v1.json` (repeated units)
8. Extend `G1M_MT_001.skill-package.v1.json` (order 3 lengths)
9. Create `G1M_MT_004.skill-package.v1.json` (time to hour/half-hour)
10. Extend `G1M_DP_001.skill-package.v1.json` (3-category data interpret)
11. Extend `G1M_GEO_003.skill-package.v1.json` (partition halves/fourths)
12. Extend `G1M_GEO_001.skill-package.v1.json` (compose shapes)

## Missing Engine Support (Current Risk Register)
- Potentially missing renderers: `base_ten_blocks`, `place_value_chart`, `number_line_0_120`, `equation_balance`, `iterated_units_ruler`, `analog_clock`, `picture_graph`, `bar_graph_basic`, `shape_partition`, `shape_composer`.
- Potentially missing interaction handlers: `sequence_build`, `matching`, `drag_and_drop`, `explain_choice`, `error_analysis`.
- Mitigation: complete `G1-P1-014` before mid-sequence package rollout; keep schema-valid fallback behavior per generator guidance.
