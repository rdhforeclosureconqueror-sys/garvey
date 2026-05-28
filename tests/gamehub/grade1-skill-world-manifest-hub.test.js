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

function readPackage(file) {
  return JSON.parse(fs.readFileSync(path.join(contentDir, file), 'utf8'));
}

test('Skill World manifest includes every generated package file', () => {
  assert.deepEqual([...manifest.packages].sort(), packageFiles);
});

test('Grade 1 generated Skill World missions expose required hub fields', () => {
  const requiredSkillIds = ['G1M_NS_002', 'G1M_PV_001', 'G1M_OP_003', 'G1M_DP_001'];
  const packages = manifest.packages.map(readPackage);
  const packageIds = packages.map((pkg) => pkg.skill_id).sort();

  assert.deepEqual(packageIds, [...requiredSkillIds].sort());
  for (const pkg of packages) {
    assert.equal(pkg.grade, 1);
    assert.equal(Boolean(pkg.subject), true);
    assert.equal(Boolean(pkg.domain), true);
    assert.equal(Boolean(pkg.skill), true);
    assert.equal(`/skill-world/${pkg.skill_id}`, `/skill-world/${encodeURIComponent(pkg.skill_id)}`);
  }
});

test('Adaptive Grade 1 hub loads package manifest and renders Skill World buttons', () => {
  assert.match(hub, /skillWorldManifestUrl='\/gamehub\/skill-world\/content\/manifest\.json'/);
  assert.match(hub, /async function loadSkillWorldPackages\(\)/);
  assert.match(hub, /fetch\(`\/gamehub\/skill-world\/content\/\$\{file\}`\)/);
  assert.match(hub, /skill_id:pkg\.skill_id/);
  assert.match(hub, /grade:pkg\.grade/);
  assert.match(hub, /subject:pkg\.subject/);
  assert.match(hub, /domain:pkg\.domain/);
  assert.match(hub, /title:pkg\.skill/);
  assert.match(hub, /route:skillWorldHref\(pkg\.skill_id\)/);
  assert.match(hub, /Start Skill World/);
});

test('Adaptive Grade 1 hub routes generated missions to /skill-world/:skillId', () => {
  assert.match(hub, /function skillWorldHref\(skillId\)\{ return `\/skill-world\/\$\{encodeURIComponent\(skillId\)\}`; \}/);
  assert.match(hub, /href="\$\{escapeHtml\(pkg\.route\)\}"/);
  assert.doesNotMatch(hub, /G1M_NS_002[^\n]*Start Skill World/);
  assert.doesNotMatch(hub, /G1M_PV_001[^\n]*Start Skill World/);
  assert.doesNotMatch(hub, /G1M_OP_003[^\n]*Start Skill World/);
  assert.doesNotMatch(hub, /G1M_DP_001[^\n]*Start Skill World/);
});
