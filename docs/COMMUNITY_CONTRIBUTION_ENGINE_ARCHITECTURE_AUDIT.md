# Community Contribution Engine Architecture Audit

Date: 2026-06-20

## Scope and boundary

This is an audit of the assessment and archetype implementations currently present in Garvey. It does **not** propose new assessment logic, rename archetypes, or redesign scoring. The intended architecture remains:

- **Garvey = observation engine:** run assessments, score answers, determine existing archetypes, persist results, and emit normalized callback payloads.
- **Simba = interpretation engine:** consume Garvey outputs and derive community contribution profiles, strengths, growth areas, archetype alignment, development pathways, and progress over time.

## Assessment inventory

| Assessment | Key | Purpose | Archetypes / profiles produced | Scores returned | Strength fields | Growth-edge fields | Recommendation fields | Secondary archetypes | Metadata | Callback / normalized payload | API endpoint(s) | Saved database fields |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Business Owner Intake | `business_owner` | Classifies an owner/operator's business style from 25 intake questions. | `Builder`, `Architect`, `Operator`, `Connector`, `Resource Generator`, `Protector`, `Nurturer`, `Educator`. | `archetype_counts`; callback `score` is the sum of counts. | Callback `strengths`; result contract fields; `definition.strength`. | `weakness_archetype`, callback `growth_edges`, `definition.weakness`, `definition.improve`. | Callback `recommendations` is wired from `scored.recommendations`, but the current `scoreSubmission` result does not populate recommendations; legacy `biiEngine.runBII` can generate recommendations but is not the active `/api/intake` scorer. | `secondary_archetype`; response aliases `secondary`, `secondary_role`. | tenant, email, name, campaign, cid, session, raw answers, created time. | `buildAssessmentCompletionPayload` includes `assessment_key`, primary/secondary/weakness, score, strengths, growth_edges, recommendations, result URL, and result contract. | `GET /api/questions?assessment=business_owner`; `POST /api/intake`; `GET /api/results/:email?type=business_owner`. | `assessment_submissions`: tenant/user/session, `assessment_type`, `primary_archetype`, `secondary_archetype`, `weakness_archetype`, `archetype_counts`, `raw_answers`, campaign fields. |
| Customer / VOC Intake | `customer` / VOC | Classifies customer buying style and a mapped personal archetype from customer intake answers. | Buyer profiles: `Value Seeker`, `Loyal Supporter`, `Convenience Buyer`, `Experience Seeker`, `Social Promoter`, `Intentional Buyer`, `Trend Explorer`. Personal profile maps to the business-owner archetype family. | `archetype_counts`, `personality_counts`; callback `score` is sum of buyer counts. | Callback `strengths`; `generateVOCProfile` exposes `customer_profile`, `engagement_style`, `buying_trigger`, `loyalty_driver`. | `weakness_archetype`, `personality_weakness`, callback `growth_edges`, `friction_point`. | Callback `recommendations` is wired from `scored.recommendations`, but the current customer scorer does not populate recommendations. | Buyer `secondary_archetype`; personal `personality_secondary`; aliases `secondary`, `secondary_role`. | tenant, email/name, source/campaign/tap attribution, linked result, reward points. | `assessment.completed` callback includes `assessment_key: customer`, primary/secondary/weakness, score, strengths, growth_edges, recommendations, result URL, and result contract. | `GET /api/questions?assessment=customer`; `POST /voc-intake`; `POST /api/vocIntake`; `GET /api/results/:email?type=customer`; `GET /api/results/customer/:id` where present in server routing. | `assessment_submissions`: buyer and personal primary/secondary/weakness/count fields, customer name/email, cid, raw answers, campaign fields; `voc_sessions` captures session attribution. |
| Love Archetype Engine | `love` | Measures relationship bonding style, current/desired patterns, stress response, and consistency. | `Reassurance Seeker`, `Autonomous Lover`, `Expression Connector`, `Action Validator`, `Experience Seeker`. | `rawScores`, `maxPossibleScores`, `normalizedScores`, `bankScores`, `confidence`, `contradictionConsistency`, `completionQuality`, gaps, stress profile. | Normalized callback `strengths`; result has `primaryInsight`, `secondaryInsight`; archetypes include `whenStrong` / `coreStrengths` where authored. | Normalized callback `growth_edges` / `growth_areas`; result has `balanceInsight`, `identityGapInsight`, `consistencyInsight`; archetypes include out-of-balance fields. | Normalized callback `recommendations` from canonical/payload if present; current engine primarily returns insights rather than a large recommendation list. | `secondaryArchetype`; `hybridArchetype` when top scores are close. | consent, tenant, attribution, bank id/source, generated-bank diagnostics, retake compatibility, flags. | Score endpoint returns raw scored payload plus `canonical`; external event payload is display-ready with stable fields listed in the callback section. | `GET /api/archetype-engines/love/archetypes`; `POST /api/archetype-engines/love/assessment/start`; `POST /api/archetype-engines/love/assessment/score`; `GET /api/archetype-engines/love/results/:resultId`; `POST /api/archetype-engines/love/compatibility/score`. | `engine_assessment_consents`, `engine_assessments`, `engine_results.result_payload`, `engine_compatibility_results`, `engine_page_views`. |
| Leadership Archetype Engine | `leadership` | Measures leadership orientation across direction, structure, relational trust, influence, and adaptive control. | `Vision Drive`, `Structure Drive`, `Relational Intelligence`, `Influence Expression`, `Adaptive Control`. | Same archetype engine score contract as Love: raw/max/normalized scores, bank scores, confidence, consistency, balance/gap/stress fields. | Callback `strengths`; `primaryInsight`, `secondaryInsight`; archetype `balancedStateMeaning`. | Callback `growth_edges`; `balanceInsight`, `identityGapInsight`, `consistencyInsight`; archetype under/overexpressed and stress fields. | Callback `recommendations` if canonical/payload supplies them; archetype `rebalanceGuidance` is the main existing guidance. | `secondaryArchetype`; `hybridArchetype` when applicable. | consent, tenant, attribution, authored/generated bank diagnostics, flags. | Same archetype engine callback contract. | `GET /api/archetype-engines/leadership/archetypes`; `POST /api/archetype-engines/leadership/assessment/start`; `POST /api/archetype-engines/leadership/assessment/score`; `GET /api/archetype-engines/leadership/results/:resultId`. | `engine_assessment_consents`, `engine_assessments`, `engine_results.result_payload`, `engine_page_views`. |
| Loyalty Archetype Engine | `loyalty` | Measures loyalty/retention mechanism across trust, satisfaction, emotion, convenience, and switching friction. | `Trust Dependence`, `Satisfaction Attachment`, `Emotional Commitment`, `Convenience Habit`, `Switching Friction`. | Same archetype score contract plus loyalty-specific communication profile, loyalty loop, retention/churn insights, relationship interpretation. | Callback `strengths`; `loyaltyPattern`, `retentionInsight`, `relationshipInterpretation`, `communication_profile`. | Callback `growth_edges`; `churnRiskInsight`, `retentionGap`, `perceivedVsActualLoyalty`. | `loyaltyStrengtheningPlan`; `loveAssessmentCta`; callback `recommendations` when normalized from payload/canonical. | `secondaryArchetype`; `communication_profile.secondary_driver`; `hybridArchetype` where applicable. | consent, tenant, attribution, bank diagnostics, loyalty scientific foundation labels. | Same archetype engine callback contract with richer loyalty fields in result payload. | `GET /api/archetype-engines/loyalty/archetypes`; `POST /api/archetype-engines/loyalty/assessment/start`; `POST /api/archetype-engines/loyalty/assessment/score`; `GET /api/archetype-engines/loyalty/results/:resultId`. | `engine_assessment_consents`, `engine_assessments`, `engine_results.result_payload`, `engine_page_views`. |
| Gates Parent Observation / Youth Rite of Passage | `gates_parent_observation_v1` | Non-diagnostic parent observation across the 10 Gates of child development. | Not called archetypes in code; produces `primary_gates`, `strongest_gates`, and `current_growth_gate`. Gates: Attention, Emotion, Choice, Body, Discipline, Truth, Repair, Creation, Community, Legacy. | Per-gate `raw_score`, `max_score`, `normalized_score`, `current_stage`; `confidence_summary`; `normalized_scores`. | `primary_gates`, `strongest_gates`, per-gate strongest scores, `gates_profile`. | `current_growth_gate`, `growth_gate`, `reflection_focus`, `observation_focus`, `suggested_next_practice`. | `generateGatesRecommendations`, practice recommendations, habit bank, blueprint guidance. | Top three `primary_gates`; current growth gate is a secondary developmental focus. | parent/child IDs, assessment version, non-diagnostic disclaimer, gate map, timeline events. | No Simba-wide normalized callback is emitted in the same way as archetype engines; response is structured assessment data suitable for Simba after adapter normalization. | `GET /api/gates/assessment/questions`; `POST /api/gates/assessment/submit`; `GET /api/gates/assessment/:assessmentId`; `GET /api/gates/children/:childId/recommendations`; related progress/history routes. | `gates_assessments`: parent, child, assessment key/version, JSON payload; `gates_practice_logs`, `gates_practice_recommendations`, `gates_development_timeline`. |
| Assessment MVP Baseline / Reassessment | `assessment-mvp` with roles `baseline` and `reassessment` | Instructional K-6 Math/English assessment session for skill evidence and package recommendations. | No personality/community archetypes; produces skill evidence and recommendations by skill/package. | `response_results`, `skill_evidence`, completed session state, exposure; readiness/provisional evidence inside scoring records. | Evidence fields include skill/domain and correct/incorrect signal. | Recommendations and skipped recommendations identify skill gaps and next package targets. | `recommendations` up to three packages; reassessment endpoint narrows follow-up packages. | None. | session version, assessment role, grade, subject, package IDs, exposure, child context. | No external Simba callback in current route; public result payload is stable for adapter consumption. | `POST /api/assessment-mvp/sessions`; `GET /api/assessment-mvp/sessions/:sessionId`; `PATCH /api/assessment-mvp/sessions/:sessionId/progress`; `POST /api/assessment-mvp/sessions/:sessionId/responses`; `POST /api/assessment-mvp/sessions/:sessionId/reassessment`; history/current-session routes. | Assessment MVP tables include sessions, responses/results, recommendations, exposures; persistent store also tracks learner/parent ownership and scoring/evidence versions. |

