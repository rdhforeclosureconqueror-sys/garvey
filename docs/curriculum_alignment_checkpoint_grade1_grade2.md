# Curriculum Alignment Checkpoint: Grade 1–2

_Date: 2026-05-30_

## Executive Summary

| Area | Status | Alignment finding | Biggest risk or gap |
| --- | --- | --- | --- |
| Grade 1 Math | **Production-aligned with targeted extensions** | The current 11-package set covers the core Common Core Grade 1 Math domains: Operations and Algebraic Thinking, Number and Operations in Base Ten, Measurement and Data, and Geometry. | Word-problem/unknown-position practice and equal-sign/true-false equation reasoning appear inside operations packages, but are not yet visible as a dedicated package or standards-facing strand. Data representation is partially covered through sorting/patterning rather than a full measurement-data graphing package. |
| Grade 1 English | **Foundationally production-aligned; broader ELA is partial** | The current 10-package set strongly covers Grade 1 Reading Foundational Skills, early fluency, basic comprehension, and sentence-level writing. | Print concepts, informational text, opinion/informative/narrative writing categories, Speaking and Listening, and Language conventions are mostly implicit or partial. These can often be extended within existing packages rather than created as many new packages. |
| Grade 2 Math | **Production-aligned** | The current 11-package set matches the Common Core Grade 2 focus areas: base-ten to 1,000, fluency within 20, add/subtract within 100, word problems, measurement, time/money, data/line plots, and geometry/arrays/partitioning. | The main QA risk is not package coverage but content depth: ensure enough one-step/two-step word problems with unknowns in all positions and enough conceptual place-value strategy examples for adding/subtracting. |
| Grade 2 English | **Ready to continue implementation after renderer/schema backlog is tracked** | The plan covers Grade 2 Reading Foundational Skills, fluency, comprehension, vocabulary/language, and writing. `G2E_RF_001` is built as a successful proof package for advanced phonics and word analysis. | Full Grade 2 English requires additional visual models, question types, evidence/passage metadata, and rubric-style writing validation before writing and higher-comprehension packages are production-complete. |
| Overall readiness rating | **Green for Grade 2 English continuation; Yellow for full K–2 standards completeness** | The curriculum is aligned well enough to continue Grade 2 English implementation. The engine/package pattern is validated for Grade 1–2 Math and early English. | Do not expand to many new packages until existing package-level coverage is intentionally extended for standards that are currently implicit. Schema/renderers should be advanced alongside Grade 2 English, especially for evidence, morphology, vocabulary, and writing. |

**Formal checkpoint decision:** continue Grade 2 English implementation. No blocking schema issue requires changing existing content before the next package, but the Grade 2 English renderer/schema backlog should be addressed before building comprehension, vocabulary, and writing packages that depend on it.

## Baseline Standards Used

The repo does not define a proprietary standards framework that supersedes external grade-level standards, so this checkpoint uses the **Common Core State Standards (CCSS)** as the baseline.

### Math baseline

- Common Core Grade 1 Math introduction and grade-level domains: https://www.thecorestandards.org/Math/Content/1/introduction/
- Common Core Grade 1 Operations and Algebraic Thinking: https://www.thecorestandards.org/Math/Content/1/OA/
- Common Core Grade 1 Number and Operations in Base Ten: https://www.thecorestandards.org/Math/Content/1/NBT/
- Common Core Grade 1 Measurement and Data: https://www.thecorestandards.org/Math/Content/1/MD/
- Common Core Grade 1 Geometry: https://www.thecorestandards.org/Math/Content/1/G/
- Common Core Grade 2 Math introduction and grade-level domains: https://www.thecorestandards.org/Math/Content/2/introduction/
- Common Core Grade 2 Operations and Algebraic Thinking: https://www.thecorestandards.org/Math/Content/2/OA/
- Common Core Grade 2 Number and Operations in Base Ten: https://www.thecorestandards.org/Math/Content/2/NBT/
- Common Core Grade 2 Measurement and Data: https://www.thecorestandards.org/Math/Content/2/MD/
- Common Core Grade 2 Geometry: https://www.thecorestandards.org/Math/Content/2/G/

Mapped domains:

- Operations and Algebraic Thinking
- Number and Operations in Base Ten
- Measurement and Data
- Geometry

### ELA baseline

