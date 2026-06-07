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
const requiredGrade3EnglishSkillIds = ['G3E_RF_001', 'G3E_FL_001', 'G3E_VOC_001', 'G3E_RC_001', 'G3E_RC_002', 'G3E_RC_003', 'G3E_WR_001', 'G3E_WR_002', 'G3E_WR_003', 'G3E_LANG_001'];
const requiredGrade4EnglishFinalSkillIds = ['G4E_WR_001', 'G4E_WR_002', 'G4E_WR_003', 'G4E_LANG_001'];
const requiredGrade5EnglishProofSkillIds = ['G5E_RF_001', 'G5E_FL_001', 'G5E_RC_001', 'G5E_VOC_001'];
const requiredGrade5EnglishBatch1SkillIds = ['G5E_RC_002', 'G5E_RC_003', 'G5E_WR_001'];
const requiredGrade5EnglishFinalSkillIds = ['G5E_WR_002', 'G5E_WR_003', 'G5E_LANG_001'];
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

test('Grade 1 Math guided missions expose tutor-quality page narration from manifest packages', () => {
  const packages = manifest.packages.map(readPackage).filter((pkg) => requiredGrade1MathSkillIds.includes(pkg.skill_id));
  const screens = ['story', 'lesson', 'watch', 'demo', 'practice', 'challenge', 'checkpoint', 'badge', 'profile'];

  assert.deepEqual(packages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade1MathSkillIds].sort());
  for (const pkg of packages) {
    for (const screen of screens) {
      const narration = pkg.page_audio?.[screen]?.text || '';
      assert.equal(pkg.page_audio?.[screen]?.label, 'Read This Page', `${pkg.skill_id} ${screen} uses Read This Page label`);
      assert.equal(narration.split(/[.!?]+/).filter((sentence) => sentence.trim()).length >= 3, true, `${pkg.skill_id} ${screen} narration teaches the page`);
      assert.match(narration, /(Press Start Mission|Press Next|Choose your answer|Use the hint|Answer carefully|go back to the hub)/i, `${pkg.skill_id} ${screen} narration includes a next action`);
    }
    assert.match(pkg.page_audio.watch.text, /Step one[\s\S]*Step two[\s\S]*Step three[\s\S]*(final answer|answer is)/i, `${pkg.skill_id} worked example narration includes steps and an answer`);
    for (const screen of ['practice', 'challenge', 'checkpoint']) {
      assert.match(pkg.page_audio[screen].text, /Read Question/, `${pkg.skill_id} ${screen} narration preserves Read Question guidance`);
    }
  }
  assert.match(packages.find((pkg) => pkg.skill_id === 'G1M_DP_001').page_audio.watch.text, /sorting[\s\S]*color[\s\S]*red ball[\s\S]*red cube[\s\S]*model/i);
});