## Complete archetype inventory

### Business-owner / personal archetypes

| Archetype | Description / characteristics | Behavioral pattern | Strength indicator | Weakness indicator | Existing recommendation | Relationships |
|---|---|---|---|---|---|---|
| Builder | Action-oriented; executes quickly. | Starts fast, patches quickly, favors momentum and speed. | Execution. | Inconsistency. | Implement routines and tracking systems. | Maps from customer `Trend Explorer`; often pairs with `Resource Generator`. |
| Architect | Strategic; systems and clarity. | Plans, analyzes, redesigns processes, documents knowledge. | Systems. | Overthinking. | Set execution deadlines. | Often pairs with `Operator`, `Educator`, `Protector`. |
| Operator | Structured; stability and repeatability. | Uses calendars, budgets, processes, quality control, organized prioritization. | Stability. | Rigidity. | Introduce flexibility. | Often pairs with `Architect`, `Protector`, `Builder`. |
| Connector | Relationship-driven/social. | Collaborates, networks, checks in, manages feedback through people. | Relationships/networking. | Lack of systems. | Track interactions and follow-ups. | Often pairs with `Nurturer`, `Educator`, `Resource Generator`. |
| Resource Generator | Opportunity/revenue-focused. | Pursues sales, growth, outreach, offers, reinvestment. | Revenue generation. | Poor retention. | Build repeat systems. | Customer `Value Seeker` maps here; often pairs with `Builder`. |
| Protector | Risk-aware/cautious. | Researches, verifies, saves, prevents mistakes, checks quality. | Risk control. | Fear-based hesitation. | Test low-risk actions. | Often pairs with `Operator`, `Architect`, `Educator`. |
| Nurturer | Care-driven and loyalty-oriented. | Helps people, invests in community/customer experience, fair pricing. | Loyalty/care. | Underpricing. | Set boundaries and pricing standards. | Customer `Loyal Supporter` maps here; often pairs with `Connector`, `Educator`. |
| Educator | Knowledge/trust-focused. | Teaches, researches, documents, builds authority through education. | Trust building. | Low monetization. | Package and sell knowledge. | Customer `Intentional Buyer` maps here; often pairs with `Protector`, `Architect`, `Nurturer`. |

