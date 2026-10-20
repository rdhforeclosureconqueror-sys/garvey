/* Shared, non-spoiling guided help for Skill World. */
(function(root){
  'use strict';
  const escapeHtml=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  function example(question){
    const prompt=String(question?.prompt||question?.question||'');
    if(String(question?.id||question?.question_id||'').startsWith('G5M_OA_001')){
      const id=String(question.id||question.question_id||'');
      const level=Number((id.match(/_L([1-5])_/)||[])[1])||(/MIXED/.test(id)?5:1);
      const examples={
        1:{title:'🟣 Write a numerical expression',problem:'Four teams each collect 2 red and 5 blue tokens. Write the total as an expression.',steps:['🟣 Find the groups: each team has 2 + 5 tokens, and there are 4 teams.','🔵 Put the amount for ONE team in parentheses: (2 + 5). Parentheses mean do this part first.','🟢 Multiply by the number of teams: (2 + 5) × 4. This describes the situation without mixing up the order.','🎯 Now use the numbers and grouping from YOUR question; do not copy the example.']},
        2:{title:'🔵 Evaluate an expression',problem:'Evaluate (3 + 2) × 4.',steps:['🟣 Find the parentheses: 3 + 2 = 5.','🔵 Replace the grouped part with its value: 5 × 4.','🟢 Multiply: 5 × 4 = 20. If there were no parentheses, multiplication would come before addition.','🎯 In your problem, solve parentheses first, then multiplication or division, then addition or subtraction.']},
        3:{title:'🟣 Discover the pattern rule',problem:'A machine adds 4 to every input: 1 → 5, 2 → 6, 3 → 7.',steps:['🟣 Compare each input and output: 5 − 1 = 4, 6 − 2 = 4, 7 − 3 = 4.','🔵 Write a rule: output = input + 4.','🟢 Test the rule on another input: 6 + 4 = 10. It must work on EVERY row.','🎯 Find a rule that works for all rows of your own pattern.']},
        4:{title:'📍 Read coordinates (x, y)',problem:'Plot the point (4, 2) on a coordinate grid.',steps:['🟣 Start at the origin (0, 0). The first number is x: move 4 units RIGHT.','🔵 The second number is y: move 2 units UP.','🟢 Mark the intersection. Say it aloud: x first, y second — (4, 2).','🎯 On your graph, count across for x and then up for y. The example point is different from your question.']},
        5:{title:'🌟 Choose the correct strategy',problem:'A pattern starts at 3 and adds 5 each time. Find the next terms.',steps:['🟣 Identify the task: this is a pattern, not an ordered pair or expression to evaluate.','🔵 Apply the same rule each time: 3 → 8 → 13 → 18.','🟢 Check consecutive differences: 8 − 3 = 5 and 13 − 8 = 5.','🎯 For your question, first choose expression, calculation, pattern, or coordinates; then use its matching rule.']}
      };
      const result=examples[level];
      if(level===1 && /evaluate/i.test(prompt))return examples[2];
      if(/ordered pair|coordinate|plott?ed point|x\\s*=|y\\s*=/i.test(prompt))return examples[4];
      if(/pattern|sequence|input|output|rule table/i.test(prompt))return examples[3];
      if(/equivalent expression/i.test(prompt))return {title:'🔵 Equivalent expressions',problem:'Compare 3 × (2 + 4) and 3 × 2 + 3 × 4.',steps:['🟣 Find the grouping: 2 + 4 = 6.','🔵 First expression: 3 × 6 = 18.','🟢 Second expression: 6 + 12 = 18. They are equivalent because they always have the same value. This is the distributive property: a × (b + c) = a × b + a × c.','🎯 Check your own expressions with a different example before deciding.']};
      return result;
    }
    if(String(question?.id||question?.question_id||'').startsWith('G4M_FR_002')){
      const mixed=prompt.match(/(\d+)\s+(\d+)\s*\/\s*(\d+)\s*([+−-])\s*(\d+)\s*\/\s*(\d+)/);
      if(mixed && Number(mixed[3])===Number(mixed[6])){
        const add=mixed[4]==='+';const carry=add && Number(mixed[2])+Number(mixed[5])>=Number(mixed[3]);const d=[4,5,6,8].find(n=>n!==Number(mixed[3]))||10;
        return {title:'Four steps: mixed numbers',problem:carry?`2 ${d-1}/${d} + 2/${d}`:`2 1/${d} ${add?'+':'−'} 1/${d}`,steps:[
          'Step 1 — Identify the whole-number part and the fraction part. A mixed number contains both.',
          `Step 2 — Rule: with equal denominators, combine the numerators and keep the denominator. For subtraction, take away the numerator; regroup a whole if needed.`,
          carry?`Step 3 — Different example: 2 ${d-1}/${d} + 2/${d} = 2 ${d+1}/${d} = 3 1/${d}. Trade ${d}/${d} for one whole and add it to the whole-number part.`:`Step 3 — Different example: 2 1/${d} ${add?'+':'−'} 1/${d} = ${add?'2 2/'+d:'2'}. Keep the whole-number part and check whether regrouping is needed.`,
          'Step 4 — Draw whole bars and fraction pieces; check the size and simplify before returning to your question.'
        ]};
      }
      const pieces=[...prompt.matchAll(/(\d+)\s*\/\s*(\d+)/g)];
      if(pieces.length>=2 && Number(pieces[0][2])===Number(pieces[1][2]) && !/[+−-]\s*\d+\s*\/\s*\d+/.test(prompt)){
        const subtract=/subtract|left|remain|difference|gave away|how much more|how many more|how much less|than/i.test(prompt);const d=[4,5,6,8].find(n=>n!==Number(pieces[0][2]))||10;
        const storyMixed=/\d+\s+\d+\s*\/\s*\d+/.test(prompt);
        if(storyMixed)return {title:'Four steps: mixed-number stories',problem:subtract?`A rope is 2 3/${d} meters long; cut away 1/${d} meter. What remains?`:`A runner travels 2 1/${d} miles and then 2/${d} mile. How far?`,steps:[
          'Step 1 — Identify the whole number and fractional parts in the story; decide whether to add or subtract.',
          `Step 2 — Keep the whole part, then ${subtract?'subtract':'add'} the fraction numerators because the denominators match. Regroup if a fraction reaches one whole.`,
          `Step 3 — Different example: ${subtract?`2 3/${d} − 1/${d} = 2 2/${d}`:`2 1/${d} + 2/${d} = 2 3/${d}`}.`,
          'Step 4 — Check the whole and fractional parts against a bar model; label the answer with the story unit.'
        ]};
        return {title:'Four steps: fraction word problems',problem:subtract?`A ribbon is 3/${d} meter long. Cut off 1/${d} meter. How much remains?`:`A runner travels 1/${d} mile and then 2/${d} mile. How far in all?`,steps:[
          `Step 1 — Find what the story asks. Words like “in all” suggest addition; “left” or “gave away” suggest subtraction. This example uses ${subtract?'subtraction':'addition'}.`,
          `Step 2 — Write the formula: ${subtract?'a/c − b/c = (a − b)/c':'a/c + b/c = (a + b)/c'}. Keep the equal denominator.`,
          `Step 3 — Solve this DIFFERENT story: ${subtract?`3/${d} − 1/${d} = 2/${d}`:`1/${d} + 2/${d} = 3/${d}`}.`,
          'Step 4 — Label the answer with the story unit, check the fraction model, and apply the same method to your question.'
        ]};
      }
    }
    if(/common denominator/i.test(prompt))return {title:'Find a common denominator in a different example',problem:'What common denominator works for 2/3 and 1/4?',steps:['Identify the task: find a denominator that both fractions can use.','List multiples of 3: 3, 6, 9, 12. List multiples of 4: 4, 8, 12.','Choose 12, the least common multiple of 3 and 4.','Rename 2/3 as 8/12 and 1/4 as 3/12.','Check that the renamed fractions keep their original values, then return to your question.']};
    const frac=prompt.match(/(\d+)\s*\/\s*(\d+)\s*([+−-])\s*(\d+)\s*\/\s*(\d+)/);
    if(frac && Number(frac[2])===Number(frac[5])){
      const add=frac[3]==='+';
      const originalDenominator=Number(frac[2]);
      const originalA=Number(frac[1]),originalB=Number(frac[4]);
      const denominator=[5,6,8,10,12].find(d=>d!==originalDenominator)||7;
      const a=add?2:4,b=add?1:2;
      const result=add?a+b:a-b;
      return {title:'Four steps: fractions with like denominators',problem:`${a}/${denominator} ${add?'+':'−'} ${b}/${denominator}`,steps:[
        `Step 1 — Identify the operation: ${add?'addition':'subtraction'}. Both denominators are ${denominator}, so the pieces are the same size.`,
        `Step 2 — Learn the rule: ${add?'a/c + b/c = (a + b)/c':'a/c − b/c = (a − b)/c'}. Keep the denominator; never ${add?'add':'subtract'} the denominators.`,
        `Step 3 — Work this DIFFERENT example: ${a} ${add?'+':'−'} ${b} = ${result}, so the example becomes ${result}/${denominator}.`,
        'Step 4 — Check: shade the parts in a fraction bar, simplify if possible, then use the same four steps on your own question.'
      ]};
    }
    if(frac){
      const add=frac[3]==='+';
      const same=(a,b,c,d)=>Number(frac[1])===a&&Number(frac[2])===b&&Number(frac[4])===c&&Number(frac[5])===d;
      const alternate=same(add?2:7,8,add?2:1,4);
      const secondAlternate=same(add?1:9,12,1,6);
      const a=secondAlternate?(add?3:11):(alternate?(add?1:9):(add?2:7)),b=secondAlternate?16:(alternate?12:8),c=secondAlternate?1:(alternate?1:(add?2:1)),d=secondAlternate?8:(alternate?6:4);
      const lcd=b*d/gcd(b,d),x=a*(lcd/b),y=c*(lcd/d),z=add?x+y:x-y;
      const divisor=gcd(Math.abs(z),lcd);
      const multiples=(n)=>Array.from({length:Math.max(2,Math.min(5,lcd/n))},(_,i)=>n*(i+1)).join(', ');
      const factorA=lcd/b,factorB=lcd/d;
      return {title:'Try a different fraction problem',problem:`${a}/${b} ${add?'+':'−'} ${c}/${d}`,steps:[
        `Step 1 — Identify ${add?'addition':'subtraction'}. Different-sized fraction pieces must be renamed to equal-sized pieces before calculating.`,
        `Step 2 — Find the least common denominator (LCD) by listing multiples. Multiples of ${b}: ${multiples(b)}${lcd/b>5?', …, '+lcd:''}. Multiples of ${d}: ${multiples(d)}${lcd/d>5?', …, '+lcd:''}. The first shared multiple is ${lcd}.`,
        `Step 3 — Find each conversion factor by dividing the LCD by the original denominator: ${lcd} ÷ ${b} = ${factorA} and ${lcd} ÷ ${d} = ${factorB}. Multiply the numerator AND denominator by the same factor: ${a}/${b} × ${factorA}/${factorA} = ${x}/${lcd}; ${c}/${d} × ${factorB}/${factorB} = ${y}/${lcd}. Each factor/factor equals 1, so the amounts do not change.`,
        `Step 4 — Now the pieces are equal-sized. ${add?'Add':'Subtract'} the numerators: ${x} ${add?'+':'−'} ${y} = ${z}; keep denominator ${lcd}, giving ${z}/${lcd}.`,
        `Step 5 — Check the fraction-bar model and simplify when possible: ${z}/${lcd}${divisor>1?` = ${z/divisor}/${lcd/divisor}`:''}. Apply the same formula to your own question.`
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
