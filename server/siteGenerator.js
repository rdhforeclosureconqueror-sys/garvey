"use strict";

function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  const theme = pickTheme(site);

  const businessName = site.business_name || tenantSlug;
  const headline = site.headline || `Join ${businessName}`;
  const subhead = site.subheadline || "Build your system. Grow your business.";

  const intakeLink = `/intake.html?tenant=${tenantSlug}&assessment=business_owner`;
  const vocLink = `/voc.html?tenant=${tenantSlug}`;
  const dashLink = `/dashboard.html?tenant=${tenantSlug}`;
  const rewardsLink = `/rewards.html?tenant=${tenantSlug}`;
  const pathwayLink = `/garvey.html?tenant=${tenantSlug}`;
  const templatesLink = `/templates.html?tenant=${tenantSlug}`;

  const selectedTemplateId = site?.template_id || "";
  const selectedTemplateLink = selectedTemplateId
    ? `/templates/${selectedTemplateId}/index.html`
    : "";

  const valueProps = asStringArray(site.value_props);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(businessName)}</title>

<style>
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: linear-gradient(180deg, ${theme.bg}, #020617);
  color: ${theme.text};
}

.container {
  max-width: 1000px;
  margin: auto;
  padding: 40px 20px;
}

.hero {
  text-align: center;
  margin-bottom: 40px;
}

.hero h1 {
  font-size: 36px;
  color: ${theme.primary};
  margin-bottom: 10px;
}

.hero p {
  color: #cbd5e1;
  font-size: 16px;
}

.ctaRow {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 25px;
}

.btn {
  padding: 14px 18px;
  background: ${theme.primary};
  color: black;
  font-weight: bold;
  border-radius: 10px;
  text-decoration: none;
  transition: 0.2s;
}

.btn:hover {
  background: ${theme.accent};
  color: white;
}

.section {
  margin-top: 40px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.box {
  background: ${theme.card};
  padding: 18px;
  border-radius: 12px;
  border: 1px solid #334155;
}

.label {
  color: ${theme.primary};
  font-weight: bold;
  margin-bottom: 8px;
}

.footer {
  margin-top: 50px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}
</style>

</head>

<body>

<div class="container">

  <div class="hero">
    <h1>${esc(headline)}</h1>
    <p>${esc(subhead)}</p>

    <div class="ctaRow">

      <a class="btn" href="${esc(intakeLink)}">
        🧠 Start Assessment
      </a>

      <a class="btn" href="${esc(vocLink)}">
        🗣️ Voice of Customer
      </a>

      <a class="btn" href="${esc(pathwayLink)}">
        🚀 Funding Pathway
      </a>

      <a class="btn" href="${esc(templatesLink)}">
        🎨 Templates
      </a>

      ${selectedTemplateLink ? `
        <a class="btn" href="${esc(selectedTemplateLink)}" target="_blank">
          🌐 View Website
        </a>
      ` : ""}

      <a class="btn" href="${esc(dashLink)}">
        📊 Dashboard
      </a>

      <a class="btn" href="${esc(rewardsLink)}">
        🎁 Rewards
      </a>

    </div>
  </div>

  <div class="section">
    <div class="grid">

      ${
        valueProps.length
          ? `
        <div class="box">
          <div class="label">What you get</div>
          <ul>
            ${valueProps.map(p => `<li>${esc(p)}</li>`).join("")}
          </ul>
        </div>
      `
          : ""
      }

      <div class="box">
        <div class="label">Next Steps</div>
        <ul>
          <li>Complete your assessment</li>
          <li>Choose your website template</li>
          <li>Activate your dashboard</li>
          <li>Start earning engagement points</li>
        </ul>
      </div>

    </div>
  </div>

  <div class="footer">
    Powered by Garvey System • ${esc(tenantSlug)}
  </div>

</div>

</body>
</html>
`;
}

function generateTenantSite({ tenantSlug, config }) {
  return {
    version: 3,
    pages: {
      landing: landingHtml({ tenantSlug, config })
    }
  };
}

module.exports = { generateTenantSite };
