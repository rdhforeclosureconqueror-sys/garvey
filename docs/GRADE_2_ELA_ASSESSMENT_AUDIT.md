# Grade 2 ELA Assessment Audit

## Root cause

Grade 2 ELA reading-comprehension package questions stored passages in package fields such as `passage`, but the shared assessment selector only knew how to convert Grade 1 English stimulus models into the public `payload.stimulus` contract. The learner UI also rendered the prompt before stimulus. This meant passage-dependent Grade 2 questions could reach learners without visible supporting text.

## Sources located

- Grade 2 ELA content source: `public/gamehub/skill-world/content/G2E_*.skill-package.v1.json`, loaded from `public/gamehub/skill-world/content/manifest.json`.
- Package loading: `assessment-mvp/loadSkillPackages.js`.
- Question selection/API item contract/stimulus validation: `assessment-mvp/selectAssessmentItems.js`.
- Baseline assessment generation and pool sufficiency validation: `assessment-mvp/createAssessmentSession.js`.
- API route/store paths: `server/assessmentMvpRoutes.js` and `server/assessmentMvpStore.js`.
- Frontend question and stimulus rendering: `public/assessment-mvp/app.js`.
- Production data note: repository runtime loads the manifest JSON packages; no separate DB-only Grade 2 ELA bank was found in repo code. If production overrides package JSON in a database or deployed asset bucket, export and diff that source against this audit.

## Summary counts

- Total Grade 2 ELA source records audited: 603
- Learner-facing passing records after validation: 339
- Missing-passage/text records removed from learner-facing pool: 38
- Rendering failures blocked before learner delivery: 38
- Incorrect/ambiguous answer-key records blocked before learner delivery: 13
- Duplicate/invalid-choice records blocked before learner delivery: 11
- Records requiring human curriculum review before future activation: 190

## Counts by skill/category

- Fluency: 62
- Reading Comprehension: 168
- Reading Foundations / Vocabulary: 62
- Reading Foundations: 63
- Vocabulary: 62
- Writing / Composition: 186

## Per-question machine-readable table

