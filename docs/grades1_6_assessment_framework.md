# Grades 1–6 Assessment Framework and Blueprints

## Executive summary

This Phase Zero Part 2 document defines an additive, non-destructive assessment framework for Grades 1–6 Math and English. It uses the current Skill World manifest and package files as the package inventory, without changing production SkillPackages, manifests, renderers, routes, schemas, voice behavior, learner progress systems, dashboards, or curriculum indexes.

All item counts, evidence requirements, gates, classifications, and blueprint balances are **provisional, configurable, versioned, subject to expert review, and subject to future empirical calibration**. They must not be described as scientifically validated until standard setting and real-data calibration are completed.

## Design principles

- Use existing SkillPackages as canonical instructional package references; do not invent package IDs.
- Keep assessment governance separate from current public instructional/practice assets and exposed answer keys.
- Assess one selected grade and one selected subject at baseline; do not randomly mix grades.
- Retain domain-specific readiness; one strong domain must not hide a critical weakness in another.
- Treat reports as instructional guidance, not clinical diagnosis, official placement, or high-stakes certification.
- Preserve existing Skill World and Skill Practice behavior unchanged.

## Grade-gated progression

1. The initial assessment covers exactly one selected grade and one selected subject.
2. The baseline covers every critical SkillPackage in the selected grade/subject and does not probe the next grade.
3. Earlier-grade questions may be used later only for targeted prerequisite confirmation after a specific weakness is found.
4. The learner must meet the current-grade mastery gate before receiving the next-grade readiness screener.
5. The next-grade screener samples the next grade to create a starting plan; it does **not** certify next-grade mastery.
6. Domain-specific readiness is retained throughout; no single overall grade label may hide critical weakness.

## Assessment role definitions

### baseline

- **Purpose:** Initial broad screening for one selected grade and one selected subject using selected-grade SkillPackages only, with targeted prerequisite confirmation allowed only after a specific weakness is found.
- **Allowed claims:** Developing area, Needs Support area, Not Enough Evidence area, instructional priority recommendations after scoring
- **Prohibited claims:** random multi-grade placement, next-grade readiness, full grade mastery unless all later evidence requirements are met, official school placement
- **Eligible item statuses:** diagnostic_candidate, reviewed_candidate, validated_operational
- **Package/domain coverage:** Every critical package in the selected grade/subject; supporting packages sampled when session length permits.
- **Expected item count range:** provisional configurable 18-30 for Math, 20-34 for English depending on grade and reading load
- **Session-length guidance:** short enough for age; split if the child is fatigued or continuous-session maximum is reached
- **Break/resume rules:** breaks allowed at section/package boundaries; resume with equivalent remaining blueprint cells without reusing exposed items
- **Minimum evidence requirements:** at least one valid response per critical package and at least two per critical domain where item supply permits
- **Scoring role:** summarize screening evidence and flag sufficiency; does not operate as secure final scoring in Phase Zero
- **Mastery-decision role:** no standalone mastery certification except future configured rules requiring full evidence
- **Reassessment rules:** after scoring, targeted prerequisite confirmation may be scheduled only for identified weaknesses
- **Audio/accessibility behavior:** Read Question/Listen available where appropriate; audio is meaning-equivalent and never answer-revealing
- **Parent recommendations:** may trigger instructional recommendations, capped and caveated, not placement or diagnosis

### progress_monitoring

- **Purpose:** Brief trend evidence for recently taught skill clusters.
- **Allowed claims:** recent-skill growth trend, reteach/continue signal, cumulative retention flag
- **Prohibited claims:** whole-grade mastery, official promotion/readiness decision, diagnosis
- **Eligible item statuses:** progress_monitoring_candidate, reviewed_candidate, validated_operational
- **Package/domain coverage:** Recently taught package cluster plus at least one cumulative retention item.
- **Expected item count range:** provisional configurable 4-8 items per recently taught skill cluster
- **Session-length guidance:** very short session; usually one cluster at a time
- **Break/resume rules:** breaks allowed; resumed forms avoid repeating identical prior items
- **Minimum evidence requirements:** valid responses for the cluster and one cumulative item when appropriate
- **Scoring role:** updates trend evidence only
- **Mastery-decision role:** no whole-grade mastery decision; may inform readiness for reassessment
- **Reassessment rules:** use different or equivalent items from prior assessments
- **Audio/accessibility behavior:** accommodations allowed and recorded without penalty
- **Parent recommendations:** may update short-term instructional recommendations only

### strand_reassessment

