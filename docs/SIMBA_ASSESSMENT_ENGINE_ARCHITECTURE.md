# Simba Assessment Engine Architecture

## Phase 2 direction

Garvey is now treated as the internal assessment engine for Simba wa Ujamaa. Normal members enter and remain in the Simba Assessment Center; the underlying engine supplies catalog, scoring, result, recommendation, and reward metadata without presenting a separate member-facing brand.

## Metadata-driven catalog

The canonical catalog lives in `server/simbawajumaBridge.js` as assessment metadata. The Simba surface reads `GET /api/simbawajuma/assessments`, which returns:

- `categories`: Simba ecosystem category labels.
- `assessments`: approved assessment records with title, category, launch URL, eligibility, recommendations, and reward metadata.
- `engine`: `internal_assessment_engine`, making the infrastructure role explicit to integrators.

Frontend cards in `public/simbawajuma/assessments.html` are rendered dynamically from this endpoint. Adding a future assessment or moving it into a future category should require metadata changes only.

## Simba ecosystem categories

Current categories are:

- Leadership
- Community Economics
- Rite of Passage
- Business
- Personal Growth
- Family & Youth

Category filters are generated from metadata and the API category list. The frontend does not hardcode assessment cards.

## Recommendations contract

Each assessment owns a `recommendations` object that supplies:

- Recommended Book
- Recommended Audiobook
- Recommended Discord Channel
- Recommended Historical Facts
- Recommended Brain Game
- Recommended Swahili Lesson
- Recommended Next Assessment

`buildAssessmentCompletionPayload()` returns both structured `recommendations` and a normalized `recommended_next_steps` array so older callback consumers keep working while Simba can render richer next steps.

## Member dashboard contract

`GET /api/simbawajuma/dashboard` returns the fallback `Continue Your Journey` contract:

- assessments started
- assessments completed
- suggested next assessment
- progress percentage

When Simba passes authenticated member progress, Simba can replace or enrich this fallback without changing the assessment catalog renderer.

## Reward engine handoff

Assessment completion payloads now include a `reward` instruction object. For assessments marked `star_reward_eligible`, the payload includes Simba points, streak key, achievements, and Discord notification routing metadata. Existing external event delivery remains backward compatible through `assessment.completed` callbacks and webhook delivery.

## Backward compatibility

Existing owner/customer functionality remains in place:

- Legacy `recommended_book`, `recommended_audiobook`, `recommended_next_assessment`, and `recommended_discord_channel` fields are still exposed.
- Existing `/intake.html?assessment=business_owner` and `/intake.html?assessment=customer` paths continue to work; Simba launches add only a `surface=simba` query parameter.
- Existing transfer-token, linked-user, session, and external event delivery flows are unchanged.
