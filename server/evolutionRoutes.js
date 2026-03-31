"use strict";

const express = require("express");

const GROWTH_BOARD_KEY = "growth_board";
const GROWTH_BOARD_NAME = "Growth Board";
const EVOLUTION_PHASE = "EVOLUTION";
const GROWTH_COLUMNS = [
  { name: "Ideas", position: 1 },
  { name: "Testing", position: 2 },
  { name: "Implementing", position: 3 },
  { name: "Completed", position: 4 },
  { name: "Teaching", position: 5 },
];
const CARD_TYPES = ["experiment", "improvement", "launch_gate", "handoff", "teach_forward"];

function normalizeText(value) {
  return String(value || "").trim();
}

function requireTenant(req, res) {
  const tenant = normalizeText(req.query?.tenant || req.body?.tenant);
  if (!tenant) {
    res.status(400).json({ error: "tenant is required" });
    return null;
  }
  return tenant;
}

async function ensureJourneyRecord(pool, tenantId, tenantSlug) {
  await pool.query(
    `INSERT INTO foundation_journeys (
      tenant_id, business_id, intake_snapshot, value_assets, deliverables, journey
    )
    VALUES ($1,$2,'{}'::jsonb,'[]'::jsonb,'[]'::jsonb,$3::jsonb)
    ON CONFLICT (tenant_id) DO NOTHING`,
    [
      tenantId,
      `biz_${normalizeText(tenantSlug).replace(/[^a-z0-9]+/gi, "-") || "tenant"}`,
      JSON.stringify({ phase: "foundation", status: "initialized", events: [] }),
    ]
  );
}

async function appendEvolutionJourneyEvent(pool, tenantId, eventType, payload = {}) {
  await pool.query(
    `UPDATE foundation_journeys
     SET journey = jsonb_set(
       COALESCE(journey, '{}'::jsonb),
       '{events}',
       COALESCE(journey->'events', '[]'::jsonb) || jsonb_build_array(
         jsonb_build_object(
           'phase', 'evolution',
           'event_type', $2,
           'timestamp', NOW(),
           'payload', $3::jsonb
         )
       ),
       true
     ),
     updated_at = NOW()
     WHERE tenant_id=$1`,
    [tenantId, eventType, JSON.stringify(payload || {})]
  );
}

