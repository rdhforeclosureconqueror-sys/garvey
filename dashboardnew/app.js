/* FILE: dashboardnew/app.js */
(function () {
  var api = window.GarveyApi || {};
  var DASH_CTX_KEY = "garvey_ctx_v1";
  var LOGIN_CTX_KEY = "garvey_login_ctx_v1";
  var ENGINE_CTX_KEY = "garvey_customer_return_engine_v1";
  var contributionsDisabledForTenant = false;
  var dashboardInitInFlight = false;
  var dashboardInitialized = false;
  var dashboardRefreshInFlight = false;
  var pageNavigatingAway = false;
  var customerProfileCtx = { tenant: "", ownerEmail: "", cid: "", rid: "" };

  function apiUrl(path, query) {
    if (typeof api.buildUrl === "function") return api.buildUrl(path, query || {});
    var qs = new URLSearchParams(query || {}).toString();
    return path + (qs ? "?" + qs : "");
  }

  function ownerApiUrl(path, query) {
    return apiUrl(path, query);
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function safeTrim(v) {
    var normalized = String(v ?? "").trim();
    if (!normalized) return "";
    var lowered = normalized.toLowerCase();
    if (lowered === "undefined" || lowered === "null") return "";
    return normalized;
  }

  function tenantFromUrl() {
    return safeTrim(params().get("tenant"));
  }

  function ownerEmailFromUrl() {
    return safeTrim(params().get("email")).toLowerCase();
  }

  function cidFromUrl() {
    return safeTrim(params().get("cid"));
  }

  function ridFromUrl() {
    return safeTrim(params().get("rid"));
  }

  function loginCtxFromStorage() {
    try {
      var raw = localStorage.getItem(LOGIN_CTX_KEY);
      if (!raw) return { tenant: "", email: "", cid: "", rid: "", ts: 0 };
      var parsed = JSON.parse(raw);
      return {
        tenant: safeTrim(parsed.tenant),
        email: safeTrim(parsed.email).toLowerCase(),
        cid: safeTrim(parsed.cid),
        rid: safeTrim(parsed.rid),
        ts: Number(parsed.ts || 0) || 0
      };
    } catch (_) {
      return { tenant: "", email: "", cid: "", rid: "", ts: 0 };
    }
  }

  function saveLoginCtx(next) {
    var payload = {
      tenant: safeTrim(next.tenant),
      email: safeTrim(next.email).toLowerCase(),
      cid: safeTrim(next.cid),
      rid: safeTrim(next.rid),
      ts: Date.now()
    };
    try {
      localStorage.setItem(LOGIN_CTX_KEY, JSON.stringify(payload));
    } catch (_) {}
    return payload;
  }

  function showSessionToast(msg) {
    var existing = document.getElementById("sessionToast");
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    var toast = document.createElement("div");
    toast.id = "sessionToast";
    toast.textContent = msg;
    toast.style.position = "fixed";
    toast.style.right = "16px";
    toast.style.bottom = "16px";
    toast.style.background = "#333";
    toast.style.color = "#fff";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "6px";
    toast.style.zIndex = "9999";
    toast.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    document.body.appendChild(toast);
    setTimeout(function () {
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 1200);
  }

  function clearSessionAndRedirect() {
    pageNavigatingAway = true;
    clearRefreshTimer();
    try {
      localStorage.removeItem(DASH_CTX_KEY);
      localStorage.removeItem(LOGIN_CTX_KEY);
      localStorage.removeItem(ENGINE_CTX_KEY);
      sessionStorage.removeItem(DASH_CTX_KEY);
      sessionStorage.removeItem(LOGIN_CTX_KEY);
      sessionStorage.removeItem(ENGINE_CTX_KEY);
      Object.keys(localStorage).forEach(function (key) {
        if (key.indexOf("garvey_owner_rid:") === 0) localStorage.removeItem(key);
      });
    } catch (_) {}
    fetch(ownerApiUrl("/api/owner/signout"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      keepalive: true
    }).catch(function () {}).finally(function () {
      showSessionToast("Session cleared");
      setTimeout(function () {
        window.location.href = "/index.html";
      }, 250);
    });
  }

  function resolveOwnerSession() {
    return fetch(ownerApiUrl("/api/owner/session"), { credentials: "include" })
      .then(function (res) {
        return res.json().catch(function () { return { authenticated: false }; });
      })
      .then(function (data) {
        if (!data || !data.authenticated) return null;
        var tenant = safeTrim(data.tenant);
        var email = safeTrim(data.email).toLowerCase();
        if (!tenant || !email) return null;
        return {
          tenant: tenant,
          email: email,
          role: safeTrim(data.role),
          isAdmin: data.is_admin === true,
          hasTenantOwnerAccess: data.has_tenant_owner_access === true
        };
      })
      .catch(function () { return null; });
  }

  function parseAdminEmailAllowlist() {
    var raw = safeTrim(window.GARVEY_ADMIN_EMAILS || "");
    var defaults = ["rdhforeclosureconqueror@gmail.com"];
    var list = raw
      ? raw.split(",").map(function (x) { return safeTrim(x).toLowerCase(); }).filter(Boolean)
      : defaults.slice();
    if (list.indexOf("rdhforeclosureconqueror@gmail.com") === -1) list.push("rdhforeclosureconqueror@gmail.com");
    return list;
  }

  function isAdminEmail(email) {
    var normalized = safeTrim(email).toLowerCase();
    if (!normalized) return false;
    return parseAdminEmailAllowlist().indexOf(normalized) !== -1;
  }

  function ridStorageKey(tenant, email) {
    if (!tenant || !email) return "";
    return "garvey_owner_rid:" + tenant + ":" + email;
  }

  function getRidFromStorage(tenant, email) {
    var key = ridStorageKey(tenant, email);
    if (!key) return "";
    try {
      return safeTrim(localStorage.getItem(key));
    } catch (_) {
      return "";
    }
  }

  function setRidInStorage(tenant, email, rid) {
    var key = ridStorageKey(tenant, email);
    if (!key || !rid) return;
    try {
      localStorage.setItem(key, rid);
    } catch (_) {}
  }

  function jsonFetch(url, options) {
    var reqOptions = Object.assign({ credentials: "include" }, options || {});
    return fetch(url, reqOptions).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) {
          var err = new Error(body.error || "Request failed");
          err.status = res.status;
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }

  function markContributionsDisabled() {
    contributionsDisabledForTenant = true;
  }

  function shouldSkipContributionCalls(tenant, ownerEmail) {
    return contributionsDisabledForTenant || !safeTrim(tenant) || !safeTrim(ownerEmail) || pageNavigatingAway;
  }

  function isContributionDisabledError(err) {
    if (!err) return false;
    if (Number(err.status || 0) === 403) return true;
    return /disabled/i.test(String(err.message || ""));
  }

  function ensureContextReady(tenant, ownerEmail) {
    return Promise.resolve({
      tenant: safeTrim(tenant),
      ownerEmail: safeTrim(ownerEmail).toLowerCase()
    }).then(function (ctx) {
      if (!ctx.tenant || !ctx.ownerEmail || pageNavigatingAway) return null;
      return ctx;
    });
  }

  function fmtDate(value) {
    return value ? new Date(value).toISOString().slice(0, 10) : "-";
  }

  function statusPill(status) {
    var cls =
      status === "active" ? "status-active" :
      status === "new" ? "status-new" :
      "status-dormant";
    return '<span class="status-pill ' + cls + '">' + status + "</span>";
  }

  function copyText(value) {
    if (!navigator.clipboard) return Promise.reject(new Error("Clipboard unavailable"));
    return navigator.clipboard.writeText(value);
  }

  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]);
    });
  }

  function clearRefreshTimer() {
    if (window.__garveyDashboardRefreshTimer) {
      clearInterval(window.__garveyDashboardRefreshTimer);
      window.__garveyDashboardRefreshTimer = null;
    }
  }

  function resetDashboardUi(reason) {
    clearRefreshTimer();
    feedEntries = [];
    previousTotals = null;

    ["metricUsers", "metricActions", "metricPoints", "metricVisits", "metricRepeatVisits", "metricReviewsReferrals"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = "0";
      el.setAttribute("data-value", "0");
    });

    var split = document.getElementById("metricReviewsReferralsSplit");
    if (split) split.textContent = "0 reviews • 0 referrals";

    var table = document.querySelector("#customersTable tbody");
    if (table) table.innerHTML = "";
    var tableEmpty = document.getElementById("tableEmpty");
    if (tableEmpty) tableEmpty.style.display = "block";

    renderChartEmpty("#morris-bar-chart", "barEmpty", false);
    renderChartEmpty("#morris-area-chart", "areaEmpty", false);
    renderChartEmpty("#morris-donut-chart", "donutEmpty", false);

    var feed = document.getElementById("activityFeed");
    if (feed) feed.textContent = "No activity yet.";

    var ownerInsight = document.getElementById("ownerInsight");
    if (ownerInsight) ownerInsight.textContent = "Business Owner: No submissions yet.";
    var customerInsight = document.getElementById("customerInsight");
    if (customerInsight) customerInsight.textContent = "Customer: No submissions yet.";

    var segmentsSummary = document.getElementById("segmentsSummary");
    if (segmentsSummary) segmentsSummary.textContent = "Loading customer segment stats…";
    var segmentsTop = document.getElementById("segmentsTop");
    if (segmentsTop) segmentsTop.innerHTML = "";

    var campaignsTable = document.querySelector("#campaignsTable tbody");
    if (campaignsTable) campaignsTable.innerHTML = "";
    var campaignsEmpty = document.getElementById("campaignsEmpty");
    if (campaignsEmpty) campaignsEmpty.style.display = "block";

    var ranking = document.getElementById("campaignRankingList");
    if (ranking) ranking.innerHTML = "No campaign performance data yet.";
    var topSummary = document.getElementById("campaignTopSummary");
    if (topSummary) topSummary.textContent = "No campaigns yet.";

    var actionSummary = document.getElementById("actionMetricsSummary");
    if (actionSummary) actionSummary.textContent = "No action metrics yet.";
    var actionBreakdown = document.getElementById("actionMetricsBreakdown");
    if (actionBreakdown) actionBreakdown.textContent = "Waiting for check-ins/reviews/referrals.";
    var dropOff = document.getElementById("dropOffInsight");
    if (dropOff) dropOff.textContent = "";
    var behaviorInsights = document.getElementById("behaviorInsights");
    if (behaviorInsights) behaviorInsights.textContent = "Insights will appear as activity grows.";

    var linkMsg = document.getElementById("campaignCreateMsg");
    if (linkMsg) linkMsg.textContent = reason ? ("Loading tenant dashboard: " + reason) : "";
    renderCampaignLinks("", "", null);
  }

  function resetSessionForTenantSwitch(nextCtx, prevCtx) {
    var prev = prevCtx || { tenant: "", email: "" };
    var next = nextCtx || { tenant: "", email: "" };
    var switched = !!(
      safeTrim(prev.tenant) && safeTrim(prev.email) &&
      (safeTrim(prev.tenant) !== safeTrim(next.tenant) || safeTrim(prev.email).toLowerCase() !== safeTrim(next.email).toLowerCase())
    );
    if (!switched) return false;
    try {
      localStorage.removeItem(DASH_CTX_KEY);
      localStorage.removeItem(ENGINE_CTX_KEY);
    } catch (_) {}
    return true;
  }

  function renderMetrics(dashboard) {
    var totalUsers = Number(dashboard.total_users || 0);
    var totalActions = Number(dashboard.total_actions || 0);
    var totalPoints = Number(dashboard.total_points || 0);
    var totalVisits = Number(dashboard.total_visits || 0);
    animateMetricValue("metricUsers", totalUsers);
    animateMetricValue("metricActions", totalActions);
    animateMetricValue("metricPoints", totalPoints);
    animateMetricValue("metricVisits", totalVisits);
  }

  function animateMetricValue(id, nextValue) {
    var el = document.getElementById(id);
    if (!el) return;
    var startValue = Number(el.getAttribute("data-value") || el.textContent || 0) || 0;
    var targetValue = Number(nextValue || 0) || 0;
    if (startValue === targetValue) return;
    var start = performance.now();
    var duration = 420;
    function frame(now) {
      var progress = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var value = Math.round(startValue + ((targetValue - startValue) * eased));
      el.textContent = String(value);
      if (progress < 1) requestAnimationFrame(frame);
      else el.setAttribute("data-value", String(targetValue));
    }
    el.classList.remove("metric-flash");
    void el.offsetWidth;
    el.classList.add("metric-flash");
    requestAnimationFrame(frame);
  }

  function renderTable(customers) {
    var rows = customers || [];
    var tbody = $("#customersTable tbody");
    tbody.empty();

    rows.forEach(function (row) {
      var primaryLabel = safeTrim(row.name) || row.email || ("id:" + row.user_id);
      var secondaryLabel = row.email && safeTrim(row.name) ? ("<div class='muted'>" + escapeHtml(row.email) + "</div>") : "";
      tbody.append(
        "<tr class='customer-row customer-row-clickable' data-user-id='" + escapeHtml(row.user_id) + "' data-email='" + escapeHtml(row.email || "") + "'><td><div>" + escapeHtml(primaryLabel) + "</div>" + secondaryLabel +
        "</td><td>" + escapeHtml((row.latest_assessment_engine || "-").toUpperCase()) +
        "</td><td>" + escapeHtml(row.latest_result_label || row.archetype || "No assessment yet") +
        "</td><td>" + (row.visits || 0) +
        "</td><td>" + (Number(row.points || 0)) +
        "</td><td>" + fmtDate(row.last_activity) +
        "</td><td>" + statusPill(row.status || "dormant") +
        "</td><td>" + escapeHtml(row.attribution && (row.attribution.source_type || row.attribution.source_path || row.attribution.tap_source) || "-") +
        "</td><td><button class='btn btn-primary btn-xs customer-profile-btn' data-user-id='" + escapeHtml(row.user_id) + "'>View Profile</button></td></tr>"
      );
    });

    if ($.fn.dataTable.isDataTable("#customersTable")) $("#customersTable").DataTable().destroy();

    if (rows.length) {
      document.getElementById("tableEmpty").style.display = "none";
      $("#customersTable").DataTable({ pageLength: 10, order: [[5, "desc"]] });
    } else {
      document.getElementById("tableEmpty").style.display = "block";
    }
  }

  function renderChartEmpty(id, emptyId, hasData) {
    $(id).empty();
    var el = document.getElementById(emptyId);
    if (el) el.style.display = hasData ? "none" : "block";
  }

  function renderBar(analytics) {
    var points = analytics.visits_by_day || [];
    renderChartEmpty("#morris-bar-chart", "barEmpty", points.length);
    if (!points.length) return;
    new Morris.Bar({
      element: "morris-bar-chart",
      data: points.map(function (p) { return { day: p.day, visits: p.visits }; }),
      xkey: "day",
      ykeys: ["visits"],
      labels: ["Visits"],
      hideHover: "auto",
      resize: true
    });
  }

  function renderArea(analytics) {
    var points = analytics.growth || [];
    renderChartEmpty("#morris-area-chart", "areaEmpty", points.length);
    if (!points.length) return;
    new Morris.Area({
      element: "morris-area-chart",
      data: points.map(function (p) { return { day: p.day, cumulative_customers: p.cumulative_customers }; }),
      xkey: "day",
      ykeys: ["cumulative_customers"],
      labels: ["Cumulative customers"],
      pointSize: 2,
      hideHover: "auto",
      resize: true
    });
  }

  function renderDonut(analytics) {
    if (!document.getElementById("morris-donut-chart")) return;
    var data = analytics.archetypes || [];
    renderChartEmpty("#morris-donut-chart", "donutEmpty", data.length);
    if (!data.length) return;
    new Morris.Donut({
      element: "morris-donut-chart",
      data: data.map(function (x) { return { label: x.archetype, value: x.count }; }),
      resize: true
    });
  }

  function renderInsights(analytics) {
    var owner = analytics.owner_assessment || {};
    var customer = analytics.customer_assessment || {};
    var families = analytics.assessment_families || {};
    var el;

    el = document.getElementById("ownerInsight");
    if (el) el.textContent = owner.primary
      ? ("Business Owner: " + owner.primary + " (secondary: " + (owner.secondary || "-") + ", weakness: " + (owner.weakness || "-") + ")")
      : "Business Owner: No submissions yet.";

    el = document.getElementById("customerInsight");
    if (el) el.textContent = customer.primary
      ? ("Customer: " + customer.primary + " | Personality: " + (customer.personality || "-") + " | Weakness: " + (customer.weakness || "-"))
      : "Customer: No submissions yet.";

    var familyHost = document.getElementById("assessmentFamiliesSummary");
    if (familyHost) {
      var labels = [
        { key: "voc", label: "VOC Assessments" },
        { key: "love", label: "Love Assessments" },
        { key: "leadership", label: "Leadership Assessments" },
        { key: "loyalty", label: "Loyalty Assessments" }
      ];
      familyHost.innerHTML = labels.map(function (item) {
        var row = families[item.key] || {};
        var starts = Number(row.starts || 0);
        var completions = Number(row.completions || 0);
        var sourceKeys = Object.keys(row.sources || {});
        var sourceSummary = sourceKeys.length
          ? sourceKeys.sort().map(function (source) { return source + ": " + Number(row.sources[source] || 0); }).join(" • ")
          : "other: 0";
        return "<div style='margin-bottom:8px;'><b>" + item.label + ":</b> starts " + starts + " • completions " + completions + "<div class='muted'>Sources: " + escapeHtml(sourceSummary) + "</div></div>";
      }).join("");
    }
  }

  function getAssessmentYouthActionsContainer() {
    var familyHost = document.getElementById("assessmentFamiliesSummary");
    if (familyHost && familyHost.parentNode) {
      return { host: familyHost.parentNode, anchor: "assessmentFamiliesSummary.parentNode", fallback: false };
    }
    var assessmentsPanel = document.getElementById("assessments");
    if (assessmentsPanel) {
      var panelBody = assessmentsPanel.querySelector(".panel-body");
      if (panelBody) return { host: panelBody, anchor: "assessments.panel-body", fallback: true };
      return { host: assessmentsPanel, anchor: "assessments", fallback: true };
    }
    var rewards = document.getElementById("rewards");
    if (rewards) {
      var rewardsPanelBody = rewards.querySelector(".panel .panel-body");
      if (rewardsPanelBody) return { host: rewardsPanelBody, anchor: "rewards.first-panel-body", fallback: true };
      return { host: rewards, anchor: "rewards", fallback: true };
    }
    var pageWrapper = document.getElementById("page-wrapper");
    if (pageWrapper) return { host: pageWrapper, anchor: "page-wrapper", fallback: true };
    if (document.body) return { host: document.body, anchor: "document.body", fallback: true };
    return null;
  }

  function getCustomerReturnEngineYouthActionsContainer() {
    var path = String((window.location && window.location.pathname) || "").toLowerCase();
    var isCustomerReturnEngineView = path.indexOf("rewards") !== -1
      || !!document.getElementById("assessmentMenu")
      || !!document.getElementById("assessmentOptions");
    if (!isCustomerReturnEngineView) return null;

    var assessmentOptions = document.getElementById("assessmentOptions");
    if (assessmentOptions) return { host: assessmentOptions, anchor: "assessmentOptions", fallback: false };

    var assessmentMenu = document.getElementById("assessmentMenu");
    if (assessmentMenu) return { host: assessmentMenu, anchor: "assessmentMenu", fallback: true };

    var actionCards = document.getElementById("actionCards");
    if (actionCards) return { host: actionCards, anchor: "actionCards", fallback: true };

    return null;
  }

  function upsertYouthActionsHost(placement, hostId, html) {
    if (!placement || !placement.host) return null;
    var host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement("div");
      host.id = hostId;
      host.style.marginTop = "10px";
      placement.host.appendChild(host);
    } else if (host.parentNode !== placement.host) {
      placement.host.appendChild(host);
      console.info("youth_actions_customer: moved host to", placement.anchor);
    }
    host.innerHTML = html;
    return host;
  }

  function youthActionHref(pathname) {
    var params = new URLSearchParams();
    if (customerProfileCtx.tenant) params.set("tenant", customerProfileCtx.tenant);
    if (customerProfileCtx.ownerEmail) params.set("email", customerProfileCtx.ownerEmail);
    if (customerProfileCtx.cid) params.set("cid", customerProfileCtx.cid);
    if (customerProfileCtx.rid) params.set("crid", customerProfileCtx.rid);
    var query = params.toString();
    return pathname + (query ? ("?" + query) : "");
  }

  function refreshYouthActionEntryPoints() {
    var intakeHref = youthActionHref("/youth-development/intake");
    var dashboardHref = youthActionHref("/youth-development/parent-dashboard");
    ["takeYouthAssessmentBtn", "takeYouthAssessmentBtnCre", "adminYouthAssessmentBtn"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.href = intakeHref;
    });
    ["takeYouthDashboardBtn", "takeYouthDashboardBtnCre", "adminYouthDashboardBtn"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.href = dashboardHref;
    });

    if (!customerProfileCtx.tenant || !customerProfileCtx.ownerEmail) return;
    var latestUrl = apiUrl("/api/youth-development/parent-dashboard/latest", {
      tenant: customerProfileCtx.tenant,
      email: customerProfileCtx.ownerEmail
    });
    fetch(latestUrl, { credentials: "include" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (payload) {
        if (!payload || payload.ok !== true || payload.has_result !== true) return;
        ["takeYouthDashboardBtn", "takeYouthDashboardBtnCre", "adminYouthDashboardBtn"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = "View Youth Results";
        });
        ["takeYouthAssessmentBtn", "takeYouthAssessmentBtnCre", "adminYouthAssessmentBtn"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) el.textContent = "Retake Youth Assessment";
        });
      })
      .catch(function () { return null; });
  }

  function renderActiveAssessmentYouthActions() {
    console.log("[YOUTH_TRACE] renderActiveAssessmentYouthActions:start", {
      tenant: tenantFromUrl(),
      email: ownerEmailFromUrl(),
      bodyReady: !!document.body
    });
    console.log("[YOUTH_TRACE] renderActiveAssessmentYouthActions:anchors", {
      assessmentFamiliesSummary: !!document.getElementById("assessmentFamiliesSummary"),
      assessments: !!document.getElementById("assessments"),
      accessStatusPanel: !!document.getElementById("accessStatusPanel"),
      ownerSnapshotBody: !!document.getElementById("ownerSnapshotBody"),
      body: !!document.body
    });
    var placement = getAssessmentYouthActionsContainer();
    if (!placement || !placement.host) {
      console.warn("[YOUTH_TRACE] renderActiveAssessmentYouthActions:exit:no-container");
      console.warn("youth_actions_customer: no stable container found for assessment buttons");
      return;
    }
    console.log("[YOUTH_TRACE] renderActiveAssessmentYouthActions:container-selected", {
      anchor: placement.anchor,
      fallback: placement.fallback
    });
    if (placement.fallback) {
      console.info("youth_actions_customer: fallback container", placement.anchor);
    }
    var dashboardHtml = '' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<a id="takeYouthAssessmentBtn" class="btn btn-default" href="/youth-development/intake">Take Youth Assessment</a>' +
        '<a id="takeYouthDashboardBtn" class="btn btn-default" href="/youth-development/parent-dashboard">Open Youth Parent Dashboard</a>' +
      "</div>";
    var host = upsertYouthActionsHost(placement, "assessmentYouthActions", dashboardHtml);

    var crePlacement = getCustomerReturnEngineYouthActionsContainer();
    if (crePlacement && crePlacement.host) {
      if (crePlacement.fallback) {
        console.info("youth_actions_customer: cre fallback container", crePlacement.anchor);
      }
      var creHtml = '' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<a id="takeYouthAssessmentBtnCre" class="btn btn-default" href="/youth-development/intake">Take Youth Assessment</a>' +
          '<a id="takeYouthDashboardBtnCre" class="btn btn-default" href="/youth-development/parent-dashboard">Open Youth Parent Dashboard</a>' +
        "</div>";
      upsertYouthActionsHost(crePlacement, "assessmentYouthActionsCre", creHtml);
    }
    refreshYouthActionEntryPoints();
    console.log("[YOUTH_TRACE] renderActiveAssessmentYouthActions:inserted", {
      hostChildCount: host.childElementCount,
      hostHtmlLength: (host.innerHTML || "").length,
      takeYouthAssessmentBtnExists: !!document.getElementById("takeYouthAssessmentBtn"),
      takeYouthAssessmentBtnCreExists: !!document.getElementById("takeYouthAssessmentBtnCre")
    });
  }

  function renderAdminYouthActions(ctx) {
    console.log("[YOUTH_TRACE] renderAdminYouthActions:start", {
      tenant: ctx && ctx.tenant,
      email: ctx && ctx.email,
      isAdmin: !!(ctx && ctx.isAdmin === true),
      bodyReady: !!document.body
    });
    console.log("[YOUTH_TRACE] renderAdminYouthActions:anchors", {
      accessStatusPanel: !!document.getElementById("accessStatusPanel"),
      ownerSnapshotBody: !!document.getElementById("ownerSnapshotBody"),
      pageWrapper: !!document.getElementById("page-wrapper"),
      body: !!document.body
    });
    var isAdmin = !!(ctx && ctx.isAdmin === true);
    var host = document.getElementById("adminYouthActionsHost");
    if (!isAdmin) {
      console.warn("[YOUTH_TRACE] renderAdminYouthActions:exit:not-admin");
      if (host) host.style.display = "none";
      return;
    }

    var container = null;
    var anchor = "";
    var accessPanel = document.getElementById("accessStatusPanel");
    if (accessPanel) {
      container = accessPanel.querySelector(".panel-body") || accessPanel;
      anchor = "accessStatusPanel";
    }
    if (!container) {
      var ownerSnapshot = document.getElementById("ownerSnapshotBody");
      if (ownerSnapshot) {
        container = ownerSnapshot.parentNode || ownerSnapshot;
        anchor = "ownerSnapshotBody";
      }
    }
    if (!container) {
      container = document.getElementById("page-wrapper") || document.body;
      anchor = container === document.body ? "document.body" : "page-wrapper";
      console.info("youth_actions_admin: fallback container", anchor);
    }
    if (!container) {
      console.warn("youth_actions_admin: no stable container found for admin buttons");
      console.warn("[YOUTH_TRACE] renderAdminYouthActions:exit:no-container");
      return;
    }
    console.log("[YOUTH_TRACE] renderAdminYouthActions:container-selected", {
      anchor: anchor || "unknown",
      isAdmin: isAdmin
    });

    if (!host) {
      host = document.createElement("div");
      host.id = "adminYouthActionsHost";
      host.style.marginTop = "10px";
      container.appendChild(host);
    } else if (host.parentNode !== container) {
      container.appendChild(host);
      console.info("youth_actions_admin: moved host to", anchor);
    }
    host.style.display = "";
    host.innerHTML = '' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<a id="adminYouthAssessmentBtn" class="btn btn-default" href="/youth-development/intake">Take Youth Assessment</a>' +
        '<a id="adminYouthDashboardBtn" class="btn btn-default" href="/youth-development/parent-dashboard">Open Youth Parent Dashboard</a>' +
      "</div>";
    refreshYouthActionEntryPoints();
    console.log("[YOUTH_TRACE] renderAdminYouthActions:inserted", {
      hostChildCount: host.childElementCount,
      hostHtmlLength: (host.innerHTML || "").length,
      adminYouthAssessmentBtnExists: !!document.getElementById("adminYouthAssessmentBtn")
    });
  }

  function renderCampaignLinks(tenant, ownerEmail, campaign) {
    var body = document.getElementById("campaignLinksBody");
    if (!body) return;
    if (!campaign) {
      body.textContent = "Create a campaign to view links.";
      var qrMissing = document.getElementById("campaignQrPreview");
      if (qrMissing) {
        qrMissing.removeAttribute("src");
        qrMissing.style.display = "none";
      }
      var qrMissingEmpty = document.getElementById("campaignQrEmpty");
      if (qrMissingEmpty) qrMissingEmpty.style.display = "block";
      var linkOutputMissing = document.getElementById("campaignLinkOutput");
      if (linkOutputMissing) linkOutputMissing.value = "";
      var downloadMissing = document.getElementById("downloadCampaignQrBtn");
      if (downloadMissing) {
        downloadMissing.href = "#";
        downloadMissing.setAttribute("download", "campaign-qr.png");
      }
      return;
    }
    var links = campaign.share_links || {};
    body.innerHTML = ["voc", "rewards", "landing"].map(function (key) {
      var href = links[key] || "";
      return '<div style="margin-bottom:8px;"><b>' + key.toUpperCase() + ':</b> <code>' + escapeHtml(href) + '</code> <button class="btn btn-xs btn-default" data-copy="' + escapeHtml(href) + '">Copy</button></div>';
    }).join("");

    Array.prototype.forEach.call(body.querySelectorAll("button[data-copy]"), function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn.getAttribute("data-copy")).then(function () {
          var msg = document.getElementById("campaignCreateMsg");
          if (msg) msg.textContent = "Copied!";
        });
      });
    });

    var qr = document.getElementById("campaignQrPreview");
    if (!qr) return;
    var qrSrc = apiUrl("/api/campaigns/qr", { tenant: tenant, cid: campaign.slug, target: "rewards", format: "png", email: ownerEmail, role: "business_owner" });
    qr.src = qrSrc;
    qr.style.display = "block";
    var qrEmpty = document.getElementById("campaignQrEmpty");
    if (qrEmpty) qrEmpty.style.display = "none";

    var linkOutput = document.getElementById("campaignLinkOutput");
    if (linkOutput) linkOutput.value = links.rewards || "";

    var copyBtn = document.getElementById("copyCampaignLinkBtn");
    if (copyBtn) {
      copyBtn.onclick = function () {
        if (!linkOutput || !linkOutput.value) return;
        copyText(linkOutput.value).then(function () {
          var msg = document.getElementById("campaignCreateMsg");
          if (msg) msg.textContent = "Campaign link copied!";
        });
      };
    }

    var downloadBtn = document.getElementById("downloadCampaignQrBtn");
    if (downloadBtn) {
      downloadBtn.href = qrSrc;
      downloadBtn.setAttribute("download", "campaign-" + safeTrim(campaign.slug || "qr") + ".png");
    }
  }

  function renderCampaignSummary(summary) {
    var rows = Array.isArray(summary && summary.campaigns) ? summary.campaigns : [];
    var tbody = document.querySelector("#campaignsTable tbody");
    if (!tbody) return;
    var ranking = document.getElementById("campaignRankingList");
    var topSummary = document.getElementById("campaignTopSummary");
    var totalEl = document.getElementById("metricReviewsReferrals");
    var splitEl = document.getElementById("metricReviewsReferralsSplit");
    tbody.innerHTML = "";
    var totalReviews = 0;
    var totalReferrals = 0;
    var normalized = rows.map(function (row) {
      var c = row.counts || {};
      var visits = Number(c.visits || 0);
      var conversions = Number(c.checkins || 0) + Number(c.reviews || 0) + Number(c.referrals || 0) + Number(c.wishlist || 0);
      var conversionRate = visits ? Math.round((conversions / visits) * 100) : 0;
      totalReviews += Number(c.reviews || 0);
      totalReferrals += Number(c.referrals || 0);
      return {
        label: row.label || row.slug || "-",
        slug: row.slug || "",
        visits: visits,
        conversions: conversions,
        conversionRate: conversionRate,
        reviews: Number(c.reviews || 0),
        referrals: Number(c.referrals || 0),
        lastActivity: row.last_activity_at
      };
    }).sort(function (a, b) { return b.conversions - a.conversions; });

    normalized.forEach(function (row) {
      tbody.innerHTML +=
        "<tr><td>" + row.label +
        ' <div class="muted">' + row.slug + "</div></td>" +
        "<td>" + row.visits + "</td>" +
        "<td>" + row.conversions + "</td>" +
        "<td>" + row.conversionRate + "%</td>" +
        "<td>" + row.reviews + "</td>" +
        "<td>" + row.referrals + "</td></tr>";
    });
    if (ranking) {
      ranking.innerHTML = normalized.slice(0, 5).map(function (row, idx) {
        return "<div><b>#" + (idx + 1) + " " + escapeHtml(row.label) + ":</b> " + row.conversions + " conversions from " + row.visits + " visits (" + row.conversionRate + "%)</div>";
      }).join("") || "No campaign performance data yet.";
    }
    if (topSummary) {
      var top = normalized[0];
      var nextText = top
        ? ("Top campaign: " + top.label + " • " + top.conversions + " conversions (" + top.conversionRate + "% conversion rate)")
        : "No campaigns yet.";
      animateTextSwap(topSummary, nextText);
    }
    if (totalEl) animateMetricValue("metricReviewsReferrals", totalReviews + totalReferrals);
    if (splitEl) animateTextSwap(splitEl, totalReviews + " reviews • " + totalReferrals + " referrals");
    var empty = document.getElementById("campaignsEmpty");
    if (empty) empty.style.display = rows.length ? "none" : "block";
  }

  function renderActionAndBehaviorMetrics(summary) {
    var actionSummary = document.getElementById("actionMetricsSummary");
    var actionBreakdown = document.getElementById("actionMetricsBreakdown");
    var dropOff = document.getElementById("dropOffInsight");
    var behaviorInsights = document.getElementById("behaviorInsights");
    if (!actionSummary || !actionBreakdown || !dropOff || !behaviorInsights) return;
    var totals = (summary && summary.totals) || {};
    var checkins = Number(totals.checkins || 0);
    var reviews = Number(totals.reviews || 0);
    var referrals = Number(totals.referrals || 0);
    var wishlist = Number(totals.wishlist || 0);
    var visits = Number(totals.visits || 0);
    var actionsTotal = checkins + reviews + referrals + wishlist;
    if (!actionsTotal && !visits) {
      actionSummary.textContent = "No action metrics yet.";
      actionBreakdown.textContent = "Waiting for check-ins/reviews/referrals.";
      dropOff.textContent = "";
      behaviorInsights.textContent = "Insights will appear as activity grows.";
      return;
    }
    var actionMix = [
      { label: "Check-ins", count: checkins },
      { label: "Reviews", count: reviews },
      { label: "Referrals", count: referrals },
      { label: "Wishlist Adds", count: wishlist }
    ].sort(function (a, b) { return b.count - a.count; });
    actionSummary.textContent = "Most used action: " + actionMix[0].label + " (" + actionMix[0].count + ")";
    actionBreakdown.innerHTML = actionMix.map(function (item) {
      var pct = actionsTotal ? Math.round((item.count / actionsTotal) * 100) : 0;
      return "<div><b>" + item.label + ":</b> " + item.count + " (" + pct + "%)</div>";
    }).join("");
    var conversionRate = visits ? Math.round((actionsTotal / visits) * 100) : 0;
    dropOff.textContent = visits
      ? ("Completion rate: " + conversionRate + "% (" + actionsTotal + " actions from " + visits + " visits).")
      : "No visits recorded yet.";

    var insights = [];
    if (reviews < Math.ceil(checkins * 0.35)) insights.push("Reviews are low vs check-ins → add stronger review prompts.");
    if (referrals >= Math.ceil(actionsTotal * 0.25)) insights.push("Referrals are strong → increase referral campaign visibility.");
    if (wishlist > checkins) insights.push("Wishlist activity is high → add follow-up reminders to convert interest.");
    if (conversionRate < 40 && visits > 5) insights.push("High drop-off from visit to action → simplify first action CTA.");
    if (!insights.length) insights.push("Action mix is healthy. Continue current campaigns and test one new offer.");
    behaviorInsights.innerHTML = insights.map(function (x) { return "<div>• " + escapeHtml(x) + "</div>"; }).join("");
  }

  var feedEntries = [];
  var previousTotals = null;
  function prependFeed(text) {
    feedEntries.unshift({ text: text, ts: new Date() });
    feedEntries = feedEntries.slice(0, 12);
    var feed = document.getElementById("activityFeed");
    if (!feed) return;
    if (!feedEntries.length) {
      feed.textContent = "No activity yet.";
      return;
    }
    if (feed.children.length >= 12) feed.removeChild(feed.lastElementChild);
    var row = feedEntries[0];
    var item = document.createElement("div");
    item.className = "activity-feed-item new";
    item.innerHTML = "<span>" + escapeHtml(row.text) + "</span><div class='muted'>" + row.ts.toLocaleTimeString() + "</div>";
    if (feed.classList.contains("empty-state")) feed.classList.remove("empty-state");
    feed.insertBefore(item, feed.firstChild);
    requestAnimationFrame(function () {
      item.classList.remove("new");
    });
  }

  function animateTextSwap(el, nextText) {
    if (!el) return;
    if (el.textContent === nextText) return;
    el.textContent = nextText;
    el.classList.remove("campaign-flash");
    void el.offsetWidth;
    el.classList.add("campaign-flash");
  }

  function updateFeedFromSummary(summary) {
    var totals = (summary && summary.totals) || {};
    var current = {
      checkins: Number(totals.checkins || 0),
      reviews: Number(totals.reviews || 0),
      referrals: Number(totals.referrals || 0),
      wishlist: Number(totals.wishlist || 0)
    };
    if (!previousTotals) {
      previousTotals = current;
      return;
    }
    var deltas = {
      checkins: current.checkins - previousTotals.checkins,
      reviews: current.reviews - previousTotals.reviews,
      referrals: current.referrals - previousTotals.referrals,
      wishlist: current.wishlist - previousTotals.wishlist
    };
    if (deltas.checkins > 0) prependFeed("New check-in activity (+" + deltas.checkins + ")");
    if (deltas.reviews > 0) prependFeed("New reviews submitted (+" + deltas.reviews + ")");
    if (deltas.referrals > 0) prependFeed("New referrals captured (+" + deltas.referrals + ")");
    if (deltas.wishlist > 0) prependFeed("New wishlist adds (+" + deltas.wishlist + ")");
    previousTotals = current;
  }

  function wireCampaignCreator(tenant, ownerEmail, cid, rid) {
    var btn = document.getElementById("createCampaignBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var labelInput = document.getElementById("campaignLabelInput");
      var sourceInput = document.getElementById("campaignSourceInput");
      var mediumInput = document.getElementById("campaignMediumInput");
      var slugInput = document.getElementById("campaignSlugInput");
      var msgEl = document.getElementById("campaignCreateMsg");
      var label = safeTrim(labelInput && labelInput.value);
      var source = safeTrim(sourceInput && sourceInput.value);
      var medium = safeTrim(mediumInput && mediumInput.value);
      var slug = safeTrim(slugInput && slugInput.value);

      if (!label) {
        if (msgEl) msgEl.textContent = "Campaign name is required.";
        return;
      }
      if (!tenant || !ownerEmail) {
        if (msgEl) msgEl.textContent = "Tenant and owner email are required to generate QR.";
        return;
      }

      jsonFetch(apiUrl("/api/campaigns/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": ownerEmail,
          "x-user-role": "business_owner"
        },
        credentials: "include",
        body: JSON.stringify({
          tenant: tenant,
          email: ownerEmail,
          label: label,
          slug: slug || undefined,
          source: source || undefined,
          medium: medium || undefined
        })
      })
        .then(function (resp) {
          if (msgEl) msgEl.textContent = "Campaign QR generated: " + resp.campaign.slug;
          renderCampaignLinks(tenant, ownerEmail, resp.campaign);
          return jsonFetch(tenantApiUrl(tenant, "/campaigns/summary", ownerEmail, cid, rid));
        })
        .then(renderCampaignSummary)
        .catch(function (err) {
          if (msgEl) msgEl.textContent = err.message;
        });
    });
  }

  function renderSegments(segments) {
    var summary = document.getElementById("segmentsSummary");
    var top = document.getElementById("segmentsTop");
    if (!summary || !top) return;
    var total = Number((segments && segments.total_customer_assessments) || 0);
    var distribution = Array.isArray(segments && segments.distribution) ? segments.distribution : [];
    if (!total) {
      summary.textContent = "No customer segment data yet.";
      top.innerHTML = "";
      return;
    }
    summary.textContent = "Total customer assessments: " + total;
    top.innerHTML = distribution.slice(0, 5).map(function (row) {
      return "<div><b>" + (row.archetype || "Unknown") + ":</b> " + (row.count || 0) + " (" + (row.percent || 0) + "%)</div>";
    }).join("");
  }

  function setupError(msg) {
    var el = document.getElementById("errorBanner");
    if (el) el.textContent = msg;
  }

  function normalizeResultPayload(body) {
    // supports either { result: {...} } or top-level fields
    if (body && body.result && typeof body.result === "object") return body.result;
    return body || {};
  }

  function ownerHubHtml(ctx) {
    var tenant = ctx.tenant;
    var email = ctx.email;
    var cid = ctx.cid;
    var rid = ctx.rid;

    var resultsParams = new URLSearchParams({ tenant: tenant, email: email });
    if (cid) resultsParams.set("cid", cid);
    if (rid) resultsParams.set("rid", rid);

    var resultsHref = "/results_owner.html?" + resultsParams.toString();

    var vocParams = new URLSearchParams({ tenant: tenant });
    if (cid) vocParams.set("cid", cid);
    if (email) vocParams.set("owner_email", email);
    if (rid) vocParams.set("rid", rid);
    var vocHref = "/voc.html?" + vocParams.toString();

    return '' +
      '<div style="margin-bottom:10px;">' +
        '<h4 style="margin-top:0;">Results Hub</h4>' +
        '<div><b>Owner email:</b> ' + escapeHtml(email || "-") + '</div>' +
        '<div><b>Result ID (rid):</b> ' + escapeHtml(rid || "-") + '</div>' +
        '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">' +
          '<a class="btn btn-sm btn-primary" href="' + escapeHtml(resultsHref) + '">View Results</a>' +
          '<button class="btn btn-sm btn-default" type="button" data-copy="' + escapeHtml(resultsHref) + '">Copy Results Link</button>' +
        '</div>' +
      '</div>' +
      '<div style="border-top:1px solid #eee;padding-top:10px;">' +
        '<h4 style="margin-top:0;">Customer Link</h4>' +
        '<div class="muted" style="margin-bottom:8px;">Anyone who completes VOC via this link will be attributed to this tenant/campaign.</div>' +
        '<div class="form-group"><label>Campaign slug (cid)</label><input id="ownerHubCidInput" class="form-control" value="' + escapeHtml(cid || "") + '" placeholder="campaign slug (required for campaign attribution)"></div>' +
        '<div class="form-group"><label>Shareable customer link</label><input id="ownerHubCustomerLink" class="form-control" readonly value="' + escapeHtml(vocHref) + '"></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<a id="ownerHubOpenCustomerLink" class="btn btn-sm btn-default" href="' + escapeHtml(vocHref) + '">Open Customer Link</a>' +
          '<button class="btn btn-sm btn-default" type="button" id="ownerHubCopyCustomerLink">Copy Customer Link</button>' +
        '</div>' +
      '</div>';
  }

  function wireOwnerHubCustomerLink(ctx) {
    var cidInput = document.getElementById("ownerHubCidInput");
    var linkInput = document.getElementById("ownerHubCustomerLink");
    var openLink = document.getElementById("ownerHubOpenCustomerLink");
    var copyBtn = document.getElementById("ownerHubCopyCustomerLink");
    if (!cidInput || !linkInput || !openLink || !copyBtn) return;

    function currentHref() {
      var q = new URLSearchParams({ tenant: ctx.tenant });
      var cid = safeTrim(cidInput.value);
      if (cid) q.set("cid", cid);
      if (ctx.email) q.set("owner_email", ctx.email);
      if (ctx.rid) q.set("rid", ctx.rid);
      return "/voc.html?" + q.toString();
    }

    function renderLink() {
      var href = currentHref();
      linkInput.value = href;
      openLink.href = href;
    }

    cidInput.addEventListener("input", renderLink);
    copyBtn.addEventListener("click", function () {
      copyText(linkInput.value).then(function () {
        var msg = document.getElementById("campaignCreateMsg");
        if (msg) msg.textContent = "Customer link copied!";
      }).catch(function (err) {
        alert(err.message);
      });
    });

    renderLink();
  }

  function wireCopyButtons(container) {
    Array.prototype.forEach.call(container.querySelectorAll("button[data-copy]"), function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-copy") || "";
        copyText(value).then(function () {
          var msg = document.getElementById("campaignCreateMsg");
          if (msg) msg.textContent = "Copied!";
        }).catch(function (err) {
          alert(err.message);
        });
      });
    });
  }

  function resultSummaryHtml(result) {
    if (!result) return '<div class="empty-state">No matching result yet.</div>';

    var percents = result.percents || {};
    var bars = Object.keys(percents)
      .sort(function (a, b) { return Number(percents[b] || 0) - Number(percents[a] || 0); })
      .map(function (role) {
        var pct = Number(percents[role] || 0);
        return '' +
          '<div style="margin-top:6px;">' +
            '<div style="display:flex;justify-content:space-between;"><span>' + escapeHtml(role) + '</span><span>' + pct + '%</span></div>' +
            '<div style="height:8px;border-radius:999px;background:#e5e7eb;overflow:hidden;">' +
              '<div style="height:8px;border-radius:999px;background:#337ab7;width:' + pct + '%;"></div>' +
            '</div>' +
          '</div>';
      })
      .join("");

    return '' +
      "<div><b>Primary:</b> " + escapeHtml(result.primary_role || result.primary_archetype || "-") + "</div>" +
      "<div><b>Secondary:</b> " + escapeHtml(result.secondary_role || result.secondary_archetype || "-") + "</div>" +
      "<div><b>Weakness:</b> " + escapeHtml(result.weakness_role || result.weakness_archetype || "-") + "</div>" +
      "<div><b>Updated:</b> " + fmtDate(result.created_at) + "</div>" +
      (bars ? ('<div style="margin-top:8px;"><b>Percent bars</b>' + bars + "</div>") : "");
  }

  function wirePathButtons(tenant, email, cid, rid) {
    function setHrefIfPresent(id, href) {
      var el = document.getElementById(id);
      if (!el) return;
      el.href = href;
    }

    var p1 = new URLSearchParams({ tenant: tenant });
    if (email) p1.set("email", email);
    if (cid) p1.set("cid", cid);
    if (rid) p1.set("rid", rid);
    setHrefIfPresent("garveyPathBtn", "/garvey_premium.html?" + p1.toString());
    setHrefIfPresent("garveyHubBtn", "/garvey_premium.html?" + p1.toString());

    var p2 = new URLSearchParams({ tenant: tenant });
    if (email) p2.set("email", email);
    if (cid) p2.set("cid", cid);
    if (rid) p2.set("rid", rid);
    setHrefIfPresent("rewardsPathBtn", "/rewards_premium.html?" + p2.toString());

    var p3 = new URLSearchParams({ tenant: tenant });
    if (email) p3.set("email", email);
    if (cid) p3.set("cid", cid);
    if (rid) p3.set("crid", rid);
    setHrefIfPresent("rewardsFallbackBtn", "/rewards.html?" + p3.toString());

    var p4 = new URLSearchParams({ tenant: tenant });
    if (email) p4.set("email", email);
    if (cid) p4.set("cid", cid);
    if (rid) p4.set("rid", rid);
    setHrefIfPresent("campaignQrNavBtn", "/dashboard.html?" + p4.toString() + "#campaignTracking");
    setHrefIfPresent("tapInNavBtn", "/dashboard/tap-crm?" + p4.toString());
    setHrefIfPresent("tapInLaunchBtn", "/dashboard/tap-crm?" + p4.toString());
  }

  function readSignInFormCtx() {
    var tenantInput = document.getElementById("signInTenantInput");
    var emailInput = document.getElementById("signInEmailInput");
    var cidInput = document.getElementById("signInCidInput");
    var ridInput = document.getElementById("signInRidInput");
    return {
      tenant: safeTrim(tenantInput && tenantInput.value),
      email: safeTrim(emailInput && emailInput.value).toLowerCase(),
      cid: safeTrim(cidInput && cidInput.value),
      rid: safeTrim(ridInput && ridInput.value)
    };
  }

  function renderSignInPanel(defaults) {
    var host = document.getElementById("dashboardSignInPanel");
    if (!host) return;
    var d = defaults || {};
    host.style.display = "";
    host.innerHTML = '' +
      '<div class="panel panel-default">' +
        '<div class="panel-heading"><i class="fa fa-sign-in fa-fw"></i> Sign In</div>' +
        '<div class="panel-body">' +
          '<p class="muted">Returning users: enter tenant + email to open your dashboard.</p>' +
          '<div class="form-group"><label>Tenant slug</label><input id="signInTenantInput" class="form-control" placeholder="tenant-slug" value="' + escapeHtml(d.tenant || "") + '"></div>' +
          '<div class="form-group"><label>Email</label><input id="signInEmailInput" type="email" class="form-control" placeholder="owner@example.com" value="' + escapeHtml(d.email || "") + '"></div>' +
          '<div class="form-group"><label>Campaign cid (optional)</label><input id="signInCidInput" class="form-control" placeholder="spring2026" value="' + escapeHtml(d.cid || "") + '"></div>' +
          '<div class="form-group"><label>Result ID rid (optional)</label><input id="signInRidInput" class="form-control" placeholder="owner result id" value="' + escapeHtml(d.rid || "") + '"></div>' +
          '<button id="signInSubmitBtn" class="btn btn-primary">Sign In</button>' +
          '<div id="signInMsg" class="empty-state" style="padding-top:8px;"></div>' +
          '<hr />' +
          '<h4 style="margin-top:0;">New here?</h4>' +
          '<p class="muted">Take an assessment first to create results.</p>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<a id="takeOwnerAssessmentBtn" class="btn btn-default" href="/intake.html">Take Owner Assessment</a>' +
            '<a id="takeCustomerAssessmentBtn" class="btn btn-default" href="/voc.html">Take Customer Assessment</a>' +
            '<a id="takeYouthAssessmentBtn" class="btn btn-default" href="/youth-development/intake">Take Youth Assessment</a>' +
            '<a id="takeYouthDashboardBtn" class="btn btn-default" href="/youth-development/parent-dashboard">Open Youth Parent Dashboard</a>' +
          "</div>" +
        "</div>" +
      "</div>";

    function refreshAssessmentLinks() {
      var c = readSignInFormCtx();
      var ownerParams = new URLSearchParams();
      var customerParams = new URLSearchParams();
      if (c.tenant) {
        ownerParams.set("tenant", c.tenant);
        customerParams.set("tenant", c.tenant);
      }
      if (c.cid) customerParams.set("cid", c.cid);
      var ownerBtn = document.getElementById("takeOwnerAssessmentBtn");
      var customerBtn = document.getElementById("takeCustomerAssessmentBtn");
      var youthAssessmentBtn = document.getElementById("takeYouthAssessmentBtn");
      var youthDashboardBtn = document.getElementById("takeYouthDashboardBtn");
      if (ownerBtn) ownerBtn.href = "/intake.html" + (ownerParams.toString() ? ("?" + ownerParams.toString()) : "");
      if (customerBtn) customerBtn.href = "/voc.html" + (customerParams.toString() ? ("?" + customerParams.toString()) : "");
      if (youthAssessmentBtn) youthAssessmentBtn.href = "/youth-development/intake";
      if (youthDashboardBtn) youthDashboardBtn.href = "/youth-development/parent-dashboard";
    }

    ["signInTenantInput", "signInCidInput"].forEach(function (id) {
      var input = document.getElementById(id);
      if (input) input.addEventListener("input", refreshAssessmentLinks);
    });

    var submitBtn = document.getElementById("signInSubmitBtn");
    if (submitBtn) submitBtn.addEventListener("click", function () {
      var c = readSignInFormCtx();
      if (!c.tenant || !c.email) {
        var signInMsg = document.getElementById("signInMsg");
        if (signInMsg) signInMsg.textContent = "Tenant and email are required.";
        return;
      }
      saveLoginCtx(c);
      if (c.rid) setRidInStorage(c.tenant, c.email, c.rid);
      var next = new URLSearchParams({ tenant: c.tenant, email: c.email });
      if (c.cid) next.set("cid", c.cid);
      if (c.rid) next.set("rid", c.rid);
      window.location.href = "/dashboard.html?" + next.toString();
    });

    refreshAssessmentLinks();
  }

  function replaceUrlRidIfMissing(tenant, email, rid, cid) {
    if (!tenant || !email || !rid) return;
    var p = params();
    if (safeTrim(p.get("rid"))) return;
    p.set("tenant", tenant);
    p.set("email", email);
    if (cid) p.set("cid", cid);
    p.set("rid", rid);
    history.replaceState(null, "", "/dashboard.html?" + p.toString());
  }

  function resolveOwnerRid(tenant, email, rid) {
    var fromInput = safeTrim(rid);
    if (fromInput) return Promise.resolve(fromInput);
    var fromStorage = getRidFromStorage(tenant, email);
    if (fromStorage) return Promise.resolve(fromStorage);
    if (!tenant || !email) return Promise.resolve("");
    return jsonFetch(apiUrl("/api/results/" + encodeURIComponent(email), { type: "business_owner", tenant: tenant }))
      .then(function (body) {
        var result = normalizeResultPayload(body);
        return safeTrim(result.result_id || body.result_id || "");
      })
      .catch(function () { return ""; });
  }

  function tenantApiUrl(tenant, path, ownerEmail, cid, rid, extraQuery) {
    var query = {};
    if (ownerEmail) query.email = ownerEmail;
    if (cid) query.cid = cid;
    if (rid) query.rid = rid;
    if (extraQuery && typeof extraQuery === "object") {
      Object.keys(extraQuery).forEach(function (k) {
        if (extraQuery[k] == null || extraQuery[k] === "") return;
        query[k] = extraQuery[k];
      });
    }
    return apiUrl("/t/" + encodeURIComponent(tenant) + path, query);
  }

  function renderProducts(tenant, ownerEmail, cid, rid, products) {
    var tbody = document.querySelector("#productsTable tbody");
    var empty = document.getElementById("productsEmpty");
    if (!tbody || !empty) return;
    var rows = Array.isArray(products) ? products : [];
    tbody.innerHTML = rows.map(function (p) {
      return "<tr>" +
        "<td>" + (p.showcase_eligible ? ('<input type=\"checkbox\" class=\"product-feature-checkbox\" data-id=\"' + Number(p.id) + '\" ' + (p.featured_for_showcase ? "checked" : "") + " />") : "-") + "</td>" +
        "<td>" + escapeHtml(p.name || "-") + "</td>" +
        "<td>" + escapeHtml(p.price_text || "-") + "</td>" +
        "<td>" + (p.is_active ? "Yes" : "No") + "</td>" +
        "<td>" + Number(p.sort_order || 0) + "</td>" +
        "<td>" + (p.showcase_eligible ? "Yes" : "No") + "</td>" +
        "<td>" +
          '<button class="btn btn-xs btn-default product-toggle-btn" data-id="' + Number(p.id) + '" data-active="' + (p.is_active ? "1" : "0") + '">Toggle</button> ' +
          '<button class="btn btn-xs btn-danger product-delete-btn" data-id="' + Number(p.id) + '">Delete</button>' +
        "</td>" +
      "</tr>";
    }).join("");
    empty.style.display = rows.length ? "none" : "block";
    Array.prototype.forEach.call(document.querySelectorAll(".product-toggle-btn"), function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        var row = rows.find(function (x) { return Number(x.id) === id; });
        if (!row) return;
        var next = Object.assign({}, row, { is_active: !row.is_active });
        jsonFetch(tenantApiUrl(tenant, "/products/" + encodeURIComponent(id), ownerEmail, cid, rid), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next)
        }).then(function () {
          return loadProducts(tenant, ownerEmail, cid, rid);
        }).catch(function () {});
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".product-delete-btn"), function (btn) {
      btn.addEventListener("click", function () {
        var id = Number(btn.getAttribute("data-id"));
        jsonFetch(tenantApiUrl(tenant, "/products/" + encodeURIComponent(id), ownerEmail, cid, rid), {
          method: "DELETE"
        }).then(function () {
          return loadProducts(tenant, ownerEmail, cid, rid);
        }).catch(function () {});
      });
    });
  }

  function loadProducts(tenant, ownerEmail, cid, rid) {
    return jsonFetch(tenantApiUrl(tenant, "/products", ownerEmail, cid, rid))
      .then(function (resp) {
        renderProducts(tenant, ownerEmail, cid, rid, (resp && resp.products) || []);
      })
      .catch(function (err) {
        var msg = document.getElementById("productsMsg");
        if (msg) msg.textContent = err.message || "Products unavailable.";
      });
  }

  function wireProductCreator(tenant, ownerEmail, cid, rid) {
    var btn = document.getElementById("createProductBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var payload = {
        name: safeTrim((document.getElementById("productNameInput") || {}).value),
        description: safeTrim((document.getElementById("productDescriptionInput") || {}).value),
        image_url: safeTrim((document.getElementById("productImageUrlInput") || {}).value),
        external_product_url: safeTrim((document.getElementById("productExternalUrlInput") || {}).value),
        price_text: safeTrim((document.getElementById("productPriceInput") || {}).value),
        sort_order: Number(safeTrim((document.getElementById("productSortOrderInput") || {}).value) || 0)
      };
      var msg = document.getElementById("productsMsg");
      if (!payload.name) {
        if (msg) msg.textContent = "Product name is required.";
        return;
      }
      jsonFetch(tenantApiUrl(tenant, "/products", ownerEmail, cid, rid), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function () {
        if (msg) msg.textContent = "Product created.";
        return loadProducts(tenant, ownerEmail, cid, rid);
      }).catch(function (err) {
        if (msg) msg.textContent = err.message || "Create failed.";
      });
    });
  }

  function wireShowcaseControls(tenant, ownerEmail, cid, rid) {
    var saveBtn = document.getElementById("saveFeaturedProductsBtn");
    var enabledInput = document.getElementById("proofShowcaseEnabledInput");
    if (enabledInput) {
      enabledInput.addEventListener("change", function () {
        jsonFetch(tenantApiUrl(tenant, "/showcase/settings", ownerEmail, cid, rid), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof_showcase_enabled: !!enabledInput.checked })
        }).catch(function () {});
      });
    }
    if (!saveBtn) return;
    saveBtn.addEventListener("click", function () {
      var boxes = Array.prototype.slice.call(document.querySelectorAll(".product-feature-checkbox:checked"));
      var ids = boxes.map(function (box) { return Number(box.getAttribute("data-id")); }).filter(function (id) { return id > 0; });
      jsonFetch(tenantApiUrl(tenant, "/showcase/feature-selection", ownerEmail, cid, rid), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured_product_ids: ids })
      }).then(function () {
        return loadProducts(tenant, ownerEmail, cid, rid);
      }).catch(function () {});
    });
  }

  function renderReviewModerationRows(tenant, ownerEmail, cid, rid, reviews) {
    var tbody = document.querySelector("#reviewModerationTable tbody");
    var empty = document.getElementById("reviewModerationEmpty");
    if (!tbody || !empty) return;
    var rows = Array.isArray(reviews) ? reviews : [];
    tbody.innerHTML = rows.map(function (r) {
      return "<tr>" +
        "<td>" + Number(r.id) + "</td>" +
        "<td>" + escapeHtml(String(r.created_at || "").slice(0, 19).replace("T", " ")) + "</td>" +
        "<td>" + escapeHtml(r.customer_email || "-") + "</td>" +
        "<td>" + escapeHtml(r.product_name || "-") + "</td>" +
        "<td>" + (r.rating == null ? "-" : Number(r.rating)) + "</td>" +
        "<td>" + escapeHtml(r.proof_status || "pending") + "</td>" +
        "<td>" + escapeHtml(r.text || "-") + "</td>" +
        "<td>" +
          '<select class="review-moderation-select input-sm" data-id="' + Number(r.id) + '">' +
            '<option value="pending"' + ((r.proof_status === "pending") ? " selected" : "") + ">pending</option>" +
            '<option value="approved"' + ((r.proof_status === "approved") ? " selected" : "") + ">approved</option>" +
            '<option value="rejected"' + ((r.proof_status === "rejected") ? " selected" : "") + ">rejected</option>" +
          "</select>" +
        "</td>" +
      "</tr>";
    }).join("");
    empty.style.display = rows.length ? "none" : "block";
    Array.prototype.forEach.call(document.querySelectorAll(".review-moderation-select"), function (el) {
      el.addEventListener("change", function () {
        var id = Number(el.getAttribute("data-id"));
        var nextStatus = safeTrim(el.value).toLowerCase();
        var msg = document.getElementById("reviewModerationMsg");
        jsonFetch(tenantApiUrl(tenant, "/reviews/" + encodeURIComponent(id) + "/moderation", ownerEmail, cid, rid), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proof_status: nextStatus })
        }).then(function () {
          if (msg) msg.textContent = "Review moderation updated.";
          return Promise.all([
            loadProducts(tenant, ownerEmail, cid, rid),
            loadReviewModeration(tenant, ownerEmail, cid, rid)
          ]);
        }).catch(function (err) {
          if (msg) msg.textContent = err.message || "Moderation update failed.";
        });
      });
    });
  }

  function loadReviewModeration(tenant, ownerEmail, cid, rid) {
    var statusInput = document.getElementById("reviewStatusFilterInput");
    var status = safeTrim(statusInput && statusInput.value).toLowerCase();
    return jsonFetch(tenantApiUrl(tenant, "/reviews", ownerEmail, cid, rid, { status: status || undefined }))
      .then(function (resp) {
        renderReviewModerationRows(tenant, ownerEmail, cid, rid, (resp && resp.reviews) || []);
      })
      .catch(function (err) {
        var msg = document.getElementById("reviewModerationMsg");
        if (msg) msg.textContent = err.message || "Reviews unavailable.";
      });
  }

  function wireReviewModeration(tenant, ownerEmail, cid, rid) {
    var refreshBtn = document.getElementById("refreshReviewModerationBtn");
    var statusInput = document.getElementById("reviewStatusFilterInput");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        loadReviewModeration(tenant, ownerEmail, cid, rid).catch(function () {});
      });
    }
    if (statusInput) {
      statusInput.addEventListener("change", function () {
        loadReviewModeration(tenant, ownerEmail, cid, rid).catch(function () {});
      });
    }
  }

  function renderSpotlightRows(tenant, ownerEmail, isAdmin, rows) {
    var tbody = document.querySelector("#spotlightModerationTable tbody");
    var empty = document.getElementById("spotlightModerationEmpty");
    if (!tbody || !empty) return;
    var list = Array.isArray(rows) ? rows : [];
    tbody.innerHTML = list.map(function (row) {
      return "<tr>" +
        "<td>" + Number(row.id) + "</td>" +
        "<td>" + escapeHtml(String(row.created_at || "").slice(0, 19).replace("T", " ")) + "</td>" +
        "<td>" + escapeHtml(row.business_name || "-") + "</td>" +
        "<td>" + (row.rating == null ? "-" : Number(row.rating)) + "</td>" +
        "<td>" + escapeHtml(row.moderation_status || "pending") + "</td>" +
        "<td>" +
          '<select class="spotlight-moderation-select input-sm" data-id="' + Number(row.id) + '"' + (isAdmin ? "" : " disabled") + ">" +
            '<option value="pending"' + ((row.moderation_status === "pending") ? " selected" : "") + ">pending</option>" +
            '<option value="approved"' + ((row.moderation_status === "approved") ? " selected" : "") + ">approved</option>" +
            '<option value="removed"' + ((row.moderation_status === "removed") ? " selected" : "") + ">removed</option>" +
            '<option value="flagged"' + ((row.moderation_status === "flagged") ? " selected" : "") + ">flagged</option>" +
          "</select>" +
        "</td>" +
        "<td>" + (row.claim_cta ? "Eligible" : "N/A") + " (Business ID: " + Number(row.business_id || 0) + ")</td>" +
      "</tr>";
    }).join("");
    empty.style.display = list.length ? "none" : "block";
    Array.prototype.forEach.call(document.querySelectorAll(".spotlight-moderation-select"), function (select) {
      select.addEventListener("change", function () {
        if (!isAdmin) return;
        var postId = Number(select.getAttribute("data-id"));
        var nextStatus = safeTrim(select.value).toLowerCase();
        var msg = document.getElementById("spotlightMsg");
        jsonFetch(apiUrl("/api/spotlight/posts/" + encodeURIComponent(postId) + "/moderation"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-email": ownerEmail },
          body: JSON.stringify({ moderation_status: nextStatus })
        }).then(function () {
          if (msg) msg.textContent = "Spotlight moderation updated.";
        }).catch(function (err) {
          if (msg) msg.textContent = err.message || "Spotlight moderation failed.";
        });
      });
    });
  }

  function loadSpotlightFeed(tenant, ownerEmail, isAdmin) {
    var status = safeTrim((document.getElementById("spotlightStatusFilterInput") || {}).value || "pending");
    var featureMsg = document.getElementById("spotlightFeatureMsg");
    return jsonFetch(apiUrl("/api/spotlight/feed", isAdmin ? { all_statuses: "true", status: status } : { status: "approved" }))
      .then(function (resp) {
        var controls = document.getElementById("spotlightOwnerControls");
        if (controls) controls.style.display = "";
        if (featureMsg) featureMsg.textContent = "";
        renderSpotlightRows(tenant, ownerEmail, isAdmin, (resp && resp.feed) || []);
      })
      .catch(function (err) {
        if (featureMsg) featureMsg.textContent = /disabled/i.test(String(err.message || "")) ? "Spotlight feature is disabled for this tenant." : (err.message || "Spotlight unavailable.");
      });
  }

  function renderSpotlightClaimRows(ownerEmail, isAdmin, rows) {
    var tbody = document.querySelector("#spotlightClaimQueueTable tbody");
    var empty = document.getElementById("spotlightClaimQueueEmpty");
    if (!tbody || !empty) return;
    var list = Array.isArray(rows) ? rows : [];
    tbody.innerHTML = list.map(function (row) {
      var claimId = Number(row.claim_id || 0);
      var currentStatus = safeTrim(row.status || "pending").toLowerCase();
      return "<tr>" +
        "<td>" + claimId + "</td>" +
        "<td>" + Number(row.business_id || 0) + "</td>" +
        "<td>" + escapeHtml(row.business_name || "-") + "</td>" +
        "<td>" + escapeHtml(row.claimant_name || "-") + "</td>" +
        "<td>" + escapeHtml(row.claimant_email || "-") + "</td>" +
        "<td>" + escapeHtml(currentStatus || "pending") + "</td>" +
        "<td>" + escapeHtml(String(row.created_at || "").slice(0, 19).replace("T", " ")) + "</td>" +
        "<td>" +
          '<select class="spotlight-claim-moderation-select input-sm" data-id="' + claimId + '"' + (isAdmin ? "" : " disabled") + ">" +
            '<option value="pending"' + (currentStatus === "pending" ? " selected" : "") + ">pending</option>" +
            '<option value="approved"' + (currentStatus === "approved" ? " selected" : "") + ">approved</option>" +
            '<option value="rejected"' + (currentStatus === "rejected" ? " selected" : "") + ">rejected</option>" +
          "</select>" +
        "</td>" +
      "</tr>";
    }).join("");
    empty.style.display = list.length ? "none" : "block";

    Array.prototype.forEach.call(document.querySelectorAll(".spotlight-claim-moderation-select"), function (select) {
      select.addEventListener("change", function () {
        if (!isAdmin) return;
        var claimId = Number(select.getAttribute("data-id"));
        var nextStatus = safeTrim(select.value).toLowerCase();
        var msg = document.getElementById("spotlightClaimQueueMsg");
        jsonFetch(apiUrl("/api/spotlight/claims/" + encodeURIComponent(claimId) + "/moderation"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-email": ownerEmail },
          body: JSON.stringify({ claim_status: nextStatus })
        }).then(function () {
          if (msg) msg.textContent = "Claim moderation updated.";
          loadSpotlightClaims(ownerEmail, isAdmin).catch(function () {});
        }).catch(function (err) {
          if (msg) msg.textContent = err.message || "Claim moderation failed.";
        });
      });
    });
  }

  function loadSpotlightClaims(ownerEmail, isAdmin) {
    var msg = document.getElementById("spotlightClaimQueueMsg");
    var status = safeTrim((document.getElementById("spotlightClaimStatusFilterInput") || {}).value || "pending");
    if (!isAdmin) {
      renderSpotlightClaimRows(ownerEmail, isAdmin, []);
      if (msg) msg.textContent = "Admin review required for claim queue actions.";
      return Promise.resolve();
    }
    return jsonFetch(apiUrl("/api/spotlight/claims", { status: status }), {
      headers: { "x-user-email": ownerEmail }
    }).then(function (resp) {
      renderSpotlightClaimRows(ownerEmail, isAdmin, (resp && resp.claims) || []);
      if (msg) msg.textContent = "";
    }).catch(function (err) {
      if (msg) msg.textContent = err.message || "Claim queue unavailable.";
    });
  }

  function wireSpotlight(tenant, ownerEmail, isAdmin) {
    var refreshBtn = document.getElementById("refreshSpotlightBtn");
    var statusInput = document.getElementById("spotlightStatusFilterInput");
    var refreshClaimsBtn = document.getElementById("refreshSpotlightClaimsBtn");
    var claimStatusInput = document.getElementById("spotlightClaimStatusFilterInput");
    if (refreshBtn) refreshBtn.addEventListener("click", function () { loadSpotlightFeed(tenant, ownerEmail, isAdmin); });
    if (statusInput) statusInput.addEventListener("change", function () { loadSpotlightFeed(tenant, ownerEmail, isAdmin); });
    if (refreshClaimsBtn) refreshClaimsBtn.addEventListener("click", function () { loadSpotlightClaims(ownerEmail, isAdmin); });
    if (claimStatusInput) claimStatusInput.addEventListener("change", function () { loadSpotlightClaims(ownerEmail, isAdmin); });
    loadSpotlightFeed(tenant, ownerEmail, isAdmin);
    loadSpotlightClaims(ownerEmail, isAdmin);
  }

  function renderContributionHistory(rows) {
    var tbody = document.querySelector("#contributionHistoryTable tbody");
    var empty = document.getElementById("contributionHistoryEmpty");
    if (!tbody || !empty) return;
    var list = Array.isArray(rows) ? rows : [];
    tbody.innerHTML = list.map(function (row) {
      return "<tr><td>" + fmtDate(row.created_at) + "</td><td>" + escapeHtml(row.entry_type || "-") + "</td><td>" + Number(row.amount || 0) + "</td><td>" + escapeHtml(row.business_name || "-") + "</td><td>" + escapeHtml(row.note || "-") + "</td></tr>";
    }).join("");
    empty.style.display = list.length ? "none" : "block";
  }

  function loadContributionPanels(tenant, ownerEmail) {
    var statusBody = document.getElementById("contributionStatusBody");
    var toggleContributionControls = function (disabled) {
      [
        "saveContributionSettingsBtn",
        "allocateSupportBtn",
        "addContributionBtn",
        "contributionsEnabledInput",
        "contributionGateEnabledInput",
        "contributionGateMinimumInput",
        "supportBusinessIdInput",
        "supportAmountInput",
        "supportNoteInput",
        "contributionAddEmailInput",
        "contributionAddAmountInput",
        "contributionAddNoteInput"
      ].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (id === "addContributionBtn" && !disabled && el.getAttribute("data-admin-only") === "true") {
          el.disabled = true;
          return;
        }
        el.disabled = !!disabled;
      });
    };
    if (shouldSkipContributionCalls(tenant, ownerEmail)) {
      toggleContributionControls(true);
      if (statusBody) statusBody.textContent = "Contributions feature is disabled for this tenant.";
      renderContributionHistory([]);
      return Promise.resolve({ disabled: true });
    }
    return Promise.all([
      jsonFetch(apiUrl("/api/contributions/status", { tenant: tenant, email: ownerEmail })),
      jsonFetch(apiUrl("/api/contributions/history", { tenant: tenant, email: ownerEmail, limit: 50 }))
    ]).then(function (responses) {
      var status = responses[0] || {};
      var history = responses[1] || {};
      if (status.contributions_enabled === false) markContributionsDisabled();
      if (contributionsDisabledForTenant) {
        toggleContributionControls(true);
        if (statusBody) statusBody.textContent = "Contributions feature is disabled for this tenant.";
        renderContributionHistory([]);
        return;
      }
      toggleContributionControls(false);
      if (statusBody) {
        statusBody.innerHTML =
          "<div><b>Balance:</b> " + Number(status.contribution_balance || 0) + "</div>" +
          "<div><b>Total Contributions:</b> " + Number(status.total_contributions || 0) + "</div>" +
          "<div><b>Total Support Allocations:</b> " + Number(status.total_support_allocations || 0) + "</div>" +
          "<div><b>Access Gate:</b> " + (status.contribution_access_gate && status.contribution_access_gate.enabled ? ("Enabled (min " + Number(status.contribution_access_gate.minimum_balance || 0) + ")") : "Disabled") + "</div>";
      }
      renderContributionHistory(history.contribution_history || []);
    }).catch(function (err) {
      if (isContributionDisabledError(err)) {
        markContributionsDisabled();
        toggleContributionControls(true);
        renderContributionHistory([]);
      }
      if (statusBody) statusBody.textContent = contributionsDisabledForTenant ? "Contributions feature is disabled for this tenant." : (err.message || "Contributions unavailable.");
    });
  }

  function wireContributions(tenant, ownerEmail, cid, rid, isAdmin) {
    var settingsBtn = document.getElementById("saveContributionSettingsBtn");
    var enabledInput = document.getElementById("contributionsEnabledInput");
    var gateEnabledInput = document.getElementById("contributionGateEnabledInput");
    var gateMinInput = document.getElementById("contributionGateMinimumInput");
    var settingsMsg = document.getElementById("contributionSettingsMsg");
    var googleReviewInput = document.getElementById("googleReviewUrlInput");
    var googleReviewMsg = document.getElementById("googleReviewUrlMsg");
    var saveGoogleReviewBtn = document.getElementById("saveGoogleReviewUrlBtn");
    var loadGoogleReviewUrl = function () {
      if (!googleReviewInput) return Promise.resolve();
      return jsonFetch(tenantApiUrl(tenant, "/review-link", ownerEmail, cid, rid))
        .then(function (resp) {
          googleReviewInput.value = safeTrim((resp && resp.google_review_url) || "");
        })
        .catch(function (err) {
          if (googleReviewMsg) googleReviewMsg.textContent = err.message || "Review link unavailable.";
        });
    };
    if (settingsBtn) {
      settingsBtn.addEventListener("click", function () {
        if (shouldSkipContributionCalls(tenant, ownerEmail)) {
          if (settingsMsg) settingsMsg.textContent = "Contributions are disabled for this tenant.";
          return;
        }
        jsonFetch(tenantApiUrl(tenant, "/contributions/settings", ownerEmail, cid, rid), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contributions_enabled: !!(enabledInput && enabledInput.checked),
            contribution_access_gate: {
              enabled: !!(gateEnabledInput && gateEnabledInput.checked),
              minimum_balance: Number(safeTrim(gateMinInput && gateMinInput.value) || 0),
            }
          })
        }).then(function (resp) {
          if (settingsMsg) settingsMsg.textContent = "Contribution settings saved.";
          if (enabledInput) enabledInput.checked = !!resp.contributions_enabled;
          if (gateEnabledInput) gateEnabledInput.checked = !!(resp.contribution_access_gate && resp.contribution_access_gate.enabled);
          if (gateMinInput) gateMinInput.value = String(Number(resp.contribution_access_gate && resp.contribution_access_gate.minimum_balance || 0));
          return loadContributionPanels(tenant, ownerEmail);
        }).catch(function (err) {
          if (isContributionDisabledError(err)) markContributionsDisabled();
          if (settingsMsg) settingsMsg.textContent = err.message || "Settings update failed.";
        });
      });
    }
    if (saveGoogleReviewBtn) {
      saveGoogleReviewBtn.addEventListener("click", function () {
        var value = safeTrim((googleReviewInput || {}).value);
        jsonFetch(tenantApiUrl(tenant, "/review-link", ownerEmail, cid, rid), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ google_review_url: value || null })
        }).then(function (resp) {
          if (googleReviewInput) googleReviewInput.value = safeTrim((resp && resp.google_review_url) || "");
          if (googleReviewMsg) googleReviewMsg.textContent = "Google review link saved.";
        }).catch(function (err) {
          if (googleReviewMsg) googleReviewMsg.textContent = err.message || "Google review link save failed.";
        });
      });
    }

    var supportBtn = document.getElementById("allocateSupportBtn");
    if (supportBtn) {
      supportBtn.addEventListener("click", function () {
        var businessId = Number(safeTrim((document.getElementById("supportBusinessIdInput") || {}).value));
        var amount = Number(safeTrim((document.getElementById("supportAmountInput") || {}).value));
        var note = safeTrim((document.getElementById("supportNoteInput") || {}).value);
        var msg = document.getElementById("supportAllocateMsg");
        if (shouldSkipContributionCalls(tenant, ownerEmail)) {
          if (msg) msg.textContent = "Contributions are disabled for this tenant.";
          return;
        }
        if (!businessId || !amount) {
          if (msg) msg.textContent = "Business ID and amount are required.";
          return;
        }
        jsonFetch(apiUrl("/api/contributions/support"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-email": ownerEmail, "x-user-role": "business_owner" },
          body: JSON.stringify({ tenant: tenant, email: ownerEmail, business_id: businessId, amount: amount, note: note || undefined })
        }).then(function (resp) {
          if (msg) msg.textContent = "Support allocated.";
          var metrics = document.getElementById("supportBusinessMetrics");
          if (metrics) metrics.innerHTML = "<b>Business support totals:</b> " + Number((resp.business_support_totals || {}).total_support || 0) + " across " + Number((resp.business_support_totals || {}).supporter_count || 0) + " supporter(s).";
          return loadContributionPanels(tenant, ownerEmail);
        }).catch(function (err) {
          if (isContributionDisabledError(err)) markContributionsDisabled();
          if (msg) msg.textContent = err.message || "Support allocation failed.";
        });
      });
    }

    var addBtn = document.getElementById("addContributionBtn");
    if (addBtn) {
      if (!isAdmin) addBtn.setAttribute("data-admin-only", "true");
      addBtn.disabled = !isAdmin;
      addBtn.addEventListener("click", function () {
        var email = safeTrim((document.getElementById("contributionAddEmailInput") || {}).value).toLowerCase();
        var amount = Number(safeTrim((document.getElementById("contributionAddAmountInput") || {}).value));
        var note = safeTrim((document.getElementById("contributionAddNoteInput") || {}).value);
        var msg = document.getElementById("contributionAddMsg");
        if (shouldSkipContributionCalls(tenant, ownerEmail)) {
          if (msg) msg.textContent = "Contributions are disabled for this tenant.";
          return;
        }
        if (!email || !amount) {
          if (msg) msg.textContent = "Member email and amount are required.";
          return;
        }
        jsonFetch(apiUrl("/api/contributions/add"), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-email": ownerEmail, "x-user-role": "admin" },
          body: JSON.stringify({ tenant: tenant, email: email, amount: amount, note: note || undefined })
        }).then(function () {
          if (msg) msg.textContent = "Contribution balance added.";
        }).catch(function (err) {
          if (isContributionDisabledError(err)) markContributionsDisabled();
          if (msg) msg.textContent = err.message || "Contribution add failed.";
        });
      });
    }

    loadContributionPanels(tenant, ownerEmail);
    loadGoogleReviewUrl();
  }

  function loadOwnerSnapshot(email, tenant, cid, rid, isAdmin) {
    console.log("[YOUTH_TRACE] loadOwnerSnapshot:start", {
      tenant: tenant,
      email: email,
      isAdmin: !!isAdmin
    });
    var el = document.getElementById("ownerSnapshotBody");
    if (!el) {
      console.warn("[YOUTH_TRACE] loadOwnerSnapshot:exit:no-ownerSnapshotBody");
      return Promise.resolve();
    }

    if (!tenant || !email) {
      console.warn("[YOUTH_TRACE] loadOwnerSnapshot:exit:missing-identity", {
        hasTenant: !!tenant,
        hasEmail: !!email
      });
      var missing = [];
      if (!tenant) missing.push("tenant");
      if (!email) missing.push("email");
      var msg = "Missing " + missing.join("/") + ". Open with ?tenant=...&email=... (optional &rid=...&cid=...).";
      el.innerHTML = isAdmin
        ? '<div class="empty-state">Admin mode active. ' + escapeHtml(msg) + "</div>"
        : '<div class="text-danger">' + escapeHtml(msg) + "</div>";
      return Promise.resolve();
    }

    el.textContent = "Loading owner snapshot...";

    var resolvedRid = safeTrim(rid || getRidFromStorage(tenant, email));
    var resultsUrl = apiUrl("/api/results/" + encodeURIComponent(email), {
      type: "business_owner",
      tenant: tenant,
      email: email
    });

    return jsonFetch(resultsUrl)
      .then(function (body) {
        var result = normalizeResultPayload(body);
        var apiRid = safeTrim(result.result_id || body.result_id || "");
        resolvedRid = safeTrim(resolvedRid || apiRid);
        if (resolvedRid) setRidInStorage(tenant, email, resolvedRid);

        var hub = ownerHubHtml({ tenant: tenant, email: email, cid: cid, rid: resolvedRid });
        var summary = resultSummaryHtml(result);

        el.innerHTML = hub + '<div style="margin-top:10px;">' + summary + "</div>";
        wireCopyButtons(el);
        wireOwnerHubCustomerLink({ tenant: tenant, email: email, cid: cid, rid: resolvedRid });
      })
      .catch(function (err) {
        el.innerHTML = '<span class="text-danger">' + escapeHtml(err.message) + "</span>";
      });
  }

  function renderAdminAccessPanel(identity) {
    var el = document.getElementById("ownerSnapshotBody");
    if (!el) return;

    var tenant = identity.tenant || "";
    var email = identity.email || "";
    var rid = identity.rid || "";
    var cid = identity.cid || "";

    el.innerHTML = '' +
      '<div style="border:1px solid #ddd;border-radius:8px;padding:12px;">' +
        '<h4 style="margin-top:0;">Admin Access</h4>' +
        '<div class="muted" style="margin-bottom:8px;">Admin: select tenant/email to open any tenant dashboard.</div>' +
        '<div class="form-group"><label>Tenant slug</label><input id="adminTenantInput" class="form-control" placeholder="tenant-slug" value="' + escapeHtml(tenant) + '"></div>' +
        '<div class="form-group"><label>Target email</label><input id="adminEmailInput" class="form-control" placeholder="owner@example.com" value="' + escapeHtml(email) + '"></div>' +
        '<button id="adminOpenTenantBtn" class="btn btn-primary">Open Tenant Dashboard</button>' +
        '<div id="adminAccessMsg" class="empty-state" style="padding-top:8px;">Missing tenant/email. Enter values and continue.</div>' +
      '</div>';

    var openBtn = document.getElementById("adminOpenTenantBtn");
    if (!openBtn) return;
    openBtn.addEventListener("click", function () {
      var tenantInput = document.getElementById("adminTenantInput");
      var emailInput = document.getElementById("adminEmailInput");
      var msg = document.getElementById("adminAccessMsg");
      var tenantValue = safeTrim(tenantInput && tenantInput.value);
      var emailValue = safeTrim(emailInput && emailInput.value).toLowerCase();
      if (!tenantValue || !emailValue) {
        if (msg) msg.textContent = "Tenant and target email are required.";
        return;
      }
      var next = new URLSearchParams({ tenant: tenantValue, email: emailValue });
      if (rid) next.set("rid", rid);
      if (cid) next.set("cid", cid);
      window.location.href = "/dashboard.html?" + next.toString();
    });
  }

  function wireCustomerLookup(tenant) {
    var input = document.getElementById("customerLookupEmail");
    var body = document.getElementById("customerLookupBody");
    var btn = document.getElementById("customerLookupBtn");
    if (!input || !body || !btn) return;

    btn.addEventListener("click", function () {
      var email = safeTrim(input.value).toLowerCase();
      if (!email) {
        body.innerHTML = '<span class="text-danger">Enter a customer email.</span>';
        return;
      }
      body.textContent = "Loading...";
      jsonFetch(apiUrl("/api/results/" + encodeURIComponent(email), { type: "customer", tenant: tenant }))
        .then(function (resp) {
          var r = normalizeResultPayload(resp);
          body.innerHTML = resultSummaryHtml(r);
        })
        .catch(function (err) {
          body.innerHTML = '<span class="text-danger">' + escapeHtml(err.message) + "</span>";
        });
    });
  }

  var allCustomersCache = [];

  function engineGroupOrder(engine) {
    return { voc: 0, love: 1, leadership: 2, loyalty: 3 }[engine] ?? 9;
  }

  function uniqueArchetypes(rows) {
    var map = {};
    (rows || []).forEach(function (row) {
      var history = Array.isArray(row.assessment_history) ? row.assessment_history : [];
      history.forEach(function (item) {
        if (!item || item.status !== "completed") return;
        var engine = safeTrim(item.engine).toLowerCase();
        var label = safeTrim(item.archetype_label || item.result_label || item.primary);
        if (!engine || !label) return;
        var key = engine + "::" + label.toLowerCase();
        map[key] = { engine: engine, label: label };
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) {
      var engineDiff = engineGroupOrder(a.engine) - engineGroupOrder(b.engine);
      if (engineDiff) return engineDiff;
      return a.label.localeCompare(b.label);
    });
  }

  function hydrateCustomerFilters(rows) {
    var archetypeSelect = document.getElementById("customerArchetypeFilter");
    if (!archetypeSelect) return;
    var lastEngine = null;
    var opts = ['<option value="">All archetypes</option>'];
    uniqueArchetypes(rows).forEach(function (entry) {
      if (entry.engine !== lastEngine) {
        opts.push('<option value="" disabled>— ' + escapeHtml(entry.engine.toUpperCase()) + " —</option>");
        lastEngine = entry.engine;
      }
      opts.push('<option value="' + escapeHtml(entry.engine + "::" + entry.label) + '">' + escapeHtml(entry.label) + "</option>");
    });
    archetypeSelect.innerHTML = opts.join("");
  }

  function getFilteredCustomers() {
    var archetype = safeTrim((document.getElementById("customerArchetypeFilter") || {}).value);
    var assessment = safeTrim((document.getElementById("customerAssessmentFilter") || {}).value).toLowerCase();
    var latestEngine = safeTrim((document.getElementById("customerLatestEngineFilter") || {}).value).toLowerCase();
    var status = safeTrim((document.getElementById("customerStatusFilter") || {}).value).toLowerCase();
    var points = safeTrim((document.getElementById("customerPointsFilter") || {}).value).toLowerCase();

    return (allCustomersCache || []).filter(function (row) {
      var selectedEngine = ["voc", "love", "leadership", "loyalty"].indexOf(assessment) !== -1 ? assessment : "";
      var hasCompleted = !!row.assessment_completed;
      var hasStartedOnly = !row.assessment_completed && !!row.assessment_started;
      if (assessment === "complete" && !hasCompleted) return false;
      if (assessment === "started" && !hasStartedOnly) return false;
      if (assessment === "none" && (hasCompleted || row.assessment_started)) return false;
      if (selectedEngine) {
        var completedByEngine = (row.latest_completed_by_engine && row.latest_completed_by_engine[selectedEngine]) || null;
        var startedByEngine = (row.latest_started_by_engine && row.latest_started_by_engine[selectedEngine]) || null;
        if (!completedByEngine && !startedByEngine) return false;
      }
      if (latestEngine && String(row.latest_assessment_engine || "").toLowerCase() !== latestEngine) return false;
      if (archetype) {
        var archetypeParts = archetype.split("::");
        var archetypeEngine = archetypeParts.length > 1 ? archetypeParts[0].toLowerCase() : "";
        var archetypeLabel = archetypeParts.length > 1 ? archetypeParts.slice(1).join("::").toLowerCase() : archetype.toLowerCase();
        var completed = row.latest_completed_by_engine || {};
        var scoped = selectedEngine ? completed[selectedEngine] : (archetypeEngine ? completed[archetypeEngine] : null);
        if (!scoped) {
          var values = Object.keys(completed).map(function (k) { return completed[k]; });
          scoped = values.find(function (item) {
            if (!item) return false;
            if (archetypeEngine && String(item.engine || "").toLowerCase() !== archetypeEngine) return false;
            return String(item.archetype_label || item.result_label || "").toLowerCase() === archetypeLabel;
          }) || null;
        } else if (String(scoped.archetype_label || scoped.result_label || "").toLowerCase() !== archetypeLabel) {
          return false;
        }
        if (!scoped) return false;
      }
      if (status && String(row.status || "").toLowerCase() !== status) return false;
      if (points === "gt0" && Number(row.points || 0) <= 0) return false;
      if (points === "eq0" && Number(row.points || 0) !== 0) return false;
      return true;
    });
  }

  function wireCustomerFilters() {
    ["customerArchetypeFilter", "customerAssessmentFilter", "customerLatestEngineFilter", "customerStatusFilter", "customerPointsFilter"].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        renderTable(getFilteredCustomers());
        wireCustomerRowClicks(customerProfileCtx.tenant, customerProfileCtx.ownerEmail, customerProfileCtx.cid, customerProfileCtx.rid);
      });
    });
  }

  function formatCountBars(label, counts) {
    var map = counts && typeof counts === "object" ? counts : {};
    var rows = Object.keys(map).sort(function (a, b) { return Number(map[b] || 0) - Number(map[a] || 0); });
    if (!rows.length) return "<div><b>" + escapeHtml(label) + ":</b> no scoring data</div>";
    return "<div><b>" + escapeHtml(label) + ":</b><ul>" + rows.map(function (k) {
      return "<li>" + escapeHtml(k) + ": " + Number(map[k] || 0) + "%</li>";
    }).join("") + "</ul></div>";
  }

  function renderCustomerProfile(payload) {
    var wrap = document.getElementById("customerProfileDetail");
    var body = document.getElementById("customerProfileBody");
    if (!wrap || !body) return;
    wrap.style.display = "block";
    var customer = payload.customer || {};
    var assessment = payload.assessment || null;
    var activity = payload.activity_summary || {};
    var identity = payload.identity || {};
    var history = Array.isArray(payload.assessment_history) ? payload.assessment_history : [];
    var latestByEngine = payload.latest_results_by_engine || {};
    function renderLatestEngine(engine) {
      var row = latestByEngine[engine] || null;
      if (!row) return "<li><b>" + engine.toUpperCase() + ":</b> No completed result</li>";
      var resultLink = row.payload_link ? (" <a class='btn btn-xs btn-default' href='" + escapeHtml(row.payload_link) + "' target='_blank' rel='noopener'>Open payload</a>") : "";
      return "<li><b>" + engine.toUpperCase() + ":</b> " + escapeHtml(row.result_label || row.primary || "-") + " (Primary: " + escapeHtml(row.primary || "-") + ", Secondary: " + escapeHtml(row.secondary || "-") + ", Completed: " + fmtDate(row.completed_at) + ")" + resultLink + "</li>";
    }
    var historyHtml = history.length
      ? "<table class='table table-condensed table-bordered'><thead><tr><th>Engine</th><th>Status</th><th>Date</th><th>Bank</th><th>Source</th><th>questionSource</th><th>Result ID</th></tr></thead><tbody>"
        + history.map(function (h) {
          return "<tr><td>" + escapeHtml((h.engine || "-").toUpperCase()) + "</td><td>" + escapeHtml(h.status || "-") + "</td><td>" + fmtDate(h.completed_at || h.started_at) + "</td><td>" + escapeHtml(h.bank || "-") + "</td><td>" + escapeHtml(h.source_type || h.source_path || h.tap_source || "-") + "</td><td>" + escapeHtml(h.questionSource || "-") + "</td><td>" + escapeHtml(h.result_id || h.crid || "-") + "</td></tr>";
        }).join("")
        + "</tbody></table>"
      : "<div class='muted'>No assessment events yet.</div>";

    body.innerHTML = ""
      + "<h4 style='margin-top:0;'>Customer Identity</h4>"
      + "<div><b>Customer:</b> " + escapeHtml(identity.name || customer.name || customer.email || ("ID #" + (customer.id || "-"))) + "</div>"
      + "<div><b>Email:</b> " + escapeHtml(identity.email || customer.email || "-") + "</div>"
      + "<div><b>First seen:</b> " + fmtDate(identity.first_seen || customer.created_at) + "</div>"
      + "<div><b>Last activity:</b> " + fmtDate(identity.last_activity) + "</div>"
      + "<div><b>Visits:</b> " + Number(identity.visits || activity.visits || 0) + " | <b>Points:</b> " + Number(identity.points || customer.points || 0) + "</div>"
      + "<div><b>Attributed owner/business:</b> " + escapeHtml((identity.attributed_owner || "-") + " / " + (identity.business || payload.tenant || "-")) + "</div>"
      + "<hr />"
      + "<h4>Assessment History</h4>"
      + historyHtml
      + "<hr />"
      + "<h4>Latest Engine Results</h4>"
      + "<ul>" + ["voc", "love", "leadership", "loyalty"].map(renderLatestEngine).join("") + "</ul>"
      + (assessment ? "<div class='muted'>Legacy profile linkage: Assessment #" + escapeHtml(assessment.id || "-") + "</div>" : "");
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadCustomerProfile(userId, tenant, ownerEmail, cid, rid) {
    if (!userId) return;
    var body = document.getElementById("customerProfileBody");
    var wrap = document.getElementById("customerProfileDetail");
    if (wrap) wrap.style.display = "block";
    if (body) body.textContent = "Loading customer profile...";
    jsonFetch(tenantApiUrl(tenant, "/customers/" + encodeURIComponent(userId) + "/profile", ownerEmail, cid, rid))
      .then(renderCustomerProfile)
      .catch(function (err) {
        if (body) body.innerHTML = '<span class="text-danger">' + escapeHtml(err.message) + "</span>";
      });
  }

  function wireCustomerRowClicks(tenant, ownerEmail, cid, rid) {
    Array.prototype.forEach.call(document.querySelectorAll(".customer-profile-btn"), function (btn) {
      btn.addEventListener("click", function () {
        var userId = safeTrim(btn.getAttribute("data-user-id"));
        loadCustomerProfile(userId, tenant, ownerEmail, cid, rid);
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("#customersTable tbody tr.customer-row"), function (row) {
      row.addEventListener("click", function (evt) {
        if (evt && evt.target && evt.target.closest && evt.target.closest(".customer-profile-btn")) return;
        var userId = safeTrim(row.getAttribute("data-user-id"));
        loadCustomerProfile(userId, tenant, ownerEmail, cid, rid);
      });
    });
  }

  function renderOwnerMessages(messages) {
    var tbody = document.querySelector("#ownerMessagesTable tbody");
    var empty = document.getElementById("ownerMessagesEmpty");
    if (!tbody || !empty) return;
    var rows = Array.isArray(messages) ? messages : [];
    tbody.innerHTML = rows.map(function (m) {
      var target = m.target_type === "single"
        ? ((m.target_name || m.target_email || "-") + (m.target_name && m.target_email ? (" (" + m.target_email + ")") : ""))
        : ((m.target_lens || "-") + ":" + (m.target_archetype || "-"));
      return "<tr><td>" + fmtDate(m.created_at) + "</td><td>" + escapeHtml(target) + "</td><td>" + escapeHtml(m.subject || "-") + "</td><td>" + escapeHtml(m.body || "-") + "</td></tr>";
    }).join("");
    empty.style.display = rows.length ? "none" : "block";
  }

  function wireOwnerMessaging(tenant, ownerEmail, cid, rid) {
    var targetType = document.getElementById("messageTargetType");
    var targetEmail = document.getElementById("messageTargetEmail");
    var targetLens = document.getElementById("messageTargetLens");
    var targetArchetype = document.getElementById("messageTargetArchetype");
    var subject = document.getElementById("messageSubject");
    var body = document.getElementById("messageBody");
    var sendBtn = document.getElementById("sendMessageBtn");
    var status = document.getElementById("ownerMessageStatus");
    if (!targetType || !targetEmail || !targetLens || !targetArchetype || !subject || !body || !sendBtn) return;

    function toggleTargetInputs() {
      var isGroup = safeTrim(targetType.value) === "group";
      targetEmail.style.display = isGroup ? "none" : "";
      targetLens.style.display = isGroup ? "" : "none";
      targetArchetype.style.display = isGroup ? "" : "none";
    }
    targetType.addEventListener("change", toggleTargetInputs);
    toggleTargetInputs();

    function refreshMessages() {
      return jsonFetch(tenantApiUrl(tenant, "/messages", ownerEmail, cid, rid)).then(function (resp) {
        renderOwnerMessages(resp.messages || []);
      });
    }

    sendBtn.addEventListener("click", function () {
      var payload = {
        target_type: safeTrim(targetType.value) || "single",
        target_email: safeTrim(targetEmail.value).toLowerCase() || undefined,
        target_lens: safeTrim(targetLens.value).toLowerCase() || undefined,
        target_archetype: safeTrim(targetArchetype.value).toLowerCase() || undefined,
        subject: safeTrim(subject.value),
        body: safeTrim(body.value),
      };
      if (status) status.textContent = "Sending message...";
      jsonFetch(tenantApiUrl(tenant, "/messages", ownerEmail, cid, rid), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      }).then(function () {
        if (status) status.textContent = "Message sent.";
        subject.value = "";
        body.value = "";
        return refreshMessages();
      }).catch(function (err) {
        if (status) status.textContent = err.message;
      });
    });

    refreshMessages().catch(function () {});
  }

  var archetypeLens = "personal";

  function playbookList(title, items) {
    var rows = Array.isArray(items) ? items : [];
    if (!rows.length) return "";
    return "<div><b>" + escapeHtml(title) + ":</b><ul>" + rows.map(function (x) { return "<li>" + escapeHtml(x) + "</li>"; }).join("") + "</ul></div>";
  }

  function renderGroupDetails(tenant, cid, lens, archetype) {
    var playbookEl = document.getElementById("groupDetailsPlaybook");
    var tbody = document.querySelector("#groupCustomersTable tbody");
    var empty = document.getElementById("groupCustomersEmpty");
    if (!playbookEl || !tbody || !empty) return;
    playbookEl.textContent = "Loading group details...";
    tbody.innerHTML = "";
    empty.style.display = "none";

    jsonFetch(apiUrl("/api/archetypes/group", { tenant: tenant, cid: cid || undefined, lens: lens, archetype: archetype }))
      .then(function (resp) {
        var playbook = resp.playbook || {};
        if (lens === "personal") {
          playbookEl.innerHTML =
            "<h4 style='margin-top:0;'>" + escapeHtml(archetype) + " (Personal)</h4>" +
            playbookList("When Strong", playbook.when_strong) +
            playbookList("Out of Balance (High)", playbook.when_out_of_balance_high) +
            playbookList("Out of Balance (Low)", playbook.when_out_of_balance_low) +
            playbookList("Daily Build-Ups", playbook.daily_practices_to_build) +
            playbookList("Weekly Build-Ups", playbook.weekly_practices_to_build) +
            playbookList("Balance Signals", playbook.balance_signals);
        } else {
          playbookEl.innerHTML =
            "<h4 style='margin-top:0;'>" + escapeHtml(archetype) + " (Buyer)</h4>" +
            playbookList("Buying Motivations", playbook.buying_motivations) +
            playbookList("Buying Fears", playbook.buying_fears) +
            "<div><b>Decision Style:</b> " + escapeHtml(playbook.decision_style || "-") + "</div>" +
            playbookList("Best Offers", playbook.best_offers_for_them) +
            playbookList("Messaging That Converts", playbook.messaging_that_converts) +
            playbookList("Pitch Red Flags", playbook.red_flags_in_your_pitch);
        }

        var customers = Array.isArray(resp.customers) ? resp.customers : [];
        tbody.innerHTML = customers.map(function (c) {
          return "<tr><td>" + escapeHtml(c.email || "-") + "</td><td>" + escapeHtml(c.name || "-") + "</td><td>" + fmtDate(c.created_at) + "</td><td>" + escapeHtml(c.cid || "-") + "</td><td>" + escapeHtml(c.primary || "-") + "</td><td>" + escapeHtml(c.secondary || "-") + "</td><td>" + escapeHtml(c.weakness || "-") + "</td></tr>";
        }).join("");
        empty.style.display = customers.length ? "none" : "block";
      })
      .catch(function (err) {
        playbookEl.innerHTML = '<span class="text-danger">' + escapeHtml(err.message) + "</span>";
        empty.style.display = "block";
      });
  }

  function renderArchetypeGroups(tenant, cid, groups) {
    var listEl = document.getElementById("archetypeGroupsList");
    var personalBtn = document.getElementById("lensPersonalBtn");
    var buyerBtn = document.getElementById("lensBuyerBtn");
    if (!listEl) return;
    if (personalBtn && buyerBtn) {
      personalBtn.className = archetypeLens === "personal" ? "btn btn-primary btn-sm" : "btn btn-default btn-sm";
      buyerBtn.className = archetypeLens === "buyer" ? "btn btn-primary btn-sm" : "btn btn-default btn-sm";
    }

    var rows = (groups && groups[archetypeLens]) || [];
    if (!rows.length) {
      listEl.innerHTML = "No grouped archetypes yet.";
      return;
    }
    listEl.innerHTML = rows.map(function (row) {
      return '<button class="btn btn-default btn-block text-left archetype-group-btn" data-archetype="' + escapeHtml(row.archetype) + '">' + escapeHtml(row.archetype) + " <span class='badge'>" + Number(row.count || 0) + "</span></button>";
    }).join("");
    Array.prototype.forEach.call(listEl.querySelectorAll(".archetype-group-btn"), function (btn) {
      btn.addEventListener("click", function () {
        renderGroupDetails(tenant, cid, archetypeLens, btn.getAttribute("data-archetype"));
      });
    });

    var first = rows.find(function (r) { return Number(r.count || 0) > 0; }) || rows[0];
    if (first) renderGroupDetails(tenant, cid, archetypeLens, first.archetype);
  }

  function wireArchetypeLensToggle(tenant, cid, groups) {
    var personalBtn = document.getElementById("lensPersonalBtn");
    var buyerBtn = document.getElementById("lensBuyerBtn");
    if (personalBtn) personalBtn.addEventListener("click", function () {
      archetypeLens = "personal";
      renderArchetypeGroups(tenant, cid, groups);
    });
    if (buyerBtn) buyerBtn.addEventListener("click", function () {
      archetypeLens = "buyer";
      renderArchetypeGroups(tenant, cid, groups);
    });
  }

  function renderAccessStatus(ctx) {
    console.log("[YOUTH_TRACE] renderAccessStatus:start", {
      tenant: ctx && ctx.tenant,
      email: ctx && ctx.email,
      isAdmin: !!(ctx && ctx.isAdmin),
      role: ctx && ctx.role
    });
    var badgeHost = document.getElementById("accessStatusBadges");
    var meta = document.getElementById("accessStatusMeta");
    if (!badgeHost || !meta) {
      console.warn("[YOUTH_TRACE] renderAccessStatus:exit:missing-host", {
        hasBadgeHost: !!badgeHost,
        hasMeta: !!meta
      });
      return;
    }
    var badges = [];
    if (ctx.isAdmin) badges.push('<span class="label label-danger">Super Admin</span>');
    if (ctx.hasTenantOwnerAccess) badges.push('<span class="label label-success">Business Owner</span>');
    badges.push('<span class="label label-default">Tenant: ' + escapeHtml(ctx.tenant || "-") + '</span>');
    badgeHost.innerHTML = badges.join(" ");
    meta.textContent = "Email: " + (ctx.email || "-") + " • Session role: " + (ctx.role || "-");
    renderAdminYouthActions(ctx);
  }

  function init() {
    console.log("[YOUTH_TRACE] init:start", {
      dashboardInitInFlight: dashboardInitInFlight,
      dashboardInitialized: dashboardInitialized,
      path: window.location.pathname,
      script: "/dashboardnew/app.js",
      marker: "YOUTH_TRACE_BUILD_2026_04_17_v1"
    });
    if (dashboardInitInFlight || dashboardInitialized) {
      console.warn("[YOUTH_TRACE] init:exit:already-running", {
        dashboardInitInFlight: dashboardInitInFlight,
        dashboardInitialized: dashboardInitialized
      });
      return;
    }
    dashboardInitInFlight = true;
    var fromLoginCtx = loginCtxFromStorage();
    var urlTenant = tenantFromUrl();
    var urlEmail = ownerEmailFromUrl();
    var urlCid = cidFromUrl();
    var urlRid = ridFromUrl();
    var tenant = urlTenant;
    var ownerEmail = urlEmail;
    var cid = urlCid;
    var rid = urlRid;
    var clearSessionBtn = document.getElementById("clearSessionBtn");
    if (clearSessionBtn) {
      clearSessionBtn.addEventListener("click", function (event) {
        if (event) event.preventDefault();
        clearSessionAndRedirect();
      });
    }

    resolveOwnerSession().then(function (session) {
      var sessionRole = "";
      var hasTenantOwnerAccess = false;
      if (session) {
        tenant = session.tenant;
        ownerEmail = session.email;
        sessionRole = session.role || "";
        hasTenantOwnerAccess = session.hasTenantOwnerAccess === true;
        if (!cid) cid = safeTrim(fromLoginCtx.cid || "");
        if (!rid) rid = safeTrim(fromLoginCtx.rid || "");
      } else {
        if (!ownerEmail) ownerEmail = safeTrim(fromLoginCtx.email || "").toLowerCase();
        if (!tenant) tenant = safeTrim(fromLoginCtx.tenant || "");
        if (!rid) rid = safeTrim(fromLoginCtx.rid || "");
      }

      var repaired = new URLSearchParams(window.location.search);
      if (tenant || urlTenant) repaired.set("tenant", tenant || urlTenant);
      else repaired.delete("tenant");
      if (ownerEmail) repaired.set("email", ownerEmail);
      else repaired.delete("email");
      if (cid) repaired.set("cid", cid);
      if (rid) repaired.set("rid", rid);
      else repaired.delete("rid");
      repaired.delete("owner_email");
      repaired.delete("owner_rid");
      repaired.delete("crid");
      history.replaceState(null, "", "/dashboard.html?" + repaired.toString());

      var isAdmin = (session && session.isAdmin === true) || isAdminEmail(ownerEmail);
      var switchedTenant = resetSessionForTenantSwitch(
        { tenant: tenant, email: ownerEmail, cid: cid, rid: rid },
        fromLoginCtx
      );
      resetDashboardUi(switchedTenant ? "switch detected" : "");
      if (tenant && ownerEmail) saveLoginCtx({ tenant: tenant, email: ownerEmail, cid: cid, rid: rid });

      var label = document.getElementById("tenantLabel");
      if (label) {
        label.textContent = "Tenant: " + (tenant || "-") + " • Email: " + (ownerEmail || "-") + " • Admin: " + (isAdmin ? "true" : "false");
      }
      renderAccessStatus({
        tenant: tenant,
        email: ownerEmail,
        role: sessionRole || (isAdmin ? "super_admin" : "business_owner"),
        isAdmin: isAdmin,
        hasTenantOwnerAccess: hasTenantOwnerAccess
      });
      console.log("[YOUTH_TRACE] init:resolved-access", {
        tenant: tenant,
        email: ownerEmail,
        isAdmin: isAdmin,
        sessionRole: sessionRole,
        hasTenantOwnerAccess: hasTenantOwnerAccess
      });

      if (!tenant || !ownerEmail) {
        dashboardInitInFlight = false;
        setupError("Missing tenant/email. Sign in below, or take an assessment if you're new.");
        renderSignInPanel({ tenant: tenant || "", email: "", cid: cid || "", rid: "" });
        return Promise.resolve(null);
      }

      return resolveOwnerRid(tenant, ownerEmail, rid).then(function (resolvedRid) {
      rid = safeTrim(resolvedRid || rid);
      if (rid) {
        setRidInStorage(tenant, ownerEmail, rid);
        replaceUrlRidIfMissing(tenant, ownerEmail, rid, cid);
      }
      saveLoginCtx({ tenant: tenant, email: ownerEmail, cid: cid, rid: rid });
      customerProfileCtx = { tenant: tenant, ownerEmail: ownerEmail, cid: cid, rid: rid };
      wirePathButtons(tenant, ownerEmail, cid, rid);
      renderActiveAssessmentYouthActions();
      wireCustomerLookup(tenant);
      wireCustomerFilters();
      wireCampaignCreator(tenant, ownerEmail, cid, rid);
      wireProductCreator(tenant, ownerEmail, cid, rid);
      wireReviewModeration(tenant, ownerEmail, cid, rid);
      wireSpotlight(tenant, ownerEmail, isAdmin);
      wireContributions(tenant, ownerEmail, cid, rid, isAdmin);
      loadOwnerSnapshot(ownerEmail, tenant, cid, rid, isAdmin);
      setTimeout(function () {
        console.log("[YOUTH_TRACE] init:rerender-timeout-0");
        renderActiveAssessmentYouthActions();
      }, 0);
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(function () {
          console.log("[YOUTH_TRACE] init:rerender-raf");
          renderActiveAssessmentYouthActions();
        });
      }
      setTimeout(function () {
        if (!document.getElementById("takeYouthAssessmentBtn") && document.body) {
          var debugHost = document.getElementById("youthActionsBodyDebugHost");
          if (!debugHost) {
            debugHost = document.createElement("div");
            debugHost.id = "youthActionsBodyDebugHost";
            debugHost.style.margin = "10px";
            document.body.appendChild(debugHost);
          }
          debugHost.innerHTML = '<a id="takeYouthAssessmentBtnBodyDebug" class="btn btn-warning" href="/youth-development/intake/test">DEBUG Youth Assessment Button</a>';
          console.warn("[YOUTH_TRACE] init:body-force-visibility-appended", {
            bodyDebugBtnExists: !!document.getElementById("takeYouthAssessmentBtnBodyDebug")
          });
        }
      }, 1000);

      return ensureContextReady(tenant, ownerEmail).then(function (ctx) {
        if (!ctx) return;
        return Promise.all([
        jsonFetch(tenantApiUrl(tenant, "/dashboard", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/customers", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/analytics", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/segments", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/campaigns/summary", ownerEmail, cid, rid)),
        jsonFetch(apiUrl("/api/campaigns/list", { tenant: tenant, email: ownerEmail })),
        jsonFetch(apiUrl("/api/archetypes/groups", { tenant: tenant, cid: cid || undefined })),
        jsonFetch(tenantApiUrl(tenant, "/products", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/reviews", ownerEmail, cid, rid, { status: "pending" }))
      ]);
      })
        .then(function (responses) {
          if (!responses || pageNavigatingAway) return;
          renderMetrics(responses[0]);
          allCustomersCache = (responses[1] && responses[1].customers) || [];
          hydrateCustomerFilters(allCustomersCache);
          renderTable(getFilteredCustomers());
          wireCustomerRowClicks(tenant, ownerEmail, cid, rid);
          renderBar(responses[2] || {});
          renderArea(responses[2] || {});
          renderDonut(responses[2] || {});
          renderInsights(responses[2] || {});
          renderSegments(responses[3] || {});
          renderCampaignSummary(responses[4] || {});
          renderActionAndBehaviorMetrics(responses[4] || {});
          updateFeedFromSummary(responses[4] || {});
          if (responses[5] && responses[5].campaigns && responses[5].campaigns[0]) {
            renderCampaignLinks(tenant, ownerEmail, responses[5].campaigns[0]);
            var customerCidInput = document.getElementById("ownerHubCidInput");
            if (customerCidInput && !safeTrim(customerCidInput.value)) {
              customerCidInput.value = safeTrim(responses[5].campaigns[0].slug || "");
              customerCidInput.dispatchEvent(new Event("input"));
            }
          }
          wireArchetypeLensToggle(tenant, cid, responses[6] || {});
          renderArchetypeGroups(tenant, cid, responses[6] || {});
          renderProducts(tenant, ownerEmail, cid, rid, (responses[7] && responses[7].products) || []);
          var showcaseEnabledInput = document.getElementById("proofShowcaseEnabledInput");
          if (showcaseEnabledInput) showcaseEnabledInput.checked = !!(responses[7] && responses[7].proof_showcase_enabled);
          renderReviewModerationRows(tenant, ownerEmail, cid, rid, (responses[8] && responses[8].reviews) || []);
          wireShowcaseControls(tenant, ownerEmail, cid, rid);
          wireOwnerMessaging(tenant, ownerEmail, cid, rid);

          clearRefreshTimer();
          window.__garveyDashboardRefreshTimer = setInterval(function () {
            if (dashboardRefreshInFlight || pageNavigatingAway) return;
            dashboardRefreshInFlight = true;
            ensureContextReady(tenant, ownerEmail).then(function (ctx) {
              if (!ctx) return;
              return Promise.all([
                jsonFetch(tenantApiUrl(tenant, "/dashboard", ownerEmail, cid, rid)),
                jsonFetch(tenantApiUrl(tenant, "/campaigns/summary", ownerEmail, cid, rid))
              ]).then(function (refreshResponses) {
                if (pageNavigatingAway) return;
                renderMetrics(refreshResponses[0] || {});
                renderCampaignSummary(refreshResponses[1] || {});
                renderActionAndBehaviorMetrics(refreshResponses[1] || {});
                updateFeedFromSummary(refreshResponses[1] || {});
              }).catch(function () {});
            }).catch(function () {
            }).finally(function () {
              dashboardRefreshInFlight = false;
            });
          }, 20000);
          dashboardInitialized = true;
          dashboardInitInFlight = false;
        });
      });
    }).catch(function (err) {
      dashboardInitInFlight = false;
      setupError(err.message);
    }).finally(function () {
      if (!dashboardInitialized) dashboardInitInFlight = false;
    });
  }

  $(function () {
    window.addEventListener("beforeunload", function () {
      pageNavigatingAway = true;
      clearRefreshTimer();
    });
    window.addEventListener("pagehide", function () {
      pageNavigatingAway = true;
      clearRefreshTimer();
    });
    $("#side-menu").metisMenu();
    init();
  });
})();
