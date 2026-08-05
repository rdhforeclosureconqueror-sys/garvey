# Rite of Passage Engine Architecture Audit — 2026-08-05

## Scope and implementation freeze

This report documents the current Rite of Passage / Gates implementation before any new curriculum functionality is added. It is an audit only: no curriculum package integration, naming migration, route changes, UI changes, persistence changes, or new unlock behavior were implemented.

The current repo uses a mix of legacy naming (`The Gates`, `Youth Rite of Passage`, `Gates V2`) and example-only child content. Future implementation should rename and reorganize the experience as:

- Overall system: **The Rite of Passage**
- Child experience: **One Path. Ten Gates.**
- Parent experience: **The Ten Gates Handbook**

No references to the retired curriculum name were introduced in this audit.

## High-level architecture

The system currently has two overlapping layers:

1. **Legacy Gates parent flow**: an Express router plus single-page browser app for parent signup/sign-in, child profiles, parent observation assessment, results, gate details, progress updates, practice-game recommendations, prototype child reflections, and development timeline.
2. **Gates V2 child experience engine**: a contract-driven reducer, content schemas, example content release fixtures, in-memory demo adapter, standalone child UI, and incomplete/private API contract files for future persisted sessions.

The production-mounted routes are the legacy Gates router and the standalone V2 child demo router. The private V2 API contract exists in code and tests, but is not mounted by `server/index.js`.

## Existing routes

### Page routes

The legacy Gates router sends the same SPA shell for these paths:

- `GET /gates`
- `GET /gates/signup`
- `GET /gates/dashboard`
- `GET /gates/children`
- `GET /gates/assessment`
- `GET /gates/results/:assessmentId`
- `GET /gates/child/:childId/gates`
- `GET /gates/child/:childId/gates/:gateNumber`
- `GET /gates/child/:childId/reflection/:gateNumber`
- `GET /gates/prototypes/gatequest`
- `GET /gates/child/:childId/prototypes/gatequest`

The V2 child demo router is mounted at `app.use('/gates-v2-child', createGatesV2ChildRouter())` and serves:

- `GET /gates-v2-child/`
- `GET /gates-v2-child/emotion-k1.html`
- `GET /gates-v2-child/emotion-k1.css`
- `GET /gates-v2-child/emotion-k1.js`

### Public/parent APIs

The legacy Gates API currently includes:

- `GET /api/gates/health`
- `GET /api/gates/catalog`
- `GET /api/gates/habit-bank`
- `GET /api/gates/prototypes/gatequest/public-launch`
- `GET /api/gates/children/:childId/prototypes/gatequest/launch`
- `GET /api/gates/assessment/questions`
- `POST /api/gates/auth/signup`
- `POST /api/gates/auth/signin`
- `POST /api/gates/auth/signout`
- `GET /api/gates/auth/session`
- `GET /api/gates/children`
- `POST /api/gates/children`
- `GET /api/gates/canonical-learners`
- `GET /api/gates/children/:childId/profile`
- `GET /api/gates/children/:childId/reflection/:gateNumber/prototype`
- `POST /api/gates/assessment/submit`
- `GET /api/gates/assessment/:assessmentId`
- `GET /api/gates/children/:childId/progress`
- `POST /api/gates/children/:childId/progress`
- `GET /api/gates/children/:childId/recommendations`
- `GET /api/gates/children/:childId/timeline`
- `GET /api/gates/children/:childId/integrated-profile`
- `GET /api/gates/children/:childId/habit-bank`
- `GET /api/gates/children/:childId/gates/:gateNumber`

### V2 child demo APIs

The mounted standalone V2 demo API includes:

- `POST /gates-v2-child/api/start`
- `GET /gates-v2-child/api/session/:id`
- `POST /gates-v2-child/api/session/:id/action`
- `POST /gates-v2-child/api/session/:id/replay`
- `POST /gates-v2-child/api/session/:id/restart`
- `POST /gates-v2-child/api/session/:id/exit`

### V2 private API contract, not mounted

`server/gatesV2PrivateContract.js` defines the intended private API surface:

- `GET /api/gates/v2/children/:childId/experiences`
- `POST /api/gates/v2/children/:childId/sessions`
- `GET /api/gates/v2/children/:childId/sessions/:sessionId`
- `POST /api/gates/v2/children/:childId/sessions/:sessionId/actions`
- `POST /api/gates/v2/children/:childId/sessions/:sessionId/pause`
- `POST /api/gates/v2/children/:childId/sessions/:sessionId/abandon`
- `POST /api/gates/v2/children/:childId/sessions/:sessionId/replay`

