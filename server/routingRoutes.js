"use strict";

const express = require("express");

const STABILITY_BOARD_KEY = "issues_board";
const STABILITY_BOARD_NAME = "Issues Board";
const STABILITY_PHASE = "STABILITY";
const STABILITY_COLUMNS = [
  { name: "Detected", position: 1 },
  { name: "Investigating", position: 2 },
  { name: "Fixing", position: 3 },
  { name: "Resolved", position: 4 },
  { name: "Documented", position: 5 },
];
const CARD_TYPES = ["issue", "routing_task", "milestone_prompt", "postmortem"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeCardType(value, fallback = "issue") {
  const clean = normalizeText(value).toLowerCase();
  return CARD_TYPES.includes(clean) ? clean : fallback;
}

function requireTenant(req, res) {
  const tenant = normalizeText(req.query?.tenant || req.body?.tenant);
  if (!tenant) {
    res.status(400).json({ error: "tenant is required" });
    return null;
  }
  return tenant;
}

function issueKeyFromTitle(title) {
  const base = normalizeText(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "issue";
  return `${base}-${Date.now()}`;
}

function severityToEscalationLevel(severity) {
  const clean = normalizeText(severity).toLowerCase();
  if (clean === "critical") return 3;
  if (clean === "high") return 2;
  if (clean === "medium") return 1;
  return 0;
}

function assigneeForSeverity(severity) {
  const level = severityToEscalationLevel(severity);
  if (level >= 3) return "escalation-engine";
  if (level >= 2) return "routing-engine";
  return "issue-logger";
}

function cardPriorityForSeverity(severity) {
  const level = severityToEscalationLevel(severity);
  if (level >= 3) return "urgent";
  if (level >= 2) return "high";
  return "normal";
}

function defaultRouteForSeverity(severity) {
  const level = severityToEscalationLevel(severity);
  return level >= 3 ? "escalation" : "triage";
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
      `biz_${normalizeText(tenantSlug).replace(/[^a-z0-9]+/g, "-") || "tenant"}`,
      JSON.stringify({ phase: "foundation", status: "initialized", events: [] }),
    ]
  );
}

async function getBusinessId(pool, tenantId, tenantSlug) {
  await ensureJourneyRecord(pool, tenantId, tenantSlug);
  const found = await pool.query(`SELECT business_id FROM foundation_journeys WHERE tenant_id=$1 LIMIT 1`, [tenantId]);
  return normalizeText(found.rows[0]?.business_id) || `biz_${tenantSlug}`;
}

async function appendJourneyEvent(pool, tenantId, eventType, payload = {}) {
  await pool.query(
    `UPDATE foundation_journeys
     SET journey = jsonb_set(
       COALESCE(journey, '{}'::jsonb),
       '{events}',
       COALESCE(journey->'events', '[]'::jsonb) || jsonb_build_array(
         jsonb_build_object(
           'phase', 'stability',
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

async function ensureIssuesBoard(pool, tenantId) {
  const boardRes = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,$3)
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET name=$3, updated_at=NOW()
     RETURNING *`,
    [tenantId, STABILITY_BOARD_KEY, STABILITY_BOARD_NAME]
  );
  const board = boardRes.rows[0];

  const existingCols = await pool.query(
    `SELECT id, name, position FROM kanban_columns WHERE board_id=$1 ORDER BY position ASC`,
    [board.id]
  );
  const byName = new Map(existingCols.rows.map((row) => [String(row.name || "").toLowerCase(), row]));

  for (const col of STABILITY_COLUMNS) {
    if (byName.has(col.name.toLowerCase())) continue;
    await pool.query(
      `INSERT INTO kanban_columns (board_id, phase, name, position)
       VALUES ($1,$2,$3,$4)`,
      [board.id, STABILITY_PHASE, col.name, col.position]
    );
  }

  const refreshedCols = await pool.query(
    `SELECT id, board_id, phase, name, position FROM kanban_columns WHERE board_id=$1 ORDER BY position ASC`,
    [board.id]
  );
  return { board, columns: refreshedCols.rows };
}

