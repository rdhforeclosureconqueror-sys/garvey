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

module.exports = { renderChildProfileList, renderChildProfileCard, renderEmptyChildrenState };
