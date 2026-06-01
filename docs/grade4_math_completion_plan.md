# Grade 4 Math Completion Plan (Skill World Production)
## Executive Summary
Grade 4 Math must be built as production SkillPackage JSON, not as one-off games or placeholder cards. This plan defines the Grade 4 Math production skill map, Skill World generator requirements, Guided Mission requirements, Skill Practice Center requirements, renderer and schema gaps, acceptable-answer needs, full voice requirements, manifest-driven hub exposure, readiness checkpoints, and a contractor-ready backlog before Grade 4 Math packages are implemented.
## Production Standard
- Use the same Grades 1-3 production path: SkillPackage JSON -> Skill World generator -> Guided Mission -> Skill Practice Center -> manifest/graph/hub exposure.
- Every production package must generate the Guided Mission sequence: Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center must include at least 4 focused levels plus Mixed; each focused level and Mixed must have 10-12 real questions.
- Packages must appear from manifest/graph-driven discovery. Do not hardcode Grade 4 cards and do not ship placeholders.
- Every package must include production content, answer validation, misconception tagging, voice metadata, and readiness checkpoint metadata before hub exposure.
- This plan intentionally does not implement all Grade 4 Math packages; it creates the completion plan and backlog only.
## Grade 1-3 Renderer Assessment for Grade 4 Math
### Supported or extendable by the existing Grades 1-3 baseline
- `number_line` — **supported**; Reusable for Grade 4 whole-number rounding, fraction number lines, and measurement contexts; must support larger labels, fractional ticks, and clearer benchmark labels.
- `comparison` — **supported**; Reusable for whole-number and fraction comparisons; Grade 4 packages should also introduce `comparison_model` when multiplicative comparison requires ratio language or times-as-many visuals.
- `place_value_chart` — **extend**; Existing Grades 1-3 chart concepts are reusable, but Grade 4 needs named places through millions, commas, period grouping, and explicit zero placeholders.
- `expanded_form` — **extend**; Reusable for base-ten decomposition; Grade 4 needs standard, word, expanded, and expanded-notation variants through 1,000,000.
- `rounding_model` — **extend**; Reusable midpoint model; Grade 4 needs nearest ten, hundred, thousand, ten-thousand, and hundred-thousand intervals.
- `area_model` — **supported_extend**; Reusable for multiplication and area/perimeter contexts; Grade 4 multiplication needs multi-digit partitions, labels, and partial products.
- `multiplication_model` — **supported_extend**; Reusable from Grade 3 multiplication foundations; Grade 4 needs up-to-four-digits-by-one-digit and two-digits-by-two-digits metadata.
- `division_model` — **supported_extend**; Reusable from Grade 3 division foundations; Grade 4 needs long-division steps, quotient place value, and remainder display.
- `fact_family_model` — **supported**; Reusable for checking division with multiplication and inverse-operation prompts.
- `fraction_bar` — **supported_extend**; Reusable for equivalent fractions and fraction operations; Grade 4 needs unlike-denominator comparison and whole-number multiples of unit fractions.
- `fraction_circle` — **supported**; Reusable for fraction equivalence and like-denominator operations where circle partitions are appropriate.
- `repeated_addition` — **supported_extend**; Reusable for whole-number multiplication; Grade 4 needs fraction repeated-addition narration and notation.
- `equation_builder` — **supported_extend**; Reusable for fraction operation setup and word-problem equations; needs mixed-number and unit support.
- `word_problem_model` — **supported_extend**; Reusable for multi-step measurement, fraction, and operation contexts; Grade 4 needs units, equations, and answer labels.
- `line_plot` — **supported_extend**; Reusable for data displays; Grade 4 needs fractional measurement labels and fraction-answer normalization.
- `perimeter_path` — **supported**; Reusable for area/perimeter word problems and geometry contexts.
- `shape_identification` — **supported_extend**; Reusable for shape classification; Grade 4 needs lines, angles, symmetry, parallel/perpendicular attributes, and hierarchy metadata.

