# Garvey Genius Discovery — Trait 01: Self-Regulation
**Status:** hypothesis-led product blueprint; NOT a validated assessment, diagnostic instrument, or demonstration of educational effectiveness.
**Version:** 0.1 / 2026-10-29. **Scope:** One trait only. No game or child-data processing is implemented by this document.
**World boundary:** Youth Development / Genius Discovery is separate from the Rite of Passage's symbolic Ten Gates. The same child account may link them eventually, but scores, gate identities, story content and ceremonies must not be conflated.

## Mission and public promise
Explore how children respond to age-appropriate challenges; show parents what actions were observed, how those actions changed during repeated play, and concrete home activities to try. Parents remain partners and guides, not passive recipients of labels.
**Proposed parent wording:** "Welcome to the Genius Discovery Journey. Each activity is an exploration of how your child approaches challenges. We record specific actions, show what they may suggest, and invite you to try related activities together. This is a developing product: we are studying how helpful these observations are. It is not a medical or educational diagnosis, fixed intelligence ranking, or proven prediction of future success."
**Informed participation:** parent/guardian consent before child-specific behavioral telemetry; child-friendly assent; clear explanation of what is stored, why, retention, access, and deletion; option to leave without penalty; opt out of research use separately from core gameplay. Avoid collecting audio, video, precise location, and emotion inference by default.

## Construct to investigate
Repo canonical trait: `SR / SELF_REGULATION`, `youth-development/measurement/traitModel.js`.
Canonical definition: "Ability to manage attention, emotion, and behavior in service of a chosen task goal."
The repo currently specifies: beginning with limited prompting; returning after distraction; using a calming/focusing strategy; following multistep instructions; pausing when rules change; pacing/checking steps. Preserve these as theoretical **candidate indicators**, not automatically validated measurements.

Related research distinguishes working memory (maintain goal/rule), inhibitory control (pause rather than habitual response), and cognitive flexibility (shift to new rule). Emotional regulation is broader and cannot be inferred directly from button presses. Explicitly separate behaviors the software can observe from subjective experiences it cannot.
Research background:
- Harvard Center on the Developing Child, *Enhancing and Practicing Executive Function Skills*, https://developingchild.harvard.edu/resources/handouts-tools/activities-guide-enhancing-and-practicing-executive-function-skills/
- McCoy (2019), *Measuring Young Children's Executive Function and Self-Regulation in Classrooms and Other Real-World Settings*, doi:10.1007/s10567-019-00285-1, https://pubmed.ncbi.nlm.nih.gov/30778803/
- Review, *Assessment of executive functions in school-aged children*, https://pmc.ncbi.nlm.nih.gov/articles/PMC9674032/
- Review, *Conceptualization of ecological validity*, https://pubmed.ncbi.nlm.nih.gov/38251679/

## Research questions and hypotheses (not results)
**H1, task-specific:** after demonstrating comprehension, a child can sometimes adapt to a clear rule change without an external prompt.
**H2, within-person growth:** when the child chooses to practice review/pause strategies, comparable future trials may show faster and/or more accurate rule-change adaptation with less direct assistance.
**H3, tentative generalization:** parent-reported use of planning/check-in strategies at home may change across time; do not equate that report with game transfer or causal impact.
**Exploratory:** game engagement, navigation familiarity, language comprehension, accessibility needs, fatigue and task difficulty may affect results independently of self-regulation.

## First game: The Shifting Garden (scoped to discovery, not clinical assessment)
A calm 3D garden contains three glowing lantern stations. Child has an accessible map and is shown a short sequence, then activates lanterns in order.
1. **Onboarding, unscored:** movement controls, vision and audio options, rule explanation, comprehension checks, practice with corrective guidance. Retry or switch control method. Do not proceed to measurement until the child demonstrates understanding.
2. **Baseline A:** follow a 2–3 step sequence with no conflicting cues. Log successful order, independent completion and support use; not raw speed ranking.
3. **Change trial B:** rule changes visibly, e.g., activate the lanterns in reverse order or follow a different symbol. Check that new rule was perceived; log old-rule responses and correct adaptation.
4. **Pause/check option C:** child can consult a visual goal card or use an optional quiet pause. Log intentional use but never treat not using a tool as low regulation.
5. **Supported practice D:** offer a neutral strategy prompt ("Check the new rule before choosing") and replay a *different* equivalent sequence. Label as supported performance, not baseline.
6. **Later retest E:** novel, difficulty-matched variants on a subsequent session, minimal prompting. Compare per-task indicators, not an unvalidated global percentile.
7. **Exit:** child may stop, take breaks, skip or replay; no shame, penalty or forced frustration. The narrative rewards attention to one's own strategy.

### Required challenge design properties
- One primary observable construct at a time (e.g., adaptation after a rule change), while logging secondary behaviors without assigning multiple scores by default.
- Equivalent variants randomized/counterbalanced where possible; keep visual salience and movement distance comparable.
- No high-stakes timers, surprise aversive sounds or manipulative frustration.
- Age and accessibility adaptations recorded as task context, not folded into trait rank.
- Explicitly separate navigation performance from cognitive-rule performance; offer simplified 2D/touch controls if needed.
- Practice and baseline tasks are distinct; never call assisted performance independent mastery.

