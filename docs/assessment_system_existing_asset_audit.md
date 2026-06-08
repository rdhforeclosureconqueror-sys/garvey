# Phase Zero Part 1: Existing Assessment-System Asset Audit

_Date: 2026-06-07_

## Scope and non-destructive posture

This audit documents the current repository state for a future Grades 1-6 assessment and mastery system. It intentionally does **not** modify existing SkillPackages, manifests, renderers, routes, schemas, voice systems, progress systems, or tests. The existing SkillPackages remain the canonical instructional curriculum, and current practice questions are treated conservatively as instructional/practice assets unless a later governance workflow promotes individual items.

## Repository sources inspected

- Skill World content: `public/gamehub/skill-world/content/*.skill-package.v1.json`
- Skill World manifest: `public/gamehub/skill-world/content/manifest.json`
- Curriculum source index: `public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json`
- Package schemas/runtime validators: `curriculum-framework/schemas/skill-package.schema.json`, `public/gamehub/skill-world/engine/skill-package-schema.js`
- Skill World routes and renderer: `server/index.js`, `public/gamehub/skill-world/index.html`, `public/gamehub/skill-world/engine/skill-world-renderer.js`, `public/gamehub/skill-world/screens/*`, `public/gamehub/skill-world/renderers/visual-model-registry.js`
- Adaptive/practice routes: `server/adaptiveV2Routes.js`, `public/gamehub/adaptive_learning`, `public/gamehub/adaptive_learning.html`
- Voice/audio routes: `server/assessmentVoiceRoutes.js`, `server/skillWorldAudioRoutes.js`, `docs/skill-world-audio-cache-plan.md`
- Parent/student/progress surfaces: `server/adaptiveV2Routes.js`, `server/gatesRoutes.js`, `dashboardnew/app.js`, `public/gamehub/adaptive_learning.html`
- Preservation tests reviewed: `tests/gamehub/skill-world/skill-world-generator.test.js`, `tests/gamehub/skill-world/skill-world-audio-route.test.js`, `tests/gamehub/grade1-skill-world-manifest-hub.test.js`, `tests/gamehub/grade4-5-math-readiness-visual-audit.test.js`, `tests/gamehub/grade6-math-production-readiness-visual-audit.test.js` if present in downstream branches, `tests/gamehub/grades4-6-english-production-readiness.test.js`, `tests/server-adaptive-v2-routes.test.js`, and related GameHub/adaptive tests.

## Executive findings

1. The repository already contains a broad Grades 1-6 Skill World curriculum: **122 SkillPackages** covering Math and English.
2. Each package has a stable `skill_id`, grade, subject, domain, skill title, lesson content, worked examples, guided practice, checkpoint, adaptive question bank, misconception bank, `level_banks`, and game-theme/voice-adjacent metadata.
3. `public/gamehub/skill-world/content/manifest.json` is a simple production manifest with `schema_version`, `generated_at`, and 122 package file entries.
4. The adaptive-v2 curriculum index is a source-discovery/conversion index, not an assessment blueprint. Entries are marked `indexed_only`/`needs_review` and should be reused as provenance, not as validated assessment definitions.
5. Current answer keys and acceptable answers are present in public SkillPackage JSON and client-rendered practice flows. That is acceptable for current instructional/practice use but is **not suitable for secure operational assessment scoring** without a later server-side scoring-key migration.
6. Existing routing already supports Skill World package entry and drill entry (`/skill-world/:skillId`, `/skill-world/:skillId/drill`), Grade 1 adaptive-v2 progress routes, Grade 1 voice sections, assessment voice, and Skill World audio fallback/provider audio.
7. Existing scoring in Skill World is client-side practice scoring. It uses exact/normalized answer matching, acceptable-answer matching, and rule-based writing checks. It should be reused only as a practice renderer behavior, not as authoritative mastery scoring.
8. Existing `next_skill_id` and `remediation_skill_id` form a partial prerequisite/remediation graph. There is no separate formal prerequisite graph in the SkillPackage schema.
9. Existing dashboards and parent/student relationships are broader product assets. They can display future assessment outputs through adapters, but Phase Zero should not alter them.
10. Current tests are valuable preservation assets and should be expanded in future phases with additive assessment-foundation tests rather than changing production tests.

## SkillPackage inventory summary

| Grade | Math packages | English packages | Total |
|---:|---:|---:|---:|
| 1 | 11 | 10 | 21 |
| 2 | 11 | 10 | 21 |
| 3 | 10 | 10 | 20 |
| 4 | 10 | 10 | 20 |
| 5 | 10 | 10 | 20 |
| 6 | 10 | 10 | 20 |
| **Total** | **62** | **60** | **122** |

## Package/question schema audit

### Package-level fields observed

The content packages consistently use these package-level structures:

- Identity and placement: `skill_id`, `grade`, `subject`, `domain`, `skill`
- Instructional content: `lesson`, `worked_examples`, `guided_practice`, `hint_ladder`, `checkpoint`
- Practice banks: `adaptive_question_bank`, `review_bank`, `level_banks`
- Learner support: `misconception_bank`, `feedback_fields`, `explanation_fields`, `support_type`
- Progression links: `next_skill_id`, `remediation_skill_id`
- Presentation: `game_theme`, `badgeName`, `zone`
- Audio/accessibility metadata: `page_audio`, question-level `audio`, `audio_required`, `audio_url`, `browser_speech_fallback`, `cached_audio_optional`, pronunciation/check metadata in some English packages
- Writing supports: `writing_validation`, `grammar_validation`, question-level `validation_checks`/`writing_checks`

