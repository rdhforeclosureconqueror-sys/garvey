// FILE: public/garvey_ui.js
(function () {
  "use strict";

  // Mobile drawer
  const burger = document.querySelector("[data-burger]");
  const drawer = document.querySelector("[data-drawer]");
  const closeLinks = document.querySelectorAll("[data-close-drawer]");

  function setOpen(open) {
    if (!drawer || !burger) return;
    drawer.hidden = !open;
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (burger && drawer) {
    burger.addEventListener("click", () => setOpen(drawer.hidden));
    closeLinks.forEach((a) => a.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  // Reveal-on-scroll
  const els = document.querySelectorAll("[data-reveal]");
  els.forEach((el) => el.classList.add("reveal"));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) e.target.classList.add("is-in");
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.classList.add("is-in"));
  }

  // ---- GARVEY Context Helpers (backward compatible) ----
  const existing = window.GARVEY && typeof window.GARVEY === "object" ? window.GARVEY : {};

  function safeTrim(value) {
    return String(value ?? "").trim();
  }

  function ctx() {
    const p = new URLSearchParams(location.search);
    const type = safeTrim(p.get("type")).toLowerCase();
    const rid = safeTrim(p.get("rid"));
    const crid = safeTrim(p.get("crid"));
    const customerRid = crid || (type === "customer" ? rid : "");

    return {
      tenant: safeTrim(p.get("tenant")),
      email: safeTrim(p.get("email")),
      rid,
      cid: safeTrim(p.get("cid")),
      customer_email: safeTrim(p.get("email")),
      customer_rid: customerRid,
      crid: customerRid,
      type,
    };
  }

  function getTenant() {
    return ctx().tenant;
  }

  function withCtx(href) {
    if (!href) return href;

    // leave non-http(s) alone (mailto:, tel:, javascript:, #hash)
    const lower = String(href).toLowerCase();
    if (lower.startsWith("mailto:") || lower.startsWith("tel:") || lower.startsWith("javascript:") || href.startsWith("#")) {
      return href;
    }

    const base = new URL(location.href);
    const u = new URL(href, base);

    // only apply to same-origin links
    if (u.origin !== base.origin) return href;

    const c = ctx();

    // merge without deleting existing params
    if (c.tenant && !u.searchParams.get("tenant")) u.searchParams.set("tenant", c.tenant);
    if (c.email && !u.searchParams.get("email")) u.searchParams.set("email", c.email);
    if (c.rid && !u.searchParams.get("rid")) u.searchParams.set("rid", c.rid);
    if (c.cid) u.searchParams.set("cid", c.cid);

    return u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
  }

  function withCustomerCtx(href) {
    if (!href) return href;
    const base = new URL(location.href);
    const u = new URL(withCtx(href), base);
    if (u.origin !== base.origin) return href;

    const c = ctx();
    if (c.tenant && !u.searchParams.get("tenant")) u.searchParams.set("tenant", c.tenant);
    if (c.cid) u.searchParams.set("cid", c.cid);
    if (c.customer_email && !u.searchParams.get("email")) u.searchParams.set("email", c.customer_email);
    if (c.customer_rid && !u.searchParams.get("crid")) u.searchParams.set("crid", c.customer_rid);

    return u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
  }

  // Optional convenience: apply to links that opt-in
  function applyCtxToLinks(root) {
    const scope = root || document;
    scope.querySelectorAll("a[data-ctx]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      a.setAttribute("href", withCtx(href));
    });
    scope.querySelectorAll("a[data-cctx]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      a.setAttribute("href", withCustomerCtx(href));
    });
  }

  window.GARVEY = Object.assign({}, existing, {
    ctx,
    withCtx,
    withCustomerCtx,
    applyCtxToLinks,
    getTenant, // KEEP legacy API
    safeTrim,
  });
})();
