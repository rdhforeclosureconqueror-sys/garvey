"use strict";

const express = require("express");

const INFRA_BOARD_KEY = "tools_board";
const INFRA_COLUMNS = [
  { name: "Needed", position: 1 },
  { name: "Selected", position: 2 },
  { name: "Active", position: 3 },
  { name: "Documented", position: 4 },
];
const INFRA_CARD_TYPES = ["tool", "doc", "guide", "template"];
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

async function appendInfrastructureJourneyEvent(pool, tenantId, eventType, payload = {}) {
  const journeyEvent = {
    phase: "infrastructure",
    event_type: eventType,
    timestamp: new Date().toISOString(),
    payload: payload || {},
  };
  await pool.query(
    `UPDATE foundation_journeys
     SET journey = jsonb_set(
       COALESCE(journey, '{}'::jsonb),
       '{events}',
       COALESCE(journey->'events', '[]'::jsonb) || jsonb_build_array($2::jsonb),
       true
     ),
     updated_at = NOW()
     WHERE tenant_id=$1`,
    [tenantId, JSON.stringify(journeyEvent)]
  );
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

async function ensureToolsBoard(pool, tenantId) {
  const boardRes = await pool.query(
    `INSERT INTO kanban_boards (tenant_id, board_key, name)
     VALUES ($1,$2,'Tools Board')
     ON CONFLICT (tenant_id, board_key)
     DO UPDATE SET name='Tools Board', updated_at=NOW()
     RETURNING *`,
    [tenantId, INFRA_BOARD_KEY]
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

  for (const col of INFRA_COLUMNS) {
    if (byName.has(col.name.toLowerCase())) continue;
    await pool.query(
      `INSERT INTO kanban_columns (board_id, phase, name, position)
       VALUES ($1,'INFRASTRUCTURE',$2,$3)`,
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

async function ensureInfrastructureCards(pool, tenantId, boardId, columns) {
  const neededColumn = columns.find((col) => String(col.name || "").toLowerCase() === "needed");
  if (!neededColumn) return [];

  const existing = await pool.query(
    `SELECT * FROM infrastructure_cards WHERE tenant_id=$1 ORDER BY id ASC`,
    [tenantId]
  );
  const byType = new Map(existing.rows.map((row) => [row.card_type, row]));

  for (const type of INFRA_CARD_TYPES) {
    if (byType.has(type)) continue;
    const title = type.toUpperCase();
    const createdKanban = await pool.query(
      `INSERT INTO kanban_cards (board_id, phase, column_id, title, description, priority, position, created_by)
       VALUES (
         $1,'INFRASTRUCTURE',$2,$3,'','normal',
         COALESCE((SELECT MAX(position)+1 FROM kanban_cards WHERE board_id=$1 AND column_id=$2),1),
         'system'
       )
       RETURNING id`,
      [boardId, neededColumn.id, title]
    );
    await pool.query(
      `INSERT INTO infrastructure_cards (
        tenant_id, board_id, kanban_card_id, card_type, title, content, column_name, status
      )
      VALUES ($1,$2,$3,$4,$5,'','Needed','Needed')`,
      [tenantId, boardId, createdKanban.rows[0].id, type, title]
    );
  }

  const cards = await pool.query(
    `SELECT ic.*, kc.column_id, kc.position
     FROM infrastructure_cards ic
     LEFT JOIN kanban_cards kc ON kc.id=ic.kanban_card_id
     WHERE ic.tenant_id=$1
     ORDER BY ic.id ASC`,
    [tenantId]
  );
  return cards.rows;
}

async function validateUrl(url) {
  const cleanUrl = normalizeText(url);
  if (!cleanUrl) {
    return { status: "invalid", http_status: null, error: "url is required" };
  }

  try {
    new URL(cleanUrl);
  } catch (_) {
    return { status: "invalid", http_status: null, error: "invalid URL format" };
  }

  try {
    const resp = await fetch(cleanUrl, { method: "HEAD", redirect: "follow" });
    return {
      status: resp.ok ? "accessible" : "inaccessible",
      http_status: resp.status,
      error: resp.ok ? "" : `HTTP ${resp.status}`,
    };
  } catch (err) {
    return {
      status: "inaccessible",
      http_status: null,
      error: normalizeText(err?.message) || "request failed",
    };
  }
}

function fromGapRecommendations(recommendedActions = []) {
  return recommendedActions.map((row) => ({
    action_key: row.action_key,
    title: row.title,
    description: row.description,
    source: row.source,
    suggested_type: row.action_key && row.action_key.startsWith("fix_") ? "guide" : "tool",
  }));
}

function infrastructureRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.post("/initialize", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);

      const { board, columns } = await ensureToolsBoard(pool, tenant.id);
      const cards = await ensureInfrastructureCards(pool, tenant.id, board.id, columns);

      await appendInfrastructureJourneyEvent(pool, tenant.id, "infrastructure_initialized", {
        board_id: board.id,
      });

      return res.json({
        success: true,
        phase: 5,
        phase_name: "Infrastructure",
        tenant: tenant.slug,
        board,
        columns,
        cards,
        data_objects: ["tools", "resources", "templates", "links"],
        gadgets: [
          "tool registry",
          "resource hub",
          "link validator",
          "recommendation engine",
        ],
      });
    } catch (err) {
      console.error("infrastructure_initialize_failed", err);
      return res.status(500).json({ error: "infrastructure initialize failed" });
    }
  });

  router.post("/tools", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const name = normalizeText(req.body?.name);
      if (!name) return res.status(400).json({ error: "name is required" });

      const created = await pool.query(
        `INSERT INTO infrastructure_tools (tenant_id, name, description, category, status, url, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
         RETURNING *`,
        [
          tenant.id,
          name,
          normalizeText(req.body?.description),
          normalizeText(req.body?.category),
          normalizeText(req.body?.status) || "Needed",
          normalizeText(req.body?.url),
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendInfrastructureJourneyEvent(pool, tenant.id, "tool_created", {
        tool_id: created.rows[0].id,
        name,
      });

      return res.json({ success: true, tool: created.rows[0] });
    } catch (err) {
      console.error("infrastructure_tool_create_failed", err);
      return res.status(500).json({ error: "infrastructure tool create failed" });
    }
  });

  router.post("/resources", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const name = normalizeText(req.body?.name);
      if (!name) return res.status(400).json({ error: "name is required" });

      const created = await pool.query(
        `INSERT INTO infrastructure_resources (tenant_id, name, resource_type, location, status, metadata)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         RETURNING *`,
        [
          tenant.id,
          name,
          normalizeText(req.body?.resource_type),
          normalizeText(req.body?.location),
          normalizeText(req.body?.status) || "available",
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendInfrastructureJourneyEvent(pool, tenant.id, "resource_created", {
        resource_id: created.rows[0].id,
        name,
      });

      return res.json({ success: true, resource: created.rows[0] });
    } catch (err) {
      console.error("infrastructure_resource_create_failed", err);
      return res.status(500).json({ error: "infrastructure resource create failed" });
    }
  });

  router.post("/templates", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const name = normalizeText(req.body?.name);
      if (!name) return res.status(400).json({ error: "name is required" });

      const created = await pool.query(
        `INSERT INTO infrastructure_templates (tenant_id, name, template_key, status, source_url, metadata)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb)
         RETURNING *`,
        [
          tenant.id,
          name,
          normalizeText(req.body?.template_key),
          normalizeText(req.body?.status) || "draft",
          normalizeText(req.body?.source_url),
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendInfrastructureJourneyEvent(pool, tenant.id, "template_created", {
        template_id: created.rows[0].id,
        name,
      });

      return res.json({ success: true, template: created.rows[0] });
    } catch (err) {
      console.error("infrastructure_template_create_failed", err);
      return res.status(500).json({ error: "infrastructure template create failed" });
    }
  });

  router.post("/links", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const label = normalizeText(req.body?.label);
      const url = normalizeText(req.body?.url);
      if (!label || !url) return res.status(400).json({ error: "label and url are required" });

      const validation = await validateUrl(url);
      const created = await pool.query(
        `INSERT INTO infrastructure_links (
          tenant_id, label, url, status, last_checked_at, http_status, error_message, metadata
        )
         VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7::jsonb)
         RETURNING *`,
        [
          tenant.id,
          label,
          url,
          validation.status,
          validation.http_status,
          validation.error,
          JSON.stringify(req.body?.metadata || {}),
        ]
      );

      await appendInfrastructureJourneyEvent(pool, tenant.id, "link_created", {
        link_id: created.rows[0].id,
        status: validation.status,
      });

      return res.json({ success: true, link: created.rows[0], validation });
    } catch (err) {
      console.error("infrastructure_link_create_failed", err);
      return res.status(500).json({ error: "infrastructure link create failed" });
    }
  });

  router.post("/links/validate", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);
      const linkId = Number(req.body?.link_id);

      const query = Number.isFinite(linkId) && linkId > 0
        ? {
          sql: `SELECT * FROM infrastructure_links WHERE tenant_id=$1 AND id=$2 ORDER BY id ASC`,
          values: [tenant.id, linkId],
        }
        : {
          sql: `SELECT * FROM infrastructure_links WHERE tenant_id=$1 ORDER BY id ASC`,
          values: [tenant.id],
        };

      const links = await pool.query(query.sql, query.values);
      const results = [];
      for (const row of links.rows) {
        const validation = await validateUrl(row.url);
        await pool.query(
          `UPDATE infrastructure_links
           SET status=$2, last_checked_at=NOW(), http_status=$3, error_message=$4, updated_at=NOW()
           WHERE id=$1`,
          [row.id, validation.status, validation.http_status, validation.error]
        );
        await appendInfrastructureJourneyEvent(pool, tenant.id, "link_validated", {
          link_id: row.id,
          status: validation.status,
          http_status: validation.http_status,
        });
        results.push({ id: row.id, label: row.label, url: row.url, ...validation });
      }

      return res.json({ success: true, validated: results.length, results });
    } catch (err) {
      console.error("infrastructure_link_validate_failed", err);
      return res.status(500).json({ error: "infrastructure link validate failed" });
    }
  });

  router.get("/hub", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);

      const [tools, resources, templates, links] = await Promise.all([
        pool.query(`SELECT * FROM infrastructure_tools WHERE tenant_id=$1 ORDER BY id ASC`, [tenant.id]),
        pool.query(`SELECT * FROM infrastructure_resources WHERE tenant_id=$1 ORDER BY id ASC`, [tenant.id]),
        pool.query(`SELECT * FROM infrastructure_templates WHERE tenant_id=$1 ORDER BY id ASC`, [tenant.id]),
        pool.query(`SELECT * FROM infrastructure_links WHERE tenant_id=$1 ORDER BY id ASC`, [tenant.id]),
      ]);

      return res.json({
        success: true,
        tenant: tenant.slug,
        tools: tools.rows,
        resources: resources.rows,
        templates: templates.rows,
        links: links.rows,
        completion_rules: ["tools organized", "resources available"],
        verification: ["links accessible", "resources retrievable"],
      });
    } catch (err) {
      console.error("infrastructure_hub_fetch_failed", err);
      return res.status(500).json({ error: "infrastructure hub fetch failed" });
    }
  });

  router.get("/recommendations", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      await ensureJourneyRecord(pool, tenant.id, tenant.slug);

      const actions = await pool.query(
        `SELECT action_key, title, description, source
         FROM recommended_actions
         WHERE tenant_id=$1
         ORDER BY created_at DESC
         LIMIT 10`,
        [tenant.id]
      );

      const recommendations = fromGapRecommendations(actions.rows);
      await appendInfrastructureJourneyEvent(pool, tenant.id, "recommendation_generated", {
        recommendation_count: recommendations.length,
      });

      return res.json({
        success: true,
        tenant: tenant.slug,
        recommendations,
      });
    } catch (err) {
      console.error("infrastructure_recommendations_failed", err);
      return res.status(500).json({ error: "infrastructure recommendations failed" });
    }
  });

  return router;
}

module.exports = infrastructureRoutes;
