const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..','..');
const load=(id)=>JSON.parse(fs.readFileSync(path.join(root,`public/gamehub/skill-world/content/${id}.skill-package.v1.json`),'utf8'));
const grade1SkillIds=['G1M_NS_001','G1M_NS_002','G1M_NS_003','G1M_PV_001','G1M_OP_001','G1M_OP_002','G1M_OP_003','G1M_GM_001','G1M_GM_002','G1M_DP_001','G1M_MD_TIME_001','G1E_RF_001','G1E_RF_002','G1E_PH_001','G1E_PH_002','G1E_SW_001','G1E_FL_001','G1E_RC_001','G1E_RC_002','G1E_WR_001','G1E_WR_002'];
const grade1Packages=grade1SkillIds.map(load);
const g2PlaceValue=load('G2M_PV_001');
const byId=Object.fromEntries([...grade1Packages,g2PlaceValue].map((pkg)=>[pkg.skill_id,pkg]));
const dp=byId.G1M_DP_001;
const op=byId.G1M_OP_003;
const ns=byId.G1M_NS_002;
const pv=byId.G1M_PV_001;
const time=byId.G1M_MD_TIME_001;
const englishLetters=byId.G1E_RF_001;
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
  assert.doesNotMatch(html,/data-step="Skill Drill"/,'Skill Practice is not embedded as a mission-map step');
  if(Renderer.hasRealLevelBanks(pkg)){assert.match(html,/Continue to Skill Practice/,'production packages launch practice from Profile');}
  else{assert.doesNotMatch(html,/Continue to Skill Practice/,'transitional packages do not show a dead Skill Practice entry');}
  ['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen','Show Answer','Start Mission','Next: Watch Me','Next: Demo','Next: Practice','Save Growth Data','Replay Mission','Exit to Adaptive Hub'].forEach((label)=>assert.match(html,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`missing ${label}`));
  assert.match(html,/data-renderer="[^"]+"/,'missing visual renderer output');
  assert.doesNotMatch(html,/plain quiz/i);
}

grade1Packages.forEach(assertFullMission);
assertFullMission(g2PlaceValue);

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
grade1Packages.forEach(assertActiveGuidedFlow);
const index=fs.readFileSync(path.join(root,'public/gamehub/skill-world/index.html'),'utf8');
assert.match(index,/skill-world\.css/);
assert.match(index,/failClosed:true/);
assert.match(index,/drillPath/,'/skill-world/:skillId/drill launches Skill Practice mode');
const css=fs.readFileSync(path.join(root,'public/gamehub/skill-world/skill-world.css'),'utf8');
['skill-world-header','mission-map','stat-card','answer-button','feedback-area','badge-celebration','visual-model','skill-visual','skill-visual-inner','visual-scroll','answer-grid','lesson-grid','safe-bottom','overflow-x:hidden','@media'].forEach((token)=>assert.match(css,new RegExp(token)));
assert.ok(css.includes('env(safe-area-inset-bottom)'),'missing mobile safe-area padding');
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/,'mobile mission map should use a compact 3x3 grid');

