"use strict";
const express = require("express");
const { runMembershipAcceptance } = require("./membershipAcceptance");
function createMembershipDiagnosticsRouter({ pool, version }) {
  const router = express.Router();
  function admin(req,res,next) {
    if (!req.authActor || !req.authActor.isAdmin) return res.status(403).json({ error: "admin_session_required" });
    next();
  }
  async function ensureTable() {
    await pool.query(`CREATE TABLE IF NOT EXISTS membership_diagnostic_runs (
      id BIGSERIAL PRIMARY KEY, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      admin_user_id BIGINT NOT NULL, commit_sha TEXT NOT NULL,
      result JSONB NOT NULL
    )`);
  }
  router.get("/api/admin/membership-diagnostics/latest",admin,async(req,res)=>{
    try {
      await ensureTable();
      const r=await pool.query("SELECT id,created_at,commit_sha,result FROM membership_diagnostic_runs ORDER BY id DESC LIMIT 1");
      res.set("Cache-Control","no-store").json({latest:r.rows[0]||null});
    } catch(e) { console.error("membership_diagnostics_read_failed",e); res.status(503).json({error:"diagnostics_store_unavailable"}); }
  });
  router.post("/api/admin/membership-diagnostics/run",admin,async(req,res)=>{
    // Restrict state-changing requests to same-origin browser sessions.
    const origin=req.get("origin");
    if (!origin || origin !== `${req.protocol}://${req.get("host")}`) return res.status(403).json({error:"same_origin_required"});
    if (!req.is("application/json")) return res.status(415).json({error:"json_required"});
    try {
      await ensureTable();
      const report=runMembershipAcceptance();
      const commit=version().commit_sha;
      const r=await pool.query("INSERT INTO membership_diagnostic_runs(admin_user_id,commit_sha,result) VALUES ($1,$2,$3::jsonb) RETURNING id,created_at", [req.authActor.userId,commit,JSON.stringify(report)]);
      res.set("Cache-Control","no-store").status(report.failed?422:200).json({id:r.rows[0].id,created_at:r.rows[0].created_at,commit_sha:commit,...report});
    } catch(e) { console.error("membership_diagnostics_run_failed",e); res.status(503).json({error:"diagnostics_store_unavailable"}); }
  });
  router.get("/admin/membership-diagnostics",admin,(req,res)=>{
    res.set("Cache-Control","no-store").type("html").send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Garvey Membership Diagnostics</title><style>body{background:#101b30;color:#f5f8ff;font:16px system-ui;max-width:860px;margin:32px auto;padding:20px}button{padding:14px 20px;background:#8be6d0;border:0;border-radius:10px;font-weight:700;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#1a2c47;padding:20px;border-radius:12px}</style><h1>Garvey Membership Diagnostics</h1><p>Live-server synthetic checks. No payments or parent records are changed. NOT_CONFIGURED steps do not count as production acceptance.</p><button id="run">Run Membership Flow Test</button><h2>Latest saved run</h2><pre id="results">Loading...</pre><script>const out=document.getElementById("results");async function load(){const r=await fetch("/api/admin/membership-diagnostics/latest",{credentials:"same-origin"});out.textContent=JSON.stringify(await r.json(),null,2)}document.getElementById("run").onclick=async()=>{out.textContent="Running...";try{const r=await fetch("/api/admin/membership-diagnostics/run",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",credentials:"same-origin"});out.textContent=JSON.stringify(await r.json(),null,2)}catch(e){out.textContent=String(e)}};load().catch(e=>out.textContent=String(e));</script></html>`);
  });
  return router;
}
module.exports={createMembershipDiagnosticsRouter};
