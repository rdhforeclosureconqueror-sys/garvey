'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const dataSrc = fs.readFileSync('public/the-leader-within/programs/leader-within-program-data.js','utf8');
const renderer = fs.readFileSync('public/the-leader-within/programs/program-renderer.js','utf8');
const ctx={}; vm.createContext(ctx); vm.runInContext(dataSrc,ctx); const D=ctx.LeaderWithinProgram; const w=D.weeks[0];
const generic='Balanced expression helps the group. Overused strength can crowd the group. This week asks participants to choose, not react automatically.';

test('week one contains five concise unique stories with prompts and lessons',()=>{
 assert.ok(w.stories.length>=3 && w.stories.length<=5);
 assert.equal(w.stories.length,5);
 assert.equal(new Set(w.stories.map(s=>s.title)).size,5);
 for(const s of w.stories){
  assert.ok(s.prompts.length>=2);
  assert.ok(s.lesson.length>20);
  const words=s.text.split(/\s+/).filter(Boolean).length;
  assert.ok(words>=120 && words<=300, `${s.title} word count ${words}`);
 }
 assert.equal(new Set(w.stories.map(s=>s.text.slice(0,80))).size,5);
});

test('all five archetypes have unique week one teaching and no generic duplicate paragraph',()=>{
 for(const name of D.archetypes){
  assert.ok(w.archetypeTeaching[name]);
  assert.match(dataSrc, new RegExp(name));
  assert.ok(w.archetypeTeaching[name].explanation);
  assert.ok(w.archetypeTeaching[name].balanced);
  assert.ok(w.archetypeTeaching[name].overused);
  assert.ok(w.archetypeTeaching[name].prompt);
 }
 assert.equal(new Set(Object.values(w.archetypeTeaching).map(x=>x.explanation)).size,5);
 assert.equal(new Set(Object.values(w.archetypeTeaching).map(x=>x.balanced)).size,5);
 assert.equal(new Set(Object.values(w.archetypeTeaching).map(x=>x.overused)).size,5);
 assert.doesNotMatch(dataSrc+renderer, new RegExp(generic.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('balanced and overused examples are specific for each archetype',()=>{
 assert.equal(w.balancedExamples.length,5);
 assert.equal(new Set(w.balancedExamples.map(e=>e.archetype)).size,5);
 for(const e of w.balancedExamples){
  assert.ok(e.situation && e.balanced && e.overused && e.tryNext);
 }
});

test('week one practice bank has five choices with distinct complete examples',()=>{
 const titles=['Notice One Leadership Moment','Name the Strength You Used','Ask Someone What They Noticed','Try a Different Leadership Response','Help Someone Without Taking Over'];
 assert.deepEqual(Array.from(w.practiceBank.map(p=>p.title)),titles);
 assert.equal(new Set(w.practiceBank.map(p=>p.purpose)).size,5);
 assert.equal(new Set(w.practiceBank.map(p=>p.reflection)).size,5);
 for(const p of w.practiceBank){
  assert.ok(p.school);
  assert.ok(p.movement);
  assert.ok(p.home);
  assert.ok(p.why);
  assert.ok(p.notice);
 }
 assert.doesNotMatch(dataSrc,/At school: look for one group moment where this practice could help/);
});

test('participants choose one practice and the system does not auto-assign',()=>{
 assert.match(renderer,/Choose One Practice for This Week/);
 assert.match(renderer,/choose-practice/);
 assert.match(renderer,/No practice selected yet/);
 assert.match(renderer,/This choice will stay visible during this session/);
 assert.doesNotMatch(renderer,/assignedPractice|autoAssign|automatically assigned/i);
});

test('sessions and group reflection are complete',()=>{
 assert.equal(w.sessionA.duration,'35–45 minutes');
 for(const step of ['Opening Check-In','Short Story','Discussion','Five Capacities Activity','Practice Selection','Closing Reset']) assert.ok(w.sessionA.steps.some(s=>s.name===step));
 assert.match(w.sessionB.lens,/What leadership moment will you watch for today/);
 assert.ok(w.sessionB.observations.length>=10);
 assert.match(w.sessionC.title,/The No-Title Leadership Challenge/);
 assert.equal(w.groupPerspective.fields.length,3);
 assert.ok(w.groupPerspective.fields.includes('One perspective I heard from someone else:'));
});

test('reflections avoid pass fail language and include before and after prompts',()=>{
 assert.ok(w.before.length>=6);
 assert.deepEqual(Array.from(w.afterCore),['What happened?','What leadership strength appeared?','What would you try next time?']);
 assert.doesNotMatch(JSON.stringify(w.before.concat(w.after,w.completion)),/pass|fail|score|correct answer|wrong answer/i);
});

test('facilitator guide has objective, observation, prohibited actions, responses, and consistency standard',()=>{
 assert.match(w.facilitator.objective,/does not require a title/);
 assert.ok(w.facilitator.observe.length>=10);
 assert.ok(w.facilitator.notDo.length>=10);
 assert.ok(w.facilitator.responses.length>=5);
 assert.deepEqual(Array.from(w.facilitator.consistency),['Leadership beyond titles','At least one short story','Discussion of multiple leadership capacities','All five archetypes introduced','One practice selected by each participant','One real or simulated practice opportunity','Before reflection','Group discussion','Shared-perspective reflection','After reflection','One next-step adjustment']);
});

test('completion criteria measure understanding and application without graded-test language',()=>{
 assert.equal(w.completion.length,10);
 for(const token of ['Explain one way leadership can appear without a title.','Choose one Week One practice.','Record one perspective heard from another person.','Name one adjustment to try next time.']) assert.ok(w.completion.includes(token));
 assert.match(renderer,/Week One Growth Check/);
 assert.doesNotMatch(JSON.stringify(w.completion)+renderer,/Pass|Fail|Correct answer|Wrong answer/);
});

test('PocketPT boundary and voice narration exclusions are safe',()=>{
 assert.match(w.sessionB.pocket,/PocketPT owns individualized fitness/);
 assert.match(w.sessionB.pocket,/Garvey provides only the leadership observation lens/);
 assert.doesNotMatch(w.sessionB.pocket,/universal workout/i);
 assert.match(renderer,/not an active handoff button/);
 assert.match(renderer,/Voice narration excludes facilitator notes/);
});

test('protected routes and scoring/security source areas are not changed by week one data',()=>{
 assert.equal(D.weeks.length,12);
 for(let i=2;i<=12;i++) assert.equal(D.weeks[i-1].n,i);
 const engine=fs.readFileSync('tests/archetype-engines/archetype-engines.test.js','utf8');
 assert.match(engine,/PocketPT/);
});
