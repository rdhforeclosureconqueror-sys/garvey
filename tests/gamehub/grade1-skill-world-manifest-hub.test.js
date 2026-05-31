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
const requiredGrade1EnglishSkillIds = ['G1E_RF_001', 'G1E_RF_002', 'G1E_PH_001', 'G1E_PH_002', 'G1E_SW_001', 'G1E_FL_001', 'G1E_RC_001', 'G1E_RC_002', 'G1E_WR_001', 'G1E_WR_002'];
const requiredGrade1SkillIds = [...requiredGrade1MathSkillIds, ...requiredGrade1EnglishSkillIds];
const requiredGrade2SkillIds = ['G2E_RF_001', 'G2E_RF_002', 'G2E_FL_001', 'G2E_VOC_001', 'G2E_RC_001', 'G2E_RC_002', 'G2E_RC_003', 'G2E_WR_001', 'G2E_WR_002', 'G2E_WR_003', 'G2M_NS_001', 'G2M_PV_001', 'G2M_NS_002', 'G2M_OP_001', 'G2M_OP_002', 'G2M_OP_003', 'G2M_WP_001', 'G2M_MD_001', 'G2M_MD_002', 'G2M_MD_003', 'G2M_GM_001'];
const requiredGrade3EnglishSkillIds = ['G3E_RF_001'];
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
  const grade1Packages = packages.filter((pkg) => Number(pkg.grade) === 1);
  const packageIds = grade1Packages.map((pkg) => pkg.skill_id).sort();

  assert.deepEqual(packageIds, [...requiredGrade1SkillIds].sort());
  assert.equal(grade1Packages.length, 21);
  for (const pkg of grade1Packages) {
    assert.equal(pkg.grade, 1);
    assert.equal(Boolean(pkg.subject), true);
    assert.equal(Boolean(pkg.domain), true);
    assert.equal(Boolean(pkg.skill), true);
    assert.equal(`/skill-world/${pkg.skill_id}`, `/skill-world/${encodeURIComponent(pkg.skill_id)}`);
  }
});

test('Active Grade 1 packages expose real level banks for hub Practice This Skill buttons', () => {
  const packages = manifest.packages.map(readPackage).filter((pkg) => requiredGrade1SkillIds.includes(pkg.skill_id));

  assert.deepEqual(packages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade1SkillIds].sort());
  for (const pkg of packages) {
    assert.equal(pkg.level_banks_status, undefined);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.length >= 5, true);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
  }
});

test('Active Grade 1 Skill Practice Center questions expose read-aloud narration', () => {
  const packages = manifest.packages.map(readPackage).filter((pkg) => requiredGrade1SkillIds.includes(pkg.skill_id));

  assert.deepEqual(packages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade1SkillIds].sort());
  for (const pkg of packages) {
    const questions = pkg.level_banks.flatMap((level) => level.questions);
    assert.equal(questions.length > 0, true, `${pkg.skill_id} has Skill Practice Center questions`);
    assert.equal(questions.every((question) => question.question_audio?.text || question.read_aloud_text), true, `${pkg.skill_id} questions have question narration`);
  }
});

