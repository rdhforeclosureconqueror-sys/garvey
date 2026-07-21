# G2E_RC_001 — Ask and Answer Questions About Text Curriculum Review

## Package and review scope

- **Package ID:** `G2E_RC_001`
- **Title:** Ask and Answer Questions About Text
- **Learning objective:** Learners answer who, what, where, when, why, and how questions; locate explicitly stated answers; select supporting details; reject unsupported guesses; and give concise, text-based responses.
- **Questions reviewed:** 50 of 50 across Level 1, Level 2, Level 3, Level 4, and Mixed.
- **Passages reviewed:** All 50 question passages. The old package had only 10 distinct passages; all 50 are now newly authored and distinct.
- **Interaction types:** `multiple_choice` (25), `text_evidence` (21), and `short_response` (4).

## Issues found and corrected

The audit confirmed heavy templating: only 10 distinct passages served 50 items, 13 prompts used the exact “Which sentence from the text best proves the answer?” wording, all 10 Mixed passages copied focused passages, and 10 full question signatures were duplicate occurrences. Every positional answer was authored in position A. Generic options such as “not in the story” or “not enough evidence” were weak elimination cues. Seven short-response acceptable-answer arrays also repeated the same normalized answer rather than documenting meaningful equivalents.

All 50 Skill Practice questions were rewritten. The revision supplies a coherent, unique passage for every item; varied, specific prompts; 150 newly reviewed distractors; passage-based evidence choices; explicit explanations; and four narrowly scored short responses with genuine harmless wording variants. The progression moves from explicit one-sentence retrieval, through why/how connections, to evidence selection and combined answer-plus-support tasks. Mixed contains ten new transfer passages and answer sets.

## Curriculum scorecard

| Measure | Before | After |
| --- | ---: | ---: |
| Total questions | 50 | 50 |
| Unique question IDs | 50 | 50 |
| Exact duplicate full-question occurrences | 10 | 0 |
| Exact duplicate passage occurrences | 40 (10 unique passages) | 0 (50 unique passages) |
| Focused-to-Mixed passage copies | 10 | 0 |
| Duplicate normalized choices within an item | 0 | 0 |
| Invalid scalar answer keys | 0 | 0 |
| Defective acceptable-answer arrays | 7 | 0 |
| Missing stimuli | 0 | 0 |
| Unresolved placeholders | 0 | 0 |
| Weak distractors replaced | — | 150 |
| Authored answer positions (positional items) | A: 43, B: 0, C: 0, D: 0 (43 items) | A: 12, B: 12, C: 11, D: 11 (46 items) |
| Position percentages | A: 100%, B–D: 0% | A: 26.1%, B: 26.1%, C: 23.9%, D: 23.9% |
| Shared-schema validity | Valid, despite content defects | Valid: 50/50 records |
| Renderer compatibility | 3 existing types | 3/3 existing types verified |
| Grade 2 language review | Repetitive/mechanical | 50/50 reviewed and rewritten |
| Curriculum review status | Needs revision | Classroom-ready |

Short-response items are excluded from the position calculation. “Weak distractors replaced” counts the three distractors in each of 50 rewritten items; no unsupported estimate of how many old distractors were weak is presented.

## Representative human-readable reviews

### Direct who/what/where — `G2E_RC_001_LVL1_Q03`

- **Issue found:** The old level recycled a passage and a generic setting prompt whose options mixed people, reasons, and places.
- **Educational reason:** Nonparallel options let a learner answer by recognizing a place phrase instead of reading for where.
- **Improvement:** A new classroom-art passage asks where paper is kept and provides four parallel, believable locations. The explanation points to the opening sentence.

### Why/how — `G2E_RC_001_LVL2_Q03`

- **Issue found:** The previous how template asked vaguely how “the character” solved “it,” even when pronouns had no clear referent.
- **Educational reason:** A learner should connect the problem and solution, not decode an ambiguous prompt.
- **Improvement:** Evan's paper boat tips over, he changes its bottom, and it floats. The prompt names Evan and the boat; the explanation connects the change to the result.

### Text evidence — `G2E_RC_001_LVL3_Q02`

- **Issue found:** Repeated evidence prompts used generic or meta-labeled distractors.
- **Educational reason:** Strong evidence practice requires comparing meaningful details, not rejecting a choice labeled as unsupported.
- **Improvement:** A kitten's actions provide several related details. Learners select the meowing and tapping of an empty bowl as the strongest evidence of hunger, and the explanation states why it is stronger.

### Mixed transfer — `G2E_RC_001_MIXED_Q10`

- **Issue found:** Mixed copied focused passages, so success could reflect answer memory rather than transfer.
- **Educational reason:** Transfer requires applying the questioning strategy in a fresh context.
- **Improvement:** A new community-cleanup passage asks which detail proves Mina solved a litter problem with help. The answer combines the helper and the action, while alternatives remain tied to the setting.

## Interaction, accessibility, and renderer review

The existing renderer supports all three authored types. Focused behavior checks verify correct and incorrect evaluation, exclusive best-evidence scoring, an equivalent short response, retry, JSON serialization, response restoration, and absence of scoring metadata or explanatory feedback before submission. Passage and question audio remain available. Prompts do not depend on color, images, sound, or fine motor actions; native buttons and the labeled short-response control remain serializable through existing state. No renderer or shared runtime change was necessary.

## Remaining known issues

None within this package review. Broader runtime randomization, other packages, and unrelated application areas were intentionally left unchanged.
