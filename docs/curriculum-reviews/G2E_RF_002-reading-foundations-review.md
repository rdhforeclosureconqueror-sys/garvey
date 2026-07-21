# G2E_RF_002 Reading Foundations II Curriculum Review

## Executive summary

All 50 canonical questions in G2E_RF_002 were reviewed and rewritten. The revised package teaches base words, the common prefixes `re-`, `un-`, `pre-`, and `dis-`, and Grade 2 suffixes and inflected endings through a deliberate progression from recognition to meaning, spelling, structural analysis, and Mixed transfer. Every question now has four unique choices, exactly one displayed answer, an instructional explanation, and its own three-step hint ladder. Existing renderer support was sufficient, so no shared runtime file changed.

## Original curriculum defects

The original package was not classroom-ready. All 50 correct answers occupied position A, and every item displayed only three choices. Ten prompts, 26 normalized answer sets, and 25 target-word occurrences were duplicates. Mixed review copied all 10 focused target words, prompts, and answer sets rather than measuring transfer. Repeated generic distractors such as *full of*, *without*, and *happened already* often did not represent the kind of word-part mistake the learner might make.

Explanations used the same circular frame—an answer was correct because it “fit the word parts”—without identifying a prefix, suffix, spelling change, or precise meaning. Every question repeated the package-level hint ladder, so hints did not focus attention on the particular word or help a learner verify an answer. Context-free claims that `-ing` meant “happening now” made three keys ambiguous because an `-ing` word does not express present time by itself. Short-response acceptable-answer arrays also repeated the same answer three times.

## Educational improvements

- Rewrote 50 prompts in natural classroom language and made the response target explicit.
- Replaced all 100 original distractors and added a fourth plausible option to every item, for 150 newly authored distractors.
- Used misconceptions that a developing reader might actually make: confusing the whole derived word with its base, selecting the wrong meaningful affix, retaining silent `e` before `-ing`, failing to double a consonant, or choosing the wrong inflected ending.
- Wrote 50 explanations that name the relevant morpheme, tell what it contributes, and connect the construction to the word or sentence meaning.
- Wrote 50 unique hint ladders. Each ladder first focuses attention, then gives a morphology or spelling strategy, and finally asks the learner to blend, substitute a meaning, or reread to verify.
- Removed all normalized prompt, answer-set, and target-word duplication from canonical banks.

## Reading Foundations improvements

The four focused levels now form a coherent structural-analysis sequence:

1. **Base words:** Learners remove an affix and check that the remaining word carries the main meaning. Examples include *unsafe*, *slowly*, *cloudless*, *boxes*, and *farmer*.
2. **Prefixes:** Learners interpret `re-` (again), `un-` (not or reverse an action), and `pre-` (before) in sentences and build new words with those meanings.
3. **Suffixes and inflected endings:** Learners use sentence context to distinguish plural `-s/-es`, past `-ed`, and progressive `-ing`; they also interpret `-ful` and `-less`.
4. **Build and decode:** Learners join meaningful parts and apply accessible spelling patterns, including dropping silent `e` in *baking*, doubling the final consonant in *hopped*, and adding `-es` after `sh` in *brushes*.

Mixed review uses 10 new words to transfer these ideas. It also introduces only closely related Grade 2 structural analysis: `dis-` in *disconnect*, `-ness` in *kindness*, and the familiar spelling change in *carried*. No contractions, advanced Greek or Latin roots, or concepts outside the authored Grade 2 scope were added.

## Representative examples

### Base-word analysis

**Before:** “What is the base word in unhappy?” Choices were *happy*, *unhappy*, and *un*. The explanation only said that *happy* fit the word parts, and all three hints were generic.

**After:** “The word unsafe means not safe. What is its base word?” Distractors *unsafe*, *save*, and *safety* represent whole-word selection, decoding confusion, and related-word confusion. The explanation identifies *safe* as the base and explains that `un-` adds “not.” The hints move from finding the meaning-bearing word to removing the prefix and checking the definition.

### Inflected-ending precision

**Before:** “In reading, what does the suffix -ing mean?” The answer *happening now* was not defensible without a sentence or helping verb.

**After:** “The frogs are jumping now. What does -ing show in jumping?” The explanation accurately says that `-ing` works with *are* to show an action in progress. Distractors contrast past action, a plural noun, and a person who acts.

### Morphological spelling

**Before:** “Build the word from jump + -ed.” The choices were only the completed word and its two component strings; the explanation did not teach spelling.

