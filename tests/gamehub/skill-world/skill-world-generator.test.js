const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..','..');
const load=(id)=>JSON.parse(fs.readFileSync(path.join(root,`public/gamehub/skill-world/content/${id}.skill-package.v1.json`),'utf8'));
const dp=load('G1M_DP_001');
const op=load('G1M_OP_003');
const ns=load('G1M_NS_002');
const pv=load('G1M_PV_001');
const Renderer=require(path.join(root,'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Adapter=require(path.join(root,'public/gamehub/skill-world/engine/growth-data-adapter.js'));
const Schema=require(path.join(root,'public/gamehub/skill-world/engine/skill-package-schema.js'));
const VisualRegistry=require(path.join(root,'public/gamehub/skill-world/renderers/visual-model-registry.js'));

global.localStorage={_m:new Map(),setItem(k,v){this._m.set(k,v)},getItem(k){return this._m.get(k)||null}};

function assertFullMission(pkg){
  const validation=Schema.validateSkillPackage(pkg);
  assert.equal(validation.valid,true,validation.errors.join('\n'));
  const rendered=Renderer.renderSkillWorld(pkg,{failClosed:true});
  const html=rendered.html;
  assert.match(html,new RegExp(`Skill World:\\s*${pkg.skill.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}`));
  ['mission-map','skill-world-header','rounded-app-container','central-screen-card','kid-visual-area','hint-box','feedback-area','styled-answer-controls','badge-celebration','growth-profile'].forEach((token)=>assert.match(html,new RegExp(token),`missing ${token}`));
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile','Stars','Accuracy','Hints','Zone'].forEach((label)=>assert.match(html,new RegExp(`>${label}<|>${label}\\b|\\b${label}\\b`),`missing ${label}`));
  ['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen','Show Answer / Continue'].forEach((label)=>assert.match(html,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`missing ${label}`));
  assert.match(html,/data-renderer="[^"]+"/,'missing visual renderer output');
  assert.doesNotMatch(html,/plain quiz/i);
}

[dp,op,ns,pv].forEach(assertFullMission);
const index=fs.readFileSync(path.join(root,'public/gamehub/skill-world/index.html'),'utf8');
assert.match(index,/skill-world\.css/);
assert.match(index,/failClosed:true/);
const css=fs.readFileSync(path.join(root,'public/gamehub/skill-world/skill-world.css'),'utf8');
['skill-world-header','mission-map','stat-card','answer-button','feedback-area','badge-celebration','visual-model','@media'].forEach((token)=>assert.match(css,new RegExp(token)));

const bad=JSON.parse(JSON.stringify(dp)); delete bad.lesson; bad.guided_practice=[];
assert.equal(Schema.validateSkillPackage(bad).valid,false);
assert.throws(()=>Renderer.renderSkillWorld(bad,{failClosed:true}),/SkillPackage validation failed/);

const state=Renderer.createState();
const gp=dp.guided_practice[0], challenge=dp.adaptive_question_bank[0], cp=dp.checkpoint[0];
Renderer.submitAnswer(state,'guided',gp,'wrong');
Renderer.submitAnswer(state,'guided',gp,'wrong-again'); // no double submit
assert.equal(state.attempts,1);
Renderer.submitAnswer(state,'challenge',challenge,challenge.correct_answer);
Renderer.submitAnswer(state,'checkpoint',cp,cp.correct_answer);
assert.equal(Object.keys(state.answeredByZoneQuestion).length,3);
assert.ok(state.answeredByZoneQuestion['guided:gp1']);
assert.ok(state.answeredByZoneQuestion['challenge:aq1']);
assert.ok(state.answeredByZoneQuestion['checkpoint:cp1']);
const showBefore=Renderer.showAnswerAndContinue(state,'guided',dp.adaptive_question_bank[1]);
assert.equal(showBefore.revealed,true);
const showAfterWrong=Renderer.showAnswerAndContinue(state,'guided',gp);
assert.equal(showAfterWrong.correct,false);
assert.equal(Renderer.evaluateAnswer(cp,'  CIRCLE '),true);

const growth=Renderer.finalize(state,dp,'learner-1');
assert.deepEqual(Object.keys(growth).sort(),['accuracy_percent','attempts','completed_at','correct','domain','grade','hints_used','learner_id','mastery_status','misconception_watch','recommended_next_skill','skill','skill_id','stars_earned','subject'].sort());
assert.equal(growth.mastery_status,growth.accuracy_percent>=dp.mastery_threshold?'mastered':'review');
assert.ok(Array.isArray(growth.misconception_watch));
const saved=Adapter.loadGrowthData('G1M_DP_001','learner-1');
assert.equal(saved.skill_id,'G1M_DP_001');

const st2=Renderer.createState();
Renderer.submitAnswer(st2,'guided',op.guided_practice[0],'3');
Renderer.submitAnswer(st2,'challenge',op.adaptive_question_bank[0],'6 and 4');
Renderer.submitAnswer(st2,'checkpoint',op.checkpoint[0],'10');
const growth2=Renderer.finalize(st2,op,'learner-2');
assert.equal(growth2.mastery_status,'mastered');
assert.equal(growth2.recommended_next_skill,op.next_skill_id);
assert.match(VisualRegistry.render(op.guided_practice[0]),/number-bond-visual/);
assert.match(VisualRegistry.render(op.guided_practice[0]),/bond-lines/);

assert.equal(Schema.validateSkillPackage(ns).valid,true);
assert.ok(ns.guided_practice.length>=6);
assert.ok(ns.adaptive_question_bank.length>=12);
assert.ok(ns.checkpoint.length>=4);
assert.ok(ns.checkpoint.some((q)=>String(q.prompt).includes('99')));
assert.ok(ns.checkpoint.some((q)=>String(q.prompt).includes('109')));
assert.match(VisualRegistry.render(ns.guided_practice[0]),/number-line-visual/);
assert.match(VisualRegistry.render(ns.guided_practice[0]),/sw-number-line/);
const st3=Renderer.createState();
Renderer.submitAnswer(st3,'guided',ns.guided_practice[0],ns.guided_practice[0].correct_answer);
Renderer.submitAnswer(st3,'challenge',ns.adaptive_question_bank[3],ns.adaptive_question_bank[3].correct_answer);
Renderer.submitAnswer(st3,'checkpoint',ns.checkpoint[1],ns.checkpoint[1].correct_answer);
const growth3=Renderer.finalize(st3,ns,'learner-3');
assert.equal(growth3.skill_id,'G1M_NS_002');
assert.ok(['mastered','review'].includes(growth3.mastery_status));

assert.equal(Schema.validateSkillPackage(pv).valid,true);
assert.ok(pv.lesson.mini_lesson.includes('ten is a bundle of 10 ones'));
assert.ok(pv.worked_examples.some((example)=>example.text.includes('10 ones = 1 ten')));
assert.ok(pv.guided_practice.length>=6);
assert.ok(pv.adaptive_question_bank.length>=12);
assert.ok(pv.checkpoint.length>=4);
const pvQuestions=[...pv.guided_practice,...pv.adaptive_question_bank,...pv.checkpoint];
const labelBothParts=pvQuestions.filter((q)=>/how many tens and how many ones|label both parts/i.test(q.prompt));
assert.ok(labelBothParts.length>=8);
assert.deepEqual([...new Set(pvQuestions.map((q)=>q.representation).filter(Boolean))].sort(), ['blocks','chart','numeral']);
['ones_tens_swap','ten_not_unitized','digit_name_value_confusion'].forEach((tag)=>{
  assert.ok(pv.misconception_bank[tag]);
  assert.ok(pvQuestions.some((q)=>q.misconception_tag===tag));
});
const pvVisual=VisualRegistry.render(pv.guided_practice.find((q)=>q.visual_model==='base_ten_blocks')||pv.guided_practice[0]);
assert.match(pvVisual,/base-ten-visual/);
assert.match(pvVisual,/place-value-chart/);
assert.match(pvVisual,/10 ones = 1 ten/);
assert.ok(pvQuestions.every((q)=>VisualRegistry.render(q) !== '<div></div>'));
const st4=Renderer.createState();
Renderer.submitAnswer(st4,'guided',pv.guided_practice[1],'3 tens and 4 ones');
Renderer.submitAnswer(st4,'challenge',pv.adaptive_question_bank[8],'10 tens, 4 ones');
Renderer.submitAnswer(st4,'checkpoint',pv.checkpoint[3],pv.checkpoint[3].correct_answer);
const growth4=Renderer.finalize(st4,pv,'learner-4');
assert.equal(growth4.skill_id,'G1M_PV_001');
assert.equal(growth4.mastery_status,'mastered');

const dpPattern=VisualRegistry.render(dp.checkpoint[0]);
assert.match(dpPattern,/pattern-visual/);
assert.match(dpPattern,/pattern-token missing/);
const dpSort=VisualRegistry.render(dp.guided_practice[0]);
assert.match(dpSort,/sorting-visual/);
assert.match(dpSort,/sorting-bins/);

console.log('skill-world-generator tests passed');
