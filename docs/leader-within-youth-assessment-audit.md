# Garvey Youth Leadership Assessment Audit

## Phase 1 repository audit summary

Garvey already has one reusable archetype-assessment engine for love, leadership, and loyalty. The leadership pathway is served from `/archetype-engines/leadership/assessment`, scored through `/api/archetype-engines/leadership/assessment/score`, persisted in `engine_results`, and rendered through the shared result experience at `/archetype-engines/leadership/result/:resultId`.

### Existing implementation map

1. **Leadership routes**: `/archetype-engines/:engine/assessment`, `/archetype-engines/:engine/result/:resultId`, `/api/archetype-engines/:engineType/assessment/start`, `/api/archetype-engines/:engineType/assessment/score`, and `/api/archetype-engines/:engineType/results/:resultId`.
2. **Generator/services**: `server/archetypeEnginesService.js` uses `createAssessmentEngine`, `resolveGovernedEngineSource`, and promotion-manifest governance for retakes.
3. **Schemas/storage**: `engine_assessments`, `engine_results`, `engine_page_views`, and `engine_assessment_consents` already store attempts, result payloads, page events, and consent.
4. **Leadership archetypes/dimensions**: `VD`, `SD`, `RI`, `IE`, and `AC` are the existing leadership codes and scoring dimensions.
5. **Primary/secondary logic**: scoring normalizes dimensions, ranks them, and chooses the highest and second-highest scores as primary and secondary.
6. **Result cards/components**: the shared archetype-engine UI renders leadership images and deep-dive sections without a separate youth card system.
7. **Result-detail pages**: archetype detail pages are shared under `/archetype-engines/leadership/archetype/:slug`.
8. **History/storage**: results remain in `engine_results` and are retrievable through the existing result API.
9. **Admin reporting**: existing dashboard analytics already distinguish assessment families; youth/source metadata is now retained in payload attribution for filtering/reporting.
10. **Auth/authorization**: consent is required before assessment start; result-summary sharing is separately gated for PocketPT.
11. **Variants/versioning**: generated-bank versioning existed; youth audience variants did not exist and were added without changing scoring IDs.
12. **Result APIs**: full result retrieval existed; a minimal PocketPT summary endpoint was added.
13. **Redirect/return patterns**: return URL propagation existed, but arbitrary URLs were too broad for PocketPT; PocketPT returns now use allowlisted origins.
14. **Tests**: archetype engine tests covered standard flows, scoring, routing, consent, rendering, and retake isolation; youth/PocketPT coverage was added.

### Reuse versus new

- **Reused unchanged**: scoring engine, leadership archetype IDs, result persistence, result route, primary/secondary logic, image/card mapping, consent/start/score lifecycle, and existing standard leadership route.
- **Youth-specific content variant**: the youth question bank rewrites prompts/options while keeping the same question IDs, option IDs, bank ID, dimensions, archetype mappings, signal types, and weight types.
- **Minimal schema changes**: no database migration was required. Audience/source/external references are stored in the existing JSON attribution/result payload fields.
- **Question suitability**: most leadership items are reusable concepts, but adult phrasing such as meetings, employee performance, delivery metrics, and team-management language required youth wording.

## Phase 2 question suitability report

The youth set is stored at `archetype-engines/engines/leadership/question-banks/leadership.youth.bank1.js`. It preserves the scoring framework from the standard authored bank.

