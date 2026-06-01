# Grade 5 Math Completion Plan (Skill World Production)

## Executive Summary
Grade 5 Math must be built as production SkillPackage JSON, not as one-off games or placeholder cards. This plan defines the Grade 5 Math production skill map, Skill World generator requirements, Guided Mission requirements, Skill Practice Center requirements, renderer and schema gaps, acceptable-answer needs, full voice requirements, manifest-driven hub exposure, readiness checkpoints, and a contractor-ready backlog before Grade 5 Math packages are implemented.

## Production Standard
- Use the same Grades 1-4 production path: SkillPackage JSON -> Skill World generator -> Guided Mission -> Skill Practice Center -> manifest/graph/hub exposure.
- Every production package must generate the Guided Mission sequence: Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center must include at least 4 focused levels plus Mixed; each focused level and Mixed must have 10-12 real questions.
- Packages must appear from manifest/graph-driven discovery. Do not hardcode Grade 5 cards and do not ship placeholders.
- Every package must include production content, answer validation, misconception tagging, voice metadata, cached AI audio compatibility, browser fallback, and readiness checkpoint metadata before hub exposure.
- This plan intentionally does not implement all Grade 5 Math packages; it creates the completion plan and backlog only.

## Grades 1-4 Renderer Assessment for Grade 5 Math
### Supported or extendable by the existing Grades 1-4 baseline
- `place_value_chart` — **extend**; Reusable from Grades 1-4; Grade 5 needs millions through thousandths, powers-of-10 shifts, and decimal comparisons.
- `number_line` — **extend**; Reusable for decimals, rounding, fractions, and measurement data; Grade 5 needs thousandths ticks and fraction measurement labels.
- `rounding_model` — **extend**; Reusable midpoint model; Grade 5 needs decimal rounding to tenths, hundredths, and thousandths.
- `algorithm_steps` — **extend**; Grade 4 standard-algorithm renderer should support multi-digit multiplication/division and Grade 5 decimal alignment, products, and quotients.
- `partial_products_model` — **supported_extend**; Reusable for multiplication; Grade 5 needs larger factors and explicit connection to the standard algorithm.
- `area_model` — **supported_extend**; Reusable for multiplication and fraction products; Grade 5 fraction multiplication needs partitioned fractional regions.
- `division_model` — **supported_extend**; Reusable for quotients and remainders; Grade 5 needs fraction division contexts and unit-fraction language.
- `remainder_model` — **supported**; Reusable for interpreting division remainders in whole-number operations.
- `fraction_bar` — **supported_extend**; Reusable for unlike-denominator operations, fraction multiplication, and unit fraction division.
- `fraction_circle` — **supported**; Reusable for equivalent fractions and unlike-denominator addition/subtraction visuals.
- `equation_builder` — **supported_extend**; Reusable for expressions and fraction equations; Grade 5 needs parentheses, brackets, and braces support.
- `multiplication_model` — **supported_extend**; Reusable for whole-number times fraction and mixed number multiplication contexts.
- `word_problem_model` — **supported_extend**; Reusable across decimal, fraction, volume, and measurement word problems with unit labels.
- `measurement_conversion_table` — **supported_extend**; Grade 4 conversion table should extend to Grade 5 customary/metric conversions and multiplicative reasoning.
- `line_plot` — **supported_extend**; Reusable for fraction data; Grade 5 needs operations on fractional measurements from line plots.
- `pattern_table` — **supported_extend**; Grade 4 pattern table should support two rules, ordered-pair generation, and graphing connections.
- `shape_identification` — **supported_extend**; Reusable for 2D figure properties; Grade 5 needs hierarchical classification.
- `attribute_sort` — **supported_extend**; If present from earlier geometry work, extend to classify figures by multiple simultaneous properties.