function missionStepNames(html){return [...html.matchAll(/<span class="mission-step[^"]*"[^>]*data-step="([^"]+)"/g)].map((m)=>m[1]);}
assert.deepEqual(Renderer.stepLabels(pv),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'Mission order excludes Skill Practice for real level banks');
assert.deepEqual(missionStepNames(Renderer.renderSkillWorld(pv,{failClosed:true}).html),Renderer.stepLabels(pv),'rendered mission map follows production order');
assert.deepEqual(Renderer.stepLabels(dp),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'active packages keep Skill Practice out of the routed mission order');
assert.deepEqual(missionStepNames(Renderer.renderSkillWorld(dp,{failClosed:true}).html),Renderer.stepLabels(dp),'active package map does not show Skill Practice after Profile');

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
assert.equal(dpFlowState.stepIndex,7,'G1M_DP_001 routes Checkpoint to Badge before Profile');
let dpFlowHtml=Renderer.renderSkillWorld(dp,{state:dpFlowState,failClosed:true}).html;
assert.doesNotMatch(dpFlowHtml,/skill-drill-screen/,'G1M_DP_001 does not embed practice as a mission screen');
classContains(dpFlowHtml,'badge-screen','is-active');
dpFlowState.profile=Renderer.finalize(dpFlowState,dp,'dp-flow-learner');
assert.equal(Renderer.advanceMission(dpFlowState,dp),true,'G1M_DP_001 routes Badge to Profile');
assert.equal(dpFlowState.stepIndex,8,'Profile is final after Skill Practice moved to its own center');
assert.equal(Renderer.advanceMission(dpFlowState,dp),false,'Profile remains final in the mission flow');
const dpProfileHtml=Renderer.renderSkillWorld(dp,{state:dpFlowState,failClosed:true}).html;
assert.match(dpProfileHtml,/Continue to Skill Practice/,'G1M_DP_001 Profile launches Skill Practice for real level banks');
assert.doesNotMatch(dpProfileHtml,/Skill Practice coming soon|data-step="Skill Drill"/,'G1M_DP_001 no longer shows coming soon practice copy');

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

grade1Packages.forEach((pkg)=>{
  assert.ok(Array.isArray(pkg.level_banks),`${pkg.skill_id} has real level_banks`);
  assert.equal(pkg.level_banks_status,undefined,`${pkg.skill_id} does not keep planned level_banks_status`);
  assert.ok(pkg.level_banks.filter((level)=>!/mixed/i.test(`${level.level_id} ${level.label}`)).length>=4,`${pkg.skill_id} has at least 4 focused levels`);
  assert.ok(pkg.level_banks.some((level)=>/mixed/i.test(`${level.level_id} ${level.label}`)),`${pkg.skill_id} has Mixed level`);
  pkg.level_banks.forEach((level)=>{
    assert.ok(level.level_id&&level.label&&level.focus&&level.difficulty&&level.question_count_required&&level.mastery_threshold,`${pkg.skill_id} ${level.level_id} has required level fields`);
    assert.ok(level.questions.length>=10&&level.questions.length<=12,`${pkg.skill_id} ${level.level_id} has 10–12 questions`);
    if(/mixed/i.test(`${level.level_id} ${level.label}`)){assert.ok(level.questions.length>=10&&level.questions.length<=12,`${pkg.skill_id} Mixed level has 10–12 questions`);}
    level.questions.forEach((q)=>{
      assert.ok(q.question_id&&q.prompt&&q.question_type&&(q.support_type||q.visual_model)&&q.correct_answer!==undefined&&q.hints&&q.misconception_tag&&(q.feedback||q.explanation),`${pkg.skill_id} ${level.level_id} question has required fields`);
      if(q.question_type==='short_response'){assert.ok(Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0,`${q.question_id} short_response includes acceptable_answers`);}
    });
  });
  const drillState=Renderer.createState();
  const practiceHtml=Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html;
  assert.match(practiceHtml,/Skill Practice Center/,`${pkg.skill_id} Skill Practice Center renders`);
  assert.match(practiceHtml,/level-card/,`${pkg.skill_id} Skill Practice Center renders level cards`);
  const profileState=Renderer.createState();
  profileState.stepIndex=8;
  const profileHtml=Renderer.renderSkillWorld(pkg,{state:profileState,failClosed:true}).html;
  assert.match(profileHtml,/Continue to Skill Practice/,`${pkg.skill_id} Profile shows Continue to Skill Practice`);
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
assert.match(drillHtml,/Skill Practice Center/,'Skill Practice Center renders');
assert.match(drillHtml,/level-card/,'level cards render');
assert.match(drillHtml,/Level 1/,'Skill Practice Center renders Level 1 card');
assert.match(drillHtml,/Mixed/,'Skill Practice Center renders Mixed card');
Renderer.selectLevel(pvDrillState,0);
drillHtml=Renderer.renderSkillWorld(pv,{state:pvDrillState,mode:'drill',failClosed:true}).html;
assert.match(drillHtml,/Question 1 \/ 10/,'Skill Practice question counter renders');
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
assert.match(drillHtml,/Back to Skill Practice Center/);
Renderer.backToDrillCenter(pvDrillState);
drillHtml=Renderer.renderSkillWorld(pv,{state:pvDrillState,mode:'drill',failClosed:true}).html;
assert.match(drillHtml,/Skill Practice Center/,'Back to Skill Practice Center works');
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
Renderer.submitAnswer(st2,'guided',op.guided_practice[0],op.guided_practice[0].correct_answer);
Renderer.submitAnswer(st2,'challenge',op.adaptive_question_bank[0],op.adaptive_question_bank[0].correct_answer);
Renderer.submitAnswer(st2,'checkpoint',op.checkpoint[0],op.checkpoint[0].correct_answer);
const growth2=Renderer.finalize(st2,op,'learner-2');
assert.equal(growth2.mastery_status,'mastered');
assert.equal(growth2.recommended_next_skill,op.next_skill_id);
const bondQuestion=[...op.guided_practice,...op.adaptive_question_bank,...op.checkpoint].find((q)=>q.visual_model==='number_bond');
assert.ok(bondQuestion,'G1M_OP_003 includes a number bond visual');
assert.match(VisualRegistry.render(bondQuestion),/number-bond-visual/);
assert.match(VisualRegistry.render(bondQuestion),/bond-lines/);

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

assert.equal(Schema.validateSkillPackage(englishLetters).valid,true,'G1E_RF_001 schema validates');
assert.equal(englishLetters.skill,'Letter Recognition and Sounds');
assert.equal(englishLetters.subject,'English');
assert.equal(englishLetters.domain,'Reading Foundations');
assert.deepEqual(englishLetters.level_banks.map((level)=>level.level_id),['G1E_RF_001_LVL1','G1E_RF_001_LVL2','G1E_RF_001_LVL3','G1E_RF_001_LVL4','G1E_RF_001_MIXED']);
assert.equal(englishLetters.level_banks.filter((level)=>!/mixed/i.test(`${level.level_id} ${level.label}`)).length,4,'G1E_RF_001 has four focused levels');
englishLetters.level_banks.forEach((level)=>{
  assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`);
});
assert.equal(englishLetters.level_banks.find((level)=>level.level_id==='G1E_RF_001_MIXED').questions.length,12,'G1E_RF_001 Mixed has 12 questions');
['letter_name_confusion','uppercase_lowercase_confusion','sound_symbol_confusion','visually_similar_letter_confusion'].forEach((tag)=>{
  assert.ok(englishLetters.misconception_bank[tag],`G1E_RF_001 misconception bank includes ${tag}`);
  assert.ok(englishLetters.level_banks.flatMap((level)=>level.questions).some((q)=>q.misconception_tag===tag),`G1E_RF_001 questions cover ${tag}`);
});
const englishQuestions=[...englishLetters.guided_practice,...englishLetters.adaptive_question_bank,...englishLetters.checkpoint,...englishLetters.level_banks.flatMap((level)=>level.questions)];
englishQuestions.filter((q)=>q.question_type==='short_response').forEach((q)=>assert.ok(Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0,`${q.question_id} has acceptable_answers`));
assert.match(VisualRegistry.render(englishQuestions.find((q)=>q.visual_model==='letter_card')),/letter-card-visual/,'letter_card renderer output exists');
assert.match(VisualRegistry.render(englishQuestions.find((q)=>q.visual_model==='letter_card')),/data-renderer="letter_card"/,'letter_card data renderer exists');
assert.match(VisualRegistry.render(englishQuestions.find((q)=>q.visual_model==='sound_match')),/sound-match-visual/,'sound_match renderer output exists');
assert.match(VisualRegistry.render(englishQuestions.find((q)=>q.visual_model==='picture_choice')),/picture-choice-visual/,'picture_choice renderer output exists');
assert.ok(englishQuestions.some((q)=>q.visual_model==='visual_objects'),'G1E_RF_001 uses visual_objects support');
assert.ok(Schema.VISUAL_MODELS.includes('letter_card'));
assert.ok(Schema.VISUAL_MODELS.includes('sound_match'));
assert.ok(Schema.VISUAL_MODELS.includes('picture_choice'));
assert.ok(Schema.VISUAL_MODELS.includes('word_card'));
assert.ok(Schema.VISUAL_MODELS.includes('sentence_card'));
const englishMissionHtml=Renderer.renderSkillWorld(englishLetters,{failClosed:true}).html;
['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen'].forEach((label)=>assert.match(englishMissionHtml,new RegExp(label.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')),`G1E_RF_001 mission missing ${label}`));
assert.match(Renderer.renderSkillWorld(englishLetters,{mode:'drill',failClosed:true}).html,/Skill Practice Center/,'G1E_RF_001 Skill Practice Center renders');
assert.ok(Renderer.evaluateAnswer(englishQuestions.find((q)=>q.question_type==='short_response'&&q.correct_answer==='a'),'A'),'G1E_RF_001 short_response accepts case-insensitive acceptable answer');


const englishProductionIds=['G1E_RF_002','G1E_PH_001','G1E_PH_002','G1E_SW_001','G1E_FL_001','G1E_RC_001','G1E_RC_002','G1E_WR_001','G1E_WR_002'];
const requiredEnglishRenderers=['word_sound_map','word_builder','word_family_sort','rhyme_match','sentence_highlight','phrase_builder','sentence_builder','short_passage','picture_story','question_card','story_sequence','picture_order','event_cards','writing_checklist','punctuation_marker','picture_prompt','detail_picker'];
requiredEnglishRenderers.forEach((renderer)=>{
  assert.ok(Schema.VISUAL_MODELS.includes(renderer),`schema includes ${renderer}`);
  assert.ok(VisualRegistry.hasRenderer(renderer),`renderer registry supports ${renderer}`);
  assert.match(VisualRegistry.render({visual_model:renderer,prompt:'Test prompt',correct_answer:'cat',word:'cat',sentence:'The cat runs.',passage:'Mia sees a cat.',events:['first','next','last'],choices:['cat','bat','dog'],validation_checks:['capital','spacing','punctuation']}),new RegExp(`data-renderer="${renderer}"`),`${renderer} outputs meaningful visual markup`);
});
englishProductionIds.forEach((id)=>{
  const pkg=byId[id];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates as production package`);
  assert.equal(pkg.subject,'English');
  assert.equal(pkg.level_banks.length,5,`${id} has four focused levels plus Mixed`);
  assert.ok(pkg.level_banks.some((level)=>/mixed/i.test(`${level.level_id} ${level.label}`)),`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>{
    assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10-12 questions`);
    level.questions.forEach((q)=>{
      assert.ok(q.question_id&&q.prompt&&q.question_type&&(q.support_type||q.visual_model)&&q.correct_answer!==undefined&&q.hints&&q.misconception_tag&&(q.feedback||q.explanation),`${q.question_id} has required question fields`);
      assert.notEqual(VisualRegistry.render(q),'<div></div>',`${q.question_id} renders visual markup`);
      assert.match(VisualRegistry.render(q),/data-renderer="[^"]+"/,`${q.question_id} has visual renderer data attribute`);
      if(q.question_type==='short_response')assert.ok(Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0,`${q.question_id} short response has acceptable_answers`);
    });
  });
});
const writingQuestions=[...byId.G1E_WR_001.level_banks.flatMap((level)=>level.questions),...byId.G1E_WR_002.level_banks.flatMap((level)=>level.questions)].filter((q)=>q.question_type==='short_response');
assert.ok(writingQuestions.some((q)=>Array.isArray(q.validation_checks)&&q.validation_checks.includes('capital')),'writing validation includes capital check');
assert.ok(writingQuestions.some((q)=>Array.isArray(q.validation_checks)&&q.validation_checks.includes('spacing')),'writing validation includes spacing check');
assert.ok(writingQuestions.some((q)=>Array.isArray(q.validation_checks)&&q.validation_checks.includes('punctuation')),'writing validation includes punctuation check');
assert.ok(writingQuestions.some((q)=>Array.isArray(q.validation_checks)&&q.validation_checks.includes('complete_sentence')),'writing validation includes complete sentence check');
assert.equal(Renderer.evaluateAnswer({question_type:'short_response',validation_checks:['capital','spacing','punctuation','complete_sentence'],correct_answer:'The cat runs.',acceptable_answers:['The cat runs.']},'The dog jumps.'),true,'writing validation accepts child-friendly complete sentences');
assert.equal(Renderer.evaluateAnswer({question_type:'short_response',validation_checks:['capital','spacing','punctuation','complete_sentence'],correct_answer:'The cat runs.',acceptable_answers:['The cat runs.']},'the dog jumps'),false,'writing validation catches missing capital and punctuation');


