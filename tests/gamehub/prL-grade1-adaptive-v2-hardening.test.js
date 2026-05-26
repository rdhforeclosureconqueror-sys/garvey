const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../..');
const adaptive = fs.readFileSync(path.join(root, 'public/gamehub/adaptive_learning'), 'utf8');
const manifest = fs.readFileSync(path.join(root, 'public/gamehub/content/adaptive-v2/grades/grade1/grade1-artifact-manifest.v1.json'), 'utf8');

test('grade1 catalog uses explicit manifest and does not depend on directory listing', () => {
  assert.match(adaptive, /grade1-artifact-manifest\.v1\.json/);
  assert.doesNotMatch(adaptive, /matchAll\(\/href=/);
  const parsed = JSON.parse(manifest);
  assert.ok(parsed.subjects.math.skills.length > 0);
  assert.ok(parsed.subjects['reading-english'].skills.length > 0);
});

test('runtime shows visible retry/status messaging for failures', () => {
  assert.match(adaptive, /retry this page/i);
  assert.match(adaptive, /progress_save_failed|progress_load_failed/);
  assert.match(adaptive, /signals_unavailable/);
  assert.match(adaptive, /Voice fallback active/);
  assert.match(adaptive, /Checkpoint package unavailable right now/);
});