test('Grade 1 English guided missions expose tutor-quality page narration from manifest packages', () => {
  const packages = manifest.packages.map(readPackage).filter((pkg) => requiredGrade1EnglishSkillIds.includes(pkg.skill_id));
  const screens = ['story', 'lesson', 'watch', 'demo', 'practice', 'challenge', 'checkpoint', 'badge', 'profile'];
  const weakPageNarrationPattern = /^(This is (the )?(lesson|challenge|checkpoint|practice zone|guided demo)|Watch this example\. The model shows one way to think|Great work\. This badge celebrates)/i;

  assert.deepEqual(packages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade1EnglishSkillIds].sort());
  for (const pkg of packages) {
    for (const screen of screens) {
      const narration = pkg.page_audio?.[screen]?.text || '';
      assert.equal(pkg.page_audio?.[screen]?.label, 'Read This Page', `${pkg.skill_id} ${screen} uses Read This Page label`);
      assert.equal(narration.split(/[.!?]+/).filter((sentence) => sentence.trim()).length >= 3, true, `${pkg.skill_id} ${screen} narration teaches the page`);
      assert.equal(narration.length >= 140, true, `${pkg.skill_id} ${screen} narration is not placeholder text`);
      assert.doesNotMatch(narration, weakPageNarrationPattern, `${pkg.skill_id} ${screen} narration avoids weak placeholder text`);
      assert.match(narration, /(read|listen|sound|word|sentence|story|picture|write|skill)/i, `${pkg.skill_id} ${screen} narration describes the English skill`);
      assert.match(narration, /(Press Start Mission|Press Next|Choose your answer|Use the hint|Answer carefully|go back to the hub)/i, `${pkg.skill_id} ${screen} narration includes a next action`);
    }
    for (const screen of ['practice', 'challenge', 'checkpoint']) {
      assert.match(pkg.page_audio[screen].text, /Read Question/, `${pkg.skill_id} ${screen} narration preserves Read Question guidance`);
    }
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


test('Grade 5 English Batch 1 packages display from manifest in the hub', () => {
  const packages = manifest.packages.map(readPackage);
  const grade5Batch = packages.filter((pkg) => requiredGrade5EnglishBatch1SkillIds.includes(pkg.skill_id));
  assert.deepEqual(grade5Batch.map((pkg) => pkg.skill_id).sort(), [...requiredGrade5EnglishBatch1SkillIds].sort());
  for (const pkg of grade5Batch) {
    assert.equal(pkg.grade, 5);
    assert.equal(pkg.subject, 'English');
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.length, 5);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}`, `/skill-world/${pkg.skill_id}`);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${pkg.skill_id}/drill`);
  }
  assert.equal(grade5Batch.find((pkg) => pkg.skill_id === 'G5E_RC_002').skill, 'Theme, Character, and Story Structure');
  assert.equal(grade5Batch.find((pkg) => pkg.skill_id === 'G5E_RC_003').skill, 'Main Idea, Text Structure, and Integrating Information');
  assert.equal(grade5Batch.find((pkg) => pkg.skill_id === 'G5E_WR_001').skill, 'Opinion Writing With Reasons and Evidence');
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});


