"use strict";

// Curriculum design and observation contract: not a diagnostic, medical, or
// causal model. A mapped trait means an activity offers a relevant opportunity
// to observe and practice that dimension inside Garvey.

const GENIUS_DIMENSIONS = Object.freeze({
  SR: Object.freeze({ parent_label: "Focus & Self-Control", technical_label: "Self-Regulation", description: "Attention, follow-through, and handling the structure of a task." }),
  CQ: Object.freeze({ parent_label: "Curiosity & Love of Learning", technical_label: "Curiosity / Exploratory Drive", description: "Exploring, questioning, discovering, and wanting to know more." }),
  CR: Object.freeze({ parent_label: "Creativity & Idea Thinking", technical_label: "Creativity / Problem Finding", description: "Generating ideas, experimenting, and thinking beyond the first answer." }),
  RS: Object.freeze({ parent_label: "Thinking & Problem Solving", technical_label: "Reasoning / Pattern Recognition", description: "Recognizing patterns, using logic, and connecting ideas." }),
  PS: Object.freeze({ parent_label: "Effort & Resilience", technical_label: "Persistence / Challenge Tolerance", description: "Responding to challenge, frustration, and productive struggle." }),
  FB: Object.freeze({ parent_label: "Learning From Feedback", technical_label: "Feedback Responsiveness", description: "Using support and corrections to grow stronger over time." }),
  DE: Object.freeze({ parent_label: "Interests & Passion Areas", technical_label: "Domain Engagement", description: "Areas a child is naturally drawn toward and develops through repeated interest." }),
});

const PRACTICE_TAGS = Object.freeze({
  visual_recall: "Notice and retrieve visual details.", ordered_recall: "Hold and retrieve an order or position.", working_hold: "Keep information active while responding.", selective_attention: "Attend to relevant details among distractors.", rule_switching: "Apply a changed rule.", sequencing: "Follow or construct ordered steps.", spatial_reasoning: "Interpret location, shape, size, or proportion.", quantitative_reasoning: "Compare, compose, estimate, or calculate quantity.", symbolic_translation: "Connect a representation to a symbol or notation.", language_explanation: "Explain a process, reason, or answer.", persistence: "Return, retry, and complete an appropriate challenge.", self_reflection: "Name a strategy that helped.",
});