### Schema/runtime validator observations

- `curriculum-framework/schemas/skill-package.schema.json` requires the core package identity fields plus lesson, worked examples, hint ladder, guided practice, checkpoint, adaptive question bank, misconception bank, review bank, and game theme.
- `public/gamehub/skill-world/engine/skill-package-schema.js` contains the runtime SkillPackage validator, the current question-type allowlist, visual-model allowlist, level-bank validation, audio-support validation, and question ID normalization.
- The static schema and runtime validator are not identical. Future assessment validation should be additive and should not attempt to rewrite either schema unless a specific assessment-foundation gap cannot be handled by a sidecar validator.

## Question types observed

Question-type values observed in the current SkillPackage content include:

`algorithm_response`, `area_response`, `array_counting`, `base_ten_blocks`, `category_sort`, `comparison`, `coordinate_response`, `data_interpretation`, `decimal_response`, `detail_match`, `division_equation`, `editing`, `elapsed_time`, `equation_builder`, `equation_response`, `expression_response`, `fraction_response`, `geometry_response`, `graph_reading`, `inequality_response`, `integer_response`, `letter_sound`, `measurement`, `multiple_choice`, `multiplication_equation`, `number_line`, `number_sequence`, `pattern_response`, `perimeter_response`, `question`, `rate_response`, `ratio_response`, `rounding`, `sentence`, `sentence_completion`, `sequencing`, `short_response`, `sorting`, `sound_match`, `statistics_response`, `text_evidence`, `vocabulary_match`, `volume_response`, `word`, `word_building`, `word_problem`, `writing_response`.

Assessment implication: many types can be rendered for practice, but an assessment item index should have its own allowlist, construct metadata, answer-key protection, scoring-rubric requirements, and reviewer status. Unsupported or ambiguous types such as generic `question`, `sentence`, or `word` should not become assessment candidates without metadata normalization.

## Practice-bank audit

### `level_banks`

- All 122 SkillPackages currently include `level_banks`.
- Packages generally use 5 level banks, including focused levels and a mixed level.
- Runtime validation expects at least 4 focused levels plus one Mixed level, 10-12 questions per level, mastery thresholds, level IDs, labels, focus, difficulty, and misconception coverage.
- Classification: **reuse_without_change** for instruction/practice; **reuse_with_adapter** for candidate item discovery; **not_suitable_for_assessment_scoring** as-is because scoring keys are public and questions have not undergone assessment governance.

### `adaptive_question_bank`

- All 122 packages include `adaptive_question_bank`.
- Counts vary by grade/package, from single-item transitional banks in many upper-grade packages to larger banks in Grades 1-2 and selected English packages.
- Classification: **reuse_with_adapter** for finding potential candidate items after metadata and review; **not_suitable_for_assessment_scoring** as-is.

### `review_bank`

- 86 packages have an array `review_bank`; Grade 1 English packages often omit or use non-array review-bank conventions.
- Some packages include zero review items.
- Classification: **reuse_with_adapter** for future retention/cumulative candidate discovery; **not_suitable_for_assessment_scoring** without review and secret scoring.

## Acceptable answer and scoring audit

Current answer-related fields observed include:

- `answer`
- `correct_answer`
- `correct`
- `acceptable_answers`
- `acceptable_sample_answers`
- `sample_answer`
- `corrected_sentence`
- `correct_evidence`
- `answer_claim`
- `candidate_correct`
- writing-specific sample/claim fields

Current Skill World scoring is implemented in the renderer as practice behavior:

- Answers are normalized by trimming, lowercasing, compacting whitespace, and stripping common punctuation.
- The expected list is built from `correct_answer`/`answer` plus `acceptable_answers`.
- Writing responses can pass through rule-based validation checks (`validation_checks`/`writing_checks`) such as capitalization, punctuation, complete sentence, reason, fact, linking word, sequence word, dialogue, agreement, combining, and details.
- Incorrect answers append `misconception_tag` to local renderer state.
- `state.lastResult` can expose the correct answer to the client for instructional feedback.

Assessment implication: this behavior is appropriate for Skill World practice feedback but must not be reused as authoritative operational assessment scoring. Future assessment scoring should be server-side or otherwise protected, use versioned rubrics, and avoid exposing keys in unauthenticated payloads.

## Misconception tags and misconception banks

- The schema requires `misconception_tag` on questions and package-level `misconception_bank`.
- Question-level misconception tags are used by the renderer to track missed-concept signals.
- Some distractor-specific rationales are present in parts of the content, but the current package contract does not require assessment-grade distractor rationales for every option.
- Classification: **reuse_with_adapter**. Misconception tags are valuable for learning-plan signals, but a future assessment item spec must require distractor-by-distractor rationales before using items for mastery decisions.

## Progression, remediation, and prerequisites

### `next_skill_id`

- 62 packages include `next_skill_id`.
- Several links point to planned or review-like IDs that are not current manifest package IDs, for example `G1M_DP_002`, `G1M_OP_004`, `G1M_NS_004`, and `*_REVIEW` IDs.
- Classification: **reuse_with_adapter**. These links can inform recommendation order but should be validated against the manifest or an assessment sidecar before deterministic grade-gated use.

