(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillPackageSchema=factory();}})(typeof self!=='undefined'?self:this,function(){
  const QUESTION_TYPES=['multiple_choice','short_response','visual_objects','number_sequence','number_line','comparison','base_ten_blocks','addition_model','subtraction_model','number_bond','shape_identification','measurement_comparison','pattern_completion','sorting_visual'];
  function ensureQuestionId(question,index,prefix){if(!question.question_id&&!question.id){question.question_id=`${prefix}_${index+1}`;} return question.question_id||question.id;}
  function validateSkillPackage(skillPackage){const errors=[];['skill_id','grade','subject','domain','skill'].forEach((k)=>{if(skillPackage[k]===undefined){errors.push(`missing ${k}`);}});
    ['guided_practice','adaptive_question_bank','checkpoint'].forEach((zone)=>{(skillPackage[zone]||[]).forEach((q,i)=>{ensureQuestionId(q,i,zone); if(!q.question_type){errors.push(`${zone}[${i}] missing question_type`);} if(q.question_type&&!QUESTION_TYPES.includes(q.question_type)){errors.push(`${zone}[${i}] invalid question_type`);} if(!q.answer&&q.correct_answer===undefined){errors.push(`${zone}[${i}] missing correct answer`);} });});
    return {valid:errors.length===0,errors};
  }
  return {QUESTION_TYPES,validateSkillPackage,ensureQuestionId};
});
