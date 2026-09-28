"use strict";

const registry = require("../public/templates/registry.json");

function listWebsiteTemplates() { return registry.templates.filter((entry) => entry.generator === "native"); }
function getWebsiteTemplate(id) { return listWebsiteTemplates().find((entry) => entry.id === id) || null; }

function safeUrl(value, fallback = "") {
  const url = String(value || "").trim();
  if (!url || /[\u0000-\u0020\u007f\\]/.test(url)) return fallback;
  if (/^\/(?!\/)/.test(url) || /^#[a-zA-Z][\w-]*$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (["https:", "http:", "mailto:", "tel:"].includes(parsed.protocol)) return url;
  } catch (_) {}
  return fallback;
}

function normalizeWebsiteSite(input = {}, { validate = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Website details must be an object.");
  const output = {};
  const limits = { business_name: 100, headline: 160, subheadline: 320, about: 1500, cta_text: 60, cta_url: 1000, location: 240, hours: 400, phone: 80, industry: 80, logo_url: 1000 };
  for (const [key, limit] of Object.entries(limits)) output[key] = String(input[key] ?? "").trim().slice(0, limit);
  for (const key of ["services", "value_props"]) output[key] = Array.isArray(input[key]) ? input[key].slice(0, 12).map((v) => String(v).trim().slice(0, 240)).filter(Boolean) : [];
  output.template_id = String(input.template_id || input.template_type || "clean");
  output.primary_color = /^#[\da-f]{6}$/i.test(String(input.primary_color || "")) ? input.primary_color : "";
  output.cta_url = safeUrl(output.cta_url);
  output.logo_url = /^https?:\/\//i.test(output.logo_url) ? safeUrl(output.logo_url) : "";
  if (validate) {
    if (!getWebsiteTemplate(output.template_id)) throw new Error("Choose a supported website template.");
    for (const key of ["business_name", "headline", "cta_text", "cta_url"]) if (!output[key]) throw new Error(`${key.replaceAll("_", " ")} is required and must be valid.`);
    if (!output.services.length) throw new Error("Add at least one service.");
  }
  return output;
}

module.exports = { listWebsiteTemplates, getWebsiteTemplate, normalizeWebsiteSite, safeUrl };
