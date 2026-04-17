"use strict";

const ANSWER_SCALE = Object.freeze([
  Object.freeze({ value: 1, label: "Rarely" }),
  Object.freeze({ value: 2, label: "Sometimes" }),
  Object.freeze({ value: 3, label: "Often" }),
  Object.freeze({ value: 4, label: "Very Often" }),
]);

function makeQuestion(id, category, prompt) {
  return Object.freeze({
    id,
    category,
    prompt,
    answers: ANSWER_SCALE,
  });
}

const YOUTH_QUESTION_BANK = Object.freeze([
  makeQuestion("Q1", "focus", "Have you seen your child return to a task after a distraction without repeated reminders?"),
  makeQuestion("Q2", "focus", "When instructions include multiple steps, does your child stay on track through completion?"),
  makeQuestion("Q3", "focus", "In homework or practice time, does your child maintain attention even when tasks feel repetitive?"),
  makeQuestion("Q4", "focus", "When your child starts a goal, do they finish before switching to something else?"),
  makeQuestion("Q5", "focus", "During activities with peers, does your child stay focused on the shared objective?"),

  makeQuestion("Q6", "emotional_regulation", "When frustrated, does your child use calming strategies before reacting?"),
  makeQuestion("Q7", "emotional_regulation", "After disappointment, does your child recover and re-engage within a reasonable time?"),
  makeQuestion("Q8", "emotional_regulation", "In stressful moments, does your child ask for help instead of shutting down?"),
  makeQuestion("Q9", "emotional_regulation", "When plans change unexpectedly, does your child adapt without a prolonged emotional spiral?"),
  makeQuestion("Q10", "emotional_regulation", "If corrected by an adult, does your child respond without escalating emotionally?"),

  makeQuestion("Q11", "social", "Does your child listen to others before responding in group situations?"),
  makeQuestion("Q12", "social", "When disagreement happens, does your child attempt respectful problem-solving?"),
  makeQuestion("Q13", "social", "Does your child notice how their words affect others and adjust when needed?"),
  makeQuestion("Q14", "social", "In team activities, does your child contribute while allowing others space to contribute too?"),
  makeQuestion("Q15", "social", "Have you observed your child repairing relationships after conflict?"),

  makeQuestion("Q16", "discipline", "Does your child follow through on responsibilities even when no one is watching?"),
  makeQuestion("Q17", "discipline", "When a routine is established, does your child keep it with minimal prompting?"),
  makeQuestion("Q18", "discipline", "After making a mistake, does your child return to practice instead of giving up?"),
  makeQuestion("Q19", "discipline", "Does your child prepare for school, sports, or activities in advance?"),
  makeQuestion("Q20", "discipline", "When facing a hard task, does your child stay committed until a clear stopping point?"),

  makeQuestion("Q21", "confidence", "Does your child attempt challenging work even when success is uncertain?"),
  makeQuestion("Q22", "confidence", "When your child has an idea, do they share it without excessive hesitation?"),
  makeQuestion("Q23", "confidence", "After setbacks, does your child believe improvement is possible with effort?"),
  makeQuestion("Q24", "confidence", "In new environments, does your child engage without needing long reassurance?"),
  makeQuestion("Q25", "confidence", "Does your child advocate for their needs respectfully with adults and peers?"),
]);

module.exports = {
  YOUTH_QUESTION_BANK,
  YOUTH_QUESTION_CATEGORIES: Object.freeze(["focus", "emotional_regulation", "social", "discipline", "confidence"]),
};