Handlers for these operations exist, but there is no route mount in `server/index.js`.

## Existing pages and UI

### Legacy parent SPA

The legacy parent shell is `public/gates.html`, loaded by all `/gates...` routes. The browser application is `public/gates.js` and renders these views client-side:

- Landing page with 10 Gates overview, assessment CTA, parent sign-in CTA, GameHub CTA, and GateQuest prototype CTA.
- Parent account access page with create-account and sign-in forms.
- Child profiles page with child creation form, child cards, and Adaptive Learning card.
- Parent observation assessment page with 20 radio-question fields.
- Results/current profile page showing stage summary, strongest Gates, Growth Gate, Gate stages, Walking the Gate, child reflection CTA, V2 child adventure card, Practice Progress, GameHub practice links, Development Journey, Development Timeline, and Integrated Profile Preview.
- Gate progress map page showing all gates, status/progress, habit markers, family practices, identity statements, current focus badges, and entry to gate details.
- Gate detail page showing blueprint content, stage, practice progress, reflection questions, journal prompts, developing/integration signs, parent guidance, ceremony, optional child reflection CTA, mapped GameHub practice games, and progress update form.
- Child reflection prototype page for Gates 1–3.
- GateQuest prototype page in an iframe.

The UI is functional but course-like/admin-like in several places: assessment forms, progress percentage buttons/forms, lists of recommendations, and standalone practice cards. It does not yet fully embody the requested “living Rite of Passage” interaction model.

### V2 child demo UI

The mounted child experience UI is an Emotion K–1 example adventure. It uses:

- Storybook-style card layout with CSS/emoji placeholder art.
- Progress label/bar states: Beginning, Noticing, Choosing, Reflecting, Complete.
- Choice buttons and a breathing animation for practice nodes.
- Browser speech synthesis buttons labeled “Read to Me” / “Read this screen.”
- Calm/low-stimulation view toggle.
- Exit summary dialog for parent/family handoff.

The V2 child UI explicitly labels itself as example-only and not official curriculum.

## Existing database models

### Legacy Gates tables

`server/gatesDb.js` initializes these legacy tables:

- `gates_schema_migrations`
- `gates_parent_profiles`
- `gates_child_profiles`
- `gates_assessments`
- `gates_progress`
- `gates_practice_recommendations`
- `gates_practice_logs`
- `gates_story_content`
- `gates_guidance_messages`
- `gates_development_timeline`

Important data patterns:

- Parent accounts are stored in `gates_parent_profiles`; authentication sessions use the shared `auth_sessions` table.
- Child profile display data is packed into `gates_child_profiles.first_name` as JSON by `buildStoredChildProfile`.
- Parent observation results are stored as a JSON payload in `gates_assessments.payload`.
- Practice progress is stored by `(parent_id, child_id, progress_key)` with JSON `progress_value`.
- Practice logs and recommendations are JSON payload tables.
- Development timeline entries are append-like records keyed by deterministic `timeline_event_id`.

### Gates V2 tables

The V2 persistence migrations define:

- `gates_v2_content_releases`: immutable published content release manifests and approval bundles.
- `gates_v2_experience_sessions`: persisted child experience session state with owner, child, gate, release, version, feature/narration variants, revision, and status.
- `gates_v2_experience_events`: append-only event log with session sequence and idempotency key.
- `gates_v2_idempotency_records`: request hash / response cache for mutation idempotency.

The V2 persistence layer has in-memory repositories and Postgres repositories, but the mounted child demo currently uses an in-memory adapter rather than these database tables.

## Existing progression logic

### Legacy progression

Legacy progression is assessment-led:

1. Parent creates/signs into an account.
2. Parent creates/selects a child profile.
3. Parent completes a 20-question observation assessment.
4. `scoreGatesAssessment` validates answers, scores two questions per Gate, normalizes each Gate score, assigns current stage, selects strongest Gates, and identifies the lowest normalized Gate as the Growth Gate.
5. `buildGatesProfile` combines scores with the first-generation blueprint to produce summaries, reflection focus, journal prompt, observation focus, practice suggestion, ceremony readiness hint, and the gate map.
6. `POST /api/gates/assessment/submit` stores the assessment, records timeline events, and initializes all ten `gates_progress` rows at `not_started` and `0%`.
7. Parent can manually update Gate progress by status and percentage; updates write `gates_progress`, `gates_practice_logs`, and a timeline event.

There is no full automatic Gate unlock, 21-day passage, readiness, or ceremony completion state machine in the legacy layer.

### V2 progression

