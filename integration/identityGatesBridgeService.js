"use strict";
const { buildIntegratedChildProfile } = require("./integratedChildProfileBuilder");
async function loadIntegratedChildProfile({ pool, parentId, childId }) {
  const childRes = await pool.query("SELECT id, parent_id, first_name FROM gates_child_profiles WHERE id = $1 LIMIT 1", [childId]);
  const childRow = childRes.rows[0] || null;
  if (!childRow || Number(childRow.parent_id) !== Number(parentId)) return { ok: false, error: "child_not_found" };
  const latestGatesRes = await pool.query("SELECT payload FROM gates_assessments WHERE parent_id = $1 AND child_id = $2 ORDER BY created_at DESC LIMIT 1", [parentId, childId]);
  const latestGates = latestGatesRes.rows[0]?.payload || null;
  const tdeRes = await pool.query("SELECT payload FROM tde_child_profiles WHERE child_id = $1 LIMIT 1", [String(childId)]).catch(() => ({ rows: [] }));
  const tdePayload = tdeRes.rows[0]?.payload || null;
  const identityRes = await pool.query("SELECT result_payload FROM engine_results ORDER BY created_at DESC LIMIT 1").catch(() => ({ rows: [] }));
  const identityPayload = identityRes.rows[0]?.result_payload || null;
  return { ok: true, integrated_profile: buildIntegratedChildProfile({ childId: String(childId), childProfile: { child_id: String(childRow.id), child_name: childRow.first_name || null }, gatesData: latestGates, identityData: identityPayload, tdeData: tdePayload }) };
}
module.exports = { loadIntegratedChildProfile };
