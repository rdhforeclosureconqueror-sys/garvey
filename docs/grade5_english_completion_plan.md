# Grade 5 English Completion Plan (Skill World Production)

## Executive Summary
Grade 5 English must be built as production SkillPackage JSON, not as one-off games or placeholder cards. Grade 4 English is content-complete, so this plan defines the next Grade 5 English production skill map, renderer and schema readiness work, writing validation needs, voice/listen-audio requirements, manifest-driven hub exposure rules, and a contractor-ready backlog before any Grade 5 English packages are implemented.

This is a planning artifact only: it does not implement all Grade 5 English packages.

## Source Inputs Used
- `docs/grade1_english_completion_plan.md`
- `docs/grade2_english_completion_plan.md`
- `docs/grade3_english_completion_plan.md`
- `docs/grade4_english_completion_plan.md`
- `docs/skill-world-generator.md`
- `curriculum-framework/schemas/skill-package.schema.json`
- `public/gamehub/skill-world/engine/skill-package-schema.js`
- `public/gamehub/skill-world/renderers/visual-model-registry.js`
- `public/gamehub/skill-world/content/manifest.json`

## Production Standard for Every Grade 5 English SkillPackage
- SkillPackage JSON is the source of truth for skill content, question banks, level banks, misconceptions, lesson assets, theme metadata, voice metadata, and readiness checkpoint metadata.
- The Skill World generator produces the Guided Mission and Skill Practice Center; do not create one-off games or package-specific bespoke flows.
- Every Guided Mission follows Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center includes at least four focused levels plus Mixed; each focused level and Mixed contains 10-12 production questions.
- Packages are exposed through manifest-driven hub discovery, not hardcoded Grade 5 English cards or placeholder routes.
- Every production package includes full voice support, cached AI audio route compatibility through /api/skill-world/audio, and browser speech fallback.
- No Grade 5 English package may ship with placeholder cards, stub questions, or temporary copy.

## Guided Mission Contract
Every Grade 5 English production skill must generate this mission sequence from package JSON: **Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile**.

## Skill Practice Center Contract
- At least four focused levels plus one Mixed level.
- Each focused level has 10–12 real questions.
- Mixed has 10–12 real questions.
- Every question includes a supported `question_type`, a `misconception_tag`, validation data, feedback, voice metadata, and no placeholder copy.

## Existing Renderer Support Decision
**Decision: partial support.** Existing Grades 1–4 English renderer support can support most Grade 5 English production needs. Current runtime support already covers word analysis, roots and affixes, fluency, vocabulary, figurative language, text evidence, character/theme work, text features, text structures, writing charts, dialogue, grammar highlighting, and sentence combining. Grade 5 English still needs one reusable visual model before full production: `compare_texts_panel`.

### Reusable renderers for Grade 5 English
- `character_trait_chart`
- `context_sentence`
- `detail_cards`
- `dialogue_builder`
- `event_cards`
- `evidence_highlight`
- `fact_cards`
- `figurative_language_card`
- `fluency_meter`
- `grammar_highlight`
- `main_idea_web`
- `morpheme_tiles`
- `opinion_reason_chart`
- `paragraph_builder`
- `phrase_builder`
- `punctuation_marker`
- `question_card`
- `sentence_builder`
- `sentence_card`
- `sentence_combiner`
- `sentence_highlight`
- `short_passage`
- `story_map`
- `story_sequence`
- `syllable_break`
- `text_evidence_builder`
- `text_feature_map`
- `text_structure_chart`
- `theme_tracker`
- `topic_detail_chart`
- `vocabulary_match`
- `word_builder`
- `word_parts`
- `word_scale`
- `writing_checklist`

### New renderers required
- `compare_texts_panel` — displays two short texts or source panels side by side with shared topic, key details, evidence slots, compare/contrast prompts, and synthesis guidance for integrating information from multiple texts or features.

## Schema and Runtime Updates Needed
- Add `compare_texts_panel` to the SkillPackage schema/runtime visual model allowlist and visual model registry before authoring G5E_RC_003 dependent items.
- Confirm Grade 5 English reuses existing visual models already present in the Grade 4 English runtime: `figurative_language_card`, `text_structure_chart`, `fluency_meter`, `text_evidence_builder`, `character_trait_chart`, `theme_tracker`, `text_feature_map`, `dialogue_builder`, `grammar_highlight`, and `sentence_combiner`.
- Keep validation strict for Grade 5 literacy `level_banks`: exactly the four named focused levels plus Mixed for this plan, 10-12 questions per level, stable level ids, mastery threshold metadata, and no placeholder cards.
- Confirm question-type handling for `multiple_choice`, `short_response`, `word_building`, `sentence_completion`, `vocabulary_match`, `text_evidence`, `sequencing`, `detail_match`, `writing_response`, and `editing`.
- Add or document Grade 5 English metadata for syllable divisions, roots/affixes, morphology, fluency phrasing, expression cues, context clue spans, figurative language labels, adages/proverbs, evidence spans, narrator point of view, text structures, text features, source integration, writing rubric dimensions, grammar targets, and acceptable answer forms.
- Require stable audio keys/text fields for page narration, question narration, listen audio, cached AI audio, and browser fallback text in every package.

