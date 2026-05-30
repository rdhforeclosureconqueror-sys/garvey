# Grade 2 English Completion Plan (Skill World Production)

## Executive Summary
This plan begins Grade 2 English production using the same SkillPackage JSON, Skill World generator, Guided Mission flow, Skill Practice Center, and manifest-driven hub standard used for Grade 1 English and Grade 2 Math. It is a planning and backlog artifact only: it does not implement the Grade 2 English packages, create one-off games, or add placeholder cards.

The production target is a coherent Grade 2 English skill set spanning Reading Foundations, Fluency, Reading Comprehension, Vocabulary, and Writing / Composition. Every future production package must be generated from SkillPackage JSON and exposed through the Skill World manifest/hub path.

## Source Inputs Used
- `docs/grade1_english_completion_plan.md`
- `docs/grade2_math_completion_plan.md`
- `docs/skill-world-generator.md`
- `curriculum-framework/schemas/skill-package.schema.json`
- `public/gamehub/skill-world/engine/skill-package-schema.js`
- `public/gamehub/skill-world/renderers/visual-model-registry.js`
- `public/gamehub/skill-world/content/manifest.json`

## Product Contract for Every Grade 2 English SkillPackage
Every Grade 2 English production SkillPackage must meet the same production standard as Grade 1 English:

1. **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile.
2. **Skill Practice Center**: at least four focused levels plus Mixed. Each focused level has 10–12 questions; Mixed has 10–12 questions.
3. **Manifest/hub exposure**: package files are added to the Skill World content manifest and surfaced from manifest metadata, not hardcoded placeholders.
4. **No placeholder cards**: do not create cards that simply route to old static content or say “coming soon.”
5. **No one-off games**: all interactions must be generated from SkillPackage JSON and supported renderer/question-type contracts.

## Grade 1 English Renderer Fit Decision
**Decision: partial support.** Existing Grade 1 English renderers support many Grade 2 needs in phonics, fluency, basic comprehension, sequencing, and writing scaffolds, but they do not cover the full Grade 2 English plan.

### Existing renderers that can be reused
- `phonics_tiles`
- `sound_boxes`
- `word_builder`
- `word_card`
- `phrase_builder`
- `sentence_card`
- `sentence_highlight`
- `short_passage`
- `question_card`
- `picture_story`
- `story_sequence`
- `event_cards`
- `picture_order`
- `writing_checklist`
- `sentence_builder`
- `detail_picker`

### New renderers needed for Grade 2 English
- `syllable_break`
- `word_parts`
- `morpheme_tiles`
- `evidence_highlight`
- `story_map`
- `main_idea_web`
- `detail_cards`
- `context_sentence`
- `vocabulary_match`
- `category_sort`
- `opinion_reason_chart`
- `paragraph_builder`
- `fact_cards`
- `topic_detail_chart`

## Schema and Runtime Updates Needed
- Add or document explicit question_type values for syllable_break, word_part_identification, prefix_meaning, suffix_meaning, morpheme_builder, evidence_highlight, story_element_identification, retell_response, topic_identification, main_idea_choice, detail_match, synonym_antonym_choice, context_clue_choice, multiple_meaning_choice, vocabulary_match, category_sort, opinion_identification, reason_selection, closing_sentence_choice, topic_sentence_choice, fact_selection, linking_word_choice, paragraph_builder, and narrative_builder.
- Add renderer registry support for the Grade 2 visual models listed in new_renderers_required_before_full_grade2_english_production.
- Define passage/evidence metadata fields such as passage, evidence_span, evidence_spans, highlighted_span_ids, sentence, context_sentence, word_parts, morphemes, syllables, topic, details, facts, and writing_prompt.
- Define validation modes per item: exact normalized answer, multiple choice, evidence-span selection, ordered sequence, category sort/match, sentence construction, and rubric-scored writing.
- Ensure level_banks can be validated for 4 focused levels plus Mixed with 10-12 questions per bank for literacy packages.

## Writing Validation Needs
- Opinion writing: detect an opinion/claim, at least one relevant reason, topic alignment, and a closing sentence.
- Informative writing: detect named topic, factual support from approved fact bank or passage, linking words where required, and closure.
- Narrative writing: detect temporal/sequence words, ordered beginning-middle-end structure, event details, and closure.
- All writing: normalize capitalization and punctuation for feedback without over-penalizing early writers; score with transparent rubric dimensions rather than exact string matching.
- Route open responses to safe deterministic rubric checks first, with optional teacher-review or AI-review hooks only after privacy/safety policy is defined.

