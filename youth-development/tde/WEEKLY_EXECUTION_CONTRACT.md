# Weekly Execution Contract (Parent-Facing)

## Allowed actions
- `start_week`
- `resume_week`
- `save_reflection`
- `save_observation`
- `mark_step_complete`
- `continue_to_next_step`
- `continue_next_week`
- `create_case_profile`
- `route_external_support`
- `record_onboarding_touchpoint`

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
| `create_case_profile` | `contracted_and_validated` | strict contract + centralized execution path | highest |
| `route_external_support` | `contracted_and_validated` | strict contract + centralized execution path | highest |
| `record_onboarding_touchpoint` | `contracted_and_validated` | strict contract + centralized execution path | high |

Unknown observed actions are classified as `unknown_or_unresolved` and surfaced in audit output.

## Execution path policy

- **Strict execution route (default):**
  - `POST /api/youth-development/program/week-execution` accepts only `contracted_and_validated` and `deprecated_alias` actions through a single resolver + validator path.
  - Uncontracted/unknown actions still return `week_execution_contract_invalid`.

## Coverage summary after this pass

- Contracted and validated actions: **10**
- Deprecated aliases: **1**
- Uncontracted actions: **0**
- Remaining unresolved risk entries: unknown observed action types only (`unknown_or_unresolved`).

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
- `create_case_profile`: `case_profile_type`, `initiated_by`
- `route_external_support`: `support_channel`, `destination_team`, `routing_reason`
- `record_onboarding_touchpoint`: `touchpoint_type`, `touchpoint_outcome`

Defaults and normalization:
- `create_case_profile`
  - defaults: `case_priority=standard`, `referral_source=program_weekly_execution`
  - normalized: lowercased/trimmed enum fields.
- `route_external_support`
  - defaults: `urgency_level=routine`, `referral_source=program_weekly_execution`
  - normalized: `support_channel`, `destination_team`, `urgency_level` lowercased + trimmed; `routing_reason` trimmed and capped at 500 chars.
- `record_onboarding_touchpoint`
  - defaults: `touchpoint_note=""`
  - normalized: `touchpoint_type`, `touchpoint_outcome` lowercased + trimmed; `touchpoint_note` trimmed and capped at 2000 chars.

Validation behavior:
- `case_priority` must be one of `low|standard|high|urgent`.
- `urgency_level` must be one of `routine|expedited|urgent|emergency`.
- `touchpoint_outcome` must be one of `completed|attempted|deferred|unable_to_contact`.

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
