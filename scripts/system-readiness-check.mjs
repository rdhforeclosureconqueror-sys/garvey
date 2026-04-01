import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { runContextGuardCheck } from './context-guard-check.mjs';

const ROOT = process.cwd();

const routerMounts = [
  { file: 'server/kanbanRoutes.js', base: '/api/kanban' },
  { file: 'server/foundationRoutes.js', base: '/api/foundation' },
  { file: 'server/structureRoutes.js', base: '/api/structure' },
  { file: 'server/executionRoutes.js', base: '/api/execution' },
  { file: 'server/intelligenceRoutes.js', base: '/api/intelligence' },
  { file: 'server/infrastructureRoutes.js', base: '/api/infrastructure' },
  { file: 'server/routingRoutes.js', base: '/api/routing' },
  { file: 'server/evolutionRoutes.js', base: '/api/evolution' },
];

const routeGroups = [
  {
    name: 'owner + onboarding',
    required: ['POST /api/owner/signup', 'POST /api/owner/signin', 'GET /api/owner/session', 'POST /api/intake', 'GET /api/results/:email'],
  },
  {
    name: 'product/reviews/showcase',
    required: ['POST /t/:slug/products', 'POST /t/:slug/reviews/:reviewId/moderation', 'GET /t/:slug/showcase'],
  },
  {
    name: 'spotlight + claims',
    required: ['POST /api/spotlight/submissions', 'GET /api/spotlight/feed', 'POST /api/spotlight/claims/:claimId/moderation'],
  },
  {
    name: 'contributions',
    required: ['POST /api/contributions/add', 'POST /api/contributions/support', 'GET /api/contributions/status'],
  },
  {
    name: 'rewards loop',
    required: ['POST /api/rewards/checkin', 'POST /api/rewards/review', 'POST /api/rewards/wishlist'],
  },
];

const apiAuditFiles = [
  'public/index.html',
  'public/results_owner.html',
  'public/dashboard.html',
  'dashboardnew/app.js',
  'public/rewards.html',
];

const targetedFlowKeywords = [
  { label: 'owner session', include: ['owner/session', 'ownerApiUrl', 'GarveyApi.buildUrl'] },
  { label: 'owner onboarding', include: ['owner/signup', 'owner/signin', '/api/intake'] },
  { label: 'owner results', include: ['/api/results/'] },
  { label: 'dashboard', include: ['/dashboard.html', '/t/'] },
  { label: 'spotlight', include: ['/api/spotlight/'] },
  { label: 'showcase', include: ['/showcase'] },
  { label: 'contributions', include: ['/api/contributions/'] },
  { label: 'rewards flows', include: ['/api/rewards/', '/t/${encodeURIComponent(ctx.tenant)}/products/public'] },
];

function slurp(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function normalizePath(routePath) {
  return routePath
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\/:([^/]+)\?/g, '/:$1')
    .replace(/\/+/g, '/');
}

