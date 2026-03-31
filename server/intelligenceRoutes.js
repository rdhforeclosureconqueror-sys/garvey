"use strict";

const express = require("express");

const INTELLIGENCE_BOARD_KEY = "metrics_board";
const INTELLIGENCE_COLUMNS = [
  { name: "Defined", position: 1 },
  { name: "Tracking", position: 2 },
  { name: "Below Target", position: 3 },
  { name: "Optimized", position: 4 },
];
const INTELLIGENCE_CARD_TYPES = ["kpi", "readiness_scorecard", "gap_fix"];
const GAP_PRIORITY = ["plan", "entity", "ein", "website", "financials"];
const DELIVERABLE_NAMES = ["Business Plan", "Website", "Funding Packet", "Owner Checklist"];

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

function clampPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function weightFlag(value, weight) {
  return normalizeText(value).toLowerCase() ? weight : 0;
}

function readinessFromSnapshot(snapshot = {}) {
  const weighted = {
    plan: weightFlag(snapshot.plan, 30),
    entity: weightFlag(snapshot.entity, 10),
    ein: weightFlag(snapshot.ein, 10),
    website: weightFlag(snapshot.website, 15),
  };
  const achieved = Object.values(weighted).reduce((acc, value) => acc + value, 0);
  const maxScore = 65;
  const normalized = clampPercent((achieved / maxScore) * 100);
  return { weighted, achieved, max_score: maxScore, readiness_score: normalized };
}

function detectGaps(snapshot = {}) {
  return GAP_PRIORITY
    .filter((key) => !normalizeText(snapshot[key]))
    .map((key, idx) => ({
      gap_key: key,
      priority: idx + 1,
      status: "open",
      note: `${key.toUpperCase()} missing`,
    }));
}

function nextBestAction(gaps = []) {
  const highest = (gaps || []).sort((a, b) => a.priority - b.priority)[0];
  if (!highest) {
    return {
      action_key: "optimize_kpis",
      title: "Optimize active KPIs",
      description: "No critical readiness gaps detected. Improve KPI targets and cadence.",
    };
  }
  return {
    action_key: `fix_${highest.gap_key}`,
    title: `Fix ${highest.gap_key.toUpperCase()} gap`,
    description: `Complete ${highest.gap_key.toUpperCase()} setup before moving to next priority gap.`,
  };
}

