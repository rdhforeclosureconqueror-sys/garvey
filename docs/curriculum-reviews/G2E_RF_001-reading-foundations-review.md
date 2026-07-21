# G2E_RF_001 Reading Foundations Curriculum Review

## Executive summary

All 52 canonical Skill Practice questions in G2E_RF_001 were reviewed and rewritten. The revised sequence moves from consonant blends and digraphs to silent-e patterns, common vowel teams, two-syllable decoding, and transfer in Mixed review. Each item now has a clear task, four unique choices, a word-specific explanation, useful hints, and one displayed correct answer. The four existing interaction types already render correctly, so no shared runtime code changed.

## Original curriculum defects

The original banks were mechanically generated rather than classroom-ready. Prompts repeatedly used phrases such as “starts or helps the word” and “find the ... answer,” which did not tell a learner what phonics decision to make. Explanations merely said that an answer “fits the pattern” instead of naming a sound-spelling relationship. Many distractors were unrelated defaults such as `sh`, reversed strings, nonwords ending in `a`, or the entire target word when the question asked for a letter pattern. Ten displayed choice slots duplicated the correct answer, and all 52 keys appeared in position A. One normalized answer set was duplicated across canonical questions.

Several representations were also inaccurate or unhelpful. For example, the sound list for *cake* treated silent `e` as a spoken sound; syllable items displayed the correct division twice; and a “word building” item about *ship* keyed the whole word even though its prompt asked for the beginning digraph. Mixed items reused the same generic prompt frame and default distractor rather than requiring transfer.

## Educational improvements

- Replaced every prompt with a distinct, direct question using natural Grade 2 classroom language.
- Made the requested response match the key: letter pattern, whole word, syllable, number of syllables, or word chunks.
- Replaced all 156 distractor slots with plausible contrasts, including competing blends, digraphs, vowel teams, short-vowel words, and reasonable but incorrect syllable divisions.
- Added explanations that identify the relevant grapheme, sound, silent-e effect, syllable division, or compound-word structure.
- Added a three-step hint progression for every item: pronounce, inspect, then blend and check.
- Kept vocabulary concrete and age-appropriate while varying words, sentence frames, and response demands.

## Reading foundations review

The instructional progression stays within the stated objective:

1. **Level 1 — blends and digraphs:** Learners distinguish blends, in which consonant sounds remain audible, from digraphs that spell one consonant sound. Items cover `fl`, `tr`, `sl`, `br`, `st`, `cl`, `sh`, `ch`, `th`, and `wh`, including both recognition and word building.
2. **Level 2 — silent e:** Learners contrast short- and long-vowel patterns and apply `a_e`, `i_e`, `o_e`, and `u_e` in words and sentences. The content does not claim that final `e` is pronounced.
3. **Level 3 — vowel teams:** Learners recognize and use `ai`, `ay`, `ee`, `ea`, `oa`, `ow`, `ie`, and `ue`. Explanations are word-specific and avoid implying that a team always has only one pronunciation in every English word.
4. **Level 4 — two-syllable words:** Learners count spoken vowel beats, identify first or second syllables, blend chunks, and use meaningful compound-word boundaries. Selected words have defensible Grade 2 divisions.
5. **Mixed review — transfer:** Twelve new target words combine the focused skills in short contexts without repeating a focused target word.

R-controlled vowels, affixes, and advanced morphology were not added because they are outside this package’s stated progression.

## Duplicate removal

| Measure | Before | After |
|---|---:|---:|
| Exact normalized duplicate prompts among canonical questions | 0 | 0 |
| Duplicate normalized answer sets | 1 | 0 |
| Repeated choice slots within an item | 10 | 0 |
| Exact focused-to-Mixed question signatures | 0 | 0 |
| Focused target words reused in Mixed | 0 | 0 |

Although exact prompt duplication was already zero, large groups used nearly identical templates. All 52 prompts were rewritten so each now frames a specific phonics or decoding decision.

## Distractor improvements

Every distractor was replaced. New distractors represent likely decoding confusions without creating a second defensible key. Examples include contrasting `tr` with `cr`, `dr`, and `gr`; contrasting *cape* with *cap*, *camp*, and *cup*; and contrasting the correct `mu | sic` division with believable but incorrect splits. No item uses duplicate choices, a placeholder choice, or a generic `sh` distractor unrelated to the target.

