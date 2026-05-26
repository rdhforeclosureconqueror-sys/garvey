# Gate Practice Signal Architecture

## Purpose
This architecture defines **developmental observation signals** for Gate Practice Games.

It is intentionally designed to:
- observe practice patterns,
- support parent reflection,
- protect child dignity and safety,
- avoid grading, surveillance, and diagnosis.

This contract is architecture-only for now:
- no DB persistence,
- no gameplay rewrites,
- no auth changes,
- no dashboard implementation.

## Practice Session Lifecycle
A practice session must use only these lifecycle states/events:
- `session_start`
- `session_pause`
- `session_resume`
- `session_complete`
- `session_exit`

Expected flow:
1. `session_start`
2. zero or more `session_pause` / `session_resume` pairs
3. terminal event: `session_complete` **or** `session_exit`

## Practice Event Model
Allowed practice event examples include:
- `retry_after_mistake`
- `completed_round`
- `pause_selected`
- `calming_recovered`
- `attention_returned`
- `gradual_improvement`
- `consistent_practice`
- `frustration_exit`
- `resumed_after_pause`

Forbidden event/metric examples include:
- `IQ`
- `intelligence_score`
- `failure_rating`
- `low_performer`
- `disorder_prediction`
- `ranking_percentile`
- `child_comparison`

## Safe Developmental Signals
Signals are practice-oriented descriptors and **not scores**.

Examples:
- sustained attention practice
- impulse pause practice
- emotional recovery practice
- working memory repetition
- flexibility adaptation
- persistence after challenge

## Unsafe/Forbidden Metrics
The system explicitly prohibits:
- diagnostic scoring
- predictive mental health labeling
- cross-child ranking
- addiction loops
- streak pressure
- monetized compulsion systems
- manipulative retention mechanics

## Parent-facing Language Contracts
Allowed examples:
- “Your child practiced calming after frustration.”
- “Your child returned to the activity after pausing.”
- “Attention endurance increased during practice.”

Forbidden examples:
- “Your child is below average.”
- “Your child failed.”
- “Your child shows signs of disorder.”

## Child-facing Language Contracts
Required:
- calm tone
- optional pacing
- pause affordances
- encouragement without pressure

Prohibited:
- shame language
- failure labels
- countdown stress
- streak guilt

## Future Architecture Planning
Future implementation planning must include:
- API contracts,
- session ingestion flow,
- Timeline integration,
- Pattern Engine integration,
- consent boundaries,
- data retention boundaries,
- anonymized analytics boundaries.

## Safety Guardrails
Required guardrails:
- parent-controlled access
- no public leaderboards
- no social comparison
- no ad targeting from child data
- no biometric inference
- no hidden profiling


## Adaptive V2 Grade 1 Planning Note (PR G, Design-Only)

Date: 2026-05-26

This planning note clarifies how Adaptive V2 Grade 1 progress may later contribute to Gates developmental signals.

- Adaptive V2 Grade 1 may provide **aggregate practice signal candidates only** (for example persistence, attention follow-through, consistency, learning accuracy trend, and repair/recovery).
- A single miss, a raw score alone, or one session alone must not be treated as sufficient Gates evidence.
- Adaptive-derived signals remain non-diagnostic and must never be expressed as pass/fail judgments.
- PR G is planning only: no scoring implementation, no Gates writes, and no runtime behavior changes.


## Adaptive V2 Grade 1 PR H (Read-Only Mapper Implementation)

PR H introduces a read-only candidate signal mapper for persisted Adaptive V2 Grade 1 progress.

- Output is candidate-signal only and includes gate key/name, signal category, confidence band, supporting aggregate, and source `adaptive_v2_grade1`.
- Supporting data remains safe aggregate-only (practiced skill count, checkpoint attempt count, hint usage band, mastery band, repeated practice, next-step follow-through when available).
- No prompt text, answer text, child ranking, diagnostic labeling, or pass/fail framing is emitted.
- No Gates scoring or Gates writeback is performed in this phase.
