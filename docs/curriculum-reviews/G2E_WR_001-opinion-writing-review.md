# G2E_WR_001 Opinion Writing Curriculum Review

## Executive summary

All 50 canonical questions in G2E_WR_001 were reviewed and rewritten. The revised package develops a Grade 2 progression from recognizing opinions and facts, to choosing connected reasons, to organizing introductions, transitions, details, and conclusions, and finally to composing short opinion paragraphs. Mixed review now measures transfer with ten entirely new topics. Every displayed-choice item has four plausible choices and one defensible answer; every item has a teaching explanation and a question-specific three-step hint ladder. Existing renderer support was sufficient, so no shared runtime changed.

## Original curriculum defects

The original package was highly repetitive. Ten normalized prompts, 40 topic occurrences, six normalized answer sets, and 49 hint ladders were duplicates beyond their first occurrence. All ten Mixed questions reused focused prompts and topics, while six Mixed displayed answer sets copied focused sets. The 35 displayed-choice questions placed every answer in position A and offered only three choices.

Distractors followed mechanical templates such as “can be found at school” and “starts with a letter.” These were easy to reject without understanding opinion writing. Explanations repeated that an answer “fits the writing target” but did not explain how a sentence stated an opinion, supported a claim, stayed focused, linked ideas, or concluded a paragraph. All questions repeated package-level hints rather than scaffolding the specific task. Thirteen paragraph models separated a dependent *Because* clause as a sentence, even while asking children to check sentence completeness.

## Educational improvements

- Reauthored 50 prompts around familiar but nonrepeating Grade 2 topics.
- Replaced all 70 original distractors and added a fourth option to each of 35 displayed-choice items, yielding 105 newly authored distractors.
- Used realistic misconceptions: confusing a checkable fact with a judgment, selecting an on-topic detail that does not support the opinion, choosing an off-topic sentence, misplacing a transition, or using a detail instead of a conclusion.
- Wrote 50 explanations that name the sentence’s job and show why it helps the writing.
- Wrote 50 unique focus–guide–verify hint ladders tied to each topic and task.
- Corrected all 13 fragmentary paragraph models and kept every new model to complete, readable sentences.

## Opinion-writing improvements

The focused banks now follow a deliberate progression:

1. **Opinions and facts:** Learners decide whether a claim expresses a judgment or can be checked. Opinion markers such as *best*, *should*, and *I think* appear in meaningful contexts rather than serving as the only clue.
2. **Supporting reasons:** Learners choose reasons that answer *why* and explain an actual benefit. Merely related facts are used as plausible distractors.
3. **Organization:** Learners select introductions and conclusions, add a second reason with a simple transition, remove off-topic material, and choose evidence that strengthens an opinion.
4. **Short paragraphs:** Learners write three complete sentences: an opinion, a connected reason, and a conclusion. Models use accessible linking phrases without introducing advanced persuasive devices.

Mixed review transfers these skills to kites, poetry day, picnic planning, building blocks, pond habitats, beach cleanup, a playground fountain, button sewing, bird feeders, and book swaps. None of these topics appears in a focused bank.

## Representative review examples

### Opinion versus fact

**Before:** “Which sentence states an opinion about library day?” was paired with “Library Day can be found at school” and “Library Day starts with a letter.” Those mechanical options did not model real confusion.

**After:** “Which sentence can be proven true?” asks learners to distinguish “A snowflake is made of frozen water” from three believable judgments about snow. The explanation teaches that reliable evidence can verify a fact, and the hints explicitly ask whether everyone must agree.

### Supporting reasons

**Before:** A generic reason beginning with *because* was treated as sufficient, while distractors were unrelated statements about doors or pencils.

**After:** The school-paper item contrasts a useful conservation reason—using blank sides again—with related but nonsupporting details about colors, containers, and pencils. Learners must decide which detail answers why the class should save paper.

### Paragraph organization

**Before:** Level 3 asked only for ten nearly identical “That is why” closings.

**After:** Learners choose introductions, conclusions, simple transitions, relevant details, logical part order, and useful evidence. For example, frequent borrowing and an empty animal-book shelf provide observable support for adding more animal books.

### Sentence quality

**Before:** “Recess is the best part of the school day. Because kids can move and play with friends. That is why recess is important.” incorrectly presented a dependent clause as a complete sentence.

