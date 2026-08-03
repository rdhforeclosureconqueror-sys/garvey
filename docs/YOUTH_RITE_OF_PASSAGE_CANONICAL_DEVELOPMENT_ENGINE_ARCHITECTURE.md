# Youth Rite of Passage — Canonical Gates Development Engine Architecture

## 1. Executive Summary

**Decision.** Build a new, definition-driven **Development Experience Engine (V2)** beside the current Gates implementation (V1). V1 remains authoritative for current authentication, owned-child resolution, parent-observation assessment, score snapshots, Gates profile, progress UI, prototypes, games, and tables. V2 begins as contracts, immutable content releases, a pure reducer, projections, and compatibility adapters behind server-side flags.

**Core boundary.** A canonical Gate definition says what a Gate means. A Development Experience definition says how a participant explores or practices it. A pure reducer advances a version-pinned session. Append-only events record participation. Separate evidence/projector services may later form cautious parent summaries. Experience completion never changes assessment stage, integration, or identity by itself.

**First slice.** Implement infrastructure only after the owner decisions in Section 50, then pilot one non-canonical Emotion K–1 fixture. Do not author ten production stories. The fixture in Section 38 demonstrates the contract; it is not approved content.

**Final decision: CONDITIONAL GO.** Engine-foundation implementation may begin after canonical Gate IDs/status vocabulary, content approvers, Body provenance handling, consent/retention, and V2 persistence ownership are approved.

## 2. Repository Identity

**Verified.** `/workspace/garvey` is a CommonJS Node/Express application named `ujamaa-cge`, backed by PostgreSQL and a vanilla browser client (`package.json`; `server/index.js`; `public/gates.html`). Gates is mounted inside the main server with `createGatesRouter()` (`server/index.js:96,302`). It is not an independent service.

**Verified reusable conventions.** Adaptive V2 keeps schemas, fixtures, manifests, and versioned JSON beneath `public/gamehub/content/adaptive-v2/`. Voice code separates provider access, playback metadata, fallback text, and caching (`youth-development/tde/voiceProviderAdapter.js`; `youth-development/tde/voiceService.js`; `server/skillWorldAudioRoutes.js`). These are conventions to reuse, not domain models to copy.

## 3. Branch, Starting Commit, and Investigation Scope

- Branch: `work`.
- Starting commit: `7ecc23616e6d68ad04acc4c8cc46351623b6e483`.
- Scope: direct inspection of all files named in the request, Adaptive V2 schemas/manifests, voice/audio services, relevant tests/docs, and locally available history.
- History limitation: the checkout is shallow; historical absence is not proof of remote absence.
- Allowed change: this architecture document only.
- Explicitly excluded: runtime code, routes, authentication, migrations, current data, prototypes, games, and manuscript changes.

## 4. Verified V1 Constraints

1. Gate identity is duplicated in `gates/gatesCatalog.js`, `gates/gatesAssessmentQuestions.js`, `gates/firstGenerationBlueprint.js`, `gates/gatesHabitBank.js`, and `public/gates.js`.
2. `GATES_ASSESSMENT_VERSION` is `gates_parent_observation_v1`; `scoreGatesAssessment()` maps answer weights to four stages, chooses three highest Gates, and chooses the lowest as Growth Gate (`gates/gatesAssessmentQuestions.js`; `gates/gatesScoring.js`).
3. `buildGatesProfile()` joins score results with `BLUEPRINT_BY_KEY` (`gates/gatesProfileBuilder.js`).
4. `server/gatesDb.js` creates V1 parent, child, assessment, progress, recommendation, practice-log, story-content, guidance, and timeline tables. Story/guidance tables have no active Gates content runtime.
5. `server/gatesRoutes.js` enforces parent session and child ownership for protected resources. `server/gatesAuth.js` also exposes reusable owned-child/canonical-learner resolvers.
6. Reflection content is hard-coded for Gates 1–3 in `server/gatesRoutes.js`; `public/gates.js` retains selections only in memory.
7. `integration/childReflectionContracts.js` is explicitly `v0-proposal`; its graph/session concepts are not persisted.
8. `public/gates.js` advances V1 practice by client-supplied `+10%`. V2 must not reinterpret that as developmental evidence.
9. GateQuest is explicitly isolated from official outcomes; Signal Path is a standalone Gate 1 game (`server/gatesRoutes.js`; `public/gamehub/content/`).
10. No complete canonical manuscript is present. Body is consistently Gate 4 in application registries, but its mythic source mapping remains unresolved.

## 5. Canonical Product Model

The ecosystem is a composition of independently owned models:

- **Foundation:** ten Gates, approved philosophy, vocabulary, symbolism, and source mappings.
- **Content:** immutable localized Gate definitions and Development Experiences.
- **Participation:** child sessions, actions, replay, practice instances, and consented reflection artifacts.
- **Interpretation:** assessment stage, parent observations, integration signals, self-correction signals, and cautious identity projections.
- **Presentation:** separate child and parent projections.
- **Supporting systems:** media, family practices, ceremonies, games, adaptive learning, timeline, and integrated profile.

No page, table, or oversized JSON object owns the whole ecosystem. Stable IDs and published-release references connect domains.

## 6. Developmental Philosophy and Safety Boundaries

The engine is developmental, reflective, non-diagnostic, non-clinical, non-shaming, awareness-based, practice-based, and parent-supported. Emotion is information, not an enemy. An action has effects, not moral points. Multiple reasonable choices may coexist. Repair may improve connection without erasing harm immediately.

Child-facing prohibited terms include `wrong`, `failed`, `bad child`, `weak Gate`, `emotional problem`, identity-based `out of control`, and single-answer moral framing. Preferred vocabulary includes `notice`, `pause`, `feel`, `try`, `choose`, `ask`, `return`, `repair`, `practice`, and `another choice`.

`gates/gatePracticeSignalSchema.js` already prohibits failure labels, diagnoses, comparison, countdown stress, streak guilt, and hidden profiling. V2 validators must preserve and extend—not weaken—those guardrails.

## 7. Proposed Domain Language

Choose **Development Experience** as the root term. It is broad enough for stories, conversations, family practices, comics, games, animation, and future modalities. **Gate Adventure** is an `experience_type`, not the engine name. **Development Journey** remains a longitudinal parent-facing projection and must not be confused with one session.

Canonical terms:

