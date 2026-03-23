// FILE: public/templates.js
(function () {
  const params = new URLSearchParams(location.search);
  const tenant = (params.get("tenant") || "").trim();

  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const tenantPill = document.getElementById("tenantPill");
  const backToTenantSite = document.getElementById("backToTenantSite");

  tenantPill.textContent = `Tenant: ${tenant || "(missing)"}`;
  backToTenantSite.href = tenant ? `/t/${encodeURIComponent(tenant)}/site` : "/";

  async function loadRegistry() {
    status.textContent = "Loading registry...";
    grid.innerHTML = "";

    const r = await fetch("/templates/registry.json", { cache: "no-store" });
    if (!r.ok) {
      status.textContent = `Failed to load registry.json (${r.status})`;
      return [];
    }
    const data = await r.json();
    const templates = Array.isArray(data.templates) ? data.templates : [];
    status.textContent = `Loaded ${templates.length} templates.`;
    return templates;
  }

  function renderTemplates(templates) {
    grid.innerHTML = "";
    for (const t of templates) {
      const id = String(t.id || "").trim();
      const name = String(t.name || id);
      const category = String(t.category || "general");
      const previewPath = String(t.preview_path || "").trim(); // e.g. /templates/metropolis/index.html

      const el = document.createElement("div");
      el.className = "tpl";
      el.innerHTML = `
        <h3>${escapeHtml(name)}</h3>
        <div class="meta">ID: <code>${escapeHtml(id)}</code> • Category: ${escapeHtml(category)}</div>
        <div class="actions">
          <a class="btn" target="_blank" rel="noreferrer" href="${escapeAttr(previewPath)}">Preview</a>
          <button class="btn" data-select="${escapeAttr(id)}">Select</button>
        </div>
        <div class="muted" style="margin-top:10px;">
          Select stores <code>tenant_config.site.template_id</code> for this tenant.
        </div>
      `;
      grid.appendChild(el);
    }

    grid.querySelectorAll("button[data-select]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const templateId = btn.getAttribute("data-select");
        if (!tenant) {
          alert("Missing tenant. Use /templates.html?tenant=YOURSLUG");
          return;
        }
        status.textContent = `Selecting ${templateId}...`;

        // This POST will work after you add the server/index.js snippet I’ll send next.
        const resp = await fetch("/api/templates/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant, template_id: templateId }),
        });

        const text = await resp.text();
        if (!resp.ok) {
          status.textContent = `Select failed (${resp.status}): ${text}`;
          return;
        }
        status.textContent = `Selected template: ${templateId}.`;
        alert(`Selected template: ${templateId}\n\nNow go back to Tenant Site.`);
      });
    });
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(s) {
    return escapeHtml(s);
  }

  async function init() {
    const templates = await loadRegistry();
    renderTemplates(templates);
  }

  document.getElementById("reload").addEventListener("click", init);
  init();
})();