- Common Core Grade 1 Reading Literature: https://www.thecorestandards.org/ELA-Literacy/RL/1/
- Common Core Grade 1 Reading Informational Text: https://www.thecorestandards.org/ELA-Literacy/RI/1/
- Common Core Grade 1 Reading Foundational Skills: https://www.thecorestandards.org/ELA-Literacy/RF/1/
- Common Core Grade 1 Writing: https://www.thecorestandards.org/ELA-Literacy/W/1/
- Common Core Grade 1 Speaking and Listening: https://www.thecorestandards.org/ELA-Literacy/SL/1/
- Common Core Grade 1 Language: https://www.thecorestandards.org/ELA-Literacy/L/1/
- Common Core Grade 2 Reading Literature: https://www.thecorestandards.org/ELA-Literacy/RL/2/
- Common Core Grade 2 Reading Informational Text: https://www.thecorestandards.org/ELA-Literacy/RI/2/
- Common Core Grade 2 Reading Foundational Skills: https://www.thecorestandards.org/ELA-Literacy/RF/2/
- Common Core Grade 2 Writing: https://www.thecorestandards.org/ELA-Literacy/W/2/
- Common Core Grade 2 Speaking and Listening: https://www.thecorestandards.org/ELA-Literacy/SL/2/
- Common Core Grade 2 Language: https://www.thecorestandards.org/ELA-Literacy/L/2/

Mapped strands:

- Reading Literature
- Reading Informational Text
- Reading Foundational Skills
- Writing
- Speaking and Listening
- Language

### Repo artifacts audited

- `docs/grade1_production_readiness_report.md`
- `docs/grade2_math_production_readiness_report.md`
- `docs/grade1_english_completion_plan.md`
- `docs/grade2_math_completion_plan.md`
- `docs/grade2_english_completion_plan.md`
- `curriculum-framework/plans/grade1-english-completion-plan.v1.json`
- `curriculum-framework/plans/grade2-math-completion-plan.v1.json`
- `curriculum-framework/plans/grade2-english-completion-plan.v1.json`
- `curriculum-framework/schemas/skill-package.schema.json`
- `docs/skill-world-generator.md`
- `public/gamehub/skill-world/content/manifest.json`
- `public/gamehub/skill-world/content/*.skill-package.v1.json`
- `public/gamehub/skill-world/renderers/visual-model-registry.js`
- `tests/gamehub/skill-world/skill-world-generator.test.js`
- `tests/gamehub/grade1-skill-world-manifest-hub.test.js`

## Grade 1 Math Alignment

| Major Grade 1 expectation | Covered by SkillPackage IDs | Status | Evidence from package names/content | Recommendation |
| --- | --- | --- | --- | --- |
| Count, read, represent, and sequence numbers through 120 | `G1M_NS_001`, `G1M_NS_002` | **Covered** | `G1M_NS_001` covers count/represent to 20. `G1M_NS_002` includes forward/backward counting within 120, decade transitions, missing numbers, `number_line_0_120`, and sequence work. | Keep as-is. Add more skip-count/count-on contexts later only if Grade 1 fluency diagnostics show a need. |
| Compare numbers, including two-digit comparisons | `G1M_NS_003`, `G1M_PV_001` | **Covered** | `G1M_NS_003` includes more/less, compare within 20, equal groups, and compare two-digit numbers using tens and ones. `G1M_PV_001` supports tens/ones models. | Keep as-is. In future QA, verify learners see symbols and language (`>`, `<`, `=`) if product wants explicit notation practice. |
| Understand tens and ones as base-ten units | `G1M_PV_001` | **Covered** | `G1M_PV_001` has levels for counting tens/ones, matching blocks to numerals, building with tens/ones, and exchanging 10 ones for 1 ten. | Keep as-is. This is a strong prerequisite for Grade 2 hundreds place value. |
| Add and subtract within 20 using models/strategies | `G1M_OP_001`, `G1M_OP_002`, `G1M_OP_003` | **Covered** | Addition/subtraction packages include within-20 levels, number lines, number bonds, missing addend/part, and fact fluency within 10. | Keep as-is. During content polish, ensure strategies include count-on, make-ten, decompose, and relationship of addition/subtraction. |
| Represent and solve addition/subtraction word problems with unknowns | `G1M_OP_001`, `G1M_OP_002`, `G1M_OP_003` | **Partially Covered** | Missing addend and unknown-part levels exist, but the package set does not expose a dedicated Grade 1 word-problem package. | Extend existing operations packages first with more story problem prompts and unknowns in all positions. Create a new `G1M_WP_001` only if reporting/standards traceability requires a separate package. |
| Understand the equal sign and true/false equations | `G1M_OP_001`, `G1M_OP_002`, `G1M_OP_003` | **Partially Covered** | Equation answering is present through operation prompts, but explicit true/false equation and equal-sign meaning practice is not visible as a named level. | Add a focused level or mixed-bank item family inside `G1M_OP_003` before creating a separate package. |
| Add/subtract tens or within 100 where Grade 1 expects place-value strategies | `G1M_PV_001`, `G1M_NS_003`, `G1M_OP_001`, `G1M_OP_002` | **Partially Covered / late Grade 1 bridge** | Base-ten and two-digit comparison content exists. Operations packages focus on within 20; Grade 2 packages take over within-100 add/subtract. | Keep Grade 1 centered on within 20. Add optional enrichment/bridge questions in `G1M_PV_001` only if desired. Avoid pulling Grade 2 algorithms too early. |
| Tell and write time to the hour and half-hour | `G1M_MD_TIME_001` | **Covered plus enrichment** | Levels include o’clock, half past, quarter-hour enrichment, five-minute enrichment, and analog clock visuals. | Keep as-is. Mark quarter/five-minute levels as enrichment in product copy if not already visible to avoid overclaiming Grade 1 requirements. |
| Measure lengths and compare object lengths | `G1M_GM_002` | **Covered** | `G1M_GM_002` includes longer/shorter, taller/shorter, heavier/lighter, and repeated-unit measurement. | Keep as-is. Add explicit “order three objects by length” items if not enough are present after human QA. |
| Represent and interpret data | `G1M_DP_001` | **Partially Covered** | Sorting categories and pattern recognition are present. Common Core Grade 1 data also emphasizes organizing/interpreting categorical data and answering comparison questions. | Extend `G1M_DP_001` with picture-graph/tally/table questions before creating a new package. Pattern recognition is useful enrichment but should not be the only evidence for data standards. |
| Reason about shapes; compose/decompose and partition shapes | `G1M_GM_001` | **Covered** | `G1M_GM_001` includes naming 2D shapes, sides/corners, defining attributes, and composing/partitioning shapes. | Keep as-is. Ensure partition vocabulary emphasizes halves/fourths/quarters as Grade 1 language. |
| Patterns as algebraic enrichment | `G1M_DP_001` | **Enrichment** | Pattern levels include AB, AAB/ABB, and find-the-rule practice. | Retain as enrichment. Do not count patterns as a replacement for the Measurement and Data standard. |

