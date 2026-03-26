import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const backendFiles = [
  "server/index.js",
  "server/kanbanRoutes.js",
];

const frontendScanFiles = [
  "public/index.html",
  "public/admin.html",
  "public/intake.html",
  "public/voc.html",
  "public/rewards.html",
  "public/site_intake.html",
  "public/templates.js",
  "public/garvey-kanban.js",
  "dashboardnew/app.js",
  "scripts/garvey-smoke.mjs",
];

const documentedRoutes = [
  "GET /dashboard.html",
  "GET /health",
  "GET /join/:slug",
  "GET /api/templates",
  "POST /api/templates/select",
  "POST /api/site/generate",
  "GET /api/questions",
  "POST /api/intake",
  "POST /voc-intake",
  "GET /api/results/:email",
  "GET /api/admin/config/:tenant",
  "POST /api/admin/config",
  "GET /api/verify/db",
  "GET /api/verify/questions",
  "GET /api/verify/scoring",
  "GET /api/verify/intelligence/:slug",
  "POST /t/:slug/checkin",
  "POST /t/:slug/action",
  "POST /t/:slug/review",
  "POST /t/:slug/referral",
  "POST /t/:slug/wishlist",
  "GET /t/:slug/dashboard",
  "GET /t/:slug/customers",
  "GET /t/:slug/analytics",
  "GET /t/:slug/site",
  "POST /api/kanban/ensure",
  "GET /api/kanban/board",
  "GET /api/kanban/cards",
  "POST /api/kanban/cards",
  "PUT /api/kanban/cards/:id",
  "POST /api/kanban/cards/:id/move",
  "GET /api/kanban/events",
];

function slurp(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function normalizePath(routePath) {
  return routePath
    .replace(/\$\{[^}]+\}/g, ":param")
    .replace(/\\\/\(\[\^\/\]\+\)/g, ":param")
    .replace(/\/\$\{enc\}/g, "/:slug")
    .replace(/\/\$\{encodeURIComponent\(tenant\)\}/g, "/:slug")
    .replace(/\/\$\{tenant\}/g, "/:slug")
    .replace(/\/:[^/]+\?/g, "/:param")
    .replace(/\/{2,}/g, "/");
}

function extractBackendRoutes() {
  const routes = new Set();
  const appSrc = slurp("server/index.js");
  const appRe = /app\.(get|post|put|delete)\(\s*["'`]([^"'`]+)["'`]/g;
  let m;
  while ((m = appRe.exec(appSrc))) {
    routes.add(`${m[1].toUpperCase()} ${m[2]}`);
  }

  const routerSrc = slurp("server/kanbanRoutes.js");
  const rRe = /router\.(get|post|put|delete)\(\s*["'`]([^"'`]+)["'`]/g;
  while ((m = rRe.exec(routerSrc))) {
    routes.add(`${m[1].toUpperCase()} /api/kanban${m[2]}`);
  }

  return routes;
}

function extractFrontendApiCalls() {
  const calls = [];
  const fetchRe = /fetch\(\s*(?:buildUrl\(\s*)?([`"'`])([^"'`]+)\1/g;
  for (const file of frontendScanFiles) {
    const src = slurp(file);
    let m;
    while ((m = fetchRe.exec(src))) {
      const raw = m[2];
      if (!raw.includes("/api/") && !raw.includes("/t/") && !raw.includes("/voc-intake") && !raw.includes("/health")) continue;
      calls.push({ file, raw });
    }
  }
  return calls;
}

function extractHrefTargets() {
  const targets = [];
  const hrefRe = /href\s*=\s*["'`]([^"'`]+)["'`]/g;
  const assignRe = /\.href\s*=\s*([`"'])([^`"']+)\1/g;
  for (const file of frontendScanFiles.filter((f) => f.endsWith(".html") || f.endsWith(".js"))) {
    const src = slurp(file);
    let m;
    while ((m = hrefRe.exec(src))) {
      if (m[1].startsWith("/")) targets.push({ file, href: m[1] });
    }
    while ((m = assignRe.exec(src))) {
      if (m[2].startsWith("/")) targets.push({ file, href: m[2] });
    }
  }
  return targets;
}

function routeExists(rawPath, routes) {
  const withoutBase = rawPath
    .replace("${API_BASE}", "")
    .replace("https://garveybackend.onrender.com", "")
    .replace("http://localhost:3000", "");
  const cleaned = normalizePath(withoutBase.split("?")[0]);
  if (cleaned.startsWith("/health")) return routes.has("GET /health");
  if (cleaned.startsWith("/voc-intake")) return routes.has("POST /voc-intake");
  const candidates = [...routes];
  return candidates.some((r) => {
    const routePath = r.split(" ").slice(1).join(" ");
    const pattern = new RegExp(`^${routePath.replace(/:[^/]+/g, "[^/]+")}$`);
    return pattern.test(cleaned);
  });
}

function main() {
  const backendRoutes = extractBackendRoutes();
  const missingFromDoc = [...backendRoutes].filter((r) => !documentedRoutes.includes(r));
  const extraInDoc = documentedRoutes.filter((r) => !backendRoutes.has(r));

  const frontendCalls = extractFrontendApiCalls();
  const unknownCalls = frontendCalls.filter((c) => !routeExists(c.raw, backendRoutes));

  const hrefTargets = extractHrefTargets();
  const rewardLinks = hrefTargets.filter((h) => h.href.includes("/rewards.html"));
  const rewardLinkMissing = rewardLinks.length === 0;

  const result = {
    backend_route_count: backendRoutes.size,
    documented_route_count: documentedRoutes.length,
    missing_from_doc: missingFromDoc,
    extra_in_doc: extraInDoc,
    unknown_frontend_api_calls: unknownCalls,
    reward_links_found: rewardLinks,
  };

  console.log(JSON.stringify(result, null, 2));

  if (missingFromDoc.length || extraInDoc.length || unknownCalls.length || rewardLinkMissing) {
    process.exit(1);
  }
}

main();
