"use strict";

const { getWebsiteTemplate } = require("./websiteCatalog");

// Signup keeps its existing onboarding default unless the visitor explicitly
// started in the standalone website builder. Do not carry URL identity across.
function websiteSignupReturnPath(value) {
  const raw = String(value || "");
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "";
  const url = new URL(raw, "https://garvey.invalid");
  if (url.origin !== "https://garvey.invalid" || url.pathname !== "/site_intake.html") return "";
  const template = url.searchParams.get("template");
  return `/site_intake.html${getWebsiteTemplate(template) ? `?template=${encodeURIComponent(template)}` : ""}`;
}

module.exports = { websiteSignupReturnPath };