- **Purpose:** Confirm whether a related domain/strand has improved after instruction and practice.
- **Allowed claims:** provisional domain status, skill-cluster evidence profile, prerequisite confirmation need
- **Prohibited claims:** full grade mastery, next-grade mastery, compensatory masking of critical weaknesses
- **Eligible item statuses:** diagnostic_candidate, mastery_candidate, reviewed_candidate, validated_operational
- **Package/domain coverage:** Related SkillPackages within one domain or tightly connected strand.
- **Expected item count range:** provisional configurable 8-16 items
- **Session-length guidance:** single-domain session with optional split for longer reading/writing work
- **Break/resume rules:** breaks at natural item-set boundaries; resume remaining direct/application/transfer cells
- **Minimum evidence requirements:** direct skill, application, transfer, and prerequisite evidence where relevant
- **Scoring role:** updates domain mastery evidence
- **Mastery-decision role:** may support domain-level status only under future configured rules
- **Reassessment rules:** requires enough new/equivalent evidence and cannot rely on near-duplicate practice items
- **Audio/accessibility behavior:** meaning-equivalent audio; constructed responses keep the same scoring expectations
- **Parent recommendations:** may trigger domain-specific instructional recommendations

### grade_mastery

- **Purpose:** Evaluate broad current-grade mastery after sufficient instruction and domain evidence.
- **Allowed claims:** provisional current-grade evidence profile, Mastered/Developing/Needs Support/Not Enough Evidence under future configured rules, eligibility for cumulative mixed assessment
- **Prohibited claims:** scientifically validated status without calibration, next-grade mastery, critical-domain averaging
- **Eligible item statuses:** validated_operational
- **Package/domain coverage:** All critical grade domains and all critical packages represented.
- **Expected item count range:** provisional configurable 24-42 items depending on subject and grade
- **Session-length guidance:** may be split across sittings; avoid exceeding age-appropriate continuous maximum
- **Break/resume rules:** planned breaks allowed between domains; resume with uncompleted blueprint cells
- **Minimum evidence requirements:** valid evidence in every critical domain, multiple formats where available, and no unresolved critical prerequisite
- **Scoring role:** aggregates secure evidence under later scoring services
- **Mastery-decision role:** provisional grade-readiness decision allowed only when all evidence requirements are met
- **Reassessment rules:** weak critical domains require targeted reassessment; strong domains cannot compensate for critical gaps
- **Audio/accessibility behavior:** accommodations recorded but not penalized; audio cannot change construct or reveal answer
- **Parent recommendations:** may trigger recommendations if labeled instructional and provisional

### cumulative_mixed

- **Purpose:** Confirm retention, skill selection, and transfer without lesson/package labels.
- **Allowed claims:** retention evidence, method-selection evidence, transfer evidence, continued current-grade readiness support
- **Prohibited claims:** initial placement, single overall grade label, near-duplicate practice confirmation
- **Eligible item statuses:** validated_operational
- **Package/domain coverage:** Mixed current-grade skills, prerequisite-retention checks when warranted, and unfamiliar transfer items.
- **Expected item count range:** provisional configurable 16-28 items
- **Session-length guidance:** moderate mixed session; split if text load is high
- **Break/resume rules:** breaks allowed without showing package labels; resume with mixed unexposed items
- **Minimum evidence requirements:** evidence across critical domains plus retention and transfer cells
- **Scoring role:** supports retention/transfer profile
- **Mastery-decision role:** does not by itself certify mastery; supports readiness gate maintenance
- **Reassessment rules:** weak retention/transfer cells trigger targeted review, not broad regression labels
- **Audio/accessibility behavior:** reduced cueing; audio permitted only if it does not reveal skill choice
- **Parent recommendations:** may refine instructional plan after current-grade mastery evidence exists

### next_grade_readiness

- **Purpose:** After current-grade mastery, sample the next grade to identify starting packages.
- **Allowed claims:** next-grade starting plan, likely first SkillPackages, domain-specific readiness profile
- **Prohibited claims:** next-grade mastery certification, automatic promotion/placement, single overall grade label
- **Eligible item statuses:** validated_operational
- **Package/domain coverage:** Small sample of next-grade critical and entry packages; Grade 6 screener requires later Grade 7 inventory before operational use.
- **Expected item count range:** provisional configurable 10-20 items
- **Session-length guidance:** short and exploratory; no high-stakes pressure
- **Break/resume rules:** breaks allowed; incomplete screener produces Not Enough Evidence starting plan
- **Minimum evidence requirements:** domain-specific entry evidence, not full next-grade coverage
- **Scoring role:** creates next-grade starting plan
- **Mastery-decision role:** not allowed to certify next-grade mastery
- **Reassessment rules:** uneven domains lead to domain-specific starting supports
- **Audio/accessibility behavior:** same accommodations as current grade; reading/audio must match construct
- **Parent recommendations:** may trigger next-grade starting recommendations only after current-grade mastery gate

