"use strict";

function isTdeExtensionEnabled(req) {
  const mode = String(process.env.TDE_EXTENSION_MODE || "off").trim().toLowerCase();
  if (mode === "off") return false;
  if (mode === "internal") {
    const actor = String(req?.headers?.["x-user-email"] || req?.query?.email || "").trim().toLowerCase();
    return actor.includes("@") || req?.query?.internal === "1";
  }
  return true;
}

module.exports = {
  isTdeExtensionEnabled,
};
