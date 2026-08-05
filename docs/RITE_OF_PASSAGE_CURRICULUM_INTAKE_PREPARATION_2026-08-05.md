# The Rite of Passage — Curriculum Intake Preparation Report

Date: 2026-08-05  
Status: Architecture and curriculum-intake preparation only  
Implementation posture: no runtime product functionality, live UI redesign, API mounting, production content modification, legacy deletion, or database migration has been performed.

## 1. Executive summary

The repository already contains useful foundations for The Rite of Passage, but the finished product should be aligned around one canonical journey engine rather than a disconnected second system. The recommended direction is:

- Treat **Gates V2** as the canonical journey and progression engine for structured Gate definitions, approved content releases, child journey sessions, deterministic story progression, reflections, affirmations, practices, observation state, passage readiness, Recognition, Gate completion, and sequential advancement.
- Preserve the legacy Gates system for parent/Keeper accounts, child profiles, parent-observation assessments, Growth Gate recommendations, integrated identity/developmental views, developmental timeline, safe parent-facing observations, and optional educational links.
- Keep Adaptive Learning, GameHub, Brain Games, and similar activities in a clearly separated optional support area. They can support practice, but must not score a Gate, diagnose a child, determine passage readiness, certify Recognition, or automatically unlock another Gate.
- Prepare intake folders and naming rules that preserve raw curriculum packages unchanged, create editorial findings separately, and only promote reviewed/approved structured content into Gates V2 release manifests.
- Model The Rite of Passage as sequential passage through the immutable Ten-Gate order: Attention, Emotion, Choice, Body, Discipline, Truth, Repair, Creation, Community, Legacy.
- Use **Recognition**, not graduation. The Keeper and community recognize emerging embodiment; the child does not self-approve passage.

This report is ready for copy/paste use as the curriculum intake and architecture alignment plan.

## 2. Confirmed current architecture

The current system has two overlapping layers:

1. **Legacy Gates parent flow**: an Express router and browser SPA for parent account access, child profiles, parent observation assessment, results, Gate details, manual practice progress, recommendations, child reflection prototypes, timeline, identity/developmental preview, GameHub links, and Adaptive Learning links.
2. **Gates V2 child experience foundation**: canonical Gate registry, content schemas, validation, reducer, transition logic, replay, completion, projections, release/persistence/service foundations, example-only fixtures, an in-memory Emotion K–1 adapter, and a mounted standalone child demo.

Current mounted page routes include the legacy `/gates` SPA routes and the `/gates-v2-child` demo route. The private V2 API contract exists in code, but is not mounted in the server entrypoint.

Current persistent legacy data includes parent profiles, child profiles, assessments, progress, recommendations, practice logs, story/guidance placeholder tables, and the development timeline. Current V2 persistence migrations define content releases, experience sessions, experience events, and idempotency records, but the mounted V2 child demo does not use those tables yet.

## 3. Reusable legacy components

The following legacy components should be preserved and integrated as supporting systems:

- **Parent/Keeper authentication and ownership**: existing Gates auth/session handling and child ownership checks remain valuable for Keeper-controlled access.
- **Child profile records**: existing child profiles can anchor the Rite journey, though future schema additions should avoid packing structured profile data into display-name fields.
- **Parent-observation assessment**: the current assessment is useful as an observation source and Growth Gate signal, but it must not automatically pass, lock, unlock, score, or certify a Rite Gate.
- **Growth Gate recommendations**: recommendation generation can remain as family guidance, clearly separated from formal sequential Gate advancement.
- **Integrated identity/developmental views**: existing identity/developmental composition can help Keepers understand the child context without exposing private/internal state to the child.
- **Developmental timeline**: the timeline is reusable as a cross-system event feed for assessment completion, journey start, observation entries, Recognition, and next-Gate opening.
- **GameHub and Adaptive Learning links**: these can become optional practice supports, not Rite scoring inputs.
- **Safety language**: existing non-diagnostic disclaimers and child-safe wording patterns should be retained.

## 4. Reusable Gates V2 components

The following Gates V2 components should become the canonical foundation:

