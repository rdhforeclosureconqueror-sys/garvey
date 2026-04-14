"use strict";

const ENGINE = "leadership";
const BANK_ID = "AUTHORED_BANK_1";
const SIGNAL_BY_CODE = Object.freeze({
  VD: "vision_activation",
  SD: "structure_execution",
  RI: "relational_attunement",
  IE: "influence_mobilization",
  AC: "adaptive_regulation",
});
const WEIGHT_BY_CLASS = Object.freeze({ ID: "identity", BH: "standard", SC: "scenario", ST: "stress", DS: "desired" });

function option(optionId, text, primary, secondary, questionClass) {
  return {
    option_id: optionId,
    text,
    primary_archetype: primary,
    secondary_archetype: secondary,
    weight_type: WEIGHT_BY_CLASS[questionClass],
    signal_type: SIGNAL_BY_CODE[primary],
  };
}

function question(displayOrder, questionClass, questionSubclass, prompt, options) {
  const n = String(displayOrder).padStart(2, "0");
  return {
    question_id: `Q${n}`,
    bank_id: BANK_ID,
    display_order: displayOrder,
    engine: ENGINE,
    question_class: questionClass,
    question_subclass: questionSubclass,
    prompt,
    reverse_pair_id: null,
    desired_pair_id: null,
    is_scored: true,
    is_active: true,
    options,
  };
}

