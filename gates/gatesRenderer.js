"use strict";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderChildProfileCard(child = {}) {
  const name = escapeHtml(child.child_name || "Unnamed Child");
  const ageBand = escapeHtml(child.child_age_band || "");
  const gradeBand = escapeHtml(child.child_grade_band || "");
  return `<article class="gates-child-card" data-child-id="${escapeHtml(child.child_id || "")}"><h3>${name}</h3><p>${ageBand}</p><p>${gradeBand}</p></article>`;
}

function renderEmptyChildrenState() {
  return '<section class="gates-empty-state"><p>No child profiles yet.</p></section>';
}

function renderChildProfileList(children = []) {
  if (!Array.isArray(children) || children.length === 0) return renderEmptyChildrenState();
  return `<section class="gates-child-list">${children.map(renderChildProfileCard).join("")}</section>`;
}

function renderAssessmentIntro(payload = {}) {
  return `<section class="gates-assessment-intro"><h2>${escapeHtml(payload.title || "")}</h2><p>${escapeHtml(payload.instructions || "")}</p></section>`;
}

function renderAssessmentQuestionListShell(questions = []) {
  return `<section class="gates-assessment-question-shell" data-question-count="${questions.length}"></section>`;
}

function renderAssessmentDisclaimer(disclaimer = "") {
  return `<aside class="gates-assessment-disclaimer"><p>${escapeHtml(disclaimer)}</p></aside>`;
}

function renderResultsShell() {
  return '<section class="gates-results-shell"><div data-gates-profile-summary></div><div data-gates-map-shell></div></section>';
}

function renderGatesProfileSummary(profile = {}) {
  return `<section class="gates-profile-summary"><p>${escapeHtml(profile.summary || "")}</p></section>`;
}

function renderGatesMapShell(gateMap = []) {
  return `<section class="gates-map-shell" data-gates-count="${Array.isArray(gateMap) ? gateMap.length : 0}"></section>`;
}



function renderProgressMapShell(progress = []) {
  return `<section class="gates-progress-map-shell" data-progress-count="${Array.isArray(progress) ? progress.length : 0}"></section>`;
}

function renderProgressCard(entry = {}) {
  return `<article class="gates-progress-card" data-gate-number="${escapeHtml(entry.gate_number || "")}"><h4>${escapeHtml(entry.name || "")}</h4><p>${escapeHtml(entry.status || "not_started")}</p><p>${escapeHtml(entry.progress_percent || 0)}%</p></article>`;
}

function renderProgressUpdateFormShell(entry = {}) {
  return `<form class="gates-progress-update-form" data-gate-number="${escapeHtml(entry.gate_number || "")}"><textarea name="parent_note" placeholder="Parent note"></textarea><textarea name="observed_response" placeholder="Observed response"></textarea></form>`;
}

function renderProgressEmptyState() {
  return '<section class="gates-progress-empty"><p>No progress updates yet.</p></section>';
}

function renderRecommendationsEmptyState() {
  return '<section class="gates-recommendations-empty"><p>No recommendations available yet.</p></section>';
}

function renderRecommendationCard(recommendation = {}) {
  return `<article class="gates-recommendation-card" data-gate-key="${escapeHtml(recommendation.gate_key || "")}"><h4>${escapeHtml(recommendation.title || "")}</h4><p>${escapeHtml(recommendation.description || "")}</p></article>`;
}

function renderRecommendationsListShell(recommendations = []) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) return renderRecommendationsEmptyState();
  return `<section class="gates-recommendations-shell">${recommendations.map(renderRecommendationCard).join("")}</section>`;
}

module.exports = { renderChildProfileList, renderChildProfileCard, renderEmptyChildrenState, renderAssessmentIntro, renderAssessmentQuestionListShell, renderAssessmentDisclaimer, renderResultsShell, renderGatesProfileSummary, renderGatesMapShell, renderProgressMapShell, renderProgressCard, renderProgressUpdateFormShell, renderProgressEmptyState, renderRecommendationsListShell, renderRecommendationCard, renderRecommendationsEmptyState };
