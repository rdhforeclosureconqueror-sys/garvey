# Grade 6 Math Completion Plan (Skill World Production)

## Executive Summary
Grade 6 Math must be built as production SkillPackage JSON, not as one-off games or placeholder cards. This plan defines the Grade 6 Math production skill map, Skill World generator requirements, Guided Mission requirements, Skill Practice Center requirements, renderer and schema gaps, acceptable-answer needs, full voice requirements, manifest-driven hub exposure, graph/statistics visual risks, and a contractor-ready backlog before Grade 6 Math packages are implemented.

## Production Standard
- Use the same Grades 1-5 production path: SkillPackage JSON -> Skill World generator -> Guided Mission -> Skill Practice Center -> manifest/graph/hub exposure.
- Every production package must generate the Guided Mission sequence: Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center must include at least 4 focused levels plus Mixed; each focused level and Mixed must have 10-12 real questions.
- Packages must appear from manifest/graph-driven discovery. Do not hardcode Grade 6 cards and do not ship placeholders.
- Every package must include production content, answer validation, misconception tagging, full voice metadata, cached AI audio compatibility, browser fallback, and readiness checkpoint metadata before hub exposure.
- This plan intentionally does not implement Grade 6 Math packages; it creates the completion plan and backlog only.

## Grades 1-5 Renderer Assessment for Grade 6 Math
### Supported or extendable by the existing Grades 1-5 baseline
- `fraction_bar` — **supported_extend**; Reusable from Grades 1-5; Grade 6 fraction division needs measurement and sharing contexts plus quotient-size language.
- `fraction_division_model` — **extend**; Grade 5 fraction division foundations can extend to fraction-by-fraction division and real-world contexts.
- `number_line` — **supported_extend**; Reusable for fractions and decimals; Grade 6 needs negative values, absolute value, and ratio/rate scaling when not using dedicated integer or double-number-line renderers.
- `word_problem_model` — **supported_extend**; Reusable narrative problem shell; Grade 6 needs ratio, rate, fraction division, decimal operation, geometry, and statistics contexts with unit labels.
- `decimal_grid` — **supported_extend**; Reusable for decimal magnitude and operations; Grade 6 needs multi-digit decimal fluency, estimation, and operation-choice feedback.
- `place_value_chart` — **supported_extend**; Reusable for decimal alignment and place value; Grade 6 needs operation explanations more than new place-value columns.
- `algorithm_steps` — **supported_extend**; Reusable standard-algorithm renderer; Grade 6 needs decimal multiplication/division steps, estimation checks, and speakable regrouping/decimal placement.
- `comparison_model` — **supported_extend**; Reusable comparison scaffolding; Grade 6 needs integer ordering and inequality language.
- `expression_builder` — **supported_extend**; Grade 5 expression renderer should extend for variables, exponents, substitution, and order-of-operations explanations.
- `equation_builder` — **supported_extend**; Reusable equation renderer; Grade 6 needs one-step equation solving, inverse-operation annotations, and inequality connections.
- `pattern_table` — **supported_extend**; Reusable input/output table; Grade 6 needs explicit independent/dependent variable labels and rule matching.
- `coordinate_plane` — **extend**; Grade 5 first-quadrant coordinate plane must extend to all four quadrants and signed coordinates.
- `graph_interpretation` — **supported_extend**; Reusable graph reading shell; Grade 6 needs variable relationships, data-display interpretation, and accessibility text.
- `area_model` — **supported_extend**; Reusable area renderer; Grade 6 needs triangle, quadrilateral, and decomposition models with formula connections.
- `rectangular_prism_model` — **supported_extend**; Reusable prism renderer; Grade 6 needs surface-area/volume distinction and labeled dimensions.
- `volume_model` — **supported_extend**; Reusable unit-cube/layer model; Grade 6 needs rectangular-prism volume fluency and unit reasoning.
- `data_table` — **supported_extend**; Reusable tabular data display; Grade 6 needs statistical-question and summary-statistic metadata.

