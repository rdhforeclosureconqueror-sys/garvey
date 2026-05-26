import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fixturePath = path.join(root, 'public/gamehub/content/adaptive-v2/fixtures/phase-2-contract-examples.json');

const lessonRequired = [
  'schema_version',
  'lesson_package_id',
  'phase_id',
  'skill',
  'lesson_snippet',
  'worked_example',
  'hint_ladder',
  'guided_practice',
  'checkpoint_ref'
];

const checkpointRequired = ['schema_version', 'checkpoint_id', 'skill', 'questions', 'pass_threshold'];

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

function assertKeys(obj, required, label) {
  const missing = required.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new Error(`${label} missing required fields: ${missing.join(', ')}`);
  }
}

assertKeys(fixture.lesson_package_example, lessonRequired, 'lesson_package_example');
assertKeys(fixture.checkpoint_example, checkpointRequired, 'checkpoint_example');

console.log('Phase 2 contract fixture validation passed.');
