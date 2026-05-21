# Gates Development Timeline

## Philosophy
The development timeline introduces a growth memory layer that preserves developmental moments over time while keeping current Gates scoring and identity boundaries unchanged.

## Why this is not surveillance
This timeline records narrative growth memories, not behavior surveillance, punishment, or compliance tracking. It is parent-scoped and child-scoped, and designed to support reflection.

## Event types
- `assessment_completed`
- `growth_gate_selected`
- `practice_progress_updated`
- `growth_signal_noted` (future path; only when existing flow support is available)

## Ownership model
Timeline reads and writes are restricted to authenticated parent sessions and strict child ownership checks.

## Idempotency model
Timeline events use deterministic `timeline_event_id` values and `ON CONFLICT DO NOTHING` to prevent uncontrolled duplicate inserts.

## Future expansion ideas
- Gate practice started/revisited variants
- Habit signal and self-correction events from existing check-in paths
- Ceremony-readiness and integration moments as existing flows mature

## Safeguards
- Additive migration only
- No changes to gates scoring thresholds or assessment semantics
- No messaging, reward loops, streaks, or leaderboard mechanics
