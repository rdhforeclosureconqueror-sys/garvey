"use strict";

const crypto = require("crypto");
const express = require("express");
const { createAssessmentSession, publicAssessmentSessionView } = require("../assessment-mvp/createAssessmentSession");
const { createReassessmentSession } = require("../assessment-mvp/createReassessmentSession");
const { submitAssessmentResponses } = require("../assessment-mvp/submitAssessmentResponses");

const MAX_ITEMS_PER_PACKAGE = 5;
const SESSION_ID_RE = /^amvp_[a-f0-9]{32}$/;
const TEMPORARY_STORAGE_LIMITATION = "Assessment MVP sessions are stored in temporary in-memory server state and are lost on server restart.";
const NO_PRODUCTION_PROGRESS_LIMITATION = "Assessment MVP responses are not written to production learner progress systems.";

function createSessionId() {
  return `amvp_${crypto.randomBytes(16).toString("hex")}`;
}

function validateGrade(grade) {
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) return "grade must be an integer from 1 through 6";
  return null;
}

function validateSubject(subject) {
  if (subject !== "Math" && subject !== "English") return "subject must be exactly Math or English";
  return null;
}

function validateItemsPerPackage(value) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_ITEMS_PER_PACKAGE) {
    return `itemsPerPackage must be an integer from 1 through ${MAX_ITEMS_PER_PACKAGE}`;
  }
  return null;
}

function validationError(res, error, details = {}) {
  return res.status(400).json({ ok: false, error, ...details });
}

function sessionIdError(res) {
  return validationError(res, "malformed_session_id");
}

function safeExposure(session) {
  return {
    item_ids: Array.isArray(session.exposed_item_ids) ? [...session.exposed_item_ids] : [],
    duplicate_keys: Array.isArray(session.exposed_duplicate_keys) ? [...session.exposed_duplicate_keys] : [],
    storage: "temporary_in_memory",
    limitations: [TEMPORARY_STORAGE_LIMITATION, NO_PRODUCTION_PROGRESS_LIMITATION],
  };
}

function publicSessionPayload(session) {
  const publicView = publicAssessmentSessionView(session);
  return {
    session_id: publicView.session_id,
    assessment_role: publicView.assessment_role,
    grade: publicView.grade,
    subject: publicView.subject,
    status: publicView.status,
    public_items: publicView.public_items,
    package_ids: publicView.package_ids,
    selection_summary: publicView.selection_summary,
    exposure: safeExposure(publicView),
    ...(publicView.requested_package_ids ? { requested_package_ids: publicView.requested_package_ids } : {}),
    ...(publicView.insufficient_evidence ? { insufficient_evidence: publicView.insufficient_evidence } : {}),
  };
}

function publicCompletedPayload(entry) {
  return entry.result;
}

function normalizeResponses(body) {
  const raw = body && Object.prototype.hasOwnProperty.call(body, "responses") ? body.responses : body;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("responses must be an object keyed by public item identity");
  }
  return raw;
}

function responseMapToInternalSubmissions(session, responseMap) {
  const identityByPublicKey = new Map();
  for (const item of session.public_items || []) {
    identityByPublicKey.set(item.item_identity, item.item_identity);
    identityByPublicKey.set(item.assessment_item_id, item.item_identity);
  }

  const submissions = [];
  const foreign_item_ids = [];
  for (const [publicKey, response] of Object.entries(responseMap)) {
    const itemIdentity = identityByPublicKey.get(publicKey);
    if (!itemIdentity) {
      foreign_item_ids.push(publicKey);
      continue;
    }
    submissions.push({ item_identity: itemIdentity, response });
  }
  return { submissions, foreign_item_ids };
}

function allowedReassessmentPackageIds(result) {
  const ids = new Set();
  for (const packageId of result.package_ids || []) ids.add(packageId);
  for (const evidence of result.skill_evidence || []) {
    if (evidence.source_package_id) ids.add(evidence.source_package_id);
    if (evidence.skill_id) ids.add(evidence.skill_id);
  }
  for (const recommendation of result.recommendations || []) {
    if (recommendation.package_id) ids.add(recommendation.package_id);
  }
  return ids;
}

