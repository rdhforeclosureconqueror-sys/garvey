const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  normalizeActionItems,
  buildOwnerConsolePayload,
  isAdminOverrideActor,
  normalizeTagKey,
  normalizeTagStatusValue,
  normalizeDestinationPath,
} = require("../server/tapCrmRoutes");

test("normalizeActionItems returns only valid action entries with fallbacks", () => {
  const actions = normalizeActionItems(
    [
      { label: "Book now", url: "/book" },
      { label: "", url: "/offers" },
      { label: "Call", url: "" },
      {},
    ],
    "Primary action"
  );

  assert.equal(actions.length, 4);
  assert.equal(actions[0].label, "Book now");
  assert.equal(actions[1].label, "Primary action 2");
  assert.equal(actions[2].url, "#");
});

test("buildOwnerConsolePayload lists owner-facing screens", () => {
  const payload = buildOwnerConsolePayload({
    tenant: "demo-tenant",
    role: "business_owner",
  });

  assert.equal(payload.route_namespace, "tap-crm");
  assert.deepEqual(payload.screens, [
    "business_setup",
    "primary_action_editor",
    "secondary_action_editor",
    "tag_manager",
    "analytics_summary",
    "template_selector",
    "module_registry",
    "module_config_editor",
    "add_on_registry",
    "custom_fields_editor",
    "admin_overrides",
    "pilot_readiness",
    "pilot_bootstrap",
    "tap_crm_dashboard_landing",
  ]);
});

test("isAdminOverrideActor allows admin-only override controls", () => {
  assert.equal(isAdminOverrideActor({ isAdmin: true }), true);
  assert.equal(isAdminOverrideActor({ isAdmin: false }), false);
});

test("tag helpers normalize key, status, and destination path for owner lifecycle operations", () => {
  assert.equal(normalizeTagKey("  VIP Chair #1 "), "vip-chair-1");
  assert.equal(normalizeTagStatusValue("DISABLED"), "disabled");
  assert.equal(normalizeTagStatusValue("unknown"), "active");
  assert.equal(normalizeDestinationPath("tap-crm/t/demo"), "/tap-crm/t/demo");
  assert.equal(normalizeDestinationPath("https://example.com/book"), "https://example.com/book");
});

test("tap crm routes include owner tag create and update endpoints", () => {
  const routeSource = fs.readFileSync(require.resolve("../server/tapCrmRoutes"), "utf8");
  assert.match(routeSource, /router\.post\(\"\/console\/tags\"/);
  assert.match(routeSource, /router\.put\(\"\/console\/tags\/:tagId\"/);
});
