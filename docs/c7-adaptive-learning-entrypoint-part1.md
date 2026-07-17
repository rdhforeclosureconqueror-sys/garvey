# C7 Adaptive Learning Entrypoint PART 1 Result

## Authoritative source and URL contract

- Authoritative editable file: `public/gamehub/adaptive_learning.html`.
- One-way launch copy: `public/gamehub/adaptive_learning`.
- Canonical public navigation URL selected: `/gamehub/adaptive-v2-hub.html`, because current GameHub registry launch behavior already routes `adaptive_learning` to the Adaptive V2 hub while retaining `file_path` as the legacy runtime asset.
- Legacy public URL behavior: both `/gamehub/adaptive_learning.html` and `/gamehub/adaptive_learning` remain deployed-compatible static assets and are synchronized byte-for-byte. No legacy route was removed.

## Production references to adaptive learning URLs

- `public/gamehub/gamehub-registry.js`: `game_key: 'adaptive_learning'` with legacy `file_path: '/gamehub/adaptive_learning'` and active `launch_path: '/gamehub/adaptive-v2-hub.html'`. Classification: production navigation metadata.
- `public/gamehub/index.html`: renders GameHub links from `entry.launch_path || entry.file_path`, and therefore uses `/gamehub/adaptive-v2-hub.html` for `adaptive_learning` via the registry. Classification: production navigation.
- `public/gates.js`: Gates/Rite of Passage dashboard button opens `/gamehub/adaptive-v2-hub.html`, not either legacy runtime URL. Classification: production navigation.
- `server/youthDevelopmentRoutes.js`: Youth Development parent dashboard button opens `/gamehub/adaptive-v2-hub.html`, not either legacy runtime URL. Classification: production navigation.
- No server redirect or route handler explicitly references `/gamehub/adaptive_learning` or `/gamehub/adaptive_learning.html`; compatibility comes from static public file serving.

## Current flow URL usage

- Youth Development Parent Dashboard: `/gamehub/adaptive-v2-hub.html`.
- Gates / Rite of Passage: `/gamehub/adaptive-v2-hub.html`.
- Adaptive Learning hub: `/gamehub/adaptive-v2-hub.html` via `launch_path`.
- Assessment return URLs: no hard-coded adaptive runtime URL reference found; the synchronized runtime forwards contextual `return_url` only when present in runtime context during progress persistence.
- Skill World return URLs: no hard-coded adaptive runtime URL reference found; Skill World persists contextual `return_url` only when supplied by learner context.
- Continue Learning: no direct reference to either legacy runtime URL found in production code during this pass.
- Learning Journey: no direct reference to either legacy runtime URL found in production code during this pass.
- Server redirect or route handler: none found for either legacy runtime URL.

## Pre-sync behavioral differences found before synchronization

Baseline compared: commit `650b101` (`Keep youth adaptive hub in youth context`) before `fe97c6e` synchronized the two deployed runtime files.

