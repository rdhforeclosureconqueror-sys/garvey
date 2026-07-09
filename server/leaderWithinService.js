"use strict";

const curriculum = require("../public/the-leader-within/programs/leader-within-program-data.js");
const SESSION_ORDER = ["A", "B", "C"];
const STORY_MAP = {
  A: "The Group Without a Captain",
  B: "The Practice That Started Falling Apart",
  C: "The Friend Who Did Not Say Much",
};
const OPTIONAL_STORIES = ["The Plan Changed", "The Person Who Always Talks First"];
const PROGRAM_SLUG = "the-leader-within-12-week";

function actorFromRequest(req) {
  const role = String(req.headers["x-user-role"] || req.query.role || "youth_participant").trim().toLowerCase();
  const email = String(req.headers["x-user-email"] || req.query.email || req.userEmail || "").trim().toLowerCase();
  const tenant = String(req.headers["x-tenant-slug"] || req.query.tenant || "default").trim().toLowerCase();
  return { role, email, tenant, isAdmin: req.isAdmin || role === "admin" };
}
function isFacilitator(actor) { return actor.isAdmin || ["facilitator", "coach", "staff", "admin"].includes(actor.role); }
function assertYouthOwns(actor, participantEmail) {
  if (!actor.email || actor.email !== String(participantEmail || "").toLowerCase()) {
    const e = new Error("Youth participants can only access their own program state."); e.status = 403; throw e;
  }
}
function assertFacilitatorForCohort(actor, cohort) {
  if (!isFacilitator(actor)) { const e = new Error("Facilitator role required."); e.status = 403; throw e; }
  if (!actor.isAdmin && cohort.tenant_slug !== actor.tenant) { const e = new Error("Tenant isolation enforced."); e.status = 403; throw e; }
  if (!actor.isAdmin && cohort.assigned_facilitator_email && cohort.assigned_facilitator_email !== actor.email) { const e = new Error("Facilitator is not assigned to this cohort."); e.status = 403; throw e; }
}
function weekOne() { return curriculum.weeks[0]; }
function phaseForWeek(n) { return curriculum.phases[(curriculum.weeks.find((w) => w.n === n) || curriculum.weeks[0]).phase - 1]; }
function sessionTitle(code) { return ({ A: "Learn the Story", B: "Practice Through the Body", C: "Apply and Reflect" })[code] || "Learn the Story"; }
function currentMission(code, hasPractice) {
  if (code === "A") return hasPractice ? "Complete Today’s Reflection" : "Choose My Practice";
  if (code === "B") return "Take It Into Training";
  return "What Did the Group Teach You?";
}

async function ensureDemoState(pool, actor) {
  const tenant = await pool.query(`INSERT INTO tenants (slug,name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=COALESCE(tenants.name,EXCLUDED.name) RETURNING id,slug`, [actor.tenant || "default", "Demo Tenant"]);
  const user = await pool.query(`INSERT INTO users (email,tenant_id,name) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,email) DO UPDATE SET name=COALESCE(users.name,EXCLUDED.name) RETURNING id,email,name`, [actor.email || "youth@example.com", tenant.rows[0].id, actor.email ? actor.email.split("@")[0] : "Jordan"]);
  const program = await pool.query(`SELECT id FROM leader_within_programs WHERE slug=$1`, [PROGRAM_SLUG]);
  const cohort = await pool.query(`INSERT INTO leader_within_cohorts (tenant_id,name,program_id,location_id,current_week,current_session,assigned_facilitator_email) VALUES ($1,'Oak Cliff — Cohort A',$2,'Oak Cliff',1,'A','facilitator@example.com') ON CONFLICT DO NOTHING RETURNING id`, [tenant.rows[0].id, program.rows[0].id]);
  const cohortId = cohort.rows[0]?.id || (await pool.query(`SELECT id FROM leader_within_cohorts WHERE tenant_id=$1 ORDER BY id LIMIT 1`, [tenant.rows[0].id])).rows[0].id;
  const enrollment = await pool.query(`INSERT INTO leader_within_program_enrollments (participant_id,program_id,cohort_id,tenant_id,location_id,status,current_week,current_session) VALUES ($1,$2,$3,$4,'Oak Cliff','active',1,'A') ON CONFLICT (participant_id,program_id) DO UPDATE SET updated_at=NOW() RETURNING *`, [user.rows[0].id, program.rows[0].id, cohortId, tenant.rows[0].id]);
  await pool.query(`INSERT INTO leader_within_session_progress (enrollment_id,week_number,session_code,status,opened_at) VALUES ($1,1,'A','available',NOW()) ON CONFLICT DO NOTHING`, [enrollment.rows[0].id]);
  await pool.query(`INSERT INTO leader_within_assessment_snapshots (participant_id,enrollment_id,result_reference,assessment_version,completed_at,primary_archetype,supporting_archetype,approved_strength_summary,approved_growth_summary,checkpoint_type) VALUES ($1,$2,'approved-youth-result','youth-bank-1',NOW(),'Vision Architect','People Catalyst','You often see possibility and help the group imagine a better direction.','Practice turning ideas into shared steps while making space for other voices.','baseline') ON CONFLICT DO NOTHING`, [user.rows[0].id, enrollment.rows[0].id]);
  return enrollment.rows[0];
}