## Grade 1 English Alignment

| Major Grade 1 ELA expectation | Covered by SkillPackage IDs | Status | Evidence from package names/content | Recommendation |
| --- | --- | --- | --- | --- |
| Print concepts | `G1E_RF_001`, `G1E_FL_001`, `G1E_WR_001` | **Partially Covered** | Letter recognition, sentence reading, capitalization, spacing, and punctuation support print awareness, but concepts such as book handling, spoken/written word boundaries, and print directionality are not explicit package targets. | Add print-concept items to `G1E_RF_001` or `G1E_FL_001` only if Skill World is expected to assess this strand directly. |
| Phonological awareness | `G1E_RF_002` | **Covered** | `G1E_RF_002` includes beginning, middle vowel, ending sounds, and same/different sounds. | Keep as-is. Consider adding segmentation/blending oral-sound variants if audio support is later added. |
| Phonics and word recognition | `G1E_RF_001`, `G1E_PH_001`, `G1E_PH_002`, `G1E_SW_001` | **Covered** | Letter/sound recognition, CVC blending, short vowel families, and high-frequency words are all represented. | Keep as-is for production. Add consonant digraphs as a Grade 1 extension only if the package content already includes sufficient short-vowel mastery. |
| Fluency | `G1E_SW_001`, `G1E_FL_001` | **Covered** | Sight-word, phrase, sentence, punctuation, and sentence-to-picture levels support early fluency. | Keep as-is. True oral reading rate/prosody would require audio or teacher observation and should not be overclaimed by the current renderer. |
| Reading Literature comprehension | `G1E_RC_001`, `G1E_RC_002` | **Partially Covered** | Who/what/where details and beginning-middle-end story sequence are present. Character, setting, central message, and compare/contrast are not fully visible as separate targets. | Extend `G1E_RC_002` with character/setting/problem-solution and central-message item families before adding new packages. |
| Reading Informational Text comprehension | `G1E_RC_001` | **Partially Covered / mostly missing as explicit strand** | Detail-question work can apply to informational text, but no package clearly targets main topic, key details, text features, or fact-based informational passages. | Add informational passages and main-topic/details into `G1E_RC_001`, or create a small informational comprehension package only if reporting needs clear RI traceability. |
| Writing opinion, informative, and narrative basics | `G1E_WR_001`, `G1E_WR_002` | **Partially Covered** | Sentence writing and picture description are covered. The CCSS writing modes are not directly surfaced. | Extend `G1E_WR_002` with opinion sentence, informative/detail sentence, and narrative event sentence prompts. Avoid creating three separate Grade 1 writing packages unless product scope expands. |
| Language conventions | `G1E_WR_001`, `G1E_WR_002`, `G1E_FL_001` | **Partially Covered** | Capital letters, spacing, end punctuation, sentence completion, and punctuation reading are present. Broader grammar/usage/vocabulary categories are not yet explicit. | Extend writing/fluency banks with nouns/verbs, adjectives, sentence types, commas in dates/lists where appropriate, and basic vocabulary relationships. |
| Speaking and Listening | None dedicated; implicit in prompts | **Missing from Skill World direct assessment** | Current packages are text/choice/short-response oriented and do not assess collaborative conversation, asking/answering orally, or presentation. | Treat as out-of-scope for current Skill World unless audio/teacher-mediated features are added. Document that Speaking and Listening is not directly assessed by this engine. |
| Vocabulary acquisition and use | `G1E_SW_001`, `G1E_RC_001`, `G1E_WR_002` | **Partially Covered** | Word recognition and context comprehension exist, but categories, shades of meaning, affixes, and context-clue vocabulary are not explicit Grade 1 targets. | Add small vocabulary item families inside sight-word/comprehension packages instead of a new package. |

