# Game Hub Audit & Integration Plan (2026-05-23)

## Scope audited
- `public/gamehub/*`
- Gates wrapper and launch APIs: `public/gates.js`, `server/gatesRoutes.js`
- Gates tests tied to old prototype assumptions: `tests/gates/gatequest-prototype-ui-integration.test.js`, `tests/gates/gates-route-session-contract.test.js`
- Requested path check: `public/gates/practice-games/` (**not present in repo**)

## Current game inventory

| File path | Detected game title | Standalone playable | Core tech/features | Mechanics summary | Current tracking/progress hooks | System conflict notes |
|---|---|---|---|---|---|---|
| `public/gamehub/1stgradesightwords` | Sight Words – Match & Learn | Yes | DOM UI, localStorage, text/audio controls likely via Web Speech API style controls in-page (no external API), no canvas | Match cards + sentence fill/learn flow for early sight words | Local-only history save (`localStorage`) | No Gates adapter; no child/session scoping; local storage key is global browser key |
| `public/gamehub/adaptive_learning` | Marley Adaptive Learning System V2A | Yes | DOM quiz app, localStorage history, adaptive logic, no canvas | Multi-subject adaptive MCQ diagnostic/practice/challenge with review and recommendations | Local-only session history (`marley_learning_history`) | Uses diagnostic language in copy; not connected to Gates child identity or policy-safe telemetry |
| `public/gamehub/braingames` | NeuroSpark Kids Lab | Yes | DOM-heavy mini-game hub + localStorage best scores | Multiple executive-function mini-games in one file | Local best-score persistence | Static-only and disconnected from Gates; no canonical route/registry record |
| `public/gamehub/braingame2` | NeuroSpark Lab variant (multi-game) | Yes | Canvas + DOM hybrid | Freeze maze, sorter, slot/wheel, switch-style challenge set | In-memory scores only (no central hooks observed) | Duplicative overlap with `braingames`; no wrapper integration |
| `public/gamehub/brickblast` | Brick Burst: Combo Rush | Yes | Canvas arcade | Breakout/brick-blast with levels, combos, powerups, touch/pointer controls | In-memory score/level only | No adapter; no child-aware launch, no guarded telemetry |
| `public/gamehub/game6` | Spelling Match Arena | Yes | DOM quiz loops | Speed match + synonym + antonym + definition matching rounds | In-memory score only | Standalone only; no registry/metadata integration |
| `public/gamehub/spelling` | Spelling Bee Lesson, Quiz & I-Spy | Yes | DOM interactive lesson/quiz | Learn words, type spelling, I-Spy style follow-through | In-memory progress during session | No Gates profile linkage or session hooks |
| `public/gamehub/surf` | Unicorn Surf Learning Hearts Fixed | Yes | Canvas action + DOM overlays, image asset loading via `new Image()` | Endless-run surf action with embedded math challenge popups, streak/coins/energy loops | In-memory stats only | No adapter; child-profile awareness absent |
| `public/gamehub/checkers` | **Not deployable as-is** (LLM response text wrapper + fenced markdown) | **No (broken as served raw)** | Raw markdown-like content with embedded code block, not clean HTML artifact | Intended board game, but file content is not production-ready static page | None | Immediate cleanup required before any routing/registry inclusion |

## Removed/stale references found

### Active stale/legacy GateQuest references (high-confidence stale)
- Client routes/CTAs still hardcoded to GateQuest prototype launch, not current gamehub inventory: `public/gates.js`.
- Gate practice panel currently maps every gate game CTA to GateQuest only (single prototype link), not to discovered files in `public/gamehub/`: `public/gates.js`.
- GateQuest iframe wrapper route handlers remain mounted: `public/gates.js`, `server/gatesRoutes.js`.
- Launch metadata APIs return `launch_url` for removed/non-existent `gamehub/gatequest-standalone.html`: `server/gatesRoutes.js`.
- Tests enforce GateQuest-specific CTA text, routes, sandbox iframe expectations, and launch URL contract: `tests/gates/gatequest-prototype-ui-integration.test.js`, `tests/gates/gates-route-session-contract.test.js`.

### Missing path requested in audit
- `public/gates/practice-games/` does not exist, so any prior assumptions of file-backed practice games under that path are stale.

## Game-by-game developmental mapping (non-diagnostic language)

