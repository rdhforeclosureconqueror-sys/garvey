(function () {
  function safeTrim(value) {
    return String(value == null ? "" : value).trim();
  }

  function setStatus(message, isError) {
    var node = document.getElementById("tdeOpsStatus");
    if (!node) return;
    node.textContent = message;
    node.className = isError ? "muted text-danger" : "muted";
  }

  function displayValue(value) {
    if (value == null || value === "") return "-";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
    return JSON.stringify(value);
  }

  function renderPanel(id, payload) {
    var node = document.getElementById(id);
    if (!node) return;
    node.innerHTML = "<pre style='white-space:pre-wrap;margin:0;'>" +
      displayValue(payload) +
      "</pre>";
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

  function loadPanels() {
    var childId = safeTrim((document.getElementById("tdeChildScopeInput") || {}).value);
    if (!childId) {
      setStatus("Child/test account scope is required for deterministic panel loading.", true);
      return;
    }

    var endpoints = {
      overview: tdeApi("/api/youth-development/tde/admin/overview?childId=:childId", childId),
      rollout: tdeApi("/api/youth-development/tde/admin/rollout-status?childId=:childId", childId),
      flags: "/api/youth-development/tde/admin/feature-flags",
      validation: tdeApi("/api/youth-development/tde/admin/validation-status?childId=:childId", childId),
      evidence: tdeApi("/api/youth-development/tde/admin/evidence-quality-overview?childId=:childId", childId),
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

      renderPanel("tdeOverviewPanel", {
        overview: mapped.overview,
        rollout: mapped.rollout,
        flags: mapped.flags,
        validation: mapped.validation,
        evidence: mapped.evidence
      });
      renderPanel("tdeChildDevelopmentPanel", {
        recommendations: mapped.recommendations,
        insights: mapped.insights,
        trajectory: mapped.trajectory,
        milestone: mapped.milestone,
        personalization: mapped.personalization,
        parentCoaching: mapped.parentCoaching
      });
      renderPanel("tdeCheckinInterventionPanel", {
        checkin: mapped.checkin,
        intervention: mapped.intervention,
        adherence: mapped.adherence
      });
      renderPanel("tdeVoicePanel", {
        voiceCheckin: mapped.voiceCheckin,
        voiceSections: mapped.voiceSections,
        voiceStatus: mapped.voiceStatus,
        voiceEligibility: mapped.voiceEligibility
      });
      renderPanel("tdeValidationAdminPanel", {
        rollout: mapped.rollout,
        flags: mapped.flags,
        validation: mapped.validation,
        evidence: mapped.evidence
      });
      if (showDetails) renderPanel("tdeExplanationPanel", { explanation: mapped.explanation });

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
