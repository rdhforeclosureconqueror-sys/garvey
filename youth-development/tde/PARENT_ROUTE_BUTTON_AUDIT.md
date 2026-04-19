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

## Known broken symptoms fixed
- Parent-facing **Continue Next Week** path now returns explicit guard errors and UI feedback instead of silent no-op when progression requirements are unmet.
- Legacy action mismatch (`continue_next_step` vs `continue_to_next_step`) is normalized server-side and corrected client-side.

## Regression-safe constraints preserved
- Assessment -> Start Program -> Week 1 bridge preserved.
- Weekly governance/audit metadata retained.
- Live youth v1 routes untouched.