test('Final Grade 5 English writing and language packages display from manifest in the hub', () => {
  const expected = new Map([
    ['G5E_WR_002', { skill: 'Informative Writing With Facts, Definitions, and Details', domain: 'Writing / Composition' }],
    ['G5E_WR_003', { skill: 'Narrative Writing With Dialogue, Description, and Pacing', domain: 'Writing / Composition' }],
    ['G5E_LANG_001', { skill: 'Grammar, Conventions, and Sentence Combining', domain: 'Language' }]
  ]);
  for (const skillId of requiredGrade5EnglishFinalSkillIds) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  const finalGrade5English = packages.filter((pkg) => requiredGrade5EnglishFinalSkillIds.includes(pkg.skill_id));
  assert.deepEqual(finalGrade5English.map((pkg) => pkg.skill_id).sort(), [...requiredGrade5EnglishFinalSkillIds].sort());
  for (const pkg of finalGrade5English) {
    const details = expected.get(pkg.skill_id);
    assert.equal(pkg.grade, 5);
    assert.equal(pkg.subject, 'English');
    assert.equal(pkg.domain, details.domain);
    assert.equal(pkg.skill, details.skill);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.length, 5);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}`, `/skill-world/${pkg.skill_id}`);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${pkg.skill_id}/drill`);
    assert.equal(pkg.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${pkg.skill_id} practice questions have Read Question narration`);
  }
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
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
  for (const skillId of requiredGrade3EnglishSkillIds) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  const grade3EnglishPackages = packages.filter((pkg) => requiredGrade3EnglishSkillIds.includes(pkg.skill_id));
  assert.deepEqual(grade3EnglishPackages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade3EnglishSkillIds].sort());
  const expected = new Map([
    ['G3E_RF_001', { domain: 'Reading Foundations', skill: 'Multisyllable Word Reading and Advanced Phonics' }],
    ['G3E_FL_001', { domain: 'Fluency', skill: 'Reading Fluency and Expression' }],
    ['G3E_VOC_001', { domain: 'Vocabulary / Language', skill: 'Vocabulary, Context Clues, and Word Relationships' }],
    ['G3E_RC_001', { domain: 'Reading Comprehension', skill: 'Ask and Answer Questions With Text Evidence' }],
    ['G3E_RC_002', { domain: 'Reading Literature', skill: 'Story Elements, Theme, and Character Response' }],
    ['G3E_RC_003', { domain: 'Reading Informational Text', skill: 'Main Idea, Key Details, and Text Features' }],
    ['G3E_WR_001', { domain: 'Writing / Composition', skill: 'Opinion Writing With Reasons' }],
    ['G3E_WR_002', { domain: 'Writing / Composition', skill: 'Informative Writing With Facts and Details' }],
    ['G3E_WR_003', { domain: 'Writing / Composition', skill: 'Narrative Writing With Dialogue and Sequence' }],
    ['G3E_LANG_001', { domain: 'Language', skill: 'Grammar, Conventions, and Sentence Combining' }]
  ]);
  for (const [skillId, details] of expected.entries()) {
    const g3e = grade3EnglishPackages.find((pkg) => pkg.skill_id === skillId);
    assert.ok(g3e, `${skillId} package loads from manifest`);
    assert.equal(g3e.grade, 3);
    assert.equal(g3e.subject, 'English');
    assert.equal(g3e.domain, details.domain);
    assert.equal(g3e.skill, details.skill);
    assert.equal(Array.isArray(g3e.level_banks), true);
    assert.equal(g3e.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g3e.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g3e.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g3e.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
  }
  assert.match(hub, /Grade \$\{escapeHtml\(pkg\.grade\)\} · \$\{escapeHtml\(pkg\.subject\)\} · \$\{escapeHtml\(pkg\.domain\)\} · \$\{escapeHtml\(pkg\.skill_id\)\}/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Final Grade 4 English writing and language packages appear from manifest for the hub', () => {
  const expected = new Map([
    ['G4E_WR_001', { domain: 'Writing / Composition', skill: 'Opinion Writing With Reasons and Evidence' }],
    ['G4E_WR_002', { domain: 'Writing / Composition', skill: 'Informative Writing With Facts and Details' }],
    ['G4E_WR_003', { domain: 'Writing / Composition', skill: 'Narrative Writing With Dialogue and Description' }],
    ['G4E_LANG_001', { domain: 'Language', skill: 'Grammar, Conventions, and Sentence Combining' }]
  ]);
  for (const skillId of requiredGrade4EnglishFinalSkillIds) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  const finalGrade4EnglishPackages = packages.filter((pkg) => requiredGrade4EnglishFinalSkillIds.includes(pkg.skill_id));
  assert.deepEqual(finalGrade4EnglishPackages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade4EnglishFinalSkillIds].sort());
  for (const [skillId, details] of expected.entries()) {
    const pkg = finalGrade4EnglishPackages.find((item) => item.skill_id === skillId);
    assert.ok(pkg, `${skillId} package loads from manifest`);
    assert.equal(pkg.grade, 4);
    assert.equal(pkg.subject, 'English');
    assert.equal(pkg.domain, details.domain);
    assert.equal(pkg.skill, details.skill);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(pkg.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${skillId} practice questions have Read Question narration`);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
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

