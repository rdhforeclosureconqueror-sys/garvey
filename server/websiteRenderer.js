"use strict";

const { listWebsiteTemplates, getWebsiteTemplate, normalizeWebsiteSite, safeUrl } = require("./websiteCatalog");
const fs = require("node:fs");
const path = require("node:path");
const css = fs.readFileSync(path.join(__dirname, "../public/website.css"), "utf8");
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function templateCard(template) {
  return `<article class="template-card"><a class="mini-site mini-${esc(template.id)}" href="${esc(template.preview_path)}" target="_blank" rel="noopener" aria-label="Preview ${esc(template.name)} layout"><span class="mini-nav">YOUR BUSINESS <span>↗</span></span><span class="mini-head">A place for<br>your next<br>big thing.</span><span class="mini-line"></span><span class="mini-button">Let’s get started ↗</span><span class="mini-grid"><i></i><i></i><i></i></span></a><div class="template-heading"><h3>${esc(template.name)}</h3><span class="tag">0${listWebsiteTemplates().indexOf(template) + 1}</span></div><p>${esc(template.description)}</p><a class="text-link" href="/site_intake.html?template=${esc(template.id)}">Use ${esc(template.name)} <span aria-hidden="true">↗</span></a></article>`;
}

function renderWebsite({ tenantSlug, site: rawSite, websiteService = false }) {
  const site = normalizeWebsiteSite(rawSite);
  const template = getWebsiteTemplate(site.template_id) || getWebsiteTemplate("clean");
  const name = site.business_name || tenantSlug;
  const action = safeUrl(site.cta_url, "#contact");
  const actionText = site.cta_text || "Get in touch";
  const serviceName = websiteService ? "GARVEY / WEBSITES" : name;
  const servicesTitle = websiteService ? "Your business. Your story. Your next step." : "What we offer";
  const accent = site.primary_color || template.accent;
  const channels = accent.slice(1).match(/../g).map((value) => parseInt(value, 16));
  const buttonInk = channels[0] * .299 + channels[1] * .587 + channels[2] * .114 > 155 ? "#122012" : "#ffffff";
  const logo = site.logo_url ? `<img class="brand-logo" src="${esc(site.logo_url)}" alt="" referrerpolicy="no-referrer">` : "";
  const heroAside = websiteService ? `<div class="hero-composition" aria-label="Example landing page layout"><div class="composition-top"><span>YOUR NEXT CHAPTER</span><span>01 / 05</span></div><div class="composition-page"><span class="eyebrow">MADE FOR YOUR BUSINESS</span><div class="composition-title">Great work.<br>Meet the world.</div><div class="composition-rule"></div><div class="composition-bottom"><span>Your offer.<br>Your voice.</span><span class="circle-arrow" aria-hidden="true">↗</span></div></div><div class="composition-caption">ONE PAGE. A CLEAR NEXT STEP.</div></div>` : `<aside class="hero-aside"><span class="eyebrow">${esc(site.industry || "AT A GLANCE")}</span><h2>${esc(site.services[0] || "Let’s get started")}</h2><p>${esc(site.location || site.subheadline)}</p><a class="text-link" href="${esc(action)}">${esc(actionText)} ↗</a></aside>`;
  const gallery = websiteService ? `<section class="section" id="templates"><div class="section-heading"><div><span class="eyebrow">FIND YOUR STARTING POINT</span><h2>One idea.<br>Five ways to show it.</h2></div><p>Pick a layout that feels like your business.<br>Then make the words, color, and call to action yours.</p></div><div class="template-grid">${listWebsiteTemplates().map(templateCard).join("")}</div></section>` : "";
  const steps = websiteService ? `<section class="section process" id="how-it-works"><span class="eyebrow">FROM IDEA TO YOUR OWN LINK</span><h2>Start with what you already know.</h2><div class="steps"><article><span>01</span><h3>Choose your look.</h3><p>Preview the five layouts and choose a starting point.</p></article><article><span>02</span><h3>Tell your story.</h3><p>Add your business, services, contact details, and the action you want visitors to take.</p></article><article><span>03</span><h3>Preview. Publish. Share.</h3><p>Check your page, publish from your owner account, and share your business link.</p></article></div></section>` : "";
  const locationBlock = site.location || site.hours || site.phone ? `<section class="contact-details" id="details"><h2>Come say hello.</h2>${site.location ? `<p>${esc(site.location)}</p>` : ""}${site.hours ? `<p class="preserve-lines">${esc(site.hours)}</p>` : ""}${site.phone ? `<p>${esc(site.phone)}</p>` : ""}</section>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${esc(site.subheadline)}"><title>${esc(name)}${websiteService ? " — Landing pages for your next chapter" : ""}</title><style>${css}</style></head>
<body class="layout-${esc(template.id)}${websiteService ? " website-service" : ""}" style="--accent:${esc(accent)};--button-ink:${buttonInk}"><a class="skip-link" href="#main">Skip to content</a>
<header class="site-nav"><a class="brand" href="${websiteService ? "/websites.html" : "#main"}">${logo}<span>${esc(serviceName)}</span></a><nav aria-label="Main navigation"><a href="${websiteService ? "#templates" : "#services"}">${websiteService ? "The layouts" : "Services"}</a>${websiteService ? '<a href="#how-it-works">How it works</a>' : ""}<a class="button button-small" href="${websiteService ? "/site_intake.html" : esc(action)}">${websiteService ? "Create your page" : esc(actionText)} <span aria-hidden="true">↗</span></a></nav></header>
<main id="main"><section class="hero"><div class="hero-copy"><span class="eyebrow">${websiteService ? "YOUR BUSINESS DESERVES TO BE SEEN" : esc(site.industry || "WELCOME TO " + name)}</span><h1>${esc(site.headline || name)}</h1><p class="lead">${esc(site.subheadline)}</p><div class="actions"><a class="button" href="${esc(action)}">${esc(actionText)} <span aria-hidden="true">↗</span></a>${websiteService ? '<a class="text-link" href="#templates">Explore the layouts</a>' : ""}</div>${websiteService ? '<p class="hero-note">For independent businesses, local services, and personal brands.</p>' : ""}</div>${heroAside}</section>
${websiteService ? '<div class="ticker" aria-label="Page features"><span>Your own words</span><span aria-hidden="true">✳</span><span>Made for mobile</span><span aria-hidden="true">✳</span><span>One clear action</span><span aria-hidden="true">✳</span><span>A link to share</span></div>' : ""}
${site.template_id === "local" ? locationBlock : ""}
${gallery}
<section class="section" id="services"><div class="section-heading"><div><span class="eyebrow">${websiteService ? "A FOCUSED FIRST IMPRESSION" : "OUR SERVICES"}</span><h2>${esc(servicesTitle)}</h2></div>${site.about ? `<p>${esc(site.about)}</p>` : ""}</div><div class="service-grid">${site.services.map((service, i) => `<article><span class="number">0${i + 1}</span><h3>${esc(service)}</h3></article>`).join("")}</div>${site.value_props.length ? `<ul class="value-props">${site.value_props.map((prop) => `<li>${esc(prop)}</li>`).join("")}</ul>` : ""}</section>
${steps}
${site.template_id !== "local" ? locationBlock : ""}
<section class="closing" id="contact"><span class="eyebrow">${websiteService ? "MAKE YOUR NEXT MOVE" : esc(name)}</span><h2>${websiteService ? "Your next chapter<br>starts with one page." : "Let’s take the next step."}</h2><a class="button" href="${esc(action)}">${esc(actionText)} <span aria-hidden="true">↗</span></a>${websiteService ? '<p>Browse the layouts. Sign in when you’re ready to build.</p>' : ""}</section></main>
<footer class="site-footer"><a class="brand" href="/websites.html">GARVEY${websiteService ? " / WEBSITES" : ""}</a><span>${websiteService ? "A place for what you’re building." : "Built with GARVEY Websites"}</span>${websiteService ? '<a href="/index.html">Owner sign in ↗</a>' : ""}</footer></body></html>`;
}

module.exports = { renderWebsite, templateCard };
