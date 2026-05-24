# GameHub Registry Foundation (PR5)

## Purpose
This phase introduces a single registry/index layer for GameHub so the platform has one authoritative inventory of game metadata, launch paths, and future context readiness flags.

The registry is additive and does not replace existing standalone game files.

## Registry module
- Path: `public/gamehub/gamehub-registry.js`
- Exposes:
  - `GAMEHUB_REGISTRY`
  - `listGames()`
  - `getGameByKey(gameKey)`
  - `getLaunchableGames(context)` where context is `public`, `parent`, or `child`

The module supports both browser usage (`window.GameHubRegistry`) and Node usage (`require(...)`) for tests.

## Current game inventory
Current standalone games indexed in this phase:
- `/gamehub/adaptive_learning`
- `/gamehub/braingame2`
- `/gamehub/braingames`
- `/gamehub/brickblast`
- `/gamehub/checkers`
- `/gamehub/game6`
- `/gamehub/spelling`
- `/gamehub/1stgradesightwords`
- `/gamehub/surf`

## Public vs parent vs child launch intent
Each registry entry now includes explicit booleans for:
- `public_launch_allowed`
- `parent_context_launch_allowed`
- `child_context_launch_allowed`

These booleans are metadata only in PR5. They do not yet change routing logic in Gates flows.

## Public index shell
A lightweight index shell now exists at `public/gamehub/index.html`, rendering launch links from registry metadata for public discovery.

This page does not alter or remove direct standalone game access.

## Future Gates integration path
Planned follow-up phases can use registry metadata for:
- Gate tag filtering (`supported_gate_tags`)
- Context-specific launch controls (public/parent/child)
- Config readiness checks (`config_ready`)
- Event instrumentation readiness (`tracking_ready`, currently false)

## PR6 discovery integration in Gates
- **Gates landing discovery path:** The Gates landing page now includes a public CTA, **“Explore Practice Games”**, linking to `/gamehub/index.html`.
- **Parent/profile discovery path:** The authenticated Gates profile/results flow now includes a lightweight **Practice Games** section that renders from GameHub registry metadata (via `getLaunchableGames('child'|'parent')`), plus a direct link to `/gamehub/index.html`.
- **Child-context launch readiness:** When a child profile is active, GameHub links include a non-authoritative `child_profile_hint` query parameter for future launch-context routing. No child identity is passed into game runtime logic in this phase.
- **Safety copy:** Gates surfaces include the standardized language: “These games are optional developmental practices. They are not tests, grades, or diagnoses.”
- **No-tracking status:** This phase remains discovery-only. No tracking, Gates scoring integration, or game-result database writeback is introduced.

## Stale reference handling
No GateQuest-era routes were removed in this phase.

Any stale references should be audited in follow-up PRs with route-level tests before safe removal.

## Remaining risks
- Metadata accuracy depends on ongoing maintenance when new games are added.
- Age ranges and practice capacities are currently curated defaults and may need curriculum review.
- Launch permissions are currently permissive and should be tightened once parent/child policy rules are finalized.


## PR7 identity cleanup and neutral learner context
- **Identity ownership rule:** GameHub standalone files must not hardcode an active child identity in UI defaults, launch copy, storage keys, or runtime fallbacks. Identity remains owned by Gates.
- **Neutral learner fallback rule:** Until Gates runtime context is formally connected, GameHub games should default to neutral learner labels such as `Learner`, `Player`, or `Demo Learner` so standalone public access remains playable.
- **Future Gates context plan:** A later phase may pass safe, scoped context from Gates into GameHub at launch time. That phase must avoid direct child identity leakage and must preserve standalone behavior when context is absent.
- **No-tracking status:** PR7 remains no-tracking. No event instrumentation, scoring pipeline integration, or game-result database writeback is introduced.

