# GameHub Content + Standardization Audit
**Date:** 2026-05-23  
**Scope:** `public/gamehub/*` + reference docs/registry listed in request  
**Purpose:** Architecture and consistency planning only (no tracking or Gates implementation changes).

---

## 1) Executive summary
GameHub can support a unified content strategy, but the current games are split across three architecture styles:

1. **Content-driven quiz/word games** (easiest to standardize):
   - `1stgradesightwords`, `spelling`, `game6`, `adaptive_learning`
2. **Mechanics-driven action/canvas games with lightweight generated challenge content** (moderate):
   - `surf`, `brickblast`
3. **Mini-suite hubs with per-mini-game custom state/progression** (hardest):
   - `braingames`, `braingame2`

A standardization path should begin with shared content schemas + loaders for quiz/word games, then progress to shared progression/config frameworks for action and mini-suite games.

---

## 2) Findings by game

## A. `public/gamehub/1stgradesightwords`
### Content architecture
- **Hardcoded content:** Yes.
  - `WORDS` array (sight words) in file.
  - `SENT` object (per-word sentence options) in file.
- **Embedded banks:** Word bank + sentence bank are tightly coupled to runtime logic.
- **Inline arrays:** Heavy use.
- **Lesson structure:** Two modes in one page:
  1) match-card memory game
  2) sentence/blank learning prompt
- **Difficulty pools:** Implicit by card count selector; no semantic difficulty tags on words.
- **Reusable vs non-reusable:** Content is reusable in theory, but currently non-reusable in practice because schema is local/private to this file.

### Progression architecture
- **Difficulty increase:** User-selected grid size only (12/16/18/24 cards).
- **Level system:** None.
- **Adaptive logic:** Minimal randomization (word selection, missing-character index).
- **Unlock/reward:** No unlock tree; immediate correctness feedback.
- **Reusable progression:** Mostly isolated.

### Configuration architecture
- **Supported settings:** Card count dropdown.
- **Mode toggles:** Match vs Learn sections coexist and can be used independently.
- **Externally controllable params:** Could expose `matchSize`, word subset, and sentence depth.
- **Config opportunities:** High—this file could be switched to data-driven word packs with simple mode presets.

### Standardization readiness
- **Readiness:** **Easy**.
- **Blockers:** Content is hardcoded and mixed with DOM logic.
- **Duplicate logic:** Shuffle/random-choice logic repeated in other games.
- **Cleanup needed:** Extract word/sentence datasets and normalize mode metadata.

---

## B. `public/gamehub/spelling`
### Content architecture
- **Hardcoded content:** Yes (`WORDS` object array with grade, word, definition, example).
- **Embedded banks:** Single multi-grade word dataset.
- **Lesson structures:** Explicit multi-mode pipeline:
  - Lesson mode
  - Quiz mode
  - I-Spy/choice mode
- **Difficulty pools:** Grade-based filtering (`randomTenByGrade`) + random sample set.
- **Reusable vs non-reusable:** Strongly reusable dataset shape already present; currently local to one file.

### Progression architecture
- **Difficulty increase:** Grade selection + sequential rounds.
- **Level systems:** Not explicit, but quiz/game completion thresholds and score messages act as soft levels.
- **Adaptive logic:** None beyond random selection and correctness checks.
- **Unlock/reward:** Completion messages and score-based praise.
- **Reusable progression:** Partially reusable (mode sequence pattern is portable).

### Configuration architecture
- **Supported settings:** Grade selector; start mode buttons.
- **Mode toggles:** Strong (lesson/quiz/game).
- **Externally controllable params:** Grade, set size, answer-mode strictness, feedback style.
- **Config opportunities:** Very high—already close to a generic “word lesson engine” with configurable modes.

### Standardization readiness
- **Readiness:** **Easy**.
- **Blockers:** DOM code and content tightly co-located.
- **Duplicate logic:** Shuffle, round counters, correctness feedback duplicated elsewhere.
- **Cleanup needed:** Split content into external data and define reusable mode config schema.

---

## C. `public/gamehub/game6` (Spelling Match Arena)
### Content architecture
- **Hardcoded content:** Yes (`words` dataset with synonyms/antonyms/definitions).
- **Embedded banks:** One lexical bank reused across four activity types.
- **Lesson structure:** Mode-per-activity (speed, synonym, antonym, definition).
- **Difficulty pools:** No explicit difficulty labels; random sampling only.
- **Reusable vs non-reusable:** Content model is reusable but currently bespoke.

### Progression architecture
- **Difficulty increase:** Minimal; mostly fixed challenge loops.
- **Level system:** None.
- **Adaptive logic:** None.
- **Unlock/reward:** Points + splash feedback.
- **Reusable progression:** Isolated.

