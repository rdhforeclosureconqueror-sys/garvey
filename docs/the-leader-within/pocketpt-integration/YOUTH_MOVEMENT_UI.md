# G5 Youth Movement UI

## Source and safe state

The youth dashboard resolves exactly one movement source. `LOCAL` preserves the existing facilitator-assigned movement and local completion action. `POCKETPT` is selected by an existing current assignment or the `LEADER_WITHIN_MOVEMENT_SOURCE=POCKETPT` deployment setting. Historical records are not converted.

`resolveLeaderWithinPocketPtMovementState` is the server-side allowlist. It emits only `movement_source`, `required`, display provider/name, bounded `status` and `status_text`, `launch_available`, and `completed_at`. Its vocabulary is `NOT_CONNECTED`, `CONNECTED_NO_PROFILE`, `PROFILE_READY`, `PROGRAM_READY`, `NOT_ASSIGNED`, `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SAFETY_HOLD`, `TEMPORARILY_UNAVAILABLE`, `COACH_REVIEW`, and `CANCELLED`. Raw health, readiness, safety reasons, workouts, identifiers, events, and credentials are intentionally absent.

## Launch, authorization, and CSRF

`POST /api/the-leader-within/my-program/movement/launch` is handled by `pocketPtIntegrationService.launch`. The router resolves `tlw_youth_session` before its single canonical `requireCsrf` validator. The request uses `x-csrf-token`, whose expected value is the HMAC-derived token on the resolved youth actor; browser fetch uses `credentials: 'include'`. The session cookie is `HttpOnly`, root (`Path=/`) scoped, and is the binding context. A failed CSRF check returns `csrf_failed`; reloading the dashboard refreshes actor/session state.

The handler requires an authenticated youth actor and active enrollment/cohort, binds enrollment and participant server-side, and ignores browser identity fields. The unique assignment key makes repeated launches reuse the logical assignment. The minimal response is `{ok, movement:{status,provider}, launch_url}`. The signed context stays embedded in the URL; no database identity or secret is returned.

Launch changes only a not-started assignment to `IN_PROGRESS`; it never writes movement completion. Only the authenticated, allowlisted, HMAC-verified provider event transaction can write the canonical movement summary. Returning to `/the-leader-within/my-program` reads durable Garvey state and the existing five-step curriculum resolver recalculates progress.

## Youth experience

The source-specific card uses text status, a 44px minimum tap target, live loading/error text, duplicate-tap suppression, bounded copy, and wrapping mobile-safe markup. `SAFETY_HOLD` and non-launchable states have no launch or local-completion escape hatch. Outage copy says progress is safe and leaves all durable assignment/progress data intact.

G5 adds no polling: a refresh/return reads durable state without creating assignments or credit. G7 owns deployed return/event timing verification. G6 facilitator visibility is expressly out of scope and no facilitator UI was changed.