### New renderers needed for Grade 6 Math
- `ratio_table` — Equivalent-ratio table with scalable rows, missing-value highlighting, multiplicative arrows, and accessible row/column narration.
- `double_number_line` — Paired scaled number lines for ratio/rate reasoning with aligned tick marks, unit labels, and proportional-step narration.
- `tape_diagram` — Part-part/part-whole and ratio tape segments with labels, totals, and visual safeguards against order reversal.
- `unit_rate_card` — Compact rate comparison card that separates numerator unit, denominator unit, per-one language, and answer units.
- `integer_number_line` — Signed number line with zero anchor, direction cues, comparisons, and responsive tick density.
- `absolute_value_model` — Distance-from-zero visual that emphasizes absolute value as magnitude, not sign removal without context.
- `exponent_model` — Repeated-factor/exponential-form visual with base/exponent callouts and natural narration for powers.
- `variable_tile` — Variable and value substitution tile renderer with labels, expressions, and accessible replacement steps.
- `order_of_operations_steps` — Step-by-step expression simplification panel with grouped operations, exponents, and operation-order highlights.
- `balance_scale` — Equation balance model that shows inverse operations on both sides and supports multiplication/division contexts.
- `inequality_number_line` — Open/closed circle number-line solution renderer with ray direction, boundary value, and symbol alignment.
- `solution_set_model` — Inequality or equation solution-set panel connecting symbols, words, and number-line representations.
- `equation_table_match` — Matcher for equations, tables, graphs, and verbal descriptions with input/output labels.
- `polygon_area_model` — Polygon decomposition/composition renderer for triangles, quadrilaterals, and composite figures.
- `net_model` — Surface-area net renderer with face labels, duplicate-face pairing, dimensions, and foldable-prism descriptions.
- `dot_plot` — Dot plot renderer with stacked points, scale labels, clusters, gaps, peaks, outliers, and accessible summaries.
- `histogram` — Binned data renderer with interval boundaries, frequency bars, and clear distinction from bar graphs.
- `box_plot` — Five-number-summary renderer with whiskers, quartiles, median, interquartile range, and outlier annotations.
- `statistics_summary` — Summary-statistics panel for mean, median, mode, range, IQR, variability, and contextual interpretation.
- `data_comparison_panel` — Side-by-side data-display comparison renderer for center, spread, shape, clusters, gaps, and outliers.

## Schema Updates Needed
- Require Grade 6 SkillPackage metadata for domain, focus, standards tags, level_banks, visual_models, question_types, misconception_tags, voice metadata, acceptable-answer metadata, and manifest exposure status.
- Require generator mappings or source content for every Guided Mission stage: Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
- Validate that each Skill Practice Center has exactly four focused Level banks plus Mixed, and each bank has 10-12 production questions.
- Extend visual_model enum/registry for all Grade 6 new renderers and mark existing renderer extensions required before package exposure.
- Extend question_type and answer schema for ratio_response, rate_response, fraction_response, decimal_response, integer_response, comparison, expression_response, equation_response, inequality_response, coordinate_response, geometry_response, volume_response, data_interpretation, statistics_response, division_equation, and word_problem.
- Add renderer fixture requirements: every visual_model used by Grade 6 must have canonical package fixture data, aria labels, speakable descriptions, and no placeholder fallback state.

