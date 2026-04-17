"use strict";

const SECTION_RENDER_ORDER = Object.freeze([
  "hero_summary",
  "insight_narrative",
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
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeNumber(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function toPercent(value) {
  const normalized = Math.max(0, Math.min(100, safeNumber(value)));
  return `${Math.round(normalized)}%`;
}

function trendBadge(trendDirection) {
  const trend = String(trendDirection || "stable").toLowerCase();
  if (trend === "increasing") return { glyph: "▲", label: "Improving", tone: "up" };
  if (trend === "decreasing") return { glyph: "▼", label: "Watch", tone: "down" };
  return { glyph: "◆", label: "Steady", tone: "flat" };
}

function renderHeroSummary(section) {
  const priorities = Array.isArray(section?.high_priority_traits) ? section.high_priority_traits : [];
  const cards = priorities.map((row) => {
    const trend = trendBadge(row?.trend_direction);
    return `
      <li class="priority-item">
        <div>
          <p class="priority-trait">${escapeHtml(row.trait_label)}</p>
          <p class="priority-level">${escapeHtml(row.priority_level)} priority</p>
        </div>
        <span class="trend-chip trend-${trend.tone}">${trend.glyph} ${trend.label}</span>
      </li>
    `;
  }).join("");

  return `
    <section class="dashboard-panel" data-section="hero-summary">
      <h2>Overview</h2>
      <p>${escapeHtml(section?.overview_text || "")}</p>
      ${cards ? `<ul class="priority-list">${cards}</ul>` : `<p>${escapeHtml(section?.empty_state || "No high-priority traits right now.")}</p>`}
      ${section?.confidence_notice ? `<p class="confidence-note"><strong>Confidence notice:</strong> ${escapeHtml(section.confidence_notice)}</p>` : ""}
    </section>
  `;
}

function renderTraitCards(section) {
  const cards = Array.isArray(section?.cards) ? section.cards : [];
  const rows = cards.map((card) => {
    const trend = trendBadge(card?.trend_direction);
    return `
    <tr>
      <td><strong>${escapeHtml(card.trait_label)}</strong></td>
      <td>${safeNumber(card.current_score)}</td>
      <td>${safeNumber(card.change_score)}</td>
      <td>
        <div class="confidence-meter" aria-label="confidence ${safeNumber(card.confidence_score)}">
          <span style="width:${toPercent(card.confidence_score)}"></span>
        </div>
        <small>${safeNumber(card.confidence_score)} / 100</small>
      </td>
      <td><span class="trend-chip trend-${trend.tone}">${trend.glyph} ${escapeHtml(card.trend_direction)}</span></td>
      <td>${escapeHtml(card.status_label)}</td>
    </tr>
  `;
  }).join("");

  return `
    <section class="dashboard-panel" data-section="trait-cards">
      <h2>Trait signals</h2>
      ${rows
        ? `<table>
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

function renderInsightNarrative(section) {
  const hasNarrative = Boolean(section?.opening || section?.focus_area || section?.next_step);
  return `
    <section class="dashboard-panel" data-section="insight-narrative">
      <h2>${escapeHtml(section?.section_title || "Parent insight narrative")}</h2>
      ${hasNarrative
        ? `<p>${escapeHtml(section?.opening || "")}</p>
           <p>${escapeHtml(section?.focus_area || "")}</p>
           <p>${escapeHtml(section?.next_step || "")}</p>`
        : `<p>${escapeHtml(section?.empty_state || "Narrative insight is not available yet.")}</p>`}
    </section>
  `;
}

function renderListSection(title, items = [], emptyState = "", itemFormatter) {
  const rows = items.map(itemFormatter).join("");
  return `
    <section class="dashboard-panel">
      <h2>${escapeHtml(title)}</h2>
      ${rows ? `<ul class="bulleted-list">${rows}</ul>` : `<p>${escapeHtml(emptyState)}</p>`}
    </section>
  `;
}

function renderStrengths(section) {
  const items = Array.isArray(section?.items) ? section.items : [];
  return renderListSection(
    section?.title || "Current strengths",
    items,
    section?.empty_state || "No strengths are currently ranked.",
    (item) => `<li><strong>${escapeHtml(item.trait_label)}</strong> <span class="item-score">${safeNumber(item.current_score)}</span><p>${escapeHtml(item.keep_doing_copy)}</p></li>`
  );
}

function renderSupport(section) {
  const items = Array.isArray(section?.items) ? section.items : [];
  return renderListSection(
    section?.title || "Support next",
    items,
    section?.empty_state || "Support recommendations are currently empty.",
    (item) => `<li><strong>${escapeHtml(item.trait_label)}</strong> <span class="item-score">${safeNumber(item.current_score)}</span><p>${escapeHtml(item.support_next_copy)}</p>${item.low_confidence_notice ? `<p class="subtle-warn">${escapeHtml(item.low_confidence_notice)}</p>` : ""}</li>`
  );
}

function renderEvidence(section) {
  const sources = Array.isArray(section?.sources_used) ? section.sources_used : [];
  const caveats = Array.isArray(section?.confidence_caveats) ? section.confidence_caveats : [];
  const flags = Array.isArray(section?.low_confidence_flags) ? section.low_confidence_flags : [];

  return `
    <section class="dashboard-panel" data-section="evidence">
      <h2>${escapeHtml(section?.title || "Evidence and confidence")}</h2>
      ${sources.length ? `<p><strong>Sources used:</strong> ${sources.map((source) => `<span class="pill">${escapeHtml(source)}</span>`).join(" ")}</p>` : ""}
      ${caveats.length ? `<h3>Confidence caveats</h3><ul class="bulleted-list">${caveats.map((caveat) => `<li>${escapeHtml(caveat)}</li>`).join("")}</ul>` : ""}
      ${flags.length ? `<h3>Low-confidence flags</h3><ul class="bulleted-list">${flags.map((flag) => `<li>${escapeHtml(flag.trait_label)} (${safeNumber(flag.confidence_score)}): ${escapeHtml(flag.caution)}</li>`).join("")}</ul>` : ""}
      ${!sources.length && !caveats.length && !flags.length ? `<p>${escapeHtml(section?.empty_state || "Evidence details are not available yet.")}</p>` : ""}
    </section>
  `;
}

function renderAction(section) {
  const levers = Array.isArray(section?.top_development_levers) ? section.top_development_levers : [];
  const prompts = Array.isArray(section?.next_step_prompts) ? section.next_step_prompts : [];
  const notes = Array.isArray(section?.environment_notes) ? section.environment_notes : [];

  return `
    <section class="dashboard-panel" data-section="action">
      <h2>${escapeHtml(section?.title || "Next actions")}</h2>
      ${levers.length ? `<h3>Top development levers</h3><ul class="bulleted-list">${levers.map((lever) => `<li><strong>${escapeHtml(lever.trait_label)}:</strong> ${escapeHtml(lever.lever)} — ${escapeHtml(lever.rationale)}</li>`).join("")}</ul>` : ""}
      ${prompts.length ? `<h3>Parent next-step prompts</h3><ul class="bulleted-list">${prompts.map((prompt) => `<li>${escapeHtml(prompt.trait_code)}: ${escapeHtml(prompt.prompt)}</li>`).join("")}</ul>` : ""}
      ${notes.length ? `<h3>Environment notes</h3><ul class="bulleted-list">${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}
      ${!levers.length && !prompts.length && !notes.length ? `<p>${escapeHtml(section?.empty_state || "Action recommendations are not available yet.")}</p>` : ""}
    </section>
  `;
}

function renderSection(pageModel, sectionKey) {
  if (sectionKey === "hero_summary") return renderHeroSummary(pageModel?.hero_summary);
  if (sectionKey === "insight_narrative") return renderInsightNarrative(pageModel?.insight_narrative);
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
      :root {
        --bg: #030712;
        --panel: linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8));
        --text: #e2e8f0;
        --muted: #94a3b8;
        --line: rgba(148, 163, 184, 0.35);
        --up: #22c55e;
        --flat: #38bdf8;
        --down: #f97316;
      }
      * { box-sizing: border-box; }
      body {
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        margin: 0;
        padding: 24px;
        background: radial-gradient(circle at 0% 0%, #111827, #020617 65%);
        color: var(--text);
      }
      main { max-width: 1120px; margin: 0 auto; display: grid; gap: 14px; }
      .hero-panel, .dashboard-panel {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 16px;
        background: var(--panel);
        backdrop-filter: blur(6px);
      }
      .preview-banner {
        margin: 0 0 10px;
        font-size: 12px;
        display: inline-block;
        color: #fed7aa;
        background: rgba(124, 45, 18, 0.35);
        border: 1px solid rgba(251, 146, 60, 0.5);
        border-radius: 999px;
        padding: 4px 10px;
      }
      h1, h2, h3 { margin-top: 0; }
      h1 { margin-bottom: 8px; }
      p { color: #cbd5e1; }
      .muted { color: var(--muted); }
      .priority-list, .bulleted-list { margin: 0; padding-left: 18px; display: grid; gap: 8px; }
      .priority-list { list-style: none; padding-left: 0; }
      .priority-item {
        border: 1px solid var(--line);
        border-radius: 10px;
        padding: 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        background: rgba(15, 23, 42, 0.7);
      }
      .priority-trait { margin: 0; font-weight: 700; color: #f8fafc; }
      .priority-level { margin: 4px 0 0; color: var(--muted); font-size: 12px; }
      .trend-chip {
        border: 1px solid transparent;
        border-radius: 999px;
        padding: 2px 10px;
        font-size: 12px;
        white-space: nowrap;
      }
      .trend-up { color: #86efac; border-color: rgba(34, 197, 94, 0.45); background: rgba(34, 197, 94, 0.15); }
      .trend-flat { color: #7dd3fc; border-color: rgba(56, 189, 248, 0.45); background: rgba(56, 189, 248, 0.15); }
      .trend-down { color: #fdba74; border-color: rgba(249, 115, 22, 0.45); background: rgba(249, 115, 22, 0.15); }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; border-bottom: 1px solid var(--line); padding: 10px 8px; vertical-align: top; }
      th { font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); }
      .confidence-meter {
        width: 120px;
        height: 8px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.25);
        overflow: hidden;
      }
      .confidence-meter span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #fb7185, #facc15, #4ade80);
      }
      .pill {
        display: inline-block;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 2px 8px;
        margin-right: 6px;
        font-size: 12px;
      }
      .item-score {
        font-size: 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 2px 8px;
        margin-left: 6px;
        color: #93c5fd;
      }
      .subtle-warn { color: #fdba74; }
      .confidence-note {
        border-left: 2px solid #facc15;
        padding-left: 10px;
        color: #fef08a;
      }
    </style>
  </head>
  <body>
    <main>
      <header class="hero-panel">
        <p class="preview-banner">${escapeHtml(previewLabel)}</p>
        <h1>${escapeHtml(pageModel?.page_title || "Youth Development Dashboard")}</h1>
        <p>${escapeHtml(pageModel?.page_subtitle || "")}</p>
        <p class="muted">Parent dashboard preview mode · isolated youth namespace</p>
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
