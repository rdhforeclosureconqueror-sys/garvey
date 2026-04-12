"use strict";

(function attachGarveyApiContract(global) {
  function getApiBase() {
    const host = global.location?.hostname || "";
    if (host.includes("garveyfrontend")) {
      return "https://garveybackend.onrender.com";
    }
    return "";
  }

  const API_BASE = getApiBase();
  const FEATURES = Object.freeze({
    CONSENT_V1: "off", // runtime truth comes from /api/features/consent
  });

  const ENDPOINTS = Object.freeze({
    questions: "/api/questions",
    intake: "/api/intake",
    vocIntake: "/api/vocIntake",
    consentRequired: "/api/consent/required",
    consentNetwork: "/api/consent/network",
    consentState: "/api/consent/state",
    consentDeleteProfile: "/api/consent/profile/delete",
    consentAssessmentRevoke: "/api/consent/assessment/revoke",
    consentFeature: "/api/features/consent",
    resultsByEmail: (email) => `/api/results/${encodeURIComponent(email)}`,
    resultsByCrid: (crid) => `/api/results/customer/${encodeURIComponent(crid)}`,
  });

  function buildUrl(path, query = {}) {
    const qs = new URLSearchParams(query);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return `${API_BASE}${path}${suffix}`;
  }

  global.GarveyApi = Object.freeze({
    API_BASE,
    FEATURES,
    ENDPOINTS,
    buildUrl,
  });
})(window);
