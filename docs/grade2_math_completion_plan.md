# Grade 2 Math Completion Plan (Skill World Production)
## Executive Summary
Grade 2 Math should be built as production SkillPackage JSON, not as one-off games or placeholder cards. This plan defines the first Grade 2 Math production skill set, the Skill Practice Center requirements, visual renderer and schema gaps, acceptable-answer needs, and a contractor-ready backlog before any packages are implemented.
## Production Standard
- Use the same Grade 1 production path: SkillPackage JSON -> Skill World generator -> Skill Practice Center -> manifest/graph/hub exposure.
- Every production package must generate the Guided Mission sequence: Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center must include at least 4 focused levels plus Mixed; each level must have 10-12 real questions.
- Packages must appear from manifest/graph-driven discovery. Do not hardcode Grade 2 cards and do not ship placeholders.
## Current Grade 1 Renderer Assessment
### Supported or partially supported by the existing baseline
- `number_sequence`
- `number_line`
- `comparison`
- `base_ten_blocks`
- `place_value_chart` — partially supported; currently aliases `base_ten_blocks`, so Grade 2 needs explicit hundreds/tens/ones rendering.
- `addition_model`
- `subtraction_model`
- `number_bond`
- `shape_identification`
- `measurement_comparison`
- `analog_clock`
- `digital_time`
- `visual_objects`

### New or extended renderers needed for Grade 2 Math
- `place_value_chart` — extend to explicit hundreds/tens/ones chart
- `expanded_form`
- `ten_frame`
- `word_problem_model`
- `bar_model`
- `equation_builder`
- `ruler`
- `coin_model`
- `money_counting`
- `picture_graph`
- `bar_graph`
- `line_plot`
- `data_table`
- `partition_shapes`
- `array_model`

## Schema Updates Needed
- Add Grade 2 visual_model enum values for expanded_form, ten_frame, word_problem_model, bar_model, equation_builder, ruler, coin_model, money_counting, picture_graph, bar_graph, line_plot, data_table, partition_shapes, and array_model.
- Extend place_value_chart/base_ten_blocks metadata to support hundreds, tens, ones and regrouping/trading states.
- Add or document question_type enum values for sequence_build, drag_and_drop, equation_entry, model_interpretation, missing_number, fact_family_match, constructed_equation, two_step_response, measurement_reading, money_counting, data_interpretation, graph_reading, visual_selection, and array_counting; alternatively map each to existing supported types with interaction metadata.
- Require Skill Practice Center level_banks in production validation: at least 4 focused levels plus Mixed, each with 10-12 questions.
- Require guided mission metadata or deterministic generator mappings for Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.

## Writing and Short-Response Acceptable-Answer Needs
- Numeric acceptable_answers must normalize commas, words, and equivalent forms where appropriate, e.g. 1000 and 1,000.
- Expanded-form answers need equivalent-expression normalization, e.g. 300+40+5, 300 + 40 + 5, and 3 hundreds 4 tens 5 ones.
- Comparison answers must accept symbol and word equivalents, e.g. > and greater than.
- Time answers must normalize 2:05, 2:05 p.m., and five minutes after two when context permits.
- Money answers must normalize cents, dollar notation, and coin-count expressions within the prompt constraints.
- Word-problem responses must support final answer plus equation/strategy fields; two-step items need intermediate-answer validation.
- Measurement answers must preserve unit requirements and reject correct numbers with incorrect units unless the prompt explicitly asks for number only.

## Grade 2 Math Production Skill Set
### G2M_NS_001 — Count, Read, and Write Numbers to 1,000
- **Domain:** Number Sense / Base Ten
- **Focus:** count within 1,000, skip-count by 5s, 10s, and 100s
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Count Within 1,000 — 10-12 questions
  - Level 2: Read and Write Numbers — 10-12 questions
  - Level 3: Skip Count by 5s and 10s — 10-12 questions
  - Level 4: Skip Count by 100s — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `number_line`, `number_sequence`, `place_value_chart`
