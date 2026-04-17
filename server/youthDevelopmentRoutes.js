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
  const queryCtx = normalizeAccountContext(req.query || {});
  const bodyCtx = normalizeAccountContext(body || {});
  const headerCtx = normalizeAccountContext({
    tenant: req.headers["x-tenant-slug"],
    email: req.headers["x-user-email"],
    name: req.headers["x-user-name"],
  });
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
      </section>
      <section>
        <div class="row"><strong id="progressLabel">Question 1 of 25</strong><span id="completionLabel" class="muted">0% complete</span></div>
        <h2 id="prompt">Loading assessment…</h2>
        <div id="options" class="options"></div>
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
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            resultCard.innerHTML = "<p><strong>We could not submit this assessment.</strong></p><p class=\\"muted\\">" + String(payload.error || "Request failed") + "</p>";
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
            highest ? "<p><strong>Top current signal:</strong> " + highest.trait_name + " (" + Number(highest.current_score || 0).toFixed(1) + ")</p>" : "",
            "<p><strong>Completion:</strong> " + Number(completion || 0).toFixed(0) + "%</p>",
            priorities.length ? "<div>" + priorities.map((item) => "<span class=\\"pill\\">" + item.trait_name + " · " + Number(item.current_score || 0).toFixed(1) + "</span>").join("") + "</div>" : ""
          ].join("");
          openLiveDashboardBtn.style.display = "";
        });

        renderQuestion();
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
      :root { --bg: #f8fafc; --card: #ffffff; --line: #cbd5e1; --text: #0f172a; --muted: #475569; --brand: #0f766e; }
      body { font-family: Inter, system-ui, -apple-system, Segoe UI, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 24px; }
      main { max-width: 900px; margin: 0 auto; display: grid; gap: 14px; }
      section { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
      .muted { color: var(--muted); }
      .pill { display: inline-block; border: 1px solid #99f6e4; background: #ecfeff; border-radius: 999px; padding: 3px 8px; margin: 3px 4px 3px 0; font-size: 12px; }
      ul { margin: 8px 0 0 18px; }
      a.btn { border: 1px solid var(--brand); background: #0f766e; color: #fff; border-radius: 999px; padding: 8px 12px; text-decoration: none; display: inline-block; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1 id="title">Youth Development Parent Dashboard</h1>
        <p id="subtitle" class="muted">Live parent-facing assessment output.</p>
      </section>
      <section>
        <h2>Insight narrative</h2>
        <p id="narrativeOpening" class="muted">No assessment has been submitted yet.</p>
        <p id="narrativeFocus" class="muted"></p>
        <p id="narrativeNext" class="muted"></p>
      </section>
      <section>
        <h2>Priority traits</h2>
        <div id="priorities"><span class="muted">Complete an assessment to view trait signals.</span></div>
      </section>
      <section>
        <h2>Next-step prompts</h2>
        <ul id="prompts"><li class="muted">Complete an assessment to unlock tailored prompts.</li></ul>
      </section>
      <section>
        <a class="btn" href="/youth-development/intake">Take Youth Assessment</a>
      </section>
    </main>
    <script>
      (function () {
        let payload = null;
        const query = new URLSearchParams(window.location.search);
        const accountCtx = {
          tenant: (query.get("tenant") || "").trim(),
          email: (query.get("email") || "").trim().toLowerCase(),
        };

        function applyPayload(data) {
          if (!data || !data.page_model) return false;
          payload = data;
          const pageModel = payload.page_model;
          document.getElementById("title").textContent = pageModel.page_title || "Youth Development Parent Dashboard";
          document.getElementById("subtitle").textContent = pageModel.page_subtitle || "";

          const narrative = pageModel.insight_narrative || {};
          document.getElementById("narrativeOpening").textContent = narrative.opening || "";
          document.getElementById("narrativeFocus").textContent = narrative.focus_area || "";
          document.getElementById("narrativeNext").textContent = narrative.next_step || "";

          const priorities = (payload.interpretation && payload.interpretation.priority_traits) || [];
          document.getElementById("priorities").innerHTML = priorities.length
            ? priorities.map((item) => "<span class=\\"pill\\">" + item.trait_name + " · " + Number(item.current_score || 0).toFixed(1) + "</span>").join("")
            : "<span class=\\"muted\\">No priority traits were detected for this submission.</span>";

          const prompts = (pageModel.action && pageModel.action.next_step_prompts) || [];
          document.getElementById("prompts").innerHTML = prompts.length
            ? prompts.map((item) => "<li><strong>" + item.trait_code + ":</strong> " + item.prompt + "</li>").join("")
            : "<li class=\\"muted\\">No prompts are available for this submission.</li>";
          return true;
        }

        async function hydrateFromAccount() {
          if (!accountCtx.tenant || !accountCtx.email) return false;
          const endpoint = new URL("/api/youth-development/parent-dashboard/latest", window.location.origin);
          endpoint.searchParams.set("tenant", accountCtx.tenant);
          endpoint.searchParams.set("email", accountCtx.email);
          const response = await fetch(endpoint.pathname + endpoint.search);
          if (!response.ok) return false;
          const data = await response.json().catch(() => null);
          if (!data || !data.ok || !data.has_result || !data.payload) return false;
          document.getElementById("subtitle").textContent = "Loaded from your signed-in customer account.";
          return applyPayload(data.payload);
        }

        try {
          payload = JSON.parse(sessionStorage.getItem("youthDevelopmentLatestAssessment") || "null");
        } catch (_err) {
          payload = null;
        }
        if (applyPayload(payload)) return;
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
      let ownership = {
        account_bound: false,
        tenant: accountCtx.tenant || null,
        email: accountCtx.email || null,
      };
      if (persistYouthAssessment && accountCtx.tenant && accountCtx.email) {
        const saved = await persistYouthAssessment({
          accountCtx,
          request: req,
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
      const latest = await loadLatestYouthAssessment({ accountCtx, request: req });
      if (!latest) {
        return res.status(200).json({ ok: true, has_result: false, payload: null });
      }
      return res.status(200).json({ ok: true, has_result: true, payload: latest });
    } catch (err) {
      console.error("youth_latest_lookup_failed", err);
      return res.status(500).json({ ok: false, error: "youth_latest_lookup_failed" });
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