### New renderers needed for Grade 5 Math
- `expression_builder` — Build numerical expressions with operations, parentheses, brackets, braces, variables-as-labels when needed, and speakable operation order.
- `coordinate_plane` — First-quadrant grid with labeled axes, origin, scale choices, accessible point descriptions, and mobile-friendly layout.
- `ordered_pair_plot` — Point plotting and ordered-pair interpretation with x-before-y emphasis and misconception feedback.
- `decimal_grid` — Tenths/hundredths/thousandths grids for decimal size, operations, and place-value comparisons.
- `fraction_area_model` — Overlapping partition area model for fraction-by-fraction products and mixed-number decomposition.
- `fraction_division_model` — Unit-fraction division visual showing sharing, measurement division, and whole-number/unit-fraction contexts.
- `volume_model` — Unit-cube volume visual with layers, rows, columns, and countable cubes.
- `rectangular_prism_model` — Length-width-height prism model with labeled dimensions, unit cubes, and V = l x w x h / V = B x h connections.
- `graph_interpretation` — Graph reading renderer for coordinate relationships, plotted patterns, and rule-to-graph explanations.
- `hierarchy_diagram` — Nested shape-category diagram for properties of polygons, triangles, quadrilaterals, rectangles, rhombi, and squares.
- `geometry_card_sort` — Card-sort renderer for classifying figures by attributes with accessible text alternatives.

## Schema Updates Needed
- Require generator mappings for Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
- Require Grade 5 Math level_banks with four focused levels plus Mixed and 10-12 questions per level.
- Enumerate or runtime-enforce all Grade 5 Math visual_model and question_type values.
- Add metadata for expressions, order of operations, decimal place values, powers of 10, algorithms, fraction forms, coordinate pairs, volume units, shape attributes, acceptable equivalent forms, and voice narration.
- Require manifest/graph/hub metadata and readiness checkpoint metadata before hub exposure.

## Acceptable-Answer Needs
- `numeric_normalization`
- `decimal_normalization_and_trailing_zero_equivalence`
- `expression_equivalence_and_operation_order`
- `coordinate_pair_normalization`
- `comparison_symbol_word_equivalence`
- `rounding_tolerance_by_place`
- `algorithm_step_validation`
- `fraction_equivalence_mixed_and_improper_forms`
- `measurement_unit_validation`
- `volume_unit_normalization`
- `geometry_attribute_and_sort_validation`

## Voice Narration Requirements
- Read This Page must be available on every Guided Mission screen: Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
- Read Question must be available on Guided Mission Practice, Challenge, and Checkpoint questions.
- Read Question must be available on every Skill Practice Center question across all focused levels and Mixed.
- Math narration must speak symbols naturally: parentheses, brackets, braces, multiplication, division, comparison signs, decimals, fractions, powers of 10, ordered pairs, coordinates, units, square units, cubic units, and formulas.
- Audio must be compatible with cached AI audio through `/api/skill-world/audio`.
- Browser speech fallback must remain available when cached audio is missing or unavailable.

## Grade 5 Math Skill Map

### G5M_OA_001 — Expressions, Patterns, and the Coordinate Plane
- **Domain:** Operations and Algebraic Thinking / Geometry
- **Focus:** write and evaluate numerical expressions, analyze patterns, and graph ordered pairs
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Write Numerical Expressions — 10-12 questions
  - Level 2: Evaluate Expressions — 10-12 questions
  - Level 3: Generate and Analyze Patterns — 10-12 questions
  - Level 4: Coordinate Plane Ordered Pairs — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `expression_builder`, `pattern_table`, `coordinate_plane`, `ordered_pair_plot`
- **Question types:** `multiple_choice`, `short_response`, `expression_response`, `coordinate_response`
- **Misconception tags:** `operation_order_confusion`, `parentheses_confusion`, `pattern_rule_error`, `coordinate_order_reversal`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_NBT_001 — Place Value With Decimals
- **Domain:** Number and Operations in Base Ten
- **Focus:** understand place value from millions to thousandths and powers of 10
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Whole Number Place Value Review — 10-12 questions
  - Level 2: Decimal Place Value to Thousandths — 10-12 questions
  - Level 3: Powers of 10 and Place Value Shifts — 10-12 questions
  - Level 4: Compare and Round Decimals — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `place_value_chart`, `decimal_grid`, `number_line`, `rounding_model`
