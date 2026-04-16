"use strict";

const SECTION_RENDER_ORDER = Object.freeze([
  "hero_summary",
  "trait_cards",
  "strengths",
  "support",
  "evidence",
  "action",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeNumber(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function renderHeroSummary(section) {
  const priorities = Array.isArray(section?.high_priority_traits) ? section.high_priority_traits : [];
  const rows = priorities.map((row) => (
    `<li>${escapeHtml(row.trait_label)} (${escapeHtml(row.priority_level)})</li>`
  )).join("");

  return `
    <section>
      <h2>${escapeHtml(section?.section_title || "Overview")}</h2>
      <p>${escapeHtml(section?.overview_text || "")}</p>
      ${rows ? `<ul>${rows}</ul>` : `<p>${escapeHtml(section?.empty_state || "No high-priority traits right now.")}</p>`}
      ${section?.confidence_notice ? `<p><strong>Confidence notice:</strong> ${escapeHtml(section.confidence_notice)}</p>` : ""}
    </section>
  `;
}

function renderTraitCards(section) {
  const cards = Array.isArray(section?.cards) ? section.cards : [];
  const rows = cards.map((card) => `
    <tr>
      <td>${escapeHtml(card.trait_label)}</td>
      <td>${safeNumber(card.current_score)}</td>
      <td>${safeNumber(card.change_score)}</td>
      <td>${safeNumber(card.confidence_score)}</td>
      <td>${escapeHtml(card.trend_direction)}</td>
      <td>${escapeHtml(card.status_label)}</td>
    </tr>
  `).join("");

  return `
    <section>
      <h2>${escapeHtml(section?.section_title || "Trait signals")}</h2>
      ${rows
        ? `<table border="1" cellpadding="6" cellspacing="0">
            <thead>
              <tr>
                <th>Trait</th>
                <th>Current</th>
                <th>Change</th>
                <th>Confidence</th>
                <th>Trend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
        : `<p>${escapeHtml(section?.empty_state || "Trait cards are not available yet.")}</p>`}
    </section>
  `;
}

function renderListSection(title, items = [], emptyState = "", itemFormatter) {
  const rows = items.map(itemFormatter).join("");
  return `
    <section>
      <h2>${escapeHtml(title)}</h2>
      ${rows ? `<ul>${rows}</ul>` : `<p>${escapeHtml(emptyState)}</p>`}
    </section>
  `;
}

function renderStrengths(section) {
  const items = Array.isArray(section?.items) ? section.items : [];
  return renderListSection(
    section?.title || "Current strengths",
    items,
    section?.empty_state || "No strengths are currently ranked.",
    (item) => `<li>${escapeHtml(item.trait_label)} — score ${safeNumber(item.current_score)}. ${escapeHtml(item.keep_doing_copy)}</li>`
  );
}

function renderSupport(section) {
  const items = Array.isArray(section?.items) ? section.items : [];
  return renderListSection(
    section?.title || "Support next",
    items,
    section?.empty_state || "Support recommendations are currently empty.",
    (item) => `<li>${escapeHtml(item.trait_label)} — score ${safeNumber(item.current_score)}. ${escapeHtml(item.support_next_copy)} ${escapeHtml(item.low_confidence_notice || "")}</li>`
  );
}

function renderEvidence(section) {
  const sources = Array.isArray(section?.sources_used) ? section.sources_used : [];
  const caveats = Array.isArray(section?.confidence_caveats) ? section.confidence_caveats : [];
  const flags = Array.isArray(section?.low_confidence_flags) ? section.low_confidence_flags : [];

  return `
    <section>
      <h2>${escapeHtml(section?.title || "Evidence and confidence")}</h2>
      ${sources.length ? `<p><strong>Sources used:</strong> ${sources.map((source) => escapeHtml(source)).join(", ")}</p>` : ""}
      ${caveats.length ? `<ul>${caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("")}</ul>` : ""}
      ${flags.length ? `<ul>${flags.map((flag) => `<li>${escapeHtml(flag.trait_label)} (${safeNumber(flag.confidence_score)}): ${escapeHtml(flag.caution)}</li>`).join("")}</ul>` : ""}
      ${!sources.length && !caveats.length && !flags.length ? `<p>${escapeHtml(section?.empty_state || "Evidence details are not available yet.")}</p>` : ""}
    </section>
  `;
}

function renderAction(section) {
  const levers = Array.isArray(section?.top_development_levers) ? section.top_development_levers : [];
  const prompts = Array.isArray(section?.next_step_prompts) ? section.next_step_prompts : [];
  const notes = Array.isArray(section?.environment_notes) ? section.environment_notes : [];

  return `
    <section>
      <h2>${escapeHtml(section?.title || "Next actions")}</h2>
      ${levers.length ? `<h3>Top development levers</h3><ul>${levers.map((lever) => `<li>${escapeHtml(lever.trait_label)}: ${escapeHtml(lever.lever)} — ${escapeHtml(lever.rationale)}</li>`).join("")}</ul>` : ""}
      ${prompts.length ? `<h3>Parent next-step prompts</h3><ul>${prompts.map((prompt) => `<li>${escapeHtml(prompt.trait_code)}: ${escapeHtml(prompt.prompt)}</li>`).join("")}</ul>` : ""}
      ${notes.length ? `<h3>Environment notes</h3><ul>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
      ${!levers.length && !prompts.length && !notes.length ? `<p>${escapeHtml(section?.empty_state || "Action recommendations are not available yet.")}</p>` : ""}
    </section>
  `;
}

function renderSection(pageModel, sectionKey) {
  if (sectionKey === "hero_summary") return renderHeroSummary(pageModel?.hero_summary);
  if (sectionKey === "trait_cards") return renderTraitCards(pageModel?.trait_cards);
  if (sectionKey === "strengths") return renderStrengths(pageModel?.strengths);
  if (sectionKey === "support") return renderSupport(pageModel?.support);
  if (sectionKey === "evidence") return renderEvidence(pageModel?.evidence);
  if (sectionKey === "action") return renderAction(pageModel?.action);
  return "";
}

function renderYouthDevelopmentParentDashboardPage(pageModel, options = {}) {
  const previewLabel = String(options.previewLabel || "Preview / test-only output").trim();
  const sectionMarkup = SECTION_RENDER_ORDER.map((sectionKey) => renderSection(pageModel, sectionKey)).join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(pageModel?.page_title || "Youth Development Dashboard")}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; background: #f8fafc; color: #0f172a; }
      main { max-width: 960px; margin: 0 auto; }
      header, section { background: #fff; border: 1px solid #dbe3ef; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
      .preview-banner { font-weight: bold; color: #7c2d12; background: #ffedd5; border: 1px solid #fdba74; border-radius: 8px; padding: 8px; }
      h1, h2, h3 { margin-top: 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="preview-banner">${escapeHtml(previewLabel)}</p>
        <h1>${escapeHtml(pageModel?.page_title || "Youth Development Dashboard")}</h1>
        <p>${escapeHtml(pageModel?.page_subtitle || "")}</p>
      </header>
      ${sectionMarkup}
    </main>
  </body>
</html>`;
}

module.exports = {
  renderYouthDevelopmentParentDashboardPage,
  YOUTH_DEVELOPMENT_PARENT_SECTION_ORDER: SECTION_RENDER_ORDER,
};
