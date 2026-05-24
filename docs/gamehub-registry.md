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