## Acceptable-Answer Needs
- Ratio answers must accept equivalent ratio forms only when the prompt allows equivalence, preserve order, and validate colon, word, and fraction-like ratio notation.
- Unit-rate answers must validate numerator unit, denominator unit, per-one denominator, decimal/fraction equivalents, and required rounding precision.
- Fraction division answers must accept simplified and unsimplified equivalent fractions when permitted, mixed-number forms when permitted, and equations that preserve dividend/divisor order.
- Decimal answers must validate place value, rounding tolerance when specified, exactness when required, and operation-choice reasoning for word problems.
- Integer/comparison answers must validate signed values, inequality symbols, ordering from least to greatest/greatest to least, opposites, absolute value, and coordinate signs.
- Expression answers must support equivalent expression forms only under explicit equivalence rules and validate exponent notation, substitution, and order-of-operations steps.
- Equation and inequality answers must validate inverse operations, solution values, inequality direction, open/closed boundary points, and symbolic/number-line consistency.
- Coordinate and variable-relationship answers must validate ordered pairs, quadrant signs, independent/dependent variable labels, table-rule matches, and graph correspondences.
- Geometry answers must validate units, square/cubic units, surface-area versus volume context, formula selections, polygon decompositions, and net face totals.
- Statistics answers must validate mean/median/mode/range/IQR, five-number summaries, display readings, data-set comparisons, and context-based interpretations.
- Short-response rubrics must include acceptable aliases, natural-language equivalents, unit requirements, misconception-tag mapping, and deterministic feedback hints.

## Voice Narration Requirements
- Every Guided Mission screen must expose Read This Page text with grade-appropriate, human-readable math narration.
- Mission Practice, Challenge, and Checkpoint questions must expose Read Question text for the prompt, answer choices, visual alt summaries, and feedback when available.
- Every Skill Practice Center question must expose Read Question text, including level name, prompt, answer options, and concise visual description.
- Math narration must speak symbols naturally: ratios as '3 to 4', rates as '12 miles per 3 hours', fractions as 'two-thirds', exponents as '3 to the fourth power', inequalities as 'x is greater than or equal to 5', and coordinates as 'negative 2 comma 4'.
- All packages must be compatible with cached AI audio through /api/skill-world/audio and must fall back to browser speech without blocking practice.
- Renderer data must include speakable descriptions for graphs, tables, number lines, nets, box plots, histograms, and statistical summaries so audio is not limited to raw symbols.

## Grade 6 Graph and Statistics Visual Risk Areas
- Coordinate planes with all four quadrants can become unreadable on mobile if tick density, origin labels, and negative-axis labels are not responsive.
- Double number lines and ratio tables can imply additive rather than multiplicative reasoning if scaling arrows and row alignment are unclear.
- Inequality number lines are high-risk for symbol-direction reversal, open/closed endpoint confusion, and inconsistent ray orientation in right-to-left or narrow layouts.
- Histograms are easily confused with bar graphs; bin boundaries, intervals, and frequencies must be explicit in visuals and voice narration.
- Box plots require accurate five-number summaries, quartile positions, whisker scaling, and outlier notation; small rendering errors create wrong math.
- Dot plots need stacked-dot collision handling, accessible count summaries, and clear scale ticks for clusters, gaps, peaks, and outliers.
- Statistics comparison panels must avoid overemphasizing mean alone; center, spread, shape, outliers, and context need equal visual affordances.
- Surface-area nets can undercount/overcount faces unless paired faces, dimensions, and unit labels are visually linked.

## Grade 6 Math Skill Map

### G6M_RP_001 — Ratios and Unit Rates
- **Domain:** Ratios and Proportional Relationships
- **Focus:** understand ratios, ratio language, equivalent ratios, and unit rates
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Ratio Language — 10-12 questions
  - Level 2: Equivalent Ratios — 10-12 questions
  - Level 3: Ratio Tables — 10-12 questions
  - Level 4: Unit Rates — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `ratio_table`, `double_number_line`, `tape_diagram`, `unit_rate_card`
