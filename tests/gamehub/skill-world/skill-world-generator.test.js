const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..','..');
const load=(id)=>JSON.parse(fs.readFileSync(path.join(root,`public/gamehub/skill-world/content/${id}.skill-package.v1.json`),'utf8'));
const grade1SkillIds=['G1M_NS_001','G1M_NS_002','G1M_NS_003','G1M_PV_001','G1M_OP_001','G1M_OP_002','G1M_OP_003','G1M_GM_001','G1M_GM_002','G1M_DP_001','G1M_MD_TIME_001','G1E_RF_001','G1E_RF_002','G1E_PH_001','G1E_PH_002','G1E_SW_001','G1E_FL_001','G1E_RC_001','G1E_RC_002','G1E_WR_001','G1E_WR_002'];
const grade1Packages=grade1SkillIds.map(load);
const grade2SkillIds=['G2E_RF_001','G2E_RF_002','G2E_FL_001','G2E_VOC_001','G2E_RC_001','G2E_RC_002','G2E_RC_003','G2E_WR_001','G2E_WR_002','G2E_WR_003','G2M_PV_001','G2M_NS_001','G2M_NS_002','G2M_OP_001','G2M_OP_002','G2M_OP_003','G2M_WP_001','G2M_MD_001','G2M_MD_002','G2M_MD_003','G2M_GM_001'];
const grade2Packages=grade2SkillIds.map(load);
const grade3SkillIds=['G3E_RF_001','G3E_FL_001','G3E_VOC_001','G3E_RC_001','G3E_RC_002','G3E_RC_003','G3E_WR_001','G3E_WR_002','G3E_WR_003','G3E_LANG_001','G3M_MUL_001','G3M_DIV_001','G3M_FACT_001','G3M_WP_001','G3M_PV_001','G3M_FR_001','G3M_FR_002','G3M_MD_001','G3M_GM_001','G3M_GM_002'];
const grade3Packages=grade3SkillIds.map(load);
const g3AdvancedPhonics=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_RF_001');
const g3Fluency=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_FL_001');
const g3Vocabulary=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_VOC_001');
const g3TextEvidence=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_RC_001');
const g3StoryElements=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_RC_002');
const g3MainIdeaFeatures=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_RC_003');
const g3OpinionWriting=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_WR_001');
const g3InformativeWriting=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_WR_002');
const g3NarrativeWriting=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_WR_003');
const g3LanguageConventions=grade3Packages.find((pkg)=>pkg.skill_id==='G3E_LANG_001');
const g3MultiplicationFoundations=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_MUL_001');
const g3DivisionFoundations=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_DIV_001');
const g3FactFluency=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_FACT_001');
const g3WordProblems=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_WP_001');
const g3PlaceValueRounding=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_PV_001');
const g3FractionFoundations=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_FR_001');
const g3FractionComparisons=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_FR_002');
const g3MeasurementData=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_MD_001');
const g3AreaPerimeter=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_GM_001');
const g3GeometryShapes=grade3Packages.find((pkg)=>pkg.skill_id==='G3M_GM_002');
const g4DivisionRemainders=load('G4M_NBT_004');
const g4FractionEquivalenceOrdering=load('G4M_FR_001');
const g4AddSubtractFractions=load('G4M_FR_002');
const g4MultiplyFractionsWholeNumbers=load('G4M_FR_003');
const g4MeasurementConversionData=load('G4M_MD_001');
const g4AnglesLinesShapes=load('G4M_GM_001');
const g5WordAnalysis=load('G5E_RF_001');
const g5TextEvidence=load('G5E_RC_001');
const g5Fluency=load('G5E_FL_001');
const g5Vocabulary=load('G5E_VOC_001');
const g5StoryStructure=load('G5E_RC_002');
const g5InformationalIntegration=load('G5E_RC_003');
const g5OpinionWriting=load('G5E_WR_001');
const g5InformativeWriting=load('G5E_WR_002');
const g5NarrativeWriting=load('G5E_WR_003');
const g5LanguageConventions=load('G5E_LANG_001');
const g6WordAnalysis=load('G6E_RF_001');
const g6Fluency=load('G6E_FL_001');
const g6Vocabulary=load('G6E_VOC_001');
const g6TextEvidence=load('G6E_RC_001');
const g6Literature=load('G6E_RC_002');
const g6Informational=load('G6E_RC_003');
const g6ArgumentWriting=load('G6E_WR_001');
const g6InformativeWriting=load('G6E_WR_002');
const g6NarrativeWriting=load('G6E_WR_003');
const g6LanguageConventions=load('G6E_LANG_001');
const g2AdvancedPhonics=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_RF_001');
const g2WordParts=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_RF_002');
const g2FluencyEnglish=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_FL_001');
const g2Vocabulary=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_VOC_001');
const g2AskAnswer=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_RC_001');
const g2StoryStructure=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_RC_002');
const g2MainIdea=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_RC_003');
const g2OpinionWriting=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_WR_001');
const g2InformativeWriting=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_WR_002');
const g2NarrativeWriting=grade2Packages.find((pkg)=>pkg.skill_id==='G2E_WR_003');
const g2PlaceValue=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_PV_001');
const g2CountReadWrite=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_NS_001');
const g2Compare=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_NS_002');
const g2AddWithin100=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_OP_001');
const g2SubtractWithin100=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_OP_002');
const g2FluencyWithin20=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_OP_003');
const g2WordProblems=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_WP_001');
const g2MeasureLength=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_MD_001');
const g2TimeMoney=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_MD_002');
const g2DataGraphs=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_MD_003');
const g2Geometry=grade2Packages.find((pkg)=>pkg.skill_id==='G2M_GM_001');
const byId=Object.fromEntries([...grade1Packages,...grade2Packages,...grade3Packages].map((pkg)=>[pkg.skill_id,pkg]));

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

const schemaSource=fs.readFileSync(path.join(root,'public/gamehub/skill-world/engine/skill-package-schema.js'),'utf8');
const recommendationSource=fs.readFileSync(path.join(root,'public/gamehub/skill-world/engine/recommendation-helper.js'),'utf8');
const growthAdapterSource=fs.readFileSync(path.join(root,'public/gamehub/skill-world/engine/growth-data-adapter.js'),'utf8');
const visualRegistrySource=fs.readFileSync(path.join(root,'public/gamehub/skill-world/renderers/visual-model-registry.js'),'utf8');
const rendererSource=fs.readFileSync(path.join(root,'public/gamehub/skill-world/engine/skill-world-renderer.js'),'utf8');
const skillWorldIndex=fs.readFileSync(path.join(root,'public/gamehub/skill-world/index.html'),'utf8');
global.localStorage={_m:new Map(),setItem(k,v){this._m.set(k,v)},getItem(k){return this._m.get(k)||null}};

assert.equal(typeof Schema.validateSkillPackage,'function','Node require exposes validateSkillPackage');
assert.equal(typeof Schema.ensureQuestionId,'function','Node require exposes ensureQuestionId');
assert.equal(typeof Schema.validateQuestionTypes,'function','Node require exposes validateQuestionTypes');
const browserContext={console,window:null,self:null,globalThis:null,localStorage:global.localStorage};
browserContext.window=browserContext;
browserContext.self=browserContext;
browserContext.globalThis=browserContext;
vm.runInNewContext(schemaSource,browserContext,{filename:'skill-package-schema.js'});
assert.ok(browserContext.SkillPackageSchema,'browser/global simulation exposes SkillPackageSchema');
assert.equal(typeof browserContext.SkillPackageSchema.validateSkillPackage,'function','browser/global simulation exposes SkillPackageSchema.validateSkillPackage');
assert.equal(typeof browserContext.SkillPackageSchema.ensureQuestionId,'function','browser/global simulation exposes SkillPackageSchema.ensureQuestionId');
assert.equal(typeof browserContext.SkillPackageSchema.validateQuestionTypes,'function','browser/global simulation exposes SkillPackageSchema.validateQuestionTypes');
vm.runInNewContext(recommendationSource,browserContext,{filename:'recommendation-helper.js'});
vm.runInNewContext(growthAdapterSource,browserContext,{filename:'growth-data-adapter.js'});
vm.runInNewContext(visualRegistrySource,browserContext,{filename:'visual-model-registry.js'});
vm.runInNewContext(rendererSource,browserContext,{filename:'skill-world-renderer.js'});
assert.equal(typeof browserContext.SkillWorldRenderer.renderSkillWorld,'function','renderer can access the browser schema object and export itself');
assert.match(browserContext.SkillWorldRenderer.renderSkillWorld(load('G1M_NS_001'),{failClosed:true}).html,/Skill World:|Skill Practice Center/,'browser/global renderer renders with schema validation');
assert.ok(skillWorldIndex.indexOf('skill-package-schema.js')>-1,'Skill World index includes skill-package-schema.js');
assert.ok(skillWorldIndex.indexOf('skill-world-renderer.js')>-1,'Skill World index includes skill-world-renderer.js');
assert.ok(skillWorldIndex.indexOf('skill-package-schema.js')<skillWorldIndex.indexOf('skill-world-renderer.js'),'generated HTML loads skill-package-schema.js before skill-world-renderer.js');

assert.equal(Schema.validateSkillPackage({...englishLetters,guided_practice:[{...englishLetters.guided_practice[0],question_audio:{text:'Which card shows uppercase letter M?',label:'Read Question',type:'question',repeat_count:1}}]},{allowPlannedLevelBanks:false}).valid,true,'schema accepts question_audio on questions');
assert.equal(Renderer.normalizeQuestionNarrationText('Which card shows uppercase S?'),'Which card shows uppercase letter S?','question narration normalizes uppercase letter phrasing');
assert.equal(Renderer.normalizeQuestionNarrationText('Which card shows lowercase m?'),'Which card shows lowercase letter m?','question narration normalizes lowercase letter phrasing');
assert.equal(Renderer.normalizeQuestionNarrationText('Point to /m/ in a CVC word.'),'Point to the mmm sound in a C V C word.','question narration normalizes phonics notation');
const explicitQuestionAudioHtml=Renderer.renderQuestionCard({...englishLetters.guided_practice[0],question_audio:{text:'Which card shows uppercase letter M?',label:'Read Question',type:'question',repeat_count:2}},'practice',Renderer.createState(),englishLetters);
assert.match(explicitQuestionAudioHtml,/Read Question/,'renderer shows Read Question when question_audio exists');
assert.match(explicitQuestionAudioHtml,/data-audio-text="Which card shows uppercase letter M\?"/,'Read Question uses explicit question_audio text');
assert.match(explicitQuestionAudioHtml,/data-audio-repeat="2"/,'Read Question uses question_audio repeat_count');
assert.match(explicitQuestionAudioHtml,/data-audio-url=""/,'Read Question supports optional cached audio URL without requiring generated audio');
const cachedQuestionAudioHtml=Renderer.renderQuestionCard({...englishLetters.guided_practice[0],question_audio:{text:'Which card shows uppercase letter S?',label:'Read Question',type:'question',repeat_count:1,voice:'child_friendly',audio_url:'/generated-audio/skill-world/hash.mp3',cache_key:'skill-world:G1E_RF_001:question:abc123',playback_preference:'cached_audio_first'}},'practice',Renderer.createState(),englishLetters);
assert.match(cachedQuestionAudioHtml,/data-audio-url="\/generated-audio\/skill-world\/hash\.mp3"/,'audio_url is rendered when present');
assert.match(cachedQuestionAudioHtml,/data-audio-cache-key="skill-world:G1E_RF_001:question:abc123"/,'cache_key is rendered when present');
assert.match(cachedQuestionAudioHtml,/data-audio-voice="child_friendly"/,'voice is rendered when present');
assert.match(cachedQuestionAudioHtml,/data-audio-playback-preference="cached_audio_first"/,'cached audio preference is rendered when present');
assert.equal(Schema.validateSkillPackage({...englishLetters,guided_practice:[{...englishLetters.guided_practice[0],question_audio:{text:'Which card shows uppercase letter S?',label:'Read Question',type:'question',repeat_count:1,voice:'child_friendly',audio_url:'/generated-audio/skill-world/hash.mp3',cache_key:'skill-world:G1E_RF_001:question:abc123',playback_preference:'cached_audio_first'}}]},{allowPlannedLevelBanks:false}).valid,true,'schema accepts optional cached audio fields on question_audio');
assert.equal(Schema.validateSkillPackage({...englishLetters,guided_practice:[{...englishLetters.guided_practice[0],audio:{text:'Which card shows uppercase letter S?',label:'Read Question',type:'question',repeat_count:1,voice:'child_friendly',audio_url:'/generated-audio/skill-world/hash.mp3',cache_key:'skill-world:G1E_RF_001:question:abc123',playback_preference:'cached_audio_first'}}]},{allowPlannedLevelBanks:false}).valid,true,'schema accepts optional cached audio fields on audio blocks');
assert.match(explicitQuestionAudioHtml,/Hear the letter M/,'existing Listen button remains for answer audio');
const readAloudHtml=Renderer.renderQuestionCard({...englishLetters.guided_practice[0],question_audio:undefined,read_aloud_text:'Which card shows uppercase letter M?'},'practice',Renderer.createState());
assert.match(readAloudHtml,/Read Question/,'renderer shows Read Question when read_aloud_text exists');
const mathQuestionWithoutAudio={...dp.guided_practice[0],question_audio:undefined,read_aloud_text:undefined,question_audio_text:undefined};
const mathQuestionHtml=Renderer.renderQuestionCard(mathQuestionWithoutAudio,'practice',Renderer.createState(),dp);
assert.doesNotMatch(mathQuestionHtml,/Read Question/,'Read Question does not appear for Math unless question_audio is present');

const pageAudioSchemaPackage={...dp,skill_id:'TEST_PAGE_AUDIO_SCHEMA',page_audio:{story:{text:'Read the story page.',label:'Read This Page',type:'page',repeat_count:1}},lesson:{...dp.lesson,read_page_text:'Read this lesson page.'}};
assert.equal(Schema.validateSkillPackage(pageAudioSchemaPackage,{allowPlannedLevelBanks:false}).valid,true,'schema accepts page_audio and read_page_text on mission screens');
const pageAudioHtml=Renderer.renderPageNarration({page_audio:{text:'This page explains itself.',label:'Read This Page',type:'page',repeat_count:1}},dp,'practice');
assert.match(pageAudioHtml,/page-read-button[\s\S]*Read This Page/,'renderer shows Read This Page when page narration exists');
assert.equal(Renderer.renderPageNarration({},{...dp,page_audio:undefined},'practice'),'','renderer does not show Read This Page when page narration is absent');
const mathMissionHtmlWithPageAudio=Renderer.renderSkillWorld(dp,{failClosed:true}).html;
assert.match(mathMissionHtmlWithPageAudio,/page-read-button[\s\S]*Read This Page/,'Grade 1 Math guided mission screens render Read This Page controls');
assert.match(mathMissionHtmlWithPageAudio,/page-read-button[\s\S]*Read This Page[\s\S]*question-read-button[\s\S]*Read Question/,'Practice, Challenge, or Checkpoint can show Read This Page and Read Question together');
const stateBeforePageAudio=Renderer.createState();
const stateAfterPageAudio=JSON.stringify(stateBeforePageAudio);
Renderer.renderPageNarration({read_page_text:'Read this page only.'},dp,'practice');
assert.equal(JSON.stringify(stateBeforePageAudio),stateAfterPageAudio,'page narration rendering does not count as a hint or answer attempt');
assert.match(skillWorldIndex,/\.page-read-button/,'Skill World runtime routes Read This Page through existing speech runtime');
assert.match(skillWorldIndex,/fetch\('\/api\/skill-world\/audio'/,'Skill World runtime calls backend generated-audio route before browser speech when no audio_url exists');
assert.match(skillWorldIndex,/if\(!prefersBrowser\)[\s\S]*fetchGeneratedAudio\(button\)[\s\S]*speakWithBrowserSpeech\(button\)/,'Skill World runtime falls back to browser speech when backend audio fails');
assert.match(skillWorldIndex,/if\(!response\.ok\)return '';/,'generated audio fetch failures return no URL so browser speech fallback remains intact');
assert.match(skillWorldIndex,/\.audio-listen-button,\.question-read-button,\.page-read-button/,'existing Read This Page, Read Question, and Listen controls still share the audio click runtime');

const mathExplicitQuestionHtml=Renderer.renderQuestionCard({...dp.guided_practice[0],question_audio:{text:'Read this math question.',label:'Read Question',type:'question',repeat_count:1}},'practice',Renderer.createState(),dp);
assert.match(mathExplicitQuestionHtml,/Read Question/,'Math can render Read Question when question_audio is explicitly present');
const englishQuestionAudioMissionHtml=Renderer.renderSkillWorld(englishLetters,{failClosed:true}).html;
assert.match(englishQuestionAudioMissionHtml,/Read Question[\s\S]*Hear the letter M/,'mission questions can show Read Question and Listen');
const englishDrillState=Renderer.createState();
englishDrillState.mode='drill';
const englishDrillCenterHtml=Renderer.renderSkillWorld(englishLetters,{state:englishDrillState,mode:'drill',failClosed:true}).html;
assert.match(englishDrillCenterHtml,/Skill Practice Center/,'English drill center still renders');
Renderer.selectLevel(englishDrillState,0);
const englishDrillQuestionHtml=Renderer.renderSkillWorld(englishLetters,{state:englishDrillState,mode:'drill',failClosed:true}).html;
assert.match(englishDrillQuestionHtml,/Read Question[\s\S]*Hear the letter A/,'drill questions can render Read Question and Listen');
const grade1SkillPracticeReadAloudIds=['G1M_NS_001','G1M_NS_002','G1M_NS_003','G1M_OP_001','G1M_OP_002','G1M_OP_003','G1M_PV_001','G1M_GM_001','G1M_GM_002','G1M_MD_TIME_001','G1M_DP_001','G1E_RF_001','G1E_RF_002','G1E_PH_001','G1E_PH_002','G1E_SW_001','G1E_FL_001','G1E_RC_001','G1E_RC_002','G1E_WR_001','G1E_WR_002'];
grade1SkillPracticeReadAloudIds.forEach((id)=>{const pkg=load(id); const levelQuestions=(pkg.level_banks||[]).flatMap((level)=>level.questions||[]); assert.ok(levelQuestions.length>0,`${id} has Skill Practice Center level bank questions`); assert.ok(levelQuestions.every((q)=>q.question_audio?.text||q.read_aloud_text),`${id} Skill Practice Center questions include question narration`);});
grade1SkillPracticeReadAloudIds.forEach((id)=>{const pkg=load(id); const state=Renderer.createState(); state.mode='drill'; Renderer.selectLevel(state,0); const html=Renderer.renderSkillWorld(pkg,{state,mode:'drill',failClosed:true}).html; assert.match(html,/Skill Practice Center/,`/skill-world/${id}/drill renders Skill Practice Center`); assert.match(html,/question-read-button[\s\S]*Read Question/,`${id} drill questions render Read Question controls`);});

const grade1MathSkillPracticeIds=grade1SkillPracticeReadAloudIds.filter((id)=>load(id).subject==='Math');
const grade1EnglishSkillPracticeIds=grade1SkillPracticeReadAloudIds.filter((id)=>load(id).subject==='English');
const grade1MathGuidedPageAudioIds=['G1M_NS_001','G1M_NS_002','G1M_NS_003','G1M_OP_001','G1M_OP_002','G1M_OP_003','G1M_PV_001','G1M_GM_001','G1M_GM_002','G1M_MD_TIME_001','G1M_DP_001'];
const requiredGuidedPageAudioScreens=['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'];
const weakPageNarrationPattern=/^(This is (the )?(lesson|challenge|checkpoint|practice zone|guided demo)|Watch this example\. The model shows one way to think|Great work\. This badge celebrates)/i;
const guidedNextActionPattern=/(Press Start Mission when you are ready|Press Next to continue|Choose your answer when you are ready|Use the hint if you need help|Answer carefully, then continue|Press Next to see your profile|go back to the hub)/i;
grade1MathGuidedPageAudioIds.forEach((id)=>{const pkg=load(id); assert.equal(pkg.grade,1,`${id} is Grade 1`); assert.equal(pkg.subject,'Math',`${id} is Math`); requiredGuidedPageAudioScreens.forEach((screen)=>{const text=pkg.page_audio?.[screen]?.text||''; assert.ok(text,`${id} includes page narration for ${screen}`); assert.equal(pkg.page_audio[screen].label,'Read This Page',`${id} ${screen} page narration uses Read This Page label`); assert.ok(text.split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} page narration has tutor-style multi-sentence instruction`); assert.ok(text.length>=140,`${id} ${screen} page narration is not a weak one-sentence placeholder`); assert.doesNotMatch(text,weakPageNarrationPattern,`${id} ${screen} page narration does not use weak placeholder copy`); assert.match(text,guidedNextActionPattern,`${id} ${screen} page narration includes next-action language`);}); assert.match(pkg.page_audio.watch.text,/worked example|prompt|question/i,`${id} watch narration introduces the worked example prompt`); assert.match(pkg.page_audio.watch.text,/model/i,`${id} watch narration describes what the model shows`); assert.match(pkg.page_audio.watch.text,/Step one[\s\S]*Step two[\s\S]*Step three/i,`${id} watch narration includes step-by-step language`); assert.match(pkg.page_audio.watch.text,/final answer|answer is/i,`${id} watch narration includes final-answer language`); ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/i,`${id} ${screen} page narration mentions Read Question`)); const html=Renderer.renderSkillWorld(pkg,{failClosed:true}).html; assert.match(html,/page-read-button[\s\S]*Read This Page/,`${id} renders guided page narration`); assert.match(html,/question-read-button[\s\S]*Read Question/,`${id} mission questions retain Read Question controls`);});
assert.match(load('G1M_DP_001').page_audio.watch.text,/sorting[\s\S]*color[\s\S]*model/i,'G1M_DP_001 watch narration includes sorting, color, and model language');

const grade2MathSkillIds=['G2M_PV_001','G2M_NS_001','G2M_NS_002','G2M_OP_001','G2M_OP_002','G2M_OP_003','G2M_WP_001','G2M_MD_001','G2M_MD_002','G2M_MD_003','G2M_GM_001'];
const grade2EnglishSkillIds=['G2E_RF_001','G2E_RF_002','G2E_FL_001','G2E_RC_001','G2E_RC_002','G2E_RC_003','G2E_VOC_001','G2E_WR_001','G2E_WR_002','G2E_WR_003'];
const grade2VoiceIds=[...grade2MathSkillIds,...grade2EnglishSkillIds];
const grade2VoiceQuestionCollections=(pkg)=>[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
const sentenceCount=(text)=>String(text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length;
grade2VoiceIds.forEach((id)=>{const pkg=load(id); assert.equal(pkg.grade,2,`${id} is Grade 2`); assert.ok(['Math','English'].includes(pkg.subject),`${id} is Math or English`); requiredGuidedPageAudioScreens.forEach((screen)=>{const text=pkg.page_audio?.[screen]?.text||pkg.read_page_text||''; assert.ok(text,`${id} includes Grade 2 page narration for ${screen}`); assert.equal(pkg.page_audio[screen].label,'Read This Page',`${id} ${screen} page narration uses Read This Page label`); assert.ok(sentenceCount(text)>=3,`${id} ${screen} page narration is multi-sentence`); assert.ok(text.length>=120,`${id} ${screen} page narration is not weak placeholder text`); assert.doesNotMatch(text,weakPageNarrationPattern,`${id} ${screen} page narration avoids weak placeholder copy`); assert.match(text,/(Look|Use|Press|Check|Read|Listen|Think|Save|Continue)/i,`${id} ${screen} page narration gives tutor guidance`);}); ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/i,`${id} ${screen} narration points students to Read Question`)); const missionQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])]; assert.ok(missionQuestions.length>0,`${id} has mission questions`); assert.ok(missionQuestions.every((q)=>q.question_audio?.text||q.read_aloud_text),`${id} mission Practice, Challenge, and Checkpoint questions include Read Question narration`); const levelQuestions=(pkg.level_banks||[]).flatMap((level)=>level.questions||[]); assert.ok(levelQuestions.length>0,`${id} has Skill Practice level questions`); assert.ok(levelQuestions.every((q)=>q.question_audio?.text||q.read_aloud_text),`${id} Skill Practice Center questions include Read Question narration`); const practiceState=Renderer.createState(); practiceState.stepIndex=4; const practiceHtml=Renderer.renderSkillWorld(pkg,{state:practiceState,failClosed:true}).html; assert.match(practiceHtml,/page-read-button[\s\S]*Read This Page/,`${id} Practice renders Read This Page`); assert.match(practiceHtml,/question-read-button[\s\S]*Read Question/,`${id} Practice renders Read Question`); const challengeState=Renderer.createState(); challengeState.stepIndex=5; const challengeHtml=Renderer.renderSkillWorld(pkg,{state:challengeState,failClosed:true}).html; assert.match(challengeHtml,/page-read-button[\s\S]*Read This Page/,`${id} Challenge renders Read This Page`); assert.match(challengeHtml,/question-read-button[\s\S]*Read Question/,`${id} Challenge renders Read Question`); const checkpointState=Renderer.createState(); checkpointState.stepIndex=6; const checkpointHtml=Renderer.renderSkillWorld(pkg,{state:checkpointState,failClosed:true}).html; assert.match(checkpointHtml,/page-read-button[\s\S]*Read This Page/,`${id} Checkpoint renders Read This Page`); assert.match(checkpointHtml,/question-read-button[\s\S]*Read Question/,`${id} Checkpoint renders Read Question`); assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates with optional cached audio metadata`);});
grade2MathSkillIds.forEach((id)=>{const pkg=load(id); assert.ok(grade2VoiceQuestionCollections(pkg).every((q)=>!q.audio&&!q.audio_text&&!q.speakable_text),`${id} does not add one-off Listen audio for Math`);});
grade2EnglishSkillIds.forEach((id)=>{const pkg=load(id); const questions=grade2VoiceQuestionCollections(pkg); assert.ok(questions.some((q)=>q.audio?.text||q.speakable_text),`${id} preserves or adds Listen audio where English reading matters`);});
['G2E_RF_001','G2E_RF_002','G2E_FL_001','G2E_VOC_001'].forEach((id)=>{const pkg=load(id); const questions=grade2VoiceQuestionCollections(pkg); assert.ok(questions.some((q)=>['phoneme','letter_sound','word','sentence'].includes(q.audio?.type)),`${id} includes phonics, fluency, sight-word, or vocabulary Listen audio`);});
const grade2OptionalCachedSample={...load('G2M_PV_001'),page_audio:{story:{text:'Listen. Look at the model. Press Next.',label:'Read This Page',type:'page'}},guided_practice:[{...load('G2M_PV_001').guided_practice[0],question_audio:{text:'Which model shows three hundreds?',label:'Read Question',type:'question'}}]};
assert.equal(Schema.validateSkillPackage(grade2OptionalCachedSample,{allowPlannedLevelBanks:false}).valid,true,'Grade 2 packages validate without generated AI audio URLs or cache keys');
assert.match(skillWorldIndex,/function speakWithBrowserSpeech\(button\)/,'browser speech fallback remains intact for Grade 2 voice support');
const grade3MathSkillIds=['G3M_MUL_001','G3M_DIV_001','G3M_FACT_001','G3M_WP_001','G3M_PV_001','G3M_FR_001','G3M_FR_002','G3M_MD_001','G3M_GM_001','G3M_GM_002'];
const grade3EnglishSkillIds=grade3Packages.filter((pkg)=>pkg.grade===3&&pkg.subject==='English').map((pkg)=>pkg.skill_id);
const grade3VoiceQuestionCollections=(pkg)=>[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
[...grade3MathSkillIds,...grade3EnglishSkillIds].forEach((id)=>{const pkg=load(id); assert.equal(pkg.grade,3,`${id} is Grade 3`); requiredGuidedPageAudioScreens.forEach((screen)=>{const text=pkg.page_audio?.[screen]?.text||pkg.read_page_text||''; assert.ok(text,`${id} includes Grade 3 page narration for ${screen}`); assert.equal(pkg.page_audio[screen].label,'Read This Page',`${id} ${screen} page narration uses Read This Page label`); assert.ok(sentenceCount(text)>=3,`${id} ${screen} page narration is multi-sentence`); assert.ok(text.length>=140,`${id} ${screen} page narration is not weak placeholder text`); assert.doesNotMatch(text,weakPageNarrationPattern,`${id} ${screen} page narration avoids weak placeholder copy`); assert.match(text,/(Look|Use|Press|Check|Read|Listen|Think|Step|Choose|Answer|Continue)/i,`${id} ${screen} page narration gives tutor guidance`);}); ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/i,`${id} ${screen} narration points students to Read Question`)); const missionQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])]; assert.ok(missionQuestions.length>0,`${id} has mission questions`); assert.ok(missionQuestions.every((q)=>q.question_audio?.text||q.read_aloud_text),`${id} mission Practice, Challenge, and Checkpoint questions include Read Question narration`); const levelQuestions=(pkg.level_banks||[]).flatMap((level)=>level.questions||[]); assert.ok(levelQuestions.length>0,`${id} has Skill Practice level questions`); assert.ok(levelQuestions.every((q)=>q.question_audio?.text||q.read_aloud_text),`${id} Skill Practice Center questions include Read Question narration`); ['practice','challenge','checkpoint'].forEach((stepName,offset)=>{const state=Renderer.createState(); state.stepIndex=4+offset; const html=Renderer.renderSkillWorld(pkg,{state,failClosed:true}).html; assert.match(html,/page-read-button[\s\S]*Read This Page/,`${id} ${stepName} renders Read This Page`); assert.match(html,/question-read-button[\s\S]*Read Question/,`${id} ${stepName} renders Read Question`);}); assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates with optional cached audio metadata`);});
grade3MathSkillIds.forEach((id)=>{const pkg=load(id); assert.ok(grade3VoiceQuestionCollections(pkg).every((q)=>!q.audio&&!q.audio_text&&!q.speakable_text),`${id} does not add one-off Listen audio for Math`); assert.ok(grade3VoiceQuestionCollections(pkg).every((q)=>!/[+×÷=<>]/.test(q.read_aloud_text||q.question_audio?.text||'')),`${id} Read Question narration speaks math symbols naturally`);});
grade3EnglishSkillIds.forEach((id)=>{const pkg=load(id); const questions=grade3VoiceQuestionCollections(pkg); assert.ok(questions.some((q)=>q.audio?.text||q.speakable_text),`${id} preserves or adds Listen audio where English reading matters`); assert.ok(questions.some((q)=>['word','sentence','phoneme','letter_sound'].includes(q.audio?.type)),`${id} includes pronunciation, word-reading, or fluency Listen audio`); assert.ok(questions.filter((q)=>/syllable|r-controlled|prefix|suffix|word part|fluency|vocabulary|sentence|passage/i.test(`${q.prompt} ${q.visual_model} ${q.misconception_tag}`)).every((q)=>q.audio?.text||q.speakable_text),`${id} English pronunciation and fluency items include Listen audio`);});
const grade3OptionalCachedSample={...load('G3M_MUL_001'),page_audio:{story:{text:'Listen. Look at the model. Press Next.',label:'Read This Page',type:'page'}},guided_practice:[{...load('G3M_MUL_001').guided_practice[0],question_audio:{text:'How many equal groups are shown?',label:'Read Question',type:'question'}}]};
assert.equal(Schema.validateSkillPackage(grade3OptionalCachedSample,{allowPlannedLevelBanks:false}).valid,true,'Grade 3 packages validate without generated AI audio URLs or cache keys');
assert.match(skillWorldIndex,/function speakWithBrowserSpeech\(button\)/,'browser speech fallback remains intact for Grade 3 voice support');

grade1EnglishSkillPracticeIds.forEach((id)=>{const pkg=load(id); assert.equal(pkg.grade,1,`${id} is Grade 1`); assert.equal(pkg.subject,'English',`${id} is English`); requiredGuidedPageAudioScreens.forEach((screen)=>{const text=pkg.page_audio?.[screen]?.text||''; assert.ok(text,`${id} includes English page narration for ${screen}`); assert.equal(pkg.page_audio[screen].label,'Read This Page',`${id} ${screen} page narration uses Read This Page label`); assert.ok(text.split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} page narration has tutor-style multi-sentence instruction`); assert.ok(text.length>=140,`${id} ${screen} page narration is not a weak one-sentence placeholder`); assert.doesNotMatch(text,weakPageNarrationPattern,`${id} ${screen} page narration does not use weak placeholder copy`); assert.match(text,/(skill|sound|word|sentence|story|picture|read|listen|write)/i,`${id} ${screen} page narration teaches the English task`); assert.match(text,guidedNextActionPattern,`${id} ${screen} page narration includes next-action language`);}); ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/i,`${id} ${screen} page narration mentions Read Question`)); const html=Renderer.renderSkillWorld(pkg,{failClosed:true}).html; assert.match(html,/page-read-button[\s\S]*Read This Page/,`${id} renders guided page narration`); assert.match(html,/question-read-button[\s\S]*Read Question/,`${id} mission questions retain Read Question controls`);});
['G1E_RF_001','G1E_RF_002','G1E_PH_001','G1E_PH_002','G1E_SW_001','G1E_FL_001'].forEach((id)=>{const pkg=load(id); const listenItems=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])].filter((q)=>q.audio?.text||q.speakable_text); assert.ok(listenItems.length>0,`${id} keeps Listen audio items`); assert.ok(listenItems.every((q)=>q.audio?.label||q.speakable_text),`${id} Listen items keep target audio or speakable text`);});

