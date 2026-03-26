"use strict";

const path = require("path");
const fs = require("fs/promises");

function toSafeSegment(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return normalized || fallback;
}

function applyRoleModifiers(indexHtml, roleModifiers = []) {
  const normalized = Array.isArray(roleModifiers)
    ? roleModifiers.map((v) => String(v || "").trim().toLowerCase())
    : [];

  let output = indexHtml;

  if (normalized.includes("builder")) {
    output = output.replace(/Get Started/gi, "Get Started — Build Fast");
    output = output.replace(
      "</body>",
      '<section style="padding:20px;margin:20px;border:2px solid #16a34a;border-radius:12px;"><h3>Builder Focus</h3><p>Launch quickly with clear next steps and action-first messaging.</p></section></body>'
    );
  }

  if (normalized.includes("architect")) {
    output = output.replace(/Our Services/gi, "Our Services & Structure");
    output = output.replace(
      "</body>",
      '<section style="padding:20px;margin:20px;border:2px solid #2563eb;border-radius:12px;"><h3>Architect Focus</h3><p>Lead with structure, process, and long-term foundation.</p></section></body>'
    );
  }

  return output;
}

async function generateSite({ tenant, template_type: templateType, role_modifiers: roleModifiers = [] }) {
  const safeTenant = toSafeSegment(tenant, "tenant");
  const safeTemplateType = toSafeSegment(templateType, "metropolis");

  const templateDir = path.join(__dirname, "../public/templates", safeTemplateType);
  const siteDir = path.join(__dirname, "../public/sites", safeTenant);
  const siteUrl = `/sites/${safeTenant}/index.html`;
  const templateIndexPath = path.join(templateDir, "index.html");
  const siteIndexPath = path.join(siteDir, "index.html");

  try {
    await fs.access(templateIndexPath);
  } catch (_) {
    const error = new Error(`template '${safeTemplateType}' not found`);
    error.code = "TEMPLATE_NOT_FOUND";
    throw error;
  }

  await fs.mkdir(siteDir, { recursive: true });
  await fs.cp(templateDir, siteDir, { recursive: true, force: true });

  let indexHtml = await fs.readFile(siteIndexPath, "utf8");
  const replacements = {
    "{{business_name}}": safeTenant,
    "{{cta}}": "Get Started",
    "{{services}}": "Our Services",
  };

  for (const [token, replacement] of Object.entries(replacements)) {
    indexHtml = indexHtml.split(token).join(replacement);
  }

  indexHtml = applyRoleModifiers(indexHtml, roleModifiers);
  await fs.writeFile(siteIndexPath, indexHtml, "utf8");

  return { site_url: siteUrl };
}

module.exports = {
  generateSite,
};