- **Canonical Ten-Gate registry**: immutable order and stable Gate identifiers for Attention through Legacy.
- **Content schemas**: gate definitions and development experiences already expect structured fields rather than one large content blob.
- **Validation/provenance**: validators and source provenance fields support reviewable curriculum intake and safe promotion.
- **Reducer and transition engine**: deterministic graph progression should drive story chapters, reflection screens, practice screens, and completion nodes.
- **Replay and completion logic**: existing replay/completion behavior should be preserved and extended rather than replaced.
- **Projection model**: projections should remain the boundary for child-safe UI state, withholding Keeper-only and internal fields.
- **Content release persistence**: content release manifests and immutability checks are appropriate for approved curriculum versions.
- **Session/event/idempotency persistence**: V2 sessions, append-only events, and idempotency records are the right direction for durable child journeys.
- **Service layer**: the V2 service can coordinate releases, sessions, feature policy, actions, status changes, replay, and projections once mounted intentionally.
- **Narration hooks**: existing narration variant/session fields and media manifest concepts should be expanded for production narration.

## 5. Components that should remain separate

These systems should stay connected but separate from canonical passage decisions:

- **Parent-observation assessment**: observation source only; never a formal Gate pass/fail mechanism.
- **Adaptive Learning**: school-skill practice and growth snapshots; not the Rite itself.
- **GameHub and Brain Games**: optional supporting practice; no Gate scoring, diagnosis, passage readiness, Recognition certification, or auto-unlock.
- **Integrated identity/developmental preview**: useful Keeper context; not child-facing journey state.
- **Internal analytics/instrumentation**: may help operations; must not be exposed as child progress or Keeper-ready evidence without explicit product approval.
- **Raw curriculum source storage**: raw supplied documents must remain immutable and separate from edited, approved, and published structured content.

## 6. Components that appear obsolete

Nothing should be deleted in this preparation phase. However, the following appear likely to become obsolete or renamed after owner approval:

- User-facing legacy product names and page copy that do not match **The Rite of Passage**, **One Path. Ten Gates.**, **The Ten Gates Handbook**, **The Ten Declarations of Becoming**, and **Recognition**.
- One-off child reflection prototypes for Gates 1–3 once replaced by structured One Path. Ten Gates. child journey nodes.
- The in-memory V2 demo adapter as a production path once persisted V2 sessions are mounted.
- Manual percentage-based Gate progress as the primary passage model; it may survive as a display aid only if decoupled from formal advancement.
- Example-only Emotion K–1 content and placeholder CSS/emoji art as production content.
- Any UI that presents optional games or assessments as if they are part of formal passage advancement.

## 7. Recommended canonical architecture

The canonical architecture should layer current systems as follows:

1. **Identity and ownership layer**
   - Reuse legacy Gates parent/Keeper authentication and child ownership checks.
   - Add role concepts as needed for parent, guardian, teacher, mentor, and authorized Keeper.

2. **Rite journey layer**
   - New durable journey records reference the child, active Gate, current state, opened Gates, recognized Gates, and current Keeper-controlled transition permissions.
   - Every child begins formal sequence at Gate One: Attention.

3. **Gates V2 content/release layer**
   - Raw curriculum is ingested unchanged.
   - Editorial findings are written separately.
   - Approved structured Gate definitions, experiences, declarations, narration manifests, and Keeper dashboard content are bundled into V2 content releases.

4. **Gates V2 progression layer**
   - Deterministic reducer transitions handle content consumption, story position, reflection/practice nodes, replay, completion, pause, and return.
   - Extension points add journey state, affirmation practice, observation windows, readiness, Recognition, and next-Gate opening.

5. **Keeper dashboard layer**
   - The Ten Gates Handbook becomes progressive, interactive sections for the current Gate.
   - Keeper-only evidence, readiness decisions, private notes, and approvals remain invisible to the child.

6. **Child dashboard layer**
   - One Path. Ten Gates. shows only child-safe journey state: current Gate, story progress, affirmation, Read-to-Me, declarations, reset, reflection, journal, practice, journey map, recognized Gates, symbol, and next action.

7. **Support tools layer**
   - Adaptive Learning, GameHub, and Brain Games move into an optional support area with clear boundaries.

8. **Timeline/projection layer**
   - Developmental timeline records meaningful Keeper and journey events.
   - Child/Keeper/API projections enforce privacy and role boundaries.

## 8. Recommended journey-state model

