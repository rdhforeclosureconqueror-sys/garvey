# GameHub Session Adapter Scaffold (PR10)

## Purpose
This phase introduces a shared GameHub session adapter scaffold so future per-game instrumentation can emit safe developmental signals through one common interface.

## Current status: no-op and in-memory only
- Adapter path: `public/gamehub/gamehub-session-adapter.js`
- Exported API:
  - `startSession(context)`
  - `endSession(summary)`
  - `emit(eventName, payload)`
  - `getSessionSnapshot()`
- Current behavior is intentionally local and ephemeral:
  - no network calls
  - no localStorage writes
  - no database writes
  - safe no-op usage when games do not call it

## Canonical event names in scaffold
The adapter currently allows only these event names:
- `game_session_started`
- `game_session_ended`
- `activity_selected`
- `round_started`
- `round_completed`
- `level_changed`
- `retry_started`
- `recovery_after_miss`
- `challenge_selected`
- `accuracy_summary`
- `persistence_signal`

## Forbidden payload policy
To keep this phase safety-first and child-protective, payload sanitization strips blocked keys and free text content categories including:
- child names
- raw typed answers
- exact question text
- diagnostic labels
- grade/score verdict language
- free text fields

This allows structural signal prototyping without collecting sensitive child runtime content.

## Registry readiness fields
- `tracking_ready` remains `false` for every game in `public/gamehub/gamehub-registry.js`.
- `adapter_ready` is `true` for every game only to indicate shared scaffold availability, not per-game instrumentation completion.

## BrickBlast pilot (local-only preview)
BrickBlast is the first minimal pilot wired to the adapter. This is still local/in-memory only:
- no server tracking
- no database writes
- no Gates scoring wiring
- no child identity fields
- no raw answers or exact gameplay telemetry fields

### BrickBlast event map
- `game_session_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `round_started`
  - payload keys: `level_band`, `activity_key`
- `round_completed`
  - payload keys: `success`, `duration_band`, `level_band`
- `level_changed`
  - payload keys: `previous_level_band`, `next_level_band`
- `recovery_after_miss`
  - payload keys: `event_category`
- `game_session_ended`
  - payload keys: `completion_state`, `level_band`, `persistence_band`

### Guardrails for this pilot
- Allowed payload categories are banded/enum-style signals only.
- Not emitted: exact score, exact combo count, exact coordinates, raw collision data, diagnostics, or child identifiers.
- Registry `tracking_ready` remains `false` for all games while this pilot is validated.

## Surf pilot (local-only preview)
Surf is the second minimal pilot wired to the adapter and remains local/in-memory only:
- no server tracking
- no database writes
- no Gates scoring wiring
- no child identity fields
- no raw math prompts or raw answers

### Surf event map
- `game_session_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `round_started`
  - payload keys: `activity_key`, `mode`
- `challenge_selected`
  - payload keys: `difficulty`, `activity_key`
- `round_completed`
  - payload keys: `success`, `attempt_count_band`, `difficulty`, `activity_key`
- `recovery_after_miss`
  - payload keys: `event_category`, `streak_band`
- `level_changed`
  - payload keys: `level_band`
- `persistence_signal`
  - payload keys: `persistence_band`
- `game_session_ended`
  - payload keys: `completion_state`, `duration_band`, `persistence_band`

### Surf guardrails
- Adapter payloads use only enum/banded safety fields.
- Surf does not emit exact math question text, raw answers, exact scores, exact coins, exact coordinates, diagnostics, or child identifiers.
- Registry `tracking_ready` remains `false`.

## Spelling pilot (local-only preview)
Spelling is the third minimal pilot wired to the adapter and remains local/in-memory only:
- no server tracking
- no database writes
- no Gates scoring wiring
- no child identity fields
- no raw spelling words, typed answers, or exact question text in adapter payloads

### Spelling event map
- `game_session_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `activity_selected`
  - payload keys: `activity_key`, `mode`
- `round_started`
  - payload keys: `activity_key`, `mode`
- `round_completed`
  - payload keys: `success`, `duration_band`, `activity_key`, `mode`
- `retry_started`
  - payload keys: `event_category`, `persistence_band`
- `recovery_after_miss`
  - payload keys: `event_category`, `persistence_band`
- `game_session_ended`
  - payload keys: `completion_state`, `duration_band`, `persistence_band`

### Spelling guardrails
- Adapter payloads are limited to canonical safety keys (`game_key`, `activity_key`, `mode`, `success`, `duration_band`, `persistence_band`, `completion_state`, `event_category`).
- Spelling does not emit raw words, typed answers, exact question text, exact score values, diagnostics, or child identifiers.
- Registry `tracking_ready` remains `false`.

## 1st Grade Sight Words pilot (local-only preview)
1st Grade Sight Words is the fourth minimal pilot wired to the adapter and remains local/in-memory only:
- no server tracking
- no database writes
- no Gates scoring wiring
- no child identity fields
- no raw words, typed letters, or raw answer text in adapter payloads

### 1st Grade Sight Words event map
- `game_session_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `activity_selected`
  - payload keys: `game_key`, `activity_key`, `mode`