### Customer / VOC buyer archetypes

| Archetype | Description / characteristics | Behavioral pattern | Strength indicator | Weakness / friction indicator | Existing recommendations | Relationships |
|---|---|---|---|---|---|---|
| Value Seeker | Price/deal/value sensitive. | Responds to discounts, bundles, affordability, proven value. | Value awareness. | May wait for deals or churn on price. | Not explicitly generated by scorer. | Maps to personal `Resource Generator`. |
| Loyal Supporter | Familiarity, trust, recognition, loyalty. | Returns when treated well, known, acknowledged, and rewarded. | Loyalty and commitment. | Can disengage when not recognized. | Not explicitly generated by scorer. | Maps to personal `Nurturer`. |
| Convenience Buyer | Speed/ease/access oriented. | Chooses fast, nearby, simple, low-friction options. | Practical efficiency. | Leaves when service is slow or inconvenient. | Not explicitly generated by scorer. | Maps to personal `Operator`. |
| Experience Seeker | Vibe/quality/premium experience oriented. | Values aesthetics, high-quality moments, exclusive experiences. | Experiential discernment. | May be dissatisfied by flat routine. | Not explicitly generated by scorer. | Maps to personal `Architect`; also overlaps with Love `Experience Seeker` by name but not by implementation. |
| Social Promoter | Social proof and sharing orientation. | Responds to online presence, vibe, community, shareable moments. | Advocacy. | May need visible social value. | Not explicitly generated by scorer. | Often paired in options with `Experience Seeker`. |
| Intentional Buyer | Trust, recommendation, intentional fit. | Chooses with care, familiarity, and evidence. | Deliberate trust. | Slower conversion. | Not explicitly generated by scorer. | Maps to personal `Educator`. |
| Trend Explorer | Newness and exploration. | Tries what is new, attractive, or opportunistic. | Curiosity and experimentation. | Lower stability/loyalty. | Not explicitly generated by scorer. | Maps to personal `Builder`. |

