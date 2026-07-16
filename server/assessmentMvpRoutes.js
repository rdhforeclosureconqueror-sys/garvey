"use strict";

const crypto = require("crypto");
const express = require("express");
const { SESSION_VERSION, createAssessmentSession, publicAssessmentSessionView } = require("../assessment-mvp/createAssessmentSession");
const { createReassessmentSession } = require("../assessment-mvp/createReassessmentSession");
const { submitAssessmentResponses } = require("../assessment-mvp/submitAssessmentResponses");
const {
  buildGatesSessionCookie,
  resolveGatesParentSession,
  resolveOwnedGatesChild,
} = require("./gatesAuth");
const { pool: defaultPool } = require("./db");
const { AssessmentMvpPostgresStore } = require("./assessmentMvpStore");

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
    ...(session.exposure_storage ? { storage: session.exposure_storage } : {}),
    ...(session.exposure_limitations ? { limitations: [...session.exposure_limitations] } : {}),
  };
}

function publicSessionPayload(session) {
  const publicView = publicAssessmentSessionView(session);
  return {
    session_id: publicView.session_id,
    session_version: publicView.session_version,
    assessment_role: publicView.assessment_role,
    grade: publicView.grade,
    subject: publicView.subject,
    status: publicView.status,
    resumed: Boolean(publicView.resumed),
    current_question_position: Number(publicView.current_question_position || 0),
    public_items: publicView.public_items,
    package_ids: publicView.package_ids,
    selection_summary: publicView.selection_summary,
    exposure: safeExposure(publicView),
    ...(publicView.requested_package_ids ? { requested_package_ids: publicView.requested_package_ids } : {}),
    ...(publicView.insufficient_evidence ? { insufficient_evidence: publicView.insufficient_evidence } : {}),
    ...(session.child_context ? { child_context: session.child_context } : {}),
  };
}

function restartRequiredPayload(session) {
  return {
    ok: false,
    error: "assessment_session_restart_required",
    message: "This saved assessment was created with an older question version. Please start a new corrected baseline.",
    restart_required: true,
    session_id: session && session.session_id,
  };
}

