# Grade 4 English Completion Plan (Skill World Production)
## Executive Summary
Grade 4 English must be built as production SkillPackage JSON, not as one-off games or placeholder cards. This plan defines the Grade 4 English production skill map, Guided Mission requirements, Skill Practice Center requirements, renderer and schema gaps, writing validation needs, voice and listen-audio requirements, manifest-driven hub exposure, and a contractor-ready backlog before Grade 4 English packages are implemented.
This is a planning artifact only: it does not implement all Grade 4 English packages.
## Source Inputs Used
- `docs/grade1_english_completion_plan.md`
- `docs/grade2_english_completion_plan.md`
- `docs/grade3_english_completion_plan.md`
- `docs/grade4_math_completion_plan.md`
- `docs/skill-world-generator.md`
- `curriculum-framework/schemas/skill-package.schema.json`
- `public/gamehub/skill-world/engine/skill-package-schema.js`
- `public/gamehub/skill-world/renderers/visual-model-registry.js`
- `public/gamehub/skill-world/content/manifest.json`

## Production Standard for Every Grade 4 English SkillPackage
- SkillPackage JSON is the source of truth for skill content, question banks, level banks, misconceptions, lesson assets, theme metadata, voice metadata, and readiness checkpoint metadata.
- The Skill World generator produces the Guided Mission and Skill Practice Center; do not create one-off games or package-specific bespoke flows.
- Every Guided Mission follows Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center includes at least four focused levels plus Mixed; each focused level and Mixed contains 10-12 production questions.
- Packages are exposed through manifest-driven hub discovery, not hardcoded Grade 4 English cards or placeholder routes.
- Every production package includes full voice support, cached AI audio route compatibility through /api/skill-world/audio, and browser speech fallback.

## Guided Mission Contract
Every Grade 4 English production skill must generate this mission sequence from package JSON: **Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile**.

## Skill Practice Center Contract
- At least four focused levels plus one Mixed level.
- Each focused level has 10–12 real questions.
- Mixed has 10–12 real questions.
- Every question includes a supported `question_type`, a `misconception_tag`, validation data, feedback, voice metadata, and no placeholder copy.

## Existing Renderer Support Decision
**Decision: partial support.** Existing Grades 1–3 English plus Grade 4+ Skill World renderer support can support most Grade 4 English production needs. The runtime already includes the Grade 3 literacy extensions for fluency, evidence construction, character/theme work, text features, dialogue, grammar highlighting, and sentence combining. Grade 4 English still needs two reusable visual models before full production: `figurative_language_card` and `text_structure_chart`.

### Reusable renderers for Grade 4 English
- `character_trait_chart`
- `context_sentence`
- `detail_cards`
- `dialogue_builder`
- `event_cards`
- `evidence_highlight`
- `fact_cards`
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
- `theme_tracker`
- `topic_detail_chart`
- `vocabulary_match`
- `word_builder`
- `word_parts`
- `word_scale`
- `writing_checklist`

### New renderers required
- `figurative_language_card` — displays idiom, simile, metaphor, literal meaning, figurative meaning, and context evidence without becoming a one-off vocabulary game.
- `text_structure_chart` — displays cause/effect, compare/contrast, problem/solution, sequence, and description structures with signal words and evidence slots.

## Schema and Runtime Updates Needed
- Add `figurative_language_card` and `text_structure_chart` to the SkillPackage schema/runtime visual model allowlist and the visual model registry before authoring dependent packages.
- Confirm Grade 4 English reuses existing visual models already present in the Grade 3+ runtime: `fluency_meter`, `word_scale`, `text_evidence_builder`, `character_trait_chart`, `theme_tracker`, `text_feature_map`, `dialogue_builder`, `grammar_highlight`, and `sentence_combiner`.
- Keep validation strict for literacy `level_banks`: exactly the four named focused levels plus Mixed for this plan, 10-12 questions per level, stable level ids, mastery threshold metadata, and no placeholder cards.
- Confirm question-type handling for `multiple_choice`, `short_response`, `word_building`, `sentence_completion`, `vocabulary_match`, `text_evidence`, `sequencing`, `detail_match`, `writing_response`, and `editing`.
- Add or document Grade 4 English item metadata for syllable divisions, affixes, roots, vowel patterns, fluency phrasing, expression cues, context clue spans, figurative language labels, evidence spans, text structures, text features, writing rubric dimensions, grammar targets, and acceptable answer forms.
- Require stable audio keys/text fields for page narration, question narration, listen audio, cached AI audio, and browser fallback text in every package.

