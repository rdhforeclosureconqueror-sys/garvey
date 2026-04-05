import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const routerMounts = [
  { file: "server/kanbanRoutes.js", base: "/api/kanban" },
  { file: "server/foundationRoutes.js", base: "/api/foundation" },
  { file: "server/structureRoutes.js", base: "/api/structure" },
  { file: "server/executionRoutes.js", base: "/api/execution" },
  { file: "server/intelligenceRoutes.js", base: "/api/intelligence" },
  { file: "server/infrastructureRoutes.js", base: "/api/infrastructure" },
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
  "POST /api/owner/signup",
  "POST /api/owner/signin",
  "POST /api/owner/signout",
  "GET /api/owner/session",
  "GET /api/archetypes/library",
  "GET /api/archetypes/groups",
  "GET /api/archetypes/group",
  "GET /api/archetypes/customer",
  "GET /join/:slug",
  "GET /api/templates",
  "POST /api/templates/select",
  "POST /api/campaigns/create",
  "GET /api/campaigns/list",
  "GET /api/campaigns/qr",
  "GET /api/rewards/status",
  "GET /api/rewards/history",
  "POST /api/rewards/checkin",
  "POST /api/rewards/action",
  "POST /api/rewards/review",
  "POST /api/rewards/referral",
  "POST /api/rewards/wishlist",
  "GET /api/contributions/status",
  "GET /api/contributions/history",
  "POST /api/contributions/add",
  "POST /api/contributions/support",
  "POST /api/spotlight/submissions",
  "GET /api/spotlight/feed",
  "POST /api/spotlight/posts/:postId/moderation",
  "POST /api/spotlight/businesses/:businessId/claim",
  "GET /api/spotlight/businesses/:businessId/support",
  "GET /api/spotlight/claims",
  "POST /api/spotlight/claims/:claimId/moderation",
  "GET /t/:slug/products",
  "GET /t/:slug/products/public",
  "POST /t/:slug/products",
  "PUT /t/:slug/products/:productId",
  "DELETE /t/:slug/products/:productId",
  "GET /t/:slug/showcase",
  "POST /t/:slug/showcase/feature-selection",
  "POST /t/:slug/showcase/settings",
  "POST /t/:slug/contributions/settings",
  "GET /t/:slug/contributions/access",
  "POST /t/:slug/showcase/track",
  "GET /t/:slug/reviews",
  "POST /t/:slug/reviews/:reviewId/moderation",
  "GET /t/:slug/dashboard",
  "GET /t/:slug/customers",
  "GET /t/:slug/segments",
  "GET /t/:slug/campaigns/summary",
  "GET /t/:slug/analytics",
  "GET /t/:slug/site",
  "POST /api/site/generate",
  "POST /api/system/activate-full",
  "GET /api/questions",
  "POST /api/intake",
  "POST /voc-intake",
  "POST /api/vocIntake",
  "GET /api/results/:email",
  "GET /api/results/customer/:crid",
  "POST /api/customer/share-result",
  "GET /api/features/consent",
  "POST /api/consent/required",
  "POST /api/consent/network",
  "GET /api/consent/state",
  "POST /api/consent/profile/delete",
  "GET /api/admin/config/:tenant",
  "GET /api/tenant/lookup",
  "POST /api/admin/config",
  "GET /api/verify/db",
  "GET /api/verify/questions",
  "GET /api/verify/scoring",
  "GET /api/verify/intelligence/:slug",
  "GET /api/verify/runtime",
  "POST /t/:slug/checkin",
  "POST /t/:slug/action",
  "POST /t/:slug/review",
  "POST /t/:slug/referral",
  "POST /t/:slug/wishlist",
  "GET /t/:slug/review-link",
  "POST /t/:slug/review-link",
  "GET /t/:slug/customers/:userId/profile",
  "POST /t/:slug/messages",
  "GET /t/:slug/messages",
  "GET /t/:slug/messages/inbox",
  "POST /api/contributions/contribute",
  "POST /api/kanban/ensure",
  "GET /api/kanban/board",
  "GET /api/kanban/cards",
  "POST /api/kanban/cards",
  "PUT /api/kanban/cards/:id",
  "POST /api/kanban/cards/:id/move",
  "GET /api/kanban/events",
  "POST /api/foundation/initialize",
  "GET /api/foundation/state",
  "PUT /api/foundation/cards/:cardType",
  "POST /api/foundation/cards/:cardType/move",
  "POST /api/foundation/gadget/mission-generator",
  "POST /api/foundation/gadget/customer-builder",
  "POST /api/foundation/gadget/value-prop-builder",
  "POST /api/foundation/gadget/start-journey",
  "POST /api/structure/initialize",
  "POST /api/structure/roles",
  "POST /api/structure/operator-assignment",
  "GET /api/structure/state",
  "PUT /api/structure/cards/:cardType",
  "POST /api/structure/gadget/role-creator",
  "POST /api/structure/gadget/ownership-validator",
  "POST /api/structure/gadget/backup-assigner",
  "POST /api/execution/initialize",
  "POST /api/execution/items",
  "GET /api/execution/state",
  "POST /api/execution/gadget/sop-builder",
  "POST /api/execution/gadget/recurring-engine",
  "POST /api/execution/gadget/daily-checklist-engine",
  "POST /api/execution/gadget/deliverables-scaffolder",
  "POST /api/intelligence/initialize",
  "POST /api/intelligence/kpis",
  "POST /api/intelligence/score",
  "POST /api/intelligence/gaps/detect",
  "GET /api/intelligence/state",
  "POST /api/infrastructure/initialize",
  "POST /api/infrastructure/tools",
  "POST /api/infrastructure/resources",
  "POST /api/infrastructure/templates",
  "POST /api/infrastructure/links",
  "POST /api/infrastructure/links/validate",
  "GET /api/infrastructure/hub",
  "GET /api/infrastructure/recommendations",
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

  for (const mount of routerMounts) {
    const routerSrc = slurp(mount.file);
    const rRe = /router\.(get|post|put|delete)\(\s*["'`]([^"'`]+)["'`]/g;
    while ((m = rRe.exec(routerSrc))) {
      routes.add(`${m[1].toUpperCase()} ${mount.base}${m[2]}`);
    }
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
  const indexSrc = slurp("public/index.html");
  const adminSrc = slurp("public/admin.html");
  const missingRewardIds = [
    !indexSrc.includes('id="rewardsLink"') ? "public/index.html#rewardsLink" : null,
    !adminSrc.includes('id="rewardsBtn"') ? "public/admin.html#rewardsBtn" : null,
  ].filter(Boolean);

  const result = {
    backend_route_count: backendRoutes.size,
    documented_route_count: documentedRoutes.length,
    missing_from_doc: missingFromDoc,
    extra_in_doc: extraInDoc,
    unknown_frontend_api_calls: unknownCalls,
    reward_links_found: rewardLinks,
    missing_reward_link_ids: missingRewardIds,
  };

  console.log(JSON.stringify(result, null, 2));

  if (missingFromDoc.length || extraInDoc.length || unknownCalls.length || rewardLinkMissing || missingRewardIds.length) {
    process.exit(1);
  }
}

main();