### `remediation_skill_id`

- 82 packages include `remediation_skill_id`.
- Many point to earlier-grade or previous-skill packages and are useful for targeted prerequisite confirmation.
- Some point to review-like IDs rather than manifest SkillPackages.
- Classification: **reuse_with_adapter**.

### Formal prerequisite graph

- No separate formal prerequisite graph field such as `prerequisite_skill_ids` was found in the current SkillPackage content.
- There are source skill graphs under `public/gamehub/content/curriculum-source/phase-1b/` and `curriculum-framework/schemas/skill-graph.schema.json`, but these are not currently the operational Skill World package graph.
- Classification: **requires_new_component**. A future grade-gated mastery system should add a derived prerequisite graph/sidecar rather than altering production packages.

## Manifest and curriculum index audit

### Skill World manifest

- Location: `public/gamehub/skill-world/content/manifest.json`
- Shape: `{ schema_version, generated_at, packages }`
- `packages` lists 122 `.skill-package.v1.json` filenames.
- Classification: **reuse_without_change** for package discovery; **reuse_with_adapter** for assessment candidate index generation.
- Assessment caveat: the manifest does not carry assessment status, item review status, or answer-key visibility controls.

### Adaptive-v2 curriculum index

- Location: `public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json`
- Shape includes `schema_version`, `generated_from`, `phase_gap_policy`, and `entries`.
- Entries include inferred phase/folder/source-file metadata, inferred grade/subject/content type, `conversion_status`, `needs_review`, and notes.
- Classification: **reuse_without_change** for provenance and curriculum-source audit; **reuse_with_adapter** for mapping standards/source documents later.
- Assessment caveat: this is not an operational assessment blueprint and should not be treated as validated item metadata.

## Routes and runtime audit

### Skill World routes

- `GET /skill-world/:skillId` serves the Skill World route with a query-param fallback to `/gamehub/skill-world/index.html?skill=...`.
- `GET /skill-world/:skillId/drill` serves the same Skill World shell with `mode=drill`.
- Static content is served from `public/` after route setup.
- Classification: **reuse_without_change**. Future grade-gated learning plans should route learners to existing Skill World/Practice Center paths without changing these routes.

### Current quiz/adaptive/diagnostic routes

- `public/gamehub/adaptive_learning` and `.html` contain a broad adaptive-learning practice/quiz shell with a fallback question bank and Grade 1 adaptive-v2 panel.
- `server/adaptiveV2Routes.js` exposes Grade 1 checkpoint progress, progress summaries, Grade 1 voice sections, and Gates signal mapping.
- The UI label currently includes `modeSelect` option value `diagnostic`, but the route/test contracts guard against diagnosis/pass/fail semantics in Grade 1 progress summaries.
- Classification: **reuse_with_adapter** for future display of practice history; **not_suitable_for_assessment_scoring** for operational mastery.

### Current audio/voice routes

- `POST /api/adaptive-v2/voice/sections` supports Grade 1 adaptive-v2 voice sections with safe text filtering and browser-speech fallback.
- `POST /api/assessment/voice/section`, `POST /api/assessment/voice/warmup`, `GET /api/assessment/voice/config`, and `GET /api/assessment/voice/stream/:token` support assessment/youth voice generation/fallback.
- `POST /api/skill-world/audio` supports Skill World audio generation/fallback and generated-audio serving.
- Classification: **reuse_with_adapter**. Future assessment audio should reuse the safety/fallback patterns and add assessment-specific no-answer-reveal validation rather than changing current voice behavior.

## Current learner progress, scoring/mastery storage, relationships, and dashboards

### Skill World renderer state

- Skill World practice state is local renderer state: attempts, correct count, stars, hints used, answered questions, misconception tags, last result, profile, and drill state.
- It is suitable for immediate instructional feedback and local practice summaries.
- Classification: **not_suitable_for_assessment_scoring** for grade mastery decisions.

### Adaptive-v2 Grade 1 progress

- `server/adaptiveV2Routes.js` stores checkpoint attempts through `POST /api/adaptive-v2/progress/checkpoint-attempt` and reads summaries through `GET /api/adaptive-v2/progress/summary/:childId`.
- The route is explicitly Grade 1/runtime-version guarded in tests and returns parent-summary scaffold fields.
- Classification: **reuse_with_adapter** for future learning-plan context; **requires_new_component** for Grades 1-6 assessment sessions and mastery records.

### Parent/student relationships

- Broader platform routes include owner sessions, child IDs, youth-development parent dashboards, Gates child ownership, parent commitment, and adaptive-v2 parent summaries.
- Existing structures are not a grade-gated assessment identity model.
- Classification: **reuse_with_adapter** for later integration; **requires_new_component** for consent-aware assessment session ownership and official mastery evidence records.

### Dashboards

- Current dashboard assets include `dashboardnew/`, GameHub dashboards/status notes, youth-development parent dashboard routes, and adaptive-v2 parent summaries.
- Classification: **reuse_with_adapter** for future display; do not modify in Phase Zero/Part 1.

## Voice and accessibility behavior

