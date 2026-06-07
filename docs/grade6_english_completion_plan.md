# Grade 6 English Completion Plan (Skill World Production)

## Executive Summary

Grade 6 English must be built as production SkillPackage JSON, not as one-off games or placeholder cards. Grades 1-5 English are content-complete, so this plan defines the Grade 6 English production skill map, renderer/schema readiness work, writing validation needs, passage and Listen-audio requirements, acceptable-answer rules, source/evidence validation needs, manifest-driven hub exposure rules, and a contractor-ready backlog before any Grade 6 English packages are implemented.

This is a planning artifact only: it does not implement Grade 6 English packages.

## Source Inputs Reviewed

- `docs/grade1_english_completion_plan.md`
- `docs/grade2_english_completion_plan.md`
- `docs/grade3_english_completion_plan.md`
- `docs/grade4_english_completion_plan.md`
- `docs/grade5_english_completion_plan.md`
- `docs/skill-world-generator.md`
- `curriculum-framework/schemas/skill-package.schema.json`
- `public/gamehub/skill-world/engine/skill-package-schema.js`
- `public/gamehub/skill-world/renderers/visual-model-registry.js`
- `public/gamehub/skill-world/content/manifest.json`

## Production Standard for Every Grade 6 English SkillPackage

- SkillPackage JSON is the source of truth for skill content, question banks, level banks, misconceptions, lesson assets, theme metadata, voice metadata, validation metadata, and readiness checkpoint metadata.
- The Skill World generator produces the Guided Mission and Skill Practice Center; do not create one-off games or package-specific bespoke flows.
- Every Guided Mission follows Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile.
- Every Skill Practice Center includes at least four focused levels plus Mixed; each focused level and Mixed contains 10-12 production questions.
- Packages are exposed through manifest-driven hub discovery, not hardcoded Grade 6 English cards or placeholder routes.
- Every production package includes full voice support, cached AI audio route compatibility through /api/skill-world/audio, and browser speech fallback.
- No Grade 6 English package may ship with placeholder cards, stub questions, temporary copy, or one-off game screens.

## Guided Mission Contract

Every Grade 6 English production skill must generate this mission sequence from package JSON: **Story -> Lesson -> Watch -> Demo -> Practice -> Challenge -> Checkpoint -> Badge -> Profile**.

Each guided screen must include production page copy, `Read This Page` text/audio metadata, cached-AI-audio-compatible keys when available, and browser speech fallback text. Mission Practice, Challenge, and Checkpoint questions must also include `Read Question` metadata.

## Skill Practice Center Contract

- At least four focused levels plus one Mixed level.
- Each focused level has 10-12 real questions.
- Mixed has 10-12 real questions.
- Every question includes a supported `question_type`, a `misconception_tag`, validation data, feedback, voice metadata, acceptable answers, and no placeholder copy.
- Every Skill Practice question includes `Read Question`; Listen audio is added where passages, vocabulary, fluency, sentence reading, writing examples, or grammar support benefit the learner.

## Existing Grades 1-5 Renderer Support Review

**Decision: partial support.** Existing Grades 1-5 English renderer/runtime support covers most Grade 6 needs: morphology and word parts, sentence and passage reading, fluency, vocabulary, figurative language, text evidence, story/literature organizers, informational text structure, writing charts, dialogue, grammar highlighting, and sentence combining. Runtime validation already includes `compare_texts_panel`, which supports Grade 6 source integration. Grade 6 still needs one new reusable renderer before full writing package production: `evidence_builder`.

### Reusable renderers for Grade 6 English

- `character_trait_chart`
- `compare_texts_panel`
- `context_sentence`
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

### New renderer required

- `evidence_builder` — lets learners assemble a claim/topic, reasons or facts, quoted/paraphrased evidence, source reference, explanation, transition, and conclusion in one reusable writing-support visual. This must be a general Skill World renderer, not a one-off game.

## Schema and Runtime Updates Needed