function createAssessmentMvpRouter(options = {}) {
  const router = express.Router();
  const sessions = options.sessionStore || new Map();

  router.post("/sessions", (req, res) => {
    try {
      const body = req.body || {};
      const grade = body.grade;
      const subject = body.subject;
      const itemsPerPackage = body.itemsPerPackage;
      const gradeError = validateGrade(grade);
      if (gradeError) return validationError(res, "invalid_grade", { message: gradeError });
      const subjectError = validateSubject(subject);
      if (subjectError) return validationError(res, "invalid_subject", { message: subjectError });
      const itemsError = validateItemsPerPackage(itemsPerPackage);
      if (itemsError) return validationError(res, "invalid_items_per_package", { message: itemsError });

      const session = createAssessmentSession({ grade, subject, itemsPerPackage, session_id: createSessionId() });
      sessions.set(session.session_id, { session, result: null });
      return res.status(201).json(publicSessionPayload(session));
    } catch (err) {
      return validationError(res, "assessment_session_create_failed", { message: err.message });
    }
  });

  router.get("/sessions/:sessionId", (req, res) => {
    const sessionId = String(req.params.sessionId || "").trim();
    if (!SESSION_ID_RE.test(sessionId)) return sessionIdError(res);
    const entry = sessions.get(sessionId);
    if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
    return res.status(200).json(entry.result ? publicCompletedPayload(entry) : publicSessionPayload(entry.session));
  });

  router.post("/sessions/:sessionId/responses", (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || "").trim();
      if (!SESSION_ID_RE.test(sessionId)) return sessionIdError(res);
      const entry = sessions.get(sessionId);
      if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
      if (entry.result || entry.session.status === "completed") {
        return res.status(409).json({ ok: false, error: "session_already_completed" });
      }

      const responseMap = normalizeResponses(req.body || {});
      const { submissions, foreign_item_ids } = responseMapToInternalSubmissions(entry.session, responseMap);
      if (foreign_item_ids.length) {
        return validationError(res, "responses_include_items_not_owned_by_session", {
          response_results: foreign_item_ids.sort().map((item_identity) => ({ item_identity, status: "unknown_item", reason_code: "unknown_item" })),
        });
      }

      const result = submitAssessmentResponses(entry.session, submissions);
      const completedSession = { ...entry.session, status: "completed" };
      entry.session = completedSession;
      entry.result = {
        ...result,
        package_ids: result.completed_session.package_ids || entry.session.package_ids,
        exposure: {
          ...result.exposure,
          storage: "temporary_in_memory",
          limitations: [TEMPORARY_STORAGE_LIMITATION, NO_PRODUCTION_PROGRESS_LIMITATION],
        },
      };
      return res.status(200).json(entry.result);
    } catch (err) {
      return validationError(res, "assessment_response_submit_failed", { message: err.message });
    }
  });

  router.post("/sessions/:sessionId/reassessment", (req, res) => {
    try {
      const sessionId = String(req.params.sessionId || "").trim();
      if (!SESSION_ID_RE.test(sessionId)) return sessionIdError(res);
      const entry = sessions.get(sessionId);
      if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
      if (!entry.result || entry.result.status !== "completed") {
        return res.status(409).json({ ok: false, error: "prior_session_must_be_completed" });
      }

      const body = req.body || {};
      const packageIds = body.package_ids;
      if (!Array.isArray(packageIds) || packageIds.length === 0 || packageIds.some((id) => typeof id !== "string" || !id.trim())) {
        return validationError(res, "invalid_package_ids", { message: "package_ids must be a non-empty array of strings" });
      }
      const itemsPerPackage = body.itemsPerPackage;
      const itemsError = validateItemsPerPackage(itemsPerPackage);
      if (itemsError) return validationError(res, "invalid_items_per_package", { message: itemsError });

      const requestedIds = [...new Set(packageIds.map((id) => id.trim()))].sort((a, b) => a.localeCompare(b));
      const allowedIds = allowedReassessmentPackageIds(entry.result);
      const unrelated = requestedIds.filter((id) => !allowedIds.has(id));
      if (unrelated.length) {
        return validationError(res, "unrelated_reassessment_package_ids", { unrelated_package_ids: unrelated });
      }

      const priorExposure = entry.result.exposure || {};
      const reassessment = createReassessmentSession(entry.result, {
        grade: entry.session.grade,
        subject: entry.session.subject,
        package_ids: requestedIds,
        itemsPerPackage,
        all_prior_exposed_item_ids: priorExposure.item_ids || [],
        all_prior_exposed_duplicate_keys: priorExposure.duplicate_keys || [],
        session_id: createSessionId(),
      });
      sessions.set(reassessment.session_id, { session: reassessment, result: null, prior_session_id: sessionId });
      return res.status(201).json(publicSessionPayload(reassessment));
    } catch (err) {
      return validationError(res, "assessment_reassessment_create_failed", { message: err.message });
    }
  });

  return router;
}

module.exports = {
  MAX_ITEMS_PER_PACKAGE,
  TEMPORARY_STORAGE_LIMITATION,
  NO_PRODUCTION_PROGRESS_LIMITATION,
  createAssessmentMvpRouter,
};