module.exports = Object.freeze([
  question(1, "ID", "mission_orientation", "In leadership, what feels most natural to you at your best?", [
    option("A", "I orient people around a clear future and shared purpose.", "VD", "IE", "ID"),
    option("B", "I build systems that make execution repeatable and reliable.", "SD", "AC", "ID"),
    option("C", "I read people quickly and align trust before pushing pace.", "RI", "IE", "ID"),
    option("D", "I recalibrate quickly as conditions change without losing direction.", "AC", "VD", "ID"),
  ]),
  question(2, "BH", "execution_response", "When a new initiative starts, what do you usually do first?", [
    option("A", "I frame the mission so everyone knows why it matters.", "VD", "IE", "BH"),
    option("B", "I define roles, owners, and operating cadence.", "SD", "AC", "BH"),
    option("C", "I map stakeholder needs and likely resistance points.", "RI", "SD", "BH"),
    option("D", "I run a quick pilot and adapt from early signals.", "AC", "VD", "BH"),
  ]),
  question(3, "SC", "people_awareness", "A key teammate goes quiet during planning. What is your first move?", [
    option("A", "I reconnect the team to the mission and ask what feels unclear.", "VD", "RI", "SC"),
    option("B", "I clarify expectations and next steps to reduce ambiguity.", "SD", "RI", "SC"),
    option("C", "I check in one-on-one to understand what is not being said.", "RI", "AC", "SC"),
    option("D", "I adjust approach in real time based on their response.", "AC", "RI", "SC"),
  ]),
  question(4, "ST", "pressure_control", "Under pressure, what stress pattern appears first?", [
    option("A", "I push harder on urgency and long-term stakes.", "VD", "IE", "ST"),
    option("B", "I tighten process and control every detail.", "SD", "AC", "ST"),
    option("C", "I carry emotional load and delay hard calls.", "RI", "SD", "ST"),
    option("D", "I pivot rapidly and risk changing direction too often.", "AC", "VD", "ST"),
  ]),
  question(5, "BH", "influence_style", "What usually helps you mobilize people most effectively?", [
    option("A", "A compelling narrative that links effort to impact.", "VD", "IE", "BH"),
    option("B", "A clear system people can trust and execute.", "SD", "VD", "BH"),
    option("C", "Credibility built through listening and context awareness.", "RI", "IE", "BH"),
    option("D", "Calm adaptation that keeps momentum through uncertainty.", "AC", "SD", "BH"),
  ]),
  question(6, "ID", "influence_style", "Which leadership identity statement fits you best?", [
    option("A", "I am most effective when I set a direction others can believe in.", "VD", "IE", "ID"),
    option("B", "I am most effective when I create structure that scales.", "SD", "AC", "ID"),
    option("C", "I am most effective when I strengthen trust and alignment.", "RI", "VD", "ID"),
    option("D", "I am most effective when I steady teams through change.", "AC", "RI", "ID"),
  ]),
  question(7, "SC", "ambiguity_response", "A project scope shifts late. What do you do first?", [
    option("A", "Re-anchor the team on outcomes and strategic intent.", "VD", "AC", "SC"),
    option("B", "Re-baseline timeline, owners, and dependencies.", "SD", "AC", "SC"),
    option("C", "Surface concerns to protect trust before execution slips.", "RI", "SD", "SC"),
    option("D", "Run a fast decision cycle and adapt the plan.", "AC", "VD", "SC"),
  ]),
  question(8, "ST", "execution_response", "When timelines compress unexpectedly, how do you react?", [
    option("A", "I intensify focus on mission-critical outcomes.", "VD", "SD", "ST"),
    option("B", "I increase checkpoints and enforce process discipline.", "SD", "AC", "ST"),
    option("C", "I prioritize team load balancing and communication.", "RI", "AC", "ST"),
    option("D", "I reprioritize quickly and redeploy resources.", "AC", "SD", "ST"),
  ]),
  question(9, "BH", "mission_orientation", "In ordinary operating weeks, where does your leadership energy go?", [
    option("A", "Keeping people connected to the bigger mission.", "VD", "RI", "BH"),
    option("B", "Improving clarity, rhythm, and process reliability.", "SD", "AC", "BH"),
    option("C", "Maintaining trust, feedback, and team cohesion.", "RI", "SD", "BH"),
    option("D", "Scanning for changes and tuning direction early.", "AC", "VD", "BH"),
  ]),
  question(10, "SC", "influence_style", "You need cross-functional buy-in fast. What approach is most natural?", [
    option("A", "Lead with a strong case for strategic upside.", "IE", "VD", "SC"),
    option("B", "Lead with concrete plan detail and execution confidence.", "SD", "IE", "SC"),
    option("C", "Lead with shared concerns and relationship context.", "RI", "IE", "SC"),
    option("D", "Lead with adaptive options and risk tradeoffs.", "AC", "IE", "SC"),
  ]),
  question(11, "ID", "growth_edge", "What matters most to you when leadership is healthy?", [
    option("A", "Direction is meaningful and people feel activated.", "VD", "IE", "ID"),
    option("B", "Execution is dependable and standards are clear.", "SD", "VD", "ID"),
    option("C", "Trust is strong and accountability stays humane.", "RI", "SD", "ID"),
    option("D", "Change is managed with steadiness and composure.", "AC", "RI", "ID"),
  ]),
  question(12, "BH", "people_awareness", "When someone underperforms, what do you typically do first?", [
    option("A", "Reconnect their work to mission and expectations.", "VD", "SD", "BH"),
    option("B", "Clarify standards, metrics, and operating process.", "SD", "VD", "BH"),
    option("C", "Explore context and barriers through direct conversation.", "RI", "AC", "BH"),
    option("D", "Adjust role, support, or scope based on current reality.", "AC", "RI", "BH"),
  ]),
  question(13, "SC", "pressure_control", "After a tense team conflict, what feels most natural?", [
    option("A", "Refocus everyone on what we are building together.", "VD", "RI", "SC"),
    option("B", "Re-establish clear norms and working agreements.", "SD", "RI", "SC"),
    option("C", "Repair trust directly before pushing speed again.", "RI", "SD", "SC"),
    option("D", "Reset pacing and adapt coordination immediately.", "AC", "SD", "SC"),
  ]),
  question(14, "ST", "ambiguity_response", "When information is incomplete, stress pushes you to: ", [
    option("A", "Commit hard to a direction and rally momentum.", "VD", "IE", "ST"),
    option("B", "Create tighter rules to reduce variance.", "SD", "AC", "ST"),
    option("C", "Delay action until social alignment feels secure.", "RI", "AC", "ST"),
    option("D", "Keep changing the plan as new data appears.", "AC", "VD", "ST"),
  ]),
  question(15, "BH", "execution_response", "How do you usually show leadership commitment?", [
    option("A", "I keep purpose visible in daily decisions.", "VD", "SD", "BH"),
    option("B", "I build systems that survive beyond individual effort.", "SD", "VD", "BH"),
    option("C", "I protect trust while holding people accountable.", "RI", "SD", "BH"),
    option("D", "I stay steady while adjusting to new constraints.", "AC", "RI", "BH"),
  ]),
  question(16, "SC", "mission_orientation", "You are kicking off a turnaround. What do you prioritize first?", [
    option("A", "Define a believable future state and path.", "VD", "AC", "SC"),
    option("B", "Stabilize operations with immediate process control.", "SD", "AC", "SC"),
    option("C", "Rebuild trust and psychological safety quickly.", "RI", "VD", "SC"),
    option("D", "Create rapid feedback loops and iterate.", "AC", "SD", "SC"),
  ]),
  question(17, "ST", "pressure_control", "When trust in your leadership feels shaky, what is your first reaction?", [
    option("A", "I intensify communication around intent and direction.", "IE", "VD", "ST"),
    option("B", "I double down on control and certainty.", "SD", "AC", "ST"),
    option("C", "I seek direct feedback and relational repair.", "RI", "IE", "ST"),
    option("D", "I adapt quickly and test what restores traction.", "AC", "IE", "ST"),
  ]),
  question(18, "ID", "growth_edge", "Which statement sounds most like you?", [
    option("A", "I need leadership to feel directional and future-facing.", "VD", "IE", "ID"),
    option("B", "I need leadership to feel ordered and dependable.", "SD", "AC", "ID"),
    option("C", "I need leadership to feel relationally intelligent.", "RI", "IE", "ID"),
    option("D", "I need leadership to feel adaptive under change.", "AC", "VD", "ID"),
  ]),
  question(19, "SC", "influence_style", "A senior stakeholder challenges your plan publicly. What do you do first?", [
    option("A", "Reframe the strategic case and desired outcome.", "IE", "VD", "SC"),
    option("B", "Clarify assumptions, sequence, and execution math.", "SD", "IE", "SC"),
    option("C", "Acknowledge concerns and align on shared intent.", "RI", "IE", "SC"),
    option("D", "Offer adaptive pathways and decision checkpoints.", "AC", "IE", "SC"),
  ]),
  question(20, "ST", "ambiguity_response", "When you feel leadership drag, you are most likely to: ", [
    option("A", "Push harder on urgency and directional clarity.", "VD", "SD", "ST"),
    option("B", "Add process controls to regain predictability.", "SD", "VD", "ST"),
    option("C", "Over-index on harmony to avoid rupture.", "RI", "AC", "ST"),
    option("D", "Shift tactics repeatedly to find momentum.", "AC", "VD", "ST"),
  ]),
  question(21, "BH", "people_awareness", "What helps you trust a team most deeply?", [
    option("A", "Shared conviction in mission and priorities.", "VD", "RI", "BH"),
    option("B", "Reliable execution and clear ownership.", "SD", "AC", "BH"),
    option("C", "Direct communication and strong interpersonal trust.", "RI", "SD", "BH"),
    option("D", "Responsiveness when conditions change.", "AC", "VD", "BH"),
  ]),
  question(22, "SC", "execution_response", "A reliable process stops working in a new context. What is your move?", [
    option("A", "Re-center on mission outcomes before redesigning.", "VD", "AC", "SC"),
    option("B", "Rebuild the process with tighter diagnostics.", "SD", "AC", "SC"),
    option("C", "Gather frontline insight before locking changes.", "RI", "AC", "SC"),
    option("D", "Run adaptive experiments and keep what works.", "AC", "SD", "SC"),
  ]),
  question(23, "BH", "influence_style", "When you need momentum, what do you usually do?", [
    option("A", "Use story and direction to energize commitment.", "IE", "VD", "BH"),
    option("B", "Use structure and milestones to focus execution.", "SD", "IE", "BH"),
    option("C", "Use trust-based dialogue to align ownership.", "RI", "IE", "BH"),
    option("D", "Use adaptive pacing to keep progress moving.", "AC", "IE", "BH"),
  ]),
  question(24, "DS", "growth_edge", "If you could strengthen one leadership habit now, what would it be?", [
    option("A", "Translate vision into consistent execution signals.", "VD", "SD", "DS"),
    option("B", "Create structure without reducing flexibility.", "SD", "AC", "DS"),
    option("C", "Hold harder accountability while preserving trust.", "RI", "SD", "DS"),
    option("D", "Adapt quickly while keeping direction coherent.", "AC", "VD", "DS"),
  ]),
  question(25, "DS", "growth_edge", "What growth move matters most for your leadership next?", [
    option("A", "Lead with vision while listening more deeply.", "VD", "RI", "DS"),
    option("B", "Systemize priorities without over-controlling.", "SD", "RI", "DS"),
    option("C", "Communicate difficult truths earlier and cleaner.", "RI", "IE", "DS"),
    option("D", "Pair adaptability with steadier execution rhythms.", "AC", "SD", "DS"),
  ]),
]);