- Add `evidence_builder` to the runtime visual model allowlist, visual model registry, renderer fixtures, and any schema documentation before authoring G6E_WR_001 dependent items.
- Confirm `compare_texts_panel` remains in runtime visual model support for G6E_RC_003 source integration and paired-source items.
- Update or document the static SkillPackage schema question_type enum so Grade 6 English package validation accepts `multiple_choice`, `short_response`, `word_building`, `sentence_completion`, `vocabulary_match`, `text_evidence`, `sequencing`, `detail_match`, `writing_response`, and `editing`.
- Require stable `level_banks` metadata: exactly the four named focused levels plus Mixed for each skill in this plan, 10-12 production questions per level, stable ids, difficulty, mastery threshold, misconception coverage, and no placeholders.
- Add metadata conventions for roots/affixes, syllable divisions, fluency phrasing marks, expression cues, context clue spans, connotation scales, figurative language labels, quoted evidence spans, source ids, source citation text, central idea details, theme details, point-of-view evidence, writing rubric dimensions, grammar targets, and acceptable answer forms.
- Require stable audio keys/text fields for page narration, question narration, Listen audio, cached AI audio compatibility, and browser fallback text in every package.

## Grade 6 Writing-Validation Requirements

- Argument writing validation should check for claim present, reasons present, relevant evidence present, source reference present where required, organization, transitions, and conclusion without requiring adult-level essay length.
- Informative writing validation should check topic and details, accurate facts/definitions/quotations, source reference present where required, organization, transitions, objective tone, and conclusion.
- Narrative writing validation should check narrative sequence, pacing cues, dialogue punctuation, description, transitions, closure, and point-of-view consistency.
- Language/conventions validation should check pronoun agreement/reference, verb tense consistency, capitalization, punctuation, complete sentences, sentence fragments, and sentence-combining quality.
- Open-ended writing must use child-friendly rule-based checks, acceptable sample answers, and positive feedback; it must not over-penalize spelling variation, brief but valid responses, or developmentally appropriate wording.
- Writing-response validation should separate must-have checks from coaching checks so learners can pass with a clear valid answer while still receiving suggestions for stronger evidence, transitions, style, or elaboration.

### Required writing-validation dimensions

- `claim present`
- `reasons present`
- `evidence present`
- `source reference present where required`
- `organization`
- `transitions`
- `conclusion`
- `topic and details`
- `objective tone where appropriate`
- `narrative sequence`
- `dialogue punctuation`
- `point-of-view consistency`
- `pronoun agreement`
- `verb tense consistency`
- `capitalization`
- `punctuation`
- `complete sentences`

## Acceptable-Answer Rules

- Multiple-choice and matching items use exact answer ids or labels.
- Short responses use normalized text matching with lowercase, trimmed whitespace, punctuation tolerance, common synonym lists, acceptable sample answers, and misconception-specific feedback.
- Text-evidence items validate selected span ids, quoted text accuracy within a small punctuation/capitalization tolerance, and whether the evidence supports the claim or inference.
- Writing responses use rubric flags and sample-answer patterns rather than a single exact answer.
- Do not fail an otherwise correct open-ended answer only because it is shorter than an exemplar; require only the child-friendly essentials for the task.

## Source Quotation and Evidence Validation Needs

- Each passage or source panel should have stable source_id, title, passage_id, paragraph ids, sentence ids, and evidence span ids.
- Evidence prompts should identify whether learners may quote, paraphrase, or select a span; validation should check support strength rather than exact adult phrasing.
- Quotation checks should tolerate minor punctuation/capitalization errors while flagging omitted key words, invented details, or evidence from the wrong source.
- Source-integration tasks should require at least two source references only when the item prompt explicitly asks for multiple sources.
- Feedback should explain whether the evidence proves the answer, partly supports it, or is unrelated.

## Voice and Listen-Audio Requirements

- Read This Page is required on every Guided Mission screen: Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile.
- Read Question is required on every mission Practice, Challenge, and Checkpoint question.
- Read Question is required on every Skill Practice Center question across all four focused levels and Mixed.
- Listen audio is required where passages, vocabulary, fluency, sentence reading, writing examples, grammar support, quoted evidence, source panels, or dialogue benefit comprehension.
- Cached AI audio must be compatible with POST /api/skill-world/audio by supplying stable audio keys and speakable text.
- Browser speech fallback must read the same page, question, and Listen text when cached AI audio is unavailable or disabled.
- Narration copy must be production copy and should speak punctuation, quotation marks, roots/affixes, figurative phrases, academic vocabulary, source titles, quoted evidence, and writing examples naturally.

