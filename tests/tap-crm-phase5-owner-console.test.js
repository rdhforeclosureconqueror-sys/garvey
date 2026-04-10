const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeActionItems,
  buildOwnerConsolePayload,
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
    "tap_crm_dashboard_landing",
  ]);
});
