# Weekly Execution Contract (Parent-Facing)

## Allowed actions
- `start_week`
- `resume_week`
- `save_reflection`
- `save_observation`
- `mark_step_complete`
- `continue_to_next_step`
- `continue_next_week`

## Action contract coverage audit (2026-04-20)

| action_type | classification | validation path | risk priority |
| --- | --- | --- | --- |
| `start_week` | `contracted_and_validated` | strict contract + state machine | high |
| `resume_week` | `contracted_and_validated` | strict contract + state machine | medium |
| `save_reflection` | `contracted_and_validated` | strict contract (`note` required) | high |
| `save_observation` | `contracted_and_validated` | strict contract (`note` required) | high |
| `mark_step_complete` | `contracted_and_validated` | strict contract (`step_key` required) | high |
| `continue_to_next_step` | `contracted_and_validated` | strict contract + progression guard | high |
| `continue_next_week` | `contracted_and_validated` | strict contract + progression guard | high |
| `continue_next_step` | `deprecated_alias` | normalized to `continue_to_next_step` | high |
| `create_case_profile` | `uncontracted_pass_through` | compatibility-only (not executed in strict route) | highest |
| `route_external_support` | `uncontracted_pass_through` | compatibility-only (not executed in strict route) | highest |
| `record_onboarding_touchpoint` | `uncontracted_pass_through` | compatibility-only (not executed in strict route) | high |

Unknown observed actions are classified as `unknown_or_unresolved` and surfaced in audit output.

## Execution path policy

- **Strict execution route (default):**
  - `POST /api/youth-development/program/week-execution` accepts only `contracted_and_validated` and `deprecated_alias` actions.
  - Uncontracted/unknown actions return `week_execution_contract_invalid`.
- **Compatibility classification mode:**
  - Validator can be run with `allowUncontractedPassThrough=true` for audit/telemetry pipelines to preserve visibility without forcing immediate hard-fail in analysis contexts.
  - This compatibility mode does **not** execute uncontracted actions in the live strict route.

## Next actions to contract

Priority order for follow-up contracting:
1. `create_case_profile` (profile/case creation side effects).
2. `route_external_support` (external routing and downstream handoff risk).
3. `record_onboarding_touchpoint` (onboarding-critical traceability).

## Required payload contract
Required for all actions:
- `tenant` (string)
- `email` (string)
- `child_id` (string)
- `week_number` (integer 1..36)
- `action_type` (one of allowed actions)

Additional required fields by action:
- `save_reflection`: `note`
- `save_observation`: `note`
- `mark_step_complete`: `step_key` (`core_activity|stretch_challenge|reflection_checkin|observation_support`)

Invalid payloads return:
- `ok: false`
- `error: week_execution_contract_invalid`
- `messages: string[]`

## Weekly state machine
States:
- `not_started`
- `in_progress`
- `blocked`
- `ready_for_next_week`
- `completed`

Valid transition highlights:
- `not_started -> in_progress` via `start_week`, `save_*`, or valid `mark_step_complete`
- `in_progress -> blocked` when progression guards fail (`continue_to_next_step` before required completion, out-of-order step completion)
- `blocked -> in_progress` via `resume_week` or valid corrective action
- `in_progress -> ready_for_next_week` when all step completions + reflection + observation are saved
- `ready_for_next_week -> completed` via `continue_next_week`

## Progression guards
- `continue_to_next_step` requires current active step already completed.
- `continue_next_week` requires `week_status=ready_for_next_week`.
- No silent week advancement. Week index advances only on explicit valid `continue_next_week`.
- Week 36 never increments beyond 36.

## Canonical step sequence
1. `core_activity`
2. `stretch_challenge`
3. `reflection_checkin`
4. `observation_support`
