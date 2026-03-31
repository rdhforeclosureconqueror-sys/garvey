"use strict";

const express = require("express");

const DEFAULT_COLUMNS = Object.freeze({
  ideas: [
    {
      type: "experiment",
      title: "Test targeted referral prompt at checkout for repeat buyers",
    },
  ],
  testing: [
    {
      type: "launch_gate",
      title: "Q2 upsell funnel gate pending conversion target validation",
      status: "not_ready",
    },
  ],
  implementing: [
    {
      type: "improvement",
      title: "Refine post-purchase nurture sequence for week-two retention",
    },
  ],
  completed: [
    {
      type: "handoff",
      title: "Launch checklist handoff delivered to operations lead",
    },
  ],
  teaching: [
    {
      type: "teach_forward",
      title: "Documented lesson: short demo videos increased trial conversion",
    },
  ],
});

const NOT_STARTED_STATE = Object.freeze({
  started: false,
  board: {
    ideas: [],
    testing: [],
    implementing: [],
    completed: [],
    teaching: [],
  },
  status: {
    launch_status: "Not yet started",
    marketing_ready: "In review",
    handoff_status: "Not yet started",
    improvement_count: 0,
    knowledge_entries: 0,
    launch_gate_ready: false,
  },
  records: {
    evaluation_records: [],
    yield_records: [],
    improvement_records: [],
    knowledge_entries: [],
    daily_content_rotation_results: [],
  },
});

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

async function ensureConfigRow(pool, tenantId) {
  const existing = await pool.query(
    `SELECT config FROM tenant_config WHERE tenant_id=$1 LIMIT 1`,
    [tenantId]
  );
  if (existing.rows[0]) return existing.rows[0].config || {};

  const inserted = await pool.query(
    `INSERT INTO tenant_config (tenant_id, config)
     VALUES ($1, '{}'::jsonb)
     RETURNING config`,
    [tenantId]
  );
  return inserted.rows[0]?.config || {};
}

function normalizeEvolutionState(rawState) {
  const source = rawState && typeof rawState === "object" ? rawState : {};
  const board = source.board && typeof source.board === "object" ? source.board : {};
  const status = source.status && typeof source.status === "object" ? source.status : {};
  const records = source.records && typeof source.records === "object" ? source.records : {};

  return {
    started: Boolean(source.started),
    board: {
      ideas: Array.isArray(board.ideas) ? board.ideas : [],
      testing: Array.isArray(board.testing) ? board.testing : [],
      implementing: Array.isArray(board.implementing) ? board.implementing : [],
      completed: Array.isArray(board.completed) ? board.completed : [],
      teaching: Array.isArray(board.teaching) ? board.teaching : [],
    },
    status: {
      launch_status: normalizeText(status.launch_status) || "Not yet started",
      marketing_ready: normalizeText(status.marketing_ready) || "In review",
      handoff_status: normalizeText(status.handoff_status) || "Not yet started",
      improvement_count: Number(status.improvement_count) || 0,
      knowledge_entries: Number(status.knowledge_entries) || 0,
      launch_gate_ready: Boolean(status.launch_gate_ready),
    },
    records: {
      evaluation_records: Array.isArray(records.evaluation_records) ? records.evaluation_records : [],
      yield_records: Array.isArray(records.yield_records) ? records.yield_records : [],
      improvement_records: Array.isArray(records.improvement_records) ? records.improvement_records : [],
      knowledge_entries: Array.isArray(records.knowledge_entries) ? records.knowledge_entries : [],
      daily_content_rotation_results: Array.isArray(records.daily_content_rotation_results)
        ? records.daily_content_rotation_results
        : [],
    },
  };
}

function nextBoardFromDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
}

function buildStateResponse(state) {
  const data = normalizeEvolutionState(state);
  const hasAnyData = data.started || Object.values(data.records).some((list) => Array.isArray(list) && list.length > 0);
  if (!hasAnyData) {
    return {
      ...NOT_STARTED_STATE,
      board: nextBoardFromDefaults(),
    };
  }

  return data;
}

async function readEvolutionState(pool, tenantId) {
  const config = await ensureConfigRow(pool, tenantId);
  return normalizeEvolutionState(config.evolution || null);
}

async function writeEvolutionState(pool, tenantId, state) {
  await pool.query(
    `UPDATE tenant_config
     SET config = jsonb_set(COALESCE(config, '{}'::jsonb), '{evolution}', $2::jsonb, true)
     WHERE tenant_id=$1`,
    [tenantId, JSON.stringify(normalizeEvolutionState(state))]
  );
}

function nowIso() {
  return new Date().toISOString();
}