- `GateDefinition`: approved meaning and resources for one Gate.
- `ContentRelease`: immutable published bundle.
- `DevelopmentExperience`: authored practice definition.
- `ExperienceGraph`: deterministic nodes and transitions.
- `ExperienceSession`: version-pinned participation state.
- `ExperienceEvent`: append-only participation fact.
- `PracticeEvidence`: provenance-bearing fact, not a score.
- `DevelopmentProjection`: cautious derived view, never diagnosis.

## 8. System Context Diagram

```text
                 ┌──────────────── V1 Gates (unchanged) ────────────────┐
Parent Auth ────►│ assessment → snapshot → profile/progress/timeline     │
Owned Child ────►│ prototypes / GateQuest / Signal Path / game mappings │
                 └───────────────┬───────────────────────────────────────┘
                                 │ V1 adapters (read-only initially)
                                 ▼
┌──────────────┐   publish   ┌────────────────┐   load pinned   ┌────────────────┐
│ Gate Registry│────────────►│ Content Release│───────────────►│ Pure Experience│
│ + provenance │             │ manifest/media │                │ Reducer         │
└──────────────┘             └────────────────┘                └───────┬────────┘
                                                                      │ events/state
                                      ┌───────────────────────────────┴──────┐
                                      ▼                                      ▼
                             ┌─────────────────┐                    ┌─────────────────┐
                             │ Child Projection│                    │ Parent Projection│
                             └────────┬────────┘                    └────────┬────────┘
                                      │                                      │
                                   audio/media                   practice / ceremony
                                      │                                      │
                                      └──────────► persistence ◄──────────────┘
                                                        │
                                     development timeline / integrated profile
```

## 9. Domain Boundary Diagram

```text
Foundation owns: Gate IDs, order, philosophy, approved vocabulary, provenance
Publishing owns: schemas, manifests, approvals, immutable release bytes, retirement
Engine owns: action validation, graph transition, next state, domain events
Session repository owns: version pin, current state, idempotency, append-only events
Child projection owns: current-node safe text/options/media only
Parent projection owns: participation summary, consented reflection, next practice
Evidence owns: dated observations and eligible participation facts
Development projection owns: cautious longitudinal interpretations
Media owns: asset metadata, narration variants, cache resolution, fallback
Family practice owns: assignment/participation records
Ceremony owns: suggestion/preparation/acknowledgment/memory
External adapters own: V1, games, adaptive learning, timeline, integrated profile
```

The reducer must not access PostgreSQL, authenticate, synthesize audio, render HTML, change assessment stages, or form identity claims.

## 10. Canonical Gate Registry

Use immutable IDs independent of localized titles:

| Order | `gate_id` | Slug |
|---:|---|---|
| 1 | `gate_attention` | `attention` |
| 2 | `gate_emotion` | `emotion` |
| 3 | `gate_choice` | `choice` |
| 4 | `gate_body` | `body` |
| 5 | `gate_discipline` | `discipline` |
| 6 | `gate_truth` | `truth` |
| 7 | `gate_repair` | `repair` |
| 8 | `gate_creation` | `creation` |
| 9 | `gate_community` | `community` |
| 10 | `gate_legacy` | `legacy` |

Gate identity/order is platform-stable. Definition releases version wording and mappings. Locale variants translate presentation, not IDs. V1 lower-case keys map one-to-one through an adapter. Current catalogs, blueprint, and habit bank become import sources/adapters, never competing canonical registries.

## 11. Gate Definition Contract

```ts
interface GateDefinition {
  schema_version: "gate-definition.v1";
  gate_id: GateId;
  order: 1|2|3|4|5|6|7|8|9|10;
  slug: string;
  definition_version: string;
  locale: string;
  lifecycle: "draft"|"imported"|"under_review"|"approved"|"published"|"retired";
  language: {
    title: string; core_statement: string;
    philosophy: string; developmental_purpose: string;
    child: string; parent: string;
  };
  symbolism: Array<{symbol_id:string; label:string; meaning:string}>;
  identity_statements: ContentRef[];
  reflections: ContentRef[];
  journals: ContentRef[];
  observation_markers: Marker[];
  habit_markers: Marker[];
  growth_signals: Marker[];
  integration_signals: Marker[];
  self_correction_signals: Marker[];
  family_practice_refs: string[];
  developmental_tool_refs: string[];
  ceremony_refs: string[];
  age_band_variants: Record<"k1"|"g2_3"|"g4", ContentRef>;
  media_refs: string[];
  source_provenance: ProvenanceRef[];
  approvals: ApprovalRef[];
}
```

## 12. Book and Source Provenance Model

```ts
interface ProvenanceRef {
  source_id: string;
  source_type: "canonical_book"|"orin_chapter"|"approved_statement"|
    "author_note"|"v1_import"|"new_child_content"|"review_record";
  source_version: string;
  locator?: { chapter?: string; section?: string; page?: string };
  relationship: "quotes"|"adapts"|"echoes"|"informed_by"|"unresolved";
  canonicality: "canonical"|"supporting"|"non_canonical"|"unknown";
  verification_status: "unverified"|"verified"|"disputed";
}
```

Body uses `relationship: "unresolved"`, `canonicality: "unknown"`, and cannot pass the canonical-manuscript publication gate until an owner resolves it. V1 imports remain `non_canonical` or `unknown` until approved. Missing mappings are displayed to editors, never silently defaulted.

## 13. Content Governance and Approval Model

Preserve approval facts rather than building complex role management initially:

```ts
interface ApprovalRef {
  review_type: "author"|"philosophy"|"developmental"|"cultural"|"safety"|"technical";
  reviewer_id: string;
  decision: "approved"|"changes_requested"|"rejected";
  reviewed_version_hash: string;
  decided_at: string;
  notes_ref?: string;
}
```

Publication requires author/philosophy, developmental, safety, and technical approval; cultural review is required when policy or content scope says so. A changed byte hash invalidates approvals. One person may hold several responsibilities in a small team, but the preserved decisions remain distinct.

## 14. Immutable Content Release Model

A release is a content-addressed manifest. Drafts may change. Published releases may not. Corrections produce a new semantic content version and hash. Sessions pin `release_id` plus experience version; retired releases remain readable for existing sessions but are not offered for new starts. Rollback changes the offered manifest pointer, not stored sessions.