| Question | Classification | Youth action |
| --- | --- | --- |
| LEAD_B1_Q01 | rewrite_for_youth | Simpler wording for future goals and group follow-through. |
| LEAD_B1_Q02 | rewrite_for_youth | Reframed as a messy group project/team situation. |
| LEAD_B1_Q03 | rewrite_for_youth | Reframed around friends, classmates, or teammates. |
| LEAD_B1_Q04 | youth_ready | Minor wording simplification only. |
| LEAD_B1_Q05 | youth_ready | Minor wording simplification only. |
| LEAD_B1_Q06 | youth_ready | Minor wording simplification only. |
| LEAD_B1_Q07 | rewrite_for_youth | Reframed around projects, clubs, and team goals. |
| LEAD_B1_Q08 | rewrite_for_youth | Meetings replaced with group talks/team huddles. |
| LEAD_B1_Q09 | rewrite_for_youth | Project behind schedule replaced with class project/team goal falling behind. |
| LEAD_B1_Q10 | adult_specific_replace | Talented employee replaced with teammate/classmate not doing their part. |
| LEAD_B1_Q11 | youth_ready | Youth-friendly examples of belief and follow-through. |
| LEAD_B1_Q12 | youth_ready | Existing trait structure retained. |
| LEAD_B1_Q13 | youth_ready | Group motivation is youth-appropriate. |
| LEAD_B1_Q14 | youth_ready | Decision-making framing is general. |
| LEAD_B1_Q15 | youth_ready | Team/group wording is age-appropriate. |
| LEAD_B1_Q16 | youth_ready | Pressure response is general. |
| LEAD_B1_Q17 | youth_ready | Stress-protection framing is general. |
| LEAD_B1_Q18 | rewrite_for_youth | Conflict softened to disagreement. |
| LEAD_B1_Q19 | rewrite_for_youth | Plan challenge reframed as idea or plan challenge. |
| LEAD_B1_Q20 | youth_ready | Fast-changing situations are general. |
| LEAD_B1_Q21 | youth_ready | Growth desire is general. |
| LEAD_B1_Q22 | youth_ready | Growth-area framing is general. |
| LEAD_B1_Q23 | youth_ready | Balance framing is general. |
| LEAD_B1_Q24 | youth_ready | Real-life behavior framing is general. |
| LEAD_B1_Q25 | youth_ready | Leadership superpower framing is youth-friendly. |

## Launch and integration notes

- **Youth launch route**: `/archetype-engines/leadership/assessment?audience_type=youth&source_application=pocketpt`.
- **Result route**: `/archetype-engines/leadership/result/:resultId` uses the same renderer and adds youth language when `audience_type=youth` is stored.
- **PocketPT return behavior**: if the source is PocketPT, only allowlisted `https://pocketpt.app` or `https://www.pocketpt.app` return destinations are accepted by default; additional origins can be configured with `POCKETPT_RETURN_ORIGINS`.
- **Approved result-summary API**: `GET /api/archetype-engines/leadership/results/:resultId/summary?source_application=pocketpt` returns completion status, dates, version, primary/secondary archetypes, strength/growth summaries, weekly practice, and Garvey result reference. It does not return individual answers.
- **Remaining PocketPT requirements**: PocketPT must supply participant/enrollment/cohort references, use an allowlisted return origin, and send an approved `x-pocketpt-token` when `POCKETPT_API_TOKEN` is configured.

## PocketPT server-to-server security contract

Garvey must be configured with:

```text
POCKETPT_API_TOKEN=<shared-secret-placeholder>
POCKETPT_RETURN_ORIGINS=https://pocketpt.example,https://app.pocketpt.example
```

`POCKETPT_API_TOKEN` is mandatory for the result-summary endpoint. If it is absent, Garvey fails closed with HTTP 503 and does not return a summary. The same shared token must be configured only in Garvey and PocketPT server environments. It must never be exposed to browser JavaScript, client-side routes, local storage, or query strings.

PocketPT must call the summary endpoint from its backend only:

```text
GET /api/archetype-engines/leadership/results/:resultId/summary?source_application=pocketpt
x-source-application: pocketpt
x-pocketpt-token: <shared-secret>
x-pocketpt-participant-id: <participant-id>
x-pocketpt-enrollment-id: <enrollment-id>
x-pocketpt-cohort-id: <cohort-id>
```

Participant, enrollment, and cohort identifiers are mandatory for result retrieval. Garvey verifies that the stored result originated from PocketPT, is a youth result, and exactly matches the participant, enrollment, and cohort headers before returning the approved summary fields.
