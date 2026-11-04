"use strict";

// Garvey's learning-lanes model is an instructional observation model.
// It records what a child had an opportunity to practice and what they did
// during that opportunity. It does not diagnose, rank innate ability, or
// predict a child's future potential.

const { GENIUS_DIMENSIONS } = require("./curriculumGeniusMap");

const LEARNING_LANES = Object.freeze({
  ACADEMIC: "academic_practice",
  PROJECT: "personal_project_practice",
});

const EVIDENCE_LEVELS = Object.freeze({
  NOT_YET_ASSESSED: "not_yet_assessed",
  MORE_EVIDENCE_NEEDED: "more_evidence_needed",
  EMERGING: "emerging",
  CLEARLY_SHOWING: "clearly_showing",
  STRONGLY_SHOWING: "strongly_showing",
});

const EVIDENCE_LEVEL_COPY = Object.freeze({
  [EVIDENCE_LEVELS.NOT_YET_ASSESSED]: "Not yet assessed",
  [EVIDENCE_LEVELS.MORE_EVIDENCE_NEEDED]: "More opportunities to show this",
  [EVIDENCE_LEVELS.EMERGING]: "Beginning to show",
  [EVIDENCE_LEVELS.CLEARLY_SHOWING]: "Clearly showing",
  [EVIDENCE_LEVELS.STRONGLY_SHOWING]: "Strongly showing across activities",
});

const OBSERVATION_TYPES = Object.freeze({
  STRATEGY_EXPLANATION: "strategy_explanation",
  ALTERNATE_METHOD: "alternate_method",
  QUESTION_ASKED: "question_asked",
  CHALLENGE_CHOSEN: "challenge_chosen",
  HINT_USED: "hint_used",
  CORRECTION_USED: "correction_used",
  RETRY_AFTER_SETBACK: "retry_after_setback",
  SELF_REFLECTION: "self_reflection",
  PROJECT_CONTEXT_CHOSEN: "project_context_chosen",
  IDEA_CREATED: "idea_created",
  PROTOTYPE_TESTED: "prototype_tested",
  REVISION_MADE: "revision_made",
});

const ACADEMIC_ACTIVATION_MOVES = Object.freeze({
  SR: Object.freeze({
    child_prompt: "Choose your next step, then check your work before you move on.",
    observation_types: ["challenge_chosen", "self_reflection"],
  }),
  CQ: Object.freeze({
    child_prompt: "What do you notice or wonder? Ask one question this lesson brings up.",
    observation_types: ["question_asked", "challenge_chosen"],
  }),
  CR: Object.freeze({
    child_prompt: "Can you show this idea another way or make your own example?",
    observation_types: ["alternate_method", "idea_created"],
  }),
  RS: Object.freeze({
    child_prompt: "What pattern, rule, or connection helps this make sense?",
    observation_types: ["strategy_explanation", "alternate_method"],
  }),
  PS: Object.freeze({
    child_prompt: "If you get stuck, name one next move and try it.",
    observation_types: ["retry_after_setback", "self_reflection"],
  }),
  FB: Object.freeze({
    child_prompt: "Use the feedback, then explain what you changed.",
    observation_types: ["correction_used", "strategy_explanation"],
  }),
  DE: Object.freeze({
    child_prompt: "Where could this skill help with something you care about?",
    observation_types: ["project_context_chosen", "self_reflection"],
  }),
});

