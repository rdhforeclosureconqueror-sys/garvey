"use strict";

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function titleCase(s) {
  return String(s || "").replace(/(^|[-_\s])(\w)/g, (_, p1, p2) => `${p1}${p2.toUpperCase()}`);
}

function parseRoute() {
  const match = window.location.pathname.match(/^\/archetype-engines\/(love|leadership|loyalty)\/(result\/([^/]+)|archetype\/([^/]+)|browse|assessment)\/?$/);
  if (!match) return null;
  return {
    engine: match[1],
    mode: match[2].startsWith("result/") ? "result" : match[2].startsWith("archetype/") ? "detail" : match[2] === "assessment" ? "assessment" : "browse",
    resultId: match[3] || "",
    slug: match[4] || "",
  };
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

function routeTo(engine, path) {
  return `/archetype-engines/${engine}/${path}`;
}


function pickCtx(query) {
  return {
    tenant: String(query.get("tenant") || "").trim(),
    email: String(query.get("email") || "").trim().toLowerCase(),
    name: String(query.get("name") || "").trim(),
    cid: String(query.get("cid") || "").trim(),
    crid: String(query.get("crid") || query.get("rid") || "").trim(),
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
        <div class="chip">Question ${state.index + 1} of ${questions.length}</div>
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
          answers: state.answers,
        });
        const scored = await jsonFetch(`/api/archetype-engines/${engine}/assessment/score`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        window.location.assign(routeTo(engine, `result/${encodeURIComponent(scored.resultId)}`));
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
      const consentPayload = buildPayload(query, {
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
  const contract = await jsonFetch(`/api/archetype-engines/${engine}/assessment/consent-contract`);
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

function renderBrowse(app, engine, archetypes) {
  app.innerHTML = `
    <section class="section">
      <h1>${titleCase(engine)} Archetypes</h1>
      <p class="muted">Scan and compare the full archetype spectrum.</p>
      <div class="spectrum-grid">
        ${archetypes.map((a, idx) => `
          <a class="card spectrum-card" href="${routeTo(engine, `archetype/${a.slug}`)}">
            ${cardPlaceholder(a)}
            <h3>${esc(a.emoji || "") } ${esc(displayName(engine, a, a.code))}</h3>
            ${displaySubtitle(engine, a, a.code) ? `<div class="muted">${esc(displaySubtitle(engine, a, a.code))}</div>` : ""}
            <div class="muted">Rank preview #${idx + 1}</div>
            <div class="muted">Code: ${esc(a.code)}</div>
            <div class="chip">View full archetype</div>
          </a>
        `).join("")}
      </div>
    </section>`;
}

function renderDetail(app, engine, archetype, query) {
  const backHref = query.get("back") || routeTo(engine, "browse");
  app.innerHTML = `
    <section class="section">
      <a class="crumb" href="${backHref}">← Back</a>
      <h1>${esc(archetype.emoji || "") } ${esc(displayName(engine, archetype, archetype.code))}</h1>
      ${displaySubtitle(engine, archetype, archetype.code) ? `<p class="muted">${esc(displaySubtitle(engine, archetype, archetype.code))}</p>` : ""}
      <p class="muted">${esc(archetype.tagline || "")}</p>
      ${cardPlaceholder(archetype)}
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
}

function renderResult(app, engine, archetypes, resultId, payload) {
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

  app.innerHTML = `
    <section class="section hero">
      <div>
        <div class="chip">Result Summary</div>
        <h1 class="primary">${esc(primary?.emoji || "") } ${esc(displayName(engine, primary, payload.primaryArchetype?.code || ""))}</h1>
        ${displaySubtitle(engine, primary, payload.primaryArchetype?.code || "") ? `<p class="muted">${esc(displaySubtitle(engine, primary, payload.primaryArchetype?.code || ""))}</p>` : ""}
        <p class="muted">Secondary: ${esc(displayName(engine, secondary, payload.secondaryArchetype?.code || ""))}</p>
        ${payload.hybridArchetype ? `<div class="chip">Hybrid (${Number(hybridGap).toFixed(1)} gap): ${esc(hybridLabel)}</div>` : ""}
        <div class="muted">Result ID: ${esc(resultId)}</div>
      </div>
      <div>${cardPlaceholder(primary || secondary)}</div>
    </section>

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
          <a href="${routeTo(engine, `archetype/${a.slug}?back=${encodeURIComponent(routeTo(engine, `result/${resultId}`))}`)}">View full archetype</a>
        </div>`;
      }).join("")}
      </div>
    </section>

    <section class="section">
      <h2>Output Contract</h2>
      <div class="insights">
        <div class="kv"><b>Primary Archetype</b>${esc(displayName(engine, primary, payload.primaryArchetype?.code || ""))}</div>
        <div class="kv"><b>Secondary Archetype</b>${esc(displayName(engine, secondary, payload.secondaryArchetype?.code || ""))}</div>
        <div class="kv"><b>Hybrid Label</b>${esc(payload.hybridArchetype ? hybridLabel : "None")}</div>
        <div class="kv"><b>Ranked Archetypes</b>${esc(scores.map((item) => `${item.rank}. ${codeToName[item.code] || item.code}`).join(" • "))}</div>
        <div class="kv"><b>Balance States</b>${esc(Object.entries(payload.balanceStates?.dimensions || {}).map(([code, state]) => `${codeToName[code] || code}: ${state}`).join(" • ") || "-")}</div>
        <div class="kv"><b>Stress Profile</b>${esc(Object.entries(payload.stressProfile || {}).map(([code, val]) => `${codeToName[code] || code}: ${Number(val).toFixed(1)}%`).join(" • ") || "-")}</div>
        <div class="kv"><b>Desired Gap</b>${esc(Object.entries(payload.desiredCurrentGap || {}).map(([code, val]) => `${codeToName[code] || code}: ${Number(val).toFixed(1)}`).join(" • ") || "-")}</div>
        <div class="kv"><b>Identity-Behavior Gap</b>${esc(Object.entries(payload.identityBehaviorGap || {}).map(([code, val]) => `${codeToName[code] || code}: ${Number(val).toFixed(1)}`).join(" • ") || "-")}</div>
        <div class="kv"><b>Consistency</b>${esc(String(payload.contradictionConsistency?.consistency ?? "-"))}%</div>
        <div class="kv"><b>Confidence</b>${esc(String(payload.confidence ?? "-"))}%</div>
        <div class="kv"><b>Summary Block</b>${esc(JSON.stringify(payload.summaryBlock || {}))}</div>
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

    <section class="section">
      <h2>Full Archetype Spectrum</h2>
      <p class="muted">Scan + compare all archetypes, then open any profile.</p>
      <div class="spectrum-grid">
      ${scores.map((item) => {
        const a = codeIndex[item.code] || {};
        return `<a class="card spectrum-card" href="${routeTo(engine, `archetype/${a.slug}?back=${encodeURIComponent(routeTo(engine, `result/${resultId}`))}`)}">
          ${cardPlaceholder(a)}
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
      <a class="crumb" href="${routeTo(engine, "browse")}">Browse all ${titleCase(engine)} archetypes →</a>
    </section>`;
}

async function boot() {
  const app = document.getElementById("app");
  const label = document.getElementById("engineLabel");
  const route = parseRoute();
  if (!route) {
    app.innerHTML = `<section class="section error">Unsupported route.</section>`;
    return;
  }
  label.textContent = `${titleCase(route.engine)} Engine`;

  try {
    const data = await jsonFetch(`/api/archetype-engines/${route.engine}/archetypes`);
    const archetypes = data.archetypes || [];
    const query = new URLSearchParams(window.location.search);

    if (route.mode === "browse") {
      renderBrowse(app, route.engine, archetypes);
      return;
    }
    if (route.mode === "detail") {
      const archetype = archetypes.find((a) => a.slug === route.slug);
      if (!archetype) throw new Error("Archetype not found");
      renderDetail(app, route.engine, archetype, query);
      return;
    }
    if (route.mode === "assessment") {
      await renderAssessment(app, route.engine, query);
      return;
    }

    const resultData = await jsonFetch(`/api/archetype-engines/${route.engine}/results/${route.resultId}`);
    renderResult(app, route.engine, archetypes, route.resultId, resultData.result_payload || {});
  } catch (err) {
    app.innerHTML = `<section class="section error">${esc(err.message || "Failed to load")}</section>`;
  }
}

boot();
