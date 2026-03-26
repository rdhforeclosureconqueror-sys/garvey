(function () {
  function params() { return new URLSearchParams(window.location.search); }
  function tenantFromUrl() { return (params().get('tenant') || '').trim(); }
  function ownerEmailFromUrl() { return (params().get('email') || '').trim().toLowerCase(); }

  function jsonFetch(url, options) {
    return fetch(url, options).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Request failed');
        return body;
      });
    });
  }

  function fmtDate(value) { return value ? new Date(value).toISOString().slice(0, 10) : '-'; }
  function statusPill(status) {
    var cls = status === 'active' ? 'status-active' : status === 'new' ? 'status-new' : 'status-dormant';
    return '<span class="status-pill ' + cls + '">' + status + '</span>';
  }

  function renderMetrics(dashboard) {
    document.getElementById('metricUsers').textContent = dashboard.total_users || 0;
    document.getElementById('metricVisits').textContent = dashboard.total_visits || 0;
    document.getElementById('metricActions').textContent = dashboard.total_actions || 0;
    document.getElementById('metricPoints').textContent = dashboard.total_points || 0;
  }

  function renderTable(customers) {
    var rows = customers || [];
    var tbody = $('#customersTable tbody');
    tbody.empty();
    rows.forEach(function (row) {
      tbody.append('<tr><td>' + (row.email || ('id:' + row.user_id)) + '</td><td>' + (row.archetype || 'unclassified') + '</td><td>' + (row.visits || 0) + '</td><td>' + fmtDate(row.last_activity) + '</td><td>' + statusPill(row.status || 'dormant') + '</td></tr>');
    });

    if ($.fn.dataTable.isDataTable('#customersTable')) $('#customersTable').DataTable().destroy();
    if (rows.length) {
      document.getElementById('tableEmpty').style.display = 'none';
      $('#customersTable').DataTable({ pageLength: 10, order: [[2, 'desc']] });
    } else {
      document.getElementById('tableEmpty').style.display = 'block';
    }
  }

  function renderChartEmpty(id, emptyId, hasData) {
    $(id).empty();
    document.getElementById(emptyId).style.display = hasData ? 'none' : 'block';
  }

  function renderBar(analytics) {
    var points = analytics.visits_by_day || [];
    renderChartEmpty('#morris-bar-chart', 'barEmpty', points.length);
    if (!points.length) return;
    new Morris.Bar({ element: 'morris-bar-chart', data: points.map(function (p) { return { day: p.day, visits: p.visits }; }), xkey: 'day', ykeys: ['visits'], labels: ['Visits'], hideHover: 'auto', resize: true });
  }

  function renderArea(analytics) {
    var points = analytics.growth || [];
    renderChartEmpty('#morris-area-chart', 'areaEmpty', points.length);
    if (!points.length) return;
    new Morris.Area({ element: 'morris-area-chart', data: points.map(function (p) { return { day: p.day, cumulative_customers: p.cumulative_customers }; }), xkey: 'day', ykeys: ['cumulative_customers'], labels: ['Cumulative customers'], pointSize: 2, hideHover: 'auto', resize: true });
  }

  function renderDonut(analytics) {
    var data = analytics.archetypes || [];
    renderChartEmpty('#morris-donut-chart', 'donutEmpty', data.length);
    if (!data.length) return;
    new Morris.Donut({ element: 'morris-donut-chart', data: data.map(function (x) { return { label: x.archetype, value: x.count }; }), resize: true });
  }

  function renderInsights(analytics) {
    var owner = analytics.owner_assessment || {};
    var customer = analytics.customer_assessment || {};
    document.getElementById('ownerInsight').textContent = owner.primary ? ('Business Owner: ' + owner.primary + ' (secondary: ' + (owner.secondary || '-') + ', weakness: ' + (owner.weakness || '-') + ')') : 'Business Owner: No submissions yet.';
    document.getElementById('customerInsight').textContent = customer.primary ? ('Customer: ' + customer.primary + ' | Personality: ' + (customer.personality || '-') + ' | Weakness: ' + (customer.weakness || '-')) : 'Customer: No submissions yet.';
  }

  function renderSegments(segments) {
    var summary = document.getElementById('segmentsSummary');
    var top = document.getElementById('segmentsTop');
    var total = Number(segments?.total_customer_assessments || 0);
    var distribution = Array.isArray(segments?.distribution) ? segments.distribution : [];
    if (!total) {
      summary.textContent = 'No customer segment data yet.';
      top.innerHTML = '';
      return;
    }
    summary.textContent = 'Total customer assessments: ' + total;
    top.innerHTML = distribution.slice(0, 5).map(function (row) {
      return '<div><b>' + (row.archetype || 'Unknown') + ':</b> ' + (row.count || 0) + ' (' + (row.percent || 0) + '%)</div>';
    }).join('');
  }

  function setupError(msg) { document.getElementById('errorBanner').textContent = msg; }

  function resultSummaryHtml(result) {
    if (!result) return '<div class="empty-state">No matching result yet.</div>';
    return '<div><b>Primary:</b> ' + (result.primary_role || result.primary_archetype || '-') + '</div>' +
      '<div><b>Secondary:</b> ' + (result.secondary_role || result.secondary_archetype || '-') + '</div>' +
      '<div><b>Weakness:</b> ' + (result.weakness_role || result.weakness_archetype || '-') + '</div>' +
      '<div><b>Updated:</b> ' + fmtDate(result.created_at) + '</div>';
  }

  function wirePathButtons(tenant) {
    var enc = encodeURIComponent(tenant);
    document.getElementById('garveyPathBtn').href = '/garvey_premium.html?tenant=' + enc;
    document.getElementById('rewardsPathBtn').href = '/rewards_premium.html?tenant=' + enc;
    document.getElementById('rewardsFallbackBtn').href = '/rewards.html?tenant=' + enc;
  }

  function loadOwnerSnapshot(email, tenant) {
    var el = document.getElementById('ownerSnapshotBody');
    if (!email) return;
    var suffix = tenant ? ('?type=business_owner&tenant=' + encodeURIComponent(tenant)) : '?type=business_owner';
    jsonFetch('/api/results/' + encodeURIComponent(email) + suffix)
      .then(function (body) { el.innerHTML = resultSummaryHtml(body.result); })
      .catch(function (err) { el.innerHTML = '<span class="text-danger">' + err.message + '</span>'; });
  }

  function wireCustomerLookup(tenant) {
    var input = document.getElementById('customerLookupEmail');
    var body = document.getElementById('customerLookupBody');
    document.getElementById('customerLookupBtn').addEventListener('click', function () {
      var email = (input.value || '').trim().toLowerCase();
      if (!email) {
        body.innerHTML = '<span class="text-danger">Enter a customer email.</span>';
        return;
      }
      body.textContent = 'Loading...';
      var suffix = tenant ? ('?type=customer&tenant=' + encodeURIComponent(tenant)) : '?type=customer';
      jsonFetch('/api/results/' + encodeURIComponent(email) + suffix)
        .then(function (resp) { body.innerHTML = resultSummaryHtml(resp.result); })
        .catch(function (err) { body.innerHTML = '<span class="text-danger">' + err.message + '</span>'; });
    });
  }

  function init() {
    var tenant = tenantFromUrl();
    if (!tenant) return setupError('Missing tenant query parameter. Open with ?tenant=<slug>.');

    var ownerEmail = ownerEmailFromUrl();
    document.getElementById('tenantLabel').textContent = 'Tenant: ' + tenant;
    wirePathButtons(tenant);
    wireCustomerLookup(tenant);
    loadOwnerSnapshot(ownerEmail, tenant);

    Promise.all([
      jsonFetch('/t/' + encodeURIComponent(tenant) + '/dashboard'),
      jsonFetch('/t/' + encodeURIComponent(tenant) + '/customers'),
      jsonFetch('/t/' + encodeURIComponent(tenant) + '/analytics'),
      jsonFetch('/t/' + encodeURIComponent(tenant) + '/segments')
    ])
      .then(function (responses) {
        renderMetrics(responses[0]);
        renderTable(responses[1].customers || []);
        renderBar(responses[2]);
        renderArea(responses[2]);
        renderDonut(responses[2]);
        renderInsights(responses[2]);
        renderSegments(responses[3]);
      })
      .catch(function (err) { setupError(err.message); });
  }

  $(function () {
    $('#side-menu').metisMenu();
    init();
  });
})();
