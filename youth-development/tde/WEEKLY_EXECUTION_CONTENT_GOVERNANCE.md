# Weekly Execution + Content Governance (Parent Program)

## Canonical content sources
- `youth-development/content/weeklyProgramContent.js` is the canonical authored source for parent-facing week titles, objectives, parent guidance, and reflection/observation prompts.
- `youth-development/tde/programRail.js` remains canonical for structural rail metadata (week number, phase mapping, trait targets, checkpoint flags).
- `youth-development/tde/activityBankService.js` remains canonical for activity labels/details rendered in the week session surface.
- `youth-development/content/assessmentContentBanks.js` remains canonical for weekly parent reflection prompt bank used in check-in contracts.

## Removed/replaced placeholder/demo content
- Replaced dynamic placeholder/filler week title/objective copy in parent week surface with authored phase-governed content bank entries.
- Added explicit weekly content audit metadata and source tracing in `week_content.content_audit` and `week_content.parent_prompts`.
- Preserved only structural labels (phase/week/progress/roadmap markers) as non-content scaffolding.

## Week execution persistence
- Parent week execution state is persisted in `tde_weekly_progress_records.payload.execution_state`.
- Persisted fields include:
  - `week_status` (`not_started` | `in_progress` | `blocked` | `ready_for_next_week` | `completed`)
  - `completed_step_keys`
  - `active_step_index`
  - `reflection_note`, `observation_note`
  - `reflection_saved`, `observation_saved`
  - `resume_ready`, `next_week_available`
  - `blocked_reason`, `invalid_action_count`, `last_action`
- Week completion requires all governed steps complete plus both reflection and observation notes saved.

## Progression rules
- No automatic week advance on page load.
- Week only advances on explicit `continue_next_week` action and only when `week_status=ready_for_next_week`.
- Assessment -> Results -> Start Program -> Week 1 bridge remains intact.

## Contract references
- Weekly action/payload/state-machine contract: `youth-development/tde/WEEKLY_EXECUTION_CONTRACT.md`.
- Parent route/button verification map: `youth-development/tde/PARENT_ROUTE_BUTTON_AUDIT.md`.

## Authored vs structural labels
- Authored content: week title/objective/week purpose/guidance/reflection+observation prompts.
- Structural labels only: phase/week context labels, roadmap status labels, progress state labels, step status display labels.

## Parent progress + adherence dashboard semantics
- Surface location: parent-facing `/youth-development/program` weekly experience.
- Scope rules:
  - Always child-scoped (`child_id`) and current-week scoped (`week_content.week_number`).
  - All counts are derived from persisted `scheduled_sessions[*].status` + governed execution state where available.
- Current-week metrics shown:
  - Planned sessions (`scheduled_sessions.length`)
  - Completed sessions (`status=completed`)
  - In-progress sessions (`status=in_progress` plus same-day planned session marker behavior in UI)
  - Missed sessions (`status=missed` or unsupported statuses normalized as missed)
  - Current week completion percent (`completed/planned * 100`)
  - Last week completion percent (`accountability.last_week_completion_percent` or `week_over_week.prior_week_completion_percent` when present)
  - Week-over-week delta points (`week_over_week.delta_points`) when explicit comparison payload exists
  - Consistency marker (`accountability.consistency_label`)
- Week-over-week comparisons:
  - If `accountability.last_week_completion_percent` is present, dashboard shows point delta vs current week.
  - If absent, UI must explicitly state that last-week comparison is unavailable.
  - Optional consistency streak marker can be shown only when `accountability.current_streak_weeks` (or `consistency_streak_weeks`) is present.
- Program phase progress marker:
  - Displayed as week index within a 12-week phase segment (structural marker only; not interpreted growth).

## Canonical weekly planner state model (parent program page)
- State model is child-scoped + current-week scoped and is mutually exclusive:
  1. `setup_required`
     - Criteria: commitment contract incomplete (`isParentCommitmentSetupComplete=false`).
     - Visible: Build Your Weekly Plan controls + explicit recovery copy.
     - Hidden/suppressed: today session card, next session card, planner calendar, lesson-plan surface, adherence/progress dashboard metrics.
  2. `setup_complete_but_no_sessions`
     - Criteria: commitment complete but `scheduled_sessions.length === 0`.
     - Visible: explicit issue/recovery guidance (re-save Build Your Weekly Plan to regenerate sessions).
     - Hidden/suppressed: same schedule-dependent surfaces as above; no fake loading panels.
  3. `setup_complete_with_sessions`
     - Criteria: commitment complete and `scheduled_sessions.length > 0`.
     - Visible: today/next session cards, planner calendar, lesson-plan surface, adherence/progress metrics, trend bars, week markers.
- API contract: `week_content.planner_surface_state` provides canonical `state`, `label`, `message`, `setup_complete`, and `scheduled_session_count`.

## Next-best-action guidance rules
- Guidance labels are canonical and state-driven:
  - `Start Today’s Session`
  - `Resume Session`
  - `Complete Reflection`
  - `Finish this week to unlock Next Week`
  - `Continue Next Week`
- Guidance must never be a no-op:
  - Blocked reasons from execution state are surfaced explicitly in UI.
  - Child/week scope is rendered alongside guidance context.
  - `Run Next Best Action` button must map to existing scoped controls only (start/resume session, reflection prompt focus, continue next week).

## Visual element meanings
- Progress bars:
  - `Adherence progress` bar maps to planned-vs-completed session ratio for this week only.
  - `Current week completion` bar maps to completed/planned percentage for this week only.
- Trend bars:
  - Multi-week bars render historical completion percentages from persisted weekly records.
  - If history is unavailable, UI shows explicit unavailable copy rather than interpolated values.
- Week markers:
  - Week markers summarize structural context (current week completion, week-over-week trend, phase week index, streak marker).
  - Markers are operational adherence summaries and do not imply developmental trait change.

## Interpretation limits (must remain explicit)
- Adherence/progress metrics describe implementation completion only, not trait growth or child capability conclusions.
- Missing prior-week fields means no trend claim (must show unavailable status).
- Consistency markers are descriptive, not diagnostic.

## Setup/save/load/session-generation dependency rules
- Commitment save path:
  - Parent submits `POST /api/youth-development/program/commitment`.
  - Commitment is validated + persisted, then deterministic week-scoped sessions are generated from commitment defaults.
  - Program page reload uses `GET /api/youth-development/program/week-content`, which loads both bridge progression and planning payload.
- Planner/session surfaces must only render live schedule-dependent data after week-content load resolves to `planner_surface_state=setup_complete_with_sessions`.
- If progression is ahead of planning (e.g., Week 2 active but no setup), UI must show explicit setup-needed recovery copy and must not imply today/next sessions exist.
