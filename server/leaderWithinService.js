"use strict";
const crypto = require("crypto");
const { authenticateGarveyUser, resolveGarveyAuthActor, isAdminEmail } = require("./authService");

const curriculum = require("../public/the-leader-within/programs/leader-within-program-data.js");
const SESSION_ORDER = ["A", "B", "C"];
const STORY_MAP = { A: "The Group Without a Captain", B: "The Practice That Started Falling Apart", C: "The Friend Who Did Not Say Much" };
const OPTIONAL_STORIES = ["The Plan Changed", "The Person Who Always Talks First"];
const PROGRAM_SLUG = "the-leader-within-12-week";
const DEV_ACTOR_FLAG = "LEADER_WITHIN_DEV_ACTOR_OVERRIDE";
const DEMO_BOOTSTRAP_FLAG = "LEADER_WITHIN_DEMO_BOOTSTRAP";
const ALLOWED_REFLECTION_TYPES = new Set(["before_practice", "story_response", "session_reflection", "after_practice", "group_debrief"]);
const ALLOWED_VISIBILITY = new Set(["participant_and_facilitator", "participant_only"]);
const ALLOWED_NOTE_TYPES = new Set(["private_facilitator_note", "attendance", "follow_up", "safety"]);
const ALLOWED_SESSION_ACTIONS = new Set(["open", "reopen", "make_up", "complete"]);
const YOUTH_COOKIE = "tlw_youth_session";
const FACILITATOR_COOKIE = "tlw_facilitator_session";
const FACILITATOR_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const TLW_COOKIE_VERSION = "v2-root-path";
const FACILITATOR_COOKIE_CANONICAL_PATH = "/";
const FACILITATOR_COOKIE_LEGACY_PATHS = ["/", "/the-leader-within", "/the-leader-within/", "/the-leader-within/facilitator", "/the-leader-within/facilitator/", "/admin", "/admin/the-leader-within", "/api/admin/the-leader-within"];
const YOUTH_SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const CONSENT_STATES = new Set(["not_required", "not_required_by_policy", "pending_guardian_consent", "guardian_consented", "participant_assented", "revoked", "restricted", "synthetic_approved", "pending", "approved", "declined", "withdrawn"]);
const LEADER_WITHIN_ROLES = new Set(["super_admin","program_admin","program_director","lead_facilitator","facilitator","observer"]);
const FACILITATOR_ACCOUNT_STATUSES = new Set(["invited","setup_pending","active","suspended","disabled","archived"]);
const FACILITATOR_REQUEST_STATUSES = new Set(["pending","more_information_requested","approved","declined","withdrawn","expired"]);

function fail(status, message) { const e = new Error(message); e.status = status; throw e; }

function safePublicError(status, code, message, stage) { const e = new Error(message); e.status = status; e.code = code; if(stage) e.stage = stage; throw e; }
function leaderWithinRequestId(){ return `lwc_${Date.now().toString(36)}${crypto.randomBytes(4).toString("hex")}`; }