- Packages include `page_audio` and question-level audio-related metadata.
- Runtime validation checks page/question audio aliases and voice-readable content.
- Voice routes use provider audio when configured and browser speech fallback when unavailable.
- Adaptive-v2 voice tests reject unsafe/private text and disallowed voice sections.
- Classification: **reuse_with_adapter**. Future assessments need additional rules: spoken prompt must be equivalent to visible prompt, audio must not reveal answers, and accommodation use must be recorded without exposing private data.

## Reuse classification matrix

| Area | Classification | Rationale |
|---|---|---|
| SkillPackage instructional curriculum | reuse_without_change | Canonical instructional source; already powers Skill World. |
| SkillPackage package IDs, grade/subject/domain/skill metadata | reuse_without_change | Stable selection/provenance metadata. |
| SkillPackage question banks | reuse_with_adapter | Useful item source, but not validated assessment items. |
| Lesson examples/worked examples | not_suitable_for_assessment_scoring | Instructional content and answer support are visible by design. |
| `level_banks` | reuse_with_adapter | Strong practice inventory; needs assessment metadata, review status, and protected scoring keys. |
| `adaptive_question_bank` | reuse_with_adapter | Good source for candidates after item-writing review and metadata enrichment. |
| `review_bank` | reuse_with_adapter | Useful for retention/cumulative candidates after validation. |
| Public answer fields in SkillPackages | not_suitable_for_assessment_scoring | Keys are exposed to clients; okay for practice, not secure assessment. |
| Renderer answer evaluation | not_suitable_for_assessment_scoring | Client-side instructional feedback, not authoritative mastery scoring. |
| Writing validation checks | reuse_with_adapter | Useful as rubric hints; needs formal rubrics and reviewer status for assessment. |
| Misconception tags | reuse_with_adapter | Helpful diagnostics; distractor rationales need formalization. |
| `next_skill_id`/`remediation_skill_id` | reuse_with_adapter | Partial graph; links need manifest validation and sidecar normalization. |
| Formal prerequisite graph | requires_new_component | No operational package-level prerequisite graph exists. |
| Skill World manifest | reuse_without_change | Package discovery should remain stable. |
| Curriculum index | reuse_without_change | Provenance/source audit only; not assessment blueprint. |
| Skill World routes | reuse_without_change | Learning plans should launch existing paths unchanged. |
| Practice Center/drill behavior | reuse_without_change | Existing behavior should remain instructional/practice only. |
| Adaptive-v2 Grade 1 progress | reuse_with_adapter | Useful history, but incomplete for Grades 1-6 assessment evidence. |
| Grade-gated assessment sessions | requires_new_component | Not implemented; should be separate and additive. |
| Mastery records for operational assessment | requires_new_component | Current records are practice/progress summaries, not validated mastery. |
| Parent dashboards | reuse_with_adapter | Display target after future APIs exist; no current modification needed. |
| Voice routes | reuse_with_adapter | Fallback/safety patterns reusable; assessment-specific safeguards needed. |
| Assessment item governance | requires_new_component | No item lifecycle/review status system exists for SkillPackage questions. |

## Future existing-file modification analysis

No existing production files were modified for this Part 1 audit. If future phases propose changing an existing file, use the following documented standard.

| Potential existing file/area | Why it may be needed | Why additive adapter may not be enough | Current tests that protect it | Smallest safe change |
|---|---|---|---|---|
| `public/gamehub/skill-world/content/manifest.json` | A derived assessment index may need a verified package inventory. | Usually additive index generation is enough; manifest changes are only needed if package discovery is wrong. | `tests/gamehub/grade1-skill-world-manifest-hub.test.js`, `tests/gamehub/skill-world/skill-world-generator.test.js` | Regenerate manifest only from current package files and preserve existing schema/entry names. |
| SkillPackage JSON files | Future item metadata might be desired near source questions. | Sidecar assessment metadata is preferred; direct edits risk breaking production content and exposing scoring changes. | Skill World generator/readiness tests, grade readiness tests, English production readiness tests | Add only non-secret IDs/metadata fields after schema support; never rewrite question text/answers in bulk. |
| `public/gamehub/skill-world/engine/skill-package-schema.js` | New non-secret assessment metadata may need runtime validation. | Separate assessment validator should handle assessment-only metadata first. | `tests/gamehub/skill-world/skill-world-generator.test.js` | Add optional metadata validation without changing existing required package fields or question behavior. |
| `curriculum-framework/schemas/skill-package.schema.json` | Static schema may need optional assessment sidecar references. | A separate assessment schema is safer. | Curriculum validation and Skill World generator tests | Add optional fields only; avoid making existing packages invalid. |
| `public/gamehub/skill-world/engine/skill-world-renderer.js` | Future learning-plan entry points may need to display assessment-derived recommendations. | Launching existing Skill World routes from a new assessment shell should be enough. | `tests/gamehub/skill-world/skill-world-generator.test.js`, route/hub tests | Add a read-only optional recommendation banner; do not alter answer scoring or drill flow. |
| `server/adaptiveV2Routes.js` | Future assessment services may want to read existing progress context. | New assessment APIs should be separate to preserve Grade 1 adaptive-v2 contracts. | `tests/server-adaptive-v2-routes.test.js`, adaptive-v2 GameHub tests | Add read-only adapter endpoints only; do not change current Grade 1 guard behavior. |
| `server/assessmentVoiceRoutes.js` / `server/skillWorldAudioRoutes.js` | Future assessment voice may need no-answer-reveal checks. | A new assessment voice wrapper can call existing services while enforcing assessment policy. | `tests/assessment-voice-rollout.test.js`, `tests/gamehub/skill-world/skill-world-audio-route.test.js` | Add optional policy parameter with default preserving current behavior. |
| Dashboards and parent summaries | Future mastery status may need display. | New API/view-model adapters are preferred. | GameHub dashboard/status, Gates, youth-development parent-flow tests | Add new read-only panel fed by new assessment API; do not alter existing progress semantics. |

