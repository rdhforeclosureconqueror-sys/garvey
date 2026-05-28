const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..','..');
const skill=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/G1M_DP_001.skill-package.v1.json'),'utf8'));
const Renderer=require(path.join(root,'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Adapter=require(path.join(root,'public/gamehub/skill-world/engine/growth-data-adapter.js'));

global.localStorage={_m:new Map(),setItem(k,v){this._m.set(k,v)},getItem(k){return this._m.get(k)||null}};

assert.equal(skill.skill_id,'G1M_DP_001');
assert.ok(Renderer.SCREENS.includes('StoryMissionScreen'));
const s=Renderer.createState();
const q1=skill.guided_practice[0];
assert.equal(Renderer.submitAnswer(s,'guided',q1,'wrong'),false);
assert.equal(s.correct,0);
assert.ok(s.misconceptionTags.includes('sort_attribute_mismatch'));
Renderer.useHint(s); assert.equal(s.hintsUsed,1);
assert.ok(Renderer.showAnswer());
const q2=skill.checkpoint[0]; Renderer.submitAnswer(s,'checkpoint',q2,q2.answer);
assert.equal(Object.keys(s.answeredByZoneQuestion).length,2);
const payload=Renderer.finalize(s,skill,'learner-1');
assert.equal(payload.attempts,2);
assert.equal(payload.correct,1);
assert.equal(s.passFail,'fail');
const loaded=Adapter.loadGrowthData('G1M_DP_001','learner-1');
assert.equal(loaded.skill_id,'G1M_DP_001');
assert.ok(loaded.recommended_next_skill);
console.log('skill-world-generator tests passed');
