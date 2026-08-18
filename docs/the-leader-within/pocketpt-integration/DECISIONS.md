# Pocket PT Integration Decisions

1. **Opaque references.** `LWIS-*` represents the participant across systems and `LWFA-*` represents a requirement. Garvey primary keys never form the external identity contract.
2. **One durable assignment.** The database uniqueness policy reuses one Pocket PT assignment per enrollment, week, session, movement mission, and provider.
3. **Minimal persistence.** Garvey retains assignment/status/provider references and safe audit facts, not workout or health content.
4. **Server authority.** A signed provider event, not launch or browser return, is the only Pocket PT completion authority.
5. **Canonical adapter.** Verified completion writes the existing movement summary consumed by the five-step curriculum resolver; no other mission step is mutated.
6. **Local migration path.** The existing local completion endpoint remains available for development. It is explicitly labeled `local_mission`; Pocket PT completion is labeled `verified_pocketpt` and `completion_source=POCKET_PT`.
7. **HMAC V1.** V1 uses short-lived HS256 launch JWTs and timestamped HMAC events because the repository has no shared asymmetric/service-token infrastructure.
8. **Canonical identity.** G4.5 reconciles both implementations on `leader_within_pocketpt_bridge_v1` with the single field `contract_version: 1`; the earlier undocumented `integration_version`/`version` aliases are rejected rather than allowed to drift.
9. **Bounded V1 events.** V1 accepts only NOT_STARTED, IN_PROGRESS, COMPLETED, SAFETY_HOLD, TEMPORARILY_UNAVAILABLE, and CANCELLED provider events. Broader bridge display states remain mapping outputs, not raw provider inputs.
10. **Minimum-data allowlist.** Provider event bodies reject unknown fields, including Pocket PT program/session identifiers and all health, readiness, safety-reason, and exercise detail.
11. **Fixture pinning.** Compact JSON fixtures and their SHA-256 manifest are the cross-repository compatibility artifact. Event signing uses the documented compact JSON field order and a timestamp prefix.
12. **G5 source resolution.** A current Pocket PT assignment, or explicit `LEADER_WITHIN_MOVEMENT_SOURCE=POCKETPT` configuration, selects the Pocket PT card; otherwise the established LOCAL flow remains authoritative.
13. **One youth projection.** `resolveLeaderWithinPocketPtMovementState` is the only youth-facing mapping; templates consume its allowlisted fields and never provider internals.
14. **Launch is progress, not completion.** Launch may set `IN_PROGRESS`, returns only the navigation URL plus provider/status, and cannot write MOVE completion.
15. **No bypass.** Pocket PT-backed cards never render or accept local manual completion, including during safety hold or outage.
16. **G6 facilitator projection.** `resolveFacilitatorPocketPtMovementState` wraps the G5 resolver and emits only ten allowlisted display/workflow fields; participant detail no longer serializes broad activity-summary rows.
17. **G6 status-only authority.** Facilitators see source, bounded status, verified source/time, and generic safety-hold follow-up guidance. G6 adds no Pocket PT mutation, health detail, automatic case, note, or flag.
18. **Shared progress and authorization.** Facilitator surfaces retain `resolveParticipantCurriculumState` and `assertFacilitatorForCohortAsync`; dedicated facilitator actor selection and existing Super Admin policy remain unchanged.