assert.equal(grade1MathSkillPracticeIds.length,11,'all eleven Grade 1 Math Skill Practice packages are covered');
assert.equal(grade1EnglishSkillPracticeIds.length,10,'all ten Grade 1 English Skill Practice packages are covered');
assert.ok([...grade2Packages,...grade3Packages].every((pkg)=>(pkg.level_banks||[]).flatMap((level)=>level.questions||[]).every((q)=>q.question_audio?.text||q.read_aloud_text)),'Grade 2 and Grade 3 Skill Practice packages include question narration');

const requiredSkillWorldRoutes=['G1M_NS_001','G1E_RF_001','G2M_PV_001','G2E_RF_001','G3M_MUL_001','G3M_FR_001','G3M_MD_001'];
requiredSkillWorldRoutes.forEach((id)=>{
  const html=Renderer.renderSkillWorld(load(id),{failClosed:true}).html;
  assert.match(html,/Skill World:/,`/skill-world/${id} renders Skill World mission HTML`);
});
['G1M_NS_001','G2M_PV_001','G3M_MUL_001'].forEach((id)=>{
  const state=Renderer.createState();
  state.mode='drill';
  const html=Renderer.renderSkillWorld(load(id),{state,mode:'drill',failClosed:true}).html;
  assert.match(html,/Skill Practice Center/,`/skill-world/${id}/drill renders Skill Practice HTML`);
});

assert.ok(g2AdvancedPhonics,'G2E_RF_001 package loads');
assert.equal(Schema.validateSkillPackage(g2AdvancedPhonics,{allowPlannedLevelBanks:false}).valid,true,'G2E_RF_001 validates in strict production mode');
assert.equal(g2AdvancedPhonics.grade,2);
assert.equal(g2AdvancedPhonics.subject,'English');
assert.equal(g2AdvancedPhonics.domain,'Reading Foundations');
assert.equal(g2AdvancedPhonics.skill,'Advanced Phonics and Word Analysis');
assert.ok(Array.isArray(g2AdvancedPhonics.level_banks),'G2E_RF_001 has level_banks');
assert.equal(g2AdvancedPhonics.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G2E_RF_001 has four focused levels');
assert.ok(g2AdvancedPhonics.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),'G2E_RF_001 has Mixed level');
g2AdvancedPhonics.level_banks.forEach((level)=>{
  assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`);
  level.questions.forEach((question)=>{
    if(question.question_type==='short_response'){
      assert.ok(Array.isArray(question.acceptable_answers)&&question.acceptable_answers.length>0,`${question.question_id} acceptable_answers exist`);
    }
  });
});
const g2Visuals=new Set(g2AdvancedPhonics.level_banks.flatMap((level)=>level.questions.map((question)=>question.visual_model||question.support_type)));
['syllable_break','phonics_tiles','sound_boxes','word_builder'].forEach((visual)=>assert.ok(g2Visuals.has(visual),`G2E_RF_001 includes ${visual}`));
const g2Types=new Set(g2AdvancedPhonics.level_banks.flatMap((level)=>level.questions.map((question)=>question.question_type)));
['multiple_choice','short_response','word_building','sound_match'].forEach((type)=>assert.ok(g2Types.has(type),`G2E_RF_001 includes ${type}`));
['blend_digraph_confusion','silent_e_confusion','vowel_team_confusion','syllable_break_error'].forEach((tag)=>assert.ok(g2AdvancedPhonics.misconception_bank[tag],`G2E_RF_001 includes misconception ${tag}`));
const g2AdvancedPhonicsMissionHtml=Renderer.renderSkillWorld(g2AdvancedPhonics,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g2AdvancedPhonicsMissionHtml,new RegExp(label),`G2E_RF_001 mission renders ${label}`));
assert.match(g2AdvancedPhonicsMissionHtml,/Continue to Skill Practice/,'G2E_RF_001 profile links to Skill Practice Center');
const g2AdvancedPhonicsDrillHtml=Renderer.renderSkillWorld(g2AdvancedPhonics,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
assert.match(g2AdvancedPhonicsDrillHtml,/Skill Practice Center/,'G2E_RF_001 practice route renders Skill Practice Center');
assert.match(g2AdvancedPhonicsDrillHtml,/Level 1: Consonant Blends and Digraphs/,'G2E_RF_001 drill renders Level 1');
assert.match(VisualRegistry.render({visual_model:'syllable_break',word:'sunset',syllables:['sun','set'],correct_answer:'sun-set'}),/data-renderer="syllable_break"/,'syllable_break renderer output exists');
assert.match(VisualRegistry.render({visual_model:'phonics_tiles',word:'train',tiles:['tr','ai','n'],correct_answer:'train'}),/data-tile-kind="blend"[\s\S]*data-tile-kind="vowel-team"/,'phonics_tiles supports blends and vowel teams');
assert.match(VisualRegistry.render({visual_model:'phonics_tiles',word:'ship',tiles:['sh','i','p'],correct_answer:'ship'}),/data-tile-kind="digraph"/,'phonics_tiles supports digraphs');
assert.match(VisualRegistry.render({visual_model:'phonics_tiles',word:'cake',tiles:['c','a','k','e'],silent_e:true,correct_answer:'cake'}),/data-tile-kind="silent-e"/,'phonics_tiles supports silent e');
assert.match(VisualRegistry.render({visual_model:'sound_boxes',word:'boat',sounds:['b','oa','t'],correct_answer:'boat'}),/data-renderer="sound_boxes"[\s\S]*data-sound-kind="vowel-team"/,'sound_boxes renderer output exists with grouped vowel team');
assert.match(VisualRegistry.render({visual_model:'word_builder',word:'stone',tiles:['st','o','n','e'],missing_tile:'e',correct_answer:'stone'}),/data-renderer="word_builder"[\s\S]*Target word: stone/,'word_builder renderer output exists');

assert.ok(g3AdvancedPhonics,'G3E_RF_001 package loads');
assert.equal(Schema.validateSkillPackage(g3AdvancedPhonics,{allowPlannedLevelBanks:false}).valid,true,'G3E_RF_001 validates in strict production mode');
assert.equal(g3AdvancedPhonics.grade,3);
assert.equal(g3AdvancedPhonics.subject,'English');
assert.equal(g3AdvancedPhonics.domain,'Reading Foundations');
assert.equal(g3AdvancedPhonics.skill,'Multisyllable Word Reading and Advanced Phonics');
assert.equal(Array.isArray(g3AdvancedPhonics.level_banks),true,'G3E_RF_001 has real level_banks');
assert.equal(g3AdvancedPhonics.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G3E_RF_001 has four focused levels');
assert.equal(g3AdvancedPhonics.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G3E_RF_001 has Mixed level');
g3AdvancedPhonics.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
['Level 1: Syllable Types','Level 2: R-Controlled Vowels','Level 3: Prefixes and Suffixes','Level 4: Multisyllable Decoding','Mixed'].forEach((label)=>assert.ok(g3AdvancedPhonics.level_banks.some((level)=>level.label===label),`G3E_RF_001 includes ${label}`));
const g3EQuestions=g3AdvancedPhonics.level_banks.flatMap((level)=>level.questions);
['syllable_break','phonics_tiles','word_parts','morpheme_tiles'].forEach((visual)=>assert.ok(g3EQuestions.some((q)=>q.visual_model===visual),`G3E_RF_001 includes ${visual}`));
['multiple_choice','short_response','word_building'].forEach((type)=>assert.ok(g3EQuestions.some((q)=>q.question_type===type),`G3E_RF_001 includes ${type}`));
['syllable_break_error','r_controlled_vowel_confusion','affix_meaning_confusion','multisyllable_guessing'].forEach((tag)=>assert.ok(g3AdvancedPhonics.misconception_bank[tag],`G3E_RF_001 includes misconception ${tag}`));
assert.ok(g3EQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G3E_RF_001 acceptable_answers exist for short-response items');
const g3AdvancedPhonicsMissionHtml=Renderer.renderSkillWorld(g3AdvancedPhonics,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g3AdvancedPhonicsMissionHtml,new RegExp(label),`G3E_RF_001 mission renders ${label}`));
assert.match(g3AdvancedPhonicsMissionHtml,/Continue to Skill Practice/,'G3E_RF_001 profile links to Skill Practice Center');
const g3AdvancedPhonicsDrillHtml=Renderer.renderSkillWorld(g3AdvancedPhonics,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
assert.match(g3AdvancedPhonicsDrillHtml,/Skill Practice Center/,'G3E_RF_001 practice route renders Skill Practice Center');
assert.match(g3AdvancedPhonicsDrillHtml,/Level 1: Syllable Types/,'G3E_RF_001 drill renders Level 1');
assert.match(VisualRegistry.render(g3EQuestions.find((q)=>q.visual_model==='syllable_break')),/data-renderer="syllable_break"/,'G3E_RF_001 syllable_break renderer output exists');
assert.match(VisualRegistry.render(g3EQuestions.find((q)=>q.visual_model==='phonics_tiles')),/data-renderer="phonics_tiles"/,'G3E_RF_001 phonics_tiles renderer output exists');
assert.match(VisualRegistry.render(g3EQuestions.find((q)=>q.visual_model==='word_parts')),/data-renderer="word_parts"/,'G3E_RF_001 word_parts renderer output exists');
assert.match(VisualRegistry.render(g3EQuestions.find((q)=>q.visual_model==='morpheme_tiles')),/data-renderer="morpheme_tiles"/,'G3E_RF_001 morpheme_tiles renderer output exists');

function assertGrade2EnglishPackage(pkg,expected){
  assert.ok(pkg,`${expected.id} package loads`);
  const result=Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false});
  assert.equal(result.valid,true,`${expected.id} validates in strict production mode: ${result.errors.join('; ')}`);
  assert.equal(pkg.grade,2,`${expected.id} grade`);
  assert.equal(pkg.subject,'English',`${expected.id} subject`);
  assert.equal(pkg.domain,expected.domain,`${expected.id} domain`);
  assert.equal(pkg.skill,expected.skill,`${expected.id} skill`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${expected.id} has four focused levels`);
  assert.ok(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),`${expected.id} has Mixed level`);
  expected.levelLabels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${expected.id} includes ${label}`));
  pkg.level_banks.forEach((level)=>{
    assert.ok(level.questions.length>=10&&level.questions.length<=12,`${expected.id} ${level.level_id} has 10–12 questions`);
    level.questions.forEach((question)=>{
      if(['short_response','writing_response','sentence_completion','sequencing'].includes(question.question_type)){
        assert.ok(Array.isArray(question.acceptable_answers)&&question.acceptable_answers.length>0,`${question.question_id} acceptable_answers exist`);
      }
      if(question.question_type==='writing_response'){
        assert.ok(Array.isArray(question.validation_checks)&&question.validation_checks.length>0,`${question.question_id} writing validation checks exist`);
      }
    });
  });
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${expected.id} mission renders ${label}`));
  const drillHtml=Renderer.renderSkillWorld(pkg,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${expected.id} practice route renders Skill Practice Center`);
  assert.ok(drillHtml.includes(expected.levelLabels[0]),`${expected.id} drill renders first level`);
  const visuals=new Set(pkg.level_banks.flatMap((level)=>level.questions.map((question)=>question.visual_model||question.support_type)));
  expected.visuals.forEach((visual)=>assert.ok(visuals.has(visual),`${expected.id} includes ${visual}`));
  const types=new Set(pkg.level_banks.flatMap((level)=>level.questions.map((question)=>question.question_type)));
  expected.types.forEach((type)=>assert.ok(types.has(type),`${expected.id} includes ${type}`));
  expected.tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${expected.id} includes misconception ${tag}`));
}

assertGrade2EnglishPackage(g2WordParts,{
  id:'G2E_RF_002',domain:'Reading Foundations / Vocabulary',skill:'Prefixes, Suffixes, and Base Words',
  levelLabels:['Level 1: Base Words','Level 2: Prefixes','Level 3: Suffixes','Level 4: Build and Decode New Words','Mixed'],
  visuals:['word_parts','morpheme_tiles','word_builder'],types:['multiple_choice','short_response','word_building'],
  tags:['base_word_confusion','prefix_meaning_confusion','suffix_meaning_confusion','word_part_boundary_error']
});
const g2WordPartsQuestions=g2WordParts.level_banks.flatMap((level)=>level.questions);
assert.ok(g2WordPartsQuestions.some((q)=>q.base_word),'G2E_RF_002 includes base word identification');
['re-','un-','pre-'].forEach((prefix)=>assert.ok(g2WordPartsQuestions.some((q)=>q.prefix===prefix),`G2E_RF_002 includes ${prefix}`));
['-s','-ed','-ing','-ful','-less'].forEach((suffix)=>assert.ok(g2WordPartsQuestions.some((q)=>q.suffix===suffix),`G2E_RF_002 includes ${suffix}`));
assert.match(VisualRegistry.render(g2WordPartsQuestions.find((q)=>q.visual_model==='word_parts')),/data-renderer="word_parts"/,'word_parts renderer output exists');
assert.match(VisualRegistry.render(g2WordPartsQuestions.find((q)=>q.visual_model==='morpheme_tiles')),/data-renderer="morpheme_tiles"/,'morpheme_tiles renderer output exists');

assertGrade2EnglishPackage(g2FluencyEnglish,{
  id:'G2E_FL_001',domain:'Fluency',skill:'Grade 2 Sight Words and Fluency',
  levelLabels:['Level 1: Grade 2 Sight Word Set A','Level 2: Grade 2 Sight Word Set B','Level 3: Phrase Fluency','Level 4: Sentence Fluency','Mixed'],
  visuals:['word_card','phrase_builder','sentence_card','sentence_highlight'],types:['multiple_choice','short_response','sentence_completion'],
  tags:['sight_word_automaticity_gap','phrase_chunking_error','skips_function_words','punctuation_ignored']
});
const g2FluencyEnglishQuestions=g2FluencyEnglish.level_banks.flatMap((level)=>level.questions);
assert.ok(g2FluencyEnglishQuestions.some((q)=>q.visual_model==='phrase_builder'),'G2E_FL_001 includes phrase reading');
assert.ok(g2FluencyEnglishQuestions.some((q)=>q.visual_model==='sentence_highlight'||q.visual_model==='sentence_card'),'G2E_FL_001 includes sentence fluency');
assert.ok(g2FluencyEnglishQuestions.some((q)=>q.misconception_tag==='punctuation_ignored'),'G2E_FL_001 includes punctuation attention');

assertGrade2EnglishPackage(g2Vocabulary,{
  id:'G2E_VOC_001',domain:'Vocabulary',skill:'Vocabulary and Context Clues',
  levelLabels:['Level 1: Synonyms and Antonyms','Level 2: Context Clues','Level 3: Multiple-Meaning Words','Level 4: Categories and Attributes','Mixed'],
  visuals:['word_card','context_sentence','vocabulary_match','category_sort'],types:['multiple_choice','short_response','vocabulary_match','category_sort'],
  tags:['context_clue_ignored','synonym_antonym_confusion','multiple_meaning_confusion','category_attribute_error']
});
const g2VocabularyQuestions=g2Vocabulary.level_banks.flatMap((level)=>level.questions);
assert.ok(g2VocabularyQuestions.some((q)=>q.visual_model==='vocabulary_match'),'G2E_VOC_001 includes synonym/antonym pairs');
assert.ok(g2VocabularyQuestions.some((q)=>q.visual_model==='context_sentence'&&q.misconception_tag==='context_clue_ignored'),'G2E_VOC_001 includes context-clue sentence questions');
assert.ok(g2VocabularyQuestions.some((q)=>q.misconception_tag==='multiple_meaning_confusion'),'G2E_VOC_001 includes multiple-meaning words');
assert.ok(g2VocabularyQuestions.some((q)=>q.visual_model==='category_sort'),'G2E_VOC_001 includes category sorting');
assert.match(VisualRegistry.render(g2VocabularyQuestions.find((q)=>q.visual_model==='context_sentence')),/data-renderer="context_sentence"/,'context_sentence renderer output exists');
assert.match(VisualRegistry.render(g2VocabularyQuestions.find((q)=>q.visual_model==='vocabulary_match')),/data-renderer="vocabulary_match"/,'vocabulary_match renderer output exists');
assert.match(VisualRegistry.render(g2VocabularyQuestions.find((q)=>q.visual_model==='category_sort')),/data-renderer="category_sort"/,'category_sort renderer output exists');

assertGrade2EnglishPackage(g2AskAnswer,{
  id:'G2E_RC_001',domain:'Reading Comprehension',skill:'Ask and Answer Questions About Text',
  levelLabels:['Level 1: Who / What / Where','Level 2: When / Why / How','Level 3: Find Text Evidence','Level 4: Mixed Questions','Mixed'],
  visuals:['short_passage','question_card','evidence_highlight','picture_story'],types:['multiple_choice','short_response','text_evidence'],
  tags:['unsupported_answer','question_word_confusion','misses_text_evidence','detail_inference_confusion']
});
const g2AskAnswerQuestions=g2AskAnswer.level_banks.flatMap((level)=>level.questions);
assert.ok(g2AskAnswerQuestions.some((q)=>/who|what|where/i.test(q.prompt)),'G2E_RC_001 includes who/what/where questions');
assert.ok(g2AskAnswerQuestions.some((q)=>/when|why|how/i.test(q.prompt)),'G2E_RC_001 includes when/why/how questions');
assert.ok(g2AskAnswerQuestions.some((q)=>q.question_type==='text_evidence'||q.visual_model==='evidence_highlight'),'G2E_RC_001 includes text evidence questions');
assert.ok(g2AskAnswerQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G2E_RC_001 short responses include acceptable_answers');
assert.match(VisualRegistry.render(g2AskAnswerQuestions.find((q)=>q.visual_model==='evidence_highlight')),/data-renderer="evidence_highlight"/,'evidence_highlight renderer output exists');

assertGrade2EnglishPackage(g2StoryStructure,{
  id:'G2E_RC_002',domain:'Reading Comprehension',skill:'Story Structure and Retelling',
  levelLabels:['Level 1: Characters and Setting','Level 2: Problem and Solution','Level 3: Beginning, Middle, End','Level 4: Retell the Story','Mixed'],
  visuals:['story_map','story_sequence','event_cards'],types:['multiple_choice','sequence_order'],
  tags:['character_setting_confusion','problem_solution_confusion','sequence_order_error','retell_detail_gap']
});
const g2StoryStructureQuestions=g2StoryStructure.level_banks.flatMap((level)=>level.questions);
assert.ok(g2StoryStructureQuestions.some((q)=>/characters|setting/i.test(q.prompt)),'G2E_RC_002 includes character and setting identification');
assert.ok(g2StoryStructureQuestions.some((q)=>/problem|solution/i.test(q.prompt)),'G2E_RC_002 includes problem/solution questions');
assert.ok(g2StoryStructureQuestions.some((q)=>q.question_type==='sequence_order'),'G2E_RC_002 includes beginning/middle/end sequence ordering');
assert.ok(g2StoryStructureQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G2E_RC_002 short responses include acceptable_answers');
assert.match(VisualRegistry.render(g2StoryStructureQuestions.find((q)=>q.visual_model==='story_map')),/data-renderer="story_map"/,'story_map renderer output exists');

assertGrade2EnglishPackage(g2MainIdea,{
  id:'G2E_RC_003',domain:'Reading Comprehension',skill:'Main Idea and Key Details',
  levelLabels:['Level 1: Topic','Level 2: Main Idea','Level 3: Key Details','Level 4: Match Details to Main Idea','Mixed'],
  visuals:['short_passage','main_idea_web','detail_cards','evidence_highlight'],types:['multiple_choice','short_response','text_evidence'],
  tags:['topic_main_idea_confusion','detail_selection_error','unsupported_detail','main_idea_too_broad']
});
const g2MainIdeaQuestions=g2MainIdea.level_banks.flatMap((level)=>level.questions);
assert.ok(g2MainIdeaQuestions.some((q)=>/topic/i.test(q.prompt)),'G2E_RC_003 includes topic questions');
assert.ok(g2MainIdeaQuestions.some((q)=>/main idea/i.test(q.prompt)),'G2E_RC_003 includes main idea questions');
assert.ok(g2MainIdeaQuestions.some((q)=>/detail/i.test(q.prompt)),'G2E_RC_003 includes supporting detail questions');
assert.ok(g2MainIdeaQuestions.some((q)=>/match/i.test(q.prompt)),'G2E_RC_003 includes detail-to-main-idea matching');
assert.ok(g2MainIdeaQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G2E_RC_003 short responses include acceptable_answers');
assert.match(VisualRegistry.render(g2MainIdeaQuestions.find((q)=>q.visual_model==='main_idea_web')),/data-renderer="main_idea_web"/,'main_idea_web renderer output exists');
assert.match(VisualRegistry.render(g2MainIdeaQuestions.find((q)=>q.visual_model==='detail_cards')),/data-renderer="detail_cards"/,'detail_cards renderer output exists');

assertGrade2EnglishPackage(g2OpinionWriting,{
  id:'G2E_WR_001',domain:'Writing / Composition',skill:'Write Opinion Pieces',
  levelLabels:['Level 1: State an Opinion','Level 2: Give a Reason','Level 3: Add a Closing','Level 4: Build an Opinion Paragraph','Mixed'],
  visuals:['writing_checklist','sentence_builder','opinion_reason_chart','paragraph_builder'],types:['multiple_choice','short_response','writing_response','sentence_completion'],
  tags:['missing_opinion','weak_reason','missing_closing','off_topic_response']
});
const g2OpinionQuestions=g2OpinionWriting.level_banks.flatMap((level)=>level.questions);
assert.ok(g2OpinionQuestions.some((q)=>/opinion/i.test(q.prompt)),'G2E_WR_001 identifies an opinion');
assert.ok(g2OpinionQuestions.some((q)=>/reason/i.test(q.prompt)),'G2E_WR_001 chooses or writes a reason');
assert.ok(g2OpinionQuestions.some((q)=>/closing/i.test(q.prompt)),'G2E_WR_001 chooses or writes a closing');
assert.ok(g2OpinionQuestions.some((q)=>/paragraph/i.test(q.prompt)&&q.question_type==='writing_response'),'G2E_WR_001 builds an opinion paragraph');
assert.ok(g2OpinionQuestions.filter((q)=>q.question_type==='writing_response').every((q)=>q.validation_checks.includes('opinion_present')&&q.validation_checks.includes('reason_present')&&q.validation_checks.includes('closing_present')),'G2E_WR_001 writing validation checks exist');
assert.match(VisualRegistry.render(g2OpinionQuestions.find((q)=>q.visual_model==='opinion_reason_chart')),/data-renderer="opinion_reason_chart"/,'opinion_reason_chart output exists');
assert.match(VisualRegistry.render(g2OpinionQuestions.find((q)=>q.visual_model==='paragraph_builder')),/data-renderer="paragraph_builder"/,'paragraph_builder output exists');
assert.equal(Renderer.evaluateAnswer(g2OpinionQuestions.find((q)=>q.question_type==='writing_response'),'I think recess is best because kids can play. That is why recess is good.'),true,'opinion validation accepts child-friendly sample');

assertGrade2EnglishPackage(g2InformativeWriting,{
  id:'G2E_WR_002',domain:'Writing / Composition',skill:'Write Informative/Explanatory Text',
  levelLabels:['Level 1: Name a Topic','Level 2: Add Facts','Level 3: Use Linking Words','Level 4: Build an Informative Paragraph','Mixed'],
  visuals:['writing_checklist','fact_cards','paragraph_builder','topic_detail_chart'],types:['multiple_choice','short_response','writing_response','sentence_completion'],
  tags:['missing_topic','unsupported_fact','missing_linking_word','missing_closure']
});
const g2InformativeQuestions=g2InformativeWriting.level_banks.flatMap((level)=>level.questions);
assert.ok(g2InformativeQuestions.some((q)=>/topic/i.test(q.prompt)),'G2E_WR_002 names a topic');
assert.ok(g2InformativeQuestions.some((q)=>/fact/i.test(q.prompt)),'G2E_WR_002 identifies facts');
assert.ok(g2InformativeQuestions.some((q)=>/linking word/i.test(q.prompt)),'G2E_WR_002 uses linking words');
assert.ok(g2InformativeQuestions.some((q)=>/paragraph/i.test(q.prompt)&&q.question_type==='writing_response'),'G2E_WR_002 builds an informative paragraph');
assert.ok(g2InformativeQuestions.filter((q)=>q.question_type==='writing_response').every((q)=>q.validation_checks.includes('topic_present')&&q.validation_checks.includes('fact_present')&&q.validation_checks.includes('linking_word_present')),'G2E_WR_002 writing validation checks exist');
assert.match(VisualRegistry.render(g2InformativeQuestions.find((q)=>q.visual_model==='fact_cards')),/data-renderer="fact_cards"/,'fact_cards output exists');
assert.match(VisualRegistry.render(g2InformativeQuestions.find((q)=>q.visual_model==='topic_detail_chart')),/data-renderer="topic_detail_chart"/,'topic_detail_chart output exists');
assert.equal(Renderer.evaluateAnswer(g2InformativeQuestions.find((q)=>q.question_type==='writing_response'),'Butterflies are my topic. First, butterflies have wings. Also, butterflies drink nectar. Now you know about butterflies.'),true,'informative validation accepts child-friendly sample');

assertGrade2EnglishPackage(g2NarrativeWriting,{
  id:'G2E_WR_003',domain:'Writing / Composition',skill:'Narrative Writing With Sequence',
  levelLabels:['Level 1: Sequence Words','Level 2: Add Event Details','Level 3: Write Beginning / Middle / End','Level 4: Build a Narrative','Mixed'],
  visuals:['story_sequence','event_cards','paragraph_builder','writing_checklist'],types:['multiple_choice','short_response','writing_response','sequencing'],
  tags:['sequence_word_missing','event_order_error','missing_details','missing_closure']
});
const g2NarrativeQuestions=g2NarrativeWriting.level_banks.flatMap((level)=>level.questions);
assert.ok(g2NarrativeQuestions.some((q)=>/sequence word/i.test(q.prompt)),'G2E_WR_003 chooses sequence words');
assert.ok(g2NarrativeQuestions.some((q)=>/event detail/i.test(q.prompt)),'G2E_WR_003 identifies event details');
assert.ok(g2NarrativeQuestions.some((q)=>/beginning, middle, and end/i.test(q.prompt)),'G2E_WR_003 orders beginning/middle/end');
assert.ok(g2NarrativeQuestions.some((q)=>/narrative/i.test(q.prompt)&&q.question_type==='writing_response'),'G2E_WR_003 builds a narrative');
assert.ok(g2NarrativeQuestions.filter((q)=>q.question_type==='writing_response').every((q)=>q.validation_checks.includes('sequence_word_present')&&q.validation_checks.includes('detail_present')&&q.validation_checks.includes('closing_present')),'G2E_WR_003 writing validation checks exist');
assert.equal(Renderer.evaluateAnswer(g2NarrativeQuestions.find((q)=>q.question_type==='writing_response'),'First, I filled a cup with soil. Then, I tucked seeds under the soil. Finally, I watered the cup. It was a day to remember.'),true,'narrative validation accepts child-friendly sample');

function assertGrade3FinalEnglishPackage(pkg,expected){
  assert.ok(pkg,`${expected.id} package loads`);
  const result=Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false});
  assert.equal(result.valid,true,`${expected.id} validates in strict production mode: ${result.errors.join('; ')}`);
  assert.equal(pkg.grade,3,`${expected.id} grade`);
  assert.equal(pkg.subject,'English',`${expected.id} subject`);
  assert.equal(pkg.domain,expected.domain,`${expected.id} domain`);
  assert.equal(pkg.skill,expected.skill,`${expected.id} skill`);
  ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${expected.id} ${screen} Read This Page narration exists`));
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${expected.id} has four focused levels`);
  assert.ok(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),`${expected.id} has Mixed level`);
  expected.levelLabels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${expected.id} includes ${label}`));
  pkg.level_banks.forEach((level)=>{
    assert.ok(level.questions.length>=10&&level.questions.length<=12,`${expected.id} ${level.level_id} has 10–12 questions`);
    level.questions.forEach((question)=>{
      assert.ok(question.question_audio?.text,`${question.question_id} Read Question narration exists`);
      if(['short_response','writing_response','sentence_completion','sequencing','editing'].includes(question.question_type)){
        assert.ok(Array.isArray(question.acceptable_answers)&&question.acceptable_answers.length>0,`${question.question_id} acceptable sample answers exist`);
      }
      if(['short_response','writing_response','sentence_completion','editing'].includes(question.question_type)){
        assert.ok(question.audio?.text,`${question.question_id} Listen audio exists where sentence reading helps`);
      }
      if(question.question_type==='writing_response'){
        assert.ok(Array.isArray(question.validation_checks)&&question.validation_checks.length>0,`${question.question_id} writing validation checks exist`);
      }
    });
  });
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${expected.id} mission renders ${label}`));
  const drillHtml=Renderer.renderSkillWorld(pkg,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${expected.id} practice route renders Skill Practice Center`);
  const visuals=new Set(pkg.level_banks.flatMap((level)=>level.questions.map((question)=>question.visual_model||question.support_type)));
  expected.visuals.forEach((visual)=>assert.ok(visuals.has(visual),`${expected.id} includes ${visual}`));
  expected.types.forEach((type)=>assert.ok(pkg.level_banks.flatMap((level)=>level.questions).some((question)=>question.question_type===type),`${expected.id} includes ${type}`));
  expected.tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${expected.id} includes misconception ${tag}`));
}

assertGrade3FinalEnglishPackage(g3OpinionWriting,{
  id:'G3E_WR_001',domain:'Writing / Composition',skill:'Opinion Writing With Reasons',
  levelLabels:['Level 1: State an Opinion','Level 2: Support With Reasons','Level 3: Linking Words and Conclusion','Level 4: Build Opinion Paragraph','Mixed'],
  visuals:['opinion_reason_chart','paragraph_builder','writing_checklist','sentence_builder'],types:['multiple_choice','short_response','writing_response','sentence_completion'],
  tags:['missing_opinion','weak_reason','missing_linking_word','missing_conclusion']
});
const g3OpinionQuestions=g3OpinionWriting.level_banks.flatMap((level)=>level.questions);
assert.ok(g3OpinionQuestions.filter((q)=>q.question_type==='writing_response').every((q)=>q.validation_checks.includes('opinion_present')&&q.validation_checks.includes('reasons_present')&&q.validation_checks.includes('linking_words_present')&&q.validation_checks.includes('conclusion_present')),'G3E_WR_001 opinion validation checks exist');
assert.equal(Renderer.evaluateAnswer(g3OpinionQuestions.find((q)=>q.question_type==='writing_response'),'I think school gardens are important because students learn about plants. Also, gardens help our school. That is why school gardens matter.'),true,'G3E_WR_001 accepts child-friendly sample');

assertGrade3FinalEnglishPackage(g3InformativeWriting,{
  id:'G3E_WR_002',domain:'Writing / Composition',skill:'Informative Writing With Facts and Details',
  levelLabels:['Level 1: Choose a Topic','Level 2: Add Facts and Definitions','Level 3: Add Details and Linking Words','Level 4: Build Informative Paragraph','Mixed'],
  visuals:['topic_detail_chart','fact_cards','paragraph_builder','writing_checklist'],types:['multiple_choice','short_response','writing_response','sentence_completion'],
  tags:['missing_topic','unsupported_fact','missing_detail','missing_conclusion']
});
const g3InformativeQuestions=g3InformativeWriting.level_banks.flatMap((level)=>level.questions);
assert.ok(g3InformativeQuestions.filter((q)=>q.question_type==='writing_response').every((q)=>q.validation_checks.includes('topic_present')&&q.validation_checks.includes('facts_details_present')&&q.validation_checks.includes('conclusion_present')),'G3E_WR_002 informative validation checks exist');
assert.equal(Renderer.evaluateAnswer(g3InformativeQuestions.find((q)=>q.question_type==='writing_response'),'Honeybees are interesting to learn about. First, honeybees visit flowers. Also, they make honey from nectar. Now you know an important fact about honeybees.'),true,'G3E_WR_002 accepts child-friendly sample');