## Blueprint rationale

The companion JSON file provides 72 configurable blueprints: six assessment roles for each Grade 1–6 Math and English framework. Math blueprints balance conceptual understanding, procedural fluency, application, mathematical reasoning, visual/model interpretation, and construct-appropriate word-problem reading load. English blueprints balance word analysis where applicable, fluency, vocabulary, literary comprehension, informational comprehension, writing, language/conventions, passage reading, text evidence, and constructed response where appropriate. No one question type may dominate unless the construct requires it; the provisional cap is recorded in the machine-readable blueprint.


## Canonical item-status vocabulary

Blueprints use only this canonical vocabulary: `instruction_only`, `practice`, `progress_monitoring_candidate`, `diagnostic_candidate`, `mastery_candidate`, `field_test`, `reviewed_candidate`, `validated_operational`, `suspended`, and `retired`. Aliases such as `practice_only`, `assessment_candidate`, `expert_reviewed`, `operational`, `field_tested`, `equivalent_form`, and `under_revision` are not used in the Part 2 blueprint file. `field_test` items may be embedded only under a separately governed non-scored design. The JSON framework now defines the structured policy `field-test-zero-decision-weight-v1`, which sets `scored_evidence_weight` to `0`, excludes field-test evidence from mastery, readiness, recommendations, placement, and parent-facing decisions, and preserves eligibility for item-statistics collection. Each blueprint references that policy by `field_test_scoring_policy_id`, so implementations can enforce the zero-decision-weight invariant without parsing prose. Grade-mastery, cumulative-mixed, and next-grade-readiness scored evidence is restricted to `validated_operational` items.

## Package reference scope

All assessment roles reference the selected current-grade framework through `package_reference_scope: current_grade`, except `next_grade_readiness`, which intentionally references the next grade's framework through `package_reference_scope: next_grade`. Separately identified targeted prerequisite-confirmation evidence may reference earlier-grade prerequisites only after a specific weakness is found; it is not part of random baseline grade mixing.

## Grades 1–6 Math framework

### Grade 1 Math

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G1M_DP_001` | Sorting Categories and Pattern Recognition | Data & Patterns | supporting |
| `G1M_GM_001` | Shapes and Spatial Reasoning | Geometry + Measurement | supporting |
| `G1M_GM_002` | Measurement Foundations | Geometry + Measurement | supporting |
| `G1M_MD_TIME_001` | Tell and Write Time to Hour and Half-Hour | Measurement + Data | supporting |
| `G1M_NS_001` | Count and Represent Numbers to 20 | Number Sense + Counting | critical |
| `G1M_NS_002` | Count Forward and Backward Within 120 | Number Sense + Counting | critical |
| `G1M_NS_003` | Compare Numbers | Number Sense + Counting | critical |
| `G1M_OP_001` | Addition Foundations Within 20 | Operations + Algebraic Thinking | critical |
| `G1M_OP_002` | Subtraction Foundations Within 20 | Operations + Algebraic Thinking | critical |
| `G1M_OP_003` | Fact Fluency and Number Bonds Within 10 | Operations | critical |
| `G1M_PV_001` | Tens and Ones as Base-Ten Units | Place Value | critical |

- **Recommended lengths:** baseline 18-30 items; progress monitoring 4-8; strand reassessment 8-16; grade mastery 24-40; cumulative mixed 16-28; next-grade screener 10-18. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 15 minutes; Offer a break by 15 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Data & Patterns, Geometry + Measurement, Measurement + Data, Number Sense + Counting, Operations, Operations + Algebraic Thinking, Place Value.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visual models must be accessible, mobile-safe, interpretable with alt/support text, and not decorative when evidence depends on them. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 2 Math

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G2M_GM_001` | Shapes, Arrays, and Partitioning | Geometry | supporting |
| `G2M_MD_001` | Measure Length | Measurement and Data | supporting |
| `G2M_MD_002` | Time and Money | Measurement and Data | supporting |
| `G2M_MD_003` | Data, Graphs, and Line Plots | Measurement and Data | supporting |
| `G2M_NS_001` | Count, Read, and Write Numbers to 1,000 | Number Sense / Base Ten | critical |
| `G2M_NS_002` | Compare Three-Digit Numbers | Number and Operations in Base Ten | critical |
| `G2M_OP_001` | Add Within 100 | Operations / Base Ten | critical |
| `G2M_OP_002` | Subtract Within 100 | Operations / Base Ten | critical |
| `G2M_OP_003` | Fluency With Addition and Subtraction Within 20 | Operations and Algebraic Thinking | critical |
| `G2M_PV_001` | Place Value to Hundreds | Number and Operations in Base Ten | critical |
| `G2M_WP_001` | Addition and Subtraction Word Problems | Operations and Algebraic Thinking | critical |

