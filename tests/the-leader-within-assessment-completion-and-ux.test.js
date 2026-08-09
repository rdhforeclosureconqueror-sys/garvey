'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const db=fs.readFileSync('server/leaderWithinDb.js','utf8');
const service=fs.readFileSync('server/leaderWithinService.js','utf8');
const routes=fs.readFileSync('server/leaderWithinRoutes.js','utf8');
const ui=fs.readFileSync('public/the-leader-within/assessment.js','utf8');
const css=fs.readFileSync('public/the-leader-within/assessment.css','utf8');

test('snapshot migration preserves legacy users FK and adds canonical participant FK',()=>{
 assert.match(db,/participant_id INTEGER REFERENCES users\(id\)/);
 assert.match(db,/ADD COLUMN IF NOT EXISTS leader_within_participant_id INTEGER REFERENCES leader_within_participants\(id\)/);
 assert.match(service,/INSERT INTO leader_within_assessment_snapshots \(participant_id,leader_within_participant_id/);
 assert.match(service,/VALUES \(NULL,\$1/);
});
test('completion is transactional, owned, idempotent, and returns a safe failure',()=>{
 assert.match(service,/SELECT id,answers,status,bank_id[\s\S]*participant_id=\$2 FOR UPDATE/);
 assert.match(service,/await client\.query\("BEGIN"\)/);assert.match(service,/await client\.query\("COMMIT"\)/);assert.match(service,/await client\.query\("ROLLBACK"\)/);
 assert.match(service,/assessment_completion_failed/);assert.match(service,/Your answers are still saved/);
 assert.doesNotMatch(routes.slice(routes.indexOf("assessment/complete")),/constraint name|violates foreign key/);
});
test('assessment renders one accessible question at a time with review and durable saves',()=>{
 assert.match(routes,/assessmentData/);assert.doesNotMatch(routes,/const qs=d\.questions\.map/);
 assert.match(ui,/renderQuestion/);assert.match(ui,/fieldset/);assert.match(ui,/Review Answers/);
 assert.match(ui,/assessment\/progress/);assert.match(routes,/Save and Exit/);
 assert.match(css,/min-height:58px/);assert.match(css,/prefers-reduced-motion/);
});
test('all five neutral engagement checkpoints are present',()=>{
 for(const n of [5,10,15,20,25]) assert.match(ui,new RegExp(`${n}:`));
 assert.match(ui,/direction and goals/);assert.match(ui,/structure or support/);assert.match(ui,/people and changing situations/);assert.match(ui,/pressure rises or plans change/);assert.match(ui,/ready to be discovered/);
 assert.doesNotMatch(ui,/your score is|your archetype is|right answer/i);
});
test('assessment contrast and control states remain accessible',()=>{
 assert.match(css,/--assessment-primary:#17213b/);
 assert.match(css,/\.question-card legend\{color:var\(--assessment-primary\)/);
 assert.match(css,/\.choice\{[^}]*color:var\(--assessment-primary\)/);
 assert.match(css,/\.progress-copy\{[^}]*color:var\(--assessment-secondary\)/);
 assert.match(css,/\.choice\.selected::after\{content:'✓'/);
 assert.match(css,/\.assessment-actions \.btn:disabled\{/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(routes,/id="continueButton" type="button" disabled/);
 assert.match(routes,/id="saveExitButton"[^>]*>Save and Exit/);
 assert.match(routes,/Your progress will be saved\./);
 assert.match(routes,/role="progressbar"[^>]*aria-valuemin="1"[^>]*aria-valuemax="\$\{d\.question_count\}"[^>]*aria-valuenow="1"/);
});
test('radio cards and navigation update without changing assessment answers',()=>{
 assert.match(ui,/<label class="choice/);
 assert.match(ui,/type="radio" name="answer"/);
 assert.match(ui,/class="choice-text"/);
 assert.match(ui,/next\.disabled=!answers\[q\.question_id\]/);
 assert.match(ui,/back\.disabled=index===0/);
 assert.match(ui,/next\.disabled=false/);
 assert.match(ui,/classList\.toggle\('selected'/);
 assert.match(ui,/if\(index>0\)\{index--;renderQuestion\(\);\}/);
});
test('canonical youth bank and existing scoring engine remain selected',()=>{
 assert.match(service,/leadership\.youth\.bank1\.js/);assert.match(service,/bankId:"AUTHORED_BANK_1"/);assert.match(service,/scoreEngineAssessment\("leadership",answers/);
 assert.match(service,/content_variant:"youth"/);assert.match(service,/audience:"youth"/);
});
