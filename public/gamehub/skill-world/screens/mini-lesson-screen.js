(function(root,factory){if(typeof module==='object'&&module.exports){module.exports=factory();}else{root.SkillWorldMiniLessonScreen=factory();}})(typeof self!=='undefined'?self:this,function(){
 return function renderMiniLessonScreen(skillPackage){return `<section><h2>Mini Lesson</h2><p>${skillPackage.lesson?.mini_lesson||'Let\'s learn together.'}</p></section>`;};
});