## PR8 playable launch path rule
- **Rule:** Every GameHub registry entry must include a browser-playable `launch_path` that resolves to HTML (typically a `.html` file under `public/gamehub`).
- **Compatibility:** `file_path` remains as source-file metadata, while UI entry points (`/gamehub/index.html` and Gates practice links) must launch through `launch_path`.
- **Safety:** This is launch-behavior-only. No gameplay changes, tracking hooks, scoring integration, or database-write wiring are added in this phase.

## PR9 identity cleanup rule across all GameHub games
- **Cross-game identity rule:** Every playable GameHub game (canonical extensionless source plus matching `.html` launch file) must avoid hardcoded active-child identity in launch/UI defaults, runtime fallbacks, and localStorage write keys.
- **Allowed neutral labels:** Use neutral fallback labels only: `Learner`, `Player`, and `Demo Learner`, until Gates explicitly provides safe runtime context.
- **Fictional content boundary:** Clearly fictional story characters may remain when they are not presented as the logged-in child identity.
- **Safety guardrail:** This cleanup is identity-only; it does not add tracking, scoring integration, or database writes.


## PR19 instrumentation audit status table

| Game | Playable | Shared content/config ready | Local adapter pilot | Tracking ready | Notes |
| --- | --- | --- | --- | --- | --- |
| adaptive_learning | Yes | Yes | Yes | No | Local-only pilot instrumentation present. |
| braingame2 | Yes | No | Yes | No | Mini-suite pilot instrumentation present. |
| braingames | Yes | No | Yes | No | Mini-suite pilot instrumentation present. |
| brickblast | Yes | Yes | Yes | No | Local-only pilot instrumentation present. |
| checkers | No (malformed source mirrors markdown draft) | No | No | No | Hold for repair; do not mark local-instrumentation ready. |
| game6 | Yes | Yes | Yes | No | Local-only pilot instrumentation present. |
| spelling | Yes | Yes | Yes | No | Local-only pilot instrumentation present. |
| 1stgradesightwords | Yes | Yes | Yes | No | Local-only pilot instrumentation present. |
| surf | Yes | Yes | Yes | No | Local-only pilot instrumentation present. |

## PR20 developmental mapping layer (metadata only)

This phase adds descriptive GameHub-to-Gates developmental mapping metadata for **local_pilot_ready** games only.

Guardrails in this phase:
- mapping metadata is interpretation support only
- no server tracking
- no database writes
- no tracking readiness enablement (`tracking_ready` remains `false`)
- no official Gates score linkage

| Game | Primary Gates | Secondary Gates | Signal Categories | Confidence | Notes |
| --- | --- | --- | --- | --- | --- |
| adaptive_learning | learning, focus | resilience | attention_focus; adaptive_reasoning; challenge_choice; persistence | strong | Quiz flow supports focus/challenge interpretation only. |
| braingame2 | focus | problem-solving | attention_focus; cognitive_flexibility; challenge_choice | medium | Lightweight cognitive signal mapping, no scoring. |
| braingames | focus | consistency | attention_focus; cognitive_flexibility; persistence; strategy_use | medium | Mini-suite mapping remains descriptive-only. |
| brickblast | focus, persistence | resilience | attention_focus; recovery_after_setback; persistence; body_timing | strong | Arcade recovery/persistence signals only. |
| game6 | learning | confidence, problem-solving | literacy_practice; adaptive_reasoning; strategy_use; challenge_choice | medium | Vocabulary interpretation support only. |
| spelling | learning | focus, consistency | literacy_practice; attention_focus; persistence | strong | Literacy practice mapping only. |
| 1stgradesightwords | learning, confidence | focus | literacy_practice; attention_focus; recovery_after_setback | strong | Early literacy confidence interpretation only. |
| surf | persistence, focus | resilience | body_timing; recovery_after_setback; persistence; attention_focus; emotional_regulation | medium | Reflex/regulation signals only; no Gates scoring. |

Checkers remains `hold_for_repair` and is intentionally excluded from local pilot mapping metadata.