### Configuration architecture
- **Supported settings:** Mode selection buttons.
- **Mode toggles:** Yes (4 game modes).
- **Externally controllable params:** Round counts, distractor quality, timing windows.
- **Config opportunities:** High—can be represented as “question template + relation type”.

### Standardization readiness
- **Readiness:** **Easy to Moderate**.
- **Blockers:** No difficulty metadata and no shared quiz abstraction.
- **Duplicate logic:** Strong overlap with `spelling` and `1stgradesightwords` for selection + checking.
- **Cleanup needed:** Normalize word bank schema + mode descriptors.

---

## D. `public/gamehub/adaptive_learning`
### Content architecture
- **Hardcoded content:** Yes (`QUESTION_BANK` with rich per-item metadata).
- **Embedded banks:** Large mixed-subject bank with `grade`, `domain`, `skill`, `prerequisite_skill`, `difficulty`, explanation fields.
- **Lesson structure:** Session-based adaptive diagnostic/practice/challenge flow.
- **Difficulty pools:** Explicit (difficulty 1/2/3 + grade/subject filters).
- **Reusable vs non-reusable:** Highly reusable content schema; currently monolithic in one file.

### Progression architecture
- **Difficulty increase:** Driven by mode/goal and adaptive selection behavior.
- **Level system:** Session progression and placement/readiness analysis style output.
- **Adaptive logic:** Yes (question selection and results interpretation).
- **Unlock/reward:** Primarily narrative feedback and reporting, not unlockables.
- **Reusable progression:** Core logic is reusable if abstracted into shared assessment engine.

### Configuration architecture
- **Supported settings:** Subject, starting grade, question count, mode, session goal.
- **Mode toggles:** Strong and explicit.
- **Externally controllable params:** Very high—question count, adaptive profile, subject/domain targeting, output verbosity.
- **Config opportunities:** Very high—already close to config-driven engine with external item bank.

### Standardization readiness
- **Readiness:** **Moderate**.
- **Blockers:** Large single-file coupling between UI, question bank, and analytics logic.
- **Duplicate logic:** Session tracking/feedback patterns overlap with other quiz games.
- **Cleanup needed:** Separate item bank, scoring profile config, and output-report templates.

---

## E. `public/gamehub/surf`
### Content architecture
- **Hardcoded content:** Mechanics yes; question content generated procedurally (math ops) rather than pre-authored bank.
- **Embedded banks:** No static question bank; generated arithmetic values + multiple-choice distractors.
- **Lesson structure:** Action loop interrupted by question modal.
- **Difficulty pools:** `easy/medium/hard` question generation rules.
- **Reusable vs non-reusable:** Generation logic reusable, but currently game-specific.

### Progression architecture
- **Difficulty increase:** Game speed/pressure + streak system + optional question difficulty choice.
- **Level system:** No formal levels, but implicit progression via speed and resource management.
- **Adaptive logic:** Limited (reward amount by chosen question difficulty; streak-dependent weapon behavior).
- **Unlock/reward:** Energy refill rewards; streak powers (triple/rainbow hearts).
- **Reusable progression:** Mostly isolated mechanics with reusable “interrupt challenge” pattern.

### Configuration architecture
- **Supported settings:** Difficulty choice for questions (per challenge event).
- **Mode toggles:** Action vs quiz interrupt state.
- **Externally controllable params:** Spawn rates, reward amounts, streak thresholds, question ranges.
- **Config opportunities:** Moderate to high if mechanics constants are externalized.

### Standardization readiness
- **Readiness:** **Moderate**.
- **Blockers:** Tight coupling of mechanics and quiz generator.
- **Duplicate logic:** Random option generation similar to quiz games, but embedded in canvas loop.
- **Cleanup needed:** Move tunables into config; abstract question generator module.

---

## F. `public/gamehub/brickblast`
### Content architecture
- **Hardcoded content:** Yes, mostly mechanical constants and level-generation formulas.
- **Embedded banks:** Power-up registry/object, procedural level shape logic.
- **Lesson structure:** Arcade rounds with escalating layouts.
- **Difficulty pools:** Implicit through level-based formulas (speed, rows, brick types/chances).
- **Reusable vs non-reusable:** Power-up and level-config pattern reusable, but implementation is bespoke.

### Progression architecture
- **Difficulty increase:** Explicit by level increment affecting speed, board complexity, hazard rates.
- **Level system:** Strong.
- **Adaptive logic:** Not learner-adaptive; deterministic/procedural scaling.
- **Unlock/reward:** Combo bonuses, clear bonuses, power-up effects.
- **Reusable progression:** Reusable as a generic “arcade progression config” if extracted.

