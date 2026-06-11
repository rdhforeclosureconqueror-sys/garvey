const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..', '..');
const gates = fs.readFileSync(path.join(root, 'public/gates.js'), 'utf8');
const youthRoutes = fs.readFileSync(path.join(root, 'server/youthDevelopmentRoutes.js'), 'utf8');
const hub = fs.readFileSync(path.join(root, 'public/gamehub/adaptive-v2-hub.html'), 'utf8');
const recognitionPilot = fs.readFileSync(path.join(root, 'public/gamehub/recognition-selection-pilot.html'), 'utf8');
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const manifestPath = path.join(contentDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const packageFiles = manifest.packages.map((file) => path.join(contentDir, file));

function readPackage(file) {
  return JSON.parse(fs.readFileSync(path.join(contentDir, file), 'utf8'));
}

function textBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `${start} exists`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `${end} exists after ${start}`);
  return source.slice(startIndex, endIndex);
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('parent dashboard button opens intended Adaptive Learning route', () => {
  assert.match(youthRoutes, /id="openAdaptiveV2HubBtn" href="\/gamehub\/adaptive-v2-hub\.html">Open Adaptive V2 Lesson Hub<\/a>/);
  assert.match(gates, /href="\/gamehub\/adaptive-v2-hub\.html">Open Adaptive V2 Lesson Hub<\/a>/);
});

test('initial Adaptive V2 hub is grade-selection only', () => {
  const bodyBeforeScript = hub.slice(0, hub.indexOf('<script>'));
  assert.match(bodyBeforeScript, /<h1 id="adaptiveTitle">Adaptive Learning<\/h1>/);
  assert.match(bodyBeforeScript, /<h2 id="gradeSelectTitle">Select Grade<\/h2>/);
  assert.match(hub, /const grades=\[1,2,3,4,5,6\]/);
  assert.match(hub, /data-grade="\$\{grade\}"/);
  assert.match(hub, />Grade \$\{grade\}<\/button>/);
  assert.doesNotMatch(bodyBeforeScript, /Start Lesson|Practice This Skill|Adaptive Assessment|Grade 1 Learning Hub|Math|English/);
});