## PR21 Gates gate-detail practice recommendations (mapping-only)
- Gate Detail pages render a **“Practice Games for this Gate”** section using `getGamesByGate(gateNumberOrKey)`.
- Rendering is **mapping-only** and optional. It does **not** introduce tracking, scoring linkage, diagnostic conclusions, or database writeback.
- Games are included only when all of the following are true:
  - `instrumentation_status === local_pilot_ready`
  - `local_instrumentation_ready === true`
  - `tracking_ready === false`
- `checkers` remains excluded while `hold_for_repair`.
- Cards show title, short description, primary/secondary gate fit, parent-friendly signal categories, confidence label, and launch links via playable `launch_path`.
- Safety copy shown in Gate Detail: “These games are optional developmental practices. They are not tests, grades, or diagnoses.”
- Launch behavior remains unchanged: public launches continue to work; optional child/profile hints remain non-authoritative; no child identity is passed into game runtime logic.


## PR22 Parent Practice Interpretation layer (descriptive-only)
- Gate recommendation cards may include an optional **“What this game practices”** section derived from registry `signal_categories`.
- Signal categories are translated into parent-friendly interpretation language (for example, `attention_focus` → “Focus and sustained attention”).
- Parent-facing note: “Children may engage with these games in different ways. Practice experiences do not equal grades or diagnoses.”
- This interpretation layer is descriptive and non-authoritative. It does **not** infer developmental outcomes, does not create diagnoses, and does not generate scores.
- No telemetry or runtime changes were added: no tracking enablement, no database writes, and no launch-path behavior changes.

## PR23 Parent reflection prompts on Gate Detail practice cards
- Gate Detail recommendation cards now support an optional **Parent reflection** line for each practice game.
- Prompt metadata can be provided directly in GameHub registry entries (`parent_reflection_prompt`) or derived from existing `signal_categories` fallbacks.
- Prompts are observational conversation supports only (for example focus, recovery, strategy attempts, and challenge choices).
- Safety copy is shown alongside cards: **“These prompts are for reflection only and are not used to score or diagnose.”**
- Guardrails remain unchanged:
  - no server tracking
  - no database writes
  - no parent-response input or storage
  - no Gates scoring linkage
  - no gameplay changes

## PR24 parent-facing Gates alignment summary (overview-only)
- GameHub index now includes a **“How these games support the Gates”** section for parent-facing high-level orientation.
- The section groups games by mapped Gate key/name and shows:
  - linked games under each Gate
  - signal categories
  - confidence labels
- The section intentionally excludes any game still `hold_for_repair` (including `checkers`).
- Safety language is included verbatim: **“These games are optional developmental practices. They are not tests, grades, or diagnoses.”**
- Scope remains overview-only:
  - no tracking enablement
  - no database writes
  - no Gates scoring connection
  - no diagnosis generation
  - no parent-response capture/storage
  - no gameplay changes

## PR26 launch-context and mode-preset handoff foundation
- Added a runtime-only launch-context helper: `getLaunchContextForGame(gameKey, options)`.
- Supported optional context fields are URL/config-only:
  - `game_key` (always included)
  - `gate_context` (optional)
  - `practice_path` (optional)
  - `mode_preset` (optional; allowed: `support`, `standard`, `challenge`)
- The helper validates safe values, rejects unsupported/unsafe params, and always uses playable registry `launch_path` as the base route.
- GameHub index now includes parent-facing mode preset selection UI with options **Support**, **Standard**, and **Challenge**.
- Parent-facing safety language added: “Practice modes change the experience style, not your child’s value or ability.”
- Launch-context-aware games (`surf`, `brickblast`, `adaptive_learning`) interpret `mode_preset` as **configuration tuning only** (pacing, ranges, escalation/session framing), preserving core gameplay identity and mechanics.
- Scope guardrails for PR26:
  - no tracking enablement
  - `tracking_ready` remains `false`
  - no server/database writes
  - no child scoring or diagnosis logic
  - no gameplay mechanics changes