- **Question types:** `multiple_choice`, `short_response`, `comparison`, `rounding`
- **Misconception tags:** `decimal_place_value_confusion`, `decimal_length_error`, `power_of_ten_shift_error`, `rounding_decimal_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_NBT_002 — Multi-Digit Whole Number Operations
- **Domain:** Number and Operations in Base Ten
- **Focus:** fluently multiply and divide multi-digit whole numbers
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Multi-Digit Multiplication — 10-12 questions
  - Level 2: Partial Products and Area Models — 10-12 questions
  - Level 3: Multi-Digit Division — 10-12 questions
  - Level 4: Interpret Remainders — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `algorithm_steps`, `partial_products_model`, `area_model`, `division_model`, `remainder_model`
- **Question types:** `multiple_choice`, `short_response`, `multiplication_equation`, `division_equation`
- **Misconception tags:** `digit_alignment_error`, `partial_products_confusion`, `quotient_place_value_error`, `remainder_interpretation_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_NBT_003 — Decimal Operations
- **Domain:** Number and Operations in Base Ten
- **Focus:** add, subtract, multiply, and divide decimals to hundredths
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Add and Subtract Decimals — 10-12 questions
  - Level 2: Multiply Decimals — 10-12 questions
  - Level 3: Divide Decimals — 10-12 questions
  - Level 4: Decimal Word Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `decimal_grid`, `place_value_chart`, `algorithm_steps`, `word_problem_model`
- **Question types:** `multiple_choice`, `short_response`, `decimal_response`, `word_problem`
- **Misconception tags:** `decimal_alignment_error`, `decimal_product_size_error`, `decimal_quotient_error`, `decimal_word_problem_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_FR_001 — Add and Subtract Fractions With Unlike Denominators
- **Domain:** Number and Operations—Fractions
- **Focus:** add and subtract fractions and mixed numbers with unlike denominators
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Find Common Denominators — 10-12 questions
  - Level 2: Add Unlike Fractions — 10-12 questions
  - Level 3: Subtract Unlike Fractions — 10-12 questions
  - Level 4: Mixed Number Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `fraction_bar`, `fraction_circle`, `equation_builder`, `word_problem_model`
- **Question types:** `multiple_choice`, `short_response`, `fraction_response`, `word_problem`
- **Misconception tags:** `common_denominator_confusion`, `denominator_addition_error`, `mixed_number_regrouping_error`, `fraction_simplification_gap`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_FR_002 — Multiply Fractions
- **Domain:** Number and Operations—Fractions
- **Focus:** multiply fractions by whole numbers, fractions by fractions, and mixed numbers
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Whole Number Times Fraction — 10-12 questions
  - Level 2: Fraction Times Fraction — 10-12 questions
  - Level 3: Area Models for Fraction Products — 10-12 questions
  - Level 4: Mixed Number Multiplication — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `fraction_bar`, `fraction_area_model`, `multiplication_model`, `word_problem_model`
- **Question types:** `multiple_choice`, `short_response`, `fraction_response`, `multiplication_equation`
- **Misconception tags:** `fraction_product_size_error`, `numerator_denominator_multiply_error`, `mixed_number_conversion_error`, `area_model_fraction_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_FR_003 — Divide Unit Fractions and Whole Numbers
- **Domain:** Number and Operations—Fractions
- **Focus:** divide unit fractions by whole numbers and whole numbers by unit fractions
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Unit Fraction Divided by Whole Number — 10-12 questions
  - Level 2: Whole Number Divided by Unit Fraction — 10-12 questions
  - Level 3: Visual Fraction Division — 10-12 questions
  - Level 4: Fraction Division Word Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `fraction_bar`, `division_model`, `fraction_division_model`, `word_problem_model`
