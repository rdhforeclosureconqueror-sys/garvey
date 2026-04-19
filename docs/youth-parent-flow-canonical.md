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

## Remaining known exceptions
- `/youth-development.html#tdeOperatorConsole` remains as a compatible operator entry anchor for internal workflows.
- TDE operator console stays hidden by default and only displays for admin session contexts.