assertGrade3FinalEnglishPackage(g3NarrativeWriting,{
  id:'G3E_WR_003',domain:'Writing / Composition',skill:'Narrative Writing With Dialogue and Sequence',
  levelLabels:['Level 1: Sequence Events','Level 2: Add Details','Level 3: Dialogue and Temporal Words','Level 4: Build Narrative','Mixed'],
  visuals:['story_sequence','event_cards','paragraph_builder','dialogue_builder'],types:['multiple_choice','short_response','writing_response','sequencing'],
  tags:['event_order_error','missing_details','dialogue_punctuation_error','missing_closure']
});
const g3NarrativeQuestions=g3NarrativeWriting.level_banks.flatMap((level)=>level.questions);
assert.ok(g3NarrativeQuestions.filter((q)=>q.question_type==='writing_response').every((q)=>q.validation_checks.includes('narrative_sequence_present')&&q.validation_checks.includes('dialogue_punctuation')&&q.validation_checks.includes('conclusion_present')),'G3E_WR_003 narrative validation checks exist');
assert.match(VisualRegistry.render(g3NarrativeQuestions.find((q)=>q.visual_model==='dialogue_builder')),/data-renderer="dialogue_builder"/,'dialogue_builder renderer output exists');
assert.equal(Renderer.evaluateAnswer(g3NarrativeQuestions.find((q)=>q.question_type==='writing_response'),'First, Maya ran to the park. Then, the kite caught a branch. Maya said, "My kite is stuck!" Finally, Dad helped her tug it free. It was a day to remember.'),true,'G3E_WR_003 accepts child-friendly sample');

assertGrade3FinalEnglishPackage(g3LanguageConventions,{
  id:'G3E_LANG_001',domain:'Language',skill:'Grammar, Conventions, and Sentence Combining',
  levelLabels:['Level 1: Capitalization and Punctuation','Level 2: Commas and Quotation Marks','Level 3: Subject-Verb Agreement','Level 4: Sentence Combining','Mixed'],
  visuals:['sentence_builder','punctuation_marker','grammar_highlight','sentence_combiner'],types:['multiple_choice','short_response','sentence_completion','editing'],
  tags:['capitalization_error','punctuation_error','agreement_error','sentence_fragment']
});
const g3LanguageQuestions=g3LanguageConventions.level_banks.flatMap((level)=>level.questions);
assert.ok(g3LanguageQuestions.some((q)=>q.validation_checks?.includes('subject_verb_agreement')),'G3E_LANG_001 subject-verb writing validation checks exist');
assert.match(VisualRegistry.render(g3LanguageQuestions.find((q)=>q.visual_model==='grammar_highlight')),/data-renderer="grammar_highlight"/,'grammar_highlight renderer output exists');
assert.match(VisualRegistry.render(g3LanguageQuestions.find((q)=>q.visual_model==='sentence_combiner')),/data-renderer="sentence_combiner"/,'sentence_combiner renderer output exists');
assert.equal(Renderer.evaluateAnswer(g3LanguageQuestions.find((q)=>q.visual_model==='sentence_combiner'),'The wind blew, and the leaves danced.'),true,'G3E_LANG_001 accepts sentence-combining sample');

