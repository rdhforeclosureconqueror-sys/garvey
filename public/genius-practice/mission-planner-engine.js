(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.GarveyMissionPlanner = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Three deterministic, progressively varied sorting missions.
  // This is task-specific practice, not a clinical test of executive function.
  const ITEMS = Object.freeze([
    Object.freeze({ id: "a", label: "Two supplies", quantity: 2 }),
    Object.freeze({ id: "b", label: "Five supplies", quantity: 5 }),
    Object.freeze({ id: "c", label: "Eight supplies", quantity: 8 }),
  ]);
  const MISSIONS = Object.freeze([
    Object.freeze({ id: "small-to-large", title: "Plan the delivery",
      rule: "Choose the deliveries from the FEWEST supplies to the MOST supplies.",
      order: Object.freeze(["a", "b", "c"]), skill: "planning" }),
    Object.freeze({ id: "reverse-route", title: "The rule has changed!",
      rule: "New plan: deliver from the MOST supplies to the FEWEST supplies.",
      order: Object.freeze(["c", "b", "a"]), skill: "rule_switching" }),
    Object.freeze({ id: "odd-first", title: "Try a new route",
      rule: "Deliver ODD numbers first, then EVEN numbers. For ties, go from fewest to most.",
      order: Object.freeze(["b", "a", "c"]), skill: "rule_switching" }),
  ]);

  function createState() {
    return { missionIndex: 0, selected: [], attempts: 0, revisions: 0,
      completedMissions: [], reflection: null };
  }

  function currentMission(state) {
    return MISSIONS[state.missionIndex] || null;
  }

  function choose(state, id) {
    if (!currentMission(state) || !ITEMS.some(item => item.id === id) ||
        state.selected.includes(id) || state.selected.length >= ITEMS.length) return state;
    return { ...state, selected: [...state.selected, id] };
  }

  function undo(state) {
    if (!currentMission(state) || !state.selected.length) return state;
    return { ...state, selected: state.selected.slice(0, -1), revisions: state.revisions + 1 };
  }

  function check(state) {
    const mission = currentMission(state);
    if (!mission || state.selected.length !== ITEMS.length) return { state, outcome: "incomplete" };
    const attempts = state.attempts + 1;
    const correct = state.selected.every((id, i) => id === mission.order[i]);
    if (!correct) {
      return { state: { ...state, attempts, revisions: state.revisions + 1, selected: [] },
        outcome: "retry" };
    }
    const completedMissions = [...state.completedMissions, {
      id: mission.id, skill: mission.skill, attemptsOnMission: attempts -
        state.completedMissions.reduce((sum, entry) => sum + entry.attemptsOnMission, 0),
    }];
    return { state: { ...state, missionIndex: state.missionIndex + 1,
      selected: [], attempts, completedMissions }, outcome: "complete" };
  }

  function reflect(state, answer) {
    if (currentMission(state) || !["read_rule", "planned_first", "tried_again", "another_strategy"].includes(answer)) return state;
    return { ...state, reflection: answer };
  }

  function snapshot(state) {
    return {
      done: !currentMission(state),
      mission_number: Math.min(state.missionIndex + 1, MISSIONS.length),
      missions_completed: state.completedMissions.length,
      attempts: state.attempts,
      revisions: state.revisions,
      reflection: state.reflection,
      // These observations describe the game session only.
      practice_tags: ["sequencing", "rule_switching", "self_reflection"],
      genius_dimension_codes: ["SR", "RS", "PS", "FB"],
    };
  }

  return Object.freeze({ ITEMS, MISSIONS, createState, currentMission, choose,
    undo, check, reflect, snapshot });
});
