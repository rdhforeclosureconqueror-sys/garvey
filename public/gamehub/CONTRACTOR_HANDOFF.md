# Contractor Handoff

## Goal

Transform the uploaded prototypes into a unified 10-Gate developmental game platform.

## Data source interpretation

The uploaded prototypes show three strong directions:

1. Brain Game Suite
   - Rhythm Race
   - Visual Memory
   - Picture Puzzle
   - child profiles
   - adaptive placement logic

2. Brick Burst: Combo Rush
   - arcade brick-breaker
   - combo, lives, powerups
   - should be redesigned as Resilience Breaker

3. NeuroSpark Kids Lab
   - Freeze Runner
   - Distraction Defender
   - Plasma Hold
   - Calm Reactor
   - Switch Matrix

## Event contract

Every game must call the Gate Engine with this shape:

```js
{
  gameId: "forest",
  gameName: "Forest of Whispers",
  gate: "attention",
  capacity: "selective_focus",
  mechanic: "collected_attention_light",
  value: 1,
  note: "optional"
}
```

## Gate IDs

- attention
- impulse_control
- working_memory
- emotional_regulation
- resilience
- cognitive_flexibility
- planning_sequencing
- body_rhythm_timing
- self_awareness
- social_awareness

## Implementation plan

1. Keep the existing game visuals and controls.
2. Add the shared Gate Engine to each game.
3. Replace score-only outcomes with developmental events.
4. Add profile-based adaptive difficulty.
5. Add parent/teacher observation language.
6. Export JSON reports.
7. Later migrate to React, Unity, Godot, or mobile.

## Game transformation plan

### Brain Game Suite

- Rhythm Race -> Gates 2 and 8
- Visual Memory -> Gates 1 and 3
- Picture Puzzle -> Gates 6 and 7

### Brick Burst

Transform into Resilience Breaker:

- missed ball -> recovery event
- relaunch -> emotional regulation event
- steady paddle -> impulse control event
- strategy reflection -> self-awareness event

### NeuroSpark Kids Lab

Use as Gate Missions:

- Freeze Runner -> Gate 2
- Distraction Defender -> Gate 1
- Plasma Hold -> Gates 2 and 8
- Calm Reactor -> Gates 4 and 9
- Switch Matrix -> Gate 6

## MVP acceptance criteria

- All 10 Gates visible
- At least one game maps to each Gate
- Game actions generate Gate events
- Report page updates from real events
- Exported JSON includes profile, scores, observations, and events
