# Parent Route/Button/Action Audit

## Scope audited
- Intake result flow
- Parent dashboard
- Program page
- Weekly execution controls
- Week navigation controls

## Action map (post-fix)
| Button / Control | Current target/action | Corrected target/action | Required scope | Status |
|---|---|---|---|---|
| Start Program (intake/parent dashboard CTA) | `/youth-development/program` | `/youth-development/program?tenant={tenant}&email={email}&child_id={child_id}` | tenant+email+child_id | fixed/validated |
| Continue Development Plan | `/youth-development/program` | `/youth-development/program?tenant={tenant}&email={email}&child_id={child_id}` | tenant+email+child_id | fixed/validated |
| Back to Parent Dashboard | `/youth-development/parent-dashboard` | `/youth-development/parent-dashboard?tenant={tenant}&email={email}&child_id={child_id}` | tenant+email+child_id | fixed/validated |
| Save Reflection | `POST /api/youth-development/program/week-execution` | same endpoint w/ contract validation (`action_type=save_reflection`) | tenant+email+child_id+week+note | fixed/validated |
| Save Observation | `POST /api/youth-development/program/week-execution` | same endpoint w/ contract validation (`action_type=save_observation`) | tenant+email+child_id+week+note | fixed/validated |
| Mark Step Complete | `POST ... action_type=mark_step_complete` | same endpoint + strict `step_key` + ordered step guard | tenant+email+child_id+week+step_key | fixed/validated |
| Continue to Next Step | `action_type=continue_next_step` (legacy alias) | `action_type=continue_to_next_step` (canonical) | tenant+email+child_id+week | fixed/normalized |
| Continue Next Week | `action_type=continue_next_week` | same + progression guard (`ready_for_next_week`) and explicit error payload when blocked | tenant+email+child_id+week | fixed (working + blocked behavior explicit) |
| Previous week / Next week preview | in-page week offset preview | unchanged preview nav, deterministic bounds [1..36] | loaded week content | validated |
| Launch Program button | `POST /api/youth-development/program/launch` | unchanged + child/account scope retained | tenant+email(+child_id when available) | validated |
| Open Scheduled Session | in-page agenda/session card click | in-page lesson-plan focus state + selected session scope | child_id+week+session_id | validated |
| View Lesson Plan | in-page agenda/session card click | in-page lesson-plan render from `lesson_plan_template` + selected session scope | child_id+week+session_id | validated |
| Mark Session Complete (planner/session) | `POST /api/youth-development/program/session-complete` | same endpoint + persisted scheduled session status update | tenant+email+child_id+week+session_id | validated |
| Resume Session | in-page control | uses weekly execution contract `action_type=start_week` | tenant+email+child_id+week | validated |
| Open Next Scheduled Session | in-page control | selects next planned/in-progress session + lesson-plan focus | child_id+week+session_id | validated |
| Return to Weekly Overview | in-page control | scroll/focus return to week overview panel | client state only | validated |
| Next best action (Start Today’s Session) | parent progress dashboard guidance | mirrors same `startTodaySessionBtn` target session scope; disabled when unavailable | child_id+week+session_id | validated |
| Next best action (Resume Session) | parent progress dashboard guidance | mirrors same session resume flow (`action_type=start_week`) | tenant+email+child_id+week | validated |
| Next best action (Complete Reflection) | parent progress dashboard guidance | directs parent to reflection note save path (`action_type=save_reflection`) | tenant+email+child_id+week+note | validated |
| Next best action (Finish this week to unlock Next Week) | parent progress dashboard guidance | explicit blocked-state copy only when progression contract unmet | tenant+email+child_id+week | validated |
| Run Next Best Action | parent progress dashboard action button | dispatches to existing scoped controls (start/resume session, focus reflection, or continue next week); blocked copy when week not unlockable | child_id+week + existing control scope | validated |

## Known broken symptoms fixed
- Parent-facing **Continue Next Week** path now returns explicit guard errors and UI feedback instead of silent no-op when progression requirements are unmet.
- Legacy action mismatch (`continue_next_step` vs `continue_to_next_step`) is normalized server-side and corrected client-side.

## Regression-safe constraints preserved
- Assessment -> Start Program -> Week 1 bridge preserved.
- Weekly governance/audit metadata retained.
- Live youth v1 routes untouched.
- Planner/session additions remain parent-facing and child/week scoped (no admin-only routing introduced).

## Accessibility live-region usage (weekly program feedback)
- Dynamic parent feedback regions on `/youth-development/program` now use `role="status"` + `aria-live="polite"` (with `aria-atomic="true"` on core status lines) so assistive technologies announce updates without interrupting active reading.
- Primary announcement region: `#nextActionArea` (next action guidance, in-progress state, blocked state, and completion confirmations for weekly execution controls).
- Supporting announcement regions: `#executionStateArea`, `#nextBestActionCopy`, and `#nextBestActionBlocked` for execution-state transitions and progress-panel next-best-action updates.
- Announcement behavior expectation:
  - Action starts announce as “Action in progress: …”
  - Guard/progression failures announce as “Action blocked: …”
  - Successful weekly execution actions announce as “Action complete: …” with action-specific confirmation copy.
- These updates are additive UI semantics/copy only; weekly contracts and route behavior remain unchanged.