- **Recommended lengths:** baseline 18-30 items; progress monitoring 4-8; strand reassessment 8-16; grade mastery 24-40; cumulative mixed 16-28; next-grade screener 10-18. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 18 minutes; Offer a break by 18 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Geometry, Measurement and Data, Number Sense / Base Ten, Number and Operations in Base Ten, Operations / Base Ten, Operations and Algebraic Thinking.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visual models must be accessible, mobile-safe, interpretable with alt/support text, and not decorative when evidence depends on them. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 3 Math

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G3M_DIV_001` | Division Foundations | Operations and Algebraic Thinking | critical |
| `G3M_FACT_001` | Multiplication and Division Fluency | Operations and Algebraic Thinking | critical |
| `G3M_FR_001` | Fraction Foundations | Number and Operations—Fractions | critical |
| `G3M_FR_002` | Equivalent Fractions and Comparing Fractions | Number and Operations—Fractions | critical |
| `G3M_GM_001` | Area and Perimeter | Measurement and Geometry | supporting |
| `G3M_GM_002` | Shapes, Attributes, and Partitioning | Geometry | supporting |
| `G3M_MD_001` | Time, Measurement, and Data | Measurement and Data | supporting |
| `G3M_MUL_001` | Multiplication Foundations | Operations and Algebraic Thinking | critical |
| `G3M_PV_001` | Place Value and Rounding to 1,000 | Number and Operations in Base Ten | critical |
| `G3M_WP_001` | Two-Step Word Problems | Operations and Algebraic Thinking | critical |

- **Recommended lengths:** baseline 18-30 items; progress monitoring 4-8; strand reassessment 8-16; grade mastery 24-40; cumulative mixed 16-28; next-grade screener 10-18. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 22 minutes; Offer a break by 22 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Geometry, Measurement and Data, Measurement and Geometry, Number and Operations in Base Ten, Number and Operations—Fractions, Operations and Algebraic Thinking.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visual models must be accessible, mobile-safe, interpretable with alt/support text, and not decorative when evidence depends on them. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 4 Math

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G4M_FR_001` | Fraction Equivalence and Ordering | Number and Operations—Fractions | critical |
| `G4M_FR_002` | Add and Subtract Fractions | Number and Operations—Fractions | critical |
| `G4M_FR_003` | Multiply Fractions by Whole Numbers | Number and Operations—Fractions | critical |
| `G4M_GM_001` | Angles, Lines, and Shape Classification | Geometry | supporting |
| `G4M_MD_001` | Measurement Conversion and Data | Measurement and Data | supporting |
| `G4M_NBT_001` | Place Value to 1,000,000 | Number and Operations in Base Ten | critical |
| `G4M_NBT_002` | Multi-Digit Addition and Subtraction | Number and Operations in Base Ten | critical |
| `G4M_NBT_003` | Multi-Digit Multiplication | Number and Operations in Base Ten | critical |
| `G4M_NBT_004` | Division With Remainders | Number and Operations in Base Ten | critical |
| `G4M_OA_001` | Multiplicative Comparison and Patterns | Operations and Algebraic Thinking | critical |

- **Recommended lengths:** baseline 18-30 items; progress monitoring 4-8; strand reassessment 8-16; grade mastery 24-40; cumulative mixed 16-28; next-grade screener 10-18. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 25 minutes; Offer a break by 25 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Geometry, Measurement and Data, Number and Operations in Base Ten, Number and Operations—Fractions, Operations and Algebraic Thinking.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visual models must be accessible, mobile-safe, interpretable with alt/support text, and not decorative when evidence depends on them. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 5 Math

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G5M_FR_001` | Add and Subtract Fractions With Unlike Denominators | Number and Operations—Fractions | critical |
| `G5M_FR_002` | Multiply Fractions | Number and Operations—Fractions | critical |
| `G5M_FR_003` | Divide Unit Fractions and Whole Numbers | Number and Operations—Fractions | critical |
| `G5M_GM_001` | Coordinate Plane and Graphing | Geometry | supporting |
| `G5M_GM_002` | Classify Two-Dimensional Figures | Geometry | supporting |
| `G5M_MD_001` | Measurement Conversion, Volume, and Data | Measurement and Data | supporting |
| `G5M_NBT_001` | Place Value With Decimals | Number and Operations in Base Ten | critical |
| `G5M_NBT_002` | Multi-Digit Whole Number Operations | Number and Operations in Base Ten | critical |
| `G5M_NBT_003` | Decimal Operations | Number and Operations in Base Ten | critical |
| `G5M_OA_001` | Expressions, Patterns, and the Coordinate Plane | Operations and Algebraic Thinking / Geometry | supporting |

- **Recommended lengths:** baseline 18-30 items; progress monitoring 4-8; strand reassessment 8-16; grade mastery 24-40; cumulative mixed 16-28; next-grade screener 10-18. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 30 minutes; Offer a break by 30 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Geometry, Measurement and Data, Number and Operations in Base Ten, Number and Operations—Fractions, Operations and Algebraic Thinking / Geometry.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visual models must be accessible, mobile-safe, interpretable with alt/support text, and not decorative when evidence depends on them. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 6 Math

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G6M_EE_001` | Expressions and Exponents | Expressions and Equations | critical |
| `G6M_EE_002` | Equations and Inequalities | Expressions and Equations | critical |
| `G6M_EE_003` | Dependent and Independent Variables | Expressions and Equations | critical |
| `G6M_GM_001` | Area, Surface Area, and Volume | Geometry | supporting |
| `G6M_NS_001` | Dividing Fractions | The Number System | critical |
| `G6M_NS_002` | Multi-Digit Decimal Operations | The Number System | critical |
| `G6M_NS_003` | Integers and the Number Line | The Number System | critical |
| `G6M_RP_001` | Ratios and Unit Rates | Ratios and Proportional Relationships | critical |
| `G6M_SP_001` | Statistical Questions and Data Displays | Statistics and Probability | supporting |
| `G6M_SP_002` | Summarize and Interpret Data | Statistics and Probability | supporting |