The journey state should not collapse passage into one completion percentage. Use explicit state transitions that distinguish content, practice, evidence, readiness, Recognition, and next-Gate opening.

Recommended Gate status values:

| State | Meaning | Who can move it forward |
| --- | --- | --- |
| `not_started` | Gate has not been opened. | Keeper/system sequence rules |
| `opened` | Keeper has opened the Gate for the child. | Keeper |
| `exploring` | Child is consuming Gate introduction/story/affirmation content. | Child through V2 actions |
| `practicing` | Child/family is practicing the Gate through everyday/family practices. | Child/Keeper evidence |
| `stage_one` | Awareness evidence is present. | Keeper observation |
| `stage_two` | Understanding or supported-practice evidence is present. | Keeper observation |
| `stage_three` | Self-guidance/conscious embodiment evidence is present. | Keeper observation |
| `observation_ready` | Keeper believes Stage Three is consistent enough to begin the minimum observation window. | Keeper |
| `observation_active` | Twenty-one-day minimum observation window is underway. | Keeper/system date tracking |
| `passage_ready` | Evidence review supports readiness discussion; not an automatic pass. | Keeper decision |
| `recognition_ready` | Recognition preparation is complete and ceremony can be held. | Keeper |
| `recognized` | Recognition ceremony/record is complete for this Gate. | Keeper/community record |
| `next_gate_opened` | Next Gate has been intentionally opened. | Keeper after Recognition |
| `paused` | Journey/Gate temporarily paused. | Keeper/system |

State rules:

- A child cannot approve their own passage.
- A child cannot unlock the next Gate.
- Optional games and assessments cannot change formal status.
- Observation days do not require perfection and must not reset automatically after difficulty.
- Difficult days should be recorded as evidence of return, support, modeling, or self-correction where appropriate.
- The formal sequence remains Gate One through Gate Ten.

## 9. Recommended database/persistence additions

Do not create migrations yet. Prepare future migrations for first-class durable records such as:

| Proposed record/table | Purpose |
| --- | --- |
| `rite_journeys` | One active Rite journey per child/profile/program context, current Gate, lifecycle status, started/paused/resumed timestamps. |
| `rite_gate_statuses` | Per-child/per-Gate formal state, opened/recognized timestamps, active Keeper, state history pointer. |
| `rite_story_positions` | Current Gate chapter/node, reducer session reference, story completion, replay metadata. |
| `rite_narration_positions` | Gate/chapter narration variant, playback position, transcript version, pause/resume state. |
| `rite_affirmation_practices` | Official Gate affirmation and Ten Declarations practice records, date, child-safe completion metadata. |
| `rite_child_reflections` | Child reflection projections, mode, safety policy, retention policy, redacted/derived storage fields. |
| `rite_child_journals` | Child-safe journal entries, prompt refs, media/text mode, retention/projection rules. |
| `rite_keeper_observations` | Dated Keeper evidence, environment, observation type, private note flag, stage association. |
| `rite_stage_evidence` | Stage One/Two/Three evidence summaries linked to observations. |
| `rite_observation_windows` | Minimum 21-day observation start/end eligibility dates, evidence counts, non-streak summaries. |
| `rite_readiness_reviews` | Keeper readiness decision, indicators reviewed, concerns, support plan, decision timestamp. |
| `rite_recognitions` | Recognition preparation, ceremony date, participants, child response/vow, Keeper approval. |
| `rite_gate_symbols` | Symbol earned, Gate symbol metadata, awarded/recognized timestamp. |
| `rite_next_gate_openings` | Keeper-controlled next-Gate opening record, prior Gate Recognition reference. |
| `rite_pause_events` | Pause/return state and reason without penalizing child progress. |
| `rite_projection_audit` | Optional audit of what was projected to child/Keeper surfaces, without storing hidden content in child views. |

Existing `gates_v2_experience_sessions`, `gates_v2_experience_events`, and `gates_v2_content_releases` should be referenced rather than duplicated where possible.

## 10. Recommended content model

Do not reduce curriculum to one HTML or Markdown blob. Represent each Gate as structured content with stable IDs, source provenance, lifecycle, approval status, and projection rules.

Recommended content package families:

1. **Gate definition**
   - Gate ID, order, slug, official name, core principle, symbol, symbolism, official Gate affirmation, stage definitions, growth signs, safety notes.