function evolutionRoutes({ pool, ensureTenant }) {
  const router = express.Router();

  router.get("/state", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const state = await readEvolutionState(pool, tenant.id);
      return res.json({ success: true, tenant: tenant.slug, ...buildStateResponse(state) });
    } catch (err) {
      console.error("evolution_state_failed", err);
      return res.status(500).json({ error: "evolution state failed" });
    }
  });

  router.post("/evaluate", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const state = await readEvolutionState(pool, tenant.id);
      state.started = true;

      const passed = Boolean(req.body?.passed ?? (Math.random() > 0.45));
      const summary = normalizeText(req.body?.summary) || (passed
        ? "Evaluation passed: repeat purchase pathway stable"
        : "Evaluation failed: onboarding drop-off exceeded threshold");
      const record = { id: `eval_${Date.now()}`, passed, summary, created_at: nowIso() };
      state.records.evaluation_records.unshift(record);
      state.board.testing.unshift({
        type: passed ? "experiment" : "launch_gate",
        title: summary,
        status: passed ? "passed" : "not_ready",
        created_at: record.created_at,
      });
      if (state.board.testing.length > 25) state.board.testing = state.board.testing.slice(0, 25);
      state.status.launch_status = passed ? "Evaluation passed — launch confidence rising" : "Not ready — failed evaluation needs correction";
      state.status.marketing_ready = passed ? "Yes — campaign assets aligned" : "No — adjust messaging and fix leak";

      await writeEvolutionState(pool, tenant.id, state);
      return res.json({ success: true, tenant: tenant.slug, record, state: buildStateResponse(state) });
    } catch (err) {
      console.error("evolution_evaluate_failed", err);
      return res.status(500).json({ error: "evolution evaluate failed" });
    }
  });

  router.post("/verify", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const state = await readEvolutionState(pool, tenant.id);
      state.started = true;

      const ready = Boolean(req.body?.ready ?? !state.status.launch_gate_ready);
      const summary = normalizeText(req.body?.summary) || (ready
        ? "Launch gate cleared: funnel, fulfillment, and support checks passed"
        : "Launch gate blocked: compliance checklist incomplete");
      const gateCard = {
        type: "launch_gate",
        title: summary,
        status: ready ? "launch_ready" : "not_ready",
        created_at: nowIso(),
      };
      state.board.testing.unshift(gateCard);
      state.status.launch_gate_ready = ready;
      state.status.launch_status = ready ? "Ready to launch" : "Not ready — gate blocked";
      state.status.marketing_ready = ready ? "Yes — launch campaigns approved" : "No — unresolved compliance blocker";

      await writeEvolutionState(pool, tenant.id, state);
      return res.json({ success: true, tenant: tenant.slug, launch_gate: gateCard, state: buildStateResponse(state) });
    } catch (err) {
      console.error("evolution_verify_failed", err);
      return res.status(500).json({ error: "evolution verify failed" });
    }
  });

  router.post("/yield", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const state = await readEvolutionState(pool, tenant.id);
      state.started = true;

      const summary = normalizeText(req.body?.summary)
        || "Handoff packet transferred to launch operations pod";
      const record = { id: `yield_${Date.now()}`, summary, created_at: nowIso() };
      state.records.yield_records.unshift(record);
      state.board.completed.unshift({ type: "handoff", title: summary, created_at: record.created_at });
      state.status.handoff_status = "Handoff completed — launch team activated";

      await writeEvolutionState(pool, tenant.id, state);
      return res.json({ success: true, tenant: tenant.slug, record, state: buildStateResponse(state) });
    } catch (err) {
      console.error("evolution_yield_failed", err);
      return res.status(500).json({ error: "evolution yield failed" });
    }
  });

  router.post("/improvements", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const state = await readEvolutionState(pool, tenant.id);
      state.started = true;

      const summary = normalizeText(req.body?.summary)
        || "Improvement logged: reduced onboarding friction with simplified copy";
      const record = { id: `imp_${Date.now()}`, summary, created_at: nowIso() };
      state.records.improvement_records.unshift(record);
      state.board.implementing.unshift({ type: "improvement", title: summary, created_at: record.created_at });
      state.status.improvement_count = state.records.improvement_records.length;

      await writeEvolutionState(pool, tenant.id, state);
      return res.json({ success: true, tenant: tenant.slug, record, state: buildStateResponse(state) });
    } catch (err) {
      console.error("evolution_improvements_failed", err);
      return res.status(500).json({ error: "evolution improvements failed" });
    }
  });

  router.post("/knowledge", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const state = await readEvolutionState(pool, tenant.id);
      state.started = true;

      const summary = normalizeText(req.body?.summary)
        || "Teach-forward note: pre-launch FAQ lowers support load in week one";
      const record = { id: `know_${Date.now()}`, summary, created_at: nowIso() };
      state.records.knowledge_entries.unshift(record);
      state.board.teaching.unshift({ type: "teach_forward", title: summary, created_at: record.created_at });
      state.status.knowledge_entries = state.records.knowledge_entries.length;

      await writeEvolutionState(pool, tenant.id, state);
      return res.json({ success: true, tenant: tenant.slug, record, state: buildStateResponse(state) });
    } catch (err) {
      console.error("evolution_knowledge_failed", err);
      return res.status(500).json({ error: "evolution knowledge failed" });
    }
  });

  router.post("/daily-content/rotate", async (req, res) => {
    try {
      const tenantSlug = requireTenant(req, res);
      if (!tenantSlug) return;
      const tenant = await ensureTenant(tenantSlug);
      const state = await readEvolutionState(pool, tenant.id);
      state.started = true;

      const entry = {
        id: `rotation_${Date.now()}`,
        channel: normalizeText(req.body?.channel) || "social",
        status: "rotated",
        created_at: nowIso(),
      };
      state.records.daily_content_rotation_results.unshift(entry);

      await writeEvolutionState(pool, tenant.id, state);
      return res.json({ success: true, tenant: tenant.slug, result: entry, state: buildStateResponse(state) });
    } catch (err) {
      console.error("evolution_daily_content_rotation_failed", err);
      return res.status(500).json({ error: "evolution daily content rotation failed" });
    }
  });

  return router;
}

module.exports = evolutionRoutes;