## Grade 2 Math Alignment

| Major Grade 2 expectation | Covered by SkillPackage IDs | Status | Evidence from package names/content | Recommendation |
| --- | --- | --- | --- | --- |
| Add/subtract within 100 using strategies | `G2M_OP_001`, `G2M_OP_002` | **Covered** | Addition/subtraction packages include adding/subtracting tens and ones, two-digit operations without and with regrouping, base-ten blocks, number lines, and place-value charts. | Keep as-is. QA for strategy language and regrouping/trade explanations. |
| Fluency with addition/subtraction within 20 | `G2M_OP_003` | **Covered** | Levels include make 10, doubles/near doubles, related facts, missing addend/part, and mixed review. | Keep as-is. This aligns directly with Grade 2 fluency expectations and builds on Grade 1 number bonds. |
| Place value to 1,000 | `G2M_NS_001`, `G2M_PV_001` | **Covered** | `G2M_NS_001` covers count/read/write numbers to 1,000 and skip-counting by 5s/10s/100s. `G2M_PV_001` covers hundreds/tens/ones, expanded form, standard/word/expanded matching, and 100 as ten tens. | Keep as-is. Add more word-form and expanded-form production items only if diagnostics show weak transfer. |
| Compare three-digit numbers | `G2M_NS_002`, `G2M_PV_001` | **Covered** | `G2M_NS_002` includes compare hundreds, tens, ones, and use of `>`, `<`, `=` with place-value visuals. | Keep as-is. |
| Add/subtract with place-value strategies and explain why | `G2M_OP_001`, `G2M_OP_002`, `G2M_PV_001` | **Covered / explanation depth should be monitored** | Current items use base-ten blocks, number lines, and place-value charts; short responses are supported. | Keep packages. During polish, ensure explanation prompts ask learners to reason about hundreds/tens/ones rather than only compute. |
| One- and two-step word problems within 100 with unknowns | `G2M_WP_001`, `G2M_OP_001`, `G2M_OP_002` | **Covered** | `G2M_WP_001` includes add-to/put-together, take-from/take-apart, compare problems, two-step problems, bar models, equation builders, and word-problem models. | Keep as-is. Add unknown-position coverage audit in QA to confirm all Common Core problem subtypes appear. |
| Measurement and estimation using standard units | `G2M_MD_001` | **Covered** | Levels include inches, centimeters, estimate length, compare lengths, rulers, and measurement comparisons. | Keep as-is. Add number-line length-difference problems if not enough are already present. |
| Line plots | `G2M_MD_003` | **Covered** | Level 4 explicitly covers line plots; visual models include `line_plot`. | Keep as-is. |
| Time to five minutes and A.M./P.M. contexts | `G2M_MD_002` | **Covered** | Levels include time to five minutes and A.M./P.M./time context with analog and digital time models. | Keep as-is. |
| Money: coin values and counting coin combinations | `G2M_MD_002` | **Covered** | Levels include coin values and count coins, with `coin_model` and `money_counting`. | Keep as-is. Consider dollar bills as later extension if product scope requires. |
| Data graphs and interpreting data | `G2M_MD_003` | **Covered** | Picture graphs, bar graphs, ask/answer data questions, and line plots are present. | Keep as-is. |
| Geometry: shapes, attributes, partitioning, arrays | `G2M_GM_001` | **Covered** | Levels include 2D/3D shapes, attributes, equal shares, arrays, rows/columns, `partition_shapes`, and `array_model`. | Keep as-is. Arrays are an appropriate bridge to Grade 3 multiplication. |