assert.ok(g5WordAnalysis,'G5E_RF_001 package loads');
{
  const result=Schema.validateSkillPackage(g5WordAnalysis,{allowPlannedLevelBanks:false});
  assert.equal(result.valid,true,`G5E_RF_001 validates in strict production mode: ${result.errors.join('; ')}`);
}
assert.equal(g5WordAnalysis.grade,5,'G5E_RF_001 grade');
assert.equal(g5WordAnalysis.subject,'English','G5E_RF_001 subject');
assert.equal(g5WordAnalysis.domain,'Reading Foundations / Word Analysis','G5E_RF_001 domain');
assert.equal(g5WordAnalysis.skill,'Multisyllable Word Reading, Roots, and Affixes','G5E_RF_001 skill');
assert.deepEqual(Renderer.stepLabels(g5WordAnalysis),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'G5E_RF_001 mission uses full Skill World flow');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>assert.equal(g5WordAnalysis.page_audio?.[screen]?.label,'Read This Page',`G5E_RF_001 ${screen} Read This Page narration exists`));
assert.equal(Array.isArray(g5WordAnalysis.level_banks),true,'G5E_RF_001 has real level_banks');
assert.equal(g5WordAnalysis.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G5E_RF_001 has four focused levels');
assert.equal(g5WordAnalysis.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G5E_RF_001 has Mixed level');
['Level 1: Syllable Patterns','Level 2: Prefixes and Suffixes','Level 3: Greek and Latin Roots','Level 4: Decode Multisyllable Words','Mixed'].forEach((label)=>assert.ok(g5WordAnalysis.level_banks.some((level)=>level.label===label),`G5E_RF_001 includes ${label}`));
g5WordAnalysis.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
const g5WordAnalysisQuestions=g5WordAnalysis.level_banks.flatMap((level)=>level.questions);
assert.equal([...g5WordAnalysis.guided_practice,...g5WordAnalysis.checkpoint,...g5WordAnalysis.adaptive_question_bank].every((question)=>question.question_audio?.label==='Read Question'&&question.question_audio?.text),true,'G5E_RF_001 mission Practice, Challenge, and Checkpoint questions have Read Question narration');
assert.equal(g5WordAnalysisQuestions.every((question)=>question.question_audio?.label==='Read Question'&&question.question_audio?.text),true,'G5E_RF_001 Skill Practice Center questions have Read Question narration');
assert.equal(g5WordAnalysisQuestions.every((question)=>question.audio?.text),true,'G5E_RF_001 questions include Listen audio for roots, affixes, multisyllable words, and pronunciation support');
['syllable_break','word_parts','morpheme_tiles','word_builder'].forEach((visual)=>assert.ok(g5WordAnalysisQuestions.some((q)=>q.visual_model===visual),`G5E_RF_001 includes ${visual}`));
['multiple_choice','short_response','word_building'].forEach((type)=>assert.ok(g5WordAnalysisQuestions.some((q)=>q.question_type===type),`G5E_RF_001 includes ${type}`));
['syllable_division_error','affix_meaning_confusion','root_meaning_confusion','multisyllable_guessing'].forEach((tag)=>assert.ok(g5WordAnalysis.misconception_bank[tag],`G5E_RF_001 includes misconception ${tag}`));
assert.ok(g5WordAnalysisQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G5E_RF_001 acceptable_answers exist for short-response items');
const g5WordAnalysisMissionHtml=Renderer.renderSkillWorld(g5WordAnalysis,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g5WordAnalysisMissionHtml,new RegExp(label),`G5E_RF_001 mission renders ${label}`));
assert.match(g5WordAnalysisMissionHtml,/Continue to Skill Practice/,'G5E_RF_001 profile links to Skill Practice Center');
const g5WordAnalysisDrillHtml=Renderer.renderSkillWorld(g5WordAnalysis,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
assert.match(g5WordAnalysisDrillHtml,/Skill Practice Center/,'G5E_RF_001 practice route renders Skill Practice Center');
assert.match(g5WordAnalysisDrillHtml,/Level 1: Syllable Patterns/,'G5E_RF_001 drill renders Level 1');
assert.match(VisualRegistry.render(g5WordAnalysisQuestions.find((q)=>q.visual_model==='syllable_break')),/data-renderer="syllable_break"/,'G5E_RF_001 syllable_break renderer output exists');
assert.match(VisualRegistry.render(g5WordAnalysisQuestions.find((q)=>q.visual_model==='word_parts')),/data-renderer="word_parts"/,'G5E_RF_001 word_parts renderer output exists');
assert.match(VisualRegistry.render(g5WordAnalysisQuestions.find((q)=>q.visual_model==='morpheme_tiles')),/data-renderer="morpheme_tiles"/,'G5E_RF_001 morpheme_tiles renderer output exists');
assert.match(VisualRegistry.render(g5WordAnalysisQuestions.find((q)=>q.visual_model==='word_builder')),/data-renderer="word_builder"/,'G5E_RF_001 word_builder renderer output exists');


assert.ok(g6WordAnalysis,'G6E_RF_001 package loads');
{
  const result=Schema.validateSkillPackage(g6WordAnalysis,{allowPlannedLevelBanks:false});
  assert.equal(result.valid,true,`G6E_RF_001 validates in strict production mode: ${result.errors.join('; ')}`);
}
assert.equal(g6WordAnalysis.grade,6,'G6E_RF_001 grade');
assert.equal(g6WordAnalysis.subject,'English','G6E_RF_001 subject');
assert.equal(g6WordAnalysis.domain,'Word Analysis / Language','G6E_RF_001 domain');
assert.equal(g6WordAnalysis.skill,'Morphology, Roots, and Complex Word Analysis','G6E_RF_001 skill');
assert.deepEqual(Renderer.stepLabels(g6WordAnalysis),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'G6E_RF_001 mission uses full Skill World flow');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>assert.equal(g6WordAnalysis.page_audio?.[screen]?.label,'Read This Page',`G6E_RF_001 ${screen} Read This Page narration exists`));
assert.equal(Array.isArray(g6WordAnalysis.level_banks),true,'G6E_RF_001 has real level_banks');
assert.equal(g6WordAnalysis.level_banks.length,5,'G6E_RF_001 has five real level banks');
assert.equal(g6WordAnalysis.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G6E_RF_001 has four focused levels');
assert.equal(g6WordAnalysis.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G6E_RF_001 has Mixed level');
['Level 1: Syllables and Morphology','Level 2: Prefixes and Suffixes','Level 3: Greek and Latin Roots','Level 4: Complex Word Analysis','Mixed'].forEach((label)=>assert.ok(g6WordAnalysis.level_banks.some((level)=>level.label===label),`G6E_RF_001 includes ${label}`));
g6WordAnalysis.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
const g6WordAnalysisQuestions=g6WordAnalysis.level_banks.flatMap((level)=>level.questions);
assert.equal([...g6WordAnalysis.guided_practice,...g6WordAnalysis.checkpoint,...g6WordAnalysis.adaptive_question_bank].every((question)=>question.question_audio?.label==='Read Question'&&question.question_audio?.text),true,'G6E_RF_001 mission Practice, Challenge, and Checkpoint questions have Read Question narration');
assert.equal(g6WordAnalysisQuestions.every((question)=>question.question_audio?.label==='Read Question'&&question.question_audio?.text),true,'G6E_RF_001 Skill Practice Center questions have Read Question narration');
assert.equal(g6WordAnalysisQuestions.every((question)=>question.audio?.label==='Listen'&&question.audio?.text&&question.audio?.playback_preference==='cached_audio_first'&&question.audio?.browser_speech_fallback===true),true,'G6E_RF_001 questions include Listen audio for roots, affixes, complex words, and pronunciation support');
['syllable_break','word_parts','morpheme_tiles','word_builder'].forEach((visual)=>assert.ok(g6WordAnalysisQuestions.some((q)=>q.visual_model===visual),`G6E_RF_001 includes ${visual}`));
['multiple_choice','short_response','word_building'].forEach((type)=>assert.ok(g6WordAnalysisQuestions.some((q)=>q.question_type===type),`G6E_RF_001 includes ${type}`));
['syllable_division_error','affix_meaning_confusion','root_meaning_confusion','morphology_guessing'].forEach((tag)=>assert.ok(g6WordAnalysis.misconception_bank[tag],`G6E_RF_001 includes misconception ${tag}`));
assert.ok(g6WordAnalysisQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G6E_RF_001 acceptable_answers exist for short-response items');
const g6WordAnalysisMissionHtml=Renderer.renderSkillWorld(g6WordAnalysis,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g6WordAnalysisMissionHtml,new RegExp(label),`G6E_RF_001 mission renders ${label}`));
assert.match(g6WordAnalysisMissionHtml,/Read This Page/,'G6E_RF_001 renders Read This Page controls');
assert.match(g6WordAnalysisMissionHtml,/Read Question/,'G6E_RF_001 renders Read Question controls');
assert.match(g6WordAnalysisMissionHtml,/Continue to Skill Practice/,'G6E_RF_001 profile links to Skill Practice Center');
const g6WordAnalysisDrillHtml=Renderer.renderSkillWorld(g6WordAnalysis,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
assert.match(g6WordAnalysisDrillHtml,/Skill Practice Center/,'G6E_RF_001 Practice This Skill route renders Skill Practice Center');
assert.match(g6WordAnalysisDrillHtml,/Level 1: Syllables and Morphology/,'G6E_RF_001 drill renders Level 1');
['syllable_break','word_parts','morpheme_tiles','word_builder'].forEach((visual)=>{const q=g6WordAnalysisQuestions.find((item)=>item.visual_model===visual); assert.ok(q,`G6E_RF_001 includes ${visual} question`); assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for G6E_RF_001`);});
assert.match(VisualRegistry.render(g6WordAnalysisQuestions.find((q)=>q.visual_model==='syllable_break')),/syllable-divider/,'G6E_RF_001 syllable_break clearly separates syllables');
assert.match(VisualRegistry.render(g6WordAnalysisQuestions.find((q)=>q.visual_model==='word_parts')),/(prefix|root|base word|suffix)/,'G6E_RF_001 word_parts identifies word-part roles');
assert.match(VisualRegistry.render(g6WordAnalysisQuestions.find((q)=>q.visual_model==='morpheme_tiles')),/(life|earth|write|carry|build|look|able to be|before|study of)/,'G6E_RF_001 morpheme_tiles displays root or affix meanings');
assert.match(VisualRegistry.render(g6WordAnalysisQuestions.find((q)=>q.visual_model==='word_builder')),/Target word:/,'G6E_RF_001 word_builder shows parts combining into a complete word');


const g6EnglishBatchPackages = [
  {
    id: 'G6E_FL_001',
    domain: 'Fluency',
    skill: 'Fluency With Literary and Informational Text',
    labels: ['Level 1: Accuracy', 'Level 2: Phrasing and Pace', 'Level 3: Expression and Punctuation', 'Level 4: Repeated Reading and Meaning', 'Mixed'],
    visuals: ['sentence_card', 'sentence_highlight', 'phrase_builder', 'fluency_meter'],
    types: ['multiple_choice', 'short_response', 'sentence_completion'],
    tags: ['skips_words', 'phrase_chunking_error', 'punctuation_ignored', 'expression_flat_reading'],
    listenPattern: /sentence_card|sentence_highlight|phrase_builder|fluency_meter/,
    pkg: g6Fluency
  },
  {
    id: 'G6E_VOC_001',
    domain: 'Vocabulary / Language',
    skill: 'Academic Vocabulary and Figurative Language',
    labels: ['Level 1: Context and Academic Vocabulary', 'Level 2: Roots and Affixes', 'Level 3: Connotation and Word Relationships', 'Level 4: Figurative and Domain-Specific Language', 'Mixed'],
    visuals: ['context_sentence', 'vocabulary_match', 'word_scale', 'figurative_language_card'],
    types: ['multiple_choice', 'short_response', 'vocabulary_match'],
    tags: ['context_clue_ignored', 'connotation_confusion', 'literal_vs_figurative_confusion', 'domain_word_confusion'],
    listenPattern: /context_sentence|vocabulary_match|word_scale|figurative_language_card/,
    pkg: g6Vocabulary
  },
  {
    id: 'G6E_RC_001',
    domain: 'Reading Comprehension',
    skill: 'Cite Textual Evidence and Make Inferences',
    labels: ['Level 1: Literal Understanding', 'Level 2: Make Inferences', 'Level 3: Cite Evidence', 'Level 4: Explain Reasoning', 'Mixed'],
    visuals: ['short_passage', 'evidence_highlight', 'question_card', 'text_evidence_builder'],
    types: ['multiple_choice', 'short_response', 'text_evidence'],
    tags: ['unsupported_answer', 'inference_without_evidence', 'inaccurate_quote', 'weak_explanation'],
    listenPattern: /short_passage|evidence_highlight|question_card|text_evidence_builder/,
    pkg: g6TextEvidence
  },
  {
    id: 'G6E_RC_002',
    domain: 'Reading Literature',
    skill: 'Theme, Character, Plot, and Point of View',
    labels: ['Level 1: Character and Setting', 'Level 2: Plot and Conflict', 'Level 3: Theme and Character Change', 'Level 4: Point of View and Structure', 'Mixed'],
    visuals: ['story_map', 'character_trait_chart', 'event_cards', 'theme_tracker'],
    types: ['multiple_choice', 'short_response', 'sequencing', 'text_evidence'],
    tags: ['character_trait_confusion', 'theme_detail_confusion', 'plot_conflict_confusion', 'point_of_view_confusion'],
    listenPattern: /story_map|character_trait_chart|event_cards|theme_tracker/,
    pkg: g6Literature
  },
  {
    id: 'G6E_RC_003',
    domain: 'Reading Informational Text',
    skill: 'Central Idea, Text Structure, and Source Integration',
    labels: ['Level 1: Central Idea', 'Level 2: Objective Summary', 'Level 3: Text Structure and Features', 'Level 4: Integrate Multiple Sources', 'Mixed'],
    visuals: ['short_passage', 'main_idea_web', 'text_structure_chart', 'text_feature_map', 'compare_texts_panel'],
    types: ['multiple_choice', 'short_response', 'text_evidence', 'detail_match'],
    tags: ['topic_central_idea_confusion', 'summary_opinion_error', 'text_structure_confusion', 'source_integration_error'],
    listenPattern: /short_passage|main_idea_web|text_structure_chart|text_feature_map|compare_texts_panel/,
    pkg: g6Informational
  },
  {
    id: 'G6E_WR_001',
    domain: 'Writing / Composition',
    skill: 'Argument Writing With Claims and Evidence',
    labels: ['Level 1: State a Claim', 'Level 2: Add Reasons and Evidence', 'Level 3: Organize and Use Transitions', 'Level 4: Build an Argument Essay', 'Mixed'],
    visuals: ['opinion_reason_chart', 'paragraph_builder', 'writing_checklist', 'evidence_builder'],
    types: ['multiple_choice', 'short_response', 'writing_response', 'sentence_completion'],
    tags: ['missing_claim', 'weak_reason', 'unsupported_evidence', 'missing_conclusion'],
    listenPattern: /opinion_reason_chart|paragraph_builder|writing_checklist|evidence_builder/,
    pkg: g6ArgumentWriting
  }
];

for (const spec of g6EnglishBatchPackages) {
  const { id, pkg } = spec;
  assert.ok(pkg, `${id} package loads`);
  const result = Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false });
  assert.equal(result.valid, true, `${id} validates in strict production mode: ${result.errors.join('; ')}`);
  assert.equal(pkg.grade, 6, `${id} grade`);
  assert.equal(pkg.subject, 'English', `${id} subject`);
  assert.equal(pkg.domain, spec.domain, `${id} domain`);
  assert.equal(pkg.skill, spec.skill, `${id} skill`);
  assert.deepEqual(Renderer.stepLabels(pkg), ['Story', 'Lesson', 'Watch', 'Demo', 'Practice', 'Challenge', 'Checkpoint', 'Badge', 'Profile'], `${id} mission uses full Skill World flow`);
  assert.equal(Array.isArray(pkg.level_banks), true, `${id} has real level_banks`);
  assert.equal(pkg.level_banks.length, 5, `${id} has five real level banks`);
  assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4, `${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true, `${id} has Mixed level`);
  pkg.level_banks.forEach((level) => assert.ok(level.questions.length >= 10 && level.questions.length <= 12, `${id} ${level.level_id} has 10–12 questions`));
  spec.labels.forEach((label) => assert.ok(pkg.level_banks.some((level) => level.label === label), `${id} includes ${label}`));
  const questions = [...(pkg.guided_practice || []), ...(pkg.adaptive_question_bank || []), ...(pkg.checkpoint || []), ...(pkg.level_banks || []).flatMap((level) => level.questions || [])];
  spec.visuals.forEach((visual) => assert.ok(questions.some((q) => q.visual_model === visual), `${id} includes ${visual}`));
  spec.types.forEach((type) => assert.ok(questions.some((q) => q.question_type === type), `${id} includes ${type}`));
  spec.tags.forEach((tag) => assert.ok(pkg.misconception_bank[tag], `${id} includes misconception ${tag}`));
  assert.ok(questions.filter((q) => q.question_type === 'short_response').every((q) => Array.isArray(q.acceptable_answers) && q.acceptable_answers.length > 0), `${id} short responses have acceptable_answers`);
  ['story', 'lesson', 'watch', 'demo', 'practice', 'challenge', 'checkpoint', 'badge', 'profile'].forEach((screen) => {
    assert.equal(pkg.page_audio?.[screen]?.label, 'Read This Page', `${id} ${screen} Read This Page narration exists`);
    assert.ok(pkg.page_audio?.[screen]?.text, `${id} ${screen} Read This Page text exists`);
  });
  ['practice', 'challenge', 'checkpoint'].forEach((screen) => assert.match(pkg.page_audio[screen].text, /Read Question/, `${id} ${screen} narration references Read Question`));
  [...(pkg.guided_practice || []), ...(pkg.checkpoint || []), ...(pkg.adaptive_question_bank || [])].forEach((question) => assert.equal(question.question_audio?.label, 'Read Question', `${id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level) => level.questions).forEach((question) => assert.equal(question.question_audio?.label, 'Read Question', `${id} Skill Practice question has Read Question narration`));
  assert.ok(questions.filter((q) => spec.listenPattern.test(`${q.visual_model} ${q.support_type}`)).every((q) => q.audio?.label === 'Listen' && q.audio?.text && q.audio?.playback_preference === 'cached_audio_first' && q.audio?.browser_speech_fallback === true), `${id} Listen audio exists where appropriate`);
  const missionHtml = Renderer.renderSkillWorld(pkg, { failClosed: true }).html;
  ['Story', 'Lesson', 'Watch', 'Demo', 'Practice', 'Challenge', 'Checkpoint', 'Badge', 'Profile'].forEach((label) => assert.match(missionHtml, new RegExp(label), `${id} mission renders ${label}`));
  assert.match(missionHtml, /Read This Page/, `${id} renders Read This Page controls`);
  assert.match(missionHtml, /Read Question/, `${id} renders Read Question controls`);
  assert.match(missionHtml, /Continue to Skill Practice/, `${id} profile links to Skill Practice Center`);
  const drillHtml = Renderer.renderSkillWorld(pkg, { state: Renderer.createState(), mode: 'drill', failClosed: true }).html;
  assert.match(drillHtml, /Skill Practice Center/, `${id} Practice This Skill route renders Skill Practice Center`);
  assert.match(drillHtml, new RegExp(spec.labels[0]), `${id} drill renders Level 1`);
  spec.visuals.forEach((visual) => {
    const question = questions.find((q) => q.visual_model === visual);
    assert.ok(question, `${id} includes ${visual} question`);
    assert.match(VisualRegistry.render(question), new RegExp(`data-renderer="${visual}"`), `${visual} renderer output exists for ${id}`);
  });
  if (id === 'G6E_RC_003') {
    const compareQuestion = questions.find((q) => q.visual_model === 'compare_texts_panel');
    const compareHtml = VisualRegistry.render(compareQuestion);
    assert.match(compareHtml, /compare-texts-grid[\s\S]*Source A[\s\S]*Source B[\s\S]*Synthesize/, 'compare_texts_panel produces structural visual markup for G6E_RC_003');
  }
  if (id === 'G6E_WR_001') {
    const writingQuestions = questions.filter((q) => q.question_type === 'writing_response');
    assert.ok(writingQuestions.length > 0, 'G6E_WR_001 includes writing_response items');
    assert.ok(writingQuestions.every((q) => q.writing_validation?.acceptable_sample_responses?.length && q.validation_checks?.includes('claim_present') && q.validation_checks?.includes('source_reference_present') && q.validation_rules?.do_not_over_penalize_open_ended_writing === true), 'G6E_WR_001 writing validation exists with child-friendly checks');
    assert.ok(questions.every((q) => Array.isArray(q.acceptable_answers) && q.acceptable_answers.length > 0), 'G6E_WR_001 acceptable answers and sample responses exist');
    const evidenceHtml = VisualRegistry.render(questions.find((q) => q.visual_model === 'evidence_builder'));
    assert.match(evidenceHtml, /Claim[\s\S]*Reason[\s\S]*Evidence[\s\S]*Source \/ Quotation[\s\S]*Explanation/, 'evidence_builder produces claim/reason/evidence/source/explanation structure');
  }
}

assert.ok(g5TextEvidence,'G5E_RC_001 package loads');
{
  const result=Schema.validateSkillPackage(g5TextEvidence,{allowPlannedLevelBanks:false});
  assert.equal(result.valid,true,`G5E_RC_001 validates in strict production mode: ${result.errors.join('; ')}`);
}
assert.equal(g5TextEvidence.grade,5,'G5E_RC_001 grade');
assert.equal(g5TextEvidence.subject,'English','G5E_RC_001 subject');
assert.equal(g5TextEvidence.domain,'Reading Comprehension','G5E_RC_001 domain');
assert.equal(g5TextEvidence.skill,'Quote Accurately and Use Text Evidence','G5E_RC_001 skill');
assert.deepEqual(Renderer.stepLabels(g5TextEvidence),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'G5E_RC_001 full mission flow renders Story to Profile');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{
  const narration=g5TextEvidence.page_audio?.[screen];
  assert.ok(narration?.text,`G5E_RC_001 has Read This Page narration for ${screen}`);
  assert.equal(narration.label,'Read This Page',`G5E_RC_001 ${screen} uses Read This Page label`);
});
['practice','challenge','checkpoint'].forEach((screen)=>assert.match(g5TextEvidence.page_audio[screen].text,/Read Question/,`G5E_RC_001 ${screen} references Read Question`));
assert.equal(Array.isArray(g5TextEvidence.level_banks),true,'G5E_RC_001 has real level_banks');
assert.equal(g5TextEvidence.level_banks.length,5,'G5E_RC_001 has five real level banks');
assert.equal(g5TextEvidence.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G5E_RC_001 has four focused levels');
assert.equal(g5TextEvidence.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G5E_RC_001 has Mixed level');
['Level 1: Literal Questions','Level 2: Inferential Questions','Level 3: Quote Text Evidence','Level 4: Explain With Evidence','Mixed'].forEach((label)=>assert.ok(g5TextEvidence.level_banks.some((level)=>level.label===label),`G5E_RC_001 includes ${label}`));
g5TextEvidence.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
const g5TextEvidenceQuestions=g5TextEvidence.level_banks.flatMap((level)=>level.questions);
const g5TextEvidenceMissionQuestions=[...(g5TextEvidence.guided_practice||[]),...(g5TextEvidence.adaptive_question_bank||[]),...(g5TextEvidence.checkpoint||[])];
assert.equal(g5TextEvidenceMissionQuestions.every((question)=>question.question_audio?.label==='Read Question'&&question.question_audio?.text),true,'G5E_RC_001 mission questions have Read Question narration');
assert.equal(g5TextEvidenceQuestions.every((question)=>question.question_audio?.label==='Read Question'&&question.question_audio?.text),true,'G5E_RC_001 Skill Practice Center questions have Read Question narration');
assert.equal([...g5TextEvidenceQuestions,...g5TextEvidenceMissionQuestions].every((question)=>question.audio?.label==='Listen'&&question.audio?.text&&question.audio?.playback_preference==='cached_audio_first'&&question.audio?.browser_speech_fallback===true),true,'G5E_RC_001 passages, quotations, and evidence examples have Listen audio with cached AI audio and browser fallback compatibility');
['short_passage','question_card','evidence_highlight','text_evidence_builder'].forEach((visual)=>assert.ok(g5TextEvidenceQuestions.some((q)=>q.visual_model===visual),`G5E_RC_001 includes ${visual}`));
['multiple_choice','short_response','text_evidence'].forEach((type)=>assert.ok(g5TextEvidenceQuestions.some((q)=>q.question_type===type),`G5E_RC_001 includes ${type}`));
['unsupported_answer','inference_without_evidence','inaccurate_quote','misses_text_evidence'].forEach((tag)=>assert.ok(g5TextEvidence.misconception_bank[tag],`G5E_RC_001 includes misconception ${tag}`));
assert.ok(g5TextEvidenceQuestions.filter((q)=>q.question_type==='short_response'||q.question_type==='text_evidence').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G5E_RC_001 acceptable_answers exist for constructed and evidence items');
const g5TextEvidenceMissionHtml=Renderer.renderSkillWorld(g5TextEvidence,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g5TextEvidenceMissionHtml,new RegExp(label),`G5E_RC_001 mission renders ${label}`));
assert.match(g5TextEvidenceMissionHtml,/Read This Page/,'G5E_RC_001 renders Read This Page controls');
assert.match(g5TextEvidenceMissionHtml,/Read Question/,'G5E_RC_001 renders Read Question controls');
assert.match(g5TextEvidenceMissionHtml,/Continue to Skill Practice/,'G5E_RC_001 profile links to Skill Practice Center');
const g5TextEvidenceDrillHtml=Renderer.renderSkillWorld(g5TextEvidence,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
assert.match(g5TextEvidenceDrillHtml,/Skill Practice Center/,'G5E_RC_001 Practice This Skill route renders Skill Practice Center');
assert.match(g5TextEvidenceDrillHtml,/Level 1: Literal Questions/,'G5E_RC_001 drill renders Level 1');
['short_passage','question_card','evidence_highlight','text_evidence_builder'].forEach((visual)=>{
  const q=g5TextEvidenceQuestions.find((item)=>item.visual_model===visual);
  assert.ok(q,`G5E_RC_001 includes ${visual} question`);
  assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for G5E_RC_001`);
});
assert.match(VisualRegistry.render(g5TextEvidenceQuestions.find((q)=>q.visual_model==='short_passage')),/passage-card[\s\S]*Read the passage/, 'G5E_RC_001 short_passage displays a readable passage');
assert.match(VisualRegistry.render(g5TextEvidenceQuestions.find((q)=>q.visual_model==='evidence_highlight')),/evidence-highlight-mark/, 'G5E_RC_001 evidence_highlight visually marks selected evidence');
assert.match(VisualRegistry.render(g5TextEvidenceQuestions.find((q)=>q.visual_model==='text_evidence_builder')),/Question[\s\S]*Answer[\s\S]*Text Evidence/, 'G5E_RC_001 text_evidence_builder connects question, answer, and text evidence');
assert.match(VisualRegistry.render(g5TextEvidenceQuestions.find((q)=>q.visual_model==='question_card')),/question-card-visual[\s\S]*\?/, 'G5E_RC_001 question_card clearly displays the question');


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
grade2Packages.forEach(assertFullMission);
grade3Packages.forEach(assertFullMission);

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
assert.ok(pv.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length>=3,'at least three focused levels');
assert.ok(pv.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),'Mixed level exists');
pv.level_banks.forEach((level)=>{
  assert.ok(level.focus);
  assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} should have 10–12 questions`);
  assert.ok(new Set(level.questions.map((q)=>q.misconception_tag)).size>=1,`${level.level_id} needs misconception coverage`);
});

grade1Packages.forEach((pkg)=>{
  assert.ok(Array.isArray(pkg.level_banks),`${pkg.skill_id} has real level_banks`);
  assert.equal(pkg.level_banks_status,undefined,`${pkg.skill_id} does not keep planned level_banks_status`);
  assert.ok(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length>=4,`${pkg.skill_id} has at least 4 focused levels`);
  assert.ok(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),`${pkg.skill_id} has Mixed level`);
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
assert.match(drillHtml,/class="level-card compact-level-card"/,'Skill Practice Center uses compact level card markup');
assert.match(drillHtml,/class="level-card-meta"/,'Skill Practice Center groups level facts in compact metadata');
assert.match(drillHtml,/<dt>Questions<\/dt><dd>10<\/dd>/,'Skill Practice Center keeps question count visible');
assert.match(drillHtml,/<dt>Mastery<\/dt><dd>80%<\/dd>/,'Skill Practice Center keeps mastery threshold visible');
assert.match(drillHtml,/<dt>Status<\/dt><dd>Not started<\/dd>/,'Skill Practice Center keeps level status visible');
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

const statsState=Renderer.createState();
const statsHtml=Renderer.renderStats(statsState,dp);
assert.match(statsHtml,/<span class="stat-label">Stars<\/span><span class="stat-value">0<\/span>/,'Stats render Stars label and value separately');
assert.match(statsHtml,/<span class="stat-label">Accuracy<\/span><span class="stat-value">0%<\/span>/,'Stats render Accuracy label and value separately');
assert.match(statsHtml,/<span class="stat-label">Hints<\/span><span class="stat-value">0<\/span>/,'Stats render Hints label and value separately');
assert.match(statsHtml,/<span class="stat-label">Zone<\/span><span class="stat-value">Story<\/span>/,'Stats render Zone label and value separately');
assert.doesNotMatch(statsHtml,/<div class="stat-card"><span>Stars<\/span><strong>0<\/strong><\/div>/,'Stats no longer rely on adjacent unlabeled inline text');

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
assert.equal(englishLetters.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G1E_RF_001 has four focused levels');
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

assert.ok(Schema.AUDIO_TYPES.includes('phoneme'),'schema exposes reusable English audio types');
const audioSchemaPackage=JSON.parse(JSON.stringify(englishLetters));
audioSchemaPackage.guided_practice[0].audio={text:'mmm',label:'Hear the M sound',type:'phoneme',repeat_count:2,student_prompt:'Now say /m/.'};
audioSchemaPackage.guided_practice[0].recordable=true;
audioSchemaPackage.guided_practice[0].playback_enabled=true;
audioSchemaPackage.guided_practice[0].pronunciation_check='manual_playback';
assert.equal(Schema.validateSkillPackage(audioSchemaPackage,{allowPlannedLevelBanks:false}).valid,true,'schema accepts reusable audio and future recording fields');
const audioQuestion={...englishQuestions.find((q)=>q.audio),prompt:'Listen test'};
const audioQuestionHtml=Renderer.renderQuestionCard(audioQuestion,'practice',Renderer.createState(),englishLetters);
assert.match(audioQuestionHtml,/audio-listen-button/, 'renderer shows Listen button when audio exists');
assert.match(audioQuestionHtml,/data-audio-fallback hidden aria-live="polite"/, 'audio fallback markup is hidden by default');
assert.doesNotMatch(audioQuestionHtml,/class="audio-unavailable-message"(?![^>]*is-hidden)/, 'audio fallback text is not visibly displayed on initial render');
assert.doesNotMatch(Renderer.renderQuestionCard({...audioQuestion,audio:null,speakable_text:''},'practice',Renderer.createState()),/audio-listen-button/, 'renderer hides Listen button when audio is absent');
const repeatPromptHtml=Renderer.renderQuestionCard({...audioQuestion,audio:{text:'map',label:'Hear the word map',type:'word',repeat_count:1,student_prompt:'Now read map.'}},'practice',Renderer.createState(),englishLetters);
assert.match(repeatPromptHtml,/Now read map\./,'repeat-after-me prompt renders when student_prompt exists');
assert.match(repeatPromptHtml,/data-audio-fallback hidden aria-live="polite"/,'repeat-after-me fallback stays hidden by default');
const readQuestionHtml=Renderer.renderQuestionCard(englishQuestions.find((q)=>q.question_audio),'practice',Renderer.createState(),englishLetters);
assert.match(readQuestionHtml,/question-read-button/, 'renderer shows Read Question button when question_audio exists');
assert.match(readQuestionHtml,/Read Question/, 'Read Question label renders');
assert.match(readQuestionHtml,/data-audio-fallback hidden aria-live="polite"/, 'Read Question fallback is hidden by default');
assert.match(skillWorldIndex,/const canSpeak=typeof window!=='undefined'&&'speechSynthesis' in window&&typeof window\.SpeechSynthesisUtterance!=='undefined'/,'click handler checks window.speechSynthesis and window.SpeechSynthesisUtterance');
assert.match(skillWorldIndex,/if\(!canSpeak\)\{showAudioUnavailable\(button\); return;\}/,'fallback is shown only when speech support is missing');
assert.match(skillWorldIndex,/async function speakAudio\(button\)\{hideAudioUnavailable\(button\);/,'click handler clears old fallback state before attempting audio playback');
assert.match(skillWorldIndex,/childFriendlySpeechConfig=\{lang:'en-US',rate:0\.86,pitch:1,volume:1,initialPauseMs:140,repeatPauseMs:220\}/,'Web Speech uses slower child-friendly config with an initial pause');
assert.match(skillWorldIndex,/window\.speechSynthesis\.cancel\(\); speakOne\(0\)/,'browser speech cancels previous speech before starting');
assert.match(skillWorldIndex,/setTimeout\(\(\)=>\{try\{window\.speechSynthesis\.speak\(utterance\)/,'browser speech starts after a short initial pause to avoid clipping');
assert.match(skillWorldIndex,/if\(i<repeat-1\)await new Promise\(\(resolve\)=>setTimeout\(resolve,childFriendlySpeechConfig\.repeatPauseMs\)\)/,'saved audio repeats include a short pause between repeats');
assert.match(skillWorldIndex,/if\(button\.dataset\.audioUrl\)\{const played=await playSavedAudio\(button\); if\(played\)return;\}/,'audio_url playback path is attempted before browser speech fallback');
assert.match(skillWorldIndex,/function speakWithBrowserSpeech\(button\)/,'browser speech fallback still exists');
const watchState=Renderer.createState();
watchState.stepIndex=2;
const g1WatchHtml=Renderer.renderSkillWorld(englishLetters,{state:watchState,failClosed:true}).html;
assert.match(g1WatchHtml,/Worked Example \/ Watch/,'G1E_RF_001 Watch/Worked Example renders');
assert.match(g1WatchHtml,/Hear the sound/,'G1E_RF_001 Watch/Worked Example renders Listen/Hear audio button');
assert.match(g1WatchHtml,/data-audio-fallback hidden aria-live="polite"/,'G1E_RF_001 Watch/Worked Example fallback is hidden by default');
assert.doesNotMatch(g1WatchHtml,/class="audio-unavailable-message"(?![^>]*is-hidden)/,'G1E_RF_001 Watch/Worked Example does not visibly display fallback on initial render');
const audioCachePlan=fs.readFileSync(path.join(root,'docs/skill-world-audio-cache-plan.md'),'utf8');
assert.match(audioCachePlan,/POST \/api\/assessment\/voice\/section/,'AI voice investigation documents existing assessment route');
assert.match(audioCachePlan,/POST \/api\/skill-world\/audio/,'AI voice investigation documents recommended Skill World cache endpoint');
assert.match(audioCachePlan,/VOICE_REPO_BASE_URL|VOICE_GATEWAY_BASE_URL/,'AI voice investigation documents required env vars');
const mathPackages=[...grade1Packages,...grade2Packages,...grade3Packages].filter((pkg)=>pkg.subject==='Math');
assert.ok(mathPackages.every((pkg)=>Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid),'Math packages still validate without requiring audio');
assert.ok(mathPackages.every((pkg)=>![...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])].some((q)=>q.audio||q.audio_text||q.speakable_text)),'Math packages do not require audio fields');
const mathSkillWorldHtml=Renderer.renderSkillWorld(mathPackages[0],{failClosed:true}).html;
assert.match(mathSkillWorldHtml,/Skill World:/,'Skill World still renders Math packages');
assert.doesNotMatch(mathSkillWorldHtml,/audio-listen-button/,'Math mission routes do not add phonics-style Listen buttons');
const mathSkillPracticeState=Renderer.createState();
mathSkillPracticeState.mode='drill';
Renderer.selectLevel(mathSkillPracticeState,0);
const mathSkillPracticeHtml=Renderer.renderSkillWorld(byId.G1M_NS_001,{state:mathSkillPracticeState,mode:'drill',failClosed:true}).html;
assert.match(mathSkillPracticeHtml,/question-read-button[\s\S]*Read Question/,'Grade 1 Math Skill Practice questions render Read Question controls');
assert.doesNotMatch(mathSkillPracticeHtml,/audio-listen-button/,'Grade 1 Math Skill Practice questions do not require phoneme or word Listen buttons');
assert.match(Renderer.renderSkillWorld(englishLetters,{failClosed:true}).html,/Skill World:/,'Skill World still renders English packages');

['G1E_RF_001','G1E_RF_002','G1E_PH_001','G1E_PH_002','G1E_SW_001','G1E_FL_001'].forEach((id)=>{
  const pkg=byId[id];
  const audioItems=[pkg.lesson,...(pkg.worked_examples||[]),...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])].filter(Boolean);
  assert.ok(audioItems.some((item)=>item.audio?.text||item.speakable_text),`${id} includes audio/speakable support`);
  assert.ok([...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])].some((q)=>q.audio?.type==='phoneme'||q.audio?.type==='letter_sound'||q.audio?.type==='word'||q.audio?.type==='sentence'),`${id} includes sound, word, or fluency audio items`);
  assert.ok(audioItems.some((item)=>item.audio?.student_prompt),`${id} includes repeat-after-me prompts`);
});

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
  assert.ok(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),`${id} has Mixed level`);
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
assert.equal(g2PlaceValue.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G2M_PV_001 has four focused levels');
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
const g2DrillHtml=Renderer.renderSkillWorld(g2PlaceValue,{mode:'drill',failClosed:true}).html;
assert.match(g2DrillHtml,/Skill Practice Center/,'G2M_PV_001 Skill Practice Center renders');
assert.match(g2DrillHtml,/class="level-card compact-level-card"/,'G2M_PV_001 drill uses compact level cards');
assert.match(g2DrillHtml,/class="level-card-meta"/,'G2M_PV_001 drill keeps compact level metadata');
assert.ok(Renderer.evaluateAnswer(g2Questions.find((q)=>q.question_type==='short_response'&&q.correct_answer==='300 + 40 + 2'),'300 + 40 + 2.'),'G2M_PV_001 short_response accepts acceptable answer');

const grade2ProductionIds=['G2M_NS_001','G2M_PV_001','G2M_NS_002','G2M_OP_001','G2M_OP_002','G2M_OP_003','G2M_WP_001','G2M_MD_001','G2M_MD_002','G2M_MD_003','G2M_GM_001'];
grade2ProductionIds.forEach((id)=>{
  const pkg=byId[id];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates as production package`);
  assert.equal(pkg.grade,2,`${id} is Grade 2`);
  assert.equal(pkg.subject,'Math',`${id} is Math`);
  assert.ok(Array.isArray(pkg.level_banks),`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.ok(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>{
    assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10-12 questions`);
    level.questions.forEach((question)=>{
      assert.ok(question.question_id&&question.prompt&&question.question_type&&(question.support_type||question.visual_model)&&question.correct_answer!==undefined&&question.hints&&question.misconception_tag&&(question.feedback||question.explanation),`${question.question_id} has required production fields`);
      assert.notEqual(VisualRegistry.render(question),'<div></div>',`${question.question_id} has renderer output`);
      if(question.question_type==='short_response')assert.ok(Array.isArray(question.acceptable_answers)&&question.acceptable_answers.length>0,`${question.question_id} short_response has acceptable_answers`);
    });
  });
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen'].forEach((label)=>assert.match(missionHtml,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${id} mission missing ${label}`));
  const drillHtml=Renderer.renderSkillWorld(pkg,{mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${id} Skill Practice Center renders`);
  assert.match(drillHtml,/class="level-card compact-level-card"/,`${id} drill uses compact level cards`);
});

assert.equal(g2CountReadWrite.domain,'Number Sense / Base Ten');
assert.equal(g2CountReadWrite.skill,'Count, Read, and Write Numbers to 1,000');
assert.deepEqual(g2CountReadWrite.level_banks.map((level)=>level.label),['Level 1: Count Within 1,000','Level 2: Read and Write Numbers','Level 3: Skip Count by 5s and 10s','Level 4: Skip Count by 100s','Mixed']);
['sequence_gap_error','hundreds_transition_error','skip_count_error','numeral_word_mismatch'].forEach((tag)=>{
  assert.ok(g2CountReadWrite.misconception_bank[tag],`G2M_NS_001 misconception bank includes ${tag}`);
  assert.ok(g2CountReadWrite.level_banks.flatMap((level)=>level.questions).some((q)=>q.misconception_tag===tag),`G2M_NS_001 level banks cover ${tag}`);
});
const g2CountQuestions=[...g2CountReadWrite.guided_practice,...g2CountReadWrite.adaptive_question_bank,...g2CountReadWrite.checkpoint,...g2CountReadWrite.level_banks.flatMap((level)=>level.questions)];
assert.ok(g2CountQuestions.some((q)=>String(q.prompt).includes('198')&&String(q.prompt).includes('199')&&String(q.correct_answer).replace(',','')==='200'),'G2M_NS_001 includes 198, 199, 200 transition');
assert.ok(g2CountQuestions.some((q)=>String(q.prompt).includes('998')&&String(q.prompt).includes('999')&&String(q.correct_answer).replace(',','')==='1000'),'G2M_NS_001 includes 998, 999, 1000 transition');
assert.ok(g2CountQuestions.some((q)=>q.misconception_tag==='numeral_word_mismatch'&&q.question_type==='short_response'&&q.acceptable_answers?.length),'G2M_NS_001 includes number-word short responses with acceptable_answers');
assert.ok(g2CountQuestions.some((q)=>q.step===5),'G2M_NS_001 includes skip-count by 5s');
assert.ok(g2CountQuestions.some((q)=>q.step===10),'G2M_NS_001 includes skip-count by 10s');
assert.ok(g2CountQuestions.some((q)=>q.step===100),'G2M_NS_001 includes skip-count by 100s');
assert.match(VisualRegistry.render(g2CountQuestions.find((q)=>q.visual_model==='number_sequence')),/data-renderer="number_sequence"/,'number_sequence renderer output exists for G2M_NS_001');
assert.match(VisualRegistry.render(g2CountQuestions.find((q)=>q.visual_model==='place_value_chart')),/data-renderer="place_value_chart"/,'place_value_chart renderer output exists for G2M_NS_001');
assert.ok(Renderer.evaluateAnswer(g2CountQuestions.find((q)=>q.correct_answer==='1000'&&q.question_type==='short_response'),'1,000'),'G2M_NS_001 accepts comma form for 1000');

assert.equal(g2Compare.domain,'Number and Operations in Base Ten');
assert.equal(g2Compare.skill,'Compare Three-Digit Numbers');
assert.deepEqual(g2Compare.level_banks.map((level)=>level.label),['Level 1: Compare Hundreds','Level 2: Compare Tens','Level 3: Compare Ones','Level 4: Use >, <, =','Mixed']);
['compares_left_to_right_incorrectly','symbol_reversal','place_value_compare_error','equal_confusion'].forEach((tag)=>{
  assert.ok(g2Compare.misconception_bank[tag],`G2M_NS_002 misconception bank includes ${tag}`);
  assert.ok(g2Compare.level_banks.flatMap((level)=>level.questions).some((q)=>q.misconception_tag===tag),`G2M_NS_002 level banks cover ${tag}`);
});
const g2CompareQuestions=[...g2Compare.guided_practice,...g2Compare.adaptive_question_bank,...g2Compare.checkpoint,...g2Compare.level_banks.flatMap((level)=>level.questions)];
assert.ok(g2CompareQuestions.some((q)=>Math.floor(q.left/100)!==Math.floor(q.right/100)),'G2M_NS_002 includes comparisons where hundreds decide');
assert.ok(g2CompareQuestions.some((q)=>Math.floor(q.left/100)===Math.floor(q.right/100)&&Math.floor((q.left%100)/10)!==Math.floor((q.right%100)/10)),'G2M_NS_002 includes comparisons where tens decide');
assert.ok(g2CompareQuestions.some((q)=>Math.floor(q.left/10)===Math.floor(q.right/10)&&q.left%10!==q.right%10),'G2M_NS_002 includes comparisons where ones decide');
assert.ok(g2CompareQuestions.some((q)=>q.correct_answer==='='),'G2M_NS_002 includes equality examples');
assert.ok(g2CompareQuestions.some((q)=>['>','<','='].includes(q.correct_answer)),'G2M_NS_002 includes symbol selection');
assert.ok(g2CompareQuestions.filter((q)=>q.question_type==='short_response').every((q)=>q.acceptable_answers&&q.acceptable_answers.some((answer)=>/greater than|less than|equal to|>|<|=/.test(answer))), 'G2M_NS_002 short responses include symbol/word acceptable_answers');
assert.match(VisualRegistry.render(g2CompareQuestions.find((q)=>q.visual_model==='comparison')),/data-renderer="comparison"/,'comparison renderer output exists for G2M_NS_002');
assert.match(VisualRegistry.render(g2CompareQuestions.find((q)=>q.visual_model==='place_value_chart')),/data-renderer="place_value_chart"/,'place_value_chart renderer output exists for G2M_NS_002');
assert.match(VisualRegistry.render(g2CompareQuestions.find((q)=>q.visual_model==='base_ten_blocks')),/data-renderer="base_ten_blocks"/,'base_ten_blocks renderer output exists for G2M_NS_002');
assert.ok(Renderer.evaluateAnswer(g2CompareQuestions.find((q)=>q.correct_answer==='>'),'greater than'),'G2M_NS_002 accepts greater than word form');
assert.ok(Renderer.evaluateAnswer(g2CompareQuestions.find((q)=>q.correct_answer==='<'),'less than'),'G2M_NS_002 accepts less than word form');
assert.ok(Renderer.evaluateAnswer(g2CompareQuestions.find((q)=>q.correct_answer==='='),'equal to'),'G2M_NS_002 accepts equal to word form');

function assertG2OperationsPackage(pkg,labels,tags){
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${pkg.skill_id} schema validates as production package`);
  assert.deepEqual(pkg.level_banks.map((level)=>level.label),labels,`${pkg.skill_id} has expected level labels`);
  tags.forEach((tag)=>{
    assert.ok(pkg.misconception_bank[tag],`${pkg.skill_id} misconception bank includes ${tag}`);
    assert.ok(pkg.level_banks.flatMap((level)=>level.questions).some((q)=>q.misconception_tag===tag),`${pkg.skill_id} level banks cover ${tag}`);
  });
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${pkg.skill_id} has four focused levels`);
  assert.ok(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),`${pkg.skill_id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${pkg.skill_id} ${level.level_id} has 10-12 questions`));
  assert.ok(pkg.level_banks.flatMap((level)=>level.questions).filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length),`${pkg.skill_id} short-response numeric items have acceptable_answers`);
  const html=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.ok(html.includes(label),`${pkg.skill_id} full Skill World flow includes ${label}`));
  const drillHtml=Renderer.renderSkillWorld(pkg,{mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${pkg.skill_id} Skill Practice Center renders`);
}

assert.equal(g2AddWithin100.domain,'Operations / Base Ten');
assert.equal(g2AddWithin100.skill,'Add Within 100');
assertG2OperationsPackage(g2AddWithin100,['Level 1: Add Tens','Level 2: Add Ones','Level 3: Add Two-Digit Numbers Without Regrouping','Level 4: Add Two-Digit Numbers With Regrouping','Mixed'],['regrouping_confusion','ones_tens_alignment_error','count_all_overuse','place_value_addition_error']);
const g2AddQuestions=[...g2AddWithin100.guided_practice,...g2AddWithin100.adaptive_question_bank,...g2AddWithin100.checkpoint,...g2AddWithin100.level_banks.flatMap((level)=>level.questions)];
assert.ok(g2AddQuestions.some((q)=>q.operation==='addition'&&!q.regrouping&&Number(q.a)>=10&&Number(q.b)>=10),'G2M_OP_001 includes two-digit addition without regrouping');
assert.ok(g2AddQuestions.some((q)=>q.operation==='addition'&&q.regrouping&&Number(q.a)>=10&&Number(q.b)>=10),'G2M_OP_001 includes two-digit addition with regrouping');
assert.ok(g2AddQuestions.some((q)=>q.visual_model==='place_value_chart'),'G2M_OP_001 includes tens/ones alignment with place_value_chart');
assert.ok(g2AddQuestions.some((q)=>q.visual_model==='base_ten_blocks'),'G2M_OP_001 includes base-ten block models');
assert.ok(g2AddQuestions.some((q)=>q.visual_model==='number_line'),'G2M_OP_001 includes number-line strategy examples');
assert.match(VisualRegistry.render(g2AddQuestions.find((q)=>q.visual_model==='addition_model')),/data-renderer="addition_model"/,'addition_model output exists for G2M_OP_001');
assert.match(VisualRegistry.render(g2AddQuestions.find((q)=>q.visual_model==='base_ten_blocks')),/addition/,'base_ten_blocks supports addition context');
const g2AddShort=g2AddQuestions.find((q)=>q.question_type==='short_response');
assert.ok(Renderer.evaluateAnswer(g2AddShort,g2AddShort.correct_answer),'G2M_OP_001 accepts short-response numeric sums');

assert.equal(g2SubtractWithin100.domain,'Operations / Base Ten');
assert.equal(g2SubtractWithin100.skill,'Subtract Within 100');
assertG2OperationsPackage(g2SubtractWithin100,['Level 1: Subtract Tens','Level 2: Subtract Ones','Level 3: Subtract Without Regrouping','Level 4: Subtract With Regrouping','Mixed'],['regrouping_confusion','subtracts_smaller_from_larger_digit','tens_ones_alignment_error','count_back_error']);
const g2SubtractQuestions=[...g2SubtractWithin100.guided_practice,...g2SubtractWithin100.adaptive_question_bank,...g2SubtractWithin100.checkpoint,...g2SubtractWithin100.level_banks.flatMap((level)=>level.questions)];
assert.ok(g2SubtractQuestions.some((q)=>q.operation==='subtraction'&&!q.regrouping&&Number(q.minuend)>=10&&Number(q.subtrahend)>=10),'G2M_OP_002 includes two-digit subtraction without regrouping');
assert.ok(g2SubtractQuestions.some((q)=>q.operation==='subtraction'&&q.regrouping&&Number(q.minuend)>=10&&Number(q.subtrahend)>=10),'G2M_OP_002 includes two-digit subtraction with regrouping');
assert.ok(g2SubtractQuestions.some((q)=>q.visual_model==='place_value_chart'),'G2M_OP_002 includes tens/ones alignment with place_value_chart');
assert.ok(g2SubtractQuestions.some((q)=>q.visual_model==='base_ten_blocks'&&q.regrouping),'G2M_OP_002 includes base-ten decomposition examples');
assert.ok(g2SubtractQuestions.some((q)=>q.visual_model==='number_line'),'G2M_OP_002 includes number-line count-back examples');
assert.match(VisualRegistry.render(g2SubtractQuestions.find((q)=>q.visual_model==='subtraction_model')),/data-renderer="subtraction_model"/,'subtraction_model output exists for G2M_OP_002');
assert.match(VisualRegistry.render(g2SubtractQuestions.find((q)=>q.visual_model==='base_ten_blocks')),/subtraction/,'base_ten_blocks supports subtraction context');
const g2SubtractShort=g2SubtractQuestions.find((q)=>q.question_type==='short_response');
assert.ok(Renderer.evaluateAnswer(g2SubtractShort,g2SubtractShort.correct_answer),'G2M_OP_002 accepts short-response numeric differences');

assert.equal(g2FluencyWithin20.domain,'Operations and Algebraic Thinking');
assert.equal(g2FluencyWithin20.skill,'Fluency With Addition and Subtraction Within 20');
assertG2OperationsPackage(g2FluencyWithin20,['Level 1: Make 10','Level 2: Doubles and Near Doubles','Level 3: Related Facts','Level 4: Missing Addend / Missing Part','Mixed'],['make_ten_confusion','doubles_confusion','related_fact_confusion','missing_part_confusion']);
const g2FluencyQuestions=[...g2FluencyWithin20.guided_practice,...g2FluencyWithin20.adaptive_question_bank,...g2FluencyWithin20.checkpoint,...g2FluencyWithin20.level_banks.flatMap((level)=>level.questions)];
assert.ok(g2FluencyQuestions.some((q)=>q.misconception_tag==='make_ten_confusion'),'G2M_OP_003 includes make-10 examples');
assert.ok(g2FluencyQuestions.some((q)=>q.misconception_tag==='doubles_confusion'),'G2M_OP_003 includes doubles and near doubles');
assert.ok(g2FluencyQuestions.some((q)=>q.misconception_tag==='related_fact_confusion'),'G2M_OP_003 includes fact families / related facts');
assert.ok(g2FluencyQuestions.some((q)=>q.misconception_tag==='missing_part_confusion'),'G2M_OP_003 includes missing addend and missing part problems');
assert.match(VisualRegistry.render(g2FluencyQuestions.find((q)=>q.visual_model==='ten_frame')),/data-renderer="ten_frame"/,'ten_frame output exists for G2M_OP_003');
assert.match(VisualRegistry.render(g2FluencyQuestions.find((q)=>q.visual_model==='addition_model')),/data-renderer="addition_model"/,'addition_model output exists for G2M_OP_003');
assert.match(VisualRegistry.render(g2FluencyQuestions.find((q)=>q.visual_model==='subtraction_model')),/data-renderer="subtraction_model"/,'subtraction_model output exists for G2M_OP_003');
const g2FluencyShort=g2FluencyQuestions.find((q)=>q.question_type==='short_response');
assert.ok(Renderer.evaluateAnswer(g2FluencyShort,g2FluencyShort.correct_answer),'G2M_OP_003 accepts short-response numeric answers');

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

['G2M_WP_001','G2M_MD_001','G2M_MD_002','G2M_MD_003','G2M_GM_001'].forEach((id)=>{
  const pkg=byId[id];
  assert.ok(pkg,`${id} package exists`);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates as production package`);
  assert.equal(pkg.level_banks.length,5,`${id} has four focused levels plus Mixed`);
  assert.ok(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10-12 questions`));
});

const g2WordProblemQuestions=g2WordProblems.level_banks.flatMap((level)=>level.questions);
assert.ok(g2WordProblemQuestions.some((q)=>q.operation==='addition'),'G2M_WP_001 includes one-step addition word problems');
assert.ok(g2WordProblemQuestions.some((q)=>q.operation==='subtraction'),'G2M_WP_001 includes one-step subtraction word problems');
assert.ok(g2WordProblemQuestions.some((q)=>q.operation==='compare'),'G2M_WP_001 includes compare word problems');
assert.ok(g2WordProblemQuestions.some((q)=>q.operation==='two_step'),'G2M_WP_001 includes two-step word problems');
assert.ok(g2WordProblemQuestions.some((q)=>/\? \+|\? -|- \?/.test(q.equation||'')),'G2M_WP_001 includes unknowns in different positions');
assert.match(VisualRegistry.render(g2WordProblemQuestions.find((q)=>q.visual_model==='word_problem_model')),/data-renderer="word_problem_model"/,'word_problem_model output exists');
assert.match(VisualRegistry.render(g2WordProblemQuestions.find((q)=>q.visual_model==='bar_model')),/data-renderer="bar_model"/,'bar_model output exists');
assert.match(VisualRegistry.render(g2WordProblemQuestions.find((q)=>q.visual_model==='equation_builder')),/data-renderer="equation_builder"/,'equation_builder output exists');
assert.ok(g2WordProblemQuestions.every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G2M_WP_001 has acceptable_answers for numeric responses');

const g2MeasureQuestions=g2MeasureLength.level_banks.flatMap((level)=>level.questions);
assert.ok(g2MeasureQuestions.some((q)=>q.unit==='inches'&&q.visual_model==='ruler'),'G2M_MD_001 includes measuring objects with inch rulers');
assert.ok(g2MeasureQuestions.some((q)=>q.unit==='centimeters'&&q.visual_model==='ruler'),'G2M_MD_001 includes measuring objects with centimeter rulers');
assert.ok(g2MeasureQuestions.some((q)=>q.misconception_tag==='estimate_error'),'G2M_MD_001 includes estimates');
assert.ok(g2MeasureQuestions.some((q)=>q.misconception_tag==='length_difference_confusion'),'G2M_MD_001 includes length comparison and difference problems');
assert.match(VisualRegistry.render(g2MeasureQuestions.find((q)=>q.visual_model==='ruler')),/data-renderer="ruler"/,'ruler output exists');
assert.ok(g2MeasureQuestions.some((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.includes('5 inches')&&q.acceptable_answers.includes('5 in')&&q.acceptable_answers.includes('5')),'G2M_MD_001 accepts unit answer variants');

const g2TimeMoneyQuestions=g2TimeMoney.level_banks.flatMap((level)=>level.questions);
assert.ok(g2TimeMoneyQuestions.some((q)=>q.visual_model==='analog_clock'&&Number(q.minute)%5===0),'G2M_MD_002 includes analog clocks to five-minute intervals');
assert.ok(g2TimeMoneyQuestions.some((q)=>q.visual_model==='digital_time'),'G2M_MD_002 includes digital time matching');
assert.ok(g2TimeMoneyQuestions.some((q)=>/a\.m\.|p\.m\./.test(q.correct_answer)),'G2M_MD_002 includes a.m./p.m. context questions');
['penny','nickel','dime','quarter'].forEach((coin)=>assert.ok(g2TimeMoneyQuestions.some((q)=>q.coin===coin),`G2M_MD_002 includes ${coin} values`));
assert.ok(g2TimeMoneyQuestions.some((q)=>q.visual_model==='money_counting'&&q.coins.length>1),'G2M_MD_002 includes counting mixed coins');
assert.match(VisualRegistry.render(g2TimeMoneyQuestions.find((q)=>q.visual_model==='coin_model')),/data-renderer="coin_model"/,'coin_model output exists');
assert.match(VisualRegistry.render(g2TimeMoneyQuestions.find((q)=>q.visual_model==='money_counting')),/data-renderer="money_counting"/,'money_counting output exists');
assert.ok(g2TimeMoneyQuestions.some((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.includes('3:05')&&q.acceptable_answers.includes('3 05')),'G2M_MD_002 accepts time variants like 3:05 and 3 05');
assert.ok(g2TimeMoneyQuestions.some((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.includes('3:05 p.m.')),'G2M_MD_002 accepts p.m. time variants');
assert.ok(g2TimeMoneyQuestions.some((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.includes('25 cents')&&q.acceptable_answers.includes('$0.25')&&q.acceptable_answers.includes('quarter')),'G2M_MD_002 accepts money variants');

const g2DataQuestions=g2DataGraphs.level_banks.flatMap((level)=>level.questions);
assert.ok(g2DataQuestions.some((q)=>q.visual_model==='picture_graph'),'G2M_MD_003 includes picture graphs');
assert.ok(g2DataQuestions.some((q)=>q.visual_model==='bar_graph'),'G2M_MD_003 includes bar graphs');
assert.ok(g2DataQuestions.some((q)=>q.visual_model==='line_plot'),'G2M_MD_003 includes line plots');
assert.ok(g2DataQuestions.some((q)=>q.visual_model==='data_table'),'G2M_MD_003 includes data tables');
assert.ok(g2DataQuestions.some((q)=>/more|fewer/i.test(q.prompt)&&q.misconception_tag==='more_less_data_confusion'),'G2M_MD_003 includes how many more/less questions');
assert.ok(g2DataQuestions.filter((q)=>q.question_type!=='multiple_choice').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G2M_MD_003 has acceptable_answers for numeric responses');
assert.match(VisualRegistry.render(g2DataQuestions.find((q)=>q.visual_model==='picture_graph')),/data-renderer="picture_graph"/,'picture_graph output exists');
assert.match(VisualRegistry.render(g2DataQuestions.find((q)=>q.visual_model==='bar_graph')),/data-renderer="bar_graph"/,'bar_graph output exists');
assert.match(VisualRegistry.render(g2DataQuestions.find((q)=>q.visual_model==='line_plot')),/data-renderer="line_plot"/,'line_plot output exists');
assert.match(VisualRegistry.render(g2DataQuestions.find((q)=>q.visual_model==='data_table')),/data-renderer="data_table"/,'data_table output exists');

const g2GeometryQuestions=g2Geometry.level_banks.flatMap((level)=>level.questions);
assert.ok(g2GeometryQuestions.some((q)=>q.visual_model==='shape_identification'&&/2D|3 sides|4 equal sides|round/i.test(q.prompt)),'G2M_GM_001 includes 2D shapes');
assert.ok(g2GeometryQuestions.some((q)=>q.visual_model==='shape_identification'&&/3D|faces|cube|sphere|cylinder|cone/i.test(q.prompt)),'G2M_GM_001 includes 3D shapes');
assert.ok(g2GeometryQuestions.some((q)=>/sides|corners|faces/i.test(q.prompt)),'G2M_GM_001 includes sides, corners, and faces');
assert.ok(g2GeometryQuestions.some((q)=>q.visual_model==='partition_shapes'&&/halves/i.test(q.prompt+q.correct_answer)),'G2M_GM_001 includes halves');
assert.ok(g2GeometryQuestions.some((q)=>q.visual_model==='partition_shapes'&&/thirds/i.test(q.prompt+q.correct_answer)),'G2M_GM_001 includes thirds');
assert.ok(g2GeometryQuestions.some((q)=>q.visual_model==='partition_shapes'&&/fourths/i.test(q.prompt+q.correct_answer)),'G2M_GM_001 includes fourths');
assert.ok(g2GeometryQuestions.some((q)=>q.visual_model==='array_model'&&/rows|columns/i.test(q.prompt)),'G2M_GM_001 includes arrays as rows and columns');
assert.ok(g2GeometryQuestions.filter((q)=>q.question_type!=='multiple_choice').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G2M_GM_001 has acceptable_answers for short-response items');
assert.match(VisualRegistry.render(g2GeometryQuestions.find((q)=>q.visual_model==='partition_shapes')),/data-renderer="partition_shapes"/,'partition_shapes output exists');
assert.match(VisualRegistry.render(g2GeometryQuestions.find((q)=>q.visual_model==='array_model')),/data-renderer="array_model"/,'array_model output exists');

const g3MultiplicationQuestions=g3MultiplicationFoundations.level_banks.flatMap((level)=>level.questions);
assert.equal(Schema.validateSkillPackage(g3MultiplicationFoundations,{allowPlannedLevelBanks:false}).valid,true,'G3M_MUL_001 validates in strict production mode');
assert.equal(g3MultiplicationFoundations.grade,3);
assert.equal(g3MultiplicationFoundations.subject,'Math');
assert.equal(g3MultiplicationFoundations.domain,'Operations and Algebraic Thinking');
assert.equal(g3MultiplicationFoundations.skill,'Multiplication Foundations');
assert.equal(Array.isArray(g3MultiplicationFoundations.level_banks),true,'G3M_MUL_001 has level_banks');
assert.equal(g3MultiplicationFoundations.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G3M_MUL_001 has four focused levels');
assert.equal(g3MultiplicationFoundations.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G3M_MUL_001 has Mixed level');
g3MultiplicationFoundations.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
['Level 1: Equal Groups','Level 2: Arrays','Level 3: Repeated Addition','Level 4: Multiplication Equations','Mixed'].forEach((label)=>assert.ok(g3MultiplicationFoundations.level_banks.some((level)=>level.label===label),`G3M_MUL_001 includes ${label}`));
['equal_groups','array_model','repeated_addition','multiplication_model','visual_objects'].forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
['equal_groups','array_model','repeated_addition','multiplication_model','visual_objects'].forEach((visual)=>assert.ok(g3MultiplicationQuestions.some((q)=>q.visual_model===visual),`G3M_MUL_001 includes ${visual}`));
['multiple_choice','short_response','multiplication_equation'].forEach((type)=>assert.ok(g3MultiplicationQuestions.some((q)=>q.question_type===type),`G3M_MUL_001 includes ${type}`));
['equal_groups_confusion','array_rows_columns_confusion','repeated_addition_confusion','multiplication_symbol_confusion'].forEach((tag)=>assert.ok(g3MultiplicationFoundations.misconception_bank[tag],`G3M_MUL_001 includes misconception ${tag}`));
assert.ok(g3MultiplicationQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G3M_MUL_001 short_response items have acceptable_answers');
const g3MissionHtml=Renderer.renderSkillWorld(g3MultiplicationFoundations,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g3MissionHtml,new RegExp(label),`G3M_MUL_001 mission renders ${label}`));
assert.match(g3MissionHtml,/Continue to Skill Practice/,'G3M_MUL_001 profile links to Skill Practice Center');
assert.match(VisualRegistry.render(g3MultiplicationQuestions.find((q)=>q.visual_model==='equal_groups')),/data-renderer="equal_groups"/,'equal_groups renderer output exists');
assert.match(VisualRegistry.render(g3MultiplicationQuestions.find((q)=>q.visual_model==='array_model')),/rows.*columns|columns.*rows/i,'array_model renderer supports rows/columns');
assert.match(VisualRegistry.render(g3MultiplicationQuestions.find((q)=>q.visual_model==='repeated_addition')),/data-renderer="repeated_addition"/,'repeated_addition renderer output exists');
assert.match(VisualRegistry.render(g3MultiplicationQuestions.find((q)=>q.visual_model==='multiplication_model')),/data-renderer="multiplication_model"/,'multiplication_model renderer output exists');

const grade3EnglishLiteracyPackages=[
  {pkg:g3Fluency,id:'G3E_FL_001',domain:'Fluency',skill:'Reading Fluency and Expression',labels:['Level 1: Accuracy','Level 2: Phrasing','Level 3: Punctuation and Expression','Level 4: Repeated Reading','Mixed'],visuals:['sentence_card','sentence_highlight','phrase_builder','fluency_meter'],types:['multiple_choice','short_response','sentence_completion'],tags:['skips_words','punctuation_ignored','phrase_chunking_error','expression_flat_reading'],listenNeeded:true},
  {pkg:g3Vocabulary,id:'G3E_VOC_001',domain:'Vocabulary / Language',skill:'Vocabulary, Context Clues, and Word Relationships',labels:['Level 1: Context Clues','Level 2: Synonyms and Antonyms','Level 3: Shades of Meaning','Level 4: Multiple-Meaning Words','Mixed'],visuals:['context_sentence','vocabulary_match','word_card','word_scale'],types:['multiple_choice','short_response','vocabulary_match'],tags:['context_clue_ignored','synonym_antonym_confusion','shade_of_meaning_confusion','multiple_meaning_confusion'],listenNeeded:true},
  {pkg:g3TextEvidence,id:'G3E_RC_001',domain:'Reading Comprehension',skill:'Ask and Answer Questions With Text Evidence',labels:['Level 1: Literal Questions','Level 2: Inferential Questions','Level 3: Find Text Evidence','Level 4: Explain Your Answer','Mixed'],visuals:['short_passage','question_card','evidence_highlight','text_evidence_builder'],types:['multiple_choice','short_response','text_evidence'],tags:['unsupported_answer','inference_without_evidence','misses_text_evidence','question_word_confusion'],listenNeeded:true},
  {pkg:g3StoryElements,id:'G3E_RC_002',domain:'Reading Literature',skill:'Story Elements, Theme, and Character Response',labels:['Level 1: Characters and Setting','Level 2: Plot and Problem/Solution','Level 3: Character Traits and Response','Level 4: Theme / Lesson','Mixed'],visuals:['story_map','character_trait_chart','event_cards','theme_tracker'],types:['multiple_choice','short_response','sequencing','text_evidence'],tags:['character_trait_confusion','problem_solution_confusion','theme_detail_confusion','sequence_order_error'],listenNeeded:true},
  {pkg:g3MainIdeaFeatures,id:'G3E_RC_003',domain:'Reading Informational Text',skill:'Main Idea, Key Details, and Text Features',labels:['Level 1: Topic and Main Idea','Level 2: Key Details','Level 3: Text Features','Level 4: Connect Ideas','Mixed'],visuals:['short_passage','main_idea_web','detail_cards','text_feature_map'],types:['multiple_choice','short_response','text_evidence','detail_match'],tags:['topic_main_idea_confusion','detail_selection_error','text_feature_confusion','unsupported_detail'],listenNeeded:true}
];
grade3EnglishLiteracyPackages.forEach(({pkg,id,domain,skill,labels,visuals,types,tags})=>{
  assert.ok(pkg,`${id} package loads`);
  const questions=pkg.level_banks.flatMap((level)=>level.questions);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,3);
  assert.equal(pkg.subject,'English');
  assert.equal(pkg.domain,domain);
  assert.equal(pkg.skill,skill);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(questions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(questions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(questions.every((q)=>q.question_audio?.text||q.read_aloud_text),`${id} Skill Practice Center questions include Read Question narration`);
  assert.ok([...pkg.guided_practice,...pkg.adaptive_question_bank,...pkg.checkpoint].every((q)=>q.question_audio?.text||q.read_aloud_text),`${id} mission questions include Read Question narration`);
  ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((step)=>assert.ok(pkg.page_audio?.[step]?.text,`${id} ${step} has Read This Page narration`));
  assert.ok(questions.some((q)=>q.audio?.text),`${id} includes Listen audio where helpful`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} mission renders ${label}`));
  assert.match(missionHtml,/Read This Page/,`${id} mission renders Read This Page`);
  assert.match(missionHtml,/Read Question/,`${id} mission renders Read Question`);
  const drillState=Renderer.createState(); drillState.mode='drill'; drillState.drill.view='play';
  const drillHtml=Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Read Question/,`${id} Skill Practice Center renders Read Question`);
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
});
assert.match(VisualRegistry.render(g3Fluency.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='fluency_meter')),/data-renderer="fluency_meter"/,'fluency_meter renderer output exists');
assert.match(VisualRegistry.render(g3Vocabulary.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='word_scale')),/data-renderer="word_scale"/,'word_scale renderer output exists');
assert.match(VisualRegistry.render(g3TextEvidence.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='text_evidence_builder')),/data-renderer="text_evidence_builder"/,'text_evidence_builder renderer output exists');
assert.match(VisualRegistry.render(g3StoryElements.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='character_trait_chart')),/data-renderer="character_trait_chart"/,'character_trait_chart renderer output exists');
assert.match(VisualRegistry.render(g3StoryElements.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='theme_tracker')),/data-renderer="theme_tracker"/,'theme_tracker renderer output exists');
assert.match(VisualRegistry.render(g3MainIdeaFeatures.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='text_feature_map')),/data-renderer="text_feature_map"/,'text_feature_map renderer output exists');

const grade3OperationsPackages=[
  {pkg:g3DivisionFoundations,id:'G3M_DIV_001',skill:'Division Foundations',labels:['Level 1: Equal Sharing','Level 2: Equal Groups','Level 3: Division Equations','Level 4: Multiplication and Division Relationship','Mixed'],visuals:['division_model','equal_groups','array_model','fact_family_model'],types:['multiple_choice','short_response','division_equation'],tags:['sharing_grouping_confusion','remainder_confusion','division_symbol_confusion','inverse_operation_confusion']},
  {pkg:g3FactFluency,id:'G3M_FACT_001',skill:'Multiplication and Division Fluency',labels:['Level 1: 2s, 5s, and 10s','Level 2: 3s and 4s','Level 3: 6s, 7s, and 8s','Level 4: 9s and Mixed Facts','Mixed'],visuals:['multiplication_chart','fact_family_model','array_model','skip_counting'],types:['multiple_choice','short_response','multiplication_equation','division_equation'],tags:['fact_recall_gap','inverse_fact_confusion','skip_count_error','multiplication_division_mixup']},
  {pkg:g3WordProblems,id:'G3M_WP_001',skill:'Two-Step Word Problems',labels:['Level 1: One-Step Review','Level 2: Two-Step Addition/Subtraction','Level 3: Two-Step Multiplication/Division','Level 4: Mixed Operation Problems','Mixed'],visuals:['word_problem_model','bar_model','equation_builder','operation_sort'],types:['multiple_choice','short_response','word_problem','equation_builder'],tags:['operation_selection_error','two_step_tracking_error','hidden_question_confusion','equation_setup_error']}
];
grade3OperationsPackages.forEach(({pkg,id,skill,labels,visuals,types,tags})=>{
  const questions=pkg.level_banks.flatMap((level)=>level.questions);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,3);
  assert.equal(pkg.subject,'Math');
  assert.equal(pkg.domain,'Operations and Algebraic Thinking');
  assert.equal(pkg.skill,skill);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(questions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(questions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(questions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} short-response items have acceptable_answers`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} mission renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
});
assert.match(VisualRegistry.render(g3DivisionFoundations.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='division_model')),/data-renderer="division_model"/,'division_model output exists');
assert.match(VisualRegistry.render(g3DivisionFoundations.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='fact_family_model')),/data-renderer="fact_family_model"/,'fact_family_model output exists');
assert.match(VisualRegistry.render(g3FactFluency.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='multiplication_chart')),/data-renderer="multiplication_chart"/,'multiplication_chart output exists');
assert.match(VisualRegistry.render(g3FactFluency.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='skip_counting')),/data-renderer="skip_counting"/,'skip_counting output exists');
assert.match(VisualRegistry.render(g3WordProblems.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='operation_sort')),/data-renderer="operation_sort"/,'operation_sort output exists');

const grade3BaseTenFractionPackages=[
  {pkg:g3PlaceValueRounding,id:'G3M_PV_001',domain:'Number and Operations in Base Ten',skill:'Place Value and Rounding to 1,000',labels:['Level 1: Place Value to 1,000','Level 2: Round to Nearest 10','Level 3: Round to Nearest 100','Level 4: Add/Subtract Using Place Value','Mixed'],visuals:['place_value_chart','number_line','rounding_model','expanded_form'],types:['multiple_choice','short_response','number_line','rounding'],tags:['rounding_direction_error','midpoint_confusion','place_value_error','zero_placeholder_confusion']},
  {pkg:g3FractionFoundations,id:'G3M_FR_001',domain:'Number and Operations—Fractions',skill:'Fraction Foundations',labels:['Level 1: Equal Parts','Level 2: Unit Fractions','Level 3: Fractions on a Number Line','Level 4: Whole Numbers as Fractions','Mixed'],visuals:['fraction_bar','fraction_circle','number_line','partition_shapes'],types:['multiple_choice','short_response','fraction_response'],tags:['unequal_parts_confusion','numerator_denominator_confusion','fraction_size_confusion','whole_as_fraction_confusion']},
  {pkg:g3FractionComparisons,id:'G3M_FR_002',domain:'Number and Operations—Fractions',skill:'Equivalent Fractions and Comparing Fractions',labels:['Level 1: Equivalent Fractions','Level 2: Compare Same Denominator','Level 3: Compare Same Numerator','Level 4: Fraction Number Line Comparisons','Mixed'],visuals:['fraction_bar','fraction_circle','number_line','comparison'],types:['multiple_choice','short_response','fraction_response','comparison'],tags:['equivalent_fraction_confusion','denominator_size_confusion','numerator_focus_error','fraction_number_line_error']}
];
grade3BaseTenFractionPackages.forEach(({pkg,id,domain,skill,labels,visuals,types,tags})=>{
  assert.ok(pkg,`${id} package loads`);
  const questions=pkg.level_banks.flatMap((level)=>level.questions);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,3);
  assert.equal(pkg.subject,'Math');
  assert.equal(pkg.domain,domain);
  assert.equal(pkg.skill,skill);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(questions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(questions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(questions.filter((q)=>q.question_type!=='multiple_choice').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} non-multiple-choice items have acceptable_answers`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} mission renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
});
const grade3MeasurementGeometryPackages=[
  {pkg:g3MeasurementData,id:'G3M_MD_001',domain:'Measurement and Data',skill:'Time, Measurement, and Data',labels:['Level 1: Elapsed Time','Level 2: Measure Mass and Volume','Level 3: Graphs and Data','Level 4: Line Plots with Fractions','Mixed'],visuals:['analog_clock','elapsed_time_timeline','measurement_comparison','bar_graph','line_plot'],types:['multiple_choice','short_response','elapsed_time','measurement','data_interpretation'],tags:['elapsed_time_confusion','unit_conversion_confusion','graph_scale_confusion','line_plot_fraction_error'],answerTypes:['elapsed_time','measurement','data_interpretation','short_response']},
  {pkg:g3AreaPerimeter,id:'G3M_GM_001',domain:'Measurement and Geometry',skill:'Area and Perimeter',labels:['Level 1: Count Square Units','Level 2: Area of Rectangles','Level 3: Perimeter','Level 4: Area vs Perimeter','Mixed'],visuals:['area_model','grid_model','perimeter_path','rectangle_model'],types:['multiple_choice','short_response','area_response','perimeter_response'],tags:['area_perimeter_confusion','square_unit_count_error','side_length_addition_error','formula_misuse'],answerTypes:['area_response','perimeter_response','short_response']},
  {pkg:g3GeometryShapes,id:'G3M_GM_002',domain:'Geometry',skill:'Shapes, Attributes, and Partitioning',labels:['Level 1: Shape Attributes','Level 2: Quadrilaterals','Level 3: Partition Shapes','Level 4: Fractions from Shapes','Mixed'],visuals:['shape_identification','attribute_sort','partition_shapes','fraction_circle'],types:['multiple_choice','short_response','sorting','fraction_response'],tags:['quadrilateral_confusion','attribute_overgeneralization','unequal_partition_error','fraction_shape_confusion'],answerTypes:['short_response','sorting','fraction_response']}
];
grade3MeasurementGeometryPackages.forEach(({pkg,id,domain,skill,labels,visuals,types,tags,answerTypes})=>{
  assert.ok(pkg,`${id} package loads`);
  const questions=pkg.level_banks.flatMap((level)=>level.questions);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,3);
  assert.equal(pkg.subject,'Math');
  assert.equal(pkg.domain,domain);
  assert.equal(pkg.skill,skill);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(questions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(questions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(questions.filter((q)=>q.question_type!=='multiple_choice').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} non-multiple-choice items have acceptable_answers`);
  answerTypes.forEach((type)=>assert.ok(questions.filter((q)=>q.question_type===type).every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} ${type} acceptable_answers exist`));
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} mission renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
});
const g3PvQuestions=g3PlaceValueRounding.level_banks.flatMap((level)=>level.questions);
assert.ok(g3PvQuestions.some((q)=>/45/.test(q.prompt)&&String(q.correct_answer)==='50'),'G3M_PV_001 includes 45 rounds to 50 midpoint example');
assert.ok(g3PvQuestions.some((q)=>/150/.test(q.prompt)&&String(q.correct_answer)==='200'),'G3M_PV_001 includes 150 rounds to 200 midpoint example');
assert.ok(g3PvQuestions.filter((q)=>q.question_type!=='multiple_choice').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G3M_PV_001 has acceptable_answers for numeric responses');
const g3FrQuestions=g3FractionFoundations.level_banks.flatMap((level)=>level.questions);
['1/2','1/3','1/4','1/6','1/8'].forEach((frac)=>assert.ok(g3FrQuestions.some((q)=>q.correct_answer===frac),`G3M_FR_001 includes ${frac}`));
assert.ok(g3FrQuestions.some((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.includes('one half')&&q.acceptable_answers.includes('one-half')),'G3M_FR_001 accepts one half variants');
assert.ok(g3FrQuestions.some((q)=>q.prompt.includes('denominator 3')&&q.correct_answer==='3/3'),'G3M_FR_001 includes 1 = 3/3');
const g3CmpQuestions=g3FractionComparisons.level_banks.flatMap((level)=>level.questions);
assert.ok(g3CmpQuestions.some((q)=>/1\/2/.test(q.prompt)&&q.correct_answer==='2/4'),'G3M_FR_002 includes 1/2 = 2/4 equivalence');
assert.ok(g3CmpQuestions.some((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.includes('<')),'G3M_FR_002 accepts comparison symbol responses');
assert.match(VisualRegistry.render(g3PvQuestions.find((q)=>q.visual_model==='rounding_model')),/data-renderer="rounding_model"/,'rounding_model output exists');
const g3FractionBarHtml=VisualRegistry.render(g3FrQuestions.find((q)=>q.visual_model==='fraction_bar'));
const g3FractionCircleHtml=VisualRegistry.render(g3FrQuestions.find((q)=>q.visual_model==='fraction_circle'));
const g3ComparisonBarHtml=VisualRegistry.render(g3CmpQuestions.find((q)=>q.visual_model==='fraction_bar'));
const g3ComparisonCircleHtml=VisualRegistry.render(g3CmpQuestions.find((q)=>q.visual_model==='fraction_circle'));
assert.match(g3FractionBarHtml,/data-renderer="fraction_bar"/,'fraction_bar output exists');
assert.match(g3FractionBarHtml,/fraction-bar-cell[^>]+filled/,'fraction_bar output includes shaded partition cells');
assert.match(g3FractionBarHtml,/fraction-bar-cell/g,'fraction_bar output includes partition cells');
assert.match(g3FractionCircleHtml,/data-renderer="fraction_circle"/,'fraction_circle output exists');
assert.match(g3FractionCircleHtml,/fraction-circle-sector[^>]+filled|fraction-circle-sector filled/,'fraction_circle output includes shaded partition markup');
assert.doesNotMatch(g3FractionCircleHtml.trim(),/^\d+$/,'fraction_circle does not return a raw number string');
assert.doesNotMatch(g3FractionCircleHtml,/fraction-slice[^>]*>\s*\d+\s*<\/span>/,'fraction_circle does not render placeholder digit slices');
assert.match(g3ComparisonBarHtml,/data-renderer="fraction_bar"/,'G3M_FR_002 fraction_bar output exists');
assert.match(g3ComparisonBarHtml,/fraction-bar-cell[^>]+filled/,'G3M_FR_002 fraction_bar output includes shaded cells');
assert.match(g3ComparisonCircleHtml,/data-renderer="fraction_circle"/,'G3M_FR_002 fraction_circle output exists');
assert.match(g3ComparisonCircleHtml,/fraction-circle-sector[^>]+filled|fraction-circle-sector filled/,'G3M_FR_002 fraction_circle output includes shaded sectors');
const g3FrDrillState=Renderer.createState();
Renderer.selectLevel(g3FrDrillState,0);
const g3FrDrillHtml=Renderer.renderSkillWorld(g3FractionFoundations,{state:g3FrDrillState,mode:'drill',failClosed:true}).html;
assert.match(g3FrDrillHtml,/data-renderer="fraction_circle"|data-renderer="partition_shapes"/,'G3M_FR_001 drill renders a fraction visual');
assert.match(g3FrDrillHtml,/fraction-circle-sector|partition-piece[^>]+filled/,'G3M_FR_001 drill renders real fraction partitions');
assert.doesNotMatch(g3FrDrillHtml,/fraction-slice[^>]*>\s*\d+\s*<\/span>/,'G3M_FR_001 drill does not render raw digit placeholders');
const g3CmpLevel1State=Renderer.createState();
Renderer.selectLevel(g3CmpLevel1State,0);
const g3CmpDrillHtml=Renderer.renderSkillWorld(g3FractionComparisons,{state:g3CmpLevel1State,mode:'drill',failClosed:true}).html;
assert.match(g3CmpDrillHtml,/fraction-bar-cell|fraction-circle-sector/,'G3M_FR_002 equivalent drill renders real fraction visuals');
const g3CmpLevel2State=Renderer.createState();
Renderer.selectLevel(g3CmpLevel2State,1);
const g3CmpCompareDrillHtml=Renderer.renderSkillWorld(g3FractionComparisons,{state:g3CmpLevel2State,mode:'drill',failClosed:true}).html;
assert.match(g3CmpCompareDrillHtml,/fraction-bar-cell[^>]+filled/,'G3M_FR_002 comparison drill renders real fraction visuals');
['elapsed_time_timeline','area_model','grid_model','perimeter_path','rectangle_model','attribute_sort'].forEach((visual)=>{
  const question=[g3MeasurementData,g3AreaPerimeter,g3GeometryShapes].flatMap((pkg)=>pkg.level_banks.flatMap((level)=>level.questions)).find((q)=>q.visual_model===visual);
  assert.match(VisualRegistry.render(question),new RegExp(`data-renderer="${visual}"`),`${visual} output exists`);
});
assert.ok(g3MeasurementData.level_banks.flatMap((level)=>level.questions).some((q)=>q.visual_model==='line_plot'&&Array.isArray(q.acceptable_answers)&&q.acceptable_answers.some((answer)=>String(answer).includes('/'))),'G3M_MD_001 fraction line-plot acceptable answers exist');
assert.ok(g3AreaPerimeter.level_banks.flatMap((level)=>level.questions).some((q)=>/square units|sq units/.test((q.acceptable_answers||[]).join(' '))),'G3M_GM_001 area acceptable answers include square-unit language');
assert.ok(g3GeometryShapes.level_banks.flatMap((level)=>level.questions).some((q)=>q.question_type==='fraction_response'&&Array.isArray(q.acceptable_answers)&&q.acceptable_answers.some((answer)=>String(answer).includes('/'))),'G3M_GM_002 fraction acceptable answers exist');
assert.ok(g3GeometryShapes.level_banks.flatMap((level)=>level.questions).some((q)=>/(quadrilateral|triangle|rectangle|square)/i.test((q.acceptable_answers||[]).join(' '))),'G3M_GM_002 shape acceptable answers exist');

const g4PlaceValue=load('G4M_NBT_001');
const g4Questions=[...(g4PlaceValue.guided_practice||[]),...(g4PlaceValue.adaptive_question_bank||[]),...(g4PlaceValue.checkpoint||[]),...(g4PlaceValue.level_banks||[]).flatMap((level)=>level.questions||[])];
assert.equal(Schema.validateSkillPackage(g4PlaceValue,{allowPlannedLevelBanks:false}).valid,true,'G4M_NBT_001 validates in strict production mode');
assert.equal(g4PlaceValue.grade,4,'G4M_NBT_001 is Grade 4');
assert.equal(g4PlaceValue.subject,'Math','G4M_NBT_001 is Math');
assert.equal(g4PlaceValue.domain,'Number and Operations in Base Ten','G4M_NBT_001 domain matches plan');
assert.equal(g4PlaceValue.skill,'Place Value to 1,000,000','G4M_NBT_001 title matches plan');
assert.equal(Array.isArray(g4PlaceValue.level_banks),true,'G4M_NBT_001 has level_banks');
assert.equal(g4PlaceValue.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length>=4,true,'G4M_NBT_001 has at least four focused levels');
assert.equal(g4PlaceValue.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G4M_NBT_001 has Mixed level');
g4PlaceValue.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
['Level 1: Place Value to 1,000,000','Level 2: Read and Write Multi-Digit Numbers','Level 3: Compare Multi-Digit Numbers','Level 4: Round Multi-Digit Numbers','Mixed'].forEach((label)=>assert.ok(g4PlaceValue.level_banks.some((level)=>level.label===label),`G4M_NBT_001 includes ${label}`));
['place_value_chart','expanded_form','number_line','rounding_model'].forEach((visual)=>assert.ok(g4Questions.some((q)=>q.visual_model===visual),`G4M_NBT_001 includes ${visual}`));
['multiple_choice','short_response','comparison','rounding'].forEach((type)=>assert.ok(g4Questions.some((q)=>q.question_type===type),`G4M_NBT_001 includes ${type}`));
['place_value_shift_error','zero_placeholder_confusion','expanded_form_error','rounding_place_error'].forEach((tag)=>assert.ok(g4PlaceValue.misconception_bank[tag],`G4M_NBT_001 includes misconception ${tag}`));
assert.ok(g4Questions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G4M_NBT_001 short-response items have acceptable_answers');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const audio=g4PlaceValue.page_audio?.[screen]; assert.ok(audio?.text,`G4M_NBT_001 has Read This Page narration for ${screen}`); assert.equal(audio.label,'Read This Page',`G4M_NBT_001 ${screen} uses Read This Page label`);});
[...(g4PlaceValue.guided_practice||[]),...(g4PlaceValue.adaptive_question_bank||[]),...(g4PlaceValue.checkpoint||[])].forEach((q)=>assert.ok(q.question_audio?.text||q.read_aloud_text,`${q.question_id} mission question has Read Question narration`));
g4PlaceValue.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.ok(q.question_audio?.text||q.read_aloud_text,`${q.question_id} practice question has Read Question narration`));
const g4MissionHtml=Renderer.renderSkillWorld(g4PlaceValue,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g4MissionHtml,new RegExp(label),`G4M_NBT_001 mission renders ${label}`));
assert.match(g4MissionHtml,/Continue to Skill Practice/,'G4M_NBT_001 profile links to Skill Practice Center');
assert.match(VisualRegistry.render({visual_model:'place_value_chart',value:1000000,millions:1,hundred_thousands:0,ten_thousands:0,thousands:0,hundreds:0,tens:0,ones:0}),/Millions/,'place_value_chart renderer handles 1,000,000');
assert.match(VisualRegistry.render(g4Questions.find((q)=>q.visual_model==='expanded_form'&&q.value===405020)),/405,020|405020/,'expanded_form renderer handles multi-digit numbers with zeros');
assert.match(VisualRegistry.render(g4Questions.find((q)=>q.visual_model==='number_line')),/data-renderer="number_line"/,'number_line renderer handles Grade 4 values');
assert.match(VisualRegistry.render(g4Questions.find((q)=>q.visual_model==='rounding_model'&&q.round_to>=100000)),/data-renderer="rounding_model"/,'rounding_model renderer handles Grade 4 values');

const g5DecimalPlaceValue=load('G5M_NBT_001');
const g5Questions=[...(g5DecimalPlaceValue.guided_practice||[]),...(g5DecimalPlaceValue.adaptive_question_bank||[]),...(g5DecimalPlaceValue.checkpoint||[]),...(g5DecimalPlaceValue.level_banks||[]).flatMap((level)=>level.questions||[])];
assert.equal(Schema.validateSkillPackage(g5DecimalPlaceValue,{allowPlannedLevelBanks:false}).valid,true,'G5M_NBT_001 validates in strict production mode');
assert.equal(g5DecimalPlaceValue.grade,5,'G5M_NBT_001 is Grade 5');
assert.equal(g5DecimalPlaceValue.subject,'Math','G5M_NBT_001 is Math');
assert.equal(g5DecimalPlaceValue.domain,'Number and Operations in Base Ten','G5M_NBT_001 domain matches plan');
assert.equal(g5DecimalPlaceValue.skill,'Place Value With Decimals','G5M_NBT_001 title matches plan');
assert.deepEqual(Renderer.stepLabels(g5DecimalPlaceValue),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'G5M_NBT_001 full Skill World flow exists');
assert.equal(Array.isArray(g5DecimalPlaceValue.level_banks),true,'G5M_NBT_001 has real level_banks');
assert.equal(g5DecimalPlaceValue.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G5M_NBT_001 has four focused levels');
assert.equal(g5DecimalPlaceValue.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G5M_NBT_001 has Mixed level');
g5DecimalPlaceValue.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
['Level 1: Whole Number Place Value Review','Level 2: Decimal Place Value to Thousandths','Level 3: Powers of 10 and Place Value Shifts','Level 4: Compare and Round Decimals','Mixed'].forEach((label)=>assert.ok(g5DecimalPlaceValue.level_banks.some((level)=>level.label===label),`G5M_NBT_001 includes ${label}`));
['place_value_chart','decimal_grid','number_line','rounding_model'].forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
['place_value_chart','decimal_grid','number_line','rounding_model'].forEach((visual)=>assert.ok(g5Questions.some((q)=>q.visual_model===visual),`G5M_NBT_001 includes ${visual}`));
['multiple_choice','short_response','comparison','rounding'].forEach((type)=>assert.ok(g5Questions.some((q)=>q.question_type===type),`G5M_NBT_001 includes ${type}`));
['decimal_place_value_confusion','decimal_length_error','power_of_ten_shift_error','rounding_decimal_error'].forEach((tag)=>assert.ok(g5DecimalPlaceValue.misconception_bank[tag],`G5M_NBT_001 includes misconception ${tag}`));
assert.ok(g5Questions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G5M_NBT_001 short-response items have acceptable_answers');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const audio=g5DecimalPlaceValue.page_audio?.[screen]; assert.ok(audio?.text,`G5M_NBT_001 has Read This Page narration for ${screen}`); assert.equal(audio.label,'Read This Page',`G5M_NBT_001 ${screen} uses Read This Page label`); assert.ok(audio.text.split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`G5M_NBT_001 ${screen} has tutor-quality narration`);});
['practice','challenge','checkpoint'].forEach((screen)=>assert.match(g5DecimalPlaceValue.page_audio[screen].text,/Read Question/,`G5M_NBT_001 ${screen} references Read Question`));
[...(g5DecimalPlaceValue.guided_practice||[]),...(g5DecimalPlaceValue.adaptive_question_bank||[]),...(g5DecimalPlaceValue.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
g5DecimalPlaceValue.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} practice question has Read Question narration`));
const g5MissionHtml=Renderer.renderSkillWorld(g5DecimalPlaceValue,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g5MissionHtml,new RegExp(label),`G5M_NBT_001 mission renders ${label}`));
assert.match(g5MissionHtml,/Continue to Skill Practice/,'G5M_NBT_001 profile links to Skill Practice Center');
const g5DrillHtml=Renderer.renderSkillWorld(g5DecimalPlaceValue,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
assert.match(g5DrillHtml,/Skill Practice Center/,'G5M_NBT_001 Practice This Skill route renders Skill Practice Center');
const g5DecimalGridHtml=VisualRegistry.render(g5Questions.find((q)=>q.visual_model==='decimal_grid'));
assert.match(g5DecimalGridHtml,/data-renderer="decimal_grid"/,'decimal_grid renderer output exists');
assert.match(g5DecimalGridHtml,/decimal-grid-cell/g,'decimal_grid renders real visual cells');
assert.match(g5DecimalGridHtml,/decimal-grid-cell[^>]+shaded/,'decimal_grid renders shaded parts');
assert.doesNotMatch(g5DecimalGridHtml,/placeholder|coming soon/i,'decimal_grid does not render placeholder text');
assert.match(VisualRegistry.render({visual_model:'place_value_chart',value:6.482,tenths:4,hundredths:8,thousandths:2,place:'thousandths'}),/Thousandths/,'place_value_chart handles decimals to thousandths');
assert.match(VisualRegistry.render(g5Questions.find((q)=>q.visual_model==='number_line'&&String(q.prompt).includes('0.4'))),/0\.4|0\.400|decimal benchmark/,'number_line renders decimal values');
assert.match(VisualRegistry.render(g5Questions.find((q)=>q.visual_model==='rounding_model')),/3\.46|3\.5|data-renderer="rounding_model"/,'rounding_model renders decimal values');
const g5Manifest=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
assert.ok(g5Manifest.packages.includes('G5M_NBT_001.skill-package.v1.json'),'manifest includes G5M_NBT_001');
assert.equal(`/skill-world/${encodeURIComponent('G5M_NBT_001')}/drill`,'/skill-world/G5M_NBT_001/drill','Practice This Skill route exists for G5M_NBT_001');

const g4Manifest=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
assert.ok(g4Manifest.packages.includes('G4M_NBT_001.skill-package.v1.json'),'manifest includes G4M_NBT_001');
assert.equal(`/skill-world/${encodeURIComponent('G4M_NBT_001')}/drill`,'/skill-world/G4M_NBT_001/drill','Practice This Skill route exists for G4M_NBT_001');
console.log('skill-world-generator tests passed');

const grade4BatchIds=['G4M_OA_001','G4M_NBT_002','G4M_NBT_003'];
const grade4BatchPackages=grade4BatchIds.map(load);
function assertGrade4BatchPackage(pkg,expected){
  assert.ok(pkg,`${expected.id} package loads`);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${expected.id} validates in strict production mode`);
  assert.equal(pkg.grade,4,`${expected.id} is Grade 4`);
  assert.equal(pkg.subject,'Math',`${expected.id} is Math`);
  assert.equal(pkg.domain,expected.domain,`${expected.id} domain matches`);
  assert.equal(pkg.skill,expected.skill,`${expected.id} skill matches`);
  assert.deepEqual(Renderer.stepLabels(pkg),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],`${expected.id} mission flow is complete`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${expected.id} mission renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${expected.id} profile links to Skill Practice Center`);
  const drillHtml=Renderer.renderSkillWorld(pkg,{state:Renderer.createState(),mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${expected.id} practice route renders Skill Practice Center`);
  assert.equal(Array.isArray(pkg.level_banks),true,`${expected.id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${expected.id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${expected.id} has Mixed level`);
  expected.levelLabels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${expected.id} includes ${label}`));
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${expected.id} ${level.level_id} has 10–12 questions`));
  ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${expected.id} ${screen} has Read This Page narration`);
    assert.ok((pkg.page_audio?.[screen]?.text||'').length>=140,`${expected.id} ${screen} narration teaches the page`);
  });
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${expected.id} ${screen} page narration references Read Question`));
  [...pkg.guided_practice,...pkg.adaptive_question_bank,...pkg.checkpoint].forEach((question)=>{
    assert.equal(question.question_audio?.label,'Read Question',`${question.question_id} mission question has Read Question narration`);
    assert.ok(question.question_audio?.text,`${question.question_id} question narration has text`);
  });
  pkg.level_banks.flatMap((level)=>level.questions).forEach((question)=>{
    assert.equal(question.question_audio?.label,'Read Question',`${question.question_id} practice question has Read Question narration`);
    assert.ok(question.question_audio?.text,`${question.question_id} practice question narration has text`);
    if(question.question_type==='short_response'||question.question_type==='pattern_response'||question.question_type==='algorithm_response'||question.question_type==='multiplication_equation'){
      assert.ok(Array.isArray(question.acceptable_answers)&&question.acceptable_answers.length>0,`${question.question_id} acceptable_answers exist`);
    }
  });
  expected.visuals.forEach((visual)=>assert.ok(pkg.level_banks.flatMap((level)=>level.questions).some((q)=>q.visual_model===visual),`${expected.id} includes visual ${visual}`));
  expected.types.forEach((type)=>assert.ok(pkg.level_banks.flatMap((level)=>level.questions).some((q)=>q.question_type===type),`${expected.id} includes question type ${type}`));
  expected.tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${expected.id} includes misconception ${tag}`));
}
assertGrade4BatchPackage(grade4BatchPackages[0],{id:'G4M_OA_001',domain:'Operations and Algebraic Thinking',skill:'Multiplicative Comparison and Patterns',levelLabels:['Level 1: Multiplicative Comparison','Level 2: Factors and Multiples','Level 3: Prime and Composite Numbers','Level 4: Number and Shape Patterns','Mixed'],visuals:['comparison_model','factor_pair_model','multiples_chart','pattern_table'],types:['multiple_choice','short_response','pattern_response'],tags:['additive_vs_multiplicative_confusion','factor_multiple_confusion','prime_composite_confusion','pattern_rule_error']});
assertGrade4BatchPackage(grade4BatchPackages[1],{id:'G4M_NBT_002',domain:'Number and Operations in Base Ten',skill:'Multi-Digit Addition and Subtraction',levelLabels:['Level 1: Add Multi-Digit Numbers','Level 2: Subtract Multi-Digit Numbers','Level 3: Regrouping Across Zeros','Level 4: Estimate and Check','Mixed'],visuals:['algorithm_steps','regrouping_model','estimation_number_line'],types:['multiple_choice','short_response','algorithm_response'],tags:['regrouping_across_zero_error','digit_alignment_error','subtraction_borrowing_error','estimate_reasonableness_error']});
assertGrade4BatchPackage(grade4BatchPackages[2],{id:'G4M_NBT_003',domain:'Number and Operations in Base Ten',skill:'Multi-Digit Multiplication',levelLabels:['Level 1: Multiply by One Digit','Level 2: Area Model Multiplication','Level 3: Partial Products','Level 4: Two-Digit by Two-Digit','Mixed'],visuals:['area_model','partial_products_model','multiplication_model','algorithm_steps'],types:['multiple_choice','short_response','multiplication_equation'],tags:['place_value_product_error','partial_products_confusion','digit_alignment_error','area_model_mismatch']});
assert.match(VisualRegistry.render({visual_model:'comparison_model',base_value:4,factor:3,compared_value:12}),/data-renderer="comparison_model"/,'comparison_model renderer output exists');
assert.match(VisualRegistry.render({visual_model:'factor_pair_model',number:24}),/data-renderer="factor_pair_model"/,'factor_pair_model renderer output exists');
assert.match(VisualRegistry.render({visual_model:'multiples_chart',multiple_of:6,limit:30}),/data-renderer="multiples_chart"/,'multiples_chart renderer output exists');
assert.match(VisualRegistry.render({visual_model:'pattern_table',rule:'add 4',pattern_rows:[{input:1,output:5}]}),/data-renderer="pattern_table"/,'pattern_table renderer output exists');
assert.match(VisualRegistry.render({visual_model:'algorithm_steps',operation:'+',operands:[1234,5678],correct_answer:'6,912'}),/data-renderer="algorithm_steps"/,'algorithm_steps renderer output exists');
assert.match(VisualRegistry.render({visual_model:'regrouping_model',trades:['trade one thousand']}),/data-renderer="regrouping_model"/,'regrouping_model renderer output exists');
assert.match(VisualRegistry.render({visual_model:'estimation_number_line',exact:5791,estimate:6000}),/data-renderer="estimation_number_line"/,'estimation_number_line renderer output exists');
assert.match(VisualRegistry.render({visual_model:'partial_products_model',partial_products:[180,24],correct_answer:204}),/data-renderer="partial_products_model"/,'partial_products_model renderer output exists');
assert.match(VisualRegistry.render({visual_model:'measurement_conversion_table',amount:3,from_unit:'feet',to_unit:'inches',factor:12,converted:36}),/data-renderer="measurement_conversion_table"/,'measurement_conversion_table renderer output exists');
assert.match(VisualRegistry.render({visual_model:'angle_model',angle_degrees:75,angle_type:'acute'}),/data-renderer="angle_model"/,'angle_model renderer output exists');
assert.match(VisualRegistry.render({visual_model:'protractor_model',angle_degrees:120}),/data-renderer="protractor_model"/,'protractor_model renderer output exists');
assert.match(VisualRegistry.render({visual_model:'line_relationships',relationship:'perpendicular'}),/data-renderer="line_relationships"/,'line_relationships renderer output exists');
assert.match(VisualRegistry.render({visual_model:'symmetry_model',shape:'rectangle',symmetry_lines:1}),/data-renderer="symmetry_model"/,'symmetry_model renderer output exists');

const grade4DivisionFractionsPackages=[
  {pkg:g4DivisionRemainders,id:'G4M_NBT_004',domain:'Number and Operations in Base Ten',skill:'Division With Remainders',labels:['Level 1: Division Without Remainders','Level 2: Division With Remainders','Level 3: Interpret Remainders','Level 4: Check With Multiplication','Mixed'],visuals:['division_model','area_model','remainder_model','fact_family_model'],types:['multiple_choice','short_response','division_equation'],tags:['remainder_confusion','divisor_dividend_confusion','quotient_place_value_error','inverse_operation_confusion']},
  {pkg:g4FractionEquivalenceOrdering,id:'G4M_FR_001',domain:'Number and Operations—Fractions',skill:'Fraction Equivalence and Ordering',labels:['Level 1: Equivalent Fractions','Level 2: Compare Fractions','Level 3: Fraction Number Lines','Level 4: Benchmark Fractions','Mixed'],visuals:['fraction_bar','fraction_circle','number_line','comparison'],types:['multiple_choice','short_response','fraction_response','comparison'],tags:['equivalent_fraction_confusion','denominator_size_confusion','benchmark_fraction_error','fraction_number_line_error']},
  {pkg:g4AddSubtractFractions,id:'G4M_FR_002',domain:'Number and Operations—Fractions',skill:'Add and Subtract Fractions',labels:['Level 1: Add Like Denominators','Level 2: Subtract Like Denominators','Level 3: Mixed Numbers','Level 4: Word Problems With Fractions','Mixed'],visuals:['fraction_bar','fraction_circle','equation_builder','word_problem_model'],types:['multiple_choice','short_response','fraction_response','word_problem'],tags:['denominator_addition_error','mixed_number_confusion','improper_fraction_confusion','fraction_word_problem_error']},
  {pkg:g4MultiplyFractionsWholeNumbers,id:'G4M_FR_003',domain:'Number and Operations—Fractions',skill:'Multiply Fractions by Whole Numbers',labels:['Level 1: Unit Fractions as Multiples','Level 2: Whole Number Times Fraction','Level 3: Fraction Times Whole Number','Level 4: Fraction Word Problems','Mixed'],visuals:['fraction_bar','repeated_addition','multiplication_model','word_problem_model'],types:['multiple_choice','short_response','fraction_response','multiplication_equation'],tags:['unit_fraction_multiple_confusion','whole_number_fraction_product_error','repeated_addition_fraction_error','fraction_scaling_confusion']}
];

grade4DivisionFractionsPackages.forEach(({pkg,id,domain,skill,labels,visuals,types,tags})=>{
  assert.ok(pkg,`${id} package loads`);
  const questions=pkg.level_banks.flatMap((level)=>level.questions);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,4);
  assert.equal(pkg.subject,'Math');
  assert.equal(pkg.domain,domain);
  assert.equal(pkg.skill,skill);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(questions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(questions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(questions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} short-response items have acceptable_answers`);
  assert.ok(questions.every((q)=>q.question_audio?.label==='Read Question'&&q.question_audio?.text),`${id} Skill Practice Center questions have Read Question narration`);
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${id} ${screen} has Read This Page narration`);
    assert.equal((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,true,`${id} ${screen} narration teaches the page`);
  }
  for (const screen of ['practice','challenge','checkpoint']) assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} mentions Read Question`);
  for (const q of [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])]) assert.equal(q.question_audio?.label,'Read Question',`${id} guided mission question has Read Question narration`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillState=Renderer.createState();
  Renderer.selectLevel(drillState,0);
  const drillHtml=Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});

const grade4FinalMeasurementGeometryPackages=[
  {pkg:g4MeasurementConversionData,id:'G4M_MD_001',domain:'Measurement and Data',skill:'Measurement Conversion and Data',labels:['Level 1: Convert Larger to Smaller Units','Level 2: Measurement Word Problems','Level 3: Line Plots With Fractions','Level 4: Area and Perimeter Word Problems','Mixed'],visuals:['measurement_conversion_table','word_problem_model','line_plot','area_model','perimeter_path'],types:['multiple_choice','short_response','measurement','data_interpretation'],tags:['unit_conversion_direction_error','measurement_unit_confusion','line_plot_fraction_error','area_perimeter_confusion']},
  {pkg:g4AnglesLinesShapes,id:'G4M_GM_001',domain:'Geometry',skill:'Angles, Lines, and Shape Classification',labels:['Level 1: Points, Lines, Rays, and Angles','Level 2: Measure and Draw Angles','Level 3: Parallel and Perpendicular Lines','Level 4: Classify Shapes and Symmetry','Mixed'],visuals:['angle_model','protractor_model','line_relationships','symmetry_model','shape_identification'],types:['multiple_choice','short_response','geometry_response'],tags:['angle_size_confusion','protractor_reading_error','parallel_perpendicular_confusion','symmetry_line_error']}
];

grade4FinalMeasurementGeometryPackages.forEach(({pkg,id,domain,skill,labels,visuals,types,tags})=>{
  assert.ok(pkg,`${id} package loads`);
  const questions=pkg.level_banks.flatMap((level)=>level.questions);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,4);
  assert.equal(pkg.subject,'Math');
  assert.equal(pkg.domain,domain);
  assert.equal(pkg.skill,skill);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(questions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(questions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(questions.filter((q)=>q.question_type==='short_response'||q.question_type==='geometry_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} constructed-response items have acceptable_answers`);
  assert.ok(questions.every((q)=>q.question_audio?.label==='Read Question'&&q.question_audio?.text),`${id} Skill Practice Center questions have Read Question narration`);
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${id} ${screen} has Read This Page narration`);
    assert.equal((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,true,`${id} ${screen} narration teaches the page`);
  }
  for (const screen of ['practice','challenge','checkpoint']) assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} mentions Read Question`);
  for (const q of [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])]) assert.equal(q.question_audio?.label,'Read Question',`${id} mission question has Read Question narration`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillState=Renderer.createState();
  drillState.mode='drill';
  const drillHtml=Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});

