# Grade 3 Math Completion Plan (Skill World Production)
## Executive Summary
Grade 3 Math must be built as production SkillPackage JSON, not as one-off games or placeholder cards. This plan defines the first Grade 3 Math production skill set, the Skill Practice Center requirements, Grade 1–2 renderer fit, new renderer needs, schema updates, acceptable-answer needs, and a contractor-ready backlog before any Grade 3 packages are implemented.
## Production Standard
- Use the same Grades 1–2 production path: SkillPackage JSON -> Skill World generator -> Skill Practice Center -> manifest/graph/hub exposure.
- Every production package must generate the Guided Mission sequence: Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center must include at least 4 focused levels plus Mixed; each focused level and Mixed must have 10–12 real questions.
- Packages must appear from manifest/graph-driven discovery. Do not hardcode Grade 3 cards and do not ship placeholders.
- This plan intentionally does not implement all Grade 3 Math packages; it creates the completion plan and backlog only.
## Grade 1–2 Renderer Assessment for Grade 3 Math
### Supported or partially reusable by the existing Grades 1–2 baseline
- `number_line` — **supported**; Grade 1-2 plans already rely on this renderer; extend labels/tick density for Grade 3 fractions and rounding.
- `comparison` — **supported**; Usable for whole-number and fraction comparison after fraction answer normalization is added.
- `place_value_chart` — **partial**; Grade 2 identified hundreds/tens/ones extension; Grade 3 can reuse if 1,000 and rounding metadata are supported.
- `expanded_form` — **planned_from_grade2**; Needed again for Grade 3 place value.
- `word_problem_model` — **planned_from_grade2**; Reusable for Grade 3 two-step problems with operation metadata.
- `bar_model` — **planned_from_grade2**; Reusable for two-step word problems.
- `equation_builder` — **planned_from_grade2**; Reusable for equation setup and two-step tracking.
- `array_model` — **planned_from_grade2**; Must be productionized for Grade 3 multiplication/division arrays.
- `analog_clock` — **supported**; Extend for elapsed-time prompts and timelines.
- `measurement_comparison` — **supported**; Extend to mass and volume contexts.
- `bar_graph` — **planned_from_grade2**; Reusable with scaled bar graphs.
- `line_plot` — **planned_from_grade2**; Extend to fractional measurements.
- `partition_shapes` — **planned_from_grade2**; Reusable for equal partitions and fractions from shapes.
- `shape_identification` — **supported**; Extend to quadrilateral attributes.

### New or extended renderers needed for Grade 3 Math
- `equal_groups` — new or confirm graph-token renderer; shows group count, objects per group, and total.
- `repeated_addition` — new renderer for repeated-addition expressions aligned to multiplication.
- `multiplication_model` — new composite renderer connecting groups, arrays, repeated addition, and equation.
- `division_model` — new renderer for equal sharing and equal groups, including no-remainder Grade 3 foundations.
- `fact_family_model` — new renderer for multiplication/division inverse relationships.
- `multiplication_chart` — new renderer for facts within 100 and highlighted products.
- `skip_counting` — new renderer or extend number_sequence for fact strategies.
- `operation_sort` — new renderer/interaction for selecting operations in word problems.
- `rounding_model` — new renderer for midpoint, nearest 10, and nearest 100 decisions.
- `fraction_bar` — new renderer for unit fractions, equivalence, and comparisons.
- `fraction_circle` — new renderer for equal parts and shape-based fractions.
- `elapsed_time_timeline` — new renderer connecting start time, jumps, and end time.
- `area_model` — new renderer for square-unit area.
- `grid_model` — new renderer for counting square units and rectangular arrays.
- `perimeter_path` — new renderer for distance around figures.
- `rectangle_model` — new renderer for side lengths, area, and perimeter distinctions.
- `attribute_sort` — new renderer/interaction for sorting shapes by properties.

## Schema Updates Needed
- Keep SkillPackage JSON as the source of truth and require generator mappings for the full Guided Mission sequence: Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, Profile.
- Require level_banks validation for every Grade 3 Math production package: four focused levels plus Mixed, each with question_count_required between 10 and 12 and a mastery threshold.
- Document or enumerate Grade 3 Math visual_model values for all supported, planned, and new models used by this plan; the current schema leaves visual_model as a string, so runtime renderer registry coverage must be the enforcement point if enum validation is not added.
- Add or map Grade 3 question_type values: model_interpretation, equation_entry, array_counting, fact_family_match, missing_number, sequence_build, timed_fluency, constructed_equation, two_step_response, operation_sort, strategy_explain, rounding_response, expanded_form, fraction_entry, partition_counting, elapsed_time, measurement_reading, graph_reading, data_interpretation, grid_counting, visual_selection, and attribute_sort.
- Add item metadata for visual operands such as group_count, objects_per_group, rows, columns, divisor, dividend, quotient, start_time, elapsed_minutes, unit, shape_attributes, side_lengths, partitions, numerator, denominator, and acceptable_equivalent_forms.
- Require manifest/graph/hub metadata for Grade 3 Math packages so discovery is manifest-driven and never created as hardcoded placeholder cards.