2. **Child journey content: One Path. Ten Gates.**
   - Gate introduction, chapter list, story nodes, child choices where approved, reflection prompts, child-safe journal prompts, everyday practice, family practice references, child response/vow prompts, Gate symbol reveal.

3. **Keeper dashboard content: The Ten Gates Handbook**
   - Purpose, Keeper role, story summary, Big Idea, symbol meanings, conversation prompts, challenge guidance, Keeper wisdom, weekly practice, Keeper reflection, three passage stages, observation tools, passage indicators, readiness review, Recognition preparation, ceremony script, next-Gate guidance.

4. **Daily identity practice: The Ten Declarations of Becoming**
   - Official Gate affirmation, ten breath-linked declarations per Gate, closing declarations, Keeper’s Daily Reset text, transcript/narration metadata.

5. **Narration/media manifest**
   - Gate/chapter mapping, media variant, transcript, duration, voice/locale, checksum, fallback transcript, lifecycle.

6. **Release manifest**
   - Approved content references, hashes, provenance, editorial approvals, safety review, publication status.

Every content object should preserve source references back to raw package files and editorial decisions.

## 11. Recommended child dashboard structure

Prepare a persistent child-facing dashboard named **One Path. Ten Gates.** It should eventually show:

- Current Gate name, number, symbol, and child-safe purpose.
- Official Gate affirmation.
- Story progress and next story chapter/action.
- Read-to-Me narration with fallback transcript.
- Ten Declarations of Becoming for the current Gate.
- Ten-breath Keeper’s Reset, child-safe mode.
- Story reflection prompt and safe response UI.
- Child-safe journal prompt and journal entry UI.
- Current everyday/family practice prompt.
- Journey map with locked/future Gates, current Gate, and recognized Gates.
- Current symbol earned or being explored.
- Next appropriate action.

Do not expose:

- Keeper-only notes.
- Internal readiness decisions.
- Assessment scoring.
- Private provenance.
- Internal analytics.
- Hidden transitions.
- Approval metadata.
- Raw safety review information.

## 12. Recommended Keeper dashboard structure

Prepare The Ten Gates Handbook as a progressive, interactive Keeper dashboard, not a single overwhelming page. For the current Gate, the Keeper should eventually receive:

- Purpose of the Gate.
- Keeper’s role.
- Story summary.
- Symbol meanings.
- Big Idea.
- Signs of growth.
- Conversation prompts.
- Everyday practice.
- Family practice.
- Challenge guidance.
- Keeper wisdom.
- Weekly practice.
- Keeper reflection.
- Three passage stages.
- Observation tools.
- Passage indicators.
- Readiness review.
- Recognition preparation.
- Ceremony script.
- Child response/vow.
- Gate symbol record.
- Keeper approval.
- Control to open the next Gate after Recognition.

Recommended progressive sections:

1. **Prepare**: purpose, role, Big Idea, story summary, symbol meanings.
2. **Practice**: conversation prompts, everyday practice, family practice, challenge guidance, weekly practice.
3. **Observe**: signs of growth, three stages, observation tools, dated evidence.
4. **Review**: passage indicators, twenty-one-day observation summary, readiness decision.
5. **Recognize**: preparation, ceremony script, child response/vow, symbol, Keeper approval.
6. **Open**: next-Gate opening after Recognition.

## 13. Recommended narration architecture

Preserve browser speech synthesis as a safe fallback. Prepare production narration without generating or publishing audio in this phase.

Recommended architecture:

- Add narration variants to content manifests with locale, voice, version, duration, checksum, and lifecycle.
- Map audio files to Gate, chapter, section, node, transcript, and declaration IDs.
- Store playback position per child/session in a durable narration-position record.
- Support pause, resume, replay, and restart without changing formal Gate status.
- Always provide readable transcript text.
- If production audio is unavailable, fall back to transcript and browser speech synthesis.
- Do not store raw child voice by default.
- Keep narration approval separate from manuscript approval.

## 14. Recommended journal/reflection safety model

Raw child reflection, journal, and voice content require explicit safety, privacy, retention, and projection rules.

Recommended policy:

- Default to storing derived, child-safe summaries rather than raw child speech.
- Store raw text only when the product owner has approved retention, parent/Keeper visibility, deletion, export, and safety-review rules.
- Do not store raw voice by default; prefer no raw voice storage unless explicitly approved.
- Attach every reflection/journal prompt to content version, Gate, chapter/node, child ID, and journey ID.
- Use separate fields for raw input, redacted text, derived summary, safety flags, Keeper-visible projection, and child-visible projection.
- Never expose private Keeper notes to the child.
- Never use child reflection text as an automated pass/fail scorer.
- Allow Keeper review and deletion/withholding where needed.
- Preserve auditability without over-collecting sensitive child content.

## 15. Recommended observation and readiness model

The twenty-one-day observation model begins after the Keeper sees consistent Stage Three practice. It is a minimum observation window, not a perfection streak.

Supported dated evidence types should include:

- `noticed_independently`
- `practiced_with_support`
- `child_self_corrected`
- `child_returned_after_difficulty`
- `keeper_modeled_practice`
- `observed_in_new_environment`
- `private_keeper_note`

Recommended readiness behavior:

- Evidence can be summarized by Gate, stage, date range, environment, and pattern.
- Missed days, difficult days, or supported days do not reset the window automatically.
- The system can indicate when minimum dates and evidence coverage are present, but must not declare passage automatically.
- Keeper readiness review should capture indicators considered, supporting observations, concerns, support plan, and intentional decision.
- Readiness is not a grade, diagnosis, clinical milestone, or automated score.

## 16. Recommended Recognition and unlock workflow

Use **Recognition**, not graduation.

Recommended workflow:

1. Gate is opened by an authorized Keeper.
2. Child explores Gate introduction, affirmation, story, declarations, reset, reflection, journal, and practices.
3. Keeper records Stage One, Stage Two, and Stage Three evidence over time.
4. Keeper starts the minimum twenty-one-day observation window once Stage Three is consistently visible.
5. Keeper records dated evidence during the window without perfection-streak resets.
6. Keeper conducts readiness review.
7. If ready, Keeper prepares Recognition.
8. Keeper/community holds Recognition ceremony.
9. Child response or vow is recorded using safe retention rules.
10. Gate symbol is recorded as earned/recognized.
11. Keeper approval is recorded.
12. Only after Recognition may the Keeper open the next Gate.

Important boundaries:

- The child cannot approve their own passage.
- The system cannot auto-recognize a Gate from games, assessment results, or content completion alone.
- Optional games and parent observation assessments cannot unlock the next Gate.
- Future Gates remain sequential and Keeper-controlled.

## 17. Migration strategy from current state

Recommended migration path without deleting useful foundations:

1. **Preparation phase**
   - Add intake folder conventions and architecture documentation only.
   - Do not mount private V2 APIs or create migrations yet.

2. **Curriculum intake phase**
   - Place raw curriculum packages in immutable raw-source folders.
   - Create editorial findings reports for inconsistencies, old names, duplicates, transitions, mismatches, and missing content.

3. **Canonical modeling phase**
   - Convert approved source into structured draft Gate definitions, child journey content, Keeper dashboard content, declarations, and narration manifests.
   - Preserve source provenance for every content object.

4. **Persistence design phase**
   - Draft migrations for journeys, Gate statuses, observations, journals, Recognition, narration positions, and next-Gate openings.
   - Review with owner before applying.

5. **V2 service integration phase**
   - Mount private V2 APIs only after auth/ownership, feature flags, persistence, idempotency, projections, and tests are ready.

6. **Dashboard phase**
   - Build One Path. Ten Gates. child dashboard and The Ten Gates Handbook Keeper dashboard using projections.

7. **Support tools separation phase**
   - Reorganize GameHub/Adaptive Learning into optional support area with no passage authority.

8. **Pilot release phase**
   - Publish approved V2 content release and migrate/seed initial journeys for existing children where appropriate.

## 18. Protected boundaries and no-regression requirements

Protect these boundaries throughout implementation:

- Do not delete or rewrite useful Gates V2 reducer, validation, projection, replay, completion, provenance, release, service, or persistence foundations.
- Do not make legacy assessment scores determine passage readiness, Recognition, or next-Gate unlocking.
- Do not let optional educational tools score or certify the Rite.
- Do not expose Keeper-only notes or internal readiness metadata to child surfaces.
- Do not store raw child voice or reflection content without explicit safety/retention approval.
- Do not overwrite raw curriculum packages.
- Do not silently rewrite philosophy or rename source content without editorial tracking.
- Do not reduce the curriculum to one large Markdown/HTML blob.
- Do not create migrations until the owner approves the persistence proposal.
- Do not mount unfinished APIs.
- Do not use graduation language for Gate completion.
- Do not allow the child to unlock the next Gate.
- Preserve non-diagnostic, non-clinical, non-grade language.

