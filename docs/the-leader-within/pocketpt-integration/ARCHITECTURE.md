# Garvey Pocket PT Bridge Architecture

## G0 audit map

| Concern | Existing Garvey component | Bridge reuse |
| --- | --- | --- |
| Youth identity | `resolveYouthSession` resolves the HTTP-only `tlw_youth_session` into participant and enrollment ownership | Launch reads only the trusted actor; request body identity is never consulted |
| Enrollment/cohort position | `leader_within_program_enrollments` plus `leader_within_cohorts.current_week/current_session` | Assignment records the server-resolved active position |
| Movement completion | `leader_within_pocketpt_activity_summaries` | Verified completion adapter inserts a minimal `verified_pocketpt` summary |
| Mission progress | `resolveParticipantCurriculumState` computes the canonical five required steps | Existing resolver sees only movement completion; no story/practice/reflection/assessment write occurs |
| Local completion | `completeMovement` writes `local_mission` | Preserved for development/migration, distinct from provider authority |
| Safe audit | `leader_within_audit_events` | Launch and provider status/completion store opaque refs and status only |
| Schema delivery | idempotent `applyLeaderWithinMigrations` at application startup | Additive tables and indexes use `IF NOT EXISTS` |
| API convention | Express router and safe JSON errors | Youth launch and provider-only receiver use the existing integration style |
| Signing/idempotency | No reusable generic webhook framework was present | Narrow Pocket PT crypto/schema service and unique provider event ledger added |

## Request path

`Youth session → launch service → opaque subject/assignment → five-minute JWT → Pocket PT`

The browser receives a launch destination but never receives a signing secret or an authoritative participant identifier. Assignment uniqueness makes repeated launch safe.

## Completion path

`Pocket PT HMAC event → issuer/audience/time/schema validation → unique event ledger → locked assignment ownership check → assignment status → canonical movement summary → existing mission resolver`

The database transaction makes the event ledger, assignment update, movement adapter, and safe audit atomic. Duplicate provider event IDs are acknowledged without mutation.

## Trust boundaries

* Browser authority ends at the authenticated request to launch.
* Pocket PT authority is limited to allowed fitness assignment statuses for a pre-existing opaque Garvey assignment.
* Assignment ownership is immutable from the event body.
* Garvey retains leadership identity and progress authority.
* Fitness programming and private fitness state remain outside Garvey.