- **Recommended lengths:** baseline 18-30 items; progress monitoring 4-8; strand reassessment 8-16; grade mastery 24-40; cumulative mixed 16-28; next-grade screener 10-18. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 35 minutes; Offer a break by 35 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Expressions and Equations, Geometry, Ratios and Proportional Relationships, Statistics and Probability, The Number System.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visual models must be accessible, mobile-safe, interpretable with alt/support text, and not decorative when evidence depends on them. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

## Grades 1–6 English framework

### Grade 1 English

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G1E_FL_001` | Sentence Reading Fluency | Fluency | critical |
| `G1E_PH_001` | CVC Word Blending | Phonics | critical |
| `G1E_PH_002` | Short Vowel Word Families | Phonics | critical |
| `G1E_RC_001` | Answer Who, What, Where Questions | Reading Comprehension | critical |
| `G1E_RC_002` | Story Sequence: Beginning, Middle, End | Reading Comprehension | critical |
| `G1E_RF_001` | Letter Recognition and Sounds | Reading Foundations | critical |
| `G1E_RF_002` | Phonemic Awareness: Beginning, Middle, Ending Sounds | Reading Foundations | critical |
| `G1E_SW_001` | Sight Words and High-Frequency Words | Fluency | critical |
| `G1E_WR_001` | Write a Simple Sentence | Writing / Composition | critical |
| `G1E_WR_002` | Describe a Picture with a Sentence | Writing / Composition | critical |

- **Recommended lengths:** baseline 20-34 items; progress monitoring 4-8; strand reassessment 8-18; grade mastery 26-42; cumulative mixed 16-30; next-grade screener 10-20. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 15 minutes; Offer a break by 15 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Fluency, Phonics, Reading Comprehension, Reading Foundations, Writing / Composition.
- **Supporting classification rationale:** zero supporting packages are intentional in this provisional framework: the current Grade 1 English inventory is foundational early literacy and beginning writing, so all packages are treated as critical until expert standards/dependency review identifies any supporting or extension packages.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visuals must be accessible and mobile-safe when used. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 2 English

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G2E_FL_001` | Grade 2 Sight Words and Fluency | Fluency | critical |
| `G2E_RC_001` | Ask and Answer Questions About Text | Reading Comprehension | critical |
| `G2E_RC_002` | Story Structure and Retelling | Reading Comprehension | critical |
| `G2E_RC_003` | Main Idea and Key Details | Reading Comprehension | critical |
| `G2E_RF_001` | Advanced Phonics and Word Analysis | Reading Foundations | critical |
| `G2E_RF_002` | Prefixes, Suffixes, and Base Words | Reading Foundations / Vocabulary | critical |
| `G2E_VOC_001` | Vocabulary and Context Clues | Vocabulary | supporting |
| `G2E_WR_001` | Write Opinion Pieces | Writing / Composition | critical |
| `G2E_WR_002` | Write Informative/Explanatory Text | Writing / Composition | critical |
| `G2E_WR_003` | Narrative Writing With Sequence | Writing / Composition | critical |