## Grade 2 English Question Type Backlog
- `category_sort`
- `closing_sentence_choice`
- `constructed_sentence`
- `context_clue_choice`
- `decode_word`
- `detail_match`
- `detail_picker`
- `event_ordering`
- `evidence_highlight`
- `fact_selection`
- `linking_word_choice`
- `main_idea_choice`
- `morpheme_builder`
- `multiple_choice`
- `multiple_meaning_choice`
- `narrative_builder`
- `opinion_identification`
- `paragraph_builder`
- `phrase_reading`
- `picture_order`
- `prefix_meaning`
- `punctuation_reading`
- `reason_selection`
- `retell_response`
- `rubric_scored_writing`
- `sentence_builder`
- `sentence_cloze`
- `sentence_picture_match`
- `sequence_select`
- `short_response`
- `sight_word_match`
- `sound_box_blend`
- `story_element_identification`
- `suffix_meaning`
- `syllable_break`
- `synonym_antonym_choice`
- `text_evidence_choice`
- `topic_identification`
- `topic_sentence_choice`
- `vocabulary_match`
- `wh_question`
- `word_builder`
- `word_part_identification`

## Production Skill Map and Package Backlog

### G2E-P0-001 — G2E_RF_001 — Advanced Phonics and Word Analysis
- **Priority**: P0
- **Domain**: Reading Foundations
- **Focus**: decode long vowels, vowel teams, digraphs, blends, and multisyllable words
- **Learning purpose**: Extend Grade 1 phonics into more complex spelling patterns and early multisyllabic decoding.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Consonant Blends and Digraphs: 10–12 questions; mastery threshold 80%; Practice consonant blends and digraphs for decode long vowels, vowel teams, digraphs, blends, and multisyllable words.
  - Level 2: Long Vowels and Silent E: 10–12 questions; mastery threshold 80%; Practice long vowels and silent e for decode long vowels, vowel teams, digraphs, blends, and multisyllable words.
  - Level 3: Vowel Teams: 10–12 questions; mastery threshold 80%; Practice vowel teams for decode long vowels, vowel teams, digraphs, blends, and multisyllable words.
  - Level 4: Multisyllable Words: 10–12 questions; mastery threshold 80%; Practice multisyllable words for decode long vowels, vowel teams, digraphs, blends, and multisyllable words.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Advanced Phonics and Word Analysis targets.
- **Visual models**: `phonics_tiles`, `sound_boxes`, `word_builder`, `syllable_break`
- **Question types**: `multiple_choice`, `word_builder`, `sound_box_blend`, `decode_word`, `syllable_break`, `short_response`
- **Misconception tags**: `blend_digraph_confusion`, `silent_e_confusion`, `vowel_team_confusion`, `syllable_break_error`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-002 — G2E_RF_002 — Prefixes, Suffixes, and Base Words
- **Priority**: P0
- **Domain**: Reading Foundations / Vocabulary
- **Focus**: identify base words and common prefixes/suffixes
- **Learning purpose**: Help learners analyze meaningful word parts and use them to read and understand new words.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Base Words: 10–12 questions; mastery threshold 80%; Practice base words for identify base words and common prefixes/suffixes.
  - Level 2: Prefixes: 10–12 questions; mastery threshold 80%; Practice prefixes for identify base words and common prefixes/suffixes.
  - Level 3: Suffixes: 10–12 questions; mastery threshold 80%; Practice suffixes for identify base words and common prefixes/suffixes.
  - Level 4: Build and Decode New Words: 10–12 questions; mastery threshold 80%; Practice build and decode new words for identify base words and common prefixes/suffixes.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Prefixes, Suffixes, and Base Words targets.
