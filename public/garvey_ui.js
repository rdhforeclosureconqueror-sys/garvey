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

  function ctx() {
    const p = new URLSearchParams(location.search);
    return {
      tenant: (p.get("tenant") || "").trim(),
      email: (p.get("email") || "").trim(),
      rid: (p.get("rid") || "").trim(),
      cid: (p.get("cid") || "").trim(),
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
    if (c.cid && !u.searchParams.get("cid")) u.searchParams.set("cid", c.cid);

    return u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
  }

  // Optional convenience: apply to links that opt-in
  function applyCtxToLinks(root) {
    const scope = root || document;
    scope.querySelectorAll("a[data-ctx]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      a.setAttribute("href", withCtx(href));
    });
  }

  window.GARVEY = Object.assign({}, existing, {
    ctx,
    withCtx,
    applyCtxToLinks,
    getTenant, // KEEP legacy API
  });
})();
