const test = require('node:test');
const assert = require('node:assert/strict');

const { ACTIONS, ROLES, evaluatePolicy } = require('../server/accessControl');
const { checkTapAccess } = require('../server/tapCrmRoutes');

test('tap crm actions are defined', () => {
  assert.equal(ACTIONS.TAP_VIEW, 'tap:view');
  assert.equal(ACTIONS.TAP_MANAGE, 'tap:manage');
  assert.equal(ACTIONS.TAP_TAGS_MANAGE, 'tap:tags:manage');
  assert.equal(ACTIONS.TAP_TEMPLATES_MANAGE, 'tap:templates:manage');
  assert.equal(ACTIONS.TAP_ANALYTICS_VIEW, 'tap:analytics:view');
});

test('business owner can manage tap crm in-tenant', () => {
  const decision = evaluatePolicy({
    actor: { role: ROLES.BUSINESS_OWNER, isAdmin: false, tenantSlug: 'demo' },
    action: ACTIONS.TAP_MANAGE,
    resourceTenantSlug: 'demo',
  });
  assert.equal(decision.allow, true);
});

test('customer cannot access tap crm manage action', () => {
  const decision = evaluatePolicy({
    actor: { role: ROLES.CUSTOMER, isAdmin: false, tenantSlug: 'demo' },
    action: ACTIONS.TAP_MANAGE,
    resourceTenantSlug: 'demo',
  });
  assert.equal(decision.allow, false);
  assert.match(decision.reason, /not allowed/);
});

test('checkTapAccess denies when tenant is missing', () => {
  const access = checkTapAccess(
    {
      query: {},
      headers: {},
      body: {},
      params: {},
      authActor: { role: ROLES.BUSINESS_OWNER, tenantSlug: 'demo' },
    },
    ACTIONS.TAP_VIEW
  );

  assert.equal(access.ok, false);
  assert.equal(access.status, 400);
  assert.equal(access.body.error, 'tenant is required');
});

test('checkTapAccess denies cross-tenant access', () => {
  const access = checkTapAccess(
    {
      query: { tenant: 'demo-b' },
      headers: {},
      body: {},
      params: {},
      authActor: { role: ROLES.BUSINESS_OWNER, tenantSlug: 'demo-a', email: 'owner@example.com' },
    },
    ACTIONS.TAP_VIEW
  );

  assert.equal(access.ok, false);
  assert.equal(access.status, 403);
  assert.equal(access.body.error, 'forbidden');
});

test('checkTapAccess allows business owner in tenant', () => {
  const access = checkTapAccess(
    {
      query: { tenant: 'demo' },
      headers: {},
      body: {},
      params: {},
      authActor: { role: ROLES.BUSINESS_OWNER, tenantSlug: 'demo', email: 'owner@example.com' },
    },
    ACTIONS.TAP_VIEW
  );

  assert.equal(access.ok, true);
  assert.equal(access.tenant, 'demo');
  assert.equal(access.actor.role, ROLES.BUSINESS_OWNER);
});