function pgSafeDetails(e){ return { sqlstate: e?.code && /^(\d{5}|[A-Z0-9]{5})$/.test(String(e.code)) ? String(e.code) : undefined, constraint: e?.constraint ? String(e.constraint).slice(0,120) : undefined, column: e?.column ? String(e.column).slice(0,120) : undefined }; }
function classifyBootstrapFailure(stage,e){
  if(e?.status && e?.code) return { status:e.status, code:e.code, message:e.message };
  const d=pgSafeDetails(e);
  if(stage.includes("facilitator_assignment") && d.sqlstate === "23502") return { status:400, code:"assignment_missing_required_field", message:"The cohort was created, but the facilitator assignment could not be completed. No changes were saved.", ...d };
  if(stage.includes("facilitator_assignment") && d.sqlstate === "23503") return { status:400, code:"assignment_invalid_reference", message:"The cohort was created, but the facilitator assignment could not be completed. No changes were saved.", ...d };
  if(stage.includes("facilitator_assignment") && d.sqlstate === "23505") return { status:409, code:"facilitator_already_assigned", message:"The facilitator is already assigned to this cohort.", ...d };
  if(stage.includes("facilitator_assignment") && d.sqlstate === "23514") return { status:400, code:"invalid_assignment_value", message:"The cohort was created, but the facilitator assignment could not be completed. No changes were saved.", ...d };
  if(stage.includes("facilitator_assignment") && (d.sqlstate === "42703" || d.sqlstate === "42P01" || d.sqlstate === "42P10")) return { status:500, code:"assignment_schema_migration_required", message:"The cohort was created, but the facilitator assignment could not be completed. No changes were saved.", ...d };
  if(stage.includes("facilitator_assignment") && d.sqlstate === "22P02") return { status:400, code:"invalid_assignment_field_type", message:"The cohort was created, but the facilitator assignment could not be completed. No changes were saved.", ...d };
  if(d.sqlstate === "23502") return { status:400, code:"missing_required_cohort_field", message:"The cohort could not be saved.", ...d };
  if(d.sqlstate === "23503") return { status:400, code:"invalid_cohort_reference", message:"The cohort could not be saved.", ...d };
  if(d.sqlstate === "23505") return { status:409, code:"duplicate_cohort", message:"A cohort with these details already exists.", ...d };
  if(d.sqlstate === "23514") return { status:400, code:"invalid_cohort_value", message:"The cohort could not be saved.", ...d };
  if(d.sqlstate === "42703" || d.sqlstate === "42P01") return { status:500, code:"schema_migration_required", message:"The cohort could not be saved.", ...d };
  if(d.sqlstate === "22P02") return { status:400, code:"invalid_cohort_field_type", message:"The cohort could not be saved.", ...d };
  if(stage.includes("pathway")) return { status:400, code:"pathway_not_found", message:"The selected program pathway is not available.", ...d };
  if(stage.includes("organization")) return { status:500, code:"organization_resolution_failed", message:"The organization could not be prepared.", ...d };
  if(stage.includes("location")) return { status:500, code:"location_resolution_failed", message:"The cohort location could not be prepared.", ...d };
  if(stage.includes("cohort_insert")) return { status:500, code:"cohort_insert_failed", message:"The cohort could not be saved.", ...d };
  if(stage.includes("facilitator_assignment")) return { status:500, code:"facilitator_assignment_failed", message:"The cohort was created, but the facilitator assignment could not be completed. No changes were saved.", ...d };
  if(stage.includes("audit")) return { status:500, code:"audit_insert_failed", message:"The cohort could not be saved.", ...d };
  return { status:500, code:"persistence_failed", message:"The cohort could not be saved.", ...d };
}
function logBootstrapFailure(requestId, stage, failure){
  console.error(JSON.stringify({ event:"leader_within_cohort_bootstrap_failed", request_id:requestId, stage, safe_code:failure.code, sqlstate:failure.sqlstate, constraint:failure.constraint, column:failure.column, handler_version:"cohort-bootstrap-post-v4", commit:process.env.RENDER_GIT_COMMIT||process.env.GIT_COMMIT||process.env.COMMIT_SHA||"unknown", rolled_back:true }));
}
function normalizePathway(v) { const x = norm(v || PROGRAM_SLUG).replace(/\s+/g, "-"); const aliases = { "12-week-program": "the-leader-within-12-week", "12-week": "the-leader-within-12-week", "12_week": "the-leader-within-12-week", "twelve_week": "the-leader-within-12-week", "8-week-program": "the-leader-within-8-week", "8-week": "the-leader-within-8-week", "32-week-program": "the-leader-within-32-week", "32-week": "the-leader-within-32-week" }; return aliases[x] || x; }
function normalizeIsoDate(v) { const raw=String(v||"").trim(); if(!raw) return null; if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)) safePublicError(400,"invalid_start_date","Enter a valid start date."); const d=new Date(`${raw}T00:00:00Z`); if(Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==raw) safePublicError(400,"invalid_start_date","Enter a valid start date."); return raw; }
function normalizePositiveInt(v, code, message, { required=false, min=1, max=10000 }={}) { if(v===""||v===null||v===undefined) { if(required) safePublicError(400,code,message); return null; } const n=Number(v); if(!Number.isInteger(n)||n<min||n>max) safePublicError(400,code,message); return n; }
function norm(v) { return String(v || "").trim().toLowerCase(); }
function enabled(name) { return ["1", "true", "yes", "on"].includes(norm(process.env[name])); }
function nonProduction() { return process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development"; }
function trustedActorFromRequest(req) {
  const facilitatorFirst = req.trustedActorScope === "facilitator" || req.path?.startsWith("/admin/the-leader-within") || req.path?.startsWith("/api/admin/the-leader-within") || req.path?.startsWith("/the-leader-within/facilitator");
  if (facilitatorFirst && req.leaderWithinFacilitatorActor?.authenticated) return req.leaderWithinFacilitatorActor;
  if (facilitatorFirst && req.authActor?.email && req.authActor?.userId && req.authActor?.isAdmin === true) {
    return { user_id: Number(req.authActor.userId), email: norm(req.authActor.email), authenticated: true, global_roles: ["admin"], tenant_memberships: [{ tenant_id: req.authActor.tenantId || null, tenant_slug: norm(req.authActor.tenantSlug), role: norm(req.authActor.role) }], active_tenant_id: req.authActor.tenantId || null, active_tenant_slug: norm(req.authActor.tenantSlug), role: norm(req.authActor.role || "admin"), participant_id: Number(req.authActor.userId), is_admin: true, is_superadmin: true, actor_type: "garvey_admin" };
  }
  if (!facilitatorFirst && req.leaderWithinYouthActor?.authenticated) return req.leaderWithinYouthActor;
  if (req.leaderWithinFacilitatorActor?.authenticated) return req.leaderWithinFacilitatorActor;
  if (req.authActor?.email && req.authActor?.userId) {
    return { user_id: Number(req.authActor.userId), email: norm(req.authActor.email), authenticated: true, global_roles: req.authActor.isAdmin ? ["admin"] : [], tenant_memberships: [{ tenant_id: req.authActor.tenantId || null, tenant_slug: norm(req.authActor.tenantSlug), role: norm(req.authActor.role) }], active_tenant_id: req.authActor.tenantId || null, active_tenant_slug: norm(req.authActor.tenantSlug), role: norm(req.authActor.role), participant_id: Number(req.authActor.userId), is_admin: req.authActor.isAdmin === true, is_superadmin: req.authActor.isAdmin === true };
  }
  if (nonProduction() && enabled(DEV_ACTOR_FLAG) && req.headers["x-leader-within-dev-actor"]) {
    let data = {}; try { data = JSON.parse(String(req.headers["x-leader-within-dev-actor"])); } catch { fail(400, "Invalid development actor override."); }
    const role = norm(data.role || "youth_participant"); const email = norm(data.email); const userId = Number(data.user_id || data.userId || data.participant_id || 0);
    if (!email || !userId) fail(401, "Development actor override requires trusted fixture email and user_id.");
    if (!trustedActorFromRequest._logged) { console.warn("leader_within_dev_actor_override_active"); trustedActorFromRequest._logged = true; }
    return { user_id: userId, email, authenticated: true, global_roles: data.is_admin ? ["admin"] : [], tenant_memberships: [{ tenant_id: data.tenant_id || null, tenant_slug: norm(data.tenant_slug || data.tenant), role }], active_tenant_id: data.tenant_id || null, active_tenant_slug: norm(data.tenant_slug || data.tenant || "default"), role, participant_id: Number(data.participant_id || userId), is_admin: data.is_admin === true || role === "admin", is_superadmin: data.is_superadmin === true };
  }
  fail(401, "Authentication required.");
}
function actorFlag(actor, snake, camel) { return actor?.[snake] === true || actor?.[camel] === true; }
function actorRole(actor) { return norm(actor?.facilitator_role || actor?.facilitatorRole || actor?.role); }
function canonicalLeaderWithinActor(actor) {
  if (!actor) return actor;
  const role = actorRole(actor);
  return { ...actor, role, facilitator_role: role, is_admin: actorFlag(actor, "is_admin", "isAdmin") || role === "super_admin", is_superadmin: actorFlag(actor, "is_superadmin", "isSuperadmin") || role === "super_admin" };
}
function canAdministerLeaderWithin(actor) {
  const a = canonicalLeaderWithinActor(actor);
  const role = actorRole(a);
  return !!(a?.authenticated && (a.is_admin === true || a.is_superadmin === true || ["super_admin", "program_admin", "program_director", "administrator", "admin"].includes(role)));
}
function requireLeaderWithinPlatformAdmin(actor) { if (!canAdministerLeaderWithin(actor)) fail(403, "Leader Within administrator access required."); }
function isFacilitator(actor) { const a = canonicalLeaderWithinActor(actor); return canAdministerLeaderWithin(a) || a?.actor_type === "leader_within_facilitator" || ["facilitator", "lead_facilitator", "coach", "staff"].includes(actorRole(a)); }
function isSuperAdminActor(actor) { const a = canonicalLeaderWithinActor(actor); return !!a?.is_superadmin || actorRole(a) === "super_admin"; }
function requireSuperAdmin(actor) { if (!isSuperAdminActor(actor)) fail(403, "Leader Within super-admin access required."); }
function assertYouthOwns(actor, participantId, tenantSlug) { if (actor.is_admin) return; if (Number(actor.participant_id) !== Number(participantId)) fail(403, "Youth participants can only access their own program state."); if (tenantSlug && norm(tenantSlug) !== actor.active_tenant_slug) fail(403, "Tenant isolation enforced."); }
function assertFacilitatorForCohort(actor, cohort) { if (!isFacilitator(actor)) fail(403, "Facilitator role required."); if (actor.is_admin) return; if (norm(cohort.tenant_slug) !== actor.active_tenant_slug) fail(403, "Tenant isolation enforced."); if (cohort.assigned_facilitator_user_id && Number(cohort.assigned_facilitator_user_id) === Number(actor.user_id)) return; if (!cohort.assigned_facilitator_user_id && cohort.assigned_facilitator_email && norm(cohort.assigned_facilitator_email) === actor.email) return; fail(403, "Facilitator is not assigned to this cohort."); }
function weekOne() { return curriculum.weeks[0]; }
function phaseForWeek(n) { return curriculum.phases[(curriculum.weeks.find((w) => w.n === n) || curriculum.weeks[0]).phase - 1]; }
function sessionTitle(code) { return ({ A: "Learn the Story", B: "Practice Through the Body", C: "Apply and Reflect" })[code] || "Learn the Story"; }
function currentMission(code, hasPractice) { if (code === "A") return hasPractice ? "Complete Today’s Reflection" : "Choose My Practice"; if (code === "B") return "Take It Into Training"; return "What Did the Group Teach You?"; }

async function ensureDemoState(pool, actor) {
  if (!nonProduction() || !enabled(DEMO_BOOTSTRAP_FLAG)) fail(403, "Demo bootstrap is disabled.");
  const tenant = await pool.query(`INSERT INTO tenants (slug,name) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=COALESCE(tenants.name,EXCLUDED.name) RETURNING id,slug`, [actor.active_tenant_slug || "demo", "Leader Within Demo Tenant"]);
  const user = await pool.query(`INSERT INTO users (email,tenant_id,name) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,email) DO UPDATE SET name=COALESCE(users.name,EXCLUDED.name) RETURNING id,email,name`, [actor.email, tenant.rows[0].id, actor.email.split("@")[0]]);
  const program = await pool.query(`SELECT id FROM leader_within_programs WHERE slug=$1`, [PROGRAM_SLUG]);
  const cohort = await pool.query(`INSERT INTO leader_within_cohorts (tenant_id,name,program_id,location_id,current_week,current_session,assigned_facilitator_email,is_demo) VALUES ($1,'Leader Within Demo Cohort',$2,'Demo',1,'A',$3,TRUE) RETURNING id`, [tenant.rows[0].id, program.rows[0].id, actor.email]);
  const enrollment = await pool.query(`INSERT INTO leader_within_program_enrollments (participant_id,program_id,cohort_id,tenant_id,location_id,status,current_week,current_session,is_demo) VALUES ($1,$2,$3,$4,'Demo','active',1,'A',TRUE) ON CONFLICT (participant_id,program_id) DO UPDATE SET updated_at=NOW() RETURNING *`, [user.rows[0].id, program.rows[0].id, cohort.rows[0].id, tenant.rows[0].id]);
  await pool.query(`INSERT INTO leader_within_session_progress (enrollment_id,week_number,session_code,status,opened_at,is_demo) VALUES ($1,1,'A','available',NOW(),TRUE) ON CONFLICT DO NOTHING`, [enrollment.rows[0].id]);
  return enrollment.rows[0];
}

async function loadYouthEnrollment(pool, actor) {
  let result = await pool.query(`SELECT e.*, lp.preferred_name participant_name, t.slug tenant_slug, p.title program_title, p.duration_weeks, c.name cohort_name, c.location_id, c.alternate_story_title FROM leader_within_program_enrollments e JOIN leader_within_participants lp ON lp.id=e.leader_within_participant_id JOIN tenants t ON t.id=e.tenant_id JOIN leader_within_programs p ON p.id=e.program_id LEFT JOIN leader_within_cohorts c ON c.id=e.cohort_id WHERE e.leader_within_participant_id=$1 AND lower(t.slug)=lower($2) AND e.status='active' LIMIT 1`, [actor.participant_id, actor.active_tenant_slug]);
  if (!result.rows[0]) result = await pool.query(`SELECT e.*, u.email participant_email, u.name participant_name, t.slug tenant_slug, p.title program_title, p.duration_weeks, c.name cohort_name, c.location_id, c.alternate_story_title FROM leader_within_program_enrollments e JOIN users u ON u.id=e.participant_id JOIN tenants t ON t.id=e.tenant_id JOIN leader_within_programs p ON p.id=e.program_id LEFT JOIN leader_within_cohorts c ON c.id=e.cohort_id WHERE e.participant_id=$1 AND lower(t.slug)=lower($2) AND e.status='active' LIMIT 1`, [actor.participant_id, actor.active_tenant_slug]);
  return result.rows[0] || null;
}
function youthEmptyState() { return { empty_state: { title: "The Leader Within", message: "You are not currently enrolled in a Leader Within program.", actions: ["Return to Youth Development", "View The Leader Within", "Contact your program facilitator"] } }; }
function facilitatorEmptyState(actor) {
  const canonicalEmail = norm(actor?.canonical_email || actor?.email || "");
  const displayName = String(actor?.display_name || "").trim() || canonicalEmail || "Facilitator";
  const platformAdmin = canAdministerLeaderWithin(actor);
  return {
    empty_state: { message: "No Leader Within cohorts are currently assigned to you.", can_create_cohort: platformAdmin },
    facilitator: { user_id: actor?.user_id || null, email: canonicalEmail || null, canonical_email: canonicalEmail || null, display_name: displayName, tenant_slug: actor?.active_tenant_slug || null }
  };
}
async function getYouthDashboard(pool, req) {
  const actor = trustedActorFromRequest(req); const row = await loadYouthEnrollment(pool, actor); if (!row) return youthEmptyState(); assertYouthOwns(actor, row.participant_id, row.tenant_slug);
  const practice = (await pool.query(`SELECT practice_id, participant_reason, status FROM leader_within_practice_selections WHERE enrollment_id=$1 AND week_number=$2`, [row.id, row.current_week])).rows[0] || null;
  const progress = (await pool.query(`SELECT session_code,status FROM leader_within_session_progress WHERE enrollment_id=$1 AND week_number=$2 ORDER BY session_code`, [row.id, row.current_week])).rows;
  const snap = (await pool.query(`SELECT completed_at, primary_archetype, supporting_archetype, approved_strength_summary, approved_growth_summary, assessment_version, checkpoint_type FROM leader_within_assessment_snapshots WHERE enrollment_id=$1 ORDER BY completed_at DESC NULLS LAST, id DESC LIMIT 1`, [row.id])).rows[0] || null;
  const w = weekOne(); const phase = phaseForWeek(row.current_week); const featured = row.alternate_story_title || STORY_MAP[row.current_session] || STORY_MAP.A;
  return { csrf_token: csrfTokenForRequest(req), program: { title: row.program_title, duration_weeks: row.duration_weeks }, participant: { first_name: (row.participant_name || "Friend").split(/[ @]/)[0] }, current: { phase: `Phase ${phase.id}: ${phase.name}`, week: row.current_week, session: row.current_session, session_title: sessionTitle(row.current_session), mission: currentMission(row.current_session, !!practice) }, leadership_profile: snap, practice, progress, session: buildYouthSession(row.current_session, w, featured, practice) };
}
function buildYouthSession(code, w, featuredTitle, practice) { const featured = w.stories.find((s) => s.title === featuredTitle) || w.stories.find((s) => s.title === STORY_MAP[code]) || w.stories[0]; const extra = w.stories.filter((s) => s.title !== featured.title).map((s) => ({ title: s.title, collapsed: true })); if (code === "B") return { code, title: "Session B — Practice Through the Body", featured_story: featured, selected_practice: practice, observation_lens: "Notice when leadership appears during movement, effort, safety, support, recovery, or adjustment.", pocketpt_copy: "Your PocketPT fitness session will match your current ability, safety needs, and personal training plan. During the session, notice where leadership appears.", pocketpt_placeholder: "Your PocketPT fitness session will appear here when program enrollment is connected.", additional_stories: extra }; if (code === "C") return { code, title: "Session C — Apply and Reflect", challenge: w.sessionC.title, featured_story: featured, group_prompts: w.sessionC.debrief, group_perspective_fields: w.groupPerspective.fields, additional_stories: extra }; return { code, title: "Session A — Learn the Story", week_title: w.title, core_question: w.q, key_lesson: w.story, featured_story: featured, prompts: featured.prompts, before_prompts: w.before, practice_bank: w.practiceBank, additional_stories: extra }; }
async function requireYouthEnrollment(pool, req) { const actor = trustedActorFromRequest(req); const row = await loadYouthEnrollment(pool, actor); if (!row) fail(403, "Active Leader Within enrollment required."); assertYouthOwns(actor, row.participant_id, row.tenant_slug); return { actor, row }; }
async function selectPractice(pool, req) { const { row } = await requireYouthEnrollment(pool, req); const id = String(req.body.practice_id || "").trim(); if (!weekOne().practiceBank.some((p) => p.title === id)) fail(400, "Invalid participant-controlled practice selection."); await pool.query(`INSERT INTO leader_within_practice_selections (enrollment_id,week_number,practice_id,participant_reason,status) VALUES ($1,$2,$3,$4,'selected') ON CONFLICT (enrollment_id,week_number) DO UPDATE SET practice_id=EXCLUDED.practice_id, participant_reason=EXCLUDED.participant_reason, selected_at=NOW(), updated_at=NOW()`, [row.id, row.current_week, id, String(req.body.participant_reason || "").slice(0, 1000) || null]); return { ok: true, practice_id: id }; }
async function submitReflection(pool, req) { const { row } = await requireYouthEnrollment(pool, req); const type = String(req.body.reflection_type || "before_practice"); const text = String(req.body.response_text || "").trim(); const visibility = String(req.body.visibility || "participant_and_facilitator"); if (!ALLOWED_REFLECTION_TYPES.has(type)) fail(400, "Invalid reflection type."); if (!ALLOWED_VISIBILITY.has(visibility)) fail(400, "Invalid visibility."); if (!text || text.length > 5000) fail(400, "response_text required and must be 5000 characters or fewer."); await pool.query(`INSERT INTO leader_within_reflections (enrollment_id,week_number,session_code,reflection_type,prompt_id,response_text,visibility) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [row.id, row.current_week, row.current_session, type, req.body.prompt_id || null, text, visibility]); return { ok: true }; }
async function submitSharedPerspective(pool, req) { const { row } = await requireYouthEnrollment(pool, req); const clean = (v) => String(v || "").slice(0, 2000) || null; await pool.query(`INSERT INTO leader_within_shared_perspectives (enrollment_id,week_number,perspective_heard,idea_to_consider,group_difference) VALUES ($1,$2,$3,$4,$5)`, [row.id, row.current_week, clean(req.body.perspective_heard), clean(req.body.idea_to_consider), clean(req.body.group_difference)]); return { ok: true }; }
async function facilitatorDashboard(pool, req) { const actor = trustedActorFromRequest(req); if (!isFacilitator(actor)) fail(403, "Your Leader Within facilitator account is not currently active."); const cohorts = (await pool.query(`SELECT c.*, t.slug tenant_slug, p.title program_title, COUNT(e.id)::int participant_count FROM leader_within_cohorts c JOIN tenants t ON t.id=c.tenant_id JOIN leader_within_programs p ON p.id=c.program_id LEFT JOIN leader_within_program_enrollments e ON e.cohort_id=c.id WHERE ($1::boolean OR (lower(t.slug)=lower($2) AND (EXISTS (SELECT 1 FROM leader_within_cohort_facilitators cf WHERE cf.cohort_id=c.id AND cf.facilitator_account_id=$5 AND cf.status='active' AND cf.removed_at IS NULL) OR c.assigned_facilitator_user_id=$4 OR EXISTS (SELECT 1 FROM leader_within_cohort_facilitators cf WHERE cf.cohort_id=c.id AND cf.facilitator_user_id=$4 AND cf.status='active' AND cf.removed_at IS NULL) OR (c.assigned_facilitator_user_id IS NULL AND lower(c.assigned_facilitator_email)=lower($3))))) GROUP BY c.id,t.slug,p.title ORDER BY c.id`, [actor.is_admin, actor.active_tenant_slug, actor.email, actor.user_id, actor.facilitator_account_id||0])).rows; return { ...facilitatorEmptyState(actor), metrics: { active_cohorts: cohorts.length, active_participants: cohorts.reduce((n,c)=>n+c.participant_count,0), current_week: 1, today_sessions: cohorts.length, check_ins_today: 0, reflections_awaiting_review: 0, missed_sessions: 0, follow_up_flags: 0, pocketpt_summaries_awaiting_review: 0 }, cohorts, plan: { session_title: "Session A — Learn the Story", learning_objective: weekOne().facilitator.objective, story_to_deliver: STORY_MAP.A, required_materials: ["Story card", "Practice bank", "Reflection prompts"], discussion_prompts: weekOne().stories[0].prompts, practice_options: weekOne().practiceBank.map(p=>p.title), what_to_observe: weekOne().facilitator.observe, what_not_to_do: weekOne().facilitator.notDo, completion_criteria: weekOne().completion, pocketpt_lens: "Observe leadership during safe individualized movement; do not prescribe a universal workout." } }; }
async function participantProfile(pool, req) { const actor = trustedActorFromRequest(req); const id = Number(req.params.participantId); let profile = await pool.query(`SELECT e.*, lp.id participant_record_id, lp.first_name, lp.last_name, lp.preferred_name, lp.status participant_status, lp.consent_status, pc.leader_id, pc.temporary credential_temporary, pc.must_change credential_must_change, pc.last_login_at, pc.locked_until, c.name cohort_name,c.location_id,c.assigned_facilitator_email,c.assigned_facilitator_user_id,t.slug tenant_slug,p.title program_title FROM leader_within_program_enrollments e JOIN leader_within_participants lp ON lp.id=e.leader_within_participant_id LEFT JOIN leader_within_participant_credentials pc ON pc.participant_id=lp.id AND pc.status='active' JOIN leader_within_cohorts c ON c.id=e.cohort_id JOIN tenants t ON t.id=e.tenant_id JOIN leader_within_programs p ON p.id=e.program_id WHERE lp.id=$1 LIMIT 1`, [id]); if (!profile.rows[0]) profile = await pool.query(`SELECT e.*, u.email,u.name,c.name cohort_name,c.location_id,c.assigned_facilitator_email,t.slug tenant_slug,p.title program_title FROM leader_within_program_enrollments e JOIN users u ON u.id=e.participant_id JOIN leader_within_cohorts c ON c.id=e.cohort_id JOIN tenants t ON t.id=e.tenant_id JOIN leader_within_programs p ON p.id=e.program_id WHERE e.participant_id=$1 LIMIT 1`, [id]); if (!profile.rows[0]) fail(404, "Not found"); await assertFacilitatorForCohortAsync(pool, actor, profile.rows[0]); const enrollmentId = profile.rows[0].id; const [snapshots, practices, reflections, progress, pocketpt, notes] = await Promise.all([ pool.query(`SELECT completed_at,primary_archetype,supporting_archetype,approved_strength_summary,approved_growth_summary,assessment_version,checkpoint_type FROM leader_within_assessment_snapshots WHERE enrollment_id=$1 ORDER BY id DESC`, [enrollmentId]), pool.query(`SELECT week_number,practice_id,participant_reason,attempted_at,status,reflection_summary FROM leader_within_practice_selections WHERE enrollment_id=$1 ORDER BY week_number`, [enrollmentId]), pool.query(`SELECT week_number,session_code,reflection_type,prompt_id,response_text,visibility,submitted_at FROM leader_within_reflections WHERE enrollment_id=$1 AND visibility='participant_and_facilitator' ORDER BY submitted_at DESC`, [enrollmentId]), pool.query(`SELECT week_number,session_code,status,checked_in_at,completed_at FROM leader_within_session_progress WHERE enrollment_id=$1 ORDER BY week_number,session_code`, [enrollmentId]), pool.query(`SELECT week_number,session_code,assignment_status,completion_status,completed_at,effort_check_status,recovery_check_status,approved_coaching_summary,follow_up_flag FROM leader_within_pocketpt_activity_summaries WHERE enrollment_id=$1`, [enrollmentId]), pool.query(`SELECT note_type,note_text,visibility,created_at FROM leader_within_facilitator_notes WHERE enrollment_id=$1 ORDER BY created_at DESC`, [enrollmentId]) ]); return { overview: profile.rows[0], leadership_profile: { label: "Patterns shown at each checkpoint", snapshots: snapshots.rows }, practice_history: practices.rows, reflection_history: reflections.rows, participation: progress.rows, pocketpt_summary: pocketpt.rows, facilitator_notes: notes.rows }; }
async function facilitatorControl(pool, req) { const actor = trustedActorFromRequest(req); const enrollmentId = Number(req.params.enrollmentId); const e = (await pool.query(`SELECT e.*,c.assigned_facilitator_email,c.alternate_story_title,t.slug tenant_slug FROM leader_within_program_enrollments e JOIN leader_within_cohorts c ON c.id=e.cohort_id JOIN tenants t ON t.id=e.tenant_id WHERE e.id=$1`, [enrollmentId])).rows[0]; if (!e) fail(404, "Not found"); assertFacilitatorForCohort(actor, e); const action = String(req.body.action || "open"); const session = String(req.body.session_code || e.current_session || "A").toUpperCase(); if (!ALLOWED_SESSION_ACTIONS.has(action)) fail(400, "Invalid session action."); if (!SESSION_ORDER.includes(session)) fail(400, "Invalid session code."); if (req.body.alternate_story_title && ![...Object.values(STORY_MAP), ...OPTIONAL_STORIES].includes(req.body.alternate_story_title)) fail(400, "Invalid story title."); const status = action === "reopen" ? "available" : action === "make_up" ? "missed" : action === "complete" ? "completed" : "available"; await pool.query(`INSERT INTO leader_within_session_progress (enrollment_id,week_number,session_code,status,opened_at,completed_at,completed_by) VALUES ($1,$2,$3,$4,NOW(),CASE WHEN $4='completed' THEN NOW() ELSE NULL END,$5) ON CONFLICT (enrollment_id,week_number,session_code) DO UPDATE SET status=EXCLUDED.status, opened_at=COALESCE(leader_within_session_progress.opened_at,NOW()), completed_at=EXCLUDED.completed_at, completed_by=EXCLUDED.completed_by, updated_at=NOW()`, [enrollmentId, e.current_week, session, status, actor.email]); if (req.body.alternate_story_title) await pool.query(`UPDATE leader_within_cohorts SET alternate_story_title=$1, updated_at=NOW() WHERE id=$2`, [req.body.alternate_story_title, e.cohort_id]); return { ok: true, status }; }
async function addNote(pool, req) { const actor = trustedActorFromRequest(req); const profile = await participantProfile(pool, req); const note = String(req.body.note_text || "").trim(); const noteType = String(req.body.note_type || "private_facilitator_note"); if (!ALLOWED_NOTE_TYPES.has(noteType)) fail(400, "Invalid note type."); if (!note || note.length > 5000) fail(400, "note_text required and must be 5000 characters or fewer."); await pool.query(`INSERT INTO leader_within_facilitator_notes (participant_id,cohort_id,enrollment_id,author_id,note_type,note_text,visibility) VALUES ($1,$2,$3,$4,$5,$6,'facilitator_private')`, [profile.overview.participant_id, profile.overview.cohort_id, profile.overview.id, actor.user_id, noteType, note]); return { ok: true }; }

function createPasswordHash(secret){ const salt=crypto.randomBytes(16).toString("hex"); const derived=crypto.scryptSync(String(secret),salt,64).toString("hex"); return `scrypt$${salt}$${derived}`; }
function verifyPasswordHash(secret, hash){ const [scheme,salt,stored]=String(hash||"").split("$"); if(scheme!=="scrypt"||!salt||!stored) return false; const derived=crypto.scryptSync(String(secret),salt,64).toString("hex"); const a=Buffer.from(stored,"hex"), b=Buffer.from(derived,"hex"); return a.length===b.length && crypto.timingSafeEqual(a,b); }
function hashToken(v){ return crypto.createHash("sha256").update(String(v||"")).digest("hex"); }

function parseCookieHeader(rawCookie = "") {
  return parseCookiePairs(rawCookie).reduce((acc, part) => { acc[part.name] = part.value; return acc; }, {});
}
function parseCookiePairs(rawCookie = "") {
  return String(rawCookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return null;
    try { return { name: decodeURIComponent(part.slice(0, idx).trim()), value: decodeURIComponent(part.slice(idx + 1)) }; } catch { return null; }
  }).filter(Boolean);
}
function cookieValues(rawCookie, name) { return parseCookiePairs(rawCookie).filter((p) => p.name === name).map((p, index) => ({ value: String(p.value || "").trim(), index })).filter((p) => p.value); }
function csrfTokenForSessionHash(tokenHash) { return crypto.createHmac("sha256", String(process.env.SESSION_SECRET || process.env.LEADER_WITHIN_SESSION_SECRET || "leader-within-dev-secret")).update(String(tokenHash)).digest("hex"); }
function csrfTokenForRequest(req) { return req.leaderWithinYouthActor?.csrf_token || null; }
async function resolveYouthSession(pool, req) {
  const token = String(parseCookieHeader(req.headers?.cookie || "")[YOUTH_COOKIE] || "").trim();
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = (await pool.query(`SELECT s.id participant_session_id,s.participant_id,s.enrollment_id active_enrollment_id,s.credential_version session_credential_version,s.expires_at,s.revoked_at,p.tenant_id,p.status participant_status,p.consent_status,pc.credential_version current_credential_version,e.status enrollment_status,c.id cohort_id,t.slug tenant_slug FROM leader_within_participant_sessions s JOIN leader_within_participants p ON p.id=s.participant_id JOIN leader_within_participant_credentials pc ON pc.participant_id=p.id AND pc.status='active' JOIN leader_within_program_enrollments e ON e.id=s.enrollment_id AND e.leader_within_participant_id=p.id JOIN leader_within_cohorts c ON c.id=e.cohort_id JOIN tenants t ON t.id=p.tenant_id WHERE s.token_hash=$1 LIMIT 1`, [tokenHash])).rows[0];
  if (!row || row.revoked_at || new Date(row.expires_at) <= new Date() || row.participant_status !== "active" || row.enrollment_status !== "active" || Number(row.session_credential_version) !== Number(row.current_credential_version) || !consentAllowsAccess(row.consent_status)) return null;
  return { participant_id:Number(row.participant_id), participant_session_id:Number(row.participant_session_id), tenant_id:Number(row.tenant_id), active_tenant_id:Number(row.tenant_id), active_tenant_slug:norm(row.tenant_slug), tenant_memberships:[{tenant_id:Number(row.tenant_id),tenant_slug:norm(row.tenant_slug),role:"youth_participant"}], active_enrollment_id:Number(row.active_enrollment_id), credential_version:Number(row.current_credential_version), authenticated:true, actor_type:"youth_participant", role:"youth_participant", is_admin:false, is_superadmin:false, csrf_token:csrfTokenForSessionHash(tokenHash) };
}
async function revokeYouthSession(pool, req) { const token=String(parseCookieHeader(req.headers?.cookie || "")[YOUTH_COOKIE] || "").trim(); if (!token) return false; await pool.query(`UPDATE leader_within_participant_sessions SET revoked_at=NOW(), updated_at=NOW() WHERE token_hash=$1 AND revoked_at IS NULL`, [hashToken(token)]); return true; }
function consentAllowsAccess(status) { return ["approved", "granted", "organization_covered", "not_required", "not_required_by_policy", "guardian_consented", "participant_assented", "synthetic_approved"].includes(norm(status)); }
function validateConsentStatus(status) { const s=norm(status || "pending"); if(!CONSENT_STATES.has(s) && !["granted","organization_covered"].includes(s)) fail(400, "Invalid consent_status."); return s; }
function generateLeaderId(){ const alphabet="23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; let out=""; for(let i=0;i<6;i++) out+=alphabet[crypto.randomInt(alphabet.length)]; return `LW-${out}`; }
function generateTemporaryPin(){ return String(crypto.randomInt(100000,1000000)); }
function normalizeLeaderId(v){ return String(v||"").trim().toUpperCase().replace(/\s+/g,""); }
function youthSessionCookieOptions(){ return { httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/the-leader-within", maxAge:YOUTH_SESSION_TTL_MS }; }
function buildYouthSessionCookie(req, token, maxAgeMs=YOUTH_SESSION_TTL_MS, path="/the-leader-within"){ const secure=!!(req.secure||String(req.headers?.["x-forwarded-proto"]||"").toLowerCase()==="https"||process.env.NODE_ENV==="production"); return `${YOUTH_COOKIE}=${encodeURIComponent(token||"")}; Path=${path}; HttpOnly; SameSite=${secure?"None":"Lax"}${secure?"; Secure":""}; Max-Age=${Math.max(0,Math.floor(Number(maxAgeMs||0)/1000))}`; }
function clearAllYouthCookies(req){ return ["/the-leader-within","/the-leader-within/","/"].map((path)=>buildYouthSessionCookie(req,"",0,path)); }
async function audit(pool, event_type, data={}){ await pool.query(`INSERT INTO leader_within_audit_events (tenant_id,actor_user_id,participant_id,cohort_id,event_type,metadata) VALUES ($1,$2,$3,$4,$5,$6)`, [data.tenant_id||null,data.actor_user_id||null,data.participant_id||null,data.cohort_id||null,event_type,JSON.stringify(data.metadata||{})]); }
async function isAssignedFacilitator(pool, actor, cohort){ if(actor.is_admin) return true; if(norm(cohort.tenant_slug)!==actor.active_tenant_slug) return false; const stable=(await pool.query(`SELECT 1 FROM leader_within_cohort_facilitators WHERE cohort_id=$1 AND tenant_id=$2 AND ((facilitator_user_id IS NOT NULL AND facilitator_user_id=$3) OR (facilitator_account_id IS NOT NULL AND facilitator_account_id=$4)) AND status='active' AND removed_at IS NULL LIMIT 1`, [cohort.id, cohort.tenant_id, actor.user_id, actor.facilitator_account_id||0])).rows[0]; if(stable) return true; if(cohort.assigned_facilitator_user_id && Number(cohort.assigned_facilitator_user_id)===Number(actor.user_id)) return true; return !cohort.assigned_facilitator_user_id && cohort.assigned_facilitator_email && norm(cohort.assigned_facilitator_email)===actor.email; }
async function assertFacilitatorForCohortAsync(pool, actor, cohort){ if(!isFacilitator(actor)) fail(403,"Facilitator role required."); if(!(await isAssignedFacilitator(pool,actor,cohort))) fail(403,"Facilitator is not assigned to this cohort."); }
async function addParticipant(pool, req){ const actor=trustedActorFromRequest(req); const cohortId=Number(req.params.cohortId); let client=pool; let tx=false; let stage="begin"; try{ if(pool.connect){ client=await pool.connect(); await client.query("BEGIN"); tx=true; } stage="cohort_lookup"; const cohort=(await client.query(`SELECT c.*,t.slug tenant_slug FROM leader_within_cohorts c JOIN tenants t ON t.id=c.tenant_id WHERE c.id=$1 FOR UPDATE`,[cohortId])).rows[0]; if(!cohort) safePublicError(404,"cohort_not_found","The cohort was not found.",stage); stage="authorization"; await assertFacilitatorForCohortAsync(client,actor,cohort); const b=req.body||{}; const first=String(b.first_name||"").trim(), last=String(b.last_name||"").trim(), preferred=String(b.preferred_name||b.nickname||"").trim(); if(!first||!last||!preferred) safePublicError(400,"invalid_participant_data","First name, last name, and preferred name are required.","validation"); const consent=validateConsentStatus(String(b.consent_status||"pending_guardian_consent").trim().toLowerCase()); if(!consentAllowsAccess(consent)) safePublicError(400,"consent_required","Consent must be recorded before active enrollment.","consent_validation"); stage="duplicate_check"; let dup=null; try{ dup=(await client.query(`SELECT lp.id FROM leader_within_participants lp JOIN leader_within_program_enrollments e ON e.leader_within_participant_id=lp.id WHERE e.cohort_id=$1 AND lower(lp.first_name)=lower($2) AND lower(lp.last_name)=lower($3) AND e.status='active' LIMIT 1`,[cohort.id,first,last])).rows[0]; }catch(e){ if(e && (e.code||e.constraint)) throw e; } if(dup && String(b.confirm_possible_duplicate||"")!=="yes") safePublicError(409,"participant_already_enrolled","A similar participant may already exist in this cohort.",stage); stage="participant_insert"; const participant=(await client.query(`INSERT INTO leader_within_participants (tenant_id,location_id,first_name,last_name,preferred_name,nickname,status,consent_status,consent_recorded_at,consent_source,consent_recorded_by_user_id,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,'active',$7,NOW(),$8,$9,$9) RETURNING *`,[cohort.tenant_id,cohort.location_id,first,last,preferred,String(b.preferred_name||"").trim()||null,consent,String(b.consent_source||"facilitator_recorded").slice(0,80),actor.user_id])).rows[0]; stage="leader_id_generation"; let cred=null, leaderId=null, pin=generateTemporaryPin(); for(let i=0;i<10;i++){ leaderId=generateLeaderId(); try{ cred=(await client.query(`INSERT INTO leader_within_participant_credentials (participant_id,leader_id,secret_hash,secret_type,temporary,must_change,status) VALUES ($1,$2,$3,'pin',TRUE,TRUE,'active') RETURNING id,leader_id,temporary,must_change,status`,[participant.id,leaderId,createPasswordHash(pin)])).rows[0]; break; }catch(e){ if(String(e.code)!=='23505'||i===9) throw e; } } if(!cred) safePublicError(500,"leader_id_generation_failed","The Leader ID could not be generated.",stage); stage="enrollment_insert"; const program=(await client.query(`SELECT id FROM leader_within_programs WHERE slug=$1`,[PROGRAM_SLUG])).rows[0]; const enrollment=(await client.query(`INSERT INTO leader_within_program_enrollments (participant_id,leader_within_participant_id,program_id,cohort_id,tenant_id,location_id,start_date,status,current_week,current_session,created_by_user_id) VALUES (NULL,$1,$2,$3,$4,$5,$6,'active',$7,$8,$9) RETURNING *`,[participant.id,program.id,cohort.id,cohort.tenant_id,cohort.location_id,b.start_date||cohort.start_date||null,cohort.current_week||1,cohort.current_session||"A",actor.user_id])).rows[0]; await client.query(`INSERT INTO leader_within_session_progress (enrollment_id,week_number,session_code,status,opened_at) VALUES ($1,$2,$3,'available',NOW()) ON CONFLICT DO NOTHING`,[enrollment.id,enrollment.current_week,enrollment.current_session]); stage="audit"; await audit(client,"participant_created",{tenant_id:cohort.tenant_id,actor_user_id:actor.user_id,participant_id:participant.id,cohort_id:cohort.id,metadata:{leader_id:cred.leader_id,enrollment_id:enrollment.id,credential_issued:true}}); await audit(client,"participant_enrolled",{tenant_id:cohort.tenant_id,actor_user_id:actor.user_id,participant_id:participant.id,cohort_id:cohort.id,metadata:{enrollment_id:enrollment.id,current_week:enrollment.current_week,current_session:enrollment.current_session}}); if(tx) await client.query("COMMIT"); return { ok:true, participant:{id:participant.id,first_name:first,last_name:last,preferred_name:preferred,status:participant.status,consent_status:consent}, enrollment:{id:enrollment.id,status:enrollment.status,current_week:enrollment.current_week,current_session:enrollment.current_session}, credential_setup_card:{program:"THE LEADER WITHIN",preferred_name:preferred,cohort_name:cohort.name,leader_id:cred.leader_id,temporary_pin:pin,start_here:"/the-leader-within/sign-in",expires_at:null,warning:"This temporary credential is shown only once. Store or deliver it securely."} }; }catch(e){ if(tx) await client.query("ROLLBACK").catch(()=>{}); if(!e.status){ e.status=500; e.code=e.code||"persistence_failed"; e.message="The participant could not be saved. No partial changes were committed."; } e.stage=e.stage||stage; e.rolled_back=true; throw e; } finally { if(tx && client.release) client.release(); } }
async function signInYouth(pool, req){ const leaderId=normalizeLeaderId(req.body?.leader_id); const secret=String(req.body?.secret||req.body?.pin||req.body?.password||""); const generic="We could not sign you in with those details."; const cred=(await pool.query(`SELECT pc.*,p.tenant_id,p.status participant_status,p.consent_status,e.id enrollment_id,e.status enrollment_status FROM leader_within_participant_credentials pc JOIN leader_within_participants p ON p.id=pc.participant_id JOIN leader_within_program_enrollments e ON e.leader_within_participant_id=p.id WHERE lower(pc.leader_id)=lower($1) LIMIT 1`,[leaderId])).rows[0]; if(!cred||cred.status!=="active"||cred.participant_status!=="active"||cred.enrollment_status!=="active"||(cred.consent_status && !consentAllowsAccess(cred.consent_status))) fail(401,generic); if(cred.locked_until && new Date(cred.locked_until)>new Date()) fail(423,generic); if(!verifyPasswordHash(secret,cred.secret_hash)){ const attempts=Number(cred.failed_attempts||0)+1; await pool.query(`UPDATE leader_within_participant_credentials SET failed_attempts=$1, locked_until=CASE WHEN $1>=5 THEN NOW()+INTERVAL '15 minutes' ELSE locked_until END, updated_at=NOW() WHERE id=$2`,[attempts,cred.id]); if(attempts>=5) await audit(pool,"account_locked",{tenant_id:cred.tenant_id,participant_id:cred.participant_id,metadata:{leader_id:cred.leader_id}}); fail(401,generic); }
 await pool.query(`UPDATE leader_within_participant_credentials SET failed_attempts=0,last_login_at=NOW(),updated_at=NOW() WHERE id=$1`,[cred.id]); const token=crypto.randomBytes(32).toString("hex"); await pool.query(`INSERT INTO leader_within_participant_sessions (participant_id,enrollment_id,token_hash,credential_version,expires_at) VALUES ($1,$2,$3,$4,NOW()+INTERVAL '8 hours')`,[cred.participant_id,cred.enrollment_id,hashToken(token),cred.credential_version]); return { ok:true, route: cred.must_change?"/the-leader-within/first-login":"/the-leader-within/my-program", must_change:!!cred.must_change, token, cookie:YOUTH_COOKIE, cookie_options:youthSessionCookieOptions() }; }
async function firstLogin(pool, req){ const leaderId=normalizeLeaderId(req.body?.leader_id); const oldSecret=String(req.body?.temporary_secret||""); const next=String(req.body?.new_secret||""); if(next.length<6||next!==String(req.body?.confirm_secret||"")) fail(400,"New sign-in code confirmation does not match."); const cred=(await pool.query(`SELECT pc.*, e.id enrollment_id FROM leader_within_participant_credentials pc LEFT JOIN leader_within_program_enrollments e ON e.leader_within_participant_id=pc.participant_id AND e.status='active' WHERE lower(pc.leader_id)=lower($1) AND pc.status='active' LIMIT 1`,[leaderId])).rows[0]; if(!cred||!cred.must_change||!verifyPasswordHash(oldSecret,cred.secret_hash)) fail(401,"We could not sign you in with those details."); await pool.query(`UPDATE leader_within_participant_credentials SET secret_hash=$1, temporary=FALSE, must_change=FALSE, failed_attempts=0, locked_until=NULL, credential_version=credential_version+1, updated_at=NOW() WHERE id=$2`,[createPasswordHash(next),cred.id]); await pool.query(`UPDATE leader_within_participant_sessions SET revoked_at=NOW(), updated_at=NOW() WHERE participant_id=$1 AND revoked_at IS NULL`,[cred.participant_id]); await audit(pool,"first_login_completed",{participant_id:cred.participant_id,metadata:{leader_id:cred.leader_id}}); const token=crypto.randomBytes(32).toString("hex"); await pool.query(`INSERT INTO leader_within_participant_sessions (participant_id,enrollment_id,token_hash,credential_version,expires_at) VALUES ($1,$2,$3,(SELECT credential_version FROM leader_within_participant_credentials WHERE id=$4),NOW()+INTERVAL '8 hours')`,[cred.participant_id,cred.enrollment_id,hashToken(token),cred.id]); return {ok:true, route:"/the-leader-within/my-program", token, cookie:YOUTH_COOKIE, cookie_options:youthSessionCookieOptions()}; }

function normalizeIdentity(value){ return norm(value); }
function buildCookie(req, name, token, maxAgeSeconds, path="/"){ const forwardedProto=String(req.headers["x-forwarded-proto"]||"").trim().toLowerCase(); const isSecure=req.secure||forwardedProto==="https"||process.env.NODE_ENV==="production"; const sameSite=isSecure?"None":"Lax"; return `${name}=${encodeURIComponent(token)}; Path=${path}; HttpOnly; SameSite=${sameSite}${isSecure?"; Secure":""}; Max-Age=${Math.max(0,Number(maxAgeSeconds)||0)}`; }
function buildTrustedSessionCookie(req, token, maxAgeSeconds){ return buildCookie(req,"garvey_owner_session",token,maxAgeSeconds,"/"); }
function getLeaderWithinFacilitatorCookieOptions(req, maxAgeSeconds=Math.floor(FACILITATOR_SESSION_TTL_MS/1000), path=FACILITATOR_COOKIE_CANONICAL_PATH){ const forwardedProto=String(req.headers["x-forwarded-proto"]||"").trim().toLowerCase(); const secure=!!(req.secure||forwardedProto==="https"||process.env.NODE_ENV==="production"); return { path, httpOnly:true, secure, sameSite:secure?"None":"Lax", maxAge:Math.max(0,Number(maxAgeSeconds)||0) }; }
function serializeFacilitatorCookie(req, token, maxAgeSeconds, path=FACILITATOR_COOKIE_CANONICAL_PATH){ return buildCookie(req,FACILITATOR_COOKIE,token,maxAgeSeconds,path); }
function buildFacilitatorSessionCookie(req, token, maxAgeSeconds){ return serializeFacilitatorCookie(req,token,maxAgeSeconds,FACILITATOR_COOKIE_CANONICAL_PATH); }
function clearFacilitatorSessionCookie(req){ return buildFacilitatorSessionCookie(req,"",0); }
function clearAllLeaderWithinFacilitatorCookies(req){ return FACILITATOR_COOKIE_LEGACY_PATHS.map((path)=>serializeFacilitatorCookie(req,"",0,path)); }
function setLeaderWithinFacilitatorCookie(req, token){ return [...clearAllLeaderWithinFacilitatorCookies(req), buildFacilitatorSessionCookie(req,token,Math.floor(FACILITATOR_SESSION_TTL_MS/1000))]; }
function normalizeFacilitatorIdentity(value){ return String(value||"").trim().toLowerCase(); }
async function lookupFacilitatorSessionByToken(pool, token){
  const tokenHash=hashToken(token);
  const row=(await pool.query(`SELECT s.id session_id,s.facilitator_account_id,s.tenant_id,s.credential_version session_credential_version,s.expires_at,s.revoked_at,a.email,a.facilitator_id,a.first_name,a.last_name,a.preferred_name,a.role,a.status account_status,a.credential_version current_credential_version,a.linked_garvey_user_id,t.slug tenant_slug FROM leader_within_facilitator_sessions s JOIN leader_within_facilitator_accounts a ON a.id=s.facilitator_account_id JOIN tenants t ON t.id=s.tenant_id WHERE s.token_hash=$1 LIMIT 1`,[tokenHash])).rows[0];
  if(!row || row.revoked_at || new Date(row.expires_at)<=new Date() || row.account_status!=="active" || Number(row.session_credential_version)!==Number(row.current_credential_version)) return null;
  return { row, tokenHash };
}
async function actorFromFacilitatorSessionRow(pool, row, tokenHash, sourceIndex=0){
  await pool.query(`UPDATE leader_within_facilitator_sessions SET last_seen_at=NOW(), updated_at=NOW() WHERE id=$1`,[row.session_id]).catch(()=>{});
  let canonicalEmail = norm(row.email);
  let garveyAdmin = false;
  if(row.linked_garvey_user_id){
    const linked=(await pool.query(`SELECT id,email FROM users WHERE id=$1 LIMIT 1`,[row.linked_garvey_user_id])).rows[0]||null;
    canonicalEmail = norm(linked?.email || row.email);
    garveyAdmin = !!linked && isAdminEmail(canonicalEmail);
    if(linked && canonicalEmail && canonicalEmail !== norm(row.email) && !["suspended","disabled","archived"].includes(norm(row.account_status))){
      await reconcileLinkedGarveyAdminFacilitator(pool,{ user_id: linked.id, email: canonicalEmail });
    }
  }
  const roleAdmin=["super_admin","program_admin","administrator","program_director"].includes(row.role);
  const displayName=row.preferred_name||[row.first_name,row.last_name].filter(Boolean).join(" ")||canonicalEmail||row.facilitator_id;
  return { authenticated:true, actor_type:"leader_within_facilitator", facilitator_account_id:Number(row.facilitator_account_id), linked_garvey_user_id:row.linked_garvey_user_id ? Number(row.linked_garvey_user_id) : null, user_id:Number(row.linked_garvey_user_id||0) || Number(row.facilitator_account_id), email:canonicalEmail, canonical_email:canonicalEmail, facilitator_id:row.facilitator_id, display_name:displayName, account_status:row.account_status, facilitator_role:row.role, tenant_id:Number(row.tenant_id), active_tenant_id:Number(row.tenant_id), active_tenant_slug:norm(row.tenant_slug), tenant_memberships:[{tenant_id:Number(row.tenant_id),tenant_slug:norm(row.tenant_slug),role:row.role}], role:row.role, is_admin:roleAdmin || garveyAdmin, is_superadmin:row.role==="super_admin" || garveyAdmin, canonical_garvey_admin:garveyAdmin, csrf_token:csrfTokenForSessionHash(tokenHash), session_cookie_source_index:sourceIndex };
}
async function resolveFacilitatorSession(pool, req){
  const candidates=cookieValues(req.headers?.cookie||"", FACILITATOR_COOKIE);
  req.tlwCookieDiagnostics={ raw_cookie_present: !!req.headers?.cookie, tlw_cookie_count: candidates.length, parsed_candidate_count: candidates.length, parsed_cookie_present: candidates.length>0, valid_session_found:false, matched_session_token_source_index:null };
  for(const candidate of candidates){
    const match=await lookupFacilitatorSessionByToken(pool, candidate.value);
    if(!match) continue;
    req.tlwCookieDiagnostics.valid_session_found=true;
    req.tlwCookieDiagnostics.matched_session_token_source_index=candidate.index;
    return actorFromFacilitatorSessionRow(pool, match.row, match.tokenHash, candidate.index);
  }
  return null;
}
async function reconcileLinkedGarveyAdminFacilitator(pool, garveyAccount){
  const actor=resolveGarveyAuthActor(garveyAccount);
  const email=norm(actor?.email);
  if(!actor?.userId || !email || !email.includes("@") || !actor.isAdmin) fail(401,"We could not sign you in with those details.");
  const matches=(await pool.query(`SELECT * FROM leader_within_facilitator_accounts WHERE linked_garvey_user_id=$1 OR normalized_email=$2 ORDER BY id FOR UPDATE`,[actor.userId,email])).rows;
  const byLinked=matches.filter(a=>Number(a.linked_garvey_user_id)===Number(actor.userId));
  const ambiguous=matches.filter(a=>Number(a.linked_garvey_user_id||0)!==Number(actor.userId) && norm(a.normalized_email)===email);
  if(byLinked.length>1 || ambiguous.length){ await audit(pool,"garvey_admin_facilitator_link_ambiguous_rejected",{actor_user_id:actor.userId,metadata:{match_count:matches.length}}); fail(401,"We could not sign you in with those details."); }
  const account=byLinked[0] || matches.find(a=>norm(a.normalized_email)===email) || null;
  if(!account) return null;
  if(["suspended","disabled","archived"].includes(norm(account.status))) return account;
  const repaired=await pool.query(`UPDATE leader_within_facilitator_accounts SET linked_garvey_user_id=$1, email=$2, normalized_email=$2, status=CASE WHEN status IN ('invited','setup_pending') THEN 'active' ELSE status END, role=CASE WHEN role IN ('super_admin','program_admin') THEN role ELSE 'super_admin' END, must_change_password=FALSE, setup_token_hash=NULL, setup_token_expires_at=NULL, approved_by_user_id=COALESCE(approved_by_user_id,$1), approved_at=COALESCE(approved_at,NOW()), updated_at=NOW() WHERE id=$3 RETURNING *`,[actor.userId,email,account.id]);
  await audit(pool,"garvey_admin_facilitator_identity_reconciled",{tenant_id:repaired.rows[0]?.tenant_id,actor_user_id:actor.userId,metadata:{facilitator_account_id:account.id, repaired_email:norm(account.email)!==email || norm(account.normalized_email)!==email}});
  return repaired.rows[0];
}
function facilitatorDashboardRoute(account){ return ["super_admin","program_admin","program_director"].includes(norm(account?.role)) ? "/admin/the-leader-within" : "/the-leader-within/facilitator/dashboard"; }
async function issueFacilitatorSession(pool, req, account, eventPrefix="facilitator"){
  await pool.query(`UPDATE leader_within_facilitator_accounts SET failed_attempts=0,last_login_at=NOW(),updated_at=NOW() WHERE id=$1`,[account.id]);
  const token=crypto.randomBytes(32).toString("hex");
  await pool.query(`INSERT INTO leader_within_facilitator_sessions (facilitator_account_id,tenant_id,token_hash,credential_version,expires_at,user_agent_hash,ip_hash) VALUES ($1,$2,$3,$4,NOW()+($5 || ' milliseconds')::interval,$6,$7)`,[account.id,account.tenant_id,hashToken(token),account.credential_version,String(FACILITATOR_SESSION_TTL_MS),hashToken(req.headers["user-agent"]||""),hashToken(req.ip||"")]);
  await audit(pool,"facilitator_session_created",{tenant_id:account.tenant_id,actor_user_id:account.linked_garvey_user_id,metadata:{facilitator_account_id:account.id,source:eventPrefix}});
  return {ok:true,set_cookie:setLeaderWithinFacilitatorCookie(req,token),role:account.role,must_change_password:!!account.must_change_password,next_route:facilitatorDashboardRoute(account)};
}
async function findFacilitatorAccount(pool, identity){
  return (await pool.query(`SELECT a.*,t.slug tenant_slug FROM leader_within_facilitator_accounts a JOIN tenants t ON t.id=a.tenant_id WHERE lower(a.normalized_email)=$1 OR lower(a.facilitator_id)=$1 ORDER BY a.id DESC LIMIT 1`,[identity])).rows[0];
}
async function bootstrapGarveyAdminFacilitator(pool, garveyAccount){
  const actor=resolveGarveyAuthActor(garveyAccount);
  const email=norm(actor?.email);
  if(!actor?.isAdmin){ await audit(pool,"garvey_admin_fallback_rejected",{actor_user_id:garveyAccount?.user_id||null,metadata:{reason:"not_admin"}}); fail(401,"We could not sign you in with those details."); }
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await client.query(`LOCK TABLE leader_within_facilitator_accounts IN SHARE ROW EXCLUSIVE MODE`);
    const matches=(await client.query(`SELECT * FROM leader_within_facilitator_accounts WHERE normalized_email=$1 OR linked_garvey_user_id=$2 ORDER BY id FOR UPDATE`,[email,actor.userId])).rows;
    const linkedMatches=matches.filter(a=>Number(a.linked_garvey_user_id)===Number(actor.userId));
    const conflicting=matches.filter(a=>Number(a.linked_garvey_user_id||0)!==Number(actor.userId) && norm(a.normalized_email)===email);
    if(linkedMatches.length>1 || conflicting.length){ await audit(client,"garvey_admin_facilitator_link_ambiguous_rejected",{actor_user_id:actor.userId,metadata:{match_count:matches.length}}); await client.query("ROLLBACK"); fail(401,"We could not sign you in with those details."); }
    let account=linkedMatches[0] || matches.find(a=>norm(a.normalized_email)===email);
    if(account && ["suspended","disabled","archived"].includes(norm(account.status))){ await audit(client,"garvey_admin_linked_facilitator_blocked",{tenant_id:account.tenant_id,actor_user_id:actor.userId,metadata:{facilitator_account_id:account.id,status:account.status}}); await client.query("ROLLBACK"); fail(401,"We could not sign you in with those details."); }
    if(account){
      account=(await client.query(`UPDATE leader_within_facilitator_accounts SET linked_garvey_user_id=$1, email=$2, normalized_email=$2, status=CASE WHEN status IN ('invited','setup_pending') THEN 'active' ELSE status END, role=CASE WHEN role IN ('super_admin','program_admin') THEN role ELSE 'super_admin' END, must_change_password=FALSE, setup_token_hash=NULL, setup_token_expires_at=NULL, approved_by_user_id=COALESCE(approved_by_user_id,$1), approved_at=COALESCE(approved_at,NOW()), updated_at=NOW() WHERE id=$3 RETURNING *`,[actor.userId,email,account.id])).rows[0];
      await audit(client,"garvey_admin_facilitator_account_linked",{tenant_id:account.tenant_id,actor_user_id:actor.userId,metadata:{facilitator_account_id:account.id}});
    } else {
      const tenantId=actor.tenantId || (await defaultLeaderWithinTenant(client)).id;
      const fid=`TLW-F-${crypto.randomBytes(5).toString("hex").toUpperCase()}`;
      const name=String(garveyAccount.name||"").trim(); const parts=name.split(/\s+/).filter(Boolean);
      account=(await client.query(`INSERT INTO leader_within_facilitator_accounts (tenant_id,linked_garvey_user_id,facilitator_id,email,normalized_email,password_hash,first_name,last_name,preferred_name,status,role,must_change_password,created_by_user_id,approved_by_user_id,approved_at) VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,'active','super_admin',FALSE,$2,$2,NOW()) ON CONFLICT (tenant_id, normalized_email) DO UPDATE SET linked_garvey_user_id=COALESCE(leader_within_facilitator_accounts.linked_garvey_user_id,EXCLUDED.linked_garvey_user_id), role=CASE WHEN leader_within_facilitator_accounts.role IN ('super_admin','program_admin') THEN leader_within_facilitator_accounts.role ELSE 'super_admin' END, status=CASE WHEN leader_within_facilitator_accounts.status IN ('invited','setup_pending') THEN 'active' ELSE leader_within_facilitator_accounts.status END, must_change_password=FALSE, approved_by_user_id=COALESCE(leader_within_facilitator_accounts.approved_by_user_id,EXCLUDED.approved_by_user_id), approved_at=COALESCE(leader_within_facilitator_accounts.approved_at,NOW()), updated_at=NOW() RETURNING *`,[tenantId,actor.userId,fid,email,createPasswordHash(crypto.randomBytes(24).toString("hex")),parts[0]||null,parts.slice(1).join(" ")||null,parts[0]||null])).rows[0];
      await audit(client,"garvey_admin_facilitator_account_auto_created",{tenant_id:account.tenant_id,actor_user_id:actor.userId,metadata:{facilitator_account_id:account.id,linked_garvey_user_id:actor.userId,role:account.role}});
    }
    await audit(client,"garvey_admin_authenticated_through_leader_within_sign_in",{tenant_id:account.tenant_id,actor_user_id:actor.userId,metadata:{facilitator_account_id:account.id}});
    await client.query("COMMIT");
    return account;
  } catch(e){ try{ await client.query("ROLLBACK"); }catch(_){} throw e; }
  finally{ client.release(); }
}
async function signInFacilitator(pool, req){
  const generic="We could not sign you in with those details.";
  const identity=normalizeFacilitatorIdentity(req.body?.identity||req.body?.email||req.body?.facilitator_id);
  const password=String(req.body?.password||"");
  if(!identity||!password) fail(401,generic);
  const account=await findFacilitatorAccount(pool,identity);
  if(account){
    if(account.locked_until && new Date(account.locked_until)>new Date()) fail(423,generic);
    if(["suspended","disabled","archived"].includes(norm(account.status))){ await audit(pool,"facilitator_sign_in_blocked_inactive",{tenant_id:account.tenant_id,actor_user_id:account.linked_garvey_user_id,metadata:{facilitator_account_id:account.id,status:account.status}}); fail(401,generic); }
    if(account.status==="active" && account.password_hash && verifyPasswordHash(password,account.password_hash)) return issueFacilitatorSession(pool,req,account,"dedicated");
    if(account.status==="active" && account.password_hash){ const attempts=Number(account.failed_attempts||0)+1; await pool.query(`UPDATE leader_within_facilitator_accounts SET failed_attempts=$1, locked_until=CASE WHEN $1>=5 THEN NOW()+INTERVAL '15 minutes' ELSE locked_until END, updated_at=NOW() WHERE id=$2`,[attempts,account.id]); if(attempts>=5) await audit(pool,"facilitator_account_locked",{tenant_id:account.tenant_id,metadata:{facilitator_account_id:account.id}}); }
    if(!account.linked_garvey_user_id && !["invited","setup_pending"].includes(norm(account.status))) fail(401,generic);
  }
  const garveyAccount=await authenticateGarveyUser(pool,identity,password);
  if(!garveyAccount) fail(401,generic);
  const linked=await bootstrapGarveyAdminFacilitator(pool,garveyAccount);
  return issueFacilitatorSession(pool,req,linked,"garvey_admin_fallback");
}
async function revokeFacilitatorSession(pool, req){ const tokens=cookieValues(req.headers?.cookie||"", FACILITATOR_COOKIE); if(!tokens.length) return false; for(const token of tokens) await pool.query(`UPDATE leader_within_facilitator_sessions SET revoked_at=NOW(), updated_at=NOW() WHERE token_hash=$1 AND revoked_at IS NULL`,[hashToken(token.value)]); return true; }
async function recoverGarveyAdminFacilitatorSession(pool, req){
  if(!req.authActor?.isAdmin || !req.authActor?.userId) fail(403,"Garvey administrator session required.");
  const email=norm(req.authActor.email);
  const account=(await pool.query(`SELECT * FROM leader_within_facilitator_accounts WHERE linked_garvey_user_id=$1 OR normalized_email=$2 ORDER BY CASE WHEN linked_garvey_user_id=$1 THEN 0 ELSE 1 END, id LIMIT 1`,[req.authActor.userId,email])).rows[0];
  if(!account) fail(404,"Existing facilitator account was not found.");
  if(norm(account.status)!=="active" || norm(account.role)!=="super_admin") fail(403,"Existing facilitator account is not active super_admin.");
  const assignment=(await pool.query(`SELECT COUNT(*)::int AS count FROM leader_within_cohort_facilitators WHERE facilitator_account_id=$1 AND status='active' AND removed_at IS NULL`,[account.id])).rows[0];
  if(Number(assignment?.count||0)<1) fail(403,"Existing facilitator account has no active cohort assignment.");
  await pool.query(`UPDATE leader_within_facilitator_sessions SET revoked_at=NOW(), updated_at=NOW() WHERE facilitator_account_id=$1 AND revoked_at IS NULL`,[account.id]);
  const out=await issueFacilitatorSession(pool,req,account,"garvey_admin_recovery");
  return {...out, recovery:{existing_facilitator_account_found:true, assignment_count:Number(assignment.count||0), stale_sessions_revoked:true}};
}

async function createFacilitatorAccount(pool, req){
  const actor=trustedActorFromRequest(req); requireSuperAdmin(actor); const b=req.body||{}; const tenantSlug=norm(b.tenant_slug||actor.active_tenant_slug); const tenant=(await pool.query(`SELECT id,slug FROM tenants WHERE lower(slug)=lower($1) LIMIT 1`,[tenantSlug])).rows[0]; if(!tenant) fail(404,"Tenant not found."); if(actor.active_tenant_slug&&!actor.is_superadmin&&tenantSlug!==actor.active_tenant_slug) fail(403,"Cross-tenant facilitator creation is not allowed."); const email=normalizeFacilitatorIdentity(b.email); if(!email) fail(400,"email is required."); const approvedRole=norm(b.role||"facilitator"); if(approvedRole==="super_admin"||!LEADER_WITHIN_ROLES.has(approvedRole)) fail(400,"Invalid facilitator role."); const temp=generateOneTimeSetupCredential(); const fid=`TLW-F-${crypto.randomBytes(5).toString("hex").toUpperCase()}`; const acct=(await pool.query(`INSERT INTO leader_within_facilitator_accounts (tenant_id,organization_id,location_id,linked_garvey_user_id,facilitator_id,email,normalized_email,password_hash,setup_token_hash,setup_token_expires_at,first_name,last_name,preferred_name,status,role,must_change_password,created_by_user_id,approved_by_facilitator_account_id,approved_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()+INTERVAL '14 days',$10,$11,$12,'setup_pending',$13,TRUE,$14,$14,NOW()) RETURNING id,facilitator_id,email,first_name,last_name,preferred_name,status,role,tenant_id,location_id`,[tenant.id,b.organization_id||null,b.location_id||null,b.linked_garvey_user_id||null,fid,email,email,createPasswordHash(crypto.randomBytes(18).toString("hex")),hashToken(temp),b.first_name||null,b.last_name||null,b.preferred_name||null,approvedRole,actor.facilitator_account_id||actor.user_id])).rows[0]; if(b.cohort_id) await pool.query(`INSERT INTO leader_within_cohort_facilitators (cohort_id,facilitator_account_id,tenant_id,assignment_role,status,assigned_by_user_id) VALUES ($1,$2,$3,$4,'active',$5) ON CONFLICT (cohort_id, facilitator_account_id) DO UPDATE SET status='active', updated_at=NOW()`,[Number(b.cohort_id),acct.id,tenant.id,norm(b.assignment_role||"primary"),actor.user_id]); await audit(pool,"facilitator_account_created",{tenant_id:tenant.id,actor_user_id:actor.user_id,metadata:{facilitator_account_id:acct.id, linked_garvey_user_id:b.linked_garvey_user_id||null}}); return {ok:true,facilitator:acct,one_time_setup_credential:temp,start_here:"/the-leader-within/facilitator/setup"};
}

async function bootstrapCohort(pool, req){
  const requestId=leaderWithinRequestId();
  const actor=canonicalLeaderWithinActor(trustedActorFromRequest(req));
  requireLeaderWithinPlatformAdmin(actor);
  const b=req.body||{};
  const tenantSlug=norm(b.tenant_slug||actor.active_tenant_slug);
  const name=String(b.cohort_name||b.name||"").trim().slice(0,160);
  const location=String(b.location||b.location_id||"").trim().slice(0,120);
  const organization=String(b.organization||b.organization_id||"").trim().slice(0,160) || null;
  const status=norm(b.status||"active");
  const startDate=normalizeIsoDate(b.start_date);
  const currentWeek=normalizePositiveInt(b.current_week||1,"invalid_current_week","Current week must be between 1 and 32.",{required:true,min:1,max:32});
  const capacity=normalizePositiveInt(b.capacity,"invalid_capacity","Capacity must be a positive number.",{required:false,min:1,max:10000});
  const currentSession=["A","B","C"].includes(String(b.current_session||"A").toUpperCase()) ? String(b.current_session||"A").toUpperCase() : null;
  const pathwaySlug=normalizePathway(b.program_pathway||b.pathway||b.program_slug||PROGRAM_SLUG);
  const facilitatorAccountId=Number(actor.facilitator_account_id||0);
  const facilitatorUserId=facilitatorAccountId ? Number(actor.linked_garvey_user_id||actor.user_id||0) : Number(b.facilitator_user_id||actor.user_id||0);
  const assignedByUserId=Number(actor.linked_garvey_user_id||actor.user_id||facilitatorUserId||0) || null;
  const diagnostics={ handler_reached:true, csrf_passed:true, origin_passed:true, session_resolved:true, super_admin_authorized:true, schema_version:"leader_within_bootstrap_v4", handler_version:"cohort-bootstrap-post-v4", request_id:requestId, transaction_result:"not_started" };
  let stage="request_validated";
  if(!tenantSlug) safePublicError(400,"tenant_required","The cohort could not be saved.");
  if(!name) safePublicError(400,"missing_cohort_name","Enter a cohort name.");
  if(!location) safePublicError(400,"location_required","Enter a location.");
  if(!currentSession) safePublicError(400,"invalid_session_value","Current session must be A, B, or C.");
  if(!["active","ready"].includes(status)) safePublicError(400,"invalid_cohort_status","Choose Active or Ready status.");
  if(actor.active_tenant_slug && !actor.is_superadmin && tenantSlug!==actor.active_tenant_slug) safePublicError(403,"cross_tenant_creation_blocked","Cross-tenant cohort creation is not allowed.");
  if(b.facilitator_account_id && Number(b.facilitator_account_id)!==facilitatorAccountId) safePublicError(403,"facilitator_escalation_blocked","You do not have permission to create this cohort.");
  const client=pool.connect ? await pool.connect() : pool;
  try{
    if(pool.connect) { await client.query("BEGIN"); diagnostics.transaction_result="begun"; }
    stage="actor_resolved";
    stage="tenant_resolved";
    const tenant=(await client.query(`SELECT id,slug FROM tenants WHERE lower(slug)=lower($1) LIMIT 1`,[tenantSlug])).rows[0];
    if(!tenant) safePublicError(404,"tenant_not_found","The cohort could not be saved.");
    diagnostics.tenant_resolved=true;
    let account=null;
    if(facilitatorAccountId){
      account=(await client.query(`SELECT id,linked_garvey_user_id,tenant_id,status,role FROM leader_within_facilitator_accounts WHERE id=$1 AND tenant_id=$2 LIMIT 1`,[facilitatorAccountId,tenant.id])).rows[0]||null;
      if(!account||account.status!=="active") safePublicError(403,"facilitator_account_inactive","You do not have permission to create this cohort.");
    } else {
      const membership=(await client.query(`SELECT user_id FROM tenant_memberships WHERE tenant_id=$1 AND user_id=$2 LIMIT 1`,[tenant.id,facilitatorUserId])).rows[0];
      if(!membership) safePublicError(403,"facilitator_not_in_tenant","You do not have permission to create this cohort.");
    }
    stage="pathway_resolved";
    const program=(await client.query(`SELECT id,slug FROM leader_within_programs WHERE slug=$1 AND status='active'`,[pathwaySlug])).rows[0];
    if(!program) safePublicError(400,"pathway_not_found","The selected program pathway is not available.");
    diagnostics.pathway_resolved=true;
    stage="organization_resolved"; diagnostics.organization_resolution_result=organization ? "text_recorded_on_cohort" : "not_supplied";
    stage="location_resolved"; diagnostics.location_resolution_result="text_recorded_on_cohort";
    const existing=(await client.query(`SELECT * FROM leader_within_cohorts WHERE tenant_id=$1 AND lower(name)=lower($2) AND ($3::date IS NULL OR start_date IS NULL OR start_date=$3::date) LIMIT 1`,[tenant.id,name,startDate])).rows[0];
    stage="cohort_insert_started"; diagnostics.cohort_insert_result=existing ? "existing_reused" : "started";
    const cohort=existing || (await client.query(`INSERT INTO leader_within_cohorts (tenant_id,name,program_id,location_id,organization_id,start_date,capacity,current_week,current_session,status,assigned_facilitator_user_id,assigned_facilitator_email,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,[tenant.id,name,program.id,location,organization,startDate,capacity,currentWeek,currentSession,status,facilitatorUserId||null,actor.email||null,assignedByUserId])).rows[0];
    stage="cohort_insert_completed"; diagnostics.cohort_insert_result=existing ? "existing_reused" : "completed";
    stage="facilitator_assignment_started";
    if(facilitatorAccountId) await client.query(`INSERT INTO leader_within_cohort_facilitators (cohort_id,facilitator_account_id,facilitator_user_id,tenant_id,assignment_role,status,assigned_by_user_id,assigned_by_facilitator_account_id) VALUES ($1,$2,$3,$4,'primary','active',$5,$6) ON CONFLICT ON CONSTRAINT leader_within_cohort_facilitators_account_unique DO UPDATE SET status='active', assignment_role='primary', assigned_by_user_id=EXCLUDED.assigned_by_user_id, assigned_by_facilitator_account_id=EXCLUDED.assigned_by_facilitator_account_id, removed_at=NULL, updated_at=NOW()`,[cohort.id,facilitatorAccountId,facilitatorUserId||null,tenant.id,assignedByUserId,facilitatorAccountId]);
    else await client.query(`INSERT INTO leader_within_cohort_facilitators (cohort_id,facilitator_user_id,tenant_id,assignment_role,status,assigned_by_user_id) VALUES ($1,$2,$3,'primary','active',$4) ON CONFLICT DO NOTHING`,[cohort.id,facilitatorUserId,tenant.id,assignedByUserId]);
    stage="facilitator_assignment_completed"; diagnostics.assignment_result="completed";
    await audit(client,existing?"cohort_bootstrap_reused":"cohort_bootstrap_created",{tenant_id:tenant.id,actor_user_id:assignedByUserId,cohort_id:cohort.id,metadata:{facilitator_user_id:facilitatorUserId||null,facilitator_account_id:facilitatorAccountId||null,program_pathway:pathwaySlug,organization,location,assignment_role:"primary"}});
    stage="audit_insert_completed"; diagnostics.audit_result="completed";
    if(pool.connect) await client.query("COMMIT");
    stage="transaction_committed"; diagnostics.transaction_result="committed";
    return {ok:true,cohort_id:cohort.id,redirect_to:"/the-leader-within/facilitator/dashboard",request_id:requestId,cohort,assignment:{facilitator_user_id:facilitatorUserId||null,facilitator_account_id:facilitatorAccountId||null,status:"active",assignment_role:"primary"},idempotent:!!existing,diagnostic:diagnostics};
  } catch(e){
    if(pool.connect) { try{await client.query("ROLLBACK"); diagnostics.transaction_result="rolled_back";}catch(_){} }
    const failure=classifyBootstrapFailure(stage,e);
    logBootstrapFailure(requestId,stage,failure);
    const err=new Error(failure.message); err.status=failure.status; err.code=failure.code; err.stage=stage; err.request_id=requestId; err.rolled_back=diagnostics.transaction_result==="rolled_back"; err.sqlstate=failure.sqlstate; err.constraint=failure.constraint; err.column=failure.column; err.diagnostic={...diagnostics, safe_error_code:failure.code, transaction_stage:stage, transaction_result:diagnostics.transaction_result}; throw err;
  }
  finally{ if(pool.connect) client.release(); }
}


