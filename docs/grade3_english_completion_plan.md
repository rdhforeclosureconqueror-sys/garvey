# Grade 3 English Completion Plan (Skill World Production)

## Executive Summary

This plan defines the Grade 3 English production backlog using the same production standard already used for Grades 1–2 English and Grades 1–3 Math. It is a planning artifact only: it does not implement Grade 3 English SkillPackage files, does not add one-off games, and does not add hardcoded placeholder cards.

Grade 3 English production should extend the existing Skill World pipeline across Reading Foundations, Fluency, Vocabulary / Language, Reading Comprehension, Reading Literature, Reading Informational Text, Writing / Composition, and Language. Every production skill must be authored as SkillPackage JSON, generated through the Skill World experience, and exposed through the manifest-driven hub.

## Source Inputs Used

- `docs/grade1_english_completion_plan.md`
- `docs/grade2_english_completion_plan.md`
- `docs/grade3_math_completion_plan.md`
- `docs/skill-world-generator.md`
- `curriculum-framework/schemas/skill-package.schema.json`
- `public/gamehub/skill-world/engine/skill-package-schema.js`
- `public/gamehub/skill-world/renderers/visual-model-registry.js`
- `public/gamehub/skill-world/content/manifest.json`

## Product Contract for Every Grade 3 English SkillPackage

1. **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile.
2. **Skill Practice Center**: at least four focused levels plus Mixed. Each focused level has 10–12 questions; Mixed has 10–12 questions.
3. **SkillPackage JSON**: content, question banks, misconception coverage, review bank, level banks, lesson assets, and game theme metadata live in package JSON rather than bespoke game code.
4. **Skill World generator**: mission screens, practice flows, remediation, checkpoint, badge, and profile updates are generated from the shared Skill World runtime.
5. **Manifest-driven hub exposure**: package files are added to the Skill World content manifest and surfaced from manifest metadata, not hardcoded cards.
6. **No one-off games**: new interactions must be renderer/question-type capabilities that can be reused across packages.
7. **No hardcoded placeholder cards**: do not ship cards that point to static pages, route to legacy activities, or say a skill is coming soon.

## Grade 1–2 English Renderer Fit Decision

**Decision: partial support.** Existing Grade 1–2 English renderers support most Grade 3 foundations, basic vocabulary, passage, evidence-highlight, story-map, main-idea, detail-card, paragraph, and writing-checklist needs. They do not fully support Grade 3 fluency scoring/display, vocabulary intensity scales, evidence construction, literature analysis charts, informational text-feature maps, dialogue construction, grammar highlighting, or sentence combining.

### Existing renderers that can be reused

- `context_sentence`
- `detail_cards`
- `event_cards`
- `evidence_highlight`
- `fact_cards`
- `main_idea_web`
- `morpheme_tiles`
- `opinion_reason_chart`
- `paragraph_builder`
- `phonics_tiles`
- `phrase_builder`
- `punctuation_marker`
- `question_card`
- `sentence_builder`
- `sentence_card`
- `sentence_highlight`
- `short_passage`
- `story_map`
- `story_sequence`
- `syllable_break`
- `topic_detail_chart`
- `vocabulary_match`
- `word_card`
- `word_parts`
- `writing_checklist`

### New renderers required before full Grade 3 English production

- `fluency_meter`
- `word_scale`
- `text_evidence_builder`
- `character_trait_chart`
- `theme_tracker`
- `text_feature_map`
- `dialogue_builder`
- `grammar_highlight`
- `sentence_combiner`

## Schema and Runtime Updates Needed

