"use strict";

const crypto = require("crypto");
const { createAssessmentSession, publicAssessmentSessionView, toStableUnique } = require("../assessment-mvp/createAssessmentSession");
const { createReassessmentSession } = require("../assessment-mvp/createReassessmentSession");
const { REQUIRED_LIMITATIONS } = require("../assessment-mvp/submitAssessmentResponses");
const { loadSkillPackages, packageIdOf } = require("../assessment-mvp/loadSkillPackages");
const { recommendSkillPackages } = require("../assessment-mvp/recommendSkillPackages");
const { scoreResponses } = require("../assessment-mvp/scoreResponses");
const { selectAssessmentItems, stableStringify } = require("../assessment-mvp/selectAssessmentItems");
const { pool: defaultPool } = require("./db");

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function itemVersionHash(publicItem) {
  return sha256(stableStringify({
    assessment_item_id: publicItem.assessment_item_id,
    item_identity: publicItem.item_identity,
    source_package_id: publicItem.source_package_id,
    source_question_id: publicItem.source_question_id,
    source_bank: publicItem.source_bank,
    source_pointer: publicItem.source_pointer || null,
    question_type: publicItem.question_type,
    payload: publicItem.payload,
  }));
}


const SCORING_POLICY_VERSION = "assessment-mvp-score-v1";
const EVIDENCE_VERSION = "assessment-mvp-evidence-v1";

const SAFE_REASON_TEXT = {
  omitted_response: "omitted_response",
  unknown_item: "unknown_item",
  unsupported_item_type: "unsupported_item_type",
  missing_deterministic_answer: "missing_deterministic_answer",
  malformed_numeric_response: "malformed_numeric_response",
  malformed_fraction_response: "malformed_fraction_response",
  units_unsupported: "units_unsupported",
  ambiguous_mixed_number: "ambiguous_mixed_number",
  multiple_numeric_values: "multiple_numeric_values",
  ambiguous_or_missing_correct_choice: "ambiguous_or_missing_correct_choice",
};

const RECOMMENDATION_REASON = {
  needs_support: "This skill needs more support based on the recent responses.",
  developing: "This skill is developing and would benefit from more practice.",
  insufficient_evidence: "More evidence is needed before assigning a stronger label.",
  verified_remediation: "This earlier skill may help support the current skill.",
};

function auditAssessmentEvent(event, metadata = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (["response", "responses", "answer", "answers", "correct_answer", "acceptable_answers", "scoring_key"].includes(key)) continue;
    safe[key] = value;
  }
  console.info(JSON.stringify({ event, ...safe }));
}

function conflict(error, message = "Assessment content changed; this session must be reviewed or restarted.") {
  const err = new Error(message);
  err.status = 409;
  err.error = error;
  return err;
}

function publicSafeScoreResult(score) {
  const result = { status: score.status };
  if (score.reason_code) result.reason_code = SAFE_REASON_TEXT[score.reason_code] || "not_scorable";
  return result;
}

function safeLearnerResponse(value) {
  if (value === undefined) return { value: null };
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return { value };
  if (Array.isArray(value)) return { value: value.map((entry) => safeLearnerResponse(entry).value) };
  return { value: JSON.parse(JSON.stringify(value)) };
}

function submittedValue(submission) {
  if (!submission || typeof submission !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(submission, "response")) return submission.response;
  if (Object.prototype.hasOwnProperty.call(submission, "value")) return submission.value;
  if (Object.prototype.hasOwnProperty.call(submission, "answer")) return submission.answer;
  return undefined;
}

function normalizeSubmissionMap(responseMap, itemRows) {
  if (!responseMap || typeof responseMap !== "object" || Array.isArray(responseMap)) {
    const err = new TypeError("responses must be an object keyed by public item identity");
    err.status = 400;
    err.error = "malformed_responses";
    throw err;
  }
  const keyToIdentity = new Map();
  for (const row of itemRows) {
    keyToIdentity.set(row.item_identity, row.item_identity);
    keyToIdentity.set(row.assessment_item_id, row.item_identity);
  }
  const byIdentity = new Map();
  const foreign = [];
  for (const [key, value] of Object.entries(responseMap)) {
    const identity = keyToIdentity.get(key);
    if (!identity) {
      foreign.push(key);
    } else {
      byIdentity.set(identity, value);
    }
  }
  if (foreign.length) {
    const err = new Error("responses include items not owned by this session");
    err.status = 400;
    err.error = "responses_include_items_not_owned_by_session";
    err.foreign_item_ids = foreign.sort();
    throw err;
  }
  return itemRows.map((row) => ({ item_identity: row.item_identity, response: byIdentity.has(row.item_identity) ? byIdentity.get(row.item_identity) : undefined }));
}

function packageSummary(pkg) {
  const id = packageIdOf(pkg);
  return {
    package_id: id,
    grade: pkg.grade,
    subject: pkg.subject,
    domain: pkg.domain || "unknown",
    skill: pkg.skill || pkg.title || pkg.name || id,
  };
}

