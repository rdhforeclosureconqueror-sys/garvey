# G2E_FL_001 Publication-Quality Curriculum Review

## Executive summary

`G2E_FL_001` (Grade 2 Sight Words and Fluency) was selected because it is the only shipped Grade 2 ELA Skill World package outside the nine approved packages. The Grade 2 sequence also places fluency after foundational reading and before the comprehension progression. This review covered all 50 activities in the four focused banks and Mixed bank; no approved package or shared runtime file was changed.

The original bank could not meet a publication gate. Forty-three activities displayed only three choices, 13 activities did not display exactly one normalized correct answer, every valid key appeared in position A, and Mixed copied all ten prompts and answer sets from focused banks. The revision replaces every activity with a purposeful Grade 2 fluency task, four defensible choices, direct teaching feedback, and its own three-step hint ladder.

## Original curriculum defects

- Word-identification prompts often revealed the answer (for example, “Which word says because?” displayed `because` first), so the task measured matching rather than useful automatic word recognition.
- Reversed spellings and the repeated filler phrase “the and of” were implausible, weak distractors.
- Sentence activities repeated correct choices or punctuation marks. Thirteen activities consequently had zero or multiple normalized displayed keys.
- Explanations and hint ladders were repeated templates rather than instruction tied to a word, phrase, sentence, or end mark.
- Phrase tasks asked learners to find an identical printed phrase instead of deciding which words form a meaningful, smooth group.
- Mixed was a direct copy of ten focused activities, so it provided no evidence of transfer.
- Authored answer placement was unbalanced: 37 valid keys were in A, while 13 activities were invalid; B, C, and D had no valid authored keys.

## Educational improvements

- Reframed automatic-word work in meaningful Grade 2 sentences so context supports accurate recognition without giving away the response.
- Replaced reversed strings and filler text with plausible spelling, meaning, phrasing, and punctuation misconceptions.
- Built phrase-reading decisions around syntactic and semantic groups, then asked learners to verify fluency by rereading the complete sentence.
- Connected punctuation to a reader’s pause, stopping, asking, warning, calm, excited, or surprised voice.
- Added an individual focus-guide-verify hint ladder and a teaching explanation to every activity.
- Authored ten completely new Mixed situations, targets, prompts, and choice sets.

## Domain-specific improvements

### Automatic word recognition

Levels 1 and 2 now distinguish instant recognition from decoding tricks. Learners use high-frequency words in meaningful contexts and discriminate among plausible spellings such as `their`, `there`, and `thier`. Explanations connect spelling, meaning, and grammatical function.

### Phrase-level fluency

Level 3 asks which words form a natural idea within a complete sentence. Distractors model choppy word-by-word reading or scrambled syntax without presenting nonsense as a reasonable reading strategy.

### Prosody and punctuation

Level 4 connects marks with audible reading behaviors. Descriptive choice labels preserve accessibility and normalized uniqueness rather than relying on punctuation-only options.

### Transfer in Mixed

Mixed uses new classroom, home, nature, and community contexts. It checks unfamiliar high-frequency words, spelling accuracy, meaningful grouping, end-mark expression, and quotation marks without reusing focused targets or topics.

## Representative review examples

| Area | Before | After | Why it is stronger |
|---|---|---|---|
| Word recognition | “Which word says because?” with the answer first | “The class stayed inside ___ it was raining.” | Context requires meaning and automatic recognition rather than copying the prompt. |
| Distractors | `esuaceb` and a loosely related word | `before`, `around`, and `found` | Every option is a real, readable word; only one fits the sentence. |
| Phrase fluency | Match `around the tree` to the identical phrase | Complete “We packed ___ for the hike” with `a map and snacks` | Learners identify a meaningful phrase and distinguish it from choppy or scrambled grouping. |
| Prosody | Duplicate punctuation symbols and duplicate sentences | Select “excited: We won the relay!” | The option states the intended voice and remains clear to screen-reader users. |
| Mixed transfer | Exact focused-bank copies | New turtle, bakery, picnic, duckling, and school-show contexts | New language provides evidence that the skill transfers. |

## Curriculum scorecard

| Dimension | Before | After |
|---|---:|---:|
| Instructional correctness | 2/4 | 4/4 |
| Grade 2 alignment | 2/4 | 4/4 |
| Prompt clarity and classroom wording | 1/4 | 4/4 |
| Distractor quality | 1/4 | 4/4 |
| Exactly one defensible displayed answer | 1/4 | 4/4 |
| Explanation quality | 1/4 | 4/4 |
| Scaffold and hint quality | 1/4 | 4/4 |
| Mixed transfer | 0/4 | 4/4 |
| Accessibility | 2/4 | 4/4 |
| **Total** | **11/36** | **36/36** |

## Duplicate analysis

| Check | Before | After |
|---|---:|---:|
| Duplicate normalized prompts | 10 | 0 |
| Duplicate normalized answer sets | 15 | 0 |
| Duplicate hint ladders | 49 | 0 |
| Mixed prompts duplicated from focused banks | 10 | 0 |
| Mixed answer sets duplicated from focused banks | 10 | 0 |
| Mixed topics or targets duplicated from focused banks | Not explicitly authored | 0 |

All 50 revised prompts, answer sets, hint ladders, topics, and target labels are unique. Mixed has no overlap with the focused banks on any tested dimension.

## Answer-position analysis

Before review, the 37 activities with a single normalized displayed key placed it in A (74% of the full bank), and 13 activities had an invalid displayed key. No valid key appeared in B, C, or D. After review, the distribution is A: 13 (26%), B: 13 (26%), C: 12 (24%), and D: 12 (24%). Every position is within the 15–35% target.

The review retired all 107 original non-key choice slots and authored 150 purposeful distractors. It corrected the 13 ambiguous or missing normalized displayed-key cases; no factual key reversal was required.

## Accessibility observations

- Prompts use short sentences, familiar settings, and direct verbs.
- Punctuation options include names and reading behaviors instead of depending only on tiny visual marks.
- Meaning is never communicated by color or audio alone; audio remains optional support.
- Curly quotation marks are paired with explanatory language, and every response remains readable as text.
- Hint steps reduce cognitive load by focusing attention first, offering one concept cue second, and asking for a complete reread last.

## Interaction assessment

The revised package uses only `multiple_choice`, `short_response`, and `sentence_completion`, all already supported by the Skill World renderer and answer evaluator. Activities use the supported `word_card`, `phrase_builder`, `sentence_card`, and `sentence_highlight` visual models. Focused validation renders one activity of each interaction type with fail-closed behavior, rejects fallback UI, accepts its key, and rejects an authored distractor. No runtime, renderer, schema, shuffling, or shared Skill World change was needed.

## Validation coverage

The focused suite proves package presence; five-bank structure; expected 10/10/10/10/10 counts; unique IDs; complete prompts, explanations, feedback, topics, targets, and hints; unique progressive hint ladders; production schema validity without warnings; placeholder absence; four normalized-unique displayed choices; exactly one displayed key; balanced positions; unique prompts, topics, targets, and answer sets; zero focused-to-Mixed duplication; and renderer/evaluator support.

## Deferred items

No curriculum or interaction defect remains in this package. Recording a child’s oral rate, phrasing, or expression would require a separately scoped oral-fluency capture and scoring product; this package appropriately limits its machine-scored evidence to word recognition, phrase grouping, and punctuation-guided reading decisions.
