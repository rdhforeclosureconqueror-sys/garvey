"use strict";

// Grade 4 Skill World item map. This is an instructional observation model:
// an item can provide evidence about the task the child was asked to practice;
// it does not measure an inherent trait, intelligence, diagnosis, or cause.

const { GENIUS_DIMENSIONS, PRACTICE_TAGS } = require("./curriculumGeniusMap");

const QUESTION_BANKS = Object.freeze(["worked_examples", "guided_practice", "adaptive_question_bank", "checkpoint", "review_bank"]);

function profile(academic_target, task_demands, practice_tags, genius_dimension_codes, evidence) {
  return Object.freeze({ academic_target, task_demands: Object.freeze(task_demands), practice_tags: Object.freeze(practice_tags), genius_dimension_codes: Object.freeze(genius_dimension_codes), evidence: Object.freeze(evidence) });
}

const GRADE4_SKILL_PROFILES = Object.freeze({
  G4M_NBT_001: profile("Place value to one million", ["attend to digit position", "represent a number in more than one form", "compare or round using place value"], ["selective_attention", "symbolic_translation", "quantitative_reasoning", "sequencing"], ["SR", "RS", "FB"], ["place_value_accuracy", "rounding_accuracy", "representation_choice", "hint_use"]),
  G4M_NBT_002: profile("Multi-digit addition and subtraction", ["align place values", "carry out ordered algorithm steps", "check whether a result is reasonable"], ["working_hold", "sequencing", "quantitative_reasoning", "self_reflection"], ["SR", "RS", "PS", "FB"], ["algorithm_accuracy", "digit_alignment_error", "strategy_explanation", "retry_after_feedback"]),
  G4M_NBT_003: profile("Multi-digit multiplication", ["decompose factors", "keep place values organized across partial products", "combine partial products"], ["working_hold", "sequencing", "quantitative_reasoning", "symbolic_translation"], ["SR", "RS", "PS"], ["partial_product_accuracy", "place_value_product_error", "completion_status", "hint_use"]),
  G4M_NBT_004: profile("Division with remainders", ["organize groups or partial quotients", "track quotient place value", "interpret a remainder in context"], ["working_hold", "sequencing", "quantitative_reasoning", "language_explanation"], ["SR", "RS", "PS", "FB"], ["quotient_accuracy", "remainder_interpretation", "quotient_place_value_error", "retry_after_feedback"]),
  G4M_OA_001: profile("Multiplicative comparison and patterns", ["distinguish additive from multiplicative relationships", "represent a comparison", "identify a rule in a pattern"], ["quantitative_reasoning", "symbolic_translation", "selective_attention", "language_explanation"], ["RS", "SR", "CR"], ["comparison_model_accuracy", "pattern_rule_accuracy", "strategy_explanation", "fresh_item_accuracy"]),
  G4M_FR_001: profile("Fraction equivalence and ordering", ["compare part-whole relationships", "use a visual fraction model", "connect a model to fraction notation"], ["spatial_reasoning", "quantitative_reasoning", "symbolic_translation", "sequencing"], ["RS", "SR", "FB"], ["visual_model_accuracy", "fraction_comparison_accuracy", "equivalent_fraction_error", "hint_use"]),
  G4M_FR_002: profile("Add and subtract fractions", ["identify like denominators", "combine or separate equal-sized parts", "preserve the unit size"], ["quantitative_reasoning", "working_hold", "symbolic_translation", "sequencing"], ["RS", "SR", "FB"], ["fraction_operation_accuracy", "denominator_addition_error", "model_to_symbol_accuracy", "retry_after_feedback"]),
  G4M_FR_003: profile("Multiply fractions by whole numbers", ["interpret repeated equal fractional groups", "connect a model to an equation", "track a unit fraction multiple"], ["quantitative_reasoning", "spatial_reasoning", "symbolic_translation", "sequencing"], ["RS", "SR", "PS"], ["model_to_equation_accuracy", "unit_fraction_multiple_error", "fresh_item_accuracy", "hint_use"]),
  G4M_GM_001: profile("Angles, lines, and shape classification", ["notice geometric attributes", "measure or compare angle size", "classify based on defining properties"], ["spatial_reasoning", "selective_attention", "symbolic_translation", "language_explanation"], ["RS", "SR", "FB"], ["attribute_identification", "angle_measure_accuracy", "classification_accuracy", "correction_after_feedback"]),
  G4M_MD_001: profile("Measurement conversion and data", ["choose an appropriate unit", "translate between related units", "read a data display precisely"], ["quantitative_reasoning", "symbolic_translation", "selective_attention", "sequencing"], ["RS", "SR", "FB"], ["unit_conversion_accuracy", "data_interpretation_accuracy", "measurement_unit_error", "hint_use"]),
  G4E_FL_001: profile("Reading fluency, accuracy, and expression", ["attend to each printed word", "group phrases meaningfully", "use punctuation to guide expression"], ["selective_attention", "sequencing", "language_explanation", "self_reflection"], ["SR", "FB", "PS"], ["word_accuracy", "phrase_grouping", "punctuation_response", "improvement_after_retry"]),
  G4E_LANG_001: profile("Grammar, conventions, and sentence combining", ["notice a convention in context", "apply a grammar rule", "revise a sentence for clarity"], ["selective_attention", "symbolic_translation", "language_explanation", "self_reflection"], ["SR", "RS", "FB"], ["convention_accuracy", "revision_choice", "error_type", "correction_after_feedback"]),
  G4E_RC_001: profile("Ask and answer questions with text evidence", ["identify what a question asks", "locate relevant text evidence", "connect evidence to an answer"], ["selective_attention", "working_hold", "language_explanation", "sequencing"], ["SR", "RS", "FB"], ["question_interpretation", "evidence_selection", "supported_response", "reread_use"]),
  G4E_RC_002: profile("Story elements, theme, and character analysis", ["track events and character choices", "distinguish a detail from a theme", "support an interpretation with the text"], ["working_hold", "sequencing", "language_explanation", "selective_attention"], ["RS", "SR", "CR", "FB"], ["sequence_accuracy", "theme_evidence_connection", "character_analysis", "revision_after_feedback"]),
  G4E_RC_003: profile("Main idea, key details, and text structure", ["separate topic from main idea", "select relevant details", "recognize how a text is organized"], ["selective_attention", "working_hold", "language_explanation", "sequencing"], ["SR", "RS", "FB"], ["main_idea_accuracy", "detail_selection", "text_structure_accuracy", "reread_use"]),
  G4E_RF_001: profile("Advanced word analysis and multisyllable decoding", ["segment a multisyllable word", "use roots and affixes", "blend parts into a word"], ["ordered_recall", "selective_attention", "symbolic_translation", "sequencing"], ["SR", "RS", "FB", "PS"], ["word_analysis_accuracy", "affix_or_root_accuracy", "syllable_division_error", "retry_after_feedback"]),
  G4E_VOC_001: profile("Vocabulary, context clues, and figurative language", ["use nearby words as clues", "analyze word parts", "distinguish literal from figurative meaning"], ["selective_attention", "working_hold", "language_explanation", "symbolic_translation"], ["SR", "RS", "CQ"], ["context_clue_accuracy", "word_part_analysis", "figurative_language_accuracy", "strategy_explanation"]),
  G4E_WR_001: profile("Opinion writing with reasons and evidence", ["state a position", "select relevant reasons or evidence", "organize a conclusion"], ["language_explanation", "sequencing", "selective_attention", "self_reflection"], ["RS", "CR", "SR", "FB"], ["claim_clarity", "evidence_relevance", "organization", "revision_after_feedback"]),
  G4E_WR_002: profile("Informative writing with facts and details", ["introduce a focused topic", "select accurate supporting facts", "organize details for a reader"], ["language_explanation", "sequencing", "selective_attention", "self_reflection"], ["RS", "CR", "SR", "FB"], ["topic_focus", "fact_support", "detail_organization", "revision_after_feedback"]),
  G4E_WR_003: profile("Narrative writing with dialogue and description", ["sequence events", "choose descriptive details", "use dialogue or conventions to make meaning clear"], ["sequencing", "language_explanation", "self_reflection", "selective_attention"], ["CR", "RS", "SR", "FB"], ["event_sequence", "description_choice", "dialogue_conventions", "revision_after_feedback"]),
});