test('Adaptive Grade 1 hub loads package manifest and renders active Grade 1 Skill World buttons', () => {
  assert.match(hub, /skillWorldManifestUrl='\/gamehub\/skill-world\/content\/manifest\.json'/);
  assert.match(hub, /async function loadSkillWorldPackages\(\)/);
  assert.match(hub, /fetch\(`\/gamehub\/skill-world\/content\/\$\{file\}`\)/);
  assert.match(hub, /skill_id:pkg\.skill_id/);
  assert.match(hub, /grade:pkg\.grade/);
  assert.match(hub, /subject:pkg\.subject/);
  assert.match(hub, /domain:pkg\.domain/);
  assert.match(hub, /title:pkg\.skill/);
  assert.match(hub, /route:skillWorldHref\(pkg\.skill_id\)/);
  assert.match(hub, /packages\.filter\(\(pkg\)=>pkg\.skill_id&&pkg\.status==='active'\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /has_drill:Array\.isArray\(pkg\.level_banks\)&&pkg\.level_banks\.length>0/);
  assert.match(hub, /Practice This Skill/);
  assert.doesNotMatch(hub, /const grade1PlannedLessons=/);
  assert.doesNotMatch(hub, /function renderPlannedLesson/);
});

test('All Grade 1 English Skill World packages appear from manifest for the hub', () => {
  const packages = manifest.packages.map(readPackage);
  const englishPackages = packages.filter((pkg) => requiredGrade1EnglishSkillIds.includes(pkg.skill_id));
  assert.deepEqual(englishPackages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade1EnglishSkillIds].sort());
  for (const english of englishPackages) {
    assert.equal(english.grade, 1);
    assert.equal(english.subject, 'English');
    assert.equal(Array.isArray(english.level_banks), true);
    assert.equal(english.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(english.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(`/skill-world/${encodeURIComponent(english.skill_id)}/drill`, `/skill-world/${english.skill_id}/drill`);
  }
  assert.match(hub, /title:pkg\.skill/);
  assert.match(hub, /Grade \${escapeHtml\(pkg\.grade\)} · \${escapeHtml\(pkg\.subject\)} · \${escapeHtml\(pkg\.domain\)} · \${escapeHtml\(pkg\.skill_id\)}/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 2 Skill World packages appear from manifest for the hub', () => {
  const packages = manifest.packages.map(readPackage);
  const grade2Packages = packages.filter((pkg) => requiredGrade2SkillIds.includes(pkg.skill_id));
  assert.deepEqual(grade2Packages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade2SkillIds].sort());
  for (const g2 of grade2Packages) {
    assert.equal(g2.grade, 2);
    assert.equal(['Math', 'English'].includes(g2.subject), true);
    assert.equal(Array.isArray(g2.level_banks), true);
    assert.equal(g2.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g2.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g2.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g2.skill_id)}/drill`, `/skill-world/${g2.skill_id}/drill`);
  }
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_RF_001').subject, 'English');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_RF_001').domain, 'Reading Foundations');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_RF_001').skill, 'Advanced Phonics and Word Analysis');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_RF_002').skill, 'Prefixes, Suffixes, and Base Words');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_FL_001').skill, 'Grade 2 Sight Words and Fluency');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_VOC_001').skill, 'Vocabulary and Context Clues');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_RC_001').skill, 'Ask and Answer Questions About Text');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_RC_002').skill, 'Story Structure and Retelling');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_RC_003').skill, 'Main Idea and Key Details');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_WR_001').skill, 'Write Opinion Pieces');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_WR_002').skill, 'Write Informative/Explanatory Text');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2E_WR_003').skill, 'Narrative Writing With Sequence');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_RF_001')}/drill`, '/skill-world/G2E_RF_001/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_RF_002')}/drill`, '/skill-world/G2E_RF_002/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_FL_001')}/drill`, '/skill-world/G2E_FL_001/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_VOC_001')}/drill`, '/skill-world/G2E_VOC_001/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_RC_001')}/drill`, '/skill-world/G2E_RC_001/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_RC_002')}/drill`, '/skill-world/G2E_RC_002/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_RC_003')}/drill`, '/skill-world/G2E_RC_003/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_WR_001')}/drill`, '/skill-world/G2E_WR_001/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_WR_002')}/drill`, '/skill-world/G2E_WR_002/drill');
  assert.equal(`/skill-world/${encodeURIComponent('G2E_WR_003')}/drill`, '/skill-world/G2E_WR_003/drill');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_NS_001').domain, 'Number Sense / Base Ten');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_NS_001').skill, 'Count, Read, and Write Numbers to 1,000');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_NS_002').domain, 'Number and Operations in Base Ten');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_NS_002').skill, 'Compare Three-Digit Numbers');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_OP_001').skill, 'Add Within 100');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_OP_002').skill, 'Subtract Within 100');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_OP_003').skill, 'Fluency With Addition and Subtraction Within 20');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_WP_001').skill, 'Addition and Subtraction Word Problems');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_MD_001').skill, 'Measure Length');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_MD_002').skill, 'Time and Money');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_MD_003').skill, 'Data, Graphs, and Line Plots');
  assert.equal(grade2Packages.find((pkg) => pkg.skill_id === 'G2M_GM_001').skill, 'Shapes, Arrays, and Partitioning');
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.doesNotMatch(hub, /if\(g!==1\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
  assert.match(hub, /Grade \${escapeHtml\(pkg\.grade\)} · \${escapeHtml\(pkg\.subject\)} · \${escapeHtml\(pkg\.domain\)} · \${escapeHtml\(pkg\.skill_id\)}/);
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



test('Grade 3 English Skill World package appears from manifest for the hub', () => {
  assert.ok(manifest.packages.includes('G3E_RF_001.skill-package.v1.json'), 'manifest includes G3E_RF_001');
  const packages = manifest.packages.map(readPackage);
  const grade3EnglishPackages = packages.filter((pkg) => requiredGrade3EnglishSkillIds.includes(pkg.skill_id));
  assert.deepEqual(grade3EnglishPackages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade3EnglishSkillIds].sort());
  const g3e = grade3EnglishPackages.find((pkg) => pkg.skill_id === 'G3E_RF_001');
  assert.equal(g3e.grade, 3);
  assert.equal(g3e.subject, 'English');
  assert.equal(g3e.domain, 'Reading Foundations');
  assert.equal(g3e.skill, 'Multisyllable Word Reading and Advanced Phonics');
  assert.equal(Array.isArray(g3e.level_banks), true);
  assert.equal(g3e.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
  assert.equal(g3e.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
  assert.equal(g3e.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
  assert.equal(`/skill-world/${encodeURIComponent(g3e.skill_id)}/drill`, '/skill-world/G3E_RF_001/drill');
  assert.match(hub, /Grade \$\{escapeHtml\(pkg\.grade\)\} · \$\{escapeHtml\(pkg\.subject\)\} · \$\{escapeHtml\(pkg\.domain\)\} · \$\{escapeHtml\(pkg\.skill_id\)\}/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 3 Skill World packages appear from manifest for the hub', () => {
  const expectedGrade3 = new Map([
    ['G3M_MUL_001', { skill: 'Multiplication Foundations', domain: 'Operations and Algebraic Thinking' }],
    ['G3M_DIV_001', { skill: 'Division Foundations', domain: 'Operations and Algebraic Thinking' }],
    ['G3M_FACT_001', { skill: 'Multiplication and Division Fluency', domain: 'Operations and Algebraic Thinking' }],
    ['G3M_WP_001', { skill: 'Two-Step Word Problems', domain: 'Operations and Algebraic Thinking' }],
    ['G3M_PV_001', { skill: 'Place Value and Rounding to 1,000', domain: 'Number and Operations in Base Ten' }],
    ['G3M_FR_001', { skill: 'Fraction Foundations', domain: 'Number and Operations—Fractions' }],
    ['G3M_FR_002', { skill: 'Equivalent Fractions and Comparing Fractions', domain: 'Number and Operations—Fractions' }],
    ['G3M_MD_001', { skill: 'Time, Measurement, and Data', domain: 'Measurement and Data' }],
    ['G3M_GM_001', { skill: 'Area and Perimeter', domain: 'Measurement and Geometry' }],
    ['G3M_GM_002', { skill: 'Shapes, Attributes, and Partitioning', domain: 'Geometry' }]
  ]);
  for (const skillId of expectedGrade3.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  for (const [skillId, expected] of expectedGrade3.entries()) {
    const g3 = packages.find((pkg) => pkg.skill_id === skillId);
    assert.ok(g3, `${skillId} package loads from manifest`);
    assert.equal(g3.grade, 3);
    assert.equal(g3.subject, 'Math');
    assert.equal(g3.domain, expected.domain);
    assert.equal(g3.skill, expected.skill);
    assert.equal(Array.isArray(g3.level_banks), true);
    assert.equal(g3.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g3.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g3.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g3.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Grade \$\{escapeHtml\(pkg\.grade\)\} · \$\{escapeHtml\(pkg\.subject\)\} · \$\{escapeHtml\(pkg\.domain\)\} · \$\{escapeHtml\(pkg\.skill_id\)\}/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});
