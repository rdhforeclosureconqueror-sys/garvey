"use strict";

const crypto = require("crypto");
const express = require("express");
const {
  ENGINE_TYPES,
  LOVE_QUESTIONS,
  LOVE_QUESTION_SOURCE,
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

function pickAttribution(req) {
  const sourceType = String(req.query.source_type || req.body?.source_type || req.query.tap_source || req.body?.tap_source || "").trim().toLowerCase() || null;
  const ctx = {
    source_type: sourceType,
    tap_source: String(req.query.tap_source || req.body?.tap_source || "").trim() || null,
    tap_tag: String(req.query.tap_tag || req.body?.tap_tag || req.query.tag || req.body?.tag || "").trim() || null,
    tap_session: String(req.query.tap_session || req.body?.tap_session || req.body?.session_id || req.query.session_id || "").trim() || null,
    entry: String(req.query.entry || req.body?.entry || "").trim() || null,
    campaign: String(req.query.cid || req.body?.campaign || req.body?.cid || "").trim() || null,
    cid: String(req.query.cid || req.body?.cid || req.body?.campaign || "").trim() || null,
    crid: String(req.query.crid || req.body?.crid || req.query.rid || req.body?.rid || req.body?.user_id || "").trim() || null,
    rid: String(req.query.rid || req.body?.rid || req.query.crid || req.body?.crid || req.body?.user_id || "").trim() || null,
    route_mode: String(req.query.route_mode || req.body?.route_mode || "").trim() || null,
    email: String(req.query.email || req.body?.email || req.headers["x-user-email"] || "").trim().toLowerCase() || null,
    name: String(req.query.name || req.body?.name || req.body?.full_name || "").trim() || null,
  };
  return ctx;
}

async function recordEngineEvent(pool, { engineType, tenant, eventKey, ctx = {}, assessmentId = null, resultId = null }) {
  await pool.query(
    "INSERT INTO engine_page_views (id, engine_type, tenant_slug, page_key, session_id, user_id, campaign_context) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [
      newId("view"),
      engineType,
      tenant,
      eventKey,
      String(ctx.tap_session || "").trim() || null,
      String(ctx.crid || ctx.rid || "").trim() || null,
      JSON.stringify({
        ...ctx,
        source_path: ctx.tap_source || ctx.source_type || ctx.entry || "other",
        assessment_id: assessmentId || null,
        result_id: resultId || null,
      }),
    ]
  );
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

function inferFullName(inputName, email) {
  const provided = String(inputName || "").trim();
  if (provided) return provided;
  const local = String(email || "").trim().toLowerCase().split("@")[0] || "";
  const candidate = local.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!candidate) return "";
  return candidate.split(" ").map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : "").join(" ").trim();
}


async function resolveLoveRetakeAttempt(pool, { tenant, userId, fallback = 0 }) {
  const candidateUserId = String(userId || "").trim();
  if (!tenant || !candidateUserId) return Number(fallback || 0);
  const result = await pool.query(
    `SELECT COUNT(*)::int AS completed_count
       FROM engine_results r
       JOIN engine_assessments a ON a.id = r.assessment_id
      WHERE a.engine_type = 'love'
        AND a.tenant_slug = $1
        AND a.user_id = $2`,
    [tenant, candidateUserId]
  );
  return Number(result.rows?.[0]?.completed_count || 0);
}