- **Question types:** `multiple_choice`, `short_response`, `fraction_response`, `division_equation`
- **Misconception tags:** `unit_fraction_division_confusion`, `whole_number_fraction_division_error`, `reciprocal_overgeneralization`, `fraction_division_context_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_MD_001 — Measurement Conversion, Volume, and Data
- **Domain:** Measurement and Data
- **Focus:** convert measurements, understand volume, and interpret line plots with fractions
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Measurement Conversions — 10-12 questions
  - Level 2: Volume as Unit Cubes — 10-12 questions
  - Level 3: Volume Formulas — 10-12 questions
  - Level 4: Line Plots With Fractions — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `measurement_conversion_table`, `volume_model`, `rectangular_prism_model`, `line_plot`
- **Question types:** `multiple_choice`, `short_response`, `measurement`, `data_interpretation`, `volume_response`
- **Misconception tags:** `unit_conversion_direction_error`, `volume_area_confusion`, `cube_unit_count_error`, `line_plot_fraction_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_GM_001 — Coordinate Plane and Graphing
- **Domain:** Geometry
- **Focus:** graph points in the first quadrant and interpret coordinate relationships
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Coordinate Plane Basics — 10-12 questions
  - Level 2: Ordered Pairs — 10-12 questions
  - Level 3: Graph Points — 10-12 questions
  - Level 4: Interpret Coordinate Patterns — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `coordinate_plane`, `ordered_pair_plot`, `pattern_table`, `graph_interpretation`
- **Question types:** `multiple_choice`, `short_response`, `coordinate_response`
- **Misconception tags:** `coordinate_order_reversal`, `axis_confusion`, `origin_confusion`, `graph_pattern_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G5M_GM_002 — Classify Two-Dimensional Figures
- **Domain:** Geometry
- **Focus:** classify 2D figures into categories based on properties
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Polygons and Attributes — 10-12 questions
  - Level 2: Triangles — 10-12 questions
  - Level 3: Quadrilaterals — 10-12 questions
  - Level 4: Hierarchies of Shapes — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `shape_identification`, `attribute_sort`, `hierarchy_diagram`, `geometry_card_sort`
- **Question types:** `multiple_choice`, `short_response`, `sorting`, `geometry_response`
- **Misconception tags:** `attribute_overgeneralization`, `triangle_classification_error`, `quadrilateral_hierarchy_confusion`, `shape_property_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 5 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

## Contractor-Ready Backlog

### G5M-INF-001 — Finalize Grade 5 Math SkillPackage schema/runtime contract
- **Priority:** P0
- **Type:** SCHEMA_UPDATE
- **Owner:** platform/schema
- **Depends on:** None
- **Acceptance criteria:**
  - Schema or registry mappings cover every Grade 5 visual_model and question_type in this plan.
  - Validation rejects packages without Story through Profile guided mission source data or deterministic generator mappings.
  - Validation rejects Practice Center level_banks that do not include four focused levels plus Mixed with 10-12 questions each.
  - Grade 5 package metadata includes domain, focus, standards tags, misconception tags, voice metadata, acceptable-answer metadata, and manifest exposure metadata.

### G5M-INF-002 — Build or extend Grade 5 Math visual renderers
- **Priority:** P0
- **Type:** RENDERER_UPDATE
- **Owner:** skill-world/renderers
- **Depends on:** G5M-INF-001
- **Acceptance criteria:**
  - Renderer registry covers supported/extended and new Grade 5 visual models without fallback placeholder output.
  - Each renderer has a canonical fixture and test asserting data-renderer output.
  - Math-specific renderers expose aria labels and speakable descriptions for voice narration.
  - Coordinate, fraction, decimal, volume, and geometry renderers work on mobile and desktop.