- Add the new visual_model values `fluency_meter`, `word_scale`, `text_evidence_builder`, `character_trait_chart`, `theme_tracker`, `text_feature_map`, `dialogue_builder`, `grammar_highlight`, and `sentence_combiner` to the SkillPackage schema/runtime allowed visual list and renderer registry.
- Confirm the requested Grade 3 question_type values are supported: `multiple_choice`, `short_response`, `word_building`, `sentence_completion`, `vocabulary_match`, `text_evidence`, `sequencing`, `detail_match`, and `writing_response` are already represented in the runtime vocabulary; add `editing` or formally map it to existing editing subtypes such as `capitalization_fix`, `punctuation_choice`, constructed sentence, and agreement validation.
- Document Grade 3 literacy item metadata: passage, passage_id, evidence_spans, selected_span_ids, question_word, inference_support, vocabulary_target, word_scale_points, character, trait, action_evidence, theme_options, text_feature_type, feature_purpose, dialogue_lines, grammar_targets, sentence_parts, and combining_constraints.
- Ensure level_banks validation remains strict for literacy packages: four focused levels plus Mixed, 10–12 questions per level, misconception_tag on every question, and no fallback placeholder visual models.
- Extend manifest metadata conventions for grade 3 English subject/domain grouping so hub exposure is driven only by the content manifest.

## Writing Validation Updates Needed for Grade 3 Writing

- Opinion writing: validate a clear opinion/claim, at least two relevant reasons where the prompt requires development, linking words, topic alignment, and conclusion/closure.
- Informative writing: validate topic introduction, approved facts or definitions from a fact bank/passage, supporting details, linking words, and conclusion/closure.
- Narrative writing: validate beginning-middle-end event sequence, temporal words, relevant descriptive details, dialogue markers/quotation punctuation where expected, and closure.
- Grammar and conventions: add rubric dimensions for capitalization, end punctuation, commas, quotation marks, subject-verb agreement, fragments/run-ons, and sentence combining quality.
- Short responses and writing responses should use deterministic rubric checks first, with normalized capitalization/punctuation feedback and optional teacher-review or AI-review hooks only after privacy and safety policies are defined.
- Evidence-based responses should verify that written explanations cite or paraphrase approved evidence spans rather than relying only on exact-string answer matching.

## Grade 3 English Question Type Backlog

- `detail_match`
- `editing`
- `multiple_choice`
- `sentence_completion`
- `sequencing`
- `short_response`
- `text_evidence`
- `vocabulary_match`
- `word_building`
- `writing_response`

## Production Skill Map and Package Backlog


### G3E-P0-001 — G3E_RF_001 — Multisyllable Word Reading and Advanced Phonics
- **Priority**: P0
- **Domain**: Reading Foundations
- **Focus**: decode multisyllable words, vowel teams, r-controlled vowels, prefixes, suffixes, and syllable patterns
- **Learning purpose**: Extend Grade 2 phonics into independent multisyllable decoding and meaningful word-part analysis.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Syllable Types: 10–12 questions; mastery threshold 80%; Practice syllable types for decode multisyllable words, vowel teams, r-controlled vowels, prefixes, suffixes, and syllable patterns.
  - Level 2: R-Controlled Vowels: 10–12 questions; mastery threshold 80%; Practice r-controlled vowels for decode multisyllable words, vowel teams, r-controlled vowels, prefixes, suffixes, and syllable patterns.
  - Level 3: Prefixes and Suffixes: 10–12 questions; mastery threshold 80%; Practice prefixes and suffixes for decode multisyllable words, vowel teams, r-controlled vowels, prefixes, suffixes, and syllable patterns.
  - Level 4: Multisyllable Decoding: 10–12 questions; mastery threshold 80%; Practice multisyllable decoding for decode multisyllable words, vowel teams, r-controlled vowels, prefixes, suffixes, and syllable patterns.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Multisyllable Word Reading and Advanced Phonics targets.