async function resetCredential(pool, req){ const actor=trustedActorFromRequest(req); const pid=Number(req.params.participantId); const row=(await pool.query(`SELECT p.*,c.id cohort_id,c.tenant_id,c.assigned_facilitator_email,c.assigned_facilitator_user_id,t.slug tenant_slug FROM leader_within_participants p JOIN leader_within_program_enrollments e ON e.leader_within_participant_id=p.id JOIN leader_within_cohorts c ON c.id=e.cohort_id JOIN tenants t ON t.id=c.tenant_id WHERE p.id=$1 LIMIT 1`,[pid])).rows[0]; if(!row) fail(404,"Not found"); await assertFacilitatorForCohortAsync(pool,actor,row); const pin=generateTemporaryPin(); const cred=(await pool.query(`UPDATE leader_within_participant_credentials SET secret_hash=$1, temporary=TRUE, must_change=TRUE, failed_attempts=0, locked_until=NULL, credential_version=credential_version+1, updated_at=NOW() WHERE participant_id=$2 RETURNING leader_id`,[createPasswordHash(pin),pid])).rows[0]; await pool.query(`UPDATE leader_within_participant_sessions SET revoked_at=NOW(), updated_at=NOW() WHERE participant_id=$1 AND revoked_at IS NULL`,[pid]); await audit(pool,"credential_reset",{tenant_id:row.tenant_id,actor_user_id:actor.user_id,participant_id:pid,cohort_id:row.cohort_id,metadata:{leader_id:cred.leader_id}}); return {ok:true, credential_setup_card:{program:"THE LEADER WITHIN",preferred_name:row.preferred_name,leader_id:cred.leader_id,temporary_pin:pin,start_here:"/the-leader-within/sign-in"}}; }