**After:** “Add -ed to hop. Which spelling shows that the hopping already happened?” Learners distinguish *hopped* from the real-word forms *hoped*, *hops*, and *hopping*. The explanation connects short *o* to doubling final `p` before `-ed`.

### Mixed transfer

**Before:** Every Mixed item copied a focused target, prompt, and answer set.

**After:** “Her kindness made the new student smile” asks learners to infer that `-ness` names the quality of being kind. The new context and target require meaning transfer rather than recall of a focused item.

## Duplicate analysis

Counts report duplicate occurrences beyond the first canonical occurrence.

| Measure | Before | After |
|---|---:|---:|
| Duplicate normalized prompts | 10 | 0 |
| Duplicate normalized answer sets | 26 | 0 |
| Duplicate target-word occurrences | 25 | 0 |
| Repeated displayed choice slots within an item | 0 | 0 |
| Focused target words copied into Mixed | 10 | 0 |
| Focused prompts copied into Mixed | 10 | 0 |
| Focused answer sets copied into Mixed | 10 | 0 |

## Answer-position analysis

| Position | Before | After |
|---|---:|---:|
| A | 50 (100%) | 13 (26%) |
| B | 0 (0%) | 13 (26%) |
| C | 0 (0%) | 12 (24%) |
| D | 0 (0%) | 12 (24%) |

The after distribution is the closest possible balance for 50 questions and keeps every position within the requested 15–35% range. Runtime shuffling was not changed.

## Answer-key corrections

The original displayed keys were technically present and unique, but three context-free `-ing` questions treated the ending itself as proof of present time. Those ambiguous keys were eliminated by adding helping verbs and time clues or by changing the target. Every revised key is supported by its prompt, context, choices, explanation, and word-part metadata. Short-response items now contain one unique acceptable answer rather than three identical entries.

## Accessibility observations

- Every question keeps visible text plus **Read Question** and **Hear the word** audio metadata.
- Prompts identify the target word and task without depending on color, location, or an image.
- Concise displayed choices are distinguishable when read aloud and do not rely on punctuation alone.
- Sentence contexts provide meaning support without requiring outside cultural knowledge.
- Hints expose one step at a time and conclude with an explicit semantic or decoding check.
- Explanations restate the relevant word parts, supporting learners who need corrective feedback.

## Interaction assessment

The revised canonical banks use `multiple_choice` (42 questions), `word_building` (5), and `short_response` (3). The focused test renders one example of every authored interaction through the existing Skill World renderer, rejects fallback UI, and checks correct and incorrect evaluation. All three types already have renderer support. No engine, renderer, answer shuffling, or other shared runtime code was modified.

## Curriculum scorecard

Scores use a five-point scale, where 5 means publication-ready.

| Dimension | Before | After | Evidence |
|---|---:|---:|---|
| Morphology correctness | 2 | 5 | Affix meanings and boundaries are explicitly and accurately taught |
| Phonics and spelling correctness | 2 | 5 | Silent-e dropping, consonant doubling, `-es`, and `y` changes are word-specific |
| Decoding and structural analysis | 2 | 5 | Learners identify, build, divide, blend, and verify meaningful parts |
| Grade 2 appropriateness | 3 | 5 | Familiar words, concise sentences, and controlled affix scope |
| Prompt clarity | 2 | 5 | Fifty distinct prompts state an observable task |
| Explanation quality | 1 | 5 | Every rationale explains both construction and meaning |
| Hint quality | 1 | 5 | Fifty unique focus–strategy–verification ladders |
| Distractor quality | 1 | 5 | 150 plausible, unique distractors tied to misconceptions |
| Answer integrity | 1 | 5 | One key per item and 13/13/12/12 authored balance |
| Mixed transfer | 1 | 5 | Ten new targets, prompts, contexts, and answer sets |
| Accessibility and interaction | 4 | 5 | Audio metadata retained; three renderer paths verified |
| **Overall** | **1.8** | **5.0** | Complete review plus automated quality gates |

## Validation coverage

The focused suite verifies file existence; five expected banks; per-bank and total question counts; unique IDs; required prompts, explanations, feedback, and hints; concept-specific and unique three-step ladders; placeholder absence; schema validity; four normalized-unique choices; exactly one displayed key; unique short-response answers; answer-position balance; unique prompts, answer sets, and targets; focused-to-Mixed separation; supported interaction types; renderer output; and correct/incorrect answer evaluation.

## Deferred items

None. No regression, unsupported interaction, or shared-runtime defect was discovered. Previously completed Grade 2 packages and all out-of-scope subjects and systems were left unchanged.