V2 progression is reducer-led:

- `START_EXPERIENCE` initializes session state at the content graph entry node.
- `VIEW_NODE` moves from content nodes with a `next` edge.
- `SELECT_CHOICE` is valid for `choice` and `notice` nodes.
- `COMPLETE_PRACTICE` is valid for `practice` nodes.
- `COMPLETE_REFLECTION` is valid for `reflection` nodes.
- Transitions append node history and action-specific completion arrays.
- Approved completion nodes mark the session `completed`.
- Replay/restart reset choice/practice/reflection arrays, increment replay count, and preserve completion history.

V2 has no mounted production persistence path yet, and the demo’s in-memory sessions disappear on server restart.

## Parent dashboard

The current parent dashboard is the `/gates` SPA after authentication, especially `/gates/children`, `/gates/results/:assessmentId`, `/gates/child/:childId/gates`, and `/gates/child/:childId/gates/:gateNumber`.

Current parent capabilities:

- Sign up, sign in, sign out.
- Create and select child profiles.
- Complete parent observation assessment.
- View Current Gates Profile and Gate stages.
- See Growth Gate and strongest Gates.
- Read Walking the Gate prompts: reflection, journal, observation focus, family practice, and ceremony hint.
- Manually update Practice Progress.
- View progress map and detail pages for each Gate.
- See habit markers, integration signals, self-correction signals, family practices, parent mirror prompts, and identity statements.
- Launch optional GameHub practice games.
- Launch GateQuest prototype.
- Open child reflection prototypes for Gates 1–3.
- View development timeline and integrated profile preview.

Gap against **The Ten Gates Handbook**: the handbook does not yet exist as an interactive, Gate-by-Gate parent dashboard with Story, Audio Narration, Reflection, Journal, Conversation Prompts, Everyday Practice, Family Practice, Daily Affirmations, Observation Tracking, 21-Day Passage, Passage Readiness, Ceremony, and Unlock Next Gate sections for every Gate.

## Child dashboard / child experience

There is no persistent child dashboard for the full Rite of Passage. Existing child-facing surfaces are:

- Optional child reflection prototypes for Gates 1–3 under the legacy parent flow.
- V2 standalone Emotion K–1 child adventure under `/gates-v2-child/`.
- GameHub practice games launched from parent pages.

Gap against **One Path. Ten Gates.**: there is no unified child journey dashboard across all ten Gates, no saved child journey state, no canonical story/narration/affirmation/reflection/journal sequence for all Gates, and no child-facing Gate progression map tied to passage readiness.

## Assessments

The assessment implementation is parent-observation based:

- Version: `gates_parent_observation_v1`.
- Title: `Child Genius / Developmental Observation`.
- 20 questions total, two per Gate.
- Options: Rarely, Sometimes, Often, Consistently.
- Non-diagnostic disclaimer is returned and rendered.
- Server validates option values, prevents duplicate question IDs, scores normalized Gate ratios, and stores raw answers in the assessment payload.

Assessments are not currently child-facing tests, do not unlock Gates, and are not connected to V2 child adventure completion.

## Reflections

Existing reflection support appears in three forms:

1. Parent-facing blueprint reflection questions in `FIRST_GENERATION_BLUEPRINT` and the gate detail page.
2. Legacy child reflection prototypes for Gates 1–3, returned by `/api/gates/children/:childId/reflection/:gateNumber/prototype`.
3. V2 graph reflection nodes using `COMPLETE_REFLECTION`, with demo summary data derived from the in-memory session.

There is no persisted reflection journal model for child raw reflection responses in the legacy Rite of Passage. The V2 schema has `reflection_policy`, including modes and raw voice storage restrictions, but the mounted demo does not persist raw reflection data.

## Journals

Journal support is currently content-only:

- Parent result/gate detail pages display journal prompts from the blueprint.
- V2 gate-definition schema includes `journals` as a required gate-definition field.
- Example gate definition fixture includes example journal references.

There is no journal entry table, no journal API, and no child/parent journal editor in the current implementation.

## Achievements

There is no dedicated Rite of Passage achievement/badge model or ceremony completion record. Existing milestone-like artifacts are:

- Gate stages derived from assessment.
- Practice progress status/percentage.
- Development timeline events for assessment completion, Growth Gate selection, and practice progress updates.
- V2 session completion state for the standalone adventure.

These do not yet constitute achievements tied to readiness, ceremony, or Gate unlocks.

## Unlock logic

Current unlock behavior is minimal:

