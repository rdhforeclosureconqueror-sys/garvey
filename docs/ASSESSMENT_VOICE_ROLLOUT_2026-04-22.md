# Assessment Voice Rollout (April 22, 2026)

## Upstream voice repo contract (source of truth)

Canonical upstream TTS endpoint:
- `POST /speak`

Required request:
- `content-type: application/json`
- body: `{ text, voice?, format?, speed?, pitch? }`

Required response:
- raw audio bytes
- `content-type: audio/mpeg` or `audio/wav`
- not JSON

No route-specific auth is required for `/speak`.

## Main repo integration contract (after this pass)

- Main route: `POST /api/assessment/voice/section`
  - Registers section-readable text with `registerVoiceReadableContentBlock(...)`.
  - Calls upstream voice repo `POST {VOICE_REPO_BASE_URL}/speak` with the canonical JSON body.
  - Never calls `/` or `/tts` for TTS synthesis.
- Stream route: `GET /api/assessment/voice/stream/:token`
  - Forwards cached upstream audio bytes as raw bytes.
  - Preserves upstream audio content-type.
  - Used by frontend `<audio>` playback (`new Audio(audio_url)`).
- Config route: `GET /api/assessment/voice/config`
  - Reports provider readiness and upstream contract metadata.

## Voice surface scope (intentionally narrowed)

Voice remains enabled for section-level summary/result/card-like surfaces where latency is acceptable:
- `/intake.html`
  - `section_key: result_summary`
- `/archetype-engines/:engine/result/:resultId`
  - `section_key: result_summary`
  - `section_key: strengths_growth_support`
  - `section_key: recommendations_action_plan`

Voice is intentionally deprioritized for question-by-question assessment flow in this pass:
- `/intake.html` question prompt playback removed.
- `/archetype-engines/:engine/assessment` consent/question prompt playback removed.

## Provider vs fallback behavior

- Provider-backed audio is preferred whenever `/speak` succeeds with valid audio bytes.
- Fallback mode (`fallback_browser_speech`) is used only when upstream/provider audio is unavailable.
- Fallback state remains explicitly labeled in UI status text; it is not treated as proof of OpenAI/provider connectivity.
- Text remains readable regardless of voice provider availability.