- **Visual models**: `word_parts`, `morpheme_tiles`, `word_builder`
- **Question types**: `multiple_choice`, `word_part_identification`, `prefix_meaning`, `suffix_meaning`, `morpheme_builder`, `short_response`
- **Misconception tags**: `base_word_confusion`, `prefix_meaning_confusion`, `suffix_meaning_confusion`, `word_part_boundary_error`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-003 — G2E_FL_001 — Grade 2 Sight Words and Fluency
- **Priority**: P0
- **Domain**: Fluency
- **Focus**: read Grade 2 high-frequency words, phrases, and sentences fluently
- **Learning purpose**: Build automatic recognition, accurate phrase reading, and punctuation-aware sentence fluency.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Grade 2 Sight Word Set A: 10–12 questions; mastery threshold 80%; Practice grade 2 sight word set a for read Grade 2 high-frequency words, phrases, and sentences fluently.
  - Level 2: Grade 2 Sight Word Set B: 10–12 questions; mastery threshold 80%; Practice grade 2 sight word set b for read Grade 2 high-frequency words, phrases, and sentences fluently.
  - Level 3: Phrase Fluency: 10–12 questions; mastery threshold 80%; Practice phrase fluency for read Grade 2 high-frequency words, phrases, and sentences fluently.
  - Level 4: Sentence Fluency: 10–12 questions; mastery threshold 80%; Practice sentence fluency for read Grade 2 high-frequency words, phrases, and sentences fluently.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Grade 2 Sight Words and Fluency targets.
- **Visual models**: `word_card`, `phrase_builder`, `sentence_card`, `sentence_highlight`
- **Question types**: `sight_word_match`, `phrase_reading`, `sentence_cloze`, `punctuation_reading`, `sentence_picture_match`, `short_response`
- **Misconception tags**: `sight_word_automaticity_gap`, `phrase_chunking_error`, `skips_function_words`, `punctuation_ignored`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-004 — G2E_RC_001 — Ask and Answer Questions About Text
- **Priority**: P0
- **Domain**: Reading Comprehension
- **Focus**: answer who, what, where, when, why, and how questions using text evidence
- **Learning purpose**: Make comprehension answers accountable to details and evidence explicitly present in short text.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Who/What/Where: 10–12 questions; mastery threshold 80%; Practice who/what/where for answer who, what, where, when, why, and how questions using text evidence.
  - Level 2: When/Why/How: 10–12 questions; mastery threshold 80%; Practice when/why/how for answer who, what, where, when, why, and how questions using text evidence.
  - Level 3: Find Text Evidence: 10–12 questions; mastery threshold 80%; Practice find text evidence for answer who, what, where, when, why, and how questions using text evidence.
  - Level 4: Mixed Questions: 10–12 questions; mastery threshold 80%; Practice mixed questions for answer who, what, where, when, why, and how questions using text evidence.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Ask and Answer Questions About Text targets.
- **Visual models**: `short_passage`, `question_card`, `evidence_highlight`, `picture_story`
- **Question types**: `wh_question`, `text_evidence_choice`, `evidence_highlight`, `multiple_choice`, `short_response`
- **Misconception tags**: `unsupported_answer`, `question_word_confusion`, `misses_text_evidence`, `detail_inference_confusion`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-005 — G2E_RC_002 — Story Structure and Retelling
- **Priority**: P1
- **Domain**: Reading Comprehension
- **Focus**: identify characters, setting, problem, solution, and sequence of events
- **Learning purpose**: Help learners organize narrative information into story elements and coherent retells.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Characters and Setting: 10–12 questions; mastery threshold 80%; Practice characters and setting for identify characters, setting, problem, solution, and sequence of events.
  - Level 2: Problem and Solution: 10–12 questions; mastery threshold 80%; Practice problem and solution for identify characters, setting, problem, solution, and sequence of events.
  - Level 3: Beginning, Middle, End: 10–12 questions; mastery threshold 80%; Practice beginning, middle, end for identify characters, setting, problem, solution, and sequence of events.
  - Level 4: Retell the Story: 10–12 questions; mastery threshold 80%; Practice retell the story for identify characters, setting, problem, solution, and sequence of events.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Story Structure and Retelling targets.