### 1) Sight Words – Match & Learn (`public/gamehub/1stgradesightwords`)
- **Supported Gates (recommended):** Attention, Discipline, Truth.
- **Developmental capacities:** Visual word recognition, recall, sustained focus, error recovery.
- **Observation signals:** Returns to task after mismatch; uses sounding/word chunking strategies; improves match speed without rushing.
- **Suggested age range:** 5–8.
- **Suggested duration:** 8–12 min.
- **Parent reflection prompts:** “What helped you remember that word?” “Which strategy worked after a miss?”
- **Safety notes:** Keep encouragement neutral; avoid speed-pressure framing.

### 2) Adaptive Learning System (`public/gamehub/adaptive_learning`)
- **Supported Gates (recommended):** Attention, Choice, Discipline, Truth.
- **Developmental capacities:** Academic stamina, flexible thinking, strategy shift after misses, self-monitoring.
- **Observation signals:** Chooses to continue after hard item; checks answer choices methodically; uses explanation feedback.
- **Suggested age range:** 11–14 (as authored content indicates grades 6–8).
- **Suggested duration:** 12–20 min.
- **Parent reflection prompts:** “Where did persistence show up?” “What changed when a question felt difficult?”
- **Safety notes:** Replace any “diagnostic/readiness” interpretation with supportive “current practice snapshot” framing before parent-facing launch.

### 3) NeuroSpark Kids Lab (`public/gamehub/braingames`)
- **Supported Gates (recommended):** Attention, Emotion, Body, Discipline, Choice.
- **Developmental capacities:** Inhibitory control, selective attention, regulation under distraction, rule-shifting.
- **Observation signals:** Pauses before reacting; recovers after distractor error; adapts to changing constraints.
- **Suggested age range:** 7–12.
- **Suggested duration:** 10–15 min (single mini-game blocks).
- **Parent reflection prompts:** “How did you reset after a miss?” “What helped you filter distractions?”
- **Safety notes:** Keep score framing optional; center process praise.

### 4) NeuroSpark variant (`public/gamehub/braingame2`)
- **Supported Gates (recommended):** Attention, Emotion, Choice, Discipline.
- **Developmental capacities:** Focus switching, timing, pattern recognition, flexible response control.
- **Observation signals:** Improves consistency over rounds; attempts recovery after penalties; adjusts pace.
- **Suggested age range:** 7–12.
- **Suggested duration:** 8–15 min.
- **Parent reflection prompts:** “What helped you adapt when rules changed?”
- **Safety notes:** De-emphasize jackpots/points in parent summary.

### 5) Brick Burst (`public/gamehub/brickblast`)
- **Supported Gates (recommended):** Attention, Emotion, Discipline, Body.
- **Developmental capacities:** Visuomotor coordination, frustration recovery, pace adaptation.
- **Observation signals:** Maintains focus across speed increases; uses controlled recovery after life loss.
- **Suggested age range:** 8–13.
- **Suggested duration:** 6–12 min.
- **Parent reflection prompts:** “What did you do after a difficult round?”
- **Safety notes:** Consider optional motion-intensity mode and short break cue.

### 6) Spelling Match Arena (`public/gamehub/game6`)
- **Supported Gates (recommended):** Truth, Attention, Discipline.
- **Developmental capacities:** Vocabulary linkage, lexical retrieval speed, semantic discrimination.
- **Observation signals:** Uses elimination strategy; improves accuracy with repetition.
- **Suggested age range:** 8–12.
- **Suggested duration:** 6–10 min.
- **Parent reflection prompts:** “Which clue helped most: meaning, synonym, or antonym?”
- **Safety notes:** Avoid comparison language tied to score.

### 7) Spelling Bee Lesson, Quiz & I-Spy (`public/gamehub/spelling`)
- **Supported Gates (recommended):** Truth, Attention, Creation, Discipline.
- **Developmental capacities:** Encoding/recall, expressive explanation, transfer from learn-to-quiz-to-search.
- **Observation signals:** Explains word meaning in own words; self-corrects spelling attempts.
- **Suggested age range:** 7–11.
- **Suggested duration:** 10–15 min.
- **Parent reflection prompts:** “What memory trick helped with spelling today?”
- **Safety notes:** Keep corrections gentle and strategy-focused.

### 8) Unicorn Surf Learning Hearts (`public/gamehub/surf`)
- **Supported Gates (recommended):** Attention, Choice, Body, Emotion.
- **Developmental capacities:** Sustained attention in motion, quick cognitive switching (action↔math), regulation after misses.
- **Observation signals:** Recovers accuracy after interruption; balances speed with correct choices.
- **Suggested age range:** 8–13.
- **Suggested duration:** 8–14 min.
- **Parent reflection prompts:** “How did you switch from fast action to careful math?”
- **Safety notes:** Add optional visual-intensity reduction mode and pause reminders.

