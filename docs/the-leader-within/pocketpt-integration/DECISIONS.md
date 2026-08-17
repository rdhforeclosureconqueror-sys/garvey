# Pocket PT Integration Decisions

1. **Opaque references.** `LWIS-*` represents the participant across systems and `LWFA-*` represents a requirement. Garvey primary keys never form the external identity contract.
2. **One durable assignment.** The database uniqueness policy reuses one Pocket PT assignment per enrollment, week, session, movement mission, and provider.
3. **Minimal persistence.** Garvey retains assignment/status/provider references and safe audit facts, not workout or health content.
4. **Server authority.** A signed provider event, not launch or browser return, is the only Pocket PT completion authority.
5. **Canonical adapter.** Verified completion writes the existing movement summary consumed by the five-step curriculum resolver; no other mission step is mutated.
6. **Local migration path.** The existing local completion endpoint remains available for development. It is explicitly labeled `local_mission`; Pocket PT completion is labeled `verified_pocketpt` and `completion_source=POCKET_PT`.
7. **HMAC V1.** V1 uses short-lived HS256 launch JWTs and timestamped HMAC events because the repository has no shared asymmetric/service-token infrastructure.
