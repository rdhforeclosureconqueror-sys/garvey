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

## Parent weekly-program visual hierarchy (UI polish v2)

Parent weekly execution view (`/youth-development/program`) now emphasizes a stable, motivating read order while preserving existing contracts and flow logic.

Top-level visual priority order:
1. **Today’s Session**
2. **Weekly Planner / Calendar**
3. **Current Week Guided Experience**
4. **Parent Progress + Adherence Dashboard**
5. **Multi-week trends/history** (inside progress dashboard)
6. **Optional activity alternatives/details** (inside current-week activity bank surface)

Section purpose/clarity rules:
- **Today’s Session**: fastest parent action path for same-day execution; always contains start/resume/session-context cues.
- **Weekly Planner / Calendar**: commitment setup + schedule + lesson-plan details; this remains the canonical planning/execution bridge.
- **Current Week Guided Experience**: guidance, roadmap, activity bank alternatives, and reflection/observation support.
- **Progress + Adherence Dashboard**: numeric week status, completion/adherence bars, trend summaries, and next-best-action framing.
- **Multi-week trends/history**: compact 4-week completion bars, consistency trend path, and phase marker for long-view context.

Motivation/summary copy rules (governed parent-safe framing):
- Allowed tone: specific, measurable, encouragement-oriented.
- Avoid overclaims or trait-level conclusions; never infer child capability from adherence alone.
- Prefer concrete statements tied to scoped data:
  - “You completed X of Y sessions this week.”
  - “One more session unlocks next week momentum.”
  - “You’re building consistency…”
- Keep statements child/week scoped and directly derived from planner/accountability contract values.

### Canonical parent commitment/setup contract (save + load)

`POST /api/youth-development/program/commitment` now enforces a strict setup contract for guided weekly planning.

Required fields:
- `weekly_frequency` (canonical integer `2|3|4|5`)
- `preferred_days` (array of canonical weekday names, e.g. `["monday","wednesday"]`)
- `preferred_time` or `preferred_time_window` (canonical `HH:MM` 24h time)
- `session_length` or equivalent session length alias (`session_duration_minutes`, `target_session_length`) with allowed values `15|30|45`
- `energy_type` (`calm|balanced|high-energy`)

Normalization behavior:
- Canonical frequency is numeric `weekly_frequency`.
- Legacy frequency values (`"2x"`, `"3x"`, `"5x"`) are accepted and normalized to `2`, `3`, `5`.
- Legacy aliases (`days_per_week`, `committed_days_per_week`) are accepted on input and normalized to canonical `weekly_frequency`.
- Day aliases (`mon`, `tue`, `wed`, etc.) are normalized to canonical full day names.
- `preferred_time_window` supports either legacy string form (`"17:30"`) or structured object form (`{ start_time, end_time, timezone }`), but both forms require canonical `HH:MM` values.
- `start_date` is normalized to canonical `YYYY-MM-DD`. Missing values are defaulted to current UTC date; malformed values are rejected.
- Saved payload is returned in normalized shape and reused by planner rendering, schedule generation, and accountability/adherence summaries.

Invalid setup payloads are explicitly rejected with `error: "commitment_setup_invalid"` and validation messages; incomplete setup is not silently accepted.

### Canonical scheduled session payload contract

`POST /api/youth-development/program/session-plan` validates `scheduled_sessions` before persistence.

Per-session required fields:
- `session_id` (non-empty string)
- `day` (canonical day name; aliases like `mon` are normalized)
- `time` (`HH:MM` 24h)
- `status` (`planned|in_progress|completed|missed`, defaults to `planned` when omitted)

Scope and reference validation:
- `child_id` (if provided) must match current child scope.
- `week_number` (if provided) must match the route/week payload scope and remain within `1..36`.
- `session_id` values must be unique within the submitted `scheduled_sessions` array.
- For `in_progress`/`completed` sessions, at least one activity or lesson-plan reference must be present (`selected_activity_ids`, `lesson_plan_block_ids`, or `core_activity_title`).

Timestamp behavior (`scheduled_at`) decision:
- Canonical schedule identity remains `day + time` for planner UX continuity.
- `scheduled_at` is now an **optional strict field**: when present, it is normalized to canonical ISO-8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- When `scheduled_at` is present, it must align with canonical `day` and `time`; mismatches are rejected (`scheduled_at_day_mismatch`, `scheduled_at_time_mismatch`).
- Invalid timestamp values are rejected (`scheduled_at_invalid`) rather than silently coerced.

Session completion/update mutation integrity (`POST /api/youth-development/program/session-complete`):
- Mutations are scope-checked against canonical planner state using `child_id + week_number + session_id`.
- Optional schedule guards (`day`, `time`, `scheduled_at`) can be supplied; if supplied and mismatched, completion is rejected (`session_scope_mismatch`).
- Completion writes are blocked if `session_id` is already linked to a different child (`session_scope_conflict`).
- Only scoped canonical schedule rows are mutated; ambiguous/missing scoped sessions are rejected and never auto-created.

Save/load consistency:
- Validated+normalized session entries are persisted as the only source read by weekly planner/calendar and lesson-plan rendering.
- Session completion updates are derived from validated schedule payloads to keep adherence/accountability summaries aligned with canonical schedule truth.
- Invalid persisted schedule rows are dropped at load time instead of being silently coerced.

### Rejected payload examples

- `preferred_time: "5:30pm"` → `preferred_time_invalid`
- `preferred_time_window: { start_time: "18:30", end_time: "17:00" }` → `preferred_time_window_invalid_range`
- `start_date: "2026-02-30"` → `start_date_invalid`
- `scheduled_sessions[0]: { session_id: "", day: "funday", time: "5pm", status: "done" }` → required/day/time/status validation errors

### Backward compatibility rules

- Canonical weekly frequency normalization is unchanged (`weekly_frequency` numeric plus accepted aliases).
- Existing guided weekly setup remains valid when sending canonical `preferred_time` string values.
- Legacy `preferred_time_window` string payloads continue to work when they are valid canonical times.

## Remaining known exceptions
- `/youth-development.html#tdeOperatorConsole` remains as a compatible operator entry anchor for internal workflows.
- TDE operator console stays hidden by default and only displays for admin session contexts.
