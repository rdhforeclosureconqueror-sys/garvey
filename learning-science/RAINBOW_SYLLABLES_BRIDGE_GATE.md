# Rainbow Syllables — first real activity bridge integration

## Scope
The original Syllables HTML game remains playable. A shared script (from PR #945) is loaded before its inline game code. The bridge has **no transport** configured: observations exist only for the current page session, and nothing is sent to a database or parent profile yet.

### Instrumented moments
- **Flashcards:** "I know it" -> `ready_to_continue`; "Need practice" -> `want_more_practice`. These are self-reports, not measured recognition accuracy, even though the game's existing local progression maintains its legacy yes/no counts.
- **Word builder:** `answer_submitted` records correct/incorrect with per-word attempt number and the rule category; incorrect outcomes also mark a `retry` opportunity. Raw words and typed responses are not emitted.
- **Sky Blaster:** `task_started` on a new mission, `rule_changed` on announced switches, and `answer_submitted` only on validated correct hits. Incorrect touches are ignored by the original game and do not generate fabricated errors.
- Supports and dimension codes remain observational opportunities. They do not represent an innate skill score or assessment diagnosis.

## Neuroscience Lessons 1–7
- Lessons 1–2: evidence from task interactions, not asserted brain changes.
- Lesson 3: confidence and retry are separate from objective correctness; guided and independent attribution remains future work.
- Lesson 4: actual cross-session retrieval and scheduling **not yet wired**.
- Lessons 5–6: observe literacy subskills without collapsing child performance into a language-intelligence label.
- Lesson 7: no math-ability conclusions from this literacy game.

## Verification boundary
Automated syntax and source-hook tests + shared bridge contract tests. Not a browser end-to-end check, not a production profile save, and not a verified live deployment.

## Next
After review/merge: instrument the writing and grammar games with this same bridge, then bind authenticated event transport and acceptance readback to the existing child profile in Garvey. Parent insights require repeated observations.
