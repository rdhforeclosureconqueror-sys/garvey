# Grade 1 English Completion Plan (Skill World MVP)
## Executive Summary
This plan starts Grade 1 English production using the same SkillPackage JSON, Skill World generator, Guided Mission flow, and Skill Practice Center contract used for Grade 1 Math. It is a planning and backlog artifact only: it does not create legacy placeholder cards, one-off games, or the ten production packages yet.
The production target is a coherent Grade 1 English skill set spanning Reading Foundations, Phonics, Sight Words / Fluency, Reading Comprehension, and Writing / Composition. Each future package must be discoverable through the Skill World manifest/hub path rather than hardcoded curriculum placeholders.
## Source Inputs Used
- `docs/grade1_math_completion_plan.md`
- `docs/skill-world-generator.md`
- `curriculum-framework/schemas/skill-package.schema.json`
- `curriculum-framework/skill-graphs/grade1/reading-english/graph.v1.json`
- `public/gamehub/skill-world/content/manifest.json`
- `public/gamehub/skill-world/content/G1M_OP_003.skill-package.v1.json`
## Product Contract for Every Production English SkillPackage
Every Grade 1 English SkillPackage must meet the same production standard as Grade 1 Math:

1. **Guided Mission**: Story → Lesson → Watch → Demo → Practice → Challenge → Checkpoint → Badge → Profile.
2. **Skill Practice Center**: at least four focused levels plus Mixed. Each level must contain 10–12 questions and a mastery threshold.
3. **Manifest/hub exposure**: package files are added to the Skill World content manifest and surfaced from manifest metadata, not hardcoded placeholders.
4. **No legacy placeholders**: do not create cards that simply route to old static content or say “coming soon.”
5. **No one-off games**: all interactions must be generated from SkillPackage JSON and supported renderer/question-type contracts.
## Schema and Runtime Fit Assessment
### Can the existing Math SkillPackage schema support English as-is?
**Partially, but not production-complete as-is.** The top-level SkillPackage shape is subject-neutral enough for English: `skill_id`, `grade`, `subject`, `domain`, `skill`, lesson metadata, guided practice, adaptive bank, checkpoint, misconception bank, review bank, game theme, and level banks all apply directly. The existing generator flow also already maps cleanly to a literacy mission.

However, the current schema question-type enum is math-centric and must be extended before validating production English packages. English visual models can be represented as strings, but production rendering should add explicit visual renderers so English packages do not fall back to placeholder text. Writing/composition also needs response-normalization and rubric hooks beyond exact-answer short response.
### Required schema/runtime changes before English package implementation
- Extend `question_type` support for literacy interactions: `letter_identification`, `sound_match`, `picture_choice`, `sound_position`, `same_different_sound`, `word_builder`, `sound_box_blend`, `decode_word`, `word_family_sort`, `rhyme_match`, `sight_word_match`, `sentence_cloze`, `phrase_reading`, `sentence_picture_match`, `punctuation_reading`, `wh_question`, `text_evidence_choice`, `event_ordering`, `picture_order`, `sequence_select`, `capitalization_fix`, `spacing_fix`, `punctuation_choice`, `constructed_sentence`, `picture_prompt_response`, `detail_picker`, and `rubric_scored_writing`.
- Add English visual renderers listed below so packages render intentional literacy supports instead of generic fallback cards.
- Add answer validation modes for English: case-insensitive exact match, punctuation-tolerant matching where appropriate, acceptable spelling variants for early writing, sentence-boundary checks, and simple rubric scoring for constructed writing.
- Add optional item fields for literacy media/metadata when implemented: `target_letter`, `target_sound`, `word`, `phonemes`, `graphemes`, `picture_asset`, `passage`, `sentence`, `rubric`, and `evidence_span`.
- Ensure Practice Center mixed banks can draw across literacy item families without assuming numeric answers.
## English Visual Renderer Backlog
- `letter_card`
- `sound_match`
- `visual_objects`
- `picture_choice`
- `word_sound_map`
- `phonics_tiles`
- `sound_boxes`
- `word_builder`
- `word_family_sort`
- `rhyme_match`
- `word_card`
- `sentence_highlight`
- `phrase_builder`
- `sentence_card`
- `sentence_builder`
- `short_passage`
- `picture_story`
- `question_card`
- `story_sequence`
- `picture_order`
- `event_cards`
- `writing_checklist`
- `punctuation_marker`
- `picture_prompt`
- `detail_picker`

