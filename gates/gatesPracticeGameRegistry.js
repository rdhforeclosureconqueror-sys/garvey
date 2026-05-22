"use strict";

const GATES_PRACTICE_GAME_DISCLAIMER = "These games are optional developmental practices. They are not tests, grades, or diagnoses.";

const GATES_PRACTICE_GAME_REGISTRY = [
  {
    game_id: "brain-game-suite-rhythm-race",
    title: "Rhythm Race",
    suite: "Brain Game Suite",
    supported_gates: ["attention", "body", "discipline"],
    developmental_capacities: ["sustained attention", "timing control", "self-regulation under pace"],
    suggested_age_range: "6-12 years",
    recommended_duration: "6-10 minutes",
    safety_notes: ["Allow short breaks between rounds.", "Use low-to-moderate audio volume.", "Stop if the child appears frustrated or fatigued."],
    observation_signals: ["Returns attention to the beat after a miss.", "Keeps body movements coordinated with rhythm changes.", "Uses calm self-talk after mistakes."],
    parent_reflection_prompts: ["What helped your child return to focus when rhythm changed?", "Where did you see effort and recovery, not perfection?"]
  },
  {
    game_id: "brain-game-suite-visual-memory",
    title: "Visual Memory",
    suite: "Brain Game Suite",
    supported_gates: ["attention", "truth", "creation"],
    developmental_capacities: ["working memory", "visual recall", "pattern tracking"],
    suggested_age_range: "6-12 years",
    recommended_duration: "8-12 minutes",
    safety_notes: ["Keep sessions brief to avoid cognitive overload.", "Invite water or stretch breaks as needed.", "Use encouragement language focused on strategy."],
    observation_signals: ["Describes a memory strategy aloud.", "Recalls more items after pausing to plan.", "Stays engaged after an incorrect attempt."],
    parent_reflection_prompts: ["What memory strategy seemed to help today?", "How did your child respond when recall was hard?"]
  },
  {
    game_id: "brain-game-suite-picture-puzzle",
    title: "Picture Puzzle",
    suite: "Brain Game Suite",
    supported_gates: ["choice", "discipline", "creation"],
    developmental_capacities: ["problem solving", "planning", "visual-spatial organization"],
    suggested_age_range: "6-12 years",
    recommended_duration: "10-15 minutes",
    safety_notes: ["Offer collaborative help before frustration escalates.", "Use seated, comfortable posture for longer puzzles.", "End with a positive debrief regardless of completion."],
    observation_signals: ["Tries multiple approaches before asking for help.", "Breaks puzzle into manageable steps.", "Persists after a failed fit."],
    parent_reflection_prompts: ["When did your child shift strategies?", "What did persistence look like in this activity?"]
  },
  {
    game_id: "brick-burst",
    title: "Brick Burst",
    supported_gates: ["attention", "emotion", "discipline"],
    developmental_capacities: ["response inhibition", "focus switching", "frustration recovery"],
    suggested_age_range: "7-13 years",
    recommended_duration: "8-12 minutes",
    safety_notes: ["Encourage a calm pause between rounds.", "Avoid extended play sessions.", "Use non-competitive language with siblings or peers."],
    observation_signals: ["Resets calmly after missing a target.", "Adjusts pace when game speed increases.", "Keeps focus through brief distractions."],
    parent_reflection_prompts: ["How did your child handle fast changes in play?", "What helped them recover after a mistake?"]
  },
  {
    game_id: "neurospark-freeze-runner",
    title: "Freeze Runner",
    suite: "NeuroSpark Kids Lab",
    supported_gates: ["attention", "body", "discipline"],
    developmental_capacities: ["inhibitory control", "motor regulation", "start-stop control"],
    suggested_age_range: "6-11 years",
    recommended_duration: "5-8 minutes",
    safety_notes: ["Provide clear floor space if movement is involved.", "Supervise for safe movement boundaries.", "Pause immediately if dysregulation increases."],
    observation_signals: ["Stops body movement quickly on cue.", "Waits for restart signal without rushing.", "Uses breathing or pause strategies independently."],
    parent_reflection_prompts: ["What helped your child pause before acting?", "Where did you notice better body control today?"]
  },
  {
    game_id: "neurospark-distraction-defender",
    title: "Distraction Defender",
    suite: "NeuroSpark Kids Lab",
    supported_gates: ["attention", "truth", "discipline"],
    developmental_capacities: ["selective attention", "distractor filtering", "task persistence"],
    suggested_age_range: "7-13 years",
    recommended_duration: "7-10 minutes",
    safety_notes: ["Lower background noise when possible.", "Reduce visual clutter in the play space.", "Frame mistakes as data for next strategy."],
    observation_signals: ["Returns to target after distraction.", "Names what distracted them and refocuses.", "Maintains effort through challenging rounds."],
    parent_reflection_prompts: ["What distraction did your child notice and move past?", "What refocus strategy was most effective?"]
  },
  {
    game_id: "neurospark-plasma-hold",
    title: "Plasma Hold",
    suite: "NeuroSpark Kids Lab",
    supported_gates: ["body", "discipline", "legacy"],
    developmental_capacities: ["steady control", "impulse management", "endurance in focused effort"],
    suggested_age_range: "8-14 years",
    recommended_duration: "6-9 minutes",
    safety_notes: ["Use ergonomic hand position.", "Take a break if hands or wrists fatigue.", "Encourage gentle effort rather than force."],
    observation_signals: ["Maintains steady control over time.", "Recovers composure after losing hold.", "Shows patient pacing rather than rushing."],
    parent_reflection_prompts: ["How did your child manage patience during steady-hold moments?", "What signs of self-control stood out?"]
  },
  {
    game_id: "neurospark-calm-reactor",
    title: "Calm Reactor",
    suite: "NeuroSpark Kids Lab",
    supported_gates: ["emotion", "choice", "repair"],
    developmental_capacities: ["emotional regulation", "pause-and-choose response", "recovery after activation"],
    suggested_age_range: "6-12 years",
    recommended_duration: "6-10 minutes",
    safety_notes: ["Use calm coaching tone throughout play.", "Invite a breathing pause between levels.", "Stop if signs of overwhelm increase."],
    observation_signals: ["Uses a pause before reacting.", "Names feeling state and re-engages calmly.", "Recovers after a high-intensity moment."],
    parent_reflection_prompts: ["When did your child choose calm over speed?", "What helped your child recover emotionally during play?"]
  },
  {
    game_id: "neurospark-switch-matrix",
    title: "Switch Matrix",
    suite: "NeuroSpark Kids Lab",
    supported_gates: ["choice", "truth", "creation"],
    developmental_capacities: ["cognitive flexibility", "rule switching", "adaptive problem solving"],
    suggested_age_range: "8-14 years",
    recommended_duration: "8-12 minutes",
    safety_notes: ["Explain rule changes clearly before each round.", "Allow short decompression breaks.", "Normalize retrying after confusion."],
    observation_signals: ["Adapts when rules change.", "Asks clarifying questions before acting.", "Improves accuracy after an early mismatch."],
    parent_reflection_prompts: ["How did your child handle unexpected rule changes?", "What did adaptability look like today?"]
  }
];

function getPracticeGamesByGate(gateKey) {
  const normalized = String(gateKey || "").trim().toLowerCase();
  if (!normalized) return [];
  return GATES_PRACTICE_GAME_REGISTRY.filter((game) => game.supported_gates.includes(normalized));
}

module.exports = {
  GATES_PRACTICE_GAME_DISCLAIMER,
  GATES_PRACTICE_GAME_REGISTRY,
  getPracticeGamesByGate
};
