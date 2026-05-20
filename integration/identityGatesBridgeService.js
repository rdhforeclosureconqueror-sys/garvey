"use strict";
const { buildIntegratedChildProfile } = require("./integratedChildProfileBuilder");

function emitBridgeTrace(event, data) {
  console.info(`[${event}]`, JSON.stringify(data));
}

function asIso(value) {
  return value ? new Date(value).toISOString() : null;
}

function baseProvenance(sourceType, row) {
  return {
    source: sourceType,
    source_id: row?.source_id || null,
    created_at: asIso(row?.created_at) || null,
    ownership_verified: false,
  };
}

async function loadIntegratedChildProfile({ pool, parentId, childId, tenantSlug = null }) {
  const childRes = await pool.query("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1", [childId]);
  const childRow = childRes.rows[0] || null;
  if (!childRow || Number(childRow.parent_id) !== Number(parentId)) {
    emitBridgeTrace("identity_bridge_ownership_violation", { child_id: String(childId), parent_user_id: String(parentId), source_type: "child_profile", ownership_result: "rejected", composition_result: "halted" });
    return { ok: false, error: "child_not_found" };
  }

  const provenance = {};
  const sourceAvailability = { gates: "unavailable", identity: "unavailable", tde: "unavailable", development_patterns: "derived" };

  const latestGatesRes = await pool.query(
    "SELECT id, payload, created_at FROM gates_assessments WHERE parent_id = $1 AND child_id = $2 ORDER BY created_at DESC, id DESC LIMIT 1",
    [parentId, childId],
  );
  const gatesRow = latestGatesRes.rows[0] || null;
  const latestGates = gatesRow?.payload || null;
  provenance.gates = { ...baseProvenance("gates_assessment", { source_id: gatesRow?.id, created_at: gatesRow?.created_at }), ownership_verified: !!gatesRow };
  if (gatesRow) {
    sourceAvailability.gates = "verified";
    emitBridgeTrace("identity_bridge_source_verified", { child_id: String(childId), parent_user_id: String(parentId), source_type: "gates", ownership_result: "verified", composition_result: "composed" });
  }

  const tdeRes = await pool.query("SELECT id, payload, created_at FROM tde_child_profiles WHERE child_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1", [String(childId)]).catch(() => ({ rows: [] }));
  const tdeRow = tdeRes.rows[0] || null;
  const tdePayload = tdeRow?.payload || null;
  const tdeOwnershipVerified = !!(tdeRow && String(tdePayload?.child_id || childId) === String(childId) && String(tdePayload?.parent_id || tdePayload?.parent_user_id || parentId) === String(parentId));
  provenance.tde = { ...baseProvenance("tde_child_profile", { source_id: tdeRow?.id, created_at: tdeRow?.created_at }), ownership_verified: tdeOwnershipVerified };
  const safeTdePayload = tdeOwnershipVerified ? tdePayload : null;
  if (tdeRow && !tdeOwnershipVerified) {
    sourceAvailability.tde = "rejected_ownership";
    emitBridgeTrace("identity_bridge_source_rejected", { child_id: String(childId), parent_user_id: String(parentId), source_type: "tde", ownership_result: "rejected", composition_result: "excluded" });
  } else if (tdeOwnershipVerified) {
    sourceAvailability.tde = "verified";
    emitBridgeTrace("identity_bridge_source_verified", { child_id: String(childId), parent_user_id: String(parentId), source_type: "tde", ownership_result: "verified", composition_result: "composed" });
  }

  const identityRes = await pool.query(
    `SELECT r.result_id, r.result_payload, r.created_at
       FROM engine_results r
       JOIN engine_assessments a ON a.id = r.assessment_id
      WHERE r.engine_type = 'youth_identity'
        AND (a.user_id = $1 OR r.result_payload->>'parent_id' = $1 OR r.result_payload->>'parent_user_id' = $1)
        AND (r.result_payload->>'child_id' = $2 OR r.result_payload->>'gates_child_id' = $2)
        AND ($3::text IS NULL OR COALESCE(r.tenant_slug, a.tenant_slug) = $3)
      ORDER BY r.created_at DESC, r.result_id DESC
      LIMIT 1`,
    [String(parentId), String(childId), tenantSlug],
  ).catch(() => ({ rows: [] }));
  const identityRow = identityRes.rows[0] || null;
  const identityPayload = identityRow?.result_payload || null;
  const identityOwnershipVerified = !!identityRow;
  provenance.identity = { ...baseProvenance("identity_engine", { source_id: identityRow?.result_id, created_at: identityRow?.created_at }), ownership_verified: identityOwnershipVerified };
  if (identityOwnershipVerified) {
    sourceAvailability.identity = "verified";
    emitBridgeTrace("identity_bridge_source_verified", { child_id: String(childId), parent_user_id: String(parentId), source_type: "identity", ownership_result: "verified", composition_result: "composed" });
  } else {
    emitBridgeTrace("identity_bridge_partial_safe_fallback", { child_id: String(childId), parent_user_id: String(parentId), source_type: "identity", ownership_result: "unavailable_or_unverified", composition_result: "excluded" });
  }

  const integratedProfile = buildIntegratedChildProfile({
    childId: String(childId),
    childProfile: { child_id: String(childRow.id), child_name: childRow.first_name || null },
    gatesData: latestGates,
    identityData: identityOwnershipVerified ? identityPayload : null,
    tdeData: safeTdePayload,
    sourceProvenance: provenance,
    sourceAvailability,
  });

  emitBridgeTrace("identity_bridge_provenance_attached", { child_id: String(childId), parent_user_id: String(parentId), source_type: "all", ownership_result: "attached", composition_result: "composed" });
  return { ok: true, integrated_profile: integratedProfile };
}

module.exports = { loadIntegratedChildProfile };