## English Question Type Backlog
- `multiple_choice`
- `letter_identification`
- `sound_match`
- `picture_choice`
- `short_response`
- `sound_position`
- `same_different_sound`
- `word_builder`
- `sound_box_blend`
- `decode_word`
- `word_family_sort`
- `rhyme_match`
- `sight_word_match`
- `sentence_cloze`
- `phrase_reading`
- `sentence_picture_match`
- `punctuation_reading`
- `text_evidence_choice`
- `wh_question`
- `event_ordering`
- `picture_order`
- `sequence_select`
- `sentence_builder`
- `capitalization_fix`
- `spacing_fix`
- `punctuation_choice`
- `constructed_sentence`
- `picture_prompt_response`
- `detail_picker`
- `rubric_scored_writing`

## Production Skill Map and Backlog
### G1E-P0-001 — G1E_RF_001 — Letter Recognition and Sounds
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Reading Foundations
- **Skill title**: Letter Recognition and Sounds
- **Standards gap / learning purpose**: Build print-concept readiness by identifying uppercase and lowercase letters and connecting common graphemes to common letter sounds.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `letter_card`, `sound_match`, `visual_objects`
- **Question types needed**: `multiple_choice`, `letter_identification`, `sound_match`, `picture_choice`, `short_response`
- **Misconception tags needed**: `letter_name_confusion`, `uppercase_lowercase_confusion`, `sound_symbol_confusion`, `visually_similar_letter_confusion`
- **Level banks design**:
  - `G1E_RF_001_LVL1` — **Level 1: Uppercase Letters**: Identify named uppercase letters from letter cards. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_001_LVL2` — **Level 2: Lowercase Letters**: Identify named lowercase letters from letter cards. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_001_LVL3` — **Level 3: Letter Sounds**: Choose or say the common sound for a target letter. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_001_LVL4` — **Level 4: Match Letter to Sound**: Match printed letters to a spoken/common sound cue. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_001_MIXED` — **Mixed**: Interleave uppercase, lowercase, sound, and match tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-002 — G1E_RF_002 — Phonemic Awareness: Beginning, Middle, Ending Sounds
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Reading Foundations
- **Skill title**: Phonemic Awareness: Beginning, Middle, Ending Sounds
- **Standards gap / learning purpose**: Develop oral sound awareness by hearing and identifying sound positions in spoken CVC and familiar one-syllable words.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `sound_match`, `picture_choice`, `word_sound_map`
- **Question types needed**: `multiple_choice`, `picture_choice`, `sound_position`, `same_different_sound`, `short_response`
- **Misconception tags needed**: `beginning_sound_confusion`, `ending_sound_confusion`, `middle_sound_confusion`, `sound_position_confusion`
- **Level banks design**:
  - `G1E_RF_002_LVL1` — **Level 1: Beginning Sounds**: Identify the first sound in spoken/pictured words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_002_LVL2` — **Level 2: Ending Sounds**: Identify the final sound in spoken/pictured words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_002_LVL3` — **Level 3: Middle Vowel Sounds**: Identify the medial short vowel sound in simple words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_002_LVL4` — **Level 4: Same/Different Sounds**: Compare words for same or different beginning, middle, or ending sounds. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RF_002_MIXED` — **Mixed**: Interleave beginning, middle, ending, and compare-sound tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-003 — G1E_PH_001 — CVC Word Blending
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Phonics
- **Skill title**: CVC Word Blending
- **Standards gap / learning purpose**: Connect phonemic awareness to decoding by blending consonant-vowel-consonant words with short vowel patterns.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `phonics_tiles`, `sound_boxes`, `word_builder`
- **Question types needed**: `multiple_choice`, `word_builder`, `sound_box_blend`, `decode_word`, `short_response`
- **Misconception tags needed**: `blending_order_error`, `vowel_sound_confusion`, `final_sound_drop`, `guessing_from_first_letter`
- **Level banks design**:
  - `G1E_PH_001_LVL1` — **Level 1: Short A CVC**: Blend and read short-a CVC words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_001_LVL2` — **Level 2: Short I/O CVC**: Blend and read short-i and short-o CVC words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_001_LVL3` — **Level 3: Short E/U CVC**: Blend and read short-e and short-u CVC words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_001_LVL4` — **Level 4: Mixed CVC Blending**: Blend across all five short vowels. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_001_MIXED` — **Mixed**: Interleave decoding, picture match, and word-building CVC tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-004 — G1E_PH_002 — Short Vowel Word Families
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Phonics
- **Skill title**: Short Vowel Word Families
- **Standards gap / learning purpose**: Strengthen onset-rime decoding and spelling transfer by reading and building common short-vowel word families.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `word_family_sort`, `phonics_tiles`, `rhyme_match`
- **Question types needed**: `multiple_choice`, `word_family_sort`, `rhyme_match`, `word_builder`, `short_response`
- **Misconception tags needed**: `rime_confusion`, `vowel_family_confusion`, `onset_rime_blend_error`, `word_family_overgeneralization`
- **Level banks design**:
  - `G1E_PH_002_LVL1` — **Level 1: -at / -an Families**: Read, sort, and build -at and -an family words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_002_LVL2` — **Level 2: -it / -ig Families**: Read, sort, and build -it and -ig family words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_002_LVL3` — **Level 3: -op / -ot Families**: Read, sort, and build -op and -ot family words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_002_LVL4` — **Level 4: Mixed Word Families**: Compare and decode across taught word families. Required questions: 10. Mastery threshold: 80%.
  - `G1E_PH_002_MIXED` — **Mixed**: Interleave sort, rhyme, build, and read tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-005 — G1E_SW_001 — Sight Words and High-Frequency Words
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Fluency
- **Skill title**: Sight Words and High-Frequency Words
- **Standards gap / learning purpose**: Build automatic recognition of common Grade 1 words, especially irregular/function words needed for sentence fluency.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `word_card`, `sentence_highlight`, `phrase_builder`
- **Question types needed**: `multiple_choice`, `sight_word_match`, `sentence_cloze`, `phrase_reading`, `short_response`
- **Misconception tags needed**: `sight_word_reversal`, `guesses_by_shape`, `function_word_confusion`, `word_automaticity_gap`
- **Level banks design**:
  - `G1E_SW_001_LVL1` — **Level 1: Set A Sight Words**: Recognize first high-frequency word set in isolation. Required questions: 10. Mastery threshold: 80%.
  - `G1E_SW_001_LVL2` — **Level 2: Set B Sight Words**: Recognize second high-frequency word set in isolation. Required questions: 10. Mastery threshold: 80%.
  - `G1E_SW_001_LVL3` — **Level 3: Match Word to Sentence**: Choose the sight word that completes a sentence. Required questions: 10. Mastery threshold: 80%.
  - `G1E_SW_001_LVL4` — **Level 4: Read Phrase Fluently**: Read short phrases containing taught sight words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_SW_001_MIXED` — **Mixed**: Interleave word recognition, sentence cloze, and phrase tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-006 — G1E_FL_001 — Sentence Reading Fluency
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Fluency
- **Skill title**: Sentence Reading Fluency
- **Standards gap / learning purpose**: Support accurate, meaningful reading of simple sentences with attention to word order, small words, and punctuation.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `sentence_card`, `picture_choice`, `sentence_builder`
- **Question types needed**: `multiple_choice`, `sentence_picture_match`, `sentence_cloze`, `punctuation_reading`, `short_response`
- **Misconception tags needed**: `skips_small_words`, `punctuation_ignored`, `sentence_meaning_mismatch`, `word_order_confusion`
- **Level banks design**:
  - `G1E_FL_001_LVL1` — **Level 1: Read Simple Sentences**: Read decodable/simple sentences accurately. Required questions: 10. Mastery threshold: 80%.
  - `G1E_FL_001_LVL2` — **Level 2: Match Sentence to Picture**: Match sentence meaning to a picture. Required questions: 10. Mastery threshold: 80%.
  - `G1E_FL_001_LVL3` — **Level 3: Complete the Sentence**: Choose a missing word that makes sense. Required questions: 10. Mastery threshold: 80%.
  - `G1E_FL_001_LVL4` — **Level 4: Read with Punctuation**: Use period, question mark, and exclamation mark cues. Required questions: 10. Mastery threshold: 80%.
  - `G1E_FL_001_MIXED` — **Mixed**: Interleave read, match, complete, and punctuation tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-007 — G1E_RC_001 — Answer Who, What, Where Questions
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Reading Comprehension
- **Skill title**: Answer Who, What, Where Questions
- **Standards gap / learning purpose**: Develop basic literal comprehension by locating people/characters, actions/things, and places in a short text or picture story.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `short_passage`, `picture_story`, `question_card`
- **Question types needed**: `multiple_choice`, `text_evidence_choice`, `picture_choice`, `short_response`, `wh_question`
- **Misconception tags needed**: `who_what_confusion`, `where_detail_confusion`, `unsupported_answer`, `misses_text_evidence`
- **Level banks design**:
  - `G1E_RC_001_LVL1` — **Level 1: Who Questions**: Answer who questions from pictures and short texts. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_001_LVL2` — **Level 2: What Questions**: Answer what happened/what is it questions. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_001_LVL3` — **Level 3: Where Questions**: Answer where questions from explicit details. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_001_LVL4` — **Level 4: Mixed Detail Questions**: Distinguish who, what, and where questions. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_001_MIXED` — **Mixed**: Interleave picture-story and short-passage detail questions. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-008 — G1E_RC_002 — Story Sequence: Beginning, Middle, End
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Reading Comprehension
- **Skill title**: Story Sequence: Beginning, Middle, End
- **Standards gap / learning purpose**: Build retell and narrative structure by identifying and ordering beginning, middle, and ending events.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `story_sequence`, `picture_order`, `event_cards`
- **Question types needed**: `multiple_choice`, `event_ordering`, `picture_order`, `sequence_select`, `short_response`
- **Misconception tags needed**: `sequence_order_error`, `beginning_end_confusion`, `missing_middle_event`, `retell_detail_gap`
- **Level banks design**:
  - `G1E_RC_002_LVL1` — **Level 1: Beginning**: Identify what happens first. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_002_LVL2` — **Level 2: Middle**: Identify the middle/main event after the beginning. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_002_LVL3` — **Level 3: End**: Identify how the story ends. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_002_LVL4` — **Level 4: Put Events in Order**: Order three story events. Required questions: 10. Mastery threshold: 80%.
  - `G1E_RC_002_MIXED` — **Mixed**: Interleave B/M/E identification and event-ordering tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-009 — G1E_WR_001 — Write a Simple Sentence
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Writing / Composition
- **Skill title**: Write a Simple Sentence
- **Standards gap / learning purpose**: Produce complete simple sentences with capitalization, word spacing, and end punctuation.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `sentence_builder`, `writing_checklist`, `punctuation_marker`
- **Question types needed**: `sentence_builder`, `capitalization_fix`, `spacing_fix`, `punctuation_choice`, `constructed_sentence`
- **Misconception tags needed**: `missing_capital`, `missing_spacing`, `missing_punctuation`, `fragment_response`
- **Level banks design**:
  - `G1E_WR_001_LVL1` — **Level 1: Capital Letters**: Identify and fix sentence-start capitals. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_001_LVL2` — **Level 2: Word Spacing**: Identify and fix spacing between words. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_001_LVL3` — **Level 3: End Punctuation**: Choose or add correct end punctuation. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_001_LVL4` — **Level 4: Complete Sentence**: Build or write a complete sentence. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_001_MIXED` — **Mixed**: Interleave capitalization, spacing, punctuation, and complete-sentence tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

### G1E-P0-010 — G1E_WR_002 — Describe a Picture with a Sentence
- **Priority**: P0
- **Grade**: 1
- **Subject**: English
- **Domain**: Writing / Composition
- **Skill title**: Describe a Picture with a Sentence
- **Standards gap / learning purpose**: Generate a meaningful sentence about a picture by naming the subject, adding an action, and including a concrete detail.
- **Recommended action**: Create a production SkillPackage JSON with full Guided Mission, Skill Practice Center level banks, misconception bank, review bank, and manifest entry.
- **Visual models needed**: `picture_prompt`, `sentence_builder`, `detail_picker`
- **Question types needed**: `picture_prompt_response`, `detail_picker`, `sentence_builder`, `constructed_sentence`, `rubric_scored_writing`
- **Misconception tags needed**: `incomplete_description`, `missing_action`, `vague_detail`, `sentence_fragment`
- **Level banks design**:
  - `G1E_WR_002_LVL1` — **Level 1: Name the Picture**: Name the main person, animal, object, or place. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_002_LVL2` — **Level 2: Add an Action**: Add what the subject is doing. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_002_LVL3` — **Level 3: Add a Detail**: Add color, place, size, feeling, or other observable detail. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_002_LVL4` — **Level 4: Write a Full Sentence**: Write a full sentence about the picture. Required questions: 10. Mastery threshold: 80%.
  - `G1E_WR_002_MIXED` — **Mixed**: Interleave naming, action, detail, and full-sentence writing tasks. Required questions: 12. Mastery threshold: 80%.
