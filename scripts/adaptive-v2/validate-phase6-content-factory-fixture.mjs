import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fixturePath = path.join(root, 'public/gamehub/content/adaptive-v2/fixtures/phase-6-content-factory-example.json');

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(fixture.source_intake?.phase_id, 'Missing source_intake.phase_id');
assert(fixture.source_intake?.source_file, 'Missing source_intake.source_file');
assert(fixture.normalization?.routing?.grade, 'Missing normalization.routing.grade');
assert(fixture.normalization?.routing?.subject, 'Missing normalization.routing.subject');
assert(fixture.normalization?.routing?.skill, 'Missing normalization.routing.skill');
assert(fixture.normalization?.deterministic_seed, 'Missing normalization.deterministic_seed');
assert(fixture.generated?.lesson_package?.lesson_package_id, 'Missing generated.lesson_package.lesson_package_id');
assert(fixture.generated?.checkpoint?.checkpoint_id, 'Missing generated.checkpoint.checkpoint_id');
assert(Array.isArray(fixture.validation?.review_flags), 'validation.review_flags must be an array');

console.log('Phase 6 content-factory fixture validation passed.');