## Measurement event schema (proposal; not existing persisted API)
Each record: event_id, pseudonymous_child_id, consent_version, game_id, challenge_id, task_variant, primary_trait='SR', indicator_code, observation_type, local_event_timestamp, session_id, attempt_index, difficulty_id, input_mode, instruction_comprehension_confirmed, adaptation_notes, assistance_type, optional strategy_tool_used, objective_outcome, latency_ms_if_relevant, data_quality_flags, game_build_version, rubric_version.
Do not record unnecessary free-form sensitive information. Server-verify event integrity where feasible; assume client events can be manipulated.
**Core candidate observations:**
- `RULE_SHIFT_ACCURACY`: correct new-rule response / opportunities AFTER comprehension demonstrated.
- `OLD_RULE_PERSEVERATION`: prior-rule responses after change / comparable opportunities; descriptive, not pathologizing.
- `MULTISTEP_ACCURACY`: correctly completed steps / opportunities.
- `INDEPENDENT_RESET`: visible voluntary use of task-reset option when offered, counted as a behavior, not a moral virtue or required response.
- `RECOVERY_TO_GOAL`: return to goal after a clear task interruption; distinguish deliberate exploration and necessary breaks.
- `SUPPORT_LEVEL`: no prompt / strategy reminder / explicit instruction / full assistance, reported separately.
Avoid inferred emotions, motivation, neurotype, diagnosis, "grit", or personality from raw telemetry.

## Interpretation rules
- First session: "What we observed"; no single session is a reliable trait score.
- Repeated sessions: within-child, task-specific change with number of opportunities, task version, assistance, and uncertainty; do not compare children or claim norms.
- Display evidence completeness explicitly: limited, developing, repeated, or insufficient; no unsupported confidence percentages.
- Flag invalid/uninterpretable trials: misunderstood rule, controller problem, accidental inputs, interruption, insufficient tasks.
- Never conflate deliberate disengagement, fatigue, sensory difficulty, language mismatch, or choosing to ask for help with a deficit.
- Do not classify fixed "self-regulating child" vs "non-self-regulating child." No score released before rubric calibration, validity and reliability review.

## Parent participation, not replacement
**Parent view (example only; not child result):** "During three rule-change challenges, your child used the new rule correctly in 5 of 7 opportunities. A visual reminder was available; it was used once. We're continuing to learn what these patterns mean."
**Home option 1 — Switch the Rule:** lay out three colored cards; follow a sequence, then switch the sorting rule. Ask, "What changed? What will you do first?" Keep it playful.
**Home option 2 — Plan, Do, Check:** cook a simple snack, build a kit, or tidy one area. Child names two steps before acting, checks midway, reflects afterwards.
**Home option 3 — Gentle Return:** after an ordinary interruption, invite the child to choose a helpful reminder and return to an activity when ready.
Parents can optionally note setting, activity, support offered and specific observed actions; such notes are *parent report*, not verified game performance. Do not tell parents to deliberately distress children or induce emotional dysregulation.
**School transfer suggestion:** try a 2-step plan, a visual checklist, and a brief "what changed?" prompt while doing actual homework. Treat improvement in schoolwork as a question requiring separate evidence.

## Validation plan and decision gates
**Gate A – Content:** independent childhood-development and accessibility review: does the activity truly elicit the indicator? Is it fair across ages, cultures and disabilities?
**Gate B – Usability:** child comprehension testing, input accessibility, burden, engagement without game-control artifacts.
**Gate C – Reliability:** compare matched versions over repeated sessions; examine scorer agreement if human coding is used; quantify missingness and practice effects.
**Gate D – Construct validity:** compare with independent, appropriate measures and observations; test alternative explanations, including age and game experience.
**Gate E – Parent usefulness:** ask whether suggestions are clear, feasible and supportive; measure participation without coercion.
**Gate F – Transfer:** separate evaluations of home/classroom behaviors and schoolwork, ideally with suitable comparison conditions. No transfer claims based only on in-game improvement.

## Technical integration seams (not implemented)
- Reuse the **conceptual model**, trait code and safeguard rules in `youth-development/measurement/traitModel.js`.
- Link challenge metadata to `youth-development/measurement/taskModel.js`; respect its current `scoring_model_status: ready_for_future_integration` rather than claiming game scoring exists.
- Implement dedicated Youth Development game IDs and child-owned records, explicitly separate from `gates-v2/` Rite of Passage sessions.
- Build an event validator and task-specific reporter before aggregating to any `resultBuilder.js` trait score.
- Require parent authorization and privacy review prior to storage of real child events.
- Do not modify live user workflows, academic mastery, or existing parent dashboards until event schema and report language are reviewed.

## Design acceptance criteria for implementation phase
- [ ] Child understands controls and goal before measured trials; failures during onboarding are never scored.
- [ ] Every scored event identifies the exact task, opportunity, conditions and rubric version.
- [ ] Changed-rule response can be separated from basic accuracy, control skill and prompt assistance.
- [ ] Replay has equivalent variants; arbitrary faster times cannot inflate apparent SR.
- [ ] Parent report conveys concrete observations and uncertainty, never diagnosis or trait destiny.
- [ ] Parent receives optional real-world activities and can opt out without disadvantage.
- [ ] Child data protection, access controls, delete/export and consent review complete.
- [ ] Independent reliability/validity evaluation is planned and results are transparently reported.

## Next step
Implement an **unscored interactive prototype** of the Shifting Garden and manually inspect event logs with synthetic child IDs; do not collect real child behavioral data or present standardized ratings yet. Complete this trait's review before proceeding to CQ (Curiosity).
