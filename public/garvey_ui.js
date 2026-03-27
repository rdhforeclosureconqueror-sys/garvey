// FILE: public/garvey_ui.js
(function () {
  "use strict";

  // -------------------------
  // Mobile drawer
  // -------------------------
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

  // -------------------------
  // Reveal-on-scroll
  // -------------------------
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

  // -------------------------
  // GARVEY ctx helpers
  // -------------------------
  const STORAGE_KEY = "garvey_ctx_v1";

  function safeTrim(v) {
    return String(v ?? "").trim();
  }

  function readStoredCtx() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { tenant: "", email: "", rid: "", cid: "" };
      const obj = JSON.parse(raw);
      return {
        tenant: safeTrim(obj.tenant),
        email: safeTrim(obj.email).toLowerCase(),
        rid: safeTrim(obj.rid),
        cid: safeTrim(obj.cid),
      };
    } catch (_) {
      return { tenant: "", email: "", rid: "", cid: "" };
    }
  }

  function writeStoredCtx(c) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        tenant: safeTrim(c.tenant),
        email: safeTrim(c.email).toLowerCase(),
        rid: safeTrim(c.rid),
        cid: safeTrim(c.cid),
      }));
    } catch (_) {}
  }

  function ctxFromUrl() {
    const p = new URLSearchParams(location.search);
    return {
      tenant: safeTrim(p.get("tenant")),
      email: safeTrim(p.get("email")).toLowerCase(),
      rid: safeTrim(p.get("rid")),
      cid: safeTrim(p.get("cid")),
    };
  }

  function ctx() {
    // Prefer URL; fallback to stored if tenant missing.
    const u = ctxFromUrl();
    const s = readStoredCtx();

    const merged = {
      tenant: u.tenant || s.tenant,
      email: u.email || s.email,
      rid: u.rid || s.rid,
      cid: u.cid || s.cid,
    };

    // If URL had any ctx at all, refresh storage (keeps it current)
    if (u.tenant || u.email || u.rid || u.cid) writeStoredCtx(merged);

    return merged;
  }

  function getTenant() {
    return ctx().tenant;
  }

  function withCtx(href) {
    if (!href) return href;

    const lower = String(href).toLowerCase();
    if (href.startsWith("#") || lower.startsWith("mailto:") || lower.startsWith("tel:") || lower.startsWith("javascript:")) {
      return href;
    }

    const base = new URL(location.href);
    const u = new URL(href, base);

    // Only mutate same-origin links.
    if (u.origin !== base.origin) return href;

    const c = ctx();

    // Merge without deleting existing params
    if (c.tenant && !u.searchParams.get("tenant")) u.searchParams.set("tenant", c.tenant);
    if (c.email && !u.searchParams.get("email")) u.searchParams.set("email", c.email);
    if (c.rid && !u.searchParams.get("rid")) u.searchParams.set("rid", c.rid);
    if (c.cid && !u.searchParams.get("cid")) u.searchParams.set("cid", c.cid);

    return u.pathname + (u.search || "") + (u.hash || "");
  }

  function shouldCtxifyAnchor(a) {
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#")) return false;

    // Only apply to GARVEY internal pages by default (reduces unintended changes)
    // Adjust if you want broader behavior.
    return (
      href.startsWith("/garvey") ||
      href.startsWith("garvey") ||
      href.includes("garvey-") ||
      href.includes("garvey_premium") ||
      href.includes("owner_archetype") ||
      href.includes("results_owner") ||
      href.includes("dashboard")
    );
  }

  function applyCtxToLinks(root) {
    const scope = root || document;
    scope.querySelectorAll("a[href]").forEach((a) => {
      if (!shouldCtxifyAnchor(a)) return;
      a.setAttribute("href", withCtx(a.getAttribute("href")));
    });
  }

  // Apply immediately on load
  window.addEventListener("DOMContentLoaded", () => applyCtxToLinks());

  // Preserve existing GARVEY object if present
  const existing = window.GARVEY && typeof window.GARVEY === "object" ? window.GARVEY : {};

  window.GARVEY = Object.assign({}, existing, {
    ctx,
    withCtx,
    applyCtxToLinks,
    getTenant, // legacy compatibility for kanban/pages
  });
})();
