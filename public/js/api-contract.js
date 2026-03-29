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

  const ENDPOINTS = Object.freeze({
    questions: "/api/questions",
    intake: "/api/intake",
    vocIntake: "/api/vocIntake",
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
    ENDPOINTS,
    buildUrl,
  });
})(window);
