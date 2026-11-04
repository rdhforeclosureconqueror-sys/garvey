"use strict";

const { createAcademicEvidencePlan, PROJECT_TEMPLATES } = require("./geniusLearningLanes");

// These bindings preserve the academic objective. Primary codes describe what
// the lesson regularly asks a child to practice. Invitation codes are optional
// Garvey moves—not requirements to perform every Genius area on every question.
const DEFINITIONS = Object.freeze({
  math_number_operations: Object.freeze({ primary_codes: ["SR", "RS", "FB"], invitation_codes: ["PS", "CQ"] }),
  math_patterns: Object.freeze({ primary_codes: ["SR", "RS"], invitation_codes: ["CQ", "CR"] }),
  math_fractions: Object.freeze({ primary_codes: ["SR", "RS", "FB"], invitation_codes: ["CQ", "CR"] }),
  math_measurement_geometry: Object.freeze({ primary_codes: ["SR", "RS", "FB"], invitation_codes: ["CR", "DE"] }),
  english_foundations: Object.freeze({ primary_codes: ["SR", "FB"], invitation_codes: ["PS", "CQ"] }),
  english_vocabulary: Object.freeze({ primary_codes: ["SR", "RS", "CQ"], invitation_codes: ["CR"] }),
  english_comprehension: Object.freeze({ primary_codes: ["SR", "RS"], invitation_codes: ["CQ", "CR"] }),
  english_writing: Object.freeze({ primary_codes: ["SR", "RS", "CR", "FB"], invitation_codes: ["CQ", "DE", "PS"] }),
  english_language: Object.freeze({ primary_codes: ["SR", "RS", "FB"], invitation_codes: ["CR", "PS"] }),
});

const GRADE5_LESSON_DEFINITIONS = Object.freeze({
  G5M_NBT_001: "math_number_operations",
  G5M_NBT_002: "math_number_operations",
  G5M_NBT_003: "math_number_operations",
  G5M_OA_001: "math_patterns",
  G5M_FR_001: "math_fractions",
  G5M_FR_002: "math_fractions",
  G5M_FR_003: "math_fractions",
  G5M_MD_001: "math_measurement_geometry",
  G5M_GM_001: "math_measurement_geometry",
  G5M_GM_002: "math_measurement_geometry",
  G5E_RF_001: "english_foundations",
  G5E_FL_001: "english_foundations",
  G5E_VOC_001: "english_vocabulary",
  G5E_RC_001: "english_comprehension",
  G5E_RC_002: "english_comprehension",
  G5E_RC_003: "english_comprehension",
  G5E_WR_001: "english_writing",
  G5E_WR_002: "english_writing",
  G5E_WR_003: "english_writing",
  G5E_LANG_001: "english_language",
});

const GRADE5_LEARNING_LANE_PLANS = Object.freeze(Object.fromEntries(
  Object.entries(GRADE5_LESSON_DEFINITIONS).map(([contentId, definitionId]) => {
    const definition = DEFINITIONS[definitionId];
    return [contentId, createAcademicEvidencePlan({
      content_id: contentId,
      primary_codes: definition.primary_codes,
      invitation_codes: definition.invitation_codes,
    })];
  }),
));

function getGrade5LearningLanePlan(contentId) {
  return GRADE5_LEARNING_LANE_PLANS[String(contentId || "").trim().toUpperCase()] || null;
}

function getProjectTemplate(projectId) {
  return PROJECT_TEMPLATES[String(projectId || "").trim()] || null;
}

module.exports = Object.freeze({
  DEFINITIONS,
  GRADE5_LESSON_DEFINITIONS,
  GRADE5_LEARNING_LANE_PLANS,
  getGrade5LearningLanePlan,
  getProjectTemplate,
});
