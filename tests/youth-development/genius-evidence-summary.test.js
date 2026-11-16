const test = require("node:test");
const assert = require("node:assert/strict");
const { activityEvidence, buildGeniusEvidenceSummary } = require("../server/geniusEvidenceSummaryService");

test("Genius summary keeps curriculum opportunity separate from child-selected evidence", () => {
  const out = activityEvidence([{
    activity_id: "G5M_FR_001",
    genius_dimension_codes: ["SR", "RS", "FB"],
    observation: { genius_activation_choice: "CQ", selected_at: "2026-11-16T16:00:00.000Z" },
    created_at: "2026-11-16T16:00:00.000Z",
  }]);

  const byCode = Object.fromEntries(out.dimensions.map((dimension) => [dimension.genius_code, dimension]));
  assert.equal(byCode.SR.opportunity_count, 1);
  assert.equal(byCode.SR.child_selected_activation_count, 0);
  assert.equal(byCode.SR.evidence_level, "not_yet_assessed");
  assert.equal(byCode.CQ.opportunity_count, 0);
  assert.equal(byCode.CQ.child_selected_activation_count, 1);
  assert.equal(byCode.CQ.evidence_level, "more_evidence_needed");
  assert.deepEqual(out.active_together[0].academic_opportunity_codes, ["SR", "RS", "FB"]);
  assert.equal(out.active_together[0].child_selected_activation_code, "CQ");
});

test("Genius summary returns every area without invented rankings", async () => {
  const pool = {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      return { rows: [] };
    },
  };
  const out = await buildGeniusEvidenceSummary(pool, { childId: "child-1", parentProfileId: "parent-1" });
  assert.equal(out.ok, true);
  assert.equal(out.empty_state, true);
  assert.equal(out.dimensions.length, 7);
  assert.equal(out.dimensions.every((dimension) => dimension.evidence_level === "not_yet_assessed"), true);
  assert.equal(pool.calls[0].sql.includes("parent_profile_id::text=$2"), true);
  assert.deepEqual(pool.calls[0].params, ["child-1", "parent-1"]);
});