## Grade 2 English Plan Alignment

| Major Grade 2 ELA area | Planned package coverage | Built package coverage | Status | Renderer/schema readiness | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Advanced phonics / word analysis | `G2E_RF_001` | `G2E_RF_001` built | **Built** | Ready for current proof package: `phonics_tiles`, `sound_boxes`, `word_builder`, and `syllable_break` render; `multiple_choice`, `short_response`, `sound_match`, and `word_building` are used successfully. | Continue using `G2E_RF_001` as the reference package pattern. |
| Prefixes, suffixes, base words, morphology | `G2E_RF_002` | Not built | **Planned / Needs Expansion** | Plan calls for `word_parts`, `morpheme_tiles`, `prefix_meaning`, `suffix_meaning`, `morpheme_builder`, and metadata for word parts/morphemes. Schema currently includes some broad question types but not all planned morphology-specific types. | Implement renderer/schema support with `G2E_RF_002` or immediately before it. |
| Fluency | `G2E_FL_001` | Not built | **Planned** | Existing Grade 1 fluency renderers cover word/phrase/sentence cards and punctuation; Grade 2 plan adds longer sentence/phrase reading and likely remains renderer-feasible. | Build after morphology or in parallel if using existing renderers. Do not claim oral fluency/prosody unless audio/teacher validation is added. |
| Comprehension: who/what/where/when/why/how | `G2E_RC_001` | Not built | **Planned** | Existing `short_passage` and `question_card` renderers are enough for basic WH comprehension; planned `wh_question` type is included in schema. | Good next low-risk comprehension package. |
| Story structure | `G2E_RC_002` | Not built | **Planned / Needs renderer expansion** | Existing sequence/picture-order support helps. Plan adds `story_map`, `event_cards`, `retell_response`, story elements, and retelling. | Add story-map renderer and retell validation before full production. |
| Main idea and details | `G2E_RC_003` | Not built | **Planned / Needs renderer expansion** | Plan requires `main_idea_web`, `detail_cards`, `evidence_highlight`, and main-idea/detail question types not fully represented in current schema. | Implement evidence/detail renderers and schema entries before this package. |
| Vocabulary/context clues | `G2E_VOC_001` | Not built | **Planned / Needs renderer expansion** | Plan requires `context_sentence`, `vocabulary_match`, `category_sort`, and question types such as synonym/antonym, context clues, multiple meaning, and category sort. | Add vocabulary renderers and validation modes before package build. |
| Opinion writing | `G2E_WR_001` | `G2E_WR_001` built | **Built** | Uses `writing_checklist`, `sentence_builder`, `opinion_reason_chart`, and `paragraph_builder` with child-friendly validation for opinion, reason, closing, and sentence conventions. | Continue to avoid exact-answer-only scoring for open-ended writing. |
| Informative writing | `G2E_WR_002` | `G2E_WR_002` built | **Built** | Uses `writing_checklist`, `fact_cards`, `paragraph_builder`, and `topic_detail_chart` with validation for topic, fact, linking word, closure, and conventions. | Fact-bank metadata is available in package questions for rule-based support. |
| Narrative writing | `G2E_WR_003` | `G2E_WR_003` built | **Built** | Uses `story_sequence`, `event_cards`, `paragraph_builder`, and `writing_checklist` with validation for sequence words, details, closure, and conventions. | Narrative validation now follows the opinion/informative writing pattern. |
| Conventions/language | `G2E_RF_002`, `G2E_VOC_001`, `G2E_WR_*` | `G2E_RF_001` partially supports decoding language | **Planned / Partial** | Schema can store prompts, choices, acceptable answers, and misconception tags. More explicit language-convention question types may be needed. | Fold conventions into writing/vocabulary packages before creating a dedicated language package. |
| Speaking/listening | Not clearly planned as a standalone Skill World package | None | **Missing / likely out-of-scope** | Current engine is not audio/collaboration centered. | Document as not directly assessed unless future audio, presentation, or teacher-mediated workflows are added. |

## Schema and Engine Alignment

