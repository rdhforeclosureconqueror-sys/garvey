"use strict";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeAction(action, fallbackLabel) {
  if (!action || typeof action !== "object") {
    return null;
  }
  const label = String(action.label || fallbackLabel || "Open").trim();
  const url = String(action.url || action.href || "").trim();
  if (!label || !url) {
    return null;
  }
  return {
    label,
    url,
  };
}

function normalizeActionList(value, fallbackList = []) {
  const list = Array.isArray(value) ? value : fallbackList;
  return list
    .map((item, index) => normalizeAction(item, `Action ${index + 1}`))
    .filter(Boolean)
    .slice(0, 4);
}


function normalizeTemplateRuntime(value) {
  if (!value || typeof value !== "object") {
    return { modules: [] };
  }
  return {
    modules: Array.isArray(value.modules) ? value.modules.filter((module) => module && typeof module === "object") : [],
  };
}

function getRuntimeModule(runtime, moduleId) {
  return runtime.modules.find((module) => String(module.module_id || "").trim() === moduleId) || null;
}

function moduleEnabled(moduleState, fallback = true) {
  if (!moduleState) return fallback;
  return moduleState.enabled !== false;
}

function buildTapHubViewModel(resolvedBody) {
  const resolution = resolvedBody && resolvedBody.resolution ? resolvedBody.resolution : {};
  const config = resolvedBody && resolvedBody.business_config && typeof resolvedBody.business_config === "object"
    ? resolvedBody.business_config
    : {};

  const brand = config.brand && typeof config.brand === "object" ? config.brand : {};
  const actions = config.actions && typeof config.actions === "object" ? config.actions : {};
  const social = config.social && typeof config.social === "object" ? config.social : {};
  const business = config.business && typeof config.business === "object" ? config.business : {};

  const templateRuntime = normalizeTemplateRuntime(resolvedBody && resolvedBody.template_runtime);
  const heroModule = getRuntimeModule(templateRuntime, "hero");
  const primaryModule = getRuntimeModule(templateRuntime, "primary_cta");
  const servicesModule = getRuntimeModule(templateRuntime, "services");
  const socialModule = getRuntimeModule(templateRuntime, "social_links");
  const businessModule = getRuntimeModule(templateRuntime, "business_info");

  const primaryActions = moduleEnabled(primaryModule, true)
    ? normalizeActionList(actions.primary, [
      {
        label: String(primaryModule && primaryModule.config && primaryModule.config.label || "Get Started").trim() || "Get Started",
        url: String(primaryModule && primaryModule.config && primaryModule.config.url || resolution.destination_path || "/tap-crm").trim() || (resolution.destination_path || "/tap-crm"),
      },
    ])
    : [];

  const secondaryActions = normalizeActionList(actions.secondary, [
    {
      label: "Contact Business",
      url: "tel:" + String(business.phone || "").replace(/\s+/g, ""),
    },
  ]).filter((action) => !action.url.endsWith("tel:"));

  const featuredServices = Array.isArray(servicesModule && servicesModule.config && servicesModule.config.featured)
    ? servicesModule.config.featured.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 6)
    : [];

  const socialLinks = [
    ["instagram", social.instagram],
    ["facebook", social.facebook],
    ["tiktok", social.tiktok],
    ["x", social.x],
    ["youtube", social.youtube],
  ]
    .map(([network, url]) => {
      const value = String(url || "").trim();
      if (!value) {
        return null;
      }
      return { network, url: value };
    })
    .filter(Boolean)
    .slice(0, 5);

  const businessItems = [
    { key: "Phone", value: business.phone || "" },
    { key: "Email", value: business.email || "" },
    { key: "Address", value: business.address || "" },
    { key: "Hours", value: business.hours || "" },
  ].filter((item) => String(item.value || "").trim());

  return {
    routeNamespace: resolvedBody.route_namespace || "tap-crm",
    tenant: String(resolution.tenant || "").trim(),
    tagCode: String(resolution.tag_code || "").trim(),
    pageTitle: String(brand.name || resolution.label || "Tap Hub").trim() || "Tap Hub",
    headline: String(brand.headline || (heroModule && heroModule.config && heroModule.config.headline) || resolution.label || "Welcome").trim() || "Welcome",
    subheadline: String(brand.subheadline || (heroModule && heroModule.config && heroModule.config.subheadline) || "Tap to choose your next step.").trim(),
    logoUrl: String(brand.logo_url || "").trim(),
    primaryActions,
    secondaryActions,
    socialLinks,
    businessName: String(business.name || brand.name || resolution.tenant || "Our Business").trim() || "Our Business",
    businessItems,
    featuredServices,
    modules: {
      primaryEnabled: moduleEnabled(primaryModule, true),
      secondaryEnabled: true,
      socialEnabled: moduleEnabled(socialModule, true),
      businessEnabled: moduleEnabled(businessModule, true),
      servicesEnabled: moduleEnabled(servicesModule, false),
    },
  };
}