## Answer balance

| Position | Before | After |
|---|---:|---:|
| A | 42 (80.8% uniquely displayed; 10 items had duplicate keys) | 13 (25%) |
| B | 0 (0%) | 13 (25%) |
| C | 0 (0%) | 13 (25%) |
| D | 0 (0%) | 13 (25%) |

The revised authored distribution is exactly even and remains within the requested 15–35% range for every position. No runtime shuffling behavior was changed.

## Interaction assessment

The package uses `multiple_choice`, `short_response`, `sound_match`, and `word_building`. The focused validation renders one item of each type through the existing Skill World renderer, rejects fallback UI, and checks correct and incorrect answer evaluation. All four types are already supported; therefore, shared renderer and runtime files were intentionally left unchanged.

## Accessibility observations

- Every item retains a **Read Question** narration and target-word **Listen** audio metadata.
- Prompts do not rely on color, position, or an image alone to communicate the task.
- Directions name the word or sound-spelling feature explicitly.
- Explanations restate why the answer works rather than only marking it correct.
- Choice labels remain text-based and concise for screen readers and developing readers.
- Hyphen-like punctuation is not required to identify the displayed correct choice; short-response acceptable answers are explicit and unique.

## Representative educational improvements

### Digraph precision

**Before:** “Read ship. Which digraph starts or helps the word?” The keyed choice was the whole word *ship*, while distractors were unrelated strings.

**After:** “The word ship begins with one sound spelled by two letters. Which letters spell that sound?” The key is `sh`; alternatives `ch`, `th`, and `wh` are real digraphs. The explanation states that `sh` spells /sh/ at the beginning of *ship*.

### Silent-e understanding

**Before:** “Write the silent-e word shown: cake.” Choices included malformed spellings, and the sound metadata implied that final `e` was spoken.

**After:** “Which word has a silent e that changes cap into a word with long a?” Learners distinguish *cape* from meaningful alternatives, and the explanation connects final silent `e` to long a.

### Syllable analysis

**Before:** “Break sunset into syllables.” The correct choice appeared twice.

**After:** “Which break shows the two smaller words in sunset?” Learners use compound-word structure to select `sun | set` from three unique incorrect divisions.

### Mixed transfer

**Before:** Mixed prompts said “find the ... answer” and often paired a correct feature with the whole word and `sh`.

**After:** A sentence such as “The grass is __ after the rain” asks learners to select *green*, then explains how `ee` spells long e. The context checks both decoding and meaning with a target not used in focused banks.

## Before/after curriculum scorecard

Scores use a five-point scale, where 5 indicates publication-ready quality.

| Dimension | Before | After | Evidence |
|---|---:|---:|---|
| Phonics correctness | 2 | 5 | Accurate blend/digraph distinctions, silent-e descriptions, and word-specific vowel teams |
| Decoding and word analysis | 2 | 5 | Recognition, completion, comparison, chunking, and contextual application |
| Grade 2 appropriateness | 3 | 5 | Concrete vocabulary, concise directions, controlled progression |
| Prompt clarity | 1 | 5 | 52 distinct prompts with explicit response targets |
| Explanation quality | 1 | 5 | 52 word-specific rationales naming the relevant relationship |
| Distractor quality | 1 | 5 | 156 replaced distractors; all plausible and unique within an item |
| Answer integrity | 1 | 5 | One displayed key per item and 13/13/13/13 balance |
| Content diversity | 1 | 5 | Unique prompts and answer sets; new Mixed target words |
| Interaction/accessibility | 4 | 5 | Existing supported controls verified; audio and text cues retained |
| **Overall** | **1.8** | **5.0** | Complete canonical-bank review and automated quality gates |

## Validation coverage

The focused suite verifies package existence, expected bank IDs and counts, 52 unique IDs, required prompts and explanations, three-step hints, schema validity, supported interaction types, normalized-unique choices, exactly one displayed correct answer, exact answer balance, unique prompts, unique answer sets, no focused-to-Mixed target reuse or signature copying, and no unresolved placeholders. It also exercises renderer output and answer evaluation for every authored interaction type.

## Deferred items

None. No unsupported interaction, runtime defect, or out-of-scope package issue was discovered during this review. G2E_RF_002 was not reviewed or changed.