### 9) Checkers (`public/gamehub/checkers`)
- **Supported Gates (potential after cleanup):** Choice, Discipline, Truth, Legacy.
- **Current status:** Draft content not in deployable format; exclude from launch until converted to valid standalone HTML.

## Integration recommendation (architecture)

### Recommended launch modes
1. **Public demo (no child profile required):**
   - `brickblast`, `surf`, `spelling`, `game6`.
2. **Child-profile connected (Gates-linked):**
   - `1stgradesightwords`, `braingames`, `braingame2`, `adaptive_learning` (after copy/policy cleanup).
3. **Standalone/holdback:**
   - `checkers` until file repaired.

### Recommended architecture pattern
- Introduce **single source game registry** (server-owned JSON/JS module) and render both:
  - public game hub listings
  - Gates in-flow practice recommendations
- Replace GateQuest-specific wrappers with **generic game launch wrapper** supporting:
  - `launch_mode: public | child_profile | standalone`
  - safe iframe sandbox policy by game requirement
  - standardized tracking adapter calls
- Keep legacy GateQuest routes temporarily as compatibility redirects until tests/UI migrated.

## Tracking opportunities (safe schema)
Per game emit only metadata/non-sensitive aggregates:
- `session_started` `{game_key, mode, child_context_present, gate_context?}`
- `session_ended` `{duration_sec, completion_state, rounds_completed, quit_reason?}`
- `activity_selected` `{activity_key, difficulty?}`
- `level_reached` `{level}`
- `round_completed` `{round_index, success:boolean}`
- `retry_or_recovery` `{event_type: retry|resume|post_error_recovery}`
- `focus_accuracy_summary` `{attempts, correct_count, accuracy_pct_band, streak_max}`

Do **not** log raw free-text answers, typed spelling content, child identifiers beyond internal numeric FK, or any clinical labels.

## Risks/conflicts
- GateQuest-only APIs/routes/tests currently block clean replacement unless updated in coordinated sequence.
- `checkers` file is malformed for runtime serving.
- Multiple games use ad-hoc localStorage keys; without namespacing, cross-environment contamination likely.
- No existing adapter layer for telemetry normalization across canvas/DOM games.
- Some copy (notably adaptive file) uses language that may be interpreted as evaluative/diagnostic and should be softened before child-profile integration.

## Recommended PR order
1. **PR1 Audit + registry scaffolding:** add canonical registry for current games; no behavior change.
2. **PR2 Route/API normalization:** introduce generic launch endpoints; keep GateQuest routes as temporary compatibility aliases.
3. **PR3 Gates UI migration:** replace GateQuest CTA/wrapper with registry-driven game cards and per-game launch links.
4. **PR4 Tracking adapter pass:** add minimal safe events per game (start/end/activity/round/level/recovery/summary).
5. **PR5 Game cleanup:** fix `checkers` artifact; sanitize language/copy in adaptive game; localStorage namespacing.
6. **PR6 Test/doc updates:** rewrite stale GateQuest tests and any docs referencing removed prototype list.

## Files likely to modify
- `public/gates.js`
- `server/gatesRoutes.js`
- `tests/gates/gatequest-prototype-ui-integration.test.js`
- `tests/gates/gates-route-session-contract.test.js`
- New registry files (suggested):
  - `gates/gameRegistry.js` (or `server/gamehubRegistry.js`)
  - optional `public/js/gamehub-registry-client.js`
- Game files needing adapter hooks:
  - `public/gamehub/1stgradesightwords`
  - `public/gamehub/adaptive_learning`
  - `public/gamehub/braingames`
  - `public/gamehub/braingame2`
  - `public/gamehub/brickblast`
  - `public/gamehub/game6`
  - `public/gamehub/spelling`
  - `public/gamehub/surf`
  - `public/gamehub/checkers` (repair)

## Tests likely to add/update
- Update existing stale GateQuest expectations:
  - `tests/gates/gatequest-prototype-ui-integration.test.js`
  - `tests/gates/gates-route-session-contract.test.js`
- Add registry contract tests:
  - `tests/gates/game-registry-contract.test.js` (new)
- Add launch API coverage for new launch modes and child auth gating:
  - `tests/gates/game-launch-routes.test.js` (new)
- Add telemetry payload lint tests (non-sensitive fields only):
  - `tests/gates/game-tracking-schema.test.js` (new)
