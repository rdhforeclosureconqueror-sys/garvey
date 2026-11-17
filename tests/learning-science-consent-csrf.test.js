'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { issueConsentCsrf, verifyConsentCsrf, MAX_AGE_MS } = require('../learning-science/consentCsrf');

const secret = 'synthetic-server-only-secret-value-1234567890';
const request = token => ({ headers: { cookie: 'gates_parent_session=' + encodeURIComponent(token) } });
test('issued CSRF token verifies only for the same parent session cookie', () => {
  const req = request('unpredictable-session-cookie-A');
  const issued = issueConsentCsrf(req, { secret, now: 1000000 });
  assert.equal(issued.split('.').length, 3);
  assert.equal(verifyConsentCsrf({ headers: { ...req.headers, 'x-garvey-consent-csrf': issued } }, { secret, now: 1000001 }), true);
  const other = request('unpredictable-session-cookie-B');
  assert.equal(verifyConsentCsrf({ headers: { ...other.headers, 'x-garvey-consent-csrf': issued } }, { secret, now: 1000001 }), false);
});
test('missing cookie/header, altered signature and weak secret are rejected', () => {
  const req = request('test-session-1');
  const issued = issueConsentCsrf(req, { secret, now: 1000000 });
  assert.equal(verifyConsentCsrf(req, { secret, now: 1000001 }), false);
  assert.equal(verifyConsentCsrf({ headers: { 'x-garvey-consent-csrf': issued } }, { secret, now: 1000001 }), false);
  assert.equal(verifyConsentCsrf({ headers: { ...req.headers, 'x-garvey-consent-csrf': issued.slice(0,-1) + (issued.endsWith('A') ? 'B' : 'A') } }, { secret, now: 1000001 }), false);
  assert.throws(() => issueConsentCsrf(req, { secret: 'weak' }), /32 bytes/);
});
test('expiry and future timestamps fail closed', () => {
  const req = request('test-session-2');
  const token = issueConsentCsrf(req, { secret, now: 1000000 });
  const withHeader = { headers: { ...req.headers, 'x-garvey-consent-csrf': token } };
  assert.equal(verifyConsentCsrf(withHeader, { secret, now: 1000000 + MAX_AGE_MS }), true);
  assert.equal(verifyConsentCsrf(withHeader, { secret, now: 1000000 + MAX_AGE_MS + 1 }), false);
  assert.equal(verifyConsentCsrf(withHeader, { secret, now: 1000000 - 31000 }), false);
});