- **Question types:** `multiple_choice`, `short_response`, `number_sequence`, `sequence_build`
- **Misconception tags:** `sequence_gap_error`, `hundreds_transition_error`, `skip_count_error`, `numeral_word_mismatch`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_PV_001 — Place Value to Hundreds
- **Domain:** Number and Operations in Base Ten
- **Focus:** understand hundreds, tens, and ones
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Hundreds, Tens, Ones — 10-12 questions
  - Level 2: Expanded Form — 10-12 questions
  - Level 3: Standard / Word / Expanded Match — 10-12 questions
  - Level 4: 100 as Ten Tens — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `base_ten_blocks`, `place_value_chart`, `expanded_form`
- **Question types:** `multiple_choice`, `short_response`, `matching`, `drag_and_drop`
- **Misconception tags:** `hundreds_place_confusion`, `digit_value_confusion`, `expanded_form_error`, `zero_placeholder_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_NS_002 — Compare Three-Digit Numbers
- **Domain:** Number and Operations in Base Ten
- **Focus:** compare numbers using hundreds, tens, and ones
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Compare Hundreds — 10-12 questions
  - Level 2: Compare Tens — 10-12 questions
  - Level 3: Compare Ones — 10-12 questions
  - Level 4: Use >, <, = — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `comparison`, `place_value_chart`, `number_line`
- **Question types:** `multiple_choice`, `short_response`, `comparison`, `true_false`
- **Misconception tags:** `compares_left_to_right_incorrectly`, `symbol_reversal`, `place_value_compare_error`, `equal_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_OP_001 — Add Within 100
- **Domain:** Operations / Base Ten
- **Focus:** add two-digit numbers using place value, drawings, and strategies
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Add Tens — 10-12 questions
  - Level 2: Add Ones — 10-12 questions
  - Level 3: Add Two-Digit Numbers Without Regrouping — 10-12 questions
  - Level 4: Add Two-Digit Numbers With Regrouping — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `addition_model`, `base_ten_blocks`, `number_line`, `place_value_chart`
- **Question types:** `multiple_choice`, `short_response`, `equation_entry`, `model_interpretation`
- **Misconception tags:** `regrouping_confusion`, `ones_tens_alignment_error`, `count_all_overuse`, `place_value_addition_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_OP_002 — Subtract Within 100
- **Domain:** Operations / Base Ten
- **Focus:** subtract two-digit numbers using drawings and place value
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Subtract Tens — 10-12 questions
  - Level 2: Subtract Ones — 10-12 questions
  - Level 3: Subtract Without Regrouping — 10-12 questions
  - Level 4: Subtract With Regrouping — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `subtraction_model`, `base_ten_blocks`, `number_line`, `place_value_chart`
- **Question types:** `multiple_choice`, `short_response`, `equation_entry`, `model_interpretation`
- **Misconception tags:** `regrouping_confusion`, `subtracts_smaller_from_larger_digit`, `tens_ones_alignment_error`, `count_back_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_OP_003 — Fluency With Addition and Subtraction Within 20
- **Domain:** Operations and Algebraic Thinking
- **Focus:** fluently add and subtract within 20 using mental strategies
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Make 10 — 10-12 questions
  - Level 2: Doubles and Near Doubles — 10-12 questions
  - Level 3: Related Facts — 10-12 questions
  - Level 4: Missing Addend / Missing Part — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `number_bond`, `ten_frame`, `addition_model`, `subtraction_model`