## 19. Proposed implementation phases

### Phase 0 — Current preparation pass

- Produce this architecture and intake preparation report.
- Confirm readiness to receive the three curriculum packages.
- No product functionality implemented.

### Phase 1 — Raw curriculum intake

- Store raw packages unchanged.
- Create checksums and source inventory.
- Create editorial findings report.
- Identify old names, duplicate headings, inconsistent chapter numbers, incomplete transitions, repeated passages, mismatched Gate references, and missing sections.

### Phase 2 — Canonical content design

- Propose structured schemas for child story, Keeper handbook sections, declarations, narration manifest, stage evidence, and Recognition content.
- Map package content into draft structured records.
- Preserve original source references.

### Phase 3 — Persistence proposal review

- Draft migration plan for journey state and durable records.
- Review table names, privacy model, retention policy, and projection rules with owner before migration creation.

### Phase 4 — Gates V2 journey integration

- Extend V2 service/reducer contracts as needed for formal Gate journey state.
- Add tests for sequential advancement, Keeper approval, non-automatic readiness, and no optional-tool scoring.

### Phase 5 — Child dashboard

- Implement One Path. Ten Gates. dashboard projections and UI.
- Add story, narration fallback, declarations, reset, reflection, journal, practice, map, symbols, and next action.

### Phase 6 — Keeper dashboard

- Transform The Ten Gates Handbook into progressive Keeper dashboard sections.
- Add observations, stage evidence, readiness review, Recognition, approval, and next-Gate opening.

### Phase 7 — Narration and media

- Add approved narration manifests, playback position, transcripts, fallback behavior, and tests.
- Do not publish generated audio without owner approval.

### Phase 8 — Pilot hardening

- Add migration/backfill paths, QA reports, privacy review, safety language checks, and release readiness review.

## 20. Exact files or folders for incoming curriculum packages

Place incoming raw curriculum packages under a dedicated raw intake root. Recommended exact folders:

```text
curriculum-framework/rite-of-passage/source/raw/one-path-ten-gates/
curriculum-framework/rite-of-passage/source/raw/ten-gates-handbook/
curriculum-framework/rite-of-passage/source/raw/ten-declarations-of-becoming/
```

Recommended adjacent working folders:

```text
curriculum-framework/rite-of-passage/source/inventory/
curriculum-framework/rite-of-passage/source/editorial-findings/
curriculum-framework/rite-of-passage/source/edited/
curriculum-framework/rite-of-passage/source/canonical-draft/
curriculum-framework/rite-of-passage/source/approved/
curriculum-framework/rite-of-passage/source/published/
```

Recommended structured Gates V2 destination folders after approval:

```text
gates-v2/content/drafts/rite-of-passage/
gates-v2/content/drafts/rite-of-passage/gate-definitions/
gates-v2/content/drafts/rite-of-passage/child-experiences/
gates-v2/content/drafts/rite-of-passage/keeper-handbook/
gates-v2/content/drafts/rite-of-passage/declarations/
gates-v2/content/drafts/rite-of-passage/narration-manifests/
gates-v2/content/approved/rite-of-passage/
gates-v2/content/releases/rite-of-passage/
```

Raw source folders are for original supplied material only. Gates V2 draft/approved/release folders are for structured content derived from raw material after editorial review.

## 21. Exact naming rules for raw, edited, approved, and published curriculum

### Raw source naming

Raw files must never be overwritten. Use:

```text
<package-slug>.raw.<source-date-or-received-date>.v<package-version>.<ext>
```

Examples:

```text
one-path-ten-gates.raw.2026-08-05.v1.md
ten-gates-handbook.raw.2026-08-05.v1.md
ten-declarations-of-becoming.raw.2026-08-05.v1.md
```

If the owner supplies multiple files, preserve their original filenames inside a received batch folder:

