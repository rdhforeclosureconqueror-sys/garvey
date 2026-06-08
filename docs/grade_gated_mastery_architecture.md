# Grade-Gated Mastery Architecture: Phase Zero Part 1

_Date: 2026-06-07_

## Purpose

This document defines the non-destructive, grade-gated architecture for a future Grades 1-6 assessment and mastery system. It is an architecture/audit artifact only. It does not implement assessment sessions, item governance, score storage, dashboards, database migrations, recommendation engines, or UI.

The existing SkillPackages, Skill World routes, Practice Center/drill behavior, renderers, voice systems, progress routes, and dashboards remain unchanged.

## Core progression

The future product should use this sequence for one selected grade and subject at a time:

```text
Grade baseline assessment
→ personalized learning
→ brief progress monitoring
→ strand reassessment
→ grade mastery assessment
→ cumulative mixed assessment
→ next-grade readiness screener
```

## Non-negotiable operating rules

1. Assess **one selected grade** and **one selected subject** at a time.
2. Do **not** mix multiple grade levels into the initial baseline.
3. The baseline must cover critical skills within the selected grade, not a random cross-grade sample.
4. Earlier-grade questions may be used later only for targeted prerequisite confirmation after a specific weak skill is identified.
5. Next-grade screening occurs only after the current-grade mastery gate is met.
6. A personalized learning plan should recommend no more than **three** priority SkillPackages at once.
7. Foundational prerequisites should be recommended before dependent skills.
8. Existing Skill World and Practice Center behavior remains unchanged; learning plans should route into current package paths rather than changing them.
9. Existing practice progress can inform instruction but must not be treated as scientifically validated mastery evidence.
10. No current item should be promoted automatically to operational assessment status.

## System boundary for Phase Zero

### In scope for this architecture document

- Deterministic grade progression model.
- How future assessment services should reuse existing curriculum without rewriting it.
- How future learning plans should launch existing Skill World/Practice Center experiences.
- How future progress monitoring, strand reassessment, mastery, cumulative, and next-grade readiness roles differ.
- Preservation principles for current routes and progress systems.

### Out of scope for this Part 1 task

- Assessment UI.
- Adaptive session API.
- Parent dashboard changes.
- Database migrations.
- Operational mastery records.
- Recommendation engine implementation.
- Item-writing JSON frameworks.
- Assessment item index generation.
- Psychometric calibration.
- Any change to production SkillPackages, renderers, routes, schemas, tests, or voice systems.

## Architecture layers

| Layer | Future responsibility | Existing assets reused | Phase Zero Part 1 classification |
|---|---|---|---|
| Curriculum source | Canonical instruction by grade/subject/skill | SkillPackages and manifest | reuse_without_change |
| Assessment blueprint | Defines coverage by grade/subject/assessment role | Package metadata, domains, source index | requires_new_component |
| Item metadata sidecar | Adds assessment role eligibility, review status, construct, security flags | SkillPackage question IDs/prompts as source references | requires_new_component |
| Secure scoring service | Scores assessment responses without exposing answer keys | Practice answer logic as reference only | requires_new_component |
| Learning-plan adapter | Chooses up to 3 current SkillPackages and launches existing routes | `skill_id`, `next_skill_id`, `remediation_skill_id`, Skill World routes | reuse_with_adapter |
| Practice experience | Teaches and practices selected skill packages | Skill World, drill/Practice Center, voice support | reuse_without_change |
| Progress-monitoring service | Samples recently taught clusters with secure items | Candidate item sidecar and package mapping | requires_new_component |
| Mastery evidence store | Stores versioned assessment evidence and provisional decisions | Existing child/progress context as optional input | requires_new_component |
| Parent/student display | Explains next steps and evidence limits | Existing dashboards/parent summaries | reuse_with_adapter |

## Assessment family definitions

### 1. Grade baseline assessment

**Purpose:** Identify the learner's starting point within the selected grade and subject.

**Rules:**

- Runs only for the chosen grade and subject.
- Covers critical grade-level SkillPackages and domains.
- Does not include next-grade probes.
- Does not include broad earlier-grade sampling.
- May trigger a later targeted prerequisite confirmation only after a specific weak skill is identified.
- Produces a learning-plan recommendation, not a final grade mastery claim.

**Output:**

- Domain/skill evidence summary.
- Priority learning needs.
- Up to three recommended SkillPackages.
- Evidence sufficiency flag.
- No operational mastery label until future validation rules exist.

### 2. Personalized learning

**Purpose:** Route the learner to existing instruction and practice based on baseline/progress evidence.

**Rules:**

- Recommend at most three SkillPackages at a time.
- Prefer foundational prerequisites before dependent skills.
- Use existing Skill World paths, for example `/skill-world/:skillId` and drill/practice routes.
- Do not alter package behavior, scoring feedback, renderer flow, voice behavior, or existing practice data.
- Existing `next_skill_id` and `remediation_skill_id` can inform sequencing through an adapter, but links must be validated against the manifest or sidecar graph.

**Output:**

- Selected SkillPackage IDs.
- Rationale in family-friendly language.
- Optional prerequisite confirmation need.
- Practice route targets.

### 3. Brief progress monitoring

**Purpose:** Measure improvement in a recently taught skill cluster.

**Rules:**

- Use short forms: typically 4-8 assessment-governed items per cluster in future phases.
- Focus mostly on recent learning.
- Include at least one cumulative retention item when appropriate.
- Do not independently certify whole-grade mastery.
- Do not reuse visible practice keys for secure scoring.

**Output:**

- Recent-skill growth signal.
- Misconception/prerequisite flags.
- Recommendation to continue, reteach, or reassess strand.

### 4. Strand reassessment

