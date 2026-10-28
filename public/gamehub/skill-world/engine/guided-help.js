/* Shared, non-spoiling guided help for Skill World. */
(function(root){
  'use strict';
  const escapeHtml=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const gcd=(a,b)=>b?gcd(b,a%b):a;
  function grade4MathExample(question){
    const id=String(question?.id||question?.question_id||'');
    const current=String(question?.correct_answer??question?.answer??'').trim().toLowerCase();
    const choose=(variants)=>variants.find((item)=>String(item.example_answer).toLowerCase()!==current)||variants[0];
    const examples={
      G4M_OA_001:[
        {example_answer:'3',title:'Four steps: multiplicative comparison',problem:'18 is how many times as many as 6?',steps:['Step 1 — Find the comparison: “how many times as many” asks for multiplication or division, not subtraction.','Step 2 — Write the relationship: 18 ÷ 6 = __.','Step 3 — Different example: 18 ÷ 6 = 3, because 6 × 3 = 18.','Step 4 — Use the same relationship on your question, then multiply back to check.']},
        {example_answer:'4',title:'Four steps: multiplicative comparison',problem:'20 is how many times as many as 5?',steps:['Step 1 — Find the comparison: “how many times as many” asks for multiplication or division, not subtraction.','Step 2 — Write the relationship: 20 ÷ 5 = __.','Step 3 — Different example: 20 ÷ 5 = 4, because 5 × 4 = 20.','Step 4 — Use the same relationship on your question, then multiply back to check.']}
      ],
      G4M_NBT_001:[
        {example_answer:'2',title:'Four steps: place value',problem:'In 572,406, what digit is in the thousands place?',steps:['Step 1 — Use the commas to separate the periods: 572 | 406.','Step 2 — Name the places from right to left: ones, tens, hundreds, thousands.','Step 3 — Different example: in 572,406 the thousands digit is 2.','Step 4 — Point to the requested place in your number, then say the digit and place aloud.']},
        {example_answer:'7',title:'Four steps: place value',problem:'In 781,302, what digit is in the hundred-thousands place?',steps:['Step 1 — Use the commas to separate the periods: 781 | 302.','Step 2 — Name the places from right to left: ones, tens, hundreds, thousands, ten-thousands, hundred-thousands.','Step 3 — Different example: in 781,302 the hundred-thousands digit is 7.','Step 4 — Point to the requested place in your number, then say the digit and place aloud.']}
      ],
      G4M_NBT_002:[
        {example_answer:'3,793',title:'Four steps: line up place values',problem:'Add 2,468 + 1,325.',steps:['Step 1 — Find the operation: this example uses addition.','Step 2 — Line up ones under ones, tens under tens, hundreds under hundreds, and thousands under thousands.','Step 3 — Different example: 2,468 + 1,325 = 3,793. Regroup only when a column makes ten or more.','Step 4 — Solve your columns from right to left and estimate to check that the size makes sense.']},
        {example_answer:'5,221',title:'Four steps: line up place values',problem:'Subtract 7,000 − 1,779.',steps:['Step 1 — Find the operation: this example uses subtraction.','Step 2 — Line up the place values before regrouping.','Step 3 — Different example: 7,000 − 1,779 = 5,221. Regroup across zeros one place at a time.','Step 4 — Solve your columns from right to left and estimate to check that the size makes sense.']}
      ],
      G4M_NBT_003:[
        {example_answer:'396',title:'Four steps: multiply with place value',problem:'Multiply 132 × 3.',steps:['Step 1 — Break 132 into 100 + 30 + 2.','Step 2 — Multiply each place by 3: 300, 90, and 6.','Step 3 — Different example: 132 × 3 = 300 + 90 + 6 = 396.','Step 4 — Use the same parts for your number, then add the partial products to check.']},
        {example_answer:'372',title:'Four steps: multiply with place value',problem:'Multiply 124 × 3.',steps:['Step 1 — Break 124 into 100 + 20 + 4.','Step 2 — Multiply each place by 3: 300, 60, and 12.','Step 3 — Different example: 124 × 3 = 300 + 60 + 12 = 372.','Step 4 — Use the same parts for your number, then add the partial products to check.']}
      ],
      G4M_NBT_004:[
        {example_answer:'21',title:'Four steps: division',problem:'Divide 84 ÷ 4.',steps:['Step 1 — Read division as equal groups: share 84 into 4 equal groups.','Step 2 — Use multiplication to help: ask what number times 4 makes 84.','Step 3 — Different example: 84 ÷ 4 = 21 because 4 × 21 = 84.','Step 4 — Divide your number, then multiply quotient × divisor to check the total.']},
        {example_answer:'23',title:'Four steps: division',problem:'Divide 92 ÷ 4.',steps:['Step 1 — Read division as equal groups: share 92 into 4 equal groups.','Step 2 — Use multiplication to help: ask what number times 4 makes 92.','Step 3 — Different example: 92 ÷ 4 = 23 because 4 × 23 = 92.','Step 4 — Divide your number, then multiply quotient × divisor to check the total.']}
      ],
      G4M_FR_001:[
        {example_answer:'6/10',title:'Four steps: equivalent fractions',problem:'Write an equivalent fraction for 3/5.',steps:['Step 1 — Keep the fraction’s value the same by changing the top and bottom together.','Step 2 — Choose one multiplier for both numbers.','Step 3 — Different example: 3/5 × 2/2 = 6/10.','Step 4 — Apply the same multiplier to your fraction and check that both parts changed together.']},
        {example_answer:'6/8',title:'Four steps: equivalent fractions',problem:'Write an equivalent fraction for 3/4.',steps:['Step 1 — Keep the fraction’s value the same by changing the top and bottom together.','Step 2 — Choose one multiplier for both numbers.','Step 3 — Different example: 3/4 × 2/2 = 6/8.','Step 4 — Apply the same multiplier to your fraction and check that both parts changed together.']}
      ],
      G4M_FR_003:[
        {example_answer:'3/6',title:'Four steps: a whole number times a fraction',problem:'What is 3 copies of 1/6?',steps:['Step 1 — Read “copies of” as multiplication.','Step 2 — Keep the denominator because the pieces stay sixths.','Step 3 — Different example: 3 × 1/6 = 3/6.','Step 4 — Multiply the numerator by the whole number in your question and check the denominator stays the same.']},
        {example_answer:'4/7',title:'Four steps: a whole number times a fraction',problem:'What is 4 copies of 1/7?',steps:['Step 1 — Read “copies of” as multiplication.','Step 2 — Keep the denominator because the pieces stay sevenths.','Step 3 — Different example: 4 × 1/7 = 4/7.','Step 4 — Multiply the numerator by the whole number in your question and check the denominator stays the same.']}
      ],
      G4M_MD_001:[
        {example_answer:'36',title:'Four steps: measurement conversion',problem:'Convert 3 feet to inches.',steps:['Step 1 — Find the unit relationship: 1 foot = 12 inches.','Step 2 — Write a multiplication equation for the number of feet.','Step 3 — Different example: 3 × 12 = 36, so 3 feet = 36 inches.','Step 4 — Use the correct conversion factor for your units and label the final measurement.']},
        {example_answer:'60',title:'Four steps: measurement conversion',problem:'Convert 5 feet to inches.',steps:['Step 1 — Find the unit relationship: 1 foot = 12 inches.','Step 2 — Write a multiplication equation for the number of feet.','Step 3 — Different example: 5 × 12 = 60, so 5 feet = 60 inches.','Step 4 — Use the correct conversion factor for your units and label the final measurement.']}
      ],
      G4M_GM_001:[
        {example_answer:'acute',title:'Four steps: geometry attributes',problem:'Which angle is 45 degrees: acute, right, or obtuse?',steps:['Step 1 — Identify the attribute the question gives you, such as sides, rays, or angle size.','Step 2 — Recall the rule: angles less than 90 degrees use one geometry word.','Step 3 — Different example: 45 degrees is acute because 45 is less than 90.','Step 4 — Compare the attribute in your question with the rule, then choose the matching geometry word.']},
        {example_answer:'right',title:'Four steps: geometry attributes',problem:'Which angle is 90 degrees: acute, right, or obtuse?',steps:['Step 1 — Identify the attribute the question gives you, such as sides, rays, or angle size.','Step 2 — Recall the rule: exactly 90 degrees uses one geometry word.','Step 3 — Different example: 90 degrees is a right angle.','Step 4 — Compare the attribute in your question with the rule, then choose the matching geometry word.']},
        {example_answer:'obtuse',title:'Four steps: geometry attributes',problem:'Which angle is 120 degrees: acute, right, or obtuse?',steps:['Step 1 — Identify the attribute the question gives you, such as sides, rays, or angle size.','Step 2 — Recall the rule: angles greater than 90 and less than 180 use one geometry word.','Step 3 — Different example: 120 degrees is obtuse.','Step 4 — Compare the attribute in your question with the rule, then choose the matching geometry word.']}
      ]
    };
    const variants=examples[Object.keys(examples).find((prefix)=>id.startsWith(prefix))];
    return variants?choose(variants):null;
  }
  function example(question){
    const prompt=String(question?.prompt||question?.question||'');
    const id=String(question?.id||question?.question_id||'');
    if(id.startsWith('G4M_')&&!id.startsWith('G4M_FR_002'))return grade4MathExample(question);
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
    return grade4MathExample(question);
  }
  function render(question){
    const ex=example(question);
    if(!ex)return '<div class="guided-help" role="region" aria-label="Guided help"><h3>How to work it out</h3><p>Read the question, identify the operation or relationship, and draw or label a model. Try a simpler, different problem using the same method. Then return to your question.</p></div>';
    const fractionRule=String(question?.id||question?.question_id||'').startsWith('G4M_FR_')?['Final fraction rule — Simplify the answer to lowest terms. Find the greatest common factor of the numerator and denominator, then divide both by it. Example: 3/6 ÷ 3/3 = 1/2.']:[];
    return `<div class="guided-help" role="region" aria-label="Guided worked example"><h3>${escapeHtml(ex.title)}</h3><p><strong>Example:</strong> ${escapeHtml(ex.problem)}</p><ol>${[...ex.steps,...fractionRule].map(step=>`<li><details><summary>Reveal step</summary><p>${escapeHtml(step)}</p></details></li>`).join('')}</ol><p><strong>Your turn:</strong> Apply the steps to the original question. The answer has not been revealed.</p></div>`;
  }
  root.SkillWorldGuidedHelp={example,render,grade4MathExample};
})(typeof window!=='undefined'?window:globalThis);
