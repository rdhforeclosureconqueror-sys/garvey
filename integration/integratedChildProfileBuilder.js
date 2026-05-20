"use strict";
const { createBaseIntegratedProfile } = require("./integrationContracts");
const { buildDevelopmentPatternEngine } = require("./developmentPatternEngine");
function buildIntegratedChildProfile({ childId, childProfile = null, gatesData = null, identityData = null, tdeData = null, sourceProvenance = null, sourceAvailability = null } = {}) {
  const profile = createBaseIntegratedProfile({ childId });
  if (childProfile) profile.child_profile = { child_id: childProfile.child_id || childId || null, child_name: childProfile.child_name || null, child_age_band: childProfile.child_age_band || null, child_grade_band: childProfile.child_grade_band || null };
  if (gatesData) { profile.gates_profile = gatesData; profile.source_presence.gates = true; }
  if (identityData) { profile.identity_profile = identityData; profile.source_presence.identity = true; }
  if (tdeData) { profile.tde_profile = tdeData; profile.source_presence.tde = true; }
  profile.source_provenance = sourceProvenance || profile.source_provenance;
  profile.source_availability = sourceAvailability || profile.source_availability;
  if (!Object.values(profile.source_presence).some(Boolean)) return profile;
  if (profile.source_presence.gates) { const growthGate = gatesData?.gates_profile?.growth_gate?.name || gatesData?.growth_gate?.name || null; if (growthGate) profile.stabilizing_gates.push(`Support ${growthGate} through consistent family practice.`); }
  if (profile.source_presence.identity) { const tendency = String(identityData?.primary_tendency || identityData?.primary_archetype || "").toLowerCase(); if (tendency.includes("creator")) profile.developmental_supports.push("Emerging creator tendencies may stabilize with Attention and Discipline practices."); if (tendency.includes("explorer")) profile.developmental_supports.push("Emerging explorer tendencies may stabilize with Choice and Community practices."); if (tendency.includes("healer") || tendency.includes("sensitive")) profile.developmental_supports.push("Emotional sensitivity can be supported with Emotion and Repair practices."); }
  if (profile.source_presence.tde) { const traits = Array.isArray(tdeData?.trait_targets) ? tdeData.trait_targets : []; profile.emerging_strengths.push(...traits.slice(0, 3).map((t) => `Emerging strength signal: ${String(t)}`)); }
  profile.habit_focuses.push("Use brief daily rhythms that reinforce developmental supports.");
  profile.integration_signals.push("Look for steadier recovery after challenge and more consistent follow-through.");
  profile.family_practices.push("Choose one shared weekly family practice and review what felt supportive.");
  profile.parent_mirror_prompts.push("What support helped this child feel more grounded this week?");
  profile.integrated_summary = "This integrated profile combines emerging tendencies with developmental supports while keeping each source system independent.";
  profile.development_patterns = buildDevelopmentPatternEngine({
    gatesProfile: gatesData?.gates_profile || gatesData || null,
    practiceProgress: gatesData?.practice_progress || [],
    habitSignals: gatesData?.habit_signals || [],
    integratedIdentityPreview: profile,
    parentCheckins: gatesData?.parent_checkins || [],
  });
  return profile;
}
module.exports = { buildIntegratedChildProfile };
