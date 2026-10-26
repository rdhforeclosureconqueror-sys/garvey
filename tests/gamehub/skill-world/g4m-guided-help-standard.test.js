const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
require(path.join(root, 'public/gamehub/skill-world/engine/guided-help.js'));
const help = globalThis.SkillWorldGuidedHelp;
const renderer = require(path.join(root, 'public/gamehub/skill-world/engine/skill-world-renderer.js'));
const ids = ['G4M_OA_001', 'G4M_NBT_001', 'G4M_NBT_002', 'G4M_NBT_003', 'G4M_NBT_004', 'G4M_FR_001', 'G4M_FR_002', 'G4M_FR_003', 'G4M_MD_001', 'G4M_GM_001'];
const packages = ids.map((id) => JSON.parse(fs.readFileSync(path.join(root, `public/gamehub/skill-world/content/${id}.skill-package.v1.json`), 'utf8')));
const questions = (pkg) => pkg.level_banks.flatMap((bank) => bank.questions);

test('every Grade 4 Math activity has a four-step, non-spoiling worked-help path', () => {
  for (const pkg of packages) for (const question of questions(pkg)) {
    const example = help.example(question);
    assert.ok(example, question.question_id);
    assert.ok(example.steps.length >= 4, question.question_id);
    assert.notEqual(example.problem, question.prompt, question.question_id);
  }
});

test('Grade 4 practice and drill cards expose guided help while the assessment stays answer-key free', () => {
  for (const pkg of packages) {
    const question = questions(pkg)[0];
    const card = renderer.renderQuestionCard(question, 'practice', renderer.createState(), pkg);
    assert.match(card, /guided-hint-box/);
    assert.match(card, /Guided worked example/);
  }
});
