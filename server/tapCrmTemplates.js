"use strict";

const TEMPLATE_REGISTRY = {
  default: {
    id: "default",
    label: "Default Service",
    vertical: "general",
    modules: {
      hero: { enabled: true, config: {} },
      primary_cta: { enabled: true, config: {} },
      services: { enabled: true, config: {} },
      social_links: { enabled: true, config: {} },
      business_info: { enabled: true, config: {} },
      guide_assistant: { enabled: true, config: {} },
    },
  },
  barber: {
    id: "barber",
    label: "Barber Shop",
    vertical: "barber",
    modules: {
      hero: { enabled: true, config: { headline: "Fresh cuts, no wait" } },
      primary_cta: { enabled: true, config: { label: "Book a cut" } },
      services: { enabled: true, config: { featured: ["Haircut", "Beard trim"] } },
      social_links: { enabled: true, config: {} },
      business_info: { enabled: true, config: {} },
      guide_assistant: {
        enabled: true,
        config: {
          title: "Your chair, your flow",
          intro: "Use this quick guide to book, confirm, and arrive ready.",
          steps: ["Choose your cut", "Tap Book a cut", "Show booking confirmation at arrival"],
        },
      },
    },
  },
  salon: {
    id: "salon",
    label: "Salon",
    vertical: "salon",
    modules: {
      hero: { enabled: true, config: { headline: "Style for every occasion" } },
      primary_cta: { enabled: true, config: { label: "Book appointment" } },
      services: { enabled: true, config: { featured: ["Color", "Blowout"] } },
      social_links: { enabled: true, config: {} },
      business_info: { enabled: true, config: {} },
      guide_assistant: { enabled: true, config: {} },
    },
  },
  fitness: {
    id: "fitness",
    label: "Fitness Studio",
    vertical: "fitness",
    modules: {
      hero: { enabled: true, config: { headline: "Train with purpose" } },
      primary_cta: { enabled: true, config: { label: "Start trial" } },
      services: { enabled: true, config: { featured: ["Group class", "Personal training"] } },
      social_links: { enabled: true, config: {} },
      business_info: { enabled: true, config: {} },
      guide_assistant: { enabled: true, config: {} },
    },
  },
};

const MODULE_REGISTRY = {
  hero: {
    id: "hero",
    label: "Hero",
    default_enabled: true,
    default_config: {
      headline: "Welcome",
      subheadline: "Tap to get started",
    },
  },
  primary_cta: {
    id: "primary_cta",
    label: "Primary CTA",
    default_enabled: true,
    default_config: {
      label: "Book now",
      url: "#",
    },
  },
  services: {
    id: "services",
    label: "Services",
    default_enabled: true,
    default_config: {
      featured: [],
    },
  },
  social_links: {
    id: "social_links",
    label: "Social Links",
    default_enabled: true,
    default_config: {
      links: [],
    },
  },
  business_info: {
    id: "business_info",
    label: "Business Info",
    default_enabled: true,
    default_config: {
      phone: "",
      address: "",
      hours: "",
    },
  },
  guide_assistant: {
    id: "guide_assistant",
    label: "Guide Assistant",
    default_enabled: true,
    default_config: {
      title: "How this works",
      intro: "Follow these quick steps to get the best experience.",
      steps: ["Pick a service", "Use the main action to continue", "Return to this guide any time"],
      cta_label: "Start now",
    },
  },
};

const ADD_ON_REGISTRY = {
  waitlist_capture: {
    id: "waitlist_capture",
    label: "Waitlist Capture",
    default_enabled: false,
    default_config: {
      headline: "Join the waitlist",
      cta_label: "Join waitlist",
    },
  },
  loyalty_snapshot: {
    id: "loyalty_snapshot",
    label: "Loyalty Snapshot",
    default_enabled: false,
    default_config: {
      title: "Rewards snapshot",
      points_label: "Points balance",
    },
  },
};

