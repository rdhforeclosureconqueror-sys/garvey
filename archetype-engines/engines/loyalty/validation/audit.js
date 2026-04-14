"use strict";

function runLoyaltySkeletonAudit({ questionBanks = {}, sourceRouting = {}, attribution = {} } = {}) {
  return {
    bankCounts: Object.fromEntries(Object.entries(questionBanks).map(([k, v]) => [k, (v || []).length])),
    classDistribution: {},
    pairBalance: {},
    contradictionCoverage: {},
    normalizationCheck: "configured",
    dominanceSimulation: "configured",
    retakeSourceRouting: sourceRouting,
    authoredFirstAttempt: sourceRouting.firstAttempt === "authored_bank_1",
    promotionManifestGovernance: sourceRouting.manifestGoverned === true,
    attributionContinuity: attribution,
  };
}

module.exports = { runLoyaltySkeletonAudit };
