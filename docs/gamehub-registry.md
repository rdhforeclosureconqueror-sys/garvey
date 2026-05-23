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
