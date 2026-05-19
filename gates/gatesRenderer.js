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

module.exports = { renderChildProfileList, renderChildProfileCard, renderEmptyChildrenState, renderAssessmentIntro, renderAssessmentQuestionListShell, renderAssessmentDisclaimer, renderResultsShell, renderGatesProfileSummary, renderGatesMapShell };