- `round_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `round_completed`
  - payload keys: `game_key`, `activity_key`, `mode`, `success`, `duration_band`, `persistence_band`
- `retry_started`
  - payload keys: `game_key`, `activity_key`, `mode`, `event_category`
- `recovery_after_miss`
  - payload keys: `game_key`, `activity_key`, `mode`, `event_category`
- `game_session_ended`
  - payload keys: `game_key`, `activity_key`, `mode`, `completion_state`, `duration_band`, `persistence_band`

### 1st Grade Sight Words guardrails
- Adapter payloads are limited to canonical safety keys (`game_key`, `activity_key`, `mode`, `success`, `duration_band`, `persistence_band`, `completion_state`, `event_category`, `hint_band`).
- Sight Words does not emit raw words, typed letters, raw answers, exact question text, exact score values, diagnostics, or child identifiers.
- Registry `tracking_ready` remains `false`.

## Game6 (Spelling Match Arena) pilot (local-only preview)
Game6 / Spelling Match Arena is the fifth minimal pilot wired to the adapter and remains local/in-memory only:
- no server tracking
- no database writes
- no Gates scoring wiring
- no child identity fields
- no raw words, prompts, selected answers, or answer text in adapter payloads

### Game6 event map
- `game_session_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `activity_selected`
  - payload keys: `game_key`, `activity_key`, `mode`
- `round_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `round_completed`
  - payload keys: `game_key`, `activity_key`, `mode`, `success`, `duration_band`, `persistence_band`, `accuracy_band`
- `retry_started`
  - payload keys: `game_key`, `activity_key`, `mode`, `event_category`
- `recovery_after_miss`
  - payload keys: `game_key`, `activity_key`, `mode`, `event_category`
- `game_session_ended`
  - payload keys: `game_key`, `activity_key`, `mode`, `completion_state`, `duration_band`, `persistence_band`

### Game6 guardrails
- Adapter payloads are limited to canonical safety keys (`game_key`, `activity_key`, `mode`, `success`, `duration_band`, `persistence_band`, `completion_state`, `event_category`, `accuracy_band`).
- Game6 does not emit raw words, prompt text, selected answer text, exact score values, diagnostics, or child identifiers.
- Registry `tracking_ready` remains `false`.

## Adaptive Learning pilot (local-only preview)
Adaptive Learning is now minimally instrumented with the same no-op session adapter pattern and remains local/in-memory only:
- no server tracking
- no database writes
- no Gates scoring wiring
- no raw prompts, selected answers, correct answers, explanations, or learner-name payloads
- no diagnostic/readiness labels in adapter payloads

### Adaptive Learning event map
- `game_session_started`
  - payload keys: `game_key`, `activity_key`, `mode`
- `activity_selected`
  - payload keys: `game_key`, `activity_key`, `mode`, `subject`
- `round_started`
  - payload keys: `game_key`, `activity_key`, `mode`, `subject`, `difficulty_band`, `grade_band`
- `round_completed`
  - payload keys: `game_key`, `activity_key`, `mode`, `difficulty_band`, `grade_band`, `duration_band`, `accuracy_band`
- `level_changed`
  - payload keys: `game_key`, `activity_key`, `mode`, `difficulty_band`, `grade_band`
- `challenge_selected`
  - payload keys: `game_key`, `activity_key`, `mode`, `difficulty_band`, `grade_band`
- `accuracy_summary`
  - payload keys: `game_key`, `activity_key`, `mode`, `accuracy_band`, `difficulty_band`, `grade_band`
- `persistence_signal`
  - payload keys: `game_key`, `activity_key`, `mode`, `persistence_band`
- `recovery_after_miss`
  - payload keys: `game_key`, `activity_key`, `mode`, `event_category`
- `game_session_ended`
  - payload keys: `game_key`, `activity_key`, `mode`, `completion_state`, `duration_band`, `persistence_band`

### Adaptive Learning guardrails
- Payloads are aggregate/banded only: no raw educational content leaves runtime.
- Instrumentation does not alter adaptive flow, question selection, results rendering, or local history behavior.
- `tracking_ready` remains `false`.