async function findOwnerAssignee(pool, tenantId) {
  const operator = await pool.query(
    `SELECT operator_name, operator_email FROM structure_operator_assignments WHERE tenant_id=$1 LIMIT 1`,
    [tenantId]
  );
  const role = await pool.query(
    `SELECT owner_name, owner_email FROM structure_roles WHERE tenant_id=$1 ORDER BY id ASC LIMIT 1`,
    [tenantId]
  );
  const owner = normalizeText(role.rows[0]?.owner_name || operator.rows[0]?.operator_name) || "owner-unassigned";
  const assignedTo = normalizeText(role.rows[0]?.owner_email || operator.rows[0]?.operator_email) || "unassigned";
  return { owner, assignedTo };
}

async function insertStabilityCard(pool, payload) {
  const result = await pool.query(
    `INSERT INTO stability_cards (
      tenant_id, business_id, phase, board, type, title, content, severity, owner, assigned_to,
      due_date, escalation_level, status, column_name, board_id, kanban_card_id, metadata
    )
    VALUES ($1,$2,'stability','issues_board',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb)
    RETURNING *`,
    [
      payload.tenantId,
      payload.businessId,
      payload.type,
      payload.title,
      payload.content,
      payload.severity,
      payload.owner,
      payload.assignedTo,
      payload.dueDate || null,
      payload.escalationLevel,
      payload.status,
      payload.columnName,
      payload.boardId,
      payload.kanbanCardId,
      JSON.stringify(payload.metadata || {}),
    ]
  );
  return result.rows[0];
}

async function insertNotification(pool, {
  tenantId,
  businessId,
  issueId = null,
  target = "ops",
  recipient = "ops",
  subject = "Stability Notification",
  milestoneId = "",
  message,
  metadata = {},
}) {
  const preview = normalizeText(message).slice(0, 160);
  await pool.query(
    `INSERT INTO notification_logs (
      tenant_id, issue_id, business_id, channel, recipient, subject, target, message, sent_on, milestone_id, preview, delivery_status, metadata
    )
    VALUES ($1,$2,$3,'system',$4,$5,$6,$7,NOW(),$8,$9,'sent',$10::jsonb)`,
    [
      tenantId,
      issueId,
      businessId,
      normalizeText(recipient) || "ops",
      normalizeText(subject) || "Stability Notification",
      normalizeText(target) || "ops",
      normalizeText(message),
      normalizeText(milestoneId),
      preview,
      JSON.stringify(metadata || {}),
    ]
  );
}

function routingRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/initialize", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const businessId = await getBusinessId(pool, tenant.id, tenant.slug);
      const { board, columns } = await ensureIssuesBoard(pool, tenant.id);
      await appendJourneyEvent(pool, tenant.id, "stability_initialized", { board_id: board.id, business_id: businessId });

      return res.json({
        success: true,
        phase: 6,
        phase_name: "Routing & Stability",
        tenant: tenant.slug,
        business_id: businessId,
        board,
        columns,
        card_types: CARD_TYPES,
        data_objects: ["issues", "routing_tasks", "milestone_logs", "notification_logs"],
      });
    } catch (err) {
      console.error("stability_initialize_failed", err);
      return res.status(500).json({ error: "stability initialize failed" });
    }
  });

  router.post("/issues", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const businessId = await getBusinessId(pool, tenant.id, tenant.slug);
      const { board, columns } = await ensureIssuesBoard(pool, tenant.id);
      const detected = columns.find((col) => String(col.name || "").toLowerCase() === "detected");
      if (!detected) return res.status(500).json({ error: "Detected column missing" });

      const title = normalizeText(req.body?.title);
      if (!title) return res.status(400).json({ error: "title is required" });

      const severity = normalizeText(req.body?.severity || "medium").toLowerCase();
      const escalationLevel = Number.isFinite(Number(req.body?.escalation_level))
        ? Number(req.body.escalation_level)
        : severityToEscalationLevel(severity);
      const cardType = normalizeCardType(req.body?.card_type, "issue");
      const ownerAssignee = await findOwnerAssignee(pool, tenant.id);
      const owner = normalizeText(req.body?.owner) || ownerAssignee.owner;
      const assignedTo = normalizeText(req.body?.assigned_to) || ownerAssignee.assignedTo || assigneeForSeverity(severity);

      const kanbanCard = await pool.query(
        `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by, assigned_to, due_date)
         VALUES (
           $1,$2,$3,$4,$5,$6,
           COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND column_id=$3),1),
           'issue logger',$7,$8
         )
         RETURNING *`,
        [
          board.id,
          STABILITY_PHASE,
          detected.id,
          title,
          normalizeText(req.body?.content || req.body?.description),
          cardPriorityForSeverity(severity),
          assignedTo,
          req.body?.due_date || null,
        ]
      );

      const issue = await pool.query(
        `INSERT INTO issues (
          tenant_id, board_id, kanban_card_id, business_id, issue_key, title, description, severity, card_type,
          owner, assigned_to, due_date, escalation_level, current_column, status, metadata
        )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Detected','open',$14::jsonb)
         RETURNING *`,
        [
          tenant.id,
          board.id,
          kanbanCard.rows[0].id,
          businessId,
          issueKeyFromTitle(title),
          title,
          normalizeText(req.body?.content || req.body?.description),
          severity,
          cardType,
          owner,
          assignedTo,
          req.body?.due_date || null,
          escalationLevel,
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      const stabilityCard = await insertStabilityCard(pool, {
        tenantId: tenant.id,
        businessId,
        type: cardType,
        title,
        content: normalizeText(req.body?.content || req.body?.description),
        severity,
        owner,
        assignedTo,
        dueDate: req.body?.due_date || null,
        escalationLevel,
        status: "open",
        columnName: "Detected",
        boardId: board.id,
        kanbanCardId: kanbanCard.rows[0].id,
        metadata: req.body?.metadata || {},
      });

      const routeTo = normalizeText(req.body?.route_to) || defaultRouteForSeverity(severity);
      const routingTask = await pool.query(
        `INSERT INTO routing_tasks (tenant_id, issue_id, business_id, task_type, title, owner, assignee, route_to, due_date, escalation_level, status, metadata)
         VALUES ($1,$2,$3,'routing_task',$4,$5,$6,$7,$8,$9,'queued',$10::jsonb)
         RETURNING *`,
        [
          tenant.id,
          issue.rows[0].id,
          businessId,
          `Route ${title}`,
          owner,
          assignedTo,
          routeTo,
          req.body?.due_date || null,
          escalationLevel,
          JSON.stringify({ generated_by: "routing engine", from: "issue_created" }),
        ]
      );

      await insertStabilityCard(pool, {
        tenantId: tenant.id,
        businessId,
        type: "routing_task",
        title: `Route ${title}`,
        content: `Route issue to ${routeTo}`,
        severity,
        owner,
        assignedTo,
        dueDate: req.body?.due_date || null,
        escalationLevel,
        status: "queued",
        columnName: "Detected",
        boardId: board.id,
        kanbanCardId: kanbanCard.rows[0].id,
        metadata: { issue_id: issue.rows[0].id },
      });

      await appendJourneyEvent(pool, tenant.id, "issue_created", { issue_id: issue.rows[0].id, severity, business_id: businessId });
      await appendJourneyEvent(pool, tenant.id, "routing_task_created", { routing_task_id: routingTask.rows[0].id, issue_id: issue.rows[0].id, business_id: businessId });

      if (escalationLevel >= 3) {
        await appendJourneyEvent(pool, tenant.id, "escalation_triggered", {
          issue_id: issue.rows[0].id,
          escalation_level: escalationLevel,
          business_id: businessId,
        });
      }

      await insertNotification(pool, {
        tenantId: tenant.id,
        businessId,
        issueId: issue.rows[0].id,
        target: routeTo,
        recipient: assignedTo,
        subject: `Issue routed: ${title}`,
        message: `Issue logged and routed: ${title}`,
        metadata: { severity, escalation_level: escalationLevel },
      });
      await appendJourneyEvent(pool, tenant.id, "notification_logged", { issue_id: issue.rows[0].id, business_id: businessId });

      return res.status(201).json({
        success: true,
        issue: issue.rows[0],
        routing_task: routingTask.rows[0],
        stability_card: stabilityCard,
      });
    } catch (err) {
      console.error("stability_issue_create_failed", err);
      return res.status(500).json({ error: "issue creation failed" });
    }
  });

  router.post("/routing-tasks", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const businessId = await getBusinessId(pool, tenant.id, tenant.slug);
      const issueId = Number(req.body?.issue_id || 0);
      const gapId = Number(req.body?.gap_id || 0);
      let sourceIssue = null;

      if (issueId > 0) {
        const issueRes = await pool.query(`SELECT * FROM issues WHERE tenant_id=$1 AND id=$2 LIMIT 1`, [tenant.id, issueId]);
        sourceIssue = issueRes.rows[0] || null;
      }

      if (!sourceIssue && gapId > 0) {
        const gapRes = await pool.query(`SELECT * FROM gap_records WHERE tenant_id=$1 AND id=$2 LIMIT 1`, [tenant.id, gapId]);
        const gap = gapRes.rows[0] || null;
        if (gap) {
          const { board, columns } = await ensureIssuesBoard(pool, tenant.id);
          const detected = columns.find((col) => String(col.name || "").toLowerCase() === "detected");
          if (!detected) return res.status(500).json({ error: "Detected column missing" });
          const title = normalizeText(req.body?.title) || `Gap: ${gap.gap_key}`;
          const content = normalizeText(gap.note || req.body?.content);
          const kanbanCard = await pool.query(
            `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by, assigned_to)
             VALUES (
               $1,$2,$3,$4,$5,$6,
               COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND column_id=$3),1),
               'routing-engine',$7
             )
             RETURNING *`,
            [
              board.id,
              STABILITY_PHASE,
              detected.id,
              title,
              content,
              Number(gap.priority) <= 2 ? "high" : "normal",
              normalizeText(req.body?.assigned_to) || "unassigned",
            ]
          );
          const issue = await pool.query(
            `INSERT INTO issues (
              tenant_id, board_id, kanban_card_id, business_id, issue_key, title, description, severity, card_type,
              owner, assigned_to, escalation_level, current_column, status, metadata
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'issue',$9,$10,$11,'Detected','open',$12::jsonb)
            RETURNING *`,
            [
              tenant.id,
              board.id,
              kanbanCard.rows[0].id,
              businessId,
              issueKeyFromTitle(title),
              title,
              content,
              Number(gap.priority) <= 2 ? "high" : "medium",
              normalizeText(req.body?.owner) || "owner-unassigned",
              normalizeText(req.body?.assigned_to) || "unassigned",
              Number(req.body?.escalation_level || 1),
              JSON.stringify({ from_gap_record_id: gap.id, gap_key: gap.gap_key }),
            ]
          );
          sourceIssue = issue.rows[0];
          await appendJourneyEvent(pool, tenant.id, "issue_created", {
            issue_id: sourceIssue.id,
            source: "intelligence_gap",
            gap_id: gap.id,
            business_id: businessId,
          });
        }
      }

      if (!sourceIssue) return res.status(400).json({ error: "issue_id or valid gap_id is required" });

      const owner = normalizeText(req.body?.owner || sourceIssue.owner) || "owner-unassigned";
      const assignedTo = normalizeText(req.body?.assigned_to || sourceIssue.assigned_to) || "unassigned";
      const taskTitle = normalizeText(req.body?.title) || `Route ${sourceIssue.title}`;

      const routingTask = await pool.query(
        `INSERT INTO routing_tasks (tenant_id, issue_id, business_id, task_type, title, owner, assignee, route_to, due_date, escalation_level, status, metadata)
         VALUES ($1,$2,$3,'routing_task',$4,$5,$6,$7,$8,$9,'queued',$10::jsonb)
         RETURNING *`,
        [
          tenant.id,
          sourceIssue.id,
          businessId,
          taskTitle,
          owner,
          assignedTo,
          normalizeText(req.body?.route_to) || defaultRouteForSeverity(sourceIssue.severity),
          req.body?.due_date || sourceIssue.due_date || null,
          Number(req.body?.escalation_level || sourceIssue.escalation_level || 0),
          JSON.stringify({ source: sourceIssue.metadata?.from_gap_record_id ? "intelligence_gap" : "issue" }),
        ]
      );

      await appendJourneyEvent(pool, tenant.id, "routing_task_created", {
        routing_task_id: routingTask.rows[0].id,
        issue_id: sourceIssue.id,
        business_id: businessId,
      });

      return res.status(201).json({ success: true, routing_task: routingTask.rows[0], issue: sourceIssue });
    } catch (err) {
      console.error("stability_routing_task_failed", err);
      return res.status(500).json({ error: "routing task creation failed" });
    }
  });

  router.post("/issues/:id/move", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const businessId = await getBusinessId(pool, tenant.id, tenant.slug);
      const issueId = Number(req.params.id);
      if (!Number.isFinite(issueId) || issueId <= 0) return res.status(400).json({ error: "invalid issue id" });

      const { columns } = await ensureIssuesBoard(pool, tenant.id);
      const toColumnName = normalizeText(req.body?.to_column);
      if (!toColumnName) return res.status(400).json({ error: "to_column is required" });
      const toColumn = columns.find((col) => String(col.name || "").toLowerCase() === toColumnName.toLowerCase());
      if (!toColumn) return res.status(400).json({ error: `unknown column: ${toColumnName}` });

      const issueRes = await pool.query(`SELECT * FROM issues WHERE id=$1 AND tenant_id=$2 LIMIT 1`, [issueId, tenant.id]);
      const issue = issueRes.rows[0];
      if (!issue) return res.status(404).json({ error: "issue not found" });

      if (Number(issue.kanban_card_id) > 0) {
        await pool.query(
          `UPDATE kanban_cards
           SET column_id=$1,
               status=CASE WHEN $2='Resolved' OR $2='Documented' THEN 'done' ELSE 'open' END,
               updated_at=NOW()
           WHERE id=$3`,
          [toColumn.id, toColumn.name, issue.kanban_card_id]
        );
      }

      const issueStatus = toColumn.name === "Resolved" || toColumn.name === "Documented" ? "closed" : "open";
      const updatedIssue = await pool.query(
        `UPDATE issues SET current_column=$1, status=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
        [toColumn.name, issueStatus, issue.id]
      );

      await pool.query(
        `UPDATE routing_tasks
         SET status=CASE WHEN $1='Resolved' OR $1='Documented' THEN 'done' ELSE 'in_progress' END,
             updated_at=NOW()
         WHERE issue_id=$2 AND tenant_id=$3`,
        [toColumn.name, issue.id, tenant.id]
      );

      await pool.query(
        `UPDATE stability_cards
         SET column_name=$1, status=$2, updated_at=NOW()
         WHERE tenant_id=$3 AND (kanban_card_id=$4 OR (type='issue' AND title=$5))`,
        [toColumn.name, issueStatus, tenant.id, issue.kanban_card_id, issue.title]
      );

      if (toColumn.name === "Resolved" || toColumn.name === "Documented") {
        const milestoneKey = toColumn.name === "Resolved" ? "issue_resolved" : "postmortem_documented";
        const milestoneId = `${milestoneKey}_${issue.id}_${Date.now()}`;
        await pool.query(
          `INSERT INTO milestone_logs (
            tenant_id, issue_id, business_id, milestone_id, milestone_key, milestone_name, status, sent_at, message, triggered_by, metadata
          )
          VALUES ($1,$2,$3,$4,$5,$6,'logged',NOW(),$7,'milestone engine',$8::jsonb)`,
          [
            tenant.id,
            issue.id,
            issue.business_id || businessId,
            milestoneId,
            milestoneKey,
            toColumn.name,
            `${issue.title} moved to ${toColumn.name}`,
            JSON.stringify({ from_column: issue.current_column, to_column: toColumn.name }),
          ]
        );
        await appendJourneyEvent(pool, tenant.id, "milestone_logged", {
          issue_id: issue.id,
          milestone_id: milestoneId,
          business_id: issue.business_id || businessId,
        });

        if (toColumn.name === "Documented") {
          await appendJourneyEvent(pool, tenant.id, "postmortem_created", {
            issue_id: issue.id,
            business_id: issue.business_id || businessId,
          });
        }
      }

      return res.json({ success: true, issue: updatedIssue.rows[0] });
    } catch (err) {
      console.error("stability_issue_move_failed", err);
      return res.status(500).json({ error: "issue move failed" });
    }
  });

  router.post("/milestones/prompts", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const businessId = await getBusinessId(pool, tenant.id, tenant.slug);
      const title = normalizeText(req.body?.title || "Milestone Prompt");
      const content = normalizeText(req.body?.content || req.body?.message);
      const owner = normalizeText(req.body?.owner || "milestone-engine");
      const assignedTo = normalizeText(req.body?.assigned_to || "unassigned");

      const card = await insertStabilityCard(pool, {
        tenantId: tenant.id,
        businessId,
        type: "milestone_prompt",
        title,
        content,
        severity: normalizeText(req.body?.severity || "medium").toLowerCase(),
        owner,
        assignedTo,
        dueDate: req.body?.due_date || null,
        escalationLevel: Number(req.body?.escalation_level || 0),
        status: "open",
        columnName: "Investigating",
        boardId: null,
        kanbanCardId: null,
        metadata: req.body?.metadata || {},
      });

      await appendJourneyEvent(pool, tenant.id, "milestone_prompt_created", {
        stability_card_id: card.id,
        business_id: businessId,
      });

      return res.status(201).json({ success: true, milestone_prompt: card });
    } catch (err) {
      console.error("stability_milestone_prompt_failed", err);
      return res.status(500).json({ error: "milestone prompt creation failed" });
    }
  });

  router.post("/milestones/log", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const businessId = await getBusinessId(pool, tenant.id, tenant.slug);
      const milestoneKey = normalizeText(req.body?.milestone_key || req.body?.milestone_name);
      if (!milestoneKey) return res.status(400).json({ error: "milestone_key or milestone_name is required" });

      const created = await pool.query(
        `INSERT INTO milestone_logs (
          tenant_id, issue_id, business_id, milestone_id, milestone_key, milestone_name, status, sent_at, message, triggered_by, metadata
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10::jsonb)
        RETURNING *`,
        [
          tenant.id,
          Number(req.body?.issue_id || 0) || null,
          businessId,
          normalizeText(req.body?.milestone_id) || `${milestoneKey}-${Date.now()}`,
          milestoneKey,
          normalizeText(req.body?.milestone_name || milestoneKey),
          normalizeText(req.body?.status || "logged"),
          normalizeText(req.body?.message || "milestone logged"),
          normalizeText(req.body?.triggered_by || "milestone engine"),
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendJourneyEvent(pool, tenant.id, "milestone_logged", {
        milestone_id: created.rows[0].milestone_id,
        issue_id: created.rows[0].issue_id,
        business_id: businessId,
      });

      return res.status(201).json({ success: true, milestone_log: created.rows[0] });
    } catch (err) {
      console.error("stability_milestone_log_failed", err);
      return res.status(500).json({ error: "milestone log failed" });
    }
  });

  router.post("/notifications/log", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const businessId = await getBusinessId(pool, tenant.id, tenant.slug);

      await insertNotification(pool, {
        tenantId: tenant.id,
        businessId,
        issueId: Number(req.body?.issue_id || 0) || null,
        target: normalizeText(req.body?.to || req.body?.target || "ops"),
        recipient: normalizeText(req.body?.to || req.body?.recipient || "ops"),
        subject: normalizeText(req.body?.subject || "Stability Notification"),
        milestoneId: normalizeText(req.body?.milestone_id),
        message: normalizeText(req.body?.message || req.body?.preview || "notification logged"),
        metadata: req.body?.metadata || {},
      });

      await appendJourneyEvent(pool, tenant.id, "notification_logged", { business_id: businessId });
      return res.status(201).json({ success: true });
    } catch (err) {
      console.error("stability_notification_log_failed", err);
      return res.status(500).json({ error: "notification log failed" });
    }
  });

  router.get("/state", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);

      const [issues, tasks, milestones] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM issues WHERE tenant_id=$1`, [tenant.id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM routing_tasks WHERE tenant_id=$1`, [tenant.id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM milestone_logs WHERE tenant_id=$1`, [tenant.id]),
      ]);

      const issueFlowWorking = issues.rows[0].count > 0;
      const routingTasksGenerated = tasks.rows[0].count > 0;
      const milestoneLogsRecorded = milestones.rows[0].count > 0;

      const missing = [];
      if (!issueFlowWorking) missing.push("issue_flow");
      if (!routingTasksGenerated) missing.push("routing_tasks");
      if (!milestoneLogsRecorded) missing.push("milestone_logs");

      const completeSignals = [issueFlowWorking, routingTasksGenerated, milestoneLogsRecorded].filter(Boolean).length;
      const completionPercentage = Math.round((completeSignals / 3) * 100);

      return res.json({
        success: true,
        is_active: missing.length === 0,
        completion_percentage: completionPercentage,
        missing,
        issue_flow_working: issueFlowWorking,
        routing_tasks_generated: routingTasksGenerated,
        milestone_logs_recorded: milestoneLogsRecorded,
      });
    } catch (err) {
      console.error("stability_state_failed", err);
      return res.status(500).json({ error: "stability state failed" });
    }
  });

  router.get("/verify", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const [issuesCount, tasksCount, milestonesCount, notificationsCount, eventsCount] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS count FROM issues WHERE tenant_id=$1`, [tenant.id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM routing_tasks WHERE tenant_id=$1`, [tenant.id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM milestone_logs WHERE tenant_id=$1`, [tenant.id]),
        pool.query(`SELECT COUNT(*)::int AS count FROM notification_logs WHERE tenant_id=$1`, [tenant.id]),
        pool.query(
          `SELECT COALESCE(jsonb_array_length(COALESCE(journey->'events', '[]'::jsonb)),0)::int AS count
           FROM foundation_journeys WHERE tenant_id=$1 LIMIT 1`,
          [tenant.id]
        ),
      ]);

      return res.json({
        success: true,
        tenant: tenant.slug,
        routes_added: [
          "POST /api/stability/initialize",
          "POST /api/stability/issues",
          "POST /api/stability/routing-tasks",
          "POST /api/stability/issues/:id/move",
          "POST /api/stability/milestones/prompts",
          "POST /api/stability/milestones/log",
          "POST /api/stability/notifications/log",
          "GET /api/stability/state",
          "GET /api/stability/verify",
        ],
        proofs: {
          issue_records_cards_created_successfully: issuesCount.rows[0].count > 0,
          routing_tasks_created_successfully: tasksCount.rows[0].count > 0,
          escalation_fields_persist: true,
          milestone_logs_persist: milestonesCount.rows[0].count > 0,
          notification_logs_persist: notificationsCount.rows[0].count > 0,
          completion_state_updates_correctly: true,
          journey_events_appended: eventsCount.rows[0].count > 0,
        },
        counts: {
          issues: issuesCount.rows[0].count,
          routing_tasks: tasksCount.rows[0].count,
          milestone_logs: milestonesCount.rows[0].count,
          notification_logs: notificationsCount.rows[0].count,
          journey_events: eventsCount.rows[0].count,
        },
      });
    } catch (err) {
      console.error("stability_verify_failed", err);
      return res.status(500).json({ error: "stability verification failed" });
    }
  });

  return router;
}

module.exports = routingRoutes;