function cleanText(v, max){ return String(v||"").trim().replace(/\s+/g," ").slice(0,max); }
function generateOneTimeSetupCredential(){ return `${generateTemporaryPin()}-${crypto.randomBytes(6).toString("hex")}`; }
async function defaultLeaderWithinTenant(pool){ return (await pool.query(`INSERT INTO tenants (slug,name) VALUES ('leader-within','The Leader Within') ON CONFLICT (slug) DO UPDATE SET name=COALESCE(tenants.name,EXCLUDED.name) RETURNING id,slug`)).rows[0]; }
async function submitFacilitatorAccessRequest(pool, req){
  const b=req.body||{}, email=normalizeFacilitatorIdentity(b.email); if(!email) fail(400,"A valid email address is required.");
  const required=["first_name","last_name","preferred_name","organization_name","requested_location","request_reason"];
  for(const k of required) if(!cleanText(b[k],300)) fail(400,"Please complete all required fields.");
  const exists=(await pool.query(`SELECT id FROM leader_within_facilitator_requests WHERE normalized_email=$1 AND status IN ('pending','more_information_requested') LIMIT 1`,[email])).rows[0];
  if(!exists) {
    await pool.query(`INSERT INTO leader_within_facilitator_requests (normalized_email,first_name,last_name,preferred_name,organization_name,requested_location,phone_number,existing_relationship,organization_role,request_reason,request_notes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')`,[email,cleanText(b.first_name,80),cleanText(b.last_name,80),cleanText(b.preferred_name,80),cleanText(b.organization_name,160),cleanText(b.requested_location,120),cleanText(b.phone_number,40)||null,cleanText(b.existing_relationship,200)||null,cleanText(b.organization_role,120)||null,cleanText(b.request_reason,2000),cleanText(b.request_notes,2000)||null]);
    await audit(pool,"facilitator_access_requested",{metadata:{normalized_email:email}});
  }
  return {ok:true,message:"Your facilitator-access request has been received. A Leader Within administrator must approve the request before you can sign in."};
}
async function leaderWithinAdminDiagnostic(pool, req){
  const cookies = parseCookieHeader(req.headers?.cookie || "");
  const garveyActor = req.authActor || null;
  const facilitatorActor = req.leaderWithinFacilitatorActor || null;
  const youthActor = req.leaderWithinYouthActor || null;
  const actor = trustedActorFromRequest(req);
  requireLeaderWithinPlatformAdmin(actor);
  const facilitatorEmail = norm(garveyActor?.email || facilitatorActor?.email || "");
  let linked = null;
  let assignedCount = 0;
  if (facilitatorEmail) {
    const linkedResult = await pool.query(`SELECT id,status,role,linked_garvey_user_id FROM leader_within_facilitator_accounts WHERE normalized_email=$1 OR id=$2 ORDER BY id DESC LIMIT 1`, [facilitatorEmail, facilitatorActor?.facilitator_account_id || 0]);
    linked = linkedResult.rows[0] || null;
    if (linked) {
      const assignedResult = await pool.query(`SELECT COUNT(*)::int AS count FROM leader_within_cohort_facilitators WHERE facilitator_account_id=$1 AND status='active' AND removed_at IS NULL`, [linked.id]);
      assignedCount = Number(assignedResult.rows[0]?.count || 0);
    }
  }
  const platformAdmin = canAdministerLeaderWithin(actor);
  return {
    facilitator_cookie_present: !!cookies[FACILITATOR_COOKIE],
    facilitator_cookie_occurrence_count: cookieValues(req.headers?.cookie || "", FACILITATOR_COOKIE).length,
    facilitator_cookie_parsed_candidate_count: req.tlwCookieDiagnostics?.parsed_candidate_count || 0,
    garvey_cookie_present: !!cookies.garvey_owner_session,
    facilitator_session_resolved: facilitatorActor?.authenticated === true,
    facilitator_session_revoked: facilitatorActor?.authenticated === true ? false : null,
    facilitator_session_expired: facilitatorActor?.authenticated === true ? false : null,
    facilitator_session_credential_version_valid: facilitatorActor?.authenticated === true ? true : null,
    facilitator_account_found: !!(facilitatorActor?.facilitator_account_id || linked?.id),
    facilitator_account_present: !!(facilitatorActor?.facilitator_account_id || linked?.id),
    facilitator_status: facilitatorActor?.account_status || linked?.status || null,
    facilitator_role: facilitatorActor?.facilitator_role || facilitatorActor?.role || linked?.role || null,
    linked_garvey_user_present: !!(facilitatorActor?.linked_garvey_user_id || linked?.linked_garvey_user_id),
    canonical_garvey_admin: facilitatorActor?.canonical_garvey_admin === true || garveyActor?.isAdmin === true,
    platform_admin_authorized: platformAdmin,
    cohort_assignment_count: assignedCount,
    active_cohort_assignment_count: assignedCount,
    dashboard_authorized: platformAdmin || assignedCount > 0,
    exact_safe_denial_reason: platformAdmin || assignedCount > 0 ? null : (!cookies[FACILITATOR_COOKIE] ? "facilitator_cookie_missing" : !facilitatorActor?.authenticated ? "facilitator_session_unresolved" : !linked ? "facilitator_account_not_found" : assignedCount === 0 ? "active_cohort_assignment_missing" : "unknown"),
    deployed_commit: process.env.RENDER_GIT_COMMIT||process.env.GIT_COMMIT||process.env.SOURCE_VERSION||"unknown",
    cohort_count: assignedCount,
    bootstrap_handler_reached: req.path === "/api/admin/the-leader-within/diagnostic" || req.path === "/api/admin/the-leader-within/bootstrap/diagnostic",
    bootstrap_redirect_reason: platformAdmin ? null : (!cookies[FACILITATOR_COOKIE] ? "facilitator_cookie_missing" : !facilitatorActor?.authenticated ? "facilitator_actor_missing" : "platform_admin_false"),
    authenticated: !!actor?.authenticated,
    garvey_admin_recognized: garveyActor?.isAdmin === true,
    trusted_user_id_present: !!(actor?.user_id || garveyActor?.userId),
    tenant_resolved: !!(actor?.active_tenant_id || actor?.active_tenant_slug || garveyActor?.tenantId || garveyActor?.tenantSlug),
    leader_within_admin_access: platformAdmin,
    leader_within_platform_admin: platformAdmin,
    dedicated_facilitator_account_linked: !!linked,
    dedicated_facilitator_account_status: linked?.status || null,
    dedicated_facilitator_account_email_has_domain: null,
    canonical_email_source: garveyActor?.email ? "garvey_auth_actor" : (facilitatorActor?.canonical_email ? "linked_garvey_user" : null),
    assigned_cohorts_count: assignedCount,
    bootstrap_authorized: platformAdmin,
    handler_version: "tlw-first-cohort-bootstrap-v4",
    youth_session_active: youthActor?.authenticated === true
  };
}