## Risks discovered

1. **Answer keys are currently exposed client-side** in public SkillPackage JSON. This is expected for instructional practice but blocks secure operational assessment use.
2. Existing questions vary in assessment readiness. Some have strong metadata; others lack distractor rationales, formal rubrics, item statistics, and expert-review status.
3. `next_skill_id`/`remediation_skill_id` include links that are not all current manifest package IDs, so they need sidecar validation before grade-gated sequencing.
4. Current adaptive/quiz labels can use diagnostic-like terminology, but tests protect against authoritative diagnostic/pass/fail claims in Grade 1 adaptive-v2 summaries.
5. Static and runtime package schemas differ; future assessment validation should avoid destabilizing either.

## Suitability of current questions

| Use | Current suitability |
|---|---|
| Instruction only | Suitable. Lesson/worked-example/guided-demo content should remain instructional. |
| Practice | Suitable. Existing Skill World and drill behavior support practice feedback. |
| Assessment candidates | Potentially suitable only after additive metadata extraction, automated validation, expert review, accessibility/audio review, and secure key handling. |
| Operational assessment items | Not currently suitable. No item should be considered scientifically validated or operational without governance, field testing, statistics, and protected scoring. |

## Appendix A: Full SkillPackage inventory


### Grade 1 Math (11)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G1M_DP_001 | Data & Patterns | Sorting Categories and Pattern Recognition | 5 | 2 | 1 | G1M_DP_002 | G1M_DP_000 |
| G1M_GM_001 | Geometry + Measurement | Shapes and Spatial Reasoning | 5 | 6 | 6 | G1M_GM_002 | — |
| G1M_GM_002 | Geometry + Measurement | Measurement Foundations | 5 | 6 | 6 | G1M_MD_TIME_001 | G1M_GM_001 |
| G1M_MD_TIME_001 | Measurement + Data | Tell and Write Time to Hour and Half-Hour | 5 | 6 | 6 | — | G1M_GM_002 |
| G1M_NS_001 | Number Sense + Counting | Count and Represent Numbers to 20 | 5 | 6 | 6 | G1M_NS_002 | — |
| G1M_NS_002 | Number Sense + Counting | Count Forward and Backward Within 120 | 5 | 12 | 1 | G1M_PV_001 | G1M_NS_001 |
| G1M_NS_003 | Number Sense + Counting | Compare Numbers | 5 | 6 | 6 | G1M_PV_001 | G1M_NS_001 |
| G1M_OP_001 | Operations + Algebraic Thinking | Addition Foundations Within 20 | 5 | 6 | 6 | G1M_OP_002 | G1M_OP_003 |
| G1M_OP_002 | Operations + Algebraic Thinking | Subtraction Foundations Within 20 | 5 | 6 | 6 | G1M_OP_003 | G1M_OP_001 |
| G1M_OP_003 | Operations | Fact Fluency and Number Bonds Within 10 | 5 | 1 | 1 | G1M_OP_004 | G1M_OP_002 |
| G1M_PV_001 | Place Value | Tens and Ones as Base-Ten Units | 5 | 12 | 3 | G1M_NS_004 | G1M_NS_002 |

### Grade 1 English (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G1E_FL_001 | Fluency | Sentence Reading Fluency | 5 | 12 | n/a | G1E_RC_001 | G1E_FL_001_REVIEW |
| G1E_PH_001 | Phonics | CVC Word Blending | 5 | 12 | n/a | G1E_PH_002 | G1E_PH_001_REVIEW |
| G1E_PH_002 | Phonics | Short Vowel Word Families | 5 | 12 | n/a | G1E_SW_001 | G1E_PH_002_REVIEW |
| G1E_RC_001 | Reading Comprehension | Answer Who, What, Where Questions | 5 | 12 | n/a | G1E_RC_002 | G1E_RC_001_REVIEW |
| G1E_RC_002 | Reading Comprehension | Story Sequence: Beginning, Middle, End | 5 | 12 | n/a | G1E_WR_001 | G1E_RC_002_REVIEW |
| G1E_RF_001 | Reading Foundations | Letter Recognition and Sounds | 5 | 12 | n/a | G1E_RF_002 | G1E_RF_001_REVIEW |
| G1E_RF_002 | Reading Foundations | Phonemic Awareness: Beginning, Middle, Ending Sounds | 5 | 12 | n/a | G1E_PH_001 | G1E_RF_002_REVIEW |
| G1E_SW_001 | Fluency | Sight Words and High-Frequency Words | 5 | 12 | n/a | G1E_FL_001 | G1E_SW_001_REVIEW |
| G1E_WR_001 | Writing / Composition | Write a Simple Sentence | 5 | 12 | n/a | G1E_WR_002 | G1E_WR_001_REVIEW |
| G1E_WR_002 | Writing / Composition | Describe a Picture with a Sentence | 5 | 12 | n/a | G1E_WR_002_REVIEW | G1E_WR_002_REVIEW |