## Passage and Listen-Audio Requirements

- Word-analysis packages need Listen audio for multisyllable words, syllable breaks, roots, affixes, morpheme tiles, and word-building examples.
- Fluency packages need listenable model sentences and Grade 6 literary/informational passages for accuracy, phrasing, punctuation, expression, pace, and repeated reading for meaning.
- Vocabulary packages need Listen audio for target words, academic words, domain-specific words, context sentences, figurative language examples, connotation scales, and roots/affixes.
- Reading comprehension, literature, and informational packages need Listen audio for passages, paired sources, question stems, evidence options, selected quoted spans, and source titles.
- Writing and language packages need Listen audio for model claims, evidence explanations, quotations, source references, informative paragraphs, narrative dialogue, editing prompts, grammar examples, and sentence-combining options.

## Recommended Grade 6 English Package Map

### 1. G6E_RF_001 — Morphology, Roots, and Complex Word Analysis

**Domain:** Word Analysis / Language

**Focus:** Analyze Greek and Latin roots, prefixes, suffixes, syllables, and word relationships to decode and understand complex words.

**Levels:**
- Syllables and Morphology
- Prefixes and Suffixes
- Greek and Latin Roots
- Complex Word Analysis
- Mixed

**Visual models:**
- `syllable_break`
- `word_parts`
- `morpheme_tiles`
- `word_builder`

**Question types:**
- `multiple_choice`
- `short_response`
- `word_building`

**Misconceptions:**
- `syllable_division_error`
- `affix_meaning_confusion`
- `root_meaning_confusion`
- `morphology_guessing`

### 2. G6E_FL_001 — Fluency With Literary and Informational Text

**Domain:** Fluency

**Focus:** Read Grade 6 text accurately, smoothly, with appropriate phrasing, pace, expression, and meaning.

**Levels:**
- Accuracy
- Phrasing and Pace
- Expression and Punctuation
- Repeated Reading and Meaning
- Mixed

**Visual models:**
- `sentence_card`
- `sentence_highlight`
- `phrase_builder`
- `fluency_meter`

**Question types:**
- `multiple_choice`
- `short_response`
- `sentence_completion`

**Misconceptions:**
- `skips_words`
- `phrase_chunking_error`
- `punctuation_ignored`
- `expression_flat_reading`

### 3. G6E_VOC_001 — Academic Vocabulary and Figurative Language

**Domain:** Vocabulary / Language

**Focus:** Use context, roots, affixes, word relationships, figurative language, connotation, and domain-specific vocabulary.

**Levels:**
- Context and Academic Vocabulary
- Roots and Affixes
- Connotation and Word Relationships
- Figurative and Domain-Specific Language
- Mixed

**Visual models:**
- `context_sentence`
- `vocabulary_match`
- `word_scale`
- `figurative_language_card`

**Question types:**
- `multiple_choice`
- `short_response`
- `vocabulary_match`

**Misconceptions:**
- `context_clue_ignored`
- `connotation_confusion`
- `literal_vs_figurative_confusion`
- `domain_word_confusion`

### 4. G6E_RC_001 — Cite Textual Evidence and Make Inferences

**Domain:** Reading Comprehension

**Focus:** Cite textual evidence to support literal understanding and inferences.

**Levels:**
- Literal Understanding
- Make Inferences
- Cite Evidence
- Explain Reasoning
- Mixed

**Visual models:**
- `short_passage`
- `evidence_highlight`
- `question_card`
- `text_evidence_builder`

**Question types:**
- `multiple_choice`
- `short_response`
- `text_evidence`

**Misconceptions:**
- `unsupported_answer`
- `inference_without_evidence`
- `inaccurate_quote`
- `weak_explanation`

### 5. G6E_RC_002 — Theme, Character, Plot, and Point of View

**Domain:** Reading Literature

