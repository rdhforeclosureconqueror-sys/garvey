"use strict";

const {
  normalizeEnvironmentHookEvent,
  validateEnvironmentHookEvent,
} = require("./environmentContracts");

async function captureEnvironmentHook(payload, repository) {
  const event = normalizeEnvironmentHookEvent(payload);
  const validation = validateEnvironmentHookEvent(event);
  if (!validation.ok) {
    return {
      ok: false,
      error: "environment_hook_invalid",
      validation_errors: validation.errors,
      event,
      deterministic: true,
      extension_only: true,
    };
  }

  const persisted = await repository.persistEnvironmentHookEvent(event);
  return {
    ok: true,
    event,
    persistence: persisted,
    separation_guard: "environment_only_signal",
    deterministic: true,
    extension_only: true,
  };
}

module.exports = {
  captureEnvironmentHook,
};