- **Visual models**: `syllable_break`, `phonics_tiles`, `word_parts`, `morpheme_tiles`
- **Question types**: `multiple_choice`, `short_response`, `word_building`
- **Misconception tags**: `syllable_break_error`, `r_controlled_vowel_confusion`, `affix_meaning_confusion`, `multisyllable_guessing`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-002 — G3E_FL_001 — Reading Fluency and Expression
- **Priority**: P0
- **Domain**: Fluency
- **Focus**: read grade-level text accurately, smoothly, and with expression
- **Learning purpose**: Move fluency work from word and phrase accuracy into expressive grade-level sentence and short-passage reading.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Accuracy: 10–12 questions; mastery threshold 80%; Practice accuracy for read grade-level text accurately, smoothly, and with expression.
  - Level 2: Phrasing: 10–12 questions; mastery threshold 80%; Practice phrasing for read grade-level text accurately, smoothly, and with expression.
  - Level 3: Punctuation and Expression: 10–12 questions; mastery threshold 80%; Practice punctuation and expression for read grade-level text accurately, smoothly, and with expression.
  - Level 4: Repeated Reading: 10–12 questions; mastery threshold 80%; Practice repeated reading for read grade-level text accurately, smoothly, and with expression.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Reading Fluency and Expression targets.
- **Visual models**: `sentence_card`, `sentence_highlight`, `phrase_builder`, `fluency_meter`
- **Question types**: `multiple_choice`, `short_response`, `sentence_completion`
- **Misconception tags**: `skips_words`, `punctuation_ignored`, `phrase_chunking_error`, `expression_flat_reading`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-003 — G3E_VOC_001 — Vocabulary, Context Clues, and Word Relationships
- **Priority**: P0
- **Domain**: Vocabulary / Language
- **Focus**: use context clues, synonyms, antonyms, shades of meaning, and multiple-meaning words
- **Learning purpose**: Build flexible word knowledge for comprehension, discussion, and writing.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Context Clues: 10–12 questions; mastery threshold 80%; Practice context clues for use context clues, synonyms, antonyms, shades of meaning, and multiple-meaning words.
  - Level 2: Synonyms and Antonyms: 10–12 questions; mastery threshold 80%; Practice synonyms and antonyms for use context clues, synonyms, antonyms, shades of meaning, and multiple-meaning words.
  - Level 3: Shades of Meaning: 10–12 questions; mastery threshold 80%; Practice shades of meaning for use context clues, synonyms, antonyms, shades of meaning, and multiple-meaning words.
  - Level 4: Multiple-Meaning Words: 10–12 questions; mastery threshold 80%; Practice multiple-meaning words for use context clues, synonyms, antonyms, shades of meaning, and multiple-meaning words.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Vocabulary, Context Clues, and Word Relationships targets.
- **Visual models**: `context_sentence`, `vocabulary_match`, `word_card`, `word_scale`
- **Question types**: `multiple_choice`, `short_response`, `vocabulary_match`
- **Misconception tags**: `context_clue_ignored`, `synonym_antonym_confusion`, `shade_of_meaning_confusion`, `multiple_meaning_confusion`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-004 — G3E_RC_001 — Ask and Answer Questions With Text Evidence
- **Priority**: P0
- **Domain**: Reading Comprehension
- **Focus**: answer literal and inferential questions using text evidence
- **Learning purpose**: Make text evidence a required habit for both direct answers and supported inferences.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Literal Questions: 10–12 questions; mastery threshold 80%; Practice literal questions for answer literal and inferential questions using text evidence.
  - Level 2: Inferential Questions: 10–12 questions; mastery threshold 80%; Practice inferential questions for answer literal and inferential questions using text evidence.
  - Level 3: Find Text Evidence: 10–12 questions; mastery threshold 80%; Practice find text evidence for answer literal and inferential questions using text evidence.
  - Level 4: Explain Your Answer: 10–12 questions; mastery threshold 80%; Practice explain your answer for answer literal and inferential questions using text evidence.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Ask and Answer Questions With Text Evidence targets.
