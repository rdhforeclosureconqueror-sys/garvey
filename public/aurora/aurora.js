// FILE: public/aurora/aurora.js
(function () {
  "use strict";

  function safeTrim(v) {
    return String(v ?? "").trim();
  }

  function ctx() {
    // Prefer GARVEY ctx if it exists (keeps email/rid/cid too)
    if (window.GARVEY && typeof window.GARVEY.ctx === "function") {
      const c = window.GARVEY.ctx() || {};
      return {
        tenant: safeTrim(c.tenant),
        email: safeTrim(c.email),
        rid: safeTrim(c.rid),
        cid: safeTrim(c.cid),
      };
    }

    const p = new URLSearchParams(location.search);
    return {
      tenant: safeTrim(p.get("tenant")),
      email: safeTrim(p.get("email")),
      rid: safeTrim(p.get("rid")),
      cid: safeTrim(p.get("cid")),
    };
  }

  function withCtx(href) {
    if (window.GARVEY && typeof window.GARVEY.withCtx === "function") {
      return window.GARVEY.withCtx(href);
    }
    const c = ctx();
    const base = new URL(location.href);
    const u = new URL(href, base);
    if (c.tenant) u.searchParams.set("tenant", c.tenant);
    if (c.email) u.searchParams.set("email", c.email);
    if (c.rid) u.searchParams.set("rid", c.rid);
    if (c.cid) u.searchParams.set("cid", c.cid);
    return u.pathname + u.search + u.hash;
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

  function initTenant() {
    const c = ctx();
    const tenant = c.tenant || "test-business";

    setText("tenantDisplay", tenant);

    if (c.cid) {
      const wrap = document.getElementById("cidDisplayWrap");
      if (wrap) wrap.hidden = false;
      setText("cidDisplay", c.cid);
    }

    // Top nav
    setHref("homeLink", "/index.html");
    setHref("navStartLink", "/rewards_premium.html");
    setHref("navRewardsLink", "/rewards_premium.html");
    setHref("navGarveyLink", "/garvey_premium.html");
    setHref("navDashboardLink", "/dashboard.html");

    setHref("drawerStartLink", "/rewards_premium.html");
    setHref("drawerRewardsLink", "/rewards_premium.html");
    setHref("drawerGarveyLink", "/garvey_premium.html");
    setHref("drawerDashboardLink", "/dashboard.html");

    // Hero CTAs
    setHref("startHereBtn", "/rewards_premium.html");
    setHref("customerVocBtn", "/voc.html");
    setHref("ownerIntakeBtn", "/intake.html?assessment=business_owner");

    // Mini cards
    setHref("garveyPremiumLink", "/garvey_premium.html");
    setHref("rewardsPremiumLink", "/rewards_premium.html");
    setHref("templatesLink", "/templates.html");
    setHref("dashboardLink", "/dashboard.html");

    // Owner controls section
    setHref("dashLink", "/dashboard.html");
    setHref("adminLink", "/admin.html"); // still present; label is "Start Here (Admin)" in HTML
    setHref("garveyFallbackLink", "/garvey.html");

    // Footer
    setHref("rewardsFallbackLink", "/rewards.html");
    setHref("vocLink", "/voc.html");

    // If you want tenant to always exist in URL, enforce it once:
    if (!c.tenant) {
      const u = new URL(location.href);
      u.searchParams.set("tenant", tenant);
      history.replaceState({}, "", u.pathname + u.search + u.hash);
    }
  }

  // Mobile menu
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
    initTenant();
    initDrawer();
  });
})();
