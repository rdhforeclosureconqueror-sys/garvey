# Ten Gates 2D-to-3D Source Audit — 2026-10-21

## Confirmed files on main (read-only inspection)
- `public/gamehub/content/game.js`: canvas-based Signal Path gameplay; intro/how-to/game/complete screens; dialogue, Keeper NPC image, sprite map, focus indicator and quiet-listen button. This is a concrete 2D integration target.
- `public/gamehub/gamehub-registry.js`: independent GameHub registry; includes academic adaptive-learning entry. Preserve its academic separation.
- `public/gates.html`: parent-facing Rite of Passage shell.
- `server/gatesRoutes.js`: GateQuest launch and Gates APIs (identified through indexed code search and prior architecture audit).
- `gates-v2/domain/gateRegistry.js`: canonical IDs gate_attention through gate_legacy.
- `gates-v2/content/schemas/gate-definition.schema.json`: strict versioned definition schema with symbolism, provenance, approvals, ceremonies and developmental markers. **Do not append unrecognized fields**; use separate linked symbol/day release files.
- `docs/RITE_OF_PASSAGE_ENGINE_ARCHITECTURE_AUDIT_2026-08-05.md`: documents V1/V2 overlap and V2 private API mount gap as of August; current runtime status not yet independently verified.

## Findings / first gap
The existing browser 2D experience is **real** and already has a Keeper, dialogue, path, signals and completion UI. No Godot `project.godot`, `.tscn`, or `forest_sentence_bridge` was returned from code search in this repo. **3D source cannot yet be audited or integrated from this repository**. Local Godot project previously referenced as `garvey/3d-world/godot` requires an accessible remote or supplied project files.

## First integration seam (design; not yet implemented)
1. Versioned Gate 1 daily content in a separate `gates-v2/content/adinkra/` collection: stable gate/day/symbol IDs, authentic cultural meaning and citation, modern teaching application, story, Keeper dialogue, challenge and reflection.
2. Shared browser-facing read-only content endpoint with version pinning, no child data required.
3. Adapter from the existing `public/gamehub/content/game.js` dialogue/challenge triggers to the same content IDs; keep current default behavior until feature validated.
4. Godot resource/HTTP adapter to same IDs **only after** inspecting real Godot scene tree and connectivity.
5. Child-specific progress via existing owned-child auth and V2 session contract after security and persistence verification; no new client-trusted character scores.

## Next verification
- Inspect full 2D `game.js` challenge/complete functions, GateQuest route and registry references.
- Identify real Godot project location and whether it is version controlled.
- Verify existing test commands, V2 private API mount, and regression tests before modifying runtime.
- Use explicit modelling, guided practice, independent practice, and structured reflection in each lesson; do not claim that Adinkra game effectiveness is already proven.

No gameplay, tests, merge, or deployment performed by this audit.