- **Visual models**: `short_passage`, `question_card`, `evidence_highlight`, `text_evidence_builder`
- **Question types**: `multiple_choice`, `short_response`, `text_evidence`
- **Misconception tags**: `unsupported_answer`, `inference_without_evidence`, `misses_text_evidence`, `question_word_confusion`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-005 — G3E_RC_002 — Story Elements, Theme, and Character Response
- **Priority**: P0
- **Domain**: Reading Literature
- **Focus**: identify characters, setting, plot, problem/solution, theme, and character actions
- **Learning purpose**: Connect story events, character actions, and evidence to theme or lesson statements.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Characters and Setting: 10–12 questions; mastery threshold 80%; Practice characters and setting for identify characters, setting, plot, problem/solution, theme, and character actions.
  - Level 2: Plot and Problem/Solution: 10–12 questions; mastery threshold 80%; Practice plot and problem/solution for identify characters, setting, plot, problem/solution, theme, and character actions.
  - Level 3: Character Traits and Response: 10–12 questions; mastery threshold 80%; Practice character traits and response for identify characters, setting, plot, problem/solution, theme, and character actions.
  - Level 4: Theme / Lesson: 10–12 questions; mastery threshold 80%; Practice theme / lesson for identify characters, setting, plot, problem/solution, theme, and character actions.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Story Elements, Theme, and Character Response targets.
- **Visual models**: `story_map`, `character_trait_chart`, `event_cards`, `theme_tracker`
- **Question types**: `multiple_choice`, `short_response`, `sequencing`, `text_evidence`
- **Misconception tags**: `character_trait_confusion`, `problem_solution_confusion`, `theme_detail_confusion`, `sequence_order_error`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-006 — G3E_RC_003 — Main Idea, Key Details, and Text Features
- **Priority**: P0
- **Domain**: Reading Informational Text
- **Focus**: determine main idea, supporting details, text features, and relationships between ideas
- **Learning purpose**: Help learners distinguish topics, main ideas, details, and informational text-feature purposes.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Topic and Main Idea: 10–12 questions; mastery threshold 80%; Practice topic and main idea for determine main idea, supporting details, text features, and relationships between ideas.
  - Level 2: Key Details: 10–12 questions; mastery threshold 80%; Practice key details for determine main idea, supporting details, text features, and relationships between ideas.
  - Level 3: Text Features: 10–12 questions; mastery threshold 80%; Practice text features for determine main idea, supporting details, text features, and relationships between ideas.
  - Level 4: Connect Ideas: 10–12 questions; mastery threshold 80%; Practice connect ideas for determine main idea, supporting details, text features, and relationships between ideas.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Main Idea, Key Details, and Text Features targets.
- **Visual models**: `short_passage`, `main_idea_web`, `detail_cards`, `text_feature_map`
- **Question types**: `multiple_choice`, `short_response`, `text_evidence`, `detail_match`
- **Misconception tags**: `topic_main_idea_confusion`, `detail_selection_error`, `text_feature_confusion`, `unsupported_detail`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-007 — G3E_WR_001 — Opinion Writing With Reasons
- **Priority**: P0
- **Domain**: Writing / Composition
- **Focus**: write opinion pieces with reasons, linking words, and conclusion
- **Learning purpose**: Produce opinion paragraphs with a clear claim, relevant reasons, linking language, and closure.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: State an Opinion: 10–12 questions; mastery threshold 80%; Practice state an opinion for write opinion pieces with reasons, linking words, and conclusion.
  - Level 2: Support With Reasons: 10–12 questions; mastery threshold 80%; Practice support with reasons for write opinion pieces with reasons, linking words, and conclusion.
  - Level 3: Linking Words and Conclusion: 10–12 questions; mastery threshold 80%; Practice linking words and conclusion for write opinion pieces with reasons, linking words, and conclusion.
  - Level 4: Build Opinion Paragraph: 10–12 questions; mastery threshold 80%; Practice build opinion paragraph for write opinion pieces with reasons, linking words, and conclusion.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Opinion Writing With Reasons targets.
