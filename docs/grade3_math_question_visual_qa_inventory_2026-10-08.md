# Grade 3 Mathematics — Full Question and Visual QA Inventory

Status: **IN PROGRESS — not approved for student release**. This inventory was obtained from the Grade 3 Math packages listed in the live Skill World content manifest. Counts below are occurrences of objects with a `visual_model` field, **not distinct independent questions**. Lesson, worked-example, demo, practice, challenge, checkpoint, and level-bank objects may repeat content.

## Inventory

| Skill package | Visual-bearing objects | Visual models |
|---|---:|---|
| G3M_DIV_001 | 66 | division_model 37; fact_family_model 13; equal_groups 14; array_model 2 |
| G3M_FACT_001 | 66 | multiplication_chart 14; skip_counting 18; array_model 19; fact_family_model 15 |
| G3M_FR_001 | 66 | fraction_bar 23; partition_shapes 9; number_line 16; fraction_circle 18 |
| G3M_FR_002 | 66 | fraction_bar 28; comparison 17; fraction_circle 7; number_line 14 |
| G3M_GM_001 | 66 | area_model 15; grid_model 25; perimeter_path 12; rectangle_model 14 |
| G3M_GM_002 | 66 | shape_identification 26; attribute_sort 14; partition_shapes 12; fraction_circle 14 |
| G3M_MD_001 | 66 | elapsed_time_timeline 23; analog_clock 3; measurement_comparison 14; bar_graph 12; line_plot 14 |
| G3M_MUL_001 | 71 | equal_groups 18; array_model 17; repeated_addition 18; multiplication_model 16; visual_objects 2 |
| G3M_PV_001 | 66 | place_value_chart 18; number_line 15; rounding_model 18; expanded_form 15 |
| G3M_WP_001 | 66 | word_problem_model 14; bar_model 20; equation_builder 19; operation_sort 13 |
| **Total** | **665** | **10 Grade 3 math skill packages** |

## Known defects from user testing

- **Confirmed:** Fact-family checkpoint displayed concatenated equations and exposed the correct division result before submission. Shared renderer repair merged in PR #788; **deployment and cross-mode verification pending**.
- **Confirmed:** Division equal-sharing visuals show empty boxes instead of an instructional distribution of counters. **Not resolved by PR #788**.
- **Confirmed:** Division worked example used the same 12 ÷ 3 problem as independent practice, weakening independent assessment. **Not resolved**.
- **Observed:** Some visual model text/answer combinations may be inconsistent; full bank audit needed before claiming correctness.

## Required QA matrix for EACH distinct question

1. Locate each distinct question by skill ID, zone, level, question ID, and prompt; detect duplicates and repeated worked-example/practice answers.
2. Validate arithmetic and expected response; confirm explanation and hint do not contradict the answer.
3. Render with **question mode** in Practice, Skill Practice/drill, Challenge, Checkpoint, and all level-bank questions. Ensure no correct result is exposed in visual text, alt text, captions, or pre-answer feedback.
4. Render with **solution mode** in worked examples and demos; confirm the diagram actually demonstrates the reasoning.
5. Verify responsive layouts, visual clarity, accessible labels, and audio/read-aloud text.
6. Test after submission: correct/incorrect feedback, retry, hint, stars, progress, and navigation.
7. Mark PASS/FAIL/NOT TESTED per question and per mode; never treat an untested question as PASS.

## Release gates

- All math and answer checks pass; zero pre-submit answer leaks.
- Every visual model verified on desktop and mobile across every zone where used.
- Distinct independent-practice questions do not simply repeat the worked-example answers.
- No Grade 3 package marked complete until question-level evidence and browser QA are recorded.

**Next work:** automate extraction of unique question IDs and zone references, add test fixtures for every visual model, repair division sharing models, and conduct deployed browser testing.
