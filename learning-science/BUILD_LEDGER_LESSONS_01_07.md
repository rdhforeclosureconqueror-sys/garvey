# Garvey neuroscience: build ledger (Lessons 1–7)

Status: **build foundation PR; not production integrated**.

## Separate threads
- **Build thread:** inspect -> design -> implement -> synthetic test -> review/fix -> merge -> verify deployed behavior -> report.
- **Education thread bookmark:** **Lesson 8: Emotional & Social Development (ages 6–12)**. Resume only after the Lessons 1–7 build catch-up.
- Do not mistake this milestone for a deployed learning intervention.

## Confirmed existing assets in this repository
- `assessment-mvp/createAssessmentSession.js`, `submitAssessmentResponses.js`, `evidencePolicy.js`: provisional assessment session and scoring flow.
- `curriculum-framework/skill-graphs/grade{1..6}/{math,reading-english}/graph.v1.json`: subject-specific skill graph assets.
- `curriculum-framework/assessment/grades1-6-assessment-framework.v1.json`: versioned roles including baseline, progress monitoring, retention and transfer.
- `public/gamehub/skill-world/content/`: existing skill content; trace runtime and authorization before integration.

## Lesson-to-build architecture
| Lesson | Learning principle | Build deliverable | Definition of done |
| --- | --- | --- | --- |
| 1–2 | Neural change cannot be inferred from scores; observable growth matters | Attempt evidence with skill/task/version | Distinguish baseline from repeat attempts; no neural claims |
| 3 | Executive support/working memory | Record support type, hint count, modality | Guided work cannot silently count as independent |
| 4 | Retrieval, consolidation and spacing | Store prior event linkage, delayed interval and a future review scheduler | Versioned due dates; never infer retention from same-day success |
| 5 | Development is uneven | Keep subject-specific grade context and skill prerequisites | Advanced math and developing literacy can coexist |
| 6 | Literacy components differ | Probe phonological awareness, decoding, oral language, fluency, comprehension and writing separately | No composite language-genius diagnosis |
| 7 | Mathematics includes concepts, procedures and application | Conceptual/procedural/transfer probes and provisional error hypotheses | A wrong response never creates a diagnosis or fixed label |

## Current PR scope
The `learning-science/buildEvidenceEvent.js` pure adapter constructs a limited, versioned event with an opaque learner reference and no free-text fields. Synthetic tests exercise assisted vs independent evidence, incomplete outcomes, grade/subject separation and retrieval provenance.

**No parent/child authorization, persistence, production assessment wiring, migration, live route, or tracking of real children is changed.** An opaque reference alone does not anonymize records; real student data needs access controls, caregiver authorization, retention limits, and privacy review.

## Next implementation gate
1. Trace `server/` and `public/gamehub/` to identify parent-child identity and existing data persistence.
2. Confirm assessment item identifiers and scoring provenance.
3. Define server-side authorized evidence collection and idempotent storage.
4. Integrate behind a disabled-by-default feature flag, using synthetic learners first.
5. Run regression tests, review, merge, and confirm on the deployed site.

## Acceptance and handoff
- No child PII or diagnostic conclusions in event payloads.
- Every scored observation identifies skill, task, and assessment version.
- Hints/support and source distinguish independent vs coached performance.
- No broad mastery or permanent genius conclusions from a short assessment.
- Lesson 8 remains bookmarked in the separate education thread.