```json
{
  "schema_version":"gates-content-manifest.v1",
  "release_id":"gates_release_2026_09_01_01",
  "release_version":"1.0.0",
  "status":"published",
  "published_at":"2026-09-01T00:00:00Z",
  "definitions":[{"gate_id":"gate_emotion","version":"1.0.0","locale":"en-US","sha256":"..."}],
  "experiences":[{"experience_id":"exp_emotion_tower_k1","version":"1.0.0","locale":"en-US","age_band":"k1","sha256":"..."}],
  "media":[{"asset_id":"audio_scene_open_en_v1","version":"1","sha256":"..."}],
  "schemas":["gate-definition.v1","development-experience.v1"],
  "approval_bundle_hash":"..."
}
```

## 15. Development Experience Contract

```ts
interface DevelopmentExperience {
  schema_version: "development-experience.v1";
  experience_id: string;
  experience_version: string;
  gate_id: GateId;
  experience_type: "gate_adventure"|"guided_practice"|"family_conversation"|
    "scenario_game"|"classroom_activity";
  lifecycle: ContentLifecycle;
  locale: string;
  age_band: "k1"|"g2_3"|"g4";
  reading_level: { target_grade:number; method:string; reviewed:boolean };
  source_provenance: ProvenanceRef[];
  approvals: ApprovalRef[];
  entry_node_id: string;
  nodes: ExperienceNode[];
  replay_policy: ReplayPolicy;
  completion_rules: CompletionRule[];
  parent_summary_template: ParentSummaryTemplate;
  family_practice_refs: string[];
  accessibility: AccessibilityContract;
  media_manifest_ref: string;
}
```

## 16. Experience Graph and Node Model

Use the smallest strong node set:

1. `content`: introduction, scene, consequence, celebration.
2. `notice`: emotion, body, or thought noticing through `notice_kind`.
3. `practice`: pause, calming, support request, or guided action through `practice_kind`.
4. `choice`: action or repair choices through `choice_kind`.
5. `reflection`: selected, spoken, drawn, text, assisted, or unsaved reflection.
6. `completion`: terminal outcome and replay affordance.

```ts
interface ExperienceNode {
  node_id: string;
  node_type: "content"|"notice"|"practice"|"choice"|"reflection"|"completion";
  purpose?: string;
  visible_text: string[];
  narration_refs?: string[];
  media_refs?: string[];
  accessibility_label: string;
  options?: ExperienceOption[];
  next?: Transition;
  metadata?: { consequence?:boolean; repair_required?:boolean; max_visits?:number };
}
```

Node IDs are immutable within a version. Transitions may depend only on explicit session facts declared by the schema. No random or time-dependent transition is permitted unless a supplied deterministic seed is pinned. Publication rejects missing entry/terminal nodes, broken edges, unreachable required nodes, mandatory infinite cycles, unbounded depth, and repair-required paths without reachable repair.

Default limits: 80 nodes, 30 forward transitions before completion, five visits per cyclic node, and three replay branches per session; publishers may approve explicit bounded exceptions.

## 17. Choice Model

```ts
interface ExperienceOption {
  option_id: string;
  child_action_text: string;
  narration_ref?: string;
  next_node_id: string;
  authoring_tags: Array<"protective"|"supportive"|"help_seeking"|"connection_building"|
    "space_seeking"|"delaying"|"ineffective"|"reactive"|"harmful">;
  context_notes?: string[];
  effect_refs?: string[];
  age_variant_ref?: string;
}
```

Tags are hidden from children, visible to reviewers, and optionally aggregated for safety—not used as grades. An author may provide several reasonable actions, no privileged option, adult help, or a reactive action. A harmful action must have a proportionate authored consequence and reachable repair/support. Child wording states the next action, never the ending.

## 18. Natural-Consequence Model

Consequences are authored content nodes. Semantic effects support review and parent-safe summaries:

```ts
interface EffectTag {
  dimension: "safety"|"calm"|"connection"|"trust"|"clarity"|"support"|
    "responsibility"|"repair_burden"|"time";
  direction: "supports"|"strains"|"unchanged"|"uncertain";
  visibility: "internal"|"parent_summary_eligible";
  rationale: string;
}
```

No numeric weights or child meters are canonical. Child-visible feedback is qualitative story text. Parent descriptors may say “the path explored asking for space” or “repair was practiced,” never “trust score -2.”

## 19. Repair Model

Repair is represented by `choice` nodes with `choice_kind: "repair"`, followed by authored consequence/content. Supported actions include naming events, acknowledging impact, apologizing, fixing damage, asking needs, giving time, trying again, reconnecting, and adult support.

Validation policy may require repair when an upstream option is tagged `harmful` or a consequence declares `repair_required`. Repair need not restore the original state; the story may show that another person still needs time. Completion can occur after sincere repair practice without forced forgiveness.

## 20. Reflection Model

```ts
interface ReflectionPolicy {
  modes: Array<"selected"|"spoken_ephemeral"|"drawing"|"short_text"|"parent_assisted"|"skip">;
  persistence: "none"|"derived_only"|"private_child"|"parent_visible_with_consent";
  consent_prompt_ref?: string;
  retention_days?: number;
}
```

Default to no raw response storage. Spoken reflection should normally be processed locally or ephemerally; store a child-selected theme only when consented. Raw audio requires separate explicit consent, retention, deletion/export behavior, and security review. A child may skip without losing completion.

## 21. Session State Model

```ts
interface ExperienceSessionState {
  session_id: string;
  parent_profile_id: string;
  child_id: string;
  gate_id: GateId;
  experience_id: string;
  release_id: string;
  experience_version: string;
  age_band: "k1"|"g2_3"|"g4";
  locale: string;
  narration_variant_id?: string;
  status: "started"|"in_progress"|"paused"|"completed"|"abandoned";
  entry_node_id: string;
  current_node_id: string;
  visited: Array<{node_id:string; visit:number}>;
  choices: Array<{node_id:string; option_id:string}>;
  replay: { count:number; origin_node_id?:string; explored_option_ids:string[] };
  revision: number;
  started_at: string;
  updated_at: string;
  completed_at?: string;
}
```

Resume uses the pinned retired or current release. Restart creates a new session. Alternate-path replay remains within the session and records its origin. Mutations require expected revision plus idempotency key. A local outbox may tolerate brief offline use, but the server validates ordered actions on reconnect. Cross-device continuation uses server state only.

## 22. Append-Only Event Model

Correctness events:

- `experience_started`
- `node_entered`
- `option_selected`
- `practice_completed`
- `reflection_disposition_recorded`
- `replay_started`
- `experience_completed`
- `session_paused`
- `session_abandoned`

Optional operational analytics:

