# The Leader Within youth assessment and PocketPT integration audit

## Architecture decision

The youth assessment is a youth-facing presentation of the existing `leadership` archetype engine. It does not add a second engine, duplicate archetypes, duplicate scoring logic, or new result-storage tables. Standard and youth attempts use the same browser routes, API routes, scoring service, `engine_assessments`, `engine_results`, event diagnostics, and shared result UI.

## Youth question bank

The youth authored bank lives at `archetype-engines/engines/leadership/question-banks/leadership.youth.bank1.js`. It contains 25 youth-facing versions of the standard leadership bank questions. Each question keeps the same `question_id`, `option_id`, `bank_id`, display order, scoring dimensions, archetype mappings, weight types, and signal types as `AUTHORED_BANK_1`; only youth-facing prompts/options and youth metadata are added.

Youth metadata per question:

- `audience: "youth"`
- `content_variant: "youth"`
- `suitability: "youth_ready"`, `"rewrite_for_youth"`, or `"adult_specific_replace"`

Question `LEAD_B1_Q10` replaces the adult employee-performance scenario with a teammate/classmate scenario while preserving the original leadership distinctions.

## Selection and scoring

Youth content is selected by `audience_type=youth`, `assessment_variant=youth`, or `content_variant=youth`. The service returns the youth bank for first-attempt leadership starts when those flags are present, but scoring continues through `scoreEngineAssessment("leadership", answers, opts)` against the standard scoring source. This preserves existing primary/secondary/hybrid logic and historical results.

## PocketPT launch metadata

PocketPT can launch the existing leadership route with:

```text
/archetype-engines/leadership/assessment?audience_type=youth&assessment_variant=youth&content_variant=youth&source_application=pocketpt&external_user_reference=<participant_id>&external_enrollment_reference=<enrollment_id>&external_cohort_reference=<cohort_id>&return_url=<allowlisted_pocketpt_url>
```

The start and score routes persist attribution in existing JSON payloads, including audience/content/source fields, participant/enrollment/cohort references, and `safe_return_url` when the submitted return URL is allowlisted.

## Return URL security

Configure production return origins with:

```bash
POCKETPT_RETURN_ORIGINS=https://pocketpt.example,https://app.pocketpt.example
```

The server parses `return_url` or `result_return_url` only for PocketPT-originated requests and returns a safe URL only when the parsed origin is allowlisted. Malformed or unapproved URLs become `null` and must not be used as redirect targets. Client-side filtering in `public/archetype-engines/experience.js` is defense-in-depth only; server validation is authoritative.

## Secure summary endpoint

Endpoint:

```text
GET /api/archetype-engines/leadership/results/:resultId/summary?source_application=pocketpt
```

Required headers:

- `x-source-application: pocketpt`
- `x-pocketpt-token: <shared-secret>`
- `x-pocketpt-participant-id: <participant-id>`
- `x-pocketpt-enrollment-id: <enrollment-id>`
- `x-pocketpt-cohort-id: <cohort-id>`

Required configuration:

```bash
POCKETPT_API_TOKEN=<shared-secret-placeholder>
```

`POCKETPT_API_TOKEN` is mandatory. If it is absent, the endpoint fails closed with HTTP 503 and `{"error":"Integration unavailable"}`. The token must be stored only in Garvey server and PocketPT backend environments. It must never be exposed to browser JavaScript, query strings, local/session storage, HTML, client logs, or error responses.

Authorization order:

1. Require `x-source-application: pocketpt`.
2. Require server `POCKETPT_API_TOKEN`; missing config returns 503.
3. Require `x-pocketpt-token`; missing token returns 401.
4. Reject incorrect tokens with 403 using timing-safe comparison.
5. Require participant, enrollment, and cohort headers.
6. Load the stored result.
7. Verify stored `source_application` is `pocketpt`.
8. Verify stored audience/variant is `youth`.
9. Verify stored participant, enrollment, and cohort references exactly match headers.
10. Return only the approved summary fields.

All ownership/attribution failures return HTTP 403 with `{"error":"Access denied"}`.

## Approved response fields

The summary response returns only:

- `completion_status`
- `completed_at`
- `assessment_version`
- `audience_type`
- `source_application`
- `primary_archetype_id`
- `primary_archetype_name`
- `secondary_archetype_id`
- `secondary_archetype_name`
- `strength_summary`
- `growth_summary`
- `suggested_weekly_leadership_practice`
- `garvey_result_reference`

It omits individual questions/answers, raw or normalized scores, scoring dimensions, mappings, attribution payloads, names, emails, tokens, secrets, admin data, and engine internals.

## Manual verification

Run:

```bash
node --test tests/archetype-engines/archetype-engines.test.js
```

The expected clean result is all archetype-engine tests passing, including standard leadership behavior, youth parity, PocketPT metadata persistence, unsafe return URL rejection, and summary endpoint authorization.