## Writing Validation Needs
- Opinion writing validation must check for a clear opinion, logically ordered reasons, relevant evidence, linking words/phrases, and a conclusion.
- Informative writing validation must check topic introduction, accurate facts/definitions/details, formatting or linking words when prompted, domain vocabulary, and a conclusion.
- Narrative writing validation must check event sequence, pacing, descriptive details, dialogue conventions, transitions, and closure.
- Grammar/conventions validation must support conjunctions, prepositions, interjections, verb tense consistency, commas, quotation marks, punctuation, spelling patterns, fragments/run-ons, and sentence combining quality.
- Short-response and writing-response validation should run deterministic rubric checks first, then optional review hooks only when privacy, safety, and teacher-review policies are defined.
- Text-evidence responses must validate selected or cited evidence spans, quote accuracy, and distinguish supported inference from unsupported guessing.

## Voice Narration Requirements
- Read This Page is required on every Guided Mission screen: Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
- Read Question is required on mission Practice, Challenge, and Checkpoint questions.
- Read Question is required on every Skill Practice Center question across all focused levels and Mixed.
- Listen audio is required where pronunciation, fluency, vocabulary, sentence reading, passage reading, or writing examples improve the task.
- Cached AI audio must be compatible with POST /api/skill-world/audio by supplying stable audio keys and speakable text.
- Browser speech fallback must read the same page, question, and listen text when cached AI audio is unavailable or disabled.
- Narration copy must be production copy and should speak punctuation, quotation marks, roots/affixes, idioms, adages, proverbs, quoted evidence, and writing examples naturally.

## Passage and Listen Audio Needs
- Word-analysis packages need listen audio for multisyllable words, roots, affixes, syllable breaks, and word-building examples.
- Fluency packages need listenable model sentences/passages for accuracy, phrasing, punctuation, expression, and repeated reading with meaning.
- Vocabulary packages need listen audio for target words, idioms, similes, metaphors, adages, proverbs, example sentences, and shades-of-meaning comparisons.
- Reading comprehension/literature/informational packages need listen audio for short passages, question stems, evidence options, selected quoted text spans, and paired text panels.
- Writing and language packages need listen audio for model sentences, dialogue, paragraph examples, editing prompts, and sentence-combining options.

## Grade 5 English Skill Map
### G5E_RF_001 — Multisyllable Word Reading, Roots, and Affixes
- **Domain:** Reading Foundations / Word Analysis
- **Focus:** decode and understand multisyllable words using Greek/Latin roots, affixes, syllables, and morphology
- **Level banks:**
  - Level 1: Syllable Patterns
  - Level 2: Prefixes and Suffixes
  - Level 3: Greek and Latin Roots
  - Level 4: Decode Multisyllable Words
  - Mixed: Mixed
- **Visual models:** `syllable_break`, `word_parts`, `morpheme_tiles`, `word_builder`
- **Question types:** `multiple_choice`, `short_response`, `word_building`
- **Misconception tags:** `syllable_division_error`, `affix_meaning_confusion`, `root_meaning_confusion`, `multisyllable_guessing`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_FL_001 — Reading Fluency and Expression With Complex Text
- **Domain:** Fluency
- **Focus:** read grade-level prose and informational text with accuracy, rate, phrasing, and expression
- **Level banks:**
  - Level 1: Accuracy
  - Level 2: Phrasing and Rate
  - Level 3: Punctuation and Expression
  - Level 4: Repeated Reading With Meaning
  - Mixed: Mixed
- **Visual models:** `sentence_card`, `sentence_highlight`, `phrase_builder`, `fluency_meter`
- **Question types:** `multiple_choice`, `short_response`, `sentence_completion`
- **Misconception tags:** `skips_words`, `phrase_chunking_error`, `punctuation_ignored`, `expression_flat_reading`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_VOC_001 — Vocabulary, Context Clues, and Figurative Language
- **Domain:** Vocabulary / Language
- **Focus:** determine word meaning using context, roots/affixes, synonyms/antonyms, idioms, similes, metaphors, adages, and proverbs
- **Level banks:**
  - Level 1: Context Clues
  - Level 2: Roots, Affixes, and Word Relationships
  - Level 3: Synonyms, Antonyms, and Shades
  - Level 4: Figurative Language, Adages, and Proverbs
  - Mixed: Mixed
