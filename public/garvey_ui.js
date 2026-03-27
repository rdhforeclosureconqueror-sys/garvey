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

  function safeTrim(v) {
    return String(v ?? "").trim();
  }

  function ctx() {
    const p = new URLSearchParams(location.search);
    return {
      tenant: safeTrim(p.get("tenant")),
      email: safeTrim(p.get("email")).toLowerCase(),
      rid: safeTrim(p.get("rid")),
      cid: safeTrim(p.get("cid")),
    };
  }

  function withCtx(href) {
    const current = ctx();
    const u = new URL(href, location.origin);
    if (current.tenant) u.searchParams.set("tenant", current.tenant);
    if (current.email) u.searchParams.set("email", current.email);
    if (current.rid) u.searchParams.set("rid", current.rid);
    if (current.cid) u.searchParams.set("cid", current.cid);
    return u.pathname + u.search + u.hash;
  }

  // GARVEY helper
  window.GARVEY = {
    getTenant() {
      return ctx().tenant;
    },
    ctx,
    withCtx,
  };
})();