function buildBusinessId(tenantSlug) {
  const clean = String(tenantSlug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "business";
  return `biz_${clean}_${Date.now()}`;
}

async function ensureJourneyRecord(pool, tenantId, tenantSlug) {
  const deliverables = DELIVERABLE_NAMES.map((name) => ({ name, status: "pending" }));
  const valueAssets = [
    { key: "offer_statement", status: "baseline" },
    { key: "proof_points", status: "baseline" },
    { key: "positioning_summary", status: "baseline" },
  ];
  await pool.query(
    `INSERT INTO foundation_journeys (
      tenant_id, business_id, intake_snapshot, value_assets, deliverables, journey
    )
    VALUES ($1,$2,'{}'::jsonb,$3::jsonb,$4::jsonb,$5::jsonb)
    ON CONFLICT (tenant_id) DO NOTHING`,
    [
      tenantId,
      buildBusinessId(tenantSlug),
      JSON.stringify(valueAssets),
      JSON.stringify(deliverables),
      JSON.stringify({
        phase: "foundation",
        status: "initialized",
        started_at: new Date().toISOString(),
        events: [],
      }),
    ]
  );
}

async function appendIntelligenceJourneyEvent(pool, tenantId, eventType, payload = {}) {
  await pool.query(
    `UPDATE foundation_journeys
     SET journey = jsonb_set(
       COALESCE(journey, '{}'::jsonb),
       '{events}',
       COALESCE(journey->'events', '[]'::jsonb) || jsonb_build_array(
         jsonb_build_object(
           'phase', 'intelligence',
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

async function ensureMetricsBoard(pool, tenantId) {
  const boardRes = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,'Metrics Board')
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET name='Metrics Board', updated_at=NOW()
     RETURNING *`,
    [tenantId, INTELLIGENCE_BOARD_KEY]
  );
  const board = boardRes.rows[0];

  const existingCols = await pool.query(
    `SELECT id, name, position
     FROM kanban_columns
     WHERE board_id=$1
     ORDER BY position ASC`,
    [board.id]
  );
  const byName = new Map(existingCols.rows.map((row) => [String(row.name || "").toLowerCase(), row]));
  for (const col of INTELLIGENCE_COLUMNS) {
    if (byName.has(col.name.toLowerCase())) continue;
    await pool.query(
      `INSERT INTO kanban_columns (board_id, phase, name, position)
       VALUES ($1,'INTELLIGENCE',$2,$3)`,
      [board.id, col.name, col.position]
    );
  }

  const refreshed = await pool.query(
    `SELECT id, board_id, phase, name, position
     FROM kanban_columns
     WHERE board_id=$1
     ORDER BY position ASC`,
    [board.id]
  );
  return { board, columns: refreshed.rows };
}

async function ensureIntelligenceCards(pool, tenantId, boardId, columns) {
  const definedColumn = columns.find((col) => String(col.name || "").toLowerCase() === "defined");
  if (!definedColumn) return [];

  const existing = await pool.query(
    `SELECT * FROM intelligence_cards WHERE tenant_id=$1 ORDER BY id ASC`,
    [tenantId]
  );
  const byType = new Map(existing.rows.map((row) => [row.card_type, row]));

  for (const type of INTELLIGENCE_CARD_TYPES) {
    if (byType.has(type)) continue;
    const createdKanban = await pool.query(
      `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by)
       VALUES (
         $1,'INTELLIGENCE',$2,$3,'','normal',
         COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND column_id=$2),1),
         'system'
       )
       RETURNING id`,
      [boardId, definedColumn.id, type.replace("_", " ").toUpperCase()]
    );
    await pool.query(
      `INSERT INTO intelligence_cards (
        tenant_id, board_id, kanban_card_id, card_type, title, content, column_name, status
      )
      VALUES ($1,$2,$3,$4,$5,'','Defined','Defined')`,
      [tenantId, boardId, createdKanban.rows[0].id, type, type.replace("_", " ").toUpperCase()]
    );
  }

  const cards = await pool.query(
    `SELECT ic.*, kc.column_id, kc.position
     FROM intelligence_cards ic
     LEFT JOIN kanban_cards kc ON kc.id=ic.kanban_card_id
     WHERE ic.tenant_id=$1
     ORDER BY ic.id ASC`,
    [tenantId]
  );
  return cards.rows;
}

function intelligenceRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/initialize", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const { board, columns } = await ensureMetricsBoard(pool, tenant.id);
      const cards = await ensureIntelligenceCards(pool, tenant.id, board.id, columns);
      await appendIntelligenceJourneyEvent(pool, tenant.id, "intelligence_initialized", {
        board_id: board.id,
      });
      return res.json({
        success: true,
        phase: 4,
        phase_name: "Intelligence",
        tenant: tenant.slug,
        board,
        columns,
        cards,
        gadgets: ["KPI dashboard", "readiness engine widget", "gap-to-task generator"],
      });
    } catch (err) {
      console.error("intelligence_initialize_failed", err);
      return res.status(500).json({ error: "intelligence initialize failed" });
    }
  });

  router.post("/kpis", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const name = normalizeText(req.body?.name);
      if (!name) return res.status(400).json({ error: "name is required" });

      const created = await pool.query(
        `INSERT INTO intelligence_kpis (tenant_id, name, definition, target_value, current_value, unit, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          tenant.id,
          name,
          normalizeText(req.body?.definition),
          Number(req.body?.target_value) || 0,
          Number(req.body?.current_value) || 0,
          normalizeText(req.body?.unit),
          normalizeText(req.body?.status) || "Defined",
        ]
      );
      await appendIntelligenceJourneyEvent(pool, tenant.id, "kpi_created", {
        kpi_id: created.rows[0].id,
        name: created.rows[0].name,
      });
      return res.json({ success: true, kpi: created.rows[0] });
    } catch (err) {
      console.error("intelligence_kpi_create_failed", err);
      return res.status(500).json({ error: "intelligence kpi create failed" });
    }
  });

  router.post("/score", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const snapshot = req.body?.snapshot || {};
      const score = readinessFromSnapshot(snapshot);

      const saved = await pool.query(
        `INSERT INTO readiness_scores (tenant_id, weighted_breakdown, achieved_points, max_points, readiness_score, metadata)
         VALUES ($1,$2::jsonb,$3,$4,$5,$6::jsonb)
         RETURNING *`,
        [tenant.id, JSON.stringify(score.weighted), score.achieved, score.max_score, score.readiness_score, JSON.stringify(snapshot)]
      );
      await appendIntelligenceJourneyEvent(pool, tenant.id, "readiness_scored", {
        readiness_score_id: saved.rows[0].id,
        readiness_score: saved.rows[0].readiness_score,
        achieved_points: saved.rows[0].achieved_points,
        max_points: saved.rows[0].max_points,
      });
      return res.json({ success: true, readiness: saved.rows[0] });
    } catch (err) {
      console.error("intelligence_score_failed", err);
      return res.status(500).json({ error: "intelligence score failed" });
    }
  });

  router.post("/gaps/detect", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const snapshot = req.body?.snapshot || {};
      const gaps = detectGaps(snapshot);

      await pool.query(`DELETE FROM gap_records WHERE tenant_id=$1 AND status='open'`, [tenant.id]);
      for (const gap of gaps) {
        const createdGap = await pool.query(
          `INSERT INTO gap_records (tenant_id, gap_key, priority, status, note, metadata)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb)
           RETURNING id`,
          [tenant.id, gap.gap_key, gap.priority, gap.status, gap.note, JSON.stringify(snapshot)]
        );
        await appendIntelligenceJourneyEvent(pool, tenant.id, "gap_detected", {
          gap_key: gap.gap_key,
          priority: gap.priority,
          gap_record_id: createdGap.rows?.[0]?.id || null,
        });
      }
      if (gaps.length === 0) {
        await appendIntelligenceJourneyEvent(pool, tenant.id, "gap_detected", {
          gap_key: null,
          priority: null,
          gap_record_id: null,
        });
      }

      const action = nextBestAction(gaps);
      const createdAction = await pool.query(
        `INSERT INTO recommended_actions (tenant_id, action_key, title, description, source, metadata)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         RETURNING *`,
        [tenant.id, action.action_key, action.title, action.description, "gap-engine", JSON.stringify({ gaps })]
      );
      await appendIntelligenceJourneyEvent(pool, tenant.id, "recommended_action_created", {
        action_id: createdAction.rows[0].id,
        action_key: createdAction.rows[0].action_key,
      });

      return res.json({ success: true, gaps, next_best_action: createdAction.rows[0] });
    } catch (err) {
      console.error("intelligence_gap_detect_failed", err);
      return res.status(500).json({ error: "intelligence gap detect failed" });
    }
  });

  router.get("/state", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const boardData = await ensureMetricsBoard(pool, tenant.id);
      const cards = await ensureIntelligenceCards(pool, tenant.id, boardData.board.id, boardData.columns);
      const kpis = (await pool.query(`SELECT * FROM intelligence_kpis WHERE tenant_id=$1 ORDER BY id DESC`, [tenant.id])).rows;
      const latestScore = (await pool.query(
        `SELECT * FROM readiness_scores WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [tenant.id]
      )).rows[0] || null;
      const openGaps = (await pool.query(
        `SELECT * FROM gap_records WHERE tenant_id=$1 AND status='open' ORDER BY priority ASC, id ASC`,
        [tenant.id]
      )).rows;
      const latestAction = (await pool.query(
        `SELECT * FROM recommended_actions WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 1`,
        [tenant.id]
      )).rows[0] || null;

      return res.json({
        success: true,
        tenant: tenant.slug,
        board: boardData.board,
        columns: boardData.columns,
        cards,
        kpis,
        readiness_score: latestScore,
        gaps: openGaps,
        recommended_action: latestAction,
        completion: {
          kpis_exist: kpis.length > 0,
          readiness_score_calculated: Boolean(latestScore),
          gap_identified: openGaps.length > 0,
        },
        verification: {
          score_updates: Boolean(latestScore),
          gap_detected: openGaps.length > 0,
          task_created: Boolean(latestAction),
        },
      });
    } catch (err) {
      console.error("intelligence_state_failed", err);
      return res.status(500).json({ error: "intelligence state failed" });
    }
  });

  return router;
}

module.exports = intelligenceRoutes;
module.exports.ensureMetricsBoard = ensureMetricsBoard;
module.exports.ensureIntelligenceCards = ensureIntelligenceCards;
module.exports.readinessFromSnapshot = readinessFromSnapshot;
module.exports.detectGaps = detectGaps;
module.exports.nextBestAction = nextBestAction;