- **Visual models**: `opinion_reason_chart`, `paragraph_builder`, `writing_checklist`, `sentence_builder`
- **Question types**: `multiple_choice`, `short_response`, `writing_response`, `sentence_completion`
- **Misconception tags**: `missing_opinion`, `weak_reason`, `missing_linking_word`, `missing_conclusion`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-008 — G3E_WR_002 — Informative Writing With Facts and Details
- **Priority**: P0
- **Domain**: Writing / Composition
- **Focus**: write informative text with topic, facts, definitions, details, and conclusion
- **Learning purpose**: Write informative paragraphs that introduce a topic and develop it with approved facts, definitions, details, linking language, and closure.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Choose a Topic: 10–12 questions; mastery threshold 80%; Practice choose a topic for write informative text with topic, facts, definitions, details, and conclusion.
  - Level 2: Add Facts and Definitions: 10–12 questions; mastery threshold 80%; Practice add facts and definitions for write informative text with topic, facts, definitions, details, and conclusion.
  - Level 3: Add Details and Linking Words: 10–12 questions; mastery threshold 80%; Practice add details and linking words for write informative text with topic, facts, definitions, details, and conclusion.
  - Level 4: Build Informative Paragraph: 10–12 questions; mastery threshold 80%; Practice build informative paragraph for write informative text with topic, facts, definitions, details, and conclusion.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Informative Writing With Facts and Details targets.
- **Visual models**: `topic_detail_chart`, `fact_cards`, `paragraph_builder`, `writing_checklist`
- **Question types**: `multiple_choice`, `short_response`, `writing_response`, `sentence_completion`
- **Misconception tags**: `missing_topic`, `unsupported_fact`, `missing_detail`, `missing_conclusion`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-009 — G3E_WR_003 — Narrative Writing With Dialogue and Sequence
- **Priority**: P0
- **Domain**: Writing / Composition
- **Focus**: write narratives with event sequence, details, temporal words, dialogue, and closure
- **Learning purpose**: Create narrative writing that has ordered events, elaborated details, dialogue conventions, temporal words, and a satisfying closure.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Sequence Events: 10–12 questions; mastery threshold 80%; Practice sequence events for write narratives with event sequence, details, temporal words, dialogue, and closure.
  - Level 2: Add Details: 10–12 questions; mastery threshold 80%; Practice add details for write narratives with event sequence, details, temporal words, dialogue, and closure.
  - Level 3: Dialogue and Temporal Words: 10–12 questions; mastery threshold 80%; Practice dialogue and temporal words for write narratives with event sequence, details, temporal words, dialogue, and closure.
  - Level 4: Build Narrative: 10–12 questions; mastery threshold 80%; Practice build narrative for write narratives with event sequence, details, temporal words, dialogue, and closure.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Narrative Writing With Dialogue and Sequence targets.
- **Visual models**: `story_sequence`, `event_cards`, `paragraph_builder`, `dialogue_builder`
- **Question types**: `multiple_choice`, `short_response`, `writing_response`, `sequencing`
- **Misconception tags**: `event_order_error`, `missing_details`, `dialogue_punctuation_error`, `missing_closure`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

### G3E-P0-010 — G3E_LANG_001 — Grammar, Conventions, and Sentence Combining
- **Priority**: P0
- **Domain**: Language
- **Focus**: use capitalization, punctuation, commas, quotation marks, subject-verb agreement, and sentence combining
- **Learning purpose**: Support grade-level editing and sentence craft without replacing production SkillPackage interactions with one-off grammar games.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Capitalization and Punctuation: 10–12 questions; mastery threshold 80%; Practice capitalization and punctuation for use capitalization, punctuation, commas, quotation marks, subject-verb agreement, and sentence combining.
  - Level 2: Commas and Quotation Marks: 10–12 questions; mastery threshold 80%; Practice commas and quotation marks for use capitalization, punctuation, commas, quotation marks, subject-verb agreement, and sentence combining.
  - Level 3: Subject-Verb Agreement: 10–12 questions; mastery threshold 80%; Practice subject-verb agreement for use capitalization, punctuation, commas, quotation marks, subject-verb agreement, and sentence combining.
  - Level 4: Sentence Combining: 10–12 questions; mastery threshold 80%; Practice sentence combining for use capitalization, punctuation, commas, quotation marks, subject-verb agreement, and sentence combining.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Grammar, Conventions, and Sentence Combining targets.
