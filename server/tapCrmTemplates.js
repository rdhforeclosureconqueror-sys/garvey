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
};

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

function listTemplates() {
  return Object.values(TEMPLATE_REGISTRY).map((template) => ({
    id: template.id,
    label: template.label,
    vertical: template.vertical,
  }));
}

function listModules() {
  return Object.values(MODULE_REGISTRY).map((moduleDef) => ({
    module_id: moduleDef.id,
    label: moduleDef.label,
    default_enabled: moduleDef.default_enabled,
    default_config: cloneJson(moduleDef.default_config, {}),
  }));
}

module.exports = {
  TEMPLATE_REGISTRY,
  MODULE_REGISTRY,
  normalizeTemplateId,
  resolveTemplate,
  resolveTemplateRuntime,
  listTemplates,
  listModules,
};
