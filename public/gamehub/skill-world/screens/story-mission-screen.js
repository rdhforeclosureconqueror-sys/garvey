(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldStoryMissionScreen=factory();}})(typeof self!=='undefined'?self:this,function(){
 return function renderStoryMissionScreen(skillPackage){return `<section><h2>Story Mission</h2><p>${skillPackage.lesson?.story_mission||'Start your mission.'}</p></section>`;};
});