['measurement_conversion_table','angle_model','protractor_model','line_relationships','symmetry_model'].forEach((visual)=>{
  const pkg=visual==='measurement_conversion_table'?g4MeasurementConversionData:g4AnglesLinesShapes;
  const q=pkg.level_banks.flatMap((level)=>level.questions).find((item)=>item.visual_model===visual);
  assert.ok(q,`Grade 4 final batch includes ${visual}`);
  assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for final Grade 4 batch`);
});

const g4DivisionQuestions=g4DivisionRemainders.level_banks.flatMap((level)=>level.questions);
assert.match(VisualRegistry.render(g4DivisionQuestions.find((q)=>q.visual_model==='remainder_model')),/data-renderer="remainder_model"/,'remainder_model renderer output exists');
const g4FractionQuestions=[...g4FractionEquivalenceOrdering.level_banks.flatMap((level)=>level.questions),...g4AddSubtractFractions.level_banks.flatMap((level)=>level.questions),...g4MultiplyFractionsWholeNumbers.level_banks.flatMap((level)=>level.questions)];
const g4FractionBarHtml=VisualRegistry.render(g4FractionQuestions.find((q)=>q.visual_model==='fraction_bar'));
const g4FractionCircleHtml=VisualRegistry.render(g4FractionQuestions.find((q)=>q.visual_model==='fraction_circle'));
assert.match(g4FractionBarHtml,/data-renderer="fraction_bar"/,'fraction_bar renderer output exists for Grade 4');
assert.match(g4FractionBarHtml,/fraction-bar-cell/g,'fraction_bar renderer output includes partition markup');
assert.match(g4FractionBarHtml,/fraction-bar-cell[^>]+filled/,'fraction_bar renderer output includes shaded numerator parts');
assert.match(g4FractionCircleHtml,/data-renderer="fraction_circle"/,'fraction_circle renderer output exists for Grade 4');
assert.match(g4FractionCircleHtml,/fraction-circle-sector/g,'fraction_circle renderer output includes partition/sector markup');
assert.match(g4FractionCircleHtml,/fraction-circle-sector[^>]+filled|fraction-circle-sector filled/,'fraction_circle renderer output includes shaded numerator sectors');
assert.doesNotMatch(g4FractionBarHtml.trim(),/^\d{3,4}$/,'fraction_bar does not render raw placeholder strings like 123 or 1234');
assert.doesNotMatch(g4FractionCircleHtml.trim(),/^\d{3,4}$/,'fraction_circle does not render raw placeholder strings like 123 or 1234');
['fraction_bar','fraction_circle','number_line','comparison','equation_builder','word_problem_model','repeated_addition','multiplication_model'].forEach((visual)=>{
  const q=g4FractionQuestions.find((item)=>item.visual_model===visual);
  assert.ok(q,`Grade 4 fraction batch includes ${visual}`);
  assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists`);
});

