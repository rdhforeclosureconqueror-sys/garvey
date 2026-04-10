const test = require("node:test");
const assert = require("node:assert/strict");

const { buildOwnerConsolePayload } = require("../server/tapCrmRoutes");
const {
  normalizeTemplateId,
  resolveTemplate,
  resolveTemplateRuntime,
  listTemplates,
  listModules,
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
  assert.deepEqual(modules, ["hero", "primary_cta", "services", "social_links", "business_info"]);
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
    "tap_crm_dashboard_landing",
  ]);
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