- `narration_started`
- `narration_completed`
- `media_fallback_used`
- `parent_summary_viewed`

Events contain event/session IDs, sequence, type, release/version, node/option reference, occurred/received times, actor type, and minimal payload. Story text, raw voice, diagnoses, comparison, and unnecessary device fingerprints are excluded.

## 23. Child-Safe Projection

The child API returns only session revision/status, current node’s visible text, safe options, resolved media/fallback state, pause/exit/replay affordances, and accessibility labels. It excludes Gate scores, Growth Gate rationale, parent observations, hidden tags, effect dimensions, author notes, other branches, raw analytics, and household identifiers.

Projection is a pure allowlist, not object redaction. Tests fail if unknown fields leak.

## 24. Parent-Safe Projection

After participation, parents may receive:

- Gate and experience title;
- started/completed/replayed participation facts;
- tools introduced;
- broad paths explored without moral ranking;
- whether repair was practiced;
- consented reflection theme only;
- optional family practice;
- observation prompt;
- source/version timestamp.

It must not label exploratory reactive choices as failure, infer a stable trait, expose private reflection, or update stage.

## 25. Progress and Evidence Model

Keep separate ledgers/projections:

| Concept | Source | Allowed states | Must not imply |
|---|---|---|---|
| Content participation | session events | not explored, started, completed, replayed, revisited | mastery |
| Practice participation | practice events | introduced, supported, independent, repeated, returned | stage |
| Parent observation | parent report | dated contextual statement | diagnosis |
| Developmental stage | approved instrument | versioned time-bound stage | permanent identity |
| Integration signal | eligible repeated evidence | tentative/emerging pattern with provenance | certainty |
| Self-correction signal | dated observation | noticed/adjusted with support context | perfection |
| Identity projection | approved projection policy | cautious narrative | fixed label |

Experience completion emits participation evidence only. No percentage unifies these concepts.

## 26. Parent Observation Integration

Create a future observation contract with parent/child ownership, Gate/marker reference, date, context, support level, parent wording, consent, and source version. Experience summaries may offer an observation prompt but may not auto-create an observation. V1 assessment answers remain immutable assessment evidence and map through a read adapter.

## 27. Family Practice Integration

A published practice definition contains Gate, age bands, duration, steps, supports, optional reflection, safety notes, and ceremony relationships. Assignment is optional. A participation instance records offered/accepted/skipped, support level, date, optional parent confirmation, and consented reflection. Language says “try together” rather than “homework” or streak pressure.

## 28. Ceremony Integration

Ceremony is independent of scores. Model `suggested`, `preparing`, `family_acknowledged`, `completed`, or `declined`, plus optional artifact/memory reference and timeline eligibility. Readiness is family/editorial guidance, not an automatic threshold. Completion marks acknowledgment of practice and awareness, never perfection.

## 29. Audio and Media Model

```ts
interface MediaAsset {
  asset_id: string; asset_version: string;
  kind: "narration"|"illustration"|"animation"|"caption"|"transcript";
  locale: string; content_hash: string; source_text_hash?: string;
  voice?: { voice_id:string; provider:string; model_version:string; pronunciation_guide_ref?:string };
  uri: string; duration_ms?: number; transcript_ref?: string; alt_text?: string;
  reduced_stimulation_alternative_ref?: string;
}
```

Narration is user-started, pausable, resumable, replayable, and never required. Every line has equivalent visible text. Cache identity includes text hash, locale, voice, provider/model, pacing, format, and asset version. Reuse `createSkillWorldAudioHash()` and voice fallback concepts through a Gates media adapter; do not couple the reducer to synthesis.

## 30. Accessibility Model

Publication and UI acceptance require keyboard operation, semantic buttons/headings, visible focus, 44×44 targets, zoom/reflow, contrast, reduced motion, low-stimulation mode, no countdown pressure, user-started narration, transcript parity, captions where applicable, useful alt text, simple language, and one task per screen. Screen-reader announcements must describe transitions without announcing hidden author tags.

## 31. Security, Ownership, Consent, and Privacy

Reuse V1 parent authentication and owned-child resolution at the Express boundary. Require cross-parent denial on every session, event, reflection, practice, ceremony, and summary operation. Use opaque random session IDs, CSRF protection for cookie writes, rate limits, JSON Schema, payload limits, optimistic revision checks, idempotency keys, encryption, retention/deletion/export workflows, and least-privilege database access.

Collect no rankings, diagnosis, biometric inference, ad targeting, unnecessary voice, or other household data. Consent decisions are versioned and revocable. Logs use IDs and error codes, not reflection text.

## 32. V1 Compatibility and Adapter Strategy

| V1 concept | V2 treatment |
|---|---|
| `GATES_CATALOG` / `GATES` | read adapter maps keys to stable Gate IDs |
| Assessment questions/version | unchanged approved instrument input |
| Stages | time-bound assessment projection only |
| Strongest/Growth Gates | parent-profile projection; not child engine state |
| Blueprint | imported draft Gate content with provenance |
| Habit bank | imported draft markers/practices/identity copy |
| Recommendations | adapter resolves V2 practice refs when flagged |
| Progress rows | V1-only; never backfilled from V2 percentage |
| Reflection prototypes | remain available; later links may point to V2 |
| Practice-game registry | external-experience adapter |
| Timeline | receives selected V2 milestone events through adapter |
| Integrated profile | consumes eligible evidence projection, never raw choices |

No current data is mutated. Dual reads are allowed under flags; dual writes require an explicit later design.

## 33. Feature-Flag and Rollback Strategy

Flags:

- `gates_definition_registry_v2`
- `gates_development_engine_v2`
- `gates_child_experiences_v2`
- `gates_emotion_k1_content_v1`
- `gates_experience_audio_v1`
- `gates_parent_experience_summary_v1`
- `gates_evidence_progress_v2`

All default off. Evaluate server-side by environment, account allowlist, pilot cohort, owned child age band, and published release availability. Store evaluated flags on session start. Failure to load/validate a release fails closed to V1 or an unavailable message; never substitute draft content. Rollback stops new sessions on a release while pinned sessions remain resumable unless a safety withdrawal explicitly blocks them.

## 34. Proposed Persistence Model

SQL pseudocode only—no migration is created:

