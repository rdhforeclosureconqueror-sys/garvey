const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(path.join(__dirname, '../server/leaderWithinRoutes.js'), 'utf8');
const service = fs.readFileSync(path.join(__dirname, '../server/leaderWithinService.js'), 'utf8');
const db = fs.readFileSync(path.join(__dirname, '../server/leaderWithinDb.js'), 'utf8');
const curriculum = require('../public/the-leader-within/programs/leader-within-program-data.js');
const svc = require('../server/leaderWithinService.js');

function storyIdsForWeek(n) {
  return curriculum.weeks.find(w => Number(w.n) === Number(n)).stories.map(story =>
    `week-${String(n).padStart(2, '0')}-${String(story.title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
  );
}

test('story route audit: canonical routes, handlers, csrf middleware order, and completion table are wired', () => {
  assert.match(routes, /r\.use\(requireTrustedOrigin\);\s*r\.use\(requireCsrf\);/s);
  assert.match(routes, /r\.get\('\/the-leader-within\/stories', asyncRoute\(async\(req,res\)=>\{ const state=await svc\.listWeeklyStories/);
  assert.match(routes, /r\.get\('\/the-leader-within\/stories\/:storyId', asyncRoute\(async\(req,res\)=>\{ const data=await svc\.getAssignedStory/);
  assert.match(routes, /r\.post\('\/api\/the-leader-within\/stories\/:storyId\/complete', asyncRoute\(async\(req,res\)=>res\.json\(await svc\.completeStory/);
  assert.match(service, /async function getAssignedStory\(pool, req, storyId\)/);
  assert.match(service, /async function completeStory\(pool, req\)/);
  assert.match(db, /CREATE TABLE IF NOT EXISTS leader_within_story_completions/);
  assert.match(db, /UNIQUE \(enrollment_id, story_id\)/);
  assert.match(service, /INSERT INTO leader_within_story_completions/);
  assert.match(service, /ON CONFLICT \(enrollment_id,story_id\) DO UPDATE/);
});

test('story content inventory: Week 1 authored story IDs are stable and audio is not fabricated', () => {
  assert.deepEqual(storyIdsForWeek(1), [
    'week-01-the-group-without-a-captain',
    'week-01-the-practice-that-started-falling-apart',
    'week-01-the-friend-who-did-not-say-much',
    'week-01-the-plan-changed',
    'week-01-the-person-who-always-talks-first'
  ]);
  assert.equal(curriculum.weeks[0].stories.length, 5);
  assert.ok(curriculum.weeks[0].stories.every(story => !story.listen_url && !story.audio_url));
  assert.match(service, /listen_url:null/);
  assert.match(routes, /aria-disabled="true" disabled>Audio coming soon/);
  assert.doesNotMatch(routes + service, /\.mp3|\.m4a|\.wav/);
});

test('story library and detail HTML expose required youth controls without private or debug output', () => {
  assert.match(routes, /This Week's Stories/);
  assert.match(routes, /Featured story/);
  assert.match(routes, /href="\$\{esc\(st\.read_url\)\}"/);
  assert.match(routes, /Leadership focus:/);
  assert.match(routes, /<h2>Story<\/h2>/);
  assert.match(routes, /What to notice/);
  assert.match(routes, /Reflection question:/);
  assert.match(routes, /Mark Story Complete/);
  assert.match(routes, /Return to mission/);
  assert.match(routes, /This week's stories/);
  assert.doesNotMatch(routes.slice(routes.indexOf("r.get('/the-leader-within/stories'"), routes.indexOf("r.get('/the-leader-within/weeks")), /facilitator_notes|private_note|credential|csrf_token/);
  assert.doesNotMatch(routes.slice(routes.indexOf("r.get('/the-leader-within/stories/:storyId'"), routes.indexOf("r.get('/the-leader-within/archetypes")), /diagnostics|private_note|credential[^s]/);
});

test('story authorization requires a real youth session and blocks facilitator/Garvey identity substitution', () => {
  assert.match(service, /if \(!actor\?\.authenticated \|\| actor\.actor_type !== "youth_participant"\) safePublicError\(401,"youth_session_missing"/);
  assert.match(service, /assertYouthOwns\(actor, row\.resolved_participant_id \?\? row\.leader_within_participant_id \?\? row\.participant_id, row\.tenant_slug\)/);
  assert.match(service, /Youth participants can only access their own program state/);
  assert.match(service, /Tenant isolation enforced/);
  assert.match(service, /story_not_assigned/);
});

test('story completion returns updated story and mission progress and remains idempotent', () => {
  assert.match(service, /completed_at=COALESCE\(leader_within_story_completions\.completed_at,NOW\(\)\)/);
  assert.match(service, /const updated=await resolveParticipantCurriculumState\(pool,\{enrollmentId:row\.id\}\)/);
  assert.match(service, /return \{ ok:true, story_id:storyId, status:"completed", story:updatedStory, progress:updated\.progress/);
  assert.match(service, /audit\(pool,"story_completed"/);
});