**Focus:** Analyze theme, characters, plot development, narrator point of view, and how details shape meaning.

**Levels:**
- Character and Setting
- Plot and Conflict
- Theme and Character Change
- Point of View and Structure
- Mixed

**Visual models:**
- `story_map`
- `character_trait_chart`
- `event_cards`
- `theme_tracker`

**Question types:**
- `multiple_choice`
- `short_response`
- `sequencing`
- `text_evidence`

**Misconceptions:**
- `character_trait_confusion`
- `theme_detail_confusion`
- `plot_conflict_confusion`
- `point_of_view_confusion`

### 6. G6E_RC_003 — Central Idea, Text Structure, and Source Integration

**Domain:** Reading Informational Text

**Focus:** Determine central idea, summarize objectively, analyze structure, and integrate information from multiple sources.

**Levels:**
- Central Idea
- Objective Summary
- Text Structure and Features
- Integrate Multiple Sources
- Mixed

**Visual models:**
- `short_passage`
- `main_idea_web`
- `text_structure_chart`
- `text_feature_map`
- `compare_texts_panel`

**Question types:**
- `multiple_choice`
- `short_response`
- `text_evidence`
- `detail_match`

**Misconceptions:**
- `topic_central_idea_confusion`
- `summary_opinion_error`
- `text_structure_confusion`
- `source_integration_error`

### 7. G6E_WR_001 — Argument Writing With Claims and Evidence

**Domain:** Writing / Composition

**Focus:** Write arguments with clear claims, relevant evidence, logical reasons, transitions, and conclusion.

**Levels:**
- State a Claim
- Add Reasons and Evidence
- Organize and Use Transitions
- Build an Argument Essay
- Mixed

**Visual models:**
- `opinion_reason_chart`
- `paragraph_builder`
- `writing_checklist`
- `evidence_builder`

**Question types:**
- `multiple_choice`
- `short_response`
- `writing_response`
- `sentence_completion`

**Misconceptions:**
- `missing_claim`
- `weak_reason`
- `unsupported_evidence`
- `missing_conclusion`

### 8. G6E_WR_002 — Informative Writing and Source-Based Explanation

**Domain:** Writing / Composition

**Focus:** Write informative text using facts, definitions, details, quotations, formatting, and source information.

**Levels:**
- Introduce a Topic
- Facts, Definitions, and Quotations
- Organization and Transitions
- Build an Informative Essay
- Mixed

**Visual models:**
- `topic_detail_chart`
- `fact_cards`
- `paragraph_builder`
- `writing_checklist`

**Question types:**
- `multiple_choice`
- `short_response`
- `writing_response`
- `sentence_completion`

**Misconceptions:**
- `missing_topic`
- `unsupported_fact`
- `weak_source_use`
- `weak_organization`

### 9. G6E_WR_003 — Narrative Writing With Pacing and Point of View

**Domain:** Writing / Composition

**Focus:** Write narratives using sequence, dialogue, description, pacing, transitions, point of view, and closure.

**Levels:**
- Sequence and Point of View
- Description and Pacing
- Dialogue and Transitions
- Build a Narrative
- Mixed

**Visual models:**
- `story_sequence`
- `event_cards`
- `dialogue_builder`
- `paragraph_builder`

**Question types:**
- `multiple_choice`
- `short_response`
- `writing_response`
- `sequencing`

**Misconceptions:**
- `event_order_error`
- `point_of_view_shift`
- `dialogue_punctuation_error`
- `pacing_gap`

### 10. G6E_LANG_001 — Grammar, Usage, Conventions, and Style

**Domain:** Language

**Focus:** Use pronouns correctly, maintain verb tense, use punctuation and commas, vary sentence structure, combine sentences, and improve style.

**Levels:**
- Grammar and Pronoun Usage
- Verb Tense and Agreement
- Punctuation and Conventions
- Sentence Combining and Style
- Mixed

**Visual models:**
- `sentence_builder`
- `punctuation_marker`
- `grammar_highlight`
- `sentence_combiner`

**Question types:**
- `multiple_choice`
- `short_response`
- `sentence_completion`
- `editing`

