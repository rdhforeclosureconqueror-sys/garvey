/* FILE: dashboardnew/app.js */
(function () {
  var api = window.GarveyApi || {};
  var LOGIN_CTX_KEY = "garvey_login_ctx_v1";

  function apiUrl(path, query) {
    if (typeof api.buildUrl === "function") return api.buildUrl(path, query || {});
    var qs = new URLSearchParams(query || {}).toString();
    return path + (qs ? "?" + qs : "");
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function safeTrim(v) {
    return String(v ?? "").trim();
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
    return fetch(url, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok) throw new Error(body.error || "Request failed");
        return body;
      });
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

  function renderMetrics(dashboard) {
    var el;
    el = document.getElementById("metricUsers"); if (el) el.textContent = dashboard.total_users || 0;
    el = document.getElementById("metricVisits"); if (el) el.textContent = dashboard.total_visits || 0;
    el = document.getElementById("metricActions"); if (el) el.textContent = dashboard.total_actions || 0;
    el = document.getElementById("metricPoints"); if (el) el.textContent = dashboard.total_points || 0;
  }

  function renderTable(customers) {
    var rows = customers || [];
    var tbody = $("#customersTable tbody");
    tbody.empty();

    rows.forEach(function (row) {
      tbody.append(
        "<tr><td>" + (row.email || ("id:" + row.user_id)) +
        "</td><td>" + (row.archetype || "unclassified") +
        "</td><td>" + (row.visits || 0) +
        "</td><td>" + fmtDate(row.last_activity) +
        "</td><td>" + statusPill(row.status || "dormant") +
        "</td></tr>"
      );
    });

    if ($.fn.dataTable.isDataTable("#customersTable")) $("#customersTable").DataTable().destroy();

    if (rows.length) {
      document.getElementById("tableEmpty").style.display = "none";
      $("#customersTable").DataTable({ pageLength: 10, order: [[2, "desc"]] });
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
    var el;

    el = document.getElementById("ownerInsight");
    if (el) el.textContent = owner.primary
      ? ("Business Owner: " + owner.primary + " (secondary: " + (owner.secondary || "-") + ", weakness: " + (owner.weakness || "-") + ")")
      : "Business Owner: No submissions yet.";

    el = document.getElementById("customerInsight");
    if (el) el.textContent = customer.primary
      ? ("Customer: " + customer.primary + " | Personality: " + (customer.personality || "-") + " | Weakness: " + (customer.weakness || "-"))
      : "Customer: No submissions yet.";
  }

  function renderCampaignLinks(tenant, campaign) {
    var body = document.getElementById("campaignLinksBody");
    if (!campaign) {
      body.textContent = "Create or select a campaign to view links.";
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
    qr.src = apiUrl("/api/campaigns/qr", { tenant: tenant, cid: campaign.slug, target: "voc", format: "png" });
    qr.style.display = "block";
    document.getElementById("campaignQrEmpty").style.display = "none";
  }

  function renderCampaignSummary(summary) {
    var rows = Array.isArray(summary && summary.campaigns) ? summary.campaigns : [];
    var tbody = document.querySelector("#campaignsTable tbody");
    tbody.innerHTML = "";
    rows.forEach(function (row) {
      var c = row.counts || {};
      tbody.innerHTML +=
        "<tr><td>" + (row.label || row.slug || "-") +
        ' <div class="muted">' + (row.slug || "") + "</div></td>" +
        "<td>" + (c.visits || 0) + "</td>" +
        "<td>" + (c.customer_assessments || 0) + "</td>" +
        "<td>" + (c.checkins || 0) + "</td>" +
        "<td>" + (c.reviews || 0) + "</td>" +
        "<td>" + (c.referrals || 0) + "</td>" +
        "<td>" + (c.wishlist || 0) + "</td>" +
        "<td>" + (c.shares || 0) + "</td>" +
        "<td>" + fmtDate(row.last_activity_at) + "</td></tr>";
    });
    document.getElementById("campaignsEmpty").style.display = rows.length ? "none" : "block";
  }

  function wireCampaignCreator(tenant) {
    var btn = document.getElementById("createCampaignBtn");
    btn.addEventListener("click", function () {
      var label = safeTrim(document.getElementById("campaignLabelInput").value);
      var slug = safeTrim(document.getElementById("campaignSlugInput").value);

      if (!label) {
        document.getElementById("campaignCreateMsg").textContent = "Campaign label is required.";
        return;
      }

      jsonFetch(apiUrl("/api/campaigns/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: tenant, label: label, slug: slug || undefined })
      })
        .then(function (resp) {
          document.getElementById("campaignCreateMsg").textContent = "Campaign created: " + resp.campaign.slug;
          renderCampaignLinks(tenant, resp.campaign);
          return jsonFetch(apiUrl("/t/" + encodeURIComponent(tenant) + "/campaigns/summary"));
        })
        .then(renderCampaignSummary)
        .catch(function (err) {
          document.getElementById("campaignCreateMsg").textContent = err.message;
        });
    });
  }

  function renderSegments(segments) {
    var summary = document.getElementById("segmentsSummary");
    var top = document.getElementById("segmentsTop");
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
    var p1 = new URLSearchParams({ tenant: tenant });
    if (email) p1.set("email", email);
    if (cid) p1.set("cid", cid);
    if (rid) p1.set("rid", rid);
    document.getElementById("garveyPathBtn").href = "/garvey_premium.html?" + p1.toString();

    var p2 = new URLSearchParams({ tenant: tenant });
    if (email) p2.set("email", email);
    if (cid) p2.set("cid", cid);
    if (rid) p2.set("rid", rid);
    document.getElementById("rewardsPathBtn").href = "/rewards_premium.html?" + p2.toString();

    var p3 = new URLSearchParams({ tenant: tenant });
    if (email) p3.set("email", email);
    if (cid) p3.set("cid", cid);
    if (rid) p3.set("crid", rid);
    document.getElementById("rewardsFallbackBtn").href = "/rewards.html?" + p3.toString();
  }

  function readSignInFormCtx() {
    return {
      tenant: safeTrim(document.getElementById("signInTenantInput").value),
      email: safeTrim(document.getElementById("signInEmailInput").value).toLowerCase(),
      cid: safeTrim(document.getElementById("signInCidInput").value),
      rid: safeTrim(document.getElementById("signInRidInput").value)
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
      document.getElementById("takeOwnerAssessmentBtn").href = "/intake.html" + (ownerParams.toString() ? ("?" + ownerParams.toString()) : "");
      document.getElementById("takeCustomerAssessmentBtn").href = "/voc.html" + (customerParams.toString() ? ("?" + customerParams.toString()) : "");
    }

    ["signInTenantInput", "signInCidInput"].forEach(function (id) {
      var input = document.getElementById(id);
      input.addEventListener("input", refreshAssessmentLinks);
    });

    document.getElementById("signInSubmitBtn").addEventListener("click", function () {
      var c = readSignInFormCtx();
      if (!c.tenant || !c.email) {
        document.getElementById("signInMsg").textContent = "Tenant and email are required.";
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

  function tenantApiUrl(tenant, path, ownerEmail) {
    var query = {};
    if (ownerEmail) query.email = ownerEmail;
    return apiUrl("/t/" + encodeURIComponent(tenant) + path, query);
  }

  function loadOwnerSnapshot(email, tenant, cid, rid, isAdmin) {
    var el = document.getElementById("ownerSnapshotBody");
    if (!el) return Promise.resolve();

    if (!tenant || !email) {
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

    document.getElementById("adminOpenTenantBtn").addEventListener("click", function () {
      var tenantValue = safeTrim(document.getElementById("adminTenantInput").value);
      var emailValue = safeTrim(document.getElementById("adminEmailInput").value).toLowerCase();
      if (!tenantValue || !emailValue) {
        document.getElementById("adminAccessMsg").textContent = "Tenant and target email are required.";
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

    document.getElementById("customerLookupBtn").addEventListener("click", function () {
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

  function init() {
    var fromLoginCtx = loginCtxFromStorage();
    var tenant = tenantFromUrl() || fromLoginCtx.tenant;
    var ownerEmail = ownerEmailFromUrl() || fromLoginCtx.email;
    var cid = cidFromUrl() || fromLoginCtx.cid;
    var rid = ridFromUrl() || fromLoginCtx.rid || getRidFromStorage(tenant, ownerEmail);
    var isAdmin = isAdminEmail(ownerEmail);

    if (tenant || ownerEmail || cid || rid) saveLoginCtx({ tenant: tenant, email: ownerEmail, cid: cid, rid: rid });

    var label = document.getElementById("tenantLabel");
    if (label) {
      label.textContent = "Tenant: " + (tenant || "-") + " • Email: " + (ownerEmail || "-") + " • Admin: " + (isAdmin ? "true" : "false");
    }

    if (!tenant || !ownerEmail) {
      setupError("Missing tenant/email. Sign in below, or take an assessment if you're new.");
      renderSignInPanel({ tenant: tenant, email: ownerEmail, cid: cid, rid: rid });
      return;
    }

    resolveOwnerRid(tenant, ownerEmail, rid).then(function (resolvedRid) {
      rid = safeTrim(resolvedRid || rid);
      if (rid) {
        setRidInStorage(tenant, ownerEmail, rid);
        replaceUrlRidIfMissing(tenant, ownerEmail, rid, cid);
      }
      saveLoginCtx({ tenant: tenant, email: ownerEmail, cid: cid, rid: rid });
      wirePathButtons(tenant, ownerEmail, cid, rid);
      wireCustomerLookup(tenant);
      wireCampaignCreator(tenant);
      loadOwnerSnapshot(ownerEmail, tenant, cid, rid, isAdmin);

      return Promise.all([
        jsonFetch(tenantApiUrl(tenant, "/dashboard", ownerEmail)),
        jsonFetch(tenantApiUrl(tenant, "/customers", ownerEmail)),
        jsonFetch(tenantApiUrl(tenant, "/analytics", ownerEmail)),
        jsonFetch(tenantApiUrl(tenant, "/segments", ownerEmail)),
        jsonFetch(tenantApiUrl(tenant, "/campaigns/summary", ownerEmail)),
        jsonFetch(apiUrl("/api/campaigns/list", { tenant: tenant, email: ownerEmail }))
      ])
        .then(function (responses) {
          renderMetrics(responses[0]);
          renderTable((responses[1] && responses[1].customers) || []);
          renderBar(responses[2] || {});
          renderArea(responses[2] || {});
          renderDonut(responses[2] || {});
          renderInsights(responses[2] || {});
          renderSegments(responses[3] || {});
          renderCampaignSummary(responses[4] || {});
          if (responses[5] && responses[5].campaigns && responses[5].campaigns[0]) {
            renderCampaignLinks(tenant, responses[5].campaigns[0]);
            var customerCidInput = document.getElementById("ownerHubCidInput");
            if (customerCidInput && !safeTrim(customerCidInput.value)) {
              customerCidInput.value = safeTrim(responses[5].campaigns[0].slug || "");
              customerCidInput.dispatchEvent(new Event("input"));
            }
          }
        });
    }).catch(function (err) {
      setupError(err.message);
    });
  }

  $(function () {
    $("#side-menu").metisMenu();
    init();
  });
})();
