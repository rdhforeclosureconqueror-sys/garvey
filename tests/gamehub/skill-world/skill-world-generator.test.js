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
  ['mission-map','skill-world-header','rounded-app-container','central-screen-card','skill-screen-card','kid-visual-area','skill-visual','hint-box','feedback-area','styled-answer-controls','answer-grid','lesson-grid','safe-bottom','badge-celebration','growth-profile'].forEach((token)=>assert.match(html,new RegExp(token),`missing ${token}`));
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile','Stars','Accuracy','Hints','Zone'].forEach((label)=>assert.match(html,new RegExp(`>${label}<|>${label}\b|\b${label}\b`),`missing ${label}`));
  assert.doesNotMatch(html,/data-step="Skill Drill"/,'Skill Drill is not embedded as a mission-map step');
  if(Renderer.hasRealLevelBanks(pkg)){assert.match(html,/Continue to Skill Practice/,'production packages launch practice from Profile');}
  else{assert.doesNotMatch(html,/Continue to Skill Practice/,'transitional packages do not show a dead Skill Practice entry');}
  ['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen','Show Answer','Start Mission','Next: Watch Me','Next: Demo','Next: Practice','Save Growth Data','Replay Mission','Exit to Adaptive Hub'].forEach((label)=>assert.match(html,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`missing ${label}`));
  assert.match(html,/data-renderer="[^"]+"/,'missing visual renderer output');
  assert.doesNotMatch(html,/plain quiz/i);
}

[dp,op,ns,pv].forEach(assertFullMission);

function classContains(html, screenClass, expected){
  const re=new RegExp(`<section class="([^"]*\\b${screenClass}\\b[^"]*)"`);
  const match=html.match(re);
  assert.ok(match,`missing ${screenClass}`);
  assert.ok(match[1].split(/\s+/).includes(expected),`${screenClass} should include ${expected}; got ${match[1]}`);
}
function assertActiveGuidedFlow(pkg){
  const state=Renderer.createState();
  let html=Renderer.renderSkillWorld(pkg,{state,failClosed:true}).html;
  classContains(html,'story-screen','is-active');
  ['lesson-screen','watch-screen','demo-screen','practice-screen','challenge-screen','checkpoint-screen','badge-screen','profile-screen'].forEach((screen)=>classContains(html,screen,'is-hidden'));
  assert.match(html,/<span class="mission-step[^"]*is-active[^"]*"[^>]*data-step="Story"/,'Story is active in map on first load');
  assert.match(html,/<span class="mission-step[^"]*is-unavailable[^"]*"[^>]*data-step="Lesson"/,'Lesson is visible but unavailable on first load');

  assert.equal(Renderer.advanceMission(state,pkg),true,'Start Mission advances Story to Lesson');
  html=Renderer.renderSkillWorld(pkg,{state}).html;
  classContains(html,'lesson-screen','is-active');
  classContains(html,'story-screen','is-hidden');
  assert.match(html,/<span class="mission-step[^"]*is-complete[^"]*"[^>]*data-step="Story"/,'Story map step becomes complete');
  assert.match(html,/<span class="mission-step[^"]*is-active[^"]*"[^>]*data-step="Lesson"/,'Lesson map step becomes active');

  assert.equal(Renderer.advanceMission(state,pkg),true,'Lesson advances to Watch');
  assert.equal(state.stepIndex,2);
  assert.equal(Renderer.advanceMission(state,pkg),true,'Watch advances to Demo');
  assert.equal(state.stepIndex,3);
  assert.equal(Renderer.advanceMission(state,pkg),true,'Demo advances to Practice');
  assert.equal(state.stepIndex,4);
  html=Renderer.renderSkillWorld(pkg,{state}).html;
  classContains(html,'practice-screen','is-active');
  classContains(html,'badge-screen','is-hidden');
  classContains(html,'profile-screen','is-hidden');
  assert.match(html,/<button id="next" class="continue-button mission-next" disabled>Next<\/button>/,'Practice Next is disabled before an answer or Show Answer');
  assert.equal(Renderer.canAdvance(state,pkg),false,'Practice cannot advance before answer or Show Answer');
  assert.equal(Renderer.advanceMission(state,pkg),false,'Practice stays put before answer or Show Answer');

  Renderer.showAnswerAndContinue(state,'practice',pkg.guided_practice[0]);
  assert.equal(Renderer.canAdvance(state,pkg),true,'Show Answer unlocks Practice Next');
  html=Renderer.renderSkillWorld(pkg,{state}).html;
  assert.match(html,/<button id="next" class="continue-button mission-next" >Next<\/button>|<button id="next" class="continue-button mission-next">Next<\/button>/,'Practice Next is enabled after Show Answer');
  assert.equal(Renderer.advanceMission(state,pkg),true,'Practice advances after Show Answer');
  assert.equal(state.stepIndex,5);
  html=Renderer.renderSkillWorld(pkg,{state}).html;
  assert.match(html,/<span class="mission-step[^"]*is-complete[^"]*"[^>]*data-step="Practice"/,'Practice map step becomes complete');
  assert.match(html,/<span class="mission-step[^"]*is-active[^"]*"[^>]*data-step="Challenge"/,'Challenge map step becomes active');
  classContains(html,'badge-screen','is-hidden');
  classContains(html,'profile-screen','is-hidden');
}
[dp,op,ns,pv].forEach(assertActiveGuidedFlow);
const index=fs.readFileSync(path.join(root,'public/gamehub/skill-world/index.html'),'utf8');
assert.match(index,/skill-world\.css/);
assert.match(index,/failClosed:true/);
assert.match(index,/drillPath/,'/skill-world/:skillId/drill launches Skill Drill mode');
const css=fs.readFileSync(path.join(root,'public/gamehub/skill-world/skill-world.css'),'utf8');
['skill-world-header','mission-map','stat-card','answer-button','feedback-area','badge-celebration','visual-model','skill-visual','skill-visual-inner','visual-scroll','answer-grid','lesson-grid','safe-bottom','overflow-x:hidden','@media'].forEach((token)=>assert.match(css,new RegExp(token)));
assert.ok(css.includes('env(safe-area-inset-bottom)'),'missing mobile safe-area padding');
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'mobile mission map should use a compact 3x3 grid');


