const test = require('node:test');
const assert = require('node:assert/strict');

const {
  GATES_SESSION_COOKIE,
  GATES_TENANT_SLUG,
  formatChildProfileRow,
  resolveGatesParentSession,
  resolveOwnedGatesChild,
  sha256,
} = require('../../server/gatesAuth');

function createReq(token) {
  return { headers: { cookie: token ? `${GATES_SESSION_COOKIE}=${encodeURIComponent(token)}` : '' } };
}

test('shared Gates parent session resolver returns auth user id and parent profile without token material', async () => {
  const token = 'session-token';
  const deleted = [];
  const pool = {
    async query(sql, params = []) {
      const q = String(sql);
      if (q.includes('FROM auth_sessions s')) {
        assert.equal(params[0], sha256(token));
        assert.equal(params[1], GATES_TENANT_SLUG);
        assert.equal(params[2], 'parent');
        return { rows: [{ user_id: 42, email: 'Parent@Example.COM', parent_profile_id: 7, display_name: 'Parent One', expires_at: new Date(Date.now() + 60000).toISOString() }] };
      }
      if (q.includes('DELETE FROM auth_sessions')) {
        deleted.push(params[0]);
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  const resolved = await resolveGatesParentSession(createReq(token), { pool });
  assert.equal(resolved.authenticated, true);
  assert.equal(resolved.authUserId, 42);
  assert.deepEqual(resolved.parentProfile, { id: 7, display_name: 'Parent One', email: 'parent@example.com' });
  assert.equal(Object.prototype.hasOwnProperty.call(resolved, 'token'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(resolved, 'token_hash'), false);
  assert.equal(deleted.length, 0);
});

test('shared Gates parent session resolver rejects expired sessions and preserves cleanup signal', async () => {
  const token = 'expired-token';
  const deleted = [];
  const pool = {
    async query(sql, params = []) {
      const q = String(sql);
      if (q.includes('FROM auth_sessions s')) {
        return { rows: [{ user_id: 43, email: 'expired@example.com', parent_profile_id: 8, display_name: 'Expired', expires_at: new Date(Date.now() - 1000).toISOString() }] };
      }
      if (q.includes('DELETE FROM auth_sessions')) {
        deleted.push(params[0]);
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  const resolved = await resolveGatesParentSession(createReq(token), { pool });
  assert.equal(resolved.authenticated, false);
  assert.equal(resolved.clearCookie, true);
  assert.equal(resolved.reason, 'expired');
  assert.deepEqual(deleted, [sha256(token)]);
});

test('shared Gates child ownership helper parses profiles and distinguishes missing from cross-parent children', async () => {
  const state = {
    10: { id: 10, parent_id: 7, first_name: JSON.stringify({ child_name: 'Luna', child_age_band: '7-9', child_grade_band: 'Grade 3', metadata: { grade: 3 } }) },
    11: { id: 11, parent_id: 8, first_name: 'Other Child' },
  };
  const pool = {
    async query(sql, params = []) {
      assert.match(String(sql), /gates_child_profiles/);
      const row = state[Number(params[0])];
      return { rows: row ? [row] : [] };
    },
  };

  const owned = await resolveOwnedGatesChild({ pool, parentProfileId: 7, childId: '10' });
  assert.equal(owned.ok, true);
  assert.equal(owned.learnerId, '10');
  assert.deepEqual(owned.childProfile, formatChildProfileRow(state[10]));
  assert.match(owned.lifecycleNote, /no canonical lifecycle fields/);

  const malformed = await resolveOwnedGatesChild({ pool, parentProfileId: 7, childId: 'abc' });
  assert.deepEqual(malformed, { ok: false, status: 400, error: 'malformed_child_id' });

  const missing = await resolveOwnedGatesChild({ pool, parentProfileId: 7, childId: '999' });
  assert.deepEqual(missing, { ok: false, status: 404, error: 'child_not_found' });

  const forbidden = await resolveOwnedGatesChild({ pool, parentProfileId: 7, childId: '11' });
  assert.deepEqual(forbidden, { ok: false, status: 403, error: 'forbidden' });
});