## PR28 expanded launch-context mode presets for literacy practice games
- Extended launch-context awareness to `spelling`, `1stgradesightwords`, and `game6`.
- These games now safely parse optional runtime launch context fields:
  - `mode_preset`
  - `practice_path`
  - `gate_context`
- Preset behavior is **practice-style-only framing/configuration** with safe fallback to `standard` when preset values are absent or unsupported.
- Added visible in-game notice in each launch file: **“Practice mode: Support / Standard / Challenge”**.
- Preset effects remain bounded and non-diagnostic:
  - `spelling`: softer/stronger framing and smaller/larger default lesson set.
  - `1stgradesightwords`: softer/harder framing with smaller/larger default card count.
  - `game6`: softer/more demanding timing bands and round framing copy.
- Guardrails remain unchanged:
  - no tracking enablement
  - `tracking_ready` remains `false`
  - no server/database writes
  - no child scoring
  - no diagnosis language or logic

## PR29 launch-context mode presets for mini-suite arcade games
- Extended launch-context awareness to `braingames` and `braingame2`.
- These mini-suite launch files now safely parse optional runtime launch context fields:
  - `mode_preset`
  - `practice_path`
  - `gate_context`
- Presets are interpreted as **optional practice style only** with safe fallback to `standard`.
- Added visible in-game notice in each launch file: **“Practice mode: Support / Standard / Challenge”**.
- Preset effects are configuration/framing only where safe:
  - `braingames`: gentle/standard/challenge pacing adjustments on freeze timing and charge pace.
  - `braingame2`: gentle/standard/challenge defaults for maze pace, sorter flip pacing, and wheel charge pace.
- Guardrails remain unchanged:
  - no tracking enablement
  - `tracking_ready` remains `false`
  - no server/database writes
  - no child scoring
  - no diagnosis language or logic
  - mini-game lifecycle and markers remain intact

## PR30 Gate Detail suggested launch context (optional-only)
- Gate Detail recommendation cards can now include optional **suggested launch context** using existing `getLaunchContextForGame()` plumbing.
- Registry entries may define:
  - `suggested_mode_preset` (`support`, `standard`, or `challenge`)
  - `suggested_practice_path` (safe token)
- Gate Detail cards render:
  - **Suggested starting style**
  - **Suggested path** (when available)
- Launch links apply optional context fields only when suggestion metadata exists; baseline launch behavior remains unchanged.
- Parent choice remains authoritative:
  - suggestions are optional and non-authoritative
  - no inferred outcomes or diagnosis
  - no override of parent decisions
- Guardrails remain unchanged:
  - no tracking enablement
  - `tracking_ready` remains `false`
  - no server/database writes
  - no child scoring
  - no gameplay mechanic changes


## PR31 final GameHub ↔ Gates integration status dashboard

The table below is the **single planning source of truth** for current GameHub/Gates integration readiness.

| Game | Playable | Local instrumentation | Mode preset aware | Gate mapped | Gate Detail recommendation ready | Tracking ready | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| adaptive_learning | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Local-only instrumentation + mapping; adapter data remains in-memory only. |
| braingame2 | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Mini-suite pilot instrumentation remains local-only; no server ingestion. |
| braingames | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Mini-suite pilot instrumentation remains local-only; no score linkage. |
| brickblast | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Local-only pilot instrumentation with gate mapping/recommendation support. |
| checkers | No (`hold_for_repair`) | No | No | No | No | No | Not playable; excluded from public/parent/child launch discovery surfaces and Gate Detail recommendations until repaired. |
| game6 | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Local-only instrumentation; mode presets are launch-context framing only. |
| spelling | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Local-only instrumentation; no child scoring or diagnosis logic. |
| 1stgradesightwords | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Local-only instrumentation; recommendation support remains descriptive-only. |
| surf | Yes | Yes (`local_pilot_ready`) | Yes | Yes | Yes | No | Local-only instrumentation; no DB/server writes and no tracking enablement. |

### Before tracking can be enabled

