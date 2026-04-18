const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const { buildInsightLayer } = require("../../youth-development/tde/insightService");
const { createYouthDevelopmentTdeRouter } = require("../../server/youthDevelopmentTdeRoutes");
const { createYouthDevelopmentIntakeRouter } = require("../../server/youthDevelopmentIntakeRoutes");
const { createYouthDevelopmentRouter } = require("../../server/youthDevelopmentRoutes");

function buildRichSnapshot(childId = "child-phase17") {
  return {
    enrollment: { child_id: childId, current_week: 14 },
    intervention_sessions: [
      {
        session_id: "sess-1",
        completed_at: "2026-04-10T10:00:00.000Z",
        intervention_signal_evidence: [
          { evidence_id: "isl-1", trait_code: "SR", value: 4, value_max: 5, trace_ref: "trace-isl-1", source_id: "session:sess-1" },
          { evidence_id: "isl-2", trait_code: "PS", value: 2, value_max: 5, trace_ref: "trace-isl-2", source_id: "session:sess-1" },
        ],
      },
    ],
    development_checkins: [
      {
        checkin_id: "check-1",
        completed_at: "2026-04-11T10:00:00.000Z",
        evidence_map: [
          { evidence_id: "dc-1", trait_code: "SR", value: 3, value_max: 4, source_actor: "child", trace_ref: "trace-dc-1", source_id: "child:c1" },
          { evidence_id: "dc-2", trait_code: "SR", value: 2, value_max: 4, source_actor: "parent", trace_ref: "trace-dc-2", source_id: "parent:p1" },
          { evidence_id: "dc-3", trait_code: "DE", value: 4, value_max: 4, source_actor: "child", trace_ref: "trace-dc-3", source_id: "child:c1" },
        ],
      },
    ],
    progress_records: [
      {
        progress_id: "prog-1",
        completed_at: "2026-04-12T10:00:00.000Z",
        trait_signal_summary: { SR: 0.76, PS: 0.44, DE: 0.81 },
      },
    ],
    environment_hooks: [
      {
        event_id: "env-1",
        normalized_value: 0.35,
        trait_code: "SR",
        trace_ref: "trace-env-1",
        source_ref: "home-routine",
        timestamp: "2026-04-13T10:00:00.000Z",
      },
    ],
  };
}

function mountApp(repository) {
  const app = express();
  app.use(express.json());
  app.use("/api/youth-development/tde", createYouthDevelopmentTdeRouter({ repository }));
  app.use("/api/youth-development/intake", createYouthDevelopmentIntakeRouter());
  app.use(createYouthDevelopmentRouter());
  const server = app.listen(0);
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("phase17 deterministic insight generation and traceability", () => {
  const snapshot = buildRichSnapshot();
  const one = buildInsightLayer(snapshot, { child_id: "child-phase17" });
  const two = buildInsightLayer(snapshot, { child_id: "child-phase17" });

  assert.deepEqual(one, two);
  assert.equal(one.pillar_insights.length, 7);
  assert.equal(one.cross_source_insight_summary.total_signals > 0, true);
  const sr = one.pillar_insights.find((entry) => entry.pillar_code === "SR");
  assert.equal(sr.child_pattern.traceability.length > 0, true);
  assert.equal(sr.consistency_adherence_pattern.source_breakdown.length > 0, true);
});

test("phase17 sparse data downgrades confidence and surfaces missing contracts", () => {
  const sparse = buildInsightLayer({
    enrollment: { child_id: "child-sparse" },
    intervention_sessions: [],
    development_checkins: [],
    progress_records: [],
    environment_hooks: [],
  }, { child_id: "child-sparse" });

  assert.equal(sparse.confidence_context.confidence_label, "low");
  assert.equal(sparse.confidence_context.sparse_data, true);
  assert.equal(sparse.contracts_status, "incomplete");
  assert.equal(sparse.missing_contracts.includes("environment_signals_missing"), true);
});

test("phase17 environment-vs-child separation remains explicit", () => {
  const snapshot = buildRichSnapshot("child-separation");
  const insights = buildInsightLayer(snapshot, { child_id: "child-separation" });
  const sr = insights.pillar_insights.find((entry) => entry.pillar_code === "SR");

  assert.equal(Boolean(sr.child_pattern.summary), true);
  assert.equal(Boolean(sr.environment_pattern.summary), true);
  assert.equal(sr.child_pattern.rule_path.includes("child_pattern"), true);
  assert.equal(sr.environment_pattern.rule_path.includes("environment_pattern"), true);
});

test("phase17 additive route safety and live youth v1 non-regression", async () => {
  process.env.TDE_EXTENSION_MODE = "on";
  const childId = "child-phase17-route";
  const repository = {
    getProgramSnapshot: async () => buildRichSnapshot(childId),
  };
  const app = mountApp(repository);

  try {
    const insightsRes = await fetch(`${app.baseUrl}/api/youth-development/tde/insights/${childId}`);
    assert.equal(insightsRes.status, 200);
    const payload = await insightsRes.json();
    assert.equal(payload.ok, true);
    assert.equal(payload.deterministic, true);

    const intakeRes = await fetch(`${app.baseUrl}/api/youth-development/intake/contracts/trait-mapping`);
    assert.equal(intakeRes.status, 200);

    const assessRes = await fetch(`${app.baseUrl}/api/youth-development/assess`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ answers: [] }),
    });
    assert.equal(assessRes.status, 200);
  } finally {
    delete process.env.TDE_EXTENSION_MODE;
    await app.close();
  }
});
