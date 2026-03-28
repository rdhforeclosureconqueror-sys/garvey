"use strict";

function safeTrim(value) {
  return String(value ?? "").trim();
}

function buildDashboardUrl(params) {
  const input = params || {};
  const tenant = safeTrim(input.tenant);
  const email = safeTrim(input.email).toLowerCase();
  const cid = safeTrim(input.cid);
  const crid = safeTrim(input.crid);
  const ownerEmail = safeTrim(input.owner_email).toLowerCase();
  const ownerRid = safeTrim(input.owner_rid);

  const search = new URLSearchParams();
  if (tenant) search.set("tenant", tenant);
  if (email) search.set("email", email);
  if (cid) search.set("cid", cid);
  if (crid) search.set("crid", crid);
  if (ownerEmail) search.set("owner_email", ownerEmail);
  if (ownerRid) search.set("owner_rid", ownerRid);

  return `/dashboard.html${search.toString() ? `?${search.toString()}` : ""}`;
}

module.exports = {
  buildDashboardUrl,
};