- **Question types:** `multiple_choice`, `short_response`, `ratio_response`, `rate_response`
- **Misconception tags:** `ratio_order_reversal`, `part_part_whole_confusion`, `equivalent_ratio_error`, `unit_rate_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_NS_001 — Dividing Fractions
- **Domain:** The Number System
- **Focus:** divide fractions by fractions and solve real-world fraction division problems
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Fraction Division Meaning — 10-12 questions
  - Level 2: Visual Fraction Division — 10-12 questions
  - Level 3: Divide Fractions by Fractions — 10-12 questions
  - Level 4: Fraction Division Word Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `fraction_bar`, `fraction_division_model`, `number_line`, `word_problem_model`
- **Question types:** `multiple_choice`, `short_response`, `fraction_response`, `division_equation`
- **Misconception tags:** `divisor_dividend_confusion`, `reciprocal_misuse`, `fraction_division_context_error`, `quotient_size_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_NS_002 — Multi-Digit Decimal Operations
- **Domain:** The Number System
- **Focus:** fluently add, subtract, multiply, and divide multi-digit decimals
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Add and Subtract Decimals — 10-12 questions
  - Level 2: Multiply Decimals — 10-12 questions
  - Level 3: Divide Decimals — 10-12 questions
  - Level 4: Decimal Operation Word Problems — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `decimal_grid`, `place_value_chart`, `algorithm_steps`, `estimation_number_line`
- **Question types:** `multiple_choice`, `short_response`, `decimal_response`, `word_problem`
- **Misconception tags:** `decimal_alignment_error`, `decimal_product_size_error`, `decimal_quotient_error`, `operation_choice_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_NS_003 — Integers and the Number Line
- **Domain:** The Number System
- **Focus:** understand positive/negative numbers, absolute value, opposites, and comparisons
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Positive and Negative Numbers — 10-12 questions
  - Level 2: Opposites and Absolute Value — 10-12 questions
  - Level 3: Compare Integers — 10-12 questions
  - Level 4: Coordinate Plane With Integers — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `integer_number_line`, `absolute_value_model`, `coordinate_plane`, `comparison_model`
- **Question types:** `multiple_choice`, `short_response`, `integer_response`, `comparison`
- **Misconception tags:** `negative_number_order_error`, `absolute_value_confusion`, `opposite_number_confusion`, `coordinate_sign_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_EE_001 — Expressions and Exponents
- **Domain:** Expressions and Equations
- **Focus:** write, evaluate, and interpret expressions with variables, exponents, and order of operations
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Numerical Expressions — 10-12 questions
  - Level 2: Exponents — 10-12 questions
  - Level 3: Variables and Substitution — 10-12 questions
  - Level 4: Order of Operations — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `expression_builder`, `exponent_model`, `variable_tile`, `order_of_operations_steps`
- **Question types:** `multiple_choice`, `short_response`, `expression_response`
- **Misconception tags:** `exponent_multiplication_confusion`, `variable_meaning_confusion`, `operation_order_confusion`, `substitution_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_EE_002 — Equations and Inequalities
- **Domain:** Expressions and Equations
- **Focus:** solve one-step equations and inequalities and represent solutions
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: One-Step Addition/Subtraction Equations — 10-12 questions
  - Level 2: One-Step Multiplication/Division Equations — 10-12 questions
  - Level 3: Inequalities — 10-12 questions
  - Level 4: Represent Solutions — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `balance_scale`, `equation_builder`, `inequality_number_line`, `solution_set_model`
- **Question types:** `multiple_choice`, `short_response`, `equation_response`, `inequality_response`
- **Misconception tags:** `inverse_operation_error`, `equality_balance_confusion`, `inequality_symbol_reversal`, `solution_set_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_EE_003 — Dependent and Independent Variables
- **Domain:** Expressions and Equations
- **Focus:** represent relationships between variables using tables, graphs, equations, and verbal descriptions
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Identify Variables — 10-12 questions
  - Level 2: Tables and Rules — 10-12 questions
  - Level 3: Graph Relationships — 10-12 questions
  - Level 4: Match Equation/Table/Graph — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `pattern_table`, `coordinate_plane`, `graph_interpretation`, `equation_table_match`
- **Question types:** `multiple_choice`, `short_response`, `coordinate_response`, `expression_response`
- **Misconception tags:** `independent_dependent_confusion`, `graph_table_mismatch`, `equation_rule_error`, `input_output_reversal`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_GM_001 — Area, Surface Area, and Volume
- **Domain:** Geometry
- **Focus:** find area of triangles/quadrilaterals/polygons, surface area, and volume
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Area of Triangles and Quadrilaterals — 10-12 questions
  - Level 2: Area of Polygons — 10-12 questions
  - Level 3: Surface Area With Nets — 10-12 questions
  - Level 4: Volume of Rectangular Prisms — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `area_model`, `polygon_area_model`, `net_model`, `rectangular_prism_model`, `volume_model`
