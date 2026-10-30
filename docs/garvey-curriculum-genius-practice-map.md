# Garvey Curriculum × Genius × Practice Map (v0.1)

## Purpose

Garvey will organize learning around the experiences it provides—not diagnose children, measure medical outcomes, or claim that a game changes a brain function.

Every activity will document:

1. **Academic skill** — the content being practiced (for example, equivalent fractions).
2. **Task demands** — what the child must do to complete it (hold a sequence, compare quantities, follow steps, orient on a grid).
3. **Garvey practice tags** — repeatable processes the platform deliberately practices.
4. **Seven-Genius connections** — the relevant dimension(s) from Garvey's existing, authoritative seven-genius framework.
5. **Evidence inside Garvey** — observable session data only.
6. **Parent extension** — an optional real-world activity using the same task demands.

The map is not an American-school-standard dependency. School subjects provide familiar content and repeated practice opportunities; Garvey's curriculum remains organized around skills, learning approaches, and the child's response to them.

## Guardrails

- Report observations, never diagnoses or predictions.
- A game score is evidence about performance in that game at that difficulty; it is not an IQ score or a label.
- Map activity demands, not a child's fixed identity.
- Keep academic mastery, game performance, and parent observations as separate evidence streams.
- Use the exact existing seven-genius labels and definitions from Garvey as the source of truth.

## Garvey's authoritative seven dimensions

| Code | Parent-facing dimension | Existing technical label |
|---|---|---|
| SR | Focus & Self-Control | Self-Regulation |
| CQ | Curiosity & Love of Learning | Curiosity / Exploratory Drive |
| CR | Creativity & Idea Thinking | Creativity / Problem Finding |
| RS | Thinking & Problem Solving | Reasoning / Pattern Recognition |
| PS | Effort & Resilience | Persistence / Challenge Tolerance |
| FB | Learning From Feedback | Feedback Responsiveness |
| DE | Interests & Passion Areas | Domain Engagement |

## Shared practice vocabulary

| Practice tag | What the child practices in Garvey | Observable evidence |
|---|---|---|
| visual_recall | Notice and retrieve visual details | accuracy by sequence length and question type |
| ordered_recall | Hold and retrieve an order or position | first/middle/last position accuracy |
| working_hold | Keep information active while responding | accuracy after reveal delay |
| selective_attention | Attend to relevant details among distractors | distractor errors and completion |
| rule_switching | Apply a changed rule | accuracy after rule change |
| sequencing | Follow or construct ordered steps | step-order accuracy and retries |
| spatial_reasoning | Interpret location, shape, size, or proportion | visual-model vs symbolic performance |
| quantitative_reasoning | Compare, compose, estimate, or calculate quantity | mastery of fresh skill items |
| symbolic_translation | Connect a representation to a symbol or notation | visual-to-symbol and symbol-to-visual accuracy |
| language_explanation | Explain a process, reason, or answer | optional spoken/written explanation rubric |
| persistence | Return, retry, and complete an appropriate challenge | completed attempts, voluntary retry, break use |
| self_reflection | Name a strategy that helped | selected strategy or short reflection |

## Initial activity map

| Garvey activity | Academic skill / game goal | Task demands | Practice tags | Seven-genius mapping status | Parent extension |
|---|---|---|---|---|---|
| Sight Memory — Kids | Recall an emoji sequence and answer varied position questions | encode, hold, retrieve, distinguish position, adapt to question type | visual_recall, ordered_recall, working_hold, selective_attention, rule_switching | SR, RS, PS | Place 3–5 familiar objects in a row, cover them, ask about a randomized position |
| Sight Memory — Adult | Recall symbols, colors, letters, and numbers | encode multiple attributes, retrieve a requested attribute/position | visual_recall, ordered_recall, working_hold, selective_attention, rule_switching | SR, RS, PS | Use cards with letters/numbers/colors; change the question each turn |
| Equivalent fractions | Recognize equal quantities represented differently | compare part-whole relationships, use a visual model, connect it to notation | spatial_reasoning, quantitative_reasoning, symbolic_translation, sequencing | RS, SR, FB | Fold paper into halves and quarters; show why 2/4 equals 1/2 |
| Fraction comparison | Decide which fraction represents more, less, or the same | represent quantities, compare, justify | spatial_reasoning, quantitative_reasoning, language_explanation | RS, SR, FB | Compare two food portions or fraction strips and explain the choice |
| Coordinate plotting | Locate and describe points on a grid | hold ordered pair, move horizontal then vertical, orient spatially | spatial_reasoning, sequencing, working_hold, symbolic_translation | RS, SR, FB | Tape a floor grid and walk ordered pairs |
| Multiplication arrays | Connect groups, arrays, repeated addition, and facts | group, count, notice pattern, translate visual to equation | quantitative_reasoning, spatial_reasoning, symbolic_translation | RS, CQ, CR | Build arrays with coins, snacks, or blocks |
| Reading comprehension | Build meaning from text and answer from evidence | attend, retain details, infer, explain | working_hold, selective_attention, language_explanation, sequencing | SR, RS, CQ | Pause during a short story: “What happened first? What detail supports that?” |
| Phonics / word building | Connect sounds, letters, and words | discriminate sound, retain sequence, blend/segment | ordered_recall, selective_attention, symbolic_translation | SR, RS, FB | Say a three-sound word; have the child tap each sound then blend it |

## Testable response model

Each session stores only observable interaction data:

```json
{
  "activity_id": "sight_memory",
  "content_version": "v1",
  "practice_tags": ["visual_recall", "ordered_recall"],
  "difficulty": { "sequence_length": 4, "reveal_seconds": 3 },
  "attempts": 5,
  "correct": 4,
  "response_time_ms": 6200,
  "hints_used": 0,
  "error_tags": ["middle_position"],
  "completion": "completed",
  "parent_observation": null
}
```

Progress is compared at equivalent or clearly described difficulty. Garvey can say:

> “In comparable Sight Memory rounds, your child answered 4 of 5 questions correctly this week, compared with 2 of 5 in their first recorded round.”

It should not say:

> “This game increased your child’s working memory,” or “Your child has a memory deficit.”

## Adaptive connection rule (hypothesis to test inside Garvey)

When an academic lesson and a game share a practice tag, Garvey may offer them in the same learning journey and compare the child's **within-platform** response over time.

Example: a fraction lesson using fraction bars and Sight Memory both include visual recall/working hold, but they remain separately measured. The system can test whether a child engages more successfully with visual fraction representations after repeated related practice. It cannot assume the game caused a gain.

## Parent role

Parent activities are optional reinforcement, not controlled evidence. Parent observations are displayed beside—but never merged into—the child’s game or lesson score.

Suggested parent response choices:

- “I noticed something similar at home.”
- “I have not noticed a change yet.”
- “I’m not sure yet.”
- Optional note: what was observed, in what activity, and when.

## Implementation order

1. Tag the existing Sight Memory and current Grade 4/5 math lessons.
2. Connect the machine-readable map in `youth-development/content/curriculumGeniusMap.js` to lesson and game rendering.
4. Save session events with content version and difficulty.
5. Add parent-facing descriptions that report observations only.
6. Pilot the mapping with fresh/unseen academic items and refine only from recorded Garvey data.

## Definition of success for this branch

A reviewer can trace any activity from: **lesson/game → task demand → Garvey practice tag → approved genius dimension(s) → observable platform evidence → optional parent reinforcement**.
