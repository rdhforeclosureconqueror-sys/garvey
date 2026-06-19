(function () {
  "use strict";
  const CONSENT_VERSION = "v1";
  function esc(s) { return String(s || "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c])); }
  function val(v) { const s = String(v || "").trim(); return /^(undefined|null)$/i.test(s) ? "" : s; }
  function buildUrl(path) { return window.GarveyApi?.buildUrl ? window.GarveyApi.buildUrl(path) : path; }
  async function saveRequiredConsent({ tenant, email, name, assessment }) {
    const res = await fetch(buildUrl("/api/consent/required"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ tenant, email, name, accepted: true, require_for_voc: assessment === "customer", consent_version: CONSENT_VERSION, consent_type: "business_only_required" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Consent submission failed");
    return data;
  }
  function createConsentGate(options) {
    const root = typeof options.root === "string" ? document.querySelector(options.root) : options.root;
    if (!root) throw new Error("Consent root not found");
    const assessment = val(options.assessment || "assessment");
    const title = options.title || (assessment === "customer" ? "Voice of the Customer Consent" : "Assessment Consent");
    root.innerHTML = `<section class="garvey-consent-screen" aria-live="polite">
      <h1>${esc(title)}</h1>
      <p class="consent-copy">Before Question 1, enter your name and email and accept consent. Your responses will be used to create your profile, personalize recommendations, and save your assessment result.</p>
      <div class="row"><input id="garveyConsentName" placeholder="Name" autocomplete="name" value="${esc(options.name || "")}" /><input id="garveyConsentEmail" placeholder="Email" autocomplete="email" value="${esc(options.email || "")}" /></div>
      <label class="consent-check"><input id="garveyConsentAccepted" type="checkbox" /> <span>I agree to the use of my assessment responses to create my profile and personalize my experience.</span></label>
      <button type="button" class="btn" id="garveyConsentContinue">Continue</button>
      <div id="garveyConsentStatus" class="meta err" aria-live="polite"></div>
    </section>`;
    return new Promise((resolve) => {
      root.querySelector("#garveyConsentContinue").addEventListener("click", async () => {
        const name = val(root.querySelector("#garveyConsentName")?.value);
        const email = val(root.querySelector("#garveyConsentEmail")?.value).toLowerCase();
        const accepted = root.querySelector("#garveyConsentAccepted")?.checked === true;
        const status = root.querySelector("#garveyConsentStatus");
        if (!name || !email) { status.textContent = "Name and email are required."; return; }
        if (!accepted) { status.textContent = "Please accept consent to continue."; return; }
        try {
          await saveRequiredConsent({ tenant: options.tenant, email, name, assessment });
          root.innerHTML = "";
          resolve({ name, email, accepted: true });
        } catch (err) { status.textContent = err?.message || "Consent failed"; }
      });
    });
  }
  window.GarveyAssessmentConsent = { createConsentGate, saveRequiredConsent };
})();
