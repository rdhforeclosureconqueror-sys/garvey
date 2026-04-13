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

function appendQueryParams(url, params = {}) {
  const raw = String(url || "").trim();
  if (!raw) return raw;
  if (/^javascript:/i.test(raw) || /^mailto:/i.test(raw) || /^tel:/i.test(raw)) return raw;
  const [base, hashPart] = raw.split("#");
  const separator = base.includes("?") ? "&" : "?";
  const query = Object.entries(params)
    .map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)])
    .filter(([, value]) => value.trim() !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  if (!query) return raw;
  const withQuery = `${base}${separator}${query}`;
  return hashPart !== undefined ? `${withQuery}#${hashPart}` : withQuery;
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
  const customerActionsModule = getRuntimeModule(templateRuntime, "customer_actions");
  const primaryModule = getRuntimeModule(templateRuntime, "primary_cta");
  const servicesModule = getRuntimeModule(templateRuntime, "services");
  const socialModule = getRuntimeModule(templateRuntime, "social_links");
  const businessModule = getRuntimeModule(templateRuntime, "business_info");
  const guideModule = getRuntimeModule(templateRuntime, "guide_assistant");

  const primaryActions = moduleEnabled(primaryModule, true)
    ? normalizeActionList(actions.primary, [
      {
        label: String(primaryModule && primaryModule.config && primaryModule.config.label || "Get Started").trim() || "Get Started",
        url: String(primaryModule && primaryModule.config && primaryModule.config.url || resolution.destination_path || "/tap-crm").trim() || (resolution.destination_path || "/tap-crm"),
      },
    ])
    : [];

  const attribution = resolution && resolution.attribution && typeof resolution.attribution === "object"
    ? resolution.attribution
    : {};
  const resolvedCampaignSlug = String(
    resolution.campaign_slug
    || (config.campaign && config.campaign.slug)
    || config.default_campaign_slug
    || ""
  ).trim();
  const attributionParams = {
    tenant: String(resolution.tenant || "").trim(),
    cid: resolvedCampaignSlug,
    tap_tag: String(resolution.tag_code || "").trim(),
    tap_source: String(attribution.source || "tap-hub").trim(),
    tap_session: String(attribution.tap_session_id || "").trim(),
  };

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

  const guideConfig = guideModule && guideModule.config && typeof guideModule.config === "object"
    ? guideModule.config
    : {};
  const guideSteps = Array.isArray(guideConfig.steps)
    ? guideConfig.steps.map((step) => String(step || "").trim()).filter(Boolean).slice(0, 5)
    : [];
  const customerActionsConfig = customerActionsModule && customerActionsModule.config && typeof customerActionsModule.config === "object"
    ? customerActionsModule.config
    : {};
  const linkConfig = config.links && typeof config.links === "object" ? config.links : {};
  const tenantSlug = String(resolution.tenant || "").trim();
  const tagCode = String(resolution.tag_code || "").trim();
  const resolveInternalLink = (fallbackPath, queryExtras = {}) => appendQueryParams(
    String(fallbackPath || "").trim(),
    {
      tenant: tenantSlug,
      cid: resolvedCampaignSlug,
      tag: tagCode,
      tap_source: attributionParams.tap_source,
      tap_session: attributionParams.tap_session,
      ...queryExtras,
    }
  );
  const paymentUrl = String(linkConfig.payment_url || "https://buy.stripe.com/00w5kw6Lv3YweZoffq8bS00").trim();
  const tipUrl = String(linkConfig.tip_url || "https://cash.app/$theEmpireinc").trim();
  const reviewUrl = String(linkConfig.review_url || "").trim();
  const rewardsUrl = String(linkConfig.rewards_url || "").trim();
  const vocUrl = String(linkConfig.voc_url || "").trim();
  const googleReviewUrl = String(linkConfig.google_review_url || config.google_review_url || "").trim();
  const customerJourneyBenefitsRaw = Array.isArray(customerActionsConfig.customer_journey_benefits)
    ? customerActionsConfig.customer_journey_benefits
    : [];
  const customerJourneyBenefits = customerJourneyBenefitsRaw
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 6);
  if (customerJourneyBenefits.length === 0) {
    customerJourneyBenefits.push(
      "Create your account",
      "Earn points",
      "Unlock discounts",
      "Leave feedback",
      "Build your rewards over time"
    );
  }
  const customerActionLinks = [
    { key: "checkin", type: "button", label: String(customerActionsConfig.check_in_label || "Check in").trim() || "Check in", eventType: "checkin_click", action: "open_checkin" },
    { key: "book", type: "button", label: String(customerActionsConfig.book_label || "Book").trim() || "Book", eventType: "booking_open", action: "open_booking" },
    { key: "pay", type: "link", label: String(customerActionsConfig.pay_label || "Pay now").trim() || "Pay now", eventType: "pay_click", href: paymentUrl, external: true },
    { key: "tip", type: "link", label: String(customerActionsConfig.tip_label || "Leave a tip").trim() || "Leave a tip", eventType: "tip_click", href: tipUrl, external: true },
  ].filter(Boolean);
  const customerSubActions = [
    { key: "review", label: String(customerActionsConfig.review_label || "Write a review").trim() || "Write a review", eventType: "review_click", href: reviewUrl || resolveInternalLink("/rewards.html", { focus: "review" }) },
    { key: "rewards", label: String(customerActionsConfig.rewards_label || "Rewards").trim() || "Rewards", eventType: "rewards_click", href: resolveInternalLink(rewardsUrl || "/rewards.html", { entry: "tap-hub" }) },
    { key: "voc", label: String(customerActionsConfig.voc_label || "VOC").trim() || "VOC", eventType: "voc_click", href: resolveInternalLink(vocUrl || "/voc.html", { entry: "tap-hub" }) },
    googleReviewUrl
      ? { key: "google_review", label: String(customerActionsConfig.google_review_label || "Google review").trim() || "Google review", eventType: "google_review_click", href: googleReviewUrl, external: true }
      : null,
  ].filter(Boolean);

  return {
    routeNamespace: resolvedBody.route_namespace || "tap-crm",
    tenant: tenantSlug,
    tagCode,
    pageTitle: String(brand.name || resolution.label || "Tap Hub").trim() || "Tap Hub",
    headline: String(brand.headline || (heroModule && heroModule.config && heroModule.config.headline) || resolution.label || "Welcome").trim() || "Welcome",
    subheadline: String(brand.subheadline || (heroModule && heroModule.config && heroModule.config.subheadline) || "Tap to choose your next step.").trim(),
    logoUrl: String(brand.logo_url || "").trim(),
    primaryActions: primaryActions.map((action) => ({
      ...action,
      url: appendQueryParams(action.url, attributionParams),
      bookingCta: /\bbook\b/i.test(action.label),
    })),
    secondaryActions,
    socialLinks,
    businessName: String(business.name || brand.name || resolution.tenant || "Our Business").trim() || "Our Business",
    businessItems,
    featuredServices,
    returnEngineUrl: resolveInternalLink(rewardsUrl || "/rewards.html", { entry: "tap-hub" }),
    customerActions: customerActionLinks,
    customerJourney: {
      title: String(customerActionsConfig.customer_journey_title || "Customer account & rewards").trim() || "Customer account & rewards",
      intro: String(customerActionsConfig.customer_journey_intro || "Create your account once and continue everything in one guided customer path.").trim() || "Create your account once and continue everything in one guided customer path.",
      benefits: customerJourneyBenefits,
      primaryCtaLabel: String(customerActionsConfig.customer_journey_cta_label || "Create account, earn points, get discounts").trim() || "Create account, earn points, get discounts",
      href: resolveInternalLink(rewardsUrl || "/rewards.html", { entry: "tap-hub" }),
    },
    customerSubActions,
    guide: {
      title: String(guideConfig.title || "How this works").trim() || "How this works",
      intro: String(guideConfig.intro || "Follow these quick steps to get started.").trim() || "Follow these quick steps to get started.",
      ctaLabel: String(guideConfig.cta_label || "Start now").trim() || "Start now",
      steps: guideSteps,
    },
    modules: {
      primaryEnabled: moduleEnabled(primaryModule, true),
      secondaryEnabled: true,
      socialEnabled: moduleEnabled(socialModule, true),
      businessEnabled: moduleEnabled(businessModule, true),
      servicesEnabled: moduleEnabled(servicesModule, false),
      guideEnabled: moduleEnabled(guideModule, true),
      customerActionsEnabled: moduleEnabled(customerActionsModule, true),
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
          ${action.bookingCta
            ? `<button class="action-btn booking-btn" type="button" data-booking-open>${escapeHtml(action.label)}</button>`
            : `<a class="action-btn" href="${escapeHtml(action.url)}" data-tap-event-type="${zoneClass === "primary-zone" ? "primary_action_click" : "secondary_action_click"}" data-tap-action-label="${escapeHtml(action.label)}">${escapeHtml(action.label)}</a>`}
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
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        background:
          radial-gradient(circle at 20% 10%, rgba(223, 35, 35, 0.35), transparent 35%),
          radial-gradient(circle at 80% 15%, rgba(11, 120, 61, 0.28), transparent 38%),
          linear-gradient(160deg, #0a0a0a 0%, #0f1720 52%, #101010 100%);
        color: #f8fafc;
      }
      main { max-width: 520px; margin: 0 auto; padding: 18px 16px 40px; }
      .card {
        background: linear-gradient(180deg, rgba(9, 9, 9, 0.92), rgba(16, 16, 16, 0.94));
        border-radius: 16px;
        padding: 16px;
        border: 1px solid rgba(230, 184, 93, 0.55);
        box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(230, 184, 93, 0.25);
        margin-bottom: 12px;
      }
      .hero-card {
        background:
          linear-gradient(120deg, rgba(168, 20, 20, 0.3), rgba(14, 116, 62, 0.25)),
          linear-gradient(180deg, rgba(8, 8, 8, 0.92), rgba(16, 16, 16, 0.96));
      }
      .brand-logo { width: 64px; height: 64px; object-fit: cover; border-radius: 12px; display: block; margin-bottom: 12px; border: 1px solid rgba(230, 184, 93, 0.65); }
      h1 { font-size: 1.35rem; margin: 0 0 6px; }
      .sub { margin: 0; color: #d1d5db; font-size: 0.95rem; }
      h2 { font-size: 1rem; margin: 0 0 10px; color: #fef3c7; }
      .action-grid { display: grid; gap: 10px; }
      .action-btn {
        text-decoration: none;
        text-align: center;
        padding: 12px;
        border-radius: 10px;
        font-weight: 700;
        border: 1px solid rgba(230, 184, 93, 0.65);
      }
      .primary-zone .action-btn { background: linear-gradient(135deg, #b91c1c, #7f1d1d); color: #fff; }
      .secondary-zone .action-btn { background: linear-gradient(135deg, #166534, #14532d); color: #ecfdf3; }
      .social-links { display: flex; flex-wrap: wrap; gap: 8px; }
      .social-links a { text-decoration: none; background: rgba(17, 24, 39, 0.8); color: #e5e7eb; padding: 7px 10px; border-radius: 999px; font-size: 0.85rem; border: 1px solid rgba(230,184,93,0.45); }
      .business-list { margin: 0; }
      .business-list div { margin-bottom: 8px; }
      .business-list dt { font-size: 0.78rem; color: #fcd34d; text-transform: uppercase; letter-spacing: .03em; }
      .business-list dd { margin: 2px 0 0; font-size: .95rem; color: #e5e7eb; }
      .zone-empty { margin: 0; color: #cbd5e1; font-size: 0.9rem; }
      .meta { margin-top: 10px; font-size: 0.75rem; color: #94a3b8; }
      .guide-trigger {
        width: 100%;
        border: 1px solid rgba(230, 184, 93, 0.7);
        background: linear-gradient(135deg, #111827, #0f172a);
        color: #fef3c7;
        border-radius: 10px;
        padding: 12px;
        font-weight: 700;
        text-align: left;
      }
      .guide-panel { margin-top: 10px; border: 1px solid rgba(230, 184, 93, 0.45); border-radius: 12px; padding: 12px; background: rgba(2, 6, 23, 0.7); }
      .guide-panel h3 { margin: 0 0 8px; color: #fef3c7; }
      .guide-steps { margin: 0; padding-left: 20px; }
      .guide-steps li { margin-bottom: 6px; color: #e5e7eb; }
      .guide-cta { display: inline-block; margin-top: 8px; padding: 8px 12px; border-radius: 999px; background: #b91c1c; color: #fff; border: 1px solid rgba(230,184,93,0.7); text-decoration: none; }
      .checkin-gate { display: grid; gap: 8px; }
      .checkin-btn {
        width: 100%;
        border: 1px solid rgba(230, 184, 93, 0.75);
        background: linear-gradient(135deg, #166534, #14532d);
        color: #ecfdf3;
        border-radius: 10px;
        padding: 11px;
        font-weight: 700;
      }
      .booking-btn { width: 100%; }
      .booking-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .booking-modal-backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.72); display: grid; place-items: center; padding: 16px; z-index: 30; }
      .booking-modal-backdrop[hidden] { display: none !important; }
      .booking-modal { width: min(440px, 100%); border-radius: 14px; border: 1px solid rgba(230,184,93,0.65); background: #050a18; padding: 14px; }
      .booking-modal h3 { margin: 0 0 8px; }
      .booking-field { display: grid; gap: 6px; margin-top: 8px; }
      .booking-field input { width: 100%; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; padding: 9px; }
      .slot-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
      .slot { border-radius: 9px; border: 1px solid #64748b; padding: 8px 6px; text-align: center; background: #0b1322; color: #e2e8f0; }
      .slot.available { cursor: pointer; border-color: #16a34a; }
      .slot.unavailable { opacity: 0.45; border-color: #b91c1c; text-decoration: line-through; }
      .slot.selected { box-shadow: 0 0 0 2px rgba(230,184,93,0.8) inset; }
      .booking-actions { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; }
      .booking-actions button { flex: 1; border-radius: 8px; border: 1px solid rgba(230,184,93,0.55); padding: 10px; background: #111827; color: #fff; }
      .booking-status { margin-top: 8px; color: #cbd5e1; min-height: 20px; font-size: 0.88rem; }
      .quick-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
      .quick-actions a,
      .quick-actions button {
        text-decoration: none;
        border: 1px solid rgba(230,184,93,0.65);
        border-radius: 10px;
        padding: 10px;
        font-weight: 700;
        text-align: center;
        background: linear-gradient(135deg, #111827, #0f172a);
        color: #f8fafc;
      }
      .journey-card { border-color: rgba(251, 191, 36, 0.8); background: linear-gradient(150deg, rgba(120, 53, 15, 0.28), rgba(15, 23, 42, 0.85)); }
      .journey-list { margin: 10px 0 12px; padding-left: 20px; color: #fef3c7; }
      .journey-list li { margin-bottom: 6px; }
      .journey-primary {
        display: block;
        text-decoration: none;
        text-align: center;
        border: 1px solid rgba(251, 191, 36, 0.9);
        border-radius: 10px;
        padding: 12px;
        font-weight: 800;
        background: linear-gradient(135deg, #b45309, #92400e);
        color: #fff7ed;
      }
      .journey-sub-actions {
        margin-top: 10px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .journey-sub-actions a {
        text-decoration: none;
        color: #fde68a;
        font-size: 0.84rem;
        border-bottom: 1px dashed rgba(253, 230, 138, 0.7);
      }
      .flow-modal-backdrop { position: fixed; inset: 0; background: rgba(2, 6, 23, 0.72); display: grid; place-items: center; padding: 16px; z-index: 40; }
      .flow-modal-backdrop[hidden] { display: none !important; }
      .flow-modal { width: min(420px, 100%); border-radius: 14px; border: 1px solid rgba(230,184,93,0.65); background: #050a18; padding: 14px; }
      .flow-modal h3 { margin: 0 0 8px; }
      .flow-actions { display: flex; gap: 8px; margin-top: 12px; }
      .flow-actions button { flex: 1; border-radius: 8px; border: 1px solid rgba(230,184,93,0.55); padding: 10px; background: #111827; color: #fff; }
      .booking-result { margin-top: 8px; border: 1px solid rgba(22,163,74,0.6); background: rgba(20,83,45,0.45); border-radius: 10px; padding: 10px; color: #dcfce7; }
      .page-notice { margin-bottom: 12px; border: 1px solid rgba(22,163,74,0.65); border-radius: 10px; padding: 10px; background: rgba(22,163,74,0.2); color: #dcfce7; }
      .consent-card-copy { margin: 0 0 8px; color: #d1d5db; font-size: 0.9rem; line-height: 1.45; }
      .consent-card-actions { display: grid; gap: 8px; }
      .consent-card-actions input {
        width: 100%;
        border-radius: 8px;
        border: 1px solid #475569;
        background: #0f172a;
        color: #f8fafc;
        padding: 10px;
      }
      .consent-revoke-btn {
        border-radius: 10px;
        border: 1px solid rgba(248, 113, 113, 0.75);
        background: linear-gradient(135deg, #7f1d1d, #450a0a);
        color: #fee2e2;
        padding: 11px;
        font-weight: 700;
      }
      .consent-helper-link { color: #fef3c7; font-size: 0.85rem; text-decoration: underline; }
      .consent-status { min-height: 20px; color: #e2e8f0; font-size: 0.85rem; }
      body.modal-active { overflow: hidden; touch-action: none; }
    </style>
  </head>
  <body>
    <main>
      <div class="page-notice" id="pageNotice" hidden></div>
      <section class="card hero-card">
        ${logoMarkup}
        <h1>${escapeHtml(viewModel.headline)}</h1>
        <p class="sub">${escapeHtml(viewModel.subheadline)}</p>
      </section>

      ${viewModel.modules.guideEnabled ? `
      <section class="card">
        <button class="guide-trigger" type="button" aria-expanded="false" aria-controls="tap-guide-panel" data-guide-toggle>
          Virtual Guide · Tap for steps
        </button>
        <div class="guide-panel" id="tap-guide-panel" hidden>
          <h3>${escapeHtml(viewModel.guide.title)}</h3>
          <p class="sub" style="margin-bottom: 8px;">${escapeHtml(viewModel.guide.intro)}</p>
          ${viewModel.guide.steps.length ? `<ol class="guide-steps">${viewModel.guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : '<p class="zone-empty">Guide steps are being prepared.</p>'}
          <a class="guide-cta" href="#primary-actions">${escapeHtml(viewModel.guide.ctaLabel)}</a>
        </div>
      </section>` : ""}

      <section class="card">
        <h2>Check-in first</h2>
        <div class="checkin-gate">
          <p class="sub">Start your guided check-in before entering booking.</p>
          <button class="checkin-btn" type="button" data-checkin-enter>Start check-in</button>
        </div>
      </section>

      ${viewModel.modules.customerActionsEnabled ? `<section class="card">
        <h2>Customer actions</h2>
        <div class="quick-actions">
          ${viewModel.customerActions.map((action) => (
            action.type === "button"
              ? `<button type="button" ${action.action === "open_checkin" ? "data-checkin-open" : "data-booking-open"}>${escapeHtml(action.label)}</button>`
              : `<a href="${escapeHtml(action.href)}" ${action.external ? 'target="_blank" rel="noopener noreferrer"' : ""} data-tap-event-type="${escapeHtml(action.eventType)}">${escapeHtml(action.label)}</a>`
          )).join("")}
        </div>
      </section>` : ""}

      ${viewModel.modules.customerActionsEnabled ? `<section class="card journey-card">
        <h2>${escapeHtml(viewModel.customerJourney.title)}</h2>
        <p class="sub">${escapeHtml(viewModel.customerJourney.intro)}</p>
        <ul class="journey-list">
          ${viewModel.customerJourney.benefits.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
        <a class="journey-primary" href="${escapeHtml(viewModel.customerJourney.href)}" data-tap-event-type="return_engine_click">${escapeHtml(viewModel.customerJourney.primaryCtaLabel)}</a>
        ${viewModel.customerSubActions.length ? `<div class="journey-sub-actions">
          ${viewModel.customerSubActions.map((action) => (
            `<a href="${escapeHtml(action.href)}" ${action.external ? 'target="_blank" rel="noopener noreferrer"' : ""} data-tap-event-type="${escapeHtml(action.eventType)}">${escapeHtml(action.label)}</a>`
          )).join("")}
        </div>` : ""}
      </section>` : ""}

      <section class="card">
        <h2>Assessment permission</h2>
        <p class="consent-card-copy">You can revoke assessment permission at any time. This immediately removes VOC/assessment profile access and requires new consent before VOC can be used again. Check-in, booking, pay, and tip continue to work.</p>
        <div class="consent-card-actions">
          <input id="revokeEmailInput" type="email" placeholder="Enter your email to revoke assessment permission" autocomplete="email" />
          <button type="button" class="consent-revoke-btn" id="revokeAssessmentBtn">Revoke assessment permission</button>
          <a class="consent-helper-link" id="reconsentVocLink" href="/voc.html">Need VOC later? Re-consent in VOC.</a>
          <div class="consent-status" id="revokeAssessmentStatus" aria-live="polite"></div>
        </div>
      </section>

      ${viewModel.modules.primaryEnabled ? `
      <section class="card" id="primary-actions">
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
    <div class="flow-modal-backdrop" id="checkinBackdrop" hidden>
      <section class="flow-modal" role="dialog" aria-modal="true" aria-labelledby="checkinTitle">
        <h3 id="checkinTitle">Check in to get started</h3>
        <p class="sub">Welcome in. Check in first, or cancel to continue to Tap Hub actions.</p>
        <div class="flow-actions">
          <button type="button" id="checkinCancelBtn">Cancel</button>
          <button type="button" id="checkinConfirmBtn">Check in</button>
        </div>
      </section>
    </div>
    <div class="booking-modal-backdrop" id="bookingBackdrop" hidden>
      <section class="booking-modal" role="dialog" aria-modal="true" aria-labelledby="bookingTitle">
        <h3 id="bookingTitle">Book your appointment</h3>
        <p class="sub">Select a date and available time slot.</p>
        <div class="booking-field">
          <label for="bookingDate">Date</label>
          <input id="bookingDate" type="date" />
        </div>
        <div class="slot-grid" id="bookingSlots"></div>
        <div class="booking-field">
          <label for="bookingName">Your name (optional)</label>
          <input id="bookingName" type="text" maxlength="100" />
        </div>
        <div class="booking-status" id="bookingStatus"></div>
        <div class="booking-result" id="bookingResult" hidden></div>
        <div class="booking-actions">
          <button type="button" id="bookingCancelBtn">Cancel</button>
          <button type="button" id="bookingConfirmBtn">Confirm booking</button>
        </div>
      </section>
    </div>
    <script>
      (function () {
        var tagCode = ${JSON.stringify(viewModel.tagCode)};
        var tenantSlug = ${JSON.stringify(viewModel.tenant)};
        var tapSessionId = (new URLSearchParams(window.location.search).get("tap_session") || "").trim();
        var telemetryEndpoint = "/api/tap-crm/public/tags/" + encodeURIComponent(tagCode) + "/events";
        var toggle = document.querySelector("[data-guide-toggle]");
        var panel = document.getElementById("tap-guide-panel");
        if (toggle && panel) {
          toggle.addEventListener("click", function () {
            var expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", expanded ? "false" : "true");
            panel.hidden = expanded;
          });
        }

        var bookingOpenButtons = Array.prototype.slice.call(document.querySelectorAll("[data-booking-open]"));
        var checkInBtn = document.querySelector("[data-checkin-enter]");
        var checkInQuickOpenButtons = Array.prototype.slice.call(document.querySelectorAll("[data-checkin-open]"));
        var checkinBackdrop = document.getElementById("checkinBackdrop");
        var checkinCancelBtn = document.getElementById("checkinCancelBtn");
        var checkinConfirmBtn = document.getElementById("checkinConfirmBtn");
        var pageNotice = document.getElementById("pageNotice");
        var backdrop = document.getElementById("bookingBackdrop");
        var dateInput = document.getElementById("bookingDate");
        var slotsEl = document.getElementById("bookingSlots");
        var statusEl = document.getElementById("bookingStatus");
        var bookingResultEl = document.getElementById("bookingResult");
        var cancelBtn = document.getElementById("bookingCancelBtn");
        var confirmBtn = document.getElementById("bookingConfirmBtn");
        var bookingNameInput = document.getElementById("bookingName");
        var revokeEmailInput = document.getElementById("revokeEmailInput");
        var revokeAssessmentBtn = document.getElementById("revokeAssessmentBtn");
        var revokeAssessmentStatus = document.getElementById("revokeAssessmentStatus");
        var reconsentVocLink = document.getElementById("reconsentVocLink");
        var selectedSlot = "";
        var bookingUnlocked = false;
        var submitPending = false;
        var activeModal = null;

        function logTapEvent(eventType, metadata) {
          var payload = {
            event_type: String(eventType || "").trim(),
            tap_session_id: tapSessionId,
            metadata: metadata && typeof metadata === "object" ? metadata : {},
          };
          if (!payload.event_type) return Promise.resolve();
          return fetch(telemetryEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            keepalive: true,
            body: JSON.stringify(payload),
          }).catch(function () { return null; });
        }

        Array.prototype.forEach.call(document.querySelectorAll("a[data-tap-event-type]"), function (anchor) {
          anchor.addEventListener("click", function () {
            return logTapEvent(anchor.getAttribute("data-tap-event-type"), {
              action_label: anchor.getAttribute("data-tap-action-label") || anchor.textContent || "",
              href: anchor.getAttribute("href") || "",
              tenant: tenantSlug,
            });
          });
        });

        function toDateString(date) { return date.toISOString().slice(0, 10); }
        function oneWeekOut() { var now = new Date(); now.setUTCDate(now.getUTCDate() + 7); return toDateString(now); }
        function setStatus(text) { statusEl.textContent = text || ""; }
        function toDisplayTime(time24) {
          var normalized = String(time24 || "").trim();
          var match = normalized.match(/^(\\d{2}):(\\d{2})(?::\\d{2})?$/);
          if (!match) return normalized;
          var hours = Number(match[1]);
          var minutes = Number(match[2]);
          if (Number.isNaN(hours) || Number.isNaN(minutes)) return normalized;
          var suffix = hours >= 12 ? "PM" : "AM";
          var normalizedHour = hours % 12 || 12;
          return normalizedHour + ":" + String(minutes).padStart(2, "0") + " " + suffix;
        }
        function setConfirmEnabled(enabled) {
          if (!confirmBtn) return;
          confirmBtn.disabled = !enabled;
        }
        function showBookingResult(text) {
          if (!bookingResultEl) return;
          bookingResultEl.hidden = !text;
          bookingResultEl.textContent = text || "";
        }
        function showPageNotice(text) {
          if (!pageNotice) return;
          pageNotice.hidden = !text;
          pageNotice.textContent = text || "";
        }
        function showRevokeStatus(text, isError) {
          if (!revokeAssessmentStatus) return;
          revokeAssessmentStatus.textContent = text || "";
          revokeAssessmentStatus.style.color = isError ? "#fecaca" : "#bbf7d0";
        }
        function resolveEmailFromQuery() {
          var queryEmail = (new URLSearchParams(window.location.search).get("email") || "").trim().toLowerCase();
          return queryEmail;
        }
        function updateBookingEntryState() {
          bookingOpenButtons.forEach(function (button) {
            button.disabled = !bookingUnlocked;
            button.title = bookingUnlocked ? "" : "Complete check-in first";
          });
        }
        function setBackdropState(target, isOpen) {
          if (!target) return;
          target.hidden = !isOpen;
          target.setAttribute("aria-hidden", isOpen ? "false" : "true");
        }
        function setBodyModalLock(isModalActive) {
          if (!document.body) return;
          document.body.classList.toggle("modal-active", Boolean(isModalActive));
        }
        function setActiveModal(nextModal) {
          activeModal = nextModal || null;
          setBackdropState(checkinBackdrop, activeModal === "checkin");
          setBackdropState(backdrop, activeModal === "booking");
          setBodyModalLock(Boolean(activeModal));
        }
        function renderSlots(items) {
          slotsEl.innerHTML = "";
          items.forEach(function (slot) {
            var button = document.createElement("button");
            button.type = "button";
            button.textContent = toDisplayTime(slot.time);
            button.className = "slot " + (slot.status === "available" ? "available" : "unavailable");
            button.disabled = slot.status !== "available";
            button.addEventListener("click", function () {
              selectedSlot = slot.time;
              Array.prototype.forEach.call(slotsEl.querySelectorAll(".slot"), function (item) { item.classList.remove("selected"); });
              button.classList.add("selected");
              setConfirmEnabled(true);
              setStatus("Selected " + toDisplayTime(selectedSlot) + ". Tap Confirm booking to continue.");
            });
            slotsEl.appendChild(button);
          });
          setConfirmEnabled(Boolean(selectedSlot));
        }
        function openCheckin() {
          if (!checkinBackdrop) return;
          logTapEvent("checkin_click", { source: "checkin_modal_open" });
          setActiveModal("checkin");
        }
        function closeCheckin() {
          if (!checkinBackdrop) return;
          if (activeModal === "checkin") setActiveModal(null);
        }
        function fetchAvailability() {
          var date = String(dateInput.value || "").trim();
          if (!date) return Promise.resolve(null);
          selectedSlot = "";
          setStatus("Loading availability...");
          showBookingResult("");
          return fetch("/api/tap-crm/public/tags/" + encodeURIComponent(tagCode) + "/booking/availability?date=" + encodeURIComponent(date))
            .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
            .then(function (result) {
              if (!result.ok) throw new Error(result.body.error || "Failed to load availability");
              renderSlots(Array.isArray(result.body.slots) ? result.body.slots : []);
              setStatus("Available slots are green. Unavailable slots are crossed out.");
              return result.body;
            })
            .catch(function (err) {
              renderSlots([]);
              setStatus(err.message || "Could not load availability.");
              return null;
            });
        }

        function buildReconsentHref(email) {
          var params = new URLSearchParams();
          if (tenantSlug) params.set("tenant", tenantSlug);
          if (email) params.set("email", email);
          return "/voc.html?" + params.toString();
        }

        function applyReconsentHref(email) {
          if (!reconsentVocLink) return;
          reconsentVocLink.setAttribute("href", buildReconsentHref(email));
        }
        function openBooking(event) {
          if (!backdrop) return;
          if (!event || event.type !== "click") return;
          if (!bookingUnlocked) {
            openCheckin();
            return;
          }
          logTapEvent("booking_open", { source: "booking_modal_open" });
          setActiveModal("booking");
          dateInput.value = oneWeekOut();
          setConfirmEnabled(false);
          showBookingResult("");
          fetchAvailability();
        }

        if (revokeEmailInput) {
          var prefillEmail = resolveEmailFromQuery();
          if (prefillEmail) revokeEmailInput.value = prefillEmail;
          applyReconsentHref(prefillEmail);
          revokeEmailInput.addEventListener("input", function () {
            applyReconsentHref(String(revokeEmailInput.value || "").trim().toLowerCase());
          });
        } else {
          applyReconsentHref("");
        }

        if (revokeAssessmentBtn) {
          revokeAssessmentBtn.addEventListener("click", function () {
            var email = String((revokeEmailInput && revokeEmailInput.value) || "").trim().toLowerCase();
            if (!tenantSlug) {
              showRevokeStatus("Missing tenant context for revocation.", true);
              return;
            }
            if (!email) {
              showRevokeStatus("Enter your email to revoke assessment permission.", true);
              return;
            }
            revokeAssessmentBtn.disabled = true;
            showRevokeStatus("Revoking assessment permission…", false);
            fetch("/api/consent/assessment/revoke", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                tenant: tenantSlug,
                email: email,
                consent_version: "v1",
              }),
            })
              .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body || {} }; }); })
              .then(function (result) {
                if (!result.ok || result.body.error) {
                  throw new Error(result.body.error || "Revocation failed");
                }
                showRevokeStatus("Assessment permission revoked. VOC is blocked until you re-consent.", false);
                showPageNotice("Assessment permission revoked for " + email + ". You can still check in, book, pay, and tip.");
                return logTapEvent("assessment_permission_revoked", { tenant: tenantSlug, email: email });
              })
              .catch(function (err) {
                showRevokeStatus(err.message || "Revocation failed.", true);
              })
              .finally(function () {
                revokeAssessmentBtn.disabled = false;
              });
          });
        }
        function closeBooking() {
          if (activeModal === "booking") setActiveModal(null);
          selectedSlot = "";
          if (bookingNameInput) bookingNameInput.value = "";
          setStatus("");
          showBookingResult("");
        }

        updateBookingEntryState();
        setActiveModal(null);
        if (checkInBtn) {
          checkInBtn.addEventListener("click", function () {
            logTapEvent("checkin_click", { source: "checkin_gate" });
            bookingUnlocked = true;
            updateBookingEntryState();
            checkInBtn.textContent = "Check-in complete";
            checkInBtn.disabled = true;
            closeCheckin();
          });
        }
        checkInQuickOpenButtons.forEach(function (button) { button.addEventListener("click", openCheckin); });
        if (checkinCancelBtn) checkinCancelBtn.addEventListener("click", closeCheckin);
        if (checkinBackdrop) {
          checkinBackdrop.addEventListener("click", function (event) {
            if (event.target === checkinBackdrop) closeCheckin();
          });
        }
        if (checkinConfirmBtn) {
          checkinConfirmBtn.addEventListener("click", function () {
            logTapEvent("checkin_click", { source: "checkin_confirm" });
            bookingUnlocked = true;
            updateBookingEntryState();
            if (checkInBtn) {
              checkInBtn.textContent = "Check-in complete";
              checkInBtn.disabled = true;
            }
            closeCheckin();
          });
        }
        bookingOpenButtons.forEach(function (button) { button.addEventListener("click", openBooking); });
        if (cancelBtn) cancelBtn.addEventListener("click", closeBooking);
        if (backdrop) {
          backdrop.addEventListener("click", function (event) {
            if (event.target === backdrop) closeBooking();
          });
        }
        if (dateInput) dateInput.addEventListener("change", fetchAvailability);
        document.addEventListener("keydown", function (event) {
          if (event.key !== "Escape") return;
          if (backdrop && !backdrop.hidden) return closeBooking();
          if (checkinBackdrop && !checkinBackdrop.hidden) return closeCheckin();
        });
        if (confirmBtn) {
          confirmBtn.addEventListener("click", function () {
            if (!selectedSlot) return setStatus("Please select an available time.");
            if (submitPending) return;
            submitPending = true;
            setConfirmEnabled(false);
            setStatus("Submitting booking...");
            var date = String(dateInput.value || "").trim();
            fetch("/api/tap-crm/public/tags/" + encodeURIComponent(tagCode) + "/booking/availability?date=" + encodeURIComponent(date))
              .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
              .then(function (result) {
                if (!result.ok) throw new Error(result.body.error || "Could not verify slot availability");
                var slots = Array.isArray(result.body.slots) ? result.body.slots : [];
                var selected = slots.find(function (slot) { return slot.time === selectedSlot; });
                if (!selected || selected.status !== "available") {
                  setStatus("That time was just taken. We refreshed availability so you can pick a new slot.");
                  return fetchAvailability().then(function () { return null; });
                }
                return fetch("/api/tap-crm/public/tags/" + encodeURIComponent(tagCode) + "/booking/reservations", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    date: date,
                    time: selectedSlot,
                    customer_name: (document.getElementById("bookingName") || {}).value || "",
                  }),
                })
                  .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body, status: res.status }; }); });
              })
              .then(function (result) {
                if (!result) return;
                if (!result.ok) {
                  if (result.status === 409 || result.body.error === "slot_unavailable") {
                    setStatus("That slot is no longer available. We refreshed the list.");
                    return fetchAvailability();
                  }
                  throw new Error(result.body.error || "Booking failed");
                }
                setStatus("");
                showPageNotice("Booking confirmed for " + result.body.reservation.booking_date + " at " + toDisplayTime(result.body.reservation.slot_time) + ".");
                logTapEvent("booking_submit", {
                  date: result.body.reservation.booking_date,
                  time: result.body.reservation.slot_time,
                  status: result.body.reservation.status || "booked",
                });
                return fetchAvailability().then(function () {
                  closeBooking();
                });
              })
              .catch(function (err) { setStatus(err.message || "Booking failed."); })
              .finally(function () {
                submitPending = false;
                setConfirmEnabled(Boolean(selectedSlot));
              });
          });
        }
      })();
    </script>
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