| Capability | Current readiness | Evidence / finding | Recommendation |
| --- | --- | --- | --- |
| `level_banks` requirement | **Ready for production packages** | Schema accepts packages with `level_banks` and requires at least 5 banks when present. Current Grade 1, Grade 2 Math, and `G2E_RF_001` packages all include four focused banks plus Mixed with 10–12 questions per bank. | Keep requirement for production Skill World packages. Use `level_banks_status: planned` only for planning artifacts, not shipped production packages. |
| Visual model coverage for Grade 1–2 Math | **Ready** | Current renderer registry supports counting, number lines, base-ten/place value, operations, measurement, clocks, money, graphs, line plots, shape, partition, and array visual models used by current Math packages. | Continue using existing renderers for Grade 3 Math with additions for fractions, multiplication/division models, area, perimeter, and multi-step data displays. |
| Visual model coverage for Grade 1 English | **Ready for current scope** | Existing renderers cover letter/sound, phonics tiles, sound boxes, word cards, sentence cards, short passages, question cards, sequence, picture prompts, writing checklists, and detail picking. | Keep as-is. |
| Visual model coverage for planned Grade 2 English | **Partial** | `G2E_RF_001` renderers are ready, including `syllable_break`. Planned packages still require `word_parts`, `morpheme_tiles`, `evidence_highlight`, `story_map`, `main_idea_web`, `detail_cards`, `context_sentence`, `vocabulary_match`, `category_sort`, `opinion_reason_chart`, `paragraph_builder`, `fact_cards`, and `topic_detail_chart`. | Treat renderer implementation as a P0/P1 dependency for the relevant Grade 2 English package clusters. |
| `question_type` coverage | **Partial for future English** | Current schema includes core choices, short response, word building, syllable break, many Grade 1 English types, and `rubric_scored_writing`, but the Grade 2 English plan lists additional morphology, evidence, vocabulary, and paragraph-builder types that are not all enumerated. | Expand schema question-type enum before adding packages that use new types. |
| `acceptable_answers` | **Ready for exact/short-response validation** | Generator documentation and packages support `acceptable_answers`; `G2E_RF_001` uses them for short-response spellings and syllable breaks. | Keep. Add normalized comparison helpers for punctuation/capitalization and writing modes. |
| Writing validation | **Partial / needs expansion** | Exact answer and short response are usable for sentence-level writing, but opinion/informative/narrative paragraphs require rubric checks, topic alignment, reason/fact detection, closure, and sequence words. | Implement deterministic writing validators before `G2E_WR_001`–`G2E_WR_003`. |
| Growth data | **Ready for current scope** | Generator docs state completion payloads include learner identity, attempts/correct, accuracy, stars, mastery status, recommendation, misconception watchlist, and timestamp. | Keep. For future grades, consider standards tags and prerequisite mastery IDs in growth payloads. |
| Misconception tags | **Ready** | Schema requires `misconception_tag` on questions and packages include misconception banks. | Keep. Add controlled vocabularies by domain to reduce drift across future grades. |
| Manifest/hub filtering | **Ready** | Manifest includes Grade 1, Grade 2 Math, and `G2E_RF_001`; tests verify Grade 1/2 package exposure is manifest-driven and grade-filtered. | Keep. Add subject/grade summary counts in future validation for easier release gates. |
| Skill Practice Center | **Ready** | Tests verify practice/drill routes are available when `level_banks` exist. Current production packages include level banks. | Keep as production gate. |
| Renderer fallback behavior | **Safe but should not be relied on for production** | Generator docs note fallback for unexpected visual keys; readiness reports state active Grade 1 and Grade 2 Math do not require fallback. | Keep fallback for resilience, but require tests for every new production visual model. |
| Future Grade 3+ needs | **Foundation ready; expansion required** | The schema can carry flexible question data, but explicit renderers/question types will be needed for multiplication/division, fractions, area/perimeter, multi-paragraph reading, grammar, and writing. | Add new renderer/schema capabilities incrementally with each grade cluster, not as speculative bulk work. |

## Cross-Grade Progression Check

