"use strict";

const DEFAULT_PARENT_REFLECTIONS = [
  "Children often mirror emotional pacing.",
  "Consistency grows more easily when modeled calmly.",
  "Repair after stress teaches safety.",
];

function toList(value) {
  return Array.isArray(value) ? value.map((x) => String(x || "").trim()).filter(Boolean) : [];
}

function buildDevelopmentPatternEngine({ gatesProfile = null, practiceProgress = [], habitSignals = [], integratedIdentityPreview = null, parentCheckins = [] } = {}) {
  const progress = Array.isArray(practiceProgress) ? practiceProgress : [];
  const integratedCount = progress.filter((p) => String(p?.status || "") === "integrated").length;
  const practicingCount = progress.filter((p) => String(p?.status || "") === "practicing").length;
  const meanProgress = progress.length ? Math.round(progress.reduce((sum, p) => sum + Number(p?.progress_percent || 0), 0) / progress.length) : 0;

  const topHabits = (Array.isArray(habitSignals) ? habitSignals : []).slice(0, 2);
  const allIntegrations = topHabits.flatMap((h) => toList(h.integration_signals));
  const allCorrections = topHabits.flatMap((h) => toList(h.self_correction_signals));
  const familySignals = topHabits.flatMap((h) => toList(h.family_practices));

  const developmental_momentum = integratedCount >= 2 || meanProgress >= 55
    ? "Developmental momentum appears to be strengthening through repeated family practice."
    : practicingCount > 0 || meanProgress >= 20
      ? "Developmental momentum is emerging as small practices are repeated."
      : "Developmental momentum can grow through gentle, repeatable daily rhythms.";

  const growthGateName = gatesProfile?.growth_gate?.name || "current growth gate";
  const emerging_patterns = [
    `Responsibility rituals around ${growthGateName} are becoming more internalized.`,
    allIntegrations[0] || "Integration signals are appearing in short, meaningful moments.",
  ];

  const self_correction_patterns = [
    allCorrections[0] || "Self-correction is emerging more consistently after hard moments.",
    "Repair behaviors appear faster after conflict when prompts remain calm.",
  ];

  const family_consistency_patterns = [
    familySignals[0] || "Family practice consistency is becoming easier to sustain across the week.",
    "Shared routines appear steadier when expectations remain simple and warm.",
  ];

  const integration_patterns = [
    allIntegrations[1] || "Attention recovery is becoming faster after reminders.",
    "Emotional awareness signals are emerging earlier before escalation.",
  ];

  const parent_growth_reflections = DEFAULT_PARENT_REFLECTIONS;
  const suggested_focus_shift = meanProgress >= 60
    ? "Consider shifting from reminders toward child-led reflection and contribution."
    : "Keep the focus on one small repeatable routine and notice recovery moments.";

  const identitySource = integratedIdentityPreview?.integrated_summary || "Identity development appears to be forming through repeated choices, repair, and contribution.";
  const identity_emergence_summary = identitySource;

  return {
    developmental_momentum,
    emerging_patterns,
    self_correction_patterns,
    family_consistency_patterns,
    integration_patterns,
    parent_growth_reflections,
    suggested_focus_shift,
    identity_emergence_summary,
  };
}

module.exports = { buildDevelopmentPatternEngine };