const CURRICULUM_GENIUS_MAP = Object.freeze({
  sight_memory_kids: Object.freeze({ activity_type: "brain_game", title: "Sight Memory — Kids", skill_goal: "Recall an emoji sequence and answer varied position questions.", task_demands: ["encode a sequence", "hold it briefly", "retrieve a requested position", "adapt to varied question types"], practice_tags: ["visual_recall", "ordered_recall", "working_hold", "selective_attention", "rule_switching"], genius_dimension_codes: ["SR", "RS", "PS"], observable_evidence: ["accuracy_by_sequence_length", "accuracy_by_position", "response_time_ms", "retry_count", "completion_status"], parent_extension: "Place 3–5 familiar objects in a row, cover them, and ask about a randomized position." }),
  equivalent_fractions: Object.freeze({ activity_type: "academic_lesson", title: "Equivalent Fractions", skill_goal: "Recognize equal quantities represented in different ways.", task_demands: ["compare part-whole relationships", "use a visual model", "connect the model to notation", "explain equivalence"], practice_tags: ["spatial_reasoning", "quantitative_reasoning", "symbolic_translation", "sequencing", "language_explanation"], genius_dimension_codes: ["RS", "SR", "FB"], observable_evidence: ["visual_model_accuracy", "symbolic_item_accuracy", "hint_use", "explanation_attempt", "mastery_on_fresh_items"], parent_extension: "Fold paper into halves and quarters, then ask the child to show why two quarters equal one half." }),
  coordinate_plotting: Object.freeze({ activity_type: "academic_lesson", title: "Coordinate Plotting", skill_goal: "Locate and describe points on a grid.", task_demands: ["hold an ordered pair", "move horizontal then vertical", "orient on a grid", "check the plotted result"], practice_tags: ["spatial_reasoning", "sequencing", "working_hold", "symbolic_translation"], genius_dimension_codes: ["RS", "SR", "FB"], observable_evidence: ["ordered_pair_accuracy", "axis_order_error_rate", "hint_use", "correction_after_feedback"], parent_extension: "Make a floor grid with tape and have the child walk ordered pairs." }),
  multiplication_arrays: Object.freeze({ activity_type: "academic_lesson", title: "Multiplication Arrays", skill_goal: "Connect equal groups, arrays, repeated addition, and equations.", task_demands: ["form groups", "notice rows and columns", "connect a picture to an equation", "generalize a pattern"], practice_tags: ["quantitative_reasoning", "spatial_reasoning", "symbolic_translation", "language_explanation"], genius_dimension_codes: ["RS", "CQ", "CR"], observable_evidence: ["model_to_equation_accuracy", "equation_to_model_accuracy", "strategy_explanation", "fresh_pattern_accuracy"], parent_extension: "Build arrays with coins, snacks, or blocks and say the matching multiplication sentence." }),
  reading_comprehension: Object.freeze({ activity_type: "academic_lesson", title: "Reading Comprehension", skill_goal: "Build meaning from text and answer using evidence.", task_demands: ["attend to text", "retain details", "infer", "explain using evidence"], practice_tags: ["working_hold", "selective_attention", "language_explanation", "sequencing"], genius_dimension_codes: ["SR", "RS", "CQ"], observable_evidence: ["literal_question_accuracy", "inference_accuracy", "evidence_selection", "reread_use"], parent_extension: "Pause during a short story and ask what happened first and which detail supports the answer." }),
  phonics_word_building: Object.freeze({ activity_type: "academic_lesson", title: "Phonics and Word Building", skill_goal: "Connect sounds, letters, and words.", task_demands: ["hear sound differences", "hold sound order", "blend", "segment", "connect sound to symbol"], practice_tags: ["ordered_recall", "selective_attention", "symbolic_translation", "sequencing"], genius_dimension_codes: ["SR", "RS", "FB"], observable_evidence: ["sound_identification_accuracy", "blend_accuracy", "segment_accuracy", "correction_after_feedback"], parent_extension: "Say a three-sound word; have the child tap each sound, then blend the word." }),
});

// Stable bindings connect the map to current Garvey content without making the
// content packages depend on a presentation-specific dashboard.
const CONTENT_BINDINGS = Object.freeze({
  "gamehub/sight-memory": Object.freeze({ mapping_id: "sight_memory_kids", route: "/gamehub/sight-memory.html", modes: ["child", "adult"] }),
  G4M_FR_001: Object.freeze({ mapping_id: "equivalent_fractions", package_path: "public/gamehub/skill-world/content/G4M_FR_001.skill-package.v1.json" }),
  G5M_FR_001: Object.freeze({ mapping_id: "equivalent_fractions", package_path: "public/gamehub/skill-world/content/G5M_FR_001.skill-package.v1.json" }),
  G5M_GM_001: Object.freeze({ mapping_id: "coordinate_plotting", package_path: "public/gamehub/skill-world/content/G5M_GM_001.skill-package.v1.json" }),
  G4M_OA_001: Object.freeze({ mapping_id: "multiplication_arrays", package_path: "public/gamehub/skill-world/content/G4M_OA_001.skill-package.v1.json" }),
});

function getCurriculumGeniusMapping(contentId) {
  const binding = CONTENT_BINDINGS[String(contentId || "")];
  if (!binding) return null;
  return Object.freeze({ content_id: String(contentId), ...binding, activity: CURRICULUM_GENIUS_MAP[binding.mapping_id] });
}

module.exports = Object.freeze({ GENIUS_DIMENSIONS, PRACTICE_TAGS, CURRICULUM_GENIUS_MAP, CONTENT_BINDINGS, getCurriculumGeniusMapping });
