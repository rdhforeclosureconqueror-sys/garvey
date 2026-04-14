"use strict";

const AUTHORED_BANK_2 = [
  {
    question_id: "LOY_B2_Q01",
    bank_id: "AUTHORED_BANK_2",
    display_order: 1,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "trust_independence",
    prompt: "I can stay loyal to a brand even if I don’t particularly trust it.",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "strongly agree", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "identity", signal_type: "trust_low_lockin_high" },
      { option_id: "B", text: "somewhat agree", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "identity", signal_type: "trust_low_habit_high" },
      { option_id: "C", text: "somewhat disagree", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "trust_moderate_required" },
      { option_id: "D", text: "strongly disagree", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "trust_required" }
    ]
  },
  {
    question_id: "LOY_B2_Q02",
    bank_id: "AUTHORED_BANK_2",
    display_order: 2,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "convenience_pull",
    prompt: "If something is convenient enough, I usually keep using it.",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "strongly agree", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "convenience_primary" },
      { option_id: "B", text: "somewhat agree", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "identity", signal_type: "convenience_moderate" },
      { option_id: "C", text: "somewhat disagree", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "convenience_limited" },
      { option_id: "D", text: "strongly disagree", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "convenience_rejected" }
    ]
  },
  {
    question_id: "LOY_B2_Q03",
    bank_id: "AUTHORED_BANK_2",
    display_order: 3,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "long_term_driver",
    prompt: "The brands I stay with longest are usually the ones that:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "feel dependable", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "dependable_longterm" },
      { option_id: "B", text: "feel consistently rewarding", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "rewarding_longterm" },
      { option_id: "C", text: "feel personally meaningful", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "meaningful_longterm" },
      { option_id: "D", text: "become embedded in my routine", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "routine_longterm" }
    ]
  },
  {
    question_id: "LOY_B2_Q04",
    bank_id: "AUTHORED_BANK_2",
    display_order: 4,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "reward_vs_service",
    prompt: "A brand offers a generous reward but has inconsistent service. You:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "hesitate if trust feels shaky", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "scenario", signal_type: "reward_service_trust" },
      { option_id: "B", text: "stay if the overall experience still satisfies", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "reward_service_satisfaction" },
      { option_id: "C", text: "stay only if the bond still feels real", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "reward_service_bond" },
      { option_id: "D", text: "stay if the reward and routine still make sense", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "scenario", signal_type: "reward_service_friction" }
    ]
  },
  {
    question_id: "LOY_B2_Q05",
    bank_id: "AUTHORED_BANK_2",
    display_order: 5,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "hidden_detail_response",
    prompt: "A company hides an important detail. You:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "feel the trust is damaged immediately", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "hidden_detail_trust_break" },
      { option_id: "B", text: "focus on whether the outcome still satisfies you", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "hidden_detail_value" },
      { option_id: "C", text: "feel personally disappointed", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "hidden_detail_disappointment" },
      { option_id: "D", text: "evaluate whether leaving is worth the friction", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "hidden_detail_friction" }
    ]
  },
  {
    question_id: "LOY_B2_Q06",
    bank_id: "AUTHORED_BANK_2",
    display_order: 6,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "loyalty_realization",
    prompt: "I often realize I’m loyal when I:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "assume the brand will do the right thing", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "assume_good_intent" },
      { option_id: "B", text: "repurchase without much hesitation", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "easy_repurchase" },
      { option_id: "C", text: "speak highly of it to others", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "speak_highly" },
      { option_id: "D", text: "rarely compare alternatives anymore", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "stop_comparing" }
    ]
  },
  {
    question_id: "LOY_B2_Q07",
    bank_id: "AUTHORED_BANK_2",
    display_order: 7,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "relationship_feel",
    prompt: "A good loyalty relationship should feel:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trustworthy", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "relationship_trustworthy" },
      { option_id: "B", text: "satisfying", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "relationship_satisfying" },
      { option_id: "C", text: "emotionally meaningful", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "relationship_meaningful" },
      { option_id: "D", text: "easy and frictionless", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "relationship_frictionless" }
    ]
  },
  {
    question_id: "LOY_B2_Q08",
    bank_id: "AUTHORED_BANK_2",
    display_order: 8,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "paper_better_competitor",
    prompt: "A new competitor looks better on paper. You stay because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust is hard to rebuild elsewhere", primary_dimension: "TD", secondary_dimension: "SF", weight_type: "scenario", signal_type: "paper_competitor_trust" },
      { option_id: "B", text: "your current experience is still reliably good", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "paper_competitor_satisfaction" },
      { option_id: "C", text: "you feel more connected to what you have now", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "paper_competitor_connection" },
      { option_id: "D", text: "change would interrupt your routine", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "scenario", signal_type: "paper_competitor_routine" }
    ]
  },
  {
    question_id: "LOY_B2_Q09",
    bank_id: "AUTHORED_BANK_2",
    display_order: 9,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "first_layer_driver",
    prompt: "What usually earns the first layer of my loyalty is:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "credibility", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "first_layer_credibility" },
      { option_id: "B", text: "satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "first_layer_satisfaction" },
      { option_id: "C", text: "affinity", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "first_layer_affinity" },
      { option_id: "D", text: "convenience", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "first_layer_convenience" }
    ]
  },
  {
    question_id: "LOY_B2_Q10",
    bank_id: "AUTHORED_BANK_2",
    display_order: 10,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "worse_loss",
    prompt: "Which feels worse?",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "realizing a brand is not trustworthy", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "worse_trust_loss" },
      { option_id: "B", text: "paying for an experience that no longer satisfies", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "worse_satisfaction_loss" },
      { option_id: "C", text: "feeling emotionally let down by a brand you cared about", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "worse_emotional_loss" },
      { option_id: "D", text: "being forced into a clumsy change process", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "worse_change_friction" }
    ]
  },
  {
    question_id: "LOY_B2_Q11",
    bank_id: "AUTHORED_BANK_2",
    display_order: 11,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "weakening_trigger",
    prompt: "My loyalty weakens fastest when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "promises and actions no longer match", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "weaken_promise_gap" },
      { option_id: "B", text: "satisfaction becomes inconsistent", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "weaken_inconsistent_satisfaction" },
      { option_id: "C", text: "the relationship feels impersonal or false", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "weaken_false_relationship" },
      { option_id: "D", text: "a more convenient default appears", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "stress", signal_type: "weaken_better_default" }
    ]
  },
  {
    question_id: "LOY_B2_Q12",
    bank_id: "AUTHORED_BANK_2",
    display_order: 12,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "benefit_removed",
    prompt: "A favorite brand removes a benefit you liked. You:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "stay if trust remains strong", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "scenario", signal_type: "benefit_removed_trust" },
      { option_id: "B", text: "stay if overall satisfaction remains high", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "scenario", signal_type: "benefit_removed_satisfaction" },
      { option_id: "C", text: "stay if you still feel connected to it", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "benefit_removed_connection" },
      { option_id: "D", text: "stay if it is still easiest to use", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "scenario", signal_type: "benefit_removed_ease" }
    ]
  },
  {
    question_id: "LOY_B2_Q13",
    bank_id: "AUTHORED_BANK_2",
    display_order: 13,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "stay_vulnerability",
    prompt: "I am probably most vulnerable to staying because of:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "past trust history", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "vulnerable_trust_history" },
      { option_id: "B", text: "“good enough” satisfaction", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "vulnerable_good_enough" },
      { option_id: "C", text: "emotional attachment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "vulnerable_attachment" },
      { option_id: "D", text: "habit and inertia", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "vulnerable_inertia" }
    ]
  },
  {
    question_id: "LOY_B2_Q14",
    bank_id: "AUTHORED_BANK_2",
    display_order: 14,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "real_loyalty_definition",
    prompt: "Real loyalty should be:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "earned through trust", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "identity", signal_type: "real_loyalty_trust" },
      { option_id: "B", text: "earned through sustained satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "identity", signal_type: "real_loyalty_satisfaction" },
      { option_id: "C", text: "felt as commitment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "real_loyalty_commitment" },
      { option_id: "D", text: "reinforced through easy repetition", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "real_loyalty_repetition" }
    ]
  },
  {
    question_id: "LOY_B2_Q15",
    bank_id: "AUTHORED_BANK_2",
    display_order: 15,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "search_stop_reason",
    prompt: "If I stop thinking about alternatives, it is usually because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I trust what I already have", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "stop_search_trust" },
      { option_id: "B", text: "I’m satisfied enough not to search", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "standard", signal_type: "stop_search_satisfaction" },
      { option_id: "C", text: "I’m emotionally committed already", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "stop_search_commitment" },
      { option_id: "D", text: "the habit is already formed", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "stop_search_habit" }
    ]
  },
  {
    question_id: "LOY_B2_Q16",
    bank_id: "AUTHORED_BANK_2",
    display_order: 16,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "protective_focus",
    prompt: "When loyalty is challenged, I first protect:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "confidence in the relationship", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "protect_confidence" },
      { option_id: "B", text: "value and satisfaction", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "protect_value" },
      { option_id: "C", text: "emotional connection", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "protect_connection" },
      { option_id: "D", text: "ease and continuity", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "stress", signal_type: "protect_continuity" }
    ]
  },
  {
    question_id: "LOY_B2_Q17",
    bank_id: "AUTHORED_BANK_2",
    display_order: 17,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "stay_reason_awareness",
    prompt: "I want to be better at noticing when I’m staying because of:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "assumed trust instead of real evidence", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "desired", signal_type: "desired_notice_assumed_trust" },
      { option_id: "B", text: "mediocre satisfaction instead of good fit", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "desired", signal_type: "desired_notice_mediocre_fit" },
      { option_id: "C", text: "emotional identification instead of clear judgment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "desired_notice_identification" },
      { option_id: "D", text: "inertia instead of genuine preference", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "desired_notice_inertia" }
    ]
  },
  {
    question_id: "LOY_B2_Q18",
    bank_id: "AUTHORED_BANK_2",
    display_order: 18,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "future_rooting",
    prompt: "I want my future loyalty decisions to be more rooted in:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "earned trust", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "desired", signal_type: "future_root_trust" },
      { option_id: "B", text: "actual value received", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "desired", signal_type: "future_root_value" },
      { option_id: "C", text: "authentic alignment", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "future_root_alignment" },
      { option_id: "D", text: "intentional choice instead of habit", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "future_root_choice" }
    ]
  },
  {
    question_id: "LOY_B2_Q19",
    bank_id: "AUTHORED_BANK_2",
    display_order: 19,
    engine: "loyalty",
    question_class: "DS",
    question_subclass: "healthy_loyalty_version",
    prompt: "My healthiest version of loyalty would be:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trusting without being naïve", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "desired", signal_type: "healthy_trusting" },
      { option_id: "B", text: "satisfied without becoming passive", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "desired", signal_type: "healthy_satisfied" },
      { option_id: "C", text: "committed without overidentifying", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "desired", signal_type: "healthy_committed" },
      { option_id: "D", text: "habitual without becoming trapped", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "desired", signal_type: "healthy_habitual" }
    ]
  },
  {
    question_id: "LOY_B2_Q20",
    bank_id: "AUTHORED_BANK_2",
    display_order: 20,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "actual_keep_using",
    prompt: "In reality, I most often keep using something because:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I expect it to be dependable", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "standard", signal_type: "actual_dependable" },
      { option_id: "B", text: "it generally does the job well", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "actual_does_job_well" },
      { option_id: "C", text: "I’ve formed a real attachment to it", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "actual_real_attachment" },
      { option_id: "D", text: "it’s part of my routine now", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "standard", signal_type: "actual_routine_now" }
    ]
  },
  {
    question_id: "LOY_B2_Q21",
    bank_id: "AUTHORED_BANK_2",
    display_order: 21,
    engine: "loyalty",
    question_class: "SC",
    question_subclass: "difficult_cancellation",
    prompt: "A brand makes cancellation difficult. You:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "resent it if trust was already weakening", primary_dimension: "TD", secondary_dimension: "SF", weight_type: "scenario", signal_type: "cancel_difficult_trust" },
      { option_id: "B", text: "tolerate it if satisfaction is still high", primary_dimension: "SA", secondary_dimension: "SF", weight_type: "scenario", signal_type: "cancel_difficult_satisfaction" },
      { option_id: "C", text: "feel especially betrayed if you once cared deeply", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "scenario", signal_type: "cancel_difficult_betrayal" },
      { option_id: "D", text: "weigh the friction against the effort to move", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "scenario", signal_type: "cancel_difficult_friction" }
    ]
  },
  {
    question_id: "LOY_B2_Q22",
    bank_id: "AUTHORED_BANK_2",
    display_order: 22,
    engine: "loyalty",
    question_class: "ST",
    question_subclass: "benefit_cut_focus",
    prompt: "When benefits are cut back, I most want to know:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "were they honest about why?", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "stress", signal_type: "benefit_cut_honesty" },
      { option_id: "B", text: "is the experience still worth it?", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "stress", signal_type: "benefit_cut_worth" },
      { option_id: "C", text: "does this change how I feel about them?", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "stress", signal_type: "benefit_cut_feeling" },
      { option_id: "D", text: "how hard is leaving now?", primary_dimension: "SF", secondary_dimension: "CH", weight_type: "stress", signal_type: "benefit_cut_leaving_difficulty" }
    ]
  },
  {
    question_id: "LOY_B2_Q23",
    bank_id: "AUTHORED_BANK_2",
    display_order: 23,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "reframed_loyalty",
    prompt: "Some loyalty is really just:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust carried too far", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "reframed_trust" },
      { option_id: "B", text: "satisfaction carried too long", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "identity", signal_type: "reframed_satisfaction" },
      { option_id: "C", text: "attachment without clarity", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "reframed_attachment" },
      { option_id: "D", text: "habit with barriers to exit", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "reframed_habit" }
    ]
  },
  {
    question_id: "LOY_B2_Q24",
    bank_id: "AUTHORED_BANK_2",
    display_order: 24,
    engine: "loyalty",
    question_class: "BH",
    question_subclass: "advocacy_pattern",
    prompt: "I am most likely to become an advocate when:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "I trust the brand completely", primary_dimension: "TD", secondary_dimension: "ECM", weight_type: "standard", signal_type: "advocate_trust" },
      { option_id: "B", text: "I’m repeatedly satisfied by it", primary_dimension: "SA", secondary_dimension: "TD", weight_type: "standard", signal_type: "advocate_satisfaction" },
      { option_id: "C", text: "I feel personally connected to it", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "standard", signal_type: "advocate_connection" },
      { option_id: "D", text: "it becomes a seamless part of my life", primary_dimension: "CH", secondary_dimension: "SA", weight_type: "standard", signal_type: "advocate_seamless" }
    ]
  },
  {
    question_id: "LOY_B2_Q25",
    bank_id: "AUTHORED_BANK_2",
    display_order: 25,
    engine: "loyalty",
    question_class: "ID",
    question_subclass: "fragile_loyalty_type",
    prompt: "The most fragile kind of loyalty is usually based mostly on:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "trust without verification", primary_dimension: "TD", secondary_dimension: "SA", weight_type: "identity", signal_type: "fragile_trust" },
      { option_id: "B", text: "satisfaction without attachment", primary_dimension: "SA", secondary_dimension: "CH", weight_type: "identity", signal_type: "fragile_satisfaction" },
      { option_id: "C", text: "emotion without substance", primary_dimension: "ECM", secondary_dimension: "TD", weight_type: "identity", signal_type: "fragile_emotion" },
      { option_id: "D", text: "convenience without deeper value", primary_dimension: "CH", secondary_dimension: "SF", weight_type: "identity", signal_type: "fragile_convenience" }
    ]
  }
];

module.exports = AUTHORED_BANK_2;
