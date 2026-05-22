# Gates Practice Game Registry + Developmental Mapping

## Purpose

This system introduces **optional Gate Practice Games** that map existing standalone games to Gate-aligned developmental practice contexts without changing scoring, child profiles, assessment outputs, or persistence behavior.

Safety language used in UI and registry:

> These games are optional developmental practices. They are not tests, grades, or diagnoses.

## Scope of this PR

- Adds a Gate Practice Game registry module.
- Adds a Gate Detail UI section: **Gate Practice Games**.
- Shows game-level developmental mapping guidance for parent observation and reflection.

## Out of Scope / Guardrails

- No database migrations.
- No gameplay persistence.
- No scoring changes.
- No rewards/streaks.
- No addictive mechanics.
- No diagnostic language.

## Registry Data Contract

Each registered game includes:

- `supported_gates`
- `developmental_capacities`
- `suggested_age_range`
- `recommended_duration`
- `safety_notes`
- `observation_signals`
- `parent_reflection_prompts`

## Registered Game Set

1. Brain Game Suite
   - Rhythm Race
   - Visual Memory
   - Picture Puzzle
2. Brick Burst
3. NeuroSpark Kids Lab
   - Freeze Runner
   - Distraction Defender
   - Plasma Hold
   - Calm Reactor
   - Switch Matrix

## UI Integration

On Gate Detail pages, the **Gate Practice Games** section now displays:

- game title
- what it practices
- which Gate it supports
- suggested duration
- observation signals
- parent reflection prompt

This section is intentionally informational and non-scored.