function missionStepNames(html){return [...html.matchAll(/<span class="mission-step[^"]*"[^>]*data-step="([^"]+)"/g)].map((m)=>m[1]);}
assert.deepEqual(Renderer.stepLabels(pv),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'Mission order excludes Skill Drill for real level banks');
assert.deepEqual(missionStepNames(Renderer.renderSkillWorld(pv,{failClosed:true}).html),Renderer.stepLabels(pv),'rendered mission map follows production order');
assert.deepEqual(Renderer.stepLabels(dp),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'planned transitional packages hide Skill Drill from the routed mission order');
assert.deepEqual(missionStepNames(Renderer.renderSkillWorld(dp,{failClosed:true}).html),Renderer.stepLabels(dp),'planned package map does not show Skill Drill after Profile');

function completeZoneAndAdvance(state,pkg,stepIndex){
  const {zone,q}=Renderer.zoneQuestion(pkg,stepIndex);
  Renderer.showAnswerAndContinue(state,zone,q);
  assert.equal(Renderer.advanceMission(state,pkg),true,`${zone} advances after it is answered or revealed`);
}
const pvFlowState=Renderer.createState();
for(let i=0;i<4;i++)assert.equal(Renderer.advanceMission(pvFlowState,pv),true,`PV advances through intro step ${i}`);
completeZoneAndAdvance(pvFlowState,pv,4);
completeZoneAndAdvance(pvFlowState,pv,5);
completeZoneAndAdvance(pvFlowState,pv,6);
assert.equal(pvFlowState.stepIndex,7,'G1M_PV_001 routes Checkpoint to Badge');
let pvFlowHtml=Renderer.renderSkillWorld(pv,{state:pvFlowState,failClosed:true}).html;
classContains(pvFlowHtml,'badge-screen','is-active');
assert.equal(Renderer.advanceMission(pvFlowState,pv),true,'G1M_PV_001 routes Badge to Profile before drill');
assert.equal(pvFlowState.stepIndex,8,'Profile follows Badge for G1M_PV_001');
pvFlowHtml=Renderer.renderSkillWorld(pv,{state:pvFlowState,failClosed:true}).html;
pvFlowState.profile=Renderer.finalize(pvFlowState,pv,'pv-flow-learner');
pvFlowHtml=Renderer.renderSkillWorld(pv,{state:pvFlowState,failClosed:true}).html;
classContains(pvFlowHtml,'profile-screen','is-active');
assert.match(pvFlowHtml,/Continue to Skill Practice/,'Profile launches Skill Practice for real level banks');
assert.equal(Renderer.advanceMission(pvFlowState,pv),false,'Profile remains the final screen');

const dpFlowState=Renderer.createState();
for(let i=0;i<4;i++)assert.equal(Renderer.advanceMission(dpFlowState,dp),true,`DP advances through intro step ${i}`);
completeZoneAndAdvance(dpFlowState,dp,4);
completeZoneAndAdvance(dpFlowState,dp,5);
completeZoneAndAdvance(dpFlowState,dp,6);
assert.equal(dpFlowState.stepIndex,7,'G1M_DP_001 routes Checkpoint to Badge without planned Skill Drill');
let dpFlowHtml=Renderer.renderSkillWorld(dp,{state:dpFlowState,failClosed:true}).html;
assert.doesNotMatch(dpFlowHtml,/skill-drill-screen/,'G1M_DP_001 does not render a dead planned drill screen after Profile');
classContains(dpFlowHtml,'badge-screen','is-active');
dpFlowState.profile=Renderer.finalize(dpFlowState,dp,'dp-flow-learner');
assert.equal(Renderer.advanceMission(dpFlowState,dp),true,'G1M_DP_001 routes Badge to Profile');
assert.equal(dpFlowState.stepIndex,8,'Profile is final for planned package');
assert.equal(Renderer.advanceMission(dpFlowState,dp),false,'planned package Profile remains final');
const dpProfileHtml=Renderer.renderSkillWorld(dp,{state:dpFlowState,failClosed:true}).html;
assert.doesNotMatch(dpProfileHtml,/Continue to Skill Practice|data-step="Skill Drill"/,'planned package Profile does not send learners to a planned drill');
assert.match(dpProfileHtml,/Skill Practice coming soon/,'planned package can explain Skill Practice is coming soon');


const missingLevelBanks=JSON.parse(JSON.stringify(pv));
delete missingLevelBanks.level_banks;
assert.equal(Schema.validateSkillPackage(missingLevelBanks).valid,false,'production packages missing level_banks should fail');
const naLevelBanks=JSON.parse(JSON.stringify(missingLevelBanks));
naLevelBanks.level_banks_status='not_applicable';
assert.equal(Schema.validateSkillPackage(naLevelBanks).valid,true,'not_applicable can bypass level banks');
const plannedLevelBanks=JSON.parse(JSON.stringify(missingLevelBanks));
plannedLevelBanks.level_banks_status='planned';
assert.equal(Schema.validateSkillPackage(plannedLevelBanks).valid,true,'planned transitional packages are allowed by default tests');
assert.equal(Schema.validateSkillPackage(plannedLevelBanks,{allowPlannedLevelBanks:false}).valid,false,'strict production validation rejects planned status');
assert.ok(Array.isArray(pv.level_banks),'G1M_PV_001 proves required level_banks');
assert.ok(pv.level_banks.filter((level)=>!/mixed/i.test(`${level.level_id} ${level.label}`)).length>=3,'at least three focused levels');
assert.ok(pv.level_banks.some((level)=>/mixed/i.test(`${level.level_id} ${level.label}`)),'Mixed level exists');
pv.level_banks.forEach((level)=>{
  assert.ok(level.focus);
  assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} should have 10–12 questions`);
  assert.ok(new Set(level.questions.map((q)=>q.misconception_tag)).size>=1,`${level.level_id} needs misconception coverage`);
});
const shortLevel=JSON.parse(JSON.stringify(pv));
shortLevel.level_banks[0].questions=shortLevel.level_banks[0].questions.slice(0,9);
assert.equal(Schema.validateSkillPackage(shortLevel).valid,false,'level with fewer than 10 questions fails');
const longLevel=JSON.parse(JSON.stringify(pv));
longLevel.level_banks[0].questions=longLevel.level_banks[0].questions.concat(longLevel.level_banks[0].questions.slice(0,3));
assert.equal(Schema.validateSkillPackage(longLevel).valid,false,'level with more than 12 questions fails');
const noMixed=JSON.parse(JSON.stringify(pv));
noMixed.level_banks=noMixed.level_banks.filter((level)=>!/mixed/i.test(`${level.level_id} ${level.label}`));
assert.equal(Schema.validateSkillPackage(noMixed).valid,false,'missing Mixed level fails');
const pvDrillState=Renderer.createState();
pvDrillState.stepIndex=7;
let drillHtml=Renderer.renderSkillWorld(pv,{state:pvDrillState,mode:'drill',failClosed:true}).html;
assert.match(drillHtml,/Skill Drill Center/,'Skill Drill Center renders');
assert.match(drillHtml,/level-card/,'level cards render');
assert.match(drillHtml,/Level 1/,'Skill Drill Center renders Level 1 card');
assert.match(drillHtml,/Mixed/,'Skill Drill Center renders Mixed card');
Renderer.selectLevel(pvDrillState,0);
drillHtml=Renderer.renderSkillWorld(pv,{state:pvDrillState,mode:'drill',failClosed:true}).html;
assert.match(drillHtml,/Question 1 \/ 10/,'Skill Drill question counter renders');
const level=Renderer.activeLevel(pv,pvDrillState);
const firstLevelQuestion=Renderer.activeLevelQuestion(pv,pvDrillState);
assert.equal(Renderer.levelQuestionAnswered(pvDrillState,level,firstLevelQuestion),false);
assert.equal(Renderer.submitLevelAnswer(pvDrillState,level,firstLevelQuestion,firstLevelQuestion.correct_answer).correct,true,'level question flow grades correct answer');
assert.equal(Renderer.levelQuestionAnswered(pvDrillState,level,firstLevelQuestion),true);
assert.equal(Renderer.advanceLevelQuestion(pvDrillState,level),true,'level Next advances question');
for(let i=pvDrillState.drill.questionIndex;i<level.questions.length;i++){
  const q=Renderer.activeLevelQuestion(pv,pvDrillState);
  Renderer.submitLevelAnswer(pvDrillState,level,q,q.correct_answer);
  Renderer.advanceLevelQuestion(pvDrillState,level);
}
drillHtml=Renderer.renderSkillWorld(pv,{state:pvDrillState,failClosed:true}).html;
assert.match(drillHtml,/drill-completion/,'level completion summary appears');
assert.match(drillHtml,/Replay Level/);
assert.match(drillHtml,/Next Level/);
assert.match(drillHtml,/Back to Skill Drill Center/);
Renderer.backToDrillCenter(pvDrillState);
drillHtml=Renderer.renderSkillWorld(pv,{state:pvDrillState,mode:'drill',failClosed:true}).html;
assert.match(drillHtml,/Skill Drill Center/,'Back to Skill Drill Center works');
const drillGrowth=Renderer.finalize(pvDrillState,pv,'learner-drill');
assert.ok(drillGrowth.mission_growth,'mission growth data is separate from drill growth data');
assert.ok(drillGrowth.drill_growth,'drill growth data is separate from mission growth data');
assert.ok(drillGrowth.drill_growth.level_results.some((r)=>r.level_id===level.level_id&&r.mastery_status==='Mastered'),'level results save into growth data');
assert.ok(drillGrowth.drill_growth.completed_levels.includes(level.level_id),'completed_levels tracks mastered levels');
assert.ok(Object.prototype.hasOwnProperty.call(drillGrowth,'mixed_level_accuracy'));
assert.ok(Object.prototype.hasOwnProperty.call(drillGrowth,'weakest_level'));
assert.ok(Object.prototype.hasOwnProperty.call(drillGrowth,'recommended_level_review'));

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

const shortResponseOneTen={ question_type:'short_response', correct_answer:'1 ten', acceptable_answers:['one ten','1 tens'] };
assert.equal(Renderer.evaluateAnswer({question_type:'short_response',correct_answer:'circle'},'Circle'),true,'short_response accepts Circle for correct_answer circle');
assert.equal(Renderer.evaluateAnswer({question_type:'short_response',correct_answer:'circle'},'CIRCLE'),true,'short_response accepts CIRCLE for correct_answer circle');
assert.equal(Renderer.evaluateAnswer({question_type:'short_response',correct_answer:'circle'},'circle.'),true,'short_response accepts circle. for correct_answer circle');
assert.equal(Renderer.evaluateAnswer({question_type:'short_response',correct_answer:'shape',acceptable_answers:['circle']},'CIRCLE'),true,'short_response capitalization normalization applies to acceptable_answers');
assert.equal(Renderer.evaluateAnswer(dp.checkpoint[0],'Circle'),true,'G1M_DP_001 checkpoint accepts capitalization normalization');
assert.equal(Renderer.evaluateAnswer(dp.checkpoint[0],'CIRCLE'),true,'G1M_DP_001 checkpoint accepts all-caps normalization');
assert.equal(Renderer.evaluateAnswer(dp.checkpoint[0],'triangle'),false,'G1M_DP_001 checkpoint rejects unrelated answers');
assert.equal(Renderer.evaluateAnswer(shortResponseOneTen,'1 ten'),true,'short_response accepts exact correct answer');
assert.equal(Renderer.evaluateAnswer(shortResponseOneTen,'1 ten.'),true,'short_response accepts trailing punctuation');
assert.equal(Renderer.evaluateAnswer(shortResponseOneTen,'  1   ten  '),true,'short_response trims and collapses repeated spaces');
assert.equal(Renderer.evaluateAnswer(shortResponseOneTen,'one ten'),true,'short_response accepts normalized acceptable_answers');
assert.equal(Renderer.evaluateAnswer(shortResponseOneTen,'1 tens'),true,'short_response accepts listed plural acceptable answer');
assert.equal(Renderer.evaluateAnswer(shortResponseOneTen,'2 tens'),false,'short_response rejects unrelated wrong answers');
const oneTenState=Renderer.createState();
const oneTenResult=Renderer.submitAnswer(oneTenState,'practice',shortResponseOneTen,'1 ten.');
assert.equal(oneTenResult.correct,true,'equivalent short_response answer earns correct feedback');
assert.equal(oneTenState.correct,1,'equivalent short_response answer awards credit');
assert.equal(oneTenState.stars,1,'equivalent short_response answer awards a star');
const revealOnlyState=Renderer.createState();
Renderer.showAnswerAndContinue(revealOnlyState,'practice',shortResponseOneTen);
assert.equal(revealOnlyState.correct,0,'Show Answer does not award credit');
assert.equal(revealOnlyState.stars,0,'Show Answer does not award a star');

const growth=Renderer.finalize(state,dp,'learner-1');
['accuracy_percent','attempts','completed_at','correct','domain','grade','hints_used','learner_id','mastery_status','misconception_watch','recommended_next_skill','skill','skill_id','stars_earned','subject','mission_growth','drill_growth','level_results','completed_levels','mixed_level_accuracy','weakest_level','recommended_level_review'].forEach((k)=>assert.ok(Object.prototype.hasOwnProperty.call(growth,k),`growth missing ${k}`));
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
const nsLine=VisualRegistry.render(ns.guided_practice[0]);
assert.match(nsLine,/sw-number-line/);
assert.match(nsLine,/visual-scroll number-line-window/);
assert.match(nsLine,/skill-visual-inner number-line-visual/);
assert.match(nsLine,/Focused number line/);
const nsNearHundred=VisualRegistry.render(ns.checkpoint.find((q)=>String(q.prompt).includes('99')));
assert.match(nsNearHundred,/number-line-window/);
assert.match(nsNearHundred,/>99<|>\?<|>100</,'focused number line keeps the missing tick visible');
const st3=Renderer.createState();
Renderer.submitAnswer(st3,'guided',ns.guided_practice[0],ns.guided_practice[0].correct_answer);
Renderer.submitAnswer(st3,'challenge',ns.adaptive_question_bank[3],ns.adaptive_question_bank[3].correct_answer);
Renderer.submitAnswer(st3,'checkpoint',ns.checkpoint[1],ns.checkpoint[1].correct_answer);
const growth3=Renderer.finalize(st3,ns,'learner-3');
assert.equal(growth3.skill_id,'G1M_NS_002');
assert.ok(['mastered','review'].includes(growth3.mastery_status));

assert.equal(Schema.validateSkillPackage(pv).valid,true);
const pvOneTenQuestions=[...pv.guided_practice,...pv.adaptive_question_bank,...pv.checkpoint].filter((q)=>q.correct_answer==='1 ten');
assert.ok(pvOneTenQuestions.length>=1,'G1M_PV_001 should include 1 ten questions');
pvOneTenQuestions.forEach((q)=>{
  ['1 ten','1 ten.','one ten','one ten.','1 tens'].forEach((answer)=>assert.ok(q.acceptable_answers.includes(answer), `${q.id || q.question_id} missing acceptable answer ${answer}`));
});
assert.ok(Renderer.evaluateAnswer(pvOneTenQuestions[0],'1 ten.'),'G1M_PV_001 1 ten item accepts punctuated equivalent answer');
assert.equal(Renderer.evaluateAnswer(pvOneTenQuestions[0],'2 tens'),false,'G1M_PV_001 1 ten item rejects unrelated answer');
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
assert.match(pvVisual,/skill-visual-inner/);
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
assert.match(dpPattern,/visual-scroll/);
assert.match(dpPattern,/pattern-token missing/);
const dpSort=VisualRegistry.render(dp.guided_practice[0]);
assert.match(dpSort,/sorting-visual/);
assert.match(dpSort,/visual-scroll/);
assert.match(dpSort,/sorting-bins/);

console.log('skill-world-generator tests passed');
