/* =========================
   FILE: server/siteGenerator.js
   Multi-tenant website generator (Command B)
   - Generates HTML strings from tenant + config
   - Keep it simple: landing page MVP
========================= */
"use strict";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeHexColor(value, fallback = "#d4af37") {
  const s = String(value || "").trim();
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
  return fallback;
}

function buildLandingHtml({ tenantSlug, site, features }) {
  const businessName = escapeHtml(site.business_name || tenantSlug);
  const industry = escapeHtml(site.industry || "business");
  const rewardName = escapeHtml(site.reward_name || "Rewards");
  const primaryColor = normalizeHexColor(site.primary_color, "#d4af37");
  const logoUrl = escapeHtml(site.logo_url || "");
  const headline = escapeHtml(site.headline || `Join ${businessName} & Earn ${rewardName}`);
  const subhead = escapeHtml(
    site.subhead ||
      `Become part of the ${industry} community. Earn points for visits, reviews, referrals, and engagement.`
  );

  const showQuiz = features.quiz !== false; // default true
  const showRewards = features.rewards !== false; // default true
  const showReviews = features.reviews !== false; // default true
  const showReferrals = features.referrals !== false; // default true

  const ctaHref = `/join/${encodeURIComponent(tenantSlug)}`;
  const intakeHref = `/intake.html?tenant=${encodeURIComponent(tenantSlug)}`;
  const dashboardHref = `/dashboard.html?tenant=${encodeURIComponent(tenantSlug)}`;

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${businessName} logo" style="max-height:72px; max-width:240px; margin:0 auto 14px; display:block;" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${businessName} • Community</title>
  <style>
    body { font-family: Arial, sans-serif; background:#000; color:#fff; margin:0; padding:0; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 28px 18px; }
    .card { background:#0f172a; border:2px solid ${primaryColor}; border-radius:18px; padding:24px; }
    h1 { color:${primaryColor}; margin: 8px 0 10px; font-size: 34px; }
    p { color:#cbd5e1; line-height:1.45; }
    .cta { display:inline-block; padding:12px 16px; border-radius:12px; background:${primaryColor}; color:#000; font-weight:800; text-decoration:none; margin-top:14px; }
    .cta:hover { filter: brightness(0.95); }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
    .tile { background:#0b1020; border:1px solid #334155; border-radius:14px; padding:14px; }
    .tile h3 { margin:0 0 6px; color:#93c5fd; font-size: 16px; }
    .meta { color:#94a3b8; font-size:12px; margin-top: 14px; }
    .links a { color:#93c5fd; text-decoration:none; }
    .links a:hover { color:#bfdbfe; }
    @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      ${logoBlock}
      <div class="meta">Tenant: ${escapeHtml(tenantSlug)}</div>
      <h1>${headline}</h1>
      <p>${subhead}</p>

      <a class="cta" href="${ctaHref}">Join & Start Earning</a>

      <div class="grid">
        ${
          showRewards
            ? `<div class="tile"><h3>${rewardName}</h3><p>Earn points for actions and unlock offers.</p></div>`
            : ""
        }
        ${
          showQuiz
            ? `<div class="tile"><h3>Owner Intelligence Quiz</h3><p>Take the assessment to unlock recommendations.</p><div class="meta"><a class="links" href="${intakeHref}">Open Intake</a></div></div>`
            : ""
        }
        ${
          showReviews
            ? `<div class="tile"><h3>Reviews</h3><p>Leave a review and earn points (if enabled).</p></div>`
            : ""
        }
        ${
          showReferrals
            ? `<div class="tile"><h3>Referrals</h3><p>Invite others and earn bonus credits (if enabled).</p></div>`
            : ""
        }
      </div>

      <div class="meta links">
        <a href="${intakeHref}">Intake</a> •
        <a href="/index.html?tenant=${encodeURIComponent(tenantSlug)}">CX Engine</a> •
        <a href="/admin.html?tenant=${encodeURIComponent(tenantSlug)}">Admin</a> •
        <a href="${dashboardHref}">Dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateTenantSite({ tenantSlug, config = {} }) {
  const site = config.site || {};
  const features = (config.features && typeof config.features === "object") ? config.features : {};

  const landing = buildLandingHtml({ tenantSlug, site, features });

  return {
    version: 1,
    pages: {
      landing
    }
  };
}

module.exports = { generateTenantSite };
