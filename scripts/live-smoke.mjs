import process from 'node:process';

const FRONTEND_URL = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || process.env.BASE_URL || '').replace(/\/+$/, '');

if (!BACKEND_URL) {
  console.error('FAIL: live smoke bootstrap');
  console.error('  Expected: BACKEND_URL (or BASE_URL) set');
  console.error('  Actual: missing backend URL');
  process.exit(1);
}

function print(row) {
  console.log(`${row.severity}: ${row.subsystem}`);
  if (row.page_or_file) console.log(`  Page/File: ${row.page_or_file}`);
  if (row.endpoint) console.log(`  Endpoint: ${row.endpoint}`);
  console.log(`  Expected: ${row.expected}`);
  console.log(`  Actual: ${row.actual}`);
  console.log(`  Likely cause: ${row.likely_cause}`);
}

async function hit(base, endpoint, allowedStatuses) {
  try {
    const res = await fetch(`${base}${endpoint}`);
    return {
      ok: allowedStatuses.includes(res.status),
      actual: `HTTP ${res.status}`,
      status: res.status,
    };
  } catch (err) {
    return { ok: false, actual: String(err.message || err), status: 0 };
  }
}

const checks = [
  { subsystem: 'Backend reachable', base: BACKEND_URL, endpoint: '/health', allowed: [200] },
  { subsystem: 'Owner session API', base: BACKEND_URL, endpoint: '/api/owner/session', allowed: [200, 401] },
  { subsystem: 'Questions API', base: BACKEND_URL, endpoint: '/api/questions?assessment=business_owner', allowed: [200] },
  { subsystem: 'Spotlight feed API', base: BACKEND_URL, endpoint: '/api/spotlight/feed?limit=1', allowed: [200] },
  { subsystem: 'Rewards status API', base: BACKEND_URL, endpoint: '/api/rewards/status?tenant=live-smoke&email=live@example.com', allowed: [200, 404] },
  { subsystem: 'Tenant showcase route', base: BACKEND_URL, endpoint: '/t/live-smoke/showcase', allowed: [200, 404] },
];

if (FRONTEND_URL) {
  checks.push({ subsystem: 'Frontend dashboard page', base: FRONTEND_URL, endpoint: '/dashboard.html', allowed: [200, 302, 400] });
  checks.push({ subsystem: 'Wrong-origin API resolution guard', base: FRONTEND_URL, endpoint: '/api/owner/session', allowed: [200, 401, 404] });
}

const rows = [];
for (const c of checks) {
  const r = await hit(c.base, c.endpoint, c.allowed);
  const wrongOrigin404 = c.subsystem === 'Wrong-origin API resolution guard' && r.status === 404;
  rows.push({
    severity: wrongOrigin404 ? 'FAIL' : (r.ok ? 'PASS' : 'FAIL'),
    subsystem: c.subsystem,
    page_or_file: c.base,
    endpoint: c.endpoint,
    expected: `Status in [${c.allowed.join(', ')}]`,
    actual: r.actual,
    likely_cause: wrongOrigin404
      ? 'Frontend origin is handling /api instead of backend base'
      : (r.ok ? 'N/A' : 'Service unreachable, route missing, or auth/flag mismatch'),
  });
}

for (const row of rows) print(row);

const fail = rows.filter((r) => r.severity === 'FAIL').length;
const warn = rows.filter((r) => r.severity === 'WARN').length;
console.log(`SUMMARY: pass=${rows.length - fail - warn} warn=${warn} fail=${fail}`);
process.exit(fail > 0 ? 1 : 0);
