# Codex Handoff — Gate 1 HTML Adventure v2

## What this package is
This is a **multi-file HTML/CSS/JS MVP** for the upgraded Gate 1 attention game.

It is no longer a single HTML file.
It is designed to be plugged into the website as a standalone lesson route.

## Suggested target path

```text
public/rite-of-passage/lessons/gate-attention/signal-path-v2/
```

## Package contents

- `index.html`
- `styles.css`
- `game.js`
- `assets/...`
- `docs/CODEX_HANDOFF.md`

## What was improved

Compared with the earlier prototype, this version now includes:

1. **Image-based art direction**
   - Orin sprite art
   - NPC portrait/sprite art
   - tile art crops
   - story background art
   - scatterbug art
   - Path Stone reward art

2. **Better structure for integration**
   - separate HTML/CSS/JS files
   - relative asset paths
   - easier future replacement of art

3. **Expanded gameplay loop**
   - Mission 1: deliver parcel to Mara
   - Mission 2: catch 3 scatterbugs
   - Mission 3: use Quiet Listen and reach the Gate

4. **Tracking-ready architecture**
   - `emitEvent()` stub included
   - `postMessage` support included
   - local queue fallback included
   - lightweight placeholder fetch included for Codex to replace

## Important note about art assets
The asset crops in this package are **usable placeholders**, created from the concept sheets.
They are good enough for an MVP, but they are **not the final clean production slices**.

### Please improve these in-repo if time allows:

- replace approximate crops with cleaner exports
- optionally remove label remnants or edge artifacts
- optionally replace with transparent PNGs exported from dedicated art sheets

## Codex tasks requested

### 1. Add this route to the registry
Register:

- `gate_number: 1`
- `gate_key: gate_attention`
- `lessonId: attention_signal_path_v2`
- `title: The Signal Path`
- `launch_path: /rite-of-passage/lessons/gate-attention/signal-path-v2/index.html`
- `gradeBand: grades_1_3`
- `status: pilot`

### 2. Replace tracking stub
Current JS emits events through `emitEvent()`.
Please wire this to the actual canonical routes:

- `POST /api/gates/children/:childId/rite/sessions`
- `POST /api/gates/children/:childId/rite/events`
- `POST /api/gates/children/:childId/rite/completions`

Use query params or session bootstrap already used in the repo.

### 3. Read launch params
Please add support for:

- `child_id`
- `sessionId`
- `gradeBand`
- optional `gateSessionId`

### 4. Optional next upgrade
If you want to meet this MVP halfway inside the site, recommended next enhancements are:

- add parent shell loader for child/session context
- swap placeholder fetch stub for signed REST calls
- convert NPC dialogue into manifest-driven content
- move map layout into JSON
- replace approximate cropped assets with final art exports
- add sound
- add mobile D-pad UI if needed

## Why this is a better direction
This package keeps the project in HTML for speed, but it moves the experience much closer to a **real game-like lesson**:

- more captivating visuals
- stronger story feel
- clearer developmental loop
- easier plug-in path for the website

