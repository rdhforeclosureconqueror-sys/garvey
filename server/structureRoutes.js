"use strict";

const express = require("express");

const STRUCTURE_BOARD_KEY = "roles_board";
const STRUCTURE_COLUMNS = [
  { name: "Needed", position: 1 },
  { name: "Assigned", position: 2 },
  { name: "Active", position: 3 },
  { name: "Backup Ready", position: 4 },
];
const STRUCTURE_CARD_TYPES = ["role", "operator_assignment", "ownership_gap"];
const VALID_STRUCTURE_CARD_TYPES = new Set(STRUCTURE_CARD_TYPES);
const CRITICAL_ROLE_NAMES = ["operations", "sales", "marketing", "finance"];

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

async function ensureRolesBoard(pool, tenantId) {
  const boardRes = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,'Roles Board')
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET name='Roles Board', updated_at=NOW()
     RETURNING *`,
    [tenantId, STRUCTURE_BOARD_KEY]
  );
  const board = boardRes.rows[0];
  const columnsRes = await pool.query(
    `SELECT id, name, position
     FROM kanban_columns
     WHERE board_id=$1
     ORDER BY position ASC`,
    [board.id]
  );
  const byName = new Map(columnsRes.rows.map((row) => [String(row.name).toLowerCase(), row]));
  for (const col of STRUCTURE_COLUMNS) {
    if (byName.has(col.name.toLowerCase())) continue;
    await pool.query(
      `INSERT INTO kanban_columns (board_id, phase, name, position)
       VALUES ($1,'STRUCTURE',$2,$3)`,
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

async function ensureStructureCards(pool, tenantId, boardId, columns) {
  const neededColumn = columns.find((col) => String(col.name).toLowerCase() === "needed");
  if (!neededColumn) return [];

  const existing = await pool.query(
    `SELECT * FROM structure_cards WHERE tenant_id=$1 ORDER BY id ASC`,
    [tenantId]
  );
  const byType = new Map(existing.rows.map((row) => [row.card_type, row]));
  for (const type of STRUCTURE_CARD_TYPES) {
    if (byType.has(type)) continue;
    const createdKanban = await pool.query(
      `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by)
       VALUES (
         $1,'STRUCTURE',$2,$3,'','normal',
         COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND column_id=$2),1),
         'system'
       )
       RETURNING id`,
      [boardId, neededColumn.id, type.replace("_", " ").toUpperCase()]
    );
    await pool.query(
      `INSERT INTO structure_cards (
        tenant_id, board_id, kanban_card_id, card_type, title, content, column_name, status
      )
      VALUES ($1,$2,$3,$4,$5,'','Needed','Needed')`,
      [tenantId, boardId, createdKanban.rows[0].id, type, type.replace("_", " ").toUpperCase()]
    );
  }

  const cards = await pool.query(
    `SELECT sc.*, kc.column_id, kc.position
     FROM structure_cards sc
     LEFT JOIN kanban_cards kc ON kc.id=sc.kanban_card_id
     WHERE sc.tenant_id=$1
     ORDER BY sc.id ASC`,
    [tenantId]
  );
  return cards.rows;
}

async function computeOwnershipGaps(pool, tenantId) {
  const roleRows = await pool.query(
    `SELECT role_name, owner_name, owner_email, responsibilities
     FROM structure_roles
     WHERE tenant_id=$1`,
    [tenantId]
  );
  const rows = roleRows.rows;
  const lowerRoleSet = new Set(rows.map((row) => normalizeText(row.role_name).toLowerCase()));
  const missingCriticalRoles = CRITICAL_ROLE_NAMES.filter((name) => !lowerRoleSet.has(name));
  const orphanResponsibilities = [];
  for (const row of rows) {
    const owner = normalizeText(row.owner_name || row.owner_email);
    if (!owner) {
      const responsibilities = Array.isArray(row.responsibilities) ? row.responsibilities : [];
      orphanResponsibilities.push(...responsibilities.map((item) => normalizeText(item)).filter(Boolean));
    }
  }
  return { missing_critical_roles: missingCriticalRoles, orphan_responsibilities: orphanResponsibilities };
}

function completionFromRows({ roles, gaps, operator }) {
  const allCriticalRolesAssigned = gaps.missing_critical_roles.length === 0;
  const operatorAssigned = Boolean(normalizeText(operator?.operator_name || operator?.operator_email));
  const noOrphanResponsibilities = gaps.orphan_responsibilities.length === 0;
  return {
    all_critical_roles_assigned: allCriticalRolesAssigned,
    operator_assigned: operatorAssigned,
    no_orphan_responsibilities: noOrphanResponsibilities,
    done: allCriticalRolesAssigned && operatorAssigned && noOrphanResponsibilities,
    role_count: roles.length,
  };
}

function buildRoleSuggestion(input) {
  const roleName = normalizeText(input.role_name || "operations");
  const purpose = normalizeText(input.purpose || "execution ownership");
  return {
    role_name: roleName,
    responsibilities: [
      `Own ${purpose}`,
      `Report weekly outcomes for ${roleName}`,
      `Escalate blockers for ${roleName}`,
    ],
    decision_rights: Number(input.decision_rights || 2),
  };
}

function buildBackupAssignment(input) {
  return {
    role_name: normalizeText(input.role_name || "operations"),
    backup_name: normalizeText(input.backup_name || "Backup Owner"),
    backup_email: normalizeText(input.backup_email || "backup@example.com"),
    status: "Backup Ready",
  };
}

function structureRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/initialize", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const { board, columns } = await ensureRolesBoard(pool, tenant.id);
      const cards = await ensureStructureCards(pool, tenant.id, board.id, columns);
      return res.json({ success: true, tenant: tenant.slug, board, columns, cards });
    } catch (err) {
      console.error("structure_initialize_failed", err);
      return res.status(500).json({ error: "structure initialize failed" });
    }
  });

  router.post("/roles", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const roleName = normalizeText(req.body?.role_name);
      if (!roleName) return res.status(400).json({ error: "role_name is required" });
      const responsibilities = Array.isArray(req.body?.responsibilities)
        ? req.body.responsibilities.map((item) => normalizeText(item)).filter(Boolean)
        : [];
      const created = await pool.query(
        `INSERT INTO structure_roles (
          tenant_id, role_name, owner_name, owner_email, backup_name, backup_email, responsibilities, decision_rights
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)
        ON CONFLICT (tenant_id, role_name)
        DO UPDATE SET
          owner_name=EXCLUDED.owner_name,
          owner_email=EXCLUDED.owner_email,
          backup_name=EXCLUDED.backup_name,
          backup_email=EXCLUDED.backup_email,
          responsibilities=EXCLUDED.responsibilities,
          decision_rights=EXCLUDED.decision_rights,
          updated_at=NOW()
        RETURNING *`,
        [
          tenant.id,
          roleName,
          normalizeText(req.body?.owner_name) || null,
          normalizeText(req.body?.owner_email) || null,
          normalizeText(req.body?.backup_name) || null,
          normalizeText(req.body?.backup_email) || null,
          JSON.stringify(responsibilities),
          Number(req.body?.decision_rights || 1),
        ]
      );
      return res.json({ success: true, role: created.rows[0] });
    } catch (err) {
      console.error("structure_role_save_failed", err);
      return res.status(500).json({ error: "structure role save failed" });
    }
  });

  router.post("/operator-assignment", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const operatorName = normalizeText(req.body?.operator_name);
      const operatorEmail = normalizeText(req.body?.operator_email);
      if (!operatorName && !operatorEmail) {
        return res.status(400).json({ error: "operator_name or operator_email is required" });
      }
      const saved = await pool.query(
        `INSERT INTO structure_operator_assignments (
          tenant_id, operator_name, operator_email, mode
        )
        VALUES ($1,$2,$3,$4)
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          operator_name=EXCLUDED.operator_name,
          operator_email=EXCLUDED.operator_email,
          mode=EXCLUDED.mode,
          updated_at=NOW()
        RETURNING *`,
        [tenant.id, operatorName || null, operatorEmail || null, normalizeText(req.body?.mode || "manual")]
      );
      return res.json({ success: true, operator_assignment: saved.rows[0] });
    } catch (err) {
      console.error("structure_operator_assign_failed", err);
      return res.status(500).json({ error: "structure operator assignment failed" });
    }
  });

  router.get("/state", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const { board, columns } = await ensureRolesBoard(pool, tenant.id);
      const cards = await ensureStructureCards(pool, tenant.id, board.id, columns);
      const rolesRes = await pool.query(`SELECT * FROM structure_roles WHERE tenant_id=$1 ORDER BY role_name ASC`, [tenant.id]);
      const operatorRes = await pool.query(
        `SELECT * FROM structure_operator_assignments WHERE tenant_id=$1 LIMIT 1`,
        [tenant.id]
      );
      const gaps = await computeOwnershipGaps(pool, tenant.id);
      const completion = completionFromRows({
        roles: rolesRes.rows,
        gaps,
        operator: operatorRes.rows[0] || null,
      });
      return res.json({
        success: true,
        tenant: tenant.slug,
        board,
        columns,
        cards,
        roles: rolesRes.rows,
        operator_assignment: operatorRes.rows[0] || null,
        ownership_gaps: gaps,
        completion,
      });
    } catch (err) {
      console.error("structure_state_failed", err);
      return res.status(500).json({ error: "structure state failed" });
    }
  });

  router.put("/cards/:cardType", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const cardType = normalizeText(req.params.cardType).toLowerCase();
      if (!VALID_STRUCTURE_CARD_TYPES.has(cardType)) {
        return res.status(400).json({ error: "invalid structure card type" });
      }
      const tenant = await ensureTenant(tenantSlug);
      const found = await pool.query(
        `SELECT * FROM structure_cards WHERE tenant_id=$1 AND card_type=$2 LIMIT 1`,
        [tenant.id, cardType]
      );
      if (!found.rows[0]) return res.status(404).json({ error: "structure card not found" });
      const updated = await pool.query(
        `UPDATE structure_cards
         SET title=COALESCE(NULLIF($1,''), title),
             content=COALESCE($2, content),
             updated_at=NOW()
         WHERE id=$3
         RETURNING *`,
        [normalizeText(req.body?.title), normalizeText(req.body?.content), found.rows[0].id]
      );
      return res.json({ success: true, card: updated.rows[0] });
    } catch (err) {
      console.error("structure_card_update_failed", err);
      return res.status(500).json({ error: "structure card update failed" });
    }
  });

  router.post("/gadget/role-creator", async (req, res) => {
    return res.json({ success: true, role: buildRoleSuggestion(req.body || {}) });
  });

  router.post("/gadget/ownership-validator", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const gaps = await computeOwnershipGaps(pool, tenant.id);
      return res.json({ success: true, ownership_gaps: gaps, healthy: gaps.missing_critical_roles.length === 0 && gaps.orphan_responsibilities.length === 0 });
    } catch (err) {
      console.error("structure_validator_failed", err);
      return res.status(500).json({ error: "structure ownership validation failed" });
    }
  });

  router.post("/gadget/backup-assigner", async (req, res) => {
    return res.json({ success: true, backup_assignment: buildBackupAssignment(req.body || {}) });
  });

  return router;
}

module.exports = structureRoutes;
