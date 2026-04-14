# Love Generator Wording-Rule Refinement Pass — 2026-04-14

## 1) Phase 1 Review — Extracted Weaknesses from Prior Validation

- **prompt repetition**: in a normal week (4); which statement best matches (3); your partner asks for (3); which relationship rhythm feels (2); in day-to-day connection, which (2); when tension spikes, your (4); a meaningful decision comes (3); when love feels most (2); when things are steady, (2); when tension spikes, your (3)
- **option repetition**: talk it through (12); ask for reassurance (11); focus on consistent (11); shift energy through (11); protect personal pace (11); look for concrete (9); create a new (9); move closer and (9); focus on consistent (12); create a new (11); ask for reassurance (10); start an honest (10); move closer and (10); talk it through (10); shift energy through (9); ask for reassurance (14); shift energy through (13); look for concrete (13); talk it through (13); create space to (9); start an honest (7); create a new (7)
- **templated phrasing**: High stem recycling in option openings (10–14 repeats); Narrow prompt frame set across BH/SC/ST classes
- **desirability imbalance**: No explicit desirability warnings, but parity guardrails were too shallow
- **weak behavioral specificity**: Options leaned on generic abstractions vs concrete interaction behaviors
- **awkward / robotic phrasing**: No hard awkward fragments, but recurring mechanical cadence

## 2) Wording Rule Changes Implemented

- Expanded prompt templates per class to increase sentence-opening and framing variety.
- Added scenario-domain framing inserts to diversify context language.
- Replaced generic option templates with class-specific concrete behavior libraries by archetype.
- Reduced repetitive first-person opener patterns and tightened mobile-readable sentence length.

## 3) Desirability Guardrail Changes Implemented

- Added lexicon checks for elevated/mature/idealized loading and chaotic/inferior loading.
- Tightened spread threshold for option desirability parity (>=3 now warns).
- Added parity skew checks so only one option cannot carry virtue-loaded or chaos-loaded cues.

## 4) Re-run Validation Results (BANK_A/BANK_C)

- **BANK_A**: auditValid=true; pairSpread=0; schemaValidity=true.
- **BANK_B**: auditValid=true; pairSpread=2; schemaValidity=true.
- **BANK_C**: auditValid=true; pairSpread=0; schemaValidity=true.

## 5) Wording/Desirability Review (After)

- **BANK_A**: top prompt stem repeats=2; top option stem repeats=3; desirability warnings=0; weak specificity count=12.
- **BANK_B**: top prompt stem repeats=3; top option stem repeats=3; desirability warnings=0; weak specificity count=12.
- **BANK_C**: top prompt stem repeats=2; top option stem repeats=3; desirability warnings=0; weak specificity count=12.

## 6) Before/After Findings

- Prompt stem repetition peak: **4 → 3**.
- Option stem repetition peak: **14 → 3**.
- Behavioral specificity improved via explicit action verbs/check-in/repair/autonomy/reliability/novelty references.
- Desirability parity checks are now stricter; no loaded-option warnings in this run.

## 7) Recommendation

- **ready for candidate-bank promotion review (do not promote live yet)**.

