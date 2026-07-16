"use strict";

function text(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function canonicalDatabaseChildId(value) {
  const raw = text(value);
  if (!raw) return { ok: false, error: "missing_child_id", raw };
  if (/^[1-9]\d*$/.test(raw)) return { ok: true, child_id: raw, raw };
  return { ok: false, error: "malformed_child_id", raw };
}

async function normalizeAdaptiveLearnerContext(input = {}, options = {}) {
  const rawChildId = input.child_id ?? input.childId ?? input.profile_id ?? input.learner_id;
  const parsed = canonicalDatabaseChildId(rawChildId);
  const displayName = text(input.display_name || input.child_display_name || input.child_name) || "Learner";
  if (!parsed.ok) {
    const err = new Error(`We could not verify ${displayName}'s learning profile. Please return to the Parent Dashboard and try again.`);
    err.code = parsed.error;
    err.raw_child_id = parsed.raw;
    err.display_name = displayName;
    throw err;
  }

  let ownership = input.ownership || null;
  if (typeof options.resolveOwnedChild === "function") {
    ownership = await options.resolveOwnedChild({ childId: parsed.child_id, input });
    if (!ownership || ownership.ok === false) {
      const err = new Error(`We could not verify ${displayName}'s learning profile. Please return to the Parent Dashboard and try again.`);
      err.code = ownership?.error || "ownership_not_verified";
      err.raw_child_id = parsed.raw;
      err.display_name = displayName;
      throw err;
    }
  }

  return {
    child_id: parsed.child_id,
    program_context: text(input.program_context) || "youth_development",
    source_registry: text(input.source_registry) || "youth_development",
    display_name: displayName,
    parent_profile_id: text(input.parent_profile_id || ownership?.parent_profile_id || ownership?.row?.parent_id) || null,
    auth_user_id: text(input.auth_user_id || ownership?.auth_user_id) || null,
    ownership_verified: Boolean(input.ownership_verified || ownership?.ok || ownership?.ownership_verified),
  };
}

module.exports = { canonicalDatabaseChildId, normalizeAdaptiveLearnerContext };
