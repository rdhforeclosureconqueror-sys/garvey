# Ten Gates — Adinkra-Integrated Rite of Passage (implementation blueprint)

Status: **integration specification / not deployed**. Adinkra wisdom is a **core curriculum component**, not an optional cultural overlay. Open to participants of all backgrounds.

## Verified current architecture
- Garvey repository: `rdhforeclosureconqueror-sys/garvey`.
- Existing V1 parent/child SPA: `public/gates.html`, `public/gates.js`, `server/gatesRoutes.js`; parent/child and progress records via `server/gatesDb.js`.
- Existing V2: `gates-v2/domain/gateRegistry.js`, schemas, reducer, content fixtures and child demo. The older architecture audit says V2 private API was not mounted; re-verify current code before integration.
- Ten canonical gate IDs (preserve): attention, emotion, choice, body, discipline, truth, repair, creation, community, legacy.
- Existing 2D game references: GateQuest and Signal Path; audit their real files, launch routes, scoring, and content before altering.
- Godot 3D project previously used locally at `garvey/3d-world/godot`. Its remote source and runtime bridge **not yet verified**.
- Adaptive Learning Engine remains a separate **academic** portal. Do not merge its scoring or content into the Rite of Passage.

## Product invariants
1. One rite-of-passage curriculum with 10 gates and 7 symbol-led daily lessons per gate (70 lessons); a symbol may recur with a different contextual application.
2. Every daily lesson has: source-verified Adinkra name and artwork, established Akan meaning, separately labeled contemporary educational interpretation, short story, interactive challenge, reflection, and real-life transfer activity.
3. Preserve V1 parent auth, child ownership, progress, and current game launch flows. Use V2 immutable versioned content releases and reducer/session contracts when compatible.
4. Both browser 2D and Godot 3D clients consume **the same versioned lesson IDs** and send events through an authenticated, idempotent progress interface. Never trust client-reported mastery or completion percentages as proof of character.
5. No punitive labels, diagnosis, forced confession, shame, compulsory forgiveness, countdown stress, or moral identity scoring. Give retry, pause, accessibility, and parent-supported alternatives.
6. Child data minimized, guardian consent and retention controls verified before any new telemetry.
7. Never silently rewrite historical Akan meanings or label invented parables as traditional oral narratives.

## Gate 1 proposed seven-day curriculum (pending cultural review)
| Day | Symbol | Established theme | Interactive skill |
| --- | --- | --- | --- |
| Sunday | Mate Masie | listening, wisdom, understanding | Listen and accurately retell a Keeper clue |
| Monday | Akoben | vigilance, readiness | Detect a relevant signal among forest sounds |
| Tuesday | Hwe Mu Dua | examination | Observe clues; distinguish observation from assumption |
| Wednesday | Nyansapo | wisdom, ingenuity, patience | Select relevant information for a forest route |
| Thursday | Ani Bere A Enso Gya | restraint, patience (verify translation and icon before release) | Pause before acting on a tempting distraction |
| Friday | Sesa Wo Suban | transformation of character | Notice wandering, gently return, and adjust strategy |
| Saturday | Sankofa | learning from the past | Retrieve earlier lessons and explain a real-world application |

## Evidence and measurement
Use explicit strategy instruction, adult/Keeper think-aloud modelling, supported practice, gradual removal of prompts, spaced retrieval, and delayed application checks. These instructional methods have supporting evidence; this particular game and Adinkra mapping **do not yet have demonstrated causal effectiveness**.

Track learning evidence without moral scores:
- Can explain the symbol's authentic meaning;
- Can identify and use the day's strategy;
- Level of support: modelled / guided / self-initiated;
- Delayed recall and transfer to a different task.
Measure pre/post pilot with age-appropriate equivalent tasks and parent observation, not speed alone.

Evidence: Education Endowment Foundation, *Metacognition and Self-Regulated Learning* (2025): https://educationendowmentfoundation.org.uk/education-evidence/guidance-reports/metacognition

## Next implementation sequence / exit criteria
1. Audit 2D GateQuest, Signal Path, existing gamehub registry, V1/V2 session flows and current tests; inventory exact file paths and data contracts.
2. Locate and inspect actual Godot `.tscn`, `.gd`, `project.godot` files and deployment bridge. **Do not claim 3D integration until source is accessible.**
3. Add a validated Adinkra symbol registry with cultural provenance, stable IDs, approved images and meanings.
4. Add versioned Gate 1 seven-day content fixtures and automated schema/source checks.
5. Connect a single 2D lesson end to end, then Godot to the same lesson and idempotent progress events.
6. Run regression tests for parent/child ownership, separate academic engine, replay, pause, progress and 2D/3D parity.
7. Pilot learning outcomes; only expand to Gates 2–10 after review.

## Deployment gate
No merge to main or live deployment until code changes, regression evidence, cultural review and rollback path are verified.
