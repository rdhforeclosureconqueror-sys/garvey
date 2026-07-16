"use strict";

function safeText(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function lowerText(value) {
  return safeText(value).toLowerCase();
}

function normalizeChildScopeId(value) {
  return safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function normalizeChildDisplayName(value) {
  return safeText(value).replace(/\s+/g, " ").slice(0, 120);
}

function profilePayload(row) {
  return row && row.payload && typeof row.payload === "object" ? row.payload : {};
}

function firstPresent(...values) {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

function childNameFromPayload(payload = {}, row = {}) {
  return normalizeChildDisplayName(firstPresent(
    payload.child_display_name,
    payload.child_name,
    payload.name,
    payload.display_name,
    payload.child?.display_name,
    payload.child?.child_display_name,
    payload.child?.child_name,
    payload.child_profile?.child_display_name,
    payload.child_profile?.child_name,
    payload.ownership?.child_profile?.child_display_name,
    payload.ownership?.child_profile?.child_name,
    row.child_name,
    row.customer_name
  ));
}

function tenantFromPayload(payload = {}) {
  return lowerText(firstPresent(
    payload.tenant,
    payload.tenant_slug,
    payload.dashboard_scope?.tenant,
    payload.dashboard_scope?.tenant_slug,
    payload.account?.tenant,
    payload.account?.tenant_slug,
    payload.ownership?.tenant,
    payload.ownership?.tenant_slug
  ));
}

function emailFromPayload(payload = {}) {
  return lowerText(firstPresent(
    payload.email,
    payload.parent_email,
    payload.account_email,
    payload.dashboard_scope?.email,
    payload.account?.email,
    payload.parent?.email,
    payload.ownership?.email
  ));
}

function parentProfileIdFromPayload(payload = {}) {
  return firstPresent(
    payload.parent_profile_id,
    payload.parent_id,
    payload.dashboard_scope?.parent_profile_id,
    payload.account?.parent_profile_id,
    payload.parent?.parent_profile_id,
    payload.ownership?.parent_profile_id,
    payload.ownership?.parent_id
  ) || null;
}

function authUserIdFromPayload(payload = {}) {
  return firstPresent(
    payload.auth_user_id,
    payload.user_id,
    payload.account?.auth_user_id,
    payload.account?.user_id,
    payload.parent?.auth_user_id,
    payload.parent?.user_id,
    payload.ownership?.auth_user_id,
    payload.ownership?.user_id
  ) || null;
}

function normalizePersistentYouthProfile(row, accountCtx = {}) {
  const payload = profilePayload(row);
  const childId = normalizeChildScopeId(firstPresent(
    row?.child_id,
    payload.child_id,
    payload.child?.child_id,
    payload.child_profile?.child_id,
    payload.ownership?.child_profile?.child_id
  ));
  if (!childId) return null;
  const tenant = tenantFromPayload(payload) || lowerText(accountCtx.tenant);
  const email = emailFromPayload(payload) || lowerText(accountCtx.email);
  const childDisplayName = childNameFromPayload(payload, row) || "Child profile needed";
  return {
    child_id: childId,
    child_name: childDisplayName,
    child_display_name: childDisplayName,
    child_age_band: firstPresent(payload.child_age_band, payload.child?.age_band, payload.child_profile?.child_age_band, payload.ownership?.child_profile?.child_age_band) || null,
    child_grade_band: firstPresent(payload.child_grade_band, payload.grade_band, payload.child?.grade_band, payload.child_profile?.child_grade_band, payload.ownership?.child_profile?.child_grade_band) || null,
    tenant,
    email,
    parent_profile_id: parentProfileIdFromPayload(payload),
    auth_user_id: authUserIdFromPayload(payload),
    source: "persistent_profile",
    source_registry: "youth_development",
    ownership_verified: true,
    profile_status: childDisplayName ? "ready" : "identity_incomplete",
    profile_version: safeText(row?.profile_version) || null,
    profile_updated_at: row?.updated_at || row?.created_at || null,
  };
}

function normalizeLegacyYouthProfile(row, { tenantSlug = "", email = "", deriveChildScopeId, normalizeChildDisplayName: nameNormalizer = normalizeChildDisplayName, normalizeChildScopeId: idNormalizer = normalizeChildScopeId } = {}) {
  const raw = row?.raw_answers && typeof row.raw_answers === "object" ? row.raw_answers : {};
  const persisted = raw.ownership?.child_profile || {};
  const fallbackName = nameNormalizer(firstPresent(persisted.child_display_name, persisted.child_name, row?.customer_name, "Child profile needed"));
  const derivedId = idNormalizer(firstPresent(persisted.child_id, row?.child_id))
    || (typeof deriveChildScopeId === "function" ? deriveChildScopeId({ tenantSlug, email, childName: fallbackName || `child-${row?.id || "legacy"}` }) : "");
  if (!derivedId) return null;
  return {
    child_id: derivedId,
    child_name: fallbackName || "Child profile needed",
    child_display_name: fallbackName || "Child profile needed",
    child_age_band: persisted.child_age_band || null,
    child_grade_band: persisted.child_grade_band || null,
    tenant: lowerText(tenantSlug),
    email: lowerText(email),
    profile_status: fallbackName ? "ready" : "identity_incomplete",
    latest_assessment_at: row?.created_at || null,
    source: persisted.child_id ? "legacy_explicit_assessment_profile" : "legacy_assessment_fallback",
    source_registry: "youth_development",
    parent_profile_id: persisted.parent_profile_id || raw.ownership?.parent_profile_id || null,
    auth_user_id: raw.ownership?.user_id || raw.ownership?.auth_user_id || null,
    ownership_verified: true,
  };
}

async function queryPersistentYouthProfiles({ pool, accountCtx }) {
  const tenant = lowerText(accountCtx?.tenant);
  const email = lowerText(accountCtx?.email);
  if (!pool || !tenant || !email) return [];
  const result = await pool.query(
    `SELECT DISTINCT ON (child_id)
        id, child_id, profile_version, payload, created_at, updated_at
       FROM tde_child_profiles
       WHERE child_id IS NOT NULL
         AND COALESCE(profile_version, '') <> ''
         AND payload IS NOT NULL
         AND LOWER(COALESCE(
           payload->>'tenant',
           payload->>'tenant_slug',
           payload#>>'{dashboard_scope,tenant}',
           payload#>>'{dashboard_scope,tenant_slug}',
           payload#>>'{account,tenant}',
           payload#>>'{account,tenant_slug}',
           payload#>>'{ownership,tenant}',
           payload#>>'{ownership,tenant_slug}',
           ''
         )) = $1
         AND LOWER(COALESCE(
           payload->>'email',
           payload->>'parent_email',
           payload->>'account_email',
           payload#>>'{dashboard_scope,email}',
           payload#>>'{account,email}',
           payload#>>'{parent,email}',
           payload#>>'{ownership,email}',
           ''
         )) = $2
       ORDER BY child_id, updated_at DESC, created_at DESC, id DESC`,
    [tenant, email]
  );
  return result.rows.map((row) => normalizePersistentYouthProfile(row, accountCtx)).filter(Boolean);
}

async function queryLegacyYouthProfiles({ pool, accountCtx, getTenantBySlug, normalizeEmail, deriveChildScopeId }) {
  const tenantSlug = lowerText(accountCtx?.tenant);
  const email = lowerText(typeof normalizeEmail === "function" ? normalizeEmail(accountCtx?.email || "") : accountCtx?.email);
  if (!pool || !tenantSlug || !email || typeof getTenantBySlug !== "function") return [];
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) return [];
  const rows = await pool.query(
    `SELECT a.id, a.created_at, a.customer_name, a.raw_answers, a.child_id
     FROM assessment_submissions a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.tenant_id = $1
       AND a.assessment_type = 'youth'
       AND LOWER(COALESCE(a.customer_email, u.email, '')) = $2
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT 100`,
    [tenant.id, email]
  );
  const seen = new Map();
  for (const row of rows.rows) {
    const profile = normalizeLegacyYouthProfile(row, { tenantSlug, email, deriveChildScopeId });
    if (profile && !seen.has(profile.child_id)) seen.set(profile.child_id, profile);
  }
  return [...seen.values()];
}

async function listYouthChildProfilesForAccount({ pool, accountCtx, getTenantBySlug, normalizeEmail, deriveChildScopeId, logger = console }) {
  const persistent = await queryPersistentYouthProfiles({ pool, accountCtx });
  const byId = new Map(persistent.map((profile) => [String(profile.child_id), profile]));
  const legacy = await queryLegacyYouthProfiles({ pool, accountCtx, getTenantBySlug, normalizeEmail, deriveChildScopeId });
  for (const profile of legacy) {
    const existing = byId.get(String(profile.child_id));
    if (existing) {
      const persistentName = lowerText(existing.child_display_name || existing.child_name);
      const legacyName = lowerText(profile.child_display_name || profile.child_name);
      if (persistentName && legacyName && persistentName !== legacyName) {
        logger.warn?.(JSON.stringify({
          ts: new Date().toISOString(),
          event: "youth_development_child_profile_name_mismatch",
          child_id: profile.child_id,
          persistent_name_present: true,
          legacy_name_present: true,
          resolution: "preferred_persistent_tde_child_profiles",
        }));
      }
      continue;
    }
    byId.set(String(profile.child_id), profile);
  }
  return [...byId.values()];
}

module.exports = {
  normalizeChildScopeId,
  normalizeChildDisplayName,
  normalizePersistentYouthProfile,
  normalizeLegacyYouthProfile,
  queryPersistentYouthProfiles,
  queryLegacyYouthProfiles,
  listYouthChildProfilesForAccount,
};