### New renderers needed for Grade 4 Math
- `comparison_model` — Multiplicative comparison visual with groups, times-as-many labels, and additive-vs-multiplicative contrast.
- `factor_pair_model` — Factor-pair tiles/table showing products, missing factors, and factor vs multiple language.
- `multiples_chart` — Highlighted skip-count/multiple chart for factors, multiples, prime/composite reasoning, and common multiples.
- `pattern_table` — Input/output and shape/number pattern table with rule callouts and missing-term slots.
- `algorithm_steps` — Column-aligned standard algorithm renderer for addition, subtraction, multiplication, and division step explanations.
- `regrouping_model` — Explicit trade/regrouping visual for multi-digit subtraction, including regrouping across zeros.
- `estimation_number_line` — Number line for estimate-first and reasonableness checks with rounded addends/subtrahends/products.
- `partial_products_model` — Multi-digit multiplication partial-products grid/table connected to area model and standard algorithm.
- `remainder_model` — Division visual that shows quotient groups, leftovers, and context-specific remainder interpretation.
- `measurement_conversion_table` — Conversion table for larger-to-smaller units with multiplicative scale factors and unit labels.
- `angle_model` — Angle visual with vertex, rays, degree measure labels, and acute/right/obtuse categories.
- `protractor_model` — Interactive/static protractor view with baseline, vertex placement, inner/outer scale reading, and target angle.
- `line_relationships` — Parallel, perpendicular, intersecting, ray, line, and segment relationship visual.
- `symmetry_model` — Shape symmetry visual with candidate fold lines and reflection matching.

## Schema Updates Needed
- Keep SkillPackage JSON as the source of truth and require generator mappings for the full Guided Mission sequence: Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
- Require Grade 4 Math `level_banks` validation for every production package: four focused levels plus Mixed, each with `question_count_required` between 10 and 12, mastery threshold, feedback, and readiness checkpoint fields.
- Document or enumerate Grade 4 Math `visual_model` values for supported, extended, and new renderers in this plan; if the schema continues allowing arbitrary strings, enforce renderer registry coverage at package validation time.
- Add or map Grade 4 Math `question_type` values: `multiple_choice`, `short_response`, `pattern_response`, `comparison`, `rounding`, `algorithm_response`, `multiplication_equation`, `division_equation`, `fraction_response`, `word_problem`, `measurement`, `data_interpretation`, and `geometry_response`.
- Add item metadata for Grade 4 operands and visuals: place value periods, rounding place, comparison multiplier, factors, multiples, prime/composite flags, pattern rules, addends, subtrahends, regrouping steps, partial products, dividend, divisor, quotient, remainder, numerator, denominator, mixed-number parts, unit conversion scale, angle measure, line relationship, symmetry line, and acceptable equivalent forms.
- Require manifest/graph/hub metadata for Grade 4 Math packages so discovery is manifest-driven and never created as hardcoded placeholder cards.
- Require voice metadata fields for page narration and question narration, including cached AI audio key compatibility and browser speech fallback text.

## Acceptable-Answer Needs
- Numeric answers must normalize words, digits, commas, equations, and whitespace, e.g. `1000000`, `1,000,000`, and `one million` where the prompt permits words.
- Place-value answers must accept standard, word, expanded, and expanded-notation forms only when the prompt allows those forms; zero placeholders must be preserved in validation.
- Comparison answers must accept symbols and words, e.g. `>`, `greater than`, `<`, `less than`, `=`, and `equal to`.
- Multiplicative comparison answers must distinguish `times as many` from additive differences and validate multiplier direction.
- Factor/multiple answers must reject swapped language when the prompt requires a factor versus a multiple.
- Algorithm responses must support final answer validation plus optional step fields for regrouping, partial products, quotient placement, and remainder interpretation.
- Fraction answers must normalize equivalent fractions, simplified fractions, improper fractions, mixed numbers, and spacing according to item intent.
- Measurement answers must validate units, conversion direction, and equivalent unit expressions; correct numbers with incorrect units should be rejected unless the prompt asks for a number only.
- Geometry answers must normalize angle measures with or without degree symbols, line relationship vocabulary, and shape classification terms.