### Love archetypes

| Archetype | Description / core characteristics | Behavioral patterns | Strength indicators | Weakness indicators | Existing recommendations / relationships |
|---|---|---|---|---|---|
| Reassurance Seeker (`RS`) | Proximity, reassurance, emotional safety, validation-centered bonding. | Seeks closeness, checks emotional signals, needs validation. | Warm, loyal, emotionally available, openly connected. | Hypervigilance to distance, over-checking, reassurance spirals, shutdown after unmet reassurance. | Pairs dynamically with other love profiles through compatibility scoring. |
| Autonomous Lover (`AL`) | Autonomy protection, independent closeness, self-containment. | Regulates distance, protects space, paces emotional merging. | Self-possessed, calm under pressure, intentionally present. | Excessive distance regulation, emotional inaccessibility, over-detachment, isolation. | Relationship to `RS` is a key polarity: closeness-seeking versus distance regulation. |
| Expression Connector (`EC`) | Verbal-emotional clarity and repair dialogue. | Talks through feelings, names needs, processes conflict verbally. | Direct, emotionally literate, constructive in conflict. | Over-processing, over-explaining, conversational overload, ambiguity when underexpressed. | Often secondary to `RS`; overlaps with communication characteristics. |
| Action Validator (`AV`) | Proof through behavior, reliability, follow-through. | Trusts actions more than words; tracks consistency. | Dependable, stable, accountable. | Transactional tracking, rigid expectations, low tolerance for inconsistency, dropped commitments when low. | Overlaps strongly with loyalty trust/reliability. |
| Experience Seeker (`ES`) | Novelty, activation, shared experience, anti-stagnation. | Bonds through movement, stimulation, variety, shared moments. | Engaged, playful, emotionally alive. | Novelty chasing, instability, dissatisfaction with routine, boredom. | Name overlaps with customer `Experience Seeker`; implementation is relationship-specific. |

