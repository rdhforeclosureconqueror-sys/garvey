"use strict";

const crypto = require("crypto");
const express = require("express");
const {
  ENGINE_TYPES,
  LOVE_QUESTIONS,
  LOVE_QUESTION_SOURCE,
  LEADERSHIP_QUESTION_SOURCE,
  LOYALTY_QUESTION_SOURCE,
  getQuestionBanks,
  getEngineContent,
  scoreEngineAssessment,
  computeLoveCompatibility,
  newId,
  toCanonicalResultPayload,
} = require("./archetypeEnginesService");
const { ENGINE_REGISTRY } = require("../archetype-engines/framework");
const { queueExternalEvent, getExternalEventDiagnostics } = require("./simbawajumaEvents");

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
    tenant_id: String(req.query.tenant_id || req.body?.tenant_id || req.query.tenant || req.body?.tenant || "").trim().toLowerCase() || null,
    business_owner_id: String(req.query.business_owner_id || req.body?.business_owner_id || req.query.owner_id || req.body?.owner_id || "").trim() || null,
    email: String(req.query.email || req.body?.email || req.headers["x-user-email"] || "").trim().toLowerCase() || null,
    name: String(req.query.name || req.body?.name || req.body?.full_name || "").trim() || null,
  };
  return ctx;
}


function pickAudienceVariant(req) {
  const raw = String(req.query.audience_type || req.body?.audience_type || req.query.assessment_variant || req.body?.assessment_variant || req.query.content_variant || req.body?.content_variant || req.query.variant || req.body?.variant || "").trim().toLowerCase();
  return raw === "youth" ? "youth" : "standard";
}

function safeExternalReturnDestination(req) {
  const source = String(req.query.source_application || req.body?.source_application || req.query.source_type || req.body?.source_type || req.query.tap_source || req.body?.tap_source || "").trim().toLowerCase();
  const raw = String(req.query.return_url || req.body?.return_url || req.query.result_return_url || req.body?.result_return_url || "").trim();
  if (!raw) return null;
  const allowed = String(process.env.POCKETPT_RETURN_ORIGINS || "https://pocketpt.app,https://www.pocketpt.app").split(",").map((v) => v.trim()).filter(Boolean);
  try {
    const url = new URL(raw);
    if (source === "pocketpt" && allowed.includes(url.origin)) return url.href;
  } catch (_) {
    return null;
  }
  return null;
}

function normalizeAttribution(ctx = {}) {
  const campaign = String(ctx.campaign || ctx.cid || "").trim() || null;
  const cid = String(ctx.cid || ctx.campaign || "").trim() || null;
  const rid = String(ctx.rid || ctx.crid || ctx.user_id || "").trim() || null;
  const crid = String(ctx.crid || ctx.rid || ctx.user_id || "").trim() || null;
  const tapSession = String(ctx.tap_session || ctx.session_id || "").trim() || null;
  const sourceType = String(ctx.source_type || ctx.tap_source || "").trim().toLowerCase() || null;
  const tapSource = String(ctx.tap_source || "").trim() || null;
  const entry = String(ctx.entry || "").trim() || null;
  const sourcePath = String(ctx.source_path || tapSource || sourceType || entry || "other").trim() || "other";
  const tenantId = String(ctx.tenant_id || ctx.tenant || "").trim().toLowerCase() || null;
  const businessOwnerId = String(ctx.business_owner_id || ctx.owner_id || "").trim() || null;

  return {
    source_type: sourceType,
    tap_source: tapSource,
    source_path: sourcePath,
    tenant_id: tenantId,
    business_owner_id: businessOwnerId,
    campaign,
    cid,
    rid,
    crid,
    tap_session: tapSession,
    session_id: tapSession,
    session_alias: tapSession,
    user_id: String(ctx.user_id || rid || crid || "").trim() || null,
    tap_tag: String(ctx.tap_tag || ctx.tag || "").trim() || null,
    entry,
    route_mode: String(ctx.route_mode || "").trim() || null,
    email: String(ctx.email || "").trim().toLowerCase() || null,
    name: String(ctx.name || ctx.full_name || "").trim() || null,
    audience_type: String(ctx.audience_type || ctx.assessment_variant || ctx.content_variant || "").trim().toLowerCase() || null,
    assessment_variant: String(ctx.assessment_variant || ctx.audience_type || ctx.content_variant || "").trim().toLowerCase() || null,
    content_variant: String(ctx.content_variant || ctx.assessment_variant || ctx.audience_type || "").trim().toLowerCase() || null,
    source_application: String(ctx.source_application || ctx.source_type || "").trim().toLowerCase() || null,
    external_user_reference: String(ctx.external_user_reference || ctx.member_id || ctx.external_user_id || ctx.rid || "").trim() || null,
    external_enrollment_reference: String(ctx.external_enrollment_reference || ctx.enrollment_reference || "").trim() || null,
    external_cohort_reference: String(ctx.external_cohort_reference || ctx.cohort_reference || "").trim() || null,
    safe_return_url: String(ctx.safe_return_url || "").trim() || null,
  };
}