```sql
gate_content_releases(release_id PK, version, status, manifest_json, manifest_hash UNIQUE,
  approval_bundle_json, published_at, retired_at)
gate_experience_sessions(session_id PK, parent_id FK, child_id FK, gate_id,
  experience_id, release_id FK, experience_version, age_band, locale,
  state_json, revision, status, started_at, updated_at, completed_at)
gate_experience_events(event_id PK, session_id FK, sequence, event_type,
  idempotency_key, event_json, occurred_at, received_at,
  UNIQUE(session_id, sequence), UNIQUE(session_id, idempotency_key))
gate_parent_observations(observation_id PK, parent_id FK, child_id FK, gate_id,
  marker_id, context_json, observed_at, consent_json, created_at)
gate_practice_instances(instance_id PK, definition_ref, parent_id FK, child_id FK,
  gate_id, status, support_level, evidence_json, occurred_at)
gate_ceremony_events(ceremony_event_id PK, ceremony_ref, parent_id FK, child_id FK,
  gate_id, status, artifact_ref, occurred_at)
gate_reflection_artifacts(artifact_id PK, session_id FK, visibility, artifact_type,
  encrypted_ref, derived_theme, consent_json, expires_at)
```

Definitions remain release files/manifests initially; PostgreSQL stores published manifests and participation. Leave `gates_story_content` and `gates_guidance_messages` untouched. Later evaluate deprecation or adaptation only after deployed usage is known.

## 35. Proposed API Surface

```text
GET  /api/gates/v2/content/manifest                    published child-safe manifest
GET  /api/gates/v2/children/:childId/experiences       available owned-child experiences
POST /api/gates/v2/children/:childId/sessions          start version-pinned session
GET  /api/gates/v2/children/:childId/sessions/:id      child-safe current projection
POST /api/gates/v2/children/:childId/sessions/:id/actions validate/reduce/persist action
POST /api/gates/v2/children/:childId/sessions/:id/pause
POST /api/gates/v2/children/:childId/sessions/:id/replay
POST /api/gates/v2/children/:childId/practices/:ref/complete
GET  /api/gates/v2/children/:childId/parent-summaries/:sessionId
POST /api/gates/v2/children/:childId/family-practices/:ref/participation
POST /api/gates/v2/children/:childId/ceremonies/:ref/events
```

Action requests contain `action_id`, expected revision, idempotency key, node ID, and allowed option/practice/reflection disposition. The Express handler authenticates and owns the child, repository loads state/release, pure reducer returns next state/events/projection, transaction appends events and updates the state snapshot.

## 36. Proposed Repository File Structure

```text
gates-v2/
  domain/gateRegistry.js
  engine/reduceDevelopmentExperience.js
  engine/validateAction.js
  engine/projectChildState.js
  engine/projectParentSummary.js
  evidence/projectParticipationEvidence.js
  adapters/v1GatesAdapter.js
  adapters/timelineAdapter.js
  adapters/integratedProfileAdapter.js
  content/manifest.v1.json
  content/schemas/gate-definition.schema.json
  content/schemas/development-experience.schema.json
  content/schemas/content-manifest.schema.json
  content/definitions/*.gate-definition.v1.json
  content/experiences/emotion/k1/*.development-experience.v1.json
  content/fixtures/example-only/*
  validation/validateContentRelease.js
server/gatesV2Routes.js
server/gatesV2Repository.js
server/gatesV2MediaAdapter.js
public/gates-v2-child/index.html
public/gates-v2-child/app.js
public/gates-v2-child/styles.css
tests/gates-v2/*.test.js
```

`gates-v2/` makes coexistence explicit and matches the repository’s CommonJS/domain-folder style. Published content may later move outside `public/` so only projections are exposed.

## 37. Validation and Publication Gates

Publication-blocking validators:

1. Exactly ten registry Gates with fixed unique IDs/order/slugs.
2. Schema version supported; all IDs and references unique/resolvable.
3. Manifest hashes match bytes; published versions are immutable.
4. Required provenance and approvals cover the exact content hash.
5. Canonical claims reference verified sources; unresolved Body mapping cannot claim canonicality.
6. Entry exists; terminal completion exists; all transitions resolve.
7. Required nodes reachable; mandatory loops bounded; depth/node limits respected.
8. Harmful paths have proportionate consequence and reachable repair/support.
9. Narration visible-text hashes and transcripts match.
10. Locale and age-band metadata complete; no fallback silently changes meaning.
11. Opening sentence count and reading target meet policy or approved exception.
12. Prohibited child language absent; preferred tone reviewed.
13. Child projection allowlist excludes internal/parent fields.
14. Parent projection excludes moral judgments and private artifacts.
15. Accessibility metadata complete.

Nonblocking warnings may cover optional illustration absence or conservative readability estimates, but warnings require recorded editorial disposition.

## 38. Complete Emotion K–1 Example Definition

**EXAMPLE ONLY — NOT CANONICAL OR PUBLISHED CONTENT.** The fixture is intentionally compact but contract-complete. Its Gate wording and mythic mapping are unapproved.

