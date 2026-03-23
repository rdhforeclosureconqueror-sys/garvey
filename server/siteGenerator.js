// FILE: server/siteGenerator.js
// Command B: config-driven multi-tenant site pages stored in tenant_config (NOT tenant_sites)
// API usage (server/index.js already wired):
// - POST /api/site/generate  { tenant, site, features }
// - GET  /t/:slug/site       renders landing HTML
//
// generateTenantSite(...) returns:
// { version: number, pages: { landing: "<html...>" } }
//
// ✅ Backward compatible: existing defaults/routes/strings preserved
// ✅ Adds optional support for:
// - site.template (supports "persona:*", "minimal", "storefront")
// - site.value_props (array)
// - site.cta_text / site.cta_link (override top CTA)
// - site.meta.primary/secondary/readiness (pills)

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
  const primary = site.primary_color || "#facc15"; // gold
  const bg = site.bg_color || "#000000";
  const card = site.card_color || "#111111";
  const text = site.text_color || "#ffffff";
  const accent = site.accent_color || "#ef4444";
  return { primary, bg, card, text, accent };
}

function asStringArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function templateLayout(templateKey = "") {
  const key = String(templateKey || "").toLowerCase();
  if (key === "minimal") return "minimal";
  if (key === "storefront") return "storefront";
  if (key.startsWith("persona:")) return "persona";
  return "default";
}

