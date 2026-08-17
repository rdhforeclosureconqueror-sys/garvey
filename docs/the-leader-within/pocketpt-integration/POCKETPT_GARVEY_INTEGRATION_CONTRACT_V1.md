# Leader Within ↔ Pocket PT Bridge V1

## Identity and boundary

The single canonical contract is `leader_within_pocketpt_bridge_v1`, `contract_version: 1`. Leader Within defines the movement requirement; Garvey creates its trusted assignment; Pocket PT resolves the youth's existing program and exact fitness session, determines safe execution, records fitness completion, and emits the minimum trusted state event. Garvey verifies the event and may complete only MOVE through the existing five-step resolver.

References are opaque: subjects match `^LWIS-[A-Za-z0-9_-]{8,}$`, assignments match `^LWFA-[A-Za-z0-9_-]{8,}$`, and provider event IDs match `^ppt_evt_[A-Za-z0-9_-]{6,}$`. Week or session numbers are context only and must never be used to infer Pocket PT fitness-session linkage.

## Launch contract

An authenticated youth calls `POST /api/the-leader-within/my-program/movement/launch`. Garvey resolves ownership and the current active enrollment server-side and creates or reuses the unique assignment. The response's `/integrations/garvey/launch?context=...` context is an HS256 JWT with a `kid` header and exactly these claims:

* `contract: "leader_within_pocketpt_bridge_v1"`
* `contract_version: 1`
* `iss: "GARVEY"`; `aud: "POCKET_PT"`
* opaque `assignment_ref` and `subject_ref`
* `provider: "POCKET_PT"`
* `source_application: "leader_within"`
* `requirement_type: "POCKET_PT_SESSION"`
* `leader_within_context: { week, session }`
* relative or configured allowlisted `return_url`
* NumericDate `iat`, `exp` exactly 300 seconds later, and unique one-time `jti`

Pocket PT validates the HS256 signature over `<base64url(header)>.<base64url(payload)>`, `kid`, issuer, audience, contract identity/version, expiry, reference shapes, and one-time `jti`. Production launch requires HTTPS. A browser return is navigation only and never completion evidence.

## Provider event contract

Pocket PT sends `POST /api/integrations/pocketpt/events` as `application/json`. The V1 body is an explicit allowlist: `contract`, `contract_version`, `event_id`, `event_type`, `provider`, `source_application`, `assignment_ref`, `status`, and, only for completion, `completed_at`.

Constant values are `contract: "leader_within_pocketpt_bridge_v1"`, `contract_version: 1`, `provider: "POCKET_PT"`, and `source_application: "pocketpt"`. Each event type must exactly correspond to its status:

| event_type | status | Completes MOVE |
| --- | --- | --- |
| `fitness_assignment.not_started` | `NOT_STARTED` | No |
| `fitness_assignment.in_progress` | `IN_PROGRESS` | No |
| `fitness_assignment.completed` | `COMPLETED` | Yes |
| `fitness_assignment.safety_hold` | `SAFETY_HOLD` | No |
| `fitness_assignment.temporarily_unavailable` | `TEMPORARILY_UNAVAILABLE` | No |
| `fitness_assignment.cancelled` | `CANCELLED` | No |

`completed_at` is required only for `COMPLETED` and is UTC RFC 3339 (`YYYY-MM-DDTHH:mm:ss[.SSS]Z`). The first valid completion timestamp is preserved. No raw participant ID, workout, exercise, repetitions, program/session internal reference, readiness, pain, sleep, soreness, assessment, safety reason, or private note is accepted.

## Event authentication, replay, and idempotency

Required headers are `X-PocketPT-Issuer: POCKET_PT`, `X-PocketPT-Audience: GARVEY`, `X-PocketPT-Timestamp: <RFC 3339 instant>`, and `X-PocketPT-Signature: sha256=<lowercase hex HMAC-SHA256>`. The signing input is `<timestamp>.<JSON.stringify(parsed body)>` using the server-only V1 event secret. Both implementations must create the compact JSON in canonical fixture field order; intermediaries must not rewrite it. Garvey uses constant-time signature comparison and permits absolute clock skew of at most 300 seconds.

`event_id` is the immutable Pocket PT idempotency key for one logical provider event. Garvey uniquely stores `(provider, event_id)`. A duplicate returns an accepted response with `idempotent: true`, performs no assignment/mission/audit mutation, and never replaces the first completion timestamp. A new event ID for an already-completed assignment also cannot duplicate MOVE credit because the assignment and canonical movement summary are applied transactionally and completion time uses first-write semantics.

## Assignment and completion lifecycle

Garvey assignments are durable and explicitly linked; launch creation/reuse is idempotent. Bounded bridge states are `NOT_CONNECTED`, `CONNECTED_NO_PROFILE`, `PROFILE_READY`, `PROGRAM_READY`, `NOT_ASSIGNED`, `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `SAFETY_HOLD`, `TEMPORARILY_UNAVAILABLE`, `COACH_REVIEW`, and `CANCELLED`. V1 provider events carry only the six event-capable states in the table; Garvey never exposes raw internal Pocket PT state. Only verified `COMPLETED` mutates the canonical MOVE summary. Launch, return, safety hold, unavailability, and all other states leave MOVE incomplete.

## Safe errors

Errors are stable and disclose no token, secret, SQL, health data, or raw event: `pocketpt_auth_failed`, `pocketpt_signature_invalid`, `pocketpt_event_invalid`, `pocketpt_event_version_unsupported`, `pocketpt_assignment_not_found`, `pocketpt_assignment_provider_mismatch`, `pocketpt_event_replayed`, `pocketpt_status_invalid`, `pocketpt_completion_not_allowed`, and `pocketpt_integration_unavailable`.

## Canonical fixtures

Files in `fixtures/` are the cross-repository source of truth for launch, completion, in-progress, safety-hold, invalid-signature, and replay cases. `fixtures/manifest.json` pins each file's SHA-256 and canonical byte convention. Pocket PT must intentionally duplicate these exact bytes and hashes if physical sharing is unavailable; hash drift requires an explicit V1 reconciliation decision, never silent acceptance.
