/* Shared, non-spoiling guided help for Skill World. */
(function(root){
  'use strict';
  const escapeHtml=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  function example(question){
    const prompt=String(question?.prompt||question?.question||'');
    if(/common denominator/i.test(prompt))return {title:'Find a common denominator in a different example',problem:'What common denominator works for 2/3 and 1/4?',steps:['Identify the task: find a denominator that both fractions can use.','List multiples of 3: 3, 6, 9, 12. List multiples of 4: 4, 8, 12.','Choose 12, the least common multiple of 3 and 4.','Rename 2/3 as 8/12 and 1/4 as 3/12.','Check that the renamed fractions keep their original values, then return to your question.']};
    const frac=prompt.match(/(\d+)\s*\/\s*(\d+)\s*([+−-])\s*(\d+)\s*\/\s*(\d+)/);
    if(frac){
      const add=frac[3]==='+';
      const same=(a,b,c,d)=>Number(frac[1])===a&&Number(frac[2])===b&&Number(frac[4])===c&&Number(frac[5])===d;
      const alternate=same(add?2:7,8,add?2:1,4);
      const secondAlternate=same(add?1:9,12,1,6);
      const a=secondAlternate?(add?3:11):(alternate?(add?1:9):(add?2:7)),b=secondAlternate?16:(alternate?12:8),c=secondAlternate?1:(alternate?1:(add?2:1)),d=secondAlternate?8:(alternate?6:4);
      const lcd=b*d/gcd(b,d),x=a*(lcd/b),y=c*(lcd/d),z=add?x+y:x-y;
      const divisor=gcd(Math.abs(z),lcd);
      return {title:'Try a different fraction problem',problem:`${a}/${b} ${add?'+':'−'} ${c}/${d}`,visual:{a,b,c,d,lcd,x,y,z,add},steps:[
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
  function fractionBar(n,d,label){
    if(!Number.isInteger(n)||!Number.isInteger(d)||d<1||d>48||n<0||n>d)return '';
    return '<div class="guided-fraction-row"><span>'+escapeHtml(label)+'</span><div style="display:flex;max-width:420px;gap:2px;margin:5px 0 12px" role="img" aria-label="'+escapeHtml(n+' of '+d+' equal parts shaded')+'">'+Array.from({length:d},(_,i)=>'<span style="flex:1;height:24px;min-width:3px;border:1px solid #64748b;border-radius:2px;background:'+(i<n?'#4f9ee5':'transparent')+'"></span>').join('')+'</div></div>';
  }
  function visualPractice(v){
    if(!v)return '';
    const bar=fractionBar(v.a,v.b,v.a+'/'+v.b)+fractionBar(v.c,v.d,v.c+'/'+v.d)+fractionBar(v.x,v.lcd,v.x+'/'+v.lcd)+fractionBar(v.y,v.lcd,v.y+'/'+v.lcd);
    return '<section class="guided-fraction-visual" aria-label="Visual fraction model"><h4>See why equivalent fractions work</h4><p>Each bar represents one whole. Splitting the same shaded amount into smaller equal pieces changes the number of pieces, not the amount.</p>'+bar+'<p><strong>Why multiply top and bottom?</strong> Every old piece is split into the same number of smaller pieces. The shaded amount stays equal.</p><label>Practice: What common denominator works for '+v.b+' and '+v.d+'? <input type="number" min="1" step="1" data-guided-answer="'+v.lcd+'" aria-label="Practice common denominator" style="width:90px;max-width:100%;margin:5px"></label><button type="button" data-guided-check="1">Check my thinking</button><p data-guided-feedback="1" role="status" aria-live="polite"></p></section>';
  }
  if(root.document&&!root.__skillGuidedPracticeBound){
    root.__skillGuidedPracticeBound=true;
    root.document.addEventListener('click',function(event){
      const button=event.target.closest('[data-guided-check]');
      if(!button)return;
      const section=button.closest('.guided-fraction-visual');
      if(!section)return;
      const input=section.querySelector('[data-guided-answer]');
      const feedback=section.querySelector('[data-guided-feedback]');
      const expected=Number(input.dataset.guidedAnswer),given=Number(input.value);
      feedback.textContent=input.value.trim()===''?'Enter a denominator to try.':Number.isInteger(given)&&given>0&&given%expected===0?'Great thinking! That denominator works. The smallest common denominator is '+expected+'.':'Good try! List multiples of each bottom number and find the first number in both lists.';
    });
  }
  function render(question){
    const ex=example(question);
    if(!ex)return '<div class="guided-help" role="region" aria-label="Guided help"><h3>How to work it out</h3><p>Read the question, identify the operation or relationship, and draw or label a model. Try a simpler, different problem using the same method. Then return to your question.</p></div>';
    return `<div class="guided-help" role="region" aria-label="Guided worked example"><h3>${escapeHtml(ex.title)}</h3><p><strong>Example:</strong> ${escapeHtml(ex.problem)}</p>${visualPractice(ex.visual)}<ol>${ex.steps.map(step=>`<li><details><summary>Reveal step</summary><p>${escapeHtml(step)}</p></details></li>`).join('')}</ol><p><strong>Your turn:</strong> Apply the steps to the original question. The answer has not been revealed.</p></div>`;
  }
  root.SkillWorldGuidedHelp={example,render};
})(typeof window!=='undefined'?window:globalThis);
