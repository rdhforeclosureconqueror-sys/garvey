// FILE: public/aurora/aurora.js
(function () {
  "use strict";

  function safeTrim(v) {
    return String(v ?? "").trim();
  }

  function getUrlCtx() {
    const p = new URLSearchParams(location.search);
    return {
      tenant: safeTrim(p.get("tenant")),
      email: safeTrim(p.get("email")),
      rid: safeTrim(p.get("rid")),
      cid: safeTrim(p.get("cid")),
      crid: safeTrim(p.get("crid")),
      owner_email: safeTrim(p.get("owner_email")),
      owner_rid: safeTrim(p.get("owner_rid")),
    };
  }

  function ctx() {
    // Prefer GARVEY ctx if available (supports URL→loginCtx fallbacks)
    if (window.GARVEY && typeof window.GARVEY.ctx === "function") {
      const c = window.GARVEY.ctx() || {};
      return {
        tenant: safeTrim(c.tenant),
        email: safeTrim(c.email),
        rid: safeTrim(c.rid),
        cid: safeTrim(c.cid),
        crid: safeTrim(c.crid),
        owner_email: safeTrim(c.owner_email),
        owner_rid: safeTrim(c.owner_rid),
      };
    }
    return getUrlCtx();
  }

  function withCtx(href) {
    if (!href) return href;

    // Delegate to GARVEY.withCtx when available
    if (window.GARVEY && typeof window.GARVEY.withCtx === "function") {
      return window.GARVEY.withCtx(href);
    }

    const current = ctx();
    const lower = String(href).toLowerCase();
    if (
      href.startsWith("#") ||
      lower.startsWith("mailto:") ||
      lower.startsWith("tel:") ||
      lower.startsWith("javascript:")
    ) return href;

    const base = new URL(location.href);
    const u = new URL(href, base);

    // Only same-origin
    if (u.origin !== base.origin) return href;

    // Only set if missing
    if (current.tenant && !u.searchParams.get("tenant")) u.searchParams.set("tenant", current.tenant);
    if (current.email && !u.searchParams.get("email")) u.searchParams.set("email", current.email);
    if (current.rid && !u.searchParams.get("rid")) u.searchParams.set("rid", current.rid);
    if (current.cid && !u.searchParams.get("cid")) u.searchParams.set("cid", current.cid);

    // Optional extras (customer loop)
    if (current.crid && !u.searchParams.get("crid")) u.searchParams.set("crid", current.crid);
    if (current.owner_email && !u.searchParams.get("owner_email")) u.searchParams.set("owner_email", current.owner_email);
    if (current.owner_rid && !u.searchParams.get("owner_rid")) u.searchParams.set("owner_rid", current.owner_rid);

    return u.pathname + (u.search || "") + (u.hash || "");
  }

  function setHref(id, href) {
    const el = document.getElementById(id);
    if (!el) return;
    el.setAttribute("href", withCtx(href));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = value;
  }

  function ensureTenantInUrl(defaultTenant) {
    const c = ctx();
    const tenant = c.tenant || defaultTenant;
    if (!tenant) return;

    const u = new URL(location.href);
    const hadTenant = safeTrim(u.searchParams.get("tenant"));
    if (!hadTenant) {
      u.searchParams.set("tenant", tenant);
      history.replaceState({}, "", u.pathname + u.search + u.hash);
    }
  }

  function wireLinks() {
    // Top nav
    setHref("homeLink", "/index.html");
    setHref("navStartLink", "/rewards_premium.html");
    setHref("navRewardsLink", "/rewards_premium.html");
    setHref("navGarveyLink", "/garvey_premium.html");
    setHref("navDashboardLink", "/dashboard.html");

    // Drawer nav
    setHref("drawerStartLink", "/rewards_premium.html");
    setHref("drawerRewardsLink", "/rewards_premium.html");
    setHref("drawerGarveyLink", "/garvey_premium.html");
    setHref("drawerDashboardLink", "/dashboard.html");

    // Hero CTAs
    setHref("startHereBtn", "/rewards_premium.html");
    setHref("ownerIntakeBtn", "/intake.html?assessment=business_owner");
    setHref("customerVocBtn", "/voc.html");

    // Mini cards / core links
    setHref("garveyPremiumLink", "/garvey_premium.html");
    setHref("rewardsPremiumLink", "/rewards_premium.html");
    setHref("templatesLink", "/templates.html");
    setHref("dashboardLink", "/dashboard.html");

    // Owner controls
    setHref("dashLink", "/dashboard.html");
    setHref("adminLink", "/admin.html");
    setHref("garveyFallbackLink", "/garvey.html");

    // Footer
    setHref("rewardsFallbackLink", "/rewards.html");
    setHref("vocLink", "/voc.html");

    // Optional extra IDs used by the richer homepage
    setHref("navRewardsLink2", "/rewards_premium.html");
    setHref("customerVocBtn2", "/voc.html");
    setHref("navGarveyLink2", "/garvey_premium.html");
    setHref("navDashboardLink2", "/dashboard.html");
  }

  function initMeta() {
    const c = ctx();
    const tenant = c.tenant || "test-business";
    setText("tenantDisplay", tenant);

    if (c.cid) {
      const wrap = document.getElementById("cidDisplayWrap");
      if (wrap) wrap.hidden = false;
      setText("cidDisplay", c.cid);
    }
  }

  function initDrawer() {
    const burger = document.querySelector("[data-au-burger]");
    const drawer = document.querySelector("[data-au-drawer]");
    const close = document.querySelectorAll("[data-au-close]");

    function setOpen(open) {
      if (!burger || !drawer) return;
      drawer.hidden = !open;
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    }

    if (burger && drawer) {
      burger.addEventListener("click", () => setOpen(drawer.hidden));
      close.forEach((a) => a.addEventListener("click", () => setOpen(false)));
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMeta();
    ensureTenantInUrl("test-business");
    wireLinks();
    initDrawer();
  });
})();
