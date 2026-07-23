# G2M_GM_001 — Shapes, Arrays, and Partitioning Publication Review

## Executive Summary

**Publication decision: blocked by shared infrastructure.** This audit restarted at the first canonical activity and treated no earlier curriculum finding as valid. The repaired production `shape_identification` renderer passed its package-specific answer-safety regression. Review then proceeded in canonical order through all 20 activities in Levels 1 and 2 and the first seven activities in Level 3. Rendering `G2M_GM_001_LVL3_Q7` exposed a different reusable defect in the production `partition_shapes` renderer: the visible model is correctly marked and drawn as unequal, while its accessible label falsely says the parts are equal.

The conflict changes the mathematical fact presented to a screen-reader learner and undermines the assessed distinction between equal and unequal shares. Under the required fail-closed rule, the audit stopped immediately at activity 27 of 50. No curriculum JSON or shared infrastructure was modified. This document and a package-specific failing regression are the only audit changes.

## Educational Review

The audit reviewed Levels 1 and 2 completely and reached `G2M_GM_001_LVL3_Q7` in Level 3. The reviewed sequence moves from naming common two- and three-dimensional figures to reasoning about defining attributes and then equal shares. The reviewed mathematics and answer keys are correct. Prompts use generally appropriate Grade 2 vocabulary.

Several curriculum-quality opportunities were observed—including generic hint ladders and terse explanations—but they were not finalized or edited because the shared infrastructure blocker requires an immediate stop. Activities 28–50, full progression, duplication, and Mixed transfer are not certified.

## Mathematical Review

Authored answers through `G2M_GM_001_LVL3_Q7` were recomputed and found mathematically correct. In the blocking activity, three regions are not thirds when one region is larger because thirds must be equal shares; the authored answer `no` and `equal: false` are correct.

The production rendering is mathematically inconsistent across modalities. Its visible class is `shares-3 unequal`, but its `aria-label` describes “1 of 3 equal parts shaded.” A learner using the accessible name therefore receives a false statement that directly contradicts both the visual and the concept under assessment.

## Visual Review

All production visuals for the first 27 canonical activities were rendered through the production visual registry. Activities 1–20 selected the repaired `shape_identification` renderer without fallback, placeholder output, or shape-name answer leakage. The first six partition activities selected `partition_shapes` and represented their authored equal shares consistently.

`G2M_GM_001_LVL3_Q7` also selects `partition_shapes` and visibly renders an unequal three-part rectangle. However, the shared renderer's accessible label is hard-coded to describe the shaded regions as equal. Because this behavior belongs to a reusable renderer rather than package-authored prose, it is a shared infrastructure defect and must be repaired in a dedicated infrastructure PR.

## Accessibility Review

The reviewed activities include `question_audio` with the label `Read Question`, type `question`, cached-audio-first preference, and text matching each prompt. The repaired shape renderer provides answer-safe accessible naming for the reviewed shape activities.

Accessibility certification fails at `G2M_GM_001_LVL3_Q7`. Sighted learners receive unequal regions, while screen-reader learners are told the regions are equal. This is neither equivalent access nor mathematically safe alternative text. Review of the remaining 23 activities and their Read Question audio stopped as required.

## Mixed Review

The Mixed bank exists with ten canonical activities, but it was not reached after the reusable infrastructure defect triggered the immediate-stop rule. Mixed transfer, duplication against focused banks, answer safety, visuals, accessibility, and audio are not certified.

## Curriculum Changes

None. The package JSON was deliberately left unchanged. Potential prompt, hint, explanation, progression, and duplication improvements remain unimplemented until the shared renderer is repaired and the package audit can restart from the beginning.

## Regression Tests

The package-specific regression retains guards for exact package identity, five canonical ten-item banks, 50 unique matching IDs, production schema validity, and repaired shape-identification answer safety. A new focused assertion renders `G2M_GM_001_LVL3_Q7` through the production visual registry, confirms the intended visibly unequal model, rejects an accessible label that calls the regions equal, and requires the accessible label to identify the inequality.

The new assertion is intentionally red. It is scoped to this package and provides a reproducible handoff for a dedicated shared-infrastructure PR.

## Validation Results

- `node --test tests/gamehub/skill-world/g2m-gm-001-content-quality.test.js` — expected failure only in the new unequal-partition accessibility regression.
- `npm run validate:curriculum-index` — package/index validation remains green.
- `git diff --check` — patch formatting remains green.

## Files Modified

- `docs/curriculum-reviews/g2m-gm-001-review.md` — replaces the resolved shape-renderer blocker report with the newly discovered unequal-partition accessibility blocker and exact stop scope.
- `tests/gamehub/skill-world/g2m-gm-001-content-quality.test.js` — adds the package-specific failing regression for the shared `partition_shapes` defect.

## Commit SHA

Reported in the final delivery because a commit cannot contain its own immutable SHA.

## Dedicated Infrastructure PR Handoff

Repair the reusable production `partition_shapes` renderer so its accessible description distinguishes equal from unequal partitions using the authored `equal` state. The dedicated infrastructure change should preserve the visible unequal rendering, avoid embedding an assessed response beyond describing the visual faithfully, and make this package regression pass. After that repair merges, restart the complete `G2M_GM_001` publication audit from activity 1.
