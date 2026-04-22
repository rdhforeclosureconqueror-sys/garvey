# Assessment Voice Rollout (April 22, 2026)

## Assessment inventory for voice rollout

| Surface | Route/Page | Assessment type | Audience | Read-aloud scope | Existing wiring before this pass |
|---|---|---|---|---|---|
| Youth intake dashboard | `/youth-development/intake` | Youth parent intake + dashboard | Parent/customer-facing | instructions, strengths, growth/support cards, weekly support/program sections | ✅ Existing TDE voice controls + `/api/youth-development/tde/voice/sections/:childId` |
| Youth program page | `/youth-development/program` | Youth weekly execution | Parent/customer-facing | weekly goals, support, progress summary | ✅ Existing TDE voice controls + section-scoped actions |
| Core intake assessment | `/intake.html` | Business owner + customer archetype intake | Parent/customer-facing (customer/owner) | question prompt cards, result summary | ⚠️ No provider-backed read-aloud wiring before this pass |
| Archetype engine assessment | `/archetype-engines/:engine/assessment` | Love/Leadership/Loyalty assessment flow | Customer-facing | consent/instructions + question prompt cards | ⚠️ No voice endpoint wiring before this pass |
| Archetype result pages | `/archetype-engines/:engine/result/:resultId` | Love/Leadership/Loyalty result interpretation | Customer-facing | summary, strengths/growth/support sections, recommendation/action-plan sections | ⚠️ No voice endpoint wiring before this pass |
| Archetype story page | `/archetype-engines/:engine/result/:resultId/story` | Love story output | Customer-facing | slide card text (future dedicated per-slide controls) | ❌ Gap remains (see gaps section) |

## Shared rollout pattern added

1. **Content registration**
   - All new assessment voice requests register section metadata through `registerVoiceReadableContentBlock(...)` before synthesis.
   - Required metadata: `surface`, `scope_id`, `section_key`, `section_label`, `voice_text`.

2. **Voice-ready metadata contract**
   - Endpoint returns: `section_key`, `voice_chunk_id`, `provider_status`, `provider_ready`, `voice_mode`, `fallback_reason`, `playable_text`, `audio_url|asset_ref`.

3. **Endpoint selection**
   - Shared route for non-youth assessments: `POST /api/assessment/voice/section`.
   - Shared config route: `GET /api/assessment/voice/config`.
   - Shared asset resolution route: `GET /api/assessment/voice/assets/resolve`.

4. **Provider-vs-fallback selection logic**
   - Prefer provider audio when `provider_status=available` and `audio_url|asset_ref` is present.
   - Use browser fallback only when provider payload is not playable.
   - Fallback is explicitly labeled `fallback_browser_speech`; never presented as provider audio.

5. **Visible controls + playback status behavior**
   - Shared UI control bar (`Listen`, `Pause`, `«10s`, `10s»`) rendered by `public/js/assessment-voice.js`.
   - Status labels explicitly distinguish:
     - `AI voice ready (OpenAI/provider audio available).`
     - `AI voice unavailable, using fallback browser speech.`
     - fallback seek limitation messaging.

## Endpoint/route trace by rolled-out surface

### `/intake.html`
- Endpoint: `POST /api/assessment/voice/section`
- Scope IDs: `${tenant}:${assessmentType}`
- Section keys used:
  - `question_prompt`
  - `result_summary`
- Provider readiness: from response fields `provider_ready` + `voice_mode`.

### `/archetype-engines/:engine/assessment`
- Endpoint: `POST /api/assessment/voice/section`
- Scope IDs: `${engine}:${assessmentId}`
- Section keys used:
  - `assessment_instructions`
  - `question_prompt`
- Provider readiness: from response fields `provider_ready` + `voice_mode`.

### `/archetype-engines/:engine/result/:resultId`
- Endpoint: `POST /api/assessment/voice/section`
- Scope IDs: `${engine}:${resultId}`
- Section keys used:
  - `result_summary`
  - `strengths_growth_support`
  - `recommendations_action_plan`
- Provider readiness: from response fields `provider_ready` + `voice_mode`.

## Provider/fallback rules

- Provider-preferred mode is default.
- Fallback is a visible operational mode, not hidden behavior.
- Browser fallback seek controls are flagged with capability limitations.
- Existing youth routes/contracts remain intact and unchanged.

## Remaining rollout gaps

1. **Love story view (`.../story`)** lacks dedicated per-slide voice controls and section registration.
2. **Internal/admin assessment-like pages** (operator dashboards) are intentionally excluded for now.
3. **Asset-ref resolution path** exists but client currently prioritizes direct `audio_url`; deferred UX refinement can add automatic `asset_ref` resolution.
