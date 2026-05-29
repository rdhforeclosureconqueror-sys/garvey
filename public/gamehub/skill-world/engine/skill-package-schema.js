(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillPackageSchema=factory();}})(typeof self!=='undefined'?self:this,function(){
  const QUESTION_TYPES=['multiple_choice','short_response','visual_objects','number_sequence','number_line','comparison','comparison_cards','base_ten_blocks','place_value_chart','addition_model','subtraction_model','number_bond','shape_identification','measurement_comparison','pattern_completion','sorting_visual'];
  const VISUAL_MODELS=['visual_objects','number_line','number_line_0_120','comparison','comparison_cards','base_ten_blocks','place_value_chart','addition_model','subtraction_model','number_bond','shape_identification','measurement_comparison','pattern_completion','sorting_visual'];
  const REQUIRED_MINIMUMS={guided_practice:1,checkpoint:1,adaptive_question_bank:1};
  const LEVEL_BANK_STATUS_VALUES=['not_applicable','planned'];
  function ensureQuestionId(question,index,prefix){if(!question.question_id&&!question.id){question.question_id=`${prefix}_${index+1}`;} return question.question_id||question.id;}
  function has(o,k){return o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='';}
  function lessonFallback(skillPackage,key){const lesson=skillPackage.lesson||{}; const worked=skillPackage.worked_examples||[]; const hint=(skillPackage.hint_ladder||[])[0]; const map={objective:lesson.objective||lesson.mini_lesson, key_vocabulary:lesson.key_vocabulary||['mission','model','answer'], concept_explanation:lesson.concept_explanation||lesson.mini_lesson||worked[0]?.text, visual_model:lesson.visual_model||skillPackage.guided_practice?.[0]?.visual_model, common_misconception:lesson.common_misconception||Object.values(skillPackage.misconception_bank||{})[0], real_world_connection:lesson.real_world_connection||lesson.story_mission||skillPackage.game_theme?.mission_intro, lesson_summary:lesson.lesson_summary||lesson.mini_lesson||worked[0]?.text}; return map[key]||hint;}
  function validateQuestion(q,i,zone,errors,warnings){ensureQuestionId(q,i,zone); if(!q.prompt){errors.push(`${zone}[${i}] missing prompt`);} if(!q.question_type){errors.push(`${zone}[${i}] missing question_type`);} if(q.question_type&&!QUESTION_TYPES.includes(q.question_type)){errors.push(`${zone}[${i}] invalid question_type`);} const visual=q.visual_model||q.support_type; if(!visual){errors.push(`${zone}[${i}] missing support_type or visual_model`);} else if(!VISUAL_MODELS.includes(visual)){warnings.push(`${zone}[${i}] visual renderer ${visual} uses fallback object renderer`);} if(!q.answer&&q.correct_answer===undefined){errors.push(`${zone}[${i}] missing correct_answer`);} if(q.question_type==='multiple_choice'&&!(Array.isArray(q.choices)||Array.isArray(q.options))){errors.push(`${zone}[${i}] multiple_choice missing choices/options`);} if(q.question_type!=='multiple_choice'&&!q.acceptable_answers&&q.correct_answer===undefined){errors.push(`${zone}[${i}] missing acceptable_answers or correct_answer`);} if(!q.hints&&!q.hint_ladder){warnings.push(`${zone}[${i}] using package hint ladder fallback`);} if(!q.misconception_tag){errors.push(`${zone}[${i}] missing misconception_tag`);} }
  function validateLevelBanks(skillPackage,errors,warnings,options={}){
    const status=skillPackage.level_banks_status;
    if(status&& !LEVEL_BANK_STATUS_VALUES.includes(status)){errors.push('level_banks_status must be not_applicable or planned');}
    if(status==='not_applicable'){return;}
    if(status==='planned'){
      if(options.allowPlannedLevelBanks===false){errors.push('level_banks_status planned is transitional and not allowed in strict production validation');}
      else{warnings.push('level_banks_status planned is transitional; production packages require level_banks'); return;}
    }
    if(!Array.isArray(skillPackage.level_banks)){errors.push('level_banks must exist for production packages unless level_banks_status is not_applicable'); return;}
    if(skillPackage.level_banks.length<4){errors.push('level_banks must include at least 3 focused levels plus one Mixed level');}
    const mixed=skillPackage.level_banks.filter((level)=>/mixed/i.test(String(level.level_id||level.label||'')));
    if(mixed.length<1){errors.push('level_banks must include a Mixed level');}
    const focused=skillPackage.level_banks.filter((level)=>!/mixed/i.test(String(level.level_id||level.label||'')));
    if(focused.length<3){errors.push('level_banks must include at least 3 focused levels');}
    skillPackage.level_banks.forEach((level,levelIndex)=>{
      const zone=`level_banks[${levelIndex}]`;
      ['level_id','label','focus','difficulty','question_count_required','mastery_threshold'].forEach((k)=>{if(!has(level,k)){errors.push(`${zone} missing ${k}`);}});
      const isMixed=/mixed/i.test(String(level.level_id||level.label||''));
      const required=Number(level.question_count_required)||10;
      if(required<10||required>12){errors.push(`${zone}.question_count_required must be 10-12`);}
      if(!Array.isArray(level.questions)){errors.push(`${zone}.questions must be an array`); return;}
      if(level.questions.length<10){errors.push(`${zone}.questions must include at least 10 questions`);}
      if(level.questions.length<required){errors.push(`${zone}.questions length must meet question_count_required`);}
      if(isMixed&&level.questions.length<10){errors.push(`${zone} Mixed level must have 10-12 questions`);}
      if(level.questions.length>12){errors.push(`${zone}.questions must include no more than 12 questions`);}
      const tags=new Set();
      level.questions.forEach((q,i)=>{validateQuestion(q,i,`${zone}.questions`,errors,warnings); if(q.misconception_tag){tags.add(q.misconception_tag);}});
      if(tags.size<1){errors.push(`${zone} must include misconception coverage`);}
    });
  }
  function validateSkillPackage(skillPackage,options={}){const errors=[]; const warnings=[]; if(!skillPackage||typeof skillPackage!=='object'){return {valid:false,errors:['package must be an object'],warnings};}
    ['skill_id','grade','subject','domain','skill'].forEach((k)=>{if(!has(skillPackage,k)){errors.push(`missing ${k}`);}});
    if(!(skillPackage.game_theme?.title||skillPackage.game_theme?.name||skillPackage.skill)){errors.push('missing game_theme.title or skill');}
    if(!(skillPackage.game_theme?.mission_intro||lessonFallback(skillPackage,'real_world_connection'))){errors.push('missing game_theme.mission_intro or lesson.real_world_connection');}
    if(!(skillPackage.game_theme?.badge_name||skillPackage.game_theme?.name)){warnings.push('using fallback badge name from theme/skill');}
    ['objective','key_vocabulary','concept_explanation','visual_model','common_misconception','real_world_connection','lesson_summary'].forEach((k)=>{if(!lessonFallback(skillPackage,k)){errors.push(`missing lesson.${k}`);}});
    if(!Array.isArray(skillPackage.worked_examples)||skillPackage.worked_examples.length<1){errors.push('missing worked_examples[0]');}
    if(!(skillPackage.worked_examples?.[1]||skillPackage.guided_practice?.[0])){errors.push('missing guided demo source worked_examples[1] or guided_practice[0]');}
    Object.entries(REQUIRED_MINIMUMS).forEach(([zone,min])=>{if(!Array.isArray(skillPackage[zone])||skillPackage[zone].length<min){errors.push(`${zone} length must be >= ${min}`);}});
    if(!skillPackage.misconception_bank||typeof skillPackage.misconception_bank!=='object'){errors.push('missing misconception_bank');}
    ['guided_practice','adaptive_question_bank','checkpoint'].forEach((zone)=>{(skillPackage[zone]||[]).forEach((q,i)=>validateQuestion(q,i,zone,errors,warnings));});
    validateLevelBanks(skillPackage,errors,warnings,options);
    if(options.throwOnError&&errors.length){throw new Error(`SkillPackage validation failed for ${skillPackage.skill_id||'unknown'}: ${errors.join('; ')}`);} return {valid:errors.length===0,errors,warnings};
  }
  return {QUESTION_TYPES,VISUAL_MODELS,REQUIRED_MINIMUMS,LEVEL_BANK_STATUS_VALUES,validateSkillPackage,validateLevelBanks,ensureQuestionId};
});