### Configuration architecture
- **Supported settings:** Mostly none exposed in UI; internal constants control experience.
- **Mode toggles:** Not significant.
- **Externally controllable params:** High potential: speed curves, drop rates, life count, power durations, shapes.
- **Config opportunities:** High for mechanics configs; low for content-bank style.

### Standardization readiness
- **Readiness:** **Moderate**.
- **Blockers:** Deeply integrated procedural logic.
- **Duplicate logic:** Shared patterns with `surf` on HUD/state loops, but different implementation.
- **Cleanup needed:** Externalize constants and progression presets before major content variants.

---

## G. `public/gamehub/braingames`
### Content architecture
- **Hardcoded content:** Yes, large monolithic mini-game suite.
- **Embedded banks:** Per-mini-game constants, prompts, and behavior logic in one file.
- **Lesson structure:** Hub of multiple mini-games.
- **Difficulty pools:** Per-mini-game level/score logic; inconsistent schemas across games.
- **Reusable vs non-reusable:** Low currently due to mixed patterns and single-file design.

### Progression architecture
- **Difficulty increase:** Per mini-game (often score thresholds → level increments).
- **Level system:** Exists but fragmented by mini-game.
- **Adaptive logic:** Minimal; mostly score-based pacing.
- **Unlock/reward:** Score and level increments.
- **Reusable progression:** Potentially reusable if mini-games conform to one state contract.

### Configuration architecture
- **Supported settings:** Primarily choosing mini-game.
- **Mode toggles:** Multiple activity types.
- **Externally controllable params:** Many internal tunables but not externalized.
- **Config opportunities:** High value but high effort—needs framework extraction.

### Standardization readiness
- **Readiness:** **Hard**.
- **Blockers:** Multi-game monolith and inconsistent internal game contracts.
- **Duplicate logic:** Significant overlap likely with `braingame2` and internal mini-games.
- **Cleanup needed:** Define mini-game plugin contract and split modules first.

---

## H. `public/gamehub/braingame2`
### Content architecture
- **Hardcoded content:** Yes, another multi-game suite with embedded mechanics.
- **Embedded banks:** Rule sets and internal data structures per mini-game.
- **Lesson structure:** Suite/hub style similar to `braingames`.
- **Difficulty pools:** Per-game thresholds and level calculations.
- **Reusable vs non-reusable:** Low due to bespoke internal composition.

### Progression architecture
- **Difficulty increase:** Score-based level adjustments per mini-game.
- **Level system:** Yes, fragmented.
- **Adaptive logic:** Limited.
- **Unlock/reward:** Score progression, level changes.
- **Reusable progression:** Low unless common mini-game lifecycle is introduced.

### Configuration architecture
- **Supported settings:** Activity selection.
- **Mode toggles:** Multiple internal games.
- **Externally controllable params:** Potentially many; currently internal only.
- **Config opportunities:** High but requires architectural refactor.

### Standardization readiness
- **Readiness:** **Hard**.
- **Blockers:** Structural overlap/conflict with `braingames`; no shared suite contract.
- **Duplicate logic:** High duplicate opportunity with `braingames`.
- **Cleanup needed:** Decide merge/consolidate strategy between the two suite files.

---

## I. `public/gamehub/checkers`
### Content architecture
- Standalone board-state logic appears present, but the file has known artifact/format concerns from prior audit notes.
- Content is not bank-driven; it is rules/mechanics driven.

### Progression architecture
- Turn-based game progression (player turns, valid move computation, win conditions).
- No educational content banks, no adaptive pedagogy, no unlock systems.

### Configuration architecture
- Very limited mode/config controls (e.g., hints toggle/reset).

### Standardization readiness
- **Readiness:** **Moderate (for game-state contract), Hard (if file formatting/deploy hygiene unresolved).**
- **Blockers:** Cleanup/validity and integration consistency.

---

## 3) Cross-game shared content-system opportunities

## A. Shared content schemas
Introduce a common `GameHubContent` schema family:

1. **Question bank schema** (for `adaptive_learning`, math interrupts in `surf`, potential future quiz games)
   - `id`, `domain`, `skill`, `difficulty`, `prompt`, `choices`, `answer`, `explanation`, `tags`, `grade_band`, `mode_tags`

2. **Word bank schema** (for `spelling`, `game6`, `1stgradesightwords`)
   - `word`, `grade`, `definition`, `example`, `synonyms`, `antonyms`, `sentence_templates`, `difficulty`, `phonics_tags`

3. **Lesson pool schema**
   - `lesson_id`, `content_refs`, `activity_sequence`, `completion_rules`