- **Acceptance criteria**:
  - SkillPackage includes required top-level metadata, lesson fields, worked examples, hint ladder, guided practice, adaptive question bank, checkpoint, misconception bank, review bank, game theme, next/remediation skill IDs, and level banks.
  - Guided Mission renders Story, Lesson, Watch, Demo, Practice, Challenge, Checkpoint, Badge, and Profile without placeholder copy.
  - Skill Practice Center includes four focused levels plus Mixed; each level contains 10–12 production questions aligned to its focus.
  - Every question includes a supported question type, prompt, answer or rubric data, visual model where useful, hints/feedback, and misconception tag.
  - Package is added to the Skill World manifest/hub source so learners discover it through manifest data rather than hardcoded placeholders.

## Implementation Sequence
1. **P0 Runtime enablement**: extend schema/question types, add English visual renderers, and add writing validation/rubric support.
2. **P0 Foundations and phonics**: implement `G1E_RF_001`, `G1E_RF_002`, `G1E_PH_001`, and `G1E_PH_002` first because later fluency and comprehension packages depend on these skills.
3. **P0 Fluency**: implement `G1E_SW_001` and `G1E_FL_001` after decodable word and sight-word renderer support is stable.
4. **P0 Comprehension**: implement `G1E_RC_001` and `G1E_RC_002` after passage/picture-story renderers and evidence metadata are available.
5. **P0 Writing**: implement `G1E_WR_001` and `G1E_WR_002` after constructed-response validation and writing checklist/rubric support are available.
## Contractor-Ready Backlog Summary
| Work ID | Type | Skill ID | Domain | Title | Depends on |
|---|---|---|---|---|---|
| G1E-P0-001 | CREATE_PRODUCTION_SKILL | `G1E_RF_001` | Reading Foundations | Letter Recognition and Sounds | Runtime enablement |
| G1E-P0-002 | CREATE_PRODUCTION_SKILL | `G1E_RF_002` | Reading Foundations | Phonemic Awareness: Beginning, Middle, Ending Sounds | Runtime enablement |
| G1E-P0-003 | CREATE_PRODUCTION_SKILL | `G1E_PH_001` | Phonics | CVC Word Blending | G1E_RF_001, G1E_RF_002 |
| G1E-P0-004 | CREATE_PRODUCTION_SKILL | `G1E_PH_002` | Phonics | Short Vowel Word Families | G1E_RF_001, G1E_RF_002 |
| G1E-P0-005 | CREATE_PRODUCTION_SKILL | `G1E_SW_001` | Fluency | Sight Words and High-Frequency Words | G1E_PH_001, G1E_PH_002 |
| G1E-P0-006 | CREATE_PRODUCTION_SKILL | `G1E_FL_001` | Fluency | Sentence Reading Fluency | G1E_PH_001, G1E_PH_002 |
| G1E-P0-007 | CREATE_PRODUCTION_SKILL | `G1E_RC_001` | Reading Comprehension | Answer Who, What, Where Questions | G1E_SW_001, G1E_FL_001 |
| G1E-P0-008 | CREATE_PRODUCTION_SKILL | `G1E_RC_002` | Reading Comprehension | Story Sequence: Beginning, Middle, End | G1E_SW_001, G1E_FL_001 |
| G1E-P0-009 | CREATE_PRODUCTION_SKILL | `G1E_WR_001` | Writing / Composition | Write a Simple Sentence | Writing validation/rubric support |
| G1E-P0-010 | CREATE_PRODUCTION_SKILL | `G1E_WR_002` | Writing / Composition | Describe a Picture with a Sentence | Writing validation/rubric support |

## Definition of Done for Grade 1 English Production Completion
- All ten SkillPackage JSON files validate against the English-extended SkillPackage contract.
- All ten packages are listed in the Skill World manifest with accurate grade, subject, domain, title, and package path metadata.
- All ten packages render through the generated Skill World flow and Skill Practice Center without legacy placeholder cards.
- Every package includes 4 focused levels plus Mixed, with 10–12 questions in each level.
- English visual renderers cover all planned visual models or intentionally degrade to an approved non-placeholder representation.
- Writing packages support child-friendly feedback, capitalization/spacing/punctuation checks, and simple rubric scoring where exact matching is not sufficient.
