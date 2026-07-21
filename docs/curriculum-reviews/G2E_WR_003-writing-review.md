# G2E_WR_003 Narrative Writing Curriculum Review

## Executive summary

All 50 canonical questions in G2E_WR_003 were reviewed and rewritten. The revised package gives Grade 2 writers a purposeful progression from temporal words, to precise event details, to beginnings, middles, and endings, and finally to complete short narratives. Mixed review uses ten entirely new small moments to measure transfer. Every displayed-choice item now has four plausible, unique options and one defensible answer; every question has a teaching explanation and its own focus–apply–verify hint ladder. Existing interaction and renderer support was sufficient, so no shared runtime changed.

## Original curriculum defects

The original banks repeated ten normalized prompts, 39 topic occurrences, 13 normalized answer sets, and 49 hint ladders beyond their first occurrence. Every Mixed prompt and topic copied focused material, and four Mixed answer sets also repeated focused sets. All 23 displayed answers occupied position A, and each choice item offered only three options. Generic distractors such as “Blue,” “It was nice,” and “Things happened” could be rejected without applying narrative-writing knowledge.

Explanations repeatedly said that an answer “fits the writing target” without teaching sequence, detail, organization, or closure. Hints repeated a package template instead of helping with the particular event. Several narrative models also used lowercase *i*, while story sequences lacked punctuation and natural transitions. The lesson vocabulary and real-world connection drifted toward topic, reason, and informational paragraphs rather than the authored narrative objective.

## Educational improvements

- Reauthored 50 questions around 50 distinct, familiar small moments.
- Replaced all 46 weak original distractors and expanded the 35 displayed-choice items to four options, for 105 plausible distractors in the final package.
- Made misconceptions instructionally useful: an event placed too early, a middle event used as an opening, a related but vague sentence, a paragraph with swapped actions, or an ending that restarts the story.
- Wrote 50 explanations that identify the selected sentence’s job and explain its effect on the reader.
- Wrote 50 unique three-step ladders that focus attention, apply the relevant narrative concept, and verify the result in context.
- Corrected capitalization, punctuation, temporal connections, and narrative terminology throughout the lesson and models.

## Narrative-writing improvements

The focused sequence is intentionally limited to Grade 2 expectations:

1. **Temporal words:** Children connect a named action to what happened before or after it. The task requires understanding the event relationship, not simply recognizing *First*.
2. **Event details:** Children distinguish a specific, pictureable action from vague or disconnected statements.
3. **Beginning, middle, and end:** Children determine causal and practical order across three brief events. One constructed sequencing task verifies the supported interaction directly.
4. **Short narratives:** Children use simple time words, event details, complete sentences, and a clear ending. Models remain brief and do not introduce advanced plot, dialogue, or pacing expectations.

Mixed review transfers those moves to fire-station visits, lunchbox notes, baby cousins, toy-boat races, and other topics absent from focused practice. Some tasks ask children to revise for precision or choose a functional opening or ending, rather than repeating the focused prompt pattern.

## Representative review examples

### Temporal relationships

**Before:** Ten prompts asked which word “could begin” a narrative. *First* was always correct, while *Blue* and *Because* were obviously unusable.

**After:** The sunflower item asks which sequence word shows that pressing a seed happened after filling the pot. Learners must connect two events before selecting *Next*; competing time words represent realistic order errors.

### Descriptive event detail

**Before:** “It was nice” and “Things happened” served as repeated distractors, and the explanation did not say why a detail helped.

**After:** The strawberry item contrasts “I twisted three ripe berries from a plant” with vague or disconnected sentences. Its explanation points out the exact action and pictureable detail, while its hints position that action between the basket and walk-home events.

### Logical organization

**Before:** Ten nearly identical sequencing prompts reused the same ten focused topics and a generic rationale.

**After:** The kite paragraph can only work when the string catches first, Priya frees it next, and the kite floats free last. The explanation names that causal chain, and the hints ask whether each action is possible at that point.

### Complete narrative

**Before:** Models mechanically inserted time words, repeated a stock ending, and incorrectly wrote lowercase *i*.

**After:** The bird-feeder model moves from spreading sunflower butter, to rolling the tube in seed, to a chickadee landing. It demonstrates an ordered action sequence with a topic-specific ending, correct capitals, and complete sentences.