### Grade 2 Math (11)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G2M_GM_001 | Geometry | Shapes, Arrays, and Partitioning | 5 | 6 | n/a | — | — |
| G2M_MD_001 | Measurement and Data | Measure Length | 5 | 5 | n/a | — | — |
| G2M_MD_002 | Measurement and Data | Time and Money | 5 | 5 | n/a | — | — |
| G2M_MD_003 | Measurement and Data | Data, Graphs, and Line Plots | 5 | 6 | n/a | — | — |
| G2M_NS_001 | Number Sense / Base Ten | Count, Read, and Write Numbers to 1,000 | 5 | 12 | 2 | G2M_PV_001 | G1M_NS_002 |
| G2M_NS_002 | Number and Operations in Base Ten | Compare Three-Digit Numbers | 5 | 12 | 2 | G2M_OP_001 | G2M_PV_001 |
| G2M_OP_001 | Operations / Base Ten | Add Within 100 | 5 | 4 | n/a | — | — |
| G2M_OP_002 | Operations / Base Ten | Subtract Within 100 | 5 | 4 | n/a | — | — |
| G2M_OP_003 | Operations and Algebraic Thinking | Fluency With Addition and Subtraction Within 20 | 5 | 4 | n/a | — | — |
| G2M_PV_001 | Number and Operations in Base Ten | Place Value to Hundreds | 5 | 12 | 3 | G2M_PV_002 | G1M_PV_001 |
| G2M_WP_001 | Operations and Algebraic Thinking | Addition and Subtraction Word Problems | 5 | 5 | n/a | — | — |

### Grade 2 English (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G2E_FL_001 | Fluency | Grade 2 Sight Words and Fluency | 5 | 12 | n/a | G2E_RC_001 | G1E_FL_001 |
| G2E_RC_001 | Reading Comprehension | Ask and Answer Questions About Text | 5 | 6 | n/a | — | — |
| G2E_RC_002 | Reading Comprehension | Story Structure and Retelling | 5 | 6 | n/a | — | — |
| G2E_RC_003 | Reading Comprehension | Main Idea and Key Details | 5 | 6 | n/a | — | — |
| G2E_RF_001 | Reading Foundations | Advanced Phonics and Word Analysis | 5 | 6 | 5 | G2E_RF_002 | G1E_PH_001 |
| G2E_RF_002 | Reading Foundations / Vocabulary | Prefixes, Suffixes, and Base Words | 5 | 12 | n/a | G2E_FL_001 | G2E_RF_001 |
| G2E_VOC_001 | Vocabulary | Vocabulary and Context Clues | 5 | 12 | n/a | G2E_WR_001 | G1E_RC_001 |
| G2E_WR_001 | Writing / Composition | Write Opinion Pieces | 5 | 12 | n/a | G2E_WR_002 | G1E_WR_002 |
| G2E_WR_002 | Writing / Composition | Write Informative/Explanatory Text | 5 | 12 | n/a | G2E_WR_003 | G1E_WR_002 |
| G2E_WR_003 | Writing / Composition | Narrative Writing With Sequence | 5 | 12 | n/a | — | G1E_WR_002 |

### Grade 3 Math (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G3M_DIV_001 | Operations and Algebraic Thinking | Division Foundations | 5 | 6 | 0 | — | — |
| G3M_FACT_001 | Operations and Algebraic Thinking | Multiplication and Division Fluency | 5 | 6 | 0 | — | — |
| G3M_FR_001 | Number and Operations—Fractions | Fraction Foundations | 5 | 5 | 2 | — | — |
| G3M_FR_002 | Number and Operations—Fractions | Equivalent Fractions and Comparing Fractions | 5 | 5 | 2 | — | — |
| G3M_GM_001 | Measurement and Geometry | Area and Perimeter | 5 | 6 | 0 | — | — |
| G3M_GM_002 | Geometry | Shapes, Attributes, and Partitioning | 5 | 6 | 0 | — | — |
| G3M_MD_001 | Measurement and Data | Time, Measurement, and Data | 5 | 6 | 0 | — | — |
| G3M_MUL_001 | Operations and Algebraic Thinking | Multiplication Foundations | 5 | 4 | 4 | G3M_MUL_002 | G2M_GM_001 |
| G3M_PV_001 | Number and Operations in Base Ten | Place Value and Rounding to 1,000 | 5 | 5 | 2 | — | — |
| G3M_WP_001 | Operations and Algebraic Thinking | Two-Step Word Problems | 5 | 6 | 0 | — | — |

