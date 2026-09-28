(function () {
  "use strict";
  const api = window.GarveyApi;
  // Keep the editor and its owner cookie on the backend host, including iOS.
  if (api?.API_BASE) { location.replace(api.API_BASE + location.pathname + location.search + location.hash); return; }
  const params = new URLSearchParams(location.search);
  const $ = (id) => document.getElementById(id);
  const fields = ["business_name", "headline", "subheadline", "about", "cta_text", "cta_url", "primary_color", "industry", "phone", "location", "hours", "logo_url"];
  let tenant = "";
  let templates = [];
  let valueProps = [];
  let dirty = false;
  function status(message, kind = "") { $("status").textContent = message; $("status").className = "status " + kind; }
  function signInNotice() {
    $("accountNotice").hidden = false;
    $("accountNotice").replaceChildren(document.createTextNode("Sign in or create an owner account to save a page for your business. "));
    const link = document.createElement("a");
    link.href = `/index.html?next=${encodeURIComponent(location.pathname + location.search)}`;
    link.textContent = "Continue to owner sign in ↗";
    $("accountNotice").appendChild(link);
  }
  function payload() {
    const site = Object.fromEntries(fields.map((key) => [key, $(key).value.trim()]));
    site.template_id = $("template_id").value;
    site.services = $("services").value.split("\n").map((line) => line.trim()).filter(Boolean);
    site.value_props = valueProps;
    return { tenant, site };
  }
  async function request(action) {
    const endpoint = action === "preview" ? "/api/site/preview" : "/api/site/generate";
    const response = await fetch(endpoint, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) signInNotice();
      throw new Error(data.error || `Unable to ${action} your page. Please retry.`);
    }
    return response;
  }
  async function preview() {
    const response = await request("preview");
    $("sitePreview").srcdoc = await response.text();
    $("previewLabel").textContent = "Your draft · not published";
  }
  async function withBusy(action) {
    if (!$("websiteForm").reportValidity()) return;
    $("websiteFields").disabled = true;
    try { await action(); } catch (err) { status(err.message, "error"); }
    finally { $("websiteFields").disabled = false; }
  }
  $("previewBtn").addEventListener("click", () => withBusy(async () => { status("Building your preview…"); await preview(); status("Preview updated. Your published page has not changed."); }));
  $("websiteForm").addEventListener("submit", (event) => {
    event.preventDefault();
    withBusy(async () => {
      status("Publishing your page…");
      const response = await request("generate");
      const data = await response.json();
      if (!data.success || !data.site_url) throw new Error("The server did not confirm publication. Please retry.");
      const target = new URL(data.site_url, location.origin);
      if (target.origin !== location.origin || !target.pathname.startsWith("/t/")) throw new Error("The page link was invalid.");
      dirty = false;
      $("publishedLink").href = target.href;
      $("publishedLink").hidden = false;
      $("sitePreview").removeAttribute("srcdoc");
      $("sitePreview").src = target.pathname + `?preview=${Date.now()}`;
      $("previewLabel").textContent = "Your published page";
      status("Your page is published. Open it below to check and share your link.", "success");
    });
  });
  $("websiteForm").addEventListener("input", () => { dirty = true; $("previewLabel").textContent = "Changes pending · click Preview changes"; });
  $("template_id").addEventListener("change", () => {
    const template = templates.find((item) => item.id === $("template_id").value);
    if (template) $("primary_color").value = template.accent;
  });
  window.addEventListener("beforeunload", (event) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } });
  async function init() {
    try {
      const registryResponse = await fetch("/api/templates", { credentials: "include" });
      if (!registryResponse.ok) throw new Error("The layouts could not be loaded. Refresh to try again.");
      const registry = await registryResponse.json(); templates = registry.templates;
      for (const template of templates) { const option = document.createElement("option"); option.value = template.id; option.textContent = template.name; $("template_id").appendChild(option); }
      const chosen = templates.find((item) => item.id === params.get("template"));
      if (chosen) { $("template_id").value = chosen.id; $("sitePreview").src = chosen.preview_path; }
      const response = await fetch("/api/owner/session", { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Your account could not be checked. Refresh to try again.");
      const session = await response.json();
      if (!session.authenticated) { signInNotice(); return; }
      tenant = params.get("tenant") || session.tenant;
      const configResponse = await fetch(`/api/site/config?${new URLSearchParams({ tenant })}`, { credentials: "include", cache: "no-store" });
      const data = await configResponse.json();
      if (!configResponse.ok) throw new Error(data.error || "Your website details could not be loaded.");
      $("template_id").value = chosen?.id || data.site.template_id;
      for (const key of fields) $(key).value = data.site[key] || "";
      $("business_name").value ||= data.business_name || "";
      $("primary_color").value = (chosen && chosen.id !== data.site.template_id ? chosen.accent : data.site.primary_color) || templates.find((item) => item.id === $("template_id").value).accent;
      $("services").value = data.site.services.join("\n");
      valueProps = data.site.value_props || [];
      $("businessContext").textContent = `Building for ${data.business_name || tenant}`;
      $("accountNotice").hidden = true;
      $("websiteFields").disabled = false;
      if (data.legacy_template_id) status("Your earlier design stays unchanged until you publish with one of the new layouts.");
      if (data.published) {
        $("publishedLink").href = data.site_url; $("publishedLink").hidden = false;
        if (chosen && chosen.id !== data.site.template_id) { await preview(); dirty = true; }
        else { $("sitePreview").src = data.site_url; $("previewLabel").textContent = "Your published page"; }
      }
    } catch (err) { $("accountNotice").hidden = false; $("accountNotice").textContent = err.message; status(err.message, "error"); }
  }
  init();
})();