async function ensureGrowthBoard(pool, tenantId) {
  const boardRes = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,$3)
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET name=$3, updated_at=NOW()
     RETURNING *`,
    [tenantId, GROWTH_BOARD_KEY, GROWTH_BOARD_NAME]
  );
  const board = boardRes.rows[0];

  const existingCols = await pool.query(
    `SELECT id, name, position FROM kanban_columns WHERE board_id=$1 ORDER BY position ASC`,
    [board.id]
  );
  const byName = new Map(existingCols.rows.map((row) => [String(row.name || "").toLowerCase(), row]));

  for (const col of GROWTH_COLUMNS) {
    if (byName.has(col.name.toLowerCase())) continue;
    await pool.query(
      `INSERT INTO kanban_columns (board_id, phase, name, position)
       VALUES ($1,$2,$3,$4)`,
      [board.id, EVOLUTION_PHASE, col.name, col.position]
    );
  }

  const refreshedCols = await pool.query(
    `SELECT id, board_id, phase, name, position FROM kanban_columns WHERE board_id=$1 ORDER BY position ASC`,
    [board.id]
  );
  return { board, columns: refreshedCols.rows };
}

async function launchState(pool, tenantId) {
  const result = await pool.query(
    `SELECT launch_state, marketing_ready, launch_decision, decided_at
     FROM evaluation_records
     WHERE tenant_id=$1
     ORDER BY id DESC
     LIMIT 1`,
    [tenantId]
  );
  const row = result.rows[0] || {};
  return {
    launch_state: row.launch_state || "not_evaluated",
    marketing_ready: Boolean(row.marketing_ready),
    launch_decision: normalizeText(row.launch_decision) || "pending",
    decided_at: row.decided_at || null,
  };
}

function evolutionRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/initialize", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);

      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const { board, columns } = await ensureGrowthBoard(pool, tenant.id);
      await appendEvolutionJourneyEvent(pool, tenant.id, "evolution_initialized", { board_id: board.id });

      return res.json({
        success: true,
        phase: 7,
        phase_name: "Evaluation, Launch & Evolution",
        tenant: tenant.slug,
        board,
        columns,
        card_types: CARD_TYPES,
        gadgets: [
          "launch evaluator",
          "handoff builder",
          "idea tracker",
          "knowledge base",
          "daily content engine",
        ],
        data_objects: ["evaluation_records", "yield_records", "improvement_records", "knowledge_entries"],
      });
    } catch (err) {
      console.error("evolution_initialize_failed", err);
      return res.status(500).json({ error: "evolution initialize failed" });
    }
  });

  router.post("/evaluate", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const score = Math.max(0, Math.min(100, Number(req.body?.score || 0)));
      const marketingReady = req.body?.marketing_ready === undefined ? score >= 75 : Boolean(req.body?.marketing_ready);
      const launchDecision = normalizeText(req.body?.launch_decision) || (marketingReady ? "go" : "hold");
      const notes = normalizeText(req.body?.notes);

      const inserted = await pool.query(
        `INSERT INTO evaluation_records (
          tenant_id, score, marketing_ready, launch_decision, launch_state, notes, metadata, decided_at
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW())
        RETURNING *`,
        [tenant.id, score, marketingReady, launchDecision, marketingReady ? "ready" : "not_ready", notes, JSON.stringify(req.body?.metadata || {})]
      );

      await appendEvolutionJourneyEvent(pool, tenant.id, "evaluation_run", {
        evaluation_id: inserted.rows[0].id,
        launch_decision: launchDecision,
        marketing_ready: marketingReady,
        score,
      });
      await appendEvolutionJourneyEvent(pool, tenant.id, "marketing_ready_flag_set", {
        evaluation_id: inserted.rows[0].id,
        marketing_ready: marketingReady,
      });
      await appendEvolutionJourneyEvent(pool, tenant.id, "launch_gate_checked", {
        evaluation_id: inserted.rows[0].id,
        launch_decision: launchDecision,
        launch_state: inserted.rows[0].launch_state,
      });
      if (marketingReady && launchDecision.toLowerCase() === "go") {
        await appendEvolutionJourneyEvent(pool, tenant.id, "launch_completed", {
          evaluation_id: inserted.rows[0].id,
          launch_decision: launchDecision,
        });
      }

      return res.json({ success: true, evaluation: inserted.rows[0] });
    } catch (err) {
      console.error("evolution_evaluate_failed", err);
      return res.status(500).json({ error: "evaluation failed" });
    }
  });

  router.post("/yield", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);

      const inserted = await pool.query(
        `INSERT INTO yield_records (tenant_id, handoff_to, handoff_packet, status, metadata)
         VALUES ($1,$2,$3,$4,$5::jsonb)
         RETURNING *`,
        [
          tenant.id,
          normalizeText(req.body?.handoff_to) || "operator",
          req.body?.handoff_packet || {},
          normalizeText(req.body?.status) || "prepared",
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendEvolutionJourneyEvent(pool, tenant.id, "handoff_created", { yield_id: inserted.rows[0].id });
      return res.json({ success: true, yield: inserted.rows[0] });
    } catch (err) {
      console.error("evolution_yield_failed", err);
      return res.status(500).json({ error: "yield handoff failed" });
    }
  });

  router.post("/improvements", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const title = normalizeText(req.body?.title) || "Improvement";
      const status = normalizeText(req.body?.status) || "logged";
      const kind = normalizeText(req.body?.type) || "improvement";

      const inserted = await pool.query(
        `INSERT INTO improvement_records (tenant_id, title, details, status, record_type, impact_score, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         RETURNING *`,
        [
          tenant.id,
          title,
          normalizeText(req.body?.details),
          status,
          kind,
          Number(req.body?.impact_score || 0),
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendEvolutionJourneyEvent(pool, tenant.id, "improvement_logged", {
        improvement_id: inserted.rows[0].id,
        type: kind,
      });

      return res.json({ success: true, improvement: inserted.rows[0] });
    } catch (err) {
      console.error("evolution_improvement_failed", err);
      return res.status(500).json({ error: "improvement logging failed" });
    }
  });

  router.post("/knowledge", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const title = normalizeText(req.body?.title) || "Knowledge Entry";
      const body = normalizeText(req.body?.body);
      const topic = normalizeText(req.body?.topic) || "general";

      const inserted = await pool.query(
        `INSERT INTO knowledge_entries (tenant_id, title, body, topic, source, metadata)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         RETURNING *`,
        [
          tenant.id,
          title,
          body,
          topic,
          normalizeText(req.body?.source) || "system",
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendEvolutionJourneyEvent(pool, tenant.id, "knowledge_entry_created", { knowledge_id: inserted.rows[0].id });
      return res.json({ success: true, knowledge: inserted.rows[0] });
    } catch (err) {
      console.error("evolution_knowledge_failed", err);
      return res.status(500).json({ error: "knowledge capture failed" });
    }
  });

  router.post("/daily-content/rotate", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);

      const content = {
        title: normalizeText(req.body?.title) || "Daily Growth Insight",
        message: normalizeText(req.body?.message) || "Capture one improvement and one experiment today.",
        theme: normalizeText(req.body?.theme) || "evolution",
      };

      const inserted = await pool.query(
        `INSERT INTO knowledge_entries (tenant_id, title, body, topic, source, metadata)
         VALUES ($1,$2,$3,'daily_content','daily_content_engine',$4::jsonb)
         RETURNING *`,
        [tenant.id, content.title, content.message, JSON.stringify({ theme: content.theme, rotated_at: new Date().toISOString() })]
      );

      await appendEvolutionJourneyEvent(pool, tenant.id, "daily_content_generated", { knowledge_id: inserted.rows[0].id });
      return res.json({ success: true, content, entry: inserted.rows[0] });
    } catch (err) {
      console.error("evolution_daily_content_failed", err);
      return res.status(500).json({ error: "daily content rotation failed" });
    }
  });

  router.get("/state", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);

      const [evaluations, yields, improvements, knowledge, launch] = await Promise.all([
        pool.query(`SELECT * FROM evaluation_records WHERE tenant_id=$1 ORDER BY id DESC LIMIT 20`, [tenant.id]),
        pool.query(`SELECT * FROM yield_records WHERE tenant_id=$1 ORDER BY id DESC LIMIT 20`, [tenant.id]),
        pool.query(`SELECT * FROM improvement_records WHERE tenant_id=$1 ORDER BY id DESC LIMIT 50`, [tenant.id]),
        pool.query(`SELECT * FROM knowledge_entries WHERE tenant_id=$1 ORDER BY id DESC LIMIT 50`, [tenant.id]),
        launchState(pool, tenant.id),
      ]);

      return res.json({
        success: true,
        tenant: tenant.slug,
        launch,
        evaluations: evaluations.rows,
        yields: yields.rows,
        improvements: improvements.rows,
        knowledge: knowledge.rows,
      });
    } catch (err) {
      console.error("evolution_state_failed", err);
      return res.status(500).json({ error: "evolution state failed" });
    }
  });

  router.get("/verify", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);

      const [evaluationCount, launchDecisionCount, improvementCount] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM evaluation_records WHERE tenant_id=$1`, [tenant.id]),
        pool.query(`SELECT COUNT(*)::int AS total FROM evaluation_records WHERE tenant_id=$1 AND launch_decision IS NOT NULL AND launch_decision <> ''`, [tenant.id]),
        pool.query(`SELECT COUNT(*)::int AS total FROM improvement_records WHERE tenant_id=$1`, [tenant.id]),
      ]);

      const checks = {
        evaluation_possible: evaluationCount.rows[0].total > 0,
        launch_decision_made: launchDecisionCount.rows[0].total > 0,
        improvement_logged: improvementCount.rows[0].total > 0,
      };

      return res.json({
        success: true,
        tenant: tenant.slug,
        phase: 7,
        checks,
        verification: {
          evaluation_runs: checks.evaluation_possible,
          launch_state_changes: checks.launch_decision_made,
          improvements_recorded: checks.improvement_logged,
        },
      });
    } catch (err) {
      console.error("evolution_verify_failed", err);
      return res.status(500).json({ error: "evolution verification failed" });
    }
  });

  return router;
}

module.exports = evolutionRoutes;