function mergeAttribution(base = {}, incoming = {}) {
  const merged = { ...(base || {}) };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (value !== null && value !== undefined && String(value).trim() !== "") merged[key] = value;
  }
  return normalizeAttribution(merged);
}

async function recordEngineEvent(pool, { engineType, tenant, eventKey, ctx = {}, assessmentId = null, resultId = null }) {
  const normalizedCtx = normalizeAttribution(ctx);
  await pool.query(
    "INSERT INTO engine_page_views (id, engine_type, tenant_slug, page_key, session_id, user_id, campaign_context) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [
      newId("view"),
      engineType,
      tenant,
      eventKey,
      String(normalizedCtx.tap_session || "").trim() || null,
      String(normalizedCtx.crid || normalizedCtx.rid || "").trim() || null,
      JSON.stringify({
        ...normalizedCtx,
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

function cleanPayloadTextArray(...candidates) {
  const out = [];
  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value === "object") return visit(value.text || value.label || value.title || value.value || value.message || value.summary || value.body);
    const text = String(value).replace(/^[-•*]\s*/, "").trim();
    if (text && !out.includes(text)) out.push(text);
  };
  candidates.forEach(visit);
  return out;
}

function normalizePayloadRecommendations(value) {
  if (Array.isArray(value)) return value.map((item) => {
    if (item && typeof item === "object") return { type: String(item.type || "recommendation"), label: String(item.label || item.title || item.value || item.message || "Recommendation"), value: item.value || item.url || item.href || item.text || item.message || item.label || null };
    return { type: "recommendation", label: "Recommendation", value: String(item || "").trim() };
  }).filter((item) => item.value || item.label);
  if (value && typeof value === "object") return Object.entries(value).map(([type, raw]) => ({ type, label: titleCase(type), value: raw && typeof raw === "object" ? (raw.value || raw.label || raw.title || raw.message || null) : raw })).filter((item) => item.value);
  return [];
}

function displayReadyCompletionPayload({ req, engineType, assessmentId, resultId, payload, createdAt }) {
  const canonical = payload.canonical || {};
  const attribution = payload.attribution || canonical.attribution || {};
  const primary = payload.primaryArchetype?.label || payload.primaryArchetype?.name || payload.primaryArchetype?.code || canonical.primary_archetype || null;
  const secondary = payload.secondaryArchetype?.label || payload.secondaryArchetype?.name || payload.secondaryArchetype?.code || canonical.secondary_archetype || null;
  const resultPath = `/archetype-engines/${encodeURIComponent(engineType)}/result/${encodeURIComponent(resultId)}${engineType === "love" ? "/story" : ""}`;
  const query = new URLSearchParams();
  for (const key of ["tenant", "email", "name", "rid", "crid", "return_url", "result_return_url", "dashboard_url"]) {
    const value = String(req.body?.[key] || req.query?.[key] || attribution?.[key] || "").trim();
    if (value) query.set(key, value);
  }
  const resultUrl = `${resultPath}${query.toString() ? `?${query.toString()}` : ""}`;
  const score = payload.overallScore ?? payload.confidence ?? payload.canonical?.overall_score ?? payload.summaryBlock?.confidence ?? null;
  const strengths = cleanPayloadTextArray(
    canonical.strengths,
    payload.strengths,
    payload.primaryInsight,
    payload.secondaryInsight,
    primary ? `Primary strength: ${primary}.` : null,
    secondary ? `Secondary support pattern: ${secondary}.` : null
  );
  const growthEdges = cleanPayloadTextArray(
    canonical.growth_edges,
    canonical.growth_areas,
    payload.growthEdges,
    payload.growthAreas,
    payload.balanceInsight,
    payload.identityGapInsight,
    payload.consistencyInsight
  );
  const recommendations = normalizePayloadRecommendations(canonical.recommendations || payload.recommendations || []);
  const completion = {
    event_type: "assessment.completed",
    member_id: String(req.body?.member_id || req.body?.external_user_id || req.body?.user_id || attribution.rid || attribution.crid || "").trim() || null,
    email: String(req.body?.email || attribution.email || "").trim().toLowerCase() || null,
    assessment_id: assessmentId,
    assessment_key: engineType,
    assessment_name: `${titleCase(engineType)} Archetype Engine`,
    assessment_type: engineType,
    result_id: resultId,
    result_url: resultUrl,
    completed_at: createdAt || new Date().toISOString(),
    completion_status: "completed",
    score,
    percentile: payload.percentile ?? null,
    overall_score: score,
    primary_result: primary,
    secondary_result: secondary,
    primary_archetype: primary,
    secondary_archetype: secondary,
    archetype: primary,
    summary: canonical.summary?.body || payload.primaryInsight || payload.balanceInsight || null,
    strengths,
    growth_edges: growthEdges,
    growth_areas: growthEdges,
    recommendations,
    recommended_next_assessment: canonical.next_assessment || payload.nextAssessment || null,
    next_assessment: canonical.next_assessment || payload.nextAssessment || null,
    star_reward_eligible: false,
    badge_reward_eligible: false,
    reward: { eligible: false, simba_points: 0, achievements: [] },
    badge_unlocks: payload.badgeUnlocks || [],
    future_review_date: payload.futureReviewDate || null,
  };
  completion.display_diagnostics = {
    primary_result_present: Boolean(completion.primary_result || completion.primary_archetype || completion.archetype),
    score_present: completion.score !== null && completion.score !== undefined || completion.percentile !== null && completion.percentile !== undefined,
    strengths_count: completion.strengths.length,
    growth_edges_count: completion.growth_edges.length,
    recommendations_count: completion.recommendations.length,
    result_url_present: Boolean(completion.result_url),
  };
  return completion;
}

function titleCase(value) {
  return String(value || "").replace(/(^|[-_\s])(\w)/g, (_, p1, p2) => `${p1}${p2.toUpperCase()}`);
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
        leadership: {
          ...ENGINE_REGISTRY.leadership,
          questions: 0,
          questionSource: LEADERSHIP_QUESTION_SOURCE,
        },
        loyalty: {
          ...ENGINE_REGISTRY.loyalty,
          questions: 0,
          questionSource: LOYALTY_QUESTION_SOURCE,
        },
      },
    });
  });

  router.get("/registry", (req, res) => res.json({ engines: ENGINE_REGISTRY }));

  router.get("/admin/simba-sync/diagnostics", async (_req, res) => {
    return res.json(await getExternalEventDiagnostics({ pool }));
  });

  router.get("/:engineType/assessment/consent-contract", (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });
    const tenant = pickTenant(req);
    const attribution = normalizeAttribution(pickAttribution(req));
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
    const attribution = { ...pickAttribution(req), audience_type: pickAudienceVariant(req), assessment_variant: pickAudienceVariant(req), content_variant: pickAudienceVariant(req), source_application: String(req.query.source_application || req.body?.source_application || "").trim().toLowerCase() || null, safe_return_url: safeExternalReturnDestination(req) };
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
    const attribution = { ...pickAttribution(req), audience_type: pickAudienceVariant(req), assessment_variant: pickAudienceVariant(req), content_variant: pickAudienceVariant(req), source_application: String(req.body?.source_application || req.query.source_application || "").trim().toLowerCase() || null, external_user_reference: String(req.body?.external_user_reference || req.body?.external_user_id || req.body?.member_id || "").trim() || null, external_enrollment_reference: String(req.body?.external_enrollment_reference || req.body?.enrollment_reference || "").trim() || null, external_cohort_reference: String(req.body?.external_cohort_reference || req.body?.cohort_reference || "").trim() || null, safe_return_url: safeExternalReturnDestination(req) };
    const consentId = String(req.body?.consent_id || "").trim();
    if (!consentId) return res.status(403).json({ error: "consent_required_before_assessment" });
    const consentCheck = await pool.query(
      "SELECT id FROM engine_assessment_consents WHERE id = $1 AND engine_type = $2 AND tenant_slug = $3 AND accepted = true LIMIT 1",
      [consentId, engineType, tenant]
    );
    if (!consentCheck.rows[0]) return res.status(403).json({ error: "consent_required_before_assessment" });

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

    const banks = getQuestionBanks(engineType, { retakeAttempt, audience: pickAudienceVariant(req), assessment_variant: pickAudienceVariant(req), content_variant: pickAudienceVariant(req) });
    if (banks.questionSource === "generated_validated_bank" && !banks.generatedBankAvailable) {
      return res.status(409).json({ error: "generated_retake_bank_unavailable", questionSource: "generated_validated_bank", diagnostics: banks.diagnostics || null });
    }
    if (banks.questionSource === "governed_retake_unconfigured") {
      return res.status(409).json({ error: "governed_retake_unconfigured", questionSource: "governed_retake_unconfigured", diagnostics: banks.diagnostics || null });
    }

    const sourceConfig = engineType === "love"
      ? LOVE_QUESTION_SOURCE
      : engineType === "leadership"
        ? LEADERSHIP_QUESTION_SOURCE
        : LOYALTY_QUESTION_SOURCE;

    return res.json({
      assessmentId,
      engineType,
      questionBanks: banks,
      questionSource: banks.questionSource,
      useGeneratorOnFirstAttempt: false,
      questionSourceConfig: sourceConfig,
      audience_type: pickAudienceVariant(req),
      assessment_variant: pickAudienceVariant(req),
      content_variant: pickAudienceVariant(req),
      source_application: attribution.source_application || null,
      safe_return_url: attribution.safe_return_url || null,
      diagnostics: banks.diagnostics || null,
    });
  });

  router.post("/:engineType/assessment/score", async (req, res) => {
    const { engineType } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });

    const assessmentId = String(req.body?.assessmentId || "").trim();
    const answers = req.body?.answers || {};
    const tenant = pickTenant(req);
    const attribution = { ...pickAttribution(req), audience_type: pickAudienceVariant(req), assessment_variant: pickAudienceVariant(req), content_variant: pickAudienceVariant(req), source_application: String(req.body?.source_application || req.query.source_application || "").trim().toLowerCase() || null, external_user_reference: String(req.body?.external_user_reference || req.body?.external_user_id || req.body?.member_id || "").trim() || null, external_enrollment_reference: String(req.body?.external_enrollment_reference || req.body?.enrollment_reference || "").trim() || null, external_cohort_reference: String(req.body?.external_cohort_reference || req.body?.cohort_reference || "").trim() || null, safe_return_url: safeExternalReturnDestination(req) };
    if (!assessmentId) return res.status(400).json({ error: "assessmentId_required" });

    const bankId = String(req.body?.bank_id || "").trim() || null;
    const scored = scoreEngineAssessment(engineType, answers, { bankId });
    const canonical = toCanonicalResultPayload({
      engineType,
      scored,
      assessmentId,
      userId: String(req.body?.user_id || req.body?.rid || req.body?.crid || attribution.rid || attribution.crid || "").trim() || null,
      bankId,
      questionSource: String(req.body?.questionSource || "").trim() || null,
      attribution: { ...attribution, tenant, tenant_id: attribution.tenant_id || tenant },
    });
    const topLevelAttribution = normalizeAttribution({ ...attribution, tenant, tenant_id: attribution.tenant_id || tenant });
    const payload = { ...scored, audience_type: pickAudienceVariant(req), assessment_variant: pickAudienceVariant(req), content_variant: pickAudienceVariant(req), source_application: topLevelAttribution.source_application || null, safe_return_url: topLevelAttribution.safe_return_url || null, attribution: topLevelAttribution, canonical };
    const resultId = newId("result");
    await pool.query(
      `INSERT INTO engine_results (result_id, assessment_id, engine_type, tenant_slug, result_payload)
       VALUES ($1,$2,$3,$4,$5::jsonb)`,
      [resultId, assessmentId, engineType, tenant, JSON.stringify(payload)]
    );
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "assessment_completed", ctx: topLevelAttribution, assessmentId, resultId });
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "result_created", ctx: topLevelAttribution, assessmentId, resultId });

    const completionPayload = displayReadyCompletionPayload({ req, engineType, assessmentId, resultId, payload });
    const simbaSync = await queueExternalEvent({
      eventType: "assessment.completed",
      userId: Number(req.body?.garvey_user_id || req.body?.local_user_id) || null,
      externalUserId: completionPayload.member_id || completionPayload.email,
      email: completionPayload.email,
      payload: completionPayload,
      pool,
    }).catch((err) => ({ queued: false, reason: err.message }));

    return res.json({ resultId, engineType, simba_sync: simbaSync, ...payload });
  });


  router.get("/:engineType/results/:resultId/summary", async (req, res) => {
    const { engineType, resultId } = req.params;
    if (!ENGINE_TYPES.includes(engineType)) return res.status(404).json({ error: "engine_not_found" });

    const configuredToken = String(process.env.POCKETPT_API_TOKEN || "");
    if (!configuredToken) return res.status(503).json({ error: "Integration unavailable" });

    const source = String(req.headers["x-source-application"] || "").trim().toLowerCase();
    if (source !== "pocketpt") return res.status(403).json({ error: "Access denied" });

    const submittedToken = String(req.headers["x-pocketpt-token"] || "");
    if (!submittedToken) return res.status(401).json({ error: "Authentication required" });
    const configuredTokenBytes = Buffer.from(configuredToken);
    const submittedTokenBytes = Buffer.from(submittedToken);
    if (configuredTokenBytes.length !== submittedTokenBytes.length || !crypto.timingSafeEqual(configuredTokenBytes, submittedTokenBytes)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const requiredContext = {
      participant: String(req.headers["x-pocketpt-participant-id"] || "").trim(),
      enrollment: String(req.headers["x-pocketpt-enrollment-id"] || "").trim(),
      cohort: String(req.headers["x-pocketpt-cohort-id"] || "").trim(),
    };
    if (!requiredContext.participant || !requiredContext.enrollment || !requiredContext.cohort) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await pool.query(
      "SELECT result_id, assessment_id, engine_type, tenant_slug, result_payload, created_at FROM engine_results WHERE result_id = $1 AND engine_type = $2 LIMIT 1",
      [resultId, engineType]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "result_not_found" });
    const payload = result.rows[0].result_payload || {};
    const attribution = payload.attribution || payload.canonical?.attribution || {};
    const storedContext = {
      source: String(payload.source_application || attribution.source_application || "").trim().toLowerCase(),
      audience: String(payload.audience_type || attribution.audience_type || payload.assessment_variant || attribution.assessment_variant || "").trim().toLowerCase(),
      participant: String(payload.external_user_reference || attribution.external_user_reference || "").trim(),
      enrollment: String(payload.external_enrollment_reference || attribution.external_enrollment_reference || "").trim(),
      cohort: String(payload.external_cohort_reference || attribution.external_cohort_reference || payload.cohort_reference || attribution.cohort_reference || "").trim(),
    };
    if (storedContext.source !== "pocketpt"
      || storedContext.audience !== "youth"
      || storedContext.participant !== requiredContext.participant
      || storedContext.enrollment !== requiredContext.enrollment
      || storedContext.cohort !== requiredContext.cohort) {
      return res.status(403).json({ error: "Access denied" });
    }

    const canonical = payload.canonical || {};
    const primaryCode = payload.primaryArchetype?.code || canonical.identity?.primary || canonical.primary_archetype || null;
    const secondaryCode = payload.secondaryArchetype?.code || canonical.identity?.secondary || canonical.secondary_archetype || null;
    const content = getEngineContent(engineType);
    const byCode = Object.fromEntries((content?.archetypes || []).map((a) => [a.code, a]));
    return res.json({
      completion_status: "completed",
      completed_at: result.rows[0].created_at,
      assessment_version: canonical.version || "v1",
      audience_type: storedContext.audience,
      source_application: storedContext.source,
      primary_archetype_id: primaryCode,
      primary_archetype_name: byCode[primaryCode]?.canonicalName || byCode[primaryCode]?.name || primaryCode,
      secondary_archetype_id: secondaryCode,
      secondary_archetype_name: byCode[secondaryCode]?.canonicalName || byCode[secondaryCode]?.name || secondaryCode,
      strength_summary: payload.primaryInsight || canonical.summary?.body || byCode[primaryCode]?.shortDescription || null,
      growth_summary: payload.balanceInsight || payload.identityGapInsight || byCode[primaryCode]?.rebalanceGuidance || null,
      suggested_weekly_leadership_practice: payload.youth_weekly_practice || byCode[primaryCode]?.rebalanceGuidance || "Choose one group situation this week and practice using your strength in a balanced way.",
      garvey_result_reference: resultId,
    });
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
    const storedPayload = result.rows[0].result_payload || {};
    const storedAttribution = normalizeAttribution(
      storedPayload.attribution
      || storedPayload.canonical?.attribution
      || {}
    );
    const requestAttribution = pickAttribution(req);
    const mergedAttribution = mergeAttribution(storedAttribution, requestAttribution);
    await recordEngineEvent(pool, { engineType, tenant, eventKey: "result_viewed", ctx: mergedAttribution, assessmentId: result.rows[0].assessment_id, resultId });
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
