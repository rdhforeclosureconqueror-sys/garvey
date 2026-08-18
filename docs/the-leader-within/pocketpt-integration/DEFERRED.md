# Pocket PT Integration Deferred Work

* **G5:** youth launch/status UI and safe pending-state refresh; no UI work was included in G4.5.
* **G6:** bounded facilitator provider/status/verified timestamp visibility.
* **G7:** deployed, cross-repository synthetic happy-path, security-path, and safety-hold verification; staging and live-user verification remain NO.
* **G8:** production origins, secret storage and rotation, environment isolation, outage behavior, and event multi-key strategy. V1 intentionally has no event `kid`.
* **G9:** safe operational diagnostics, structured request IDs, replay counters, and recovery tooling.
* **G10:** final staging/mobile/security/outage/data-preservation production verification.
* Authorized facilitator override policy remains deferred. Local movement completion remains development-only migration support.
* **Post-G5 return refresh:** bounded automatic refresh was not necessary for repository-level G5; return currently rereads durable state on page load. Cross-system timing verification remains G7.
* **G5 manual verification:** browser/device, staging, and live-user checklist execution remains pending because no deployed staging youth/Pocket PT test path was used in this phase.
* **Post-G6 activity feed:** safe Pocket PT activity summaries remain deferred because the current cohort feed is a placeholder; G6 did not expose raw audit/provider events or overbuild a feed subsystem.
* **G6 manual verification:** staging, live-user, iPhone Safari, and cross-system checks were prepared but not executed. They remain verification work for G7 rather than repository-level G6 claims.
* **G7 staging-access block (2026-08-18):** execution is deferred until owners provide both staging URLs/version endpoints, redacted configuration access, dedicated synthetic youth/facilitator credentials, Pocket PT runtime access, event-signing capability, and (for the mobile criterion) a physical iPhone Safari session. The exact owner checklist is in `STAGING_VERIFICATION.md`; G7 remains current and G8 has not started.
