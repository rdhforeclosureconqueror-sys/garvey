# C7 Adaptive Learning Entrypoint PART 1 Report

## 1. Approved canonical and legacy roles

- Canonical public navigation URL: `/gamehub/adaptive-v2-hub.html`.
- Legacy runtime asset: `/gamehub/adaptive_learning`.
- Authoritative editable runtime source: `public/gamehub/adaptive_learning.html`.
- Synchronized runtime copy: `public/gamehub/adaptive_learning`.
- `/gamehub/adaptive_learning.html` role: authoritative source file and statically reachable compatibility asset only. It is not the approved canonical navigation URL and is not intentionally used by production navigation.

## 2. `/gamehub/adaptive_learning.html` production reference status

- Production navigation: no production navigation reference found.
- Redirect: no redirect reference found.
- Return URL: no hard-coded return URL reference found.
- Registry entry: no registry entry uses `/gamehub/adaptive_learning.html`.
- Server route: no server route serves or redirects to `/gamehub/adaptive_learning.html` explicitly.
- Direct reachability: it remains directly reachable because `public/` is statically served. That reachability is compatibility/static-serving behavior, not the intentional public navigation contract.

## 3. Every production reference to the three URLs

### `/gamehub/adaptive-v2-hub.html`

- `public/gamehub/gamehub-registry.js`: production navigation metadata for `adaptive_learning` uses `launch_path: '/gamehub/adaptive-v2-hub.html'`.
- `public/gamehub/index.html`: production GameHub index uses registry launch context or `entry.launch_path || entry.file_path`, so Adaptive Learning navigation resolves to `/gamehub/adaptive-v2-hub.html`.
- `public/gates.js`: Gates / Rite of Passage Adaptive Learning card links to `/gamehub/adaptive-v2-hub.html`.
- `server/youthDevelopmentRoutes.js`: `/youth-development/adaptive-learning` sends `public/gamehub/adaptive-v2-hub.html`.
- `public/gamehub/recognition-selection-pilot.html`: completed pilot mission CTA links back to `/gamehub/adaptive-v2-hub.html`.

### `/gamehub/adaptive_learning`

- `public/gamehub/gamehub-registry.js`: legacy `file_path: '/gamehub/adaptive_learning'` remains in metadata. Active launch navigation uses `launch_path`, not `file_path`, when available.
- No production navigation, redirect, return URL, or server route was found that directly launches `/gamehub/adaptive_learning`.
- Direct reachability remains through static serving as a legacy runtime asset.

### `/gamehub/adaptive_learning.html`

- No production navigation, redirect, return URL, registry entry, or server route was found that directly launches `/gamehub/adaptive_learning.html`.
- Direct reachability remains through static serving because the file lives under `public/`.

## 4. Youth Development flow status

- Youth Development does not launch the legacy runtime directly.
- Production Youth Development route `/youth-development/adaptive-learning` serves the canonical hub file `public/gamehub/adaptive-v2-hub.html`.
- The legacy runtime `.html` behavior preserved during synchronization still protects Youth Development context if a static legacy URL is opened directly: it does not rebind Youth Development launches through Gates canonical learner lookup.

## 5. Gates flow status and context preservation

- Gates / Rite of Passage launches the canonical hub via `/gamehub/adaptive-v2-hub.html`.
- Gates registry context is preserved by `getLaunchContextForGame`, which appends validated `gate_context`, `practice_path`, and `mode_preset` query parameters to `launch_path` when supplied.
- The Gates card in `public/gates.js` uses the canonical hub URL directly for Adaptive Learning.

## 6. Complete pre-sync behavioral differences between `.html` and extensionless runtime files

Baseline compared: commit `650b101` before the prior synchronization commit `fe97c6e`.

