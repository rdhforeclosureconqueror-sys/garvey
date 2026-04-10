const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeTagCode,
  evaluateTagStatus,
  resolvePublicTap,
} = require('../server/tapCrmRoutes');

function createMockDb({ row } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      const normalized = String(sql).trim().replace(/\s+/g, ' ');
      calls.push({ sql: normalized, params });

      if (normalized.startsWith('SELECT') && normalized.includes('FROM tap_crm_tags')) {
        return { rows: row ? [row] : [] };
      }

      return { rows: [] };
    },
  };
}

test('normalizeTagCode lowercases and trims values', () => {
  assert.equal(normalizeTagCode('  AbC-123 '), 'abc-123');
});

test('evaluateTagStatus rejects disabled and inactive tag states', () => {
  assert.equal(evaluateTagStatus({ tagStatus: 'disabled', businessStatus: 'active' }).ok, false);
  assert.equal(evaluateTagStatus({ tagStatus: 'inactive', businessStatus: 'active' }).ok, false);
  assert.equal(evaluateTagStatus({ tagStatus: 'active', businessStatus: 'disabled' }).ok, false);
});

test('resolvePublicTap returns not found for unknown tag and logs event', async () => {
  const db = createMockDb();
  const result = await resolvePublicTap(db, { tagCode: 'missing-tag', requestMeta: { source: 'test' } });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.equal(result.body.error, 'tag_not_found');
  assert.ok(db.calls.some((call) => call.sql.includes('INSERT INTO tap_crm_tap_events')));
});

test('resolvePublicTap accepts active tag and updates last_tap_at', async () => {
  const db = createMockDb({
    row: {
      tag_id: 9,
      tenant_id: 77,
      tag_code: 'vip-001',
      label: 'VIP Entry',
      tag_status: 'active',
      destination_path: '/tap-crm/hub/vip',
      tenant_slug: 'demo-shop',
      hub_status: 'active',
      business_config: { template: 'barber' },
    },
  });

  const result = await resolvePublicTap(db, { tagCode: 'vip-001', requestMeta: { source: 'test' } });

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.body.route_namespace, 'tap-crm');
  assert.equal(result.body.resolution.tenant, 'demo-shop');
  assert.ok(db.calls.some((call) => call.sql.includes('UPDATE tap_crm_tags')));
  assert.ok(db.calls.some((call) => call.sql.includes('INSERT INTO tap_crm_tap_events')));
});

test('resolvePublicTap blocks disabled tags with structured response', async () => {
  const db = createMockDb({
    row: {
      tag_id: 10,
      tenant_id: 77,
      tag_code: 'vip-002',
      label: 'VIP Entry',
      tag_status: 'disabled',
      destination_path: '/tap-crm/hub/vip',
      tenant_slug: 'demo-shop',
      hub_status: 'active',
      business_config: {},
    },
  });

  const result = await resolvePublicTap(db, { tagCode: 'vip-002', requestMeta: { source: 'test' } });

  assert.equal(result.ok, false);
  assert.equal(result.status, 410);
  assert.equal(result.body.error, 'tag_disabled');
});
