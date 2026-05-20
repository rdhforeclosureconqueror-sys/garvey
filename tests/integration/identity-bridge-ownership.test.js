const test = require('node:test');
const assert = require('node:assert/strict');
const { loadIntegratedChildProfile } = require('../../integration/identityGatesBridgeService');

function fakePool(state) {
  return {
    async query(q, params) {
      if (q.includes('FROM gates_child_profiles WHERE id = $1')) {
        const c = state.children.find((x) => String(x.id) === String(params[0]));
        return { rows: c ? [c] : [] };
      }
      if (q.includes('FROM gates_assessments WHERE parent_id = $1 AND child_id = $2')) {
        const rows = state.gates.filter((x) => String(x.parent_id) === String(params[0]) && String(x.child_id) === String(params[1])).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: rows.slice(0, 1) };
      }
      if (q.includes('FROM tde_child_profiles WHERE child_id = $1')) {
        const rows = state.tde.filter((x) => String(x.child_id) === String(params[0])).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: rows.slice(0, 1) };
      }
      if (q.includes('FROM engine_results r') && q.includes('JOIN engine_assessments a')) {
        const [parentId, childId, tenantSlug] = params;
        const rows = state.identity.filter((row) => {
          const payload = row.result_payload || {};
          const parentOk = String(row.user_id) === String(parentId) || String(payload.parent_id || payload.parent_user_id) === String(parentId);
          const childOk = String(payload.child_id || payload.gates_child_id) === String(childId);
          const tenantOk = tenantSlug == null || String(row.tenant_slug || row.assessment_tenant_slug || '') === String(tenantSlug);
          return row.engine_type === 'youth_identity' && parentOk && childOk && tenantOk;
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return { rows: rows.slice(0, 1) };
      }
      throw new Error(`Unmocked query: ${q}`);
    }
  };
}

test('child and parent ownership enforced with no global identity leakage', async () => {
  const pool = fakePool({
    children: [{ id: 11, parent_id: 100, first_name: 'Ari' }],
    gates: [{ id: 'ga1', parent_id: 100, child_id: '11', payload: { gates_profile: { growth_gate: { name: 'Attention' } } }, created_at: '2026-01-01T00:00:00Z' }],
    tde: [],
    identity: [
      { result_id: 'bad-global', assessment_id: 'a1', user_id: '333', tenant_slug: 'x', assessment_tenant_slug: 'x', engine_type: 'youth_identity', result_payload: { child_id: '98', parent_id: '333', primary_tendency: 'Explorer' }, created_at: '2026-02-01T00:00:00Z' },
      { result_id: 'good-owned', assessment_id: 'a2', user_id: '100', tenant_slug: 'pilot', assessment_tenant_slug: 'pilot', engine_type: 'youth_identity', result_payload: { child_id: '11', parent_id: '100', primary_tendency: 'Creator' }, created_at: '2026-01-15T00:00:00Z' }
    ]
  });
  const res = await loadIntegratedChildProfile({ pool, parentId: 100, childId: 11, tenantSlug: 'pilot' });
  assert.equal(res.ok, true);
  assert.equal(res.integrated_profile.identity_profile.primary_tendency, 'Creator');
  assert.equal(res.integrated_profile.source_provenance.identity.source_id, 'good-owned');
  assert.equal(res.integrated_profile.source_provenance.identity.ownership_verified, true);
});

test('cross-parent request rejected', async () => {
  const pool = fakePool({ children: [{ id: 11, parent_id: 100, first_name: 'Ari' }], gates: [], tde: [], identity: [] });
  const res = await loadIntegratedChildProfile({ pool, parentId: 777, childId: 11 });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'child_not_found');
});

test('safe fallback excludes unverified sources and remains deterministic', async () => {
  const state = {
    children: [{ id: 44, parent_id: 9, first_name: 'Leo' }],
    gates: [{ id: 'ga-x', parent_id: 9, child_id: '44', payload: { gates_profile: { growth_gate: { name: 'Emotion' } } }, created_at: '2026-03-01T00:00:00Z' }],
    tde: [{ id: 5, child_id: '44', payload: { child_id: '44', parent_id: 'WRONG', trait_targets: ['SR'] }, created_at: '2026-03-02T00:00:00Z' }],
    identity: []
  };
  const pool = fakePool(state);
  const a = await loadIntegratedChildProfile({ pool, parentId: 9, childId: 44, tenantSlug: null });
  const b = await loadIntegratedChildProfile({ pool, parentId: 9, childId: 44, tenantSlug: null });
  assert.equal(a.ok, true);
  assert.equal(a.integrated_profile.source_presence.gates, true);
  assert.equal(a.integrated_profile.source_presence.identity, false);
  assert.equal(a.integrated_profile.source_presence.tde, false);
  assert.equal(a.integrated_profile.source_availability.tde, 'rejected_ownership');
  assert.equal(a.integrated_profile.source_provenance.tde.ownership_verified, false);
  assert.deepEqual(a.integrated_profile, b.integrated_profile);
});
