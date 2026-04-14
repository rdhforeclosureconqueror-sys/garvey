"use strict";

const AUTHORED_BANK_1 = [
  {
    question_id: "LOY_B1_Q01",
    bank_id: "AUTHORED_BANK_1",
    display_order: 1,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "trust_anchor",
    prompt: "When I stay loyal to a brand, it is usually because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I trust it deeply", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "trust_primary" },
      { option_id: "B", text: "it consistently satisfies me", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "satisfaction_primary" },
      { option_id: "C", text: "I feel connected to it", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "emotional_primary" },
      { option_id: "D", text: "it fits easily into my routine", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "habit_primary" }
    ]
  },
  {
    question_id: "LOY_B1_Q02",
    bank_id: "AUTHORED_BANK_1",
    display_order: 2,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "retention_trigger",
    prompt: "If a competitor appears, I am most likely to stay when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I trust my current brand more", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "trust_retention" },
      { option_id: "B", text: "I’m still satisfied with the experience", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "satisfaction_retention" },
      { option_id: "C", text: "I feel emotionally attached to the brand", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "emotional_retention" },
      { option_id: "D", text: "switching would disrupt my habits", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "habit_lock" }
    ]
  },
  {
    question_id: "LOY_B1_Q03",
    bank_id: "AUTHORED_BANK_1",
    display_order: 3,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "value_driver",
    prompt: "A brand earns my repeat business mainly through:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "reliability", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "reliability" },
      { option_id: "B", text: "consistently good experiences", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "experience_quality" },
      { option_id: "C", text: "making me feel like I belong", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "belonging" },
      { option_id: "D", text: "being easy and familiar", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "standard", signal_type: "ease_familiarity" }
    ]
  },
  {
    question_id: "LOY_B1_Q04",
    bank_id: "AUTHORED_BANK_1",
    display_order: 4,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "loyalty_definition",
    prompt: "To me, loyalty means:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "believing a brand will do right by me", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "trust_definition" },
      { option_id: "B", text: "returning because the experience stays strong", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "satisfaction_definition" },
      { option_id: "C", text: "feeling emotionally committed", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "commitment_definition" },
      { option_id: "D", text: "continuing because leaving is inconvenient", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "identity", signal_type: "friction_definition" }
    ]
  },
  {
    question_id: "LOY_B1_Q05",
    bank_id: "AUTHORED_BANK_1",
    display_order: 5,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "advocacy_trigger",
    prompt: "I am most likely to recommend a brand when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I trust it without hesitation", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "standard", signal_type: "trust_advocacy" },
      { option_id: "B", text: "it consistently delivers satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "satisfaction_advocacy" },
      { option_id: "C", text: "I feel proud to be associated with it", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "identity_advocacy" },
      { option_id: "D", text: "it has become my default choice", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "standard", signal_type: "default_advocacy" }
    ]
  },
  {
    question_id: "LOY_B1_Q06",
    bank_id: "AUTHORED_BANK_1",
    display_order: 6,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "loyalty_driver",
    prompt: "What matters most to sustaining loyalty?",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trustworthiness", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "trust_sustain" },
      { option_id: "B", text: "satisfying performance", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "satisfaction_sustain" },
      { option_id: "C", text: "emotional bond", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "bond_sustain" },
      { option_id: "D", text: "ease and convenience", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "convenience_sustain" }
    ]
  },
  {
    question_id: "LOY_B1_Q07",
    bank_id: "AUTHORED_BANK_1",
    display_order: 7,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "loyalty_awareness",
    prompt: "I usually notice my loyalty when I:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "defend the brand after a minor mistake", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "standard", signal_type: "defensive_trust" },
      { option_id: "B", text: "keep coming back because it works", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "repeat_value" },
      { option_id: "C", text: "talk about it with real enthusiasm", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "enthusiastic_bond" },
      { option_id: "D", text: "use it without thinking much", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "standard", signal_type: "habitual_use" }
    ]
  },
  {
    question_id: "LOY_B1_Q08",
    bank_id: "AUTHORED_BANK_1",
    display_order: 8,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "service_recovery",
    prompt: "A brand makes a small mistake but apologizes quickly. You:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "stay if trust feels intact", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "scenario", signal_type: "trust_repair" },
      { option_id: "B", text: "stay if satisfaction remains high overall", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "satisfaction_repair" },
      { option_id: "C", text: "stay if the relationship still feels meaningful", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "bond_repair" },
      { option_id: "D", text: "stay if changing still feels like too much effort", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "scenario", signal_type: "friction_repair" }
    ]
  },
  {
    question_id: "LOY_B1_Q09",
    bank_id: "AUTHORED_BANK_1",
    display_order: 9,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "program_value",
    prompt: "I value loyalty programs most when they:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "reinforce trust and fairness", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "program_trust" },
      { option_id: "B", text: "improve the overall experience", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "identity", signal_type: "program_experience" },
      { option_id: "C", text: "make me feel recognized", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "program_recognition" },
      { option_id: "D", text: "make staying the easiest option", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "identity", signal_type: "program_lockin" }
    ]
  },
  {
    question_id: "LOY_B1_Q10",
    bank_id: "AUTHORED_BANK_1",
    display_order: 10,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "repeat_purchase",
    prompt: "I’m most likely to become a repeat customer when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I believe the brand is dependable", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "dependable_repeat" },
      { option_id: "B", text: "the service/product satisfies me consistently", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "consistent_value" },
      { option_id: "C", text: "I feel some identity connection", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "identity_repeat" },
      { option_id: "D", text: "using it becomes second nature", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "automatic_repeat" }
    ]
  },
  {
    question_id: "LOY_B1_Q11",
    bank_id: "AUTHORED_BANK_1",
    display_order: 11,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "loyalty_foundation",
    prompt: "Loyalty is strongest when it is based on:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "foundation_trust" },
      { option_id: "B", text: "satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "foundation_satisfaction" },
      { option_id: "C", text: "commitment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "foundation_commitment" },
      { option_id: "D", text: "habit", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "identity", signal_type: "foundation_habit" }
    ]
  },
  {
    question_id: "LOY_B1_Q12",
    bank_id: "AUTHORED_BANK_1",
    display_order: 12,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "loyalty_breaker",
    prompt: "A brand loses my loyalty fastest when it:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "breaks trust", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "standard", signal_type: "trust_breaker" },
      { option_id: "B", text: "stops delivering value", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "value_breaker" },
      { option_id: "C", text: "makes me feel less connected", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "bond_breaker" },
      { option_id: "D", text: "becomes harder to use", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "ease_breaker" }
    ]
  },
  {
    question_id: "LOY_B1_Q13",
    bank_id: "AUTHORED_BANK_1",
    display_order: 13,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "price_competition",
    prompt: "A rival brand offers a slightly lower price. You stay because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "my current brand feels safer to trust", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "scenario", signal_type: "trust_vs_price" },
      { option_id: "B", text: "my experience is still better where I am", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "experience_vs_price" },
      { option_id: "C", text: "I feel more committed to what I know", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "commitment_vs_price" },
      { option_id: "D", text: "switching doesn’t feel worth the effort", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "scenario", signal_type: "friction_vs_price" }
    ]
  },
  {
    question_id: "LOY_B1_Q14",
    bank_id: "AUTHORED_BANK_1",
    display_order: 14,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "influence_source",
    prompt: "My loyalty tends to be most influenced by:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "credibility", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "credibility_influence" },
      { option_id: "B", text: "experience quality", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "quality_influence" },
      { option_id: "C", text: "emotional meaning", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "meaning_influence" },
      { option_id: "D", text: "convenience", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "convenience_influence" }
    ]
  },
  {
    question_id: "LOY_B1_Q15",
    bank_id: "AUTHORED_BANK_1",
    display_order: 15,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "trustworthiness_model",
    prompt: "The most trustworthy brands are usually the ones that:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "act consistently over time", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "consistency_trust" },
      { option_id: "B", text: "repeatedly satisfy expectations", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "expectation_trust" },
      { option_id: "C", text: "build real connection with customers", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "connection_trust" },
      { option_id: "D", text: "reduce effort and friction", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "effort_trust" }
    ]
  },
  {
    question_id: "LOY_B1_Q16",
    bank_id: "AUTHORED_BANK_1",
    display_order: 16,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "disappointment_response",
    prompt: "When a brand disappoints me, I first ask:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "can I still trust them?", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "trust_disruption" },
      { option_id: "B", text: "is the experience still worth it?", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "value_disruption" },
      { option_id: "C", text: "does this change how I feel about them?", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "bond_disruption" },
      { option_id: "D", text: "is leaving worth the disruption?", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "exit_disruption" }
    ]
  },
  {
    question_id: "LOY_B1_Q17",
    bank_id: "AUTHORED_BANK_1",
    display_order: 17,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "loyalty_test",
    prompt: "My loyalty is most tested when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "promises feel broken", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "promise_break" },
      { option_id: "B", text: "satisfaction drops repeatedly", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "repeat_disappointment" },
      { option_id: "C", text: "the connection feels hollow", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "hollow_connection" },
      { option_id: "D", text: "switching becomes easier than staying", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "easy_switch" }
    ]
  },
  {
    question_id: "LOY_B1_Q18",
    bank_id: "AUTHORED_BANK_1",
    display_order: 18,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "price_increase_response",
    prompt: "If a brand raises prices, I stay when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I trust the reason and fairness", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "stress", signal_type: "fairness_trust" },
      { option_id: "B", text: "the value still feels worth it", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "price_value" },
      { option_id: "C", text: "my attachment still feels strong", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "price_attachment" },
      { option_id: "D", text: "changing still feels costly or annoying", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "price_friction" }
    ]
  },
  {
    question_id: "LOY_B1_Q19",
    bank_id: "AUTHORED_BANK_1",
    display_order: 19,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "service_failure_response",
    prompt: "When service fails, I usually:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "evaluate whether trust was damaged", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "service_trust_check" },
      { option_id: "B", text: "evaluate whether the satisfaction history outweighs it", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "service_value_check" },
      { option_id: "C", text: "evaluate whether the relationship still feels meaningful", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "service_bond_check" },
      { option_id: "D", text: "evaluate whether switching is worth the hassle", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "service_exit_check" }
    ]
  },
  {
    question_id: "LOY_B1_Q20",
    bank_id: "AUTHORED_BANK_1",
    display_order: 20,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "bond_break",
    prompt: "A loyalty bond breaks fastest for me through:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "dishonesty", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "dishonesty_break" },
      { option_id: "B", text: "repeated disappointment", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "disappointment_break" },
      { option_id: "C", text: "emotional disillusionment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "disillusionment_break" },
      { option_id: "D", text: "a sudden better default alternative", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "stress", signal_type: "default_switch_break" }
    ]
  },
  {
    question_id: "LOY_B1_Q21",
    bank_id: "AUTHORED_BANK_1",
    display_order: 21,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "loyalty_growth",
    prompt: "I want my loyalty to be based more on:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust than convenience", primary_dimension: "TD", secondary_dimension: "CH", weight_type: "desired", signal_type: "growth_trust_over_habit" },
      { option_id: "B", text: "real satisfaction than inertia", primary_dimension: "SA", secondary_dimension: "SF", weight_type: "desired", signal_type: "growth_value_over_inertia" },
      { option_id: "C", text: "commitment than perks", primary_dimension: "ECM", secondary_dimension: "SA", weight_type: "desired", signal_type: "growth_commitment_over_perks" },
      { option_id: "D", text: "chosen fit than lock-in", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "growth_choice_over_lockin" }
    ]
  },
  {
    question_id: "LOY_B1_Q22",
    bank_id: "AUTHORED_BANK_1",
    display_order: 22,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "self_awareness_growth",
    prompt: "I want to become someone who:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "evaluates trust more clearly", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "desired", signal_type: "clearer_trust_judgment" },
      { option_id: "B", text: "pays attention to actual value delivered", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "desired", signal_type: "clearer_value_judgment" },
      { option_id: "C", text: "knows when emotional attachment is genuine", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "clearer_bond_judgment" },
      { option_id: "D", text: "notices when habit is driving the choice", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "clearer_habit_awareness" }
    ]
  },
  {
    question_id: "LOY_B1_Q23",
    bank_id: "AUTHORED_BANK_1",
    display_order: 23,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "growth_edge",
    prompt: "My biggest growth edge as a customer is:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "not ignoring trust breaches", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "desired", signal_type: "respond_to_breach" },
      { option_id: "B", text: "not staying purely because things are “fine”", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "desired", signal_type: "avoid_passive_satisfaction" },
      { option_id: "C", text: "not overidentifying with brands", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "avoid_overidentification" },
      { option_id: "D", text: "not confusing convenience with loyalty", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "separate_habit_from_loyalty" }
    ]
  },
  {
    question_id: "LOY_B1_Q24",
    bank_id: "AUTHORED_BANK_1",
    display_order: 24,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "actual_retention_pattern",
    prompt: "In reality, I often stay with brands because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I trust them by default", primary_dimension: "TD", secondary_dimension: "CH", weight_type: "standard", signal_type: "default_trust" },
      { option_id: "B", text: "I’m usually satisfied enough", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "good_enough_value" },
      { option_id: "C", text: "I feel emotionally attached", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "attached_retention" },
      { option_id: "D", text: "it’s easier than changing", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "easy_retention" }
    ]
  },
  {
    question_id: "LOY_B1_Q25",
    bank_id: "AUTHORED_BANK_1",
    display_order: 25,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "signature_driver",
    prompt: "If I had to name the strongest loyalty force, I’d choose:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "signature_trust" },
      { option_id: "B", text: "satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "signature_satisfaction" },
      { option_id: "C", text: "commitment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "signature_commitment" },
      { option_id: "D", text: "habit", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "signature_habit" }
    ]
  }
];

module.exports = Object.freeze(
  AUTHORED_BANK_1.map((question) =>
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