| Question ID | Category | Status | Missing dependency | Answer validation | Exact issue | Proposed correction |
|---|---|---|---|---|---|---|
| G2E_FL_001_LVL1_Q01 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q02 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q03 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q04 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q05 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q06 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q07 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q07 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q08 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q08 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q09 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q09 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q10 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL1_Q10 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q01 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q01 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q02 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q02 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q03 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q03 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q04 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q04 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q05 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q05 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q06 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q06 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q07 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q07 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q08 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q08 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q09 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL2_Q10 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q01 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q02 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q03 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q04 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q05 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q06 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q07 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q08 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q09 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL3_Q10 | Fluency | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_FL_001_LVL4_Q01 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q02 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q03 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q04 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q05 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q06 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q07 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q08 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q09 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_LVL4_Q10 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_MIXED_Q01 | Fluency | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_FL_001_MIXED_Q02 | Fluency | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_FL_001_MIXED_Q03 | Fluency | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_FL_001_MIXED_Q04 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_MIXED_Q05 | Fluency | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_FL_001_MIXED_Q06 | Fluency | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_FL_001_MIXED_Q07 | Fluency | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_FL_001_MIXED_Q08 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_FL_001_MIXED_Q09 | Fluency | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_FL_001_MIXED_Q10 | Fluency | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RC_001_LVL1_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q07 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q08 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q09 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL1_Q10 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q07 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q08 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q09 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL2_Q10 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL3_Q01 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q02 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q03 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q04 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q05 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL3_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL4_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL4_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL4_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL4_Q04 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL4_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL4_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL4_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_LVL4_Q08 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL4_Q09 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_001_LVL4_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_MIXED_Q01 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_001_MIXED_Q02 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_001_MIXED_Q03 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_001_MIXED_Q04 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_001_MIXED_Q05 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_MIXED_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_MIXED_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_001_MIXED_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_001_MIXED_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_001_MIXED_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_LVL1_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q07 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q08 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q09 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL1_Q10 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q07 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q08 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q09 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL2_Q10 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL3_Q01 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q02 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q03 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q04 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q05 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q06 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q07 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q08 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q09 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL3_Q10 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_LVL4_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL4_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL4_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL4_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL4_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_002_LVL4_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_LVL4_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_LVL4_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_LVL4_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_LVL4_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_MIXED_Q01 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_MIXED_Q02 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_MIXED_Q03 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_MIXED_Q04 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_MIXED_Q05 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_MIXED_Q06 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_MIXED_Q07 | Reading Comprehension | fail | none | fail | Correct answer absent from choices; excluded from learner-facing pool. | Repair answer key before activation. |
| G2E_RC_002_MIXED_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_MIXED_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_002_MIXED_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL1_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL1_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL1_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL1_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL1_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL1_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL1_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL1_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL1_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL1_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL2_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL2_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL2_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL2_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL2_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL2_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL2_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL3_Q01 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_003_LVL3_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL3_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL3_Q04 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_003_LVL3_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL3_Q06 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL3_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_003_LVL3_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL3_Q09 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL3_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_003_LVL4_Q01 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL4_Q02 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL4_Q03 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL4_Q04 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL4_Q05 | Reading Comprehension | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RC_003_LVL4_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL4_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL4_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL4_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_LVL4_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q01 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q02 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q03 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q04 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q05 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RC_003_MIXED_Q06 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q07 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q08 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q09 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RC_003_MIXED_Q10 | Reading Comprehension | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_001_LVL1_Q01 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL1_Q02 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL1_Q03 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL1_Q04 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL1_Q05 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type; duplicate source question ID | Human review before future activation. |
| G2E_RF_001_LVL1_Q05 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type; duplicate source question ID | Human review before future activation. |
| G2E_RF_001_LVL1_Q06 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL1_Q07 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL1_Q08 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL1_Q09 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL1_Q10 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL2_Q01 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL2_Q02 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL2_Q03 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL2_Q04 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL2_Q05 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL2_Q05 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL2_Q06 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL2_Q07 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL2_Q08 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL2_Q09 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL2_Q10 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL3_Q01 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL3_Q02 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL3_Q03 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL3_Q04 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL3_Q05 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL3_Q05 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL3_Q06 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL3_Q07 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL3_Q08 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL3_Q09 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_LVL3_Q10 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL4_Q01 | Reading Foundations | pass | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | No further correction needed. |
| G2E_RF_001_LVL4_Q02 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_LVL4_Q03 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL4_Q04 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_LVL4_Q05 | Reading Foundations | pass | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | No further correction needed. |
| G2E_RF_001_LVL4_Q05 | Reading Foundations | pass | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | No further correction needed. |
| G2E_RF_001_LVL4_Q06 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_LVL4_Q07 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_LVL4_Q08 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_LVL4_Q09 | Reading Foundations | pass | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | No further correction needed. |
| G2E_RF_001_LVL4_Q10 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_MIXED_Q01 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q01 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q02 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_MIXED_Q02 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_MIXED_Q03 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_MIXED_Q03 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_MIXED_Q04 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q04 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q05 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q05 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q05 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q06 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_MIXED_Q06 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_MIXED_Q07 | Reading Foundations | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_RF_001_MIXED_Q08 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q09 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_001_MIXED_Q10 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_MIXED_Q11 | Reading Foundations | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_001_MIXED_Q12 | Reading Foundations | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q01 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q02 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q03 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q04 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q05 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q06 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q07 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q07 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q08 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q08 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q09 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q09 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q10 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL1_Q10 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q01 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q01 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q02 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q02 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q03 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q03 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q04 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q04 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q05 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q05 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q06 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q06 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q07 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q07 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q08 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q08 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q09 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL2_Q10 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q01 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q02 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q03 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q04 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q05 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q06 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q07 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q08 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q09 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL3_Q10 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL4_Q01 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL4_Q02 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_002_LVL4_Q03 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_002_LVL4_Q04 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL4_Q05 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_002_LVL4_Q06 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_002_LVL4_Q07 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_LVL4_Q08 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_002_LVL4_Q09 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_002_LVL4_Q10 | Reading Foundations / Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_RF_002_MIXED_Q01 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q02 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q03 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q04 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q05 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q06 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q07 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q08 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_RF_002_MIXED_Q09 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_RF_002_MIXED_Q10 | Reading Foundations / Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_LVL1_Q01 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q02 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_VOC_001_LVL1_Q03 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q04 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q05 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q06 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q07 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q07 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q08 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q08 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q09 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q09 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q10 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL1_Q10 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q01 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q01 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q02 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q02 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q03 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q03 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q04 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q04 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q05 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q05 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q06 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q06 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q07 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q07 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q08 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q08 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q09 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL2_Q10 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q01 | Vocabulary | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_VOC_001_LVL3_Q02 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q03 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q04 | Vocabulary | fail | none | pass | Duplicate or incomplete answer choices; excluded from learner-facing pool. | Repair choices before activation. |
| G2E_VOC_001_LVL3_Q05 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q06 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q07 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q08 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q09 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL3_Q10 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL4_Q01 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_VOC_001_LVL4_Q02 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL4_Q03 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL4_Q04 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_VOC_001_LVL4_Q05 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL4_Q06 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL4_Q07 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_VOC_001_LVL4_Q08 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL4_Q09 | Vocabulary | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_VOC_001_LVL4_Q10 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_VOC_001_MIXED_Q01 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q02 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q03 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q04 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_VOC_001_MIXED_Q05 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q06 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q07 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q08 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q09 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_VOC_001_MIXED_Q10 | Vocabulary | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL1_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q03 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL1_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL2_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL2_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL2_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL2_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_001_LVL2_Q03 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q03 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q04 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q04 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q06 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q07 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q08 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q09 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL2_Q10 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_LVL3_Q01 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q02 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q03 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q04 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q05 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q06 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q07 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q08 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q09 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL3_Q10 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q01 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q02 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q03 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q04 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q05 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q06 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q07 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q08 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q09 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_LVL4_Q10 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_MIXED_Q01 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_001_MIXED_Q02 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_MIXED_Q03 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_MIXED_Q04 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_MIXED_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_001_MIXED_Q06 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_001_MIXED_Q07 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_MIXED_Q08 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_001_MIXED_Q09 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_001_MIXED_Q10 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL1_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q03 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL1_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q03 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q03 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL2_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_LVL3_Q01 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q02 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q03 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q04 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q06 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q07 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q08 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q09 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL3_Q10 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_LVL4_Q01 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q02 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q03 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q04 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q05 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q06 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q07 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q08 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q09 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_LVL4_Q10 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_MIXED_Q01 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_002_MIXED_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_002_MIXED_Q03 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_MIXED_Q04 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_MIXED_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_002_MIXED_Q06 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_002_MIXED_Q07 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_002_MIXED_Q08 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_002_MIXED_Q09 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_002_MIXED_Q10 | Writing / Composition | fail | passage/text | pass | References passage/story/text/paragraph but lacks supporting body; excluded from learner-facing pool. | Add complete stimulus or keep excluded. |
| G2E_WR_003_LVL1_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q03 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL1_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q01 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q03 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q03 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q04 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q05 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q06 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q07 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q08 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q09 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL2_Q10 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_LVL3_Q01 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q02 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q03 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q04 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q06 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q07 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q08 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q09 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL3_Q10 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q01 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q02 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q03 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q04 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q06 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q07 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q08 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q09 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_LVL4_Q10 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_MIXED_Q01 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_003_MIXED_Q02 | Writing / Composition | pass | none | pass | Deliverable learner-facing item with required stimulus normalized when needed. | No further correction needed. |
| G2E_WR_003_MIXED_Q03 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_MIXED_Q04 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_MIXED_Q05 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_003_MIXED_Q06 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_003_MIXED_Q07 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_MIXED_Q08 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
| G2E_WR_003_MIXED_Q09 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: duplicate prompt/stimulus combination | Human review before future activation. |
| G2E_WR_003_MIXED_Q10 | Writing / Composition | needs review | none | pass | Removed/excluded from learner-facing pool: unsupported question type | Human review before future activation. |