## Voice Narration Requirements
- Every Guided Mission screen must include a **Read This Page** control with page-level narration text.
- Mission Practice, Challenge, and Checkpoint questions must include **Read Question** controls.
- Every Skill Practice Center question must include a **Read Question** control.
- Math narration must speak symbols naturally: `>` as “greater than,” `<` as “less than,” `=` as “equals,” `×` as “times,” `÷` as “divided by,” `/` in fractions as “over,” and `°` as “degrees.”
- Place-value narration must speak commas and periods naturally, e.g. “one million, two hundred thirty-four thousand, five hundred sixty-seven.”
- Fraction narration must speak common fractions naturally, mixed numbers as “two and three fourths,” and multiplication by fractions as “three groups of one fourth” when context requires.
- Measurement narration must include units and conversion relationships.
- Cached AI audio must remain compatible with `POST /api/skill-world/audio`; packages should provide stable audio keys/text for caching.
- Browser speech fallback must read the same page/question text when cached AI audio is unavailable or disabled.
- Narration text must be production copy, not placeholder text, and should avoid reading raw JSON symbols when a natural-language equivalent exists.

## Manifest and Hub Exposure Requirements
- Grade 4 Math packages must be exposed through the curriculum manifest/graph and the existing hub discovery path.
- Hub cards must read skill ID, title, domain, focus, readiness status, Guided Mission availability, and Practice Center availability from package/manifest data.
- Readiness checkpoints must block a package from production hub exposure until schema validation, renderer coverage, voice coverage, answer validation, and Practice Center level counts pass.
- The hub must not render hardcoded Grade 4 cards, one-off games, or placeholder cards.

## Grade 4 Math Production Skill Set
### G4M_OA_001 — Multiplicative Comparison and Patterns
- **Domain:** Operations and Algebraic Thinking
- **Focus:** understand multiplicative comparison, factors, multiples, and shape/number patterns
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Multiplicative Comparison — 10-12 questions
  - Level 2: Factors and Multiples — 10-12 questions
  - Level 3: Prime and Composite Numbers — 10-12 questions
  - Level 4: Number and Shape Patterns — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `comparison_model`, `factor_pair_model`, `multiples_chart`, `pattern_table`
- **Question types:** `multiple_choice`, `short_response`, `pattern_response`
- **Misconception tags:** `additive_vs_multiplicative_confusion`, `factor_multiple_confusion`, `prime_composite_confusion`, `pattern_rule_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_NBT_001 — Place Value to 1,000,000
- **Domain:** Number and Operations in Base Ten
- **Focus:** read, write, compare, and round multi-digit whole numbers
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Place Value to 1,000,000 — 10-12 questions
  - Level 2: Read and Write Multi-Digit Numbers — 10-12 questions
  - Level 3: Compare Multi-Digit Numbers — 10-12 questions
  - Level 4: Round Multi-Digit Numbers — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `place_value_chart`, `expanded_form`, `number_line`, `rounding_model`
- **Question types:** `multiple_choice`, `short_response`, `comparison`, `rounding`
- **Misconception tags:** `place_value_shift_error`, `zero_placeholder_confusion`, `expanded_form_error`, `rounding_place_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_NBT_002 — Multi-Digit Addition and Subtraction
- **Domain:** Number and Operations in Base Ten
- **Focus:** fluently add and subtract multi-digit whole numbers using standard algorithm and place value
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Add Multi-Digit Numbers — 10-12 questions
  - Level 2: Subtract Multi-Digit Numbers — 10-12 questions
  - Level 3: Regrouping Across Zeros — 10-12 questions
  - Level 4: Estimate and Check — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `place_value_chart`, `algorithm_steps`, `regrouping_model`, `estimation_number_line`