4. **Difficulty config schema**
   - Per game/mode thresholds, pacing, distractor quality, reward multipliers.

5. **Mode preset schema**
   - e.g., `quick_practice`, `standard`, `challenge`, `support` with shared parameter overrides.

## B. Shared loaders
- Add a generic content loader (JSON first, local fallback) used by all content-driven games.
- Keep each game’s unique rendering/mechanics while centralizing content ingestion.

## C. Shared progression primitives
- Reusable primitives:
  - streak model
  - level-up thresholds
  - accuracy bands
  - session summary model
- This avoids each file inventing bespoke progression metadata.

## D. Shared config registry
- Per-game config file + global defaults.
- Enables mode variants without touching game logic (especially for `brickblast`/`surf` tuning).

---

## 4) Standardization readiness matrix

| Game | Content standardization | Progression standardization | Config externalization | Overall effort |
|---|---|---|---|---|
| `1stgradesightwords` | Easy | Easy | Easy | **Low** |
| `spelling` | Easy | Easy-Moderate | Easy | **Low** |
| `game6` | Easy | Easy | Easy | **Low-Medium** |
| `adaptive_learning` | Moderate | Moderate | Easy-Moderate | **Medium** |
| `surf` | Moderate | Moderate | Moderate | **Medium** |
| `brickblast` | Moderate | Moderate | Moderate | **Medium** |
| `braingames` | Hard | Hard | Hard | **High** |
| `braingame2` | Hard | Hard | Hard | **High** |
| `checkers` | Moderate | Moderate | Easy | **Medium (after hygiene cleanup)** |

---

## 5) Suggested content-loading strategy (pre-expansion)

## Phase 1: Schema + adapters (no gameplay rewrites)
- Define canonical JSON schemas for question and word content.
- Add lightweight per-game adapters:
  - `fromWordBankToSightWordsDeck()`
  - `fromWordBankToSpellingLesson()`
  - `fromQuestionBankToAdaptiveSession()`

## Phase 2: Externalize datasets
- Move hardcoded banks to `public/gamehub/content/*.json` (or equivalent data directory).
- Keep fallback inline sample packs during transition to avoid runtime breakage.

## Phase 3: Externalize config presets
- Create `public/gamehub/config/*.json` for:
  - difficulty curves
  - mode presets
  - reward/threshold constants

## Phase 4: Progression contract
- Introduce a shared runtime progression object (in-memory only for now):
  - `attempts`, `correct`, `streak`, `level`, `difficulty_state`, `completion_state`
- No tracking implementation yet; just a common shape.

## Phase 5: Mini-suite normalization (`braingames`/`braingame2`)
- Define mini-game lifecycle interface:
  - `init(config)`
  - `start()`
  - `pause()`
  - `resume()`
  - `stop()`
  - `getSnapshot()`
- Consolidate duplicate mini-game logic into shared modules.

---

## 6) Risks and effort estimates

## High risks
1. **Monolithic suites (`braingames`, `braingame2`)** can absorb disproportionate time if tackled first.
2. **Schema drift** if each game adds custom fields without governance.
3. **Inline-content dependencies** where game logic assumes specific literal content shapes.

## Medium risks
1. Procedural games (`surf`, `brickblast`) may need careful tuning after config externalization.
2. `checkers` formatting/deploy status needs confirmation before standardization workstream assignment.

## Estimated effort bands (planning-level)
- Low: 0.5–1.5 dev days per game
- Medium: 2–4 dev days per game
- High: 5–10+ dev days (suite-level restructuring)

---

## 7) Recommended standardization order
1. **`spelling` + `1stgradesightwords` + `game6`** (fast wins, shared word/quiz schema proof).
2. **`adaptive_learning`** (rich question schema becomes canonical model).
3. **`surf`** (plug into shared question generator/config patterns).
4. **`brickblast`** (externalize progression/config constants).
5. **`checkers`** (after file hygiene verification).
6. **`braingames` and `braingame2`** (final consolidation/refactor wave).

---

## Recommended implementation order after this audit
1. Finalize shared **content schemas** (word bank + question bank + mode preset + difficulty config).
2. Build a minimal **content loader + adapter layer** used by `spelling` and `1stgradesightwords` first.
3. Migrate `game6` to same word-bank schema and relation-driven question templates.
4. Migrate `adaptive_learning` item bank out of file, preserving current session behavior.
5. Externalize tunable constants for `surf` and `brickblast` into config presets.
6. Define mini-game lifecycle contract, then normalize `braingames`/`braingame2` under that contract.
7. Only after structure is unified: begin large content-library expansion and later tracking/Gates integration phases.
