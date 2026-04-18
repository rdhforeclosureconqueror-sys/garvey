# Phase 23 — Admin/Operator Console Layer

Phase 23 adds additive, extension-only admin/operator visibility endpoints so pilot operators can monitor rollout, validation readiness, calibration influence, and evidence-quality burden without mutating live youth v1 behavior.

## What Phase 23 adds

- Operator-focused service layer for consolidated runtime summaries of:
  - rollout status
  - feature flag state
  - calibration state
  - validation-readiness state
  - evidence-quality state
  - missing-contract burden
- New extension-safe endpoints under `/api/youth-development/tde/admin/*`:
  - `GET /api/youth-development/tde/admin/overview`
  - `GET /api/youth-development/tde/admin/rollout-status`
  - `GET /api/youth-development/tde/admin/feature-flags`
  - `GET /api/youth-development/tde/admin/validation-status`
  - `GET /api/youth-development/tde/admin/evidence-quality-overview`

## What operators can see

- Rollout visibility:
  - current rollout mode
  - preview-only / fallback-only / enabled / hidden surfaces
  - voice availability status
  - pilot eligibility summary
- Feature/config visibility:
  - extension mode and voice-related flags
  - explicit statement that controls are environment-driven and view-only in this phase
- Calibration visibility:
  - active calibration groups and versions
  - key threshold families
  - modules and output areas influenced by calibration variables
  - explicit no-silent-mutation guarantee
- Evidence-quality visibility:
  - sufficiency burden
  - traceability burden
  - source diversity weakness
  - sparse-data prevalence
  - explicit missing-contract burden

## View-only vs controllable in Phase 23

- View-only:
  - calibration values and dependency graphs
  - readiness/evidence summaries and burden classifications
  - rollout/evidence/validation metadata computed from current snapshot state
- Controllable (outside API mutation paths):
  - environment variable controls for extension and voice rollout flags (`TDE_EXTENSION_MODE`, `TDE_VOICE_FEATURE_ENABLED`, `TDE_VOICE_PREVIEW_MODE`, `TDE_VOICE_ROLLOUT_MODE`)
- Not added in Phase 23:
  - no silent tuning paths
  - no hidden rollout behavior
  - no write endpoints for calibration mutation

## Pilot management support

Phase 23 supports pilot-manageable operations by letting operators:

- determine whether extension surfaces are eligible/withheld due to readiness burden
- identify when evidence quality is limiting interpretation strength
- identify calibration-variable dependencies affecting specific output families
- inspect voice rollout state without changing child-facing contracts

## Calibration-variable areas (still explicit)

The following areas remain calibration-variable and are surfaced as operator metadata:

- developmental checkin sufficiency/disagreement thresholds
- insight-layer thresholds
- growth-trajectory thresholds
- personalization thresholds
- intervention and voice architecture threshold groups

Phase 23 does not introduce silent calibration mutation and does not replace live youth v1.
