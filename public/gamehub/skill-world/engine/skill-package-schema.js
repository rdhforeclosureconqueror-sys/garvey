(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.SkillPackageSchema = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  const QUESTION_TYPES=['multiple_choice', 'short_response', 'ratio_response', 'rate_response', 'expression_response', 'equation_response', 'inequality_response', 'coordinate_response', 'decimal_response', 'integer_response', 'pattern_response', 'algorithm_response', 'rounding', 'fraction_response', 'multiplication_equation', 'division_equation', 'word_problem', 'operation_sort', 'fraction_entry', 'word_building', 'syllable_break', 'matching', 'letter_identification', 'sound_match', 'picture_choice', 'visual_objects', 'number_sequence', 'number_line', 'comparison', 'comparison_cards', 'base_ten_blocks', 'place_value_chart', 'decimal_grid', 'expanded_form', 'addition_model', 'subtraction_model', 'number_bond', 'ten_frame', 'shape_identification', 'measurement_comparison', 'geometry_response', 'pattern_completion', 'sorting_visual', 'analog_clock', 'digital_time', 'time_matching', 'word_problem_model', 'bar_model', 'equation_builder', 'ruler', 'coin_model', 'money_counting', 'data_interpretation', 'graph_reading', 'visual_selection', 'array_counting', 'sound_position', 'same_different_sound', 'word_builder', 'sound_box_blend', 'decode_word', 'word_family_sort', 'rhyme_match', 'sight_word_match', 'sentence_cloze', 'sentence_completion', 'phrase_reading', 'sentence_picture_match', 'punctuation_reading', 'text_evidence_choice', 'text_evidence', 'wh_question', 'event_ordering', 'sequencing', 'picture_order', 'sequence_select', 'sentence_builder', 'capitalization_fix', 'spacing_fix', 'punctuation_choice', 'constructed_sentence', 'picture_prompt_response', 'detail_picker', 'detail_match', 'topic_identification', 'main_idea_choice', 'rubric_scored_writing', 'writing_response', 'editing', 'vocabulary_match', 'category_sort', 'elapsed_time', 'measurement', 'volume_response', 'area_response', 'perimeter_response', 'sorting', 'statistics_response'];
  const VISUAL_MODELS=['visual_objects', 'ratio_table', 'double_number_line', 'tape_diagram', 'unit_rate_card', 'integer_number_line', 'absolute_value_model', 'exponent_model', 'variable_tile', 'order_of_operations_steps', 'balance_scale', 'inequality_number_line', 'solution_set_model', 'equation_table_match', 'expression_builder', 'coordinate_plane', 'ordered_pair_plot', 'measurement_conversion_table', 'volume_model', 'rectangular_prism_model', 'graph_interpretation', 'hierarchy_diagram', 'geometry_card_sort', 'angle_model', 'protractor_model', 'line_relationships', 'symmetry_model', 'comparison_model', 'factor_pair_model', 'multiples_chart', 'pattern_table', 'algorithm_steps', 'regrouping_model', 'estimation_number_line', 'partial_products_model', 'remainder_model', 'letter_card', 'sound_match', 'picture_choice', 'phonics_tiles', 'sound_boxes', 'syllable_break', 'word_card', 'sentence_card', 'number_sequence', 'number_line', 'number_line_0_120', 'comparison', 'comparison_cards', 'base_ten_blocks', 'place_value_chart', 'decimal_grid', 'expanded_form', 'addition_model', 'subtraction_model', 'number_bond', 'ten_frame', 'shape_identification', 'measurement_comparison', 'geometry_response', 'pattern_completion', 'sorting_visual', 'analog_clock', 'digital_time', 'time_matching', 'word_problem_model', 'bar_model', 'equation_builder', 'ruler', 'coin_model', 'money_counting', 'picture_graph', 'bar_graph', 'line_plot', 'data_table', 'partition_shapes', 'array_model', 'equal_groups', 'repeated_addition', 'multiplication_model', 'division_model', 'fact_family_model', 'multiplication_chart', 'skip_counting', 'operation_sort', 'rounding_model', 'fraction_bar', 'fraction_circle', 'fraction_area_model', 'fraction_division_model', 'word_sound_map', 'word_builder', 'word_family_sort', 'rhyme_match', 'sentence_highlight', 'phrase_builder', 'sentence_builder', 'short_passage', 'evidence_highlight', 'story_map', 'main_idea_web', 'detail_cards', 'picture_story', 'question_card', 'story_sequence', 'picture_order', 'event_cards', 'writing_checklist', 'opinion_reason_chart', 'paragraph_builder', 'fact_cards', 'topic_detail_chart', 'punctuation_marker', 'picture_prompt', 'detail_picker', 'word_parts', 'morpheme_tiles', 'context_sentence', 'vocabulary_match', 'word_scale', 'text_evidence_builder', 'character_trait_chart', 'theme_tracker', 'text_feature_map', 'fluency_meter', 'category_sort', 'elapsed_time_timeline', 'area_model', 'grid_model', 'perimeter_path', 'rectangle_model', 'attribute_sort', 'dialogue_builder', 'grammar_highlight', 'sentence_combiner', 'polygon_area_model', 'net_model', 'dot_plot', 'histogram', 'box_plot', 'statistics_summary', 'data_comparison_panel'];
  const REQUIRED_MINIMUMS={guided_practice:1,checkpoint:1,adaptive_question_bank:1};
  const LEVEL_BANK_STATUS_VALUES=['not_applicable','planned'];
  const AUDIO_TYPES=['letter_sound','word','sentence','instruction','phoneme','question'];
  const QUESTION_AUDIO_TYPES=['question'];
  const QUESTION_AUDIO_ALIAS_FIELDS=['question_audio_text','read_aloud_text','narration_text','question_speakable_text'];
  const PAGE_AUDIO_ALIAS_FIELDS=['page_audio_text','screen_audio_text','read_page_text','narration_text'];
  const PRONUNCIATION_CHECK_VALUES=['none','manual_playback','future_auto_check'];
  function ensureQuestionId(question,index,prefix){if(!question.question_id&&!question.id){question.question_id=`${prefix}_${index+1}`;} return question.question_id||question.id;}
  function has(o,k){return o&&o[k]!==undefined&&o[k]!==null&&o[k]!=='';}
  function lessonFallback(skillPackage,key){const lesson=skillPackage.lesson||{}; const worked=skillPackage.worked_examples||[]; const hint=(skillPackage.hint_ladder||[])[0]; const map={objective:lesson.objective||lesson.mini_lesson, key_vocabulary:lesson.key_vocabulary||['mission','model','answer'], concept_explanation:lesson.concept_explanation||lesson.mini_lesson||worked[0]?.text, visual_model:lesson.visual_model||skillPackage.guided_practice?.[0]?.visual_model, common_misconception:lesson.common_misconception||Object.values(skillPackage.misconception_bank||{})[0], real_world_connection:lesson.real_world_connection||lesson.story_mission||skillPackage.game_theme?.mission_intro, lesson_summary:lesson.lesson_summary||lesson.mini_lesson||worked[0]?.text}; return map[key]||hint;}
  function validateCachedAudioFields(audio,audioZone,errors){['audio_url','cache_key','voice'].forEach((k)=>{if(audio[k]!==undefined&&typeof audio[k]!=='string'){errors.push(`${audioZone}.${k} must be a string`);}}); if(audio.playback_preference!==undefined&&!['cached_audio_first','browser_speech_first'].includes(audio.playback_preference)){errors.push(`${audioZone}.playback_preference must be cached_audio_first or browser_speech_first`);}}
  function validatePageAudioSupport(item,zone,errors,warnings){if(!item||typeof item!=='object')return; const check=(audio,audioZone)=>{if(audio===undefined)return; if(typeof audio==='string')return; if(!audio||typeof audio!=='object'||Array.isArray(audio)){errors.push(`${audioZone} must be an object or string`); return;} if(audio.text!==undefined){if(!has(audio,'text')){errors.push(`${audioZone}.text is required when page audio is provided`);} if(audio.label!==undefined&&typeof audio.label!=='string'){errors.push(`${audioZone}.label must be a string`);} if(audio.type!==undefined&&audio.type!=='page'&&audio.type!=='instruction'){errors.push(`${audioZone}.type must be page or instruction`);} if(audio.repeat_count!==undefined&&(!Number.isInteger(Number(audio.repeat_count))||Number(audio.repeat_count)<1)){errors.push(`${audioZone}.repeat_count must be a positive integer`);} validateCachedAudioFields(audio,audioZone,errors); return;} Object.entries(audio).forEach(([key,value])=>check(value,`${audioZone}.${key}`));}; check(item.page_audio,`${zone}.page_audio`); check(item.screen_audio,`${zone}.screen_audio`); PAGE_AUDIO_ALIAS_FIELDS.forEach((k)=>{if(item[k]!==undefined&&typeof item[k]!== 'string'){errors.push(`${zone}.${k} must be a string`);}});}
  function validateAudioSupport(item,zone,errors,warnings){if(!item||typeof item!=='object')return; validatePageAudioSupport(item,zone,errors,warnings); const audio=item.audio; if(audio!==undefined){if(!audio||typeof audio!=='object'||Array.isArray(audio)){errors.push(`${zone}.audio must be an object`);} else {if(!has(audio,'text')){errors.push(`${zone}.audio.text is required when audio is provided`);} if(audio.type&&!AUDIO_TYPES.includes(audio.type)){errors.push(`${zone}.audio.type must be one of ${AUDIO_TYPES.join(', ')}`);} if(audio.repeat_count!==undefined&&(!Number.isInteger(Number(audio.repeat_count))||Number(audio.repeat_count)<1)){errors.push(`${zone}.audio.repeat_count must be a positive integer`);} validateCachedAudioFields(audio,`${zone}.audio`,errors);}} const questionAudio=item.question_audio; if(questionAudio!==undefined){if(!questionAudio||typeof questionAudio!=='object'||Array.isArray(questionAudio)){errors.push(`${zone}.question_audio must be an object`);} else {if(!has(questionAudio,'text')){errors.push(`${zone}.question_audio.text is required when question_audio is provided`);} if(questionAudio.type&&![...QUESTION_AUDIO_TYPES,'instruction'].includes(questionAudio.type)){errors.push(`${zone}.question_audio.type must be question or instruction`);} if(questionAudio.label!==undefined&&typeof questionAudio.label!=='string'){errors.push(`${zone}.question_audio.label must be a string`);} if(questionAudio.repeat_count!==undefined&&(!Number.isInteger(Number(questionAudio.repeat_count))||Number(questionAudio.repeat_count)<1)){errors.push(`${zone}.question_audio.repeat_count must be a positive integer`);} validateCachedAudioFields(questionAudio,`${zone}.question_audio`,errors);}} ['audio_text','audio_label','speakable_text','student_prompt'].forEach((k)=>{if(item[k]!==undefined&&typeof item[k]!=='string'){errors.push(`${zone}.${k} must be a string`);}}); QUESTION_AUDIO_ALIAS_FIELDS.forEach((k)=>{if(item[k]!==undefined&&typeof item[k]!=='string'){errors.push(`${zone}.${k} must be a string`);}}); if(item.repeat_after_me!==undefined&&typeof item.repeat_after_me!=='boolean'&&typeof item.repeat_after_me!=='string'){errors.push(`${zone}.repeat_after_me must be a boolean or prompt string`);} ['recordable','playback_enabled'].forEach((k)=>{if(item[k]!==undefined&&typeof item[k]!=='boolean'){errors.push(`${zone}.${k} must be a boolean`);}}); if(item.pronunciation_check!==undefined&&!PRONUNCIATION_CHECK_VALUES.includes(item.pronunciation_check)){errors.push(`${zone}.pronunciation_check must be one of ${PRONUNCIATION_CHECK_VALUES.join(', ')}`);} }
  function validateQuestion(q,i,zone,errors,warnings){ensureQuestionId(q,i,zone); validateAudioSupport(q,`${zone}[${i}]`,errors,warnings); if(!q.prompt){errors.push(`${zone}[${i}] missing prompt`);} if(!q.question_type){errors.push(`${zone}[${i}] missing question_type`);} if(q.question_type&&!QUESTION_TYPES.includes(q.question_type)){errors.push(`${zone}[${i}] invalid question_type`);} const visual=q.visual_model||q.support_type; if(!visual){errors.push(`${zone}[${i}] missing support_type or visual_model`);} else if(!VISUAL_MODELS.includes(visual)){warnings.push(`${zone}[${i}] visual renderer ${visual} uses fallback object renderer`);} if(!q.answer&&q.correct_answer===undefined){errors.push(`${zone}[${i}] missing correct_answer`);} if(q.question_type==='multiple_choice'&&!(Array.isArray(q.choices)||Array.isArray(q.options))){errors.push(`${zone}[${i}] multiple_choice missing choices/options`);} if(q.question_type!=='multiple_choice'&&!q.acceptable_answers&&q.correct_answer===undefined){errors.push(`${zone}[${i}] missing acceptable_answers or correct_answer`);} if(!q.hints&&!q.hint_ladder){warnings.push(`${zone}[${i}] using package hint ladder fallback`);} if(!q.misconception_tag){errors.push(`${zone}[${i}] missing misconception_tag`);} }
  function validateLevelBanks(skillPackage,errors,warnings,options={}){
    const status=skillPackage.level_banks_status;
    if(status&& !LEVEL_BANK_STATUS_VALUES.includes(status)){errors.push('level_banks_status must be not_applicable or planned');}
    if(status==='not_applicable'){return;}
    if(status==='planned'){
      if(options.allowPlannedLevelBanks===false){errors.push('level_banks_status planned is transitional and not allowed in strict production validation');}
      else{warnings.push('level_banks_status planned is transitional; production packages require level_banks'); return;}
    }
    if(!Array.isArray(skillPackage.level_banks)){errors.push('level_banks must exist for production packages unless level_banks_status is not_applicable'); return;}
    if(skillPackage.level_banks.length<5){errors.push('level_banks must include at least 4 focused levels plus one Mixed level');}
    const mixed=skillPackage.level_banks.filter((level)=>/(^|_)mixed$/i.test(String(level.level_id||''))||/^mixed$/i.test(String(level.label||'')));
    if(mixed.length<1){errors.push('level_banks must include a Mixed level');}
    const focused=skillPackage.level_banks.filter((level)=>!(/(^|_)mixed$/i.test(String(level.level_id||''))||/^mixed$/i.test(String(level.label||''))));
    if(focused.length<4){errors.push('level_banks must include at least 4 focused levels');}
    skillPackage.level_banks.forEach((level,levelIndex)=>{
      const zone=`level_banks[${levelIndex}]`;
      ['level_id','label','focus','difficulty','question_count_required','mastery_threshold'].forEach((k)=>{if(!has(level,k)){errors.push(`${zone} missing ${k}`);}});
      const isMixed=/(^|_)mixed$/i.test(String(level.level_id||''))||/^mixed$/i.test(String(level.label||''));
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
    validatePageAudioSupport(skillPackage,'skillPackage',errors,warnings); validateAudioSupport(skillPackage.lesson,'lesson',errors,warnings);
    if(!Array.isArray(skillPackage.worked_examples)||skillPackage.worked_examples.length<1){errors.push('missing worked_examples[0]');}
    (skillPackage.worked_examples||[]).forEach((example,i)=>validateAudioSupport(example,`worked_examples[${i}]`,errors,warnings));
    if(!(skillPackage.worked_examples?.[1]||skillPackage.guided_practice?.[0])){errors.push('missing guided demo source worked_examples[1] or guided_practice[0]');}
    Object.entries(REQUIRED_MINIMUMS).forEach(([zone,min])=>{if(!Array.isArray(skillPackage[zone])||skillPackage[zone].length<min){errors.push(`${zone} length must be >= ${min}`);}});
    if(!skillPackage.misconception_bank||typeof skillPackage.misconception_bank!=='object'){errors.push('missing misconception_bank');}
    ['guided_practice','adaptive_question_bank','checkpoint'].forEach((zone)=>{(skillPackage[zone]||[]).forEach((q,i)=>validateQuestion(q,i,zone,errors,warnings));});
    validateLevelBanks(skillPackage,errors,warnings,options);
    if(options.throwOnError&&errors.length){throw new Error(`SkillPackage validation failed for ${skillPackage.skill_id||'unknown'}: ${errors.join('; ')}`);} return {valid:errors.length===0,errors,warnings};
  }
  function validateQuestionTypes(questions) {
    const errors = [];
    const warnings = [];
    const list = Array.isArray(questions)
      ? questions
      : ['guided_practice', 'adaptive_question_bank', 'checkpoint', 'level_banks'].flatMap((zone) => {
          if (zone === 'level_banks') {
            return (questions?.level_banks || []).flatMap((level) => level.questions || []);
          }
          return questions?.[zone] || [];
        });
    list.forEach((q, i) => {
      if (!q?.question_type) {
        errors.push(`question[${i}] missing question_type`);
      } else if (!QUESTION_TYPES.includes(q.question_type)) {
        errors.push(`question[${i}] invalid question_type`);
      }
    });
    return {valid: errors.length === 0, errors, warnings};
  }
  return {QUESTION_TYPES,VISUAL_MODELS,REQUIRED_MINIMUMS,LEVEL_BANK_STATUS_VALUES,AUDIO_TYPES,QUESTION_AUDIO_TYPES,QUESTION_AUDIO_ALIAS_FIELDS,PAGE_AUDIO_ALIAS_FIELDS,PRONUNCIATION_CHECK_VALUES,validateSkillPackage,validateLevelBanks,validateQuestionTypes,ensureQuestionId};
});
