"use strict";

const { makeLearningNextSteps } = require("../assessment-mvp/makeLearningNextSteps");
const { loadSkillPackages, packageIdOf } = require("../assessment-mvp/loadSkillPackages");

function positiveId(value) {
  const id = String(value ?? "");
  return /^[1-9][0-9]*$/.test(id) ? id : null;
}

function displayNames(grade, subject) {
  const names = new Map();
  try {
    const packages = loadSkillPackages({ grade: Number(grade), subject });
    for (const pkg of packages) {
      const id = String(packageIdOf(pkg) || "");
      if (id) names.set(id, String(pkg.skill || pkg.title || pkg.name || id));
    }
  } catch (_) { /* older assessment content can be missing; use package ID */ }
  return names;
}

// Read-only parent/child-scoped summary. No raw learner answers or scoring keys.
async function buildDashboardAssessmentInsights(pool, { childId, parentProfileId } = {}) {
  const learnerId = positiveId(childId);
  const parentId = positiveId(parentProfileId);
  if (!learnerId || !parentId || !pool || typeof pool.query !== "function") {
    return { available: false, reason: "child_and_parent_required" };
  }

  const recent = await pool.query(
    `SELECT id, grade, subject
       FROM assessment_sessions
      WHERE learner_id = $1 AND parent_profile_id = $2 AND status = 'completed'
      ORDER BY completed_at DESC NULLS LAST, id DESC LIMIT 1`,
    [learnerId, parentId]
  );
  const session = recent.rows?.[0];
  if (!session) return { available: false, reason: "no_completed_assessment" };

  const names = displayNames(session.grade, session.subject);
  const [evidenceRows, recommendationRows] = await Promise.all([
    pool.query(
      `SELECT package_id, provisional_label, valid_response_count
         FROM assessment_skill_evidence WHERE session_id = $1 ORDER BY package_id ASC`,
      [session.id]
    ),
    pool.query(
      `SELECT recommended_package_id, recommendation_type
         FROM assessment_recommendations
        WHERE session_id = $1 AND status = 'active'
        ORDER BY priority ASC, recommended_package_id ASC LIMIT 3`,
      [session.id]
    ),
  ]);
  const skillEvidence = (evidenceRows.rows || []).map(row => ({
    source_package_id: row.package_id,
    skill: names.get(String(row.package_id)) || String(row.package_id),
    provisional_label: row.provisional_label,
    valid_scored_responses: Number(row.valid_response_count || 0),
  }));
  const recommendations = (recommendationRows.rows || []).map(row => {
    const packageId = String(row.recommended_package_id || "");
    return {
      package_id: packageId,
      skill: names.get(packageId) || packageId,
      recommendation_type: row.recommendation_type,
      practice_route: /^[A-Za-z0-9_-]+$/.test(packageId)
        ? "/skill-world/" + packageId + "/drill" : null,
    };
  });

  return {
    available: true,
    grade: Number(session.grade),
    subject: String(session.subject),
    ...makeLearningNextSteps({ skillEvidence, recommendations }),
  };
}

module.exports = { buildDashboardAssessmentInsights };