- All ten Gates are displayed in the parent map after assessment/progress initialization.
- Parent can open every Gate detail route if authenticated and child-owned.
- V2 replay is limited by replay policy in the content graph engine.
- Only the Emotion Gate K–1 child adventure is marked `available`; other child adventures are rendered as coming soon.

There is no canonical Unlock Next Gate state machine, no 21-day completion criteria, no passage readiness checklist, no ceremony prerequisite, and no parent approval workflow for advancing from one Gate to the next.

## APIs and integrations

### Internal integrations

- Integrated child profile: `/api/gates/children/:childId/integrated-profile` composes Gates data with identity/developmental sources through `integration/identityGatesBridgeService`.
- GameHub: `public/gates.js` uses `GameHubRegistry` to render launchable games and Gate-mapped practice games. The UI states these do not score or diagnose Gates.
- Adaptive Learning: parent pages include an Adaptive Learning card and links to `/gamehub/adaptive-v2-hub.html` and Grade 1 pilot games.
- Development timeline: assessment and progress events are written through `gates/gatesDevelopmentTimeline.js`.

### V2 service integration

`gates-v2/service/GatesV2ExperienceService` is designed to coordinate content releases, session persistence, feature flags, transactions, pause/abandon/replay, and projections. It is not mounted as an Express route in `server/index.js`.

## AI integrations

The Rite of Passage engine does not currently call an AI model in the observed legacy or V2 child flow. The V2 demo and legacy Gates pages are deterministic, fixture/schema/reducer driven.

Potential adjacent AI/audio systems exist elsewhere in the repo, but no direct Rite of Passage runtime AI generation or scoring integration is wired into `server/gatesRoutes.js`, `server/gatesV2ChildUiRoute.js`, or the V2 reducer/service path.

## Audio and narration support

Current audio/narration support is limited:

- The V2 child demo uses browser `speechSynthesis` as “Read to Me” / “Read this screen.”
- The V2 session schema includes `narration_variant_id` on sessions.
- The V2 content schemas include media references / media manifests.
- The V2 child assets README states that current art is placeholder and production assets are not present.

There is no cached production audio narration for the Rite of Passage, no narrator voice management, no persisted audio playback state, and no Gate-wide narration system.

## Existing placeholders and unfinished functionality

Confirmed placeholders / unfinished areas:

- V2 Emotion K–1 content is explicitly example-only and non-canonical.
- Child adventure availability is hard-coded to Emotion only; all other Gates render as coming soon.
- V2 child demo sessions are in memory and not connected to parent/child authentication, V2 Postgres persistence, or the private API contract.
- Private V2 API contract and handlers exist but are not mounted.
- Legacy child reflection prototypes only cover Gates 1–3 and are prototype JSON, not full experiences.
- Journal prompts exist, but journal entries are not persisted.
- Reflection completion exists in V2 session state, but legacy reflections are not saved as a first-class model.
- Achievements, 21-Day Passage, Passage Readiness, Ceremony completion, and Unlock Next Gate are not modeled as durable state.
- Parent dashboard is not yet transformed into The Ten Gates Handbook interactive sections.
- Child dashboard is not yet One Path. Ten Gates.
- Browser speech synthesis is the only implemented narration path in the mounted child demo.
- Current UI still includes legacy naming and course/admin patterns that should be replaced during curriculum integration.

## Curriculum integration implications

When the curriculum package arrives, implementation should begin by aligning the architecture around the new naming and lived-rite product model:

1. Establish canonical content models for the required per-Gate sections: Story, Audio Narration, Reflection, Journal, Conversation Prompts, Everyday Practice, Family Practice, Daily Affirmations, Observation Tracking, 21-Day Passage, Passage Readiness, Ceremony, and Unlock Next Gate.
2. Decide whether V2 becomes the single progression engine for both child and parent experiences, or whether legacy `gates_progress` remains as parent observation tracking while V2 handles child story progression.
3. Mount or retire the private V2 API contract before relying on persisted child journeys.
4. Add first-class durable state for journal entries, observations, affirmations, 21-day passage activity, readiness decisions, ceremonies, achievements, and Gate unlocks.
5. Replace example-only Emotion content and prototype reflections with approved curriculum package content.
6. Replace legacy naming in user-facing UI once the curriculum package is ready to implement.

## Audit conclusion

The current implementation has a usable parent pilot flow and a promising V2 reducer/content foundation, but it is not yet a complete Rite of Passage system. The largest gaps are persistent child journey state, canonical all-Gate curriculum content, parent handbook interactivity, journal/reflection persistence, audio narration production support, achievements, 21-day passage/readiness/ceremony workflows, and true unlock logic.
