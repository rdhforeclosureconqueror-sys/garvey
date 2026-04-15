# Archetype Engines (Isolated Additive Module)

This module is intentionally isolated from VOC, Return Engine, Tap CRM, rewards loop, intake/results flow, and existing assessment APIs.

## Engines
- love (live assessment + authored-first / governed-retake source policy)
- leadership (live assessment + canonical scoring + governed-retake source policy)
- loyalty (live assessment + canonical scoring + governed-retake source policy)

## API namespace
`/api/archetype-engines/*`

## Storage isolation
- `engine_assessments`
- `engine_results`
- `engine_compatibility_results`
- `engine_page_views`