assert.equal(Schema.validateSkillPackage(g2PlaceValue,{allowPlannedLevelBanks:false}).valid,true,'G2M_PV_001 schema validates as production package');
assert.equal(g2PlaceValue.grade,2);
assert.equal(g2PlaceValue.subject,'Math');
assert.equal(g2PlaceValue.domain,'Number and Operations in Base Ten');
assert.equal(g2PlaceValue.skill,'Place Value to Hundreds');
assert.deepEqual(g2PlaceValue.level_banks.map((level)=>level.level_id),['G2M_PV_001_LVL1','G2M_PV_001_LVL2','G2M_PV_001_LVL3','G2M_PV_001_LVL4','G2M_PV_001_MIXED']);
assert.equal(g2PlaceValue.level_banks.filter((level)=>!/mixed/i.test(`${level.level_id} ${level.label}`)).length,4,'G2M_PV_001 has four focused levels');
assert.equal(g2PlaceValue.level_banks.find((level)=>level.level_id==='G2M_PV_001_MIXED').questions.length,12,'G2M_PV_001 Mixed has 12 questions');
g2PlaceValue.level_banks.forEach((level)=>{
  assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`);
  level.questions.forEach((question)=>{
    assert.ok(question.question_id&&question.prompt&&question.question_type&&(question.support_type||question.visual_model)&&question.correct_answer!==undefined&&question.hints&&question.misconception_tag&&(question.feedback||question.explanation),`${question.question_id} has required production fields`);
    if(question.question_type==='short_response')assert.ok(Array.isArray(question.acceptable_answers)&&question.acceptable_answers.length>0,`${question.question_id} short_response has acceptable_answers`);
  });
});
['hundreds_place_confusion','digit_value_confusion','expanded_form_error','zero_placeholder_confusion','ten_tens_confusion'].forEach((tag)=>{
  assert.ok(g2PlaceValue.misconception_bank[tag],`G2M_PV_001 misconception bank includes ${tag}`);
  assert.ok(g2PlaceValue.level_banks.flatMap((level)=>level.questions).some((q)=>q.misconception_tag===tag),`G2M_PV_001 level banks cover ${tag}`);
});
assert.ok(Schema.VISUAL_MODELS.includes('place_value_chart'));
assert.ok(Schema.VISUAL_MODELS.includes('expanded_form'));
assert.ok(Schema.VISUAL_MODELS.includes('base_ten_blocks'));
assert.ok(VisualRegistry.hasRenderer('place_value_chart'));
assert.ok(VisualRegistry.hasRenderer('expanded_form'));
assert.ok(VisualRegistry.hasRenderer('base_ten_blocks'));
const g2Questions=[...g2PlaceValue.guided_practice,...g2PlaceValue.adaptive_question_bank,...g2PlaceValue.checkpoint,...g2PlaceValue.level_banks.flatMap((level)=>level.questions)];
assert.ok(g2Questions.some((q)=>q.visual_model==='visual_objects'),'G2M_PV_001 uses visual_objects support');
const g2Chart=VisualRegistry.render(g2Questions.find((q)=>q.visual_model==='place_value_chart'));
assert.match(g2Chart,/place-value-chart-visual/,'place_value_chart renderer output exists');
assert.match(g2Chart,/Hundreds/,'place_value_chart shows Hundreds');
assert.match(g2Chart,/Tens/,'place_value_chart shows Tens');
assert.match(g2Chart,/Ones/,'place_value_chart shows Ones');
const g2Expanded=VisualRegistry.render(g2Questions.find((q)=>q.visual_model==='expanded_form'&&Number(q.value)===342));
assert.match(g2Expanded,/expanded-form-visual/,'expanded_form renderer output exists');
assert.match(g2Expanded,/342/,'expanded_form shows standard number');
assert.match(g2Expanded,/300/,'expanded_form shows hundreds value');
assert.match(g2Expanded,/40/,'expanded_form shows tens value');
assert.match(g2Expanded,/2/,'expanded_form shows ones value');
const g2BaseTen=VisualRegistry.render(g2Questions.find((q)=>q.visual_model==='base_ten_blocks'&&Number(q.value)>=300));
assert.match(g2BaseTen,/base-ten-visual/,'base_ten_blocks renderer output exists');
assert.match(g2BaseTen,/Hundreds flats/,'base_ten_blocks supports hundreds flats');
assert.match(g2BaseTen,/hundred-flat/,'base_ten_blocks renders hundred-flat elements');
const g2MissionHtml=Renderer.renderSkillWorld(g2PlaceValue,{failClosed:true}).html;
['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen'].forEach((label)=>assert.match(g2MissionHtml,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`G2M_PV_001 mission missing ${label}`));
assert.match(Renderer.renderSkillWorld(g2PlaceValue,{mode:'drill',failClosed:true}).html,/Skill Practice Center/,'G2M_PV_001 Skill Practice Center renders');
assert.ok(Renderer.evaluateAnswer(g2Questions.find((q)=>q.question_type==='short_response'&&q.correct_answer==='300 + 40 + 2'),'300 + 40 + 2.'),'G2M_PV_001 short_response accepts acceptable answer');

const dpPattern=VisualRegistry.render(dp.checkpoint[0]);
assert.match(dpPattern,/pattern-visual/);
assert.match(dpPattern,/visual-scroll/);
assert.match(dpPattern,/pattern-token missing/);
const dpSort=VisualRegistry.render(dp.guided_practice[0]);
assert.match(dpSort,/sorting-visual/);
assert.match(dpSort,/visual-scroll/);
assert.match(dpSort,/sorting-bins/);
const clockVisual=VisualRegistry.render(time.guided_practice[0]);
assert.match(clockVisual,/analog-clock-visual/);
assert.match(clockVisual,/clock-face/);
assert.match(clockVisual,/clock-number n12/);
assert.match(clockVisual,/hour-hand/);
assert.match(clockVisual,/minute-hand/);

console.log('skill-world-generator tests passed');
