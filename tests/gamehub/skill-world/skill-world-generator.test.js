const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..','..');
const dp=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/G1M_DP_001.skill-package.v1.json'),'utf8'));
const op=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/G1M_OP_003.skill-package.v1.json'),'utf8'));
const ns=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/G1M_NS_002.skill-package.v1.json'),'utf8'));
const pv=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/G1M_PV_001.skill-package.v1.json'),'utf8'));
const Renderer=require(path.join(root,'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const Adapter=require(path.join(root,'public/gamehub/skill-world/engine/growth-data-adapter.js'));
const Schema=require(path.join(root,'public/gamehub/skill-world/engine/skill-package-schema.js'));
const VisualRegistry=require(path.join(root,'public/gamehub/skill-world/renderers/visual-model-registry.js'));

global.localStorage={_m:new Map(),setItem(k,v){this._m.set(k,v)},getItem(k){return this._m.get(k)||null}};

assert.equal(Schema.validateSkillPackage(dp).valid,true);
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

assert.equal(Schema.validateSkillPackage(ns).valid,true);
assert.ok(ns.guided_practice.length>=6);
assert.ok(ns.adaptive_question_bank.length>=12);
assert.ok(ns.checkpoint.length>=4);
assert.ok(ns.checkpoint.some((q)=>String(q.prompt).includes('99')));
assert.ok(ns.checkpoint.some((q)=>String(q.prompt).includes('109')));
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
assert.ok(pvQuestions.every((q)=>VisualRegistry.render(q) !== '<div></div>'));
const st4=Renderer.createState();
Renderer.submitAnswer(st4,'guided',pv.guided_practice[1],'3 tens and 4 ones');
Renderer.submitAnswer(st4,'challenge',pv.adaptive_question_bank[8],'10 tens, 4 ones');
Renderer.submitAnswer(st4,'checkpoint',pv.checkpoint[3],pv.checkpoint[3].correct_answer);
const growth4=Renderer.finalize(st4,pv,'learner-4');
assert.equal(growth4.skill_id,'G1M_PV_001');
assert.equal(growth4.mastery_status,'mastered');

console.log('skill-world-generator tests passed');
