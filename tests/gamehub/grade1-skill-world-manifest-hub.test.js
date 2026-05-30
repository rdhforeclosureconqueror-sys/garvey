const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const manifestPath = path.join(contentDir, 'manifest.json');
const hubPath = path.join(root, 'public/gamehub/adaptive-v2-hub.html');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const hub = fs.readFileSync(hubPath, 'utf8');
const packageFiles = fs.readdirSync(contentDir)
  .filter((file) => file.endsWith('.skill-package.v1.json'))
  .sort();
const requiredGrade1MathSkillIds = ['G1M_NS_001', 'G1M_NS_002', 'G1M_NS_003', 'G1M_PV_001', 'G1M_OP_001', 'G1M_OP_002', 'G1M_OP_003', 'G1M_GM_001', 'G1M_GM_002', 'G1M_DP_001', 'G1M_MD_TIME_001'];
const legacyPlaceholderTitles = [
  'Place value: tens and ones',
  'Letter sounds and blending',
  'Sight words and sentence reading',
  'Answer who/what/where questions',
  'Write a simple sentence'
];

function readPackage(file) {
  return JSON.parse(fs.readFileSync(path.join(contentDir, file), 'utf8'));
}

test('Skill World manifest includes every generated package file', () => {
  assert.deepEqual([...manifest.packages].sort(), packageFiles);
});

test('Grade 1 generated Skill World missions expose required hub fields', () => {
  const packages = manifest.packages.map(readPackage);
  const packageIds = packages.map((pkg) => pkg.skill_id).sort();

  assert.deepEqual(packageIds, [...requiredGrade1MathSkillIds].sort());
  assert.equal(packages.length, 11);
  for (const pkg of packages) {
    assert.equal(pkg.grade, 1);
    assert.equal(Boolean(pkg.subject), true);
    assert.equal(Boolean(pkg.domain), true);
    assert.equal(Boolean(pkg.skill), true);
    assert.equal(`/skill-world/${pkg.skill_id}`, `/skill-world/${encodeURIComponent(pkg.skill_id)}`);
  }
});


test('Active Grade 1 packages expose real level banks for hub Practice This Skill buttons', () => {
  const packages = manifest.packages.map(readPackage).filter((pkg) => requiredGrade1MathSkillIds.includes(pkg.skill_id));

  assert.deepEqual(packages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade1MathSkillIds].sort());
  for (const pkg of packages) {
    assert.equal(pkg.level_banks_status, undefined);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.length >= 5, true);
    assert.equal(pkg.level_banks.some((level) => /mixed/i.test(`${level.level_id} ${level.label}`)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
  }
});

test('Adaptive Grade 1 hub loads package manifest and renders only active Grade 1 Math Skill World buttons', () => {
  assert.match(hub, /skillWorldManifestUrl='\/gamehub\/skill-world\/content\/manifest\.json'/);
  assert.match(hub, /async function loadSkillWorldPackages\(\)/);
  assert.match(hub, /fetch\(`\/gamehub\/skill-world\/content\/\$\{file\}`\)/);
  assert.match(hub, /skill_id:pkg\.skill_id/);
  assert.match(hub, /grade:pkg\.grade/);
  assert.match(hub, /subject:pkg\.subject/);
  assert.match(hub, /domain:pkg\.domain/);
  assert.match(hub, /title:pkg\.skill/);
  assert.match(hub, /route:skillWorldHref\(pkg\.skill_id\)/);
  assert.match(hub, /packages\.filter\(\(pkg\)=>pkg\.skill_id&&Number\(pkg\.grade\)===1&&pkg\.subject==='Math'&&pkg\.status==='active'\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /has_drill:Array\.isArray\(pkg\.level_banks\)&&pkg\.level_banks\.length>0/);
  assert.match(hub, /Practice This Skill/);
  assert.doesNotMatch(hub, /const grade1PlannedLessons=/);
  assert.doesNotMatch(hub, /function renderPlannedLesson/);
});

test('Adaptive Grade 1 production hub hides legacy Math and English placeholder cards', () => {
  for (const title of legacyPlaceholderTitles) {
    assert.doesNotMatch(hub, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(hub, /<button class="btn"[^>]*>Coming Soon<\/button>/);
});

test('Adaptive Grade 1 hub routes generated missions to /skill-world/:skillId', () => {
  assert.match(hub, /function skillWorldHref\(skillId\)\{ return `\/skill-world\/\$\{encodeURIComponent\(skillId\)\}`; \}/);
  assert.match(hub, /function skillWorldDrillHref\(skillId\)\{ return `\/skill-world\/\$\{encodeURIComponent\(skillId\)\}\/drill`; \}/);
  assert.match(hub, /href="\$\{escapeHtml\(pkg\.route\)\}"/);
  assert.doesNotMatch(hub, /G1M_NS_002[^\n]*Start Skill World/);
  assert.doesNotMatch(hub, /G1M_PV_001[^\n]*Start Skill World/);
  assert.doesNotMatch(hub, /G1M_OP_003[^\n]*Start Skill World/);
  assert.doesNotMatch(hub, /G1M_DP_001[^\n]*Start Skill World/);
});
