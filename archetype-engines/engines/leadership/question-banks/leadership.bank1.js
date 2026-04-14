"use strict";

const AUTHORED_BANK_1 = [
  {
    question_id: "LEAD_B1_Q01",
    bank_id: "AUTHORED_BANK_1",
    display_order: 1,
    engine: "leadership",
    question_class: "ID",
    question_subclass: "mission_orientation",
    prompt: "Strong leadership begins with the ability to:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "create a compelling future direction", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "identity", signal_type: "vision_anchor" },
      { option_id: "B", text: "establish order and accountability", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "identity", signal_type: "structure_anchor" },
      { option_id: "C", text: "build trust and team confidence", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "identity", signal_type: "people_anchor" },
      { option_id: "D", text: "adapt to changing conditions quickly", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "identity", signal_type: "adaptation_anchor" }
    ]
  },
  {
    question_id: "LEAD_B1_Q02",
    bank_id: "AUTHORED_BANK_1",
    display_order: 2,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "execution_response",
    prompt: "When I enter a messy situation, I usually:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "define the larger opportunity first", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "standard", signal_type: "vision_scan" },
      { option_id: "B", text: "create structure and priorities", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "structure_build" },
      { option_id: "C", text: "assess how people are affected", primary_dimension: "RI", secondary_dimension: "AC", primary_archetype: "RI", secondary_archetype: "AC", weight_type: "standard", signal_type: "people_scan" },
      { option_id: "D", text: "read the environment before deciding", primary_dimension: "AC", secondary_dimension: "RI", primary_archetype: "AC", secondary_archetype: "RI", weight_type: "standard", signal_type: "context_scan" }
    ]
  },
  {
    question_id: "LEAD_B1_Q03",
    bank_id: "AUTHORED_BANK_1",
    display_order: 3,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "leadership_signature",
    prompt: "People would most likely say I lead through:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "vision and momentum", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "standard", signal_type: "vision_signature" },
      { option_id: "B", text: "consistency and standards", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "structure_signature" },
      { option_id: "C", text: "trust and human connection", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "standard", signal_type: "people_signature" },
      { option_id: "D", text: "flexibility and adjustment", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "standard", signal_type: "adapt_signature" }
    ]
  },
  {
    question_id: "LEAD_B1_Q04",
    bank_id: "AUTHORED_BANK_1",
    display_order: 4,
    engine: "leadership",
    question_class: "ID",
    question_subclass: "leadership_priority",
    prompt: "What matters more in leadership?",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "clarity of direction", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "identity", signal_type: "direction_priority" },
      { option_id: "B", text: "reliability of execution", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "identity", signal_type: "execution_priority" },
      { option_id: "C", text: "strength of team relationships", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "identity", signal_type: "relationship_priority" },
      { option_id: "D", text: "responsiveness to change", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "identity", signal_type: "adapt_priority" }
    ]
  },
  {
    question_id: "LEAD_B1_Q05",
    bank_id: "AUTHORED_BANK_1",
    display_order: 5,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "ambiguity_response",
    prompt: "When goals are unclear, I tend to:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "frame the mission in bigger terms", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "standard", signal_type: "mission_reframe" },
      { option_id: "B", text: "define steps and deadlines", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "step_structure" },
      { option_id: "C", text: "talk with the team to create alignment", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "standard", signal_type: "alignment_conversation" },
      { option_id: "D", text: "stay flexible until more information appears", primary_dimension: "AC", secondary_dimension: "RI", primary_archetype: "AC", secondary_archetype: "RI", weight_type: "standard", signal_type: "adaptive_wait" }
    ]
  },
  {
    question_id: "LEAD_B1_Q06",
    bank_id: "AUTHORED_BANK_1",
    display_order: 6,
    engine: "leadership",
    question_class: "ID",
    question_subclass: "leader_ideal",
    prompt: "A strong leader should primarily be:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "inspiring", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "identity", signal_type: "ideal_inspiring" },
      { option_id: "B", text: "disciplined", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "identity", signal_type: "ideal_disciplined" },
      { option_id: "C", text: "emotionally aware", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "identity", signal_type: "ideal_emotional_awareness" },
      { option_id: "D", text: "adaptable", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "identity", signal_type: "ideal_adaptable" }
    ]
  },
  {
    question_id: "LEAD_B1_Q07",
    bank_id: "AUTHORED_BANK_1",
    display_order: 7,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "startup_focus",
    prompt: "When starting something new, I focus first on:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "why it matters", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "standard", signal_type: "purpose_first" },
      { option_id: "B", text: "how it will operate", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "operation_first" },
      { option_id: "C", text: "who needs to buy in", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "standard", signal_type: "buyin_first" },
      { option_id: "D", text: "what could shift unexpectedly", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "standard", signal_type: "risk_first" }
    ]
  },
  {
    question_id: "LEAD_B1_Q08",
    bank_id: "AUTHORED_BANK_1",
    display_order: 8,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "meeting_focus",
    prompt: "In meetings, I naturally emphasize:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "direction and possibility", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "standard", signal_type: "meeting_direction" },
      { option_id: "B", text: "tasks, deadlines, and accountability", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "meeting_execution" },
      { option_id: "C", text: "morale and understanding", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "standard", signal_type: "meeting_morale" },
      { option_id: "D", text: "situational nuance and flexibility", primary_dimension: "AC", secondary_dimension: "RI", primary_archetype: "AC", secondary_archetype: "RI", weight_type: "standard", signal_type: "meeting_adaptation" }
    ]
  },
  {
    question_id: "LEAD_B1_Q09",
    bank_id: "AUTHORED_BANK_1",
    display_order: 9,
    engine: "leadership",
    question_class: "SC",
    question_subclass: "deadline_recovery",
    prompt: "A project is behind schedule. You first:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "reconnect the team to the bigger mission", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "scenario", signal_type: "mission_recovery" },
      { option_id: "B", text: "tighten responsibilities and delivery points", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "scenario", signal_type: "delivery_recovery" },
      { option_id: "C", text: "understand obstacles and team strain", primary_dimension: "RI", secondary_dimension: "SD", primary_archetype: "RI", secondary_archetype: "SD", weight_type: "scenario", signal_type: "strain_recovery" },
      { option_id: "D", text: "reassess the plan based on current reality", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "scenario", signal_type: "plan_reassessment" }
    ]
  },
  {
    question_id: "LEAD_B1_Q10",
    bank_id: "AUTHORED_BANK_1",
    display_order: 10,
    engine: "leadership",
    question_class: "SC",
    question_subclass: "performance_response",
    prompt: "A talented employee is underperforming. You first:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "reconnect them to purpose and possibility", primary_dimension: "VD", secondary_dimension: "RI", primary_archetype: "VD", secondary_archetype: "RI", weight_type: "scenario", signal_type: "purpose_reengagement" },
      { option_id: "B", text: "clarify expectations and metrics", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "scenario", signal_type: "metric_clarity" },
      { option_id: "C", text: "explore what is happening beneath the behavior", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "scenario", signal_type: "behavior_exploration" },
      { option_id: "D", text: "adjust the role or environment if needed", primary_dimension: "AC", secondary_dimension: "RI", primary_archetype: "AC", secondary_archetype: "RI", weight_type: "scenario", signal_type: "context_adjustment" }
    ]
  },
  {
    question_id: "LEAD_B1_Q11",
    bank_id: "AUTHORED_BANK_1",
    display_order: 11,
    engine: "leadership",
    question_class: "ID",
    question_subclass: "leader_respect",
    prompt: "I respect leaders most when they:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "make people believe", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "identity", signal_type: "belief_influence" },
      { option_id: "B", text: "deliver results reliably", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "identity", signal_type: "reliable_results" },
      { option_id: "C", text: "bring out the best in others", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "identity", signal_type: "people_development" },
      { option_id: "D", text: "stay effective under uncertainty", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "identity", signal_type: "uncertainty_effectiveness" }
    ]
  },
  {
    question_id: "LEAD_B1_Q12",
    bank_id: "AUTHORED_BANK_1",
    display_order: 12,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "strength_zone",
    prompt: "I am usually strongest when I can:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "shape the long-term direction", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "standard", signal_type: "longterm_direction" },
      { option_id: "B", text: "build systems that hold", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "system_building" },
      { option_id: "C", text: "strengthen relationships and trust", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "standard", signal_type: "trust_strengthening" },
      { option_id: "D", text: "move fluidly with change", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "standard", signal_type: "change_fluency" }
    ]
  },
  {
    question_id: "LEAD_B1_Q13",
    bank_id: "AUTHORED_BANK_1",
    display_order: 13,
    engine: "leadership",
    question_class: "SC",
    question_subclass: "motivation_repair",
    prompt: "A team is losing motivation. You respond by:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "reigniting the vision", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "scenario", signal_type: "vision_reignite" },
      { option_id: "B", text: "restoring structure and wins", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "scenario", signal_type: "win_structure" },
      { option_id: "C", text: "reconnecting people emotionally", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "scenario", signal_type: "emotional_reconnect" },
      { option_id: "D", text: "changing the approach to fit the moment", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "scenario", signal_type: "approach_shift" }
    ]
  },
  {
    question_id: "LEAD_B1_Q14",
    bank_id: "AUTHORED_BANK_1",
    display_order: 14,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "decision_style",
    prompt: "I usually make decisions by:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "considering strategic upside", primary_dimension: "VD", secondary_dimension: "AC", primary_archetype: "VD", secondary_archetype: "AC", weight_type: "standard", signal_type: "strategic_upside" },
      { option_id: "B", text: "evaluating practical execution", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "practical_execution" },
      { option_id: "C", text: "considering impact on people", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "standard", signal_type: "people_impact" },
      { option_id: "D", text: "adjusting to context as I go", primary_dimension: "AC", secondary_dimension: "RI", primary_archetype: "AC", secondary_archetype: "RI", weight_type: "standard", signal_type: "contextual_adjustment" }
    ]
  },
  {
    question_id: "LEAD_B1_Q15",
    bank_id: "AUTHORED_BANK_1",
    display_order: 15,
    engine: "leadership",
    question_class: "ID",
    question_subclass: "team_design",
    prompt: "A team works best when it has:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "a clear inspiring direction", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "identity", signal_type: "team_direction" },
      { option_id: "B", text: "dependable systems", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "identity", signal_type: "team_systems" },
      { option_id: "C", text: "strong relational trust", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "identity", signal_type: "team_trust" },
      { option_id: "D", text: "room to adjust and respond", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "identity", signal_type: "team_flexibility" }
    ]
  },
  {
    question_id: "LEAD_B1_Q16",
    bank_id: "AUTHORED_BANK_1",
    display_order: 16,
    engine: "leadership",
    question_class: "ST",
    question_subclass: "pressure_pattern",
    prompt: "When pressure rises, I tend to:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "push meaning and momentum harder", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "stress", signal_type: "pressure_meaning_push" },
      { option_id: "B", text: "increase structure and control", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "stress", signal_type: "pressure_control" },
      { option_id: "C", text: "become more attentive to people dynamics", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "stress", signal_type: "pressure_people_attention" },
      { option_id: "D", text: "pivot and recalibrate quickly", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "stress", signal_type: "pressure_pivot" }
    ]
  },
  {
    question_id: "LEAD_B1_Q17",
    bank_id: "AUTHORED_BANK_1",
    display_order: 17,
    engine: "leadership",
    question_class: "ST",
    question_subclass: "pressure_protection",
    prompt: "Under stress, what do you protect first?",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "the mission", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "stress", signal_type: "protect_mission" },
      { option_id: "B", text: "the system", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "stress", signal_type: "protect_system" },
      { option_id: "C", text: "the people", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "stress", signal_type: "protect_people" },
      { option_id: "D", text: "the ability to adapt", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "stress", signal_type: "protect_adaptability" }
    ]
  },
  {
    question_id: "LEAD_B1_Q18",
    bank_id: "AUTHORED_BANK_1",
    display_order: 18,
    engine: "leadership",
    question_class: "ST",
    question_subclass: "conflict_response",
    prompt: "When conflict emerges, I naturally:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "reframe the bigger purpose", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "stress", signal_type: "conflict_reframe" },
      { option_id: "B", text: "set clear boundaries and rules", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "stress", signal_type: "conflict_boundaries" },
      { option_id: "C", text: "try to understand all sides", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "stress", signal_type: "conflict_understanding" },
      { option_id: "D", text: "adjust strategy to reduce friction", primary_dimension: "AC", secondary_dimension: "RI", primary_archetype: "AC", secondary_archetype: "RI", weight_type: "stress", signal_type: "conflict_strategy_shift" }
    ]
  },
  {
    question_id: "LEAD_B1_Q19",
    bank_id: "AUTHORED_BANK_1",
    display_order: 19,
    engine: "leadership",
    question_class: "ST",
    question_subclass: "challenge_response",
    prompt: "When someone challenges my plan, I first:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "defend the strategic direction", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "stress", signal_type: "challenge_strategy_defense" },
      { option_id: "B", text: "ask for evidence and specifics", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "stress", signal_type: "challenge_evidence" },
      { option_id: "C", text: "read their emotional position", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "stress", signal_type: "challenge_emotional_read" },
      { option_id: "D", text: "consider whether the context has changed", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "stress", signal_type: "challenge_context_shift" }
    ]
  },
  {
    question_id: "LEAD_B1_Q20",
    bank_id: "AUTHORED_BANK_1",
    display_order: 20,
    engine: "leadership",
    question_class: "ST",
    question_subclass: "uncertainty_pattern",
    prompt: "In fast-moving uncertainty, I become:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "more visionary", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "stress", signal_type: "uncertainty_visionary" },
      { option_id: "B", text: "more controlling", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "stress", signal_type: "uncertainty_control" },
      { option_id: "C", text: "more relationally attentive", primary_dimension: "RI", secondary_dimension: "AC", primary_archetype: "RI", secondary_archetype: "AC", weight_type: "stress", signal_type: "uncertainty_relational_attention" },
      { option_id: "D", text: "more fluid and improvisational", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "stress", signal_type: "uncertainty_improvise" }
    ]
  },
  {
    question_id: "LEAD_B1_Q21",
    bank_id: "AUTHORED_BANK_1",
    display_order: 21,
    engine: "leadership",
    question_class: "DS",
    question_subclass: "growth_target",
    prompt: "I want to become a leader who more consistently:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "inspires with clarity", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "desired", signal_type: "growth_inspire_clarity" },
      { option_id: "B", text: "executes with stronger discipline", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "desired", signal_type: "growth_execution_discipline" },
      { option_id: "C", text: "leads with more emotional intelligence", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "desired", signal_type: "growth_emotional_intelligence" },
      { option_id: "D", text: "adapts without losing direction", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "desired", signal_type: "growth_adapt_direction" }
    ]
  },
  {
    question_id: "LEAD_B1_Q22",
    bank_id: "AUTHORED_BANK_1",
    display_order: 22,
    engine: "leadership",
    question_class: "DS",
    question_subclass: "growth_edge",
    prompt: "My biggest growth edge is probably:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "translating vision into action", primary_dimension: "VD", secondary_dimension: "SD", primary_archetype: "VD", secondary_archetype: "SD", weight_type: "desired", signal_type: "growth_vision_to_action" },
      { option_id: "B", text: "leading with more flexibility", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "desired", signal_type: "growth_structure_flexibility" },
      { option_id: "C", text: "being more direct without losing care", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "desired", signal_type: "growth_direct_care" },
      { option_id: "D", text: "building steadiness within change", primary_dimension: "AC", secondary_dimension: "SD", primary_archetype: "AC", secondary_archetype: "SD", weight_type: "desired", signal_type: "growth_steady_change" }
    ]
  },
  {
    question_id: "LEAD_B1_Q23",
    bank_id: "AUTHORED_BANK_1",
    display_order: 23,
    engine: "leadership",
    question_class: "DS",
    question_subclass: "rebalance_practice",
    prompt: "To become more balanced, I need to:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "communicate direction more concretely", primary_dimension: "VD", secondary_dimension: "SD", primary_archetype: "VD", secondary_archetype: "SD", weight_type: "desired", signal_type: "rebalance_direction_concrete" },
      { option_id: "B", text: "relax overcontrol when appropriate", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "desired", signal_type: "rebalance_overcontrol" },
      { option_id: "C", text: "hold people accountable more directly", primary_dimension: "RI", secondary_dimension: "SD", primary_archetype: "RI", secondary_archetype: "SD", weight_type: "desired", signal_type: "rebalance_accountability" },
      { option_id: "D", text: "create more consistency in my pivots", primary_dimension: "AC", secondary_dimension: "SD", primary_archetype: "AC", secondary_archetype: "SD", weight_type: "desired", signal_type: "rebalance_consistent_pivots" }
    ]
  },
  {
    question_id: "LEAD_B1_Q24",
    bank_id: "AUTHORED_BANK_1",
    display_order: 24,
    engine: "leadership",
    question_class: "BH",
    question_subclass: "actual_style",
    prompt: "In reality, I often lead by:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "energizing possibilities", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "standard", signal_type: "actual_energizing" },
      { option_id: "B", text: "managing execution details", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "standard", signal_type: "actual_execution_management" },
      { option_id: "C", text: "reading people and relationships", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "standard", signal_type: "actual_people_reading" },
      { option_id: "D", text: "adjusting dynamically to context", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "standard", signal_type: "actual_dynamic_adjustment" }
    ]
  },
  {
    question_id: "LEAD_B1_Q25",
    bank_id: "AUTHORED_BANK_1",
    display_order: 25,
    engine: "leadership",
    question_class: "ID",
    question_subclass: "superpower_choice",
    prompt: "If I had to choose one leadership superpower, it would be:",
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options: [
      { option_id: "A", text: "vision", primary_dimension: "VD", secondary_dimension: "IE", primary_archetype: "VD", secondary_archetype: "IE", weight_type: "identity", signal_type: "superpower_vision" },
      { option_id: "B", text: "structure", primary_dimension: "SD", secondary_dimension: "AC", primary_archetype: "SD", secondary_archetype: "AC", weight_type: "identity", signal_type: "superpower_structure" },
      { option_id: "C", text: "connection", primary_dimension: "RI", secondary_dimension: "IE", primary_archetype: "RI", secondary_archetype: "IE", weight_type: "identity", signal_type: "superpower_connection" },
      { option_id: "D", text: "adaptability", primary_dimension: "AC", secondary_dimension: "VD", primary_archetype: "AC", secondary_archetype: "VD", weight_type: "identity", signal_type: "superpower_adaptability" }
    ]
  }
];

module.exports = Object.freeze(AUTHORED_BANK_1.map((question) => Object.freeze({
  ...question,
  options: Object.freeze((question.options || []).map((option) => Object.freeze(option))),
})));