const PROJECT_TEMPLATES = Object.freeze({
  helper_robot_for_seniors: Object.freeze({
    project_id: "helper_robot_for_seniors",
    title: "Helper Robot for Seniors",
    summary: "Design a helpful home robot that supports independence with an everyday task.",
    child_owned_question: "What daily task could my robot make safer or easier?",
    suggested_steps: Object.freeze([
      "Notice a problem worth solving.",
      "Sketch an idea and name what it needs to do.",
      "Choose one skill to learn for the design.",
      "Build or model a first version.",
      "Test it, notice what happened, and improve it.",
    ]),
    genius_dimension_codes: Object.freeze(["DE", "CQ", "CR", "RS", "SR", "PS", "FB"]),
    evidence_opportunities: Object.freeze([
      Object.freeze({ code: "DE", observation_type: "project_context_chosen", prompt: "Why does this problem matter to you?" }),
      Object.freeze({ code: "CQ", observation_type: "question_asked", prompt: "What do you need to find out before building?" }),
      Object.freeze({ code: "CR", observation_type: "idea_created", prompt: "Sketch two possible ways your robot could help." }),
      Object.freeze({ code: "RS", observation_type: "strategy_explanation", prompt: "How will the arm, wheels, or sensors work together?" }),
      Object.freeze({ code: "SR", observation_type: "self_reflection", prompt: "What is your plan for the next small step?" }),
      Object.freeze({ code: "PS", observation_type: "retry_after_setback", prompt: "What will you try when the first idea does not work?" }),
      Object.freeze({ code: "FB", observation_type: "revision_made", prompt: "What did testing teach you to change?" }),
    ]),
  }),
});

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function uniqueKnownCodes(codes) {
  return [...new Set((codes || []).map(normalizeCode).filter((code) => GENIUS_DIMENSIONS[code]))];
}

function createAcademicEvidencePlan({ content_id, primary_codes = [], invitation_codes = [] } = {}) {
  const primary = uniqueKnownCodes(primary_codes);
  const invitations = uniqueKnownCodes(invitation_codes).filter((code) => !primary.includes(code));
  return Object.freeze({
    lane: LEARNING_LANES.ACADEMIC,
    content_id: String(content_id || "").trim(),
    primary_genius_codes: Object.freeze(primary),
    invitation_genius_codes: Object.freeze(invitations),
    activation_moves: Object.freeze(invitations.map((code) => Object.freeze({
      genius_code: code,
      ...ACADEMIC_ACTIVATION_MOVES[code],
    }))),
  });
}

function classifyEvidence(events = []) {
  const independentEvents = events.filter((event) => event && event.independence === "independent");
  const contexts = new Set(events.map((event) => event && event.context_id).filter(Boolean));
  const observationTypes = new Set(events.map((event) => event && event.observation_type).filter(Boolean));

  if (!events.length) return EVIDENCE_LEVELS.NOT_YET_ASSESSED;
  if (events.length === 1) return EVIDENCE_LEVELS.MORE_EVIDENCE_NEEDED;
  if (independentEvents.length >= 3 && contexts.size >= 2 && observationTypes.size >= 2) return EVIDENCE_LEVELS.STRONGLY_SHOWING;
  if (independentEvents.length >= 2 && contexts.size >= 2) return EVIDENCE_LEVELS.CLEARLY_SHOWING;
  return EVIDENCE_LEVELS.EMERGING;
}

function buildDimensionSnapshot(code, events = []) {
  const geniusCode = normalizeCode(code);
  if (!GENIUS_DIMENSIONS[geniusCode]) return null;
  const level = classifyEvidence(events);
  return Object.freeze({
    genius_code: geniusCode,
    label: GENIUS_DIMENSIONS[geniusCode].parent_label,
    evidence_level: level,
    evidence_level_copy: EVIDENCE_LEVEL_COPY[level],
    event_count: events.length,
    context_count: new Set(events.map((event) => event && event.context_id).filter(Boolean)).size,
    interpretation_boundary: "This is current Garvey evidence from specific learning opportunities, not a fixed trait or ability score.",
  });
}

module.exports = Object.freeze({
  LEARNING_LANES,
  EVIDENCE_LEVELS,
  EVIDENCE_LEVEL_COPY,
  OBSERVATION_TYPES,
  ACADEMIC_ACTIVATION_MOVES,
  PROJECT_TEMPLATES,
  createAcademicEvidencePlan,
  classifyEvidence,
  buildDimensionSnapshot,
});
