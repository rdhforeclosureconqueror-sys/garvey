import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const lessonDirs = [
  'public/gamehub/content/adaptive-v2/grades/grade1/math/skills',
  'public/gamehub/content/adaptive-v2/grades/grade1/reading-english/skills'
];
const index = JSON.parse(fs.readFileSync('public/gamehub/content/adaptive-v2/manifests/curriculum-index.v1.json','utf8'));
const mathGraph = JSON.parse(fs.readFileSync('curriculum-framework/skill-graphs/grade1/math/graph.v1.json','utf8'));
const readGraph = JSON.parse(fs.readFileSync('curriculum-framework/skill-graphs/grade1/reading-english/graph.v1.json','utf8'));
const graphCodes = new Set([...mathGraph.domains.flatMap(d=>d.skills.map(s=>s.code)), ...readGraph.domains.flatMap(d=>d.skills.map(s=>s.code))]);

const reqLesson = ['schema_version','lesson_package_id','phase_id','grade','subject','domain','skill','lesson_snippet','worked_example','hint_ladder','guided_practice','checkpoint_ref','next_practice_recommendation','mastery_support_metadata','source_metadata'];
const reqCheckpoint = ['schema_version','checkpoint_id','skill','questions','pass_threshold','feedback_rules','pathway_recommendation','source_metadata'];
let errors=[]; let rows=[];

for (const dir of lessonDirs) {
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir,f);
    if (f.endsWith('.lesson-package.v1.json')) {
      const d=JSON.parse(fs.readFileSync(fp,'utf8'));
      reqLesson.forEach(k=>{if(!(k in d)) errors.push(`${f}: missing ${k}`)});
      const cp=path.join(dir,f.replace('.lesson-package.v1.json','.checkpoint.v1.json'));
      if(!fs.existsSync(cp)) errors.push(`${f}: missing checkpoint pair`);
      const sourceFound = index.entries.some(e=>e.source_file===d.source_metadata.source_file);
      if(!sourceFound) errors.push(`${f}: source file not in curriculum index`);
      const graphMatch = graphCodes.has(d.lesson_package_id.split('_LP1')[0]);
      rows.push({artifact:'lesson_package',file:path.relative(ROOT,fp),skill_code:d.lesson_package_id.split('_LP1')[0],needs_review:!graphMatch,validation_status:'pass'});
    }
    if (f.endsWith('.checkpoint.v1.json')) {
      const d=JSON.parse(fs.readFileSync(fp,'utf8'));
      reqCheckpoint.forEach(k=>{if(!(k in d)) errors.push(`${f}: missing ${k}`)});
      rows.push({artifact:'checkpoint',file:path.relative(ROOT,fp),skill_code:d.checkpoint_id.split('_CP1')[0],needs_review:true,validation_status:'pass'});
    }
  }
}

const report={schema_version:'v1',grade:'grade1',phases:['phase-7a','phase-7b'],generated_at:new Date().toISOString(),validation_status:errors.length?'fail':'pass',errors,needs_review_count:rows.length,entries:rows};
fs.writeFileSync('public/gamehub/content/adaptive-v2/grades/grade1/conversion-report.v1.json',JSON.stringify(report,null,2)+'\n');


if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`validated ${rows.length} artifacts`);