- **Question types:** `multiple_choice`, `short_response`, `algorithm_response`
- **Misconception tags:** `regrouping_across_zero_error`, `digit_alignment_error`, `subtraction_borrowing_error`, `estimate_reasonableness_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_NBT_003 — Multi-Digit Multiplication
- **Domain:** Number and Operations in Base Ten
- **Focus:** multiply up to four digits by one digit and two digits by two digits
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Multiply by One Digit — 10-12 questions
  - Level 2: Area Model Multiplication — 10-12 questions
  - Level 3: Partial Products — 10-12 questions
  - Level 4: Two-Digit by Two-Digit — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `area_model`, `partial_products_model`, `multiplication_model`, `algorithm_steps`
- **Question types:** `multiple_choice`, `short_response`, `multiplication_equation`
- **Misconception tags:** `place_value_product_error`, `partial_products_confusion`, `digit_alignment_error`, `area_model_mismatch`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_NBT_004 — Division With Remainders
- **Domain:** Number and Operations in Base Ten
- **Focus:** divide up to four-digit dividends by one-digit divisors, including remainders
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Division Without Remainders — 10-12 questions
  - Level 2: Division With Remainders — 10-12 questions
  - Level 3: Interpret Remainders — 10-12 questions
  - Level 4: Check With Multiplication — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `division_model`, `area_model`, `remainder_model`, `fact_family_model`
- **Question types:** `multiple_choice`, `short_response`, `division_equation`
- **Misconception tags:** `remainder_confusion`, `divisor_dividend_confusion`, `quotient_place_value_error`, `inverse_operation_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_FR_001 — Fraction Equivalence and Ordering
- **Domain:** Number and Operations—Fractions
- **Focus:** generate equivalent fractions and compare fractions with unlike numerators/denominators
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Equivalent Fractions — 10-12 questions
  - Level 2: Compare Fractions — 10-12 questions
  - Level 3: Fraction Number Lines — 10-12 questions
  - Level 4: Benchmark Fractions — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `fraction_bar`, `fraction_circle`, `number_line`, `comparison`
- **Question types:** `multiple_choice`, `short_response`, `fraction_response`, `comparison`
- **Misconception tags:** `equivalent_fraction_confusion`, `denominator_size_confusion`, `benchmark_fraction_error`, `fraction_number_line_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_FR_002 — Add and Subtract Fractions
- **Domain:** Number and Operations—Fractions
- **Focus:** add and subtract fractions and mixed numbers with like denominators
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Add Like Denominators — 10-12 questions
  - Level 2: Subtract Like Denominators — 10-12 questions
  - Level 3: Mixed Numbers — 10-12 questions
  - Level 4: Word Problems With Fractions — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `fraction_bar`, `fraction_circle`, `equation_builder`, `word_problem_model`
- **Question types:** `multiple_choice`, `short_response`, `fraction_response`, `word_problem`
- **Misconception tags:** `denominator_addition_error`, `mixed_number_confusion`, `improper_fraction_confusion`, `fraction_word_problem_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_FR_003 — Multiply Fractions by Whole Numbers
- **Domain:** Number and Operations—Fractions
- **Focus:** understand a fraction as a multiple of a unit fraction and multiply fractions by whole numbers
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Unit Fractions as Multiples — 10-12 questions
  - Level 2: Whole Number Times Fraction — 10-12 questions
  - Level 3: Fraction Times Whole Number — 10-12 questions
  - Level 4: Fraction Word Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `fraction_bar`, `repeated_addition`, `multiplication_model`, `word_problem_model`
- **Question types:** `multiple_choice`, `short_response`, `fraction_response`, `multiplication_equation`
- **Misconception tags:** `unit_fraction_multiple_confusion`, `whole_number_fraction_product_error`, `repeated_addition_fraction_error`, `fraction_scaling_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_MD_001 — Measurement Conversion and Data
- **Domain:** Measurement and Data
- **Focus:** convert measurements, solve measurement problems, and interpret line plots with fractions
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Convert Larger to Smaller Units — 10-12 questions
  - Level 2: Measurement Word Problems — 10-12 questions
  - Level 3: Line Plots With Fractions — 10-12 questions
  - Level 4: Area and Perimeter Word Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `measurement_conversion_table`, `word_problem_model`, `line_plot`, `area_model`, `perimeter_path`
- **Question types:** `multiple_choice`, `short_response`, `measurement`, `data_interpretation`
- **Misconception tags:** `unit_conversion_direction_error`, `measurement_unit_confusion`, `line_plot_fraction_error`, `area_perimeter_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G4M_GM_001 — Angles, Lines, and Shape Classification
- **Domain:** Geometry
- **Focus:** points, lines, rays, angles, perpendicular/parallel lines, symmetry, and classify shapes
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Points, Lines, Rays, and Angles — 10-12 questions
  - Level 2: Measure and Draw Angles — 10-12 questions
  - Level 3: Parallel and Perpendicular Lines — 10-12 questions
  - Level 4: Classify Shapes and Symmetry — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `angle_model`, `protractor_model`, `line_relationships`, `symmetry_model`, `shape_identification`
