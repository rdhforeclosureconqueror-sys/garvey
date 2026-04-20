# Activity Bank System (Layered + Parent-Driven)

## Hierarchy

The weekly activity bank now supports a two-level hierarchy:

- Main categories
  - `core_activities`
  - `stretch_activities`
  - `reflection`
  - `opening_routine`
  - `transition_routine`
  - `closing_observation`
- Subcategories (examples)
  - Core: `focus_control`, `emotional_regulation`, `task_initiation`, `problem_solving`, `working_memory`, `cognitive_flexibility`
  - Stretch: `complexity_increase`, `time_pressure`, `multi_step_challenge`, `distraction_resistance`, `transfer_challenge`
  - Reflection: `verbal_reflection`, `visual_reflection`, `guided_questions`, `self_rating`, `story_reflection`
  - Opening: `calm_entry`, `energy_activation`, `attention_reset`, `routine_anchor`
  - Transition: `reset_refocus`, `movement_transition`, `countdown_transition`
  - Closing/Observation: `parent_observation`, `child_summary`, `reinforcement`, `habit_anchor`

Backward compatibility remains in place through existing component types (`RULE_BASED_REGULATION`, `ATTENTION_MINDFULNESS`, etc.).

## Variation Model

Each activity now includes `variations` / `available_variations` with:

- `variation_id`
- `variation_level` (`easy`, `moderate`, `advanced`)
- `variation_type` (`visual`, `movement`, `timed`, `challenge`, `simplified`)
- `instructions`
- `duration`
- `materials`

## Parent Customization Model

Commitment/session planning now supports additive parent customization:

- `difficulty_level` (`easy`, `moderate`, `challenging`)
- `session_length` (`15`, `30`, `45`)
- `energy_type` (`calm`, `balanced`, `high-energy`)
- `weekly_frequency` (`2x`, `3x`, `5x`)

These fields can be passed either as top-level additive fields or under `parent_customization`.

## Session Builder with Alternatives

Session output keeps deterministic primary picks and now includes alternatives:

- deterministic `selected_activities`
- `selected_variations`
- `component_choices[component_type].selected_activity`
- `component_choices[component_type].available_alternatives` (up to 3)

## Planner Integration Rules

Week-content/planner payload now surfaces:

- selected path activities with variation options
- component alternatives for core/stretch/reflection
- additive planner-safe metadata for swapping/persisting selected activities/variations

Execution tracking and weekly flow contracts remain unchanged (additive only).

## Activity Bank Depth Audit

Depth audit now reports:

- total activities per category/subcategory
- total variations per activity
- missing subcategories
- subcategories below minimum depth (`5` activities)
- activities below minimum variation depth (`2` variations)

Soft targets are surfaced in audit responses and are not hard blockers.