- **Visual models:** `context_sentence`, `vocabulary_match`, `word_scale`, `figurative_language_card`
- **Question types:** `multiple_choice`, `short_response`, `vocabulary_match`
- **Misconception tags:** `context_clue_ignored`, `literal_vs_figurative_confusion`, `adage_proverb_confusion`, `shade_of_meaning_confusion`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_RC_001 — Quote Accurately and Use Text Evidence
- **Domain:** Reading Comprehension
- **Focus:** quote accurately from a text and answer literal/inferential questions using evidence
- **Level banks:**
  - Level 1: Literal Questions
  - Level 2: Inferential Questions
  - Level 3: Quote Text Evidence
  - Level 4: Explain With Evidence
  - Mixed: Mixed
- **Visual models:** `short_passage`, `question_card`, `evidence_highlight`, `text_evidence_builder`
- **Question types:** `multiple_choice`, `short_response`, `text_evidence`
- **Misconception tags:** `unsupported_answer`, `inference_without_evidence`, `inaccurate_quote`, `misses_text_evidence`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_RC_002 — Theme, Character, and Story Structure
- **Domain:** Reading Literature
- **Focus:** compare characters, settings, events, themes, narrator point of view, and story structure
- **Level banks:**
  - Level 1: Characters and Settings
  - Level 2: Plot and Story Structure
  - Level 3: Theme and Character Response
  - Level 4: Point of View and Comparison
  - Mixed: Mixed
- **Visual models:** `story_map`, `character_trait_chart`, `event_cards`, `theme_tracker`
- **Question types:** `multiple_choice`, `short_response`, `sequencing`, `text_evidence`
- **Misconception tags:** `character_trait_confusion`, `theme_detail_confusion`, `point_of_view_confusion`, `story_structure_confusion`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_RC_003 — Main Idea, Text Structure, and Integrating Information
- **Domain:** Reading Informational Text
- **Focus:** determine main idea, summarize key details, compare text structures, and integrate information from multiple texts/features
- **Level banks:**
  - Level 1: Main Idea and Summary
  - Level 2: Key Details and Evidence
  - Level 3: Text Structure and Features
  - Level 4: Integrate Information
  - Mixed: Mixed
- **Visual models:** `short_passage`, `main_idea_web`, `detail_cards`, `text_feature_map`, `text_structure_chart`, `compare_texts_panel`
- **Question types:** `multiple_choice`, `short_response`, `text_evidence`, `detail_match`
- **Misconception tags:** `topic_main_idea_confusion`, `summary_too_detailed`, `text_structure_confusion`, `integration_error`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_WR_001 — Opinion Writing With Reasons and Evidence
- **Domain:** Writing / Composition
- **Focus:** write opinion pieces with reasons, evidence, linking words, and conclusion
- **Level banks:**
  - Level 1: State an Opinion
  - Level 2: Support With Reasons and Evidence
  - Level 3: Linking Words and Conclusion
  - Level 4: Build Opinion Essay
  - Mixed: Mixed
- **Visual models:** `opinion_reason_chart`, `paragraph_builder`, `writing_checklist`, `sentence_builder`
- **Question types:** `multiple_choice`, `short_response`, `writing_response`, `sentence_completion`
- **Misconception tags:** `missing_opinion`, `weak_reason`, `missing_evidence`, `missing_conclusion`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_WR_002 — Informative Writing With Facts, Definitions, and Details
- **Domain:** Writing / Composition
- **Focus:** write informative/explanatory text with topic, facts, definitions, details, formatting, linking words, and conclusion
- **Level banks:**
  - Level 1: Choose a Topic
  - Level 2: Add Facts, Definitions, and Details
  - Level 3: Organize With Linking Words and Formatting
  - Level 4: Build Informative Essay
  - Mixed: Mixed
- **Visual models:** `topic_detail_chart`, `fact_cards`, `paragraph_builder`, `writing_checklist`
- **Question types:** `multiple_choice`, `short_response`, `writing_response`, `sentence_completion`
- **Misconception tags:** `missing_topic`, `unsupported_fact`, `missing_detail`, `weak_organization`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_WR_003 — Narrative Writing With Dialogue, Description, and Pacing
- **Domain:** Writing / Composition
- **Focus:** write narratives with sequence, dialogue, description, pacing, transitions, and closure
- **Level banks:**
  - Level 1: Sequence Events
  - Level 2: Add Description and Pacing
  - Level 3: Dialogue and Transitions
  - Level 4: Build Narrative
  - Mixed: Mixed