const SERVICE_CUSTOM_FIELD_REGISTRY = {
  barber: [
    { key: "preferred_barber", label: "Preferred barber", type: "text", required: false },
    { key: "beard_service", label: "Include beard service", type: "boolean", required: false },
  ],
  salon: [
    { key: "hair_length", label: "Hair length", type: "select", required: false, options: ["short", "medium", "long"] },
    { key: "color_history", label: "Recent color treatment", type: "boolean", required: false },
  ],
  fitness: [
    { key: "fitness_goal", label: "Primary goal", type: "text", required: true },
    { key: "injury_notes", label: "Injury notes", type: "textarea", required: false },
  ],
};

const BARBER_PILOT_BASELINE = Object.freeze({
  selected_template_id: "barber",
  brand: {
    headline: "Barber-ready booking in one tap",
    subheadline: "Pick a service, book your chair, and show up fresh.",
  },
  business: {
    hours: "Mon-Sat 9:00 AM - 7:00 PM",
  },
  actions: {
    primary: [
      {
        label: "Book a cut",
        url: "/book",
      },
    ],
    secondary: [
      {
        label: "Call shop",
        url: "tel:+10000000000",
      },
    ],
  },
  onboarding: {
    pilot_ready: false,
    first_business_setup_complete: false,
    checklist: {
      business_setup: false,
      primary_action: false,
      tag_registered: false,
    },
  },
});

function cloneJson(value, fallback = {}) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_) {
    return fallback;
  }
}

function normalizeTemplateId(value) {
  return String(value || "").trim().toLowerCase();
}

function resolveTemplate(templateId) {
  const normalized = normalizeTemplateId(templateId);
  const direct = TEMPLATE_REGISTRY[normalized];
  if (direct) {
    return { template: cloneJson(direct, {}), requested_template_id: normalized, fallback_applied: false };
  }
  return {
    template: cloneJson(TEMPLATE_REGISTRY.default, {}),
    requested_template_id: normalized,
    fallback_applied: normalized !== "" && normalized !== "default",
  };
}

function resolveTemplateRuntime(config = {}) {
  const selectedTemplateId = normalizeTemplateId(config.selected_template_id || config.template || "default");
  const templateState = resolveTemplate(selectedTemplateId || "default");
  const moduleOverrides = cloneJson(config.module_overrides, {});

  const modules = Object.values(MODULE_REGISTRY).map((moduleDef) => {
    const templateModule = templateState.template.modules[moduleDef.id] || {};
    const tenantOverride = moduleOverrides[moduleDef.id] || {};
    const enabled = tenantOverride.enabled !== undefined
      ? tenantOverride.enabled === true
      : templateModule.enabled !== undefined
        ? templateModule.enabled === true
        : moduleDef.default_enabled === true;

    const mergedConfig = {
      ...cloneJson(moduleDef.default_config, {}),
      ...cloneJson(templateModule.config, {}),
      ...cloneJson(tenantOverride.config, {}),
    };

    return {
      module_id: moduleDef.id,
      label: moduleDef.label,
      enabled,
      config: mergedConfig,
    };
  });

  return {
    selected_template_id: templateState.template.id,
    requested_template_id: templateState.requested_template_id,
    fallback_applied: templateState.fallback_applied,
    vertical: templateState.template.vertical,
    modules,
  };
}

function cloneTemplateForIndustry({ templateId, industryId }) {
  const resolved = resolveTemplate(templateId || "default").template;
  const normalizedIndustryId = normalizeTemplateId(industryId || resolved.vertical || "general") || "general";
  return {
    ...cloneJson(resolved, {}),
    id: `${normalizedIndustryId}_${resolved.id}_clone`,
    label: `${resolved.label} (${normalizedIndustryId})`,
    vertical: normalizedIndustryId,
    source_template_id: resolved.id,
    is_cloned_template: true,
  };
}

function listTemplates() {
  return Object.values(TEMPLATE_REGISTRY).map((template) => ({
    id: template.id,
    label: template.label,
    vertical: template.vertical,
  }));
}

