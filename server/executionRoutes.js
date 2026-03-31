"use strict";

const express = require("express");

const EXECUTION_BOARD_KEY = "operations_board";
const EXECUTION_COLUMNS = [
  { name: "To Do", position: 1 },
  { name: "In Progress", position: 2 },
  { name: "Completed", position: 3 },
  { name: "Needs Fix", position: 4 },
];
const EXECUTION_CARD_TYPES = ["sop", "workflow", "checklist", "recurring_task", "deliverable_task"];
const VALID_EXECUTION_CARD_TYPES = new Set(EXECUTION_CARD_TYPES);
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

async function appendExecutionJourneyEvent(pool, tenantId, eventType, payload = {}) {
  await pool.query(
    `UPDATE foundation_journeys
     SET journey = jsonb_set(
       COALESCE(journey, '{}'::jsonb),
       '{events}',
       COALESCE(journey->'events', '[]'::jsonb) || jsonb_build_array(
         jsonb_build_object(
           'phase', 'execution',
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

function eventTypeForItemType(itemType) {
  if (itemType === "sop") return "sop_created";
  if (itemType === "workflow") return "workflow_created";
  if (itemType === "checklist") return "checklist_created";
  if (itemType === "recurring_task") return "recurring_task_created";
  if (itemType === "deliverable_task") return "deliverable_task_created";
  return null;
}

async function ensureOperationsBoard(pool, tenantId) {
  const boardRes = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,'Operations Board')
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET name='Operations Board', updated_at=NOW()
     RETURNING *`,
    [tenantId, EXECUTION_BOARD_KEY]
  );
  const board = boardRes.rows[0];
  const existingColumns = await pool.query(
    `SELECT id, name, position
     FROM kanban_columns
     WHERE board_id=$1
     ORDER BY position ASC`,
    [board.id]
  );
  const byName = new Map(existingColumns.rows.map((row) => [String(row.name || "").toLowerCase(), row]));
  for (const col of EXECUTION_COLUMNS) {
    if (byName.has(col.name.toLowerCase())) continue;
    await pool.query(
      `INSERT INTO kanban_columns (board_id, phase, name, position)
       VALUES ($1,'EXECUTION',$2,$3)`,
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

async function ensureExecutionCards(pool, tenantId, boardId, columns) {
  const toDoColumn = columns.find((c) => String(c.name || "").toLowerCase() === "to do");
  if (!toDoColumn) return [];

  const existing = await pool.query(
    `SELECT * FROM execution_cards WHERE tenant_id=$1 ORDER BY id ASC`,
    [tenantId]
  );
  const byType = new Map(existing.rows.map((row) => [row.card_type, row]));

  for (const type of EXECUTION_CARD_TYPES) {
    if (byType.has(type)) continue;
    const createdKanban = await pool.query(
      `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by)
       VALUES (
         $1,'EXECUTION',$2,$3,'','normal',
         COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND column_id=$2),1),
         'system'
       )
       RETURNING id`,
      [boardId, toDoColumn.id, type.replace("_", " ").toUpperCase()]
    );
    await pool.query(
      `INSERT INTO execution_cards (
        tenant_id, board_id, kanban_card_id, card_type, title, content, status, column_name
      )
      VALUES ($1,$2,$3,$4,$5,'','To Do','To Do')`,
      [tenantId, boardId, createdKanban.rows[0].id, type, type.replace("_", " ").toUpperCase()]
    );
  }

  const cards = await pool.query(
    `SELECT ec.*, kc.column_id, kc.position
     FROM execution_cards ec
     LEFT JOIN kanban_cards kc ON kc.id=ec.kanban_card_id
     WHERE ec.tenant_id=$1
     ORDER BY ec.id ASC`,
    [tenantId]
  );
  return cards.rows;
}

function completionFromRows({ workflows, recurringTasks, deliverableTasks, recurringInstances }) {
  return {
    workflows_defined: workflows.length > 0,
    recurring_tasks_functioning: recurringTasks.length > 0 && recurringInstances.length > 0,
    deliverable_tasks_created: deliverableTasks.length > 0,
    verification: {
      tasks_persist: workflows.length + recurringTasks.length + deliverableTasks.length > 0,
      recurring_instances_generated: recurringInstances.length > 0,
      workflows_usable: workflows.every((row) => Array.isArray(row.steps) && row.steps.length > 0),
    },
  };
}

function buildSop(input) {
  const processName = normalizeText(input.process_name || "Daily Operations");
  return {
    title: `${processName} SOP`,
    checklist: [
      "Open day and review priority queue",
      "Execute assigned production tasks",
      "Close day with delivery and blocker notes",
    ],
    owner: normalizeText(input.owner || "Operations Lead"),
  };
}

function scaffoldDeliverables(input) {
  const deliverable = normalizeText(input.deliverable || "Client Delivery");
  return {
    deliverable,
    tasks: [
      `Draft ${deliverable} scope`,
      `Produce ${deliverable}`,
      `Review ${deliverable} quality`,
      `Ship ${deliverable} and confirm handoff`,
    ],
  };
}

function executionRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/initialize", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const { board, columns } = await ensureOperationsBoard(pool, tenant.id);
      const cards = await ensureExecutionCards(pool, tenant.id, board.id, columns);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      await appendExecutionJourneyEvent(pool, tenant.id, "execution_initialized", { board_id: board.id });
      return res.json({ success: true, tenant: tenant.slug, board, columns, cards });
    } catch (err) {
      console.error("execution_initialize_failed", err);
      return res.status(500).json({ error: "execution initialize failed" });
    }
  });

  router.post("/items", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const itemType = normalizeText(req.body?.item_type).toLowerCase();
      const title = normalizeText(req.body?.title);
      if (!VALID_EXECUTION_CARD_TYPES.has(itemType)) return res.status(400).json({ error: "invalid item_type" });
      if (!title) return res.status(400).json({ error: "title is required" });
      const saved = await pool.query(
        `INSERT INTO execution_items (
          tenant_id, item_type, title, details, steps, is_recurring, cadence, metadata
        )
        VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8::jsonb)
        RETURNING *`,
        [
          tenant.id,
          itemType,
          title,
          normalizeText(req.body?.details),
          JSON.stringify(Array.isArray(req.body?.steps) ? req.body.steps.map((s) => normalizeText(s)).filter(Boolean) : []),
          Boolean(req.body?.is_recurring),
          normalizeText(req.body?.cadence) || null,
          JSON.stringify(req.body?.metadata || {}),
        ]
      );
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const eventType = eventTypeForItemType(itemType);
      if (eventType) {
        await appendExecutionJourneyEvent(pool, tenant.id, eventType, {
          item_id: saved.rows[0].id,
          item_type: saved.rows[0].item_type,
          title: saved.rows[0].title,
        });
      }
      return res.json({ success: true, item: saved.rows[0] });
    } catch (err) {
      console.error("execution_item_save_failed", err);
      return res.status(500).json({ error: "execution item save failed" });
    }
  });

  router.get("/state", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const { board, columns } = await ensureOperationsBoard(pool, tenant.id);
      const cards = await ensureExecutionCards(pool, tenant.id, board.id, columns);
      const itemsRes = await pool.query(
        `SELECT * FROM execution_items WHERE tenant_id=$1 ORDER BY created_at ASC`,
        [tenant.id]
      );
      const recurringInstancesRes = await pool.query(
        `SELECT * FROM execution_recurring_instances WHERE tenant_id=$1 ORDER BY generated_for DESC`,
        [tenant.id]
      );
      const workflows = itemsRes.rows.filter((row) => row.item_type === "workflow");
      const recurringTasks = itemsRes.rows.filter((row) => row.item_type === "recurring_task");
      const deliverableTasks = itemsRes.rows.filter((row) => row.item_type === "deliverable_task");

      return res.json({
        success: true,
        tenant: tenant.slug,
        board,
        columns,
        cards,
        items: itemsRes.rows,
        recurring_instances: recurringInstancesRes.rows,
        completion: completionFromRows({
          workflows,
          recurringTasks,
          deliverableTasks,
          recurringInstances: recurringInstancesRes.rows,
        }),
      });
    } catch (err) {
      console.error("execution_state_failed", err);
      return res.status(500).json({ error: "execution state failed" });
    }
  });

  router.post("/gadget/sop-builder", async (req, res) => {
    return res.json({ success: true, sop: buildSop(req.body || {}) });
  });

  router.post("/gadget/recurring-engine", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const targetDate = normalizeText(req.body?.date) || new Date().toISOString().slice(0, 10);
      const recurring = await pool.query(
        `SELECT * FROM execution_items WHERE tenant_id=$1 AND item_type='recurring_task'`,
        [tenant.id]
      );
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const generated = [];
      for (const task of recurring.rows) {
        const row = await pool.query(
          `INSERT INTO execution_recurring_instances (
            tenant_id, source_item_id, generated_for, title, status
          )
          VALUES ($1,$2,$3,$4,'pending')
          ON CONFLICT (tenant_id, source_item_id, generated_for)
          DO UPDATE SET title=EXCLUDED.title
          RETURNING *`,
          [tenant.id, task.id, targetDate, task.title]
        );
        await appendExecutionJourneyEvent(pool, tenant.id, "recurring_instance_generated", {
          source_item_id: task.id,
          instance_id: row.rows[0].id,
          generated_for: targetDate,
          title: row.rows[0].title,
        });
        generated.push(row.rows[0]);
      }
      return res.json({ success: true, date: targetDate, generated });
    } catch (err) {
      console.error("execution_recurring_engine_failed", err);
      return res.status(500).json({ error: "recurring engine failed" });
    }
  });

  router.post("/gadget/daily-checklist-engine", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const checklists = await pool.query(
        `SELECT id, title, steps FROM execution_items WHERE tenant_id=$1 AND item_type='checklist' ORDER BY created_at ASC`,
        [tenant.id]
      );
      return res.json({ success: true, checklist_count: checklists.rows.length, checklists: checklists.rows });
    } catch (err) {
      console.error("execution_checklist_engine_failed", err);
      return res.status(500).json({ error: "daily checklist engine failed" });
    }
  });

  router.post("/gadget/deliverables-scaffolder", async (req, res) => {
    return res.json({ success: true, scaffold: scaffoldDeliverables(req.body || {}) });
  });

  return router;
}

module.exports = executionRoutes;
