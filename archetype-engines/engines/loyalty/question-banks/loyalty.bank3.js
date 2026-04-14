"use strict";

const AUTHORED_BANK_3 = [
  {
    question_id: "LOY_B3_Q01",
    bank_id: "AUTHORED_BANK_3",
    display_order: 1,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "brand_disappointment_first_reaction",
    prompt: "When a brand disappoints me, my first reaction is usually:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "“Can I still trust them?”", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "disappointment_trust_first" },
      { option_id: "B", text: "“Is the experience still worth it?”", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "disappointment_value_first" },
      { option_id: "C", text: "“This changes how I feel about them.”", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "disappointment_feeling_first" },
      { option_id: "D", text: "“Is switching worth the trouble?”", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "disappointment_switch_cost" }
    ]
  },
  {
    question_id: "LOY_B3_Q02",
    bank_id: "AUTHORED_BANK_3",
    display_order: 2,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "felt_loyalty_condition",
    prompt: "I feel most loyal when a brand is:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "credible and dependable", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "loyalty_dependable" },
      { option_id: "B", text: "consistently satisfying", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "loyalty_satisfying" },
      { option_id: "C", text: "personally meaningful", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "loyalty_meaningful" },
      { option_id: "D", text: "easy and familiar", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "loyalty_easy_familiar" }
    ]
  },
  {
    question_id: "LOY_B3_Q03",
    bank_id: "AUTHORED_BANK_3",
    display_order: 3,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "long_term_priority",
    prompt: "Which matters more long-term?",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "longterm_trust" },
      { option_id: "B", text: "satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "longterm_satisfaction" },
      { option_id: "C", text: "emotional commitment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "longterm_commitment" },
      { option_id: "D", text: "convenience", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "longterm_convenience" }
    ]
  },
  {
    question_id: "LOY_B3_Q04",
    bank_id: "AUTHORED_BANK_3",
    display_order: 4,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "single_brand_stickiness",
    prompt: "I tend to stick with one brand when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I believe it will keep its word", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "stick_keep_word" },
      { option_id: "B", text: "it repeatedly meets expectations", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "stick_meets_expectations" },
      { option_id: "C", text: "I feel proud to be associated with it", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "stick_association_pride" },
      { option_id: "D", text: "it has become my easy default", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "stick_easy_default" }
    ]
  },
  {
    question_id: "LOY_B3_Q05",
    bank_id: "AUTHORED_BANK_3",
    display_order: 5,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "convenience_dependence",
    prompt: "I rarely stay with something just because it is convenient.",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "strongly agree", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "convenience_rejected_strong" },
      { option_id: "B", text: "somewhat agree", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "convenience_rejected_moderate" },
      { option_id: "C", text: "somewhat disagree", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "identity", signal_type: "convenience_present" },
      { option_id: "D", text: "strongly disagree", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "convenience_primary_lockin" }
    ]
  },
  {
    question_id: "LOY_B3_Q06",
    bank_id: "AUTHORED_BANK_3",
    display_order: 6,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "rewards_poor_communication",
    prompt: "A company offers strong rewards but poor communication. You:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "hesitate if trust feels unclear", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "scenario", signal_type: "reward_comm_trust" },
      { option_id: "B", text: "stay if the experience still feels strong enough", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "reward_comm_experience" },
      { option_id: "C", text: "care whether the relationship still feels genuine", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "reward_comm_genuine" },
      { option_id: "D", text: "stay if the net value and routine still work", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "scenario", signal_type: "reward_comm_value_routine" }
    ]
  },
  {
    question_id: "LOY_B3_Q07",
    bank_id: "AUTHORED_BANK_3",
    display_order: 7,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "loyalty_sign",
    prompt: "A big sign I am loyal is that I:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "give the brand the benefit of the doubt", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "standard", signal_type: "sign_benefit_of_doubt" },
      { option_id: "B", text: "continue buying with little hesitation", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "sign_continue_buying" },
      { option_id: "C", text: "speak about it with identity or pride", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "sign_identity_pride" },
      { option_id: "D", text: "rarely consider alternatives anymore", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "sign_no_alternatives" }
    ]
  },
  {
    question_id: "LOY_B3_Q08",
    bank_id: "AUTHORED_BANK_3",
    display_order: 8,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "trust_break_response",
    prompt: "If trust is broken, I usually:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "detach fast even if I used to love it", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "trust_break_detach" },
      { option_id: "B", text: "weigh whether the overall satisfaction history offsets it", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "trust_break_history" },
      { option_id: "C", text: "feel deeply disillusioned", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "trust_break_disillusioned" },
      { option_id: "D", text: "consider whether leaving is still practical", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "trust_break_practicality" }
    ]
  },
  {
    question_id: "LOY_B3_Q09",
    bank_id: "AUTHORED_BANK_3",
    display_order: 9,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "service_stay_reason",
    prompt: "I often remain with a service because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I expect reliable treatment", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "remain_reliable_treatment" },
      { option_id: "B", text: "it continues to satisfy my needs", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "remain_satisfy_needs" },
      { option_id: "C", text: "it has emotional meaning for me", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "remain_emotional_meaning" },
      { option_id: "D", text: "it fits neatly into how I already operate", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "remain_operating_fit" }
    ]
  },
  {
    question_id: "LOY_B3_Q10",
    bank_id: "AUTHORED_BANK_3",
    display_order: 10,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "free_trial_migration",
    prompt: "A competitor offers a free trial and easy migration. You stay if:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "you trust your current provider more", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "scenario", signal_type: "migration_trust" },
      { option_id: "B", text: "your current provider still satisfies better overall", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "migration_satisfaction" },
      { option_id: "C", text: "your current provider still feels more aligned with you", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "migration_alignment" },
      { option_id: "D", text: "moving still feels disruptive enough to avoid", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "scenario", signal_type: "migration_disruption" }
    ]
  },
  {
    question_id: "LOY_B3_Q11",
    bank_id: "AUTHORED_BANK_3",
    display_order: 11,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "love_without_trust",
    prompt: "A brand can be loved without being deeply trusted.",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "strongly agree", primary_dimension: "ECM", secondary_dimension: "CH", weight_type: "identity", signal_type: "love_without_trust_strong" },
      { option_id: "B", text: "somewhat agree", primary_dimension: "ECM", secondary_dimension: "SA", weight_type: "identity", signal_type: "love_without_trust_moderate" },
      { option_id: "C", text: "somewhat disagree", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "love_requires_some_trust" },
      { option_id: "D", text: "strongly disagree", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "love_requires_trust" }
    ]
  },
  {
    question_id: "LOY_B3_Q12",
    bank_id: "AUTHORED_BANK_3",
    display_order: 12,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "most_painful_break",
    prompt: "The most painful loyalty break for me would be:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "discovering deception", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "painful_deception" },
      { option_id: "B", text: "repeated poor experiences", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "painful_poor_experience" },
      { option_id: "C", text: "realizing the connection was never real", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "painful_false_connection" },
      { option_id: "D", text: "being forced to change because the default no longer works", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "stress", signal_type: "painful_default_break" }
    ]
  },
  {
    question_id: "LOY_B3_Q13",
    bank_id: "AUTHORED_BANK_3",
    display_order: 13,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "underestimated_driver",
    prompt: "The part of loyalty I probably underestimate most is:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "underestimate_trust" },
      { option_id: "B", text: "satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "underestimate_satisfaction" },
      { option_id: "C", text: "emotional commitment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "underestimate_commitment" },
      { option_id: "D", text: "habit/inertia", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "underestimate_habit" }
    ]
  },
  {
    question_id: "LOY_B3_Q14",
    bank_id: "AUTHORED_BANK_3",
    display_order: 14,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "fair_problem_resolution",
    prompt: "A brand treats you fairly during a problem. You are most likely to stay because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "fair treatment reinforces trust", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "scenario", signal_type: "fairness_reinforces_trust" },
      { option_id: "B", text: "good recovery preserves satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "fairness_preserves_satisfaction" },
      { option_id: "C", text: "it deepens the relationship emotionally", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "fairness_deepens_relationship" },
      { option_id: "D", text: "it avoids the need to restart elsewhere", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "scenario", signal_type: "fairness_avoids_restart" }
    ]
  },
  {
    question_id: "LOY_B3_Q15",
    bank_id: "AUTHORED_BANK_3",
    display_order: 15,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "safe_brand_profile",
    prompt: "I feel safest staying with brands that:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "consistently do what they say", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "safe_consistency" },
      { option_id: "B", text: "repeatedly deliver value", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "safe_value" },
      { option_id: "C", text: "feel aligned with my identity or values", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "safe_identity_alignment" },
      { option_id: "D", text: "are deeply integrated into my routine", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "safe_routine_integration" }
    ]
  },
  {
    question_id: "LOY_B3_Q16",
    bank_id: "AUTHORED_BANK_3",
    display_order: 16,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "intentional_stay_basis",
    prompt: "I want to become more intentional about when I stay because of:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "earned trust", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "desired", signal_type: "intentional_earned_trust" },
      { option_id: "B", text: "real satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "desired", signal_type: "intentional_real_satisfaction" },
      { option_id: "C", text: "authentic attachment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "intentional_authentic_attachment" },
      { option_id: "D", text: "simple habit", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "intentional_simple_habit" }
    ]
  },
  {
    question_id: "LOY_B3_Q17",
    bank_id: "AUTHORED_BANK_3",
    display_order: 17,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "better_decision_distinction",
    prompt: "To make better loyalty decisions, I need to:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "distinguish trust from assumption", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "desired", signal_type: "better_decision_trust" },
      { option_id: "B", text: "distinguish satisfaction from comfort", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "desired", signal_type: "better_decision_satisfaction" },
      { option_id: "C", text: "distinguish commitment from identification", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "better_decision_commitment" },
      { option_id: "D", text: "distinguish habit from lock-in", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "better_decision_habit" }
    ]
  },
  {
    question_id: "LOY_B3_Q18",
    bank_id: "AUTHORED_BANK_3",
    display_order: 18,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "healthier_loyalty_style",
    prompt: "A healthier loyalty style for me would be:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trusting with clearer standards", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "desired", signal_type: "healthier_trust_standards" },
      { option_id: "B", text: "satisfied but not passive", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "desired", signal_type: "healthier_satisfaction_active" },
      { option_id: "C", text: "connected but not overattached", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "healthier_connection_boundaries" },
      { option_id: "D", text: "routine-based but still consciously chosen", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "healthier_routine_choice" }
    ]
  },
  {
    question_id: "LOY_B3_Q19",
    bank_id: "AUTHORED_BANK_3",
    display_order: 19,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "honest_continue_reason",
    prompt: "If I’m honest, I often continue because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I already trust the brand", primary_dimension: "TD", secondary_dimension: "CH", weight_type: "standard", signal_type: "honest_continue_trust" },
      { option_id: "B", text: "it feels good enough overall", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "honest_continue_good_enough" },
      { option_id: "C", text: "I care about what it represents", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "honest_continue_represents" },
      { option_id: "D", text: "leaving feels like unnecessary work", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "standard", signal_type: "honest_continue_unnecessary_work" }
    ]
  },
  {
    question_id: "LOY_B3_Q20",
    bank_id: "AUTHORED_BANK_3",
    display_order: 20,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "weakening_notice",
    prompt: "When loyalty weakens, I notice it first as:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "growing mistrust", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "weaken_notice_mistrust" },
      { option_id: "B", text: "dropping satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "weaken_notice_satisfaction" },
      { option_id: "C", text: "fading attachment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "weaken_notice_attachment" },
      { option_id: "D", text: "openness to switching", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "stress", signal_type: "weaken_notice_switching" }
    ]
  },
  {
    question_id: "LOY_B3_Q21",
    bank_id: "AUTHORED_BANK_3",
    display_order: 21,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "service_complexity_response",
    prompt: "A service you use becomes more complicated. You:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "stay if trust remains high", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "scenario", signal_type: "complexity_trust" },
      { option_id: "B", text: "stay if satisfaction still outweighs effort", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "complexity_satisfaction" },
      { option_id: "C", text: "stay if the bond still feels meaningful", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "complexity_meaningful_bond" },
      { option_id: "D", text: "seriously rethink it if ease is damaged", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "scenario", signal_type: "complexity_ease_damage" }
    ]
  },
  {
    question_id: "LOY_B3_Q22",
    bank_id: "AUTHORED_BANK_3",
    display_order: 22,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "loyalty_style_identity",
    prompt: "My loyalty style is closest to:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "“I stay where I trust.”", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "style_trust" },
      { option_id: "B", text: "“I stay where I’m satisfied.”", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "style_satisfaction" },
      { option_id: "C", text: "“I stay where I feel connected.”", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "style_connected" },
      { option_id: "D", text: "“I stay where staying is easy.”", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "style_easy" }
    ]
  },
  {
    question_id: "LOY_B3_Q23",
    bank_id: "AUTHORED_BANK_3",
    display_order: 23,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "promoter_mechanism",
    prompt: "I become a promoter mostly when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust is rock solid", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "standard", signal_type: "promoter_trust" },
      { option_id: "B", text: "the experience keeps delighting me", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "promoter_delight" },
      { option_id: "C", text: "I feel genuine emotional bond", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "promoter_bond" },
      { option_id: "D", text: "the brand becomes part of my default life pattern", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "standard", signal_type: "promoter_default_pattern" }
    ]
  },
  {
    question_id: "LOY_B3_Q24",
    bank_id: "AUTHORED_BANK_3",
    display_order: 24,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "difficult_cancellation_reaction",
    prompt: "If cancellation is made difficult, I usually:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "resent it if trust is weak", primary_dimension: "TD", secondary_dimension: "SF", weight_type: "stress", signal_type: "cancel_reaction_trust" },
      { option_id: "B", text: "tolerate it if satisfaction is strong", primary_dimension: "SA", secondary_dimension: "SF", weight_type: "stress", signal_type: "cancel_reaction_satisfaction" },
      { option_id: "C", text: "feel especially betrayed if I once felt connected", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "cancel_reaction_betrayal" },
      { option_id: "D", text: "calculate whether the friction still favors staying", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "cancel_reaction_friction" }
    ]
  },
  {
    question_id: "LOY_B3_Q25",
    bank_id: "AUTHORED_BANK_3",
    display_order: 25,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "loyalty_signature",
    prompt: "My loyalty signature is closest to:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust-led", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "signature_trust" },
      { option_id: "B", text: "satisfaction-led", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "signature_satisfaction" },
      { option_id: "C", text: "commitment-led", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "signature_commitment" },
      { option_id: "D", text: "habit/friction-led", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "signature_habit_friction" }
    ]
  }
];

module.exports = Object.freeze(
  AUTHORED_BANK_3.map((question) =>
    Object.freeze({
      ...question,
      options: Object.freeze(
        question.options.map((option) =>
          Object.freeze({
            ...option,
            primary_archetype: option.primary_dimension,
            secondary_archetype: option.secondary_dimension,
          })
        )
      ),
    })
  )
);
