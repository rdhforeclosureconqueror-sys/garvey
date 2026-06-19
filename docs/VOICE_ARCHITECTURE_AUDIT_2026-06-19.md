# Garvey Repository-Wide AI Voice Architecture Audit

Date: 2026-06-19

## Standard selected

The repository standard should be the shared assessment voice pipeline backed by the Skill World/OpenAI voice provider:

`public/js/assessment-voice.js` → `POST /api/assessment/voice/section` → `server/assessmentVoiceRoutes.js` → configured `/speak` upstream → `GET /api/assessment/voice/stream/:token` → `new Audio(audio_url)` → browser speech only as an explicit fallback.

This is the only implementation that provides reusable controls, text registration, provider diagnostics, token forwarding, cached stream tokens, seekable provider audio, and browser-speech fallback without labeling fallback as AI audio.

## Working Adaptive V2 dependency map

1. User presses an Adaptive V2 voice action such as **Listen to lesson**, **Listen to example**, or **Listen to hint** in `public/gamehub/adaptive_learning.html`.
2. The click handler calls `speakGrade1Section(sectionKey, selected, currentQ)`.
3. `getGrade1VoiceSectionText()` prepares short, Grade 1-safe text from lesson snippets, worked examples, or hints.
4. The client posts the prepared text to `POST /api/assessment/voice/section` with `surface: "adaptive_v2"`, `scope_id: "grade1_adaptive_v2"`, section metadata, voice, format, speed, and `voice_ready: true`.
5. `server/index.js` mounts `createAssessmentVoiceRouter()` at `/api/assessment/voice`.
6. `server/assessmentVoiceRoutes.js` registers readable content through `registerVoiceReadableContentBlock()` from `youth-development/tde/voiceContentRegistry.js`.
7. `server/assessmentVoiceRoutes.js` chooses the upstream base URL from `ASSESSMENT_TTS_URL`, `SKILL_WORLD_TTS_URL`, `VOICE_REPO_BASE_URL`, `VOICE_GATEWAY_BASE_URL`, or the default Skill World provider URL.
8. Authentication is forwarded as `x-internal-token` from `ASSESSMENT_TTS_TOKEN`, `SKILL_WORLD_TTS_TOKEN`, or `VOICE_GATEWAY_TOKEN`.
9. The router calls upstream `POST /speak` with text, voice, format, speed, and pitch.
10. If upstream returns audio bytes, the router stores them in an in-memory stream cache and returns `voice_mode: "provider_audio"` plus `/api/assessment/voice/stream/:token`.
11. The browser plays the returned stream with `new Audio(audio_url)`.
12. If provider audio is unavailable, missing, unauthenticated, non-audio, empty, or fails playback, the browser falls back to `speechSynthesis` using the sanitized `playable_text`.
13. Stop controls pause active provider audio and cancel `speechSynthesis`.

## Gap report

| Working module | Voice component | Non-standard module | Missing piece | Recommendation |
| --- | --- | --- | --- | --- |
| Adaptive V2 Grade 1 | Shared `/api/assessment/voice/section` provider-audio-first path | Older Adaptive V2 fallback route `/api/adaptive-v2/voice/sections` | Returned browser fallback only | Keep route for compatibility, but clients should call shared assessment voice. |
| Skill World | Generated lesson/practice audio buttons | Previous `/api/skill-world/audio` client call | Bypassed shared voice diagnostics and stream endpoint | Client now uses `/api/assessment/voice/section`; leave old route as compatibility/cache fallback only. |
| Assessment result pages | `window.AssessmentVoice.createController()` | Youth Assessment Dashboard / Youth Rite of Passage | Custom `/api/youth-development/voice/*` routes and direct browser fallback | Migrate UI controls to `public/js/assessment-voice.js` and/or make youth routes delegate to `createAssessmentVoiceRouter`. |
| Business Owner Results | `public/js/assessment-voice.js` | Any stale owner pages not loading results shell | Potential missing shared controller | Use `results_owner.html` binding pattern everywhere. |
| Voice of Customer Results | `public/js/assessment-voice.js` | Any stale customer/VOC pages not loading results shell | Potential missing shared controller | Use `results_customer.html` binding pattern everywhere. |
| Love / Leadership / Loyalty Results | `public/js/assessment-voice.js` via archetype engine experience | Any generated result surfaces bypassing experience.js | Potential missing warmup/section binding | Standardize generated result pages on `experience.js` voice binding. |
| Archetype Story Pages | Should use shared section endpoint | `public/archetype.html`, `public/customer_archetype.html`, `public/owner_archetype.html` | No shared voice controller binding found | Add `assessment-voice.js` and bind readable story/profile sections. |

## Files requiring migration or follow-up

Already migrated in this pass:

- `public/gamehub/adaptive_learning.html`
- `public/gamehub/adaptive_learning`
- `public/gamehub/skill-world/index.html`

Still requiring follow-up migration:

- `server/youthDevelopmentRoutes.js`
- `public/youth-development.html`
- `public/archetype.html`
- `public/customer_archetype.html`
- `public/owner_archetype.html`
- Any future generated assessment result page that does not load `/js/assessment-voice.js`

## Recommended refactor plan

1. Treat `public/js/assessment-voice.js` and `server/assessmentVoiceRoutes.js` as the canonical Garvey voice runtime.
2. Keep `/api/skill-world/audio` and `/api/adaptive-v2/voice/sections` only as backwards-compatible routes while removing new client dependencies on them.
3. Add a small server helper exported from `assessmentVoiceRoutes.js` if youth routes need route-level compatibility while sharing synthesis logic.
4. Replace youth dashboard/Rite of Passage direct speech controls with `AssessmentVoice.createController()` bindings.
5. Add shared voice controls to archetype story/profile pages.
6. Add regression tests that fail when new result pages use `speechSynthesis` directly without first attempting `/api/assessment/voice/section`.

## Environment variables

- `ASSESSMENT_TTS_URL`
- `ASSESSMENT_TTS_TOKEN`
- `SKILL_WORLD_TTS_URL`
- `SKILL_WORLD_TTS_TOKEN`
- `VOICE_REPO_BASE_URL`
- `VOICE_GATEWAY_BASE_URL`
- `VOICE_GATEWAY_TOKEN`