const grade5OpsBaseTenDecimalPackages=[
  {id:'G5M_OA_001',domain:'Operations and Algebraic Thinking / Geometry',skill:'Expressions, Patterns, and the Coordinate Plane',labels:['Level 1: Write Numerical Expressions','Level 2: Evaluate Expressions','Level 3: Generate and Analyze Patterns','Level 4: Coordinate Plane Ordered Pairs','Mixed'],visuals:['expression_builder','pattern_table','coordinate_plane','ordered_pair_plot'],types:['multiple_choice','short_response','expression_response','coordinate_response'],tags:['operation_order_confusion','parentheses_confusion','pattern_rule_error','coordinate_order_reversal']},
  {id:'G5M_NBT_002',domain:'Number and Operations in Base Ten',skill:'Multi-Digit Whole Number Operations',labels:['Level 1: Multi-Digit Multiplication','Level 2: Partial Products and Area Models','Level 3: Multi-Digit Division','Level 4: Interpret Remainders','Mixed'],visuals:['algorithm_steps','partial_products_model','area_model','division_model','remainder_model'],types:['multiple_choice','short_response','multiplication_equation','division_equation'],tags:['digit_alignment_error','partial_products_confusion','quotient_place_value_error','remainder_interpretation_error']},
  {id:'G5M_NBT_003',domain:'Number and Operations in Base Ten',skill:'Decimal Operations',labels:['Level 1: Add and Subtract Decimals','Level 2: Multiply Decimals','Level 3: Divide Decimals','Level 4: Decimal Word Problems','Mixed'],visuals:['decimal_grid','place_value_chart','algorithm_steps','word_problem_model'],types:['multiple_choice','decimal_response','word_problem'],tags:['decimal_alignment_error','decimal_product_size_error','decimal_quotient_error','decimal_word_problem_error']}
].map((spec)=>({...spec,pkg:load(spec.id)}));

grade5OpsBaseTenDecimalPackages.forEach(({id,domain,skill,labels,visuals,types,tags,pkg})=>{
  const questions=pkg.level_banks.flatMap((level)=>level.questions);
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,5,`${id} is Grade 5`);
  assert.equal(pkg.subject,'Math',`${id} is Math`);
  assert.equal(pkg.domain,domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,skill,`${id} title matches plan`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(questions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(Schema.QUESTION_TYPES.includes(type),`schema accepts ${type}`));
  types.forEach((type)=>assert.ok(questions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(questions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} short-response items have acceptable_answers`);
  assert.ok(questions.every((q)=>q.question_audio?.label==='Read Question'&&q.question_audio?.text),`${id} Skill Practice Center questions have Read Question narration`);
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${id} ${screen} has Read This Page narration`);
    assert.ok((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} narration teaches the page`);
  }
  for (const screen of ['practice','challenge','checkpoint']) assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} mentions Read Question`);
  for (const q of [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])]) assert.equal(q.question_audio?.label,'Read Question',`${id} mission question has Read Question narration`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillState=Renderer.createState();
  drillState.mode='drill';
  assert.match(Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});
['expression_builder','coordinate_plane','ordered_pair_plot'].forEach((visual)=>{
  const question=grade5OpsBaseTenDecimalPackages.flatMap(({pkg})=>pkg.level_banks.flatMap((level)=>level.questions)).find((q)=>q.visual_model===visual);
  assert.ok(question,`Grade 5 batch includes ${visual}`);
  assert.match(VisualRegistry.render(question),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists`);
});
const decimalGridHtml=VisualRegistry.render(grade5OpsBaseTenDecimalPackages.find(({id})=>id==='G5M_NBT_003').pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='decimal_grid'));
assert.match(decimalGridHtml,/data-renderer="decimal_grid"/,'decimal_grid renderer output exists for Grade 5 decimal operations');
assert.match(decimalGridHtml,/decimal-grid-cell[^>]+shaded/,'decimal_grid renderer still outputs real shaded cells');

const grade5FractionPackages=[
  {id:'G5M_FR_001',domain:'Number and Operations—Fractions',skill:'Add and Subtract Fractions With Unlike Denominators',labels:['Level 1: Find Common Denominators','Level 2: Add Unlike Fractions','Level 3: Subtract Unlike Fractions','Level 4: Mixed Number Problems','Mixed'],visuals:['fraction_bar','fraction_circle','equation_builder','word_problem_model'],types:['multiple_choice','short_response','fraction_response','word_problem'],tags:['common_denominator_confusion','denominator_addition_error','mixed_number_regrouping_error','fraction_simplification_gap'],pkg:load('G5M_FR_001')},
  {id:'G5M_FR_002',domain:'Number and Operations—Fractions',skill:'Multiply Fractions',labels:['Level 1: Whole Number Times Fraction','Level 2: Fraction Times Fraction','Level 3: Area Models for Fraction Products','Level 4: Mixed Number Multiplication','Mixed'],visuals:['fraction_bar','fraction_area_model','multiplication_model','word_problem_model'],types:['multiple_choice','short_response','fraction_response','multiplication_equation'],tags:['fraction_product_size_error','numerator_denominator_multiply_error','mixed_number_conversion_error','area_model_fraction_confusion'],pkg:load('G5M_FR_002')},
  {id:'G5M_FR_003',domain:'Number and Operations—Fractions',skill:'Divide Unit Fractions and Whole Numbers',labels:['Level 1: Unit Fraction Divided by Whole Number','Level 2: Whole Number Divided by Unit Fraction','Level 3: Visual Fraction Division','Level 4: Fraction Division Word Problems','Mixed'],visuals:['fraction_bar','division_model','fraction_division_model','word_problem_model'],types:['multiple_choice','short_response','fraction_response','division_equation'],tags:['unit_fraction_division_confusion','whole_number_fraction_division_error','reciprocal_overgeneralization','fraction_division_context_error'],pkg:load('G5M_FR_003')}
];

grade5FractionPackages.forEach(({id,domain,skill,labels,visuals,types,tags,pkg})=>{
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,5,`${id} is Grade 5`);
  assert.equal(pkg.subject,'Math',`${id} is Math`);
  assert.equal(pkg.domain,domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,skill,`${id} title matches plan`);
  assert.deepEqual(Renderer.stepLabels(pkg),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],`${id} full Skill World flow exists`);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} short-response items have acceptable_answers`);
  ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const audio=pkg.page_audio?.[screen]; assert.ok(audio?.text,`${id} has Read This Page narration for ${screen}`); assert.equal(audio.label,'Read This Page',`${id} ${screen} uses Read This Page label`); assert.ok(audio.text.split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} has tutor-quality narration`);});
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillState=Renderer.createState(); drillState.mode='drill';
  assert.match(Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});

const fractionBarHtml=VisualRegistry.render({visual_model:'fraction_bar',numerator:3,denominator:5});
assert.match(fractionBarHtml,/data-renderer="fraction_bar"/,'fraction_bar renderer output exists');
assert.match(fractionBarHtml,/fraction-bar-cell/g,'fraction_bar includes real partition markup');
assert.match(fractionBarHtml,/fraction-bar-cell filled/,'fraction_bar includes shaded parts');
const fractionCircleHtml=VisualRegistry.render({visual_model:'fraction_circle',numerator:2,denominator:3});
assert.match(fractionCircleHtml,/data-renderer="fraction_circle"/,'fraction_circle renderer output exists');
assert.match(fractionCircleHtml,/fraction-circle-sector/g,'fraction_circle includes real partition markup');
assert.match(fractionCircleHtml,/fraction-circle-sector filled/,'fraction_circle includes shaded parts');
const fractionAreaHtml=VisualRegistry.render(grade5FractionPackages.find(({id})=>id==='G5M_FR_002').pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='fraction_area_model'));
assert.match(fractionAreaHtml,/data-renderer="fraction_area_model"/,'fraction_area_model renderer output exists');
assert.match(fractionAreaHtml,/fraction-area-cell/g,'fraction_area_model includes grid partition markup');
assert.match(fractionAreaHtml,/overlap/,'fraction_area_model shows overlapping product parts');
const fractionDivisionHtml=VisualRegistry.render(grade5FractionPackages.find(({id})=>id==='G5M_FR_003').pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='fraction_division_model'));
assert.match(fractionDivisionHtml,/data-renderer="fraction_division_model"/,'fraction_division_model renderer output exists');
assert.match(fractionDivisionHtml,/fraction-division-(cell|piece)/,'fraction_division_model includes real partition markup');
assert.match(fractionDivisionHtml,/quotient-share|unit-fraction pieces/,'fraction_division_model shows unit fraction division visually');
[fractionBarHtml,fractionCircleHtml,fractionAreaHtml,fractionDivisionHtml].forEach((html)=>{
  assert.doesNotMatch(html,/>\s*1234?\s*</,'fraction visual does not render raw placeholder strings like 123 or 1234');
  assert.doesNotMatch(html,/placeholder|coming soon/i,'fraction visual does not render placeholder text');
});
['G5M_FR_001','G5M_FR_002','G5M_FR_003'].forEach((id)=>{
  assert.ok(g5Manifest.packages.includes(`${id}.skill-package.v1.json`),`manifest includes ${id}`);
  assert.equal(`/skill-world/${encodeURIComponent(id)}/drill`,`/skill-world/${id}/drill`,`Practice This Skill route exists for ${id}`);
});

const grade5MeasurementGeometryPackages=[
  {id:'G5M_MD_001',domain:'Measurement and Data',skill:'Measurement Conversion, Volume, and Data',labels:['Level 1: Measurement Conversions','Level 2: Volume as Unit Cubes','Level 3: Volume Formulas','Level 4: Line Plots With Fractions','Mixed'],visuals:['measurement_conversion_table','volume_model','rectangular_prism_model','line_plot'],types:['multiple_choice','short_response','measurement','data_interpretation','volume_response'],tags:['unit_conversion_direction_error','volume_area_confusion','cube_unit_count_error','line_plot_fraction_error'],pkg:load('G5M_MD_001')},
  {id:'G5M_GM_001',domain:'Geometry',skill:'Coordinate Plane and Graphing',labels:['Level 1: Coordinate Plane Basics','Level 2: Ordered Pairs','Level 3: Graph Points','Level 4: Interpret Coordinate Patterns','Mixed'],visuals:['coordinate_plane','ordered_pair_plot','pattern_table','graph_interpretation'],types:['multiple_choice','short_response','coordinate_response'],tags:['coordinate_order_reversal','axis_confusion','origin_confusion','graph_pattern_error'],pkg:load('G5M_GM_001')},
  {id:'G5M_GM_002',domain:'Geometry',skill:'Classify Two-Dimensional Figures',labels:['Level 1: Polygons and Attributes','Level 2: Triangles','Level 3: Quadrilaterals','Level 4: Hierarchies of Shapes','Mixed'],visuals:['shape_identification','attribute_sort','hierarchy_diagram','geometry_card_sort'],types:['multiple_choice','short_response','sorting','geometry_response'],tags:['attribute_overgeneralization','triangle_classification_error','quadrilateral_hierarchy_confusion','shape_property_confusion'],pkg:load('G5M_GM_002')}
];

grade5MeasurementGeometryPackages.forEach(({id,domain,skill,labels,visuals,types,tags,pkg})=>{
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,5,`${id} is Grade 5`);
  assert.equal(pkg.subject,'Math',`${id} is Math`);
  assert.equal(pkg.domain,domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,skill,`${id} title matches plan`);
  assert.deepEqual(Renderer.stepLabels(pkg),['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],`${id} full Skill World flow exists`);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(Schema.QUESTION_TYPES.includes(type),`schema accepts ${type}`));
  types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q)=>q.question_type==='short_response'||q.question_type==='geometry_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} constructed-response items have acceptable_answers`);
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${id} ${screen} has Read This Page narration`);
    assert.ok((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} narration teaches the page`);
  }
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillState=Renderer.createState(); drillState.mode='drill';
  assert.match(Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});

['volume_model','rectangular_prism_model','graph_interpretation','hierarchy_diagram','geometry_card_sort'].forEach((visual)=>{
  const question=grade5MeasurementGeometryPackages.flatMap(({pkg})=>pkg.level_banks.flatMap((level)=>level.questions)).find((q)=>q.visual_model===visual);
  assert.ok(question,`Grade 5 measurement/geometry batch includes ${visual}`);
  const html=VisualRegistry.render(question);
  assert.match(html,new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists`);
  assert.doesNotMatch(html.trim(),/^[A-Za-z_ ]+$/ ,`${visual} does not render placeholder text only`);
});
const volumeHtml=VisualRegistry.render(grade5MeasurementGeometryPackages[0].pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='volume_model'));
assert.match(volumeHtml,/unit-cube/,'volume_model shows unit cubes');
const prismHtml=VisualRegistry.render(grade5MeasurementGeometryPackages[0].pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='rectangular_prism_model'));
assert.match(prismHtml,/length/,'rectangular_prism_model labels length');
assert.match(prismHtml,/width/,'rectangular_prism_model labels width');
assert.match(prismHtml,/height/,'rectangular_prism_model labels height');
const linePlotFractionHtml=VisualRegistry.render(grade5MeasurementGeometryPackages[0].pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='line_plot'));
assert.match(linePlotFractionHtml,/data-renderer="line_plot"/,'line_plot renderer output exists');
assert.match(linePlotFractionHtml,/1\/2|1 1\/4|line-plot-marks/,'line_plot renders fractional data visually');
const coordinateHtml=VisualRegistry.render(grade5MeasurementGeometryPackages[1].pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='coordinate_plane'));
assert.match(coordinateHtml,/coordinate-plane-grid/,'coordinate_plane renders a grid');
assert.match(coordinateHtml,/x-axis-name/,'coordinate_plane renders x-axis label');
assert.match(coordinateHtml,/y-axis-name/,'coordinate_plane renders y-axis label');
assert.match(coordinateHtml,/coordinate-point/,'coordinate_plane renders plotted points');
const graphHtml=VisualRegistry.render(grade5MeasurementGeometryPackages[1].pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='graph_interpretation'));
assert.match(graphHtml,/graph-canvas/,'graph_interpretation shows an actual graph');
assert.match(graphHtml,/sw-pattern-table/,'graph_interpretation shows table relationship');
const hierarchyHtml=VisualRegistry.render(grade5MeasurementGeometryPackages[2].pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='hierarchy_diagram'));
assert.match(hierarchyHtml,/hierarchy-node/,'hierarchy_diagram shows nested shape categories');
const cardSortHtml=VisualRegistry.render(grade5MeasurementGeometryPackages[2].pkg.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='geometry_card_sort'));
assert.match(cardSortHtml,/geometry-sort-card/,'geometry_card_sort shows visual classification cards');
const manifestForGrade5Final=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
['G5M_MD_001.skill-package.v1.json','G5M_GM_001.skill-package.v1.json','G5M_GM_002.skill-package.v1.json'].forEach((file)=>assert.ok(manifestForGrade5Final.packages.includes(file),`manifest includes ${file}`));

const grade6RatiosRates=load('G6M_RP_001');
{
  const id='G6M_RP_001';
  const pkg=grade6RatiosRates;
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,'G6M_RP_001 validates in strict production mode');
  assert.equal(pkg.grade,6,'G6M_RP_001 is Grade 6');
  assert.equal(pkg.subject,'Math','G6M_RP_001 is Math');
  assert.equal(pkg.domain,'Ratios and Proportional Relationships','G6M_RP_001 domain matches plan');
  assert.equal(pkg.skill,'Ratios and Unit Rates','G6M_RP_001 title matches plan');
  assert.deepEqual(Renderer.renderSkillWorld(pkg,{failClosed:true}).steps,['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'G6M_RP_001 mission renders full Skill World flow');
  assert.equal(Array.isArray(pkg.level_banks),true,'G6M_RP_001 has real level_banks');
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G6M_RP_001 has at least four focused levels');
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G6M_RP_001 has Mixed level');
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  ['Level 1: Ratio Language','Level 2: Equivalent Ratios','Level 3: Ratio Tables','Level 4: Unit Rates','Mixed'].forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`G6M_RP_001 includes ${label}`));
  ['ratio_table','double_number_line','tape_diagram','unit_rate_card'].forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  ['ratio_table','double_number_line','tape_diagram','unit_rate_card'].forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`G6M_RP_001 includes ${visual}`));
  ['multiple_choice','short_response','ratio_response','rate_response'].forEach((type)=>assert.ok(Schema.QUESTION_TYPES.includes(type),`schema accepts ${type}`));
  ['multiple_choice','short_response','ratio_response','rate_response'].forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`G6M_RP_001 includes ${type}`));
  ['ratio_order_reversal','part_part_whole_confusion','equivalent_ratio_error','unit_rate_confusion'].forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`G6M_RP_001 includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q)=>['short_response','ratio_response','rate_response'].includes(q.question_type)).every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G6M_RP_001 ratio/rate constructed-response items have acceptable_answers');
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`G6M_RP_001 ${screen} has Read This Page narration`);
    assert.ok((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`G6M_RP_001 ${screen} narration teaches the page`);
  }
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`G6M_RP_001 ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`G6M_RP_001 full mission flow renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,'G6M_RP_001 profile links to Skill Practice Center');
  const drillState=Renderer.createState(); drillState.mode='drill';
  assert.match(Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html,/Skill Practice Center/,'G6M_RP_001 Practice This Skill route renders Skill Practice Center');
  ['ratio_table','double_number_line','tape_diagram','unit_rate_card'].forEach((visual)=>{
    const question=allQuestions.find((q)=>q.visual_model===visual);
    const html=VisualRegistry.render(question);
    assert.match(html,new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists`);
    assert.doesNotMatch(html,/placeholder|coming soon/i,`${visual} renderer is not placeholder-only`);
  });
  assert.match(VisualRegistry.render(allQuestions.find((q)=>q.visual_model==='ratio_table')),/sw-ratio-table/,'ratio_table shows a real table');
  assert.match(VisualRegistry.render(allQuestions.find((q)=>q.visual_model==='double_number_line')),/double-number-tick/,'double_number_line shows paired scales');
  assert.match(VisualRegistry.render(allQuestions.find((q)=>q.visual_model==='tape_diagram')),/tape-part/,'tape_diagram shows related parts');
  assert.match(VisualRegistry.render(allQuestions.find((q)=>q.visual_model==='unit_rate_card')),/per <strong>1<\/strong>/,'unit_rate_card shows per 1 clearly');
  const manifestForGrade6=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
  assert.ok(manifestForGrade6.packages.includes('G6M_RP_001.skill-package.v1.json'),'manifest includes G6M_RP_001');
}

const grade6NumberSystemPackages = [
  {id:'G6M_NS_001',domain:'The Number System',skill:'Dividing Fractions',labels:['Level 1: Fraction Division Meaning','Level 2: Visual Fraction Division','Level 3: Divide Fractions by Fractions','Level 4: Fraction Division Word Problems','Mixed'],visuals:['fraction_bar','fraction_division_model','number_line','word_problem_model'],types:['multiple_choice','short_response','fraction_response','division_equation'],tags:['divisor_dividend_confusion','reciprocal_misuse','fraction_division_context_error','quotient_size_confusion'],pkg:load('G6M_NS_001')},
  {id:'G6M_NS_002',domain:'The Number System',skill:'Multi-Digit Decimal Operations',labels:['Level 1: Add and Subtract Decimals','Level 2: Multiply Decimals','Level 3: Divide Decimals','Level 4: Decimal Operation Word Problems','Mixed'],visuals:['decimal_grid','place_value_chart','algorithm_steps','estimation_number_line'],types:['multiple_choice','short_response','decimal_response','word_problem'],tags:['decimal_alignment_error','decimal_product_size_error','decimal_quotient_error','operation_choice_error'],pkg:load('G6M_NS_002')},
  {id:'G6M_NS_003',domain:'The Number System',skill:'Integers and the Number Line',labels:['Level 1: Positive and Negative Numbers','Level 2: Opposites and Absolute Value','Level 3: Compare Integers','Level 4: Coordinate Plane With Integers','Mixed'],visuals:['integer_number_line','absolute_value_model','coordinate_plane','comparison_model'],types:['multiple_choice','short_response','integer_response','comparison'],tags:['negative_number_order_error','absolute_value_confusion','opposite_number_confusion','coordinate_sign_error'],pkg:load('G6M_NS_003')}
];

grade6NumberSystemPackages.forEach(({id,domain,skill,labels,visuals,types,tags,pkg})=>{
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,6,`${id} is Grade 6`);
  assert.equal(pkg.subject,'Math',`${id} is Math`);
  assert.equal(pkg.domain,domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,skill,`${id} title matches plan`);
  const mission=Renderer.renderSkillWorld(pkg,{failClosed:true});
  assert.deepEqual(mission.steps,['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],`${id} full mission flow renders`);
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(mission.html,new RegExp(label),`${id} renders ${label}`));
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(Schema.QUESTION_TYPES.includes(type),`schema accepts ${type}`));
  types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q)=>q.question_type!=='multiple_choice').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} constructed-response items have acceptable_answers`);
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${id} ${screen} has Read This Page narration`);
    assert.ok((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} narration teaches the page`);
  }
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  const drillState=Renderer.createState(); drillState.mode='drill';
  assert.match(Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});