function publicRecommendationFromRow(row, packagesById, evidenceByPackage) {
  const pkg = packagesById.get(row.recommended_package_id);
  if (!pkg) throw conflict("recommendation_package_missing");
  const evidence = evidenceByPackage.get(row.recommended_package_id);
  const summary = packageSummary(pkg);
  return {
    ...summary,
    evidence_label: evidence?.provisional_label || "Not Enough Evidence",
    recommendation_type: row.recommendation_type,
    reason_code: row.reason_code,
    reason: RECOMMENDATION_REASON[row.reason_code] || row.reason_code,
    study_route: `/skill-world/${row.recommended_package_id}`,
    practice_route: `/skill-world/${row.recommended_package_id}/drill`,
    priority: Number(row.priority),
  };
}

function responseResultFromRow(row, itemRow) {
  const score = row.score_result || {};
  return {
    item_identity: itemRow.item_identity,
    source_package_id: itemRow.package_id,
    source_question_id: itemRow.source_question_id,
    status: row.score_status,
    scored: Boolean(row.scored),
    ...(score.reason_code ? { reason_code: score.reason_code } : {}),
    ...(row.normalized_response && row.score_status !== "correct" ? { normalized_response: row.normalized_response } : {}),
  };
}

function evidenceFromRow(row) {
  return {
    source_package_id: row.package_id,
    skill_id: row.package_id,
    valid_scored_responses: Number(row.valid_response_count || 0),
    correct_responses: Number(row.correct_count || 0),
    incorrect_responses: Number(row.incorrect_count || 0),
    omitted_responses: Number(row.omitted_count || 0),
    not_scorable_responses: Number(row.not_scorable_count || 0),
    accuracy: row.accuracy == null ? null : Number(row.accuracy),
    provisional_label: row.provisional_label,
  };
}

function toInt(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : value;
}

function childContextFromProfile(childProfile) {
  if (!childProfile) return null;
  return {
    child_id: String(childProfile.child_id),
    stored_grade_band: childProfile.child_grade_band || null,
    child_grade_band: childProfile.child_grade_band || null,
    grade_metadata: childProfile.metadata?.grade ?? childProfile.metadata?.grade_band ?? null,
  };
}

function selectionConfigFor({ itemsPerPackage, selectionSummary, packageIds }) {
  return {
    itemsPerPackage,
    selection_summary: selectionSummary,
    package_ids: packageIds,
  };
}