- `program_context`: `.html` returned early from canonical Gates learner lookup when `ctx.program_context === 'youth_development'`; extensionless did not. Preserved from `.html` to prevent Youth Development launches being re-bound to Gates canonical learners.
- `source_registry`: no direct `source_registry` behavioral difference found in the pre-sync diff.
- `child_id`: extensionless attempted `/api/gates/canonical-learners` whenever neither `profile_id` nor `child_id` existed; `.html` skipped this in Youth Development context. Preserved from `.html` so Youth Development child identity remains isolated.
- `tenant`: `.html` included `tenant` in `/api/adaptive-v2/progress/checkpoint-attempt`; extensionless omitted it. Preserved from `.html` so Youth Development/TDE context reaches persistence.
- `parent_email`: `.html` included `email` from `parent_email || email`; extensionless omitted it. Preserved from `.html` so parent-owned flows can associate persisted progress context.
- `return_url`: `.html` included `return_url`; extensionless omitted it. Preserved from `.html` so launch surfaces can return learners to the correct parent/program surface.
- Youth Development versus Gates routing: `.html` suppressed Gates learner lookup and Gates signal rendering in Youth Development context; extensionless did not. Preserved from `.html` to avoid cross-program behavior.
- Assessment launch construction: no pre-sync difference; both files construct the adaptive assessment browse link as `/assessment-mvp?grade=...&subject=...`.
- Skill World launch construction: no pre-sync difference; both files construct lessons as `/skill-world/{id}` and practice as `/skill-world/{id}/drill`.
- Progress persistence: `.html` sent `program_context`, `tenant`, contextual `email`, and `return_url` with checkpoint attempts; extensionless sent only child/progress fields. Preserved from `.html` to retain richer context without changing persistence endpoint behavior.
- Continue Learning: no pre-sync diff in the compared runtime files.
- Tracking: no pre-sync diff; both retained local GameHub session adapter events and `tracking_ready: false` registry semantics outside the runtime.
- Authentication and ownership behavior: `.html` avoided Gates canonical learner re-resolution for Youth Development context; extensionless could resolve Gates canonical learners. Preserved from `.html` to reduce ownership/identity bleed risk.

## Synchronization implementation

- Exact one-way sync command: `npm run sync:adaptive-runtime`.
- Underlying command: `node scripts/gamehub/sync-adaptive-learning-runtime.mjs`.
- Direction: `public/gamehub/adaptive_learning.html` → `public/gamehub/adaptive_learning` only.
- Equality guard: `tests/gamehub/adaptive-learning-sync.test.js` reads both files and fails unless the launch copy exactly equals the authoritative `.html` source.
- Sync failure behavior: the sync script copies source to launch copy, reads both byte buffers, and throws if the buffers do not match after copy.
- Divergence failure behavior: the equality guard fails with instructions to run `npm run sync:adaptive-runtime`.
- Reverse sync: intentionally not implemented.

## Behavior retained or discarded

- Preserved from `.html`: Youth Development context isolation, contextual progress persistence fields (`program_context`, `tenant`, contextual `email`, `return_url`), and Youth Development suppression of Gates signals UI.
- Preserved from extensionless copy: deployed compatibility at `/gamehub/adaptive_learning` and all shared behavior that was identical before sync, including assessment link construction, Skill World link construction, local progress UI, local adapter events, voice runtime wiring, and fallback content behavior.
- Obsolete differences discarded: extensionless omission of contextual persistence fields and extensionless Gates learner/signals behavior in Youth Development context.

## Files changed in this pass

- `docs/c7-adaptive-learning-entrypoint-part1.md`: added this PART 1 analysis and implementation report.
- `public/gamehub/adaptive_learning`: refreshed from `public/gamehub/adaptive_learning.html` via the one-way sync command; no content difference remains.

## Focused tests

- `npm run sync:adaptive-runtime`: pass.
- `node --test tests/gamehub/adaptive-learning-sync.test.js`: 1 passed, 0 failed.
- `node --test tests/gamehub/gamehub-ux-consistency-pr33.test.js tests/gamehub/identity-cleanup.test.js tests/gamehub/prK-grade1-adaptive-v2-voice-runtime.test.js`: 15 passed, 1 failed. Failure is existing guard overreach in `tests/gamehub/identity-cleanup.test.js` matching `tracking_ready: true` in the GameHub registry/HTML corpus for `attention_signal_path_v2`, not an adaptive runtime divergence.

## Current status

- The two deployed adaptive runtime files are currently identical.
- Remaining C7 risks: existing bookmarks can still open legacy runtime URLs directly; compatibility is maintained by byte-for-byte synchronization rather than an HTTP redirect. Static serving order and CDN caching should be watched so `/gamehub/adaptive_learning` and `/gamehub/adaptive_learning.html` do not drift after deployment. Internal navigation is canonicalized to the Adaptive V2 hub, while the legacy runtime remains reachable by design.
