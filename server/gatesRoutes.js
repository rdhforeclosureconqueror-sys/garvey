"use strict";

const express = require("express");
const path = require("path");
const { GATES_CATALOG } = require("../gates/gatesCatalog");

function createGatesRouter() {
  const router = express.Router();

  router.get("/gates", (req, res) => res.sendFile(path.join(__dirname, "..", "public", "gates.html")));

  router.get("/api/gates/health", (req, res) => {
    console.log(JSON.stringify({ ts: new Date().toISOString(), event: "gates_health_check" }));
    return res.status(200).json({ ok: true, vertical: "the-gates", status: "mounted", version: "foundation" });
  });

  router.get("/api/gates/catalog", (req, res) => res.status(200).json({ gates: GATES_CATALOG }));

  return router;
}

module.exports = { createGatesRouter };
