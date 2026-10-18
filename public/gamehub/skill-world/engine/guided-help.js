/* Shared, non-spoiling guided help for Skill World. */
(function(root){
  'use strict';
  const escapeHtml=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  function example(question){
    const prompt=String(question?.prompt||question?.question||'');
    const frac=prompt.match(/(\d+)\s*\/\s*(\d+)\s*([+−-])\s*(\d+)\s*\/\s*(\d+)/);
    if(frac){
      const add=frac[3]==='+', a=add?2:5,b=8,c=add?2:1,d=4;
      const lcd=b*d/gcd(b,d),x=a*(lcd/b),y=c*(lcd/d),z=add?x+y:x-y;
      const divisor=gcd(Math.abs(z),lcd);
      return {title:'Try a different fraction problem',problem:`${a}/${b} ${add?'+':'−'} ${c}/${d}`,steps:[
        `Identify the operation: ${add?'addition':'subtraction'}. The denominators tell us the sizes of the pieces.`,
        `Find a common denominator: ${b} and ${d} both divide evenly into ${lcd}.`,
        `Rename the fractions without changing their values: ${a}/${b} = ${x}/${lcd} and ${c}/${d} = ${y}/${lcd}.`,
        `Now ${add?'add':'subtract'} the numerators: ${x} ${add?'+':'−'} ${y} = ${z}. Keep the denominator ${lcd}.`,
        `Check and simplify: ${z}/${lcd}${divisor>1?` = ${z/divisor}/${lcd/divisor}`:''}. Return to your question and repeat these steps.`
      ]};
    }
    const compare=/compar|greater|less than|order|<|>/.test(prompt.toLowerCase());
    const equivalent=/equivalent|same value|equal fraction/.test(prompt.toLowerCase());
    if(compare)return {title:'Practice comparing different fractions',problem:'Compare 2/3 and 3/4',steps:['Identify the task: compare the size of two fractions.','Choose a common denominator: 12 works for 3 and 4.','Rename: 2/3 = 8/12 and 3/4 = 9/12.','Compare the numerators: 8 is less than 9, so 2/3 < 3/4.','Use the same method on your own question.']};
    if(equivalent)return {title:'Practice with a different equivalent fraction',problem:'Find an equivalent fraction for 2/3',steps:['Identify the task: make a fraction with the same value.','Choose the same multiplier for the top and bottom, such as 2.','Multiply the numerator: 2 × 2 = 4.','Multiply the denominator: 3 × 2 = 6.','So 2/3 = 4/6. Try this method on your question.']};
    return null;
  }
  function render(question){
    const ex=example(question);
    if(!ex)return '<div class="guided-help" role="region" aria-label="Guided help"><h3>How to work it out</h3><p>Read the question, identify the operation or relationship, and draw or label a model. Try a simpler, different problem using the same method. Then return to your question.</p></div>';
    return `<div class="guided-help" role="region" aria-label="Guided worked example"><h3>${escapeHtml(ex.title)}</h3><p><strong>Example:</strong> ${escapeHtml(ex.problem)}</p><ol>${ex.steps.map(step=>`<li><details><summary>Reveal step</summary><p>${escapeHtml(step)}</p></details></li>`).join('')}</ol><p><strong>Your turn:</strong> Apply the steps to the original question. The answer has not been revealed.</p></div>`;
  }
  root.SkillWorldGuidedHelp={example,render};
})(typeof window!=='undefined'?window:globalThis);
