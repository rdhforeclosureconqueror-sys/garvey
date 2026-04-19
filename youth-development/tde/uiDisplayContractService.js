"use strict";

function safeText(value, fallback = "") {
  const normalized = String(value == null ? "" : value).trim();
  return normalized || fallback;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeRecommendationItem(item = {}) {
  const displayTitle = safeText(item.display_title || item.title || item.label || item.action || item.recommendation_id, "Recommendation");
  const displaySummary = safeText(item.display_summary || item.action || item.parent_language || item.rationale, "No recommendation summary yet.");
  return {
    ...item,
    display_title: displayTitle,
    display_label: safeText(item.display_label || item.label || item.type || "recommendation"),
    display_status: safeText(item.display_status || item.type || "active"),
    display_summary: displaySummary,
  };
}

function normalizeRecommendationsPayload(payload = {}) {
  const recommendations = toArray(payload.recommendations).map((entry) => normalizeRecommendationItem(entry));
  return {
    ...payload,
    recommendations,
    display_title: safeText(payload.display_title, "Recommendations"),
    display_label: safeText(payload.display_label, "recommendation_panel"),
    display_status: safeText(payload.display_status || payload.contracts_status, recommendations.length ? "available" : "empty"),
    display_summary: safeText(payload.display_summary, recommendations.length ? `${recommendations.length} recommendation(s) available.` : "No recommendations available yet."),
    display_items: recommendations.map((entry) => entry.display_title),
  };
}

function normalizeInsightsPayload(payload = {}) {
  const pillarInsights = toArray(payload.pillar_insights);
  const normalizedInsights = pillarInsights.map((entry) => {
    const displayTitle = safeText(entry.display_title || entry.pillar_name || entry.pillar_code, "Insight");
    const statement = safeText(entry?.pillar_summary?.strengthening || entry.statement || entry.signal, "Insight detail unavailable.");
    return {
      ...entry,
      display_title: displayTitle,
      display_label: safeText(entry.display_label || entry.pillar_code || "insight"),
      display_status: safeText(entry.display_status || payload.contracts_status || "available"),
      display_summary: safeText(entry.display_summary || statement),
    };
  });
  return {
    ...payload,
    pillar_insights: normalizedInsights,
    insights: normalizedInsights.map((entry) => ({
      insight: entry.display_summary,
      statement: entry.display_summary,
      signal: entry.display_label,
      display_title: entry.display_title,
      display_label: entry.display_label,
      display_status: entry.display_status,
      display_summary: entry.display_summary,
    })),
    display_title: safeText(payload.display_title, "Insights"),
    display_label: safeText(payload.display_label, "insight_panel"),
    display_status: safeText(payload.display_status || payload.contracts_status, normalizedInsights.length ? "available" : "empty"),
    display_summary: safeText(payload.display_summary, normalizedInsights.length ? `${normalizedInsights.length} insight(s) available.` : "No insights available yet."),
    display_items: normalizedInsights.map((entry) => entry.display_title),
  };
}

function normalizeCheckinSummaryPayload(payload = {}) {
  const summaryStatus = safeText(payload?.evidence_sufficiency?.status || payload.status, "unknown");
  return {
    ...payload,
    display_title: safeText(payload.display_title, "Check-in Summary"),
    display_label: safeText(payload.display_label, "checkin_summary_panel"),
    display_status: safeText(payload.display_status, summaryStatus),
    display_summary: safeText(
      payload.display_summary,
      payload?.changes_since_prior_checkin?.interpretation || payload?.latest_checkin_summary?.developmental_summary || "No check-in summary available yet."
    ),
    display_items: [
      safeText(payload?.latest_checkin_summary?.checkin_id, "latest_checkin_unavailable"),
      safeText(payload?.next_expected_checkin?.status, "next_checkin_unknown"),
      summaryStatus,
    ],
  };
}

function normalizeExplanationPayload(payload = {}) {
  const deltas = toArray(payload.recommendation_deltas).map((entry) => ({
    ...entry,
    display_title: safeText(entry.display_title || entry.type || entry.recommendation_id, "Recommendation adaptation"),
    display_label: safeText(entry.display_label || entry.type || "recommendation_delta"),
    display_status: safeText(entry.display_status || "available"),
    display_summary: safeText(
      entry.display_summary,
      `Intensity ${safeText(entry?.adaptation_summary?.intensity, "baseline")}, frequency ${safeText(entry?.adaptation_summary?.frequency, "baseline")}.`
    ),
  }));
  return {
    ...payload,
    recommendation_deltas: deltas,
    explanations: deltas.map((entry) => ({
      title: entry.display_title,
      summary: entry.display_summary,
      reason: entry.display_label,
      display_title: entry.display_title,
      display_label: entry.display_label,
      display_status: entry.display_status,
      display_summary: entry.display_summary,
    })),
    display_title: safeText(payload.display_title, "Recommendation Explanation"),
    display_label: safeText(payload.display_label, "recommendation_explanation_panel"),
    display_status: safeText(payload.display_status || payload.contracts_status, deltas.length ? "available" : "empty"),
    display_summary: safeText(payload.display_summary, deltas.length ? `${deltas.length} adaptation explanation(s) available.` : "No explanations available yet."),
    display_items: deltas.map((entry) => entry.display_title),
  };
}

function normalizeVoiceDisplay(payload = {}, options = {}) {
  const contentRegistryStatus = safeText(
    payload.content_registry_status
      || payload.readability_status
      || payload?.readability_registration?.readability_status
      || payload?.readability_registration?.content_registry_status,
    "unknown"
  );
  const readabilityStatus = safeText(
    payload.readability_status || payload?.readability_registration?.readability_status,
    contentRegistryStatus
  );
  const voiceReadiness = safeText(
    payload.voice_readiness_status
      || payload?.voice_state?.availability
      || payload.voice_availability_status
      || options.defaultReadiness,
    "unknown"
  );
  return {
    ...payload,
    content_registry_status: contentRegistryStatus,
    readability_status: readabilityStatus,
    voice_readiness_status: voiceReadiness,
    display_title: safeText(payload.display_title, options.displayTitle || "Voice"),
    display_label: safeText(payload.display_label, options.displayLabel || "voice_panel"),
    display_status: safeText(payload.display_status, voiceReadiness),
    display_summary: safeText(payload.display_summary, `${voiceReadiness}; readability ${readabilityStatus}; registry ${contentRegistryStatus}.`),
    display_items: toArray(payload.display_items).length ? payload.display_items : [voiceReadiness, readabilityStatus, contentRegistryStatus],
  };
}

module.exports = {
  normalizeRecommendationsPayload,
  normalizeInsightsPayload,
  normalizeCheckinSummaryPayload,
  normalizeExplanationPayload,
  normalizeVoiceDisplay,
};

