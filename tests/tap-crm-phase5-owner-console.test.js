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
  describeTagConflict,
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

test("bookings calendar route uses buildTimeSlots helper for month availability generation", () => {
  const routeSource = fs.readFileSync(require.resolve("../server/tapCrmRoutes"), "utf8");
  assert.match(routeSource, /router\.get\(\"\/console\/bookings\/calendar\"/);
  assert.match(routeSource, /const allSlots = buildTimeSlots\(\{/);
  assert.doesNotMatch(routeSource, /const allSlots = buildSlots\(/);
});

test("describeTagConflict returns field-specific messages for key, code, and label collisions", () => {
  const keyConflict = describeTagConflict({
    code: "23505",
    constraint: "tap_crm_tags_tenant_id_key_key",
    detail: "Key (tenant_id, key)=(9, welcome-chair) already exists.",
  });
  assert.equal(keyConflict.field, "key");

  const codeConflict = describeTagConflict({
    code: "23505",
    constraint: "tap_crm_tags_tenant_tag_code_idx",
    detail: "Key (tenant_id, tag_code)=(9, simba-welcome-001) already exists.",
  });
  assert.equal(codeConflict.field, "code");

  const labelConflict = describeTagConflict({
    code: "23505",
    constraint: "tap_crm_tags_tenant_label_idx",
    detail: "Key (tenant_id, lower(label))=(9, welcome chair) already exists.",
  });
  assert.equal(labelConflict.field, "label");
  assert.match(labelConflict.message, /Duplicate label/i);
});
