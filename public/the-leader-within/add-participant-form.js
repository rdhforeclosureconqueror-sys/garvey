(function () {
  "use strict";
  var state = { csrf: "", stage: "script_loaded", submitting: false, initialized: false };
  var ids = {
    form: "addParticipantForm",
    button: "addParticipantButton",
    status: "addParticipantStatus",
    errorPanel: "addParticipantErrorPanel",
    initErrorPanel: "addParticipantInitErrorPanel",
    credentialCard: "credentialCard",
    copyInstructions: "copyInstructions",
    copyButton: "copyInstructionsButton",
    printButton: "printCredentialButton"
  };
  var CSRF_URL = "/api/the-leader-within/facilitator/csrf";
  var INIT_TIMEOUT_MS = 8000;

  function byId(id) { return document.getElementById(id); }
  function text(el, value) { if (el) el.textContent = value == null || value === "" ? "unavailable" : String(value); }
  function status(value) { text(byId(ids.status), value); }
  function setButton(label, disabled) { var btn = byId(ids.button); if (btn) { btn.textContent = label; btn.disabled = !!disabled; } }
  function initPanelData() {
    var panel = byId(ids.initErrorPanel);
    return {
      panel: panel,
      stage: panel && panel.querySelector("[data-init-stage]"),
      code: panel && panel.querySelector("[data-init-code]"),
      requestId: panel && panel.querySelector("[data-init-request-id]")
    };
  }
  function showInitError(code, stage, requestId) {
    var d = initPanelData();
    if (d.panel) d.panel.hidden = false;
    text(d.stage, stage || state.stage || "initialization");
    text(d.code, code || "script_initialization_failed");
    text(d.requestId, requestId || "unavailable");
    setButton("Try Again", false);
    status("Secure form setup could not be completed. Reload the page and try again.");
  }
  function showError(data, httpStatus, fallbackStage) {
    var panel = byId(ids.errorPanel);
    if (!panel) return;
    panel.hidden = false;
    text(panel.querySelector("[data-error-message]"), data.message || "The participant could not be saved.");
    text(panel.querySelector("[data-error-status]"), httpStatus || data.status || "unavailable");
    text(panel.querySelector("[data-error-code]"), data.error || "participant_create_failed");
    text(panel.querySelector("[data-error-stage]"), data.stage || fallbackStage || "unknown");
    text(panel.querySelector("[data-error-request-id]"), data.request_id || "unavailable");
    text(panel.querySelector("[data-error-rolled-back]"), data.rolled_back === false ? "No" : "Yes");
  }
  async function fetchCsrf() {
    state.stage = "csrf_fetch";
    var response = await fetch(CSRF_URL, { credentials: "include" });
    state.stage = "csrf_response_parse";
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw { code: "csrf_fetch_failed", stage: "csrf_fetch", request_id: data.request_id };
    var token = data.csrf_token;
    if (!token || typeof token !== "string") throw { code: "csrf_response_invalid", stage: "csrf_response_parse", request_id: data.request_id };
    return token;
  }
  async function initialize() {
    state.stage = "element_lookup";
    var form = byId(ids.form), btn = byId(ids.button);
    if (!form) { showInitError("form_element_missing", "element_lookup"); return; }
    if (!btn) { showInitError("submit_button_missing", "element_lookup"); return; }
    var timeout = setTimeout(function () {
      if (!state.initialized) showInitError("csrf_fetch_failed", state.stage || "initializing");
    }, INIT_TIMEOUT_MS);
    try {
      setButton("Preparing secure form…", true);
      status("Preparing secure form…");
      state.csrf = await fetchCsrf();
      clearTimeout(timeout);
      state.stage = "submit_listener_attach";
      form.addEventListener("submit", submitParticipant);
      var copy = byId(ids.copyButton); if (copy) copy.addEventListener("click", copyInstructions);
      var print = byId(ids.printButton); if (print) print.addEventListener("click", function () { window.print(); });
      btn.addEventListener("click", function () { if (!state.initialized) initialize(); });
      state.initialized = true;
      state.stage = "ready";
      setButton("Add Participant", false);
      status("Secure form ready.");
    } catch (err) {
      clearTimeout(timeout);
      showInitError(err.code || "csrf_fetch_failed", err.stage || state.stage, err.request_id);
    }
  }
  async function submitParticipant(event) {
    event.preventDefault();
    if (state.submitting) return;
    if (!state.csrf) { showInitError("csrf_response_invalid", "submit_preflight"); return; }
    var form = event.currentTarget;
    var panel = byId(ids.errorPanel), card = byId(ids.credentialCard);
    if (panel) panel.hidden = true;
    if (card) card.hidden = true;
    state.submitting = true;
    setButton("Adding Participant…", true);
    status("Adding participant…");
    var body = Object.fromEntries(new FormData(form).entries());
    try {
      var response = await fetch(form.dataset.canonicalPost, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": state.csrf },
        credentials: "include",
        body: JSON.stringify(body)
      });
      var data = await response.json().catch(function () { return { ok: false, error: "non_json_response", message: "The participant response could not be read safely.", stage: "response_parse", request_id: "unavailable", rolled_back: true }; });
      if (!response.ok || data.ok === false) {
        showError(data, response.status, "participant_post");
        status(data.message || "The participant could not be saved.");
        state.submitting = false;
        setButton("Try Again", false);
        return;
      }
      renderSuccess(data, form);
    } catch (err) {
      showError({ message: err.message || "The participant request could not be sent.", error: "network_or_script_error", stage: "frontend_fetch", request_id: "unavailable", rolled_back: true }, 0, "frontend_fetch");
      status("The participant request could not be sent.");
      state.submitting = false;
      setButton("Try Again", false);
    }
  }
  function renderSuccess(data, form) {
    var card = byId(ids.credentialCard), c = data.credential_setup_card || {};
    if (!card) return;
    card.hidden = false;
    status("Participant added.");
    text(card.querySelector("[data-preferred]"), c.preferred_name || (data.participant && data.participant.preferred_name));
    text(card.querySelector("[data-cohort]"), c.cohort_name || form.dataset.cohortName);
    text(card.querySelector("[data-leader-id]"), c.leader_id);
    text(card.querySelector("[data-pin]"), c.temporary_pin);
    text(card.querySelector("[data-consent]"), data.participant && data.participant.consent_status);
    var copy = byId(ids.copyInstructions);
    if (copy) copy.value = ["Welcome to The Leader Within", "", "Sign-in page:", location.origin + "/the-leader-within/sign-in", "", "Leader ID:", c.leader_id || "", "", "Temporary password:", c.temporary_pin || "", "", "On first sign-in, you will be asked to create a private password.", "", "Your cohort:", c.cohort_name || form.dataset.cohortName || "", "", "Your starting point:", "Week " + ((data.enrollment && data.enrollment.current_week) || form.dataset.currentWeek) + ", Session " + ((data.enrollment && data.enrollment.current_session) || form.dataset.currentSession)].join("\n");
    setButton("Participant Added", true);
    form.reset();
  }
  async function copyInstructions() {
    var copy = byId(ids.copyInstructions);
    if (navigator.clipboard && copy) await navigator.clipboard.writeText(copy.value);
    status("Instructions copied.");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
  window.tlwAddParticipantForm = { initialize: initialize, showInitError: showInitError, ids: ids };
}());