### Leadership archetypes

| Archetype | Description / core characteristics | Behavioral patterns | Strength indicators | Weakness indicators | Existing recommendations / relationships |
|---|---|---|---|---|---|
| Vision Drive (`VD`) | Directional momentum and future orientation. | Creates future direction and narrative clarity. | Sets bold direction while grounded in execution. | Direction unclear when low; vision outruns follow-through when high. | Rebalance by pairing long-range framing with concrete near-term commitments; overlaps with initiative/vision. |
| Structure Drive (`SD`) | Systems, process rigor, dependable execution. | Builds order, accountability, repeatability. | Clarity and reliability without suffocating adaptability. | Execution drift when low; process dominance when high. | Rebalance by keeping guardrails while reopening iteration; overlaps with organization/discipline. |
| Relational Intelligence (`RI`) | Empathy, context sensing, trust calibration. | Builds team confidence and interpersonal trust. | Trust with standards/accountability. | People feel unseen when low; harmony delays hard calls when high. | Rebalance by combining empathy with explicit boundaries and decisions. |
| Influence Expression (`IE`) | Persuasion, narrative delivery, mobilization. | Communicates to move people into action. | Clear, audience-adapted communication. | Ideas do not convert when low; message intensity eclipses listening when high. | Rebalance advocacy with inquiry and feedback loops. |
| Adaptive Control (`AC`) | Composure and steering under change. | Recalibrates, handles risk, adapts while stabilizing. | Adjusts quickly without losing coherence. | Change shocks decisions when low; constant pivots confuse when high. | Rebalance by defining stable versus flexible elements. |

### Loyalty archetypes

| Archetype | Description / core characteristics | Behavioral patterns | Strength indicators | Weakness indicators | Existing recommendations / relationships |
|---|---|---|---|---|---|
| Trust Dependence (`TD`) | Credibility, integrity, promises kept. | Stays when trust and consistency are present. | Trust and performance reinforce each other. | Trust breach creates rapid loyalty collapse; trust inertia may hide declining value. | Communication profile emphasizes confident/direct trust reinforcement. |
| Satisfaction Attachment (`SA`) | Quality, utility, value delivery. | Stays when relationship or product continues to work well. | High satisfaction supports repeat behavior. | Value drop triggers comparison shopping. | Reinforce quality/usefulness/continued payoff. |
| Emotional Commitment (`ECM`) | Belonging, affinity, emotional resonance. | Stays when emotionally seen and connected. | Emotion amplifies loyalty while value remains visible. | Emotional disengagement and inauthenticity lead to silent churn. | Use warm/human connection, recognition, belonging. |
| Convenience Habit (`CH`) | Ease, routine, low friction. | Stays with what fits day-to-day flow. | Convenience supports retention without masking dissatisfaction. | Friction breaks habit; poor-fit habit can persist. | Keep interactions simple, clear, low-friction. |
| Switching Friction (`SF`) | Exit cost, inertia, stability. | Stays because change is costly or disruptive. | Barriers are fair and secondary to trust/value. | Coercive lock-in erodes goodwill; resentment plus alternatives can flip behavior. | Reduce coercive friction and earn renewal through value. |

### Gates developmental profiles

The Gates system does not use the word archetype for its result; it produces gate strengths and a growth gate.

| Gate | Current characteristic | Evidence pattern | Strength/growth use |
|---|---|---|---|
| Attention | Focus, noticing details, returning to task. | Two parent-observation questions. | Can be a strongest gate or current growth gate. |
| Emotion | Naming feelings and regaining calm. | Two questions. | Growth focus includes reflection, observation, and practice guidance. |
| Choice | Age-appropriate decisions and ownership of outcomes. | Two questions. | Supports decision-making evidence. |
| Body | Energy routines and body-signal awareness. | Two questions. | Supports self-regulation/body awareness evidence. |
| Discipline | Following steps and waiting turns. | Two questions. | Supports consistency/discipline evidence. |
| Truth | Honest reporting and clarification. | Two questions. | Supports trustworthiness/truth evidence. |
| Repair | Apology, making things right, accepting repair. | Two questions. | Supports conflict repair evidence. |
| Creation | Trying ideas and finishing creative work. | Two questions. | Supports creativity/initiative evidence. |
| Community | Inclusion and respecting group boundaries. | Two questions. | Supports community/relationship evidence. |
| Legacy | Reflection, applying learning, helping younger peers. | Two questions. | Supports growth-over-time and contribution evidence. |

