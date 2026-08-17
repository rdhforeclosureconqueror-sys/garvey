# Pocket PT ↔ Garvey Integration Contract V1

## Boundary

Leader Within defines a `POCKET_PT_SESSION` requirement and owns mission progress. Pocket PT owns all fitness programming and session delivery. Garvey stores opaque linkage and minimal status only; it does not request or retain exercises, repetitions, readiness, pain, screening, or health details.

## Launch

An authenticated youth sends `POST /api/the-leader-within/my-program/movement/launch`. Browser-supplied participant, enrollment, cohort, program, and completion identifiers are ignored. Garvey resolves the current active enrollment and reuses the unique assignment for `(enrollment, week, session, mission, provider)`.

The response contains a Pocket PT URL whose `context` query parameter is an HS256 JWT:

```json
{
  "iss": "GARVEY",
  "aud": "POCKET_PT",
  "integration_version": 1,
  "assignment_ref": "LWFA-opaque",
  "subject_ref": "LWIS-opaque",
  "source_application": "leader_within",
  "requirement_type": "POCKET_PT_SESSION",
  "leader_within_context": { "week": 1, "session": "A" },
  "return_url": "/the-leader-within/my-program",
  "iat": 0,
  "exp": 0,
  "jti": "unique"
}
```

Tokens expire after five minutes. Keys are selected with the JWT `kid`. Pocket PT must validate HS256, issuer, audience, expiry, version, and one-time `jti`. Production launch URLs must use HTTPS.

## Completion events

Pocket PT sends `POST /api/integrations/pocketpt/events` with JSON, plus:

* `X-PocketPT-Issuer: POCKET_PT`
* `X-PocketPT-Audience: GARVEY`
* `X-PocketPT-Timestamp: <ISO-8601 timestamp>`
* `X-PocketPT-Signature: sha256=<hex HMAC>`

The HMAC input is `<timestamp>.<JSON request body>` using the shared event secret. Both systems must preserve the transmitted JSON representation or migrate to raw-body verification before any intermediary rewrites JSON. The timestamp tolerance is five minutes.

Required payload fields are `event_id`, `event_type`, `provider`, `assignment_ref`, `status`, and `integration_version`. `COMPLETED` also requires `completed_at`. Allowed statuses are `AVAILABLE`, `IN_PROGRESS`, `COMPLETED`, `COACH_STOPPED`, `EXCUSED`, and `ERROR`; only `COMPLETED` completes the movement step.

Garvey uniquely stores `(provider, event_id)`. A retry receives an accepted, idempotent acknowledgment without repeating movement mutation or changing its first completion timestamp. Assignment ownership, provider, active enrollment, and active cohort are resolved only from Garvey data.

## Configuration and rotation

Secrets are server-only environment/config-store values:

* `POCKETPT_ENABLED`
* `POCKETPT_BASE_URL`
* `POCKETPT_RETURN_URL`
* `POCKETPT_SIGNING_KEY_ID`
* `POCKETPT_LAUNCH_SIGNING_SECRET`
* `POCKETPT_EVENT_SIGNING_SECRET`

Rotation uses a new key identifier and an overlap window during which Pocket PT accepts current and immediately previous launch keys. Event-secret rotation must be coordinated; a subsequent contract version should add an event key-id header before independent multi-key rotation is needed.

## Safe errors

Responses use stable codes and never expose SQL, cookies, tokens, or secrets: `pocketpt_auth_failed`, `pocketpt_signature_invalid`, `pocketpt_event_invalid`, `pocketpt_event_version_unsupported`, `pocketpt_assignment_not_found`, `pocketpt_assignment_provider_mismatch`, `pocketpt_event_replayed`, `pocketpt_status_invalid`, `pocketpt_completion_not_allowed`, and `pocketpt_integration_unavailable`.

Browser return to `/the-leader-within/my-program` is UX only and never proves completion.
