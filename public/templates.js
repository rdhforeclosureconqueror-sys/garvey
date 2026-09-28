(function () {
  "use strict";
  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const retry = document.getElementById("reload");
  const params = new URLSearchParams(location.search);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  async function load() {
    retry.hidden = true;
    status.textContent = "Loading layouts…";
    try {
      const response = await fetch("/templates/registry.json", { cache: "no-store" });
      if (!response.ok) throw new Error("The layouts could not be loaded.");
      const data = await response.json();
      grid.innerHTML = "";
      for (const [index, template] of data.templates.entries()) {
        if (!/^[a-z-]+$/.test(template.id)) continue;
        const linkParams = new URLSearchParams({ template: template.id });
        if (params.get("tenant")) linkParams.set("tenant", params.get("tenant"));
        const article = document.createElement("article");
        article.className = "template-card";
        article.innerHTML = `<a class="mini-site mini-${esc(template.id)}" href="/website-previews/${esc(template.id)}.html" target="_blank" rel="noopener" aria-label="Preview ${esc(template.name)}"><span class="mini-nav">YOUR BUSINESS <span>↗</span></span><span class="mini-head">A place for<br>your next<br>big thing.</span><span class="mini-line"></span><span class="mini-button">Let’s get started ↗</span><span class="mini-grid"><i></i><i></i><i></i></span></a><div class="template-heading"><h3>${esc(template.name)}</h3><span class="tag">0${index + 1}</span></div><p>${esc(template.description)}</p><a class="text-link" href="/site_intake.html?${esc(linkParams)}">Use ${esc(template.name)} ↗</a>`;
        grid.appendChild(article);
      }
      const references = document.getElementById("references");
      references.replaceChildren();
      for (const reference of data.references || []) {
        if (!/^\/(?!\/)/.test(reference.preview_path)) continue;
        const link = document.createElement("a");
        link.href = reference.preview_path; link.textContent = `${reference.name} ↗`;
        link.target = "_blank"; link.rel = "noopener"; references.appendChild(link);
      }
      status.textContent = "";
    } catch (err) { status.textContent = `${err.message} Try again.`; retry.hidden = false; }
  }
  retry.addEventListener("click", load);
  load();
})();