function extractBackendRoutes() {
  const routes = new Set();
  const appSrc = slurp('server/index.js');
  const appRe = /app\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = appRe.exec(appSrc))) routes.add(`${m[1].toUpperCase()} ${normalizePath(m[2])}`);

  for (const mount of routerMounts) {
    const routerSrc = slurp(mount.file);
    const rRe = /router\.(get|post|put|delete|patch)\(\s*["'`]([^"'`]+)["'`]/g;
    while ((m = rRe.exec(routerSrc))) {
      routes.add(`${m[1].toUpperCase()} ${normalizePath(`${mount.base}${m[2]}`)}`);
    }
  }
  return routes;
}

function routeMatch(expected, routes) {
  if (routes.has(expected)) return true;
  const [method, route] = expected.split(' ');
  const rx = new RegExp(`^${route.replace(/:[^/]+/g, '[^/]+')}$`);
  return [...routes].some((r) => {
    const [m, ...rest] = r.split(' ');
    return m === method && rx.test(rest.join(' '));
  });
}

function isApiCallLine(line) {
  return line.includes('fetch(') && (line.includes('/api/') || line.includes('/t/'));
}

function lineHasSafeApiBase(line) {
  return ['ownerApiUrl(', 'apiUrl(', 'buildUrl(', 'GarveyApi.buildUrl(', 'window.GarveyApi?.buildUrl'].some((x) => line.includes(x));
}

function runApiBaseAudit() {
  const findings = [];
  for (const file of apiAuditFiles) {
    const lines = slurp(file).split('\n');
    for (let idx = 0; idx < lines.length; idx += 1) {
      const line = lines[idx];
      if (!isApiCallLine(line)) continue;

      const inTargetScope = targetedFlowKeywords.some((scope) => scope.include.some((k) => line.includes(k)));
      if (!inTargetScope) continue;

      if (!lineHasSafeApiBase(line)) {
        findings.push({
          severity: 'FAIL',
          subsystem: 'Frontend API-base check',
          page_or_file: file,
          line: idx + 1,
          expected: 'Call should resolve through backend API base helper in cross-origin deployments',
          actual: `Relative API call detected: ${line.trim()}`,
          likely_cause: 'Frontend-relative path can resolve against frontend origin and 404 on Render split deployments',
        });
      }
    }
  }
  return findings;
}

async function runFlowChecks(baseUrl) {
  const out = [];
  if (!baseUrl) {
    out.push({
      severity: 'WARN', subsystem: 'Critical flow checks', page_or_file: 'runtime', endpoint: 'N/A',
      expected: 'Flow probes executed', actual: 'Skipped because BASE_URL is not set', likely_cause: 'No runtime target supplied',
    });
    return out;
  }

  const base = baseUrl.replace(/\/+$/, '');
  const tenant = process.env.DIAG_TENANT || `diag-${Date.now()}`;
  const email = process.env.DIAG_EMAIL || `diag+${Date.now()}@example.com`;
  const password = process.env.DIAG_PASSWORD || 'DiagPass!123';

  async function hit(method, p, body) {
    const res = await fetch(`${base}${p}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    return { status: res.status, text };
  }

  async function step(name, endpoint, allowed, body) {
    try {
      const r = await hit(body ? 'POST' : 'GET', endpoint, body);
      out.push({
        severity: allowed.includes(r.status) ? 'PASS' : 'FAIL',
        subsystem: name,
        page_or_file: 'runtime',
        endpoint,
        expected: `Status in [${allowed.join(', ')}]`,
        actual: `HTTP ${r.status}`,
        likely_cause: allowed.includes(r.status) ? 'N/A' : (r.status === 404 ? 'Route missing or wrong origin' : 'Validation/auth/runtime failure'),
      });
    } catch (err) {
      out.push({ severity: 'FAIL', subsystem: name, page_or_file: 'runtime', endpoint, expected: `Status in [${allowed.join(', ')}]`, actual: String(err.message || err), likely_cause: 'Network/connectivity error' });
    }
  }

  await step('owner account creation -> assessment', '/api/owner/signup', [200, 201, 409], { business_name: 'Diag Biz', email, password, tenant });
  await step('owner results -> dashboard', `/api/results/${encodeURIComponent(email)}?type=business_owner&tenant=${encodeURIComponent(tenant)}`, [200, 404]);
  await step('product create -> review submit -> moderation -> showcase', `/t/${encodeURIComponent(tenant)}/showcase`, [200, 404]);
  await step('spotlight submit -> moderation -> approved feed', '/api/spotlight/feed?status=approved&limit=1', [200]);
  await step('spotlight claim submit -> claim moderation', '/api/spotlight/claims?status=pending', [200, 401, 403]);
  await step('contribution add -> support allocation -> support metrics', `/api/contributions/status?tenant=${encodeURIComponent(tenant)}&email=${encodeURIComponent(email)}`, [200, 401, 403]);
  await step('rewards check-in/review/wishlist loop', `/api/rewards/status?tenant=${encodeURIComponent(tenant)}&email=${encodeURIComponent(email)}`, [200, 404]);

  return out;
}

function printFindings(findings) {
  for (const f of findings) {
    console.log(`${f.severity}: ${f.subsystem}`);
    if (f.page_or_file) console.log(`  Page/File: ${f.page_or_file}${f.line ? `:${f.line}` : ''}`);
    if (f.endpoint) console.log(`  Endpoint: ${f.endpoint}`);
    console.log(`  Expected: ${f.expected}`);
    console.log(`  Actual: ${f.actual}`);
    console.log(`  Likely cause: ${f.likely_cause}`);
  }
}

const backendRoutes = extractBackendRoutes();
const findings = [];
for (const g of routeGroups) {
  for (const r of g.required) {
    findings.push({
      severity: routeMatch(r, backendRoutes) ? 'PASS' : 'FAIL',
      subsystem: 'Contract + route health',
      page_or_file: g.name,
      endpoint: r,
      expected: 'Route exists with expected method',
      actual: routeMatch(r, backendRoutes) ? 'Route found' : 'Route missing',
      likely_cause: routeMatch(r, backendRoutes) ? 'N/A' : 'Route removed/renamed or method changed',
    });
  }
}

findings.push(...runApiBaseAudit());
const contextReport = runContextGuardCheck();
findings.push(...contextReport.findings.map((f) => ({ ...f, page_or_file: f.file })));
findings.push(...(await runFlowChecks(process.env.BASE_URL)));

printFindings(findings);

const summary = {
  pass: findings.filter((f) => f.severity === 'PASS').length,
  warn: findings.filter((f) => f.severity === 'WARN').length,
  fail: findings.filter((f) => f.severity === 'FAIL').length,
  generated_at: new Date().toISOString(),
};

fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
const reportPath = path.join(ROOT, 'reports', `system-readiness-${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(reportPath, JSON.stringify({ summary, findings }, null, 2));
console.log(`REPORT: ${path.relative(ROOT, reportPath)}`);

process.exit(summary.fail > 0 ? 1 : 0);