## Consolidated characteristic library

| Characteristic | Garvey evidence sources |
|---|---|
| Leadership | Leadership engine; Business Owner team/goals/process questions; Gates Legacy/Community for youth contribution signals. |
| Vision / future orientation | Leadership `Vision Drive`; Business Owner goals/content/growth strategy. |
| Organization / systems | Business Owner `Architect`/`Operator`; Leadership `Structure Drive`; Gates Discipline; Assessment MVP session progress/completion discipline. |
| Execution / initiative | Business Owner `Builder`/`Resource Generator`; Leadership `Influence Expression` and `Vision Drive`; Gates Creation/Choice. |
| Discipline / consistency | Gates Discipline; Love `Action Validator`; Loyalty `Trust Dependence` and `Convenience Habit`; Leadership `Structure Drive`; Business Owner `Operator`. |
| Empathy / care | Leadership `Relational Intelligence`; Business Owner `Nurturer`; Love `Reassurance Seeker` and `Expression Connector`; Gates Emotion/Community. |
| Communication | Love `Expression Connector`; Leadership `Influence Expression`; Business Owner Connector/Educator questions; Gates Truth/Repair. |
| Decision making | Gates Choice; Leadership `Adaptive Control`; Business Owner risk/decision questions; Loyalty switching/value tradeoffs. |
| Trustworthiness / reliability | Love `Action Validator`; Loyalty `Trust Dependence`; Leadership `Relational Intelligence`; Business Owner Protector/Educator; Gates Truth. |
| Loyalty / commitment | Loyalty engine all dimensions; Business Owner `Nurturer`; Customer `Loyal Supporter`; Love `Reassurance Seeker`; Gates Community/Legacy. |
| Adaptability | Leadership `Adaptive Control`; Business Owner Builder/Protector/Architect tension; Gates Choice/Emotion. |
| Risk management | Business Owner `Protector`; Leadership `Adaptive Control`; Loyalty `Switching Friction`; Assessment MVP limitations/provisional evidence. |
| Creativity / novelty | Love `Experience Seeker`; Customer `Experience Seeker`/`Trend Explorer`; Gates Creation; Leadership `Vision Drive`. |
| Community / relationships | Business Owner `Connector`/`Nurturer`; Leadership `Relational Intelligence`; Gates Community; Customer `Social Promoter`; Love proximity/repair profiles. |
| Learning / education | Business Owner `Educator`; Gates Legacy; Assessment MVP skill evidence; Customer `Intentional Buyer`. |
| Value / resource management | Business Owner `Resource Generator`; Customer `Value Seeker`; Loyalty `Satisfaction Attachment`; Business Owner pricing/money questions. |
| Self-regulation | Gates Emotion/Body; Leadership `Adaptive Control`; Love autonomy/reassurance balance; Loyalty churn/retention stress patterns. |
| Conflict repair | Love `Expression Connector`; Gates Repair; Leadership `Relational Intelligence`; Loyalty trust-rebuild patterns. |

## Cross-assessment overlap map

