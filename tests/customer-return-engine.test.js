const test = require('node:test');
const assert = require('node:assert/strict');

const { createEngine } = require('../public/engine/customer-return-engine.js');

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

test('engine init/startEarnFlow persists ctx and routes with context', () => {
  const storage = createMemoryStorage();
  let assigned = '';
  const engine = createEngine({
    storage,
    location: { assign: (url) => { assigned = url; } },
  });

  const state = engine.init({ tenant: 'demo', email: 'User@x.com', cid: 'c-1', rid: 'r-1' });
  assert.equal(state.ctx.tenant, 'demo');
  assert.equal(state.ctx.email, 'user@x.com');

  const url = engine.startEarnFlow();
  assert.match(url, /\/rewards\.html\?/);
  assert.match(url, /tenant=demo/);
  assert.match(url, /email=user%40x.com/);
  assert.equal(assigned, url);
});

test('awardReward drives status refresh and ledger update', async () => {
  const storage = createMemoryStorage();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (String(url).startsWith('/api/rewards/checkin')) {
      return {
        ok: true,
        json: async () => ({ success: true, event: 'checkin', points_added: 5, points: 10, tenant: 'demo', cid: 'camp-1', crid: 'crid-9' }),
      };
    }
    if (String(url).startsWith('/api/rewards/status')) {
      return {
        ok: true,
        json: async () => ({ success: true, tenant: 'demo', points: 10, user: { email: 'user@example.com' } }),
      };
    }
    throw new Error(`unexpected URL ${url}`);
  };

  const engine = createEngine({ storage, fetchImpl });
  engine.init({ tenant: 'demo', email: 'user@example.com' });

  const payload = await engine.awardReward({ type: 'checkin' });
  assert.equal(payload.event, 'checkin');

  const state = engine.getState();
  assert.equal(state.ctx.cid, 'camp-1');
  assert.equal(state.ctx.rid, 'crid-9');
  assert.equal(state.ledgerSize, 1);
  assert.equal(calls.length, 2);
});

test('review reward forwards optional rating and product_id', async () => {
  const storage = createMemoryStorage();
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (String(url).startsWith('/api/rewards/review')) {
      return {
        ok: true,
        json: async () => ({ success: true, review: { id: 11, rating: 6, product_id: 3 }, points_added: 25, points: 25, tenant: 'demo' }),
      };
    }
    if (String(url).startsWith('/api/rewards/status')) {
      return {
        ok: true,
        json: async () => ({ success: true, tenant: 'demo', points: 25, user: { email: 'user@example.com' } }),
      };
    }
    throw new Error(`unexpected URL ${url}`);
  };
  const engine = createEngine({ storage, fetchImpl });
  engine.init({ tenant: 'demo', email: 'user@example.com' });
  await engine.awardReward({ type: 'review', text: 'Great service', rating: 6, product_id: 3 });
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.rating, 6);
  assert.equal(body.product_id, 3);
});