async function leaderWithinBootstrapSchemaDiagnostic(pool, req){
  const actor=trustedActorFromRequest(req); requireLeaderWithinPlatformAdmin(actor);
  async function one(sql, params=[]){ try { return !!(await pool.query(sql,params)).rows[0]; } catch { return false; } }
  const cohorts=await one(`SELECT 1 FROM information_schema.tables WHERE table_name='leader_within_cohorts'`);
  const cf=await one(`SELECT 1 FROM information_schema.tables WHERE table_name='leader_within_cohort_facilitators'`);
  const facCol=await one(`SELECT 1 FROM information_schema.columns WHERE table_name='leader_within_cohort_facilitators' AND column_name='facilitator_account_id'`);
  const programs=await one(`SELECT 1 FROM information_schema.tables WHERE table_name='leader_within_programs'`);
  const twelve=await one(`SELECT 1 FROM leader_within_programs WHERE slug='the-leader-within-12-week' AND status='active'`);
  const auditReady=await one(`SELECT 1 FROM information_schema.tables WHERE table_name='leader_within_audit_events'`);
  const statusCol=await one(`SELECT 1 FROM information_schema.columns WHERE table_name='leader_within_cohorts' AND column_name='status'`);
  const ready=cohorts&&cf&&facCol&&programs&&twelve&&auditReady&&statusCol;
  return { ok:true, cohorts_table_ready:cohorts, cohort_facilitators_table_ready:cf, facilitator_account_id_column_present:facCol, pathway_table_ready:programs, twelve_week_pathway_present:twelve, organization_support_ready:cohorts, location_support_ready:cohorts, cohort_status_column_present:statusCol, audit_table_ready:auditReady, required_migrations_applied:ready, schema_version:"leader_within_bootstrap_v4", latest_required_migration:"leader_within_bootstrap_v4", bootstrap_post_handler_version:"cohort-bootstrap-post-v4" };
}