## Writing Validation Needs
- Opinion writing validation must check for a clear opinion, aligned reasons, relevant evidence, linking words, and a conclusion.
- Informative writing validation must check for topic introduction, accurate facts/definitions/details, useful formatting or linking words when prompted, and a conclusion.
- Narrative writing validation must check event sequence, transitions, descriptive details, dialogue conventions when prompted, and closure.
- Grammar/conventions validation must support capitalization, punctuation, commas, quotation marks, relative pronouns/adverbs, progressive verb tenses, prepositional phrases, fragments, and sentence combining quality.
- Short-response and writing-response validation should run deterministic rubric checks first, then optional review hooks only when privacy, safety, and teacher-review policies are defined.
- Text-evidence responses must validate selected or cited evidence spans and distinguish supported inference from unsupported guessing.

## Voice Narration Requirements
- Read This Page is required on every Guided Mission screen: Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
- Read Question is required on mission Practice, Challenge, and Checkpoint questions.
- Read Question is required on every Skill Practice Center question across all focused levels and Mixed.
- Listen audio is required where pronunciation, fluency, vocabulary, sentence reading, or passage reading improves the task.
- Cached AI audio must be compatible with POST /api/skill-world/audio by supplying stable audio keys and speakable text.
- Browser speech fallback must read the same page, question, and listen text when cached AI audio is unavailable or disabled.
- Narration copy must be production copy and should speak punctuation, quotation marks, roots/affixes, idioms, and text evidence prompts naturally.

## Passage and Listen Audio Needs
- Fluency packages need listenable model sentences/passages for accuracy, phrasing, punctuation, expression, and repeated reading.
- Vocabulary packages need listen audio for target words, idioms, similes, metaphors, example sentences, and shades-of-meaning comparisons.
- Reading comprehension/literature/informational packages need listen audio for short passages, question stems, evidence options, and selected text spans.
- Writing and language packages need listen audio for model sentences, dialogue, paragraph examples, editing prompts, and sentence-combining options.

## Manifest and Hub Exposure Requirements
- Completed packages must be added to the Skill World content manifest only after package validation passes.
- Hub exposure must be manifest-driven and must not rely on hardcoded Grade 4 English cards.
- Do not ship placeholder cards, static coming-soon routes, or links to legacy one-off activities as Grade 4 English production coverage.
- Manifest metadata should include grade, subject, domain, skill id, title, package path, voice readiness, level-bank readiness, and renderer coverage status.

## Grade 4 English Skill Map

### G4E_RF_001 — Advanced Word Analysis and Multisyllable Decoding
- **Domain:** Reading Foundations / Phonics
- **Focus:** decode multisyllable words using syllables, prefixes, suffixes, roots, and vowel patterns
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Syllable Types — 10–12 questions; mastery threshold 80%.
  - Level 2: Prefixes and Suffixes — 10–12 questions; mastery threshold 80%.
  - Level 3: Roots and Word Parts — 10–12 questions; mastery threshold 80%.
  - Level 4: Multisyllable Decoding — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `syllable_break`, `word_parts`, `morpheme_tiles`, `word_builder`
- **Question types:** `multiple_choice`, `short_response`, `word_building`
- **Misconception tags:** `syllable_division_error`, `prefix_suffix_confusion`, `root_meaning_confusion`, `multisyllable_guessing`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_FL_001 — Reading Fluency, Accuracy, and Expression
- **Domain:** Fluency
- **Focus:** read grade-level text with accuracy, phrasing, pacing, and expression
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Accuracy — 10–12 questions; mastery threshold 80%.
  - Level 2: Phrasing — 10–12 questions; mastery threshold 80%.
  - Level 3: Punctuation and Expression — 10–12 questions; mastery threshold 80%.
  - Level 4: Repeated Reading — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `sentence_card`, `sentence_highlight`, `phrase_builder`, `fluency_meter`