## Acceptable-Answer Needs
- Numeric answers must normalize words, digits, commas, and equations where the item permits them, e.g. 24, twenty-four, 6 x 4, and 4 x 6 for commutative multiplication contexts.
- Multiplication and division answers must distinguish product, quotient, unknown factor, and equation-form responses; inverse facts should be accepted only when they answer the prompt.
- Two-step word problems need final answer validation plus optional intermediate answer/equation validation so a correct final number with an invalid plan can be flagged for review where required.
- Rounding answers must normalize nearest-ten and nearest-hundred forms and preserve the requested place; 300 is not acceptable for nearest 10 when 270 is required.
- Fraction answers must normalize slash forms, words, equivalent forms when the prompt asks for equivalence, and comparison symbols/words; non-equivalent simplified answers must be rejected when exact representation is required.
- Time answers must normalize elapsed minutes, hours/minutes, and clock times while preserving a.m./p.m. only when the prompt includes it.
- Measurement and geometry answers must require correct units, including square units for area and linear units for perimeter, unless the prompt explicitly asks for a number only.
- Graph and line-plot responses must preserve scale, fractional tick values, and category labels.

## Grade 3 Math Production Skill Set
### G3M_MUL_001 — Multiplication Foundations
- **Domain:** Operations and Algebraic Thinking
- **Focus:** understand multiplication as equal groups, arrays, and repeated addition
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Equal Groups — 10–12 questions
  - Level 2: Arrays — 10–12 questions
  - Level 3: Repeated Addition — 10–12 questions
  - Level 4: Multiplication Equations — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `equal_groups`, `array_model`, `repeated_addition`, `multiplication_model`
- **Question types:** `multiple_choice`, `short_response`, `model_interpretation`, `equation_entry`, `array_counting`, `matching`
- **Misconception tags:** `equal_groups_confusion`, `array_rows_columns_confusion`, `repeated_addition_confusion`, `multiplication_symbol_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_DIV_001 — Division Foundations
- **Domain:** Operations and Algebraic Thinking
- **Focus:** understand division as equal sharing and equal groups
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Equal Sharing — 10–12 questions
  - Level 2: Equal Groups — 10–12 questions
  - Level 3: Division Equations — 10–12 questions
  - Level 4: Multiplication and Division Relationship — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `division_model`, `equal_groups`, `array_model`, `fact_family_model`
- **Question types:** `multiple_choice`, `short_response`, `model_interpretation`, `equation_entry`, `fact_family_match`, `matching`
- **Misconception tags:** `sharing_grouping_confusion`, `remainder_confusion`, `division_symbol_confusion`, `inverse_operation_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_FACT_001 — Multiplication and Division Fluency
- **Domain:** Operations and Algebraic Thinking
- **Focus:** fluently multiply and divide within 100 using strategies
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: 2s, 5s, and 10s — 10–12 questions
  - Level 2: 3s and 4s — 10–12 questions
  - Level 3: 6s, 7s, and 8s — 10–12 questions
  - Level 4: 9s and Mixed Facts — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `multiplication_chart`, `fact_family_model`, `array_model`, `skip_counting`
- **Question types:** `multiple_choice`, `short_response`, `fact_family_match`, `missing_number`, `sequence_build`, `timed_fluency`
- **Misconception tags:** `fact_recall_gap`, `inverse_fact_confusion`, `skip_count_error`, `multiplication_division_mixup`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_WP_001 — Two-Step Word Problems
- **Domain:** Operations and Algebraic Thinking
- **Focus:** solve two-step word problems using all four operations
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: One-Step Review — 10–12 questions
  - Level 2: Two-Step Addition/Subtraction — 10–12 questions
  - Level 3: Two-Step Multiplication/Division — 10–12 questions
  - Level 4: Mixed Operation Problems — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `word_problem_model`, `bar_model`, `equation_builder`, `operation_sort`
