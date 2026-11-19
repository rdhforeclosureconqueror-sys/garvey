"use strict";

// The only browser-facing boundary for Garvey learning activity evidence.
// Identity and child ownership always come from the Gates parent session;
// clients never submit a parent or learner identity for authorization.
const express = require("express");
const { createGarveyActivityEvidenceController } = require("../learning-science/garveyActivityEvidenceController");
const { createChildConsentController } = require("../learning-science/childConsentController");
const { issueConsentCsrf, verifyConsentCsrf } = require("../learning-science/consentCsrf");
const { resolveGatesParentSession, resolveOwnedGatesChild, listOwnedCanonicalGatesChildren } = require("./gatesAuth");

function canonicalOrigin(value) {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new TypeError("GARVEY_ACTIVITY_ORIGIN must be a canonical HTTPS origin");
  }
  return parsed.origin;
}

function sendControllerResult(res, result) {
  return res.status(result.status).json(result.body);
}

function createGarveyActivityEvidenceRouter({ pool, enabled = false, expectedOrigin, csrfSecret } = {}) {
  const router = express.Router();
  if (!pool) throw new TypeError("pool required");
  if (!csrfSecret || Buffer.byteLength(String(csrfSecret), "utf8") < 32) {
    throw new TypeError("GARVEY_ACTIVITY_CSRF_SECRET must be at least 32 bytes");
  }
  const origin = canonicalOrigin(expectedOrigin);
  const resolveParentSession = (req) => resolveGatesParentSession(req, { pool });
  const resolveOwnedChild = (input) => resolveOwnedGatesChild({ ...input, pool });
  const verifyCsrf = (req) => verifyConsentCsrf(req, { secret: csrfSecret });
  const evidence = createGarveyActivityEvidenceController({
    pool, resolveParentSession, resolveOwnedChild, verifyCsrf, expectedOrigin: origin, enabled,
  });
  const consent = createChildConsentController({
    pool, resolveParentSession, resolveOwnedChild, verifyCsrf, expectedOrigin: origin, enabled,
  });

  router.get("/children", async (req, res, next) => {
    try {
      if (!enabled) return res.status(404).json({ ok: false, error: "not_found" });
      const actor = await resolveParentSession(req);
      if (!actor.authenticated) return res.status(401).json({ ok: false, error: "unauthenticated" });
      const children = await listOwnedCanonicalGatesChildren({ pool, parentProfileId: actor.parentProfile.id });
      return res.json({ ok: true, children: children.map(({ child_id, child_name, child_grade_band }) => ({ child_id, child_name, child_grade_band })) });
    } catch (error) { return next(error); }
  });

  router.get("/children/:childId/context", async (req, res, next) => {
    try {
      const consentResult = await consent.read(req);
      if (consentResult.status !== 200) return sendControllerResult(res, consentResult);
      const actor = await resolveParentSession(req);
      const ownedChild = await resolveOwnedChild({ parentProfileId: actor.parentProfile.id, childId: req.params.childId });
      if (!ownedChild.ok) return res.status(403).json({ ok: false, error: "forbidden" });
      return res.json({
        ok: true,
        child: { child_id: String(ownedChild.learnerId), child_name: ownedChild.childProfile.child_name },
        consent_status: consentResult.body.consent_status,
        csrf_token: issueConsentCsrf(req, { secret: csrfSecret }),
        event_endpoint: `/api/garvey-learning/children/${encodeURIComponent(String(ownedChild.learnerId))}/activity-events`,
      });
    } catch (error) { return next(error); }
  });
  router.get("/children/:childId/consent", async (req, res, next) => { try { return sendControllerResult(res, await consent.read(req)); } catch (error) { return next(error); } });
  router.post("/children/:childId/consent", async (req, res, next) => { try { return sendControllerResult(res, await consent.mutate(req)); } catch (error) { return next(error); } });
  router.get("/children/:childId/activity-events", async (req, res, next) => { try { return sendControllerResult(res, await evidence.list(req)); } catch (error) { return next(error); } });
  router.post("/children/:childId/activity-events", async (req, res, next) => { try { return sendControllerResult(res, await evidence.write(req)); } catch (error) { return next(error); } });
  return router;
}

module.exports = { createGarveyActivityEvidenceRouter, canonicalOrigin };
