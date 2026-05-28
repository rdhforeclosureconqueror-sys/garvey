(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillPackageSchema=factory();}})(typeof self!=='undefined'?self:this,function(){
  const QUESTION_TYPES=[
    'multiple_choice','short_response','visual_objects','number_sequence','number_line','comparison','base_ten_blocks','addition_model','subtraction_model','number_bond','shape_identification','measurement_comparison','pattern_completion','sorting_visual'
  ];
  return {QUESTION_TYPES};
});