function sessionFromRows(sessionRow, itemRows = [], { resumed = false, childProfile = null } = {}) {
  if (!sessionRow) return null;
  const selectionConfig = sessionRow.selection_config || {};
  const publicItems = itemRows
    .slice()
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .map((row) => JSON.parse(JSON.stringify(row.public_payload || {})));
  const itemIds = itemRows.map((row) => row.item_identity).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const duplicateKeys = itemRows.map((row) => row.duplicate_key).filter(Boolean).sort((a, b) => a.localeCompare(b));
  return {
    session_id: sessionRow.session_id,
    session_version: sessionRow.session_version,
    assessment_role: sessionRow.assessment_role,
    grade: Number(sessionRow.grade),
    subject: sessionRow.subject,
    status: sessionRow.status,
    current_question_position: Number(sessionRow.current_question_position || 0),
    public_items: publicItems,
    exposed_item_ids: itemIds,
    exposed_duplicate_keys: duplicateKeys,
    package_ids: Array.isArray(selectionConfig.package_ids)
      ? [...selectionConfig.package_ids]
      : [...new Set(publicItems.map((item) => item.source_package_id).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    selection_summary: selectionConfig.selection_summary || {},
    ...(Array.isArray(selectionConfig.requested_package_ids) ? { requested_package_ids: [...selectionConfig.requested_package_ids] } : {}),
    ...(Array.isArray(selectionConfig.insufficient_evidence) ? { insufficient_evidence: JSON.parse(JSON.stringify(selectionConfig.insufficient_evidence)) } : {}),
    resumed: Boolean(resumed),
    child_context: childContextFromProfile(childProfile),
  };
}

async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

class AssessmentMvpPostgresStore {
  constructor(options = {}) {
    this.pool = options.pool || defaultPool;
    this.createSessionId = options.createSessionId;
  }

  async loadLearnerExposureHistory({ learnerId }, client = this.pool) {
    const result = await client.query(
      `SELECT item_identity, duplicate_key
         FROM assessment_item_exposures
        WHERE learner_id = $1
        ORDER BY exposed_at ASC, id ASC`,
      [toInt(learnerId)]
    );
    return {
      item_ids: [...new Set(result.rows.map((row) => row.item_identity).filter(Boolean))],
      duplicate_keys: [...new Set(result.rows.map((row) => row.duplicate_key).filter(Boolean))],
    };
  }

  async findInProgress({ learnerId, grade, subject, assessmentRole = "baseline", priorSessionInternalId = null }, client = this.pool) {
    const params = [toInt(learnerId), grade, subject];
    const clauses = ["learner_id = $1", "grade = $2", "subject = $3", "status = 'in_progress'"];
    if (assessmentRole != null) {
      params.push(assessmentRole);
      clauses.push(`assessment_role = $${params.length}`);
    }
    if (priorSessionInternalId != null) {
      params.push(priorSessionInternalId);
      clauses.push(`prior_session_id = $${params.length}`);
    }
    const result = await client.query(
      `SELECT *
         FROM assessment_sessions
        WHERE ${clauses.join(" AND ")}
        ORDER BY updated_at DESC, id DESC
        LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async loadSessionItems(internalSessionId, client = this.pool) {
    const result = await client.query(
      `SELECT *
         FROM assessment_session_items
        WHERE session_id = $1
        ORDER BY display_order ASC`,
      [internalSessionId]
    );
    return result.rows;
  }

  async createOrResumeAssessmentSession({ actor, ownedChild, grade, subject, itemsPerPackage }) {
    try {
      return await withTransaction(this.pool, async (client) => {
        const learnerId = toInt(ownedChild.learnerId);
        const existing = await this.findInProgress({ learnerId, grade, subject, assessmentRole: "baseline" }, client);
        if (existing) {
          const itemRows = await this.loadSessionItems(existing.id, client);
          return sessionFromRows(existing, itemRows, { resumed: true, childProfile: ownedChild.childProfile });
        }

        const exposureHistory = await this.loadLearnerExposureHistory({ learnerId }, client);
        const selected = createAssessmentSession({
          grade,
          subject,
          itemsPerPackage,
          session_id: this.createSessionId ? this.createSessionId() : undefined,
          previously_exposed_item_ids: exposureHistory.item_ids,
          previously_exposed_duplicate_keys: exposureHistory.duplicate_keys,
        });
        const selectionConfig = selectionConfigFor({
          itemsPerPackage,
          selectionSummary: selected.selection_summary,
          packageIds: selected.package_ids,
        });
        const inserted = await client.query(
          `INSERT INTO assessment_sessions (
             session_id, learner_id, parent_profile_id, auth_user_id, assessment_role, grade, subject,
             status, session_version, selection_config, current_question_position, started_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,'in_progress',$8,$9::jsonb,0,NOW())
           RETURNING *`,
          [
            selected.session_id,
            learnerId,
            toInt(actor.parentProfile.id),
            actor.authUserId == null ? null : toInt(actor.authUserId),
            "baseline",
            grade,
            subject,
            selected.session_version,
            JSON.stringify(selectionConfig),
          ]
        );
        const sessionRow = inserted.rows[0];
        for (let index = 0; index < selected.public_items.length; index += 1) {
          const item = selected.public_items[index];
          const versionHash = itemVersionHash(item);
          await client.query(
            `INSERT INTO assessment_session_items (
               session_id, item_identity, assessment_item_id, package_id, source_question_id, source_bank,
               source_pointer, duplicate_key, display_order, question_type, item_version_hash, public_payload
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
            [
              sessionRow.id,
              item.item_identity,
              item.assessment_item_id,
              item.source_package_id,
              item.source_question_id,
              item.source_bank,
              item.source_pointer || null,
              item.duplicate_key,
              index,
              item.question_type,
              versionHash,
              JSON.stringify(item),
            ]
          );
          await client.query(
            `INSERT INTO assessment_item_exposures (
               learner_id, package_id, source_question_id, source_bank, item_identity, duplicate_key, assessment_session_id
             ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [learnerId, item.source_package_id, item.source_question_id, item.source_bank, item.item_identity, item.duplicate_key, sessionRow.id]
          );
        }
        const itemRows = await this.loadSessionItems(sessionRow.id, client);
        return sessionFromRows(sessionRow, itemRows, { resumed: false, childProfile: ownedChild.childProfile });
      });
    } catch (error) {
      if (error && error.code === "23505") {
        const existing = await this.getCurrentAssessmentSessionForLearner({
          learnerId: ownedChild.learnerId,
          parentProfileId: actor.parentProfile.id,
          grade,
          subject,
          assessmentRole: "baseline",
          childProfile: ownedChild.childProfile,
        });
        if (existing) return { ...existing, resumed: true };
      }
      throw error;
    }
  }

  async loadAuthorizedReassessmentPackages({ priorSessionInternalId }, client = this.pool) {
    const ids = new Set();
    const itemRows = await client.query(
      `SELECT DISTINCT package_id
         FROM assessment_session_items
        WHERE session_id = $1`,
      [priorSessionInternalId]
    );
    for (const row of itemRows.rows) if (row.package_id) ids.add(row.package_id);

    const evidenceRows = await client.query(
      `SELECT DISTINCT package_id
         FROM assessment_skill_evidence
        WHERE session_id = $1`,
      [priorSessionInternalId]
    );
    for (const row of evidenceRows.rows) if (row.package_id) ids.add(row.package_id);

    const recommendationRows = await client.query(
      `SELECT DISTINCT recommended_package_id
         FROM assessment_recommendations
        WHERE session_id = $1`,
      [priorSessionInternalId]
    );
    for (const row of recommendationRows.rows) if (row.recommended_package_id) ids.add(row.recommended_package_id);

    return [...ids].sort((a, b) => a.localeCompare(b));
  }

  async createPersistentReassessmentSession({ priorSessionId, actor, ownedChild, packageIds, itemsPerPackage }) {
    const requestedIds = toStableUnique(packageIds);
    try {
      return await withTransaction(this.pool, async (client) => {
        const priorResult = await client.query(
          `SELECT *
             FROM assessment_sessions
            WHERE session_id = $1
            FOR UPDATE`,
          [priorSessionId]
        );
        const priorRow = priorResult.rows[0];
        if (!priorRow) return { status: 404, error: "session_not_found" };
        if (Number(priorRow.parent_profile_id) !== Number(actor.parentProfile.id) || Number(priorRow.learner_id) !== Number(ownedChild.learnerId)) {
          return { status: 403, error: "forbidden" };
        }
        if (priorRow.status !== "completed") return { status: 409, error: "prior_session_must_be_completed" };

        const existing = await this.findInProgress({
          learnerId: priorRow.learner_id,
          grade: Number(priorRow.grade),
          subject: priorRow.subject,
          assessmentRole: "reassessment",
          priorSessionInternalId: priorRow.id,
        }, client);
        if (existing) {
          const itemRows = await this.loadSessionItems(existing.id, client);
          return { status: 200, session: sessionFromRows(existing, itemRows, { resumed: true, childProfile: ownedChild.childProfile }) };
        }

        const authorizedIds = await this.loadAuthorizedReassessmentPackages({ priorSessionInternalId: priorRow.id }, client);
        const authorized = new Set(authorizedIds);
        const unrelated = requestedIds.filter((id) => !authorized.has(id));
        if (unrelated.length) return { status: 400, error: "unrelated_reassessment_package_ids", unrelated_package_ids: unrelated };

        const exposureHistory = await this.loadLearnerExposureHistory({ learnerId: priorRow.learner_id }, client);
        const priorCompletedResult = await this.getCompletedAssessmentResult({ sessionId: priorSessionId, childProfile: ownedChild.childProfile }, client);
        const selected = createReassessmentSession(priorCompletedResult, {
          grade: Number(priorRow.grade),
          subject: priorRow.subject,
          package_ids: requestedIds,
          itemsPerPackage,
          all_prior_exposed_item_ids: exposureHistory.item_ids,
          all_prior_exposed_duplicate_keys: exposureHistory.duplicate_keys,
          session_id: this.createSessionId ? this.createSessionId() : undefined,
        });
        const selectionConfig = {
          itemsPerPackage,
          selection_summary: selected.selection_summary,
          package_ids: selected.package_ids,
          requested_package_ids: selected.requested_package_ids,
          insufficient_evidence: (selected.insufficient_evidence || []).map((entry) => ({
            ...entry,
            available_safe_item_count: Number(entry.available_safe_item_count ?? entry.safe_non_repeated_item_count ?? 0),
          })),
        };

        const inserted = await client.query(
          `INSERT INTO assessment_sessions (
             session_id, learner_id, parent_profile_id, auth_user_id, assessment_role, grade, subject,
             status, session_version, selection_config, current_question_position, prior_session_id, started_at
           ) VALUES ($1,$2,$3,$4,'reassessment',$5,$6,'in_progress',$7,$8::jsonb,0,$9,NOW())
           RETURNING *`,
          [
            selected.session_id,
            priorRow.learner_id,
            priorRow.parent_profile_id,
            priorRow.auth_user_id,
            Number(priorRow.grade),
            priorRow.subject,
            selected.session_version,
            JSON.stringify(selectionConfig),
            priorRow.id,
          ]
        );
        const sessionRow = inserted.rows[0];
        for (let index = 0; index < selected.public_items.length; index += 1) {
          const item = selected.public_items[index];
          const versionHash = itemVersionHash(item);
          await client.query(
            `INSERT INTO assessment_session_items (
               session_id, item_identity, assessment_item_id, package_id, source_question_id, source_bank,
               source_pointer, duplicate_key, display_order, question_type, item_version_hash, public_payload
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
            [
              sessionRow.id,
              item.item_identity,
              item.assessment_item_id,
              item.source_package_id,
              item.source_question_id,
              item.source_bank,
              item.source_pointer || null,
              item.duplicate_key,
              index,
              item.question_type,
              versionHash,
              JSON.stringify(item),
            ]
          );
          await client.query(
            `INSERT INTO assessment_item_exposures (
               learner_id, package_id, source_question_id, source_bank, item_identity, duplicate_key, assessment_session_id
             ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [priorRow.learner_id, item.source_package_id, item.source_question_id, item.source_bank, item.item_identity, item.duplicate_key, sessionRow.id]
          );
        }
        const itemRows = await this.loadSessionItems(sessionRow.id, client);
        return { status: 201, session: sessionFromRows(sessionRow, itemRows, { resumed: false, childProfile: ownedChild.childProfile }) };
      });
    } catch (error) {
      if (error && error.code === "23505") {
        const priorEntry = await this.getAssessmentSessionByPublicId({ sessionId: priorSessionId });
        if (priorEntry) {
          const existing = await this.getCurrentAssessmentSessionForLearner({
            learnerId: ownedChild.learnerId,
            parentProfileId: actor.parentProfile.id,
            grade: Number(priorEntry.session.grade),
            subject: priorEntry.session.subject,
            assessmentRole: "reassessment",
            childProfile: ownedChild.childProfile,
          });
          if (existing) return { status: 200, session: { ...existing, resumed: true } };
        }
        return { status: 409, error: "reassessment_create_conflict" };
      }
      throw error;
    }
  }

  async getAssessmentSessionByPublicId({ sessionId, childProfile = null }) {
    const sessionResult = await this.pool.query(`SELECT * FROM assessment_sessions WHERE session_id = $1 LIMIT 1`, [sessionId]);
    const row = sessionResult.rows[0];
    if (!row) return null;
    const itemRows = await this.loadSessionItems(row.id);
    const session = sessionFromRows(row, itemRows, { resumed: false, childProfile });
    return {
      session,
      ownership: {
        auth_user_id: row.auth_user_id,
        parent_profile_id: row.parent_profile_id,
        learner_id: row.learner_id,
      },
      internal_id: row.id,
    };
  }

  async getCurrentAssessmentSessionForLearner({ learnerId, parentProfileId, grade, subject, assessmentRole = null, childProfile = null }) {
    const params = [toInt(learnerId), toInt(parentProfileId)];
    const clauses = ["learner_id = $1", "parent_profile_id = $2", "status = 'in_progress'"];
    if (assessmentRole != null) {
      params.push(assessmentRole);
      clauses.push(`assessment_role = $${params.length}`);
    }
    if (grade != null) {
      params.push(grade);
      clauses.push(`grade = $${params.length}`);
    }
    if (subject != null) {
      params.push(subject);
      clauses.push(`subject = $${params.length}`);
    }
    const result = await this.pool.query(
      `SELECT * FROM assessment_sessions
        WHERE ${clauses.join(" AND ")}
        ORDER BY updated_at DESC, id DESC
        LIMIT 1`,
      params
    );
    const row = result.rows[0];
    if (!row) return null;
    const itemRows = await this.loadSessionItems(row.id);
    return sessionFromRows(row, itemRows, { resumed: true, childProfile });
  }

  async getLearnerAssessmentSummary(sessionRow, client = this.pool) {
    const itemRows = await this.loadSessionItems(sessionRow.id, client);
    const evidenceRows = await this.loadPersistedSkillEvidence(sessionRow.id, client);
    const recommendationResult = await client.query(
      `SELECT COUNT(*)::int AS count
         FROM assessment_recommendations
        WHERE session_id = $1`,
      [sessionRow.id]
    );
    const selectionConfig = sessionRow.selection_config || {};
    return {
      session_id: sessionRow.session_id,
      assessment_role: sessionRow.assessment_role,
      grade: Number(sessionRow.grade),
      subject: sessionRow.subject,
      status: sessionRow.status,
      created_at: sessionRow.created_at,
      updated_at: sessionRow.updated_at,
      completed_at: sessionRow.completed_at,
      current_question_position: Number(sessionRow.current_question_position || 0),
      package_ids: Array.isArray(selectionConfig.package_ids)
        ? [...selectionConfig.package_ids]
        : toStableUnique(itemRows.map((row) => row.package_id)),
      evidence_summary: evidenceRows.map((entry) => ({
        source_package_id: entry.source_package_id,
        valid_scored_responses: entry.valid_scored_responses,
        correct_responses: entry.correct_responses,
        incorrect_responses: entry.incorrect_responses,
        omitted_responses: entry.omitted_responses,
        not_scorable_responses: entry.not_scorable_responses,
        accuracy: entry.accuracy,
        provisional_label: entry.provisional_label,
      })),
      recommendation_count: Number(recommendationResult.rows[0]?.count || 0),
      ...(sessionRow.prior_session_id ? { prior_session_id_public_reference_if_safe: sessionRow.prior_session_public_id || null } : {}),
    };
  }

  async getLearnerAssessmentHistory({ learnerId, parentProfileId, grade = null, subject = null, status = null, assessmentRole = null, limit = 50 }) {
    const boundedLimit = Math.max(1, Math.min(50, Number.isInteger(Number(limit)) ? Number(limit) : 50));
    const params = [toInt(learnerId), toInt(parentProfileId)];
    const clauses = ["s.learner_id = $1", "s.parent_profile_id = $2"];
    if (grade != null) {
      params.push(grade);
      clauses.push(`s.grade = $${params.length}`);
    }
    if (subject != null) {
      params.push(subject);
      clauses.push(`s.subject = $${params.length}`);
    }
    if (status != null) {
      params.push(status);
      clauses.push(`s.status = $${params.length}`);
    }
    if (assessmentRole != null) {
      params.push(assessmentRole);
      clauses.push(`s.assessment_role = $${params.length}`);
    }
    params.push(boundedLimit);
    const result = await this.pool.query(
      `SELECT s.*, prior.session_id AS prior_session_public_id
         FROM assessment_sessions s
         LEFT JOIN assessment_sessions prior ON prior.id = s.prior_session_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY s.created_at DESC, s.id DESC
        LIMIT $${params.length}`,
      params
    );
    const history = [];
    for (const row of result.rows) history.push(await this.getLearnerAssessmentSummary(row, this.pool));
    return { sessions: history, limit: boundedLimit };
  }

  async updateAssessmentSessionPosition({ sessionId, parentProfileId, learnerId, currentQuestionPosition, childProfile = null }) {
    return withTransaction(this.pool, async (client) => {
      const sessionResult = await client.query(
        `SELECT * FROM assessment_sessions
          WHERE session_id = $1
          FOR UPDATE`,
        [sessionId]
      );
      const row = sessionResult.rows[0];
      if (!row) return { status: 404, error: "session_not_found" };
      if (Number(row.parent_profile_id) !== Number(parentProfileId) || Number(row.learner_id) !== Number(learnerId)) {
        return { status: 403, error: "forbidden" };
      }
      if (row.status !== "in_progress") return { status: 409, error: "session_not_in_progress" };
      const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM assessment_session_items WHERE session_id = $1`, [row.id]);
      const count = Number(countResult.rows[0]?.count || 0);
      if (!Number.isInteger(currentQuestionPosition) || currentQuestionPosition < 0 || currentQuestionPosition >= count) {
        return { status: 400, error: "invalid_current_question_position" };
      }
      const updated = await client.query(
        `UPDATE assessment_sessions
            SET current_question_position = $2,
                lock_version = lock_version + 1,
                updated_at = NOW()
          WHERE id = $1
          RETURNING *`,
        [row.id, currentQuestionPosition]
      );
      const itemRows = await this.loadSessionItems(row.id, client);
      return { status: 200, session: sessionFromRows(updated.rows[0], itemRows, { resumed: true, childProfile }) };
    });
  }


  loadCanonicalPackages({ grade, subject }) {
    const packages = loadSkillPackages({ grade, subject });
    const packagesById = new Map();
    for (const pkg of packages) packagesById.set(packageIdOf(pkg), pkg);
    return { packages, packagesById };
  }

  reconstructInternalScoringRecords(sessionRow, itemRows) {
    const { packages } = this.loadCanonicalPackages({ grade: Number(sessionRow.grade), subject: sessionRow.subject });
    const selected = selectAssessmentItems(packages, { baselineItems: [] });
    const publicByIdentity = new Map(selected.publicItems.map((item) => [item.item_identity, item]));
    const scoringByIdentity = new Map(selected.scoringRecords.map((record) => [record.item_identity, record]));
    const records = [];

    for (const row of itemRows) {
      if (!row.package_id) throw conflict("canonical_package_missing");
      const publicItem = publicByIdentity.get(row.item_identity);
      const scoringRecord = scoringByIdentity.get(row.item_identity);
      if (!publicItem || !scoringRecord) throw conflict("canonical_item_missing");
      if (publicItem.source_package_id !== row.package_id) throw conflict("canonical_package_mismatch");
      if (publicItem.source_bank !== row.source_bank) throw conflict("canonical_bank_mismatch");
      if (publicItem.source_question_id !== row.source_question_id) throw conflict("canonical_question_mismatch");
      if ((publicItem.source_pointer || null) !== (row.source_pointer || null)) throw conflict("canonical_source_pointer_mismatch");
      if (itemVersionHash(publicItem) !== row.item_version_hash) throw conflict("canonical_item_version_mismatch");
      if (!Object.prototype.hasOwnProperty.call(scoringRecord, "answer") || scoringRecord.answer == null || (typeof scoringRecord.answer === "string" && !scoringRecord.answer.trim()) || (Array.isArray(scoringRecord.answer) && scoringRecord.answer.length === 0)) {
        throw conflict("canonical_deterministic_answer_missing");
      }
      records.push({ ...scoringRecord, question_type: row.question_type });
    }
    return records;
  }

  async loadPersistedSkillEvidence(sessionInternalId, client = this.pool) {
    const result = await client.query(
      `SELECT *
         FROM assessment_skill_evidence
        WHERE session_id = $1
        ORDER BY package_id ASC`,
      [sessionInternalId]
    );
    return result.rows.map(evidenceFromRow);
  }

  async loadPersistedRecommendations(sessionRow, client = this.pool) {
    const rows = await client.query(
      `SELECT *
         FROM assessment_recommendations
        WHERE session_id = $1
        ORDER BY priority ASC, recommended_package_id ASC
        LIMIT 3`,
      [sessionRow.id]
    );
    const evidenceRows = await this.loadPersistedSkillEvidence(sessionRow.id, client);
    const evidenceByPackage = new Map(evidenceRows.map((entry) => [entry.source_package_id, entry]));
    const { packagesById } = this.loadCanonicalPackages({ grade: Number(sessionRow.grade), subject: sessionRow.subject });
    return rows.rows.map((row) => publicRecommendationFromRow(row, packagesById, evidenceByPackage));
  }

  async getCompletedAssessmentResult({ sessionId, childProfile = null }, client = this.pool) {
    const sessionResult = await client.query(`SELECT * FROM assessment_sessions WHERE session_id = $1 LIMIT 1`, [sessionId]);
    const sessionRow = sessionResult.rows[0];
    if (!sessionRow) return null;
    if (sessionRow.status !== "completed") return null;
    const itemRows = await this.loadSessionItems(sessionRow.id, client);
    const responsesResult = await client.query(
      `SELECT *
         FROM assessment_responses
        WHERE session_id = $1
        ORDER BY session_item_id ASC`,
      [sessionRow.id]
    );
    const itemById = new Map(itemRows.map((row) => [String(row.id), row]));
    const response_results = responsesResult.rows
      .slice()
      .sort((a, b) => Number(itemById.get(String(a.session_item_id))?.display_order || 0) - Number(itemById.get(String(b.session_item_id))?.display_order || 0))
      .map((row) => responseResultFromRow(row, itemById.get(String(row.session_item_id))));
    const skill_evidence = await this.loadPersistedSkillEvidence(sessionRow.id, client);
    const recommendations = await this.loadPersistedRecommendations(sessionRow, client);
    let skipped_recommendations = [];
    try {
      const { packages } = this.loadCanonicalPackages({ grade: Number(sessionRow.grade), subject: sessionRow.subject });
      skipped_recommendations = recommendSkillPackages({
        grade: Number(sessionRow.grade),
        subject: sessionRow.subject,
        packages,
        evidence: skill_evidence,
        completedPackageIds: [],
        previouslyRecommendedPackageIds: [],
      }).skipped;
    } catch (_) {
      skipped_recommendations = [];
    }
    const session = sessionFromRows(sessionRow, itemRows, { childProfile });
    return {
      session_id: sessionRow.session_id,
      assessment_role: sessionRow.assessment_role,
      grade: Number(sessionRow.grade),
      subject: sessionRow.subject,
      status: "completed",
      response_results,
      skill_evidence,
      recommendations,
      skipped_recommendations,
      exposure: {
        item_ids: toStableUnique(itemRows.map((row) => row.item_identity)),
        duplicate_keys: toStableUnique(itemRows.map((row) => row.duplicate_key)),
      },
      limitations: [...REQUIRED_LIMITATIONS],
      child_context: session.child_context,
    };
  }

  async submitPersistentAssessmentResponses({ sessionId, actor, ownedChild, responses }) {
    try {
      return await withTransaction(this.pool, async (client) => {
        const sessionResult = await client.query(
          `SELECT * FROM assessment_sessions
            WHERE session_id = $1
            FOR UPDATE`,
          [sessionId]
        );
        const sessionRow = sessionResult.rows[0];
        if (!sessionRow) return { status: 404, error: "session_not_found" };
        if (Number(sessionRow.parent_profile_id) !== Number(actor.parentProfile.id) || Number(sessionRow.learner_id) !== Number(ownedChild.learnerId)) {
          auditAssessmentEvent("assessment_mvp_completion_ownership_denied", { session_id: sessionId });
          return { status: 403, error: "forbidden" };
        }
        if (sessionRow.status !== "in_progress") {
          auditAssessmentEvent("assessment_mvp_completion_duplicate_rejected", { session_id: sessionId, status: sessionRow.status });
          return { status: 409, error: "session_already_completed" };
        }
        if (!sessionRow.assessment_role || sessionRow.grade == null || !sessionRow.subject) {
          return { status: 409, error: "server_owned_session_metadata_missing" };
        }

        const itemRows = await this.loadSessionItems(sessionRow.id, client);
        const submissions = normalizeSubmissionMap(responses, itemRows);
        let scoringRecords;
        try {
          scoringRecords = this.reconstructInternalScoringRecords(sessionRow, itemRows);
        } catch (error) {
          auditAssessmentEvent("assessment_mvp_completion_canonical_mismatch", { session_id: sessionId, reason: error.error || error.message });
          throw error;
        }

        let scored;
        try {
          scored = scoreResponses(scoringRecords, submissions);
        } catch (error) {
          auditAssessmentEvent("assessment_mvp_completion_scoring_rollback", { session_id: sessionId, reason: "score_responses_failed" });
          throw error;
        }
        const scoreByIdentity = new Map(scored.responses.map((result) => [result.item_identity, result]));
        const submissionByIdentity = new Map(submissions.map((submission) => [submission.item_identity, submittedValue(submission)]));
        for (const row of itemRows) {
          const score = scoreByIdentity.get(row.item_identity) || { status: "omitted", scored: false, reason_code: "omitted_response" };
          const learnerResponse = safeLearnerResponse(submissionByIdentity.get(row.item_identity));
          const omitted = score.status === "omitted";
          await client.query(
            `INSERT INTO assessment_responses (
               session_id, session_item_id, learner_response, normalized_response, response_status,
               scored, score_status, score_result, omitted, scoring_policy_version, submitted_at
             ) VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8::jsonb,$9,$10,NOW())`,
            [
              sessionRow.id,
              row.id,
              JSON.stringify(learnerResponse),
              score.normalized_response || null,
              omitted ? "omitted" : "submitted",
              Boolean(score.scored),
              score.status,
              JSON.stringify(publicSafeScoreResult(score)),
              omitted,
              SCORING_POLICY_VERSION,
            ]
          );
        }

        for (const evidence of scored.skillEvidence) {
          await client.query(
            `INSERT INTO assessment_skill_evidence (
               session_id, package_id, valid_response_count, correct_count, incorrect_count,
               omitted_count, not_scorable_count, accuracy, provisional_label, evidence_version
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              sessionRow.id,
              evidence.source_package_id,
              Number(evidence.valid_scored_responses || 0),
              Number(evidence.correct_responses || 0),
              Number(evidence.incorrect_responses || 0),
              Number(evidence.omitted_responses || 0),
              Number(evidence.not_scorable_responses || 0),
              evidence.accuracy == null ? null : evidence.accuracy,
              evidence.provisional_label,
              EVIDENCE_VERSION,
            ]
          );
        }

        const { packages, packagesById } = this.loadCanonicalPackages({ grade: Number(sessionRow.grade), subject: sessionRow.subject });
        const recommendationResult = recommendSkillPackages({
          grade: Number(sessionRow.grade),
          subject: sessionRow.subject,
          packages,
          evidence: scored.skillEvidence,
          completedPackageIds: [],
          previouslyRecommendedPackageIds: [],
        });
        for (const recommendation of recommendationResult.recommendations.slice(0, 3)) {
          if (!packagesById.has(recommendation.package_id)) throw conflict("recommendation_package_missing");
          await client.query(
            `INSERT INTO assessment_recommendations (
               session_id, learner_id, recommended_package_id, recommendation_type, reason_code, priority, status
             ) VALUES ($1,$2,$3,$4,$5,$6,'active')`,
            [sessionRow.id, sessionRow.learner_id, recommendation.package_id, recommendation.recommendation_type, recommendation.reason_code, Number(recommendation.priority)]
          );
        }

        await client.query(
          `UPDATE assessment_session_items
              SET answered_at = NOW()
            WHERE session_id = $1
              AND item_identity = ANY($2::text[])`,
          [sessionRow.id, submissions.filter((submission) => submittedValue(submission) !== undefined && submittedValue(submission) !== null && !(typeof submittedValue(submission) === "string" && submittedValue(submission).trim() === "")).map((submission) => submission.item_identity)]
        );

        const updated = await client.query(
          `UPDATE assessment_sessions
              SET status = 'completed', completed_at = NOW(), updated_at = NOW(), lock_version = lock_version + 1
            WHERE id = $1 AND status = 'in_progress' AND lock_version = $2
            RETURNING *`,
          [sessionRow.id, sessionRow.lock_version]
        );
        if (updated.rowCount !== 1) {
          auditAssessmentEvent("assessment_mvp_completion_concurrent_conflict", { session_id: sessionId });
          const err = new Error("concurrent completion conflict");
          err.status = 409;
          err.error = "concurrent_submission_conflict";
          throw err;
        }
        const result = await this.getCompletedAssessmentResult({ sessionId, childProfile: ownedChild.childProfile }, client);
        result.skipped_recommendations = recommendationResult.skipped;
        auditAssessmentEvent("assessment_mvp_completion_success", {
          session_id: sessionId,
          response_count: itemRows.length,
          evidence_count: scored.skillEvidence.length,
          recommendation_count: recommendationResult.recommendations.slice(0, 3).length,
        });
        return { status: 200, result };
      });
    } catch (error) {
      if (error && error.code === "23505") {
        auditAssessmentEvent("assessment_mvp_completion_concurrent_conflict", { session_id: sessionId, reason: "unique_violation" });
        return { status: 409, error: "concurrent_submission_conflict" };
      }
      if (error && error.status) return { status: error.status, error: error.error || "assessment_completion_failed", message: error.message, foreign_item_ids: error.foreign_item_ids };
      throw error;
    }
  }

  async markAssessmentItemDelivered({ sessionId, itemIdentity = null, displayOrder = null }) {
    const entry = await this.getAssessmentSessionByPublicId({ sessionId });
    if (!entry) return null;
    const params = [entry.internal_id];
    const clauses = ["session_id = $1", "delivered_at IS NULL"];
    if (itemIdentity) {
      params.push(itemIdentity);
      clauses.push(`item_identity = $${params.length}`);
    } else if (displayOrder != null) {
      params.push(displayOrder);
      clauses.push(`display_order = $${params.length}`);
    }
    await this.pool.query(`UPDATE assessment_session_items SET delivered_at = NOW() WHERE ${clauses.join(" AND ")}`, params);
    return true;
  }
}

module.exports = {
  AssessmentMvpPostgresStore,
  itemVersionHash,
  sessionFromRows,
};
