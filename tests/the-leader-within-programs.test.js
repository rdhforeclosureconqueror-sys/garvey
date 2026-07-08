'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const dataSrc = fs.readFileSync('public/the-leader-within/programs/leader-within-program-data.js','utf8');
const ctx={}; vm.createContext(ctx); vm.runInContext(dataSrc,ctx); const D=ctx.LeaderWithinProgram;
const hub=fs.readFileSync('public/the-leader-within/programs.html','utf8');
const overview=fs.readFileSync('public/the-leader-within/programs/12-week.html','utf8');
const renderer=fs.readFileSync('public/the-leader-within/programs/program-renderer.js','utf8');

test('program hub and canonical overview routes exist with required cards',()=>{
 assert.ok(fs.existsSync('public/the-leader-within/programs.html'));
 assert.ok(fs.existsSync('public/the-leader-within/programs/12-week.html'));
 for(const token of ['8-Week','12-Week','32-Week','Featured canonical pathway','Explore the 12-Week Program']) assert.match(dataSrc+hub+renderer,new RegExp(token));
});

test('12-week phases and all weekly titles/core questions are present in content model',()=>{
 assert.deepEqual(Array.from(D.phases.map(p=>p.name)),['Discover and Understand','Practice and Strengthen','Apply and Demonstrate']);
 assert.equal(D.weeks.length,12);
 for(const w of D.weeks){
  assert.ok(fs.existsSync(`public/the-leader-within/programs/12-week/week-${String(w.n).padStart(2,'0')}.html`));
  assert.match(dataSrc,new RegExp(w.title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(dataSrc,new RegExp(w.q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 }
});

test('week one has story, practices, reflections, sessions, navigation, and mirror-not-label guidance',()=>{
 const w=D.weeks[0];
 assert.match(w.story,/Leadership does not begin with a title/);
 assert.ok(w.practices.length>=5);
 assert.ok(w.before.length>=4);
 assert.ok(w.after.length>=4);
 for(const token of ['Session A — Learn the Story','Session B — Practice Through the Body','Session C — Apply and Reflect','Return to 12-Week Program Overview','mirror, not a label']) assert.match(dataSrc+renderer,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
});

test('PocketPT and current versus planned boundaries are safe and explicit',()=>{
 const src=dataSrc+renderer+overview+hub;
 for(const token of ['PocketPT is the individualized fitness system','Garvey hosts leadership curriculum','Garvey does not prescribe the individualized workout','No durable enrollment','Planned','Available now']) assert.match(src,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
 for(const bad of ['token=','secret','x-pocketpt-token','raw query metadata']) assert.doesNotMatch(src,new RegExp(bad,'i'));
});

test('assessment result and landing page link into program without durable enrollment claim',()=>{
 const exp=fs.readFileSync('public/archetype-engines/experience.js','utf8');
 const landing=fs.readFileSync('public/the-leader-within.html','utf8');
 assert.match(exp,/Continue Into My Program/);
 assert.match(exp,/href="\/the-leader-within\/programs\/12-week\.html"/);
 assert.match(exp,/enrollment records and saved progress are not live yet/);
 assert.match(landing,/Explore the Programs/);
 assert.match(landing,/\/the-leader-within\/programs\.html/);
});

test('canonical archetype names remain correct and incorrect names absent in program content',()=>{
 for(const name of ['Vision Drive','Structure Drive','Relational Intelligence','Influence Expression','Adaptive Control']) assert.match(dataSrc+renderer,new RegExp(name));
 for(const bad of ['Structure Directive','Relational Insight','Adaptive Command']) assert.doesNotMatch(dataSrc+renderer,new RegExp(bad));
});