- **Visual models**: `sentence_builder`, `punctuation_marker`, `grammar_highlight`, `sentence_combiner`
- **Question types**: `multiple_choice`, `short_response`, `sentence_completion`, `editing`
- **Misconception tags**: `capitalization_error`, `punctuation_error`, `agreement_error`, `sentence_fragment`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 3 English hub exposure, includes all required Guided Mission stages, and includes all required Practice Center levels.

## Contractor-Ready Implementation Backlog

- **G3E-BLK-001 (P0) — Schema/runtime contracts**: Update schema/runtime allowed visual models and question-type handling for Grade 3 English, especially new renderers and the `editing` question-type decision.
- **G3E-BLK-002 (P0) — Renderer implementation**: Implement reusable renderers for `fluency_meter`, `word_scale`, `text_evidence_builder`, `character_trait_chart`, `theme_tracker`, `text_feature_map`, `dialogue_builder`, `grammar_highlight`, and `sentence_combiner`; add renderer fixtures for each.
- **G3E-BLK-003 (P0) — Writing validation**: Extend deterministic writing validation/rubrics for Grade 3 opinion, informative, narrative, and convention/editing tasks.
- **G3E-BLK-004 (P0) — Package authoring template**: Create a Grade 3 English package-authoring checklist that enforces Guided Mission stages, level_banks, misconception coverage, review bank, renderer coverage, and manifest metadata.
- **G3E-BLK-005 (P0) — G3E_RF_001 package**: Author and validate the multisyllable word reading and advanced phonics SkillPackage JSON.
- **G3E-BLK-006 (P0) — G3E_FL_001 package**: Author and validate the reading fluency and expression SkillPackage JSON after `fluency_meter` is available.
- **G3E-BLK-007 (P0) — G3E_VOC_001 package**: Author and validate the vocabulary/context clues SkillPackage JSON after `word_scale` is available.
- **G3E-BLK-008 (P0) — G3E_RC_001 package**: Author and validate the text-evidence SkillPackage JSON after `text_evidence_builder` is available.
- **G3E-BLK-009 (P0) — G3E_RC_002 package**: Author and validate the story elements/theme SkillPackage JSON after literature-analysis renderers are available.
- **G3E-BLK-010 (P0) — G3E_RC_003 package**: Author and validate the main idea/details/text features SkillPackage JSON after `text_feature_map` is available.
- **G3E-BLK-011 (P0) — G3E_WR_001 package**: Author and validate the opinion writing SkillPackage JSON with Grade 3 writing validation.
- **G3E-BLK-012 (P0) — G3E_WR_002 package**: Author and validate the informative writing SkillPackage JSON with Grade 3 writing validation.
- **G3E-BLK-013 (P0) — G3E_WR_003 package**: Author and validate the narrative writing SkillPackage JSON after `dialogue_builder` and dialogue validation are available.
- **G3E-BLK-014 (P0) — G3E_LANG_001 package**: Author and validate the grammar/conventions/sentence-combining SkillPackage JSON after grammar renderers and editing validation are available.
- **G3E-BLK-015 (P1) — Manifest and hub QA**: Add packages to the content manifest only after validation passes; verify Grade 3 English hub cards are manifest-derived and contain no placeholders.
- **G3E-BLK-016 (P1) — End-to-end QA**: Run package validation, renderer smoke tests, hub manifest checks, and Guided Mission flow checks across all Grade 3 English packages.

## Plan Acceptance Criteria

- Grade 3 English plan exists in `docs/grade3_english_completion_plan.md`.
- Optional machine-readable plan exists in `curriculum-framework/plans/grade3-english-completion-plan.v1.json` and validates with `python -m json.tool`.
- Plan uses the same SkillPackage JSON, Skill World generator, Guided Mission, Practice Center, manifest-driven hub, no-one-off-games, and no-placeholder-card standard as Grades 1–3 Math and Grades 1–2 English.
- All requested Grade 3 English skill IDs are defined.
- Each skill includes level_banks design with four focused levels plus Mixed and 10–12 questions per bank.
- Renderer needs, question types, misconception tags, schema updates, writing-validation updates, and contractor-ready backlog are listed.