```text
curriculum-framework/rite-of-passage/source/raw/one-path-ten-gates/received-2026-08-05-v1/original-filename.ext
```

### Inventory naming

```text
curriculum-framework/rite-of-passage/source/inventory/received-2026-08-05-v1.inventory.md
curriculum-framework/rite-of-passage/source/inventory/received-2026-08-05-v1.checksums.json
```

### Editorial findings naming

```text
curriculum-framework/rite-of-passage/source/editorial-findings/one-path-ten-gates.editorial-findings.2026-08-05.v1.md
curriculum-framework/rite-of-passage/source/editorial-findings/ten-gates-handbook.editorial-findings.2026-08-05.v1.md
curriculum-framework/rite-of-passage/source/editorial-findings/ten-declarations-of-becoming.editorial-findings.2026-08-05.v1.md
```

### Edited working copy naming

Edited files are proposals, not canonical truth:

```text
<package-slug>.edited-proposal.<date>.v<n>.md
```

### Canonical draft structured content naming

Structured drafts should be JSON and Gate-scoped where possible:

```text
gate-01-attention.definition.draft.v1.json
gate-01-attention.child-experience.draft.v1.json
gate-01-attention.keeper-handbook.draft.v1.json
gate-01-attention.declarations.draft.v1.json
gate-01-attention.narration-manifest.draft.v1.json
```

Repeat for Gate 02 through Gate 10 using immutable order.

### Approved content naming

Approved structured content should include approval status and version:

```text
gate-01-attention.definition.approved.v1.json
gate-01-attention.child-experience.approved.v1.json
gate-01-attention.keeper-handbook.approved.v1.json
gate-01-attention.declarations.approved.v1.json
```

### Published release naming

Published release manifests should use release identifiers:

```text
gates-v2/content/releases/rite-of-passage/rite-of-passage.release.2026-08-05.v1.manifest.json
```

Published release content must be immutable after publication except through a new release or safety withdrawal process.

## 22. Risks, unknowns, and decisions requiring owner approval

Risks and unknowns:

- Incoming curriculum may contain inconsistent chapter numbers, repeated passages, old names, incomplete transitions, duplicate headings, mismatched Gate references, or editorial errors.
- Exact Gate-specific Three Stages of Passage names and evidence criteria are not yet available.
- Raw child reflection/journal retention policy needs explicit owner approval.
- Raw child voice storage should default to off unless owner approves otherwise.
- The intended role model for teacher, mentor, guardian, parent, and Keeper permissions needs confirmation.
- Existing legacy child profile schema stores JSON in `first_name`; future normalization requires careful migration design.
- V2 private API is defined but unmounted; route-mount timing must wait for persistence, ownership, projections, and tests.
- Narration production workflow needs approval for voices, hosting, transcripts, media checksums, and fallback behavior.
- Current UI naming and course-like interactions need product redesign later, but should not be changed before content intake.
- Existing users/children may need backfill into `rite_journeys`; backfill rules require owner approval.

Decisions requiring owner approval:

1. Final table names and migration boundaries for `rite_*` records.
2. Whether journeys are one per child forever, one per program version, or one per content release.
3. Keeper role hierarchy and who can approve Recognition/open next Gate.
4. Reflection/journal/voice retention defaults.
5. Whether any raw child text is visible to Keeper by default.
6. Whether parent observation assessment can suggest where to focus while the formal sequence still starts at Attention.
7. Release approval workflow for canonical content.
8. Narration provider, voice variants, storage location, and approval workflow.
9. Whether percentage progress should be removed from Rite surfaces or retained only in legacy/support contexts.
10. How existing legacy Gates users should be invited into the new sequential Rite journey.

## 23. Final readiness decision for receiving the curriculum

The repository is ready to receive the three curriculum packages as raw source material under the proposed intake folders, with the following protections:

- Raw source will be preserved unchanged.
- Editorial findings will be reported separately.
- Canonical structured content will be proposed separately.
- No incoming manuscript will be treated as production-approved merely because it has been supplied.
- No production functionality, migrations, mounted APIs, or UI redesign should begin until after intake review and owner approval.

Owner-facing confirmation:

I am ready to receive:

- **One Path. Ten Gates.**
- **The Ten Gates Handbook**
- **The Ten Declarations of Becoming**

**READY FOR THE THREE CURRICULUM PACKAGES.**
