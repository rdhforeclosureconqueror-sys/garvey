# Adaptive Learning Experience Blueprint (Skill World Style)

Yes — the engine can produce experiences similar to the provided **Skill World: Count to 20** flow.

## What maps well to the current engine

- **Step-based progression** (Intro → Lesson → Demo → Practice → Checkpoint → Badge).
- **Per-question telemetry** (`attempts`, `correct`, `hints`, `% accuracy`).
- **Adaptive branching** based on accuracy thresholds (e.g., mastery vs review).
- **Growth profile serialization** for handoff to an adaptive hub.

## Minimal architecture to implement

1. **Content Contract (JSON)**
   - `steps[]`: ordered stage metadata with IDs.
   - `questionSets{practice|challenge|checkpoint}` with `prompt`, `count`, `choices`, `hints`.
   - `masteryRules`: thresholds for `mastered`, `developing`, `needs_practice`.

2. **Session State Model**
   - `step`, `attempts`, `correct`, `hints`, `stars`.
   - index pointers per zone (`practiceIndex`, `challengeIndex`, `checkpointIndex`).
   - per-zone hint cursor and lock state to prevent duplicate scoring.

3. **Scoring & Recommendation Service**
   - Inputs: session state + misconceptions.
   - Outputs: `mastery_status`, `recommended_next_skill`, `misconception_watch[]`.
   - Integrates with existing scoring/normalization modules.

4. **Renderer Layer**
   - Generic `renderStep(stepId)` and `renderQuestion(zone)`.
   - Shared object animator for “count with me” style demonstrations.
   - Accessibility: keyboard support, touch-safe answer handling, SR labels.

5. **Persistence + Hub Handoff**
   - Local save for demo mode.
   - API publish endpoint for production:
     - `POST /adaptive/growth-events`
     - `POST /adaptive/recommendations/next-skill`

## Data envelope example

```json
{
  "learner_id": "demo_student_001",
  "skill_id": "G1M_NS_001",
  "attempts": 7,
  "correct": 6,
  "accuracy_percent": 86,
  "hints_used": 2,
  "stars_earned": 6,
  "mastery_status": "Mastered",
  "recommended_next_skill": "Count Forward + Backward",
  "misconception_watch": []
}
```

## Implementation plan (phased)

- **Phase 1 (1–2 days):** static single-skill prototype with your exact UX pattern.
- **Phase 2 (2–4 days):** content-driven multi-skill loader + reusable step engine.
- **Phase 3 (2–3 days):** adaptive recommendation endpoint + dashboards for growth trends.
- **Phase 4 (1–2 days):** polish (animations, accessibility, device QA, teacher controls).

## Suggested acceptance criteria

- Supports at least 3 zones (`practice`, `challenge`, `checkpoint`) with independent item banks.
- Prevents double-scoring and supports safe continue.
- Emits growth profile on completion.
- Produces deterministic recommendation based on configured mastery rules.
- Can swap content to run a different skill without code changes.

## Key risk controls

- Keep UI and scoring independent to avoid presentation bugs affecting mastery.
- Store raw attempt stream for auditability (not only aggregates).
- Version skill content and scoring rules for reproducible outcomes.