- **Visual models:** `story_sequence`, `event_cards`, `paragraph_builder`, `dialogue_builder`
- **Question types:** `multiple_choice`, `short_response`, `writing_response`, `sequencing`
- **Misconception tags:** `event_order_error`, `missing_description`, `dialogue_punctuation_error`, `pacing_gap`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

### G5E_LANG_001 — Grammar, Conventions, and Sentence Combining
- **Domain:** Language
- **Focus:** use conjunctions, prepositions, interjections, verb tense consistency, commas, quotation marks, punctuation, spelling patterns, and sentence combining
- **Level banks:**
  - Level 1: Capitalization, Punctuation, and Spelling
  - Level 2: Commas and Quotation Marks
  - Level 3: Grammar and Verb Tense
  - Level 4: Sentence Combining and Style
  - Mixed: Mixed
- **Visual models:** `sentence_builder`, `punctuation_marker`, `grammar_highlight`, `sentence_combiner`
- **Question types:** `multiple_choice`, `short_response`, `sentence_completion`, `editing`
- **Misconception tags:** `punctuation_error`, `verb_tense_error`, `comma_usage_error`, `sentence_fragment`
- **Level bank design:** each focused level and Mixed must contain 10–12 production questions with validation data, feedback, voice metadata, and misconception tagging.

## Question Type Backlog
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

## Contractor-Ready Backlog
### 1 Renderer Schema Readiness
- Add and test `compare_texts_panel` as a reusable visual model, not a one-off game.
- Update visual-model allowlists/schema/runtime registry for `compare_texts_panel`.
- Verify all listed Grade 5 question types render and validate in Guided Mission and Skill Practice Center contexts.
- Document item metadata requirements for quote accuracy, source integration, writing rubrics, morphology, and listen audio.

### 2 Package Authoring
- Author production SkillPackage JSON for each of the 10 Grade 5 English skills.
- For every package, create Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile content.
- For every package, author four focused level banks plus Mixed with 10-12 production questions per level.
- Attach supported visual models, question types, misconception tags, validation data, feedback, and voice metadata to every item.

### 3 Voice Audio
- Add Read This Page text and audio keys for every guided mission screen.
- Add Read Question text and audio keys for mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions.
- Add Listen audio assets/keys for fluency, vocabulary, sentence reading, passage reading, pronunciation, dialogue, and writing-example items.
- Verify cached AI audio compatibility through `/api/skill-world/audio` and browser speech fallback parity.

### 4 Manifest Hub Exposure
- Register completed packages in the Skill World content manifest only after package validation passes.
- Verify hub cards are manifest-driven and do not use hardcoded Grade 5 English placeholders.
- Confirm no package ships as a one-off game or placeholder card.

### 5 Validation Qa
- Run JSON validation for each SkillPackage and this plan JSON.
- Run Skill World generator smoke tests for Guided Mission and Skill Practice Center for all Grade 5 English packages.
- Run renderer smoke tests for all Grade 5 visual models, especially `compare_texts_panel`.
- Run voice QA for cached audio, browser fallback, Read This Page, Read Question, and Listen audio coverage.
- Run content QA for grade appropriateness, misconception coverage, evidence accuracy, writing rubric behavior, and no placeholder copy.

## Acceptance Checklist
- [x] Grade 5 English plan exists as `docs/grade5_english_completion_plan.md`.
- [x] Optional machine-readable plan exists as `curriculum-framework/plans/grade5-english-completion-plan.v1.json`.
- [x] Plan uses the same production standard as earlier grades: SkillPackage JSON, Skill World generator, Guided Mission, Skill Practice Center, manifest-driven hub exposure, full voice, cached AI audio compatibility, browser fallback, no one-off games, and no placeholder cards.
- [x] Skill IDs are defined for all recommended Grade 5 English skills.
- [x] Each skill has level_banks design with four focused levels plus Mixed.
- [x] Renderer needs are listed, including new `compare_texts_panel`.
- [x] Question types and misconception tags are listed for each skill.
- [x] Voice requirements, passage/listen audio needs, writing validation needs, and schema updates are listed.
- [x] Contractor-ready backlog exists.
- [x] Plan JSON validates with `python -m json.tool curriculum-framework/plans/grade5-english-completion-plan.v1.json`.