async function getYouthDashboard(pool, req) {
  const actor = actorFromRequest(req); await ensureDemoState(pool, actor);
  const result = await pool.query(`SELECT e.*, u.email participant_email, u.name participant_name, p.title program_title, p.duration_weeks, c.name cohort_name, c.location_id, c.alternate_story_title FROM leader_within_program_enrollments e JOIN users u ON u.id=e.participant_id JOIN leader_within_programs p ON p.id=e.program_id LEFT JOIN leader_within_cohorts c ON c.id=e.cohort_id WHERE lower(u.email)=lower($1) LIMIT 1`, [actor.email || "youth@example.com"]);
  const row = result.rows[0]; assertYouthOwns(actor, row.participant_email);
  const practice = (await pool.query(`SELECT practice_id, participant_reason, status FROM leader_within_practice_selections WHERE enrollment_id=$1 AND week_number=$2`, [row.id, row.current_week])).rows[0] || null;
  const progress = (await pool.query(`SELECT session_code,status FROM leader_within_session_progress WHERE enrollment_id=$1 AND week_number=$2 ORDER BY session_code`, [row.id, row.current_week])).rows;
  const snap = (await pool.query(`SELECT completed_at, primary_archetype, supporting_archetype, approved_strength_summary, approved_growth_summary, assessment_version, checkpoint_type FROM leader_within_assessment_snapshots WHERE enrollment_id=$1 ORDER BY completed_at DESC NULLS LAST, id DESC LIMIT 1`, [row.id])).rows[0] || null;
  const w = weekOne(); const phase = phaseForWeek(row.current_week); const featured = row.alternate_story_title || STORY_MAP[row.current_session] || STORY_MAP.A;
  return { program: { title: row.program_title, duration_weeks: row.duration_weeks }, participant: { first_name: (row.participant_name || row.participant_email || "Friend").split(/[ @]/)[0] }, current: { phase: `Phase ${phase.id}: ${phase.name}`, week: row.current_week, session: row.current_session, session_title: sessionTitle(row.current_session), mission: currentMission(row.current_session, !!practice) }, leadership_profile: snap, practice, progress, session: buildYouthSession(row.current_session, w, featured, practice) };
}
function buildYouthSession(code, w, featuredTitle, practice) {
  const featured = w.stories.find((s) => s.title === featuredTitle) || w.stories.find((s) => s.title === STORY_MAP[code]) || w.stories[0];
  const extra = w.stories.filter((s) => s.title !== featured.title).map((s) => ({ title: s.title, collapsed: true }));
  if (code === "B") return { code, title: "Session B — Practice Through the Body", featured_story: featured, selected_practice: practice, observation_lens: "Notice when leadership appears during movement, effort, safety, support, recovery, or adjustment.", pocketpt_copy: "Your PocketPT fitness session will match your current ability, safety needs, and personal training plan. During the session, notice where leadership appears.", pocketpt_placeholder: "Your PocketPT fitness session will appear here when program enrollment is connected.", additional_stories: extra };
  if (code === "C") return { code, title: "Session C — Apply and Reflect", challenge: w.sessionC.title, featured_story: featured, group_prompts: w.sessionC.debrief, group_perspective_fields: w.groupPerspective.fields, additional_stories: extra };
  return { code, title: "Session A — Learn the Story", week_title: w.title, core_question: w.q, key_lesson: w.story, featured_story: featured, prompts: featured.prompts, before_prompts: w.before, practice_bank: w.practiceBank, additional_stories: extra };
}
async function selectPractice(pool, req) {
  const actor = actorFromRequest(req); const dashboard = await getYouthDashboard(pool, req); const enrollment = await pool.query(`SELECT e.id FROM leader_within_program_enrollments e JOIN users u ON u.id=e.participant_id WHERE lower(u.email)=lower($1) LIMIT 1`, [actor.email]);
  const id = String(req.body.practice_id || "").trim(); if (!weekOne().practiceBank.some((p) => p.title === id)) { const e = new Error("Invalid participant-controlled practice selection."); e.status = 400; throw e; }
  await pool.query(`INSERT INTO leader_within_practice_selections (enrollment_id,week_number,practice_id,participant_reason,status) VALUES ($1,$2,$3,$4,'selected') ON CONFLICT (enrollment_id,week_number) DO UPDATE SET practice_id=EXCLUDED.practice_id, participant_reason=EXCLUDED.participant_reason, selected_at=NOW(), updated_at=NOW()`, [enrollment.rows[0].id, dashboard.current.week, id, req.body.participant_reason || null]);
  return { ok: true, practice_id: id };
}
async function submitReflection(pool, req) {
  const actor = actorFromRequest(req); const enrollment = await pool.query(`SELECT e.id,e.current_week,e.current_session FROM leader_within_program_enrollments e JOIN users u ON u.id=e.participant_id WHERE lower(u.email)=lower($1) LIMIT 1`, [actor.email]);
  const type = String(req.body.reflection_type || "before_practice"); const text = String(req.body.response_text || "").trim(); if (!text) { const e = new Error("response_text required"); e.status = 400; throw e; }
  await pool.query(`INSERT INTO leader_within_reflections (enrollment_id,week_number,session_code,reflection_type,prompt_id,response_text,visibility) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [enrollment.rows[0].id, req.body.week_number || enrollment.rows[0].current_week, req.body.session_code || enrollment.rows[0].current_session, type, req.body.prompt_id || null, text, req.body.visibility || "participant_and_facilitator"]);
  return { ok: true };
}
async function submitSharedPerspective(pool, req) {
  const actor = actorFromRequest(req); const enrollment = await pool.query(`SELECT e.id,e.current_week FROM leader_within_program_enrollments e JOIN users u ON u.id=e.participant_id WHERE lower(u.email)=lower($1) LIMIT 1`, [actor.email]);
  await pool.query(`INSERT INTO leader_within_shared_perspectives (enrollment_id,week_number,perspective_heard,idea_to_consider,group_difference) VALUES ($1,$2,$3,$4,$5)`, [enrollment.rows[0].id, req.body.week_number || enrollment.rows[0].current_week, req.body.perspective_heard || null, req.body.idea_to_consider || null, req.body.group_difference || null]);
  return { ok: true };
}
async function facilitatorDashboard(pool, req) {
  const actor = actorFromRequest(req); if (!isFacilitator(actor)) { const e = new Error("Facilitator role required."); e.status = 403; throw e; }
  const cohorts = (await pool.query(`SELECT c.*, t.slug tenant_slug, p.title program_title, COUNT(e.id)::int participant_count FROM leader_within_cohorts c JOIN tenants t ON t.id=c.tenant_id JOIN leader_within_programs p ON p.id=c.program_id LEFT JOIN leader_within_program_enrollments e ON e.cohort_id=c.id WHERE ($1::boolean OR lower(t.slug)=lower($2)) GROUP BY c.id,t.slug,p.title ORDER BY c.id`, [actor.isAdmin, actor.tenant])).rows;
  return { metrics: { active_cohorts: cohorts.length, active_participants: cohorts.reduce((n,c)=>n+c.participant_count,0), current_week: 1, today_sessions: cohorts.length, check_ins_today: 0, reflections_awaiting_review: 0, missed_sessions: 0, follow_up_flags: 0, pocketpt_summaries_awaiting_review: 0 }, cohorts, plan: { session_title: "Session A — Learn the Story", learning_objective: weekOne().facilitator.objective, story_to_deliver: STORY_MAP.A, required_materials: ["Story card", "Practice bank", "Reflection prompts"], discussion_prompts: weekOne().stories[0].prompts, practice_options: weekOne().practiceBank.map(p=>p.title), what_to_observe: weekOne().facilitator.observe, what_not_to_do: weekOne().facilitator.notDo, completion_criteria: weekOne().completion, pocketpt_lens: "Observe leadership during safe individualized movement; do not prescribe a universal workout." } };
}
async function participantProfile(pool, req) {
  const actor = actorFromRequest(req); const id = Number(req.params.participantId); const profile = await pool.query(`SELECT e.*, u.email,u.name,c.name cohort_name,c.location_id,t.slug tenant_slug,p.title program_title FROM leader_within_program_enrollments e JOIN users u ON u.id=e.participant_id JOIN leader_within_cohorts c ON c.id=e.cohort_id JOIN tenants t ON t.id=e.tenant_id JOIN leader_within_programs p ON p.id=e.program_id WHERE e.participant_id=$1 LIMIT 1`, [id]);
  if (!profile.rows[0]) { const e = new Error("Not found"); e.status = 404; throw e; } assertFacilitatorForCohort(actor, profile.rows[0]);
  const [snapshots, practices, reflections, progress, pocketpt, notes] = await Promise.all([
    pool.query(`SELECT completed_at,primary_archetype,supporting_archetype,approved_strength_summary,approved_growth_summary,assessment_version,checkpoint_type FROM leader_within_assessment_snapshots WHERE enrollment_id=$1 ORDER BY id DESC`, [profile.rows[0].id]),
    pool.query(`SELECT week_number,practice_id,participant_reason,attempted_at,status,reflection_summary FROM leader_within_practice_selections WHERE enrollment_id=$1 ORDER BY week_number`, [profile.rows[0].id]),
    pool.query(`SELECT week_number,session_code,reflection_type,prompt_id,response_text,visibility,submitted_at FROM leader_within_reflections WHERE enrollment_id=$1 AND visibility <> 'participant_only' ORDER BY submitted_at DESC`, [profile.rows[0].id]),
    pool.query(`SELECT week_number,session_code,status,checked_in_at,completed_at FROM leader_within_session_progress WHERE enrollment_id=$1 ORDER BY week_number,session_code`, [profile.rows[0].id]),
    pool.query(`SELECT week_number,session_code,assignment_status,completion_status,completed_at,effort_check_status,recovery_check_status,approved_coaching_summary,follow_up_flag FROM leader_within_pocketpt_activity_summaries WHERE enrollment_id=$1`, [profile.rows[0].id]),
    pool.query(`SELECT note_type,note_text,visibility,created_at FROM leader_within_facilitator_notes WHERE enrollment_id=$1 ORDER BY created_at DESC`, [profile.rows[0].id]),
  ]);
  return { overview: profile.rows[0], leadership_profile: { label: "Patterns shown at each checkpoint", snapshots: snapshots.rows }, practice_history: practices.rows, reflection_history: reflections.rows, participation: progress.rows, pocketpt_summary: pocketpt.rows, facilitator_notes: notes.rows };
}
async function facilitatorControl(pool, req) {
  const actor = actorFromRequest(req); const enrollmentId = Number(req.params.enrollmentId); const e = (await pool.query(`SELECT e.*,c.*,t.slug tenant_slug FROM leader_within_program_enrollments e JOIN leader_within_cohorts c ON c.id=e.cohort_id JOIN tenants t ON t.id=e.tenant_id WHERE e.id=$1`, [enrollmentId])).rows[0]; assertFacilitatorForCohort(actor, e);
  const action = String(req.body.action || "open"); const session = String(req.body.session_code || e.current_session || "A").toUpperCase(); const status = action === "reopen" ? "available" : action === "make_up" ? "missed" : action === "complete" ? "completed" : "available";
  await pool.query(`INSERT INTO leader_within_session_progress (enrollment_id,week_number,session_code,status,opened_at,completed_at,completed_by) VALUES ($1,$2,$3,$4,NOW(),CASE WHEN $4='completed' THEN NOW() ELSE NULL END,$5) ON CONFLICT (enrollment_id,week_number,session_code) DO UPDATE SET status=EXCLUDED.status, opened_at=COALESCE(leader_within_session_progress.opened_at,NOW()), completed_at=EXCLUDED.completed_at, completed_by=EXCLUDED.completed_by, updated_at=NOW()`, [enrollmentId, req.body.week_number || e.current_week, session, status, actor.email]);
  if (req.body.alternate_story_title) await pool.query(`UPDATE leader_within_cohorts SET alternate_story_title=$1, updated_at=NOW() WHERE id=$2`, [req.body.alternate_story_title, e.cohort_id]);
  return { ok: true, status };
}
async function addNote(pool, req) {
  const actor = actorFromRequest(req); const profile = await participantProfile(pool, req); const note = String(req.body.note_text || "").trim(); if (!note) { const e = new Error("note_text required"); e.status = 400; throw e; }
  await pool.query(`INSERT INTO leader_within_facilitator_notes (participant_id,cohort_id,enrollment_id,note_text,visibility) VALUES ($1,$2,$3,$4,'facilitator_private')`, [profile.overview.participant_id, profile.overview.cohort_id, profile.overview.id, note]);
  return { ok: true };
}
module.exports = { getYouthDashboard, selectPractice, submitReflection, submitSharedPerspective, facilitatorDashboard, participantProfile, facilitatorControl, addNote, STORY_MAP, OPTIONAL_STORIES };