function createArchetypeEnginesRouter({ pool }) {
  const router = express.Router();

  router.use((req, res, next) => {
    if (!isEnabled(req)) return res.status(404).json({ error: "not_found" });
    return next();
  });

  router.get("/health", (req, res) => {
    return res.json({
      ok: true,
      engines: {
        ...ENGINE_REGISTRY,
        love: {
          ...ENGINE_REGISTRY.love,
          questions: LOVE_QUESTIONS.length,
          questionSource: LOVE_QUESTION_SOURCE,
        },
      },
    });
  });

  router.get("/registry", (req, res) => res.json({ engines: ENGINE_REGISTRY }));

  router.get("/:engineType/assessment/consent-contract", (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    const tenant = pickTenant(req);
    const attribution = pickAttribution(req);
    recordEngineEvent(pool, { engineType, tenant, eventKey: "consent_viewed", ctx: attribution }).catch(() => {});
    return res.json(consentCopy(engineType));
  });

  router.post("/:engineType/assessment/consent", async (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    const accepted = req.body?.accepted === true;
    if (!accepted) return res.status(400).json({ error: "explicit consent acceptance is required" });

    const tenant = pickTenant(req);
    const attribution = pickAttribution(req);
    const email = String(req.body?.email || req.headers["x-user-email"] || "").trim().toLowerCase();
    const fullName = inferFullName(req.body?.name || req.body?.full_name, email);
    if (!tenant || !email || !fullName) {
      return res.status(400).json({
        error: "tenant_email_name_required",
        missing: {
          tenant: !tenant,
          email: !email,
          name: !fullName,
        },
      });
    }

    const consentVersion = String(req.body?.consent_version || CONSENT_VERSION).trim() || CONSENT_VERSION;
    const signature = buildConsentSignature({ engineType, tenant, email, consentVersion });
    const consentId = newId("consent");

    await pool.query(
      `INSERT INTO engine_assessment_consents
       (id, engine_type, tenant_slug, email, full_name, consent_version, consent_type, accepted, consent_signature, session_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [consentId, engineType, tenant, email, fullName, consentVersion, "business_only_required", true, signature, String(req.body?.session_id || "").trim() || null]
    );
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "consent_accepted", ctx: attribution });

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
    const attribution = pickAttribution(req);
    const routeMode = String(req.query.route_mode || "").trim().toLowerCase();
    const pageKey = routeMode === "assessment" ? "assessment_opened" : `${engineType}_archetypes`;
    await pool.query(
      "INSERT INTO engine_page_views (id, engine_type, tenant_slug, page_key, session_id, campaign_context) VALUES ($1,$2,$3,$4,$5,$6)",
      [newId("view"), engineType, tenant, pageKey, String(req.query.session_id || "").trim() || null, JSON.stringify(attribution)]
    );
    return res.json({ engineType, archetypes: content.archetypes });
  });

  router.get("/:engineType/archetypes/:slug", async (req, res) => {
    const { engineType, slug } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    const content = getEngineContent(engineType);
    const match = content.archetypes.find((a) => a.slug === slug);
    if (!match) return res.status(404).json({ error: "archetype_not_found" });
    const tenant = pickTenant(req);
    const attribution = pickAttribution(req);
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "archetype_detail_viewed", ctx: attribution });
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
    const attribution = pickAttribution(req);
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
      [assessmentId, engineType, tenant, String(req.body?.session_id || req.body?.tap_session || "").trim() || null, String(req.body?.user_id || req.body?.rid || req.body?.crid || "").trim() || null, JSON.stringify(attribution)]
    );
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "assessment_started", ctx: attribution, assessmentId });

    let retakeAttempt = Number(req.body?.retake_attempt || 0);
    if (engineType === "love") {
      retakeAttempt = await resolveLoveRetakeAttempt(pool, {
        tenant,
        userId: req.body?.user_id || req.body?.rid || req.body?.crid || attribution.rid || attribution.crid,
        fallback: retakeAttempt,
      });
    }

    const banks = getQuestionBanks(engineType, { retakeAttempt });
    if (engineType === "love" && banks.questionSource === "generated_validated_bank" && !banks.generatedBankAvailable) {
      return res.status(409).json({ error: "generated_retake_bank_unavailable", questionSource: "generated_validated_bank" });
    }

    return res.json({
      assessmentId,
      engineType,
      questionBanks: banks,
      ...(engineType === "love"
        ? { questionSource: banks.questionSource, useGeneratorOnFirstAttempt: false, questionSourceConfig: LOVE_QUESTION_SOURCE }
        : {}),
    });
  });

  router.post("/:engineType/assessment/score", async (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });

    const assessmentId = String(req.body?.assessmentId || "").trim();
    const answers = req.body?.answers || {};
    const tenant = pickTenant(req);
    const attribution = pickAttribution(req);
    if (!assessmentId) return res.status(400).json({ error: "assessmentId_required" });

    const scored = scoreEngineAssessment(engineType, answers, { bankId: String(req.body?.bank_id || "").trim() || null });
    const resultId = newId("result");
    await pool.query(
      `INSERT INTO engine_results (result_id, assessment_id, engine_type, tenant_slug, result_payload)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [resultId, assessmentId, engineType, tenant, JSON.stringify(scored)]
    );
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "assessment_completed", ctx: attribution, assessmentId, resultId });
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "result_created", ctx: attribution, assessmentId, resultId });

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
    const tenant = pickTenant(req) || result.rows[0].tenant_slug || null;
    const attribution = pickAttribution(req);
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "result_viewed", ctx: attribution, assessmentId: result.rows[0].assessment_id, resultId });
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
