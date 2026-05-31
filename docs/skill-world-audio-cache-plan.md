# Skill World audio cache and AI voice investigation

## Current repository voice pathway

The repo already contains an AI/provider voice pathway for assessment and youth-development surfaces, but it is not yet a durable Skill World audio-cache service.

### Existing assessment route

- Route: `POST /api/assessment/voice/section` in `server/assessmentVoiceRoutes.js`.
- Upstream provider call: `POST {VOICE_REPO_BASE_URL}/speak` (or `VOICE_GATEWAY_BASE_URL`) with JSON.
- Request shape used by the route:
  - `text_content` or `voice_text` (required readable text)
  - `voice` (optional)
  - `format` (optional)
  - `speed` (optional)
  - `pitch` (optional)
  - `surface`, `scope_id`, `section_key`, `section_label`, and `voice_chunk_id` metadata
- Response shape:
  - `ok`
  - `provider_status`
  - `provider_ready`
  - `voice_mode`: `provider_audio` or `fallback_browser_speech`
  - `playable_text`
  - `audio_url`: `/api/assessment/voice/stream/:token` when provider audio is available, otherwise `null`
  - `fallback_reason`
  - `readable_without_voice: true`
- Stream route: `GET /api/assessment/voice/stream/:token` returns raw cached audio bytes from memory.
- Required env vars:
  - `VOICE_REPO_BASE_URL` or `VOICE_GATEWAY_BASE_URL`
  - Optional: `VOICE_GATEWAY_TIMEOUT_MS`
- Production safety for Skill World: **not sufficient as-is** for generated curriculum narration because the cache is in-memory, short-lived, and token-based. It avoids exposing provider secrets to the browser, but it does not persist generated files by `cache_key` or text hash.

### Existing youth-development adapter

- Function: `createVoiceProviderAdapter(...).synthesizeReportSection(...)` in `youth-development/tde/voiceProviderAdapter.js`.
- Upstream provider call: `POST {VOICE_REPO_BASE_URL or VOICE_GATEWAY_BASE_URL}/speak`.
- Request shape expected by the adapter:
  - `voice_text` or `text_content`
  - `voice` (optional)
  - metadata such as `voice_chunk_id` / `chunk_index`
- Response shape:
  - `ok`
  - `status`
  - `provider_status`
  - `playable_text`
  - `audio_url` as a `data:audio/...;base64,...` URL when ready
  - `asset_ref`
  - `replay_token`
  - diagnostics
- Required env vars:
  - `VOICE_REPO_BASE_URL` or `VOICE_GATEWAY_BASE_URL`
  - Optional: `VOICE_GATEWAY_TOKEN`, `VOICE_GATEWAY_TIMEOUT_MS`, `VOICE_GATEWAY_MODE`
- Production safety for Skill World: useful as a provider adapter, but it returns data URLs and does not provide durable Skill World file storage or a cache-key contract.

## Recommended Skill World endpoint

Add a dedicated route only after a durable storage target is chosen.

`POST /api/skill-world/audio`

Request:

```json
{
  "text": "Which card shows uppercase letter S?",
  "voice": "child_friendly",
  "cache_key": "skill-world:G1E_RF_001:question:abc123"
}
```

Behavior:

1. Validate and trim `text`; reject empty text.
2. Sanitize `cache_key` to a restricted filename-safe form, or compute a SHA-256 hash from `{ text, voice }` when no key is provided.
3. Check durable storage first, for example `public/generated-audio/skill-world/<safe-cache-key-or-hash>.mp3` or object storage/CDN with the same logical key.
4. If cached audio exists, return its `audio_url` without calling the provider.
5. If missing, call the existing upstream `/speak` pathway once, save the raw audio bytes, and return the saved `audio_url`.
6. Never expose `VOICE_REPO_BASE_URL`, `VOICE_GATEWAY_TOKEN`, or provider keys to the browser.
7. Return browser-speech fallback metadata instead of failing the learning flow when the provider is unavailable.

Response when cached or generated:

```json
{
  "ok": true,
  "audio_url": "/generated-audio/skill-world/skill-world-G1E_RF_001-question-abc123.mp3",
  "cache_key": "skill-world:G1E_RF_001:question:abc123",
  "voice": "child_friendly",
  "provider_status": "cached"
}
```

Response when provider audio is unavailable:

```json
{
  "ok": true,
  "audio_url": null,
  "cache_key": "skill-world:G1E_RF_001:question:abc123",
  "voice": "child_friendly",
  "provider_status": "provider_unavailable",
  "voice_mode": "fallback_browser_speech",
  "readable_without_voice": true
}
```

## Runtime package contract now supported

Skill World packages may include optional cached-audio metadata on `audio`, `page_audio`, and `question_audio` blocks:

```json
{
  "audio": {
    "text": "Which card shows uppercase letter S?",
    "label": "Read Question",
    "type": "question",
    "repeat_count": 1,
    "voice": "child_friendly",
    "audio_url": "/generated-audio/skill-world/hash.mp3",
    "cache_key": "skill-world:G1E_RF_001:question:abc123",
    "playback_preference": "cached_audio_first"
  }
}
```

The fields are optional. Packages render without generated audio, and the runtime falls back to browser speech if a saved audio file is missing or fails to play.