- **Question types:** `multiple_choice`, `short_response`, `geometry_response`
- **Misconception tags:** `angle_size_confusion`, `protractor_reading_error`, `parallel_perpendicular_confusion`, `symmetry_line_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 4 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

## Contractor-Ready Backlog
### G4M-INF-001 — Finalize Grade 4 Math SkillPackage schema/runtime contract
- **Priority:** P0
- **Type:** SCHEMA_UPDATE
- **Owner:** platform/schema
- **Depends on:** None
- **Acceptance criteria:**
  - Schema or registry mappings cover every Grade 4 visual_model and question_type in this plan.
  - Validation rejects packages without Story through Profile guided mission source data or deterministic generator mappings.
  - Validation rejects Practice Center level_banks that do not include four focused levels plus Mixed with 10-12 questions each.
  - Grade 4 package metadata includes domain, focus, standards tags, misconception tags, voice metadata, and manifest exposure metadata.

### G4M-INF-002 — Build or extend Grade 4 Math visual renderers
- **Priority:** P0
- **Type:** RENDERER_UPDATE
- **Owner:** skill-world/renderers
- **Depends on:** G4M-INF-001
- **Acceptance criteria:**
  - Renderer registry covers supported/extended and new Grade 4 visual models without fallback placeholder output.
  - Each renderer has a canonical fixture and test asserting data-renderer output.
  - Math-specific renderers expose aria labels and speakable descriptions for voice narration.

### G4M-INF-003 — Guarantee Skill Practice Center generation from level_banks
- **Priority:** P0
- **Type:** PRACTICE_CENTER_GENERATOR
- **Owner:** skill-world/generator
- **Depends on:** G4M-INF-001
- **Acceptance criteria:**
  - Every Grade 4 Math package exposes Level 1, Level 2, Level 3, Level 4, and Mixed from package data.
  - Each level renders 10-12 production questions, mastery state, feedback, and Read Question controls.
  - No Skill Practice Center cards or questions are hardcoded outside package/manifest data.

### G4M-INF-004 — Wire Grade 4 Math packages through manifest/graph/hub discovery
- **Priority:** P0
- **Type:** MANIFEST_HUB_EXPOSURE
- **Owner:** gamehub/content
- **Depends on:** G4M-INF-001
- **Acceptance criteria:**
  - Grade 4 Math appears only after packages are listed in the content manifest/graph.
  - Hub cards use SkillPackage metadata, not hardcoded placeholders.
  - Readiness checkpoints prevent incomplete packages from appearing as production-ready.

### G4M-INF-005 — Implement full Grade 4 Math voice standard
- **Priority:** P0
- **Type:** VOICE_AUDIO
- **Owner:** skill-world/audio
- **Depends on:** G4M-INF-001
- **Acceptance criteria:**
  - Every guided mission screen includes Read This Page text and label.
  - Practice, Challenge, and Checkpoint questions include Read Question text.
  - All Practice Center questions include Read Question text.
  - Narration routes through /api/skill-world/audio when cached AI audio is available and falls back to browser speech when not available.
  - Math symbols, fractions, comparisons, exponents of place value, and units are spoken naturally.

### G4M-INF-006 — Add Grade 4 acceptable-answer normalization
- **Priority:** P0
- **Type:** ANSWER_VALIDATION
- **Owner:** skill-world/runtime
- **Depends on:** G4M-INF-001
- **Acceptance criteria:**
  - Numeric answers normalize commas, words, equations, and standard notation where appropriate.
  - Fraction answers normalize equivalent fractions, mixed numbers, improper fractions, and spacing.
  - Comparison answers accept symbols and words.
  - Measurement answers validate required units and conversion equivalence.
  - Algorithm responses can validate final answer plus step fields when the item requires them.

## Package Implementation Sequence
1. Complete schema/runtime contract, renderer registry coverage, voice contract, and acceptable-answer normalization.
2. Implement and test reusable Grade 4 visual renderers and renderer fixtures.
3. Produce packages in dependency order: `G4M_OA_001`, `G4M_NBT_001`, `G4M_NBT_002`, `G4M_NBT_003`, `G4M_NBT_004`, `G4M_FR_001`, `G4M_FR_002`, `G4M_FR_003`, `G4M_MD_001`, `G4M_GM_001`.
4. For each package, validate Guided Mission, Practice Center counts, voice coverage, answer normalization, renderer coverage, manifest exposure, and readiness checkpoint status before production hub exposure.

