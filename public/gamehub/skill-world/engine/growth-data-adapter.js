(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.GrowthDataAdapter=factory();}})(typeof self!=='undefined'?self:this,function(){
  function key(skillId,learnerId){return `skillworld:growth:${learnerId}:${skillId}`;}
  return {
    saveGrowthData(payload){if(typeof localStorage==='undefined') return false; localStorage.setItem(key(payload.skill_id,payload.learner_id),JSON.stringify(payload)); return true;},
    loadGrowthData(skillId,learnerId){if(typeof localStorage==='undefined') return null; const raw=localStorage.getItem(key(skillId,learnerId)); return raw?JSON.parse(raw):null;}
  };
});