function listAddOns() {
  return Object.values(ADD_ON_REGISTRY).map((addOnDef) => ({
    add_on_id: addOnDef.id,
    label: addOnDef.label,
    default_enabled: addOnDef.default_enabled,
    default_config: cloneJson(addOnDef.default_config, {}),
  }));
}

function resolveAddOnRuntime(config = {}) {
  const overrides = cloneJson(config.add_on_overrides, {});
  return Object.values(ADD_ON_REGISTRY).map((addOnDef) => {
    const override = cloneJson(overrides[addOnDef.id], {});
    return {
      add_on_id: addOnDef.id,
      label: addOnDef.label,
      enabled: override.enabled !== undefined ? override.enabled === true : addOnDef.default_enabled,
      config: {
        ...cloneJson(addOnDef.default_config, {}),
        ...cloneJson(override.config, {}),
      },
    };
  });
}

function resolveServiceCustomFields(config = {}, serviceType) {
  const normalizedServiceType = normalizeTemplateId(serviceType || "general");
  const defaults = cloneJson(SERVICE_CUSTOM_FIELD_REGISTRY[normalizedServiceType], []);
  const overrideState = cloneJson(config.custom_field_overrides, {});
  const overrideList = Array.isArray(overrideState[normalizedServiceType]) ? overrideState[normalizedServiceType] : [];
  const overrideByKey = new Map(overrideList.map((field) => [String(field.key || "").trim(), field]));
  return defaults.map((field) => {
    const override = cloneJson(overrideByKey.get(field.key), {});
    return {
      ...cloneJson(field, {}),
      ...override,
      key: field.key,
    };
  });
}

function listModules() {
  return Object.values(MODULE_REGISTRY).map((moduleDef) => ({
    module_id: moduleDef.id,
    label: moduleDef.label,
    default_enabled: moduleDef.default_enabled,
    default_config: cloneJson(moduleDef.default_config, {}),
  }));
}

function buildBarberPilotBaselineConfig(existingConfig = {}) {
  const current = cloneJson(existingConfig, {});
  return {
    ...cloneJson(BARBER_PILOT_BASELINE, {}),
    ...current,
    brand: {
      ...cloneJson(BARBER_PILOT_BASELINE.brand, {}),
      ...cloneJson(current.brand, {}),
    },
    business: {
      ...cloneJson(BARBER_PILOT_BASELINE.business, {}),
      ...cloneJson(current.business, {}),
    },
    actions: {
      primary: normalizeActionArray(current.actions && current.actions.primary, BARBER_PILOT_BASELINE.actions.primary),
      secondary: normalizeActionArray(current.actions && current.actions.secondary, BARBER_PILOT_BASELINE.actions.secondary),
    },
    onboarding: {
      ...cloneJson(BARBER_PILOT_BASELINE.onboarding, {}),
      ...cloneJson(current.onboarding, {}),
      checklist: {
        ...cloneJson(BARBER_PILOT_BASELINE.onboarding.checklist, {}),
        ...cloneJson(current.onboarding && current.onboarding.checklist, {}),
      },
    },
    selected_template_id: normalizeTemplateId(current.selected_template_id || "barber") || "barber",
  };
}

function normalizeActionArray(value, fallback) {
  if (!Array.isArray(value) || value.length === 0) {
    return cloneJson(fallback, []);
  }
  return value
    .map((item) => ({
      label: String(item && item.label || "").trim(),
      url: String(item && item.url || "").trim(),
    }))
    .filter((item) => item.label && item.url)
    .slice(0, 4);
}

module.exports = {
  TEMPLATE_REGISTRY,
  MODULE_REGISTRY,
  ADD_ON_REGISTRY,
  SERVICE_CUSTOM_FIELD_REGISTRY,
  normalizeTemplateId,
  resolveTemplate,
  resolveTemplateRuntime,
  cloneTemplateForIndustry,
  listTemplates,
  listModules,
  listAddOns,
  resolveAddOnRuntime,
  resolveServiceCustomFields,
  BARBER_PILOT_BASELINE,
  buildBarberPilotBaselineConfig,
};
