'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../..');
const planPath = path.join(root, 'curriculum-framework/plans/grade5-english-completion-plan.v1.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
const skillIds = plan.skills.map((entry) => entry.skill_id);

test('the authoritative Grade 5 English plan has only one package after G5E_WR_003', () => {
  const writingIndex = skillIds.indexOf('G5E_WR_003');

  assert.notEqual(writingIndex, -1);
  assert.deepEqual(skillIds.slice(writingIndex + 1), ['G5E_LANG_001']);
  assert.equal(new Set(skillIds).size, 10);
});

test('the sole remaining package points forward to Grade 6 rather than another Grade 5 package', () => {
  const languagePackage = JSON.parse(fs.readFileSync(
    path.join(root, 'public/gamehub/skill-world/content/G5E_LANG_001.skill-package.v1.json'),
    'utf8',
  ));

  assert.equal(languagePackage.skill_id, 'G5E_LANG_001');
  assert.equal(languagePackage.next_skill_id, 'G6E_LANG_001');
  assert.equal(languagePackage.remediation_skill_id, 'G5E_WR_003');
});
