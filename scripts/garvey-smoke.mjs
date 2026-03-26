// FILE: scripts/garvey-smoke.mjs
// Usage:
//   BASE_URL="https://your-host" node scripts/garvey-smoke.mjs
// or (local):
//   BASE_URL="http://localhost:3000" node scripts/garvey-smoke.mjs
//
// Exit codes:
//   0 = pass
//   1 = fail

import process from "node:process";

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const TENANT = process.env.TENANT || `smoke-${Date.now()}`;
const EMAIL = process.env.EMAIL || `smoke+${Date.now()}@example.com`;

const PHASES = ["G", "A", "R", "V", "E", "Y"];
const GARVEY_PAGES = [
  "/garvey.html",
  "/garvey-g.html",
  "/garvey-a.html",
  "/garvey-r.html",
  "/garvey-v.html",
  "/garvey-e.html",
  "/garvey-y.html",
];

function url(path) {
  if (!path.startsWith("/")) path = `/${path}`;
  return `${BASE_URL}${path}`;
}

async function httpJson(path, { method = "GET", body } = {}) {
  const res = await fetch(url(path), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    // ignore
  }
  return { res, text, json };
}

async function httpText(path) {
  const res = await fetch(url(path));
  const text = await res.text();
  return { res, text };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function pickColumnId(columns, phase, nameLower) {
  const cols = (columns || []).filter((c) => String(c.phase).toUpperCase() === phase);
  const found = cols.find((c) => String(c.name).toLowerCase() === nameLower);
  return found ? found.id : null;
}

async function ensureKanban() {
  const { res, json, text } = await httpJson("/api/kanban/ensure", {
    method: "POST",
    body: { tenant: TENANT },
  });
  assert(res.ok, `kanban ensure failed: ${res.status} ${text}`);
  assert(json?.success === true, "kanban ensure: success !== true");
}

async function getBoard() {
  const { res, json, text } = await httpJson(`/api/kanban/board?tenant=${encodeURIComponent(TENANT)}`);
  assert(res.ok, `kanban board failed: ${res.status} ${text}`);
  assert(json?.success === true, "kanban board: success !== true");
  assert(Array.isArray(json?.columns), "kanban board: columns missing");
  return json;
}

async function getCards(phase) {
  const { res, json, text } = await httpJson(
    `/api/kanban/cards?tenant=${encodeURIComponent(TENANT)}&phase=${encodeURIComponent(phase)}`
  );
  assert(res.ok, `kanban cards failed (${phase}): ${res.status} ${text}`);
  assert(json?.success === true, `kanban cards: success !== true (${phase})`);
  assert(Array.isArray(json?.cards), `kanban cards missing (${phase})`);
  return json.cards;
}

async function createCard({ phase, columnId, title, description }) {
  const { res, json, text } = await httpJson("/api/kanban/cards", {
    method: "POST",
    body: { tenant: TENANT, phase, column_id: columnId, title, description },
  });
  assert(res.ok, `create card failed (${phase}): ${res.status} ${text}`);
  assert(json?.success === true, `create card: success !== true (${phase})`);
  assert(json?.card?.id, `create card missing id (${phase})`);
  return json.card;
}

async function moveCard(cardId, toColumnId) {
  const { res, json, text } = await httpJson(`/api/kanban/cards/${cardId}/move`, {
    method: "POST",
    body: { to_column_id: toColumnId },
  });
  assert(res.ok, `move card failed (id=${cardId}): ${res.status} ${text}`);
  assert(json?.success === true, `move card: success !== true (id=${cardId})`);
  return json.card;
}

async function runKanbanPhaseCycle(boardColumns, phase) {
  const backlogId = pickColumnId(boardColumns, phase, "backlog");
  const doneId = pickColumnId(boardColumns, phase, "done");
  assert(backlogId, `missing backlog column for phase ${phase}`);
  assert(doneId, `missing done column for phase ${phase}`);

  const title = `Smoke ${phase} ${Date.now()}`;
  const card = await createCard({
    phase,
    columnId: backlogId,
    title,
    description: "Smoke test card",
  });

  await moveCard(card.id, doneId);

  const cardsAfter = await getCards(phase);
  const found = cardsAfter.find((c) => c.id === card.id);
  assert(found, `card not found after move (${phase})`);
  assert(Number(found.column_id) === Number(doneId), `card not in Done after move (${phase})`);
}

async function runIntake() {
  const q = await httpJson(`/api/questions?assessment=business_owner`);
  assert(q.res.ok, `questions failed: ${q.res.status} ${q.text}`);
  assert(Array.isArray(q.json?.questions) && q.json.questions.length > 0, "no business questions returned");
  assert(q.json?.assessment === "business_owner", "questions assessment mismatch for intake");

  const answers = q.json.questions.map((qq) => ({ qid: qq.qid, answer: "A" }));

  const intake = await httpJson("/api/intake", {
    method: "POST",
    body: { email: EMAIL, tenant: TENANT, answers },
  });

  assert(intake.res.ok, `intake failed: ${intake.res.status} ${intake.text}`);
  assert(intake.json?.success === true, "intake success !== true");
  assert(intake.json?.assessment_type === "business_owner", "intake assessment_type mismatch");
  assert(intake.json?.primary, "intake missing primary");
}

async function runVoc() {
  const q = await httpJson(`/api/questions?assessment=customer`);
  assert(q.res.ok, `customer questions failed: ${q.res.status} ${q.text}`);
  assert(Array.isArray(q.json?.questions) && q.json.questions.length > 0, "no customer questions returned");
  assert(q.json?.assessment === "customer", "questions assessment mismatch for VOC");

  const answers = q.json.questions.map((qq) => ({ qid: qq.qid, answer: "A" }));
  const voc = await httpJson("/voc-intake", {
    method: "POST",
    body: { email: EMAIL, tenant: TENANT, answers },
  });

  assert(voc.res.ok, `voc intake failed: ${voc.res.status} ${voc.text}`);
  assert(voc.json?.success === true, "voc success !== true");
  assert(voc.json?.assessment_type === "customer", "voc assessment_type mismatch");
  assert(voc.json?.primary, "voc missing primary");
}

async function runRewardFlow() {
  const checkin = await httpJson(`/t/${encodeURIComponent(TENANT)}/checkin`, {
    method: "POST",
    body: { email: EMAIL },
  });
  assert(checkin.res.ok, `checkin failed: ${checkin.res.status} ${checkin.text}`);
  assert(typeof checkin.json?.points_added === "number", "checkin missing points_added");

  const action = await httpJson(`/t/${encodeURIComponent(TENANT)}/action`, {
    method: "POST",
    body: { email: EMAIL, action_type: "review" },
  });
  assert(action.res.ok, `action failed: ${action.res.status} ${action.text}`);
  assert(typeof action.json?.points_added === "number", "action missing points_added");
  assert(typeof action.json?.points === "number", "action missing points");
}

async function verifyAssessmentLinks() {
  const { res, text } = await httpText(`/admin.html?tenant=${encodeURIComponent(TENANT)}`);
  assert(res.ok, `admin page failed: ${res.status}`);
  assert(text.includes("id=\"businessBtn\""), "admin missing business button");
  assert(text.includes("/intake.html?tenant=${enc}&assessment=business_owner"), "business button link mapping missing");
  assert(text.includes("/voc.html?tenant=${enc}"), "voc button link mapping missing");
  assert(text.includes("/rewards.html?tenant=${enc}"), "reward button link mapping missing");
}

async function verifyPages() {
  // tenant site
  const site = await httpText(`/t/${encodeURIComponent(TENANT)}/site`);
  assert(site.res.ok, `tenant site failed: ${site.res.status}`);
  assert(site.text.includes("<html"), "tenant site does not look like HTML");

  // garvey pages
  for (const p of GARVEY_PAGES) {
    const { res } = await httpText(`${p}?tenant=${encodeURIComponent(TENANT)}`);
    assert(res.ok, `page failed ${p}: ${res.status}`);
  }
}

async function main() {
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`TENANT=${TENANT}`);
  console.log(`EMAIL=${EMAIL}`);

  // 0) basic health check
  const health = await httpJson("/health");
  assert(health.res.ok, `health failed: ${health.res.status} ${health.text}`);

  // 1) kanban ensure + board
  await ensureKanban();
  const board = await getBoard();

  // 2) run through phases
  for (const phase of PHASES) {
    console.log(`Phase ${phase}: create + move card`);
    await runKanbanPhaseCycle(board.columns, phase);
  }

  // 3) intake
  console.log("Running /api/intake");
  await runIntake();

  // 4) customer VOC
  console.log("Running /voc-intake");
  await runVoc();

  // 5) reward flow
  console.log("Running reward flow");
  await runRewardFlow();

  // 6) verify pages + button link mapping
  console.log("Verifying tenant site + GARVEY pages");
  await verifyPages();
  await verifyAssessmentLinks();

  console.log("✅ GARVEY SMOKE TEST PASSED");
}

main().catch((err) => {
  console.error("❌ GARVEY SMOKE TEST FAILED");
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});
