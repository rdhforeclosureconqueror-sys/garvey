const test = require("node:test");
const assert = require("node:assert/strict");

const { buildOwnerConsolePayload } = require("../server/tapCrmRoutes");
const {
  normalizeTemplateId,
  resolveTemplate,
  resolveTemplateRuntime,
  cloneTemplateForIndustry,
  listTemplates,
  listModules,
  listAddOns,
  resolveAddOnRuntime,
  resolveServiceCustomFields,
  buildBarberPilotBaselineConfig,
} = require("../server/tapCrmTemplates");

const { buildTapHubViewModel, renderTapHubPage } = require("../server/tapHubRenderer");

test("normalizeTemplateId trims and lowercases", () => {
  assert.equal(normalizeTemplateId("  BARBER "), "barber");
});

test("resolveTemplate falls back to default for unknown template", () => {
  const result = resolveTemplate("unknown-template");
  assert.equal(result.template.id, "default");
  assert.equal(result.fallback_applied, true);
});

test("resolveTemplateRuntime merges default, template, and tenant module overrides", () => {
  const runtime = resolveTemplateRuntime({
    selected_template_id: "barber",
    module_overrides: {
      primary_cta: {
        enabled: true,
        config: {
          label: "Reserve chair",
          url: "/book-now",
        },
      },
      social_links: {
        enabled: false,
      },
    },
  });

  assert.equal(runtime.selected_template_id, "barber");

  const cta = runtime.modules.find((module) => module.module_id === "primary_cta");
  assert.equal(cta.config.label, "Reserve chair");
  assert.equal(cta.config.url, "/book-now");

  const social = runtime.modules.find((module) => module.module_id === "social_links");
  assert.equal(social.enabled, false);
});

test("listTemplates exposes default plus barber/salon/fitness reuse set", () => {
  const templates = listTemplates().map((template) => template.id);
  assert.deepEqual(templates, ["default", "barber", "salon", "fitness"]);
});

test("listModules exposes stable module registry keys", () => {
  const modules = listModules().map((module) => module.module_id);
  assert.deepEqual(modules, ["hero", "primary_cta", "services", "social_links", "business_info", "guide_assistant"]);
});

test("buildOwnerConsolePayload includes phase 6 module management screens", () => {
  const payload = buildOwnerConsolePayload({
    tenant: "demo-tenant",
    role: "business_owner",
  });

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

test("cloneTemplateForIndustry returns cloned template metadata for add-on architecture", () => {
  const clone = cloneTemplateForIndustry({ templateId: "barber", industryId: "pet-grooming" });
  assert.equal(clone.is_cloned_template, true);
  assert.equal(clone.source_template_id, "barber");
  assert.equal(clone.vertical, "pet-grooming");
});

test("listAddOns and resolveAddOnRuntime support add-on extension model", () => {
  const addOnIds = listAddOns().map((item) => item.add_on_id);
  assert.deepEqual(addOnIds, ["waitlist_capture", "loyalty_snapshot"]);

  const runtime = resolveAddOnRuntime({
    add_on_overrides: {
      waitlist_capture: {
        enabled: true,
        config: { cta_label: "Join now" },
      },
    },
  });
  const waitlist = runtime.find((item) => item.add_on_id === "waitlist_capture");
  assert.equal(waitlist.enabled, true);
  assert.equal(waitlist.config.cta_label, "Join now");
});

test("resolveServiceCustomFields merges service defaults with tenant overrides", () => {
  const fields = resolveServiceCustomFields({
    custom_field_overrides: {
      barber: [{ key: "preferred_barber", label: "Favorite barber" }],
    },
  }, "barber");
  const preferred = fields.find((item) => item.key === "preferred_barber");
  assert.equal(preferred.label, "Favorite barber");
});

test("buildBarberPilotBaselineConfig applies barber defaults while preserving existing values", () => {
  const config = buildBarberPilotBaselineConfig({
    brand: { name: "Clip Joint" },
    actions: {
      primary: [{ label: "Reserve chair", url: "/reserve" }],
    },
  });

  assert.equal(config.selected_template_id, "barber");
  assert.equal(config.brand.name, "Clip Joint");
  assert.equal(config.brand.headline, "Barber-ready booking in one tap");
  assert.equal(config.actions.primary[0].label, "Reserve chair");
  assert.equal(config.onboarding.first_business_setup_complete, false);
});


test("tap hub view model uses template runtime hero and services values", () => {
  const model = buildTapHubViewModel({
    route_namespace: "tap-crm",
    resolution: { tenant: "demoa", tag_code: "phase6-demoa", label: "Fallback" },
    business_config: {},
    template_runtime: resolveTemplateRuntime({ selected_template_id: "fitness" }),
  });

  assert.equal(model.headline, "Train with purpose");
  assert.deepEqual(model.featuredServices, ["Group class", "Personal training"]);
});

test("tap hub renderer suppresses social section when social module disabled", () => {
  const html = renderTapHubPage(buildTapHubViewModel({
    route_namespace: "tap-crm",
    resolution: { tenant: "demoa", tag_code: "phase6-demoa", label: "Fallback" },
    business_config: {},
    template_runtime: resolveTemplateRuntime({
      selected_template_id: "barber",
      module_overrides: { social_links: { enabled: false } },
    }),
  }));

  assert.equal(/<h2>Social & brand<\/h2>/.test(html), false);
});

test("tap hub renderer includes afrocentric visual tokens and virtual guide block", () => {
  const html = renderTapHubPage(buildTapHubViewModel({
    route_namespace: "tap-crm",
    resolution: { tenant: "demoa", tag_code: "phase7-demoa", label: "Clip Joint" },
    business_config: {},
    template_runtime: resolveTemplateRuntime({ selected_template_id: "barber" }),
  }));

  assert.equal(/Virtual Guide · Tap for steps/.test(html), true);
  assert.equal(/guide-panel/.test(html), true);
  assert.equal(/#b91c1c/.test(html), true);
  assert.equal(/#166534/.test(html), true);
  assert.equal(/rgba\(230, 184, 93/.test(html), true);
});
