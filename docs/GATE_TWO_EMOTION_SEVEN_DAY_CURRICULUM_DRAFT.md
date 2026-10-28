# Gate Two — Emotion: seven-day curriculum mapping (editorial draft)

Status: **DRAFT — Keeper/curriculum approval required before publishing as official teachings.**
This is the new Gate Two plan, **not** a reuse of the Emotion K–1 block-tower demo.

## Source-of-truth boundaries

- Gate Two is **Emotion** in the canonical Ten Gates order.
- Existing habit bank: names feelings; asks for space; breathes before reacting; recovers after overwhelm. Integration: name emotions before escalation, return to connection after hard feelings, use calming practices without prompting. Family practices: daily feelings check-in and shared breathing reset.
- Existing V2 Emotion block-tower fixture is **example-only** and must not become the production curriculum.
- Gate One supplies the interaction model: seven Sunday–Saturday days, visual symbol introduction, symbol puzzle, original paged story, read-aloud, match activity, decision, reflection, and practice history.
- The specific **seven Adinkra symbols for Gate Two are NOT yet established by the retrieved canonical Emotion curriculum**. Do not mislabel or assert cultural meanings. Symbol slots require reviewed mapping to the Adinkra PDF, glyph index and provenance before publication.

## Seven-day editorial learning arc

| Day | Draft principle / skill | Original story brief | Child's decision | Family practice | Adinkra symbol |
| --- | --- | --- | --- | --- | --- |
| Sunday | Notice: identify what I am feeling | A child feels unsettled before a community gathering but cannot explain why | Name a feeling instead of hiding it | Two-word feelings check-in | Pending review |
| Monday | Name: feelings have different shades | Two friends both say they are angry, but one feels disappointed and the other feels excluded | Choose a more accurate emotion word | Name feeling and possible cause | Pending review |
| Tuesday | Listen: notice what the body signals | A racing heart and tense shoulders appear before a difficult conversation | Notice body cues and ask for a moment | Body and breath check-in | Pending review |
| Wednesday | Pause: breathe before reacting | A misunderstanding in a shared project tempts a sharp response | Pause, breathe, and respond | Shared breathing reset | Pending review |
| Thursday | Express: ask for space or support respectfully | A young learner needs quiet while the group wants to continue | State a need without blaming others | Practice a respectful request | Pending review |
| Friday | Recover: return after an overwhelming moment | After frustration interrupts a task, a child chooses a way back | Use a reset and rejoin | Reconnect after a difficult feeling | Pending review |
| Saturday | Integrate: guide feelings without denying them | At a community celebration, the learner applies the week's lessons | Recognize, regulate, and reconnect | Family reflection and Keeper observation | Pending review |

**Editorial status:** These are proposed teaching themes derived from the existing Emotion habit bank, **not verified verbatim seven principles from a supplied Gate Two handbook**. Replace or approve them against the actual Gate Two curriculum before release.

## Daily story and interaction contract

1. **Symbol discovery**: display the approved glyph, Akan name, reviewed meaning, and provenance; use the Gate One memory/puzzle interaction.
2. **Original story**: 4–7 age-appropriate pages with characters, tension, a consequential choice, and a grounded resolution; label as original, not a historical Akan folktale.
3. **Read aloud**: accessible audio controls and text remain available without audio.
4. **Decision**: present meaningful options; incorrect choices provide explanation and retry, not shame.
5. **Reflection**: open-ended question, optional family conversation, journal entry.
6. **Practice**: a small real-life action and Keeper observation prompt.
7. **Games**: reuse Gate One puzzle, matching, and cascade mechanics with approved Gate Two symbols and teachings; no separate block-tower game.
8. **Progression**: completion of stories or games is not automatic Gate Recognition. Keep Keeper review and formal advancement separate.

## Implementation sequence

1. Confirm seven Gate Two principles and Adinkra symbol-to-PDF mappings with Keeper.
2. Write and review all seven complete original stories and child-facing decision/reflection prompts.
3. Extract the reusable Gate One experience shell into a shared component/data model without altering the existing Gate One route.
4. Build **/gate-two-experience.html** as an isolated, draft-accessible experience with its own browser storage namespace and accessible mobile layout.
5. Reuse the existing games and narration service; test symbol names, individual match feedback, speed controls, and mobile responsiveness.
6. Run validation and browser smoke tests; publish only after approved content review and release checks.

## Acceptance checks

- Sunday starts the seven-day sequence; day navigation works on phone and desktop.
- Each day contains its **own** reviewed symbol, story, choice, reflection, and practice.
- A child can read without narration, and can replay a story without losing journal history.
- Gate One progress remains unchanged; Gate Two data never overwrites it.
- A game match shows exactly its own symbol/name and does not confer Recognition.
- Old demo remains available only as a separate legacy/example experience; no link in the new Gate Two learning flow.
