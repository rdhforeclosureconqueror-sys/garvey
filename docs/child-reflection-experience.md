# Child Reflection Experience Architecture + Pilot Design Foundation

## Scope and PR Intent
This document defines a **design-only bounded context** named **Child Reflection Experience** that sits between chapter/gate story interaction and parent-facing developmental insight synthesis.

This PR does **not** ship full gameplay, scoring, route changes, migration changes, or authentication changes.

---

## 1) Philosophy

### Reflective, not diagnostic
The experience captures moment-to-moment choices, stories, and reflections to understand **emerging developmental themes**. It is explicitly not a diagnosis workflow.

### Exploratory, not evaluative
Children explore narrative worlds and symbolic situations. There are no test postures, no pass/fail conditions, and no ranking language.

### Emotionally safe
The UX tone is calm, warm, non-shaming, and supportive of pause/re-entry.

### Child dignity first
Language should protect identity and avoid deficit framing. A child is never reduced to one behavior pattern.

### Narrative learning + symbolic interaction
Story and symbolic play are the medium of reflection capture. Observations are derived from interaction patterns over time.

---

## 2) Core principles

- No right/wrong answers.
- No grades, scores, or ranking ladders shown to child.
- No punishment loops.
- No manipulative urgency, artificial scarcity, or streak pressure.
- No addictive mechanic architecture.
- No compliance tracking framing.
- No fear-based framing.
- No dark patterns.

---

## 3) Age-range considerations

### Ages 5–7
- Concrete symbols, simple language, short scenes.
- Co-regulation-friendly prompts.
- Visual choice-heavy; low text burden.

### Ages 8–10
- More explicit perspective-taking.
- Gentle cause/effect story branches.
- Basic self-reflection sentence starters.

### Ages 11–13
- Identity, belonging, fairness, peer context.
- Multi-step dilemmas with non-binary choices.
- Reflection journaling with optional voice.

### Ages 14–17
- Values conflict exploration, future-self framing.
- Nuanced social reasoning scenarios.
- More autonomous self-guided reflective prompts.

---

## 4) Interaction types (design catalog)

- Symbolic choice cards
- Emotional weather check-ins
- Story branching moments
- “What would you do?” scenarios
- Drawing prompts
- Voice reflections (optional)
- Value selection moments
- Character guidance prompts
- Bridge-building choices
- Path selection interactions
- Ritual interactions (grounding, gratitude, repair)
- Empathy scenarios

---

## 5) Observation categories (non-score)

Observation output is descriptive only and should use terms such as **emerging**, **current pattern**, **observed preference**, and **growth opportunity**.

- Emotional awareness
- Self-reflection style
- Repair orientation
- Empathy themes
- Attention patterns
- Patience tendencies
- Creative problem-solving style
- Collaboration tendencies
- Truth/safety comfort themes
- Responsibility themes

---

## 6) Parent insight philosophy

Parents receive:
- Developmental reflections
- Emerging themes
- Suggested conversations
- Growth observations

Parents do **not** receive:
- Diagnoses
- Clinical labels
- Pathology framing
- Deterministic child identity claims

---

## 7) Repo / architecture audit findings

### Existing systems and integration opportunities

1. **Gates routing and shell reuse**
   - Existing route shell mounting in `server/gatesRoutes.js` provides reusable path patterns for `/gates/...` views.
   - Candidate future child reflection routes can follow this same shell strategy to avoid route instability.

2. **Auth/session/ownership contracts already in place**
   - `resolveGatesSession` and session cookie patterns should gate future reflection APIs.
   - Existing parent-child ownership checks (child under parent profile context) should be reused rather than re-implemented.

3. **Integrated Profile bridge path exists**
   - `integration/integratedChildProfileBuilder.js` and `integration/identityGatesBridgeService.js` establish cross-system synthesis boundaries.
   - Child reflection observations should feed as an optional additional source, not collapse source independence.

4. **Development Pattern Engine already uses non-clinical language style**
   - `integration/developmentPatternEngine.js` already emits “emerging” and growth-oriented reflection language.
   - This is compatible with non-diagnostic reflection philosophy.

5. **Persistence and contracts patterns**
   - Existing repository uses explicit contract modules (`integration/integrationContracts.js`, TDE contracts).
   - New child reflection data shapes should follow same contract-first approach before DB migration.

6. **Trace/event style**
   - `server/gatesRoutes.js` logs structured JSON events with `ts` + `event` keys.
   - Future reflection session events should follow same convention for observability consistency.

### Reusable assets identified
- Reusable routes: `/gates/child/:childId/...` style
- Reusable UI shell: `public/gates.html` mounting pattern
- Reusable persistence approach: contract-first + repository pattern later
- Reusable event infrastructure: structured `console.info(JSON.stringify(...))`
- Reusable ownership path: existing parent session + child resolution flow

