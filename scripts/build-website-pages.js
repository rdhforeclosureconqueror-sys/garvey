"use strict";

// Static discovery pages and customer pages use exactly the same renderer.
// Run after changes to website.css, the catalog, or the website renderer.
const fs = require("node:fs");
const path = require("node:path");
const { generateTenantSite } = require("../server/siteGenerator");
const { listWebsiteTemplates } = require("../server/websiteCatalog");
const root = path.join(__dirname, "../public");
const serviceSite = {
  template_id: "modern", business_name: "GARVEY Websites",
  headline: "Give your business a place to land.",
  subheadline: "Turn what you do into a clear, focused landing page. Choose a layout, tell your story, and give your customers a next step.",
  cta_text: "Create your landing page", cta_url: "/site_intake.html",
  services: ["Make your offer clear.", "Make it easy to reach you.", "Make every visit count."],
  about: "A page built around your business, with your services, contact information, and a button that takes visitors where you want them to go.",
  value_props: ["Your business details", "Your brand color", "Your booking or contact link"],
};
fs.writeFileSync(path.join(root, "websites.html"), generateTenantSite({ tenantSlug: "garvey-websites", config: { site: serviceSite }, websiteService: true }).pages.landing);
fs.mkdirSync(path.join(root, "website-previews"), { recursive: true });
for (const template of listWebsiteTemplates()) {
  const site = { template_id: template.id, business_name: `${template.name} · Example Business`, headline: "Great work deserves a great introduction.", subheadline: "This is an example layout. Your business name, message, and services will appear here.", cta_text: `Use ${template.name}`, cta_url: `/site_intake.html?template=${template.id}`, services: ["Your first service", "Your second service", "Your third service"], about: "Tell visitors what you do and why it matters to them. Replace this example with your own story.", industry: "LAYOUT PREVIEW", location: "Your town or service area", hours: "Your opening hours", value_props: ["A clear offer", "A personal touch", "An easy next step"] };
  fs.writeFileSync(path.join(root, "website-previews", `${template.id}.html`), generateTenantSite({ tenantSlug: "example-business", config: { site } }).pages.landing);
}
console.log("Built the GARVEY Websites landing page and five previews with generateTenantSite.");
