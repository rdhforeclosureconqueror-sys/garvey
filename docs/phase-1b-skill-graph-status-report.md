# Phase 1B Skill Graph Validation Status Report

Date: 2026-05-26  
Scope: Normalized Grade 1–2 skill graph assets only (documentation/status pass)

## Included Assets

### Graphs
1. `curriculum-framework/skill-graphs/grade1/math/graph.v1.json`
2. `curriculum-framework/skill-graphs/grade1/reading-english/graph.v1.json`
3. `curriculum-framework/skill-graphs/grade2/math/graph.v1.json`
4. `curriculum-framework/skill-graphs/grade2/reading-english/graph.v1.json`

### Validation Reports
1. `curriculum-framework/skill-graphs/grade1/math/validation-report.v1.json`
2. `curriculum-framework/skill-graphs/grade1/reading-english/validation-report.v1.json`
3. `curriculum-framework/skill-graphs/grade2/math/validation-report.v1.json`
4. `curriculum-framework/skill-graphs/grade2/reading-english/validation-report.v1.json`

### Schemas Reviewed
- `curriculum-framework/schemas/skill-graph.schema.json`
- `curriculum-framework/schemas/validation-report.schema.json`

---

## Per-Graph Status

| Grade | Subject | Graph Path | Domains | Skills in Domains | Inventory Total Reported | Validation Checks | needs_review_count | Unresolved Prerequisites | Classification |
|---|---|---|---:|---:|---:|---|---:|---:|---|
| Grade 1 | Math | `curriculum-framework/skill-graphs/grade1/math/graph.v1.json` | 6 | 18 | 19 | PASS (all checks) | 34 | 34 | NEEDS SOURCE CLEANUP |
| Grade 1 | Reading/English | `curriculum-framework/skill-graphs/grade1/reading-english/graph.v1.json` | 5 | 15 | 15 | PASS (all checks) | 31 | 31 | READY WITH REVIEW |
| Grade 2 | Math | `curriculum-framework/skill-graphs/grade2/math/graph.v1.json` | 6 | 19 | 19 | PASS (all checks) | 42 | 42 | READY WITH REVIEW |
| Grade 2 | Reading/English | `curriculum-framework/skill-graphs/grade2/reading-english/graph.v1.json` | 5 | 15 | 15 | PASS (all checks) | 30 | 30 | READY WITH REVIEW |

---

## Domains Per Graph

### Grade 1 Math
- `OA` Operations & Algebraic Thinking
- `NBT` Number & Operations in Base Ten
- `NF` Number & Operations—Fractions
- `MD` Measurement & Data
- `G` Geometry
- `MP` Mathematical Practices

### Grade 1 Reading/English
- `RF` Reading Foundations
- `RL` Reading Literature
- `RI` Reading Informational Text
- `W` Writing
- `L` Language

### Grade 2 Math
- `OA` Operations & Algebraic Thinking
- `NBT` Number & Operations in Base Ten
- `MD` Measurement & Data
- `G` Geometry
- `D` Data (classification-specific strand present in source)
- `MP` Mathematical Practices

### Grade 2 Reading/English
- `RF` Reading Foundations
- `RL` Reading Literature
- `RI` Reading Informational Text
- `W` Writing
- `L` Language

---

## Validation Status Summary

All four validation reports currently pass the structural and guardrail checks, including:
- graph file present
- grade/subject/version present
- unique domain codes
- unique skill codes
- required fields present
- validation report present
- needs_review preservation
- `no_tracking_scoring_db_logic_added`

This indicates the Phase 1B scope is still documentation/normalization-only and has not introduced runtime tracking/scoring/DB behavior.

---

## `needs_review` Interpretation

`needs_review` does **not** block planning use of the graph assets.  
It **does** flag prerequisite linkage or normalization items that should be cleaned up before runtime-grade use.

Practical meaning:
- planning and mapping workflows can proceed,
- runtime dependency resolution should wait until prerequisite normalization cleanup is complete.

---

## Unresolved Prerequisite Summary

Current unresolved prerequisite counts (from validation reports):
- Grade 1 Math: 34
- Grade 1 Reading/English: 31
- Grade 2 Math: 42
- Grade 2 Reading/English: 30

Total unresolved prerequisites across Grade 1–2 set: **137**.

Notable source consistency issue:
- Grade 1 Math inventory reports 19 total skills while domain-enumerated skills sum to 18, requiring source cleanup reconciliation.

---

## Current Readiness Level

Overall readiness for Grade 1–2 normalized graph set: **READY WITH REVIEW (portfolio-level)**.

Interpretation:
- Structure and guardrails are in place and validated.
- Graphs are usable for planning workflows now.
- Prerequisite and normalization cleanup remains before runtime wiring/use.

---

## Recommendation (Next Intake)

Proceed with the next source intake for:
1. Grade 3 Math
2. Grade 3 Reading/English

Maintain current guardrails:
- no Adaptive runtime wiring
- no Adaptive engine changes
- no tracking enablement
- no DB/server writes
- no scoring/diagnosis logic
- no Gates logic changes