- `program_context`: `.html` returned early from canonical Gates learner lookup when `ctx.program_context === 'youth_development'`; extensionless did not. Preserved from `.html` to prevent Youth Development launches being rebound to Gates canonical learners.
- `source_registry`: no direct `source_registry` behavioral difference appeared in the pre-sync runtime diff.
- `child_id`: extensionless attempted `/api/gates/canonical-learners` whenever neither `profile_id` nor `child_id` existed; `.html` skipped this in Youth Development context. Preserved from `.html` so Youth Development child identity remains isolated.
- `tenant`: `.html` included `tenant` in `/api/adaptive-v2/progress/checkpoint-attempt`; extensionless omitted it. Preserved from `.html` so Youth Development/TDE context reaches persistence.
- `parent_email`: `.html` included contextual `email` from `parent_email || email`; extensionless omitted it. Preserved from `.html` so parent-owned flows can associate persisted progress context.
- `return_url`: `.html` included `return_url`; extensionless omitted it. Preserved from `.html` so launch surfaces can return learners to the correct parent/program surface.
- Youth Development versus Gates routing: `.html` suppressed Gates learner lookup and Gates signal rendering in Youth Development context; extensionless did not. Preserved from `.html` to avoid cross-program behavior.
- Assessment launch construction: no pre-sync difference; both constructed `/assessment-mvp?grade=...&subject=...`.
- Skill World launch construction: no pre-sync difference; both constructed lessons as `/skill-world/{id}` and practice as `/skill-world/{id}/drill`.
- Progress persistence: `.html` sent `program_context`, `tenant`, contextual `email`, and `return_url` with checkpoint attempts; extensionless sent only child/progress fields. Preserved from `.html` to retain richer context without changing endpoint behavior.
- Continue Learning: no pre-sync diff in the compared runtime files.
- Learning Journey: no pre-sync diff in the compared runtime files.
- Tracking: no pre-sync diff; both retained local GameHub session adapter events and registry-level `tracking_ready: false` semantics for adaptive learning.
- Authentication and ownership behavior: `.html` avoided Gates canonical learner re-resolution for Youth Development context; extensionless could resolve Gates canonical learners. Preserved from `.html` to reduce ownership/identity bleed risk.

## 7. Exact one-way sync command

- Package script: `npm run sync:adaptive-runtime`.
- Underlying command: `node scripts/gamehub/sync-adaptive-learning-runtime.mjs`.
- Direction: `public/gamehub/adaptive_learning.html` → `public/gamehub/adaptive_learning` only.
- Reverse sync: intentionally not implemented.

## 8. Equality guard implementation

- Sync script copies `public/gamehub/adaptive_learning.html` to `public/gamehub/adaptive_learning`, reads both byte buffers, and throws if they do not match after copy.
- Guard test `tests/gamehub/adaptive-learning-sync.test.js` reads both files and fails unless the launch copy exactly equals the authoritative `.html` source.
- Guard failure message tells maintainers to run `npm run sync:adaptive-runtime`.

## 9. Current identity of runtime files

- `public/gamehub/adaptive_learning.html` and `public/gamehub/adaptive_learning` are currently byte-for-byte identical.

## 10. Focused test commands and results

- `npm run sync:adaptive-runtime`: passed.
- `node --test tests/gamehub/adaptive-learning-sync.test.js`: passed, 1 subtest passed and 0 failed.
- `node --test tests/gamehub/gamehub-ux-consistency-pr33.test.js tests/gamehub/identity-cleanup.test.js tests/gamehub/prK-grade1-adaptive-v2-voice-runtime.test.js`: 15 subtests passed and 1 failed. The failure is in `tests/gamehub/identity-cleanup.test.js`, where the guard matches `tracking_ready: true` in the broader GameHub registry/HTML corpus for a non-adaptive entry. It is not an adaptive runtime divergence.

## 11. Commit and PR status

- Commit: recorded in git history for this PART 1 report update.
- PR title: `Document C7 adaptive learning entrypoint synchronization`.
- PR URL: unavailable from the local `make_pr` metadata tool response.

## 12. Remaining C7 risks

- `/gamehub/adaptive_learning.html` remains directly reachable via static serving even though it is not production navigation.
- `/gamehub/adaptive_learning` remains directly reachable as a legacy runtime asset.
- Compatibility is maintained by deterministic byte-for-byte synchronization rather than an HTTP redirect.
- CDN/static asset caching must not serve divergent versions of the two runtime files.
- Future edits must continue to happen only in `public/gamehub/adaptive_learning.html`, followed by the one-way sync and equality guard.
