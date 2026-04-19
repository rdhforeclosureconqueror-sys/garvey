# Youth Parent Experience — Canonical Flow + Taxonomy (Stabilization Pass)

Date: 2026-04-19

## Canonical parent route/entry strategy

### Canonical journey
1. **Intake Walkthrough** → `/youth-development/intake`
2. **Results / Parent Dashboard** → `/youth-development/parent-dashboard`
3. **Program Launch / Resume** → `/youth-development/program`
4. **Weekly Program Execution** (within `/youth-development/program` via week-content + week-execution APIs)

### Entry surfaces
- `/youth-development/intake` is the canonical parent entry route.
- `/youth-development.html` is a legacy shell route retained for compatibility; it now explicitly presents canonical links (intake/dashboard/program) and no longer auto-redirects.

## Canonical CTA/state taxonomy

Applied parent-facing labels:
- **Start Program**
- **Continue Program**
- **Resume Week {N}**
- **Return to Dashboard**
- **Save Reflection**
- **Save Observation**
- **Next Week**
- **View Dashboard**

Deprecated/removed drift labels:
- `Continue Development Plan`
- `Start / Continue Program`
- `Resume / View Youth Results`
- `Back to Parent Dashboard`
- `Next week preview`

## Internal vs parent-facing surface boundaries

### Parent-facing
- `/youth-development/intake`
- `/youth-development/parent-dashboard`
- `/youth-development/program`

### Internal/test/preview
- `/youth-development/intake/test`
- `/youth-development/parent-dashboard/preview`
- `/api/youth-development/parent-dashboard/preview`

Gating behavior:
- In production, internal/test/preview routes return 404 unless internal override is enabled (`?internal=1`) or admin context is present.
- In non-production environments, routes remain available for developer/test workflows.

## Parent/program state contract normalization (additive)

Program bridge payload now includes additive normalized parent state:
- `parent_program_state.child_scope` (child id/name/readiness)
- `parent_program_state.program` (status, enrollment, phase/week)
- `parent_program_state.next_action`
- `parent_program_state.blocked_reason`
- `parent_program_state.cta` (`label`, `href`, `action`, `blocked_reason`)

Week-content payload now includes additive normalized parent state:
- `parent_program_state.child_scope`
- `parent_program_state.program_status`
- `parent_program_state.current_phase_name`
- `parent_program_state.current_week`
- `parent_program_state.next_action`
- `parent_program_state.blocked_reason`
- `parent_program_state.cta`
- `parent_program_state.weekly_execution` (week status, active step, blocked reason)

## Weekly planner/calendar + lesson-plan model (parent-facing)

The weekly program surface at `/youth-development/program` now includes a parent-ready planning/execution hierarchy:

1. **Today’s Session**
2. **Next Scheduled Session**
3. **This Week at a Glance**
4. **Week-in-Program Marker**
5. **Weekly Planner Calendar + adherence**
6. **Teacher-Style Lesson Plan**

Model and source-of-truth expectations:
- Commitment source: `week_content.commitment_plan`.
- Session schedule source: `week_content.scheduled_sessions`.
- Lesson-plan source: `week_content.lesson_plan_template.blocks`.
- Weekly execution source: `execution_state` and weekly execution contract actions.
- Progress/adherence source: `week_content.accountability` plus scheduled session state.

Visual semantics:
- Weekly completion count = `completed sessions / planned sessions`.
- Adherence bar = completion ratio across scheduled sessions for the current week.
- Session status markers: `planned`, `in_progress`, `completed`, `missed` (derived display state when supported by schedule context).

Canonical parent controls in planner/session views:
- **Open Scheduled Session**
- **View Lesson Plan**
- **Mark Session Complete**
- **Resume Session**
- **Open Next Scheduled Session**
- **Return to Weekly Overview**

All controls remain child/week scoped and route through existing governed contracts/endpoints.

## Remaining known exceptions
- `/youth-development.html#tdeOperatorConsole` remains as a compatible operator entry anchor for internal workflows.
- TDE operator console stays hidden by default and only displays for admin session contexts.