function renderActions(actions, zoneClass) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return '<p class="zone-empty">No actions available right now.</p>';
  }

  return `
    <div class="action-grid ${zoneClass}">
      ${actions
        .map((action) => `
          <a class="action-btn" href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a>
        `)
        .join("")}
    </div>
  `;
}

function renderTapHubPage(viewModel) {
  const logoMarkup = viewModel.logoUrl
    ? `<img class="brand-logo" src="${escapeHtml(viewModel.logoUrl)}" alt="${escapeHtml(viewModel.pageTitle)} logo" />`
    : "";

  const socialMarkup = viewModel.socialLinks.length > 0
    ? `<div class="social-links">${viewModel.socialLinks
      .map((social) => `<a href="${escapeHtml(social.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(social.network)}</a>`)
      .join("")}</div>`
    : '<p class="zone-empty">No social links published.</p>';

  const businessMarkup = viewModel.businessItems.length > 0
    ? `<dl class="business-list">${viewModel.businessItems
      .map((item) => `<div><dt>${escapeHtml(item.key)}</dt><dd>${escapeHtml(item.value)}</dd></div>`)
      .join("")}</dl>`
    : '<p class="zone-empty">Business details are being updated.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(viewModel.pageTitle)}</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f5f7fb; color: #101828; }
      main { max-width: 520px; margin: 0 auto; padding: 18px 16px 40px; }
      .card { background: #fff; border-radius: 16px; padding: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); margin-bottom: 12px; }
      .brand-logo { width: 64px; height: 64px; object-fit: cover; border-radius: 12px; display: block; margin-bottom: 12px; }
      h1 { font-size: 1.35rem; margin: 0 0 6px; }
      .sub { margin: 0; color: #475467; font-size: 0.95rem; }
      h2 { font-size: 1rem; margin: 0 0 10px; }
      .action-grid { display: grid; gap: 10px; }
      .action-btn { text-decoration: none; text-align: center; padding: 12px; border-radius: 10px; font-weight: 600; }
      .primary-zone .action-btn { background: #1570ef; color: #fff; }
      .secondary-zone .action-btn { background: #eef4ff; color: #175cd3; }
      .social-links { display: flex; flex-wrap: wrap; gap: 8px; }
      .social-links a { text-decoration: none; background: #f2f4f7; color: #344054; padding: 7px 10px; border-radius: 999px; font-size: 0.85rem; }
      .business-list { margin: 0; }
      .business-list div { margin-bottom: 8px; }
      .business-list dt { font-size: 0.78rem; color: #667085; text-transform: uppercase; letter-spacing: .03em; }
      .business-list dd { margin: 2px 0 0; font-size: .95rem; }
      .zone-empty { margin: 0; color: #667085; font-size: 0.9rem; }
      .meta { margin-top: 10px; font-size: 0.75rem; color: #98a2b3; }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        ${logoMarkup}
        <h1>${escapeHtml(viewModel.headline)}</h1>
        <p class="sub">${escapeHtml(viewModel.subheadline)}</p>
      </section>

      ${viewModel.modules.primaryEnabled ? `
      <section class="card">
        <h2>Primary actions</h2>
        ${renderActions(viewModel.primaryActions, "primary-zone")}
      </section>` : ""}

      ${viewModel.modules.secondaryEnabled ? `
      <section class="card">
        <h2>Secondary actions</h2>
        ${renderActions(viewModel.secondaryActions, "secondary-zone")}
      </section>` : ""}

      ${viewModel.modules.servicesEnabled ? `
      <section class="card">
        <h2>Featured services</h2>
        ${viewModel.featuredServices.length ? `<ul>${viewModel.featuredServices.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : '<p class="zone-empty">No featured services configured.</p>'}
      </section>` : ""}

      ${viewModel.modules.socialEnabled ? `
      <section class="card">
        <h2>Social & brand</h2>
        <p class="sub" style="margin-bottom: 10px;">${escapeHtml(viewModel.businessName)}</p>
        ${socialMarkup}
      </section>` : ""}

      ${viewModel.modules.businessEnabled ? `
      <section class="card">
        <h2>Business info</h2>
        ${businessMarkup}
        <p class="meta">route namespace: ${escapeHtml(viewModel.routeNamespace)} · tenant: ${escapeHtml(viewModel.tenant)} · tag: ${escapeHtml(viewModel.tagCode)}</p>
      </section>` : ""}
    </main>
  </body>
</html>`;
}

function renderTapHubErrorPage({ statusCode, title, message }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; font-family: Inter, Arial, sans-serif; color: #0f172a; padding: 20px; }
      .panel { max-width: 420px; width: 100%; background: #fff; border-radius: 14px; padding: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); text-align: center; }
      .code { color: #475569; font-size: 0.85rem; margin-bottom: 8px; }
      h1 { margin: 0 0 8px; font-size: 1.25rem; }
      p { margin: 0; color: #334155; }
    </style>
  </head>
  <body>
    <div class="panel">
      <div class="code">Status ${Number(statusCode) || 400}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
    </div>
  </body>
</html>`;
}

module.exports = {
  buildTapHubViewModel,
  renderTapHubPage,
  renderTapHubErrorPage,
  normalizeTemplateRuntime,
};