```json
{
  "schema_version":"development-experience.v1",
  "experience_id":"example_emotion_block_tower_k1",
  "experience_version":"0.0.1-example",
  "gate_id":"gate_emotion",
  "experience_type":"gate_adventure",
  "lifecycle":"draft",
  "locale":"en-US",
  "age_band":"k1",
  "reading_level":{"target_grade":2,"method":"editorial_plus_automated","reviewed":false},
  "source_provenance":[{
    "source_id":"unresolved_emotion_source",
    "source_type":"new_child_content",
    "source_version":"0.0.1",
    "relationship":"echoes",
    "canonicality":"non_canonical",
    "verification_status":"unverified"
  }],
  "approvals":[],
  "entry_node_id":"opening",
  "nodes":[
    {
      "node_id":"opening","node_type":"content","purpose":"introduction",
      "visible_text":[
        "Maya builds a tall block tower.",
        "She puts a red block on top.",
        "Leo walks by with a box.",
        "The box bumps the tower.",
        "The blocks fall with a crash.",
        "Maya's face feels hot.",
        "Her hands squeeze tight."
      ],
      "narration_refs":["audio_opening_en_example_v1"],
      "accessibility_label":"Maya's block tower falls after Leo bumps it.",
      "next":{"next_node_id":"notice_feeling"}
    },
    {
      "node_id":"notice_feeling","node_type":"notice","purpose":"emotion",
      "visible_text":["What feeling might be here?"],
      "accessibility_label":"Choose a feeling Maya might notice.",
      "options":[
        {"option_id":"mad","child_action_text":"Mad","next_node_id":"notice_body","authoring_tags":[],"effect_refs":[]},
        {"option_id":"sad","child_action_text":"Sad","next_node_id":"notice_body","authoring_tags":[],"effect_refs":[]},
        {"option_id":"surprised","child_action_text":"Surprised","next_node_id":"notice_body","authoring_tags":[],"effect_refs":[]}
      ]
    },
    {
      "node_id":"notice_body","node_type":"notice","purpose":"body",
      "visible_text":["What does Maya notice in her body?"],
      "accessibility_label":"Choose a body clue.",
      "options":[
        {"option_id":"hot_face","child_action_text":"A hot face","next_node_id":"pause","authoring_tags":[],"effect_refs":[]},
        {"option_id":"tight_hands","child_action_text":"Tight hands","next_node_id":"pause","authoring_tags":[],"effect_refs":[]},
        {"option_id":"fast_heart","child_action_text":"A fast heart","next_node_id":"pause","authoring_tags":[],"effect_refs":[]}
      ]
    },
    {
      "node_id":"pause","node_type":"practice","purpose":"calming",
      "visible_text":["Maya can pause.","Breathe in slowly.","Breathe out slowly."],
      "accessibility_label":"Take one slow breath with Maya.",
      "options":[{"option_id":"breath_done","child_action_text":"I took a breath","next_node_id":"first_action","authoring_tags":["supportive"],"effect_refs":["calm_supports"]}]
    },
    {
      "node_id":"first_action","node_type":"choice","purpose":"action",
      "visible_text":["What could Maya do next?"],
      "accessibility_label":"Choose Maya's next action.",
      "options":[
        {"option_id":"ask_accident","child_action_text":"Ask, ‘Was it an accident?’","next_node_id":"ask_result","authoring_tags":["connection_building"],"effect_refs":["clarity_supports","connection_supports"]},
        {"option_id":"ask_space","child_action_text":"Say, ‘I need some space.’","next_node_id":"space_result","authoring_tags":["protective","space_seeking"],"effect_refs":["safety_supports","calm_supports"]},
        {"option_id":"push_blocks","child_action_text":"Knock over Leo's blocks","next_node_id":"push_result","authoring_tags":["reactive","harmful"],"effect_refs":["connection_strains","repair_burden_strains"]}
      ]
    },
    {
      "node_id":"ask_result","node_type":"content","purpose":"consequence",
      "visible_text":["Leo says, ‘Yes. I am sorry.’","Maya still feels upset.","Now she knows what happened."],
      "accessibility_label":"Leo explains that it was an accident.",
      "next":{"next_node_id":"healthy_followup"},
      "metadata":{"consequence":true}
    },
    {
      "node_id":"space_result","node_type":"content","purpose":"consequence",
      "visible_text":["Maya steps back.","Her hands begin to loosen.","Leo waits nearby."],
      "accessibility_label":"Maya takes space and begins to calm.",
      "next":{"next_node_id":"healthy_followup"},
      "metadata":{"consequence":true}
    },
    {
      "node_id":"healthy_followup","node_type":"choice","purpose":"action",
      "visible_text":["What could Maya do now?"],
      "accessibility_label":"Choose Maya's next action.",
      "options":[
        {"option_id":"rebuild_together","child_action_text":"Ask Leo to help rebuild","next_node_id":"reflection","authoring_tags":["connection_building","supportive"],"effect_refs":["connection_supports"]},
        {"option_id":"adult_help","child_action_text":"Ask an adult for help","next_node_id":"reflection","authoring_tags":["help_seeking","protective"],"effect_refs":["support_supports"]}
      ]
    },
    {
      "node_id":"push_result","node_type":"content","purpose":"consequence",
      "visible_text":["Leo's blocks fall too.","Leo looks hurt.","The problem is bigger now."],
      "accessibility_label":"Leo's blocks fall and the problem grows.",
      "next":{"next_node_id":"repair_choice"},
      "metadata":{"consequence":true,"repair_required":true}
    },
    {
      "node_id":"repair_choice","node_type":"choice","purpose":"repair",
      "visible_text":["Maya can try to repair.","What could she do?"],
      "accessibility_label":"Choose a repair action.",
      "options":[
        {"option_id":"name_and_fix","child_action_text":"Say what happened and help fix the blocks","next_node_id":"repair_result","authoring_tags":["supportive","connection_building"],"effect_refs":["responsibility_supports","connection_supports"]},
        {"option_id":"ask_adult","child_action_text":"Ask an adult to help them talk","next_node_id":"repair_result","authoring_tags":["help_seeking","protective"],"effect_refs":["support_supports"]}
      ]
    },
    {
      "node_id":"repair_result","node_type":"content","purpose":"consequence",
      "visible_text":["Maya says what she did.","She helps with the blocks.","Leo still needs a little time.","Repair has started."],
      "accessibility_label":"Maya begins repair, and Leo still needs time.",
      "next":{"next_node_id":"reflection"},
      "metadata":{"consequence":true}
    },
    {
      "node_id":"reflection","node_type":"reflection","purpose":"reflection",
      "visible_text":["What helped Maya notice before choosing?"],
      "accessibility_label":"Choose what helped Maya notice.",
      "options":[
        {"option_id":"feeling","child_action_text":"Her feeling","next_node_id":"complete","authoring_tags":[],"effect_refs":[]},
        {"option_id":"body","child_action_text":"Her body clue","next_node_id":"complete","authoring_tags":[],"effect_refs":[]},
        {"option_id":"pause","child_action_text":"Her pause","next_node_id":"complete","authoring_tags":[],"effect_refs":[]}
      ],
      "metadata":{"max_visits":3}
    },
    {
      "node_id":"complete","node_type":"completion","purpose":"celebration",
      "visible_text":["Maya noticed, chose, and kept learning.","You can explore another path."],
      "accessibility_label":"Experience complete. Replay another path or return.",
      "options":[{"option_id":"replay_first_choice","child_action_text":"Try another choice","next_node_id":"first_action","authoring_tags":[],"effect_refs":[]}],
      "metadata":{"max_visits":4}
    }
  ],
  "replay_policy":{"allowed":true,"origins":["first_action"],"max_replays":3},
  "completion_rules":[{"rule":"visited","node_id":"complete"}],
  "parent_summary_template":{"include":["participation","tools","repair_practiced","paths_explored","family_practice"],"exclude":["moral_ranking","hidden_tags"]},
  "family_practice_refs":["example_family_emotional_weather"],
  "accessibility":{"keyboard":true,"screen_reader":true,"reduced_motion":true,"low_stimulation":true,"audio_optional":true,"transcript_required":true,"one_task_per_screen":true},
  "media_manifest_ref":"example_emotion_tower_media_0.0.1"
}
```