test('initial hub source does not auto-render package, practice, assessment, or Grade 1 content', () => {
  assert.doesNotMatch(hub, /renderGrade\(1\)|selectGrade\(1\)|state=\{grade:1|Grade 1 lesson hub/i);
  assert.match(hub, /const state=\{grade:null,subject:null,packages:\[\],loaded:false\}/);
  assert.match(hub, /if\(!state\.grade\|\|!state\.subject\)/);
  assert.doesNotMatch(hub, /skillWorldMissionGrid|renderSkillWorldMissionGrid|pilotGrid|pilotSkills/);
});

test('selecting a grade reveals subject controls and keeps curriculum cards hidden until subject selection', () => {
  assert.match(hub, /function selectGrade\(grade\)/);
  assert.match(hub, /state\.subject=null/);
  assert.match(hub, /<h2 id="gradeTitle">Grade \$\{state\.grade\} Learning Hub<\/h2>/);
  assert.match(hub, /const subjects=\['Math','English'\]/);
  assert.match(hub, /hubMount\.innerHTML=`<section class="panel" id="subjectPanel"/);
  assert.match(hub, /const learningMarkup=state\.subject\?renderLearningMarkup\(\):''/);
});

test('grade and subject selection filters manifest packages correctly', () => {
  assert.match(hub, /pkg\.grade===state\.grade&&pkg\.subject===state\.subject/);
  const packages = manifest.packages.map(readPackage);
  const grade1English = packages.filter((pkg) => Number(pkg.grade) === 1 && pkg.subject === 'English');
  const grade1Math = packages.filter((pkg) => Number(pkg.grade) === 1 && pkg.subject === 'Math');
  const grade6English = packages.filter((pkg) => Number(pkg.grade) === 6 && pkg.subject === 'English');
  assert.equal(grade1English.length, 10);
  assert.equal(grade1Math.length, 11);
  assert.equal(grade6English.length, 10);
});

test('Adaptive Assessment appears before Lessons and builds a safe assessment URL', () => {
  const learningTemplate = textBetween(hub, 'return `<section class="panel" id="learningPanel"', '`;\n    }\n    function renderLearningPanel');
  assert.ok(learningTemplate.indexOf('Adaptive Assessment') < learningTemplate.indexOf('Lessons'));
  assert.match(hub, /function assessmentHref\(grade,subject\)\{ return `\/assessment-mvp\?grade=\$\{encodeURIComponent\(String\(grade\)\)\}&subject=\$\{encodeURIComponent\(subject\)\}`; \}/);
  assert.match(hub, /Start Grade \$\{escapeHtml\(state\.grade\)\} \$\{escapeHtml\(state\.subject\)\} Adaptive Assessment/);
  assert.match(hub, /will not auto-start/);
});

test('lesson cards use compact parent-facing actions and hide internal package IDs', () => {
  assert.match(hub, /function skillWorldHref\(packageId\)\{ return `\/skill-world\/\$\{encodeURIComponent\(packageId\)\}`; \}/);
  assert.match(hub, /function skillWorldDrillHref\(packageId\)\{ return `\/skill-world\/\$\{encodeURIComponent\(packageId\)\}\/drill`; \}/);
  assert.match(hub, /<h3>\$\{escapeHtml\(pkg\.title\)\}<\/h3>/);
  assert.match(hub, /Start Lesson/);
  assert.match(hub, /Practice This Skill/);
  const cardTemplate = textBetween(hub, 'function renderLessonCard(pkg)', 'function setPressed');
  assert.doesNotMatch(cardTemplate, /skill_id|data-skill-id|>\$\{escapeHtml\(pkg\.packageId\)\}</);
});

test('legacy pilot hub presentation and unfiltered Skill World Missions are absent', () => {
  for (const obsolete of [
    /Recognition \/ Selection Grade 1 pilot/,
    /Sound Safari/,
    /Blend Bridge/,
    /Word Rocket/,
    /Number Trail/,
    /Shape Scout/,
    /Data Detectives/,
    /<h2>Skill World Missions<\/h2>/,
  ]) {
    assert.doesNotMatch(hub, obsolete);
  }
  assert.match(recognitionPilot, /const PILOT_MAP=\{/);
});

test('Rite of Passage Adventures do not interrupt grade-to-subject selection', () => {
  assert.match(hub, /<h2 id="otherAdventuresTitle">Other Learning Adventures<\/h2>/);
  assert.ok(hub.indexOf('id="learningPanel"') < hub.indexOf('id="otherAdventures"'));
  assert.match(hub, /state\.subject\?renderLearningMarkup\(\):''/);
  assert.match(hub, /if\(!state\.grade\|\|!state\.subject\) return ''/);
});

test('mobile and accessibility contracts are present', () => {
  assert.match(hub, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(hub, /@media \(max-width:360px\)/);
  assert.match(hub, /min-height:44px/);
  assert.match(hub, /:focus-visible/);
  assert.match(hub, /aria-pressed="false"/);
  assert.match(hub, /aria-pressed="\$\{state\.subject===subject\}"/);
  assert.match(hub, /\.btn\[aria-pressed="true"\]::before\{content:'✓'/);
  assert.doesNotMatch(hub, /overflow-x:\s*scroll|white-space:\s*nowrap/);
});

test('production SkillPackages and manifest remain readable without hub-side mutations', () => {
  assert.equal(Array.isArray(manifest.packages), true);
  assert.equal(manifest.packages.length, packageFiles.length);
  assert.equal(new Set(manifest.packages).size, manifest.packages.length);
  assert.equal(packageFiles.every((file) => fs.existsSync(file) && sha256(file).length === 64), true);
  assert.doesNotMatch(hub, /writeFile|localStorage\.setItem\([^)]*skill-world|manifest\.packages\.push|\.skill-package\.v1\.json'\s*,/);
});
