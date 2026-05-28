(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory(require('./recommendation-helper'),require('./growth-data-adapter'));}else{root.SkillWorldRenderer=factory(root.getRecommendedNextSkill,root.GrowthDataAdapter);}})(typeof self!=='undefined'?self:this,function(getRecommendedNextSkill,GrowthDataAdapter){
  const SCREENS=['StoryMissionScreen','MiniLessonScreen','WorkedExampleScreen','GuidedDemoScreen','PracticeZoneScreen','ChallengeScreen','CheckpointScreen','BadgeScreen','GrowthProfileScreen','AdaptiveHubExit'];
  function createState(){return {screen:0,zone:'intro',questionIndex:0,attempts:0,correct:0,stars:0,hintsUsed:0,answeredByZoneQuestion:{},misconceptionTags:[],checkpointScore:0,passFail:'pending',masteryStatus:'growing',recommendedNextSkill:null};}
  function key(zone,q){return `${zone}:${q.id||q.question_id||q.prompt}`;}
  return {
    SCREENS,createState,
    submitAnswer(state,zone,question,answer){const k=key(zone,question); state.attempts++; state.answeredByZoneQuestion[k]={answer}; const ok=String(answer).toLowerCase()===String(question.answer).toLowerCase(); if(ok){state.correct++;}else if(question.misconception_tag){state.misconceptionTags.push(question.misconception_tag);} return ok;},
    useHint(state){state.hintsUsed++;},
    showAnswer(){return true;},
    continueNext(state){state.screen=Math.min(state.screen+1,SCREENS.length-1);},
    finalize(state,skillPackage,learnerId){const accuracy=state.attempts?Math.round((state.correct/state.attempts)*100):0; state.checkpointScore=accuracy; state.passFail=accuracy>=skillPackage.mastery_threshold?'pass':'fail'; const rec=getRecommendedNextSkill({accuracy_percent:accuracy,misconception_watch:state.misconceptionTags},skillPackage); state.masteryStatus=rec.mastery_status; state.recommendedNextSkill=rec.recommended_next_skill; state.stars=accuracy>=90?3:accuracy>=70?2:1; const payload={learner_id:learnerId,skill_id:skillPackage.skill_id,grade:skillPackage.grade,subject:skillPackage.subject,domain:skillPackage.domain,skill:skillPackage.skill,attempts:state.attempts,correct:state.correct,accuracy_percent:accuracy,hints_used:state.hintsUsed,stars_earned:state.stars,mastery_status:state.masteryStatus,recommended_next_skill:state.recommendedNextSkill,misconception_watch:[...new Set(state.misconceptionTags)],completed_at:new Date().toISOString()}; GrowthDataAdapter.saveGrowthData(payload); return payload;}
  };
});
