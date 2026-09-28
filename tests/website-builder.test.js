"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const { listWebsiteTemplates, normalizeWebsiteSite } = require("../server/websiteCatalog");
const { generateTenantSite } = require("../server/siteGenerator");
const { createWebsiteRouter } = require("../server/websiteRoutes");
const { websiteSignupReturnPath } = require("../server/websiteReturnPath");

const example = { template_id: "modern", business_name: "Acme & Co", headline: "A real customer headline", subheadline: "Made for our customers", services: ["Consulting", "Workshops"], cta_text: "Book a call", cta_url: "https://example.com/book", location: "Dallas, TX", hours: "Mon–Fri 9–5", phone: "555-0100", primary_color: "#c4f57a" };
const owner = { userId: 1, role: "business_owner", tenantSlug: "acme", email: "owner@example.test", isAdmin: false };

async function harness(t, actor = owner) {
  let config = { features: { rewards: true }, contribution_access_gate: { enabled: true }, site: { custom_setting: "preserve" } };
  let writes = 0;
  const pool = { query: async (sql, args) => {
    if (sql.startsWith("SELECT")) return { rows: [{ config: structuredClone(config) }] };
    assert.match(sql, /jsonb_set/);
    config = { ...config, site: { ...config.site, ...JSON.parse(args[1]) } }; writes++;
    return { rows: [] };
  } };
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.authActor = actor; next(); });
  app.use(createWebsiteRouter({ pool, getTenantBySlug: async (slug) => slug === "acme" ? { id: 1, slug, name: "Acme & Co" } : null }));
  app.get("/t/acme/site", (_req, res) => res.type("html").send(generateTenantSite({ tenantSlug: "acme", config }).pages.landing));
  const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
  t.after(() => new Promise((resolve) => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { get: (url) => fetch(base + url), post: (url, body, headers = {}) => fetch(base + url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) }), config: () => config, writes: () => writes };
}

test("five selectable layouts render actual business content and working destinations", () => {
  const templates = listWebsiteTemplates(); assert.equal(templates.length, 5);
  for (const template of templates) {
    const html = generateTenantSite({ tenantSlug: "acme", config: { site: { ...example, template_id: template.id } } }).pages.landing;
    for (const text of ["Acme &amp; Co", "A real customer headline", "Consulting", "Workshops", "Book a call", 'href="https://example.com/book"', "Dallas, TX", "Mon–Fri 9–5", "555-0100", `layout-${template.id}`]) assert.ok(html.includes(text), `${template.id}: missing ${text}`);
    assert.ok(fs.existsSync(path.join(__dirname, "../public", template.preview_path)));
    assert.doesNotMatch(html, /Funding Pathway|Owner Dashboard|Lorem ipsum/);
  }
});

test("tenant text, color and links cannot inject markup or executable URLs", () => {
  const payload = { ...example, business_name: '<img src=x onerror="alert(1)">', primary_color: '</style><script>alert(1)</script>', subheadline: '</title><script>alert(1)</script>', cta_url: "javascript:alert(1)", logo_url: "data:image/svg+xml,<svg onload=alert(1)>" };
  const html = generateTenantSite({ tenantSlug: "acme", config: { site: payload } }).pages.landing;
  assert.doesNotMatch(html, /<script|<img|javascript:|data:image/);
  assert.match(html, /&lt;img/);
  for (const url of ["javascript:alert(1)", "java\nscript:alert(1)", "//evil.test", "/\\evil.test", "data:text/html,x"]) assert.throws(() => normalizeWebsiteSite({ ...example, cta_url: url }, { validate: true }));
  for (const url of ["https://example.com", "mailto:test@example.com", "tel:+15550100", "/contact", "#contact"]) assert.equal(normalizeWebsiteSite({ ...example, cta_url: url }, { validate: true }).cta_url, url);
});

