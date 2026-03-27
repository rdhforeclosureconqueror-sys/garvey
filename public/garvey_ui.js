(function () {
  function tenantFromLocation() {
    const p = new URLSearchParams(window.location.search);
    return (p.get("tenant") || "").trim();
  }

  function withTenant(url, tenant) {
    const t = (tenant || "").trim();
    if (!t) return url;
    const u = new URL(url, window.location.origin);
    u.searchParams.set("tenant", t);
    return u.pathname + u.search;
  }

  function bindTenantLinks(tenant) {
    document.querySelectorAll("[data-tenant-href]").forEach((el) => {
      const base = el.getAttribute("data-tenant-href") || "#";
      el.setAttribute("href", withTenant(base, tenant));
    });
  }

  function setTenantLabels(tenant) {
    document.querySelectorAll("[data-tenant-label]").forEach((el) => {
      el.textContent = tenant ? `Tenant: ${tenant}` : "Tenant missing";
    });
  }

  function initMobileNav() {
    const bar = document.querySelector(".topbar");
    const btn = document.querySelector("[data-mobile-toggle]");
    if (!bar || !btn) return;
    btn.addEventListener("click", () => {
      bar.classList.toggle("open");
    });
  }

  function initReveal() {
    const els = Array.from(document.querySelectorAll(".reveal"));
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  }

  function requireTenant(container) {
    const tenant = tenantFromLocation();
    if (tenant) return tenant;
    if (container) {
      container.innerHTML = '<div class="notice">Missing required query param <code>?tenant=...</code>. Kanban is disabled on this page.</div>';
    }
    return "";
  }

  window.GARVEY_UI = {
    tenantFromLocation,
    withTenant,
    bindTenantLinks,
    setTenantLabels,
    requireTenant,
    init() {
      const tenant = tenantFromLocation();
      bindTenantLinks(tenant);
      setTenantLabels(tenant);
      initMobileNav();
      initReveal();
      return tenant;
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    window.GARVEY_UI.init();
  });
})();