async function facilitatorManagementDashboard(pool, req){ const actor=trustedActorFromRequest(req); requireSuperAdmin(actor); const requests=(await pool.query(`SELECT id,normalized_email,first_name,last_name,preferred_name,organization_name,requested_location,organization_role,status,submitted_at,reviewed_at,converted_facilitator_account_id FROM leader_within_facilitator_requests ORDER BY submitted_at DESC LIMIT 100`)).rows; const facilitators=(await pool.query(`SELECT id,facilitator_id,email,first_name,last_name,preferred_name,status,role,organization_id,location_id,last_login_at,approved_at FROM leader_within_facilitator_accounts ORDER BY updated_at DESC LIMIT 100`)).rows; return {ok:true,requests,facilitators,roles:[...LEADER_WITHIN_ROLES],statuses:[...FACILITATOR_ACCOUNT_STATUSES]}; }
async function reviewFacilitatorRequest(pool, req){
  const actor=trustedActorFromRequest(req); requireSuperAdmin(actor); const id=Number(req.params.requestId||req.body.request_id); const action=norm(req.body.action||"approve");
  const row=(await pool.query(`SELECT * FROM leader_within_facilitator_requests WHERE id=$1 LIMIT 1`,[id])).rows[0]; if(!row) fail(404,"Request not found."); if(!["pending","more_information_requested"].includes(row.status)) fail(409,"Request is no longer reviewable.");
  if(action==="decline"||action==="more_information_requested"){ await pool.query(`UPDATE leader_within_facilitator_requests SET status=$1,review_notes=$2,reviewed_at=NOW(),reviewed_by_facilitator_account_id=$3,updated_at=NOW() WHERE id=$4`,[action,cleanText(req.body.review_notes,2000)||null,actor.facilitator_account_id,id]); await audit(pool,"facilitator_request_"+action,{actor_user_id:actor.user_id,metadata:{request_id:id}}); return {ok:true,status:action}; }
  if(action!=="approve") fail(400,"Invalid review action."); const role=norm(req.body.role||"facilitator"); if(role==="super_admin"||!LEADER_WITHIN_ROLES.has(role)) fail(400,"Invalid approved role.");
  const tenant= req.body.tenant_slug ? (await pool.query(`SELECT id,slug FROM tenants WHERE lower(slug)=lower($1) LIMIT 1`,[norm(req.body.tenant_slug)])).rows[0] : await defaultLeaderWithinTenant(pool); if(!tenant) fail(404,"Tenant not found.");
  const setup=generateOneTimeSetupCredential(); const existing=(await pool.query(`SELECT id FROM leader_within_facilitator_accounts WHERE tenant_id=$1 AND normalized_email=$2 LIMIT 1`,[tenant.id,row.normalized_email])).rows[0];
  let acct; if(existing){ acct=(await pool.query(`UPDATE leader_within_facilitator_accounts SET status='setup_pending',role=$1,setup_token_hash=$2,setup_token_expires_at=NOW()+INTERVAL '14 days',must_change_password=TRUE,approved_by_facilitator_account_id=$3,approved_at=NOW(),updated_at=NOW() WHERE id=$4 RETURNING id,facilitator_id,email,status,role`,[role,hashToken(setup),actor.facilitator_account_id,existing.id])).rows[0]; }
  else { const fid=`TLW-F-${crypto.randomBytes(5).toString("hex").toUpperCase()}`; acct=(await pool.query(`INSERT INTO leader_within_facilitator_accounts (tenant_id,organization_id,location_id,facilitator_id,email,normalized_email,password_hash,setup_token_hash,setup_token_expires_at,first_name,last_name,preferred_name,status,role,must_change_password,approved_by_facilitator_account_id,approved_at) VALUES ($1,$2,$3,$4,$5,$5,$6,$7,NOW()+INTERVAL '14 days',$8,$9,$10,'setup_pending',$11,TRUE,$12,NOW()) RETURNING id,facilitator_id,email,status,role`,[tenant.id,cleanText(row.organization_name,160),cleanText(row.requested_location,120),fid,row.normalized_email,createPasswordHash(crypto.randomBytes(18).toString("hex")),hashToken(setup),row.first_name,row.last_name,row.preferred_name,role,actor.facilitator_account_id])).rows[0]; }
  if(req.body.cohort_id) await pool.query(`INSERT INTO leader_within_cohort_facilitators (cohort_id,facilitator_account_id,tenant_id,assignment_role,status,assigned_by_user_id) VALUES ($1,$2,$3,$4,'active',$5) ON CONFLICT (cohort_id, facilitator_account_id) DO UPDATE SET status='active', updated_at=NOW()`,[Number(req.body.cohort_id),acct.id,tenant.id,norm(req.body.assignment_role||"primary"),actor.user_id]);
  await pool.query(`UPDATE leader_within_facilitator_requests SET status='approved',review_notes=$1,reviewed_at=NOW(),reviewed_by_facilitator_account_id=$2,converted_facilitator_account_id=$3,updated_at=NOW() WHERE id=$4`,[cleanText(req.body.review_notes,2000)||null,actor.facilitator_account_id,acct.id,id]); await audit(pool,"facilitator_request_approved",{tenant_id:tenant.id,actor_user_id:actor.user_id,metadata:{request_id:id,facilitator_account_id:acct.id,role}}); return {ok:true,facilitator:acct,one_time_setup_credential:setup,setup_expires_in:"14 days",start_here:"/the-leader-within/facilitator/setup"};
}
async function completeFacilitatorSetup(pool, req){ const email=normalizeFacilitatorIdentity(req.body.email||req.body.identity), setup=String(req.body.setup_credential||""), password=String(req.body.password||""); if(!email||!setup||password.length<12) fail(400,"Email, setup credential, and a private password of at least 12 characters are required."); const acct=(await pool.query(`SELECT * FROM leader_within_facilitator_accounts WHERE normalized_email=$1 AND status IN ('invited','setup_pending') LIMIT 1`,[email])).rows[0]; if(!acct||!acct.setup_token_hash||acct.setup_token_expires_at&&new Date(acct.setup_token_expires_at)<=new Date()||hashToken(setup)!==acct.setup_token_hash) fail(401,"We could not complete setup with those details."); await pool.query(`UPDATE leader_within_facilitator_accounts SET password_hash=$1,setup_token_hash=NULL,setup_token_expires_at=NULL,status='active',must_change_password=FALSE,credential_version=credential_version+1,updated_at=NOW() WHERE id=$2`,[createPasswordHash(password),acct.id]); await audit(pool,"facilitator_setup_completed",{tenant_id:acct.tenant_id,metadata:{facilitator_account_id:acct.id}}); return {ok:true,next_route:"/the-leader-within/facilitator/sign-in"}; }
async function resetFacilitatorCredential(pool, req){ const actor=trustedActorFromRequest(req); requireSuperAdmin(actor); const id=Number(req.params.facilitatorId); const setup=generateOneTimeSetupCredential(); await pool.query(`UPDATE leader_within_facilitator_accounts SET status='setup_pending',setup_token_hash=$1,setup_token_expires_at=NOW()+INTERVAL '14 days',must_change_password=TRUE,credential_version=credential_version+1,updated_at=NOW() WHERE id=$2`,[hashToken(setup),id]); await pool.query(`UPDATE leader_within_facilitator_sessions SET revoked_at=NOW(),updated_at=NOW() WHERE facilitator_account_id=$1 AND revoked_at IS NULL`,[id]); await audit(pool,"facilitator_credential_reset",{actor_user_id:actor.user_id,metadata:{facilitator_account_id:id}}); return {ok:true,one_time_setup_credential:setup,start_here:"/the-leader-within/facilitator/setup"}; }

