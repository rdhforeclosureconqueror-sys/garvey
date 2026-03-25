"use strict";

function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bool(v, fallback) {
  if (typeof v === "boolean") return v;
  return Boolean(fallback);
}

function pickTheme(site = {}) {
  return {
    primary: site.primary_color || "#facc15",
    bg: site.bg_color || "#000000",
    card: site.card_color || "#111111",
    text: site.text_color || "#ffffff",
    accent: site.accent_color || "#ef4444"
  };
}

function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map(x => String(x ?? "").trim()).filter(Boolean);
}

function landingHtml({ tenantSlug, config }) {
  const site = config?.site || {};
  const features = config?.features || {};
  const theme = pickTheme(site);

  const businessName = site.business_name || tenantSlug;
  const headline = site.headline || `Join ${businessName}`;
  const subhead = site.subheadline || "Build your system. Grow your business.";

  const intakeLink = `/intake.html?tenant=${tenantSlug}&assessment=business_owner`;
  const vocLink = `/voc.html?tenant=${tenantSlug}`;
  const dashLink = `/dashboard.html?tenant=${tenantSlug}`;
  const pathwayLink = `/garvey.html?tenant=${tenantSlug}`;

  const templatesLink = `/templates.html?tenant=${tenantSlug}`;
  const selectedTemplateId = site?.template_id || "";
  const selectedTemplateLink = selectedTemplateId
    ? `/templates/${selectedTemplateId}/index.html`
    : "";

  const valueProps = asStringArray(site.value_props);

  // =========================
  // ✅ NEW CTA SYSTEM
  // =========================

  const ctaRowHtml = `
    <div class="ctaRow">

      <a class="btn" href="${esc(intakeLink)}">
        🧠 Business Owner Assessment
      </a>

      <a class="btn" href="${esc(vocLink)}">
        🗣️ Voice of Customer
      </a>

      <a class="btn" href="${esc(pathwayLink)}">
        🚀 Idea → Funding Pathway
      </a>

      <a class="btn" href="${esc(templatesLink)}">
        🎨 Website Templates
      </a>

      ${selectedTemplateLink ? `
        <a class="btn" href="${esc(selectedTemplateLink)}" target="_blank">
          🌐 Open Website
        </a>
      ` : ""}

      <a class="btn" href="${esc(dashLink)}">
        📊 Dashboard
      </a>

    </div>
  `;

  const valuePropsHtml = valueProps.length
    ? `<div class="box">
        <div class="label">What you get</div>
        <ul>${valueProps.map(p => `<li>${esc(p)}</li>`).join("")}</ul>
      </div>`
    : "";

  const gridHtml = `
    <div class="grid">
      ${valuePropsHtml}
    </div>
  `;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(businessName)}</title>

<style>
body {
  font-family: Arial;
  background: ${theme.bg};
  color: ${theme.text};
  padding: 20px;
}
.card {
  max-width: 900px;
  margin: auto;
  background: ${theme.card};
  padding: 20px;
  border-radius: 12px;
}
h1 { color: ${theme.primary}; }

.ctaRow {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0;
}

.btn {
  padding: 12px;
  background: ${theme.primary};
  color: black;
  font-weight: bold;
  border-radius: 10px;
  text-decoration: none;
}

.btn:hover {
  background: ${theme.accent};
  color: white;
}
</style>

</head>

<body>
<div class="card">

<h1>${esc(headline)}</h1>
<p>${esc(subhead)}</p>

${ctaRowHtml}

${gridHtml}

</div>
</body>
</html>
`;
}

function generateTenantSite({ tenantSlug, config }) {
  return {
    version: 2,
    pages: {
      landing: landingHtml({ tenantSlug, config })
    }
  };
}

module.exports = { generateTenantSite };
