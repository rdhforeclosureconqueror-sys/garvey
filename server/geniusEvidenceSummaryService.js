"use strict";

// This summary distinguishes curriculum opportunity from child-selected action.
// It is an instructional observation summary, never a diagnosis or innate-ability score.

const { GENIUS_DIMENSIONS } = require("../youth-development/content/curriculumGeniusMap");
const { buildDimensionSnapshot } = require("../youth-development/content/geniusLearningLanes");

const GENIUS_CODES = Object.freeze(Object.keys(GENIUS_DIMENSIONS));

function parseObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function normalizeCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return GENIUS_DIMENSIONS[code] ? code : "";
}

function normalizeCodes(value) {
  const list = Array.isArray(value) ? value : [];
  return [...new Set(list.map(normalizeCode).filter(Boolean))];
}

function asTimestamp(value) {
  const date = new Date(value || 0);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function activityEvidence(rows = []) {
  const opportunitiesByCode = Object.fromEntries(GENIUS_CODES.map((code) => [code, []]));
  const selectedByCode = Object.fromEntries(GENIUS_CODES.map((code) => [code, []]));
  const combinations = [];

  for (const row of rows) {
    const observation = parseObject(row.observation);
    const opportunityCodes = normalizeCodes(row.genius_dimension_codes);
    const selectedCode = normalizeCode(observation.genius_activation_choice);
    const activityId = String(row.activity_id || "").trim();
    const selectedAt = asTimestamp(observation.selected_at || row.created_at);

    for (const code of opportunityCodes) {
      opportunitiesByCode[code].push({ activity_id: activityId, occurred_at: asTimestamp(row.created_at) });
    }

    if (selectedCode) {
      selectedByCode[selectedCode].push({
        independence: "independent",
        context_id: activityId,
        observation_type: "child_optional_activation_move",
        occurred_at: selectedAt,
        activity_id: activityId,
      });
    }

    if (opportunityCodes.length) {
      combinations.push({
        activity_id: activityId,
        occurred_at: asTimestamp(row.created_at),
        academic_opportunity_codes: opportunityCodes,
        child_selected_activation_code: selectedCode || null,
      });
    }
  }

  return {
    dimensions: GENIUS_CODES.map((code) => {
      const snapshot = buildDimensionSnapshot(code, selectedByCode[code]);
      return {
        ...snapshot,
        opportunity_count: opportunitiesByCode[code].length,
        child_selected_activation_count: selectedByCode[code].length,
        evidence_basis: selectedByCode[code].length
          ? "Child-selected activation moves saved during learning."
          : opportunitiesByCode[code].length
            ? "The curriculum created learning opportunities here; more child-selected evidence is needed."
            : "No saved learning opportunity yet.",
      };
    }),
    active_together: combinations.slice(0, 24),
  };
}

async function buildGeniusEvidenceSummary(pool, { childId, parentProfileId = null } = {}) {
  const child = String(childId || "").trim();
  if (!child) return { ok: false, error: "child_id_required" };

  const params = [child];
  let parentFilter = "";
  if (parentProfileId != null && String(parentProfileId).trim()) {
    params.push(String(parentProfileId));
    parentFilter = " AND parent_profile_id::text=$2";
  }

  const result = await pool.query(
    `SELECT event_key, activity_id, genius_dimension_codes, observation, created_at
       FROM garvey_learning_activity_events
       WHERE child_id::text=$1
         AND event_type='learning_activity'${parentFilter}
       ORDER BY created_at DESC
       LIMIT 250`,
    params
  );

  const rows = result.rows || [];
  const summary = activityEvidence(rows);
  return {
    ok: true,
    child_id: child,
    empty_state: rows.length === 0,
    source_event_count: rows.length,
    interpretation_boundary: "This is current Garvey evidence from specific learning opportunities and child choices. It is not a fixed trait, diagnosis, ranking, or ability score.",
    ...summary,
  };
}

module.exports = {
  GENIUS_CODES,
  activityEvidence,
  buildGeniusEvidenceSummary,
};