- **Question types:** `multiple_choice`, `short_response`, `constructed_equation`, `two_step_response`, `operation_sort`, `strategy_explain`
- **Misconception tags:** `operation_selection_error`, `two_step_tracking_error`, `hidden_question_confusion`, `equation_setup_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_PV_001 — Place Value and Rounding to 1,000
- **Domain:** Number and Operations in Base Ten
- **Focus:** use place value to round whole numbers to nearest 10 or 100
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Place Value to 1,000 — 10–12 questions
  - Level 2: Round to Nearest 10 — 10–12 questions
  - Level 3: Round to Nearest 100 — 10–12 questions
  - Level 4: Add/Subtract Using Place Value — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `place_value_chart`, `number_line`, `rounding_model`, `expanded_form`
- **Question types:** `multiple_choice`, `short_response`, `number_line`, `place_value_chart`, `rounding_response`, `expanded_form`
- **Misconception tags:** `rounding_direction_error`, `midpoint_confusion`, `place_value_error`, `zero_placeholder_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_FR_001 — Fraction Foundations
- **Domain:** Number and Operations—Fractions
- **Focus:** understand fractions as equal parts and numbers on a number line
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Equal Parts — 10–12 questions
  - Level 2: Unit Fractions — 10–12 questions
  - Level 3: Fractions on a Number Line — 10–12 questions
  - Level 4: Whole Numbers as Fractions — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `fraction_bar`, `fraction_circle`, `number_line`, `partition_shapes`
- **Question types:** `multiple_choice`, `short_response`, `visual_selection`, `fraction_entry`, `number_line`, `partition_counting`
- **Misconception tags:** `unequal_parts_confusion`, `numerator_denominator_confusion`, `fraction_size_confusion`, `whole_as_fraction_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_FR_002 — Equivalent Fractions and Comparing Fractions
- **Domain:** Number and Operations—Fractions
- **Focus:** recognize equivalent fractions and compare fractions with same numerator or denominator
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Equivalent Fractions — 10–12 questions
  - Level 2: Compare Same Denominator — 10–12 questions
  - Level 3: Compare Same Numerator — 10–12 questions
  - Level 4: Fraction Number Line Comparisons — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `fraction_bar`, `fraction_circle`, `number_line`, `comparison`
- **Question types:** `multiple_choice`, `short_response`, `comparison`, `fraction_entry`, `number_line`, `matching`
- **Misconception tags:** `equivalent_fraction_confusion`, `denominator_size_confusion`, `numerator_focus_error`, `fraction_number_line_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_MD_001 — Time, Measurement, and Data
- **Domain:** Measurement and Data
- **Focus:** elapsed time, measurement, mass, volume, picture/bar graphs, and line plots
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Elapsed Time — 10–12 questions
  - Level 2: Measure Mass and Volume — 10–12 questions
  - Level 3: Graphs and Data — 10–12 questions
  - Level 4: Line Plots with Fractions — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `analog_clock`, `elapsed_time_timeline`, `measurement_comparison`, `bar_graph`, `line_plot`
- **Question types:** `multiple_choice`, `short_response`, `time_matching`, `elapsed_time`, `measurement_reading`, `graph_reading`, `data_interpretation`
- **Misconception tags:** `elapsed_time_confusion`, `unit_conversion_confusion`, `graph_scale_confusion`, `line_plot_fraction_error`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_GM_001 — Area and Perimeter
- **Domain:** Measurement and Geometry
- **Focus:** understand area as square units and perimeter as distance around
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Count Square Units — 10–12 questions
  - Level 2: Area of Rectangles — 10–12 questions
  - Level 3: Perimeter — 10–12 questions
  - Level 4: Area vs Perimeter — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `area_model`, `grid_model`, `perimeter_path`, `rectangle_model`
- **Question types:** `multiple_choice`, `short_response`, `grid_counting`, `measurement_reading`, `constructed_equation`, `model_interpretation`
- **Misconception tags:** `area_perimeter_confusion`, `square_unit_count_error`, `side_length_addition_error`, `formula_misuse`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3M_GM_002 — Shapes, Attributes, and Partitioning
- **Domain:** Geometry
- **Focus:** reason about quadrilaterals and partition shapes into equal parts
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Shape Attributes — 10–12 questions
  - Level 2: Quadrilaterals — 10–12 questions
  - Level 3: Partition Shapes — 10–12 questions
  - Level 4: Fractions from Shapes — 10–12 questions
  - Mixed: Mixed — 10–12 questions
- **Visual models:** `shape_identification`, `attribute_sort`, `partition_shapes`, `fraction_circle`
- **Question types:** `multiple_choice`, `short_response`, `visual_selection`, `attribute_sort`, `sorting_visual`, `fraction_entry`
- **Misconception tags:** `quadrilateral_confusion`, `attribute_overgeneralization`, `unequal_partition_error`, `fraction_shape_confusion`
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

