# Rainbow Grammar Kingdom — event bridge integration

## Status and boundary
The original Grammar Kingdom HTML game now emits **in-memory, transport-free** observations using the existing `GarveyActivityBridge`. No client-provided child identity, network write, score layer, or new profile system is introduced. These observations are **not yet parent-visible**. Original controls and feedback remain the source of gameplay behavior.

## Hooked moments
- **Sky Catch:** `task_started`, announced `rule_changed`, and correct/incorrect `answer_submitted` on actual tappable selections. Falling offscreen is not a recorded wrong answer.
- **Word Detective:** explicit classification decisions with correct/incorrect outcomes and per-question attempt counts.
- **Sentence Magic:** creative word substitution as **unscored** choice; not a demonstration of grammar mastery or of revising a child's authored draft.
- **Sentence Builder:** word-order checks, undo as an adjustment observation, and retry events for an unsuccessful arrangement.
- **Punctuation and Capitals:** individual correct/incorrect check decisions with attempt counts.

All evidence is confined to bounded task labels, existing SR/RS/PS/FB/CR opportunity codes and task outcomes. No raw words, sentences, schoolwork text, Genius ranking, or diagnosis enters events.

## Lessons 1–7 alignment
This adds observable task evidence (Lessons 1–2), focused-rule changes and retry opportunities (Lesson 3), and distinct literacy components (Lessons 5–6). It **does not** yet implement spaced retrieval across sessions (Lesson 4), independent versus assisted scoring in a backend, or math reasoning (Lesson 7). No low-Genius label may come from errors.

## Next integration gate
Review → fix → merge → verify this PR. Then attach one authenticated, child-authorized transport to existing Garvey events storage, establish safe readback and cross-session evidence, and show four descriptive parent cards only with justified repeated observations.

Tracker: [Garvey #943](https://github.com/rdhforeclosureconqueror-sys/garvey/issues/943).