- **Recommended lengths:** baseline 20-34 items; progress monitoring 4-8; strand reassessment 8-18; grade mastery 26-42; cumulative mixed 16-30; next-grade screener 10-20. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 18 minutes; Offer a break by 18 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Fluency, Reading Comprehension, Reading Foundations, Reading Foundations / Vocabulary, Vocabulary, Writing / Composition.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visuals must be accessible and mobile-safe when used. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 3 English

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G3E_FL_001` | Reading Fluency and Expression | Fluency | critical |
| `G3E_LANG_001` | Grammar, Conventions, and Sentence Combining | Language | supporting |
| `G3E_RC_001` | Ask and Answer Questions With Text Evidence | Reading Comprehension | critical |
| `G3E_RC_002` | Story Elements, Theme, and Character Response | Reading Literature | critical |
| `G3E_RC_003` | Main Idea, Key Details, and Text Features | Reading Informational Text | critical |
| `G3E_RF_001` | Multisyllable Word Reading and Advanced Phonics | Reading Foundations | critical |
| `G3E_VOC_001` | Vocabulary, Context Clues, and Word Relationships | Vocabulary / Language | supporting |
| `G3E_WR_001` | Opinion Writing With Reasons | Writing / Composition | critical |
| `G3E_WR_002` | Informative Writing With Facts and Details | Writing / Composition | critical |
| `G3E_WR_003` | Narrative Writing With Dialogue and Sequence | Writing / Composition | critical |

- **Recommended lengths:** baseline 20-34 items; progress monitoring 4-8; strand reassessment 8-18; grade mastery 26-42; cumulative mixed 16-30; next-grade screener 10-20. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 22 minutes; Offer a break by 22 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Fluency, Language, Reading Comprehension, Reading Foundations, Reading Informational Text, Reading Literature, Vocabulary / Language, Writing / Composition.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visuals must be accessible and mobile-safe when used. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 4 English

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G4E_FL_001` | Reading Fluency, Accuracy, and Expression | Fluency | critical |
| `G4E_LANG_001` | Grammar, Conventions, and Sentence Combining | Language | supporting |
| `G4E_RC_001` | Ask and Answer Questions With Text Evidence | Reading Comprehension | critical |
| `G4E_RC_002` | Story Elements, Theme, and Character Analysis | Reading Literature | critical |
| `G4E_RC_003` | Main Idea, Key Details, and Text Structure | Reading Informational Text | critical |
| `G4E_RF_001` | Advanced Word Analysis and Multisyllable Decoding | Reading Foundations / Phonics | critical |
| `G4E_VOC_001` | Vocabulary, Context Clues, and Figurative Language | Vocabulary / Language | supporting |
| `G4E_WR_001` | Opinion Writing With Reasons and Evidence | Writing / Composition | critical |
| `G4E_WR_002` | Informative Writing With Facts and Details | Writing / Composition | critical |
| `G4E_WR_003` | Narrative Writing With Dialogue and Description | Writing / Composition | critical |

