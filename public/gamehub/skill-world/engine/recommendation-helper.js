(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.getRecommendedNextSkill=factory();}})(typeof self!=='undefined'?self:this,function(){
return function getRecommendedNextSkill(growthData,skillPackage){
 const accuracy=Number(growthData&&growthData.accuracy_percent||0);
 const threshold=Number(skillPackage&&skillPackage.mastery_threshold||80);
 const misconceptions=Array.isArray(growthData&&growthData.misconception_watch)?growthData.misconception_watch:[];
 const passed=accuracy>=threshold;
 const recommended=passed?skillPackage.next_skill_id:(skillPackage.remediation_skill_id||skillPackage.skill_id);
 const reteach_notes=misconceptions.length?misconceptions.map((m)=>`Reteach: ${m}`).join('; '):'';
 return {recommended_next_skill:recommended,mastery_status:passed?'mastered':'review',reteach_notes};
};
});
