# G7 Cross-System Synthetic Staging Verification

## Verification record

**Status:** `BLOCKED_BY_STAGING_ACCESS`  
**Failure classification:** `ENVIRONMENT_ACCESS_FAILURE`  
**Staging verified:** NO  
**Repository inspected:** Garvey `fec4d8a` (G6 merge baseline) plus the G7 verification/marker commit containing this record  
**Deployed Garvey commit/build:** NOT OBSERVED — no staging URL or credentials were available in the execution environment  
**Deployed Pocket PT commit/build:** NOT OBSERVED — the Pocket PT repository, staging URL, and credentials were unavailable  
**Safe request IDs / event IDs:** none generated  
**Data touched:** none; no participant, cohort, assignment, workout, or completion record was created or changed

Repository inspection confirms the canonical name `leader_within_pocketpt_bridge_v1`, version `1`, launch route `POST /api/the-leader-within/my-program/movement/launch`, and receiver route `POST /api/integrations/pocketpt/events`. It does **not** prove that either deployed system runs this code. Garvey's `GET /api/deployment-version` now exposes non-secret bridge contract, route, and handler markers needed to compare a deployment before testing.

## Results (not inferred from repository tests)

| G7 item | Result | Evidence / blocker |
| --- | --- | --- |
| Deployment versions | NOT EXECUTED | Both staging deployments inaccessible |
| Staging environment audit | NOT EXECUTED | No deployment configuration access; local process has none of the Pocket PT integration settings |
| V1 deployed contract match | NOT EXECUTED | Cannot query both deployments |
| Synthetic preconditions | NOT EXECUTED | No staging identities or database/admin access |
| Garvey launch / Pocket PT validation | NOT EXECUTED | No youth credential or Pocket PT staging target |
| Program-first resolution | NOT EXECUTED | Pocket PT runtime inaccessible |
| Readiness / Phase 6 safety gate | NOT EXECUTED | Pocket PT runtime inaccessible |
| Fitness completion / provider event | NOT EXECUTED | Pocket PT runtime inaccessible |
| Garvey receiver / transactional credit | NOT EXECUTED | No signed staging event or assignment |
| Youth return / five-step mission | NOT EXECUTED | No synthetic youth session |
| Facilitator projection / privacy | NOT EXECUTED | No facilitator staging credential |
| Replay / wrong assignment / wrong subject / cross-org | NOT EXECUTED | No event signing access or synthetic mappings |
| Unrelated session | NOT EXECUTED | No Pocket PT synthetic program |
| Safety hold | NOT EXECUTED | No disposable Pocket PT synthetic participant |
| Outage | PREPARED, NOT EXECUTED | Run only if the staging owner confirms a safe simulation |
| Mobile Safari | NOT EXECUTED | No physical device or accessible staging flow |

No architectural incompatibility was observed, no contract change was made, and G8 was not started.

## Owner-executable staging checklist

Use only records explicitly labelled synthetic. Record booleans, redacted origins, commit SHAs, build times, and opaque request/event IDs; never copy JWTs, HMACs, secrets, health answers, names, emails, or raw event bodies into this document.

### A. Deployment and configuration gate

1. Query Garvey `GET /api/deployment-version`. Record `commit`, `intended_commit`, `build_time`, `pocketpt_integration.contract_name`, `contract_version`, both routes, and all four handler versions. Stop as `GARVEY_DEPLOYMENT_VERSION_MISMATCH` if the deployed and intended commits differ.
2. Query Pocket PT's deployment-version endpoint. Record its deployed/intended commit, Youth Fitness Brain, Phase 8 runtime, Phase 9 bridge, event sender, safety validator, adaptation engine, and contract markers. Stop as `POCKETPT_DEPLOYMENT_VERSION_MISMATCH` for drift.
3. Require both systems to report `leader_within_pocketpt_bridge_v1` and `1`. Compare the reconciled fixture hashes. Stop as `CONTRACT_DEPLOYMENT_MISMATCH` before generating test data if any value differs.
4. In deployment settings, record presence only. Garvey: Pocket PT HTTPS base URL, issuer/audience, launch signing material, event verification material, enabled provider, exact return URL, and reachable `POST /api/integrations/pocketpt/events`. Pocket PT: Garvey issuer/audience trust, launch verification material, Garvey HTTPS event destination, event signing material, V1/enabled provider, and return URL. Classify absent Garvey or Pocket PT values as `GARVEY_CONFIG_FAILURE` or `POCKETPT_CONFIG_FAILURE`.

### B. Synthetic preconditions and happy path

