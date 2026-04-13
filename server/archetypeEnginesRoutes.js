"use strict";

const crypto = require("crypto");
const express = require("express");
const {
  ENGINE_TYPES,
  LOVE_QUESTIONS,
  getQuestionBanks,
  getEngineContent,
  scoreEngineAssessment,
  computeLoveCompatibility,
  newId,
} = require("./archetypeEnginesService");
const { ENGINE_REGISTRY } = require("../archetype-engines/framework");

const CONSENT_VERSION = "v1";

function isEnabled(req) {
  const mode = String(process.env.ARCHETYPE_ENGINES_MODE || "on").trim().toLowerCase();
  if (mode === "off") return false;
  if (mode === "internal") return String(req.headers["x-user-email"] || "").toLowerCase().includes("@") || req.query.internal === "1";
  return true;
}

function pickTenant(req) {
  return String(req.query.tenant || req.body?.tenant || req.headers["x-tenant-slug"] || "").trim().toLowerCase() || null;
}

function consentCopy(engineType) {
  return {
    engineType,
    consent_version: CONSENT_VERSION,
    consent_type: "business_only_required",
    heading: "Get Your Customer Profile + Rewards",
    body: [
      "Take a quick assessment to unlock your customer profile and start earning rewards.",
      "We use your responses to create your archetype profile and help this business serve you better.",
      "This helps us personalize your experience.",
    ],
    agreement: "I agree to the use of my assessment responses to create my archetype profile and personalize my experience with this business.",
  };
}

function buildConsentSignature({ engineType, tenant, email, consentVersion }) {
  return crypto.createHash("sha256").update(`${engineType}|${tenant}|${email}|${consentVersion}|accepted`).digest("hex");
}

function createArchetypeEnginesRouter({ pool }) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!isEnabled(req)) return res.status(404).json({ error: "not_found" });
    return next();
  });

  router.get("/health", (req, res) => {
    return res.json({ ok: true, engines: { ...ENGINE_REGISTRY, love: { ...ENGINE_REGISTRY.love, questions: LOVE_QUESTIONS.length } } });
  });

  router.get("/registry", (req, res) => res.json({ engines: ENGINE_REGISTRY }));

  router.get("/:engineType/assessment/consent-contract", (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    return res.json(consentCopy(engineType));
  });

  router.post("/:engineType/assessment/consent", async (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    const accepted = req.body?.accepted === true;
    if (!accepted) return res.status(400).json({ error: "explicit consent acceptance is required" });

    const tenant = pickTenant(req);
    const email = String(req.body?.email || req.headers["x-user-email"] || "").trim().toLowerCase();
    const fullName = String(req.body?.name || req.body?.full_name || "").trim();
    if (!tenant || !email || !fullName) return res.status(400).json({ error: "tenant_email_name_required" });

    const consentVersion = String(req.body?.consent_version || CONSENT_VERSION).trim() || CONSENT_VERSION;
    const signature = buildConsentSignature({ engineType, tenant, email, consentVersion });
    const consentId = newId("consent");

    await pool.query(
      `INSERT INTO engine_assessment_consents
       (id, engine_type, tenant_slug, email, full_name, consent_version, consent_type, accepted, consent_signature, session_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [consentId, engineType, tenant, email, fullName, consentVersion, "business_only_required", true, signature, String(req.body?.session_id || "").trim() || null]
    );

    return res.json({
      consent_id: consentId,
      engineType,
      accepted: true,
      consent_type: "business_only_required",
      consent_version: consentVersion,
      consent_signature: signature,
    });
  });

  router.get("/:engineType/archetypes", async (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    const content = getEngineContent(engineType);
    const tenant = pickTenant(req);
    await pool.query(
      "INSERT INTO engine_page_views (id, engine_type, tenant_slug, page_key, session_id, campaign_context) VALUES ($1,$2,$3,$4,$5,$6)",
      [newId("view"), engineType, tenant, `${engineType}_archetypes`, String(req.query.session_id || "").trim() || null, String(req.query.campaign || "").trim() || null]
    );
    return res.json({ engineType, archetypes: content.archetypes });
  });

  router.get("/:engineType/archetypes/:slug", async (req, res) => {
    const { engineType, slug } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    const content = getEngineContent(engineType);
    const match = content.archetypes.find((a) => a.slug === slug);
    if (!match) return res.status(404).json({ error: "archetype_not_found" });
    return res.json({ engineType, archetype: match });
  });

  router.get("/love/dynamics", (req, res) => {
    const content = getEngineContent("love");
    return res.json({ engineType: "love", dynamics: content.dynamics });
  });

  router.post("/:engineType/assessment/start", async (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });

    const tenant = pickTenant(req);
    if (engineType === "love") {
      const consentId = String(req.body?.consent_id || "").trim();
      if (!consentId) return res.status(403).json({ error: "consent_required_before_assessment" });
      const consentCheck = await pool.query(
        "SELECT id FROM engine_assessment_consents WHERE id = $1 AND engine_type = $2 AND tenant_slug = $3 AND accepted = true LIMIT 1",
        [consentId, engineType, tenant]
      );
      if (!consentCheck.rows[0]) return res.status(403).json({ error: "consent_required_before_assessment" });
    }

    const assessmentId = newId("asmt");
    await pool.query(
      `INSERT INTO engine_assessments (id, engine_type, tenant_slug, session_id, user_id, campaign_context)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [assessmentId, engineType, tenant, String(req.body?.session_id || "").trim() || null, String(req.body?.user_id || "").trim() || null, String(req.body?.campaign || "").trim() || null]
    );

    const banks = getQuestionBanks(engineType, { retakeAttempt: req.body?.retake_attempt || 0 });
    return res.json({ assessmentId, engineType, questionBanks: banks });
  });

  router.post("/:engineType/assessment/score", async (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });

    const assessmentId = String(req.body?.assessmentId || "").trim();
    const answers = req.body?.answers || {};
    if (!assessmentId) return res.status(400).json({ error: "assessmentId_required" });

    const scored = scoreEngineAssessment(engineType, answers);
    const resultId = newId("result");
    await pool.query(
      `INSERT INTO engine_results (result_id, assessment_id, engine_type, tenant_slug, result_payload)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [resultId, assessmentId, engineType, pickTenant(req), JSON.stringify(scored)]
    );

    return res.json({ resultId, engineType, ...scored });
  });

  router.get("/:engineType/results/:resultId", async (req, res) => {
    const { engineType, resultId } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });

    const result = await pool.query(
      "SELECT result_id, assessment_id, engine_type, tenant_slug, result_payload, created_at FROM engine_results WHERE result_id = $1 AND engine_type = $2 LIMIT 1",
      [resultId, engineType]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "result_not_found" });
    return res.json(result.rows[0]);
  });

  router.post("/love/compatibility/score", async (req, res) => {
    const { resultA, resultB } = req.body || {};
    if (!resultA || !resultB) return res.status(400).json({ error: "resultA_and_resultB_required" });
    const payload = computeLoveCompatibility(resultA, resultB);
    const id = newId("compat");
    await pool.query(
      "INSERT INTO engine_compatibility_results (id, engine_type, tenant_slug, payload) VALUES ($1,$2,$3,$4::jsonb)",
      [id, "love", pickTenant(req), JSON.stringify({ resultA, resultB, score: payload })]
    );
    return res.json({ compatibilityId: id, engineType: "love", ...payload });
  });

  return router;
}

module.exports = {
  createArchetypeEnginesRouter,
};
