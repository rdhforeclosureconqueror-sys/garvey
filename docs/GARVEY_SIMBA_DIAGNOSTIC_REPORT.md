# Garvey ↔ Simba Assessment Sync Diagnostic Report

## Callback contract

- Final callback URL resolution order: `SIMBAWAJUMAA_WEBHOOK_URL`, `SIMBA_CALLBACK_URL`, `GARVEY_CALLBACK_URL`, then `SIMBA_BASE_URL` + `/garvey/callback`.
- HTTP method: `POST`.
- Headers: `Content-Type: application/json`; when a callback secret is configured, Garvey sends both `X-Garvey-Signature` and `X-Hub-Signature-256`.
- Signature algorithm: HMAC-SHA256 over the exact raw JSON request body, hex digest, with `sha256=` prefix.
- Payload example: assessment completion events include provider identity, external user id, email, Garvey user id, assessment type/name, result id, primary result, recommendations, reward instruction, completion timestamp, submission id, points awarded, and result URL.
- Retry behavior: queued/failed events retry on `SIMBAWAJUMAA_RETRY_INTERVAL_MS` (default 120000 ms); retries select queued/failed events whose last attempt is older than two minutes, oldest first, limit 25.
- Queue behavior: completions insert `external_event_deliveries` as `queued`, immediately attempt delivery, mark `delivered` on HTTP 2xx, otherwise return to `queued` with status/body/error details.
- Failure reason observed from diagnostics: HTTP 404 `{ "detail": "Not Found" }` means Garvey reached a Simba endpoint but Simba did not have a matching route for the resolved URL. Garvey-side risk was URL name mismatch/config inflexibility; this patch adds accepted aliases and derived `SIMBA_BASE_URL` resolution.

## Environment variables actually read by Garvey

| Variable | Required? | Default | Purpose |
| --- | --- | --- | --- |
| `SIMBAWAJUMAA_TOKEN_SECRET` | Required for Simba transfer | none | Verifies signed member transfer tokens. |
| `SIMBAWAJUMAA_ALLOWED_ISSUER` | Optional | none | Restricts transfer token issuer. |
| `SIMBAWAJUMAA_DEFAULT_TENANT` | Optional | `simbawajuma` | Tenant used for Simba-linked users. |
| `SIMBAWAJUMAA_WEBHOOK_URL` | Required for automatic callback delivery unless alias/base is set | none | Primary Simba callback URL. |
| `SIMBA_CALLBACK_URL` | Optional alias | none | Alternate Simba callback URL. |
| `GARVEY_CALLBACK_URL` | Optional alias | none | Alternate callback URL name accepted by Garvey. |
| `SIMBA_BASE_URL` | Optional fallback | none | If no explicit callback URL is set, Garvey posts to `${SIMBA_BASE_URL}/garvey/callback`. |
| `SIMBAWAJUMAA_WEBHOOK_SECRET` | Recommended | none | Primary callback signing secret. |
| `SIMBA_CALLBACK_SECRET` | Optional alias | none | Alternate callback signing secret. |
| `GARVEY_CALLBACK_SECRET` | Optional alias | none | Alternate callback signing secret. |
| `WEBHOOK_SECRET` | Optional alias | none | Generic callback signing secret. |
| `SIMBAWAJUMAA_RETRY_INTERVAL_MS` | Optional | `120000` | Background retry interval. |

Garvey does **not** read `GARVEY_TRANSFER_SECRET`, `SIMBA_TRANSFER_SECRET`, or `SIMBA_TOKEN_SECRET`; the implemented transfer token variable is `SIMBAWAJUMAA_TOKEN_SECRET`.

## Simba must provide

- A transfer token signed with `SIMBAWAJUMAA_TOKEN_SECRET` (`HS256`) and including `external_user_id`, `email`, `exp`, and preferably `iat` and issuer.
- One callback destination, preferably `SIMBAWAJUMAA_WEBHOOK_URL` or `SIMBA_CALLBACK_URL`, that accepts `POST` JSON at the exact configured path.
- A shared callback signing secret via `SIMBAWAJUMAA_WEBHOOK_SECRET` or one of the accepted aliases, and verification for either `X-Garvey-Signature` or `X-Hub-Signature-256`.
- A dashboard return URL may be supplied to result pages as `return_url`, `result_return_url`, or `dashboard_url`; Garvey falls back to `https://simbawaujamaa.com/dashboard`.

## Root causes found

- Business Owner result lookup was Garvey-side: the result page called a protected results API without role/email/tenant headers, producing `forbidden` despite a valid result.
- Voice of Customer answer-count failure was Garvey-side: question serving could return fewer DB-backed questions than the scorer's canonical 20-question customer catalog, allowing 19 answers to reach a scorer that correctly expected 20.
- Consent inconsistency was Garvey-side: Business Owner had inline/no dedicated consent and VOC used a separate implementation. A reusable consent helper now powers intake and VOC consent persistence, and Business Owner/customer intake uses a dedicated pre-question gate.
- Callback 404 is likely Simba-side for the concrete observed URL because Garvey used POST and received a Simba 404 response, but Garvey-side configuration was too narrow. Garvey now supports the requested variable aliases and shows resolved URL/method/headers/signature diagnostics.
