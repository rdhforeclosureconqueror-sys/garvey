const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');
const grade1CheckpointFiles = fs.readdirSync(path.join(root, 'public/gamehub/content/adaptive-v2/grades/grade1/math/skills'))
  .concat(fs.readdirSync(path.join(root, 'public/gamehub/content/adaptive-v2/grades/grade1/reading-english/skills')))
  .filter((f) => f.endsWith('.checkpoint.v1.json'))
  .map((f) => f.includes('g1m_')
    ? path.join(root, 'public/gamehub/content/adaptive-v2/grades/grade1/math/skills', f)
    : path.join(root, 'public/gamehub/content/adaptive-v2/grades/grade1/reading-english/skills', f));

test('checkpoint renderer shows multiple choice when choices/options exist', () => {
  assert.match(adaptive, /Array\.isArray\(currentQ\.choices\).*Array\.isArray\(currentQ\.options\)/);
  assert.match(adaptive, /type="radio" name="v2CheckpointChoice"/);
});

test('checkpoint submit checks selected choice value against answer', () => {
  assert.match(adaptive, /selectedChoiceEl=document\.querySelector\('input\[name="v2CheckpointChoice"\]:checked'\)/);
  assert.match(adaptive, /const val=\(selectedChoiceValue\|\|\(input\?\.value\|\|''\)\)\.trim\(\)/);
  assert.match(adaptive, /String\(val\)\.toLowerCase\(\)===String\(currentQ\.answer\)\.toLowerCase\(\)/);
});

test('typed answer fallback still exists when no choices/options are present', () => {
  assert.match(adaptive, /<input id="v2CheckpointAnswer" placeholder="Type answer"/);
});

test('checkpoint persistence stores aggregate correctness only', () => {
  assert.match(adaptive, /persistGrade1V2Progress\(\{checkpointId:currentQ\?\.id\|\|`q_\$\{cpIdx\+1\}`,isCorrect:correct\}\)/);
  assert.doesNotMatch(adaptive, /persistGrade1V2Progress\([^\)]*(answer|selectedChoice|raw)/i);
});

test('all Grade 1 checkpoint questions include choices/options with unique entries and one correct answer', () => {
  grade1CheckpointFiles.forEach((file) => {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    (parsed.questions || []).forEach((q) => {
      const opts = Array.isArray(q.choices) ? q.choices : q.options;
      assert.ok(Array.isArray(opts) && opts.length >= 3 && opts.length <= 4, `${file} ${q.question_id} missing 3-4 options`);
      assert.equal(new Set(opts).size, opts.length, `${file} ${q.question_id} has duplicate options`);
      assert.equal(opts.filter((x) => String(x) === String(q.answer)).length, 1, `${file} ${q.question_id} should include correct answer exactly once`);
      assert.equal(q.generated_options, true, `${file} ${q.question_id} should include generated_options metadata`);
      assert.equal(q.option_generation_source, 'grade1_checkpoint_backfill', `${file} ${q.question_id} should include source metadata`);
    });
  });
});