- **Visual models**: `story_map`, `story_sequence`, `event_cards`, `picture_order`
- **Question types**: `story_element_identification`, `event_ordering`, `picture_order`, `sequence_select`, `retell_response`, `short_response`
- **Misconception tags**: `character_setting_confusion`, `problem_solution_confusion`, `sequence_order_error`, `retell_detail_gap`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-006 — G2E_RC_003 — Main Idea and Key Details
- **Priority**: P1
- **Domain**: Reading Comprehension
- **Focus**: identify the main idea and supporting details in informational text
- **Learning purpose**: Separate topic from main idea and train learners to connect details to the central idea.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Topic: 10–12 questions; mastery threshold 80%; Practice topic for identify the main idea and supporting details in informational text.
  - Level 2: Main Idea: 10–12 questions; mastery threshold 80%; Practice main idea for identify the main idea and supporting details in informational text.
  - Level 3: Key Details: 10–12 questions; mastery threshold 80%; Practice key details for identify the main idea and supporting details in informational text.
  - Level 4: Match Details to Main Idea: 10–12 questions; mastery threshold 80%; Practice match details to main idea for identify the main idea and supporting details in informational text.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Main Idea and Key Details targets.
- **Visual models**: `short_passage`, `main_idea_web`, `detail_cards`, `evidence_highlight`
- **Question types**: `topic_identification`, `main_idea_choice`, `detail_picker`, `detail_match`, `text_evidence_choice`, `short_response`
- **Misconception tags**: `topic_main_idea_confusion`, `detail_selection_error`, `unsupported_detail`, `main_idea_too_broad`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-007 — G2E_VOC_001 — Vocabulary and Context Clues
- **Priority**: P1
- **Domain**: Vocabulary
- **Focus**: use context, categories, synonyms, antonyms, and multiple-meaning words
- **Learning purpose**: Move vocabulary beyond isolated definitions into sentence context, semantic relationships, and categories.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Synonyms and Antonyms: 10–12 questions; mastery threshold 80%; Practice synonyms and antonyms for use context, categories, synonyms, antonyms, and multiple-meaning words.
  - Level 2: Context Clues: 10–12 questions; mastery threshold 80%; Practice context clues for use context, categories, synonyms, antonyms, and multiple-meaning words.
  - Level 3: Multiple-Meaning Words: 10–12 questions; mastery threshold 80%; Practice multiple-meaning words for use context, categories, synonyms, antonyms, and multiple-meaning words.
  - Level 4: Categories and Attributes: 10–12 questions; mastery threshold 80%; Practice categories and attributes for use context, categories, synonyms, antonyms, and multiple-meaning words.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Vocabulary and Context Clues targets.
- **Visual models**: `word_card`, `context_sentence`, `vocabulary_match`, `category_sort`
- **Question types**: `synonym_antonym_choice`, `context_clue_choice`, `multiple_meaning_choice`, `vocabulary_match`, `category_sort`, `short_response`
- **Misconception tags**: `context_clue_ignored`, `synonym_antonym_confusion`, `multiple_meaning_confusion`, `category_attribute_error`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-008 — G2E_WR_001 — Write Opinion Pieces
- **Priority**: P1
- **Domain**: Writing / Composition
- **Focus**: state an opinion, give reasons, and provide a closing
- **Learning purpose**: Scaffold a complete opinion paragraph with a clear claim, relevant reason, and closure.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: State an Opinion: 10–12 questions; mastery threshold 80%; Practice state an opinion for state an opinion, give reasons, and provide a closing.
  - Level 2: Give a Reason: 10–12 questions; mastery threshold 80%; Practice give a reason for state an opinion, give reasons, and provide a closing.
  - Level 3: Add a Closing: 10–12 questions; mastery threshold 80%; Practice add a closing for state an opinion, give reasons, and provide a closing.
  - Level 4: Build an Opinion Paragraph: 10–12 questions; mastery threshold 80%; Practice build an opinion paragraph for state an opinion, give reasons, and provide a closing.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Write Opinion Pieces targets.
- **Visual models**: `writing_checklist`, `sentence_builder`, `opinion_reason_chart`, `paragraph_builder`
- **Question types**: `sentence_builder`, `opinion_identification`, `reason_selection`, `closing_sentence_choice`, `constructed_sentence`, `rubric_scored_writing`
- **Misconception tags**: `missing_opinion`, `weak_reason`, `missing_closing`, `off_topic_response`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-009 — G2E_WR_002 — Write Informative/Explanatory Text
- **Priority**: P1
- **Domain**: Writing / Composition
- **Focus**: name a topic, supply facts, and provide closure
- **Learning purpose**: Guide learners to write focused informational text with topic, facts, linking words, and closure.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Name a Topic: 10–12 questions; mastery threshold 80%; Practice name a topic for name a topic, supply facts, and provide closure.
  - Level 2: Add Facts: 10–12 questions; mastery threshold 80%; Practice add facts for name a topic, supply facts, and provide closure.
  - Level 3: Use Linking Words: 10–12 questions; mastery threshold 80%; Practice use linking words for name a topic, supply facts, and provide closure.
  - Level 4: Build an Informative Paragraph: 10–12 questions; mastery threshold 80%; Practice build an informative paragraph for name a topic, supply facts, and provide closure.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Write Informative/Explanatory Text targets.
