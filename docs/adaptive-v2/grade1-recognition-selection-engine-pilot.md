# Grade 1 Recognition / Selection Engine Pilot

## File structure

- `public/gamehub/engines/recognition-selection/recognition-selection-engine.js`
- `public/gamehub/content/adaptive-v2/grades/grade1/pilot-recognition-selection/*.config.v1.json`

## Integration notes

1. Load engine module and a selected skill config.
2. Create a mission session via `RecognitionSelectionEngine.createEngineSession(config, deps)`.
3. Use `getQuestionView()` to render prompt, choices, optional image, and hint state.
4. Optionally call `playPromptAudio()`; connect `deps.ttsHook` to your TTS service when available.
5. Call `submitAnswer(choiceId)` for immediate feedback and retry flow.
6. At mission end, call `finalize()` and route `mastery_signal` into adaptive progression.

### Session adapter compatibility

The engine emits canonical events when `deps.sessionAdapter` is passed:
- `round_completed`
- `retry_started`

The engine also calls `startSession` and `endSession` for session lifecycle alignment.

## Testing checklist

- Validate each pilot config loads with `validateConfig`.
- Verify 2–4 choice constraints are enforced.
- Verify wrong answer returns `try_again: true` until attempt limit.
- Verify hint appears after first miss.
- Verify `mastery_signal` is returned from `finalize()`.

## Current limitations

- Pilot content includes one question per skill for rapid validation.
- No built-in UI rendering layer; engine returns view/state contract only.
- Audio is a hook-only integration (`ttsHook`), not embedded TTS.
- No persistence writes; consumer must store mission outcomes.

## Follow-up tasks

- Expand per-skill content packs to full lesson missions.
- Add optional shuffled choice ordering.
- Add per-question analytics IDs aligned with adaptive runtime.
- Add a thin UI adapter for `adaptive-v2-hub.html` embedding.