- **Question types:** `multiple_choice`, `short_response`, `missing_number`, `fact_family_match`
- **Misconception tags:** `make_ten_confusion`, `doubles_confusion`, `related_fact_confusion`, `missing_part_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_WP_001 — Addition and Subtraction Word Problems
- **Domain:** Operations and Algebraic Thinking
- **Focus:** solve one-step and two-step word problems within 100
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Add To / Put Together — 10-12 questions
  - Level 2: Take From / Take Apart — 10-12 questions
  - Level 3: Compare Problems — 10-12 questions
  - Level 4: Two-Step Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `word_problem_model`, `bar_model`, `number_line`, `equation_builder`
- **Question types:** `multiple_choice`, `short_response`, `constructed_equation`, `two_step_response`
- **Misconception tags:** `operation_selection_error`, `missing_unknown_confusion`, `compare_problem_confusion`, `two_step_tracking_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_MD_001 — Measure Length
- **Domain:** Measurement and Data
- **Focus:** measure and estimate lengths using standard units
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Measure with Inches — 10-12 questions
  - Level 2: Measure with Centimeters — 10-12 questions
  - Level 3: Estimate Length — 10-12 questions
  - Level 4: Compare Lengths — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `ruler`, `measurement_comparison`, `number_line`
- **Question types:** `multiple_choice`, `short_response`, `measurement_reading`, `comparison`
- **Misconception tags:** `starts_not_at_zero`, `unit_confusion`, `estimate_error`, `length_difference_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_MD_002 — Time and Money
- **Domain:** Measurement and Data
- **Focus:** tell time to five minutes and solve money problems
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Time to 5 Minutes — 10-12 questions
  - Level 2: A.M. and P.M. / Time Context — 10-12 questions
  - Level 3: Coin Values — 10-12 questions
  - Level 4: Count Coins — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `analog_clock`, `digital_time`, `coin_model`, `money_counting`
- **Question types:** `multiple_choice`, `short_response`, `time_matching`, `money_counting`
- **Misconception tags:** `minute_hand_confusion`, `hour_hand_between_numbers`, `coin_value_confusion`, `coin_counting_skip_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_MD_003 — Data, Graphs, and Line Plots
- **Domain:** Measurement and Data
- **Focus:** represent and interpret data using picture graphs, bar graphs, and line plots
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Picture Graphs — 10-12 questions
  - Level 2: Bar Graphs — 10-12 questions
  - Level 3: Ask and Answer Data Questions — 10-12 questions
  - Level 4: Line Plots — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `picture_graph`, `bar_graph`, `line_plot`, `data_table`
- **Question types:** `multiple_choice`, `short_response`, `data_interpretation`, `graph_reading`
- **Misconception tags:** `graph_scale_confusion`, `category_count_error`, `more_less_data_confusion`, `line_plot_mark_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

### G2M_GM_001 — Shapes, Arrays, and Partitioning
- **Domain:** Geometry
- **Focus:** recognize shapes, partition rectangles/circles, and use arrays
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: 2D and 3D Shapes — 10-12 questions
  - Level 2: Attributes of Shapes — 10-12 questions
  - Level 3: Partition into Equal Shares — 10-12 questions
  - Level 4: Arrays and Repeated Rows/Columns — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `shape_identification`, `partition_shapes`, `array_model`, `visual_objects`
- **Question types:** `multiple_choice`, `short_response`, `visual_selection`, `array_counting`
- **Misconception tags:** `defining_attribute_confusion`, `unequal_partition_error`, `rows_columns_confusion`, `shape_label_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 Math hub exposure, and includes all required practice levels.

## Contractor-Ready Backlog
### G2M-INF-001 — Extend SkillPackage schema for Grade 2 Math production metadata
- **Priority:** P0
- **Type:** SCHEMA_UPDATE
- **Owner:** platform/schema
- **Depends on:** None
- **Acceptance criteria:**
  - Schema enumerates or maps every Grade 2 visual_model and question_type used by the production skill set.
  - Strict validation rejects packages without 4 focused level_banks plus Mixed, with 10-12 questions per level.
  - Guided Mission generation has source fields for Story through Profile.

### G2M-INF-002 — Add or extend Grade 2 Math visual renderers
- **Priority:** P0
- **Type:** RENDERER_UPDATE
- **Owner:** skill-world/renderers
- **Depends on:** G2M-INF-001
- **Acceptance criteria:**
  - Renderer registry covers all Grade 2 visual models without fallback placeholder output.
  - place_value_chart explicitly renders hundreds/tens/ones and 100 as ten tens.
  - Renderer tests cover at least one canonical item per visual model.

