"use strict";

const express = require("express");
const { buildYouthDevelopmentResult } = require("../youth-development/measurement/resultBuilder");
const { buildYouthDevelopmentDashboard } = require("../youth-development/measurement/dashboardBuilder");
const { buildParentDashboardPageModel } = require("../youth-development/presentation/parentDashboardPageModel");
const { renderYouthDevelopmentParentDashboardPage } = require("./youthDevelopmentRenderer");
const {
  YOUTH_QUESTION_BANK,
  YOUTH_PARENT_INSTRUCTIONS,
  YOUTH_ANSWER_SCALE,
} = require("../youth-development/question-engine/youthQuestionBank");
const { getQuestionFlowState, validateAnswers } = require("../youth-development/question-engine/youthQuestionFlow");
const { runYouthIntakeScoring } = require("../youth-development/question-engine/youthScoringMap");

const PREVIEW_AGGREGATED_ROWS = Object.freeze([
  Object.freeze({
    trait_code: "SR",
    baseline_score: 61,
    current_score: 82,
    change_score: 21,
    confidence_score: 86,
    evidence_mix_score: 79,
    trend_direction: "increasing",
  }),
  Object.freeze({
    trait_code: "PS",
    baseline_score: 44,
    current_score: 34,
    change_score: -10,
    confidence_score: 72,
    evidence_mix_score: 66,
    trend_direction: "decreasing",
  }),
  Object.freeze({
    trait_code: "CQ",
    baseline_score: 58,
    current_score: 63,
    change_score: 5,
    confidence_score: 49,
    evidence_mix_score: 54,
    trend_direction: "stable",
  }),
]);

const PREVIEW_OPTIONS = Object.freeze({
  generatedAt: "2026-01-01T00:00:00.000Z",
  evidenceSummary: Object.freeze({
    sources_used: Object.freeze(["child_task", "teacher_observation", "assessor_observation"]),
    confidence_caveats: Object.freeze([
      "Preview fixture only: this output is for renderer verification, not production interpretation.",
    ]),
  }),
  environmentNotes: Object.freeze([
    "Preview fixture note: this page is test-only and uses deterministic sample rows.",
  ]),
});

const INTAKE_TEST_FIXTURE = Object.freeze({
  schema_version: "1.0",
  session_id: "session-1",
  child_id: "child-1",
  submitted_at: "2026-03-01T12:00:00.000Z",
  task_results: Object.freeze([
    Object.freeze({
      task: Object.freeze({
        task_id: "YT_B1_CQ_01",
        trait_code: "CQ",
        task_class: "SCT",
        expected_signal_types: Object.freeze(["inquiry_depth", "justification_quality", "decision_quality"]),
        scoring_type: "rubric",
        evidence_source: "child_scenario",
      }),
      raw_input: Object.freeze({
        timestamp: "2026-03-01T12:01:00.000Z",
        metrics: Object.freeze({
          inquiry_depth: 3,
          justification_quality: 3,
          decision_quality: 2,
        }),
        measurement_window: "current",
        is_current: true,
      }),
    }),
  ]),
  options: Object.freeze({
    ignore_contaminated: true,
  }),
});

function safeTrim(value) {
  return String(value ?? "").trim();
}

function normalizeAccountContext(source = {}) {
  return {
    tenant: safeTrim(source.tenant || source.tenant_slug).toLowerCase(),
    email: safeTrim(source.email).toLowerCase(),
    name: safeTrim(source.name),
    cid: safeTrim(source.cid),
    crid: safeTrim(source.crid || source.rid),
  };
}

function resolveRequestAccountContext(req, body = {}) {
  const authCtx = normalizeAccountContext({
    tenant: req.authActor?.tenantSlug,
    email: req.authActor?.email,
    name: req.authActor?.name,
  });
  const queryCtx = normalizeAccountContext(req.query || {});
  const bodyCtx = normalizeAccountContext(body || {});
  const headerCtx = normalizeAccountContext({
    tenant: req.headers["x-tenant-slug"],
    email: req.headers["x-user-email"],
    name: req.headers["x-user-name"],
  });
  if (authCtx.tenant && authCtx.email) {
    return {
      tenant: authCtx.tenant,
      email: authCtx.email,
      name: authCtx.name || bodyCtx.name || queryCtx.name || headerCtx.name,
      cid: bodyCtx.cid || queryCtx.cid,
      crid: bodyCtx.crid || queryCtx.crid,
    };
  }
  return {
    tenant: bodyCtx.tenant || queryCtx.tenant || headerCtx.tenant,
    email: bodyCtx.email || queryCtx.email || headerCtx.email,
    name: bodyCtx.name || queryCtx.name || headerCtx.name,
    cid: bodyCtx.cid || queryCtx.cid,
    crid: bodyCtx.crid || queryCtx.crid,
  };
}