### Grade 3 English (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G3E_FL_001 | Fluency | Reading Fluency and Expression | 5 | 1 | 6 | — | G3E_RF_001 |
| G3E_LANG_001 | Language | Grammar, Conventions, and Sentence Combining | 5 | 2 | n/a | G3E_WR_001 | G2E_WR_001 |
| G3E_RC_001 | Reading Comprehension | Ask and Answer Questions With Text Evidence | 5 | 1 | 6 | — | G3E_RF_001 |
| G3E_RC_002 | Reading Literature | Story Elements, Theme, and Character Response | 5 | 2 | 2 | G3E_RC_003 | G3E_RC_001 |
| G3E_RC_003 | Reading Informational Text | Main Idea, Key Details, and Text Features | 5 | 2 | 2 | G3E_WR_001 | G3E_RC_001 |
| G3E_RF_001 | Reading Foundations | Multisyllable Word Reading and Advanced Phonics | 5 | 12 | 8 | G3E_FL_001 | G2E_RF_001 |
| G3E_VOC_001 | Vocabulary / Language | Vocabulary, Context Clues, and Word Relationships | 5 | 1 | 6 | — | G3E_RF_001 |
| G3E_WR_001 | Writing / Composition | Opinion Writing With Reasons | 5 | 2 | n/a | G3E_LANG_001 | G2E_WR_001 |
| G3E_WR_002 | Writing / Composition | Informative Writing With Facts and Details | 5 | 2 | n/a | G3E_LANG_001 | G2E_WR_001 |
| G3E_WR_003 | Writing / Composition | Narrative Writing With Dialogue and Sequence | 5 | 2 | n/a | G3E_LANG_001 | G2E_WR_001 |

### Grade 4 Math (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G4M_FR_001 | Number and Operations—Fractions | Fraction Equivalence and Ordering | 5 | 1 | n/a | — | — |
| G4M_FR_002 | Number and Operations—Fractions | Add and Subtract Fractions | 5 | 1 | n/a | — | — |
| G4M_FR_003 | Number and Operations—Fractions | Multiply Fractions by Whole Numbers | 5 | 1 | n/a | — | — |
| G4M_GM_001 | Geometry | Angles, Lines, and Shape Classification | 5 | 2 | n/a | — | — |
| G4M_MD_001 | Measurement and Data | Measurement Conversion and Data | 5 | 2 | n/a | — | — |
| G4M_NBT_001 | Number and Operations in Base Ten | Place Value to 1,000,000 | 5 | 3 | 4 | G4M_NBT_002 | G3M_PV_001 |
| G4M_NBT_002 | Number and Operations in Base Ten | Multi-Digit Addition and Subtraction | 5 | 1 | n/a | — | — |
| G4M_NBT_003 | Number and Operations in Base Ten | Multi-Digit Multiplication | 5 | 1 | n/a | — | — |
| G4M_NBT_004 | Number and Operations in Base Ten | Division With Remainders | 5 | 1 | n/a | — | — |
| G4M_OA_001 | Operations and Algebraic Thinking | Multiplicative Comparison and Patterns | 5 | 1 | n/a | — | — |

### Grade 4 English (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G4E_FL_001 | Fluency | Reading Fluency, Accuracy, and Expression | 5 | 2 | 0 | — | G4E_RF_001 |
| G4E_LANG_001 | Language | Grammar, Conventions, and Sentence Combining | 5 | 2 | 0 | — | G3E_LANG_001 |
| G4E_RC_001 | Reading Comprehension | Ask and Answer Questions With Text Evidence | 5 | 2 | 0 | — | G4E_RF_001 |
| G4E_RC_002 | Reading Literature | Story Elements, Theme, and Character Analysis | 5 | 2 | 0 | G4E_RC_003 | G4E_RC_001 |
| G4E_RC_003 | Reading Informational Text | Main Idea, Key Details, and Text Structure | 5 | 2 | 0 | G4E_WR_001 | G4E_RC_001 |
| G4E_RF_001 | Reading Foundations / Phonics | Advanced Word Analysis and Multisyllable Decoding | 5 | 4 | 4 | G4E_FL_001 | G3E_RF_001 |
| G4E_VOC_001 | Vocabulary / Language | Vocabulary, Context Clues, and Figurative Language | 5 | 2 | 0 | — | G4E_RF_001 |
| G4E_WR_001 | Writing / Composition | Opinion Writing With Reasons and Evidence | 5 | 2 | 0 | — | G3E_WR_001 |
| G4E_WR_002 | Writing / Composition | Informative Writing With Facts and Details | 5 | 2 | 0 | — | G3E_WR_001 |
| G4E_WR_003 | Writing / Composition | Narrative Writing With Dialogue and Description | 5 | 2 | 0 | — | G3E_WR_001 |

### Grade 5 Math (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G5M_FR_001 | Number and Operations—Fractions | Add and Subtract Fractions With Unlike Denominators | 5 | 1 | n/a | — | — |
| G5M_FR_002 | Number and Operations—Fractions | Multiply Fractions | 5 | 1 | n/a | — | — |
| G5M_FR_003 | Number and Operations—Fractions | Divide Unit Fractions and Whole Numbers | 5 | 1 | n/a | — | — |
| G5M_GM_001 | Geometry | Coordinate Plane and Graphing | 5 | 1 | n/a | — | — |
| G5M_GM_002 | Geometry | Classify Two-Dimensional Figures | 5 | 1 | n/a | — | — |
| G5M_MD_001 | Measurement and Data | Measurement Conversion, Volume, and Data | 5 | 1 | n/a | — | — |
| G5M_NBT_001 | Number and Operations in Base Ten | Place Value With Decimals | 5 | 3 | 4 | G5M_NBT_002 | G4M_NBT_001 |
| G5M_NBT_002 | Number and Operations in Base Ten | Multi-Digit Whole Number Operations | 5 | 1 | 0 | — | G5M_NBT_001 |
| G5M_NBT_003 | Number and Operations in Base Ten | Decimal Operations | 5 | 1 | 0 | — | G5M_NBT_001 |
| G5M_OA_001 | Operations and Algebraic Thinking / Geometry | Expressions, Patterns, and the Coordinate Plane | 5 | 1 | 0 | — | G5M_NBT_001 |