| Progression | Alignment | Finding | Recommendation |
| --- | --- | --- | --- |
| Grade 1 place value → Grade 2 hundreds place value | **Strong** | `G1M_PV_001` establishes tens/ones and exchanging 10 ones for 1 ten; `G2M_PV_001` extends to hundreds, expanded form, and 100 as ten tens. | Keep sequence. Add prerequisite metadata later if the runtime begins recommending across grades. |
| Grade 1 counting to 120 → Grade 2 numbers to 1,000 | **Strong** | `G1M_NS_002` covers count forward/backward within 120; `G2M_NS_001` extends read/write/count to 1,000 and skip-counts by 5s, 10s, and 100s. | Keep. |
| Grade 1 compare two-digit → Grade 2 compare three-digit | **Strong** | `G1M_NS_003` introduces two-digit comparisons using tens/ones; `G2M_NS_002` adds hundreds/tens/ones comparisons and symbols. | Keep. |
| Grade 1 number bonds/facts → Grade 2 fluency within 20 | **Strong** | `G1M_OP_003` covers number bonds/facts within 10; `G2M_OP_003` expands to make-ten, doubles, related facts, and missing addends within 20. | Keep. |
| Grade 1 add/subtract within 20 → Grade 2 add/subtract within 100 | **Appropriate** | Grade 1 operation packages focus on within 20; Grade 2 packages introduce two-digit add/subtract and regrouping. | Keep. Do not over-accelerate Grade 1 into Grade 2 algorithms. |
| Grade 1 time hour/half-hour → Grade 2 time to 5 minutes | **Strong** | `G1M_MD_TIME_001` covers hour/half-hour with enrichment; `G2M_MD_002` covers five-minute time and A.M./P.M. contexts. | Keep. |
| Grade 1 measurement foundations → Grade 2 standard units | **Strong** | `G1M_GM_002` uses repeated units and comparisons; `G2M_MD_001` adds inches, centimeters, estimation, and comparisons. | Keep. |
| Grade 1 sorting/patterning → Grade 2 graphs/line plots | **Partial** | Grade 2 data is strong; Grade 1 data is tilted toward sorting/patterning rather than categorical data displays. | Extend `G1M_DP_001` with picture graph/tally/table interpretation to tighten continuity. |
| Grade 1 shapes/partitioning → Grade 2 shapes/partitioning/arrays | **Strong** | `G1M_GM_001` handles 2D shapes and partitioning; `G2M_GM_001` adds 2D/3D, equal shares, and arrays. | Keep. |
| Grade 1 sentence writing → Grade 2 paragraphs/opinion/informative/narrative writing | **Needs planned expansion** | `G1E_WR_001` and `G1E_WR_002` are sentence-level; Grade 2 plan appropriately adds writing modes and paragraph scaffolds. | Continue Grade 2 writing plan after rubric validation is available. |
| Grade 1 phonics/CVC → Grade 2 advanced phonics/multisyllable | **Strong** | `G1E_PH_*` covers CVC and short vowels; `G2E_RF_001` adds blends/digraphs, long vowels/silent e, vowel teams, and multisyllable words. | Keep. |
| Grade 1 basic comprehension → Grade 2 WH/story/main idea | **Appropriate but incomplete until built** | Grade 1 has detail questions and B/M/E sequence; Grade 2 plan expands to WH, story elements, and main idea/details. | Build `G2E_RC_001`–`G2E_RC_003` in sequence with needed renderers. |

## Gaps and Recommended Actions