## 39. Example Experience Graph

```text
opening → feeling → body → pause → first action
                                     ├─ ask accident → clarity consequence ─┐
                                     │                                     ├─ rebuild/help → reflection
                                     ├─ ask space → calming consequence ───┘                    │
                                     │                                                          ▼
                                     └─ knock blocks → problem grows → repair choice → repair → reflection
                                                                                                  │
                                                                                                  ▼
                                                                                              completion
                                                                                                  │
                                                                                      replay first action
```

## 40. Example Session State

```json
{
  "session_id":"ges_01JEXAMPLE",
  "parent_profile_id":"42",
  "child_id":"108",
  "gate_id":"gate_emotion",
  "experience_id":"example_emotion_block_tower_k1",
  "release_id":"example_release_unpublished_001",
  "experience_version":"0.0.1-example",
  "age_band":"k1",
  "locale":"en-US",
  "narration_variant_id":"example_voice_en_1",
  "status":"in_progress",
  "entry_node_id":"opening",
  "current_node_id":"repair_choice",
  "visited":[{"node_id":"opening","visit":1},{"node_id":"notice_feeling","visit":1},{"node_id":"notice_body","visit":1},{"node_id":"pause","visit":1},{"node_id":"first_action","visit":1},{"node_id":"push_result","visit":1},{"node_id":"repair_choice","visit":1}],
  "choices":[{"node_id":"notice_feeling","option_id":"mad"},{"node_id":"notice_body","option_id":"tight_hands"},{"node_id":"pause","option_id":"breath_done"},{"node_id":"first_action","option_id":"push_blocks"}],
  "replay":{"count":0,"explored_option_ids":["push_blocks"]},
  "revision":8,
  "started_at":"2026-09-01T15:00:00Z",
  "updated_at":"2026-09-01T15:03:00Z"
}
```

## 41. Example Event Stream

```json
[
  {"sequence":1,"type":"experience_started","node_id":"opening"},
  {"sequence":2,"type":"node_entered","node_id":"notice_feeling"},
  {"sequence":3,"type":"option_selected","node_id":"notice_feeling","option_id":"mad"},
  {"sequence":4,"type":"option_selected","node_id":"notice_body","option_id":"tight_hands"},
  {"sequence":5,"type":"practice_completed","node_id":"pause","practice":"slow_breath"},
  {"sequence":6,"type":"option_selected","node_id":"first_action","option_id":"push_blocks"},
  {"sequence":7,"type":"node_entered","node_id":"push_result"},
  {"sequence":8,"type":"node_entered","node_id":"repair_choice"}
]
```

## 42. Example Child Projection

```json
{
  "session_id":"ges_01JEXAMPLE",
  "revision":8,
  "status":"in_progress",
  "gate":{"gate_id":"gate_emotion","title":"Emotion"},
  "node":{
    "node_id":"repair_choice",
    "type":"choice",
    "visible_text":["Maya can try to repair.","What could she do?"],
    "accessibility_label":"Choose a repair action.",
    "options":[
      {"option_id":"name_and_fix","text":"Say what happened and help fix the blocks"},
      {"option_id":"ask_adult","text":"Ask an adult to help them talk"}
    ]
  },
  "controls":{"pause":true,"exit_to_parent":true,"narration":false}
}
```

No parent IDs, author tags, effects, scores, Growth Gate, or other branches are exposed.

## 43. Example Parent Projection

```json
{
  "child_id":"108",
  "session_id":"ges_01JEXAMPLE",
  "gate":{"gate_id":"gate_emotion","title":"Emotion"},
  "experience":{"title":"The Block Tower","version":"0.0.1-example"},
  "participation":{"status":"completed","replayed":true,"paths_explored":2},
  "tools_introduced":["notice a feeling","notice a body clue","take a slow breath"],
  "repair_practiced":true,
  "reflection":{"shared":false},
  "suggested_family_practice":{"title":"Name today's emotional weather","optional":true},
  "observation_prompt":"What helped your child pause or ask for support today?",
  "disclaimer":"This is a participation summary, not a score or diagnosis."
}
```

## 44. Testing Strategy and Matrix

| Layer | Required tests |
|---|---|
| Unit | pure reducer, actions, idempotency, replay limits, projections |
| Schema | valid/invalid definitions, manifests, sessions, events |
| Registry | exact ten IDs/order, V1 mapping |
| Graph | reachability, edges, cycles, terminal, repair paths, depth |
| API | start/load/action/pause/replay/summary and error contracts |
| Ownership | unauthenticated, cross-parent, wrong-child, leaked IDs |
| Projection | strict allowlists; no hidden/parent fields in child view |
| Accessibility | keyboard, screen reader, focus, contrast, reflow, reduced motion |
| Audio | transcript parity, deterministic hash, fallback, pause/replay, no autoplay |
| Compatibility | flags off preserve V1 responses/data; no V1 mutations |
| Safety | prohibited language, no scores/rankings/diagnosis, harmful-path repair |
| Human | philosophy, developmental, cultural, safety, K–1 usability review |

Use `node:test`, as existing Gates tests do. Content release validation must be deterministic and runnable without a database. Integration route tests may use the repository’s mock-pool conventions.

## 45. Content Authoring Workflow

1. Create draft from approved template.
2. Attach exact provenance; mark unknowns.
3. Run schema, graph, readability, language, accessibility, and transcript validators.
4. Conduct author/philosophy review.
5. Conduct developmental and safety review.
6. Conduct cultural review when required.
7. Produce/version media from approved text.
8. Re-run parity and release-hash validation.
9. Technical publisher creates immutable manifest.
10. Pilot behind allowlist.
11. Revise through a new version; never edit published bytes.
12. Retire or safety-withdraw through manifest state and flags.

## 46. Implementation Phases

0. Owner decisions, manuscript source, Body handling, consent/retention.
1. Add non-runtime V2 schemas, example fixtures, validators, and tests.
2. Implement pure reducer and child/parent projectors with fixtures only.
3. Design/review conceptual persistence, then add a separate approved migration task.
4. Add feature-flagged repository and Express APIs using existing ownership.
5. Build accessible child shell and media adapter.
6. Author/review Emotion K–1 pilot content as a new immutable release.
7. Pilot, audit, and revise.
8. Add one approved experience per Gate, then additional age bands.
9. Integrate eligible evidence, family practices, ceremonies, timeline, and parent journey.
10. Consider V1 retirement only after parity, adoption, data, and rollback review.

