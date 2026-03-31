/* FILE: dashboardnew/app.js */
(function () {
  var api = window.GarveyApi || {};
  var DASH_CTX_KEY = "garvey_ctx_v1";
  var LOGIN_CTX_KEY = "garvey_login_ctx_v1";
  var ENGINE_CTX_KEY = "garvey_customer_return_engine_v1";

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
    try {
      localStorage.removeItem(DASH_CTX_KEY);
      localStorage.removeItem(LOGIN_CTX_KEY);
      localStorage.removeItem(ENGINE_CTX_KEY);
      Object.keys(localStorage).forEach(function (key) {
        if (key.indexOf("garvey_owner_rid:") === 0) localStorage.removeItem(key);
      });
    } catch (_) {}
    showSessionToast("Session cleared");
    setTimeout(function () {
      window.location.href = "/index.html";
    }, 250);
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
    if (!body) return;
    if (!campaign) {
      body.textContent = "Create a campaign to view links.";
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
    var qrSrc = apiUrl("/api/campaigns/qr", { tenant: tenant, cid: campaign.slug, target: "rewards", format: "png" });
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
        headers: { "Content-Type": "application/json" },
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
          renderCampaignLinks(tenant, resp.campaign);
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
      if (ownerBtn) ownerBtn.href = "/intake.html" + (ownerParams.toString() ? ("?" + ownerParams.toString()) : "");
      if (customerBtn) customerBtn.href = "/voc.html" + (customerParams.toString() ? ("?" + customerParams.toString()) : "");
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

  function tenantApiUrl(tenant, path, ownerEmail, cid, rid) {
    var query = {};
    if (ownerEmail) query.email = ownerEmail;
    if (cid) query.cid = cid;
    if (rid) query.rid = rid;
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

  function init() {
    var fromLoginCtx = loginCtxFromStorage();
    var urlTenant = tenantFromUrl();
    var urlEmail = ownerEmailFromUrl();
    var urlCid = cidFromUrl();
    var urlRid = ridFromUrl();
    var hasIdentityInUrl = !!(urlTenant || urlEmail);

    var tenant = urlTenant;
    var ownerEmail = urlEmail;
    var cid = urlCid;
    var rid = urlRid;
    var isAdmin = isAdminEmail(ownerEmail);

    if (tenant || ownerEmail || cid || rid) {
      saveLoginCtx({ tenant: tenant, email: ownerEmail, cid: cid, rid: rid });
    }

    var label = document.getElementById("tenantLabel");
    if (label) {
      label.textContent = "Tenant: " + (tenant || "-") + " • Email: " + (ownerEmail || "-") + " • Admin: " + (isAdmin ? "true" : "false");
    }
    var clearSessionBtn = document.getElementById("clearSessionBtn");
    if (clearSessionBtn) {
      clearSessionBtn.addEventListener("click", function (event) {
        if (event) event.preventDefault();
        clearSessionAndRedirect();
      });
    }

    if (!tenant || !ownerEmail) {
      setupError("Missing tenant/email. Sign in below, or take an assessment if you're new.");
      renderSignInPanel({ tenant: "", email: "", cid: "", rid: "" });
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
      wireCampaignCreator(tenant, ownerEmail, cid, rid);
      loadOwnerSnapshot(ownerEmail, tenant, cid, rid, isAdmin);

      return Promise.all([
        jsonFetch(tenantApiUrl(tenant, "/dashboard", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/customers", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/analytics", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/segments", ownerEmail, cid, rid)),
        jsonFetch(tenantApiUrl(tenant, "/campaigns/summary", ownerEmail, cid, rid)),
        jsonFetch(apiUrl("/api/campaigns/list", { tenant: tenant, email: ownerEmail })),
        jsonFetch(apiUrl("/api/archetypes/groups", { tenant: tenant, cid: cid || undefined }))
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
          renderActionAndBehaviorMetrics(responses[4] || {});
          updateFeedFromSummary(responses[4] || {});
          if (responses[5] && responses[5].campaigns && responses[5].campaigns[0]) {
            renderCampaignLinks(tenant, responses[5].campaigns[0]);
            var customerCidInput = document.getElementById("ownerHubCidInput");
            if (customerCidInput && !safeTrim(customerCidInput.value)) {
              customerCidInput.value = safeTrim(responses[5].campaigns[0].slug || "");
              customerCidInput.dispatchEvent(new Event("input"));
            }
          }
          wireArchetypeLensToggle(tenant, cid, responses[6] || {});
          renderArchetypeGroups(tenant, cid, responses[6] || {});

          setInterval(function () {
            Promise.all([
              jsonFetch(tenantApiUrl(tenant, "/dashboard", ownerEmail, cid, rid)),
              jsonFetch(tenantApiUrl(tenant, "/campaigns/summary", ownerEmail, cid, rid))
            ]).then(function (refreshResponses) {
              renderMetrics(refreshResponses[0] || {});
              renderCampaignSummary(refreshResponses[1] || {});
              renderActionAndBehaviorMetrics(refreshResponses[1] || {});
              updateFeedFromSummary(refreshResponses[1] || {});
            }).catch(function () {});
          }, 20000);
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