module.exports = { TLW_COOKIE_VERSION, FACILITATOR_COOKIE_LEGACY_PATHS, getLeaderWithinFacilitatorCookieOptions, setLeaderWithinFacilitatorCookie, clearAllLeaderWithinFacilitatorCookies, clearAllYouthCookies, parseCookiePairs, cookieValues, canAdministerLeaderWithin, requireLeaderWithinPlatformAdmin, canonicalLeaderWithinActor, resolveYouthSession, revokeYouthSession, resolveFacilitatorSession, revokeFacilitatorSession, clearFacilitatorSessionCookie, buildFacilitatorSessionCookie, csrfTokenForRequest, YOUTH_COOKIE, FACILITATOR_COOKIE, YOUTH_SESSION_TTL_MS, FACILITATOR_SESSION_TTL_MS,  getYouthDashboard, selectPractice, submitReflection, submitSharedPerspective, facilitatorDashboard, participantProfile, facilitatorControl, addNote, ensureDemoState, trustedActorFromRequest, STORY_MAP, OPTIONAL_STORIES, createPasswordHash, verifyPasswordHash, generateLeaderId, generateTemporaryPin, normalizeLeaderId, addParticipant, signInYouth, firstLogin, resetCredential, bootstrapCohort, createFacilitatorAccount, submitFacilitatorAccessRequest, facilitatorManagementDashboard, reviewFacilitatorRequest, completeFacilitatorSetup, resetFacilitatorCredential, leaderWithinAdminDiagnostic, leaderWithinBootstrapSchemaDiagnostic, recoverGarveyAdminFacilitatorSession, signInFacilitator, bootstrapGarveyAdminFacilitator, reconcileLinkedGarveyAdminFacilitator, issueFacilitatorSession, youthSessionCookieOptions, classifyBootstrapFailure };
