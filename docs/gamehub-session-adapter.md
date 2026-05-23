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

## Why this phase comes before game-by-game instrumentation
A single adapter contract and payload guardrail must exist first so later instrumentation work can be consistent, testable, and safe. This PR does not add per-game event wiring and does not modify gameplay mechanics.