## 47. Files That Would Be Added Later

The exact proposed additions are those in Section 36: `gates-v2/` domain, engine, evidence, adapters, content schemas/fixtures/validators; `server/gatesV2Routes.js`, `server/gatesV2Repository.js`, `server/gatesV2MediaAdapter.js`; a separate `public/gates-v2-child/` shell; and `tests/gates-v2/` suites.

## 48. Files That Would Be Modified Later

Only after separate approval:

- `server/index.js` to mount V2.
- `server/gatesDb.js` or a new migration loader to append—not rewrite—migrations.
- `public/gates.js` to surface flagged parent links/summaries.
- `integration/identityGatesBridgeService.js` and `integration/developmentPatternEngine.js` to consume eligible projections.
- `package.json` for validation scripts.
- V1 tests for explicit coexistence guarantees.

## 49. Files That Must Not Be Changed Yet

- All production files under `gates/`, `server/`, `public/`, `integration/`, and existing tests.
- Applied V1 migrations and current Gates tables/data.
- `gates_parent_observation_v1`, scoring thresholds, profile behavior, and Growth Gate selection.
- Parent authentication and owned-child enforcement.
- Reflection prototypes, GateQuest, Signal Path, and practice-game registry.
- Any canonical manuscript or current Body numbering.
- Adaptive V2 schemas and voice runtime.

## 50. Open Questions and Owner Decisions

Blocking before published content:

1. Canonical manuscript location/version and quotation/adaptation rights.
2. Body mythic mapping and who resolves it.
3. Final philosophical, developmental, cultural, and safety approvers.
4. Stable Gate ID naming approval.
5. Lifecycle vocabulary and safety-withdrawal policy.
6. Consent, reflection visibility, retention, deletion, and export rules.
7. Whether raw voice is categorically out of scope for the first pilot.
8. Parent choice versus score selection for future Growth Gate behavior.
9. Required localization/dialect/pronunciation scope.
10. Pilot device/network/offline requirements.

Blocking before persistence/API implementation:

11. Whether V2 sessions use native Gates child IDs only or the canonical learner resolver.
12. CSRF and rate-limit standards for this server.
13. Database migration ownership and operational rollback process.
14. Whether retired sessions remain playable or readable-only.

## 51. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Placeholder copy becomes canonical | provenance, lifecycle, approvals, publication blockers |
| Gate lists drift | one stable registry plus invariant tests |
| Engine becomes story-only | Development Experience root and presentation-neutral nodes |
| Hidden answer key | action choices, tags hidden, multi-reasonable-choice review |
| Effects become scores | qualitative authored consequences; no numeric public model |
| Completion implies mastery | separate participation/evidence/projection domains |
| Child privacy leakage | strict child projection allowlist and ownership tests |
| Published content changes | hashes, immutable releases, session pinning |
| V1 regression | separate folder/router/flags and flags-off characterization tests |
| Audio blocks access | visible text parity and provider-independent fallback |
| Infinite/repetitive graph | bounded cycles/depth and deterministic validation |
| Body content invented | unresolved provenance status and publication gate |

## 52. Final Architecture Recommendation

Adopt an adjacent `gates-v2/` Development Experience architecture consisting of one stable Gate registry, provenance-rich immutable content releases, a small typed graph, pure deterministic reducer, append-only participation events, strict child and parent projections, separate evidence/development projections, V1 compatibility adapters, and an independent media boundary.

This structure fits the repository’s CommonJS/Express/PostgreSQL style while borrowing proven schema/manifest and voice-fallback patterns. It preserves V1 and prevents stories, games, assessments, or progress counters from becoming the philosophy’s accidental source of truth.

## 53. Go / No-Go Recommendation for Beginning Engine Implementation

### CONDITIONAL GO

Begin only after owner approval of stable Gate IDs, governance roles, unresolved Body representation, consent/retention defaults, and child identity ownership. The next Codex task should be:

> Add only `gates-v2/content/schemas/`, `gates-v2/content/fixtures/example-only/`, `gates-v2/validation/validateContentRelease.js`, and deterministic `node:test` suites for registry, schema, graph, provenance, safety-language, and child-projection invariants, all behind no runtime import and with no database, route, or V1 changes.

That task is narrow, testable, reversible, and does not author production content.

## 54. Repository Changes Made During This Task

- Created `docs/YOUTH_RITE_OF_PASSAGE_CANONICAL_DEVELOPMENT_ENGINE_ARCHITECTURE.md`.
- No production code, route, migration, authentication, V1 content, test, data, or manuscript file was modified.

## 55. Validation Performed

Validation commands and results:

- `git diff --check` — passed.
- `rg -n '^## [0-9]+\.' docs/YOUTH_RITE_OF_PASSAGE_CANONICAL_DEVELOPMENT_ENGINE_ARCHITECTURE.md` plus a count assertion — passed with all 56 exact numbered headings.
- `rg -c '^```' docs/YOUTH_RITE_OF_PASSAGE_CANONICAL_DEVELOPMENT_ENGINE_ARCHITECTURE.md` plus an even-count assertion — passed with 44 fence delimiters.
- `node --test tests/gates/*.test.js tests/integration/development-pattern-engine.test.js tests/integration/identity-bridge-ownership.test.js tests/integration/integrated-child-profile.test.js` — 103 tests executed: 101 passed and 2 failed. The failures are existing runtime-contract assertions in `gatequest-prototype-ui-integration.test.js` (“gatequest prototype launch links and sandbox wrapper are present”) and `gates-gamehub-tracking-readiness-guardrails.test.js` (“gates/gamehub integration remains planning-only with tracking disabled”). This documentation-only task did not modify the runtime files asserted by either test.

## 56. Final Commit and Handoff

- Repository document: `docs/YOUTH_RITE_OF_PASSAGE_CANONICAL_DEVELOPMENT_ENGINE_ARCHITECTURE.md`.
- Branch: `work`.
- Starting commit: `7ecc23616e6d68ad04acc4c8cc46351623b6e483`.
- Ending commit: supplied in the final response because a Git commit cannot contain its own final SHA without changing that SHA.
- Files created: this architecture document only.
- Files modified: none.
- Authoritative artifact: this repository Markdown document.