- **Recommended lengths:** baseline 20-34 items; progress monitoring 4-8; strand reassessment 8-18; grade mastery 26-42; cumulative mixed 16-30; next-grade screener 10-20. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 25 minutes; Offer a break by 25 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Fluency, Language, Reading Comprehension, Reading Foundations / Phonics, Reading Informational Text, Reading Literature, Vocabulary / Language, Writing / Composition.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visuals must be accessible and mobile-safe when used. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 5 English

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G5E_FL_001` | Reading Fluency and Expression With Complex Text | Fluency | critical |
| `G5E_LANG_001` | Grammar, Conventions, and Sentence Combining | Language | supporting |
| `G5E_RC_001` | Quote Accurately and Use Text Evidence | Reading Comprehension | critical |
| `G5E_RC_002` | Theme, Character, and Story Structure | Reading Literature | critical |
| `G5E_RC_003` | Main Idea, Text Structure, and Integrating Information | Reading Informational Text | critical |
| `G5E_RF_001` | Multisyllable Word Reading, Roots, and Affixes | Reading Foundations / Word Analysis | critical |
| `G5E_VOC_001` | Vocabulary, Context Clues, and Figurative Language | Vocabulary / Language | supporting |
| `G5E_WR_001` | Opinion Writing With Reasons and Evidence | Writing / Composition | critical |
| `G5E_WR_002` | Informative Writing With Facts, Definitions, and Details | Writing / Composition | critical |
| `G5E_WR_003` | Narrative Writing With Dialogue, Description, and Pacing | Writing / Composition | critical |

- **Recommended lengths:** baseline 20-34 items; progress monitoring 4-8; strand reassessment 8-18; grade mastery 26-42; cumulative mixed 16-30; next-grade screener 10-20. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 30 minutes; Offer a break by 30 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Fluency, Language, Reading Comprehension, Reading Foundations / Word Analysis, Reading Informational Text, Reading Literature, Vocabulary / Language, Writing / Composition.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visuals must be accessible and mobile-safe when used. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

### Grade 6 English

| Package ID | Title | Domain | Role |
|---|---|---|---|
| `G6E_FL_001` | Fluency With Literary and Informational Text | Fluency | critical |
| `G6E_LANG_001` | Grammar, Usage, Conventions, and Style | Language | supporting |
| `G6E_RC_001` | Cite Textual Evidence and Make Inferences | Reading Comprehension | critical |
| `G6E_RC_002` | Theme, Character, Plot, and Point of View | Reading Literature | critical |
| `G6E_RC_003` | Central Idea, Text Structure, and Source Integration | Reading Informational Text | critical |
| `G6E_RF_001` | Morphology, Roots, and Complex Word Analysis | Word Analysis / Language | supporting |
| `G6E_VOC_001` | Academic Vocabulary and Figurative Language | Vocabulary / Language | supporting |
| `G6E_WR_001` | Argument Writing With Claims and Evidence | Writing / Composition | critical |
| `G6E_WR_002` | Informative Writing and Source-Based Explanation | Writing / Composition | critical |
| `G6E_WR_003` | Narrative Writing With Pacing and Point of View | Writing / Composition | critical |

- **Recommended lengths:** baseline 20-34 items; progress monitoring 4-8; strand reassessment 8-18; grade mastery 26-42; cumulative mixed 16-30; next-grade screener 10-20. All are provisional/configurable/versioned/expert-review values.
- **Session guidance:** maximum continuous duration 35 minutes; Offer a break by 35 minutes or earlier on fatigue; prefer domain/item-set boundaries. Resume by completing unserved blueprint cells with unexposed equivalent items.
- **Domains:** Fluency, Language, Reading Comprehension, Reading Informational Text, Reading Literature, Vocabulary / Language, Word Analysis / Language, Writing / Composition.
- **Assessment claims supported:** domain-specific Mastered/Developing/Needs Support/Not Enough Evidence when future evidence rules are met, instructional priority areas, current-grade readiness after mastery gate evidence.
- **Assessment claims not supported:** scientifically validated thresholds at Phase Zero, clinical diagnosis, official school placement, next-grade mastery from screener, single overall grade label that hides domain weaknesses.
- **Prerequisites/dependencies:** Prerequisites are inferred from prior-grade domain continuity and package dependency links only for planning; targeted earlier-grade confirmation occurs only after a specific weakness is found. Use manifest-verified current packages and future sidecar prerequisite graph; unresolved non-manifest dependency links require review before automated sequencing.
- **Evidence:** minimum per critical package 2 and per critical domain 3 are provisional and require calibration.
- **Access constraints:** Read Question and Listen are allowed when construct-appropriate, meaning-equivalent, recorded as accommodation/context, and never score-penalized or answer-revealing. Math reading should be no harder than needed for the construct; English passage load must match the assessed reading/writing construct and grade. Visuals must be accessible and mobile-safe when used. Accommodation rule: Record accommodations for interpretation, do not penalize scores, and avoid demographic scoring adjustments.
- **Gate requirements:** current-grade mastery gate must be met before next-grade readiness; no unresolved critical prerequisite; domain-specific readiness retained; one strong domain cannot hide weakness in another.

## Critical/supporting/extension skill rules

- **critical:** Packages whose skills have high prerequisite importance, standards centrality, dependency depth, instructional centrality, frequent later use, and necessary domain coverage after expert review.
- **supporting:** Packages that broaden, apply, extend, or contextualize critical skills and are important for instruction but not always gate-blocking by themselves.
- **extension:** Advanced/enrichment packages, if later identified, that extend beyond core grade expectations. Current empty extension package lists mean `not_yet_reviewed`, not `reviewed_none_identified`, because extension classification has not completed expert validation.
- **extension_classification_status values:** `reviewed_none_identified` means expert review found no extension packages; `not_yet_reviewed` means no expert validation has occurred. All 12 current frameworks are `not_yet_reviewed`.
- **not_by_title_only:** Classification may not be based only on grade or title; future governance must review dependency evidence and standards.

## Decision rules

The framework supports four future decision labels: **Mastered**, **Developing**, **Needs Support**, and **Not Enough Evidence**. Exact cut scores, confidence rules, and domain-combination logic are not implemented here. They must be configurable, versioned, reviewed by experts, calibrated with real data, and subjected to standard setting before any validated claim is made. Field-test items are excluded from scored mastery/readiness evidence and contribute zero weight to mastery, readiness, recommendations, placement, and parent-facing decisions.

## Accessibility and fairness

- Read Question and Listen usage must not reduce scores.
- Accommodations are recorded for interpretation but not penalized.
- Math assessment must avoid unnecessary reading demands; spoken and written prompts must be meaning-equivalent.
- Audio must not reveal answers or change the measured construct.
- Visual models must be accessible, legible, and mobile-safe.
- No demographic attribute changes scoring.
- Reports provide instructional guidance only, not clinical diagnosis or official school placement.

## Provisional status of all rules

Every count, threshold, classification, role permission, and blueprint balance in this document and in the JSON blueprint is provisional, configurable, versioned, subject to expert review, and subject to future empirical calibration.

## Implementation implications

- Future phases need additive assessment item metadata sidecars and item lifecycle governance.
- Future scoring services must keep secure scoring separate from public practice answer keys.
- Future recommendation logic should cap parent-facing recommendations and preserve current Skill World routes.
- Future validation should confirm package IDs, blueprint coverage, item eligibility statuses, and exposure controls without modifying production packages.

## Known limitations

- The package inventory contains 122 packages and no missing core grade/subject/domain/skill metadata, but 18 dependency links point to IDs not present in the current manifest.
- Grade 6 next-grade readiness cannot be package-specific for Grade 7 from the current Grades 1–6 manifest; future Grade 7 inventory or a separate screener source is required.
- Current public package question banks expose answers for instruction/practice and are not secure operational assessment forms.
- Critical/supporting labels are framework starting points and require standards/dependency expert review.

### Non-manifest dependency links found

| Package ID | Field | Referenced ID |
|---|---|---|
| `G1E_FL_001` | `remediation_skill_id` | `G1E_FL_001_REVIEW` |
| `G1E_PH_001` | `remediation_skill_id` | `G1E_PH_001_REVIEW` |
| `G1E_PH_002` | `remediation_skill_id` | `G1E_PH_002_REVIEW` |
| `G1E_RC_001` | `remediation_skill_id` | `G1E_RC_001_REVIEW` |
| `G1E_RC_002` | `remediation_skill_id` | `G1E_RC_002_REVIEW` |
| `G1E_RF_001` | `remediation_skill_id` | `G1E_RF_001_REVIEW` |
| `G1E_RF_002` | `remediation_skill_id` | `G1E_RF_002_REVIEW` |
| `G1E_SW_001` | `remediation_skill_id` | `G1E_SW_001_REVIEW` |
| `G1E_WR_001` | `remediation_skill_id` | `G1E_WR_001_REVIEW` |
| `G1E_WR_002` | `next_skill_id` | `G1E_WR_002_REVIEW` |
| `G1E_WR_002` | `remediation_skill_id` | `G1E_WR_002_REVIEW` |
| `G1M_DP_001` | `next_skill_id` | `G1M_DP_002` |
| `G1M_DP_001` | `remediation_skill_id` | `G1M_DP_000` |
| `G1M_OP_003` | `next_skill_id` | `G1M_OP_004` |
| `G1M_PV_001` | `next_skill_id` | `G1M_NS_004` |
| `G2M_PV_001` | `next_skill_id` | `G2M_PV_002` |
| `G3M_MUL_001` | `next_skill_id` | `G3M_MUL_002` |
| `G6M_RP_001` | `next_skill_id` | `G6M_RP_002` |

## Expert-review requirements

- Review critical/supporting/extension classifications against curriculum standards and dependency depth.
- Set and document provisional cut scores through standard-setting methods before operational use.
- Calibrate item difficulty, reliability, accommodation interpretation, and confidence rules with real data.
- Review audio equivalence, reading load, visual accessibility, and constructed-response rubrics.
- Approve parent-report language so it remains instructional and non-diagnostic.

## Next Phase Zero task

Part 3 should create additive assessment item-governance/metadata specifications and validation plans that map future assessment items to existing package IDs without rewriting production questions, routes, renderers, schemas, progress systems, dashboards, or curriculum indexes.

## Phase Zero Part 2 preservation report

- **Files created:** `docs/grades1_6_assessment_framework.md`; `curriculum-framework/assessment/grades1-6-assessment-framework.v1.json`.
- **Existing files modified:** none intended.
- **Production preservation:** production SkillPackages, manifest, renderers, routes, schemas, voice behavior, learner progress systems, dashboards, and curriculum indexes were not modified.
- **Package inventory source used:** `public/gamehub/skill-world/content/manifest.json` plus each manifest-listed `*.skill-package.v1.json` file.
- **Missing or inconsistent package metadata found:** no missing core package metadata; 18 non-manifest dependency links are listed above and in the JSON `inventory_findings` section.
- **Blueprint decisions requiring expert review:** all counts, classifications, domain evidence minimums, confidence rules, item-status eligibility, accommodation interpretation, and parent-recommendation permissions.
- **What remains for Part 3:** additive item governance, metadata sidecars, validation rules, item review statuses, secure scoring design requirements, and no-production-change implementation planning.
