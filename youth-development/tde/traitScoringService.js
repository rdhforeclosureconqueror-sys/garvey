"use strict";

const { CALIBRATION_VARIABLES, clamp01 } = require("./constants");
const { TDE_TRAIT_MAPPING_CONTRACTS } = require("./traitMappingContracts");

function scoreTraitsFromSignals(normalizedSignals = []) {
  const traitResults = [];
  const missingContracts = [];

  for (const [traitCode, contract] of Object.entries(TDE_TRAIT_MAPPING_CONTRACTS.traits)) {
    if (!contract) {
      missingContracts.push({ trait_code: traitCode, issue: "missing_trait_contract" });
      continue;
    }

    const allowedSignals = normalizedSignals.filter((signal) => {
      if (signal.trait_code && signal.trait_code !== traitCode) return false;
      if (!contract.allowed_source_types.includes(signal.source_type)) return false;
      return contract.required_signal_types.includes(signal.signal_type)
        || contract.optional_signal_types.includes(signal.signal_type);
    });

    const sourceTypes = new Set(allowedSignals.map((signal) => signal.source_type));
    const presentSignalTypes = new Set(allowedSignals.map((signal) => signal.signal_type));
    const requiredMissing = contract.required_signal_types.filter((requiredType) => !presentSignalTypes.has(requiredType));

    const policyCode = contract.weighting_policy?.policy_code;
    const policyWeights = CALIBRATION_VARIABLES.signal_weight_profiles[policyCode];
    if (!policyWeights) {
      missingContracts.push({ trait_code: traitCode, issue: `missing_weighting_policy:${policyCode}` });
    }

    const signalCountOk = allowedSignals.length >= contract.minimum_signal_count;
    const sourceDiversityOk = sourceTypes.size >= Math.max(2, contract.minimum_source_diversity);
    const requiredSignalsOk = requiredMissing.length === 0;
    const nonInterventionSignals = allowedSignals.filter(
      (signal) => String(signal.evidence_status_tag || "") !== "INTERVENTION_SESSION_LOG"
    );
    const interventionOnly = allowedSignals.length > 0 && nonInterventionSignals.length === 0;

    const evidenceSufficient = signalCountOk && sourceDiversityOk && requiredSignalsOk && !!policyWeights && !interventionOnly;
    const evidence_sufficiency_status = evidenceSufficient
      ? "SUFFICIENT"
      : (interventionOnly ? "INSUFFICIENT_NON_SESSION_SOURCE" : (!sourceDiversityOk ? "INSUFFICIENT_SOURCE_DIVERSITY" : "INSUFFICIENT_EVIDENCE"));

    let internal_partial_score = null;
    let reported_trait_score = null;
    let confidence_score = null;

    if (allowedSignals.length && policyWeights) {
      let weightTotal = 0;
      let weightedSum = 0;
      for (const signal of allowedSignals) {
        const w = clamp01(Number(policyWeights[signal.signal_type] ?? 0.1));
        weightTotal += w;
        weightedSum += (clamp01(Number(signal.normalized_value)) * w);
      }
      internal_partial_score = weightTotal > 0 ? clamp01(weightedSum / weightTotal) : null;
      const meanConfidence = clamp01(allowedSignals.reduce((acc, s) => acc + clamp01(Number(s.confidence_weight)), 0) / allowedSignals.length);
      const sufficiencyFactor = clamp01(
        (signalCountOk ? 0.4 : 0.0) +
        (sourceDiversityOk ? 0.4 : 0.0) +
        (requiredSignalsOk ? 0.2 : 0.0)
      );
      confidence_score = clamp01(
        meanConfidence * CALIBRATION_VARIABLES.confidence_formula_weights.base_weight_mean_confidence +
        sufficiencyFactor * CALIBRATION_VARIABLES.confidence_formula_weights.base_weight_evidence_sufficiency
      );
      if (evidenceSufficient) {
        reported_trait_score = internal_partial_score;
      }
    }

    traitResults.push({
      trait_code: traitCode,
      trait_name: contract.trait_name,
      evidence_sufficiency_status,
      reported_trait_score,
      internal_partial_score,
      confidence_score,
      signal_count: allowedSignals.length,
      source_diversity: sourceTypes.size,
      missing_required_signal_types: requiredMissing,
      weighting_policy: contract.weighting_policy,
      source_signals: allowedSignals.map((signal) => signal.signal_id),
    });
  }

  return {
    trait_results: traitResults,
    missing_contracts: missingContracts,
  };
}

module.exports = {
  scoreTraitsFromSignals,
};