- **Question types:** `multiple_choice`, `short_response`, `sentence_completion`
- **Misconception tags:** `skips_words`, `punctuation_ignored`, `phrase_chunking_error`, `expression_flat_reading`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_VOC_001 — Vocabulary, Context Clues, and Figurative Language
- **Domain:** Vocabulary / Language
- **Focus:** use context clues, affixes/roots, synonyms/antonyms, idioms, similes, metaphors, and shades of meaning
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Context Clues — 10–12 questions; mastery threshold 80%.
  - Level 2: Word Parts and Meanings — 10–12 questions; mastery threshold 80%.
  - Level 3: Synonyms, Antonyms, and Shades — 10–12 questions; mastery threshold 80%.
  - Level 4: Figurative Language — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `context_sentence`, `vocabulary_match`, `word_scale`, `figurative_language_card`
- **Question types:** `multiple_choice`, `short_response`, `vocabulary_match`
- **Misconception tags:** `context_clue_ignored`, `affix_meaning_confusion`, `literal_vs_figurative_confusion`, `shade_of_meaning_confusion`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_RC_001 — Ask and Answer Questions With Text Evidence
- **Domain:** Reading Comprehension
- **Focus:** answer literal and inferential questions using evidence from the text
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Literal Questions — 10–12 questions; mastery threshold 80%.
  - Level 2: Inferential Questions — 10–12 questions; mastery threshold 80%.
  - Level 3: Find Text Evidence — 10–12 questions; mastery threshold 80%.
  - Level 4: Explain Your Answer — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `short_passage`, `question_card`, `evidence_highlight`, `text_evidence_builder`
- **Question types:** `multiple_choice`, `short_response`, `text_evidence`
- **Misconception tags:** `unsupported_answer`, `inference_without_evidence`, `misses_text_evidence`, `question_word_confusion`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_RC_002 — Story Elements, Theme, and Character Analysis
- **Domain:** Reading Literature
- **Focus:** identify character, setting, plot, theme, point of view, and character response
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Characters and Setting — 10–12 questions; mastery threshold 80%.
  - Level 2: Plot and Problem/Solution — 10–12 questions; mastery threshold 80%.
  - Level 3: Character Traits and Point of View — 10–12 questions; mastery threshold 80%.
  - Level 4: Theme / Lesson — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `story_map`, `character_trait_chart`, `event_cards`, `theme_tracker`
- **Question types:** `multiple_choice`, `short_response`, `sequencing`, `text_evidence`
- **Misconception tags:** `character_trait_confusion`, `point_of_view_confusion`, `theme_detail_confusion`, `sequence_order_error`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_RC_003 — Main Idea, Key Details, and Text Structure
- **Domain:** Reading Informational Text
- **Focus:** determine main idea, summarize key details, identify text structure, and use text features
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Topic and Main Idea — 10–12 questions; mastery threshold 80%.
  - Level 2: Key Details and Summary — 10–12 questions; mastery threshold 80%.
  - Level 3: Text Structure — 10–12 questions; mastery threshold 80%.
  - Level 4: Text Features — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `short_passage`, `main_idea_web`, `detail_cards`, `text_feature_map`, `text_structure_chart`
- **Question types:** `multiple_choice`, `short_response`, `text_evidence`, `detail_match`
- **Misconception tags:** `topic_main_idea_confusion`, `detail_selection_error`, `text_structure_confusion`, `text_feature_confusion`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_WR_001 — Opinion Writing With Reasons and Evidence
- **Domain:** Writing / Composition
- **Focus:** write opinion pieces with reasons, evidence, linking words, and conclusion
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: State an Opinion — 10–12 questions; mastery threshold 80%.
  - Level 2: Support With Reasons and Evidence — 10–12 questions; mastery threshold 80%.
  - Level 3: Linking Words and Conclusion — 10–12 questions; mastery threshold 80%.
  - Level 4: Build Opinion Paragraph — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `opinion_reason_chart`, `paragraph_builder`, `writing_checklist`, `sentence_builder`
- **Question types:** `multiple_choice`, `short_response`, `writing_response`, `sentence_completion`
- **Misconception tags:** `missing_opinion`, `weak_reason`, `missing_evidence`, `missing_conclusion`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_WR_002 — Informative Writing With Facts and Details
- **Domain:** Writing / Composition
- **Focus:** write informative/explanatory text with topic, facts, definitions, details, formatting, and conclusion
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Choose a Topic — 10–12 questions; mastery threshold 80%.
  - Level 2: Add Facts, Definitions, and Details — 10–12 questions; mastery threshold 80%.
  - Level 3: Use Linking Words and Formatting — 10–12 questions; mastery threshold 80%.
  - Level 4: Build Informative Paragraph — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `topic_detail_chart`, `fact_cards`, `paragraph_builder`, `writing_checklist`
