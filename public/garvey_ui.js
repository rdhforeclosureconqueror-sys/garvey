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

  // Tenant helper (optional)
  window.GARVEY = {
    getTenant() {
      const p = new URLSearchParams(location.search);
      return (p.get("tenant") || "").trim();
    }
  };
})();