| Priority | Grade | Subject | Gap | Current Status | Recommended Action | Extend Existing Package or Create New Package | Package ID affected | Acceptance Criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | 2 | English | Renderer/schema backlog for planned morphology, evidence, vocabulary, and writing packages | Plan identifies needed visual models, question types, metadata, and writing validation; only `G2E_RF_001` is built | Implement only the renderer/schema pieces needed by the next package cluster before creating packages that depend on them | Extend schema/renderers | `G2E_RF_002`, `G2E_RC_002`, `G2E_RC_003`, `G2E_VOC_001`, `G2E_WR_*` | New question types validate; each new visual model has renderer tests; package renders without fallback placeholders; level banks pass 4+Mixed/10–12 gate |
| P0 | 2 | English | Only one Grade 2 English package is built | `G2E_RF_001` exists; rest are planned | Continue implementation with `G2E_RF_002`, `G2E_FL_001`, and `G2E_RC_001` before heavier writing packages | Create planned packages | `G2E_RF_002`, `G2E_FL_001`, `G2E_RC_001` | Each package has Guided Mission arrays, four focused level banks plus Mixed, misconception bank, manifest entry, and generator/hub test coverage |
| P1 | 1 | Math | Word problems and unknowns are not standards-visible enough | Missing addend/part exists inside operations packages | Add explicit story-problem item families and unknown-position coverage to existing operation packages | Extend existing package | `G1M_OP_001`, `G1M_OP_002`, `G1M_OP_003` | At least one level or mixed-bank family includes add-to, take-from, put-together/take-apart, compare, and unknowns in varied positions |
| P1 | 1 | Math | Equal-sign/true-false equation reasoning is implicit | Operation answer prompts exist; equal-sign meaning not visibly targeted | Add true/false equation and balance/equal-sign meaning items to operations fluency | Extend existing package | `G1M_OP_003` | Learners answer true/false equations and missing-number equations; misconception tags distinguish operation-answer vs equality misunderstanding |
| P1 | 1 | Math | Data representation is partial | Sorting/patterning package exists, but picture graphs/tally/table interpretation are not prominent | Extend data package with categorical data display items | Extend existing package | `G1M_DP_001` | Include picture graph/tally/table or equivalent categorical data visuals and questions asking how many, how many more/less, and total |
| P1 | 1 | English | Informational text is not explicit | Detail questions may apply, but package titles/content emphasize generic comprehension | Add short informational passages with main topic/key detail prompts | Extend existing package first | `G1E_RC_001` | Level or mixed-bank items include informational passages, main topic, key details, and basic text feature/illustration connections |
| P1 | 1 | English | Writing modes are underrepresented | Sentence and picture-description writing exist | Add opinion sentence, informative/detail sentence, and narrative event sentence prompts | Extend existing package | `G1E_WR_002` | At least one item family for opinion + reason, informative fact/detail, and narrative sequence sentence; validation remains age-appropriate |
| P1 | 2 | Math | Unknown-position word-problem subtype completeness needs QA | `G2M_WP_001` package is present and broad | Run item-level audit for one-step/two-step and unknown positions | Extend existing package only if audit finds holes | `G2M_WP_001` | Coverage matrix confirms add-to, take-from, put-together/take-apart, compare, one-step, two-step, and unknown-position variants |
| P1 | 2 | English | Writing validation for paragraphs is not production-proven | Plan identifies deterministic rubric needs | Build and test rubric helpers before writing packages | Extend schema/runtime, then create packages | `G2E_WR_001`, `G2E_WR_002`, `G2E_WR_003` | Rubric identifies claim/topic/event structure, reason/facts/details, closing, topic alignment, and safe feedback; no exact-string paragraph grading |
| P2 | 1 | English | Speaking and Listening is not assessed | Current Skill World engine is not audio/collaboration-based | Document as outside current Skill World scope; revisit with audio/teacher workflows | No package yet | N/A | Product documentation states SL is supported outside Skill World or deferred; no false production-alignment claim |
| P2 | 1–2 | All | Prerequisite links are mostly implied by `next_skill_id`/`remediation_skill_id`, not standards graph metadata | Runtime can recommend next/remediation but no robust standards/prereq graph | Add optional `standards`, `prerequisite_skill_ids`, and `successor_skill_ids` metadata when schema evolves | Extend schema later | All packages | Future package manifests can drive cross-grade recommendations and standards reports without hardcoding |
| P2 | 3+ | All | Future grades will need new representations | Current engine supports current Grade 1–2 packages; Grade 3+ will need fractions, multiplication/division, multi-paragraph reading, grammar, and longer writing | Add renderers/question types incrementally by package cluster | Extend schema/renderers | Future packages | New grade cluster has renderer tests, schema validation, manifest inclusion, and Practice Center banks before production claim |

## Final Recommendation

- **Grade 1 Math is production-aligned** for the current Skill World MVP, with P1 recommendations to make word problems, equality reasoning, and data representation more standards-visible.
- **Grade 1 English is production-aligned for foundational literacy**, but only partially aligned to the full Common Core ELA breadth because informational text, explicit writing modes, Language, and Speaking/Listening are not fully represented. This is acceptable if Skill World is scoped as foundational literacy practice rather than a complete ELA curriculum.
- **Grade 2 Math is production-aligned** and ready to remain in production with ordinary human QA/polish.
- **Grade 2 English is ready to continue implementation.** `G2E_RF_001` proves the package pattern. The next safest sequence is:
  1. Build/complete renderer and schema support needed for `G2E_RF_002`.
  2. Continue with `G2E_FL_001` and `G2E_RC_001`, which can reuse many existing Grade 1 English patterns.
  3. Add story/main-idea/evidence/vocabulary renderers before `G2E_RC_002`, `G2E_RC_003`, and `G2E_VOC_001`.
  4. Add deterministic writing-rubric validation before `G2E_WR_001`, `G2E_WR_002`, and `G2E_WR_003`.

**Decision:** Continue Grade 2 English implementation. Do not create extra Grade 1 packages yet. Fix schema/renderers only as needed for the next Grade 2 English package cluster, and extend existing Grade 1 packages for P1 standards-visibility gaps before considering new Grade 1 packages.

## Verification Notes

A manifest/package verification pass was useful for this audit. The manifest currently lists the expected Grade 1 Math, Grade 1 English, Grade 2 Math, and built Grade 2 English package IDs. The production packages reviewed use real `level_banks` with the expected four focused levels plus Mixed pattern, and tests cover manifest-driven hub exposure and Skill Practice Center drill routes.
