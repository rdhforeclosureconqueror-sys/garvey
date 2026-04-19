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
  - `week_status` (`not_started` | `in_progress` | `completed`)
  - `completed_step_keys`
  - `active_step_index`
  - `reflection_note`, `observation_note`
  - `reflection_saved`, `observation_saved`
  - `resume_ready`, `next_week_available`
- Week completion requires all governed steps complete plus both reflection and observation notes saved.

## Progression rules
- No automatic week advance on page load.
- Week only advances on explicit `continue_next_week` action and only when `week_status=completed`.
- Assessment -> Results -> Start Program -> Week 1 bridge remains intact.

## Authored vs structural labels
- Authored content: week title/objective/week purpose/guidance/reflection+observation prompts.
- Structural labels only: phase/week context labels, roadmap status labels, progress state labels, step status display labels.