function renderYouthDevelopmentIntakeTestPage() {
  const fixture = JSON.stringify(INTAKE_TEST_FIXTURE, null, 2);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Youth Development Intake Test (Internal)</title>
    <style>
      :root {
        --bg: #030712;
        --panel: linear-gradient(150deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.88));
        --line: rgba(148, 163, 184, 0.38);
        --text: #e2e8f0;
        --muted: #94a3b8;
      }
      * { box-sizing: border-box; }
      body {
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        margin: 0;
        padding: 18px;
        background: radial-gradient(circle at 5% 0%, #111827, #020617 60%);
        color: var(--text);
      }
      main { max-width: 1180px; margin: 0 auto; display: grid; gap: 12px; }
      section { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 14px; }
      .intro-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; align-items: flex-start; }
      .preview-banner { font-weight: 700; color: #fed7aa; background: rgba(124, 45, 18, 0.35); border: 1px solid rgba(251, 146, 60, 0.45); border-radius: 999px; padding: 6px 10px; font-size: 12px; display: inline-block; }
      .status-ok { color: #4ade80; font-weight: 700; }
      .status-bad { color: #fca5a5; font-weight: 700; }
      textarea { width: 100%; min-height: 280px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; border-radius: 8px; border: 1px solid var(--line); background: rgba(2, 6, 23, 0.8); color: #dbeafe; padding: 10px; }
      button { border: 1px solid #22d3ee; background: linear-gradient(120deg, #0f172a, #1e293b); color: #f8fafc; border-radius: 999px; padding: 9px 14px; font-size: 13px; cursor: pointer; }
      button:hover { filter: brightness(1.08); }
      code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      pre { white-space: pre-wrap; overflow-wrap: anywhere; border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: rgba(2, 6, 23, 0.75); color: #bfdbfe; }
      .warn-list { color: #fdba74; }
      .err-list { color: #fca5a5; font-weight: 600; }
      .summary-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid var(--line); padding: 6px; text-align: left; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
      .preset-btn { background: rgba(15, 23, 42, 0.9); border-color: #64748b; }
      .status-panel { display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px; }
      .status-code { font-size: 32px; font-weight: 800; }
      .status-label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
      .status-note { color: #cbd5e1; font-size: 13px; }
      .callout-grid { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
      .callout { border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: rgba(15, 23, 42, 0.65); }
      .callout h4 { margin: 0 0 8px 0; font-size: 14px; }
      .trait-summary { border: 1px solid rgba(56, 189, 248, 0.5); background: rgba(12, 74, 110, 0.35); border-radius: 8px; padding: 10px; }
      .trait-summary h3 { margin: 0 0 8px 0; font-size: 15px; }
      .trait-summary p { margin: 4px 0; }
      .quick-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 8px; }
      .qa-card { border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: rgba(2, 6, 23, 0.5); }
      .qa-card h3 { margin: 0 0 6px 0; font-size: 14px; }
      .qa-card p { margin: 0; font-size: 13px; color: #cbd5e1; }
      .consent-wrap { display: grid; gap: 10px; border: 1px solid rgba(34, 211, 238, 0.45); border-radius: 10px; background: rgba(2, 132, 199, 0.12); padding: 12px; }
      .consent-row { display: flex; gap: 10px; align-items: flex-start; }
      .consent-actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .consent-status { color: #cbd5e1; min-height: 18px; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <div class="intro-header">
          <div>
            <p class="preview-banner">Internal / preview / test-only UI. Not a production user flow.</p>
            <h1>Youth Development Intake Test Runner</h1>
            <p>Endpoint: <code id="endpointLabel">/api/youth-development/intake/task-session</code></p>
          </div>
          <div class="quick-actions" aria-label="dashboard quick actions">
            <div class="qa-card"><h3>One-click verify</h3><p>Use preset payloads and run tests without leaving this page.</p></div>
            <div class="qa-card"><h3>Visible confidence</h3><p>Track warnings, low-confidence counts, and trait trends immediately.</p></div>
          </div>
        </div>
      </section>

      <section>
        <div class="consent-wrap">
          <h2>Permission required before test start</h2>
          <p>This internal runner processes youth-development test payloads. Confirm permission before starting a run.</p>
          <label class="consent-row">
            <input id="consentCheck" type="checkbox" />
            <span>I have permission to run this youth-development test payload.</span>
          </label>
          <div class="consent-actions">
            <button id="consentAcceptButton" type="button">Accept and continue</button>
            <button id="consentDeclineButton" type="button" class="preset-btn">Decline</button>
          </div>
          <div id="consentStatus" class="consent-status" aria-live="polite">Permission is required before starting tests.</div>
        </div>
      </section>

      <section>
        <h2>Payload editor</h2>
        <p>Default payload is prefilled from the known-good fixture used in youth intake tests.</p>
        <div class="toolbar">
          <button id="presetStrongButton" class="preset-btn" type="button">Load preset: strong / high-confidence</button>
          <button id="presetSupportButton" class="preset-btn" type="button">Load preset: support-needed</button>
          <button id="presetLowConfidenceButton" class="preset-btn" type="button">Load preset: low-confidence</button>
          <button id="resetPayloadButton" class="preset-btn" type="button">Reset to known-good payload</button>
        </div>
        <textarea id="payloadEditor" aria-label="Task session payload">${fixture}</textarea>
        <p><button id="runTestButton" type="button">Run Test</button></p>
      </section>

      <section>
        <h2>Response summary</h2>
        <div class="status-panel">
          <div>
            <div class="status-label">HTTP status</div>
            <div id="statusText" class="status-code">not run</div>
          </div>
          <div id="statusNote" class="status-note">Awaiting request.</div>
        </div>
        <div class="summary-grid">
          <div><strong>Mode:</strong> <span id="modeText">-</span></div>
          <div><strong>Processed signals:</strong> <span id="signalCountText">-</span></div>
        </div>
        <div id="traitSummaryBlock" class="trait-summary">
          <h3>Trait summary (compact)</h3>
          <p><strong>Total rows:</strong> <span id="traitSummaryCount">0</span></p>
          <p><strong>Top trait:</strong> <span id="traitSummaryTop">-</span></p>
          <p><strong>Low-confidence rows (&lt;60):</strong> <span id="traitSummaryLowConfidence">0</span></p>
        </div>
        <div class="callout-grid">
          <div class="callout">
            <h4>Validation errors</h4>
            <ul id="validationErrors" class="err-list"><li>none</li></ul>
          </div>
          <div class="callout">
            <h4>Warnings / low-confidence notices</h4>
            <ul id="warningsList" class="warn-list"><li>none</li></ul>
          </div>
        </div>
      </section>

      <section>
        <h2>Trait rows</h2>
        <table>
          <thead>
            <tr>
              <th>Trait</th>
              <th>Current</th>
              <th>Change</th>
              <th>Confidence</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody id="traitRows"><tr><td colspan="5">none</td></tr></tbody>
        </table>
      </section>

      <section>
        <h2>Dashboard summary</h2>
        <pre id="dashboardSummary">not run</pre>
      </section>

      <section>
        <h2>Page-model summary</h2>
        <pre id="pageModelSummary">not run</pre>
      </section>

      <section>
        <h2>Debug output</h2>
        <details open>
          <summary>Raw JSON response (expand/collapse)</summary>
          <pre id="rawJson">not run</pre>
        </details>
      </section>
    </main>
    <script>
      (function () {
        const endpoint = "/api/youth-development/intake/task-session";
        const knownGoodPayload = ${fixture};
        const presetPayloads = {
          strong: {
            ...knownGoodPayload,
            session_id: "session-strong",
            task_results: [
              {
                ...knownGoodPayload.task_results[0],
                raw_input: {
                  ...knownGoodPayload.task_results[0].raw_input,
                  metrics: {
                    inquiry_depth: 4,
                    justification_quality: 4,
                    decision_quality: 4,
                  },
                },
              },
            ],
          },
          support: {
            ...knownGoodPayload,
            session_id: "session-support",
            task_results: [
              {
                ...knownGoodPayload.task_results[0],
                raw_input: {
                  ...knownGoodPayload.task_results[0].raw_input,
                  metrics: {
                    inquiry_depth: 1,
                    justification_quality: 1,
                    decision_quality: 1,
                  },
                },
              },
            ],
          },
          lowConfidence: {
            ...knownGoodPayload,
            session_id: "session-low-confidence",
            task_results: [
              {
                ...knownGoodPayload.task_results[0],
                raw_input: {
                  ...knownGoodPayload.task_results[0].raw_input,
                  metrics: {
                    inquiry_depth: 2,
                    justification_quality: 2,
                    decision_quality: 2,
                  },
                },
              },
            ],
          },
        };
        const runBtn = document.getElementById("runTestButton");
        const presetStrongButton = document.getElementById("presetStrongButton");
        const presetSupportButton = document.getElementById("presetSupportButton");
        const presetLowConfidenceButton = document.getElementById("presetLowConfidenceButton");
        const resetPayloadButton = document.getElementById("resetPayloadButton");
        const consentCheck = document.getElementById("consentCheck");
        const consentAcceptButton = document.getElementById("consentAcceptButton");
        const consentDeclineButton = document.getElementById("consentDeclineButton");
        const consentStatus = document.getElementById("consentStatus");
        const payloadEditor = document.getElementById("payloadEditor");
        const statusText = document.getElementById("statusText");
        const statusNote = document.getElementById("statusNote");
        const modeText = document.getElementById("modeText");
        const signalCountText = document.getElementById("signalCountText");
        const traitSummaryCount = document.getElementById("traitSummaryCount");
        const traitSummaryTop = document.getElementById("traitSummaryTop");
        const traitSummaryLowConfidence = document.getElementById("traitSummaryLowConfidence");
        const validationErrors = document.getElementById("validationErrors");
        const warningsList = document.getElementById("warningsList");
        const traitRows = document.getElementById("traitRows");
        const dashboardSummary = document.getElementById("dashboardSummary");
        const pageModelSummary = document.getElementById("pageModelSummary");
        const rawJson = document.getElementById("rawJson");
        let permissionAccepted = false;

        function setTestingEnabled(enabled) {
          permissionAccepted = enabled === true;
          [runBtn, presetStrongButton, presetSupportButton, presetLowConfidenceButton, resetPayloadButton, payloadEditor]
            .forEach((node) => {
              if (!node) return;
              node.disabled = !permissionAccepted;
            });
        }

        function resetList(container, values) {
          container.textContent = "";
          const entries = Array.isArray(values) ? values.filter(Boolean) : [];
          if (!entries.length) {
            const li = document.createElement("li");
            li.textContent = "none";
            container.appendChild(li);
            return;
          }
          entries.forEach((value) => {
            const li = document.createElement("li");
            li.textContent = String(value);
            container.appendChild(li);
          });
        }

        function renderTraitRows(rows) {
          traitRows.textContent = "";
          const sortedRows = Array.isArray(rows)
            ? rows.slice().sort((a, b) => String(a?.trait_code || "").localeCompare(String(b?.trait_code || "")))
            : [];
          if (!sortedRows.length) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.setAttribute("colspan", "5");
            td.textContent = "none";
            tr.appendChild(td);
            traitRows.appendChild(tr);
            return;
          }

          sortedRows.forEach((row) => {
            const tr = document.createElement("tr");
            [row?.trait_code, row?.current_score, row?.change_score, row?.confidence_score, row?.trend_direction].forEach((value) => {
              const td = document.createElement("td");
              td.textContent = String(value ?? "");
              tr.appendChild(td);
            });
            traitRows.appendChild(tr);
          });
        }

        function renderTraitSummary(rows) {
          const normalized = Array.isArray(rows) ? rows.slice() : [];
          traitSummaryCount.textContent = String(normalized.length);
          if (!normalized.length) {
            traitSummaryTop.textContent = "-";
            traitSummaryLowConfidence.textContent = "0";
            return;
          }

          const sortedByScore = normalized
            .filter((row) => typeof row?.current_score === "number")
            .sort((a, b) => b.current_score - a.current_score);
          const top = sortedByScore[0];
          traitSummaryTop.textContent = top
            ? String(top.trait_code) + " (" + String(top.current_score) + ")"
            : "-";
          const lowConfidenceCount = normalized.filter((row) => Number(row?.confidence_score) < 60).length;
          traitSummaryLowConfidence.textContent = String(lowConfidenceCount);
        }

        function renderSummaries(payload) {
          const dashboard = payload?.dashboard || {};
          const pageModel = payload?.page_model || {};

          const dashboardView = {
            high_priority_traits: dashboard.high_priority_traits || [],
            strengths_count: Array.isArray(dashboard.strengths) ? dashboard.strengths.length : 0,
            support_count: Array.isArray(dashboard.support_next) ? dashboard.support_next.length : 0,
            low_confidence_flags: dashboard.low_confidence_flags || [],
          };
          dashboardSummary.textContent = JSON.stringify(dashboardView, null, 2);

          const pageModelView = {
            page_title: pageModel.page_title || null,
            page_subtitle: pageModel.page_subtitle || null,
            section_order: pageModel.rendering_safety?.section_order || [],
            support_items: pageModel.support?.items || [],
          };
          pageModelSummary.textContent = JSON.stringify(pageModelView, null, 2);
        }

        async function runTest() {
          if (!permissionAccepted) {
            statusText.textContent = "permission required";
            statusText.className = "status-bad";
            statusNote.textContent = "Accept permission before starting the test.";
            if (consentStatus) consentStatus.textContent = "Permission is required before starting tests.";
            return;
          }
          statusText.textContent = "running...";
          statusText.className = "";
          statusNote.textContent = "Submitting to intake endpoint...";
          let payload = null;
          try {
            payload = JSON.parse(payloadEditor.value);
          } catch (err) {
            statusText.textContent = "invalid JSON in payload editor";
            statusText.className = "status-bad";
            statusNote.textContent = "Fix JSON before running.";
            resetList(validationErrors, [String(err && err.message ? err.message : err)]);
            return;
          }

          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const responseText = await response.text();
          let data = null;
          try {
            data = JSON.parse(responseText);
          } catch (_) {
            data = { parse_error: "Response was not valid JSON", raw: responseText };
          }

          statusText.textContent = String(response.status);
          statusText.className = response.ok ? "status-ok" : "status-bad";
          statusNote.textContent = response.ok
            ? "Request succeeded."
            : "Request failed. Check errors/warnings below.";
          modeText.textContent = String(data?.mode || "-");
          signalCountText.textContent = String(data?.processed_signal_count ?? "-");
          resetList(validationErrors, data?.validation_errors || []);
          resetList(warningsList, data?.warnings || []);
          renderTraitRows(data?.aggregated_trait_rows || []);
          renderTraitSummary(data?.aggregated_trait_rows || []);
          renderSummaries(data || {});
          rawJson.textContent = JSON.stringify(data, null, 2);
        }

        function setPayload(value) {
          payloadEditor.value = JSON.stringify(value, null, 2);
        }

        setTestingEnabled(false);
        consentAcceptButton.addEventListener("click", () => {
          if (!consentCheck.checked) {
            consentStatus.textContent = "Please accept permission to continue.";
            return;
          }
          setTestingEnabled(true);
          consentStatus.textContent = "Permission accepted. You can now run tests.";
        });
        consentDeclineButton.addEventListener("click", () => {
          consentCheck.checked = false;
          setTestingEnabled(false);
          consentStatus.textContent = "Permission declined. Testing remains locked.";
        });

        presetStrongButton.addEventListener("click", () => setPayload(presetPayloads.strong));
        presetSupportButton.addEventListener("click", () => setPayload(presetPayloads.support));
        presetLowConfidenceButton.addEventListener("click", () => setPayload(presetPayloads.lowConfidence));
        resetPayloadButton.addEventListener("click", () => setPayload(knownGoodPayload));

        runBtn.addEventListener("click", () => {
          runTest().catch((err) => {
            statusText.textContent = "request failed";
            statusText.className = "status-bad";
            statusNote.textContent = "Network/request failure before JSON response.";
            resetList(validationErrors, [String(err && err.message ? err.message : err)]);
          });
        });
      }());
    </script>
  </body>
</html>`;
}

function renderLiveYouthAssessmentPage() {
  const answerScale = JSON.stringify(YOUTH_ANSWER_SCALE);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Youth Talent Development Intake — Parent Observation Screener v1</title>
    <style>
      :root { --bg: #f8fafc; --card: #ffffff; --line: #cbd5e1; --text: #0f172a; --muted: #475569; --brand: #0f766e; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 24px; }
      main { max-width: 760px; margin: 0 auto; display: grid; gap: 14px; }
      section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
      .tag { font-size: 12px; color: #115e59; background: #ccfbf1; border-radius: 999px; padding: 4px 8px; display: inline-block; margin-bottom: 8px; }
      .muted { color: var(--muted); }
      .options { display: grid; gap: 8px; margin-top: 12px; }
      button.answer { text-align: left; border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: #f8fafc; cursor: pointer; }
      button.answer:hover { border-color: var(--brand); }
      .row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
      .controls { display: flex; gap: 8px; flex-wrap: wrap; }
      .controls button { border: 1px solid #0f766e; background: #f0fdfa; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
      .result-card { border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: #f8fafc; }
      .pill { display: inline-block; border: 1px solid #99f6e4; background: #ecfeff; border-radius: 999px; padding: 3px 8px; margin: 3px 4px 3px 0; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <p class="tag">First live bank • Parent observation • Provisional trait signals only</p>
        <h1>Youth Talent Development Intake — Parent Observation Screener v1</h1>
        <p>${YOUTH_PARENT_INSTRUCTIONS}</p>
        <p class="muted">This screener is evidence-informed and designed for developmental support. It is not a validated diagnostic tool and does not predict future success.</p>
        <div class="options" style="margin-top:12px;">
          <label>Child name (recommended for child-scoped loading)<br /><input id="childNameInput" type="text" placeholder="e.g. Maya" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;" /></label>
          <label>Child age band (optional)<br /><input id="childAgeBandInput" type="text" placeholder="e.g. 8-10" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;" /></label>
          <label>Child grade band (optional)<br /><input id="childGradeBandInput" type="text" placeholder="e.g. Grade 3-4" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;" /></label>
        </div>
      </section>
      <section>
        <div class="row"><strong id="progressLabel">Question 1 of 25</strong><span id="completionLabel" class="muted">0% complete</span></div>
        <h2 id="prompt">Loading assessment…</h2>
        <div id="options" class="options"></div>
        <p id="intakeStatus" class="muted" aria-live="polite">Answer the intake questions, then submit.</p>
        <div class="controls">
          <button id="prevBtn" type="button">Previous</button>
          <button id="nextBtn" type="button">Next</button>
          <button id="submitBtn" type="button">Submit assessment</button>
        </div>
      </section>
      <section>
        <h2>Assessment submitted</h2>
        <div id="resultCard" class="result-card">
          <p class="muted">Complete the intake and submit to generate a parent-facing dashboard.</p>
        </div>
        <div class="controls" style="margin-top:10px;">
          <a id="openLiveDashboardBtn" href="/youth-development/parent-dashboard" style="display:none;border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:999px;padding:8px 12px;text-decoration:none;">Open Youth Parent Dashboard</a>
        </div>
      </section>
    </main>
    <script>
      (async function () {
        const answerScale = ${answerScale};
        const progressLabel = document.getElementById("progressLabel");
        const completionLabel = document.getElementById("completionLabel");
        const promptEl = document.getElementById("prompt");
        const optionsEl = document.getElementById("options");
        const intakeStatus = document.getElementById("intakeStatus");
        const resultCard = document.getElementById("resultCard");
        const openLiveDashboardBtn = document.getElementById("openLiveDashboardBtn");
        const state = { questions: [], index: 0, answers: {} };
        const query = new URLSearchParams(window.location.search);
        const accountCtx = {
          tenant: (query.get("tenant") || "").trim(),
          email: (query.get("email") || "").trim().toLowerCase(),
          name: (query.get("name") || "").trim(),
          cid: (query.get("cid") || "").trim(),
          crid: (query.get("crid") || query.get("rid") || "").trim(),
        };
        if (accountCtx.tenant || accountCtx.email) {
          const dashUrl = new URL("/youth-development/parent-dashboard", window.location.origin);
          Object.entries(accountCtx).forEach(([key, value]) => { if (value) dashUrl.searchParams.set(key, value); });
          openLiveDashboardBtn.href = dashUrl.pathname + dashUrl.search;
        }

        const questionResponse = await fetch("/api/youth-development/questions");
        const questionPayload = await questionResponse.json();
        state.questions = Array.isArray(questionPayload.questions) ? questionPayload.questions : [];

        function renderQuestion() {
          const current = state.questions[state.index];
          if (!current) return;
          progressLabel.textContent = "Question " + (state.index + 1) + " of " + state.questions.length;
          completionLabel.textContent = Math.round((Object.keys(state.answers).length / state.questions.length) * 100) + "% complete";
          promptEl.textContent = current.prompt;
          optionsEl.textContent = "";
          answerScale.forEach((option) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "answer";
            const selected = Number(state.answers[current.id]) === option.value;
            button.innerHTML = "<strong>" + option.value + ". " + option.label + "</strong>" + (selected ? " ✅" : "");
            button.addEventListener("click", () => {
              state.answers[current.id] = option.value;
              renderQuestion();
            });
            optionsEl.appendChild(button);
          });
        }

        document.getElementById("prevBtn").addEventListener("click", () => {
          state.index = Math.max(0, state.index - 1);
          renderQuestion();
        });
        document.getElementById("nextBtn").addEventListener("click", () => {
          state.index = Math.min(state.questions.length - 1, state.index + 1);
          renderQuestion();
        });
        document.getElementById("submitBtn").addEventListener("click", async () => {
          const answeredCount = Object.keys(state.answers).length;
          if (!answeredCount) {
            intakeStatus.textContent = "Please answer the intake questions before submitting.";
            resultCard.innerHTML = "<p><strong>Assessment not submitted.</strong></p><p class=\\"muted\\">Please answer the intake questions before submitting.</p>";
            openLiveDashboardBtn.style.display = "none";
            return;
          }
          intakeStatus.textContent = "Submitting assessment...";
          const response = await fetch("/api/youth-development/assess", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              answers: state.answers,
              tenant: accountCtx.tenant || undefined,
              email: accountCtx.email || undefined,
              name: accountCtx.name || undefined,
              cid: accountCtx.cid || undefined,
              crid: accountCtx.crid || undefined,
              child_name: (document.getElementById("childNameInput") || {}).value || undefined,
              child_age_band: (document.getElementById("childAgeBandInput") || {}).value || undefined,
              child_grade_band: (document.getElementById("childGradeBandInput") || {}).value || undefined,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            resultCard.innerHTML = "<p><strong>We could not submit this assessment.</strong></p><p class=\\"muted\\">" + String(payload.error || "Request failed") + "</p>";
            intakeStatus.textContent = String(payload.error || "Request failed");
            openLiveDashboardBtn.style.display = "none";
            return;
          }
          try {
            sessionStorage.setItem("youthDevelopmentLatestAssessment", JSON.stringify(payload));
          } catch (_err) {}
          const priorities = (payload.interpretation && payload.interpretation.priority_traits) || [];
          const highest = payload.interpretation && payload.interpretation.highest_trait;
          const completion = payload.completion && payload.completion.completion_rate_percent;
          resultCard.innerHTML = [
            "<p><strong>Assessment complete.</strong> Your responses are now available in the live parent dashboard.</p>",
            payload.ownership && payload.ownership.account_bound
              ? "<p><strong>Saved to account:</strong> " + payload.ownership.email + "</p>"
              : "",
            payload.ownership && payload.ownership.child_profile && payload.ownership.child_profile.child_id
              ? "<p><strong>Child scope:</strong> " + (payload.ownership.child_profile.child_name || "Child") + " (" + payload.ownership.child_profile.child_id + ")</p>"
              : "<p class=\\"muted\\">Child identity is incomplete. Add child name to create a dedicated child scope.</p>",
            highest ? "<p><strong>Top current signal:</strong> " + highest.trait_name + " (" + Number(highest.current_score || 0).toFixed(1) + ")</p>" : "",
            "<p><strong>Completion:</strong> " + Number(completion || 0).toFixed(0) + "%</p>",
            priorities.length ? "<div>" + priorities.map((item) => "<span class=\\"pill\\">" + item.trait_name + " · " + Number(item.current_score || 0).toFixed(1) + "</span>").join("") + "</div>" : ""
          ].join("");
          intakeStatus.textContent = "Submitted " + payload.answers_count + " of " + payload.question_count + " answers.";
          openLiveDashboardBtn.style.display = "";
        });

        async function hydrateExistingAccountResult() {
          if (!accountCtx.tenant || !accountCtx.email) return;
          const endpoint = new URL("/api/youth-development/parent-dashboard/latest", window.location.origin);
          endpoint.searchParams.set("tenant", accountCtx.tenant);
          endpoint.searchParams.set("email", accountCtx.email);
          const response = await fetch(endpoint.pathname + endpoint.search);
          if (!response.ok) return;
          const latest = await response.json().catch(() => null);
          if (!latest || latest.ok !== true || latest.has_result !== true) return;
          resultCard.innerHTML = [
            "<p><strong>Existing saved youth assessment found.</strong></p>",
            "<p class=\\"muted\\">This signed-in account already has a saved result. You can reopen the parent dashboard now or retake the intake to refresh signals.</p>",
            "<p><strong>Saved account:</strong> " + accountCtx.email + "</p>"
          ].join("");
          openLiveDashboardBtn.style.display = "";
          openLiveDashboardBtn.textContent = "Resume / View Youth Results";
        }

        renderQuestion();
        hydrateExistingAccountResult().catch(() => null);
      }());
    </script>
  </body>
</html>`;
}

function renderLiveYouthParentDashboardPage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Youth Development Parent Dashboard</title>
    <style>
      :root {
        --bg: #020617;
        --panel: linear-gradient(145deg, rgba(15, 23, 42, 0.88), rgba(30, 41, 59, 0.78));
        --line: rgba(148, 163, 184, 0.30);
        --text: #e2e8f0;
        --muted: #94a3b8;
        --accent: #22d3ee;
        --accent-2: #6366f1;
        --good: #34d399;
        --watch: #f59e0b;
        --grow: #fb7185;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 10% -10%, rgba(34, 211, 238, 0.15), transparent 38%),
          radial-gradient(circle at 90% 0%, rgba(99, 102, 241, 0.2), transparent 42%),
          var(--bg);
        padding: 16px;
      }
      main { max-width: 980px; margin: 0 auto; display: grid; gap: 14px; }
      .panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 16px;
        backdrop-filter: blur(10px);
        padding: 14px;
      }
      .hero-title { margin: 0 0 8px; font-size: clamp(1.2rem, 2.6vw, 1.8rem); }
      .muted { color: var(--muted); }
      .tiny { font-size: 12px; color: var(--muted); }
      .chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 12px;
        margin-right: 6px;
        margin-bottom: 6px;
      }
      .grid { display: grid; gap: 10px; }
      .category-strip { grid-template-columns: repeat(auto-fit, minmax(165px, 1fr)); }
      .category-pill {
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(15, 23, 42, 0.65);
        padding: 10px;
      }
      .category-pill h3 { margin: 0 0 6px; font-size: 14px; line-height: 1.25; }
      .tech-tag { color: var(--muted); font-size: 11px; margin: 0; }
      .help-btn {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        border: 1px solid rgba(125, 211, 252, 0.5);
        background: rgba(14, 116, 144, 0.25);
        color: #cffafe;
        font-weight: 700;
        cursor: pointer;
      }
      .pill-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
      .cards { grid-template-columns: repeat(auto-fit, minmax(245px, 1fr)); }
      .snapshot-card {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(2, 6, 23, 0.56);
        padding: 12px;
        display: grid;
        gap: 8px;
      }
      .meter {
        height: 8px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.25);
        overflow: hidden;
      }
      .meter > span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #38bdf8, #818cf8, #34d399);
      }
      .status-badge {
        display: inline-block;
        border-radius: 999px;
        border: 1px solid var(--line);
        padding: 3px 8px;
        font-size: 11px;
      }
      .status-strong { border-color: rgba(52, 211, 153, 0.6); color: #a7f3d0; }
      .status-watch { border-color: rgba(245, 158, 11, 0.7); color: #fde68a; }
      .status-grow { border-color: rgba(251, 113, 133, 0.7); color: #fecdd3; }
      .list { margin: 0; padding-left: 18px; display: grid; gap: 8px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .btn {
        border: 1px solid transparent;
        border-radius: 999px;
        text-decoration: none;
        padding: 8px 12px;
        font-size: 14px;
      }
      .btn-primary { background: #0891b2; color: #ecfeff; border-color: rgba(6, 182, 212, 0.55); }
      .btn-secondary { background: rgba(30, 64, 175, 0.35); color: #dbeafe; border-color: rgba(96, 165, 250, 0.5); }
      .btn-ghost { background: transparent; color: #bae6fd; border-color: rgba(56, 189, 248, 0.45); }
      dialog {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: #0f172a;
        color: var(--text);
        max-width: 480px;
      }
      dialog::backdrop { background: rgba(2, 6, 23, 0.7); }
      @media (max-width: 640px) {
        body { padding: 12px; }
        .panel { padding: 12px; }
        .cards { grid-template-columns: 1fr; }
        .category-strip { grid-template-columns: 1fr 1fr; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <h1 id="heroTitle" class="hero-title">Youth Development Parent Dashboard</h1>
        <p id="heroSummary">Complete a youth assessment to see what your child currently shows and what helps next.</p>
        <p class="tiny">Designed for ages 6–11. Developmental snapshot only: this dashboard is provisional and should be reviewed as patterns over time.</p>
        <p class="tiny" id="completionDateLabel">Previous completion date: Not available yet.</p>
      </section>

      <section class="panel">
        <h2>What we look at</h2>
        <p class="muted">Seven developmental categories are shown below. Tap <strong>?</strong> for plain-language definitions.</p>
        <div id="categoryStrip" class="grid category-strip"></div>
      </section>

      <section class="panel">
        <h2>Snapshot cards</h2>
        <div id="snapshotCards" class="grid cards"></div>
      </section>

      <section class="panel">
        <h2>Top strengths</h2>
        <ul id="topStrengths" class="list"><li class="muted">Complete an assessment to view strengths.</li></ul>
      </section>

      <section class="panel">
        <h2>Areas to strengthen</h2>
        <ul id="areasToStrengthen" class="list"><li class="muted">Complete an assessment to view growth areas.</li></ul>
      </section>

      <section class="panel">
        <h2>How to support this week</h2>
        <ul id="weeklySupport" class="list"><li class="muted">Complete an assessment to unlock support suggestions.</li></ul>
      </section>

      <section class="panel">
        <h2>Actions</h2>
        <div class="actions">
          <a class="btn btn-primary" id="viewSavedDashboardBtn" href="/youth-development/parent-dashboard">View Saved Dashboard</a>
          <a class="btn btn-secondary" id="retakeAssessmentBtn" href="/youth-development/intake">Retake Assessment</a>
          <a class="btn btn-ghost" id="openIntakeBtn" href="/youth-development/intake">Take Youth Assessment</a>
        </div>
      </section>
    </main>

    <dialog id="categoryHelpDialog">
      <h3 id="helpTitle" style="margin:0 0 8px;"></h3>
      <p id="helpBody" style="margin:0 0 12px;"></p>
      <button class="btn btn-primary" id="closeHelpBtn" type="button">Close</button>
    </dialog>

    <script>
      (function () {
        let payload = null;
        const query = new URLSearchParams(window.location.search);
        const accountCtx = {
          tenant: (query.get("tenant") || "").trim(),
          email: (query.get("email") || "").trim().toLowerCase(),
        };

        const CATEGORY_META = {
          SR: {
            icon: "🎯",
            parentLabel: "Focus & Self-Control",
            technicalLabel: "Self-Regulation",
            helpText: "This category looks at how your child manages attention, follows through, and handles the structure of a task.",
          },
          CQ: {
            icon: "🔍",
            parentLabel: "Curiosity & Love of Learning",
            technicalLabel: "Curiosity / Exploratory Drive",
            helpText: "This category looks at how strongly your child is drawn to explore, question, and discover.",
          },
          CR: {
            icon: "💡",
            parentLabel: "Creativity & Idea Thinking",
            technicalLabel: "Creativity / Problem Finding",
            helpText: "This category looks at how your child generates ideas, experiments, and thinks beyond the first answer.",
          },
          RS: {
            icon: "🧩",
            parentLabel: "Thinking & Problem Solving",
            technicalLabel: "Reasoning / Pattern Recognition",
            helpText: "This category looks at how your child understands patterns, logic, and how ideas connect.",
          },
          PS: {
            icon: "🧗",
            parentLabel: "Effort & Resilience",
            technicalLabel: "Persistence / Challenge Tolerance",
            helpText: "This category looks at how your child handles difficulty, frustration, and productive struggle.",
          },
          FB: {
            icon: "🛠️",
            parentLabel: "Learning From Feedback",
            technicalLabel: "Feedback Responsiveness",
            helpText: "This category looks at how your child responds when shown what to improve and whether that leads to growth.",
          },
          DE: {
            icon: "🌟",
            parentLabel: "Interests & Passion Areas",
            technicalLabel: "Domain Engagement",
            helpText: "This category looks at the areas your child is naturally drawn toward and grows in with repeated interest.",
          },
        };

        const categoryOrder = ["SR", "CQ", "CR", "RS", "PS", "FB", "DE"];

        function esc(value) {
          return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
        }

        function asPercent(value) {
          const n = Number(value);
          if (!Number.isFinite(n)) return 0;
          return Math.max(0, Math.min(100, Math.round(n)));
        }

        function formatDate(value) {
          if (!value) return "Not available yet";
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) return "Not available yet";
          return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
        }

        function getMeta(code) {
          return CATEGORY_META[String(code || "").toUpperCase()] || {
            icon: "✨",
            parentLabel: String(code || "Category"),
            technicalLabel: String(code || ""),
            helpText: "This category shows a developmental pattern from current parent observations.",
          };
        }

        function statusTone(score) {
          if (score >= 70) return { klass: "status-strong", label: "Current strength" };
          if (score <= 40) return { klass: "status-grow", label: "Growth area" };
          return { klass: "status-watch", label: "Building" };
        }

        function openHelp(code) {
          const meta = getMeta(code);
          const dialog = document.getElementById("categoryHelpDialog");
          document.getElementById("helpTitle").textContent = meta.parentLabel;
          document.getElementById("helpBody").textContent = meta.helpText;
          if (dialog.showModal) dialog.showModal();
        }

        function normalizeCards(data) {
          const cards = (((data || {}).page_model || {}).trait_cards || {}).cards;
          return Array.isArray(cards) ? cards : [];
        }

        function cardByCode(cards) {
          const map = {};
          cards.forEach((card) => {
            const key = String(card.trait_code || "").toUpperCase();
            if (key) map[key] = card;
          });
          return map;
        }

        function renderCategoryStrip(cardsMap) {
          const host = document.getElementById("categoryStrip");
          host.innerHTML = categoryOrder.map((code) => {
            const meta = getMeta(code);
            const score = asPercent(cardsMap[code] && cardsMap[code].current_score);
            return [
              '<article class="category-pill">',
                '<div class="pill-head">',
                  '<div>',
                    '<h3>' + esc(meta.icon + ' ' + meta.parentLabel) + '</h3>',
                    '<p class="tech-tag">' + esc(meta.technicalLabel) + '</p>',
                  '</div>',
                  '<button class="help-btn" data-help-code="' + esc(code) + '" aria-label="Explain ' + esc(meta.parentLabel) + '">?</button>',
                '</div>',
                '<div class="chip">Score: ' + score + '%</div>',
              '</article>'
            ].join('');
          }).join('');
        }

        function renderSnapshotCards(cardsMap) {
          const host = document.getElementById("snapshotCards");
          host.innerHTML = categoryOrder.map((code) => {
            const meta = getMeta(code);
            const card = cardsMap[code] || {};
            const score = asPercent(card.current_score);
            const tone = statusTone(score);
            const oneLine = card.what_this_means || "More observations will make this snapshot more specific.";
            const whatItLooksLike = card.behavior_look_fors || "Look for this across home, schoolwork, and transitions.";
            const whyItMatters = card.why_it_matters || "This pattern can affect confidence, consistency, and learning momentum.";
            const whatHelpsNext = card.progress_look_fors || card.emotional_context || "Keep routines predictable and practice in short repeatable blocks.";
            return [
              '<article class="snapshot-card">',
                '<div class="pill-head">',
                  '<div>',
                    '<h3 style="margin:0 0 4px;">' + esc(meta.parentLabel) + '</h3>',
                    '<p class="tech-tag" style="margin:0;">' + esc(meta.technicalLabel) + '</p>',
                  '</div>',
                  '<button class="help-btn" data-help-code="' + esc(code) + '" aria-label="Explain ' + esc(meta.parentLabel) + '">?</button>',
                '</div>',
                '<div><span class="status-badge ' + tone.klass + '">' + esc(tone.label) + '</span> <span class="tiny">Score: ' + score + '%</span></div>',
                '<div class="meter" aria-label="' + esc(meta.parentLabel) + ' score meter"><span style="width:' + score + '%"></span></div>',
                '<p><strong>What your child currently shows:</strong> ' + esc(oneLine) + '</p>',
                '<p><strong>What this means:</strong> ' + esc(card.what_this_means || oneLine) + '</p>',
                '<p><strong>What it looks like:</strong> ' + esc(whatItLooksLike) + '</p>',
                '<p><strong>Why it matters:</strong> ' + esc(whyItMatters) + '</p>',
                '<p><strong>What helps next:</strong> ' + esc(whatHelpsNext) + '</p>',
              '</article>'
            ].join('');
          }).join('');
        }

        function renderStrengths(data) {
          const host = document.getElementById("topStrengths");
          const strengths = (((data || {}).page_model || {}).strengths || {}).items || [];
          const items = strengths.slice(0, 3);
          host.innerHTML = items.length
            ? items.map((item) => {
                const meta = getMeta(item.trait_code);
                return '<li><strong>' + esc(meta.parentLabel) + ':</strong> ' + esc(item.keep_doing_copy || "Keep giving practice opportunities in this area.") + ' <span class="tiny">What to keep doing: ' + esc(item.actionable_next_step || "Keep a predictable routine and gently raise challenge.") + '</span></li>';
              }).join("")
            : '<li class="muted">No strengths are available yet.</li>';
        }

        function renderSupport(data) {
          const host = document.getElementById("areasToStrengthen");
          const support = (((data || {}).page_model || {}).support || {}).items || [];
          const items = support.slice(0, 3);
          host.innerHTML = items.length
            ? items.map((item) => {
                const meta = getMeta(item.trait_code);
                return '<li><strong>' + esc(meta.parentLabel) + ':</strong> ' + esc(item.support_next_copy || "Choose one small skill practice this week.") + '<br><span class="tiny"><strong>What helps next:</strong> ' + esc(item.actionable_next_step || "Repeat one scaffolded task 2-3 times this week.") + '</span><br><span class="tiny"><strong>Progress can look like:</strong> ' + esc(item.progress_signal || "Fewer prompts and more independent attempts.") + '</span></li>';
              }).join("")
            : '<li class="muted">No areas to strengthen are currently flagged.</li>';
        }

        function renderWeeklySupport(data) {
          const host = document.getElementById("weeklySupport");
          const strengths = (((data || {}).page_model || {}).strengths || {}).items || [];
          const support = (((data || {}).page_model || {}).support || {}).items || [];
          const cards = normalizeCards(data).sort((a, b) => asPercent(b.current_score) - asPercent(a.current_score));
          const topStrength = strengths[0] || cards[0] || null;
          const topGrowth = support[0] || cards[cards.length - 1] || null;
          const suggestions = [];

          suggestions.push(topStrength
            ? '<li><strong>Strength-based:</strong> Keep using ' + esc(getMeta(topStrength.trait_code).parentLabel) + ' in everyday tasks. Ask your child to explain what worked so they can repeat it.</li>'
            : '<li><strong>Strength-based:</strong> Notice one thing your child did well this week and name the exact action so they can repeat it.</li>');

          suggestions.push(topGrowth
            ? '<li><strong>Growth-based:</strong> Pick one short practice activity for ' + esc(getMeta(topGrowth.trait_code).parentLabel) + ' and repeat it 2–3 times this week with calm coaching.</li>'
            : '<li><strong>Growth-based:</strong> Pick one small challenge task and practice it in short, low-pressure rounds.</li>');

          suggestions.push('<li><strong>Environment-based:</strong> Create a predictable routine (same time, same place, short duration) so progress is easier to see across the week.</li>');

          host.innerHTML = suggestions.join('');
        }

        function bindHelpButtons() {
          Array.from(document.querySelectorAll('[data-help-code]')).forEach((button) => {
            button.addEventListener('click', function () {
              openHelp(button.getAttribute('data-help-code'));
            });
          });
        }

        function applyPayload(data, opts) {
          if (!data || !data.page_model) return false;
          const options = opts || {};
          payload = data;
          const cardsMap = cardByCode(normalizeCards(data));
          const strongest = (((data.page_model || {}).strengths || {}).items || [])[0];
          const supportArea = (((data.page_model || {}).support || {}).items || [])[0];
          const summary = [
            strongest ? ('Your child currently shows strongest momentum in ' + getMeta(strongest.trait_code).parentLabel + '.') : 'Your child is building developmental patterns across the seven categories.',
            supportArea ? ('A next growth focus is ' + getMeta(supportArea.trait_code).parentLabel + '.') : 'No urgent growth flag is present today.',
            'This is a developmental snapshot for ages 6–11 and will get stronger with repeated observations.'
          ].join(' ');

          document.getElementById('heroTitle').textContent = data.page_model.page_title || 'Youth Development Parent Dashboard';
          document.getElementById('heroSummary').textContent = summary;
          document.getElementById('completionDateLabel').textContent = 'Previous completion date: ' + formatDate(options.savedAt || data.saved_at || data.generated_at || (((data.result || {}).overview || {}).generated_at));

          renderCategoryStrip(cardsMap);
          renderSnapshotCards(cardsMap);
          renderStrengths(data);
          renderSupport(data);
          renderWeeklySupport(data);
          bindHelpButtons();
          return true;
        }

        async function hydrateFromAccount() {
          if (!accountCtx.tenant || !accountCtx.email) return false;
          const requestedChildId = (query.get('child_id') || query.get('childId') || '').trim();
          const childrenEndpoint = new URL('/api/youth-development/children', window.location.origin);
          childrenEndpoint.searchParams.set('tenant', accountCtx.tenant);
          childrenEndpoint.searchParams.set('email', accountCtx.email);
          const childrenResponse = await fetch(childrenEndpoint.pathname + childrenEndpoint.search);
          const childrenPayload = childrenResponse.ok ? await childrenResponse.json().catch(() => null) : null;
          const childProfiles = Array.isArray(childrenPayload && childrenPayload.children) ? childrenPayload.children : [];
          if (!childProfiles.length) {
            document.getElementById('heroSummary').textContent = 'No child profile is linked to this account yet. Complete intake with child name to create child scope.';
            document.getElementById('weeklySupport').innerHTML = '<li class="muted">Child profile setup needed before child-scoped TDE loading is available.</li>';
            return false;
          }
          const scopedChild = requestedChildId
            ? childProfiles.find((entry) => String(entry.child_id || '') === requestedChildId)
            : (childProfiles.length === 1 ? childProfiles[0] : null);
          if (!scopedChild && childProfiles.length > 1) {
            document.getElementById('heroSummary').textContent = 'Multiple child profiles found. Select a child scope to continue.';
            document.getElementById('weeklySupport').innerHTML = childProfiles.map((entry) => {
              const dash = new URL('/youth-development/parent-dashboard', window.location.origin);
              dash.searchParams.set('tenant', accountCtx.tenant);
              dash.searchParams.set('email', accountCtx.email);
              dash.searchParams.set('child_id', String(entry.child_id || ''));
              return '<li><a href="' + esc(dash.pathname + dash.search) + '">' + esc(entry.child_name || entry.child_id || 'Child profile') + '</a></li>';
            }).join('');
            return false;
          }
          const endpoint = new URL('/api/youth-development/parent-dashboard/latest', window.location.origin);
          endpoint.searchParams.set('tenant', accountCtx.tenant);
          endpoint.searchParams.set('email', accountCtx.email);
          if (scopedChild && scopedChild.child_id) endpoint.searchParams.set('child_id', String(scopedChild.child_id));
          const response = await fetch(endpoint.pathname + endpoint.search);
          if (!response.ok) return false;
          const data = await response.json().catch(() => null);
          if (!data || !data.ok || !data.has_result || !data.payload) return false;
          return applyPayload(data.payload, { savedAt: data.saved_at || data.payload.saved_at || '' });
        }

        document.getElementById('closeHelpBtn').addEventListener('click', function () {
          const dialog = document.getElementById('categoryHelpDialog');
          if (dialog && dialog.close) dialog.close();
        });

        try {
          payload = JSON.parse(sessionStorage.getItem('youthDevelopmentLatestAssessment') || 'null');
        } catch (_err) {
          payload = null;
        }

        if (payload && applyPayload(payload, { savedAt: payload?.ownership?.saved_at || payload?.saved_at })) return;
        hydrateFromAccount().catch(() => null);
      }());
    </script>
  </body>
</html>`;
}

function buildDeterministicNarrative(interpretation = {}) {
  if (interpretation?.incomplete) {
    return {
      opening: "More responses are needed before trait interpretation can be shown.",
      focus_area: "Please complete additional questions so the screener has enough current evidence.",
      next_step: interpretation.message,
    };
  }

  const highest = interpretation.highest_trait;
  const lowest = interpretation.lowest_trait;
  const conflict = interpretation.conflict;

  const opening = highest
    ? `Your child currently shows the strongest pattern in ${highest.trait_name} (${Number(highest.current_score || 0).toFixed(1)}).`
    : "Trait strengths will populate after all intake answers are submitted.";
  const focusArea = lowest
    ? `A practical support focus is ${lowest.trait_name} (${Number(lowest.current_score || 0).toFixed(1)}), where structured repetition can improve consistency.`
    : "No immediate low trait signal is available yet.";
  const nextStep = conflict
    ? `Watch the ${conflict.conflict_key} gap: ${conflict.insight}`
    : "No major trait conflict is currently detected.";

  return { opening, focus_area: focusArea, next_step: nextStep };
}

function buildYouthAssessPayload(answerPairs, options = {}) {
  const scoring = runYouthIntakeScoring(answerPairs, {
    unansweredCount: options.unansweredCount,
    totalQuestions: YOUTH_QUESTION_BANK.length,
  });
  const result = buildYouthDevelopmentResult(scoring.trait_rows, {
    generatedAt: options.generatedAt || "2026-04-17T00:00:00.000Z",
    evidenceSummary: {
      sources_used: ["parent_observation"],
      confidence_caveats: [
        "Parent-observation intake only: all outputs are provisional developmental signals.",
        "This screener is evidence-informed and designed for validation, not a psychometrically validated instrument.",
      ],
    },
  });
  const dashboard = buildYouthDevelopmentDashboard(result, { maxItems: 5 });
  const pageModel = buildParentDashboardPageModel(dashboard, {
    page_title: "Youth Development Parent Dashboard",
    page_subtitle: "Assessment generated from deterministic parent intake responses.",
    maxItems: 5,
  });

  const insightNarrative = buildDeterministicNarrative(scoring.interpretation);
  const enrichedPageModel = {
    ...pageModel,
    insight_narrative: {
      ...pageModel.insight_narrative,
      ...insightNarrative,
    },
  };

  return {
    scoring,
    result,
    dashboard,
    page_model: enrichedPageModel,
    rendered_html: renderYouthDevelopmentParentDashboardPage(enrichedPageModel),
    trait_reports: scoring.trait_reports,
  };
}

function buildPreviewPayload() {
  const result = buildYouthDevelopmentResult(PREVIEW_AGGREGATED_ROWS, PREVIEW_OPTIONS);
  const dashboard = buildYouthDevelopmentDashboard(result, { maxItems: 5 });
  const pageModel = buildParentDashboardPageModel(dashboard, {
    page_title: "Youth Development Parent Dashboard (Preview)",
    page_subtitle: "Preview / test-only rendering from deterministic fixture data.",
    maxItems: 5,
  });

  return {
    fixture_aggregated_rows: PREVIEW_AGGREGATED_ROWS,
    result,
    dashboard,
    page_model: pageModel,
  };
}

function createYouthDevelopmentRouter(options = {}) {
  const router = express.Router();
  const persistYouthAssessment = typeof options.persistYouthAssessment === "function" ? options.persistYouthAssessment : null;
  const loadLatestYouthAssessment = typeof options.loadLatestYouthAssessment === "function" ? options.loadLatestYouthAssessment : null;
  const listYouthChildProfiles = typeof options.listYouthChildProfiles === "function" ? options.listYouthChildProfiles : null;

  router.get("/youth-development/intake", (req, res) => (
    res.status(200).type("html").send(renderLiveYouthAssessmentPage())
  ));

  router.get("/youth-development/intake/test", (req, res) => (
    res.status(200).type("html").send(renderYouthDevelopmentIntakeTestPage())
  ));

  router.get("/youth-development/parent-dashboard", (req, res) => (
    res.status(200).type("html").send(renderLiveYouthParentDashboardPage())
  ));

  router.get("/youth-development/parent-dashboard/preview", (req, res) => {
    const payload = buildPreviewPayload();
    const html = renderYouthDevelopmentParentDashboardPage(payload.page_model, {
      previewLabel: "Preview / test-only output (deterministic fixture, no production data)",
    });
    return res.status(200).type("html").send(html);
  });

  router.get("/api/youth-development/questions", (req, res) => {
    const flow = getQuestionFlowState({ answers: {} });
    return res.status(200).json({
      ok: true,
      bank_id: "youth_talent_development_parent_observation_screener_v1",
      bank_name: "Youth Talent Development Intake — Parent Observation Screener v1",
      respondent: "parent_guardian",
      instructions: YOUTH_PARENT_INSTRUCTIONS,
      question_count: YOUTH_QUESTION_BANK.length,
      questions: YOUTH_QUESTION_BANK,
      flow,
    });
  });

  router.post("/api/youth-development/assess", async (req, res) => {
    const validation = validateAnswers(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        error: "invalid_youth_intake_answers",
        validation_errors: validation.errors,
      });
    }
    try {
      const payload = buildYouthAssessPayload(validation.answers, {
        unansweredCount: validation.unanswered_question_ids.length,
      });
      const accountCtx = resolveRequestAccountContext(req, req.body || {});
      const childProfile = {
        child_id: safeTrim(req.body?.child_id || req.body?.childId) || null,
        child_name: safeTrim(req.body?.child_name || req.body?.childName) || null,
        child_age_band: safeTrim(req.body?.child_age_band || req.body?.childAgeBand) || null,
        child_grade_band: safeTrim(req.body?.child_grade_band || req.body?.childGradeBand) || null,
      };
      let ownership = {
        account_bound: false,
        tenant: accountCtx.tenant || null,
        email: accountCtx.email || null,
        child_profile: childProfile,
      };
      if (persistYouthAssessment && accountCtx.tenant && accountCtx.email) {
        const saved = await persistYouthAssessment({
          accountCtx,
          request: req,
          requestBody: req.body || {},
          responsePayload: payload,
          validation,
          answers: validation.answers,
          unansweredQuestionIds: validation.unanswered_question_ids,
        });
        if (saved && typeof saved === "object") ownership = Object.assign(ownership, saved);
      }
      return res.status(200).json({
        ok: true,
        question_count: YOUTH_QUESTION_BANK.length,
        answers_count: validation.answers.length,
        unanswered_count: validation.unanswered_question_ids.length,
        flow: getQuestionFlowState(req.body || {}),
        interpretation: payload.scoring.interpretation,
        completion: payload.scoring.completion,
        aggregated_trait_rows: payload.scoring.trait_rows,
        trait_reports: payload.trait_reports,
        result: payload.result,
        dashboard: payload.dashboard,
        page_model: payload.page_model,
        rendered_html: payload.rendered_html,
        ownership,
      });
    } catch (err) {
      console.error("youth_assess_failed", err);
      return res.status(500).json({
        ok: false,
        error: "youth_assess_failed",
      });
    }
  });

  router.get("/api/youth-development/parent-dashboard/latest", async (req, res) => {
    if (!loadLatestYouthAssessment) {
      return res.status(200).json({ ok: true, has_result: false, payload: null, reason: "persistence_not_enabled" });
    }
    const accountCtx = resolveRequestAccountContext(req, req.query || {});
    if (!accountCtx.tenant || !accountCtx.email) {
      return res.status(400).json({ ok: false, error: "tenant and email are required" });
    }
    try {
      const childId = safeTrim(req.query?.child_id || req.query?.childId);
      const latest = await loadLatestYouthAssessment({ accountCtx, request: req, childId });
      if (!latest) {
        return res.status(200).json({ ok: true, has_result: false, payload: null, child_id: childId || null });
      }
      return res.status(200).json({ ok: true, has_result: true, payload: latest, child_id: childId || latest?.ownership?.child_profile?.child_id || null });
    } catch (err) {
      console.error("youth_latest_lookup_failed", err);
      return res.status(500).json({ ok: false, error: "youth_latest_lookup_failed" });
    }
  });

  router.get("/api/youth-development/children", async (req, res) => {
    if (!listYouthChildProfiles) {
      return res.status(200).json({ ok: true, has_children: false, children: [], reason: "persistence_not_enabled" });
    }
    const accountCtx = resolveRequestAccountContext(req, req.query || {});
    if (!accountCtx.tenant || !accountCtx.email) {
      return res.status(400).json({ ok: false, error: "tenant and email are required" });
    }
    try {
      const children = await listYouthChildProfiles({ accountCtx, request: req });
      return res.status(200).json({ ok: true, has_children: children.length > 0, children });
    } catch (err) {
      console.error("youth_children_lookup_failed", err);
      return res.status(500).json({ ok: false, error: "youth_children_lookup_failed" });
    }
  });

  router.get("/api/youth-development/parent-dashboard/preview", (req, res) => {
    const payload = buildPreviewPayload();
    return res.status(200).json({
      preview: true,
      test_only: true,
      notes: [
        "Deterministic fixture data only.",
        "No database access.",
        "No tenant writes.",
      ],
      ...payload,
    });
  });

  return router;
}

module.exports = {
  createYouthDevelopmentRouter,
  PREVIEW_AGGREGATED_ROWS,
  INTAKE_TEST_FIXTURE,
};