## Contractor-Ready Backlog
### G3M-BACKLOG-001 — Finalize Grade 3 Math schema/runtime contract
- **Owner:** curriculum-platform
- **Deliverables:**
  - Schema or registry mappings for all Grade 3 visual_model and question_type values
  - Practice Center validation for 4 focused levels plus Mixed
  - Guided Mission generator mapping contract
- **Acceptance criteria:**
  - All planned Grade 3 Math fields validate or have documented runtime mappings.
  - No package can pass with placeholder level banks or missing mission stages.

### G3M-BACKLOG-002 — Implement Grade 3 Math visual renderers
- **Owner:** skill-world/renderers
- **Deliverables:**
  - Renderer coverage for every new renderer in this plan
  - Canonical fixture item per renderer
  - No fallback placeholder UI for planned models
- **Acceptance criteria:**
  - Renderer registry covers all Grade 3 visual models.
  - Fixtures render multiplication, division, fractions, time, area/perimeter, and geometry examples.

### G3M-BACKLOG-003 — Build acceptable-answer normalization for Grade 3 Math
- **Owner:** assessment-runtime
- **Deliverables:**
  - Numeric/equation normalizers
  - Fraction equivalence and comparison normalizers
  - Time, measurement, area, perimeter, and graph response normalizers
- **Acceptance criteria:**
  - Correct equivalent answers are accepted where intended.
  - Wrong units or wrong representation are rejected when prompt constraints require precision.

### G3M-BACKLOG-004 — Create production SkillPackage for G3M_MUL_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON with Guided Mission source content
  - Practice Center level_banks with 4 focused levels plus Mixed
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_MUL_001 validates as a production SkillPackage.
  - Hub exposure is manifest-driven and contains no placeholder card.

### G3M-BACKLOG-005 — Create production SkillPackage for G3M_DIV_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Practice Center level_banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_DIV_001 validates and renders equal-sharing/equal-groups visuals.

### G3M-BACKLOG-006 — Create production SkillPackage for G3M_FACT_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Practice Center fact fluency levels
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_FACT_001 validates with multiplication/division fact strategy coverage.

### G3M-BACKLOG-007 — Create production SkillPackage for G3M_WP_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Two-step word-problem banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_WP_001 validates with two-step tracking and operation selection support.

### G3M-BACKLOG-008 — Create production SkillPackage for G3M_PV_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Rounding/place-value banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_PV_001 validates with nearest 10/100 rounding models.

### G3M-BACKLOG-009 — Create production SkillPackage for G3M_FR_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Fraction foundations banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_FR_001 validates with equal parts and number-line fractions.

### G3M-BACKLOG-010 — Create production SkillPackage for G3M_FR_002
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Equivalent/comparing fraction banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_FR_002 validates with fraction comparison/equivalence visuals.

### G3M-BACKLOG-011 — Create production SkillPackage for G3M_MD_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Time/measurement/data banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_MD_001 validates with elapsed time, mass/volume, graph, and fractional line-plot support.

### G3M-BACKLOG-012 — Create production SkillPackage for G3M_GM_001
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Area/perimeter banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_GM_001 validates with area/perimeter renderer support.

### G3M-BACKLOG-013 — Create production SkillPackage for G3M_GM_002
- **Owner:** content-production
- **Deliverables:**
  - SkillPackage JSON
  - Shapes/attributes/partitioning banks
  - Manifest/graph entry
- **Acceptance criteria:**
  - G3M_GM_002 validates with quadrilateral, attribute sort, and partitioning support.

### G3M-BACKLOG-014 — Run Grade 3 Math production readiness gate
- **Owner:** qa/curriculum
- **Deliverables:**
  - Schema validation report
  - Renderer fixture report
  - Manifest/hub discovery report
  - Practice Center level-bank audit
- **Acceptance criteria:**
  - All ten packages are manifest-discoverable.
  - No one-off games or placeholder cards are present.

## Production Gate Before Package Buildout
- Confirm schema/runtime mappings for every question type and visual model listed in this plan.
- Confirm renderer registry has production support or explicit build tickets for all new renderers.
- Confirm acceptable-answer normalization covers multiplication, division, fractions, rounding, time, measurement, graphs, area, and perimeter.
- Confirm each future package is manifest-discoverable and not exposed through hardcoded hub placeholders.
- Confirm Skill Practice Center level banks contain 10–12 production questions for each of four focused levels plus Mixed before marking a package complete.