5. Select one dedicated synthetic happy-path youth and one disposable synthetic safety participant. Do not alter a real/pilot participant. Confirm on Garvey: youth, active enrollment/cohort, Leader ID/login, Pocket PT movement source, opaque subject mapping, durable current assignment, and MOVE initially incomplete. Confirm on Pocket PT: mapped youth, Youth Fitness Profile, active program, program-first current phase/week/session, and a deliverable current session. Do not create a random workout.
6. Sign in through the Garvey youth flow (`tlw_youth_session`), open `GET /the-leader-within/my-program`, capture initial five-step state, and press **Open Pocket PT**. Confirm the CSRF-protected launch POST returns only `{ok, movement, launch_url}`, uses HTTPS, creates or reuses one assignment, and exposes no raw participant ID or reusable credential. Record the safe request ID.
7. In Pocket PT, inspect validation outcomes without logging the token: signature valid; unexpired; lifetime exactly/at most 300 seconds; one-time `jti`; `iss=GARVEY`; `aud=POCKET_PT`; canonical contract/version; opaque subject/assignment; `provider=POCKET_PT`; `source_application=leader_within`; `requirement_type=POCKET_PT_SESSION`; allowlisted return URL.
8. Prove program-first resolution follows mapping → profile → active program → current phase → current week → exact current session. Record the linked opaque assignment/session evidence in the Pocket PT safe diagnostic; prove no isolated workout was created and do not require Leader Within week/session numbers to equal fitness numbers.
9. Submit normal synthetic readiness. Prove it persists server-side and Phase 5 planning plus Phase 6 validation execute. Before readiness, and whenever Phase 6 blocks, confirm no executable blueprint is returned.
10. Complete the linked session. Confirm approved activities only, actuals separately persist, canonical completion persists, repeated Finish is idempotent, Phase 7 adaptation runs, and a future adaptation must pass Phase 6 again.
11. Capture the safe event ID and validate (without copying the body/signature) the V1 allowlist, completion values, UTC times, stable event ID, timestamp header, and HMAC header. Confirm prohibited fitness/readiness data is absent.
12. Confirm Garvey accepts the event only at `POST /api/integrations/pocketpt/events` with issuer `POCKET_PT`, audience `GARVEY`, valid HMAC, and timestamp within ±300 seconds. Prove the assignment resolves, belongs to the expected active enrollment/cohort, and represents the exact linked fitness session.
13. In one transaction, prove the assignment lock/validation, first completion timestamp, replay ledger, canonical movement summary, and exactly one MOVE credit. Refresh `GET /the-leader-within/my-program`: MOVE is completed and persisted, no local completion button exists, the canonical five-step count increases by one, and all other steps are unchanged.
14. Sign in through `tlw_facilitator_session`. Check `GET /the-leader-within/facilitator/dashboard`, `GET /admin/the-leader-within/cohorts/:cohortId`, and `GET /admin/the-leader-within/participants/:participantId`. Confirm Pocket PT / Completed / verified source (and supported first timestamp) align with youth state. Inspect page and network payloads to prove no readiness, pain, sleep, soreness, exercise, set/rep, or safety-reason data appears.

### C. Fail-closed and bounded-state matrix

15. Replay the identical authenticated event. Require an idempotent safe response, unchanged first `completed_at`, one summary/credit/audit activity, and unchanged progress; otherwise classify `IDEMPOTENCY_FAILURE`.
16. Send a newly identified, validly signed synthetic completion with a nonexistent/wrong `assignment_ref`. Require safe denial, no participant inference, and no mutation (`ASSIGNMENT_MATCH_FAILURE`).
17. Exercise Pocket PT launch/mapping with a mismatched subject and valid assignment. Since Garvey V1 events intentionally do not carry `subject_ref`, test subject binding at the signed-launch/bridge mapping boundary; require denial and no leakage (`IDENTITY_MAPPING_FAILURE`). Do **not** add `subject_ref` to the V1 Garvey event schema merely for this test.
18. Attempt a synthetic cross-organization launch/mapping mismatch. Require denial without assignment/participant inference (`IDENTITY_MAPPING_FAILURE` or `ASSIGNMENT_MATCH_FAILURE`).
19. Complete another valid Pocket PT session not linked to the Garvey assignment. Require MOVE/progress to remain incomplete; otherwise classify `ASSIGNMENT_MATCH_FAILURE`.
20. With the disposable synthetic participant, submit readiness that invokes a Phase 6 hold. Require no executable blueprint and only bounded `SAFETY_HOLD`. Garvey MOVE remains incomplete; youth copy is “Check with your coach or supervising adult before continuing this movement mission.”; facilitator shows only “Pocket PT — Safety hold.” Inspect payloads to ensure all health and rule detail remains in Pocket PT.
21. Only with staging-owner approval, use a scoped outage simulator. Require durable/reusable assignment, temporary-unavailability copy, unchanged progress, no local bypass, and successful later retry. Otherwise retain PREPARED, NOT EXECUTED.
22. Prove youth/facilitator cookies cannot cross roles or impersonate another participant and Garvey cookies are not sent to Pocket PT. Recheck the LOCAL movement path with a separate synthetic/local fixture.
23. On physical iPhone Safari, check youth launch/return/completed/hold layouts and facilitator cohort/detail layouts for tap target, wrapping, overflow, readability, and contrast. If no physical device is used, record NO.

### D. Evidence and closeout

24. Run the Garvey G4.5, G5, G6, integration, security, migration-idempotency, and relevant/full regressions. If Pocket PT changed, run its bridge contract/runtime/security/Phase 1–8/full suite. Record exact commands and counts, distinguishing known unrelated failures.
25. Fill every result above with observed evidence, classifications, both exact deployed SHAs, request/event IDs, and redacted URLs. Confirm working trees clean and implementation commits recorded.
26. Mark G7 `COMPLETE` only when every exit criterion is actually observed. Otherwise leave `BLOCKED_BY_STAGING_ACCESS` (or the precise failure state), `STAGING VERIFIED: NO`, and `NEXT PHASE: REMAIN G7`.

## Repository verification executed on 2026-08-18

* `node --test tests/pocketpt-integration.test.js tests/pocketpt-contract-reconciliation.test.js tests/the-leader-within-pocketpt-youth-ui.test.js tests/the-leader-within-pocketpt-facilitator-visibility.test.js tests/the-leader-within-security.test.js tests/the-leader-within-migration-idempotency.test.js tests/the-leader-within-facilitator-entry.test.js` — 84 passed, 0 failed, 0 skipped.
* `node --test tests/*.test.js` — 289 passed, 0 failed, 0 skipped.
* `git diff --check` — passed.

These checks prove repository regression only. They do not change any NOT EXECUTED staging result above.