- **Organization / systems:** Business Owner (`Architect`, `Operator`) + Leadership (`Structure Drive`) + Gates (`Discipline`) + Assessment MVP (session progress, completion, package evidence).
- **Trust / reliability:** Loyalty (`Trust Dependence`) + Love (`Action Validator`) + Gates (`Truth`) + Leadership (`Relational Intelligence`) + Business Owner (`Protector`, `Educator`).
- **Communication / expression:** Love (`Expression Connector`) + Leadership (`Influence Expression`) + Gates (`Truth`, `Repair`) + Business Owner (`Connector`, `Educator`).
- **Empathy / relational contribution:** Leadership (`Relational Intelligence`) + Business Owner (`Nurturer`, `Connector`) + Gates (`Emotion`, `Community`) + Love (`Reassurance Seeker`).
- **Initiative / execution:** Business Owner (`Builder`, `Resource Generator`) + Leadership (`Vision Drive`, `Influence Expression`) + Gates (`Choice`, `Creation`).
- **Loyalty / commitment:** Loyalty engine + Customer (`Loyal Supporter`) + Business Owner (`Nurturer`) + Love (`Reassurance Seeker`, `Action Validator`) + Gates (`Community`, `Legacy`).
- **Adaptability / resilience:** Leadership (`Adaptive Control`) + Gates (`Emotion`, `Choice`, `Body`) + Business Owner (`Builder` quick adjustment, `Protector` risk checks) + Loyalty churn-risk fields.
- **Community contribution readiness:** strongest overlapping evidence comes from Gates `Community`/`Legacy`, Leadership `Relational Intelligence`/`Influence Expression`, Business Owner `Connector`/`Nurturer`/`Educator`, Customer `Social Promoter`/`Loyal Supporter`, and Loyalty `Emotional Commitment`/`Trust Dependence`.

## Normalized callback fields Simba can reliably consume

### Strongest existing callback contract

Archetype engine completions (`love`, `leadership`, `loyalty`) and intake completions (`business_owner`, `customer`) queue `assessment.completed` events. Simba can rely on these top-level normalized fields when present:

- `event_type`
- `member_id`
- `email`
- `assessment_id` or `submission_id`
- `assessment_key`
- `assessment_name`
- `assessment_type`
- `result_id`
- `result_url`
- `completed_at`
- `completion_status`
- `score`
- `overall_score`
- `primary_result`
- `secondary_result`
- `primary_archetype`
- `secondary_archetype`
- `archetype`
- `summary`
- `strengths`
- `growth_edges`
- `growth_areas`
- `recommendations`
- `recommended_next_assessment` / `next_assessment`
- `badge_unlocks`
- `future_review_date`

### Canonical archetype-engine payload fields

For `love`, `leadership`, and `loyalty`, `result_payload.canonical` is the most useful stable source for Simba because it preserves observation data without interpretation. It includes:

- identity: `assessment_id`, `user_id`, `engine`, `version`, `bank_id`, `questionSource`, `attribution`
- score maps: `normalizedScores`, `rawScores`, `maxPossibleScores`
- state maps: `balance_states`, `stress_profile`, `desired_gap`, `identity_behavior_gap`
- quality: `consistency`, `confidence`, `flags`

### Gates fields Simba can consume after adapter normalization

Gates does not currently emit the same external callback contract. Simba can consume the stored/returned structured payload fields:

- `assessment_id`, `assessment_key`, `assessment_version`
- `child_id`, `parent_id` / `parent_user_id`
- `gate_scores`
- `normalized_scores`
- `primary_gates`
- `strongest_gates`
- `current_growth_gate`
- `gates_profile.growth_gate`
- `gates_profile.gate_map`
- `confidence_summary`
- `non_diagnostic_disclaimer`
- recommendation payloads from Gates recommendations/practice logs

### Assessment MVP fields Simba can consume after adapter normalization

Assessment MVP does not currently emit the same external callback contract. Useful stable fields are:

- `session_id`, `assessment_role`, `grade`, `subject`, `status`
- `completed_session`
- `response_results`
- `skill_evidence`
- `recommendations`
- `skipped_recommendations`
- `exposure`
- `limitations`

## Implementation notes for Simba

1. Simba should treat Garvey archetypes and gates as **evidence labels**, not final community roles.
2. The safest cross-assessment join keys are `email` / `member_id`, `assessment_key`, `result_id` or `submission_id`, and `completed_at`.
3. For archetype engines, prefer `canonical.normalizedScores` and `canonical.flags` for longitudinal math; prefer top-level callback fields for display.
4. For intake/VOC, use primary/secondary/weakness/count fields but expect recommendations to be sparse unless the legacy BII recommendation generator is explicitly integrated later.
5. For Gates and Assessment MVP, build Simba-side adapters rather than changing Garvey scoring.