**Purpose:** Confirm mastery of a related domain or cluster of SkillPackages after instruction/practice.

**Rules:**

- Covers related packages in one domain/strand.
- Includes direct, application, and transfer evidence.
- Requires sufficient item coverage and more than one item format when possible.
- Does not let one easy subskill mask weakness in a critical subskill.

**Output:**

- Strand evidence profile.
- Provisional strand status.
- Next recommended learning/practice action.

### 5. Grade mastery assessment

**Purpose:** Confirm broad mastery across required grade-level skills.

**Rules:**

- Covers all critical domains for the selected grade/subject.
- Includes conceptual, procedural, application, and transfer evidence where age-appropriate.
- Does not allow strength in one domain to hide a critical weak domain.
- Requires sufficient coverage before a mastery classification.
- Uses configurable, versioned, provisional decision rules until standard setting and calibration occur.

**Output:**

- Grade-level evidence profile.
- Provisional mastery/developing/needs-support/not-enough-evidence decision only after future rule implementation.
- If mastery gate is met, eligibility for cumulative mixed assessment.

### 6. Cumulative mixed assessment

**Purpose:** Confirm retention, skill selection, and transfer without lesson labels.

**Rules:**

- Mixes skills across the selected grade.
- Removes obvious lesson/package labels.
- Includes earlier-grade prerequisite retention only when warranted and controlled.
- Includes unfamiliar transfer items.
- Requires item exposure controls in future operational use.

**Output:**

- Retention/transfer evidence.
- Confirmation that learner can select methods without lesson cues.
- Eligibility signal for next-grade readiness screening if current-grade mastery remains supported.

### 7. Next-grade readiness screener

**Purpose:** Determine an appropriate starting point in the next grade after the current-grade mastery gate is met.

**Rules:**

- Runs only after current-grade mastery evidence is sufficient.
- Samples the next grade in a controlled screener, not a full next-grade mastery assessment.
- Creates the next-grade learning plan.
- Does not automatically declare full next-grade mastery.
- Does not backfill previous grade mastery records.

**Output:**

- Next-grade starting recommendation.
- Up to three next-grade SkillPackages for the initial plan.
- Prerequisite flags if readiness evidence is uneven.

## Deterministic grade progression model

```text
selected_grade + selected_subject
  ↓
baseline coverage across critical selected-grade packages
  ↓
if specific weakness found: optional targeted prerequisite confirmation
  ↓
learning plan of ≤ 3 SkillPackages using existing Skill World/Practice routes
  ↓
progress monitoring after recent instruction
  ↓
strand reassessment when a domain cluster is ready
  ↓
grade mastery assessment after sufficient strand/domain evidence
  ↓
cumulative mixed retention/transfer check
  ↓
next-grade readiness screener only after current-grade mastery gate
  ↓
next-grade learning plan
```

## Learning-plan adapter contract

A future adapter should accept:

- learner/session identifiers approved by consent/identity rules;
- selected grade;
- selected subject;
- baseline/progress evidence by SkillPackage/domain;
- validated package inventory from the current manifest;
- optional prerequisite sidecar graph;
- current Skill World route templates.

It should return:

- no more than three `skill_id` recommendations;
- rationale for each recommendation;
- prerequisite ordering notes;
- route targets using existing Skill World/Practice Center URLs;
- evidence limitations, especially if evidence is insufficient or practice-only.

The adapter must not:

- rewrite SkillPackage files;
- change renderer scoring;
- alter existing practice-progress semantics;
- mark an item or learner scientifically validated;
- expose answer keys.

## Evidence and decision-rule posture

All initial assessment decisions must be labeled provisional until later standard setting and psychometric validation. Future decisions should distinguish:

- **Mastered:** strong performance, sufficient valid evidence, coverage across constructs/formats, no unresolved critical prerequisite.
- **Developing:** partial success, recurring misconception, insufficient transfer evidence, or mastery-range score with insufficient confirmation.
- **Needs Support:** consistent evidence of difficulty with sufficient valid responses and identifiable misconception/prerequisite gap.
- **Not Enough Evidence:** insufficient coverage, inconsistent performance, invalid/abandoned responses, or item-security breach.

Thresholds must be configurable, versioned, and replaceable after calibration.

## Data/security principles

1. Public SkillPackage answer keys must not be reused for secure operational scoring.
2. Future assessment item payloads should expose only non-secret metadata and student-facing prompts needed for the session.
3. Correct answers, acceptable answers, rubrics, scoring rules, and answer-key maps should live server-side or behind authenticated, authorized services.
4. Child assessment research data should collect only what is necessary for validity, fairness, reliability, and safety.
5. Audio/accommodation use can be logged as assessment context, but not as unnecessary personal data.
6. Practice progress and assessment mastery records should remain distinct data types.

## Preservation commitments

- Current SkillPackages remain canonical instructional assets.
- Skill World routes remain stable.
- Practice Center/drill behavior remains stable.
- Current client-side instructional scoring remains practice-only.
- Existing Grade 1 adaptive-v2 progress and voice contracts remain guarded by current tests.
- Dashboards should not receive new mastery claims until a future assessment evidence store and parent-safe explanation model exist.

## Phase One prerequisites

Before implementation of a full assessment system, the repository needs additive artifacts:

1. Versioned assessment framework JSON.
2. Versioned item-writing specification JSON.
3. Versioned item-governance/status JSON.
4. Derived assessment candidate index with no answer keys.
5. Server-side scoring-key plan.
6. Assessment metadata sidecars mapped to SkillPackage question IDs.
7. Validation tests for item status transitions, duplicate IDs, missing packages, unsupported question types, and no public answer keys.
8. Preservation tests proving existing Skill World and adaptive-v2 behavior did not change.
