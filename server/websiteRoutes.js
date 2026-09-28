"use strict";

const express = require("express");
const registry = require("../public/templates/registry.json");
const { normalizeWebsiteSite, getWebsiteTemplate } = require("./websiteCatalog");
const { generateTenantSite } = require("./siteGenerator");

// Only the server-verified session is authority. URL, email and role headers are not.
function authorizeWebsiteOwner(req, res) {
  const actor = req.authActor;
  if (!actor?.userId) { res.status(401).json({ error: "Sign in to your owner account to build a website." }); return null; }
  if (actor.role !== "business_owner" && !actor.isAdmin) { res.status(403).json({ error: "A business owner account is required." }); return null; }
  const tenant = String(req.body?.tenant || req.query?.tenant || actor.tenantSlug || "").trim();
  if (!tenant) { res.status(400).json({ error: "Choose a business first." }); return null; }
  if (tenant !== String(actor.tenantSlug) && !actor.isAdmin) { res.status(403).json({ error: "This website belongs to a different business." }); return null; }
  return tenant;
}

function createWebsiteRouter({ pool, getTenantBySlug }) {
  const router = express.Router();
  const route = (fn) => async (req, res, next) => { try { await fn(req, res); } catch (err) { next(err); } };
  router.get("/api/templates", (_req, res) => res.json({ success: true, ...registry }));

  async function context(req, res) {
    const slug = authorizeWebsiteOwner(req, res);
    if (!slug) return null;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) { res.status(404).json({ error: "Business not found." }); return null; }
    const result = await pool.query("SELECT config FROM tenant_config WHERE tenant_id = $1", [tenant.id]);
    return { tenant, config: result.rows[0]?.config || {} };
  }

  router.get("/api/site/config", route(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const ctx = await context(req, res);
    if (!ctx) return;
    const saved = ctx.config.site || {};
    const isNative = !!getWebsiteTemplate(saved.template_id);
    res.json({ success: true, tenant: ctx.tenant.slug, business_name: ctx.tenant.name, site: normalizeWebsiteSite({ ...saved, template_id: isNative ? saved.template_id : "clean" }), published: isNative && !!saved.website_published_at, legacy_template_id: isNative ? null : saved.template_id || null, site_url: `/t/${encodeURIComponent(ctx.tenant.slug)}/site` });
  }));

  const jsonOnly = (req, res, next) => req.is("application/json") ? next() : res.status(415).json({ error: "Send website details as JSON." });
  async function saveSite(tenantId, site) {
    // Merge just the website fields atomically; retain rewards, assessments and all
    // unrelated business configuration, including concurrent feature updates.
    await pool.query(`INSERT INTO tenant_config (tenant_id, config, updated_at)
      VALUES ($1, jsonb_build_object('site', $2::jsonb), NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET
      config = jsonb_set(COALESCE(tenant_config.config, '{}'::jsonb), '{site}', COALESCE(tenant_config.config->'site', '{}'::jsonb) || $2::jsonb, true), updated_at = NOW()`, [tenantId, JSON.stringify(site)]);
  }

  router.post("/api/templates/select", jsonOnly, route(async (req, res) => {
    const ctx = await context(req, res);
    if (!ctx) return;
    const template = getWebsiteTemplate(String(req.body.template_id || ""));
    if (!template) return res.status(400).json({ error: "Choose a current website layout. Imported templates are available as references." });
    await saveSite(ctx.tenant.id, { template_id: template.id });
    res.json({ success: true, tenant: ctx.tenant.slug, template_id: template.id });
  }));

  const renderOrPublish = (action) => route(async (req, res) => {
      const ctx = await context(req, res);
      if (!ctx) return;
      let site;
      try {
        const input = req.body.site;
        if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Website details are required.");
        site = normalizeWebsiteSite({ ...ctx.config.site, ...input, template_id: input.template_id || req.body.template_type || ctx.config.site?.template_id || "clean" }, { validate: true });
      } catch (err) { return res.status(400).json({ error: err.message }); }
      const rendered = generateTenantSite({ tenantSlug: ctx.tenant.slug, config: { site } });
      if (action === "preview") return res.set("Cache-Control", "no-store").type("html").send(rendered.pages.landing);
      await saveSite(ctx.tenant.id, { ...site, website_published_at: new Date().toISOString() });
      res.json({ success: true, tenant: ctx.tenant.slug, template_id: site.template_id, site_url: `/t/${encodeURIComponent(ctx.tenant.slug)}/site` });
  });
  router.post("/api/site/preview", jsonOnly, renderOrPublish("preview"));
  router.post("/api/site/generate", jsonOnly, renderOrPublish("generate"));
  router.use((err, _req, res, _next) => {
    console.error("website_request_failed", { message: err.message });
    res.status(500).json({ error: "The website could not be saved or loaded. Please try again." });
  });
  return router;
}

module.exports = { createWebsiteRouter, authorizeWebsiteOwner };