### Coupling intentionally avoided in this PR
- No direct writes into existing scoring flows
- No modifications to Gates assessment scoring mechanics
- No changes to auth/session behavior
- No changes to existing API response contracts

---

## 8) Child Reflection Experience interaction model (all 10 Gates)

| Gate | Story Interaction Concept | Symbolic Mechanic | Reflection Mechanic | Observation Opportunities | Family Conversation Bridge |
|---|---|---|---|---|---|
| 1. Discipline | The Lantern Path | Choose lantern fuel (focus, rest, planning, help) | “Which lantern helps when the path gets hard?” | effort-recovery style, follow-through preference | “What helps you restart after a hard moment?” |
| 2. Accountability | The Echo Hall | Choose echo response (hide, explain, repair, ask) | “What would you want to say next?” | repair language, ownership patterns | “How do we make things right together?” |
| 3. Integrity | The Mirror Grove | Choose mirror (truth, comfort, courage, silence) | “What feels safest and truest here?” | truth/safety comfort themes | “When is honesty hard but important?” |
| 4. Emotional Regulation | Valley of Weather | Choose weather card (storm/fog/sun/wind/rain) | “What helps the storm soften?” | regulation preferences, emotional awareness | “What calms your weather at home?” |
| 5. Respect | The Listening Bridge | Choose listening stance (wait, interrupt, reflect, ask) | “How can characters feel heard?” | perspective-taking, social pacing | “How do we show listening in our family?” |
| 6. Responsibility | The Bridge Builders | Choose response to broken bridge | “Who needs help and what can you do?” | initiative, contribution themes | “What is one shared responsibility this week?” |
| 7. Kindness | The Seed Garden | Choose which seeds to plant (care, words, time, repair) | “Which seed grows kindness fastest?” | empathy themes, prosocial choices | “What kindness can we practice tonight?” |
| 8. Teamwork | The River Crossing | Choose crossing strategy (lead, support, pair, plan) | “How does everyone cross safely?” | collaboration tendencies | “How do we solve things as a team?” |
| 9. Patience | The Clockless Tower | Choose pacing tools (breath, pause, try later, ask) | “What helps you wait without quitting?” | patience tendencies, frustration regulation | “Where can we practice patient effort?” |
| 10. Courage | The Quiet Gate | Choose courage form (speak, ask help, try, protect) | “What kind of courage fits today?” | risk-approach style, support-seeking | “What brave step feels possible this week?” |

---

## 9) Safe Observation Engine (design only)

### Proposed component
**Child Reflection Observation Engine** (proposal only)

### Input
- Reflection session metadata
- Prompt and response artifacts
- Symbolic choices
- Narrative path states

### Output
- Emerging tendencies
- Reflection themes
- Current preferences
- Growth opportunities
- Parent conversation prompts

### Language policy
Required tone:
- “emerging tendency”
- “current pattern”
- “observed preference”
- “growth opportunity”

Prohibited tone:
- disorder/deficient/abnormal/problem-child framing
- deterministic labels
- IQ claims or clinical-like judgments

---

## 10) Child UX safety rules

- Low-stimulation default visual language.
- Calm pace and optional pauses.
- Accessibility: text alternatives, input modality options, readable contrast.
- Neurodiversity sensitivity: no punishment for pacing differences.
- No streaks, no push urgency timers, no variable reward traps.
- No failure state messaging (“you failed,” “wrong answer”).
- Support emotional exit/re-entry.
- Preserve child agency and identity-affirming language.

Experience quality target: **peaceful, magical, reflective, exploratory, empowering**.

---

## 11) Future route proposals (document only)

- `GET /gates/child/:childId/reflection`
- `GET /gates/child/:childId/reflection/:gateNumber`
- `GET /gates/reflection/session/:sessionId`
- `POST /api/gates/child/:childId/reflection/session`
- `POST /api/gates/reflection/session/:sessionId/response`
- `GET /api/gates/child/:childId/reflection/summary`

No route implementation in this PR.

---

## 12) Future persistence proposal (no migration in this PR)

Proposed future tables:
- `gates_child_reflection_sessions`
- `gates_child_reflection_responses`
- `gates_child_reflection_observations`
- `gates_parent_reflection_summaries`

Principles:
- Parent-owned tenancy and child ownership verification at query boundary.
- Explicit retention policy and safe minimization.
- Separate from scoring tables; no shared child “score” columns.

---

## 13) UI concept prototypes (lightweight, static)

See `docs/child-reflection-ui-prototypes.md` for static narrative card and symbolic interaction examples. No runtime gameplay engine included in this PR.
