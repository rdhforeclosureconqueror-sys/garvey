"use strict";

const express = require("express");

const FOUNDATION_BOARD_KEY = "foundation_board";
const FOUNDATION_CARD_TYPES = ["mission", "customer", "value_prop", "values"];
const FOUNDATION_COLUMNS = [
  { name: "Draft", position: 1 },
  { name: "Refining", position: 2 },
  { name: "Finalized", position: 3 },
  { name: "Live", position: 4 },
];
const DELIVERABLE_NAMES = ["Business Plan", "Website", "Funding Packet", "Owner Checklist"];

function normalizeText(value) {
  return String(value || "").trim();
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

function requireTenant(req, res) {
  const tenant = normalizeText(req.query?.tenant || req.body?.tenant);
  if (!tenant) {
    res.status(400).json({ error: "tenant is required" });
    return null;
  }
  return tenant;
}

async function ensureFoundationBoard(pool, tenantId) {
  const boardRes = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,'Foundation Board')
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET name='Foundation Board', updated_at=NOW()
     RETURNING *`,
    [tenantId, FOUNDATION_BOARD_KEY]
  );
  const board = boardRes.rows[0];
  const existing = await pool.query(
    `SELECT id, name, position
     FROM kanban_columns
     WHERE board_id=$1
     ORDER BY position ASC`,
    [board.id]
  );
  const byName = new Map(existing.rows.map((row) => [String(row.name || "").toLowerCase(), row]));
  for (const col of FOUNDATION_COLUMNS) {
    if (byName.has(col.name.toLowerCase())) continue;
    await pool.query(
      `INSERT INTO kanban_columns (board_id, phase, name, position)
       VALUES ($1, 'FOUNDATION', $2, $3)`,
      [board.id, col.name, col.position]
    );
  }
  const refreshedColumns = await pool.query(
    `SELECT id, board_id, phase, name, position
     FROM kanban_columns
     WHERE board_id=$1
     ORDER BY position ASC`,
    [board.id]
  );
  return { board, columns: refreshedColumns.rows };
}

async function ensureFoundationCards(pool, tenantId, boardId, columns) {
  const draftColumn = columns.find((c) => String(c.name).toLowerCase() === "draft");
  if (!draftColumn) return [];

  const existingCards = await pool.query(
    `SELECT * FROM foundation_cards WHERE tenant_id=$1 ORDER BY id ASC`,
    [tenantId]
  );
  const byType = new Map(existingCards.rows.map((row) => [row.card_type, row]));

  for (const type of FOUNDATION_CARD_TYPES) {
    if (byType.has(type)) continue;
    const createdKanban = await pool.query(
      `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by)
       VALUES (
         $1,'FOUNDATION',$2,$3,'','normal',
         COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND column_id=$2),1),
         'system'
       )
       RETURNING id`,
      [boardId, draftColumn.id, type.replace("_", " ").toUpperCase()]
    );
    const createdFoundation = await pool.query(
      `INSERT INTO foundation_cards (tenant_id, board_id, kanban_card_id, card_type, title, content, status, column_name)
       VALUES ($1,$2,$3,$4,$5,'','Draft','Draft')
       RETURNING *`,
      [tenantId, boardId, createdKanban.rows[0].id, type, type.replace("_", " ").toUpperCase()]
    );
    byType.set(type, createdFoundation.rows[0]);
  }

  const cards = await pool.query(
    `SELECT fc.*, kc.column_id, kc.position
     FROM foundation_cards fc
     LEFT JOIN kanban_cards kc ON kc.id=fc.kanban_card_id
     WHERE fc.tenant_id=$1
     ORDER BY fc.id ASC`,
    [tenantId]
  );
  return cards.rows;
}

async function ensureJourney(pool, tenantId, tenantSlug, intakeSnapshot = null) {
  const deliverables = DELIVERABLE_NAMES.map((name) => ({ name, status: "pending" }));
  const valueAssets = [
    { key: "offer_statement", status: "baseline" },
    { key: "proof_points", status: "baseline" },
    { key: "positioning_summary", status: "baseline" },
  ];
  const result = await pool.query(
    `INSERT INTO foundation_journeys (
      tenant_id, business_id, intake_snapshot, value_assets, deliverables, journey
    )
    VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb)
    ON CONFLICT (tenant_id)
    DO UPDATE SET
      intake_snapshot = COALESCE(EXCLUDED.intake_snapshot, foundation_journeys.intake_snapshot),
      updated_at = NOW()
    RETURNING *`,
    [
      tenantId,
      buildBusinessId(tenantSlug),
      JSON.stringify(intakeSnapshot || {}),
      JSON.stringify(valueAssets),
      JSON.stringify(deliverables),
      JSON.stringify({
        phase: "foundation",
        status: "initialized",
        started_at: new Date().toISOString(),
      }),
    ]
  );
  return result.rows[0];
}

function gadgetMission(input) {
  const industry = normalizeText(input.industry || "our market");
  const audience = normalizeText(input.customer || "ideal customers");
  const impact = normalizeText(input.impact || "measurable outcomes");
  return `We exist to serve ${audience} in ${industry} by delivering ${impact} with clarity, consistency, and trust.`;
}

function gadgetCustomer(input) {
  return {
    primary_customer: normalizeText(input.primary_customer || "Define primary customer"),
    urgent_problem: normalizeText(input.urgent_problem || "Define urgent problem"),
    buying_trigger: normalizeText(input.buying_trigger || "Define buying trigger"),
  };
}

function gadgetValueProp(input) {
  const problem = normalizeText(input.problem || "core problem");
  const promise = normalizeText(input.promise || "clear outcome");
  const proof = normalizeText(input.proof || "proof");
  return `We solve ${problem} with ${promise}, backed by ${proof}.`;
}

function foundationRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/initialize", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const { board, columns } = await ensureFoundationBoard(pool, tenant.id);
      const cards = await ensureFoundationCards(pool, tenant.id, board.id, columns);
      const journey = await ensureJourney(pool, tenant.id, tenant.slug, req.body?.intake_snapshot || null);
      return res.json({ success: true, tenant: tenant.slug, board, columns, cards, journey });
    } catch (err) {
      console.error("foundation_initialize_failed", err);
      return res.status(500).json({ error: "foundation initialize failed" });
    }
  });

  router.get("/state", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const boardData = await ensureFoundationBoard(pool, tenant.id);
      const cards = await ensureFoundationCards(pool, tenant.id, boardData.board.id, boardData.columns);
      const journeyRes = await pool.query(
        `SELECT * FROM foundation_journeys WHERE tenant_id=$1 LIMIT 1`,
        [tenant.id]
      );
      const journey = journeyRes.rows[0] || null;
      const hasAllCards = FOUNDATION_CARD_TYPES.every((type) => cards.some((card) => card.card_type === type));
      const deliverablesReady = Array.isArray(journey?.deliverables) && journey.deliverables.length === 4;
      return res.json({
        success: true,
        tenant: tenant.slug,
        board: boardData.board,
        columns: boardData.columns,
        cards,
        journey,
        completion: {
          core_elements_exist: hasAllCards,
          journey_created: Boolean(journey),
          deliverables_initialized: deliverablesReady,
        },
      });
    } catch (err) {
      console.error("foundation_state_failed", err);
      return res.status(500).json({ error: "foundation state failed" });
    }
  });

  router.put("/cards/:cardType", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const cardType = normalizeText(req.params.cardType).toLowerCase();
      if (!FOUNDATION_CARD_TYPES.includes(cardType)) {
        return res.status(400).json({ error: "invalid foundation card type" });
      }
      const tenant = await ensureTenant(tenantSlug);
      const updates = {
        title: normalizeText(req.body?.title),
        content: normalizeText(req.body?.content),
      };

      const found = await pool.query(
        `SELECT * FROM foundation_cards WHERE tenant_id=$1 AND card_type=$2 LIMIT 1`,
        [tenant.id, cardType]
      );
      if (!found.rows[0]) return res.status(404).json({ error: "foundation card not found" });

      const updated = await pool.query(
        `UPDATE foundation_cards
         SET title=COALESCE(NULLIF($1,''), title),
             content=COALESCE($2, content),
             updated_at=NOW()
         WHERE id=$3
         RETURNING *`,
        [updates.title, updates.content, found.rows[0].id]
      );
      await pool.query(
        `UPDATE kanban_cards
         SET title=COALESCE(NULLIF($1,''), title),
             description=COALESCE($2, description),
             updated_at=NOW()
         WHERE id=$3`,
        [updates.title, updates.content, found.rows[0].kanban_card_id]
      );
      return res.json({ success: true, card: updated.rows[0] });
    } catch (err) {
      console.error("foundation_card_update_failed", err);
      return res.status(500).json({ error: "foundation card update failed" });
    }
  });

  router.post("/cards/:cardType/move", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const cardType = normalizeText(req.params.cardType).toLowerCase();
      const toColumn = normalizeText(req.body?.to_column);
      if (!FOUNDATION_CARD_TYPES.includes(cardType)) {
        return res.status(400).json({ error: "invalid foundation card type" });
      }
      if (!toColumn) return res.status(400).json({ error: "to_column is required" });

      const tenant = await ensureTenant(tenantSlug);
      const boardData = await ensureFoundationBoard(pool, tenant.id);
      const target = boardData.columns.find((col) => String(col.name).toLowerCase() === toColumn.toLowerCase());
      if (!target) return res.status(404).json({ error: "target column not found" });

      const found = await pool.query(
        `SELECT * FROM foundation_cards WHERE tenant_id=$1 AND card_type=$2 LIMIT 1`,
        [tenant.id, cardType]
      );
      if (!found.rows[0]) return res.status(404).json({ error: "foundation card not found" });

      await pool.query(
        `UPDATE kanban_cards
         SET column_id=$1,
             position=COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$2 AND column_id=$1),1),
             updated_at=NOW()
         WHERE id=$3`,
        [target.id, boardData.board.id, found.rows[0].kanban_card_id]
      );
      const updated = await pool.query(
        `UPDATE foundation_cards
         SET column_name=$1, status=$1, updated_at=NOW()
         WHERE id=$2
         RETURNING *`,
        [target.name, found.rows[0].id]
      );

      return res.json({ success: true, card: updated.rows[0] });
    } catch (err) {
      console.error("foundation_card_move_failed", err);
      return res.status(500).json({ error: "foundation card move failed" });
    }
  });

  router.post("/gadget/mission-generator", async (req, res) => {
    return res.json({ success: true, mission: gadgetMission(req.body || {}) });
  });

  router.post("/gadget/customer-builder", async (req, res) => {
    return res.json({ success: true, customer: gadgetCustomer(req.body || {}) });
  });

  router.post("/gadget/value-prop-builder", async (req, res) => {
    return res.json({ success: true, value_prop: gadgetValueProp(req.body || {}) });
  });

  router.post("/gadget/start-journey", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const journey = await ensureJourney(pool, tenant.id, tenant.slug, req.body?.intake_snapshot || null);
      return res.json({ success: true, journey });
    } catch (err) {
      console.error("foundation_start_journey_failed", err);
      return res.status(500).json({ error: "start journey failed" });
    }
  });

  return router;
}

module.exports = foundationRoutes;
