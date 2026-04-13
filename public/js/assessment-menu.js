"use strict";

function safeTrim(value) {
  return String(value ?? "").trim();
}

function buildAssessmentRegistry() {
  return [
    {
      key: "voc",
      title: "Voice of the Customer",
      description: "Share your experience and unlock your biggest boost.",
      engineType: "",
    },
    {
      key: "love",
      title: "Love Archetype",
      description: "Discover the pattern behind how you connect and relate.",
      engineType: "love",
    },
    {
      key: "leadership",
      title: "Leadership Archetype",
      description: "Reveal how you naturally lead, decide, and influence.",
      engineType: "leadership",
    },
    {
      key: "loyalty",
      title: "Loyalty Archetype",
      description: "See what really drives trust, retention, and commitment.",
      engineType: "loyalty",
    },
  ];
}

function applyCommonContext(url, ctx, query, sourceType) {
  const tenant = safeTrim(ctx?.tenant);
  const cid = safeTrim(ctx?.cid);
  const email = safeTrim(ctx?.email).toLowerCase();
  const name = safeTrim(ctx?.name);
  const crid = safeTrim(ctx?.rid || ctx?.crid);
  const entry = safeTrim(query?.get("entry"));
  const tapSource = safeTrim(query?.get("tap_source"));
  const tapTag = safeTrim(query?.get("tap_tag") || query?.get("tag"));
  const tapSession = safeTrim(query?.get("tap_session"));

  if (tenant) url.searchParams.set("tenant", tenant);
  if (email) url.searchParams.set("email", email);
  if (name) url.searchParams.set("name", name);
  if (cid) url.searchParams.set("cid", cid);
  if (crid) {
    url.searchParams.set("crid", crid);
    url.searchParams.set("rid", crid);
  }
  if (entry) url.searchParams.set("entry", entry);
  if (tapSource) url.searchParams.set("tap_source", tapSource);
  if (tapTag) url.searchParams.set("tap_tag", tapTag);
  if (tapSession) url.searchParams.set("tap_session", tapSession);
  if (sourceType) url.searchParams.set("source_type", sourceType);
}

function buildAssessmentHref(option, params) {
  const { origin, ctx, query, sourceType } = params || {};
  const basePath = option?.key === "voc"
    ? "/voc.html"
    : `/archetype-engines/${option.engineType}/browse`;
  const url = new URL(basePath, origin || "http://localhost");
  applyCommonContext(url, ctx, query, sourceType);
  return `${url.pathname}${url.search}`;
}

function createAssessmentOptions(params) {
  const registry = buildAssessmentRegistry();
  return registry.map((option) => ({
    ...option,
    href: buildAssessmentHref(option, params),
  }));
}

const api = {
  buildAssessmentRegistry,
  buildAssessmentHref,
  createAssessmentOptions,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.AssessmentMenu = api;
}