function isCurrentSessionVersion(session) {
  return Boolean(session && session.session_version === SESSION_VERSION);
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


function responseHasOwnershipInternals(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(responseHasOwnershipInternals);
  return Object.entries(value).some(([key, child]) => {
    if (["auth_user_id", "parent_profile_id", "learner_id", "token", "token_hash", "session_token"].includes(key)) return true;
    return responseHasOwnershipInternals(child);
  });
}

function ownershipError(res, status, error, details = {}) {
  const parentMessage = error === "malformed_child_id"
    ? "We could not verify Princess Nia’s learning profile. Please return to the Parent Dashboard and try again."
    : details.parent_message;
  if (error === "malformed_child_id") {
    console.warn(JSON.stringify({ ts: new Date().toISOString(), event: "assessment_mvp_child_id_rejected", reason: error, received_child_id: String(details.received_child_id || ""), expected_format: "positive integer gates_child_profiles.id" }));
  }
  return res.status(status).json({ ok: false, error, ...(parentMessage ? { parent_message: parentMessage } : {}) });
}

function getEntryOwnership(entry) {
  return {
    auth_user_id: entry?.auth_user_id,
    parent_profile_id: entry?.parent_profile_id,
    learner_id: entry?.learner_id,
  };
}

function attachOwnershipToSession(session, ownership, childProfile) {
  const metadata = childProfile ? {
    child_id: childProfile.child_id,
    child_grade_band: childProfile.child_grade_band,
    grade_metadata: childProfile.metadata?.grade ?? childProfile.metadata?.grade_band ?? null,
  } : null;
  return metadata ? { ...session, child_context: metadata } : session;
}

async function defaultResolveAuthenticatedParent(req, { pool }) {
  return resolveGatesParentSession(req, { pool });
}

async function defaultResolveOwnedChild({ pool, parentProfileId, childId }) {
  return resolveOwnedGatesChild({ pool, parentProfileId, childId });
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
  const pool = options.pool || defaultPool;
  const persistentStore = options.assessmentStore || options.store || (!options.sessionStore ? new AssessmentMvpPostgresStore({ pool, createSessionId }) : null);
  const requireAuthentication = options.requireAuthentication !== false;
  const resolveAuthenticatedParent = options.resolveAuthenticatedParent || defaultResolveAuthenticatedParent;
  const resolveOwnedChild = options.resolveOwnedChild || defaultResolveOwnedChild;

  async function authenticate(req, res) {
    if (!requireAuthentication) return { authenticated: false, skipped: true };
    const sessionState = await resolveAuthenticatedParent(req, { pool });
    if (sessionState.clearCookie) res.setHeader("Set-Cookie", buildGatesSessionCookie(req, "", 0));
    if (!sessionState.authenticated) return null;
    return sessionState;
  }

  function entryBelongsTo(entry, actor) {
    if (!requireAuthentication) return true;
    const ownership = getEntryOwnership(entry);
    return Number(ownership.auth_user_id) === Number(actor.authUserId)
      && Number(ownership.parent_profile_id) === Number(actor.parentProfile.id);
  }

  async function verifySuppliedChildContext(req, res, entry, actor) {
    if (!requireAuthentication) return true;
    const rawChildId = req.body?.child_id ?? req.query?.child_id;
    if (rawChildId == null || String(rawChildId).trim() === "") return true;
    const ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: rawChildId, input: { ...(req.query || {}), ...(req.body || {}) } });
    if (!ownedChild.ok) {
      ownershipError(res, ownedChild.status, ownedChild.error);
      return false;
    }
    if (String(ownedChild.learnerId) !== String(entry.learner_id)) {
      ownershipError(res, 403, "forbidden");
      return false;
    }
    return true;
  }

  router.post("/sessions", async (req, res) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) return ownershipError(res, 401, "unauthenticated");
      const body = req.body || {};
      let ownedChild = null;
      if (requireAuthentication) {
        if (body.child_id == null || String(body.child_id).trim() === "") return validationError(res, "missing_child_id");
        ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: body.child_id, input: body });
        if (!ownedChild.ok) return ownershipError(res, ownedChild.status, ownedChild.error, { received_child_id: body.child_id });
      }
      const grade = body.grade;
      const subject = body.subject;
      const itemsPerPackage = body.itemsPerPackage;
      const gradeError = validateGrade(grade);
      if (gradeError) return validationError(res, "invalid_grade", { message: gradeError });
      const subjectError = validateSubject(subject);
      if (subjectError) return validationError(res, "invalid_subject", { message: subjectError });
      const itemsError = validateItemsPerPackage(itemsPerPackage);
      if (itemsError) return validationError(res, "invalid_items_per_package", { message: itemsError });

      if (persistentStore && requireAuthentication) {
        const session = await persistentStore.createOrResumeAssessmentSession({
          actor,
          ownedChild,
          grade,
          subject,
          itemsPerPackage,
        });
        await persistentStore.markAssessmentItemDelivered?.({ sessionId: session.session_id, displayOrder: session.current_question_position || 0 });
        const payload = publicSessionPayload(session);
        if (responseHasOwnershipInternals(payload)) throw new Error("ownership internals leaked");
        return res.status(session.resumed ? 200 : 201).json(payload);
      }

      const baseSession = createAssessmentSession({ grade, subject, itemsPerPackage, session_id: createSessionId() });
      const session = attachOwnershipToSession({
        ...baseSession,
        resumed: false,
        current_question_position: 0,
        exposure_storage: "temporary_in_memory",
        exposure_limitations: [TEMPORARY_STORAGE_LIMITATION, NO_PRODUCTION_PROGRESS_LIMITATION],
      }, actor, ownedChild?.childProfile);
      sessions.set(session.session_id, {
        session,
        result: null,
        ...(requireAuthentication ? {
          auth_user_id: actor.authUserId,
          parent_profile_id: actor.parentProfile.id,
          learner_id: ownedChild.learnerId,
        } : {}),
      });
      const payload = publicSessionPayload(session);
      if (responseHasOwnershipInternals(payload)) throw new Error("ownership internals leaked");
      return res.status(201).json(payload);
    } catch (err) {
      return validationError(res, "assessment_session_create_failed", { message: err.message });
    }
  });

  router.get("/sessions/:sessionId", async (req, res) => {
    const actor = await authenticate(req, res);
    if (!actor) return ownershipError(res, 401, "unauthenticated");
    const sessionId = String(req.params.sessionId || "").trim();
    if (!SESSION_ID_RE.test(sessionId)) return sessionIdError(res);
    if (persistentStore && requireAuthentication) {
      const entry = await persistentStore.getAssessmentSessionByPublicId({ sessionId });
      if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
      if (Number(entry.ownership.parent_profile_id) !== Number(actor.parentProfile.id)) return ownershipError(res, 403, "forbidden");
      if (entry.restartRequired) return res.status(409).json({ ok: false, ...entry.restartRequired });
      const ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: entry.ownership.learner_id, input: { ...(req.query || {}), ...(req.body || {}) } });
      if (!ownedChild.ok) return ownershipError(res, ownedChild.status === 404 ? 403 : ownedChild.status, ownedChild.error === "child_not_found" ? "forbidden" : ownedChild.error);
      if (entry.session.status === "completed") {
        const completed = await persistentStore.getCompletedAssessmentResult({ sessionId, childProfile: ownedChild.childProfile });
        if (!completed) return res.status(409).json({ ok: false, error: "completed_result_unavailable" });
        if (responseHasOwnershipInternals(completed)) return validationError(res, "assessment_session_read_failed", { message: "ownership internals leaked" });
        return res.status(200).json(completed);
      }
      const refreshed = await persistentStore.getAssessmentSessionByPublicId({ sessionId, childProfile: ownedChild.childProfile });
      await persistentStore.markAssessmentItemDelivered?.({ sessionId, displayOrder: refreshed.session.current_question_position || 0 });
      const payload = publicSessionPayload(refreshed.session);
      if (responseHasOwnershipInternals(payload)) return validationError(res, "assessment_session_read_failed", { message: "ownership internals leaked" });
      return res.status(200).json(payload);
    }

    const entry = sessions.get(sessionId);
    if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
    if (!entryBelongsTo(entry, actor)) return ownershipError(res, 403, "forbidden");
    if (!await verifySuppliedChildContext(req, res, entry, actor)) return;
    if (!entry.result && entry.session && entry.session.status === "in_progress" && !isCurrentSessionVersion(entry.session)) {
      return res.status(409).json(restartRequiredPayload(entry.session));
    }
    const payload = entry.result ? publicCompletedPayload(entry) : publicSessionPayload(entry.session);
    if (responseHasOwnershipInternals(payload)) return validationError(res, "assessment_session_read_failed", { message: "ownership internals leaked" });
    return res.status(200).json(payload);
  });


  router.get("/children/:childId/history", async (req, res) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) return ownershipError(res, 401, "unauthenticated");
      const ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: req.params.childId, input: { ...(req.query || {}), ...(req.body || {}) } });
      if (!ownedChild.ok) return ownershipError(res, ownedChild.status, ownedChild.error, { received_child_id: req.params.childId });

      const subject = req.query.subject == null || String(req.query.subject).trim() === "" ? null : String(req.query.subject).trim();
      if (subject != null) {
        const subjectError = validateSubject(subject);
        if (subjectError) return validationError(res, "invalid_subject", { message: subjectError });
      }
      let grade = null;
      if (req.query.grade != null && String(req.query.grade).trim() !== "") {
        grade = Number(req.query.grade);
        const gradeError = validateGrade(grade);
        if (gradeError) return validationError(res, "invalid_grade", { message: gradeError });
      }
      const status = req.query.status == null || String(req.query.status).trim() === "" ? null : String(req.query.status).trim();
      if (status != null && !["in_progress", "completed", "abandoned", "expired"].includes(status)) {
        return validationError(res, "invalid_status", { message: "status must be in_progress, completed, abandoned, or expired" });
      }
      const assessmentRole = req.query.assessment_role == null || String(req.query.assessment_role).trim() === ""
        ? null
        : String(req.query.assessment_role).trim();
      if (assessmentRole != null && !["baseline", "reassessment"].includes(assessmentRole)) {
        return validationError(res, "invalid_assessment_role", { message: "assessment_role must be baseline or reassessment" });
      }
      const limit = req.query.limit == null || String(req.query.limit).trim() === "" ? 50 : Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1) return validationError(res, "invalid_limit", { message: "limit must be a positive integer" });

      if (persistentStore && requireAuthentication) {
        const history = await persistentStore.getLearnerAssessmentHistory({
          learnerId: ownedChild.learnerId,
          parentProfileId: actor.parentProfile.id,
          grade,
          subject,
          status,
          assessmentRole,
          limit,
        });
        if (responseHasOwnershipInternals(history)) return validationError(res, "assessment_history_read_failed", { message: "ownership internals leaked" });
        return res.status(200).json(history);
      }

      const rows = [...sessions.values()].filter((entry) => {
        if (!entryBelongsTo(entry, actor)) return false;
        if (String(entry.learner_id) !== String(ownedChild.learnerId)) return false;
        const session = entry.session;
        if (!session) return false;
        if (assessmentRole != null && session.assessment_role !== assessmentRole) return false;
        if (grade != null && Number(session.grade) !== Number(grade)) return false;
        if (subject != null && session.subject !== subject) return false;
        if (status != null && session.status !== status) return false;
        return true;
      }).slice(-Math.min(limit, 50)).reverse();
      const payload = {
        limit: Math.min(limit, 50),
        sessions: rows.map((entry) => ({
          session_id: entry.session.session_id,
          assessment_role: entry.session.assessment_role,
          grade: entry.session.grade,
          subject: entry.session.subject,
          status: entry.session.status,
          created_at: entry.session.created_at || null,
          updated_at: entry.session.updated_at || null,
          completed_at: entry.session.completed_at || null,
          current_question_position: entry.session.current_question_position || 0,
          package_ids: entry.session.package_ids || [],
          evidence_summary: entry.result?.skill_evidence || [],
          recommendation_count: entry.result?.recommendations?.length || 0,
          ...(entry.prior_session_id ? { prior_session_id_public_reference_if_safe: entry.prior_session_id } : {}),
        })),
      };
      if (responseHasOwnershipInternals(payload)) return validationError(res, "assessment_history_read_failed", { message: "ownership internals leaked" });
      return res.status(200).json(payload);
    } catch (err) {
      return validationError(res, "assessment_history_read_failed", { message: err.message });
    }
  });


  router.get("/children/:childId/current-session", async (req, res) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) return ownershipError(res, 401, "unauthenticated");
      const ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: req.params.childId, input: { ...(req.query || {}), ...(req.body || {}) } });
      if (!ownedChild.ok) return ownershipError(res, ownedChild.status, ownedChild.error, { received_child_id: req.params.childId });

      const subject = req.query.subject == null || String(req.query.subject).trim() === "" ? null : String(req.query.subject).trim();
      if (subject != null) {
        const subjectError = validateSubject(subject);
        if (subjectError) return validationError(res, "invalid_subject", { message: subjectError });
      }
      let grade = null;
      if (req.query.grade != null && String(req.query.grade).trim() !== "") {
        grade = Number(req.query.grade);
        const gradeError = validateGrade(grade);
        if (gradeError) return validationError(res, "invalid_grade", { message: gradeError });
      }
      const assessmentRole = req.query.assessment_role == null || String(req.query.assessment_role).trim() === ""
        ? null
        : String(req.query.assessment_role).trim();
      if (assessmentRole != null && !["baseline", "reassessment"].includes(assessmentRole)) {
        return validationError(res, "invalid_assessment_role", { message: "assessment_role must be baseline or reassessment" });
      }

      if (persistentStore && requireAuthentication) {
        const session = await persistentStore.getCurrentAssessmentSessionForLearner({
          learnerId: ownedChild.learnerId,
          parentProfileId: actor.parentProfile.id,
          grade,
          subject,
          assessmentRole,
          childProfile: ownedChild.childProfile,
        });
        if (!session) return res.status(404).json({ ok: false, error: "current_session_not_found" });
        if (session.restart_required) return res.status(409).json({ ok: false, error: session.restart_required_error || "assessment_session_restart_required", message: session.message, restart_required: true });
        await persistentStore.markAssessmentItemDelivered?.({ sessionId: session.session_id, displayOrder: session.current_question_position || 0 });
        const payload = publicSessionPayload(session);
        if (responseHasOwnershipInternals(payload)) return validationError(res, "assessment_session_read_failed", { message: "ownership internals leaked" });
        return res.status(200).json(payload);
      }

      const matches = [...sessions.values()].filter((entry) => {
        if (!entryBelongsTo(entry, actor)) return false;
        if (String(entry.learner_id) !== String(ownedChild.learnerId)) return false;
        const session = entry.session;
        if (!session || session.status !== "in_progress") return false;
        if (assessmentRole && session.assessment_role !== assessmentRole) return false;
        if (grade != null && Number(session.grade) !== Number(grade)) return false;
        if (subject != null && session.subject !== subject) return false;
        return true;
      });
      if (!matches.length) return res.status(404).json({ ok: false, error: "current_session_not_found" });
      const newest = matches[matches.length - 1].session;
      if (!isCurrentSessionVersion(newest)) return res.status(409).json(restartRequiredPayload(newest));
      const payload = publicSessionPayload({ ...newest, resumed: true });
      if (responseHasOwnershipInternals(payload)) return validationError(res, "assessment_session_read_failed", { message: "ownership internals leaked" });
      return res.status(200).json(payload);
    } catch (err) {
      return validationError(res, "assessment_current_session_read_failed", { message: err.message });
    }
  });

  router.patch("/sessions/:sessionId/progress", async (req, res) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) return ownershipError(res, 401, "unauthenticated");
      const sessionId = String(req.params.sessionId || "").trim();
      if (!SESSION_ID_RE.test(sessionId)) return sessionIdError(res);
      const position = req.body?.current_question_position;
      if (!Number.isInteger(position)) return validationError(res, "invalid_current_question_position");

      if (persistentStore && requireAuthentication) {
        const entry = await persistentStore.getAssessmentSessionByPublicId({ sessionId });
        if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
        if (Number(entry.ownership.parent_profile_id) !== Number(actor.parentProfile.id)) return ownershipError(res, 403, "forbidden");
        if (entry.restartRequired) return res.status(409).json({ ok: false, ...entry.restartRequired });
        const ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: entry.ownership.learner_id, input: { ...(req.query || {}), ...(req.body || {}) } });
        if (!ownedChild.ok) return ownershipError(res, ownedChild.status === 404 ? 403 : ownedChild.status, ownedChild.error === "child_not_found" ? "forbidden" : ownedChild.error);
        const updated = await persistentStore.updateAssessmentSessionPosition({
          sessionId,
          parentProfileId: actor.parentProfile.id,
          learnerId: ownedChild.learnerId,
          currentQuestionPosition: position,
          childProfile: ownedChild.childProfile,
        });
        if (updated.status !== 200) return res.status(updated.status).json({ ok: false, error: updated.error });
        await persistentStore.markAssessmentItemDelivered?.({ sessionId, displayOrder: updated.session.current_question_position || 0 });
        const payload = publicSessionPayload(updated.session);
        if (responseHasOwnershipInternals(payload)) return validationError(res, "assessment_session_progress_failed", { message: "ownership internals leaked" });
        return res.status(200).json(payload);
      }

      const entry = sessions.get(sessionId);
      if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
      if (!entryBelongsTo(entry, actor)) return ownershipError(res, 403, "forbidden");
      if (entry.session.status !== "in_progress") return res.status(409).json({ ok: false, error: "session_not_in_progress" });
      if (!isCurrentSessionVersion(entry.session)) return res.status(409).json(restartRequiredPayload(entry.session));
      const itemCount = entry.session.public_items?.length || 0;
      if (position < 0 || position >= itemCount) return validationError(res, "invalid_current_question_position");
      entry.session = { ...entry.session, current_question_position: position };
      const payload = publicSessionPayload(entry.session);
      if (responseHasOwnershipInternals(payload)) return validationError(res, "assessment_session_progress_failed", { message: "ownership internals leaked" });
      return res.status(200).json(payload);
    } catch (err) {
      return validationError(res, "assessment_session_progress_failed", { message: err.message });
    }
  });

  router.post("/sessions/:sessionId/responses", async (req, res) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) return ownershipError(res, 401, "unauthenticated");
      const sessionId = String(req.params.sessionId || "").trim();
      if (!SESSION_ID_RE.test(sessionId)) return sessionIdError(res);
      if (persistentStore && requireAuthentication) {
        const entry = await persistentStore.getAssessmentSessionByPublicId({ sessionId });
        if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
        if (Number(entry.ownership.parent_profile_id) !== Number(actor.parentProfile.id)) return ownershipError(res, 403, "forbidden");
        if (entry.restartRequired) return res.status(409).json({ ok: false, ...entry.restartRequired });
        const ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: entry.ownership.learner_id, input: { ...(req.query || {}), ...(req.body || {}) } });
        if (!ownedChild.ok) return ownershipError(res, ownedChild.status === 404 ? 403 : ownedChild.status, ownedChild.error === "child_not_found" ? "forbidden" : ownedChild.error);
        let responseMap;
        try {
          responseMap = normalizeResponses(req.body || {});
        } catch (err) {
          return validationError(res, "malformed_responses", { message: err.message });
        }
        const submitted = await persistentStore.submitPersistentAssessmentResponses({ sessionId, actor, ownedChild, responses: responseMap });
        if (submitted.status !== 200) {
          const body = { ok: false, error: submitted.error };
          if (submitted.foreign_item_ids) {
            body.response_results = submitted.foreign_item_ids.map((item_identity) => ({ item_identity, status: "unknown_item", reason_code: "unknown_item" }));
          }
          if (submitted.message && submitted.status === 409) body.message = submitted.message;
          return res.status(submitted.status).json(body);
        }
        if (responseHasOwnershipInternals(submitted.result)) throw new Error("ownership internals leaked");
        return res.status(200).json(submitted.result);
      }

      const entry = sessions.get(sessionId);
      if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
      if (!entryBelongsTo(entry, actor)) return ownershipError(res, 403, "forbidden");
      if (!await verifySuppliedChildContext(req, res, entry, actor)) return;
      if (entry.session && entry.session.status === "in_progress" && !isCurrentSessionVersion(entry.session)) {
        return res.status(409).json(restartRequiredPayload(entry.session));
      }
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
      if (responseHasOwnershipInternals(entry.result)) throw new Error("ownership internals leaked");
      return res.status(200).json(entry.result);
    } catch (err) {
      return validationError(res, "assessment_response_submit_failed", { message: err.message });
    }
  });

  router.post("/sessions/:sessionId/reassessment", async (req, res) => {
    try {
      const actor = await authenticate(req, res);
      if (!actor) return ownershipError(res, 401, "unauthenticated");
      const sessionId = String(req.params.sessionId || "").trim();
      if (!SESSION_ID_RE.test(sessionId)) return sessionIdError(res);
      if (persistentStore && requireAuthentication) {
        const entry = await persistentStore.getAssessmentSessionByPublicId({ sessionId });
        if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
        if (Number(entry.ownership.parent_profile_id) !== Number(actor.parentProfile.id)) return ownershipError(res, 403, "forbidden");
        if (entry.restartRequired) return res.status(409).json({ ok: false, ...entry.restartRequired });
        const ownedChild = await resolveOwnedChild({ pool, parentProfileId: actor.parentProfile.id, childId: entry.ownership.learner_id, input: { ...(req.query || {}), ...(req.body || {}) } });
        if (!ownedChild.ok) return ownershipError(res, ownedChild.status === 404 ? 403 : ownedChild.status, ownedChild.error === "child_not_found" ? "forbidden" : ownedChild.error);

        const body = req.body || {};
        const packageIds = body.package_ids;
        if (!Array.isArray(packageIds) || packageIds.length === 0 || packageIds.some((id) => typeof id !== "string" || !id.trim())) {
          return validationError(res, "invalid_package_ids", { message: "package_ids must be a non-empty array of strings" });
        }
        const itemsPerPackage = body.itemsPerPackage;
        const itemsError = validateItemsPerPackage(itemsPerPackage);
        if (itemsError) return validationError(res, "invalid_items_per_package", { message: itemsError });

        const created = await persistentStore.createPersistentReassessmentSession({
          priorSessionId: sessionId,
          actor,
          ownedChild,
          packageIds,
          itemsPerPackage,
        });
        if (created.status !== 200 && created.status !== 201) {
          const body = { ok: false, error: created.error };
          if (created.unrelated_package_ids) body.unrelated_package_ids = created.unrelated_package_ids;
          return res.status(created.status).json(body);
        }
        await persistentStore.markAssessmentItemDelivered?.({ sessionId: created.session.session_id, displayOrder: created.session.current_question_position || 0 });
        const payload = publicSessionPayload(created.session);
        if (responseHasOwnershipInternals(payload)) throw new Error("ownership internals leaked");
        return res.status(created.status).json(payload);
      }

      const entry = sessions.get(sessionId);
      if (!entry) return res.status(404).json({ ok: false, error: "session_not_found" });
      if (!entryBelongsTo(entry, actor)) return ownershipError(res, 403, "forbidden");
      if (!await verifySuppliedChildContext(req, res, entry, actor)) return;
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
      const reassessmentWithContext = attachOwnershipToSession(reassessment, actor, entry.session.child_context ? {
        child_id: entry.session.child_context.child_id,
        child_grade_band: entry.session.child_context.child_grade_band,
        metadata: { grade: entry.session.child_context.grade_metadata },
      } : null);
      sessions.set(reassessment.session_id, {
        session: reassessmentWithContext,
        result: null,
        prior_session_id: sessionId,
        ...(requireAuthentication ? getEntryOwnership(entry) : {}),
      });
      reassessmentWithContext.exposure_storage = "temporary_in_memory";
      reassessmentWithContext.exposure_limitations = [TEMPORARY_STORAGE_LIMITATION, NO_PRODUCTION_PROGRESS_LIMITATION];
      const payload = publicSessionPayload(reassessmentWithContext);
      if (responseHasOwnershipInternals(payload)) throw new Error("ownership internals leaked");
      return res.status(201).json(payload);
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
