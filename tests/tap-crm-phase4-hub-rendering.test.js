const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTapHubViewModel,
  renderTapHubPage,
  renderTapHubErrorPage,
} = require('../server/tapHubRenderer');

test('buildTapHubViewModel uses safe fallback defaults when config is incomplete', () => {
  const model = buildTapHubViewModel({
    route_namespace: 'tap-crm',
    resolution: {
      tenant: 'demo-tenant',
      tag_code: 'vip-001',
      label: 'VIP Welcome',
      destination_path: '/tap-crm/hub/welcome',
    },
    business_config: {},
  });

  assert.equal(model.routeNamespace, 'tap-crm');
  assert.equal(model.primaryActions.length, 1);
  assert.equal(model.primaryActions[0].url, '/tap-crm/hub/welcome?tenant=demo-tenant&tap_tag=vip-001&tap_source=tap-hub');
  assert.equal(model.secondaryActions.length, 0);
  assert.equal(model.businessName, 'demo-tenant');
});

test('renderTapHubPage includes all customer-facing zones', () => {
  const model = buildTapHubViewModel({
    route_namespace: 'tap-crm',
    resolution: {
      tenant: 'demo-tenant',
      tag_code: 'vip-001',
      label: 'VIP Welcome',
      destination_path: '/tap-crm/hub/welcome',
    },
    business_config: {
      brand: { name: 'Demo Spa', headline: 'Welcome to Demo Spa' },
      actions: {
        primary: [{ label: 'Book now', url: '/book' }],
        secondary: [{ label: 'Call us', url: 'tel:+15555550123' }],
      },
      social: {
        instagram: 'https://instagram.com/demo',
      },
      business: {
        name: 'Demo Spa Downtown',
        phone: '+1 555 555 0123',
      },
    },
  });

  const html = renderTapHubPage(model);

  assert.match(html, /Primary actions/);
  assert.match(html, /Secondary actions/);
  assert.match(html, /Social & brand/);
  assert.match(html, /Business info/);
  assert.match(html, /route namespace: tap-crm/);
});

test('renderTapHubErrorPage supports invalid and inactive states', () => {
  const invalidHtml = renderTapHubErrorPage({
    statusCode: 404,
    title: 'Invalid tag',
    message: 'This tag link is not recognized.',
  });
  const disabledHtml = renderTapHubErrorPage({
    statusCode: 410,
    title: 'Tag unavailable',
    message: 'This tag is currently inactive or disabled.',
  });

  assert.match(invalidHtml, /Invalid tag/);
  assert.match(disabledHtml, /Tag unavailable/);
});

test('buildTapHubViewModel preserves Tap attribution on Return Engine and action links', () => {
  const model = buildTapHubViewModel({
    route_namespace: 'tap-crm',
    resolution: {
      tenant: 'demo-tenant',
      tag_code: 'vip-001',
      label: 'VIP Welcome',
      destination_path: '/rewards.html',
      attribution: {
        source: 'tap',
        tap_session_id: 'tap-session-abc',
      },
    },
    business_config: {},
  });

  assert.match(model.returnEngineUrl, /tenant=demo-tenant/);
  assert.match(model.returnEngineUrl, /tap_source=tap/);
  assert.match(model.returnEngineUrl, /tap_session=tap-session-abc/);
  assert.equal(model.returnEngineUrl.includes("cid="), false);
  assert.equal(model.returnEngineUrl.includes("crid="), false);
  assert.equal(model.returnEngineUrl.includes("rid="), false);
  assert.match(model.primaryActions[0].url, /tap_tag=vip-001/);
  assert.match(model.primaryActions[0].url, /tap_session=tap-session-abc/);
});