## Curriculum scorecard

Scores use a five-point scale, where 5 means publication-ready.

| Dimension | Before | After | Evidence |
|---|---:|---:|---|
| Narrative-writing accuracy | 2 | 5 | Temporal relationships, exact events, order, and closure have distinct roles |
| Grade 2 appropriateness | 3 | 5 | Familiar small moments and short three-event narratives |
| Prompt clarity | 2 | 5 | Each prompt names one observable writing decision |
| Sequence and organization | 2 | 5 | Events follow practical or causal beginnings, middles, and endings |
| Detail quality | 1 | 5 | Exact actions and sensory details replace vague placeholders |
| Explanation quality | 1 | 5 | Every rationale explains why the writing move helps a reader |
| Scaffold and hint quality | 1 | 5 | Fifty contextual focus–apply–verify ladders |
| Distractor quality | 1 | 5 | 105 plausible options represent authentic misconceptions |
| Answer integrity | 1 | 5 | One displayed key with balanced 9/9/8/9 positions |
| Mixed transfer | 1 | 5 | Ten new prompts, topics, and answer situations |
| Accessibility and interaction | 3 | 5 | Concise language, audio metadata, and four supported interactions |
| **Overall** | **1.6** | **5.0** | Full review plus automated quality gates |

## Answer-position analysis

The final distribution covers the 35 questions that display choices. Constructed-response items have no A–D position.

| Position | Before | After |
|---|---:|---:|
| A | 23 (100%) | 9 (25.7%) |
| B | 0 (0%) | 9 (25.7%) |
| C | 0 (0%) | 8 (22.9%) |
| D | 0 (0%) | 9 (25.7%) |

Every final position is within the requested 15–35% range. Runtime answer shuffling was not changed.

## Duplicate analysis

Counts are duplicate occurrences beyond the first canonical occurrence.

| Measure | Before | After |
|---|---:|---:|
| Duplicate normalized prompts | 10 | 0 |
| Duplicate topic occurrences | 39 | 0 |
| Duplicate normalized displayed answer sets | 13 | 0 |
| Duplicate three-step hint ladders | 49 | 0 |
| Duplicate choices within an item | 0 | 0 |
| Focused prompts copied into Mixed | 10 | 0 |
| Focused topics copied into Mixed | 10 | 0 |
| Focused answer sets copied into Mixed | 4 | 0 |

## Answer-key corrections

No original key was absent from its displayed choices, but placing all 23 keys in A made answers predictable. The revision balances the authored positions and expands every displayed set from three to four choices. Lowercase-*i* writing models were corrected. Constructed responses retain a single, unambiguous exemplar in `acceptable_answers`; open writing remains scaffolded by validation checks rather than a demand for one exact child composition.

## Accessibility observations

- Prompts use familiar words, concise directions, and brief event sequences.
- No correct response depends on color, screen position, images, or outside knowledge.
- Choices differ in meaning, not merely capitalization or punctuation.
- Question and answer audio metadata remains available on every item.
- Contextual hints reduce memory load by naming the relevant event before asking learners to reason and reread.
- Writing models set a reachable expectation: three ordered actions with an ending, capitals, and punctuation.

## Interaction assessment

The canonical banks use `multiple_choice` (35 questions), `short_response` (1), `sequencing` (1), and `writing_response` (13). The validation suite renders and evaluates one example of every type without fallback or unsupported output. Existing schema, renderer, visual, and evaluation support handled all four types. No runtime, shuffling, or shared Skill World file was modified.

## Validation coverage

The focused suite verifies package existence; five expected banks; ten questions per bank and 50 total; unique IDs; complete prompts, explanations, feedback, topics, and hints; unique normalized hint ladders; placeholder absence; strict schema validity; four unique choices wherever displayed; exactly one displayed key; unique acceptable answers; balanced A–D positions; unique prompts, topics, and answer sets; focused-to-Mixed separation; supported interaction types; renderer output; and answer evaluation.

## Deferred items

None. No unsupported interaction or regression was discovered. Every previously approved package and every out-of-scope shared system remains untouched. Work stops with G2E_WR_003 pending review and approval.
