'use strict';

// Unmounted server-only CSRF helper for the Gates parent cookie.
// HMAC binds the action token to the active session secret, purpose and lifespan.
// This helper does NOT issue HTTP responses or activate any feature.
const crypto = require('node:crypto');
const GATES_SESSION_COOKIE = 'gates_parent_session';

const PURPOSE = 'garvey-child-learning-consent-mutation-v1';
const MAX_AGE_MS = 10 * 60 * 1000;
const FUTURE_SKEW_MS = 30 * 1000;

function checkedKey(secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new TypeError('server-only CSRF signing key must be at least 32 bytes');
  }
  return secret;
}

function sessionToken(req) {
  const header = req?.headers?.cookie;
  if (typeof header !== 'string' || header.length > 8192) return null;
  const matches = header.split(';').map(part => part.trim())
    .filter(part => part.startsWith(GATES_SESSION_COOKIE + '='));
  if (matches.length !== 1) return null;
  let raw;
  try { raw = decodeURIComponent(matches[0].slice(GATES_SESSION_COOKIE.length + 1)); }
  catch { return null; }
  if (!raw || raw.length > 4096) return null;
  return raw;
}

function digest(secret, rawSession, time, nonce) {
  return crypto.createHmac('sha256', checkedKey(secret))
    .update(JSON.stringify([PURPOSE, crypto.createHash('sha256').update(rawSession).digest('hex'), time, nonce]))
    .digest('base64url');
}

// Call only after authenticating parent and only from same-origin, non-cached endpoint.
function issueConsentCsrf(req, { secret, now = Date.now() } = {}) {
  checkedKey(secret);
  const rawSession = sessionToken(req);
  if (!rawSession) throw new TypeError('active Gates session cookie required');
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError('invalid CSRF issuance time');
  const nonce = crypto.randomBytes(16).toString('base64url');
  const stamp = now.toString(36);
  return [stamp, nonce, digest(secret, rawSession, stamp, nonce)].join('.');
}

// Verify only after fresh parent authentication. The cookie is HttpOnly, but
// the CSRF token must travel in a same-origin custom request header.
function verifyConsentCsrf(req, { secret, now = Date.now() } = {}) {
  checkedKey(secret);
  const rawSession = sessionToken(req);
  const token = req?.headers?.['x-garvey-consent-csrf'];
  if (!rawSession || typeof token !== 'string' || token.length > 256 || !Number.isSafeInteger(now)) return false;
  const fields = token.split('.');
  if (fields.length !== 3) return false;
  const [stamp, nonce, signature] = fields;
  if (!/^[0-9a-z]+$/.test(stamp) || !/^[A-Za-z0-9_-]{22}$/.test(nonce) ||
      !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  const issued = parseInt(stamp, 36);
  if (!Number.isSafeInteger(issued) || issued > now + FUTURE_SKEW_MS ||
      now - issued > MAX_AGE_MS) return false;
  const expected = digest(secret, rawSession, stamp, nonce);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = { issueConsentCsrf, verifyConsentCsrf, MAX_AGE_MS };
