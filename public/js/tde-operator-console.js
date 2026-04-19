(function () {
  function safeTrim(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[ch]);
    });
  }

  function toCsv(value) {
    if (!Array.isArray(value)) return value == null ? "-" : String(value);
    return value.length ? value.join(", ") : "none";
  }

  function prettyStatus(status) {
    var text = safeTrim(status).replace(/_/g, " ");
    return text || "-";
  }

  function pickValue(entry, keys, fallback) {
    var list = Array.isArray(keys) ? keys : [keys];
    for (var i = 0; i < list.length; i += 1) {
      var key = list[i];
      if (!key) continue;
      var value = entry && entry[key];
      if (Array.isArray(value) && value.length) return value.join(", ");
      var normalized = safeTrim(value);
      if (normalized) return normalized;
    }
    return safeTrim(fallback) || "-";
  }

  function renderKvPanel(id, rows, emptyText) {
    var node = document.getElementById(id);
    if (!node) return;
    var list = Array.isArray(rows) ? rows.filter(function (entry) { return entry && entry.label; }) : [];
    if (!list.length) {
      node.innerHTML = "<div class='muted'>" + escapeHtml(emptyText || "No data available.") + "</div>";
      return;
    }
    node.innerHTML = "<ul style='margin:0;padding-left:18px;'>" + list.map(function (entry) {
      return "<li><b>" + escapeHtml(entry.label) + ":</b> " + escapeHtml(entry.value == null || entry.value === "" ? "-" : String(entry.value)) + "</li>";
    }).join("") + "</ul>";
  }

  function setStatus(message, isError) {
    var node = document.getElementById("tdeOpsStatus");
    if (!node) return;
    node.textContent = message;
    node.className = isError ? "muted text-danger" : "muted";
  }

  function jsonFetch(url) {
    return fetch(url, { credentials: "include" }).then(function (res) {
      return res.text().then(function (body) {
        var data = {};
        try { data = body ? JSON.parse(body) : {}; } catch (_) { data = {}; }
        if (!res.ok) {
          var err = new Error(data.error || ("Request failed (" + res.status + ")"));
          err.status = res.status;
          throw err;
        }
        return data;
      });
    });
  }

  function tdeApi(path, childId) {
    return path.replace(":childId", encodeURIComponent(childId));
  }

  var internalEnabled = false;
  var showDetails = false;
  var INTERNAL_TEST_SCOPE = "test1";

  function resolveAccountContext() {
    var query = new URLSearchParams(window.location.search || "");
    return {
      tenant: safeTrim(query.get("tenant")),
      email: safeTrim(query.get("email")).toLowerCase(),
      childId: safeTrim(query.get("child_id") || query.get("childId")),
      internalTestMode: ["1", "true", "yes", "on"].indexOf(safeTrim(query.get("internal_test_mode")).toLowerCase()) >= 0
    };
  }

  function loadChildProfiles(accountCtx) {
    if (!accountCtx.tenant || !accountCtx.email) return Promise.resolve([]);
    var endpoint = new URL("/api/youth-development/children", window.location.origin);
    endpoint.searchParams.set("tenant", accountCtx.tenant);
    endpoint.searchParams.set("email", accountCtx.email);
    return jsonFetch(endpoint.pathname + endpoint.search).then(function (payload) {
      return Array.isArray(payload && payload.children) ? payload.children : [];
    }).catch(function () { return []; });
  }

  function renderPanels(mapped, childId, visibilityState) {
    var overview = mapped.overview && mapped.overview.value || {};
    var rollout = mapped.rollout && mapped.rollout.value || {};
    var validation = mapped.validation && mapped.validation.value || {};
    var evidence = mapped.evidence && mapped.evidence.value || {};
    var flags = mapped.flags && mapped.flags.value || {};
    var recommendations = mapped.recommendations && mapped.recommendations.value || {};
    var insights = mapped.insights && mapped.insights.value || {};
    var trajectory = mapped.trajectory && mapped.trajectory.value || {};
    var milestone = mapped.milestone && mapped.milestone.value || {};
    var personalization = mapped.personalization && mapped.personalization.value || {};
    var parentCoaching = mapped.parentCoaching && mapped.parentCoaching.value || {};
    var checkin = mapped.checkin && mapped.checkin.value || {};
    var intervention = mapped.intervention && mapped.intervention.value || {};
    var adherence = mapped.adherence && mapped.adherence.value || {};
    var voiceCheckin = mapped.voiceCheckin && mapped.voiceCheckin.value || {};
    var voiceSections = mapped.voiceSections && mapped.voiceSections.value || {};
    var voiceStatus = mapped.voiceStatus && mapped.voiceStatus.value || {};
    var voiceEligibility = mapped.voiceEligibility && mapped.voiceEligibility.value || {};
    var explanation = mapped.explanation && mapped.explanation.value || {};

    var missingContracts = [];
    var missingFromOverview = overview && overview.admin_overview && overview.admin_overview.missing_contract_burden && overview.admin_overview.missing_contract_burden.missing_contracts;
    if (Array.isArray(missingFromOverview)) missingContracts = missingContracts.concat(missingFromOverview);
    var missingFromValidation = validation && validation.missing_contract_burden && validation.missing_contract_burden.missing_contracts;
    if (Array.isArray(missingFromValidation)) missingContracts = missingContracts.concat(missingFromValidation);
    var missingFromEvidence = evidence && evidence.evidence_quality_overview && evidence.evidence_quality_overview.missing_contract_burden && evidence.evidence_quality_overview.missing_contract_burden.missing_contracts;
    if (Array.isArray(missingFromEvidence)) missingContracts = missingContracts.concat(missingFromEvidence);
    missingContracts = Array.from(new Set(missingContracts.filter(Boolean)));

    renderKvPanel("tdeOverviewPanel", [
      { label: "Child/Test Account", value: childId || "scope required" },
      { label: "Overview", value: pickValue(overview, ["display_title", "display_summary"], "TDE Overview") },
      { label: "Rollout State", value: prettyStatus(rollout.rollout_status && rollout.rollout_status.current_rollout_mode || (overview.admin_overview && overview.admin_overview.rollout_status && overview.admin_overview.rollout_status.current_rollout_mode)) },
      { label: "Readiness State", value: prettyStatus(overview.admin_overview && overview.admin_overview.rollout_status && overview.admin_overview.rollout_status.pilot_eligibility_summary && overview.admin_overview.rollout_status.pilot_eligibility_summary.readiness_status) },
      { label: "Voice Availability State", value: prettyStatus(overview.admin_overview && overview.admin_overview.rollout_status && overview.admin_overview.rollout_status.voice_availability_status) },
      { label: "Evidence Quality Summary", value: prettyStatus(evidence.evidence_quality_overview && evidence.evidence_quality_overview.status) },
      { label: "Missing-Contract Burden Summary", value: toCsv(missingContracts) },
      { label: "Operator Visibility State", value: visibilityState === "auto" ? "endpoint-derived" : visibilityState }
    ], "No TDE overview data loaded.");

    renderKvPanel("tdeChildDevelopmentPanel", [
      { label: "Latest Recommendations", value: toCsv((recommendations.display_items || []).slice(0, 3).length ? (recommendations.display_items || []).slice(0, 3) : (recommendations.recommendations || []).map(function (r) { return pickValue(r, ["display_title", "title", "action", "recommendation_id"], "recommendation"); }).slice(0, 3)) },
      { label: "Recommendations Status", value: prettyStatus(pickValue(recommendations, ["display_status", "contracts_status", "status"], "unknown")) },
      { label: "Insights", value: toCsv((insights.display_items || []).slice(0, 3).length ? (insights.display_items || []).slice(0, 3) : (insights.insights || []).map(function (i) { return pickValue(i, ["display_title", "insight", "statement", "signal"], "insight"); }).slice(0, 3)) },
      { label: "Insights Status", value: prettyStatus(pickValue(insights, ["display_status", "contracts_status", "status"], "unknown")) },
      { label: "Trajectory Summary", value: prettyStatus(pickValue(trajectory, ["display_status", "trajectory_state", "status"], "unknown")) },
      { label: "Milestone Comparison", value: prettyStatus(pickValue(milestone, ["display_status", "comparison_status", "status"], "unknown")) },
      { label: "Personalization Summary", value: prettyStatus(pickValue(personalization, ["display_status", "contracts_status", "status"], "unknown")) },
      { label: "Parent Coaching Summary", value: prettyStatus(pickValue(parentCoaching, ["display_status", "summary_status", "status"], "unknown")) }
    ], "No child development data loaded.");

    renderKvPanel("tdeCheckinInterventionPanel", [
      { label: "Weekly Check-in Status", value: prettyStatus(pickValue(checkin, ["display_status", "checkin_status", "status"], "unknown")) },
      { label: "Check-in Summary", value: prettyStatus(pickValue(checkin, ["display_summary"], checkin.evidence_sufficiency && checkin.evidence_sufficiency.status)) },
      { label: "Intervention Summary", value: prettyStatus(pickValue(intervention, ["display_status", "status"], intervention.intervention_readiness && intervention.intervention_readiness.status)) },
      { label: "Session/Adherence Indicators", value: prettyStatus(pickValue(adherence, ["display_status", "adherence_status", "status"], "unknown")) }
    ], "No check-in/intervention data loaded.");

    renderKvPanel("tdeVoicePanel", [
      { label: "Child Prompt Playback Status", value: prettyStatus(pickValue(voiceCheckin, ["display_status", "voice_readiness_status"], voiceCheckin.voice_state && voiceCheckin.voice_state.availability)) },
      { label: "Parent Section Playback Status", value: prettyStatus(pickValue(voiceSections, ["display_status", "voice_readiness_status"], voiceSections.voice_state && voiceSections.voice_state.availability)) },
      { label: "Fallback/Availability State", value: prettyStatus(pickValue(voiceStatus, ["display_status", "voice_readiness_status", "voice_availability_status"], voiceStatus.voice_state && voiceStatus.voice_state.availability)) },
      { label: "Voice Eligibility", value: prettyStatus(pickValue(voiceEligibility, ["display_status", "voice_readiness_status", "eligibility_status", "voice_eligibility_status"], "unknown")) },
      { label: "Content Registry Status", value: prettyStatus(pickValue(voiceSections, ["content_registry_status"], pickValue(voiceCheckin, ["content_registry_status"], "unknown"))) },
      { label: "Readability Status", value: prettyStatus(pickValue(voiceSections, ["readability_status"], pickValue(voiceCheckin, ["readability_status"], "unknown"))) },
      { label: "Voice Readiness Status", value: prettyStatus(pickValue(voiceSections, ["voice_readiness_status"], pickValue(voiceCheckin, ["voice_readiness_status"], "unknown"))) }
    ], "No voice data loaded (voice is optional).");

    renderKvPanel("tdeValidationAdminPanel", [
      { label: "Validation Summary", value: prettyStatus(validation.validation_status && validation.validation_status.status) },
      { label: "Calibration Summary", value: toCsv(overview.admin_overview && overview.admin_overview.calibration_state && overview.admin_overview.calibration_state.active_calibration_versions) },
      { label: "Feature Flags", value: toCsv(flags.feature_flags && flags.feature_flags.controllable_in_phase23) },
      { label: "Rollout Status", value: prettyStatus(rollout.rollout_status && rollout.rollout_status.current_rollout_mode) },
      { label: "Evidence-Quality Overview", value: prettyStatus(evidence.evidence_quality_overview && evidence.evidence_quality_overview.status) },
      { label: "Missing Contracts (Explicit)", value: toCsv(missingContracts) }
    ], "No validation/admin data loaded.");

    if (showDetails) {
      renderKvPanel("tdeExplanationPanel", [
        { label: "Recommendation Explanation Status", value: prettyStatus(pickValue(explanation, ["display_status", "status", "contracts_status"], "unknown")) },
        { label: "Explanation Highlights", value: toCsv((explanation.display_items || []).slice(0, 5).length ? (explanation.display_items || []).slice(0, 5) : (explanation.explanations || []).map(function (entry) { return pickValue(entry, ["display_title", "title", "summary", "reason"], "explanation"); }).slice(0, 5)) },
        { label: "Scope", value: childId || "scope required" }
      ], "No explanation data available.");
    }
  }

  function loadPanels() {
    var childId = safeTrim((document.getElementById("tdeChildScopeInput") || {}).value);
    var visibilityState = safeTrim((document.getElementById("tdeVisibilityStateInput") || {}).value) || "auto";
    if (!childId) {
      setStatus("Child/test account scope is required for deterministic panel loading.", true);
      renderPanels({}, "", visibilityState);
      return;
    }

    var endpoints = {
      overview: tdeApi("/api/youth-development/tde/admin/overview?child_id=:childId", childId),
      rollout: tdeApi("/api/youth-development/tde/admin/rollout-status?child_id=:childId", childId),
      flags: "/api/youth-development/tde/admin/feature-flags",
      validation: tdeApi("/api/youth-development/tde/admin/validation-status?child_id=:childId", childId),
      evidence: tdeApi("/api/youth-development/tde/admin/evidence-quality-overview?child_id=:childId", childId),
      recommendations: tdeApi("/api/youth-development/tde/recommendations/:childId", childId),
      insights: tdeApi("/api/youth-development/tde/insights/:childId", childId),
      trajectory: tdeApi("/api/youth-development/tde/growth-trajectory/:childId", childId),
      milestone: tdeApi("/api/youth-development/tde/milestone-comparison/:childId", childId),
      personalization: tdeApi("/api/youth-development/tde/personalization/:childId", childId),
      parentCoaching: tdeApi("/api/youth-development/tde/parent-coaching/:childId", childId),
      checkin: tdeApi("/api/youth-development/tde/checkin-summary/:childId", childId),
      intervention: tdeApi("/api/youth-development/tde/intervention-summary/:childId", childId),
      adherence: tdeApi("/api/youth-development/tde/adherence/:childId", childId),
      voiceCheckin: tdeApi("/api/youth-development/tde/voice/checkin/:childId", childId),
      voiceSections: tdeApi("/api/youth-development/tde/voice/sections/:childId", childId),
      voiceStatus: tdeApi("/api/youth-development/tde/voice/status/:childId", childId),
      voiceEligibility: tdeApi("/api/youth-development/tde/voice/eligibility/:childId", childId),
      explanation: tdeApi("/api/youth-development/tde/recommendations/:childId/explanation", childId)
    };

    setStatus("Loading internal TDE panel data…", false);
    var keys = Object.keys(endpoints);
    Promise.all(keys.map(function (key) {
      return jsonFetch(endpoints[key]).then(function (value) {
        return { key: key, status: "fulfilled", value: value };
      }).catch(function (reason) {
        return { key: key, status: "rejected", reason: reason };
      });
    })).then(function (results) {
      var mapped = {};
      var failures = [];
      results.forEach(function (result) {
        mapped[result.key] = result;
        if (result.status === "rejected") failures.push(result.key + ": " + (result.reason && result.reason.message || "error"));
      });

      renderPanels(mapped, childId, visibilityState);

      if (failures.length) setStatus("Loaded with fallback/missing data states: " + failures.join(" | "), true);
      else setStatus("TDE internal panels loaded for child/test account: " + childId, false);
    });
  }

  function init() {
    var section = document.getElementById("tdeOperatorConsole");
    if (!section) return;
    jsonFetch("/api/owner/session").then(function (session) {
      if (!session || session.is_admin !== true) {
        section.style.display = "none";
        return;
      }
      section.style.display = "";
      setStatus("Internal surface disabled by default. Use the gate button to run controlled TDE extension inspection.", false);

      var gateBtn = document.getElementById("tdeInternalSurfaceBtn");
      var loadBtn = document.getElementById("tdeLoadPanelsBtn");
      var detailsBtn = document.getElementById("tdeToggleDetailsBtn");
      var detailsRow = document.getElementById("tdeExplanationRow");
      var childScopeInput = document.getElementById("tdeChildScopeInput");
      var accountCtx = resolveAccountContext();
      loadChildProfiles(accountCtx).then(function (children) {
        if (!childScopeInput) return;
        if (children.length === 1) {
          childScopeInput.value = safeTrim(children[0].child_id);
          setStatus("Real child scope detected and auto-selected: " + safeTrim(children[0].child_name || children[0].child_id), false);
          return;
        }
        if (children.length > 1) {
          setStatus("Multiple child profiles available. Select one child scope before loading panels.", false);
          return;
        }
        if (accountCtx.internalTestMode) {
          childScopeInput.value = childScopeInput.value || INTERNAL_TEST_SCOPE;
          setStatus("No real child profile in scope. Internal test mode is enabled for placeholder scope use.", true);
        } else {
          childScopeInput.value = "";
          setStatus("No child in scope. Complete child setup from youth intake (include child name) to enable child-scoped loading.", true);
        }
      });
      if (gateBtn) {
        gateBtn.addEventListener("click", function () {
          internalEnabled = !internalEnabled;
          gateBtn.textContent = internalEnabled ? "Disable Internal Surface" : "Enable Internal Surface";
        });
      }
      if (loadBtn) {
        loadBtn.addEventListener("click", function () {
          if (!internalEnabled) {
            setStatus("Enable the internal surface gate before loading TDE extension panels.", true);
            return;
          }
          loadPanels();
        });
      }
      if (detailsBtn && detailsRow) {
        detailsBtn.addEventListener("click", function () {
          showDetails = !showDetails;
          detailsRow.style.display = showDetails ? "" : "none";
        });
      }
    }).catch(function () {
      section.style.display = "none";
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