**Misconceptions:**
- `pronoun_reference_error`
- `verb_tense_error`
- `punctuation_error`
- `sentence_fragment`

## Contractor-Ready Implementation Backlog

### 1_renderer_schema_readiness (P0)
- Implement and test `evidence_builder` as a reusable visual model with accessibility labels, keyboard-safe evidence chips, source labels, claim/reason/evidence/explanation slots, and voice-friendly text surfaces.
- Update runtime visual-model allowlists, renderer registry, fixtures, and schema documentation for `evidence_builder`; verify `compare_texts_panel` support for paired sources.
- Bring static SkillPackage schema question-type documentation into parity with runtime validation for all Grade 6 English question types.
- Document metadata requirements for source ids, passage ids, paragraph/sentence/span ids, quote accuracy, source integration, writing rubric flags, morphology fields, fluency cues, and Listen audio.

### 2_validation_contracts (P0)
- Define child-friendly deterministic writing validators for argument, informative, narrative, grammar, usage, conventions, and style tasks.
- Add acceptable-answer rule patterns for short_response, text_evidence, writing_response, editing, sequencing, vocabulary_match, and word_building items.
- Define source quotation validation behavior including tolerance for punctuation/capitalization and feedback for unsupported or inaccurate evidence.
- Confirm open-ended writing does not over-penalize developmental wording, short valid answers, or harmless spelling variation.

### 3_package_authoring_order (P1)
- Author packages in dependency order: G6E_RF_001, G6E_FL_001, G6E_VOC_001, G6E_RC_001, G6E_RC_002, G6E_RC_003, G6E_WR_001, G6E_WR_002, G6E_WR_003, G6E_LANG_001.
- For every package, create Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile content from SkillPackage JSON.
- For every package, author four focused level banks plus Mixed with 10-12 real questions per level.
- Attach supported visual models, question types, misconception tags, validation data, feedback, acceptable answers, voice metadata, and Listen audio metadata to every item.

### 4_voice_audio (P1)
- Add Read This Page text and audio keys for every guided mission screen.
- Add Read Question text and audio keys for mission Practice, Challenge, Checkpoint, and all Skill Practice Center questions.
- Add Listen audio assets/keys for passages, vocabulary, fluency models, sentence reading, writing examples, grammar support, dialogue, and evidence/source panels.
- Verify cached AI audio compatibility through `/api/skill-world/audio` and browser speech fallback parity.

### 5_manifest_hub_exposure (P1)
- Register completed packages in the Skill World content manifest only after package validation passes.
- Verify hub cards are manifest-driven and do not use hardcoded Grade 6 English placeholders.
- Confirm no package ships as a one-off game or placeholder card.

### 6_validation_qa (P1)
- Run JSON validation for each SkillPackage and this plan JSON.
- Run Skill World generator smoke tests for Guided Mission and Skill Practice Center for all Grade 6 English packages.
- Run renderer smoke tests for all Grade 6 visual models, especially `evidence_builder` and `compare_texts_panel`.
- Run voice QA for cached audio, browser fallback, Read This Page, Read Question, and Listen audio coverage.
- Run content QA for grade appropriateness, passage quality, source/evidence accuracy, writing rubric behavior, misconception coverage, accessibility, and no placeholder copy.

## Contractor-Ready Implementation Order

1. `G6E_RF_001`
2. `G6E_FL_001`
3. `G6E_VOC_001`
4. `G6E_RC_001`
5. `G6E_RC_002`
6. `G6E_RC_003`
7. `G6E_WR_001`
8. `G6E_WR_002`
9. `G6E_WR_003`
10. `G6E_LANG_001`

## Acceptance Criteria

- Markdown plan exists at `docs/grade6_english_completion_plan.md`.
- JSON plan exists at `curriculum-framework/plans/grade6-english-completion-plan.v1.json` and validates with `python -m json.tool`.
- All 10 package IDs are defined.
- Domains, levels, visuals, question types, and misconceptions are defined for every package.
- Voice and Listen requirements are documented.
- Writing-validation requirements are documented.
- Renderer/schema backlog exists.
- Contractor-ready implementation order exists.
- No Grade 6 package implementation occurs in this task.
