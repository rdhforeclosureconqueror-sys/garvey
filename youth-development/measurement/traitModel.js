"use strict";

const YOUTH_DEVELOPMENT_TRAIT_MODEL = Object.freeze({
  domain_code: "YOUTH_DEVELOPMENT",
  domain_name: "Youth Talent Development Measurement",
  domain_positioning: Object.freeze({
    purpose: "Measure developmental levers that can be detected, strengthened, and tracked over time.",
    non_goals: Object.freeze([
      "Does not assign fixed identity labels.",
      "Does not claim guaranteed life outcomes.",
      "Does not replace broad cognitive or educational evaluation.",
    ]),
    operating_cycle: Object.freeze(["detect", "develop", "measure"]),
  }),
  shared_rules: Object.freeze({
    construct_rules: Object.freeze([
      "Score present-state observable behavior, not predicted destiny.",
      "Use multi-source evidence where possible; avoid single-rater dominance.",
      "Prefer task/performance evidence before inferred trait labels.",
      "Treat traits as growable and context-sensitive.",
    ]),
    scoring_readiness_rules: Object.freeze([
      "Indicators should map to specific tasks or observation rubrics.",
      "Each metric should support repeated measurement windows.",
      "Confidence should depend on consistency and evidence mix quality.",
    ]),
  }),
  evidence_sources: Object.freeze({
    child_task: Object.freeze({
      code: "child_task",
      label: "Child Task Performance",
      description: "Direct performance on structured tasks with observable outputs.",
      evidence_type: "performance",
    }),
    child_scenario: Object.freeze({
      code: "child_scenario",
      label: "Child Scenario Response",
      description: "Choices, reasoning, and strategy shown in scenario-based prompts.",
      evidence_type: "scenario",
    }),
    child_retry: Object.freeze({
      code: "child_retry",
      label: "Child Retry Behavior",
      description: "Behavior change, persistence, and adaptation after feedback/scaffold.",
      evidence_type: "longitudinal_performance",
    }),
    parent_observation: Object.freeze({
      code: "parent_observation",
      label: "Parent Observation",
      description: "Home-context observations of behavior frequency and support needs.",
      evidence_type: "observer_report",
    }),
    teacher_observation: Object.freeze({
      code: "teacher_observation",
      label: "Teacher Observation",
      description: "School/learning-context observations under structured demands.",
      evidence_type: "observer_report",
    }),
    assessor_observation: Object.freeze({
      code: "assessor_observation",
      label: "Assessor Observation",
      description: "Trained assessor notes from administered tasks and interactions.",
      evidence_type: "observer_report",
    }),
  }),
  traits: Object.freeze({
    SR: Object.freeze({
      trait_code: "SR",
      trait_name: "SELF_REGULATION",
      definition: "Ability to manage attention, emotion, and behavior in service of a chosen task goal.",
      observable_indicators: Object.freeze([
        "Begins tasks with minimal external prompting.",
        "Returns to task after distraction within a short interval.",
        "Uses a calming or focusing strategy when frustrated.",
        "Follows multi-step instructions without frequent derailment.",
        "Pauses before acting when task rules change.",
        "Monitors and adjusts pacing to complete required steps.",
      ]),
      development_levers: Object.freeze([
        "Pre-task planning routine (goal, steps, time check).",
        "Cue-based attention resets (visual or verbal anchors).",
        "Emotion labeling plus regulation script.",
        "Chunking long tasks into short completion loops.",
        "Structured self-monitoring check-ins during work.",
      ]),
      measurement_metrics: Object.freeze([
        "On-task ratio across task intervals.",
        "Recovery time after distraction.",
        "Frequency of independent regulation strategy use.",
        "Instruction-following accuracy for multi-step tasks.",
        "Rule-shift adaptation latency.",
      ]),
      allowed_evidence_sources: Object.freeze([
        "child_task",
        "child_retry",
        "parent_observation",
        "teacher_observation",
        "assessor_observation",
      ]),
      overlap_risks: Object.freeze([
        "Can be confused with PS when non-completion is interpreted only as low effort.",
        "Can be confused with FB when compliance to feedback is mistaken for self-regulation.",
      ]),
      anti_contamination_rules: Object.freeze([
        "Do not score SR from effort duration alone; require regulation behavior evidence.",
        "Do not treat agreement with adult direction as SR unless self-management behavior is visible.",
        "Separate emotional upset from SR deficit unless recovery behavior is repeatedly absent.",
      ]),
      example_growth_signals: Object.freeze([
        "Child independently uses reset strategy and returns to task faster over sessions.",
        "Fewer external prompts are needed to maintain task flow.",
      ]),
      example_support_needs: Object.freeze([
        "Needs explicit transition cues to restart after interruptions.",
        "Needs coached strategy options when frustration escalates.",
      ]),
    }),
    CQ: Object.freeze({
      trait_code: "CQ",
      trait_name: "CURIOSITY",
      definition: "Tendency to seek information, ask exploratory questions, and investigate unknowns beyond minimal task requirements.",
      observable_indicators: Object.freeze([
        "Asks clarifying or extension questions during tasks.",
        "Requests to test alternative approaches.",
        "Shows sustained interest in why/how explanations.",
        "Explores optional task elements when core task is complete.",
        "Connects current task to related topics or prior experiences.",
      ]),
      development_levers: Object.freeze([
        "Question-stem scaffolds (why, what if, how else).",
        "Choice of exploration paths inside tasks.",
        "Brief inquiry journals for unanswered questions.",
        "Modeling hypothesis generation before solving.",
      ]),
      measurement_metrics: Object.freeze([
        "Rate of meaningful exploratory questions per session.",
        "Frequency of optional exploration attempts.",
        "Depth score of follow-up questions.",
        "Hypothesis generation count before final response.",
      ]),
      allowed_evidence_sources: Object.freeze([
        "child_task",
        "child_scenario",
        "child_retry",
        "teacher_observation",
        "assessor_observation",
      ]),
      overlap_risks: Object.freeze([
        "Can be confused with CR when novelty-seeking is scored without evidence of idea production.",
        "Can be confused with DE when broad excitement is mistaken for inquiry behavior.",
      ]),
      anti_contamination_rules: Object.freeze([
        "Do not score CQ from enthusiasm language alone; require information-seeking actions.",
        "Do not infer CQ from many ideas unless questions/investigation behaviors are present.",
        "Separate social talkativeness from task-relevant inquiry.",
      ]),
      example_growth_signals: Object.freeze([
        "Child shifts from single clarification questions to multi-step inquiry chains.",
        "Child begins initiating optional investigations without prompts.",
      ]),
      example_support_needs: Object.freeze([
        "Needs prompts to move from answer-seeking to question-generation.",
        "Needs safe structure for exploring uncertainty without fear of being wrong.",
      ]),
    }),
    CR: Object.freeze({
      trait_code: "CR",
      trait_name: "CREATIVITY",
      definition: "Capacity to generate varied, useful, and context-appropriate ideas, strategies, or expressions.",
      observable_indicators: Object.freeze([
        "Produces multiple distinct solution ideas for one problem.",
        "Combines familiar elements into new workable formats.",
        "Adapts tools/materials in unconventional but functional ways.",
        "Improves initial ideas through iteration.",
        "Offers original examples that fit task constraints.",
      ]),
      development_levers: Object.freeze([
        "Divergent-then-convergent idea cycles.",
        "Constraint-based innovation prompts.",
        "Remix tasks using existing ideas in new combinations.",
        "Iteration routines (draft, feedback, revise).",
        "Exposure to multiple exemplar strategies before creation.",
      ]),
      measurement_metrics: Object.freeze([
        "Idea fluency count under fixed time.",
        "Idea flexibility across categories.",
        "Originality rating against rubric anchors.",
        "Usefulness/fit score for produced ideas.",
        "Iteration improvement score between draft versions.",
      ]),
      allowed_evidence_sources: Object.freeze([
        "child_task",
        "child_scenario",
        "child_retry",
        "teacher_observation",
        "assessor_observation",
      ]),
      overlap_risks: Object.freeze([
        "Can be confused with CQ when questioning behavior is treated as creative output.",
        "Can be confused with RS when correctness is over-weighted relative to originality.",
      ]),
      anti_contamination_rules: Object.freeze([
        "Do not score CR based only on question quantity; require generated solution/artifact evidence.",
        "Do not require single correct answers for high CR scoring.",
        "Novelty alone is insufficient; ideas must be usable in context.",
      ]),
      example_growth_signals: Object.freeze([
        "Child moves from one default solution to multiple distinct viable options.",
        "Revisions show stronger balance of originality and practicality over time.",
      ]),
      example_support_needs: Object.freeze([
        "Needs prompts to move beyond first idea.",
        "Needs structured criteria to refine ideas for real-world fit.",
      ]),
    }),
    RS: Object.freeze({
      trait_code: "RS",
      trait_name: "REASONING",
      definition: "Ability to form logical connections, justify decisions with evidence, and apply rule-based thinking across contexts.",
      observable_indicators: Object.freeze([
        "Explains why a chosen answer is more valid than alternatives.",
        "Identifies relevant evidence before deciding.",
        "Applies known rules to a new but related problem.",
        "Detects inconsistency in a presented argument.",
        "Updates conclusion when new evidence changes conditions.",
      ]),
      development_levers: Object.freeze([
        "Claim-evidence-reasoning response frames.",
        "Compare-and-justify choice tasks.",
        "Error analysis and correction routines.",
        "Analogical transfer exercises across contexts.",
      ]),
      measurement_metrics: Object.freeze([
        "Justification quality score using evidence anchors.",
        "Logical consistency score across related items.",
        "Rule-transfer accuracy on novel problems.",
        "Evidence-update accuracy after condition changes.",
      ]),
      allowed_evidence_sources: Object.freeze([
        "child_task",
        "child_scenario",
        "child_retry",
        "teacher_observation",
        "assessor_observation",
      ]),
      overlap_risks: Object.freeze([
        "Can be confused with CR if unusual answers are rewarded without logic quality checks.",
        "Can be confused with SR when careful pacing is mistaken for stronger reasoning.",
      ]),
      anti_contamination_rules: Object.freeze([
        "Do not score RS from final correctness alone; evaluate explanation quality.",
        "Do not score RS for novelty without coherent evidence linkage.",
        "Separate processing speed from reasoning quality unless task explicitly targets speeded logic.",
      ]),
      example_growth_signals: Object.freeze([
        "Child increasingly cites relevant evidence when defending choices.",
        "Child corrects earlier conclusions after new information with clear rationale.",
      ]),
      example_support_needs: Object.freeze([
        "Needs explicit prompts to explain reasoning steps.",
        "Needs help distinguishing evidence from opinion.",
      ]),
    }),
    PS: Object.freeze({
      trait_code: "PS",
      trait_name: "PERSISTENCE",
      definition: "Willingness to sustain constructive effort through challenge, setbacks, and delayed success.",
      observable_indicators: Object.freeze([
        "Maintains attempt effort after initial failure.",
        "Re-engages with challenging tasks without immediate reward.",
        "Uses additional attempts before abandoning work.",
        "Completes difficult task segments across time blocks.",
        "Shows stable effort when task complexity increases.",
      ]),
      development_levers: Object.freeze([
        "Effort-goal contracts with short milestone checkpoints.",
        "Normalized failure framing and retry expectations.",
        "Visible progress tracking for partial completion.",
        "Challenge calibration to maintain stretch without overload.",
      ]),
      measurement_metrics: Object.freeze([
        "Challenge-task completion rate.",
        "Average productive attempt count before stopping.",
        "Re-engagement latency after failure.",
        "Sustained effort duration in high-difficulty intervals.",
        "Drop-off rate across escalating difficulty steps.",
      ]),
      allowed_evidence_sources: Object.freeze([
        "child_task",
        "child_retry",
        "parent_observation",
        "teacher_observation",
        "assessor_observation",
      ]),
      overlap_risks: Object.freeze([
        "Can be confused with SR when disengagement is actually regulation difficulty.",
        "Can be confused with DE when enthusiasm is high but sustained effort is low.",
      ]),
      anti_contamination_rules: Object.freeze([
        "Do not score PS by time-on-task alone; require evidence of constructive attempts.",
        "Do not penalize PS when stopping behavior follows adaptive help-seeking within task rules.",
        "Separate short-term dysregulation episodes from long-horizon effort patterns.",
      ]),
      example_growth_signals: Object.freeze([
        "Child increases number of strategic retries before disengaging.",
        "Child sustains effort longer at higher complexity levels over time.",
      ]),
      example_support_needs: Object.freeze([
        "Needs calibrated challenge bands to avoid repeated overload.",
        "Needs explicit checkpointing to see progress before final success.",
      ]),
    }),
    FB: Object.freeze({
      trait_code: "FB",
      trait_name: "COACHABILITY",
      definition: "Capacity to receive, interpret, and apply feedback in ways that improve subsequent performance.",
      observable_indicators: Object.freeze([
        "Listens to corrective input without immediate shutdown.",
        "Asks clarifying questions about feedback.",
        "Applies specific feedback points in next attempt.",
        "Compares previous and revised work to identify changes.",
        "Shows measurable improvement after guided input.",
      ]),
      development_levers: Object.freeze([
        "Feedback decoding routines (what to keep/change/try).",
        "Single-focus revision cycles before multi-focus coaching.",
        "Modeling how to translate comments into action steps.",
        "Post-feedback action planning templates.",
      ]),
      measurement_metrics: Object.freeze([
        "Feedback application rate in immediate retry.",
        "Improvement delta between pre- and post-feedback attempts.",
        "Accuracy of child-stated next-step from feedback.",
        "Transfer rate of prior feedback to later related tasks.",
      ]),
      allowed_evidence_sources: Object.freeze([
        "child_task",
        "child_retry",
        "parent_observation",
        "teacher_observation",
        "assessor_observation",
      ]),
      overlap_risks: Object.freeze([
        "Can be confused with SR when compliant behavior is scored without evidence of feedback application.",
        "Can be confused with PS when repeated effort is counted despite unchanged strategy.",
      ]),
      anti_contamination_rules: Object.freeze([
        "Do not score FB for politeness or agreement alone; require demonstrated performance update.",
        "Do not score FB when retries repeat identical errors after feedback.",
        "Separate adult dependence from feedback integration quality.",
      ]),
      example_growth_signals: Object.freeze([
        "Child references prior feedback and incorporates it in new attempts.",
        "Error patterns decrease after targeted coaching cycles.",
      ]),
      example_support_needs: Object.freeze([
        "Needs concise, behavior-specific feedback rather than global praise/critique.",
        "Needs guided translation from feedback language to next-step actions.",
      ]),
    }),
    DE: Object.freeze({
      trait_code: "DE",
      trait_name: "DOMAIN_ENGAGEMENT",
      definition: "Depth and continuity of participation in a specific learning or skill domain, including voluntary return and increasing commitment.",
      observable_indicators: Object.freeze([
        "Chooses to return to domain activities across sessions.",
        "Spends discretionary time on domain-relevant practice.",
        "Seeks progressively harder domain tasks.",
        "Tracks or reflects on domain-specific progress.",
        "Connects domain activity to personal goals or identity statements.",
      ]),
      development_levers: Object.freeze([
        "Domain pathways with visible next-step progression.",
        "Mentor or role-model exposure within domain.",
        "Choice-rich project tasks tied to domain themes.",
        "Progress artifacts showcasing growth over time.",
        "Environment fit adjustments for challenge and support.",
      ]),
      measurement_metrics: Object.freeze([
        "Voluntary return rate to domain tasks.",
        "Domain practice frequency outside required sessions.",
        "Complexity progression level over repeated tasks.",
        "Goal-link clarity score in domain reflections.",
        "Drop-off reduction across follow-up periods.",
      ]),
      allowed_evidence_sources: Object.freeze([
        "child_task",
        "child_scenario",
        "child_retry",
        "parent_observation",
        "teacher_observation",
        "assessor_observation",
      ]),
      overlap_risks: Object.freeze([
        "Can be confused with general enthusiasm if persistence and re-engagement are not measured longitudinally.",
        "Can be confused with CQ when broad curiosity across many topics is mistaken for sustained domain commitment.",
      ]),
      anti_contamination_rules: Object.freeze([
        "Do not score DE from single-session excitement alone; require repeated engagement evidence.",
        "Do not score DE when interest is broad but domain-specific follow-through is absent.",
        "Separate adult-directed participation from self-initiated domain return behavior.",
      ]),
      example_growth_signals: Object.freeze([
        "Child increasingly self-selects domain activities and advances to harder levels.",
        "Child maintains domain participation across multiple measurement windows.",
      ]),
      example_support_needs: Object.freeze([
        "Needs clearer domain pathway and next-step challenge matching.",
        "Needs access to mentors/resources to sustain domain continuity.",
      ]),
    }),
  }),
});

module.exports = {
  YOUTH_DEVELOPMENT_TRAIT_MODEL,
};