### G5M-INF-003 — Guarantee Skill Practice Center generation from level_banks
- **Priority:** P0
- **Type:** PRACTICE_CENTER_GENERATOR
- **Owner:** skill-world/generator
- **Depends on:** G5M-INF-001
- **Acceptance criteria:**
  - Every Grade 5 Math package exposes Level 1, Level 2, Level 3, Level 4, and Mixed from package data.
  - Each level renders 10-12 production questions, mastery state, feedback, and Read Question controls.
  - No Skill Practice Center cards or questions are hardcoded outside package/manifest data.

### G5M-INF-004 — Wire Grade 5 Math packages through manifest/graph/hub discovery
- **Priority:** P0
- **Type:** MANIFEST_HUB_EXPOSURE
- **Owner:** gamehub/content
- **Depends on:** G5M-INF-001
- **Acceptance criteria:**
  - Grade 5 Math appears only after packages are listed in the content manifest/graph.
  - Hub cards use SkillPackage metadata, not hardcoded placeholders.
  - Readiness checkpoints prevent incomplete packages from appearing as production-ready.

### G5M-INF-005 — Implement full Grade 5 Math voice standard
- **Priority:** P0
- **Type:** VOICE_AUDIO
- **Owner:** skill-world/audio
- **Depends on:** G5M-INF-001
- **Acceptance criteria:**
  - Every guided mission screen includes Read This Page text and label.
  - Practice, Challenge, and Checkpoint questions include Read Question text.
  - All Practice Center questions include Read Question text.
  - Narration routes through /api/skill-world/audio when cached AI audio is available and falls back to browser speech when not available.
  - Math symbols, parentheses, exponents/powers of 10, decimals, fractions, ordered pairs, comparison signs, units, and volume formulas are spoken naturally.

### G5M-INF-006 — Add Grade 5 acceptable-answer normalization
- **Priority:** P0
- **Type:** ANSWER_VALIDATION
- **Owner:** skill-world/runtime
- **Depends on:** G5M-INF-001
- **Acceptance criteria:**
  - Numeric answers normalize commas, decimals, trailing zeros, words, equations, and standard notation where appropriate.
  - Expression responses validate equivalent expressions where safe and preserve order-of-operations intent.
  - Coordinate answers normalize parentheses, commas, spacing, and x/y order.
  - Fraction answers normalize equivalent fractions, mixed numbers, improper fractions, and spacing.
  - Measurement and volume answers validate required units and conversion equivalence.
  - Geometry sorting responses validate all acceptable category placements.

### G5M-PKG-001 — Produce Grade 5 Math packages in dependency order after infrastructure readiness
- **Priority:** P1
- **Type:** CONTENT_IMPLEMENTATION
- **Owner:** curriculum/content
- **Depends on:** G5M-INF-001, G5M-INF-002, G5M-INF-003, G5M-INF-004, G5M-INF-005, G5M-INF-006
- **Acceptance criteria:**
  - Implement the ten Grade 5 SkillPackages listed in this plan only after infrastructure readiness.
  - Each package includes complete Guided Mission source data and Practice Center level_banks.
  - Each package passes schema, renderer, voice, answer-validation, manifest, and readiness checks before production exposure.

## Package Implementation Sequence
1. Complete schema/runtime contract, renderer registry coverage, voice contract, and acceptable-answer normalization.
2. Implement and test reusable Grade 5 visual renderers and renderer fixtures.
3. Produce packages in dependency order: `G5M_OA_001`, `G5M_NBT_001`, `G5M_NBT_002`, `G5M_NBT_003`, `G5M_FR_001`, `G5M_FR_002`, `G5M_FR_003`, `G5M_MD_001`, `G5M_GM_001`, `G5M_GM_002`.
4. For each package, validate Guided Mission, Practice Center counts, voice coverage, answer normalization, renderer coverage, manifest exposure, and readiness checkpoint status before production hub exposure.
