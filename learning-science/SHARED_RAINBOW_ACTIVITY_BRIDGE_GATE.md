# Garvey shared activity bridge — implementation gate

## Status
Pure browser/Node event adapter **only**. This does not create a new child database, grading system, intelligence score, API endpoint, or production telemetry integration. The existing parent-selected child and Garvey backend are the authoritative owners of learning records.

## Activities
`rainbow-syllables`, `rainbow-writing`, `rainbow-grammar`, and `mission-planner` all use the same versioned `garvey_activity_event` contract.

Example:
```js
const bridge = GarveyActivityBridge.createBridge({ activityId: "rainbow-syllables" });
bridge.start("word_build");
bridge.record("rule_changed", { taskId: "sky_blaster", ruleId: "closed", practiceTags: ["rule_switching"], geniusDimensionCodes: ["SR", "RS"] });
bridge.record("answer_submitted", { taskId: "word_build", skillId: "closed_syllable", attemptNumber: 1, outcome: "unscored", supportUsed: ["read_aloud"], practiceTags: ["sequencing"] });
bridge.reflect("used_support");
bridge.complete();
```

## Separate evidence lanes
- `academic`: school skill area, task-specific skill ID and observed outcome—not a Genius score
- `executive_practice`: task demands, number of attempts, and support type; tags identify opportunities, not a diagnosis
- `genius_exploration`: **opportunity-only** dimension codes (SR, RS, PS, FB, CQ, CR, DE); no permanent labels
- `reflection_choice`: optional age-appropriate bounded strategy label, not personal free text

The bridge explicitly discards unapproved keys such as learner names, raw text answers, profile identifiers, and scores. Events are held **only in the page memory**, capped per session. An optional `transport(event)` may be supplied by the authenticated Garvey integration **later**. No transport is configured or called by default. Only the server may resolve the authenticated parent and child; never trust a client-provided learner ID.

## Lessons 1–7 alignment and remaining gaps
- Lessons 1–2: task-scoped observations rather than claims about neural change
- Lesson 3: support types separate guided from unsupported work (further explicit attempt-role mapping still needed)
- Lesson 4: activity/session identity exists, but **spaced retrieval scheduling and cross-session persistence are not implemented here**
- Lesson 5: the shared contract allows different skill IDs; per-child grade/subject divergence remains to be integrated server-side
- Lesson 6: distinct phonics, writing and grammar source areas; do not combine into a single language-intelligence score
- Lesson 7: keeps academic outcomes separate from other evidence; deeper conceptual/procedural/transfer probes remain outstanding

This is **not** completion of the Lessons 1–7 build ledger. Lesson 8 remains the bookmarked next educational lesson after technical catch-up.

## Next PR after review/merge
1. Mount this single script in the three Rainbow games and Mission Planner without changing gameplay.
2. Instrument highest-value moments: announced rule changes, word building and confidence; planning/drafting/editing/reflection; Sky Catch category changes/sentence building/punctuation.
3. Attach one authentic, child-scoped server transport to existing Garvey event storage; deduplicate event keys, check child ownership, and record only allowed observations. No browser-child identity or invented endpoint.
4. Add repeated cross-session summaries on the existing parent dashboard: **Skills practiced**, **Learning habits practiced**, **Strengths being explored**, **Next best step**.
5. End-to-end acceptance: offline gameplay, authenticated save/readback, child switching, and accessible controls.

Canonical tracker: [Garvey #943](https://github.com/rdhforeclosureconqueror-sys/garvey/issues/943).
