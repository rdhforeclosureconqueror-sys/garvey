// FILE: server/kanbanRoutes.js
"use strict";

const express = require("express");

function requireTenantSlug(req, res) {
  const tenant = String(req.query.tenant || req.body?.tenant || "").trim();
  if (!tenant) {
    res.status(400).json({ error: "tenant is required" });
    return null;
  }
  return tenant;
}

function requirePhase(req, res) {
  const phase = String(req.query.phase || req.body?.phase || "").trim().toUpperCase();
  if (!phase || !["G", "A", "R", "V", "E", "Y"].includes(phase)) {
    res.status(400).json({ error: "phase must be one of G,A,R,V,E,Y" });
    return null;
  }
  return phase;
}

async function ensureGarveyBoard(pool, tenantId) {
  const boardKey = "garvey";
  const board = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,'GARVEY Board')
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET updated_at=NOW()
     RETURNING *`,
    [tenantId, boardKey]
  );

  const boardId = board.rows[0].id;

  // Default columns per phase
  const defaultCols = [
    { name: "Backlog", pos: 1 },
    { name: "Doing", pos: 2 },
    { name: "Blocked", pos: 3 },
    { name: "Done", pos: 4 },
  ];

  for (const phase of ["G", "A", "R", "V", "E", "Y"]) {
    const existing = await pool.query(
      `SELECT 1 FROM kanban_columns WHERE board_id=$1 AND phase=$2 LIMIT 1`,
      [boardId, phase]
    );
    if (existing.rows.length) continue;

    for (const c of defaultCols) {
      await pool.query(
        `INSERT INTO kanban_columns (board_id, phase, name, position)
         VALUES ($1,$2,$3,$4)`,
        [boardId, phase, c.name, c.pos]
      );
    }
  }

  return board.rows[0];
}

async function ensureDefaultOnboardingCards(pool, boardId) {
  const existingCards = await pool.query(
    `SELECT COUNT(*)::int AS count FROM kanban_cards WHERE board_id=$1`,
    [boardId]
  );
  if ((existingCards.rows[0]?.count || 0) > 0) return { created: 0 };

  const backlogColumn = await pool.query(
    `SELECT id
     FROM kanban_columns
     WHERE board_id=$1 AND phase IN ('G','A') AND LOWER(name)='backlog'
     ORDER BY CASE WHEN phase='G' THEN 0 ELSE 1 END, position ASC
     LIMIT 1`,
    [boardId]
  );

  const targetColumnId = backlogColumn.rows[0]?.id;
  if (!targetColumnId) return { created: 0 };

  const defaults = [
    "Complete your profile",
    "Add offer + pricing",
    "Invite customers to take assessment",
    "Review your first dashboard insights",
  ];

  for (const [index, title] of defaults.entries()) {
    await pool.query(
      `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by)
       VALUES ($1, 'G', $2, $3, '', 'normal', $4, 'system')`,
      [boardId, targetColumnId, title, index + 1]
    );
  }

  return { created: defaults.length };
}

function kanbanRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/ensure", async (req, res) => {
    try {
      const tenantSlug = requireTenantSlug(req, res);
      if (!tenantSlug) return;
      const includeDefaults = Boolean(req.body?.include_defaults || req.query?.include_defaults);

      const tenant = await ensureTenant(tenantSlug);
      const board = await ensureGarveyBoard(pool, tenant.id);
      let seeded = { created: 0 };
      if (includeDefaults) {
        seeded = await ensureDefaultOnboardingCards(pool, board.id);
      }

      return res.json({ success: true, tenant: tenant.slug, board, seeded });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "kanban ensure failed" });
    }
  });

  router.get("/board", async (req, res) => {
    try {
      const tenantSlug = requireTenantSlug(req, res);
      if (!tenantSlug) return;

      const tenant = await ensureTenant(tenantSlug);
      const board = await ensureGarveyBoard(pool, tenant.id);

      const columns = await pool.query(
        `SELECT * FROM kanban_columns WHERE board_id=$1 ORDER BY phase ASC, position ASC`,
        [board.id]
      );

      return res.json({ success: true, tenant: tenant.slug, board, columns: columns.rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "kanban board fetch failed" });
    }
  });

  router.get("/cards", async (req, res) => {
    try {
      const tenantSlug = requireTenantSlug(req, res);
      if (!tenantSlug) return;
      const phase = requirePhase(req, res);
      if (!phase) return;

      const tenant = await ensureTenant(tenantSlug);
      const board = await ensureGarveyBoard(pool, tenant.id);

      const cards = await pool.query(
        `SELECT c.*
         FROM kanban_cards c
         WHERE c.board_id=$1 AND c.phase=$2
         ORDER BY c.column_id ASC, c.position ASC, c.id ASC`,
        [board.id, phase]
      );

      return res.json({ success: true, cards: cards.rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "kanban cards fetch failed" });
    }
  });

  router.post("/cards", async (req, res) => {
    try {
      const tenantSlug = requireTenantSlug(req, res);
      if (!tenantSlug) return;
      const phase = requirePhase(req, res);
      if (!phase) return;

      const { title, description = "", priority = "normal", due_date = null, column_id, actor = "user" } = req.body || {};
      if (!title || !column_id) return res.status(400).json({ error: "title and column_id required" });

      const tenant = await ensureTenant(tenantSlug);
      const board = await ensureGarveyBoard(pool, tenant.id);

      const created = await pool.query(
        `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, due_date, position, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,
           COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND phase=$2 AND column_id=$3), 1),
           $8
         )
         RETURNING *`,
        [board.id, phase, column_id, title, description, priority, due_date, actor]
      );

      await pool.query(
        `INSERT INTO kanban_card_events (tenant_id, board_id, card_id, actor, event_type, payload)
         VALUES ($1,$2,$3,$4,'created',$5::jsonb)`,
        [tenant.id, board.id, created.rows[0].id, actor, JSON.stringify({ title })]
      );

      return res.json({ success: true, card: created.rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "kanban create failed" });
    }
  });

  router.put("/cards/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid card id" });

      const { title, description, priority, due_date, status, assigned_to, actor = "user" } = req.body || {};

      const updated = await pool.query(
        `UPDATE kanban_cards
         SET title=COALESCE($1,title),
             description=COALESCE($2,description),
             priority=COALESCE($3,priority),
             due_date=COALESCE($4,due_date),
             status=COALESCE($5,status),
             assigned_to=COALESCE($6,assigned_to),
             updated_at=NOW()
         WHERE id=$7
         RETURNING *`,
        [title ?? null, description ?? null, priority ?? null, due_date ?? null, status ?? null, assigned_to ?? null, id]
      );

      if (!updated.rows[0]) return res.status(404).json({ error: "card not found" });

      await pool.query(
        `INSERT INTO kanban_card_events (tenant_id, board_id, card_id, actor, event_type, payload)
         VALUES (
           (SELECT tenant_id FROM kanban_boards WHERE id=$1),
           $1,$2,$3,'updated',$4::jsonb
         )`,
        [updated.rows[0].board_id, id, actor, JSON.stringify({ fields: Object.keys(req.body || {}) })]
      );

      return res.json({ success: true, card: updated.rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "kanban update failed" });
    }
  });

  router.post("/cards/:id/move", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid card id" });

      const { to_column_id, actor = "user" } = req.body || {};
      if (!to_column_id) return res.status(400).json({ error: "to_column_id required" });

      const current = await pool.query(`SELECT * FROM kanban_cards WHERE id=$1`, [id]);
      if (!current.rows[0]) return res.status(404).json({ error: "card not found" });

      const fromColumn = current.rows[0].column_id;

      const moved = await pool.query(
        `UPDATE kanban_cards
         SET column_id=$1,
             position=COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$2 AND phase=$3 AND column_id=$1), 1),
             updated_at=NOW()
         WHERE id=$4
         RETURNING *`,
        [to_column_id, current.rows[0].board_id, current.rows[0].phase, id]
      );

      await pool.query(
        `INSERT INTO kanban_card_events (tenant_id, board_id, card_id, actor, event_type, from_column_id, to_column_id, payload)
         VALUES (
           (SELECT tenant_id FROM kanban_boards WHERE id=$1),
           $1,$2,$3,'moved',$4,$5,$6::jsonb
         )`,
        [
          moved.rows[0].board_id,
          id,
          actor,
          fromColumn,
          to_column_id,
          JSON.stringify({}),
        ]
      );

      return res.json({ success: true, card: moved.rows[0] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "kanban move failed" });
    }
  });

  router.get("/events", async (req, res) => {
    try {
      const tenantSlug = requireTenantSlug(req, res);
      if (!tenantSlug) return;
      const phase = requirePhase(req, res);
      if (!phase) return;

      const tenant = await ensureTenant(tenantSlug);
      const board = await ensureGarveyBoard(pool, tenant.id);

      const events = await pool.query(
        `SELECT e.*
         FROM kanban_card_events e
         JOIN kanban_cards c ON c.id=e.card_id
         WHERE e.board_id=$1 AND c.phase=$2
         ORDER BY e.created_at DESC
         LIMIT 200`,
        [board.id, phase]
      );

      return res.json({ success: true, events: events.rows });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "kanban events fetch failed" });
    }
  });

  return router;
}

module.exports = kanbanRoutes;
module.exports.ensureGarveyBoard = ensureGarveyBoard;
module.exports.ensureDefaultOnboardingCards = ensureDefaultOnboardingCards;