function text(value) { return String(value || "").trim(); }
function itemId(item, bank, index) { return text(item.question_id || item.id) || `${bank}:${index + 1}`; }

function itemDemand(item, skillProfile) {
  const type = text(item.question_type).replace(/_/g, " ");
  const misconception = text(item.misconception_tag).replace(/_/g, " ");
  return [
    ...skillProfile.task_demands,
    type ? `respond using a ${type} format` : "respond to the item prompt",
    misconception ? `avoid the targeted misconception: ${misconception}` : null,
  ].filter(Boolean);
}

function buildGrade4QuestionOutline(skillPackage) {
  const skillId = text(skillPackage?.skill_id).toUpperCase();
  const skillProfile = GRADE4_SKILL_PROFILES[skillId];
  if (!skillProfile) return null;
  const questions = [];
  for (const bank of QUESTION_BANKS) {
    const items = Array.isArray(skillPackage?.[bank]) ? skillPackage[bank] : [];
    items.forEach((item, index) => {
      questions.push(Object.freeze({
        outline_id: `${skillId}:${bank}:${itemId(item, bank, index)}`,
        skill_id: skillId,
        grade: 4,
        subject: text(skillPackage.subject),
        domain: text(skillPackage.domain),
        skill: text(skillPackage.skill),
        question_id: itemId(item, bank, index),
        question_bank: bank,
        question_prompt: text(item.prompt || item.text || item.question || item.stem),
        question_type: text(item.question_type) || "unspecified response",
        academic_target: skillProfile.academic_target,
        task_demands: Object.freeze(itemDemand(item, skillProfile)),
        practice_tags: skillProfile.practice_tags,
        genius_dimension_codes: skillProfile.genius_dimension_codes,
        observable_evidence: skillProfile.evidence,
        interpretation_boundary: "This item records practice and task-specific evidence only. It must not be used alone to label a child’s genius, ability, diagnosis, or potential.",
      }));
    });
  }
  return Object.freeze({ skill_id: skillId, academic_target: skillProfile.academic_target, question_count: questions.length, questions: Object.freeze(questions) });
}

function validateGrade4Profiles() {
  for (const entry of Object.values(GRADE4_SKILL_PROFILES)) {
    for (const code of entry.genius_dimension_codes) if (!GENIUS_DIMENSIONS[code]) return false;
    for (const tag of entry.practice_tags) if (!PRACTICE_TAGS[tag]) return false;
  }
  return true;
}

module.exports = Object.freeze({ QUESTION_BANKS, GRADE4_SKILL_PROFILES, buildGrade4QuestionOutline, validateGrade4Profiles });