- **Question types:** `multiple_choice`, `short_response`, `geometry_response`, `volume_response`
- **Misconception tags:** `triangle_area_halving_error`, `polygon_decomposition_error`, `surface_area_net_error`, `volume_area_confusion`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_SP_001 — Statistical Questions and Data Displays
- **Domain:** Statistics and Probability
- **Focus:** statistical questions, dot plots, histograms, box plots, and measures of center/spread
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Statistical Questions — 10-12 questions
  - Level 2: Dot Plots and Histograms — 10-12 questions
  - Level 3: Mean, Median, Mode, and Range — 10-12 questions
  - Level 4: Box Plots and Distribution Shape — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `dot_plot`, `histogram`, `box_plot`, `data_table`, `statistics_summary`
- **Question types:** `multiple_choice`, `short_response`, `data_interpretation`, `statistics_response`
- **Misconception tags:** `non_statistical_question_confusion`, `mean_median_confusion`, `range_error`, `box_plot_reading_error`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G6M_SP_002 — Summarize and Interpret Data
- **Domain:** Statistics and Probability
- **Focus:** describe distributions by center, spread, variability, clusters, peaks, gaps, and outliers
- **Guided Mission:** Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile
- **Skill Practice Center level banks:**
  - Level 1: Describe Center and Spread — 10-12 questions
  - Level 2: Clusters, Peaks, Gaps, and Outliers — 10-12 questions
  - Level 3: Compare Data Sets — 10-12 questions
  - Level 4: Interpret Data in Context — 10-12 questions
  - Mixed: Mixed — 10-12 questions
- **Visual models:** `dot_plot`, `histogram`, `box_plot`, `data_comparison_panel`, `statistics_summary`
- **Question types:** `multiple_choice`, `short_response`, `data_interpretation`, `statistics_response`
- **Misconception tags:** `center_vs_spread_confusion`, `outlier_effect_confusion`, `distribution_shape_error`, `context_interpretation_gap`
- **Voice acceptance:** every guided screen has Read This Page; mission Practice/Challenge/Checkpoint and all Practice Center items have Read Question with natural math narration, cached AI audio compatibility through `/api/skill-world/audio`, and browser fallback.
- **Package acceptance:** production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 6 Math hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

## Contractor-Ready Backlog

### G6M-INF-001 — Finalize Grade 6 Math SkillPackage schema/runtime contract
- **Priority:** P0
- **Type:** SCHEMA_UPDATE
- **Owner:** platform/schema
- **Depends on:** None
- **Acceptance criteria:**
  - Schema/registry covers every Grade 6 visual_model, question_type, answer type, misconception tag, voice metadata field, and manifest exposure field in this plan.
  - Validation rejects packages missing any Guided Mission stage from Story through Profile.
  - Validation rejects Practice Center level_banks without four focused levels plus Mixed or without 10-12 questions per bank.
  - Validation rejects package exposure when renderer fixtures, acceptable-answer metadata, or voice metadata are incomplete.

### G6M-INF-002 — Build or extend Grade 6 Math visual renderers
- **Priority:** P0
- **Type:** RENDERER_UPDATE
- **Owner:** skill-world/renderers
- **Depends on:** G6M-INF-001
- **Acceptance criteria:**
  - Renderer registry covers all supported/extended and new Grade 6 visual models without fallback placeholder output.
  - Each Grade 6 renderer has fixture data, deterministic tests, aria labels, speakable descriptions, mobile layout checks, and no one-off game code path.
  - High-risk graph/statistics renderers have fixtures for edge cases including negative axes, open/closed inequality points, histogram bins, box-plot quartiles, and outliers.