### G2M-INF-003 — Guarantee Skill Practice Center generation from level_banks
- **Priority:** P0
- **Type:** PRACTICE_CENTER_GENERATOR
- **Owner:** skill-world/generator
- **Depends on:** G2M-INF-001
- **Acceptance criteria:**
  - Each package exposes at least 5 practice levels: Level 1-4 plus Mixed.
  - Each practice level renders 10-12 questions and reports mastery state.
  - No practice center cards are hardcoded outside manifest/package data.

### G2M-INF-004 — Wire Grade 2 Math packages through manifest/graph/hub discovery
- **Priority:** P0
- **Type:** MANIFEST_HUB_EXPOSURE
- **Owner:** gamehub/content
- **Depends on:** G2M-INF-001
- **Acceptance criteria:**
  - All production packages appear via manifest or grade/subject graph discovery.
  - No Grade 2 Math hub cards point to placeholder or one-off game routes.
  - Automated manifest audit confirms all listed skill_ids resolve to package JSON.

### G2M-INF-005 — Add Grade 2 acceptable-answer normalization rules
- **Priority:** P1
- **Type:** ANSWER_NORMALIZATION
- **Owner:** adaptive-runtime
- **Depends on:** G2M-INF-001
- **Acceptance criteria:**
  - Short responses support number words, comma-separated numerals, symbols, units, time, money, and expanded-form equivalents.
  - Two-step word problems can validate final answer and optional intermediate/equation fields.
  - Normalization tests include representative items from every skill.

### G2M-PKG-001 — Create G2M_NS_001 — Count, Read, and Write Numbers to 1,000
- **Priority:** P0
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_NS_001`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_NS_001 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-002 — Create G2M_PV_001 — Place Value to Hundreds
- **Priority:** P0
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_PV_001`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_PV_001 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-003 — Create G2M_NS_002 — Compare Three-Digit Numbers
- **Priority:** P0
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_NS_002`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_NS_002 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-004 — Create G2M_OP_001 — Add Within 100
- **Priority:** P0
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_OP_001`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_OP_001 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-005 — Create G2M_OP_002 — Subtract Within 100
- **Priority:** P0
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_OP_002`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_OP_002 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-006 — Create G2M_OP_003 — Fluency With Addition and Subtraction Within 20
- **Priority:** P0
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_OP_003`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_OP_003 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-007 — Create G2M_WP_001 — Addition and Subtraction Word Problems
- **Priority:** P0
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_WP_001`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_WP_001 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-008 — Create G2M_MD_001 — Measure Length
- **Priority:** P1
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_MD_001`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_MD_001 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-009 — Create G2M_MD_002 — Time and Money
- **Priority:** P1
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_MD_002`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_MD_002 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-010 — Create G2M_MD_003 — Data, Graphs, and Line Plots
- **Priority:** P1
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_MD_003`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_MD_003 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

### G2M-PKG-011 — Create G2M_GM_001 — Shapes, Arrays, and Partitioning
- **Priority:** P1
- **Type:** CREATE_PRODUCTION_SKILL_PACKAGE
- **Skill ID:** `G2M_GM_001`
- **Owner:** content/curriculum
- **Depends on:** G2M-INF-001, G2M-INF-002, G2M-INF-003, G2M-INF-004
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Skill Practice Center level_banks with 4 focused levels plus Mixed
  - misconception_bank entries for all listed misconception tags
  - manifest/graph entry for hub discovery
- **Acceptance criteria:**
  - G2M_GM_001 validates as a production SkillPackage.
  - Guided Mission flow generates Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
  - Each focused level and Mixed level includes 10-12 non-placeholder questions.
  - Package renders through Skill World generator and appears from manifest-driven hub discovery.

## Implementation Guardrails
- Do not implement all Grade 2 packages as part of this planning step.
- Do not create one-off games.
- Do not create placeholder cards.
- Each future package PR should include schema validation, renderer smoke tests, Skill Practice Center level coverage checks, and manifest resolution checks.