test("preview is read-only; publication survives a second read and preserves unrelated config", async (t) => {
  const h = await harness(t);
  let response = await h.post("/api/site/preview", { tenant: "acme", site: example });
  assert.equal(response.status, 200); assert.match(await response.text(), /A real customer headline/); assert.equal(h.writes(), 0);
  response = await h.post("/api/site/generate", { tenant: "acme", site: example });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { success: true, tenant: "acme", template_id: "modern", site_url: "/t/acme/site" });
  assert.equal(h.config().features.rewards, true); assert.equal(h.config().site.custom_setting, "preserve");
  const loaded = await (await h.get("/api/site/config?tenant=acme")).json();
  assert.equal(loaded.published, true); assert.equal(loaded.site.cta_url, example.cta_url);
  const html = await (await h.get(loaded.site_url)).text(); assert.match(html, /A real customer headline/);
  await h.post("/api/site/preview", { site: { ...example, headline: "Unpublished edit" } });
  assert.doesNotMatch(await (await h.get(loaded.site_url)).text(), /Unpublished edit/);
});

test("missing template field resolves to saved selection or clean for the original intake contract", async (t) => {
  const h = await harness(t); const site = { ...example }; delete site.template_id;
  let response = await h.post("/api/site/generate", { tenant: "acme", site });
  assert.equal(response.status, 200); assert.equal((await response.json()).template_id, "clean");
  response = await h.post("/api/templates/select", { tenant: "acme", template_id: "personal" }); assert.equal(response.status, 200);
  response = await h.post("/api/site/generate", { tenant: "acme", site });
  assert.equal((await response.json()).template_id, "personal");
});

test("anonymous users and spoofed role headers cannot read or overwrite sites", async (t) => {
  const h = await harness(t, null);
  assert.equal((await h.get("/api/templates")).status, 200);
  assert.equal((await h.get("/api/site/config?tenant=acme")).status, 401);
  for (const url of ["/api/site/preview", "/api/site/generate", "/api/templates/select"]) {
    assert.equal((await h.post(url, { tenant: "acme", site: example, template_id: "clean" }, { "x-user-role": "business_owner", "x-user-email": owner.email })).status, 401);
  }
  assert.equal(h.writes(), 0);
});

test("cross-business and customer sessions are rejected before any write", async (t) => {
  const h = await harness(t);
  assert.equal((await h.get("/api/site/config?tenant=other")).status, 403);
  assert.equal((await h.post("/api/site/generate", { tenant: "other", site: example })).status, 403);
  assert.equal(h.writes(), 0);
  const customer = await harness(t, { ...owner, role: "customer" });
  assert.equal((await customer.post("/api/site/generate", { site: example })).status, 403);
});

test("invalid layouts, incomplete content, and non-JSON writes do not publish", async (t) => {
  const h = await harness(t);
  for (const site of [null, [], {}, { ...example, template_id: "aroma-spa" }, { ...example, cta_url: "javascript:alert(1)" }, { ...example, services: [] }]) {
    assert.equal((await h.post("/api/site/generate", { tenant: "acme", site })).status, 400);
  }
  assert.equal((await h.post("/api/templates/select", { template_id: "garvey-premium-shell" })).status, 400);
  assert.equal((await h.post("/api/site/generate", { site: example }, { "Content-Type": "text/plain" })).status, 415);
  assert.equal(h.writes(), 0);
});

test("signup returns only to the website builder, preserves layout and drops URL identity", () => {
  assert.equal(websiteSignupReturnPath("/site_intake.html?template=local&tenant=somebody-else"), "/site_intake.html?template=local");
  assert.equal(websiteSignupReturnPath("/site_intake.html?template=missing"), "/site_intake.html");
  for (const value of ["//evil.test", "https://evil.test/site_intake.html", "/\\evil.test", "/admin.html", ""]) assert.equal(websiteSignupReturnPath(value), "");
});

test("split-host editor moves to the backend before making credentialed requests", () => {
  const vm = require("node:vm");
  let redirected;
  const location = { pathname: "/site_intake.html", search: "?template=local&tenant=acme", hash: "", replace: (url) => { redirected = url; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/website-builder.js"), "utf8"), { window: { GarveyApi: { API_BASE: "https://garveybackend.onrender.com" } }, location });
  assert.equal(redirected, "https://garveybackend.onrender.com/site_intake.html?template=local&tenant=acme");
});

test("legacy tenants still render their existing hub until choosing a native layout", () => {
  const html = generateTenantSite({ tenantSlug: "acme", config: { site: { template_id: "metropolis", business_name: "Acme" } } }).pages.landing;
  assert.match(html, /Funding Pathway/);
});