**After:** Each writing model has three complete sentences, as in: “Rain boots are the best shoes for a wet day. They keep socks dry when puddles splash. That is why I choose rain boots.”

## Duplicate analysis

Counts are duplicate occurrences beyond the first canonical occurrence.

| Measure | Before | After |
|---|---:|---:|
| Duplicate normalized prompts | 10 | 0 |
| Duplicate topic occurrences | 40 | 0 |
| Duplicate normalized displayed answer sets | 6 | 0 |
| Duplicate three-step hint ladders | 49 | 0 |
| Duplicate choices within an item | 0 | 0 |
| Focused prompts copied into Mixed | 10 | 0 |
| Focused topics copied into Mixed | 10 | 0 |
| Focused answer sets copied into Mixed | 6 | 0 |

## Answer-position analysis

The distribution covers the 35 questions that display choices. Free-writing items do not have an authored A–D position.

| Position | Before | After |
|---|---:|---:|
| A | 35 (100%) | 8 (22.9%) |
| B | 0 (0%) | 10 (28.6%) |
| C | 0 (0%) | 7 (20.0%) |
| D | 0 (0%) | 10 (28.6%) |

Every position is within the requested 15–35% range. Runtime answer shuffling was not changed.

## Answer-key corrections

No original multiple-choice key pointed to a missing displayed option, but universal position-A keying made the assessment predictable. All displayed keys were reauthored and balanced. Thirteen writing-response keys that modeled *Because* fragments were replaced with complete-sentence paragraphs. Short-response acceptable-answer lists were normalized to one unique exemplar each, removing capitalization-only duplication.

## Accessibility observations

- Prompts use short sentences and familiar situations, while retaining visible question and answer audio metadata.
- No task depends on color, a picture, screen position, or unstated background knowledge.
- Choices differ in meaning rather than punctuation or capitalization alone.
- Hints first focus attention, then supply a strategy, and finally ask the learner to reread and verify.
- Writing models limit the expected product to three sentences and name each required part.
- Explanations provide corrective instruction for learners who choose a related fact or off-topic detail.

## Interaction assessment

The canonical banks retain `multiple_choice` (25 questions), `sentence_completion` (10), `short_response` (2), and `writing_response` (13). The focused validation suite renders one example of each type without fallback output and evaluates the authored correct response. All four interaction types already have renderer and answer-evaluation support. No engine, renderer, shuffling, or shared Skill World file was modified.

## Curriculum scorecard

Scores use a five-point scale, where 5 means publication-ready.

| Dimension | Before | After | Evidence |
|---|---:|---:|---|
| Opinion-writing accuracy | 2 | 5 | Facts, opinions, reasons, transitions, and conclusions have distinct roles |
| Grade 2 appropriateness | 3 | 5 | Familiar topics, brief texts, and three-sentence composition expectations |
| Prompt clarity | 2 | 5 | Each prompt states one observable writing task |
| Supporting-reason quality | 2 | 5 | Reasons answer why and explain a specific benefit |
| Organization and sentence quality | 1 | 5 | Complete sentences and a coherent opinion–reason–conclusion progression |
| Explanation quality | 1 | 5 | Fifty rationales explain how the selected writing move works |
| Scaffold and hint quality | 1 | 5 | Fifty unique focus–guide–verify ladders |
| Distractor quality | 1 | 5 | 105 plausible distractors represent writing misconceptions |
| Answer integrity | 1 | 5 | One displayed key and 8/10/7/10 authored balance |
| Mixed transfer | 1 | 5 | Ten new prompts, topics, and writing situations |
| Accessibility and interaction | 4 | 5 | Text/audio support retained; four renderer paths verified |
| **Overall** | **1.7** | **5.0** | Complete review plus automated quality gates |

## Validation coverage

The focused suite verifies package existence; five expected banks; ten questions per bank and 50 total; unique IDs; prompts, explanations, feedback, and topics; non-placeholder content; three present hints; unique normalized hint ladders; schema validity; four normalized-unique choices where displayed; exactly one displayed answer; unique acceptable responses; A–D balance; unique prompts, topics, and answer sets; focused-to-Mixed separation; supported interaction types; renderer output; and answer evaluation.

## Deferred items

None. No regression or unsupported interaction was discovered. G2E_WR_002 and every previously completed or out-of-scope package remain untouched pending separate review and approval.