- **Question types:** `multiple_choice`, `short_response`, `writing_response`, `sentence_completion`
- **Misconception tags:** `missing_topic`, `unsupported_fact`, `missing_detail`, `missing_conclusion`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_WR_003 — Narrative Writing With Dialogue and Description
- **Domain:** Writing / Composition
- **Focus:** write narratives with sequence, dialogue, description, transitions, and closure
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Sequence Events — 10–12 questions; mastery threshold 80%.
  - Level 2: Add Description — 10–12 questions; mastery threshold 80%.
  - Level 3: Dialogue and Transitions — 10–12 questions; mastery threshold 80%.
  - Level 4: Build Narrative — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `story_sequence`, `event_cards`, `paragraph_builder`, `dialogue_builder`
- **Question types:** `multiple_choice`, `short_response`, `writing_response`, `sequencing`
- **Misconception tags:** `event_order_error`, `missing_description`, `dialogue_punctuation_error`, `missing_closure`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

### G4E_LANG_001 — Grammar, Conventions, and Sentence Combining
- **Domain:** Language
- **Focus:** use capitalization, punctuation, commas, quotation marks, relative pronouns/adverbs, progressive verb tenses, prepositional phrases, and sentence combining
- **Guided Mission:** Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile
- **Level banks:**
  - Level 1: Capitalization and Punctuation — 10–12 questions; mastery threshold 80%.
  - Level 2: Commas and Quotation Marks — 10–12 questions; mastery threshold 80%.
  - Level 3: Grammar and Verb Tense — 10–12 questions; mastery threshold 80%.
  - Level 4: Sentence Combining — 10–12 questions; mastery threshold 80%.
  - Mixed — 10–12 questions; mastery threshold 80%.
- **Visual models:** `sentence_builder`, `punctuation_marker`, `grammar_highlight`, `sentence_combiner`
- **Question types:** `multiple_choice`, `short_response`, `sentence_completion`, `editing`
- **Misconception tags:** `capitalization_error`, `punctuation_error`, `verb_tense_error`, `sentence_fragment`
- **Voice/listen notes:** Read This Page on all mission screens; Read Question on mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions; add Listen audio when passage, sentence, word, fluency, or pronunciation modeling helps.

## Contractor-Ready Backlog
- **G4E-BLK-001 (P0) — Schema/runtime contracts:** Add `figurative_language_card` and `text_structure_chart`; confirm all Grade 4 English question types and audio metadata fields validate.
- **G4E-BLK-002 (P0) — Renderer implementation:** Implement reusable `figurative_language_card` and `text_structure_chart` renderers with fixtures, accessibility labels, and voice-friendly text surfaces.
- **G4E-BLK-003 (P0) — Voice and cached audio:** Ensure Read This Page, Read Question, Listen audio, /api/skill-world/audio compatibility, and browser fallback work for all Grade 4 English mission and practice surfaces.
- **G4E-BLK-004 (P0) — Writing validation:** Extend deterministic writing and editing validation for Grade 4 opinion, informative, narrative, grammar, conventions, and sentence-combining tasks.
- **G4E-BLK-005 (P1) — Package production:** Author the ten Grade 4 English SkillPackage JSON files with guided mission content, level banks, misconception coverage, review banks, and no placeholder questions.
- **G4E-BLK-006 (P1) — Manifest/hub exposure:** Add completed packages to the content manifest only after validation passes so the hub discovers them from manifest metadata rather than hardcoded cards.
- **G4E-BLK-007 (P1) — QA and accessibility:** Run schema validation, content linting, audio fallback checks, keyboard checks, screen-reader label checks, and package-level smoke tests for every skill.

## Readiness Checkpoints Before Package Production
- `python -m json.tool curriculum-framework/plans/grade4-english-completion-plan.v1.json` passes.
- The schema/runtime recognizes all Grade 4 English visual models and question types.
- `figurative_language_card` and `text_structure_chart` renderer fixtures pass accessibility and voice review.
- Writing validation rubrics are defined before `writing_response` packages are hub-exposed.
- Every authored package passes schema validation, level-bank count checks, voice metadata checks, cached-audio compatibility checks, and manifest discovery checks.