const grade6NsManifest=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
['G6M_NS_001.skill-package.v1.json','G6M_NS_002.skill-package.v1.json','G6M_NS_003.skill-package.v1.json'].forEach((file)=>assert.ok(grade6NsManifest.packages.includes(file),`manifest includes ${file}`));
const grade6NsQuestions=grade6NumberSystemPackages.flatMap(({pkg})=>[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])]);
const grade6NsFractionDivisionHtml=VisualRegistry.render(grade6NsQuestions.find((q)=>q.visual_model==='fraction_division_model'));
assert.match(grade6NsFractionDivisionHtml,/data-renderer="fraction_division_model"/,'fraction_division_model renderer output exists');
assert.match(grade6NsFractionDivisionHtml,/fraction-division-cell/,'fraction_division_model renders real partitioning cells');
const grade6NsDecimalGridHtml=VisualRegistry.render(grade6NsQuestions.find((q)=>q.visual_model==='decimal_grid'));
assert.match(grade6NsDecimalGridHtml,/data-renderer="decimal_grid"/,'decimal_grid renderer output exists');
assert.match(grade6NsDecimalGridHtml,/decimal-grid-cell shaded/,'decimal_grid renderer output includes real shaded cells');
const grade6NsIntegerNumberLineHtml=VisualRegistry.render(grade6NsQuestions.find((q)=>q.visual_model==='integer_number_line'));
assert.match(grade6NsIntegerNumberLineHtml,/data-renderer="integer_number_line"/,'integer_number_line renderer output exists');
assert.match(grade6NsIntegerNumberLineHtml,/>-\d+</,'integer_number_line shows negative numbers');
assert.match(grade6NsIntegerNumberLineHtml,/>0</,'integer_number_line shows zero');
assert.match(grade6NsIntegerNumberLineHtml,/>\d+</,'integer_number_line shows positive numbers');
const grade6NsAbsoluteValueHtml=VisualRegistry.render(grade6NsQuestions.find((q)=>q.visual_model==='absolute_value_model'));
assert.match(grade6NsAbsoluteValueHtml,/data-renderer="absolute_value_model"/,'absolute_value_model renderer output exists');
assert.match(grade6NsAbsoluteValueHtml,/abs-distance/,'absolute_value_model shows distance from zero');
const negativeCoordinateHtml=VisualRegistry.render(grade6NsQuestions.find((q)=>q.visual_model==='coordinate_plane'&&JSON.stringify(q).includes('-')));
assert.match(negativeCoordinateHtml,/data-renderer="coordinate_plane"/,'coordinate_plane renderer output exists');
assert.match(negativeCoordinateHtml,/coordinate-plane-four-quadrant/,'coordinate_plane can render negative coordinates');
assert.match(negativeCoordinateHtml,/-[1-9]/,'coordinate_plane includes negative axis labels or point labels');
const integerComparisonHtml=VisualRegistry.render(grade6NsQuestions.find((q)=>q.visual_model==='comparison_model'));
assert.match(integerComparisonHtml,/integer-comparison-visual/,'comparison visuals handle negative integers');

const grade6ExpressionsEquationsPackages = [
  {id:'G6M_EE_001',domain:'Expressions and Equations',skill:'Expressions and Exponents',labels:['Level 1: Numerical Expressions','Level 2: Exponents','Level 3: Variables and Substitution','Level 4: Order of Operations','Mixed'],visuals:['expression_builder','exponent_model','variable_tile','order_of_operations_steps'],types:['multiple_choice','short_response','expression_response'],tags:['exponent_multiplication_confusion','variable_meaning_confusion','operation_order_confusion','substitution_error'],pkg:load('G6M_EE_001')},
  {id:'G6M_EE_002',domain:'Expressions and Equations',skill:'Equations and Inequalities',labels:['Level 1: One-Step Addition/Subtraction Equations','Level 2: One-Step Multiplication/Division Equations','Level 3: Inequalities','Level 4: Represent Solutions','Mixed'],visuals:['balance_scale','equation_builder','inequality_number_line','solution_set_model'],types:['multiple_choice','short_response','equation_response','inequality_response'],tags:['inverse_operation_error','equality_balance_confusion','inequality_symbol_reversal','solution_set_confusion'],pkg:load('G6M_EE_002')},
  {id:'G6M_EE_003',domain:'Expressions and Equations',skill:'Dependent and Independent Variables',labels:['Level 1: Identify Variables','Level 2: Tables and Rules','Level 3: Graph Relationships','Level 4: Match Equation/Table/Graph','Mixed'],visuals:['pattern_table','coordinate_plane','graph_interpretation','equation_table_match'],types:['multiple_choice','short_response','coordinate_response','expression_response'],tags:['independent_dependent_confusion','graph_table_mismatch','equation_rule_error','input_output_reversal'],pkg:load('G6M_EE_003')}
];

grade6ExpressionsEquationsPackages.forEach(({id,domain,skill,labels,visuals,types,tags,pkg})=>{
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,6,`${id} is Grade 6`);
  assert.equal(pkg.subject,'Math',`${id} is Math`);
  assert.equal(pkg.domain,domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,skill,`${id} title matches plan`);
  const mission=Renderer.renderSkillWorld(pkg,{failClosed:true});
  assert.deepEqual(mission.steps,['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],`${id} full mission flow renders`);
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(mission.html,new RegExp(label),`${id} renders ${label}`));
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(Schema.QUESTION_TYPES.includes(type),`schema accepts ${type}`));
  types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q)=>q.question_type!=='multiple_choice').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} constructed-response items have acceptable_answers`);
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${id} ${screen} has Read This Page narration`);
    assert.ok((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} narration teaches the page`);
  }
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  assert.match(mission.html,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillState=Renderer.createState(); drillState.mode='drill';
  assert.match(Renderer.renderSkillWorld(pkg,{state:drillState,mode:'drill',failClosed:true}).html,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});

const grade6EeManifest=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
['G6M_EE_001.skill-package.v1.json','G6M_EE_002.skill-package.v1.json','G6M_EE_003.skill-package.v1.json'].forEach((file)=>assert.ok(grade6EeManifest.packages.includes(file),`manifest includes ${file}`));
const grade6EeQuestions=grade6ExpressionsEquationsPackages.flatMap(({pkg})=>[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])]);
['exponent_model','variable_tile','order_of_operations_steps','balance_scale','inequality_number_line','solution_set_model','equation_table_match'].forEach((visual)=>{
  const question=grade6EeQuestions.find((q)=>q.visual_model===visual);
  assert.ok(question,`Grade 6 Expressions and Equations batch includes ${visual}`);
  const html=VisualRegistry.render(question);
  assert.match(html,new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists`);
  assert.doesNotMatch(html,/placeholder|coming soon/i,`${visual} renderer is not placeholder-only`);
});
assert.match(VisualRegistry.render(grade6EeQuestions.find((q)=>q.visual_model==='exponent_model')),/exponent-factor/,'exponent_model shows repeated factors clearly');
assert.match(VisualRegistry.render(grade6EeQuestions.find((q)=>q.visual_model==='variable_tile')),/variable-card[\s\S]*value-card/,'variable_tile shows variable and substitution value clearly');
assert.match(VisualRegistry.render(grade6EeQuestions.find((q)=>q.visual_model==='order_of_operations_steps')),/order-step/,'order_of_operations_steps shows ordered steps');
assert.match(VisualRegistry.render(grade6EeQuestions.find((q)=>q.visual_model==='balance_scale')),/scale-pan[\s\S]*scale-pan/,'balance_scale shows both sides of an equation');
const inequalityHtml=VisualRegistry.render(grade6EeQuestions.find((q)=>q.visual_model==='inequality_number_line'));
assert.match(inequalityHtml,/ineq-circle (open|closed)/,'inequality_number_line shows open or closed circle');
assert.match(inequalityHtml,/ineq-ray (left|right)/,'inequality_number_line shows arrow direction');
assert.match(VisualRegistry.render(grade6EeQuestions.find((q)=>q.visual_model==='solution_set_model')),/solution-chip valid/,'solution_set_model shows valid solutions clearly');
assert.match(VisualRegistry.render(grade6EeQuestions.find((q)=>q.visual_model==='equation_table_match')),/equation-strip[\s\S]*sw-pattern-table[\s\S]*graph-canvas/,'equation_table_match shows equation, table, and graph relationship');

const grade6FinalMathPackages = [
  {id:'G6M_GM_001',domain:'Geometry',skill:'Area, Surface Area, and Volume',labels:['Level 1: Area of Triangles and Quadrilaterals','Level 2: Area of Polygons','Level 3: Surface Area With Nets','Level 4: Volume of Rectangular Prisms','Mixed'],visuals:['area_model','polygon_area_model','net_model','rectangular_prism_model','volume_model'],types:['multiple_choice','short_response','geometry_response','volume_response'],tags:['triangle_area_halving_error','polygon_decomposition_error','surface_area_net_error','volume_area_confusion'],pkg:load('G6M_GM_001')},
  {id:'G6M_SP_001',domain:'Statistics and Probability',skill:'Statistical Questions and Data Displays',labels:['Level 1: Statistical Questions','Level 2: Dot Plots and Histograms','Level 3: Mean, Median, Mode, and Range','Level 4: Box Plots and Distribution Shape','Mixed'],visuals:['dot_plot','histogram','box_plot','data_table','statistics_summary'],types:['multiple_choice','short_response','data_interpretation','statistics_response'],tags:['non_statistical_question_confusion','mean_median_confusion','range_error','box_plot_reading_error'],pkg:load('G6M_SP_001')},
  {id:'G6M_SP_002',domain:'Statistics and Probability',skill:'Summarize and Interpret Data',labels:['Level 1: Describe Center and Spread','Level 2: Clusters, Peaks, Gaps, and Outliers','Level 3: Compare Data Sets','Level 4: Interpret Data in Context','Mixed'],visuals:['dot_plot','histogram','box_plot','data_comparison_panel','statistics_summary'],types:['multiple_choice','short_response','data_interpretation','statistics_response'],tags:['center_vs_spread_confusion','outlier_effect_confusion','distribution_shape_error','context_interpretation_gap'],pkg:load('G6M_SP_002')}
];

grade6FinalMathPackages.forEach(({id,domain,skill,labels,visuals,types,tags,pkg})=>{
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  const validation=Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false});
  assert.equal(validation.valid,true,`${id} validates in strict production mode: ${validation.errors.join('; ')}`);
  assert.equal(pkg.grade,6,`${id} is Grade 6`);
  assert.equal(pkg.subject,'Math',`${id} is Math`);
  assert.equal(pkg.domain,domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,skill,`${id} skill matches plan`);
  assert.deepEqual(Renderer.renderSkillWorld(pkg,{failClosed:true}).steps,['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],`${id} mission renders full Skill World flow`);
  assert.equal(Array.isArray(pkg.level_banks),true,`${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10–12 questions`));
  labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  visuals.forEach((visual)=>assert.ok(Schema.VISUAL_MODELS.includes(visual),`schema accepts ${visual}`));
  visuals.forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  types.forEach((type)=>assert.ok(Schema.QUESTION_TYPES.includes(type),`schema accepts ${type}`));
  types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  allQuestions.filter((q)=>['short_response','geometry_response','volume_response','statistics_response','data_interpretation'].includes(q.question_type)).forEach((q)=>assert.ok(Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0,`${q.question_id} acceptable_answers exist`));
  for (const screen of ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile']) {
    assert.equal(pkg.page_audio?.[screen]?.label,'Read This Page',`${id} ${screen} has Read This Page narration`);
    assert.ok((pkg.page_audio?.[screen]?.text||'').split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} narration teaches the page`);
  }
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Mini Lesson','Worked Example / Watch','Guided Demo','Practice zone','Challenge zone','Checkpoint zone','Badge','Growth/Profile screen'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  assert.match(Renderer.renderSkillWorld(pkg,{mode:'drill',failClosed:true}).html,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
});

const grade6FinalManifest=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
['G6M_GM_001.skill-package.v1.json','G6M_SP_001.skill-package.v1.json','G6M_SP_002.skill-package.v1.json'].forEach((file)=>assert.ok(grade6FinalManifest.packages.includes(file),`manifest includes ${file}`));
const grade6FinalQuestions=grade6FinalMathPackages.flatMap(({pkg})=>[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])]);
['polygon_area_model','net_model','dot_plot','histogram','box_plot','statistics_summary','data_comparison_panel'].forEach((visual)=>{
  const question=grade6FinalQuestions.find((q)=>q.visual_model===visual);
  assert.ok(question,`${visual} has a fixture question`);
  const html=VisualRegistry.render(question);
  assert.match(html,new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists`);
  assert.doesNotMatch(html,/placeholder|coming soon|missing visual/i,`${visual} does not render placeholder-only text`);
});
assert.match(VisualRegistry.render(grade6FinalQuestions.find((q)=>q.visual_model==='polygon_area_model')),/polygon-part[\s\S]*(base|height)/,'polygon_area_model shows decomposed shapes or labeled base/height');
assert.match(VisualRegistry.render(grade6FinalQuestions.find((q)=>q.visual_model==='net_model')),/net-face[\s\S]*face-5/,'net_model shows a real unfolded net with faces');
assert.match(VisualRegistry.render(grade6FinalQuestions.find((q)=>q.visual_model==='dot_plot')),/dot-stack[\s\S]*class="dot"/,'dot_plot shows dots over values');
assert.match(VisualRegistry.render(grade6FinalQuestions.find((q)=>q.visual_model==='histogram')),/histogram-bar/,'histogram shows interval bars');
assert.match(VisualRegistry.render(grade6FinalQuestions.find((q)=>q.visual_model==='box_plot')),/min[\s\S]*Q1[\s\S]*median[\s\S]*Q3[\s\S]*max/,'box_plot shows min, quartiles, median, and max');
assert.match(VisualRegistry.render(grade6FinalQuestions.find((q)=>q.visual_model==='statistics_summary')),/stat-card[\s\S]*(median|range|mean)/,'statistics_summary shows center/spread values clearly');
assert.match(VisualRegistry.render(grade6FinalQuestions.find((q)=>q.visual_model==='data_comparison_panel')),/comparison-side[\s\S]*comparison-side/,'data_comparison_panel compares two data displays visually');