function landingHtml({ tenantSlug, config }) {
  const site = config?.site || {};
  const features = config?.features || {};
  const theme = pickTheme(site);

  const businessName = site.business_name || tenantSlug;
  const headline = site.headline || `Join ${businessName} Community & Earn Rewards`;
  const subhead =
    site.subheadline ||
    "Earn points for check-ins, reviews, referrals, and get personalized recommendations.";

  const rewardName = site.reward_name || "Credits";

  const showRewards = bool(features.rewards, true);
  const showIntake = bool(features.quiz, true);
  const showReviews = bool(features.reviews, true);
  const showStore = bool(features.store, false);

  // KEEP SAME ROUTES/LINKS
  const intakeLink = `/intake.html?tenant=${encodeURIComponent(tenantSlug)}`;
  const cxLink = `/index.html?tenant=${encodeURIComponent(tenantSlug)}`;
  const dashLink = `/dashboard.html?tenant=${encodeURIComponent(tenantSlug)}`;
  const adminLink = `/admin.html?tenant=${encodeURIComponent(tenantSlug)}`;
  const vocLink = `/voc.html?tenant=${encodeURIComponent(tenantSlug)}`;

  const layout = templateLayout(site.template);

  const valueProps = asStringArray(site.value_props);
  const primary = site?.meta?.primary ? String(site.meta.primary) : "";
  const secondary = site?.meta?.secondary ? String(site.meta.secondary) : "";
  const readiness = Number.isFinite(Number(site?.meta?.readiness))
    ? Number(site.meta.readiness)
    : null;

  const ctaText =
    site.cta_text || (showIntake ? "Take the Assessment" : "Earn Points (Actions)");
  const ctaLink = site.cta_link || (showIntake ? intakeLink : cxLink);

  const pills = [
    `<div class="pill">Tenant: ${esc(tenantSlug)}</div>`,
    showRewards ? `<div class="pill">Rewards: ${esc(rewardName)}</div>` : "",
    showStore ? `<div class="pill">Store: enabled</div>` : `<div class="pill">Store: off</div>`,
    primary ? `<div class="pill">Primary: ${esc(primary)}</div>` : "",
    secondary ? `<div class="pill">Secondary: ${esc(secondary)}</div>` : "",
    readiness != null ? `<div class="pill">Readiness: ${esc(readiness)}%</div>` : "",
  ].filter(Boolean);

  const ctaRowHtml = `
    <div class="ctaRow">
      <a class="btn" href="${esc(ctaLink)}">${esc(ctaText)}</a>
      ${showIntake ? `<a class="btn" href="${esc(intakeLink)}">Take the Assessment</a>` : ""}
      <a class="btn" href="${esc(cxLink)}">Earn Points (Actions)</a>
      <a class="btn" href="${esc(dashLink)}">Owner Dashboard</a>
    </div>
  `;

  const valuePropsHtml =
    valueProps.length > 0
      ? `
      <div class="box">
        <div class="label">What you’ll get</div>
        <ul>
          ${valueProps.map((p) => `<li>${esc(p)}</li>`).join("\n")}
        </ul>
      </div>
    `
      : "";

  const whatYouCanDoHtml = `
      <div class="box">
        <div class="label">What you can do</div>
        <ul>
          <li>Check in and earn points</li>
          ${showReviews ? "<li>Leave reviews (photo/video optional)</li>" : ""}
          <li>Refer friends to grow the community</li>
          <li>Join the list for offers + updates</li>
        </ul>
      </div>
  `;

  const ownerControlsHtml = `
      <div class="box">
        <div class="label">Owner controls</div>
        <ul>
          <li><a href="${esc(adminLink)}">Admin config</a> (toggle features)</li>
          <li><a href="${esc(dashLink)}">Dashboard</a> (analytics)</li>
          <li><a href="${esc(vocLink)}">VOC Intake</a> (customer voice)</li>
        </ul>
      </div>
  `;

  let gridInner = "";

  if (layout === "minimal") {
    gridInner = `${valuePropsHtml || ""}${ownerControlsHtml}`;
  } else if (layout === "storefront") {
    gridInner = `${valuePropsHtml || ""}${whatYouCanDoHtml}${ownerControlsHtml}`;
  } else {
    // default/persona
    gridInner = `${whatYouCanDoHtml}${ownerControlsHtml}`;
    if (valuePropsHtml) gridInner = `${valuePropsHtml}${gridInner}`;
  }

  const gridHtml = `<div class="grid">${gridInner}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${esc(businessName)} — Community</title>
  <style>
    body { font-family: Arial, sans-serif; background:${esc(theme.bg)}; color:${esc(theme.text)}; padding:24px; }
    .card { background:${esc(theme.card)}; border:2px solid ${esc(theme.primary)}; padding:24px; border-radius:16px; max-width:860px; margin:0 auto; }
    h1 { color:${esc(theme.primary)}; margin:0 0 8px; }
    p { color:#cbd5e1; margin:0 0 14px; }
    .ctaRow { display:flex; gap:12px; flex-wrap:wrap; margin:14px 0; }
    a.btn { display:inline-block; padding:12px 14px; border-radius:12px; border:2px solid #000; background:${esc(
      theme.primary
    )}; color:#000; font-weight:800; text-decoration:none; }
    a.btn:hover { background:${esc(theme.accent)}; color:#fff; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-top:14px; }
    .box { background:#0b1020; border:1px solid #334155; border-radius:12px; padding:14px; }
    .label { color:#93c5fd; font-weight:700; margin-bottom:6px; }
    .meta { color:#94a3b8; font-size:12px; margin-top:14px; }
    .pill { display:inline-block; padding:4px 10px; border-radius:999px; background:#111827; border:1px solid #334155; color:#e5e7eb; font-size:12px; margin-right:6px; }
    code { color:#e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    ${pills.join("\n")}

    <h1>${esc(headline)}</h1>
    <p>${esc(subhead)}</p>

    ${ctaRowHtml}

    ${gridHtml}

    <div class="meta">
      Generated by Garvey Site Generator (Command B). Preview route: <code>/t/${esc(
        tenantSlug
      )}/site</code>
    </div>
  </div>
</body>
</html>`;
}

function generateTenantSite({ tenantSlug, config }) {
  const version = 1;

  const pages = {
    landing: landingHtml({ tenantSlug, config }),
  };

  return { version, pages };
}

module.exports = { generateTenantSite };
