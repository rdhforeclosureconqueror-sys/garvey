"use strict";

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function titleCase(s) {
  return String(s || "").replace(/(^|[-_\s])(\w)/g, (_, p1, p2) => `${p1}${p2.toUpperCase()}`);
}

function parseRoute() {
  const parts = String(window.location.pathname || "").split("/").filter(Boolean);
  if (parts.length < 3 || parts[0] !== "archetype-engines") return null;
  const engine = parts[1];
  if (!["love", "leadership", "loyalty"].includes(engine)) return null;
  const section = parts[2];
  if (section === "browse") return { engine, mode: "browse", resultId: "", slug: "" };
  if (section === "assessment") return { engine, mode: "assessment", resultId: "", slug: "" };
  if (section === "archetype" && parts[3]) return { engine, mode: "detail", resultId: "", slug: parts[3] };
  if (section === "result" && parts[3]) {
    return { engine, mode: parts[4] === "story" ? "story" : "result", resultId: parts[3], slug: "" };
  }
  return null;
}

async function jsonFetch(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Failed (${res.status}) ${url}`);
  return res.json();
}

function sortScores(normalizedScores) {
  return Object.entries(normalizedScores || {}).sort((a, b) => b[1] - a[1]).map(([code, score], idx) => ({ code, score, rank: idx + 1 }));
}

function cardPlaceholder(archetype) {
  const key = archetype?.imageKey || "missing-image";
  return `<div class="placeholder-card"><div><div>Card Placeholder</div><small class="muted">imageKey: ${esc(key)}</small></div></div>`;
}

function safeAssetPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/")) return raw;
  return "";
}

const LOVE_IMAGE_VARIANT_KEY = "garvey.loveImageVariant";
const LOVE_IMAGE_VARIANTS = Object.freeze(["masculine", "feminine"]);

function getStoredLoveImageVariant() {
  try {
    const raw = window.localStorage.getItem(LOVE_IMAGE_VARIANT_KEY);
    return LOVE_IMAGE_VARIANTS.includes(raw) ? raw : LOVE_IMAGE_VARIANTS[0];
  } catch (_) {
    return LOVE_IMAGE_VARIANTS[0];
  }
}

function setStoredLoveImageVariant(variant) {
  try {
    if (LOVE_IMAGE_VARIANTS.includes(variant)) window.localStorage.setItem(LOVE_IMAGE_VARIANT_KEY, variant);
  } catch (_) {
    // ignore localStorage failures
  }
}

function selectedLoveImageSrc(archetype, selectedVariant) {
  const variants = archetype?.imageVariants || {};
  const prioritized = [
    variants[selectedVariant],
    variants.masculine,
    variants.feminine,
    archetype?.imageSrc,
    archetype?.cardImage,
    archetype?.image,
    archetype?.image_url,
  ];
  for (const candidate of prioritized) {
    const src = safeAssetPath(candidate);
    if (src) return src;
  }
  return "";
}

function cardVisual(archetype, options = {}) {
  const src = options.engine === "love"
    ? selectedLoveImageSrc(archetype, options.loveImageVariant || LOVE_IMAGE_VARIANTS[0])
    : safeAssetPath(archetype?.imageSrc || archetype?.cardImage || archetype?.image || archetype?.image_url || "");
  if (src) return `<img class="card-visual" src="${esc(src)}" alt="${esc(archetype?.name || archetype?.code || "Archetype")} card" loading="lazy" />`;
  return cardPlaceholder(archetype);
}

function loveVariantToggle(selectedVariant) {
  const activeVariant = LOVE_IMAGE_VARIANTS.includes(selectedVariant) ? selectedVariant : LOVE_IMAGE_VARIANTS[0];
  return `<div class="love-variant-toggle" role="tablist" aria-label="Love card image variant">
    ${LOVE_IMAGE_VARIANTS.map((variant) => `
      <button
        type="button"
        class="love-variant-btn${variant === activeVariant ? " is-active" : ""}"
        role="tab"
        aria-selected="${variant === activeVariant ? "true" : "false"}"
        data-love-variant-toggle="${variant}"
      >${esc(titleCase(variant))}</button>
    `).join("")}
  </div>`;
}

function wireLoveVariantToggle(onChange) {
  const buttons = Array.from(document.querySelectorAll("[data-love-variant-toggle]"));
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const variant = String(button.getAttribute("data-love-variant-toggle") || "").trim().toLowerCase();
      if (!LOVE_IMAGE_VARIANTS.includes(variant)) return;
      onChange(variant);
    });
  }
}

function stableContextParams(query) {
  const keys = ["tenant", "email", "name", "cid", "campaign", "crid", "rid", "entry", "source_type", "tap_source", "tap_tag", "tag", "tap_session", "session_id", "medium", "source"];
  const out = new URLSearchParams();
  for (const key of keys) {
    const value = String(query.get(key) || "").trim();
    if (value) out.set(key, value);
  }
  return out;
}

function routeTo(engine, path, query) {
  const base = `/archetype-engines/${engine}/${path}`;
  const stable = stableContextParams(query || new URLSearchParams(window.location.search));
  const qs = stable.toString();
  if (!qs) return base;
  return `${base}${base.includes("?") ? "&" : "?"}${qs}`;
}

function readStoredContext() {
  const fromJson = (raw) => {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  };
  const read = (key) => {
    try {
      return fromJson(window.sessionStorage?.getItem(key) || window.localStorage?.getItem(key));
    } catch (_) {
      return {};
    }
  };
  const active = read("garvey_active_customer_v1");
  const login = read("garvey_login_ctx_v1");
  const garvey = read("garvey_ctx_v1");
  return {
    tenant: String(active.tenant || login.tenant || garvey.tenant || "").trim(),
    email: String(active.email || login.email || garvey.email || "").trim().toLowerCase(),
    name: String(active.name || login.name || garvey.name || "").trim(),
    cid: String(active.cid || login.cid || garvey.cid || "").trim(),
    rid: String(active.rid || active.crid || login.rid || login.crid || garvey.rid || garvey.crid || "").trim(),
  };
}

function normalizeAssessmentContext(query) {
  const stored = readStoredContext();
  const tenant = String(query.get("tenant") || stored.tenant || "").trim();
  const email = String(query.get("email") || stored.email || "").trim().toLowerCase();
  const name = String(query.get("name") || stored.name || "").trim();
  const cid = String(query.get("cid") || query.get("campaign") || stored.cid || "").trim();
  const crid = String(query.get("crid") || query.get("rid") || stored.rid || "").trim();
  const rid = String(query.get("rid") || query.get("crid") || stored.rid || "").trim();
  return { tenant, email, name, cid, crid, rid };
}


function pickCtx(query) {
  const normalized = normalizeAssessmentContext(query);
  return {
    tenant: normalized.tenant,
    email: normalized.email,
    name: normalized.name,
    cid: normalized.cid,
    crid: normalized.crid,
    rid: normalized.rid,
    tap_source: String(query.get("tap_source") || "").trim(),
    source_type: String(query.get("source_type") || query.get("medium") || query.get("source") || "").trim(),
    tap_tag: String(query.get("tap_tag") || query.get("tag") || "").trim(),
    tap_session: String(query.get("tap_session") || query.get("session_id") || "").trim(),
    entry: String(query.get("entry") || "").trim(),
    session_id: String(query.get("session_id") || "").trim(),
  };
}

function buildPayload(query, extra) {
  const ctx = pickCtx(query);
  return {
    ...(ctx.tenant ? { tenant: ctx.tenant } : {}),
    ...(ctx.email ? { email: ctx.email } : {}),
    ...(ctx.name ? { name: ctx.name } : {}),
    ...(ctx.cid ? { campaign: ctx.cid } : {}),
    ...(ctx.crid ? { user_id: ctx.crid } : {}),
    ...(ctx.rid ? { rid: ctx.rid } : {}),
    ...(ctx.tap_source ? { tap_source: ctx.tap_source } : {}),
    ...(ctx.source_type ? { source_type: ctx.source_type } : {}),
    ...(ctx.tap_tag ? { tap_tag: ctx.tap_tag } : {}),
    ...(ctx.tap_session ? { tap_session: ctx.tap_session } : {}),
    ...(ctx.entry ? { entry: ctx.entry } : {}),
    ...(ctx.session_id ? { session_id: ctx.session_id } : {}),
    ...(extra || {}),
  };
}

function normalizeOption(opt = {}) {
  return {
    id: opt.id || opt.optionId || opt.option_id || "",
    text: opt.text || "",
  };
}

function normalizeQuestion(q = {}) {
  return {
    id: q.id || q.question_id || "",
    prompt: q.prompt || "",
    options: (q.options || []).map(normalizeOption),
  };
}

const LOVE_ASSESSMENT_SECTION_LABELS = Object.freeze([
  "Signal Detection",
  "Connection Style",
  "Trust & Regulation",
  "Stress Response",
  "Growth & Alignment",
]);

const LOVE_ASSESSMENT_CHECKPOINTS = Object.freeze([
  "We’re mapping how you connect.",
  "We’re detecting how you build trust.",
  "We’re identifying how you respond under pressure.",
  "We’re locking in your deeper pattern.",
  "Final alignment pass.",
]);

const LOVE_ASSESSMENT_MICRO_INSIGHTS = Object.freeze([
  "A clear pattern is beginning to form.",
  "Your responses are revealing how you seek connection.",
  "We’re now measuring how you respond under pressure.",
  "Your connection rhythm is becoming more visible.",
]);

function renderMetricHelp(label, meaning, whyItMatters) {
  return `
    <details class="metric-help">
      <summary aria-label="About ${esc(label)}" title="About ${esc(label)}">ⓘ</summary>
      <div class="metric-help-panel">
        <div><b>What this means:</b> ${esc(meaning)}</div>
        <div><b>Why it matters:</b> ${esc(whyItMatters)}</div>
      </div>
    </details>
  `;
}

function renderMetricList(entries, codeToName, { suffix = "", precision = 1, raw = false } = {}) {
  if (!entries.length) return `<div class="metric-list-empty">No data available.</div>`;
  return `<div class="metric-list">${entries.map(([code, value]) => {
    const numericValue = Number(value);
    const displayValue = value
      ? String(value)
      : "";
    const safeValue = Number.isFinite(numericValue) ? numericValue.toFixed(precision) : "-";
    const resolved = raw ? esc(displayValue) : `${esc(safeValue)}${esc(suffix)}`;
    return `<div class="metric-row">
      <span class="metric-row-label">${esc(codeToName[code] || code)}</span>
      <span class="metric-row-value">${resolved}</span>
    </div>`;
  }).join("")}</div>`;
}

function asSentence(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function stressActivationBand(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { label: "unknown", meaning: "This stress signal is unavailable right now." };
  if (n < 20) return { label: "very low", meaning: "This pattern barely activates under stress." };
  if (n < 45) return { label: "moderate", meaning: "This pattern is available under pressure without dominating." };
  return { label: "high", meaning: "This pattern becomes more dominant under stress." };
}

function desiredGapDirection(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return { label: "Unknown", meaning: "Direction is unavailable.", state: "unknown" };
  if (Math.abs(n) < 0.5) return { label: `You feel aligned here (${n.toFixed(1)})`, meaning: "Near zero means you feel aligned here.", state: "aligned" };
  if (n > 0) return { label: `You want more of this → +${n.toFixed(1)}`, meaning: "Positive values mean you want more of this pattern.", state: "more" };
  return { label: `You want less of this → ${n.toFixed(1)}`, meaning: "Negative values mean you want less of this pattern.", state: "less" };
}

function identityGapBand(value) {
  const n = Math.abs(Number(value));
  if (!Number.isFinite(n)) return { label: "unavailable", meaning: "Gap signal is unavailable." };
  if (n < 8) return { label: "closely aligned", meaning: "Your self-image and behavior are closely aligned here." };
  if (n < 16) return { label: "mild gap", meaning: "There is a mild mismatch between self-image and behavior." };
  if (n < 28) return { label: "meaningful gap", meaning: "There is a meaningful mismatch worth active adjustment." };
  return { label: "major gap", meaning: "There is a major mismatch between self-image and observed behavior." };
}

function consistencySignal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Consistency signal unavailable.";
  if (n >= 80) return "Your answers formed a strong, readable pattern.";
  if (n >= 60) return "Your answers show a mostly stable pattern with some mixed zones.";
  return "Your answers were more mixed, which can happen during transition or adaptation.";
}

function confidenceSignal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "Confidence signal unavailable.";
  if (n >= 80) return "Your result signal is strong, complete, and interpretable.";
  if (n >= 60) return "Your result signal is usable, with a few areas that are less clear.";
  return "Your signal is less stable right now; this often happens when patterns are still clarifying.";
}

function stateDefinition(state) {
  const normalized = String(state || "").toLowerCase();
  if (normalized === "underexpressed") {
    return "You may not be drawing on this pattern enough right now. This pattern needs strengthening toward healthy expression.";
  }
  if (normalized === "overexpressed") {
    return "This pattern may be taking over more than it should. It likely needs regulation to return to balance.";
  }
  return "This pattern is showing up in a healthy range right now. The goal is to maintain it, not maximize it.";
}

function stressExampleByCode(code, archetype) {
  const defaults = {
    EC: "over-processing, over-explaining, and pushing hard for clarity",
    RS: "reassurance-seeking and urgency for closeness",
    AL: "withdrawal, distance, and self-protective shutdown",
    AV: "waiting for proof, tracking behavior, and reduced trust",
    ES: "seeking stimulation and redirecting energy away from stagnation",
  };
  return defaults[code] || String(archetype?.outOfBalanceHigh || "").toLowerCase() || "reactive shifts in this pattern";
}

function rebalanceActions(archetype = {}, state = "") {
  const actions = [
    ...(archetype.needsToStayBalanced || []),
    ...(archetype.dailyBuildUps || []),
    ...(archetype.weeklyBuildUps || []),
  ].slice(0, 3);
  if (!actions.length) return "Use steady micro-habits that move this pattern toward balanced expression.";
  if (String(state || "").toLowerCase() === "overexpressed") return `Regulate with: ${actions.join(" • ")}`;
  if (String(state || "").toLowerCase() === "underexpressed") return `Strengthen with: ${actions.join(" • ")}`;
  return `Maintain with: ${actions.join(" • ")}`;
}

function ifThisIsYouExamples(code, state) {
  const byCode = {
    EC: {
      overexpressed: ["double texting when anxious", "over-explaining in conflict", "reopening resolved conversations", "trying to talk for clarity late at night"],
      underexpressed: ["staying quiet to avoid conflict", "expecting your partner to read your mind", "agreeing verbally while internally unresolved"],
      balanced: ["naming feelings clearly without flooding", "asking for repair without escalating", "using words to create calm, not urgency"],
    },
    RS: {
      overexpressed: ["waiting for proof before relaxing", "checking tone shifts for signs of distance", "seeking repeated reassurance after small disconnection"],
      underexpressed: ["silent protest after feeling unseen", "pretending you're fine when you need closeness", "withdrawing instead of asking directly"],
      balanced: ["asking for reassurance clearly", "receiving warmth without over-checking", "self-soothing before reaching outward"],
    },
    AL: {
      overexpressed: ["pulling away when things feel too intense", "staying logical to avoid emotional exposure", "using space without signaling return"],
      underexpressed: ["suppressing needs until shutdown", "avoiding vulnerability talks", "mistaking isolation for regulation"],
      balanced: ["asking for space with clarity", "re-engaging after reset", "sharing feelings without losing autonomy"],
    },
    AV: {
      overexpressed: ["keeping a mental scorecard in conflict", "testing follow-through instead of asking directly", "assuming inconsistency means lack of care"],
      underexpressed: ["not naming broken agreements", "letting important promises slide", "avoiding accountability conversations"],
      balanced: ["tracking reliability without rigidity", "naming one concrete trust need", "acknowledging effort and execution together"],
    },
    ES: {
      overexpressed: ["craving novelty when connection feels flat", "starting intensity to avoid routine discomfort", "getting restless when interactions feel predictable"],
      underexpressed: ["coasting in autopilot routines", "delaying shared moments that create aliveness", "feeling disconnected but not changing the rhythm"],
      balanced: ["bringing playful novelty into routine", "planning shared experiences with intention", "staying present instead of chasing intensity"],
    },
  };
  const normalizedState = String(state || "balanced").toLowerCase();
  const options = byCode[code] || {};
  return (options[normalizedState] || options.balanced || ["showing a repeatable pattern that can be coached with better awareness"]).slice(0, 4);
}

function rebalancePath(archetype = {}, state = "") {
  const normalizedState = String(state || "").toLowerCase();
  const needs = archetype.needsToStayBalanced || [];
  const daily = archetype.dailyBuildUps || [];
  const weekly = archetype.weeklyBuildUps || [];
  const signal = archetype.balanceSignals || [];
  if (normalizedState === "overexpressed") {
    return {
      now: needs[0] || "Pause and regulate before responding.",
      practice: weekly[0] || daily[0] || "Repeat one stabilizing habit several times per week.",
      grow: signal[0] || "Shift from urgency to grounded consistency in this pattern.",
    };
  }
  if (normalizedState === "underexpressed") {
    return {
      now: daily[0] || "Use one small expression of this pattern today.",
      practice: weekly[0] || needs[0] || "Build a weekly rhythm so this pattern becomes reliable.",
      grow: signal[0] || "Move from avoidance into healthy, steady expression.",
    };
  }
  return {
    now: daily[0] || "Keep one stabilizing behavior active today.",
    practice: weekly[0] || needs[0] || "Protect this pattern with a repeatable weekly rhythm.",
    grow: signal[0] || "Integrate this strength into your identity with less effort over time.",
  };
}

function inferDominantLoop({ payload, codeToName }) {
  const primary = payload.primaryArchetype?.code;
  const secondary = payload.secondaryArchetype?.code;
  const topStress = sortScores(payload.stressProfile || {})[0]?.code;
  const strongestGap = Object.entries(payload.desiredCurrentGap || {}).sort((a, b) => Math.abs(Number(b[1]) || 0) - Math.abs(Number(a[1]) || 0))[0];
  const gapCode = strongestGap?.[0];
  const gapValue = Number(strongestGap?.[1]);
  const token = {
    EC: "Expression",
    RS: "Reassurance",
    AL: "Distance",
    AV: "Observation",
    ES: "Stimulation",
  };
  const safeName = (code) => token[code] || codeToName[code] || code || "Pattern";
  const loopByPrimary = {
    EC: [primary, topStress || "RS", "EC"],
    RS: [primary, topStress || "EC", "RS"],
    AL: [primary, topStress || "AV", "AL"],
    AV: [primary, topStress || "AL", "AV"],
    ES: [primary, topStress || "EC", "ES"],
  };
  const candidates = loopByPrimary[primary] || [primary, secondary || topStress, primary];
  if (gapCode && Number.isFinite(gapValue) && Math.abs(gapValue) >= 8) candidates[1] = gapCode;
  const nodes = candidates.filter(Boolean).slice(0, 3);
  const label = nodes.map((code) => safeName(code)).join(" → ");
  return {
    label,
    meaning: `Your dominant loop appears to be ${label}. When uncertainty rises, these patterns can reinforce each other in sequence.`,
    why: "Seeing the loop helps you interrupt escalation early instead of repeating the same emotional cycle.",
    interrupt: `Interrupt strategy: after your first ${safeName(nodes[0])} move, pause 90 seconds and choose one grounding action before the next response.`,
  };
}

function buildOneMinutePlan({ payload, codeToName, codeIndex }) {
  const overexpressed = Object.entries(payload.balanceStates?.dimensions || {}).find(([, state]) => String(state).toLowerCase() === "overexpressed");
  const underexpressed = Object.entries(payload.balanceStates?.dimensions || {}).find(([, state]) => String(state).toLowerCase() === "underexpressed");
  const stressTop = sortScores(payload.stressProfile || {})[0];
  const topGap = Object.entries(payload.desiredCurrentGap || {}).sort((a, b) => Math.abs(Number(b[1]) || 0) - Math.abs(Number(a[1]) || 0))[0];
  const buildAction = (code, mode) => {
    const archetype = codeIndex[code] || {};
    const name = codeToName[code] || code;
    const path = rebalancePath(archetype, mode);
    if (mode === "overexpressed") {
      return {
        action: `Regulate ${name} before it spikes.`,
        why: `This pattern looks overactive right now; regulating it reduces reactive loops.`,
        next: path.now,
      };
    }
    return {
      action: `Strengthen ${name} with one repeatable behavior.`,
      why: `This pattern looks underused and can restore relational balance when built intentionally.`,
      next: path.now,
    };
  };
  const items = [];
  if (overexpressed) items.push(buildAction(overexpressed[0], "overexpressed"));
  if (underexpressed) items.push(buildAction(underexpressed[0], "underexpressed"));
  if (topGap) {
    const code = topGap[0];
    const direction = desiredGapDirection(topGap[1]);
    const name = codeToName[code] || code;
    const mode = direction.state === "more" ? "underexpressed" : direction.state === "less" ? "overexpressed" : "balanced";
    const path = rebalancePath(codeIndex[code] || {}, mode);
    items.push({
      action: `${direction.state === "less" ? "Soften" : "Build"} ${name} toward your desired alignment.`,
      why: `This is your strongest desire-pressure area (${Number(topGap[1]).toFixed(1)}).`,
      next: path.now,
    });
  } else if (stressTop) {
    const name = codeToName[stressTop.code] || stressTop.code;
    items.push({
      action: `Stabilize your ${name} stress activation.`,
      why: "This is the pattern most likely to activate under pressure.",
      next: rebalancePath(codeIndex[stressTop.code] || {}, "overexpressed").now,
    });
  }
  return items.slice(0, 3);
}

function renderLoveInterpretationLayer({ payload, archetypes, codeToName, codeIndex, query }) {
  const balanceEntries = Object.entries(payload.balanceStates?.dimensions || {});
  const stressEntries = Object.entries(payload.stressProfile || {});
  const desiredGapEntries = Object.entries(payload.desiredCurrentGap || {});
  const identityBehaviorEntries = Object.entries(payload.identityBehaviorGap || {});
  const consistencyValue = payload.contradictionConsistency?.consistency;
  const confidenceValue = payload.confidence;
  const balanceRule = "The goal is not to maximize every archetype. The goal is to bring each one into a healthy balanced range.";

  const balanceCards = balanceEntries.map(([code, state]) => {
    const archetype = codeIndex[code] || {};
    const anchor = routeTo("love", `archetype/${archetype.slug || ""}`, query);
    return `<details class="coach-detail">
      <summary>
        <span>${esc(codeToName[code] || code)}</span>
        <span class="chip">${esc(String(state || "balanced"))}</span>
      </summary>
      <div class="coach-detail-body">
        <div><b>What this means:</b> ${esc(stateDefinition(state))}</div>
        <div><b>What this looks like:</b> ${esc(asSentence(String(state).toLowerCase() === "underexpressed" ? archetype.outOfBalanceLow : String(state).toLowerCase() === "overexpressed" ? archetype.outOfBalanceHigh : archetype.whenStrong, "Behavior pattern details are still loading"))}</div>
        <div><b>If this is you, it may look like…</b><ul class="coach-bullets">${ifThisIsYouExamples(code, state).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>
        <div><b>How to rebalance:</b> ${esc(rebalanceActions(archetype, state))}</div>
        <div><b>Do now:</b> ${esc(rebalancePath(archetype, state).now)}</div>
        <div><b>Practice regularly:</b> ${esc(rebalancePath(archetype, state).practice)}</div>
        <div><b>Grow into:</b> ${esc(rebalancePath(archetype, state).grow)}</div>
        <a class="metric-cta" href="${anchor}">How to rebalance this archetype →</a>
      </div>
    </details>`;
  }).join("");

  const stressCards = stressEntries.map(([code, value]) => {
    const band = stressActivationBand(value);
    const archetype = codeIndex[code] || {};
    const numeric = Number(value);
    const display = Number.isFinite(numeric) ? `${numeric.toFixed(1)}%` : "-";
    return `<details class="coach-detail">
      <summary>
        <span>${esc(codeToName[code] || code)}</span>
        <span class="metric-score">${display}</span>
      </summary>
      <div class="coach-detail-body">
        <div><b>What this means:</b> ${esc(`${band.meaning} This is activation intensity under pressure, not a different personality.`)}</div>
        <div><b>What it looks like:</b> ${esc(titleCase(stressExampleByCode(code, archetype)))}</div>
        <div><b>This might show up as…</b><ul class="coach-bullets">${ifThisIsYouExamples(code, "overexpressed").slice(0, 3).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>
        <div><b>Risk if overactivated:</b> ${esc(asSentence(archetype.outOfBalanceHigh, "This pattern can become rigid or reactive when overactivated"))}</div>
        <div><b>Stabilizing suggestion:</b> ${esc(rebalanceActions(archetype, "overexpressed"))}</div>
        <a class="metric-cta" href="${routeTo("love", `archetype/${archetype.slug || ""}`, query)}">View full archetype guidance →</a>
      </div>
    </details>`;
  }).join("");

  const desiredCards = desiredGapEntries.map(([code, value]) => {
    const direction = desiredGapDirection(value);
    const archetype = codeIndex[code] || {};
    const aspiration = direction.state === "more"
      ? `You likely want more ${String(archetype.coreTrait || "healthy expression").toLowerCase()} in your relationship behavior.`
      : direction.state === "less"
        ? `You likely want to rely less on this pattern than you currently do.`
        : "You currently feel aligned between your present pattern and your desired direction.";
    return `<details class="coach-detail">
      <summary>
        <span>${esc(codeToName[code] || code)}</span>
        <span class="metric-score">${esc(direction.label)}</span>
      </summary>
      <div class="coach-detail-body">
        <div><b>What this means:</b> ${esc(direction.meaning)}</div>
        <div><b>What it suggests:</b> ${esc(aspiration)}</div>
        <div><b>This might show up as…</b><ul class="coach-bullets">${ifThisIsYouExamples(code, direction.state === "less" ? "overexpressed" : direction.state === "more" ? "underexpressed" : "balanced").slice(0, 3).map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>
        <div><b>Action toward alignment:</b> ${esc(rebalanceActions(archetype, direction.state === "more" ? "underexpressed" : direction.state === "less" ? "overexpressed" : "balanced"))}</div>
        <a class="metric-cta" href="${routeTo("love", `archetype/${archetype.slug || ""}`, query)}">See habits for balance →</a>
      </div>
    </details>`;
  }).join("");

  const identityCards = identityBehaviorEntries.map(([code, value]) => {
    const band = identityGapBand(value);
    const archetype = codeIndex[code] || {};
    const numeric = Math.abs(Number(value));
    const display = Number.isFinite(numeric) ? numeric.toFixed(1) : "-";
    return `<details class="coach-detail">
      <summary>
        <span>${esc(codeToName[code] || code)}</span>
        <span class="metric-score">${esc(titleCase(band.label))} (${display})</span>
      </summary>
      <div class="coach-detail-body">
        <div><b>Alignment status:</b> ${esc(band.meaning)}</div>
        <div><b>What this means:</b> ${esc("This measures how closely your self-image matches behavior patterns; it is not a character judgment.")}</div>
        <div><b>What to do next:</b> ${esc(Math.abs(Number(value)) >= 16 ? `Choose one weekly build-up from ${codeToName[code] || code} and track if behavior catches up with your self-story.` : "Keep using your current habits; your self-story and behavior are relatively aligned.")}</div>
        <a class="metric-cta" href="${routeTo("love", `archetype/${archetype.slug || ""}`, query)}">What helps this pattern →</a>
      </div>
    </details>`;
  }).join("");

  return `
    <section class="section">
      <h2>Meaning + Rebalance Layer</h2>
      <div class="balance-rule-callout">
        <b>Balance Rule</b>
        <div>${esc(balanceRule)}</div>
      </div>
      <div class="coach-grid">
        <div class="coach-card">
          <h3>⚖️ Balance States</h3>
          <p class="muted">Underexpressed = not drawing on this pattern enough. Overexpressed = this pattern may be overactive. Balanced = healthy range to maintain.</p>
          ${balanceCards || `<div class="metric-list-empty">No balance state data available.</div>`}
        </div>
        <div class="coach-card">
          <h3>🧯 Stress Profile</h3>
          <p class="muted">This shows how strongly each pattern activates under pressure. It is an activation profile, not “you become a different person by this percent.”</p>
          ${stressCards || `<div class="metric-list-empty">No stress profile data available.</div>`}
        </div>
        <div class="coach-card">
          <h3>🧭 Desired Gap</h3>
          <p class="muted">Positive values = you want more. Negative values = you want less. Near zero = you feel aligned here.</p>
          ${desiredCards || `<div class="metric-list-empty">No desired gap data available.</div>`}
        </div>
        <div class="coach-card">
          <h3>🪞 Identity-Behavior Gap</h3>
          <p class="muted">This measures how closely self-image matches behavior. Read it by magnitude of mismatch, not as a judgment.</p>
          ${identityCards || `<div class="metric-list-empty">No identity-behavior data available.</div>`}
        </div>
        <div class="coach-card">
          <h3>📐 Consistency</h3>
          <p class="muted">This reflects how internally aligned your responses were across related questions.</p>
          <div class="kpi-value">${esc(String(consistencyValue ?? "-"))}%</div>
          <p class="muted">${esc(consistencySignal(consistencyValue))}</p>
        </div>
        <div class="coach-card">
          <h3>🔒 Confidence</h3>
          <p class="muted">This reflects how complete, stable, and interpretable your result signal is.</p>
          <div class="kpi-value">${esc(String(confidenceValue ?? "-"))}%</div>
          <p class="muted">${esc(confidenceSignal(confidenceValue))}</p>
        </div>
      </div>
    </section>
  `;
}

function renderAssessmentQuestions(app, engine, query, startPayload) {
  const selectedBankId = startPayload?.questionBanks?.selectedBankId || "";
  const assessmentId = String(startPayload?.assessmentId || "").trim();
  const questions = (startPayload?.questionBanks?.activeQuestions || []).map(normalizeQuestion);
  if (!assessmentId || !questions.length) {
    app.innerHTML = `<section class="section error">No questions found for this assessment.</section>`;
    return;
  }

  const state = {
    index: 0,
    answers: {},
    submitting: false,
    status: "",
  };

  const render = () => {
    const q = questions[state.index];
    const selected = state.answers[q.id] || "";
    const isLast = state.index === questions.length - 1;
    const canContinue = Boolean(selected) && !state.submitting;
    const progressPct = Math.round(((state.index + 1) / questions.length) * 100);
    const loveSectionSize = 5;
    const sectionIndex = Math.floor(state.index / loveSectionSize);
    const sectionCount = Math.max(1, Math.ceil(questions.length / loveSectionSize));
    const sectionStart = (sectionIndex * loveSectionSize) + 1;
    const sectionEnd = Math.min((sectionIndex + 1) * loveSectionSize, questions.length);
    const sectionQuestionNumber = (state.index % loveSectionSize) + 1;
    const showLoveEnhancements = engine === "love";
    const checkpointMessage = showLoveEnhancements && sectionQuestionNumber === loveSectionSize
      ? LOVE_ASSESSMENT_CHECKPOINTS[sectionIndex] || ""
      : "";
    const microInsight = showLoveEnhancements
      ? LOVE_ASSESSMENT_MICRO_INSIGHTS[state.index % LOVE_ASSESSMENT_MICRO_INSIGHTS.length]
      : "";
    const optionsMarkup = q.options.map((opt, optIndex) => {
      const inputId = `answer-${state.index}-${optIndex}`;
      const isChecked = selected === opt.id;
      return `
        <label class="answer-option${isChecked ? " is-selected" : ""}" for="${esc(inputId)}">
          <input
            class="answer-option-input"
            type="radio"
            id="${esc(inputId)}"
            name="question-${esc(q.id)}"
            value="${esc(opt.id)}"
            ${isChecked ? "checked" : ""}
          />
          <span class="answer-option-copy">
            <span class="answer-option-id">${esc(opt.id)}</span>
            <span>${esc(opt.text)}</span>
          </span>
        </label>
      `;
    }).join("");

    app.innerHTML = `
      <section class="section">
        <h1>${titleCase(engine)} Assessment</h1>
        <p class="muted">Assessment started. Bank: ${esc(selectedBankId || "default")}.</p>
        <div class="assessment-progress-meta">
          <div class="chip">Question ${state.index + 1} of ${questions.length}</div>
          <div class="chip">${progressPct}% complete</div>
        </div>
        <div class="assessment-progress-track" aria-label="Assessment progress">
          <div class="assessment-progress-fill" style="width:${progressPct}%"></div>
        </div>
        ${showLoveEnhancements ? `
          <div class="assessment-section">
            <div class="assessment-section-title">Section ${sectionIndex + 1}/${sectionCount}: ${esc(LOVE_ASSESSMENT_SECTION_LABELS[sectionIndex] || `Section ${sectionIndex + 1}`)}</div>
            <div class="muted">Questions ${sectionStart}-${sectionEnd}</div>
            ${microInsight ? `<div class="assessment-micro-insight">${esc(microInsight)}</div>` : ""}
            ${checkpointMessage ? `<div class="assessment-checkpoint">${esc(checkpointMessage)}</div>` : ""}
          </div>
        ` : ""}
        <h2>${esc(q.prompt)}</h2>
        <form id="assessmentQuestionForm" class="assessment-question-form">
          <fieldset class="answer-options" aria-label="Answer options">
            ${optionsMarkup}
          </fieldset>
          <div class="assessment-actions">
            <button type="button" id="assessmentBack" class="chip" ${state.index === 0 || state.submitting ? "disabled" : ""}>Back</button>
            <button type="submit" id="assessmentNext" class="chip" ${canContinue ? "" : "disabled"}>${isLast ? "See result" : "Continue"}</button>
          </div>
          <div id="assessmentStatus" class="muted">${esc(state.status)}</div>
        </form>
      </section>`;

    const form = document.getElementById("assessmentQuestionForm");
    const backBtn = document.getElementById("assessmentBack");

    form?.addEventListener("change", (evt) => {
      const target = evt.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "radio") return;
      state.answers[q.id] = target.value;
      render();
    });

    backBtn?.addEventListener("click", () => {
      if (state.submitting || state.index === 0) return;
      state.index -= 1;
      render();
    });

    form?.addEventListener("submit", async (evt) => {
      evt.preventDefault();
      if (!state.answers[q.id] || state.submitting) return;
      if (!isLast) {
        state.index += 1;
        render();
        return;
      }

      state.submitting = true;
      state.status = "Scoring your assessment…";
      render();
      try {
        const payload = buildPayload(query, {
          assessmentId,
          bank_id: selectedBankId,
          answers: state.answers,
        });
        const scored = await jsonFetch(`/api/archetype-engines/${engine}/assessment/score`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (engine === "love") {
          window.location.assign(routeTo(engine, `result/${encodeURIComponent(scored.resultId)}/story`, query));
          return;
        }
        window.location.assign(routeTo(engine, `result/${encodeURIComponent(scored.resultId)}`, query));
      } catch (err) {
        state.submitting = false;
        state.status = String(err.message || "Unable to score assessment");
        render();
      }
    });
  };

  render();
}

async function startAssessmentFlow(app, engine, query, consentId) {
  const payload = buildPayload(query, consentId ? { consent_id: consentId } : {});
  const startPayload = await jsonFetch(`/api/archetype-engines/${engine}/assessment/start`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  renderAssessmentQuestions(app, engine, query, startPayload);
}

function renderConsentStep(app, engine, query, contract) {
  app.innerHTML = `
    <section class="section">
      <h1>${esc(contract?.heading || `${titleCase(engine)} Assessment`)}</h1>
      <p class="muted">${(contract?.body || []).map(esc).join(" ")}</p>
      <label class="kv">
        <input id="consentCheck" type="checkbox" />
        <span>${esc(contract?.agreement || "I agree to continue.")}</span>
      </label>
      <button id="consentContinue" class="chip">Accept and continue</button>
      <div id="assessmentStatus" class="muted"></div>
    </section>`;

  const statusNode = document.getElementById("assessmentStatus");
  const continueBtn = document.getElementById("consentContinue");
  continueBtn?.addEventListener("click", async () => {
    const checked = document.getElementById("consentCheck")?.checked;
    if (!checked) {
      if (statusNode) statusNode.textContent = "Please accept consent to continue.";
      return;
    }
    try {
      const ctx = normalizeAssessmentContext(query);
      if (!ctx.tenant || !ctx.email || !ctx.name) {
        const missing = ["tenant", "email", "name"].filter((field) => !ctx[field]);
        if (statusNode) statusNode.textContent = `We need ${missing.join(", ")} to continue. Return to Rewards to confirm your profile.`;
        return;
      }
      const consentPayload = buildPayload(query, {
        tenant: ctx.tenant,
        email: ctx.email,
        name: ctx.name,
        accepted: true,
        consent_version: contract?.consent_version || "v1",
      });
      const consent = await jsonFetch(`/api/archetype-engines/${engine}/assessment/consent`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(consentPayload),
      });
      await startAssessmentFlow(app, engine, query, consent.consent_id);
    } catch (err) {
      if (statusNode) statusNode.textContent = String(err.message || "Unable to continue");
    }
  });
}

async function renderAssessment(app, engine, query) {
  if (engine !== "love") {
    await startAssessmentFlow(app, engine, query);
    return;
  }
  const contractPath = new URL(`/api/archetype-engines/${engine}/assessment/consent-contract`, window.location.origin);
  for (const [key, value] of stableContextParams(query).entries()) contractPath.searchParams.set(key, value);
  const contract = await jsonFetch(`${contractPath.pathname}${contractPath.search}`);
  renderConsentStep(app, engine, query, contract);
}

const LOVE_CANONICAL_LABELS = Object.freeze({
  RS: "Reassurance Seeker",
  AL: "Autonomous Lover",
  EC: "Expression Connector",
  AV: "Action Validator",
  ES: "Experience Seeker",
});

function displayName(engine, archetype = {}, code = "") {
  if (engine === "love") return LOVE_CANONICAL_LABELS[code || archetype.code] || archetype.name || code;
  return archetype.name || code;
}

function displaySubtitle(engine, archetype = {}, code = "") {
  if (engine !== "love") return "";
  const canonical = LOVE_CANONICAL_LABELS[code || archetype.code];
  const subtitle = String(archetype.subtitle || "").trim();
  if (!subtitle) return "";
  return canonical && subtitle !== canonical ? subtitle : "";
}

function summarizeStress(stressProfile, codeToName) {
  const top = sortScores(stressProfile).slice(0, 2);
  if (!top.length) return "No stress profile available";
  return top.map((item) => `${codeToName[item.code] || item.code} (${item.score.toFixed(1)}%)`).join(" • ");
}

function strongestGap(gapMap, codeToName) {
  const entries = Object.entries(gapMap || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const first = entries[0];
  if (!first) return "No gap data";
  const trend = first[1] >= 0 ? "higher" : "lower";
  return `${codeToName[first[0]] || first[0]} is ${Math.abs(first[1]).toFixed(1)} points ${trend}`;
}

function insightOrFallback(value, fallback) {
  return String(value || "").trim() || fallback;
}

function renderBrowse(app, engine, archetypes, query, options = {}) {
  const selectedVariant = options.loveImageVariant || LOVE_IMAGE_VARIANTS[0];
  app.innerHTML = `
    <section class="section">
      <h1>${titleCase(engine)} Archetypes</h1>
      <p class="muted">Scan and compare the full archetype spectrum.</p>
      ${engine === "love" ? `<div class="muted">View cards</div>${loveVariantToggle(selectedVariant)}` : ""}
      <div class="spectrum-grid">
        ${archetypes.map((a, idx) => `
          <a class="card spectrum-card" href="${routeTo(engine, `archetype/${a.slug}`, query)}">
            ${cardVisual(a, { engine, loveImageVariant: selectedVariant })}
            <h3>${esc(a.emoji || "") } ${esc(displayName(engine, a, a.code))}</h3>
            ${displaySubtitle(engine, a, a.code) ? `<div class="muted">${esc(displaySubtitle(engine, a, a.code))}</div>` : ""}
            <div class="muted">Rank preview #${idx + 1}</div>
            <div class="muted">Code: ${esc(a.code)}</div>
            <div class="chip">View full archetype</div>
          </a>
        `).join("")}
      </div>
    </section>`;
  if (engine === "love") wireLoveVariantToggle(options.onLoveVariantChange || (() => {}));
}

function renderDetail(app, engine, archetype, query, options = {}) {
  const backHref = query.get("back") || routeTo(engine, "browse", query);
  const selectedVariant = options.loveImageVariant || LOVE_IMAGE_VARIANTS[0];
  app.innerHTML = `
    <section class="section">
      <a class="crumb" href="${backHref}">← Back</a>
      <h1>${esc(archetype.emoji || "") } ${esc(displayName(engine, archetype, archetype.code))}</h1>
      ${displaySubtitle(engine, archetype, archetype.code) ? `<p class="muted">${esc(displaySubtitle(engine, archetype, archetype.code))}</p>` : ""}
      <p class="muted">${esc(archetype.tagline || "")}</p>
      ${engine === "love" ? `<div class="muted">View card image</div>${loveVariantToggle(selectedVariant)}` : ""}
      ${cardVisual(archetype, { engine, loveImageVariant: selectedVariant })}
      <p>${esc(archetype.description || "")}</p>
    </section>
    <section class="section insights">
      <div class="kv"><b>Core Energy</b>${esc(archetype.coreEnergy || "-")}</div>
      <div class="kv"><b>When Strong</b>${esc(archetype.whenStrong || "-")}</div>
      <div class="kv"><b>Out of Balance High</b>${esc(archetype.outOfBalanceHigh || "-")}</div>
      <div class="kv"><b>Out of Balance Low</b>${esc(archetype.outOfBalanceLow || "-")}</div>
      <div class="kv"><b>Core Strengths</b>${(archetype.coreStrengths || []).map(esc).join(", ") || "-"}</div>
      <div class="kv"><b>Blind Spots</b>${(archetype.blindSpots || []).map(esc).join(", ") || "-"}</div>
      <div class="kv"><b>Needs to Stay Balanced</b>${(archetype.needsToStayBalanced || []).map(esc).join(", ") || "-"}</div>
      <div class="kv"><b>Daily Build-Ups</b>${(archetype.dailyBuildUps || []).map(esc).join(", ") || "-"}</div>
      <div class="kv"><b>Weekly Build-Ups</b>${(archetype.weeklyBuildUps || []).map(esc).join(", ") || "-"}</div>
      <div class="kv"><b>Balance Signals</b>${(archetype.balanceSignals || []).map(esc).join(", ") || "-"}</div>
    </section>`;
  if (engine === "love") wireLoveVariantToggle(options.onLoveVariantChange || (() => {}));
}

function renderResult(app, engine, archetypes, resultId, payload, query, options = {}) {
  const scores = sortScores(payload.normalizedScores);
  const top3 = scores.slice(0, 3);
  const codeIndex = Object.fromEntries(archetypes.map((a) => [a.code, a]));
  const codeToName = Object.fromEntries(archetypes.map((a) => [a.code, displayName(engine, a, a.code)]));
  const primary = codeIndex[payload.primaryArchetype?.code];
  const secondary = codeIndex[payload.secondaryArchetype?.code];
  const hybridGap = payload.hybridArchetype?.gap;
  const hybridLabel = payload.hybridArchetype?.codes?.length === 2
    ? `${codeToName[payload.hybridArchetype.codes[0]] || payload.hybridArchetype.codes[0]} + ${codeToName[payload.hybridArchetype.codes[1]] || payload.hybridArchetype.codes[1]}`
    : payload.hybridArchetype?.label;
  const selectedVariant = options.loveImageVariant || LOVE_IMAGE_VARIANTS[0];
  const rankedArchetypes = scores.map((item) => `${item.rank}. ${codeToName[item.code] || item.code}`);
  const balanceEntries = Object.entries(payload.balanceStates?.dimensions || {});
  const stressEntries = Object.entries(payload.stressProfile || {});
  const desiredGapEntries = Object.entries(payload.desiredCurrentGap || {});
  const identityBehaviorEntries = Object.entries(payload.identityBehaviorGap || {});
  const isLoveEngine = engine === "love";
  const consistencyValue = payload.contradictionConsistency?.consistency;
  const confidenceValue = payload.confidence;
  const dominantLoop = isLoveEngine ? inferDominantLoop({ payload, codeToName }) : null;
  const oneMinutePlan = isLoveEngine ? buildOneMinutePlan({ payload, codeToName, codeIndex }) : [];
  const desiredGapDisplayEntries = isLoveEngine
    ? desiredGapEntries.map(([code, value]) => [code, desiredGapDirection(value).label])
    : desiredGapEntries;
  const identityGapDisplayEntries = isLoveEngine
    ? identityBehaviorEntries.map(([code, value]) => {
      const band = identityGapBand(value);
      return [code, `${titleCase(band.label)} (${Math.abs(Number(value)).toFixed(1)})`];
    })
    : identityBehaviorEntries;

  app.innerHTML = `
    <section class="section hero">
      <div>
        <div class="chip">Result Summary</div>
        <h1 class="primary">${esc(primary?.emoji || "") } ${esc(displayName(engine, primary, payload.primaryArchetype?.code || ""))}</h1>
        ${displaySubtitle(engine, primary, payload.primaryArchetype?.code || "") ? `<p class="muted">${esc(displaySubtitle(engine, primary, payload.primaryArchetype?.code || ""))}</p>` : ""}
        <p class="muted">Secondary: ${esc(displayName(engine, secondary, payload.secondaryArchetype?.code || ""))}</p>
        ${payload.hybridArchetype ? `<div class="chip">Hybrid (${Number(hybridGap).toFixed(1)} gap): ${esc(hybridLabel)}</div>` : ""}
        ${engine === "love" ? `<div class="muted">View cards</div>${loveVariantToggle(selectedVariant)}` : ""}
        <div class="muted">Result ID: ${esc(resultId)}</div>
      </div>
      <div>${cardVisual(primary || secondary, { engine, loveImageVariant: selectedVariant })}</div>
    </section>

    ${isLoveEngine ? `
    <section class="section">
      <h2>⏱️ Your 1-Minute Improvement Plan</h2>
      <p class="muted">Three high-impact next moves to rebalance your relationship pattern quickly.</p>
      <ol class="coach-plan-list">
        ${oneMinutePlan.map((item) => `<li>
          <div><b>${esc(item.action)}</b></div>
          <div class="muted"><b>Why it matters:</b> ${esc(item.why)}</div>
          <div><b>Tiny next step:</b> ${esc(item.next)}</div>
        </li>`).join("") || "<li>No high-impact moves available from this result yet.</li>"}
      </ol>
      <a class="metric-cta" href="#meaning-rebalance">How to rebalance this →</a>
    </section>

    <section class="section">
      <h2>🔁 Dominant Loop Insight</h2>
      <div class="insights">
        <div class="kv"><b>Loop Label</b>${esc(dominantLoop?.label || "Unavailable")}</div>
        <div class="kv"><b>What it means</b>${esc(dominantLoop?.meaning || "No loop inference available for this profile.")}</div>
        <div class="kv"><b>Why it matters</b>${esc(dominantLoop?.why || "-")}</div>
        <div class="kv"><b>Interrupt strategy</b>${esc(dominantLoop?.interrupt || "-")}</div>
      </div>
      ${primary?.slug ? `<a class="metric-cta" href="${routeTo("love", `archetype/${primary.slug}`, query)}">View full archetype guidance →</a>` : ""}
    </section>` : ""}

    <section class="section">
      <h2>Score Visualization</h2>
      ${scores.map((item) => `
        <div class="chart-row">
          <div class="chart-label"><span>${esc(codeToName[item.code] || item.code)} ${top3.find((t) => t.code === item.code) ? "⭐" : ""}</span><span>${item.score.toFixed(1)}%</span></div>
          <div class="track"><div class="fill" style="width:${Math.max(0, Math.min(100, item.score))}%"></div></div>
        </div>`).join("")}
    </section>

    <section class="section">
      <h2>Top 3 Breakdown</h2>
      <div class="top3">
      ${top3.map((item) => {
        const a = codeIndex[item.code] || {};
        const bal = payload.balanceStates?.dimensions?.[item.code] || payload.balanceState || payload.balanceStates?.overall || "balanced";
        return `<div class="card">
          <h3>${esc(displayName(engine, a, item.code))}</h3>
          ${displaySubtitle(engine, a, item.code) ? `<div class="muted">${esc(displaySubtitle(engine, a, item.code))}</div>` : ""}
          <div>${item.score.toFixed(1)}%</div>
          <p class="muted">${esc(a.shortDescription || a.tagline || a.description || "Descriptor pending")}</p>
          <div class="muted">${esc(a.coreTrait || "Core trait pending")}</div>
          <div class="chip">${esc(bal)}</div>
          <a href="${routeTo(engine, `archetype/${a.slug}?back=${encodeURIComponent(routeTo(engine, `result/${resultId}`, query))}`, query)}">View full archetype</a>
        </div>`;
      }).join("")}
      </div>
    </section>

    <section class="section">
      <h2>Output Contract</h2>
      <div class="${isLoveEngine ? "output-contract output-contract-love" : "insights"}">
        <div class="${isLoveEngine ? "output-card output-card-lead" : "kv"}"><b>🧬 Primary Archetype</b>${esc(displayName(engine, primary, payload.primaryArchetype?.code || ""))}</div>
        <div class="${isLoveEngine ? "output-card output-card-lead" : "kv"}"><b>🛰️ Secondary Archetype</b>${esc(displayName(engine, secondary, payload.secondaryArchetype?.code || ""))}</div>
        <div class="${isLoveEngine ? "output-card output-card-lead" : "kv"}"><b>✨ Hybrid Label</b>${esc(payload.hybridArchetype ? hybridLabel : "None")}</div>
        <div class="${isLoveEngine ? "output-card" : "kv"}"><b>📊 Ranked Archetypes</b>${isLoveEngine ? `<ol class="ranked-list">${rankedArchetypes.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>` : esc(rankedArchetypes.join(" • "))}</div>
        <div class="${isLoveEngine ? "output-card output-card-metric" : "kv"}">
          <b>⚖️ Balance States ${isLoveEngine ? renderMetricHelp("Balance States", "How strongly each pattern is currently showing.", "It reveals which connection energies are dominant right now.") : ""}</b>
          ${isLoveEngine ? renderMetricList(balanceEntries, codeToName, { raw: true }) : esc(balanceEntries.map(([code, state]) => `${codeToName[code] || code}: ${state}`).join(" • ") || "-")}
        </div>
        <div class="${isLoveEngine ? "output-card output-card-metric" : "kv"}">
          <b>🧯 Stress Profile ${isLoveEngine ? renderMetricHelp("Stress Profile", "How your pattern shifts under pressure.", "It helps explain your relationship reactions in difficult moments.") : ""}</b>
          ${isLoveEngine ? renderMetricList(stressEntries, codeToName, { suffix: "%", precision: 1 }) : esc(stressEntries.map(([code, val]) => `${codeToName[code] || code}: ${Number(val).toFixed(1)}%`).join(" • ") || "-")}
        </div>
        <div class="${isLoveEngine ? "output-card output-card-metric" : "kv"}">
          <b>🧭 Desired Gap ${isLoveEngine ? renderMetricHelp("Desired Gap", "Where how you are differs from how you want to be.", "It highlights growth targets for better alignment in relationships.") : ""}</b>
          ${isLoveEngine ? renderMetricList(desiredGapDisplayEntries, codeToName, { raw: true }) : esc(desiredGapEntries.map(([code, val]) => `${codeToName[code] || code}: ${Number(val).toFixed(1)}`).join(" • ") || "-")}
        </div>
        <div class="${isLoveEngine ? "output-card output-card-metric" : "kv"}">
          <b>🪞 Identity-Behavior Gap ${isLoveEngine ? renderMetricHelp("Identity-Behavior Gap", "Where your self-image and observed pattern differ.", "It surfaces blind spots between intention and action.") : ""}</b>
          ${isLoveEngine ? renderMetricList(identityGapDisplayEntries, codeToName, { raw: true }) : esc(identityBehaviorEntries.map(([code, val]) => `${codeToName[code] || code}: ${Number(val).toFixed(1)}`).join(" • ") || "-")}
        </div>
        <div class="${isLoveEngine ? "output-card output-card-kpi" : "kv"}">
          <b>📐 Consistency ${isLoveEngine ? renderMetricHelp("Consistency", "How internally aligned your answers were.", "Higher alignment generally means a clearer behavioral pattern.") : ""}</b>
          <div class="kpi-value">${esc(String(consistencyValue ?? "-"))}%</div>
        </div>
        <div class="${isLoveEngine ? "output-card output-card-kpi" : "kv"}">
          <b>🔒 Confidence ${isLoveEngine ? renderMetricHelp("Confidence", "How strong and complete the result signal is.", "Higher confidence means the output is more reliable for interpretation.") : ""}</b>
          <div class="kpi-value">${esc(String(confidenceValue ?? "-"))}%</div>
        </div>
        ${!isLoveEngine ? `<div class="kv"><b>Summary Block</b>${esc(JSON.stringify(payload.summaryBlock || {}))}</div>` : ""}
      </div>
    </section>

    <section class="section">
      <h2>Your Pattern</h2>
      <div class="insights">
        <div class="kv"><b>Primary Insight</b>${esc(insightOrFallback(payload.primaryInsight, "Primary pattern insight is not available yet."))}</div>
        <div class="kv"><b>Secondary Insight</b>${esc(insightOrFallback(payload.secondaryInsight, "Secondary pattern insight is not available yet."))}</div>
      </div>
    </section>

    <section class="section">
      <h2>Your Current State</h2>
      <div class="insights">
        <div class="kv"><b>Balance Insight</b>${esc(insightOrFallback(payload.balanceInsight, strongestGap(payload.desiredCurrentGap || payload.desiredVsCurrent, codeToName)))}</div>
        <div class="kv"><b>Stress Insight</b>${esc(insightOrFallback(payload.stressInsight, summarizeStress(payload.stressProfile, codeToName)))}</div>
      </div>
    </section>

    <section class="section">
      <h2>Self Alignment</h2>
      <div class="insights">
        <div class="kv"><b>Identity Gap Insight</b>${esc(insightOrFallback(payload.identityGapInsight, strongestGap(payload.identityBehaviorGap, codeToName)))}</div>
        <div class="kv"><b>Consistency Insight</b>${esc(insightOrFallback(payload.consistencyInsight, `Consistency Score: ${String(payload.contradictionConsistency?.consistency ?? "-")}%`))}</div>
      </div>
    </section>

    ${isLoveEngine ? `<div id="meaning-rebalance">${renderLoveInterpretationLayer({ payload, archetypes, codeToName, codeIndex, query })}</div>` : ""}

    <section class="section">
      <h2>Full Archetype Spectrum</h2>
      <p class="muted">Scan + compare all archetypes, then open any profile.</p>
      <div class="spectrum-grid">
      ${scores.map((item) => {
        const a = codeIndex[item.code] || {};
        return `<a class="card spectrum-card" href="${routeTo(engine, `archetype/${a.slug}?back=${encodeURIComponent(routeTo(engine, `result/${resultId}`, query))}`, query)}">
          ${cardVisual(a, { engine, loveImageVariant: selectedVariant })}
          <h3>${esc(displayName(engine, a, item.code))}</h3>
          ${displaySubtitle(engine, a, item.code) ? `<div class="muted">${esc(displaySubtitle(engine, a, item.code))}</div>` : ""}
          <div class="muted">${esc(a.coreTrait || "Core trait pending")}</div>
          <div>Score: ${item.score.toFixed(1)}%</div>
          <div class="muted">Rank #${item.rank}</div>
          <div class="chip">View full archetype</div>
        </a>`;
      }).join("")}
      </div>
    </section>

    <section class="section">
      <a class="crumb" href="${routeTo(engine, "browse", query)}">Browse all ${titleCase(engine)} archetypes →</a>
    </section>`;
  if (engine === "love") wireLoveVariantToggle(options.onLoveVariantChange || (() => {}));
}

function renderLoveResultStory(app, engine, archetypes, resultId, payload, query) {
  const scores = sortScores(payload.normalizedScores).slice(0, 5);
  const codeIndex = Object.fromEntries(archetypes.map((a) => [a.code, a]));
  if (!scores.length) {
    window.location.replace(routeTo(engine, `result/${encodeURIComponent(resultId)}`, query));
    return;
  }

  app.innerHTML = `
    <section class="section story-shell">
      <div class="story-header">
        <div class="chip">Love Story View</div>
        <button type="button" id="storyCloseBtn" class="chip">Close</button>
      </div>
      <div class="story-frame" id="storyFrame" aria-live="polite">
        ${scores.map((item, idx) => {
          const archetype = codeIndex[item.code] || {};
          const descriptor = String(archetype.shortDescription || "Connection pattern descriptor pending.").trim();
          return `
            <article class="story-slide${idx === 0 ? " is-active" : ""}" data-story-index="${idx}">
              <div class="story-rank">#${idx + 1} Archetype</div>
              ${cardVisual(archetype, { engine, loveImageVariant: LOVE_IMAGE_VARIANTS[0] })}
              <h2>${esc(displayName(engine, archetype, item.code))}</h2>
              <div class="story-percent">${item.score.toFixed(1)}%</div>
              <p class="muted">${esc(descriptor)}</p>
            </article>`;
        }).join("")}
      </div>
      <div class="story-controls">
        <button type="button" id="storyPrevBtn" class="chip">Prev</button>
        <div id="storyDots" class="story-dots">${scores.map((_, idx) => `<button type="button" class="story-dot${idx === 0 ? " is-active" : ""}" data-story-dot="${idx}" aria-label="Slide ${idx + 1}"></button>`).join("")}</div>
        <button type="button" id="storyNextBtn" class="chip">Next</button>
      </div>
      <div class="story-footer">
        <button type="button" id="storyExitBtn" class="chip">See full result</button>
      </div>
    </section>`;

  const fullResultHref = routeTo(engine, `result/${encodeURIComponent(resultId)}`, query);
  const slides = Array.from(document.querySelectorAll(".story-slide"));
  const dots = Array.from(document.querySelectorAll("[data-story-dot]"));
  let activeIndex = 0;
  let touchStartX = null;
  let touchStartY = null;

  const renderActive = () => {
    for (const [idx, slide] of slides.entries()) slide.classList.toggle("is-active", idx === activeIndex);
    for (const [idx, dot] of dots.entries()) dot.classList.toggle("is-active", idx === activeIndex);
  };
  const goTo = (index) => {
    const max = Math.max(slides.length - 1, 0);
    activeIndex = Math.max(0, Math.min(max, index));
    renderActive();
  };
  const next = () => goTo((activeIndex + 1) % slides.length);
  const prev = () => goTo((activeIndex - 1 + slides.length) % slides.length);
  const exitToResult = () => window.location.assign(fullResultHref);
  const autoTimer = window.setInterval(next, 4000);

  document.getElementById("storyCloseBtn")?.addEventListener("click", exitToResult);
  document.getElementById("storyExitBtn")?.addEventListener("click", exitToResult);
  document.getElementById("storyNextBtn")?.addEventListener("click", next);
  document.getElementById("storyPrevBtn")?.addEventListener("click", prev);
  for (const dot of dots) {
    dot.addEventListener("click", () => {
      const index = Number(dot.getAttribute("data-story-dot"));
      if (Number.isFinite(index)) goTo(index);
    });
  }

  const frame = document.getElementById("storyFrame");
  frame?.addEventListener("touchstart", (evt) => {
    const touch = evt.changedTouches?.[0];
    if (!touch) return;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });
  frame?.addEventListener("touchend", (evt) => {
    const touch = evt.changedTouches?.[0];
    if (!touch || touchStartX === null || touchStartY === null) return;
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    touchStartX = null;
    touchStartY = null;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (deltaX < 0) next(); else prev();
  }, { passive: true });
  window.addEventListener("beforeunload", () => window.clearInterval(autoTimer), { once: true });
}

async function boot() {
  const app = document.getElementById("app");
  const label = document.getElementById("engineLabel");
  const page = document.querySelector(".page");
  const route = parseRoute();
  if (!route) {
    app.innerHTML = `<section class="section error">Unsupported route.</section>`;
    return;
  }
  label.textContent = `${titleCase(route.engine)} Engine`;

  try {
    const query = new URLSearchParams(window.location.search);
    let loveImageVariant = getStoredLoveImageVariant();
    const requestedVariant = String(query.get("view") || query.get("variant") || "").trim().toLowerCase();
    if (LOVE_IMAGE_VARIANTS.includes(requestedVariant)) {
      loveImageVariant = requestedVariant;
      setStoredLoveImageVariant(loveImageVariant);
    }
    const setLoveVariant = (variant) => {
      if (!LOVE_IMAGE_VARIANTS.includes(variant) || loveImageVariant === variant) return;
      loveImageVariant = variant;
      setStoredLoveImageVariant(variant);
      renderCurrent();
    };
    const backgroundAsset = safeAssetPath(query.get("background") || query.get("bg") || "");
    if (page && backgroundAsset) {
      page.classList.add("has-bg");
      page.style.backgroundImage = `linear-gradient(rgba(0,0,0,.72), rgba(0,0,0,.72)), url("${backgroundAsset.replace(/"/g, '\"')}")`;
    }
    const archetypeUrl = new URL(`/api/archetype-engines/${route.engine}/archetypes`, window.location.origin);
    for (const [key, value] of stableContextParams(query).entries()) archetypeUrl.searchParams.set(key, value);
    archetypeUrl.searchParams.set("route_mode", route.mode);
    const data = await jsonFetch(`${archetypeUrl.pathname}${archetypeUrl.search}`);
    const archetypes = data.archetypes || [];
    let resultPayload = null;
    let resultData = null;

    const renderCurrent = () => {
      const sharedOptions = { loveImageVariant, onLoveVariantChange: setLoveVariant };
      if (route.mode === "browse") {
        renderBrowse(app, route.engine, archetypes, query, sharedOptions);
        return;
      }
      if (route.mode === "detail") {
        const archetype = archetypes.find((a) => a.slug === route.slug);
        if (!archetype) throw new Error("Archetype not found");
        renderDetail(app, route.engine, archetype, query, sharedOptions);
        return;
      }
      if (route.mode === "result") {
        renderResult(app, route.engine, archetypes, route.resultId, resultPayload || {}, query, sharedOptions);
        return;
      }
      if (route.mode === "story" && route.engine === "love") {
        renderLoveResultStory(app, route.engine, archetypes, route.resultId, resultPayload || {}, query);
      }
    };

    if (route.mode === "assessment") {
      await renderAssessment(app, route.engine, query);
      return;
    }
    if (route.mode === "browse" || route.mode === "detail") {
      renderCurrent();
      return;
    }

    const resultUrl = new URL(`/api/archetype-engines/${route.engine}/results/${route.resultId}`, window.location.origin);
    for (const [key, value] of stableContextParams(query).entries()) resultUrl.searchParams.set(key, value);
    resultData = await jsonFetch(`${resultUrl.pathname}${resultUrl.search}`);
    resultPayload = resultData.result_payload || {};
    renderCurrent();
  } catch (err) {
    app.innerHTML = `<section class="section error">${esc(err.message || "Failed to load")}</section>`;
  }
}

boot();
