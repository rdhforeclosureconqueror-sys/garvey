# Gates Habit Bank + Integration Signals Foundation

## Philosophy
The Habit Bank frames developmental growth as lived practice, not performance. Each Gate tracks emerging patterns through repeatable, relational actions that can be seen in daily life.

## Why habits are not chores
Habits in this system are growth signals, not compliance tasks. They are invitations into agency, self-awareness, and contribution. Parents are observing integration, not enforcing behavior control.

## How growth signals work
- **Habit markers** show concrete behaviors that indicate the Gate is being practiced.
- **Integration signals** show the behavior is becoming stable across settings.
- **Self-correction signals** show the child can reset after drift or rupture.
- **Family practice** shows how the household supports the pattern together.
- **Parent mirror prompts** keep the adult in parallel growth.

## Future table proposal (no migration in this PR)
- `gates_habit_bank`
  - `gate_key` (pk)
  - `payload` (jsonb for habit markers, integration signals, self-correction signals, family practices, mirror prompts, identity statements)
  - `version`
  - `created_at`, `updated_at`
- `gates_child_habit_observations`
  - `id` (pk)
  - `parent_id`, `child_id`
  - `gate_key`
  - `habit_marker`
  - `observation_flags` (jsonb: noticed_today, practiced_with_support, child_did_independently, parent_modeled_this)
  - `notes`
  - `observed_at`

## Future tracking model
1. Load static habit bank by Gate.
2. Prioritize current growth Gate for each child.
3. Record lightweight daily/weekly observations without score impact.
4. Build trend views around emerging pattern frequency and self-correction cadence.

## Safeguards
- No punitive, diagnostic, or fixed-label framing.
- No grading, ranking, or compliance score.
- Check-ins remain optional and read-only for this phase.
- Parent language emphasizes growth signal, integration signal, and self-correction.
