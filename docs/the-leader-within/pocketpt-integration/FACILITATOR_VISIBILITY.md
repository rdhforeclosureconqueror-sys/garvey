# G6 Facilitator Pocket PT Visibility

## Purpose and UI locations

G6 gives authorized Leader Within facilitators only the movement participation status needed for coaching. It adds no Pocket PT coaching authority or mutation. The existing pages remain canonical: facilitator dashboard `GET /the-leader-within/facilitator/dashboard`, cohort control center `GET /admin/the-leader-within/cohorts/:cohortId`, and participant detail `GET /admin/the-leader-within/participants/:participantId`.

The cohort table and responsive cards display `Leader Within/<local mission> — Complete/Not complete` or `Pocket PT — <bounded status>`. The participant page adds a compact Movement Mission section with source, local mission where applicable, status, Pocket PT verification, trusted completion time, and source label. Cards wrap on narrow viewports and the desktop table remains hidden at the existing mobile breakpoint.

## Canonical bounded projection

`resolveFacilitatorPocketPtMovementState` reuses `resolveLeaderWithinPocketPtMovementState`; it does not duplicate assignment lookup or provider-state normalization. Its complete allowlist is:

* `movement_source`
* `required`
* `provider`
* `status`
* `status_text`
* `verified`
* `completed_at`
* `source_label`
* `mission` (LOCAL title only)
* `follow_up_recommended` (true only for the bounded safety-hold workflow state)

The full assignment row is never returned. A trusted completed Pocket PT state uses `Verified Pocket PT session`; LOCAL uses `Leader Within`. The preserved first provider `completed_at` is formatted through the existing date helper rather than rendered as raw UTC. A launch alone remains incomplete.

## Status mapping

| Canonical status | Facilitator label |
| --- | --- |
| `NOT_CONNECTED` | Not connected |
| `CONNECTED_NO_PROFILE` | Fitness profile not ready |
| `PROFILE_READY` | Fitness program being prepared |
| `PROGRAM_READY` | Ready for assignment |
| `NOT_ASSIGNED` | Not assigned |
| `NOT_STARTED` | Not started |
| `IN_PROGRESS` | In progress |
| `COMPLETED` | Completed |
| `SAFETY_HOLD` | Safety hold |
| `TEMPORARILY_UNAVAILABLE` | Temporarily unavailable |
| `COACH_REVIEW` | Coach review |
| `CANCELLED` | Cancelled |

Unknown provider state fails closed as `TEMPORARILY_UNAVAILABLE`, never complete. Safety hold shows only generic organizational coaching/safeguarding guidance; it does not create a case, diagnosis, note, or follow-up flag. Coach review is display-only. An outage neither changes five-step progress nor deletes or recreates an assignment.

## Authorization and sessions

Both pages use the established facilitator service boundary. `trustedActorFromRequest` selects the dedicated `tlw_facilitator_session` actor for facilitator routes, including when mixed cookies are present. `assertFacilitatorForCohortAsync` requires an authenticated facilitator actor, matching tenant, and active cohort assignment; existing Super Admin authority is honored. Participant detail first resolves the participant's enrollment/cohort on the server and then applies the same check. Browser participant, cohort, enrollment, facilitator, or tenant fields do not establish access. A youth session cannot authorize these views, and an ordinary Garvey owner cookie does not replace the facilitator session absent the existing explicit admin bridge.

## Privacy boundary

The projection and rendered movement section prohibit readiness, energy, sleep, soreness, pain or pain location, safety-validator reasoning/reason codes, diagnosis, exercises, sets, repetitions, weights, program/session internals, raw event bodies, provider identifiers, JWTs, HMACs, tokens, integration secrets, and Pocket PT private notes. The former broad Pocket PT activity-summary serialization was removed from participant detail. No mark-complete, safety override, reset, program, training-level, readiness, or exercise control exists.

LOCAL history and completion remain unchanged and never receive a Pocket PT label. Both audiences continue to derive mission completion and the five required steps from `resolveParticipantCurriculumState`; Pocket PT changes only MOVE after trusted completion.

## Activity, outcomes, and G7 boundary

G6 does not add feed entries because the existing rendered feed is a placeholder rather than a safe event-summary implementation. Safe activity-feed mapping remains deferred. Existing mission-derived completion outcomes naturally reflect canonical MOVE; no fitness analytics were added.

G6 performs repository-level automated verification only. It does not claim staging, live-user, or physical mobile verification and does not begin G7. Cross-system synthetic staging verification remains G7.