- **Visual models**: `writing_checklist`, `fact_cards`, `paragraph_builder`, `topic_detail_chart`
- **Question types**: `topic_sentence_choice`, `fact_selection`, `linking_word_choice`, `constructed_sentence`, `paragraph_builder`, `rubric_scored_writing`
- **Misconception tags**: `missing_topic`, `unsupported_fact`, `missing_linking_word`, `missing_closure`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

### G2E-P0-010 — G2E_WR_003 — Narrative Writing With Sequence
- **Priority**: P1
- **Domain**: Writing / Composition
- **Focus**: recount an event with order words, details, and closure
- **Learning purpose**: Support narrative recounting with temporal order words, relevant event details, and a closing sentence.
- **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Skill Practice Center level banks**:
  - Level 1: Sequence Words: 10–12 questions; mastery threshold 80%; Practice sequence words for recount an event with order words, details, and closure.
  - Level 2: Add Event Details: 10–12 questions; mastery threshold 80%; Practice add event details for recount an event with order words, details, and closure.
  - Level 3: Write Beginning/Middle/End: 10–12 questions; mastery threshold 80%; Practice write beginning/middle/end for recount an event with order words, details, and closure.
  - Level 4: Build a Narrative: 10–12 questions; mastery threshold 80%; Practice build a narrative for recount an event with order words, details, and closure.
  - Mixed: 10–12 questions; mastery threshold 80%; Interleave all Narrative Writing With Sequence targets.
- **Visual models**: `story_sequence`, `event_cards`, `paragraph_builder`, `writing_checklist`
- **Question types**: `sequence_select`, `event_ordering`, `detail_picker`, `constructed_sentence`, `narrative_builder`, `rubric_scored_writing`
- **Misconception tags**: `sequence_word_missing`, `event_order_error`, `missing_details`, `missing_closure`
- **Package acceptance**: production SkillPackage validates, renders without fallback placeholders, appears through manifest-driven Grade 2 English hub exposure, and includes all required Practice Center levels.

## Contractor-Ready Implementation Backlog
- **G2E-BL-001 (P0)**: Extend SkillPackage schema/runtime for Grade 2 English question types and metadata. Dependencies: none.
- **G2E-BL-002 (P0)**: Implement new Grade 2 English visual renderers. Dependencies: G2E-BL-001.
- **G2E-BL-003 (P0)**: Implement writing validation/rubric helpers for opinion, informative, and narrative responses. Dependencies: G2E-BL-001.
- **G2E-BL-004 (P0)**: Create first production package G2E_RF_001 and add manifest exposure. Dependencies: G2E-BL-001, G2E-BL-002.
- **G2E-BL-005 (P0)**: Create remaining P0 reading-foundations/fluency/comprehension packages. Dependencies: G2E-BL-004.
- **G2E-BL-006 (P1)**: Create vocabulary and writing production packages. Dependencies: G2E-BL-002, G2E-BL-003.
- **G2E-BL-007 (P1)**: Run manifest, generator, Practice Center, schema, accessibility, and responsive QA for every package. Dependencies: G2E-BL-004, G2E-BL-005, G2E-BL-006.

## Definition of Done for the Grade 2 English Production Run
- All ten SkillPackage files validate and include the full Guided Mission sequence.
- Every package has four focused Practice Center levels plus Mixed, with 10–12 questions per level bank.
- No package relies on generic fallback rendering for required visual models.
- Every package is discoverable through the Skill World manifest/hub flow and not through hardcoded placeholders.
- Writing packages use rubric/validation checks aligned to opinion, informative, and narrative expectations.
- Schema, renderer, manifest, generator, and responsive QA checks are run before claiming production readiness.
