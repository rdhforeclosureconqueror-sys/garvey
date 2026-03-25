(function () {
  function tenantFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return (params.get('tenant') || '').trim();
  }

  function jsonFetch(url, options) {
    return fetch(url, options).then(function (res) {
      return res.json().then(function (body) {
        if (!res.ok) throw new Error(body.error || 'Request failed');
        return body;
      });
    });
  }

  function fmtDate(value) {
    if (!value) return '-';
    return new Date(value).toISOString().slice(0, 10);
  }

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
      tbody.append(
        '<tr>' +
          '<td>' + (row.email || ('id:' + row.user_id)) + '</td>' +
          '<td>' + (row.archetype || 'unclassified') + '</td>' +
          '<td>' + (row.visits || 0) + '</td>' +
          '<td>' + fmtDate(row.last_activity) + '</td>' +
          '<td>' + statusPill(row.status || 'dormant') + '</td>' +
        '</tr>'
      );
    });

    if ($.fn.dataTable.isDataTable('#customersTable')) {
      $('#customersTable').DataTable().destroy();
    }

    if (rows.length) {
      document.getElementById('tableEmpty').style.display = 'none';
      $('#customersTable').DataTable({ pageLength: 10, order: [[2, 'desc']] });
    } else {
      document.getElementById('tableEmpty').style.display = 'block';
    }
  }

  function renderBar(analytics) {
    var points = analytics.visits_by_day || [];
    $('#morris-bar-chart').empty();
    if (!points.length) {
      document.getElementById('barEmpty').style.display = 'block';
      return;
    }
    document.getElementById('barEmpty').style.display = 'none';
    new Morris.Bar({
      element: 'morris-bar-chart',
      data: points.map(function (p) { return { day: p.day, visits: p.visits }; }),
      xkey: 'day',
      ykeys: ['visits'],
      labels: ['Visits'],
      hideHover: 'auto',
      resize: true
    });
  }

  function renderArea(analytics) {
    var points = analytics.growth || [];
    $('#morris-area-chart').empty();
    if (!points.length) {
      document.getElementById('areaEmpty').style.display = 'block';
      return;
    }
    document.getElementById('areaEmpty').style.display = 'none';
    new Morris.Area({
      element: 'morris-area-chart',
      data: points.map(function (p) { return { day: p.day, cumulative_customers: p.cumulative_customers }; }),
      xkey: 'day',
      ykeys: ['cumulative_customers'],
      labels: ['Cumulative customers'],
      pointSize: 2,
      hideHover: 'auto',
      resize: true
    });
  }

  function renderDonut(analytics) {
    var data = analytics.archetypes || [];
    $('#morris-donut-chart').empty();
    if (!data.length) {
      document.getElementById('donutEmpty').style.display = 'block';
      return;
    }
    document.getElementById('donutEmpty').style.display = 'none';
    new Morris.Donut({
      element: 'morris-donut-chart',
      data: data.map(function (x) { return { label: x.archetype, value: x.count }; }),
      resize: true
    });
  }

  function renderInsights(analytics) {
    var owner = analytics.owner_assessment || {};
    var customer = analytics.customer_assessment || {};
    document.getElementById('ownerInsight').textContent = owner.primary
      ? ('Business Owner: ' + owner.primary + ' (secondary: ' + (owner.secondary || '-') + ', weakness: ' + (owner.weakness || '-') + ')')
      : 'Business Owner: No submissions yet.';
    document.getElementById('customerInsight').textContent = customer.primary
      ? ('Customer: ' + customer.primary + ' | Personality: ' + (customer.personality || '-') + ' | Weakness: ' + (customer.weakness || '-'))
      : 'Customer: No submissions yet.';
  }

  function setupError(msg) {
    document.getElementById('errorBanner').textContent = msg;
  }

  function init() {
    var tenant = tenantFromUrl();
    if (!tenant) {
      setupError('Missing tenant query parameter. Open with ?tenant=<slug>.');
      return;
    }

    document.getElementById('tenantLabel').textContent = 'Tenant: ' + tenant;

    Promise.all([
      jsonFetch('/t/' + encodeURIComponent(tenant) + '/dashboard'),
      jsonFetch('/t/' + encodeURIComponent(tenant) + '/customers'),
      jsonFetch('/t/' + encodeURIComponent(tenant) + '/analytics')
    ])
      .then(function (responses) {
        renderMetrics(responses[0]);
        renderTable(responses[1].customers || []);
        renderBar(responses[2]);
        renderArea(responses[2]);
        renderDonut(responses[2]);
        renderInsights(responses[2]);
      })
      .catch(function (err) {
        setupError(err.message);
      });
  }

  $(function () {
    $('#side-menu').metisMenu();
    init();
  });
})();
