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
  assert.deepEqual(modules, ["hero", "customer_actions", "primary_cta", "services", "social_links", "business_info", "guide_assistant"]);
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

test("buildBarberPilotBaselineConfig applies shared defaults while preserving existing values", () => {
  const config = buildBarberPilotBaselineConfig({
    brand: { name: "Clip Joint" },
    actions: {
      primary: [{ label: "Reserve chair", url: "/reserve" }],
    },
  });

  assert.equal(config.selected_template_id, "default");
  assert.equal(config.brand.name, "Clip Joint");
  assert.equal(config.brand.headline, "Service-ready booking in one tap");
  assert.equal(config.actions.primary[0].label, "Reserve chair");
  assert.equal(config.links.rewards_url, "/rewards.html");
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

test("tap hub renderer gates booking behind check-in and uses 12-hour display formatter", () => {
  const html = renderTapHubPage(buildTapHubViewModel({
    route_namespace: "tap-crm",
    resolution: { tenant: "demoa", tag_code: "phase7-demoa", label: "Clip Joint" },
    business_config: {
      actions: {
        primary: [{ label: "Book now", url: "/book" }],
      },
    },
    template_runtime: resolveTemplateRuntime({ selected_template_id: "barber" }),
  }));

  assert.equal(/Check-in first/.test(html), true);
  assert.equal(/id="checkinBackdrop"/.test(html), true);
  assert.equal(/id="checkinCancelBtn"/.test(html), true);
  assert.equal(/data-checkin-enter/.test(html), true);
  assert.equal(/Complete check-in first/.test(html), true);
  assert.equal(/Customer actions/.test(html), true);
  assert.equal(/>Check in</.test(html), true);
  assert.equal(/>Book</.test(html), true);
  assert.equal(/>Pay now</.test(html), true);
  assert.equal(/>Leave a tip</.test(html), true);
  assert.equal(/Customer account &amp; rewards/.test(html), true);
  assert.equal(/Create your account/.test(html), true);
  assert.equal(/Earn points/.test(html), true);
  assert.equal(/Unlock discounts/.test(html), true);
  assert.equal(/Leave feedback/.test(html), true);
  assert.equal(/Build your rewards over time/.test(html), true);
  assert.equal(/Create account, earn points, get discounts/.test(html), true);
  assert.equal(/>Write a review</.test(html), true);
  assert.equal(/>Rewards</.test(html), true);
  assert.equal(/>VOC</.test(html), true);
  assert.equal(/https:\/\/buy\.stripe\.com\/00w5kw6Lv3YweZoffq8bS00/.test(html), true);
  assert.equal(/https:\/\/cash\.app\/\$theEmpireinc/.test(html), true);
  assert.equal(/data-tap-event-type="return_engine_click"/.test(html), true);
  assert.equal(/data-tap-event-type="pay_click"/.test(html), true);
  assert.equal(/data-tap-event-type="tip_click"/.test(html), true);
  assert.equal(/data-tap-event-type="review_click"/.test(html), true);
  assert.equal(/data-tap-event-type="rewards_click"/.test(html), true);
  assert.equal(/data-tap-event-type="voc_click"/.test(html), true);
  assert.equal(/\/api\/tap-crm\/public\/tags\/" \+ encodeURIComponent\(tagCode\) \+ "\/events"/.test(html), true);
  assert.equal(/function logTapEvent\(eventType, metadata\)/.test(html), true);
  assert.equal(/logTapEvent\("booking_submit"/.test(html), true);
  assert.equal(/function toDisplayTime\(time24\)/.test(html), true);
  assert.equal(html.includes("(?::\\d{2})?"), true);
  assert.equal(/if \(!event \|\| event.type !== "click"\) return;/.test(html), true);
  assert.equal(/setStatus\("Selected " \+ toDisplayTime\(selectedSlot\) \+ "\. Tap Confirm booking to continue\."\);/.test(html), true);
  assert.equal(/showPageNotice\("Booking confirmed/.test(html), true);
});

test("tap hub renderer adds google review action only when configured", () => {
  const withGoogle = renderTapHubPage(buildTapHubViewModel({
    route_namespace: "tap-crm",
    resolution: { tenant: "demoa", tag_code: "phase7-demoa", label: "Clip Joint" },
    business_config: {
      links: { google_review_url: "https://g.page/r/example/review" },
    },
    template_runtime: resolveTemplateRuntime({ selected_template_id: "salon" }),
  }));
  const withoutGoogle = renderTapHubPage(buildTapHubViewModel({
    route_namespace: "tap-crm",
    resolution: { tenant: "demoa", tag_code: "phase7-demoa", label: "Clip Joint" },
    business_config: {},
    template_runtime: resolveTemplateRuntime({ selected_template_id: "salon" }),
  }));

  assert.equal(/>Google review</.test(withGoogle), true);
  assert.equal(/data-tap-event-type="google_review_click"/.test(withGoogle), true);
  assert.equal(/>Google review</.test(withoutGoogle), false);
});
