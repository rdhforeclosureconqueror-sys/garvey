"use strict";

const crypto = require("crypto");
const { createAssessmentSession, publicAssessmentSessionView } = require("../assessment-mvp/createAssessmentSession");
const { stableStringify } = require("../assessment-mvp/selectAssessmentItems");
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

  async findInProgress({ learnerId, grade, subject, assessmentRole = "baseline" }, client = this.pool) {
    const result = await client.query(
      `SELECT *
         FROM assessment_sessions
        WHERE learner_id = $1
          AND grade = $2
          AND subject = $3
          AND assessment_role = $4
          AND status = 'in_progress'
        ORDER BY updated_at DESC, id DESC
        LIMIT 1`,
      [toInt(learnerId), grade, subject, assessmentRole]
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

  async getCurrentAssessmentSessionForLearner({ learnerId, parentProfileId, grade, subject, assessmentRole = "baseline", childProfile = null }) {
    const params = [toInt(learnerId), toInt(parentProfileId), assessmentRole];
    const clauses = ["learner_id = $1", "parent_profile_id = $2", "assessment_role = $3", "status = 'in_progress'"];
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
