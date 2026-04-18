# Phase 17 — TDE Insight Layer

## What Phase 17 adds
- Adds an extension-safe insight generation layer (`insightService`) that computes deterministic, traceable, cross-source pattern summaries across all seven developmental pillars.
- Adds additive endpoint: `GET /api/youth-development/tde/insights/:childId`.
- Keeps live youth v1 intake/assess/dashboard contracts untouched.

## How insights are generated
The insight layer aggregates source signals from:
1. intervention sessions (`intervention_signal_evidence`)
2. developmental check-ins (`evidence_map` child + transfer entries)
3. parent observations (check-in `source_actor=parent` evidence)
4. milestone assessments (`progress_records[*].trait_signal_summary`)
5. environment signals (`environment_hooks`)

Signals are normalized to `[0,1]` and then summarized per pillar with explicit separation into:
- `child_pattern`
- `environment_pattern`
- `consistency_adherence_pattern`

Each section includes traceable references (`source_stream`, `source_id`, `evidence_ref`, `trace_ref`, `observed_at`) plus `rule_path` to keep the output auditable.

## What these insights mean (and do not mean)
- Insights describe **current developmental patterns**, not fixed traits or diagnoses.
- Confidence is bounded by source count and signal sufficiency.
- Weak environment/adherence evidence must not be interpreted as child weakness; environment constraints are surfaced in a separate pattern channel.

## Confidence limitation handling
- Sparse evidence is downgraded (`confidence_label=low`) rather than escalated.
- Confidence context reports:
  - `signal_count`
  - `source_stream_count`
  - `sparse_data`
  - explicit confidence `rule_path`
- Pillar summaries include confidence limitation text for provisional interpretation.

## Calibration-variable thresholds
The following remain calibration-variable in `CALIBRATION_VARIABLES.insight_layer`:
- `sparse_data_max_signals`
- `moderate_data_min_signals`
- `high_data_min_signals`
- `minimum_source_streams_for_moderate`
- `strengthening_min_average`
- `hindering_max_average`
- `inconsistency_gap_threshold`

## Missing contracts behavior
Missing input contracts are surfaced in `missing_contracts` and `contracts_status` (e.g., `environment_signals_missing`, `development_checkin_evidence_map_missing`).