test('Grade 4 Math Place Value Skill World package appears from manifest for the hub', () => {
  assert.ok(manifest.packages.includes('G4M_NBT_001.skill-package.v1.json'), 'manifest includes G4M_NBT_001');
  const packages = manifest.packages.map(readPackage);
  const g4 = packages.find((pkg) => pkg.skill_id === 'G4M_NBT_001');
  assert.ok(g4, 'G4M_NBT_001 package loads from manifest');
  assert.equal(g4.grade, 4);
  assert.equal(g4.subject, 'Math');
  assert.equal(g4.domain, 'Number and Operations in Base Ten');
  assert.equal(g4.skill, 'Place Value to 1,000,000');
  assert.equal(Array.isArray(g4.level_banks), true);
  assert.equal(g4.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length >= 4, true);
  assert.equal(g4.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
  assert.equal(g4.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
  assert.equal(`/skill-world/${encodeURIComponent(g4.skill_id)}/drill`, '/skill-world/G4M_NBT_001/drill');
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /title:pkg\.skill/);
  assert.match(hub, /Grade \$\{escapeHtml\(pkg\.grade\)\} · \$\{escapeHtml\(pkg\.subject\)\} · \$\{escapeHtml\(pkg\.domain\)\} · \$\{escapeHtml\(pkg\.skill_id\)\}/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 5 Math decimal place value Skill World package appears from manifest for the hub', () => {
  assert.ok(manifest.packages.includes('G5M_NBT_001.skill-package.v1.json'), 'manifest includes G5M_NBT_001');
  const packages = manifest.packages.map(readPackage);
  const g5 = packages.find((pkg) => pkg.skill_id === 'G5M_NBT_001');
  assert.ok(g5, 'G5M_NBT_001 package loads from manifest');
  assert.equal(g5.grade, 5);
  assert.equal(g5.subject, 'Math');
  assert.equal(g5.domain, 'Number and Operations in Base Ten');
  assert.equal(g5.skill, 'Place Value With Decimals');
  assert.equal(Array.isArray(g5.level_banks), true);
  assert.equal(g5.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
  assert.equal(g5.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
  assert.equal(g5.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
  assert.equal(`/skill-world/${encodeURIComponent(g5.skill_id)}/drill`, '/skill-world/G5M_NBT_001/drill');
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /title:pkg\.skill/);
  assert.match(hub, /Grade \$\{escapeHtml\(pkg\.grade\)\} · \$\{escapeHtml\(pkg\.subject\)\} · \$\{escapeHtml\(pkg\.domain\)\} · \$\{escapeHtml\(pkg\.skill_id\)\}/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 4 operations and base-ten Skill World packages appear from manifest for the hub', () => {
  const expectedGrade4 = new Map([
    ['G4M_OA_001', { skill: 'Multiplicative Comparison and Patterns', domain: 'Operations and Algebraic Thinking' }],
    ['G4M_NBT_002', { skill: 'Multi-Digit Addition and Subtraction', domain: 'Number and Operations in Base Ten' }],
    ['G4M_NBT_003', { skill: 'Multi-Digit Multiplication', domain: 'Number and Operations in Base Ten' }]
  ]);
  for (const skillId of expectedGrade4.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  for (const [skillId, expected] of expectedGrade4.entries()) {
    const g4 = packages.find((pkg) => pkg.skill_id === skillId);
    assert.ok(g4, `${skillId} package loads from manifest`);
    assert.equal(g4.grade, 4);
    assert.equal(g4.subject, 'Math');
    assert.equal(g4.domain, expected.domain);
    assert.equal(g4.skill, expected.skill);
    assert.equal(Array.isArray(g4.level_banks), true);
    assert.equal(g4.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g4.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g4.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g4.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 4 division and fractions Skill World packages appear from manifest for the hub', () => {
  const expectedGrade4 = new Map([
    ['G4M_NBT_004', { skill: 'Division With Remainders', domain: 'Number and Operations in Base Ten' }],
    ['G4M_FR_001', { skill: 'Fraction Equivalence and Ordering', domain: 'Number and Operations—Fractions' }],
    ['G4M_FR_002', { skill: 'Add and Subtract Fractions', domain: 'Number and Operations—Fractions' }],
    ['G4M_FR_003', { skill: 'Multiply Fractions by Whole Numbers', domain: 'Number and Operations—Fractions' }],
    ['G4M_MD_001', { skill: 'Measurement Conversion and Data', domain: 'Measurement and Data' }],
    ['G4M_GM_001', { skill: 'Angles, Lines, and Shape Classification', domain: 'Geometry' }]
  ]);
  for (const skillId of expectedGrade4.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  for (const [skillId, expected] of expectedGrade4.entries()) {
    const g4 = packages.find((pkg) => pkg.skill_id === skillId);
    assert.ok(g4, `${skillId} package loads from manifest`);
    assert.equal(g4.grade, 4);
    assert.equal(g4.subject, 'Math');
    assert.equal(g4.domain, expected.domain);
    assert.equal(g4.skill, expected.skill);
    assert.equal(Array.isArray(g4.level_banks), true);
    assert.equal(g4.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g4.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g4.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g4.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
    assert.equal(g4.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${skillId} practice questions have Read Question narration`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 5 operations and decimal Skill World packages appear from manifest for the hub', () => {
  const expectedGrade5 = new Map([
    ['G5M_OA_001', { skill: 'Expressions, Patterns, and the Coordinate Plane', domain: 'Operations and Algebraic Thinking / Geometry' }],
    ['G5M_NBT_002', { skill: 'Multi-Digit Whole Number Operations', domain: 'Number and Operations in Base Ten' }],
    ['G5M_NBT_003', { skill: 'Decimal Operations', domain: 'Number and Operations in Base Ten' }]
  ]);
  for (const skillId of expectedGrade5.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  for (const [skillId, expected] of expectedGrade5.entries()) {
    const g5 = packages.find((pkg) => pkg.skill_id === skillId);
    assert.ok(g5, `${skillId} package loads from manifest`);
    assert.equal(g5.grade, 5);
    assert.equal(g5.subject, 'Math');
    assert.equal(g5.domain, expected.domain);
    assert.equal(g5.skill, expected.skill);
    assert.equal(Array.isArray(g5.level_banks), true);
    assert.equal(g5.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g5.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g5.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g5.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
    assert.equal(g5.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${skillId} practice questions have Read Question narration`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 5 fraction Skill World packages appear from manifest for the hub', () => {
  const expectedGrade5 = new Map([
    ['G5M_FR_001', { skill: 'Add and Subtract Fractions With Unlike Denominators', domain: 'Number and Operations—Fractions' }],
    ['G5M_FR_002', { skill: 'Multiply Fractions', domain: 'Number and Operations—Fractions' }],
    ['G5M_FR_003', { skill: 'Divide Unit Fractions and Whole Numbers', domain: 'Number and Operations—Fractions' }]
  ]);
  for (const skillId of expectedGrade5.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  for (const [skillId, expected] of expectedGrade5.entries()) {
    const g5 = packages.find((pkg) => pkg.skill_id === skillId);
    assert.ok(g5, `${skillId} package loads from manifest`);
    assert.equal(g5.grade, 5);
    assert.equal(g5.subject, 'Math');
    assert.equal(g5.domain, expected.domain);
    assert.equal(g5.skill, expected.skill);
    assert.equal(Array.isArray(g5.level_banks), true);
    assert.equal(g5.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g5.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g5.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g5.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
    assert.equal(g5.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${skillId} practice questions have Read Question narration`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Final Grade 5 measurement/data and geometry Skill World packages appear from manifest for the hub', () => {
  const expected = new Map([
    ['G5M_MD_001', { skill: 'Measurement Conversion, Volume, and Data', domain: 'Measurement and Data' }],
    ['G5M_GM_001', { skill: 'Coordinate Plane and Graphing', domain: 'Geometry' }],
    ['G5M_GM_002', { skill: 'Classify Two-Dimensional Figures', domain: 'Geometry' }]
  ]);
  for (const skillId of expected.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  for (const [skillId, details] of expected.entries()) {
    const pkg = packages.find((item) => item.skill_id === skillId);
    assert.ok(pkg, `${skillId} package loads from manifest`);
    assert.equal(pkg.grade, 5);
    assert.equal(pkg.subject, 'Math');
    assert.equal(pkg.domain, details.domain);
    assert.equal(pkg.skill, details.skill);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
  }
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 6 Math ratios and unit rates package appears from manifest for the hub', () => {
  assert.ok(manifest.packages.includes('G6M_RP_001.skill-package.v1.json'), 'manifest includes G6M_RP_001');
  const pkg = readPackage('G6M_RP_001.skill-package.v1.json');
  assert.equal(pkg.skill, 'Ratios and Unit Rates');
  assert.equal(pkg.grade, 6);
  assert.equal(pkg.subject, 'Math');
  assert.equal(pkg.domain, 'Ratios and Proportional Relationships');
  assert.equal(Array.isArray(pkg.level_banks), true);
  assert.equal(pkg.level_banks.length >= 5, true);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
  assert.match(hub, /Grade \$\{escapeHtml\(pkg\.grade\)\} · \$\{escapeHtml\(pkg\.subject\)\} · \$\{escapeHtml\(pkg\.domain\)\} · \$\{escapeHtml\(pkg\.skill_id\)\}/);
  assert.equal(`/skill-world/${encodeURIComponent('G6M_RP_001')}/drill`, '/skill-world/G6M_RP_001/drill');
});

test('Grade 6 Number System Skill World packages appear from manifest for the hub', () => {
  const skillIds = ['G6M_NS_001', 'G6M_NS_002', 'G6M_NS_003'];
  for (const skillId of skillIds) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = skillIds.map((skillId) => readPackage(`${skillId}.skill-package.v1.json`));
  for (const pkg of packages) {
    assert.equal(pkg.grade, 6);
    assert.equal(pkg.subject, 'Math');
    assert.equal(pkg.domain, 'The Number System');
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${pkg.skill_id}/drill`);
  }
  assert.deepEqual(packages.map((pkg) => pkg.skill), ['Dividing Fractions', 'Multi-Digit Decimal Operations', 'Integers and the Number Line']);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 6 Expressions and Equations Skill World packages appear from manifest for the hub', () => {
  const expected = new Map([
    ['G6M_EE_001', { skill: 'Expressions and Exponents' }],
    ['G6M_EE_002', { skill: 'Equations and Inequalities' }],
    ['G6M_EE_003', { skill: 'Dependent and Independent Variables' }]
  ]);
  for (const skillId of expected.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = [...expected.keys()].map((skillId) => readPackage(`${skillId}.skill-package.v1.json`));
  for (const pkg of packages) {
    assert.equal(pkg.grade, 6);
    assert.equal(pkg.subject, 'Math');
    assert.equal(pkg.domain, 'Expressions and Equations');
    assert.equal(pkg.skill, expected.get(pkg.skill_id).skill);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${pkg.skill_id}/drill`);
  }
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Final Grade 6 Geometry and Statistics Skill World packages appear from manifest for the hub', () => {
  const expected = new Map([
    ['G6M_GM_001', { domain: 'Geometry', skill: 'Area, Surface Area, and Volume' }],
    ['G6M_SP_001', { domain: 'Statistics and Probability', skill: 'Statistical Questions and Data Displays' }],
    ['G6M_SP_002', { domain: 'Statistics and Probability', skill: 'Summarize and Interpret Data' }]
  ]);
  for (const skillId of expected.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = [...expected.keys()].map((skillId) => readPackage(`${skillId}.skill-package.v1.json`));
  for (const pkg of packages) {
    assert.equal(pkg.grade, 6);
    assert.equal(pkg.subject, 'Math');
    assert.equal(pkg.domain, expected.get(pkg.skill_id).domain);
    assert.equal(pkg.skill, expected.get(pkg.skill_id).skill);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${pkg.skill_id}/drill`);
  }
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 5 English proof Skill World packages appear from manifest for the hub', () => {
  const expected = new Map([
    ['G5E_RF_001', { skill: 'Multisyllable Word Reading, Roots, and Affixes', domain: 'Reading Foundations / Word Analysis' }],
    ['G5E_FL_001', { skill: 'Reading Fluency and Expression With Complex Text', domain: 'Fluency' }],
    ['G5E_RC_001', { skill: 'Quote Accurately and Use Text Evidence', domain: 'Reading Comprehension' }],
    ['G5E_VOC_001', { skill: 'Vocabulary, Context Clues, and Figurative Language', domain: 'Vocabulary / Language' }]
  ]);
  for (const skillId of expected.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = manifest.packages.map(readPackage);
  const grade5EnglishPackages = packages.filter((pkg) => requiredGrade5EnglishProofSkillIds.includes(pkg.skill_id));
  assert.deepEqual(grade5EnglishPackages.map((pkg) => pkg.skill_id).sort(), [...requiredGrade5EnglishProofSkillIds].sort());
  for (const [skillId, details] of expected.entries()) {
    const g5e = grade5EnglishPackages.find((pkg) => pkg.skill_id === skillId);
    assert.ok(g5e, `${skillId} package loads from manifest`);
    assert.equal(g5e.grade, 5);
    assert.equal(g5e.subject, 'English');
    assert.equal(g5e.domain, details.domain);
    assert.equal(g5e.skill, details.skill);
    assert.equal(Array.isArray(g5e.level_banks), true);
    assert.equal(g5e.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(g5e.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(g5e.level_banks.length, 5);
    assert.equal(g5e.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(g5e.skill_id)}/drill`, `/skill-world/${skillId}/drill`);
    assert.equal(g5e.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${skillId} practice questions have Read Question narration`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
  assert.match(hub, /Grade \$\{escapeHtml\(pkg\.grade\)\} · \$\{escapeHtml\(pkg\.subject\)\} · \$\{escapeHtml\(pkg\.domain\)\} · \$\{escapeHtml\(pkg\.skill_id\)\}/);
});

test('Grade 4 English advanced word analysis Skill World package appears from manifest for the hub', () => {
  const skillId = 'G4E_RF_001';
  assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  const packages = manifest.packages.map(readPackage);
  const g4e = packages.find((pkg) => pkg.skill_id === skillId);
  assert.ok(g4e, `${skillId} package loads from manifest`);
  assert.equal(g4e.grade, 4);
  assert.equal(g4e.subject, 'English');
  assert.equal(g4e.domain, 'Reading Foundations / Phonics');
  assert.equal(g4e.skill, 'Advanced Word Analysis and Multisyllable Decoding');
  assert.equal(Array.isArray(g4e.level_banks), true);
  assert.equal(g4e.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
  assert.equal(g4e.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
  assert.equal(g4e.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
  assert.equal(`/skill-world/${encodeURIComponent(g4e.skill_id)}/drill`, '/skill-world/G4E_RF_001/drill');
  assert.equal(g4e.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${skillId} practice questions have Read Question narration`);
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});

test('Grade 4 English fluency vocabulary comprehension packages appear from manifest for the hub', () => {
  const expected = new Map([
    ['G4E_FL_001', { domain: 'Fluency', skill: 'Reading Fluency, Accuracy, and Expression' }],
    ['G4E_VOC_001', { domain: 'Vocabulary / Language', skill: 'Vocabulary, Context Clues, and Figurative Language' }],
    ['G4E_RC_001', { domain: 'Reading Comprehension', skill: 'Ask and Answer Questions With Text Evidence' }],
    ['G4E_RC_002', { domain: 'Reading Literature', skill: 'Story Elements, Theme, and Character Analysis' }],
    ['G4E_RC_003', { domain: 'Reading Informational Text', skill: 'Main Idea, Key Details, and Text Structure' }]
  ]);
  for (const skillId of expected.keys()) {
    assert.ok(manifest.packages.includes(`${skillId}.skill-package.v1.json`), `manifest includes ${skillId}`);
  }
  const packages = [...expected.keys()].map((skillId) => readPackage(`${skillId}.skill-package.v1.json`));
  for (const pkg of packages) {
    assert.equal(pkg.grade, 4);
    assert.equal(pkg.subject, 'English');
    assert.equal(pkg.domain, expected.get(pkg.skill_id).domain);
    assert.equal(pkg.skill, expected.get(pkg.skill_id).skill);
    assert.equal(Array.isArray(pkg.level_banks), true);
    assert.equal(pkg.level_banks.filter((level) => !/(^|_)mixed$/i.test(level.level_id) && !/^mixed$/i.test(level.label)).length, 4);
    assert.equal(pkg.level_banks.some((level) => /(^|_)mixed$/i.test(level.level_id) || /^mixed$/i.test(level.label)), true);
    assert.equal(pkg.level_banks.every((level) => level.questions.length >= 10 && level.questions.length <= 12), true);
    assert.equal(`/skill-world/${encodeURIComponent(pkg.skill_id)}/drill`, `/skill-world/${pkg.skill_id}/drill`);
    assert.equal(pkg.level_banks.flatMap((level) => level.questions).every((question) => question.question_audio?.label === 'Read Question'), true, `${pkg.skill_id} practice questions have Read Question narration`);
  }
  assert.match(hub, /function buildGradeLessons\(grade\)/);
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/);
  assert.match(hub, /Start Skill World/);
  assert.match(hub, /Practice This Skill/);
});