const g5EnglishBatch1Specs=[
  {id:'G5E_RC_002',pkg:g5StoryStructure,domain:'Reading Literature',skill:'Theme, Character, and Story Structure',labels:['Level 1: Characters and Settings','Level 2: Plot and Story Structure','Level 3: Theme and Character Response','Level 4: Point of View and Comparison','Mixed'],visuals:['story_map','character_trait_chart','event_cards','theme_tracker'],types:['multiple_choice','short_response','sequencing','text_evidence'],tags:['character_trait_confusion','theme_detail_confusion','point_of_view_confusion','story_structure_confusion']},
  {id:'G5E_RC_003',pkg:g5InformationalIntegration,domain:'Reading Informational Text',skill:'Main Idea, Text Structure, and Integrating Information',labels:['Level 1: Main Idea and Summary','Level 2: Key Details and Evidence','Level 3: Text Structure and Features','Level 4: Integrate Information','Mixed'],visuals:['short_passage','main_idea_web','detail_cards','text_feature_map','text_structure_chart','compare_texts_panel'],types:['multiple_choice','short_response','text_evidence','detail_match'],tags:['topic_main_idea_confusion','summary_too_detailed','text_structure_confusion','integration_error']},
  {id:'G5E_WR_001',pkg:g5OpinionWriting,domain:'Writing / Composition',skill:'Opinion Writing With Reasons and Evidence',labels:['Level 1: State an Opinion','Level 2: Support With Reasons and Evidence','Level 3: Linking Words and Conclusion','Level 4: Build Opinion Essay','Mixed'],visuals:['opinion_reason_chart','paragraph_builder','writing_checklist','sentence_builder'],types:['multiple_choice','short_response','writing_response','sentence_completion'],tags:['missing_opinion','weak_reason','missing_evidence','missing_conclusion']}
];
const g5EnglishBatch1Manifest=JSON.parse(fs.readFileSync(path.join(root,'public/gamehub/skill-world/content/manifest.json'),'utf8'));
for (const spec of g5EnglishBatch1Specs) {
  const {id,pkg}=spec;
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  const validation=Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false});
  assert.equal(validation.valid,true,`${id} validates in strict production mode: ${validation.errors.join('; ')}`);
  assert.equal(pkg.grade,5,`${id} is Grade 5`);
  assert.equal(pkg.subject,'English',`${id} is English`);
  assert.equal(pkg.domain,spec.domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,spec.skill,`${id} skill title matches plan`);
  assert.ok(g5EnglishBatch1Manifest.packages.includes(`${id}.skill-package.v1.json`),`manifest includes ${id}`);
  assert.equal(pkg.level_banks.length,5,`${id} has five real level banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10–12 questions`));
  spec.labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  spec.visuals.forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  spec.types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  spec.tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q)=>['short_response','text_evidence','sequencing','detail_match','writing_response','sentence_completion'].includes(q.question_type)).every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} constructed-response items have acceptable_answers`);
  ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const narration=pkg.page_audio?.[screen]; assert.ok(narration?.text,`${id} has Read This Page narration for ${screen}`); assert.equal(narration.label,'Read This Page',`${id} ${screen} uses Read This Page label`); assert.ok(narration.text.split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} narration teaches`);});
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  assert.ok(allQuestions.every((q)=>q.audio?.label==='Listen'&&q.audio?.text&&q.audio?.browser_speech_fallback===true),`${id} Listen audio exists with browser speech fallback`);
  if (id==='G5E_WR_001') {
    const writingQuestions=allQuestions.filter((q)=>['short_response','sentence_completion','writing_response'].includes(q.question_type));
    assert.ok(writingQuestions.every((q)=>Array.isArray(q.validation_checks)&&q.validation_checks.includes('opinion present')&&q.validation_checks.includes('complete sentences')),`${id} writing validation checks exist`);
    assert.ok(writingQuestions.every((q)=>q.writing_validation?.sample_answer&&q.writing_validation?.do_not_over_penalize===true),`${id} has child-friendly writing validation`);
  }
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Read This Page/,`${id} renders Read This Page controls`);
  assert.match(missionHtml,/Read Question/,`${id} renders Read Question controls`);
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillHtml=Renderer.renderSkillWorld(pkg,{mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
  assert.match(drillHtml,new RegExp(spec.labels[0]),`${id} drill renders first focused level`);
}

const g5EnglishFinalSpecs=[
  {id:'G5E_WR_002',pkg:g5InformativeWriting,domain:'Writing / Composition',skill:'Informative Writing With Facts, Definitions, and Details',labels:['Level 1: Choose and Introduce a Topic','Level 2: Add Facts, Definitions, and Details','Level 3: Organize With Linking Words and Formatting','Level 4: Build an Informative Essay','Mixed'],visuals:['topic_detail_chart','fact_cards','paragraph_builder','writing_checklist'],types:['multiple_choice','short_response','writing_response','sentence_completion'],tags:['missing_topic','unsupported_fact','missing_detail','weak_organization'],validation:['topic present','facts present','definitions or explanations present','supporting details present','linking words present','logical organization','conclusion present','capitalization','punctuation','complete sentences'],validationKey:'writing_validation'},
  {id:'G5E_WR_003',pkg:g5NarrativeWriting,domain:'Writing / Composition',skill:'Narrative Writing With Dialogue, Description, and Pacing',labels:['Level 1: Sequence Events','Level 2: Add Description and Pacing','Level 3: Dialogue and Transitions','Level 4: Build a Narrative','Mixed'],visuals:['story_sequence','event_cards','paragraph_builder','dialogue_builder'],types:['multiple_choice','short_response','writing_response','sequencing'],tags:['event_order_error','missing_description','dialogue_punctuation_error','pacing_gap'],validation:['clear event sequence','setting or situation present','characters present where appropriate','description present','dialogue punctuation when applicable','transitions or temporal words present','pacing support','closure present','capitalization','punctuation','complete sentences'],validationKey:'writing_validation'},
  {id:'G5E_LANG_001',pkg:g5LanguageConventions,domain:'Language',skill:'Grammar, Conventions, and Sentence Combining',labels:['Level 1: Capitalization, Punctuation, and Spelling','Level 2: Commas and Quotation Marks','Level 3: Grammar and Verb Tense','Level 4: Sentence Combining and Style','Mixed'],visuals:['sentence_builder','punctuation_marker','grammar_highlight','sentence_combiner'],types:['multiple_choice','short_response','sentence_completion','editing'],tags:['punctuation_error','verb_tense_error','comma_usage_error','sentence_fragment'],validation:['capitalization','ending punctuation','comma usage','quotation marks','verb tense consistency','complete sentence','fragment detection','sentence combining','conjunction usage','preposition usage'],validationKey:'grammar_validation'}
];
for (const spec of g5EnglishFinalSpecs) {
  const {id,pkg}=spec;
  const allQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[]),...(pkg.level_banks||[]).flatMap((level)=>level.questions||[])];
  const validation=Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false});
  assert.equal(validation.valid,true,`${id} validates in strict production mode: ${validation.errors.join('; ')}`);
  assert.equal(pkg.grade,5,`${id} is Grade 5`);
  assert.equal(pkg.subject,'English',`${id} is English`);
  assert.equal(pkg.domain,spec.domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,spec.skill,`${id} skill title matches plan`);
  assert.ok(g5EnglishBatch1Manifest.packages.includes(`${id}.skill-package.v1.json`),`manifest includes ${id}`);
  assert.equal(pkg.level_banks.length,5,`${id} has five real level banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${id} ${level.level_id} has 10–12 questions`));
  spec.labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  spec.visuals.forEach((visual)=>{assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`); assert.match(VisualRegistry.render(allQuestions.find((q)=>q.visual_model===visual)),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for ${id}`);});
  spec.types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  spec.tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag],`${id} includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q)=>['short_response','sequencing','writing_response','sentence_completion','editing'].includes(q.question_type)).every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} constructed-response items have acceptable_answers`);
  ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const narration=pkg.page_audio?.[screen]; assert.ok(narration?.text,`${id} has Read This Page narration for ${screen}`); assert.equal(narration.label,'Read This Page',`${id} ${screen} uses Read This Page label`); assert.ok(narration.text.split(/[.!?]+/).filter((sentence)=>sentence.trim()).length>=3,`${id} ${screen} narration teaches`);});
  ['practice','challenge','checkpoint'].forEach((screen)=>assert.match(pkg.page_audio[screen].text,/Read Question/,`${id} ${screen} references Read Question`));
  [...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} Skill Practice question has Read Question narration`));
  assert.ok(allQuestions.every((q)=>q.audio?.label==='Listen'&&q.audio?.text&&q.audio?.playback_preference==='cached_audio_first'&&q.audio?.browser_speech_fallback===true),`${id} Listen audio exists with cached AI audio and browser speech fallback`);
  const constructed=allQuestions.filter((q)=>['short_response','sequencing','writing_response','sentence_completion','editing'].includes(q.question_type));
  assert.ok(constructed.every((q)=>Array.isArray(q.validation_checks)&&spec.validation.every((check)=>q.validation_checks.includes(check))),`${id} validation checks exist`);
  assert.ok(constructed.every((q)=>q[spec.validationKey]?.sample_answer&&Array.isArray(q[spec.validationKey]?.acceptable_sample_answers)&&q[spec.validationKey]?.do_not_over_penalize===true),`${id} acceptable sample answers and child-friendly validation exist`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} full mission flow renders ${label}`));
  assert.match(missionHtml,/Read This Page/,`${id} renders Read This Page controls`);
  assert.match(missionHtml,/Read Question/,`${id} renders Read Question controls`);
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillHtml=Renderer.renderSkillWorld(pkg,{mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
  assert.match(drillHtml,new RegExp(spec.labels[0]),`${id} drill renders first focused level`);
}

assert.ok(Schema.VISUAL_MODELS.includes('compare_texts_panel'),'schema accepts compare_texts_panel');
const compareTextsQuestion=[...(g5InformationalIntegration.level_banks||[]).flatMap((level)=>level.questions||[])].find((q)=>q.visual_model==='compare_texts_panel');
assert.ok(compareTextsQuestion,'G5E_RC_003 includes compare_texts_panel fixture question');
assert.match(VisualRegistry.render(compareTextsQuestion),/data-renderer="compare_texts_panel"[\s\S]*compare-text-source source-a[\s\S]*compare-text-source source-b[\s\S]*compare-texts-synthesis/,'compare_texts_panel produces structural visual markup for two sources');


const g5FluencyQuestions=[...(g5Fluency.guided_practice||[]),...(g5Fluency.adaptive_question_bank||[]),...(g5Fluency.checkpoint||[]),...(g5Fluency.level_banks||[]).flatMap((level)=>level.questions||[])];
const g5FluencyValidation=Schema.validateSkillPackage(g5Fluency,{allowPlannedLevelBanks:false});
assert.equal(g5FluencyValidation.valid,true,`G5E_FL_001 validates in strict production mode: ${g5FluencyValidation.errors.join('; ')}`);
assert.equal(g5Fluency.grade,5,'G5E_FL_001 is Grade 5');
assert.equal(g5Fluency.subject,'English','G5E_FL_001 is English');
assert.equal(g5Fluency.domain,'Fluency','G5E_FL_001 domain matches plan');
assert.equal(g5Fluency.skill,'Reading Fluency and Expression With Complex Text','G5E_FL_001 title matches plan');
assert.ok(grade6EeManifest.packages.includes('G5E_FL_001.skill-package.v1.json'),'manifest includes G5E_FL_001');
assert.equal(Array.isArray(g5Fluency.level_banks),true,'G5E_FL_001 has real level_banks');
assert.equal(g5Fluency.level_banks.length,5,'G5E_FL_001 has five real level banks');
assert.equal(g5Fluency.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G5E_FL_001 has four focused levels');
assert.equal(g5Fluency.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G5E_FL_001 has Mixed level');
g5Fluency.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
['Level 1: Accuracy','Level 2: Phrasing and Rate','Level 3: Punctuation and Expression','Level 4: Repeated Reading With Meaning','Mixed'].forEach((label)=>assert.ok(g5Fluency.level_banks.some((level)=>level.label===label),`G5E_FL_001 includes ${label}`));
['sentence_card','sentence_highlight','phrase_builder','fluency_meter'].forEach((visual)=>assert.ok(g5FluencyQuestions.some((q)=>q.visual_model===visual),`G5E_FL_001 includes ${visual}`));
['multiple_choice','short_response','sentence_completion'].forEach((type)=>assert.ok(g5FluencyQuestions.some((q)=>q.question_type===type),`G5E_FL_001 includes ${type}`));
['skips_words','phrase_chunking_error','punctuation_ignored','expression_flat_reading'].forEach((tag)=>assert.ok(g5Fluency.misconception_bank[tag],`G5E_FL_001 includes misconception ${tag}`));
assert.ok(g5FluencyQuestions.filter((q)=>q.question_type==='short_response'||q.question_type==='sentence_completion').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G5E_FL_001 constructed response items have acceptable_answers');
assert.deepEqual(Renderer.renderSkillWorld(g5Fluency,{failClosed:true}).steps,['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'G5E_FL_001 full mission flow is Story to Profile');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const narration=g5Fluency.page_audio?.[screen]; assert.ok(narration?.text,`G5E_FL_001 has Read This Page narration for ${screen}`); assert.equal(narration.label,'Read This Page',`G5E_FL_001 ${screen} uses Read This Page label`); assert.match(narration.text,/Read This Page|Read Question|Listen|Practice This Skill|Press/i,`G5E_FL_001 ${screen} narration teaches or guides`);});
['practice','challenge','checkpoint'].forEach((screen)=>assert.match(g5Fluency.page_audio[screen].text,/Read Question/,`G5E_FL_001 ${screen} references Read Question`));
[...(g5Fluency.guided_practice||[]),...(g5Fluency.adaptive_question_bank||[]),...(g5Fluency.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
g5Fluency.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} practice question has Read Question narration`));
assert.ok(g5FluencyQuestions.every((q)=>q.audio?.label==='Listen'&&q.audio?.text&&q.audio?.playback_preference==='cached_audio_first'&&q.audio?.browser_speech_fallback===true), 'G5E_FL_001 Listen audio supports cached AI audio with browser speech fallback');
assert.ok(g5FluencyQuestions.some((q)=>q.repeat_after_me===true),'G5E_FL_001 includes repeat-after-me support');
const g5FluencyMissionHtml=Renderer.renderSkillWorld(g5Fluency,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g5FluencyMissionHtml,new RegExp(label),`G5E_FL_001 full mission flow renders ${label}`));
assert.match(g5FluencyMissionHtml,/Read This Page/,'G5E_FL_001 renders Read This Page controls');
assert.match(g5FluencyMissionHtml,/Read Question/,'G5E_FL_001 renders Read Question controls');
assert.match(g5FluencyMissionHtml,/Continue to Skill Practice/,'G5E_FL_001 profile links to Skill Practice Center');
const g5FluencyDrillHtml=Renderer.renderSkillWorld(g5Fluency,{mode:'drill',failClosed:true}).html;
assert.match(g5FluencyDrillHtml,/Skill Practice Center/,'G5E_FL_001 Practice This Skill route renders Skill Practice Center');
assert.match(g5FluencyDrillHtml,/Level 1: Accuracy/,'G5E_FL_001 drill renders Level 1');
const g5FluencyMeterQuestion=g5FluencyQuestions.find((q)=>q.visual_model==='fluency_meter');
assert.ok(g5FluencyMeterQuestion,'G5E_FL_001 has fluency_meter question');
assert.match(VisualRegistry.render(g5FluencyMeterQuestion),/data-renderer="fluency_meter"/,'G5E_FL_001 fluency_meter rendering exists');
['sentence_card','sentence_highlight','phrase_builder'].forEach((visual)=>{const q=g5FluencyQuestions.find((item)=>item.visual_model===visual); assert.ok(q,`G5E_FL_001 includes ${visual} question`); assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for G5E_FL_001`);});


const g5VocabularyQuestions=[...(g5Vocabulary.guided_practice||[]),...(g5Vocabulary.adaptive_question_bank||[]),...(g5Vocabulary.checkpoint||[]),...(g5Vocabulary.level_banks||[]).flatMap((level)=>level.questions||[])];
assert.equal(Schema.validateSkillPackage(g5Vocabulary,{allowPlannedLevelBanks:false}).valid,true,'G5E_VOC_001 validates in strict production mode');
assert.equal(g5Vocabulary.grade,5,'G5E_VOC_001 is Grade 5');
assert.equal(g5Vocabulary.subject,'English','G5E_VOC_001 is English');
assert.equal(g5Vocabulary.domain,'Vocabulary / Language','G5E_VOC_001 domain matches plan');
assert.equal(g5Vocabulary.skill,'Vocabulary, Context Clues, and Figurative Language','G5E_VOC_001 title matches plan');
assert.ok(grade6EeManifest.packages.includes('G5E_VOC_001.skill-package.v1.json'),'manifest includes G5E_VOC_001');
assert.equal(Array.isArray(g5Vocabulary.level_banks),true,'G5E_VOC_001 has real level_banks');
assert.equal(g5Vocabulary.level_banks.length,5,'G5E_VOC_001 has five real level banks');
assert.equal(g5Vocabulary.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G5E_VOC_001 has four focused levels');
assert.equal(g5Vocabulary.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G5E_VOC_001 has Mixed level');
g5Vocabulary.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
['Level 1: Context Clues','Level 2: Roots, Affixes, and Word Relationships','Level 3: Synonyms, Antonyms, and Shades','Level 4: Figurative Language, Adages, and Proverbs','Mixed'].forEach((label)=>assert.ok(g5Vocabulary.level_banks.some((level)=>level.label===label),`G5E_VOC_001 includes ${label}`));
['context_sentence','vocabulary_match','word_scale','figurative_language_card'].forEach((visual)=>assert.ok(g5VocabularyQuestions.some((q)=>q.visual_model===visual),`G5E_VOC_001 includes ${visual}`));
['multiple_choice','short_response','vocabulary_match'].forEach((type)=>assert.ok(g5VocabularyQuestions.some((q)=>q.question_type===type),`G5E_VOC_001 includes ${type}`));
['context_clue_ignored','literal_vs_figurative_confusion','adage_proverb_confusion','shade_of_meaning_confusion'].forEach((tag)=>assert.ok(g5Vocabulary.misconception_bank[tag],`G5E_VOC_001 includes misconception ${tag}`));
assert.ok(g5VocabularyQuestions.filter((q)=>q.question_type==='short_response'||q.question_type==='vocabulary_match').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G5E_VOC_001 constructed and match items have acceptable_answers');
assert.deepEqual(Renderer.renderSkillWorld(g5Vocabulary,{failClosed:true}).steps,['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],'G5E_VOC_001 full mission flow is Story to Profile');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const narration=g5Vocabulary.page_audio?.[screen]; assert.ok(narration?.text,`G5E_VOC_001 has Read This Page narration for ${screen}`); assert.equal(narration.label,'Read This Page',`G5E_VOC_001 ${screen} uses Read This Page label`); assert.match(narration.text,/Read This Page|Read Question|Listen|Practice This Skill|Press/i,`G5E_VOC_001 ${screen} narration teaches or guides`);});
['practice','challenge','checkpoint'].forEach((screen)=>assert.match(g5Vocabulary.page_audio[screen].text,/Read Question/,`G5E_VOC_001 ${screen} references Read Question`));
[...(g5Vocabulary.guided_practice||[]),...(g5Vocabulary.adaptive_question_bank||[]),...(g5Vocabulary.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
g5Vocabulary.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} practice question has Read Question narration`));
assert.ok(g5VocabularyQuestions.every((q)=>q.audio?.label==='Listen'&&q.audio?.text&&q.audio?.playback_preference==='cached_audio_first'&&q.audio?.browser_speech_fallback===true), 'G5E_VOC_001 Listen audio supports cached AI audio with browser speech fallback');
assert.ok(g5VocabularyQuestions.some((q)=>/idiom|adage|proverb|simile|metaphor/i.test(q.figurative_type||q.phrase||q.prompt)),'G5E_VOC_001 includes listenable idioms, adages, proverbs, and figurative language');
const g5VocabularyMissionHtml=Renderer.renderSkillWorld(g5Vocabulary,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g5VocabularyMissionHtml,new RegExp(label),`G5E_VOC_001 full mission flow renders ${label}`));
assert.match(g5VocabularyMissionHtml,/Read This Page/,'G5E_VOC_001 renders Read This Page controls');
assert.match(g5VocabularyMissionHtml,/Read Question/,'G5E_VOC_001 renders Read Question controls');
assert.match(g5VocabularyMissionHtml,/Continue to Skill Practice/,'G5E_VOC_001 profile links to Skill Practice Center');
const g5VocabularyDrillHtml=Renderer.renderSkillWorld(g5Vocabulary,{mode:'drill',failClosed:true}).html;
assert.match(g5VocabularyDrillHtml,/Skill Practice Center/,'G5E_VOC_001 Practice This Skill route renders Skill Practice Center');
assert.match(g5VocabularyDrillHtml,/Level 1: Context Clues/,'G5E_VOC_001 drill renders Level 1');
['context_sentence','vocabulary_match','word_scale','figurative_language_card'].forEach((visual)=>{const q=g5VocabularyQuestions.find((item)=>item.visual_model===visual); assert.ok(q,`G5E_VOC_001 includes ${visual} question`); assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for G5E_VOC_001`);});

const g4AdvancedWordAnalysis=load('G4E_RF_001');
const g4EnglishQuestions=[...(g4AdvancedWordAnalysis.guided_practice||[]),...(g4AdvancedWordAnalysis.adaptive_question_bank||[]),...(g4AdvancedWordAnalysis.checkpoint||[]),...(g4AdvancedWordAnalysis.level_banks||[]).flatMap((level)=>level.questions||[])];
assert.equal(Schema.validateSkillPackage(g4AdvancedWordAnalysis,{allowPlannedLevelBanks:false}).valid,true,'G4E_RF_001 validates in strict production mode');
assert.equal(g4AdvancedWordAnalysis.grade,4,'G4E_RF_001 is Grade 4');
assert.equal(g4AdvancedWordAnalysis.subject,'English','G4E_RF_001 is English');
assert.equal(g4AdvancedWordAnalysis.domain,'Reading Foundations / Phonics','G4E_RF_001 domain matches plan');
assert.equal(g4AdvancedWordAnalysis.skill,'Advanced Word Analysis and Multisyllable Decoding','G4E_RF_001 title matches plan');
assert.equal(Array.isArray(g4AdvancedWordAnalysis.level_banks),true,'G4E_RF_001 has real level_banks');
assert.equal(g4AdvancedWordAnalysis.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,'G4E_RF_001 has four focused levels');
assert.equal(g4AdvancedWordAnalysis.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,'G4E_RF_001 has Mixed level');
g4AdvancedWordAnalysis.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
['Level 1: Syllable Types','Level 2: Prefixes and Suffixes','Level 3: Roots and Word Parts','Level 4: Multisyllable Decoding','Mixed'].forEach((label)=>assert.ok(g4AdvancedWordAnalysis.level_banks.some((level)=>level.label===label),`G4E_RF_001 includes ${label}`));
['syllable_break','word_parts','morpheme_tiles','word_builder'].forEach((visual)=>assert.ok(g4EnglishQuestions.some((q)=>q.visual_model===visual),`G4E_RF_001 includes ${visual}`));
['multiple_choice','short_response','word_building'].forEach((type)=>assert.ok(g4EnglishQuestions.some((q)=>q.question_type===type),`G4E_RF_001 includes ${type}`));
['syllable_division_error','prefix_suffix_confusion','root_meaning_confusion','multisyllable_guessing'].forEach((tag)=>assert.ok(g4AdvancedWordAnalysis.misconception_bank[tag],`G4E_RF_001 includes misconception ${tag}`));
assert.ok(g4EnglishQuestions.filter((q)=>q.question_type==='short_response').every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),'G4E_RF_001 short-response items have acceptable_answers');
['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const audio=g4AdvancedWordAnalysis.page_audio?.[screen]; assert.ok(audio?.text,`G4E_RF_001 has Read This Page narration for ${screen}`); assert.equal(audio.label,'Read This Page',`G4E_RF_001 ${screen} uses Read This Page label`); assert.match(audio.text,/(syllable|prefix|suffix|root|word|decode|Read Question|Practice This Skill|Press)/i,`G4E_RF_001 ${screen} narration teaches or guides`);});
[...(g4AdvancedWordAnalysis.guided_practice||[]),...(g4AdvancedWordAnalysis.adaptive_question_bank||[]),...(g4AdvancedWordAnalysis.checkpoint||[])].forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
g4AdvancedWordAnalysis.level_banks.flatMap((level)=>level.questions).forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} practice question has Read Question narration`));
assert.ok(g4EnglishQuestions.filter((q)=>/syllable|multisyllable|word_builder|word_parts|morpheme_tiles/.test(`${q.visual_model} ${q.support_type}`)).every((q)=>q.audio?.text), 'G4E_RF_001 pronunciation and word-part items include Listen audio');
const g4EnglishMissionHtml=Renderer.renderSkillWorld(g4AdvancedWordAnalysis,{failClosed:true}).html;
['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(g4EnglishMissionHtml,new RegExp(label),`G4E_RF_001 full mission flow renders ${label}`));
assert.match(g4EnglishMissionHtml,/Read This Page/,'G4E_RF_001 renders page narration controls');
assert.match(g4EnglishMissionHtml,/Read Question/,'G4E_RF_001 renders question narration controls');
assert.match(g4EnglishMissionHtml,/Continue to Skill Practice/,'G4E_RF_001 profile links to Skill Practice Center');
const g4EnglishDrillState=Renderer.createState();
g4EnglishDrillState.mode='drill';
const g4EnglishDrillHtml=Renderer.renderSkillWorld(g4AdvancedWordAnalysis,{state:g4EnglishDrillState,mode:'drill',failClosed:true}).html;
assert.match(g4EnglishDrillHtml,/Skill Practice Center/,'G4E_RF_001 Practice This Skill route renders Skill Practice Center');
assert.match(g4EnglishDrillHtml,/Level 1: Syllable Types/,'G4E_RF_001 drill renders Level 1');
['syllable_break','word_parts','morpheme_tiles','word_builder'].forEach((visual)=>{const q=g4EnglishQuestions.find((item)=>item.visual_model===visual); assert.ok(q,`G4E_RF_001 includes ${visual} question`); assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for G4E_RF_001`);});

const g4EnglishBatchPackages = [
  {
    id: 'G4E_FL_001',
    domain: 'Fluency',
    skill: 'Reading Fluency, Accuracy, and Expression',
    labels: ['Level 1: Accuracy', 'Level 2: Phrasing', 'Level 3: Punctuation and Expression', 'Level 4: Repeated Reading', 'Mixed'],
    visuals: ['sentence_card', 'sentence_highlight', 'phrase_builder', 'fluency_meter'],
    types: ['multiple_choice', 'short_response', 'sentence_completion'],
    tags: ['skips_words', 'punctuation_ignored', 'phrase_chunking_error', 'expression_flat_reading'],
    listenPattern: /sentence_card|sentence_highlight|phrase_builder|fluency_meter/,
    pkg: load('G4E_FL_001')
  },
  {
    id: 'G4E_VOC_001',
    domain: 'Vocabulary / Language',
    skill: 'Vocabulary, Context Clues, and Figurative Language',
    labels: ['Level 1: Context Clues', 'Level 2: Word Parts and Meanings', 'Level 3: Synonyms, Antonyms, and Shades', 'Level 4: Figurative Language', 'Mixed'],
    visuals: ['context_sentence', 'vocabulary_match', 'word_scale', 'figurative_language_card'],
    types: ['multiple_choice', 'short_response', 'vocabulary_match'],
    tags: ['context_clue_ignored', 'affix_meaning_confusion', 'literal_vs_figurative_confusion', 'shade_of_meaning_confusion'],
    listenPattern: /context_sentence|vocabulary_match|figurative_language_card/,
    pkg: load('G4E_VOC_001')
  },
  {
    id: 'G4E_RC_001',
    domain: 'Reading Comprehension',
    skill: 'Ask and Answer Questions With Text Evidence',
    labels: ['Level 1: Literal Questions', 'Level 2: Inferential Questions', 'Level 3: Find Text Evidence', 'Level 4: Explain Your Answer', 'Mixed'],
    visuals: ['short_passage', 'question_card', 'evidence_highlight', 'text_evidence_builder'],
    types: ['multiple_choice', 'short_response', 'text_evidence'],
    tags: ['unsupported_answer', 'inference_without_evidence', 'misses_text_evidence', 'question_word_confusion'],
    listenPattern: /short_passage|evidence_highlight|text_evidence_builder/,
    pkg: load('G4E_RC_001')
  },
  {
    id: 'G4E_RC_002',
    domain: 'Reading Literature',
    skill: 'Story Elements, Theme, and Character Analysis',
    labels: ['Level 1: Characters and Setting', 'Level 2: Plot and Problem/Solution', 'Level 3: Character Traits and Point of View', 'Level 4: Theme / Lesson', 'Mixed'],
    visuals: ['story_map', 'character_trait_chart', 'event_cards', 'theme_tracker'],
    types: ['multiple_choice', 'short_response', 'sequencing', 'text_evidence'],
    tags: ['character_trait_confusion', 'point_of_view_confusion', 'theme_detail_confusion', 'sequence_order_error'],
    listenPattern: /story_map|character_trait_chart|event_cards|theme_tracker/,
    pkg: load('G4E_RC_002')
  },
  {
    id: 'G4E_RC_003',
    domain: 'Reading Informational Text',
    skill: 'Main Idea, Key Details, and Text Structure',
    labels: ['Level 1: Topic and Main Idea', 'Level 2: Key Details and Summary', 'Level 3: Text Structure', 'Level 4: Text Features', 'Mixed'],
    visuals: ['short_passage', 'main_idea_web', 'detail_cards', 'text_feature_map', 'text_structure_chart'],
    types: ['multiple_choice', 'short_response', 'text_evidence', 'detail_match'],
    tags: ['topic_main_idea_confusion', 'detail_selection_error', 'text_structure_confusion', 'text_feature_confusion'],
    listenPattern: /short_passage|main_idea_web|detail_cards|text_feature_map|text_structure_chart/,
    pkg: load('G4E_RC_003')
  },
  {
    id: 'G4E_WR_001',
    domain: 'Writing / Composition',
    skill: 'Opinion Writing With Reasons and Evidence',
    labels: ['Level 1: State an Opinion', 'Level 2: Support With Reasons and Evidence', 'Level 3: Linking Words and Conclusion', 'Level 4: Build Opinion Paragraph', 'Mixed'],
    visuals: ['opinion_reason_chart', 'paragraph_builder', 'writing_checklist', 'sentence_builder'],
    types: ['multiple_choice', 'short_response', 'writing_response', 'sentence_completion'],
    tags: ['missing_opinion', 'weak_reason', 'missing_evidence', 'missing_conclusion'],
    listenPattern: /opinion_reason_chart|paragraph_builder|writing_checklist|sentence_builder/,
    pkg: load('G4E_WR_001')
  },
  {
    id: 'G4E_WR_002',
    domain: 'Writing / Composition',
    skill: 'Informative Writing With Facts and Details',
    labels: ['Level 1: Choose a Topic', 'Level 2: Add Facts, Definitions, and Details', 'Level 3: Use Linking Words and Formatting', 'Level 4: Build Informative Paragraph', 'Mixed'],
    visuals: ['topic_detail_chart', 'fact_cards', 'paragraph_builder', 'writing_checklist'],
    types: ['multiple_choice', 'short_response', 'writing_response', 'sentence_completion'],
    tags: ['missing_topic', 'unsupported_fact', 'missing_detail', 'missing_conclusion'],
    listenPattern: /topic_detail_chart|fact_cards|paragraph_builder|writing_checklist/,
    pkg: load('G4E_WR_002')
  },
  {
    id: 'G4E_WR_003',
    domain: 'Writing / Composition',
    skill: 'Narrative Writing With Dialogue and Description',
    labels: ['Level 1: Sequence Events', 'Level 2: Add Description', 'Level 3: Dialogue and Transitions', 'Level 4: Build Narrative', 'Mixed'],
    visuals: ['story_sequence', 'event_cards', 'paragraph_builder', 'dialogue_builder'],
    types: ['multiple_choice', 'short_response', 'writing_response', 'sequencing'],
    tags: ['event_order_error', 'missing_description', 'dialogue_punctuation_error', 'missing_closure'],
    listenPattern: /story_sequence|event_cards|paragraph_builder|dialogue_builder/,
    pkg: load('G4E_WR_003')
  },
  {
    id: 'G4E_LANG_001',
    domain: 'Language',
    skill: 'Grammar, Conventions, and Sentence Combining',
    labels: ['Level 1: Capitalization and Punctuation', 'Level 2: Commas and Quotation Marks', 'Level 3: Grammar and Verb Tense', 'Level 4: Sentence Combining', 'Mixed'],
    visuals: ['sentence_builder', 'punctuation_marker', 'grammar_highlight', 'sentence_combiner'],
    types: ['multiple_choice', 'short_response', 'sentence_completion', 'editing'],
    tags: ['capitalization_error', 'punctuation_error', 'verb_tense_error', 'sentence_fragment'],
    listenPattern: /sentence_builder|punctuation_marker|grammar_highlight|sentence_combiner/,
    pkg: load('G4E_LANG_001')
  }
];


const g6FinalEnglishPackages=[
  {id:'G6E_WR_002',pkg:g6InformativeWriting,domain:'Writing / Composition',skill:'Informative Writing and Source-Based Explanation',labels:['Level 1: Introduce a Topic','Level 2: Facts, Definitions, and Quotations','Level 3: Organization and Transitions','Level 4: Build an Informative Essay','Mixed'],visuals:['topic_detail_chart','fact_cards','paragraph_builder','writing_checklist','evidence_builder'],types:['multiple_choice','short_response','writing_response','sentence_completion'],tags:['missing_topic','unsupported_fact','weak_source_use','weak_organization'],validationKey:'writing_validation',validation:['topic_present','facts_present','definitions_or_explanations_present','supporting_details_present','quotation_or_source_reference_present','source_information_used_accurately','transitions_present','logical_organization','conclusion_present','capitalization','punctuation','complete_sentences','objective_tone']},
  {id:'G6E_WR_003',pkg:g6NarrativeWriting,domain:'Writing / Composition',skill:'Narrative Writing With Pacing and Point of View',labels:['Level 1: Sequence and Point of View','Level 2: Description and Pacing','Level 3: Dialogue and Transitions','Level 4: Build a Narrative','Mixed'],visuals:['story_sequence','event_cards','dialogue_builder','paragraph_builder'],types:['multiple_choice','short_response','writing_response','sequencing'],tags:['event_order_error','point_of_view_shift','dialogue_punctuation_error','pacing_gap'],validationKey:'writing_validation',validation:['clear_event_sequence','consistent_point_of_view','setting_or_situation_present','characters_present','description_present','dialogue_punctuation','transitions_present','pacing_support','closure_present','capitalization','punctuation','complete_sentences']},
  {id:'G6E_LANG_001',pkg:g6LanguageConventions,domain:'Language',skill:'Grammar, Usage, Conventions, and Style',labels:['Level 1: Grammar and Pronoun Usage','Level 2: Verb Tense and Agreement','Level 3: Punctuation and Conventions','Level 4: Sentence Combining and Style','Mixed'],visuals:['sentence_builder','punctuation_marker','grammar_highlight','sentence_combiner'],types:['multiple_choice','short_response','sentence_completion','editing'],tags:['pronoun_reference_error','verb_tense_error','punctuation_error','sentence_fragment'],validationKey:'grammar_validation',validation:['pronoun_reference','pronoun_agreement','subject_verb_agreement','verb_tense_consistency','capitalization','ending_punctuation','commas','quotation_marks','complete_sentence','fragment_detection','sentence_combining','sentence_variety','style_and_clarity']}
];
for (const spec of g6FinalEnglishPackages) {
  const {id,pkg}=spec;
  const missionQuestions=[...(pkg.guided_practice||[]),...(pkg.adaptive_question_bank||[]),...(pkg.checkpoint||[])];
  const levelQuestions=(pkg.level_banks||[]).flatMap((level)=>level.questions||[]);
  const allQuestions=[...missionQuestions,...levelQuestions];
  assert.equal(Schema.validateSkillPackage(pkg,{allowPlannedLevelBanks:false}).valid,true,`${id} validates in strict production mode`);
  assert.equal(pkg.grade,6,`${id} is Grade 6`);
  assert.equal(pkg.subject,'English',`${id} is English`);
  assert.equal(pkg.domain,spec.domain,`${id} domain matches plan`);
  assert.equal(pkg.skill,spec.skill,`${id} skill matches plan`);
  assert.ok(grade6EeManifest.packages.includes(`${id}.skill-package.v1.json`),`manifest includes ${id}`);
  assert.deepEqual(Renderer.renderSkillWorld(pkg,{failClosed:true}).steps,['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'],`${id} full mission flow is Story to Profile`);
  assert.equal(pkg.level_banks.length,5,`${id} has five real level banks`);
  assert.equal(pkg.level_banks.filter((level)=>!/(^|_)mixed$/i.test(level.level_id)&&!/^mixed$/i.test(level.label)).length,4,`${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level)=>(/(^|_)mixed$/i.test(level.level_id)||/^mixed$/i.test(level.label))),true,`${id} has Mixed level`);
  pkg.level_banks.forEach((level)=>assert.ok(level.questions.length>=10&&level.questions.length<=12,`${level.level_id} has 10–12 questions`));
  spec.labels.forEach((label)=>assert.ok(pkg.level_banks.some((level)=>level.label===label),`${id} includes ${label}`));
  spec.visuals.forEach((visual)=>assert.ok(allQuestions.some((q)=>q.visual_model===visual),`${id} includes ${visual}`));
  spec.types.forEach((type)=>assert.ok(allQuestions.some((q)=>q.question_type===type),`${id} includes ${type}`));
  spec.tags.forEach((tag)=>assert.ok(pkg.misconception_bank[tag]&&allQuestions.some((q)=>q.misconception_tag===tag),`${id} includes misconception ${tag}`));
  spec.validation.forEach((check)=>assert.ok(pkg[spec.validationKey]?.checks?.includes(check),`${id} includes validation check ${check}`));
  assert.ok(pkg[spec.validationKey]?.acceptable_sample_responses?.length>0,`${id} has acceptable sample writing responses`);
  ['story','lesson','watch','demo','practice','challenge','checkpoint','badge','profile'].forEach((screen)=>{const narration=pkg.page_audio?.[screen]; assert.ok(narration?.text,`${id} has Read This Page narration for ${screen}`); assert.equal(narration.label,'Read This Page',`${id} ${screen} uses Read This Page label`);});
  missionQuestions.forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} mission question has Read Question narration`));
  levelQuestions.forEach((q)=>assert.equal(q.question_audio?.label,'Read Question',`${q.question_id} practice question has Read Question narration`));
  assert.ok(allQuestions.every((q)=>q.audio?.label==='Listen'&&q.audio?.text&&q.audio?.playback_preference==='cached_audio_first'&&q.audio?.browser_speech_fallback===true),`${id} Listen audio supports cached AI audio with browser speech fallback`);
  assert.ok(allQuestions.every((q)=>Array.isArray(q.acceptable_answers)&&q.acceptable_answers.length>0),`${id} questions include acceptable_answers`);
  assert.ok(allQuestions.some((q)=>Array.isArray(q.acceptable_sample_responses)&&q.acceptable_sample_responses.length>0),`${id} includes acceptable sample responses on open-ended items`);
  const missionHtml=Renderer.renderSkillWorld(pkg,{failClosed:true}).html;
  ['Story','Lesson','Watch','Demo','Practice','Challenge','Checkpoint','Badge','Profile'].forEach((label)=>assert.match(missionHtml,new RegExp(label),`${id} mission renders ${label}`));
  assert.match(missionHtml,/Read This Page/,`${id} renders Read This Page controls`);
  assert.match(missionHtml,/Read Question/,`${id} renders Read Question controls`);
  assert.match(missionHtml,/Continue to Skill Practice/,`${id} profile links to Skill Practice Center`);
  const drillHtml=Renderer.renderSkillWorld(pkg,{mode:'drill',failClosed:true}).html;
  assert.match(drillHtml,/Skill Practice Center/,`${id} Practice This Skill route renders Skill Practice Center`);
  spec.labels.forEach((label)=>assert.match(drillHtml,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${id} drill renders ${label}`));
  spec.visuals.forEach((visual)=>{const q=allQuestions.find((item)=>item.visual_model===visual); assert.ok(q,`${id} includes ${visual} question`); assert.match(VisualRegistry.render(q),new RegExp(`data-renderer="${visual}"`),`${visual} renderer output exists for ${id}`);});
}
assert.match(VisualRegistry.render(g6InformativeWriting.level_banks.flatMap((level)=>level.questions).find((q)=>q.visual_model==='evidence_builder')),/data-renderer="evidence_builder"[\s\S]*Source \/ Quotation/, 'evidence_builder works for source-based writing');

const g4EnglishBatchManifest = JSON.parse(fs.readFileSync(path.join(root, 'public/gamehub/skill-world/content/manifest.json'), 'utf8'));
for (const spec of g4EnglishBatchPackages) {
  const { id, pkg } = spec;
  const allQuestions = [...(pkg.guided_practice || []), ...(pkg.adaptive_question_bank || []), ...(pkg.checkpoint || []), ...(pkg.level_banks || []).flatMap((level) => level.questions || [])];
  assert.equal(Schema.validateSkillPackage(pkg, { allowPlannedLevelBanks: false }).valid, true, `${id} validates in strict production mode`);
  assert.equal(pkg.grade, 4, `${id} is Grade 4`);
  assert.equal(pkg.subject, 'English', `${id} is English`);
  assert.equal(pkg.domain, spec.domain, `${id} domain matches plan`);
  assert.equal(pkg.skill, spec.skill, `${id} skill title matches plan`);
  assert.ok(g4EnglishBatchManifest.packages.includes(`${id}.skill-package.v1.json`), `manifest includes ${id}`);
  assert.equal(Array.isArray(pkg.level_banks), true, `${id} has real level_banks`);
  assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4, `${id} has four focused levels`);
  assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true, `${id} has Mixed level`);
  pkg.level_banks.forEach((level) => assert.ok(level.questions.length >= 10 && level.questions.length <= 12, `${id} ${level.level_id} has 10–12 questions`));
  spec.labels.forEach((label) => assert.ok(pkg.level_banks.some((level) => level.label === label), `${id} includes ${label}`));
  spec.visuals.forEach((visual) => assert.ok(allQuestions.some((q) => q.visual_model === visual), `${id} includes ${visual}`));
  spec.types.forEach((type) => assert.ok(allQuestions.some((q) => q.question_type === type), `${id} includes ${type}`));
  spec.tags.forEach((tag) => assert.ok(pkg.misconception_bank[tag], `${id} includes misconception ${tag}`));
  assert.ok(allQuestions.filter((q) => q.question_type === 'short_response' || q.question_type === 'sentence_completion' || q.question_type === 'text_evidence' || q.question_type === 'vocabulary_match' || q.question_type === 'writing_response' || q.question_type === 'editing' || q.question_type === 'sequencing').every((q) => Array.isArray(q.acceptable_answers) && q.acceptable_answers.length > 0), `${id} constructed-response items have acceptable_answers`);
  if (/^G4E_(WR|LANG)_/.test(id)) {
    const validationQuestions = allQuestions.filter((q) => ['short_response', 'sentence_completion', 'writing_response', 'editing'].includes(q.question_type));
    assert.ok(validationQuestions.length > 0, `${id} has writing or language validation questions`);
    assert.ok(validationQuestions.every((q) => Array.isArray(q.validation_checks) && q.validation_checks.length > 0), `${id} writing validation checks exist`);
    assert.ok(validationQuestions.every((q) => q.writing_validation?.sample_answer && q.writing_validation?.do_not_over_penalize === true), `${id} has child-friendly writing validation sample answers`);
  }
  ['story', 'lesson', 'watch', 'demo', 'practice', 'challenge', 'checkpoint', 'badge', 'profile'].forEach((screen) => {
    const narration = pkg.page_audio?.[screen];
    assert.ok(narration?.text, `${id} has Read This Page narration for ${screen}`);
    assert.equal(narration.label, 'Read This Page', `${id} ${screen} uses Read This Page label`);
    assert.ok(narration.text.split(/[.!?]+/).filter((sentence) => sentence.trim()).length >= 3, `${id} ${screen} narration teaches, not just announces`);
  });
  ['practice', 'challenge', 'checkpoint'].forEach((screen) => assert.match(pkg.page_audio[screen].text, /Read Question/, `${id} ${screen} narration references Read Question`));
  [...(pkg.guided_practice || []), ...(pkg.adaptive_question_bank || []), ...(pkg.checkpoint || [])].forEach((q) => assert.equal(q.question_audio?.label, 'Read Question', `${q.question_id} mission question has Read Question narration`));
  pkg.level_banks.flatMap((level) => level.questions).forEach((q) => assert.equal(q.question_audio?.label, 'Read Question', `${q.question_id} Skill Practice question has Read Question narration`));
  assert.ok(allQuestions.filter((q) => spec.listenPattern.test(`${q.visual_model} ${q.support_type}`)).every((q) => q.audio?.text), `${id} Listen audio exists where pronunciation, vocabulary, fluency, sentence, or passage reading helps`);
  const missionHtml = Renderer.renderSkillWorld(pkg, { failClosed: true }).html;
  ['Story', 'Lesson', 'Watch', 'Demo', 'Practice', 'Challenge', 'Checkpoint', 'Badge', 'Profile'].forEach((label) => assert.match(missionHtml, new RegExp(label), `${id} full mission flow renders ${label}`));
  assert.match(missionHtml, /Read This Page/, `${id} renders page narration controls`);
  assert.match(missionHtml, /Read Question/, `${id} renders question narration controls`);
  assert.match(missionHtml, /Continue to Skill Practice/, `${id} profile links to Skill Practice Center`);
  const drillHtml = Renderer.renderSkillWorld(pkg, { mode: 'drill', failClosed: true }).html;
  assert.match(drillHtml, /Skill Practice Center/, `${id} Practice This Skill route renders Skill Practice Center`);
  assert.match(drillHtml, new RegExp(spec.labels[0]), `${id} drill renders first focused level`);
}

['figurative_language_card', 'fluency_meter', 'text_evidence_builder', 'story_map', 'character_trait_chart', 'theme_tracker', 'text_structure_chart', 'text_feature_map', 'opinion_reason_chart', 'paragraph_builder', 'writing_checklist', 'sentence_builder', 'topic_detail_chart', 'fact_cards', 'event_cards', 'dialogue_builder', 'punctuation_marker', 'grammar_highlight', 'sentence_combiner'].forEach((visual) => {
  const question = g4EnglishBatchPackages.flatMap(({ pkg }) => [...(pkg.guided_practice || []), ...(pkg.adaptive_question_bank || []), ...(pkg.checkpoint || []), ...(pkg.level_banks || []).flatMap((level) => level.questions || [])]).find((q) => q.visual_model === visual);
  assert.ok(question, `${visual} has a Grade 4 English fixture question`);
  assert.match(VisualRegistry.render(question), new RegExp(`data-renderer="${visual}"`), `${visual} renderer output exists`);
});