Tracking must remain disabled (`tracking_ready: false` for all games) until all of the following are complete:

- [ ] Privacy review approved for child-practice signal handling.
- [ ] Parent consent flow designed and implemented for any non-local telemetry.
- [ ] Server event ingestion architecture designed, reviewed, and security-approved.
- [ ] Child identity handoff design finalized with minimum-necessary scoped identifiers.
- [ ] Aggregation-only reducer defined so analytics consume summaries, not raw child event streams.
- [ ] No raw answer payload rules codified and enforced in adapter + ingestion contracts.
- [ ] Deletion/export policy implemented for child/family data rights workflows.
- [ ] Clinical/diagnostic language guardrails formally documented and test-enforced.


## PR32 parent-facing readiness note on GameHub index (communication-only)
- Added a parent-facing **"About these practice games"** section to `public/gamehub/index.html`.
- The note clarifies what is ready now in plain language:
  - games are playable
  - games are optional
  - families can explore by Gate support area or by practice path
- The note also clarifies what is not ready/what is not happening:
  - games are **not** tests, grades, or diagnoses
  - practice modes are experience styles only
  - no game results are currently used to score Gates
- This is communication-only and does not add or expose runtime internals.
- Guardrails remain unchanged:
  - no tracking enablement
  - `tracking_ready` remains `false`
  - no server/database writes
  - no child scoring or diagnosis logic
  - no gameplay changes

## PR33 lightweight GameHub UX consistency pass (identity/navigation only)
- Added a lightweight shared in-game GameHub identity strip across playable launch files.
- Shared strip includes:
  - `GameHub Practice` badge
  - consistent `Practice mode: ...` display derived from launch context `mode_preset`
  - optional `Back to GameHub` navigation link
- Scope is UX consistency only:
  - no gameplay mechanics standardization
  - no engine refactor or shared runtime rewrite
  - no launch-path rewiring
- Safety/guardrails remain unchanged:
  - no tracking enablement (`tracking_ready` remains false)
  - no scoring linkage
  - no database/server write integration
  - no diagnosis logic

## PR34 GameHub shared-strip UX regression cleanup (post-PR33)
- Audited all playable GameHub launch pages under `public/gamehub/*` for shared strip placement, mobile layout safety, canvas/control overlap risk, back-link behavior, and practice-mode display behavior.
- Applied lightweight placement-only fix to the shared GameHub strip mount logic so the strip is inserted into each page’s local start/menu container when available (falling back to `body` only when necessary).
- This preserves each game’s visual identity while reducing risk of full-screen gameplay overlap from body-level insertion.
- Confirmed guardrails remain unchanged:
  - no tracking enablement
  - no scoring pipeline additions
  - no database-write logic
  - no gameplay engine/mechanics redesign


## PR35 checkers launch retirement while hold_for_repair
- Checkers remains `instrumentation_status: hold_for_repair` with `tracking_ready: false` and `local_instrumentation_ready: false`.
- Because the current launch file is not reliably browser-playable, Checkers is now excluded from active discovery surfaces by setting:
  - `public_launch_allowed: false`
  - `parent_context_launch_allowed: false`
  - `child_context_launch_allowed: false`
- This is a discovery/launch safety change only. No tracking, scoring, diagnosis, or database-write wiring was added.

## PR36 Adaptive Learning content and UX readiness pass (expansion prep only)
- Scope limited to Adaptive Learning content framing and learner/parent-facing session language.
- Updated in-game copy to emphasize practice snapshots and learning moments rather than school-test framing.
- Added parent-facing note inside Adaptive results: **“Practice snapshots are learning moments, not grades or labels.”**
- Applied lightweight question-bank sample organization improvements (`question-bank.sample.json`) with clearer metadata and tag grouping style for future expansion.
- Guardrails preserved:
  - no tracking enablement
  - no server/database writes
  - no scoring or diagnosis additions
  - no adaptive engine rewrite
  - no GameHub registry logic changes