### G6M-INF-003 — Implement Grade 6 Math voice/audio coverage
- **Priority:** P0
- **Type:** VOICE_AUDIO
- **Owner:** skill-world/audio
- **Depends on:** G6M-INF-001, G6M-INF-002
- **Acceptance criteria:**
  - Read This Page exists for every guided mission screen and Read Question exists for mission Practice/Challenge/Checkpoint and all Practice Center questions.
  - Natural math narration rules cover ratios, rates, fractions, decimals, integers, inequalities, exponents, coordinates, geometry units, and statistics displays.
  - Cached AI audio requests route through /api/skill-world/audio and browser speech fallback works when cache or network audio is unavailable.

### G6M-INF-004 — Implement Grade 6 acceptable-answer validation
- **Priority:** P0
- **Type:** ANSWER_VALIDATION
- **Owner:** content/assessment
- **Depends on:** G6M-INF-001
- **Acceptance criteria:**
  - Acceptable-answer validators cover all Grade 6 structured responses, units, equivalent forms, tolerances, and deterministic feedback branches.
  - Validators map common wrong answers to the misconception tags listed for every skill.
  - Short-response rubrics include accepted aliases and reject mathematically different forms that only look similar as strings.

### G6M-PKG-001 — Author first Grade 6 Math production packages
- **Priority:** P1
- **Type:** CONTENT_PACKAGE
- **Owner:** curriculum/content
- **Depends on:** G6M-INF-001, G6M-INF-002, G6M-INF-003, G6M-INF-004
- **Acceptance criteria:**
  - Author and validate G6M_RP_001 and G6M_NS_001 as production SkillPackage JSON with full Guided Mission, Practice Center, voice, answers, and manifest metadata.
  - No hardcoded hub cards, no placeholders, and no one-off games are introduced.

### G6M-PKG-002 — Author number-system and expressions/equations packages
- **Priority:** P1
- **Type:** CONTENT_PACKAGE
- **Owner:** curriculum/content
- **Depends on:** G6M-PKG-001
- **Acceptance criteria:**
  - Author and validate G6M_NS_002, G6M_NS_003, G6M_EE_001, G6M_EE_002, and G6M_EE_003 with all required production fields and renderer fixtures.
  - Run package validation, Practice Center bank counts, voice coverage checks, and manifest exposure checks for each package before hub release.

### G6M-PKG-003 — Author geometry and statistics packages after visual risk mitigation
- **Priority:** P1
- **Type:** CONTENT_PACKAGE
- **Owner:** curriculum/content
- **Depends on:** G6M-INF-002, G6M-INF-004
- **Acceptance criteria:**
  - Author and validate G6M_GM_001, G6M_SP_001, and G6M_SP_002 after geometry/statistics visual risk fixtures pass.
  - Graph/statistics packages must pass mobile visual audit, accessible summaries, and answer validation for all data displays before exposure.

### G6M-QA-001 — Run Grade 6 Math production readiness audit
- **Priority:** P0
- **Type:** PRODUCTION_QA
- **Owner:** qa/release
- **Depends on:** G6M-PKG-001, G6M-PKG-002, G6M-PKG-003
- **Acceptance criteria:**
  - Run end-to-end Skill World generation for all Grade 6 Math packages from manifest discovery only.
  - Verify each package produces Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, Profile, four focused Practice Center levels, Mixed, 10-12 questions per level, cached audio compatibility, and browser speech fallback.
  - Perform Grade 6 graph/statistics visual audit on desktop and mobile and block release on fallback placeholders or unreadable visuals.

## Release Gate
- Do not expose any Grade 6 Math package until package validation, renderer fixture validation, voice coverage validation, acceptable-answer validation, and manifest-driven discovery checks pass.
- Do not ship any hardcoded Grade 6 hub cards, placeholder cards, one-off games, or renderer fallback placeholders.
- Do not mark Grade 6 Math production-ready until the graph/statistics visual audit passes for coordinate planes, inequality number lines, dot plots, histograms, box plots, statistics summaries, and data comparison panels.
