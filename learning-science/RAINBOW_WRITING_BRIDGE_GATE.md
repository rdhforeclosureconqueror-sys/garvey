# Rainbow Writing — observable learning-process events

## Scope
Use merged `GarveyActivityBridge` (PR #945) within the existing Rainbow Writing Adventure HTML. The child still plans, drafts, revises, edits, and publishes using the original browser-local story storage and gameplay.

The bridge is **in-memory and transport-free** in this PR: no new account flow, network request, parent-data write, additional score, or child identification.

## Evidence moments
| Real action | Observation | Evidence boundary |
| --- | --- | --- |
| Check five-part plan | unscored writing-plan attempt | Completion of plan fields is not writing quality |
| Show plan/story example | hint/support event | Example use is not independent evidence |
| Check story beginning/middle/ending | unscored story-structure attempt | Three formatted sections are not a scored writing rubric |
| Edit child draft *after* a successful structure check | one draft-revision observation | Actual post-check edit, not merely choosing a sample sentence |
| Choose a model detail revision | scored revision-selection exercise | Does not imply child edited their own story |
| Check sentence edit | correct/incorrect bounded item outcome; retry on error | No raw sentence or typed answer leaves the game |
| Publish story | optional strategy reflection followed by completion | Publishing uses original game rules; no auto-judgment of story quality |

A new story adventure starts a **new bridge session**, so later attempts are not hidden after an earlier publish. The existing story content remains stored using the game's pre-existing browser-local behavior; it is never added to Garvey activity events.

## Neuroscience Lessons 1–7
This is implementation evidence for observable practice (Lessons 1–2), task supports and adjustments (Lesson 3), heterogeneous literacy outcomes (Lessons 5–6), and non-diagnostic interpretation. It **does not** implement Lesson 4 spaced-retrieval scheduling or authenticated cross-session evidence aggregation. Lesson 7 mathematical-reasoning work remains a separate curriculum need.

## Next gates
1. Review, fix, merge and verify this Writing integration.
2. Instrument Rainbow Grammar's rule changes, Sky Catch, sentence building, punctuation and capital checks through the **same** bridge.
3. Connect one authenticated, child-scoped event write/readback to the existing Garvey parent profile, then implement strengths-based summaries only when evidence supports them.

Canonical work tracker: [Garvey #943](https://github.com/rdhforeclosureconqueror-sys/garvey/issues/943).
