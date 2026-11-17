'use strict';

// NOT mounted to Express or production. Server-only authenticated request handler.
// The host must inject trusted server resolvers, session-bound CSRF verification,
// and a validated canonical origin. Never pass client input as actor or ownership.
const { changeChildConsent, resolveStoredChildConsent } = require('./childConsentRepository');
const { verifyLearningHistoryConsent } = require('./verifyLearningHistoryConsent');

function assertDependency(name, dependency) {
  if (typeof dependency !== 'function') throw new TypeError(name + ' dependency required');
}
function safeChildId(raw) {
  const value = String(raw ?? '');
  return /^[1-9][0-9]*$/.test(value) ? value : null;
}

function createChildConsentController({
  pool, resolveParentSession, resolveOwnedChild, verifyCsrf,
  expectedOrigin, enabled = false, changeConsent = changeChildConsent,
  getConsent = resolveStoredChildConsent,
} = {}) {
  assertDependency('resolveParentSession', resolveParentSession);
  assertDependency('resolveOwnedChild', resolveOwnedChild);
  assertDependency('verifyCsrf', verifyCsrf);
  assertDependency('changeConsent', changeConsent);
  assertDependency('getConsent', getConsent);
  if (typeof expectedOrigin !== 'string' || !/^https:\/\/[^/]+$/.test(expectedOrigin)) {
    throw new TypeError('validated HTTPS origin required');
  }

  async function prepare(req, { mutation }) {
    if (enabled !== true) return { status: 404, body: { ok: false, error: 'not_found' } };
    if (!req || !req.headers || !req.params || !safeChildId(req.params.childId)) {
      return { status: 400, body: { ok: false, error: 'invalid_child' } };
    }
    const actor = await resolveParentSession(req, { pool });
    if (!actor || actor.authenticated !== true || !actor.parentProfile) {
      return { status: 401, body: { ok: false, error: 'unauthenticated' } };
    }
    const ownedChild = await resolveOwnedChild({
      pool, parentProfileId: actor.parentProfile.id, childId: req.params.childId,
    });
    if (!ownedChild || ownedChild.ok !== true) {
      return { status: 403, body: { ok: false, error: 'forbidden' } };
    }
    if (mutation) {
      // SameSite=None is used by the existing Gates cookie in production.
      // These are separate requirements: same HTTPS Origin AND a session-bound CSRF verifier.
      if (req.headers.origin !== expectedOrigin) {
        return { status: 403, body: { ok: false, error: 'invalid_origin' } };
      }
      if (!/^application\/json(?:;|$)/i.test(String(req.headers['content-type'] || ''))) {
        return { status: 415, body: { ok: false, error: 'unsupported_media_type' } };
      }
      const verified = await verifyCsrf(req, actor);
      if (verified !== true) {
        return { status: 403, body: { ok: false, error: 'csrf_required' } };
      }
    }
    return { actor, ownedChild };
  }

  // JSON POST body: { action: 'grant'|'withdraw', acknowledged: true }.
  // Consent language/version must be displayed and explicitly acknowledged by the parent.
  async function mutate(req) {
    const prepared = await prepare(req, { mutation: true });
    if (prepared.status) return prepared;
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        !['grant', 'withdraw'].includes(body.action) || body.acknowledged !== true) {
      return { status: 400, body: { ok: false, error: 'explicit_caregiver_action_required' } };
    }
    const result = await changeConsent({
      pool, actor: prepared.actor, ownedChild: prepared.ownedChild,
      caregiverActionVerified: true, action: body.action,
    });
    return { status: 200, body: { ok: true, status: result.status, purpose: result.purpose, version: result.version } };
  }

  async function read(req) {
    const prepared = await prepare(req, { mutation: false });
    if (prepared.status) return prepared;
    const record = await getConsent({
      pool, parentProfileId: prepared.actor.parentProfile.id,
      learnerId: prepared.ownedChild.learnerId,
    });
    const granted = verifyLearningHistoryConsent(record, {
      parentId: prepared.actor.parentProfile.id,
      learnerId: prepared.ownedChild.learnerId,
    });
    return { status: 200, body: { ok: true, consent_status: granted ? 'granted' : 'not_granted' } };
  }

  return { read, mutate };
}

module.exports = { createChildConsentController };