### Grade 5 English (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G5E_FL_001 | Fluency | Reading Fluency and Expression With Complex Text | 5 | 4 | 5 | G5E_VOC_001 | G5E_RF_001 |
| G5E_LANG_001 | Language | Grammar, Conventions, and Sentence Combining | 5 | 1 | 5 | G6E_LANG_001 | G5E_WR_003 |
| G5E_RC_001 | Reading Comprehension | Quote Accurately and Use Text Evidence | 5 | 3 | 3 | G5E_RC_002 | G4E_RC_001 |
| G5E_RC_002 | Reading Literature | Theme, Character, and Story Structure | 5 | 4 | 5 | G5E_RC_003 | G5E_RC_001 |
| G5E_RC_003 | Reading Informational Text | Main Idea, Text Structure, and Integrating Information | 5 | 4 | 5 | G5E_WR_001 | G5E_RC_001 |
| G5E_RF_001 | Reading Foundations / Word Analysis | Multisyllable Word Reading, Roots, and Affixes | 5 | 4 | 3 | G5E_FL_001 | G4E_RF_001 |
| G5E_VOC_001 | Vocabulary / Language | Vocabulary, Context Clues, and Figurative Language | 5 | 4 | 4 | G5E_RC_002 | G4E_VOC_001 |
| G5E_WR_001 | Writing / Composition | Opinion Writing With Reasons and Evidence | 5 | 4 | 5 | G5E_WR_002 | G5E_RC_001 |
| G5E_WR_002 | Writing / Composition | Informative Writing With Facts, Definitions, and Details | 5 | 1 | 5 | G5E_WR_003 | G5E_WR_001 |
| G5E_WR_003 | Writing / Composition | Narrative Writing With Dialogue, Description, and Pacing | 5 | 1 | 5 | G5E_LANG_001 | G5E_WR_002 |

### Grade 6 Math (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G6M_EE_001 | Expressions and Equations | Expressions and Exponents | 5 | 1 | 0 | — | G6M_RP_001 |
| G6M_EE_002 | Expressions and Equations | Equations and Inequalities | 5 | 1 | 0 | — | G6M_RP_001 |
| G6M_EE_003 | Expressions and Equations | Dependent and Independent Variables | 5 | 1 | 0 | — | G6M_RP_001 |
| G6M_GM_001 | Geometry | Area, Surface Area, and Volume | 5 | 1 | 0 | — | G6M_EE_003 |
| G6M_NS_001 | The Number System | Dividing Fractions | 5 | 1 | 0 | — | — |
| G6M_NS_002 | The Number System | Multi-Digit Decimal Operations | 5 | 1 | 0 | — | — |
| G6M_NS_003 | The Number System | Integers and the Number Line | 5 | 1 | 0 | — | — |
| G6M_RP_001 | Ratios and Proportional Relationships | Ratios and Unit Rates | 5 | 1 | 3 | G6M_RP_002 | G5M_FR_001 |
| G6M_SP_001 | Statistics and Probability | Statistical Questions and Data Displays | 5 | 1 | 0 | — | G6M_EE_003 |
| G6M_SP_002 | Statistics and Probability | Summarize and Interpret Data | 5 | 1 | 0 | — | G6M_EE_003 |

### Grade 6 English (10)

| skill_id | domain | skill | level_banks | adaptive | review | next | remediation |
|---|---|---|---:|---:|---:|---|---|
| G6E_FL_001 | Fluency | Fluency With Literary and Informational Text | 5 | 2 | 5 | G6E_VOC_001 | G6E_RF_001 |
| G6E_LANG_001 | Language | Grammar, Usage, Conventions, and Style | 5 | 2 | 2 | — | G5E_LANG_001 |
| G6E_RC_001 | Reading Comprehension | Cite Textual Evidence and Make Inferences | 5 | 2 | 5 | G6E_RC_002 | G6E_VOC_001 |
| G6E_RC_002 | Reading Literature | Theme, Character, Plot, and Point of View | 5 | 2 | 2 | G6E_RC_003 | G6E_RC_001 |
| G6E_RC_003 | Reading Informational Text | Central Idea, Text Structure, and Source Integration | 5 | 2 | 2 | G6E_WR_001 | G6E_RC_002 |
| G6E_RF_001 | Word Analysis / Language | Morphology, Roots, and Complex Word Analysis | 5 | 2 | 4 | G6E_FL_001 | G5E_RF_001 |
| G6E_VOC_001 | Vocabulary / Language | Academic Vocabulary and Figurative Language | 5 | 2 | 5 | G6E_RC_001 | G6E_FL_001 |
| G6E_WR_001 | Writing / Composition | Argument Writing With Claims and Evidence | 5 | 2 | 2 | G6E_WR_002 | G6E_RC_003 |
| G6E_WR_002 | Writing / Composition | Informative Writing and Source-Based Explanation | 5 | 2 | 2 | G6E_WR_003 | G6E_WR_001 |
| G6E_WR_003 | Writing / Composition | Narrative Writing With Pacing and Point of View | 5 | 2 | 2 | G6E_LANG_001 | G6E_WR_002 |
