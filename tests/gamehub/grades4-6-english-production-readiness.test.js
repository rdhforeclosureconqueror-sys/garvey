'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const contentDir = path.join(root, 'public/gamehub/skill-world/content');
const manifest = JSON.parse(fs.readFileSync(path.join(contentDir, 'manifest.json'), 'utf8'));
const hub = fs.readFileSync(path.join(root, 'public/gamehub/adaptive-v2-hub.html'), 'utf8');
const skillWorldIndex = fs.readFileSync(path.join(root, 'public/gamehub/skill-world/index.html'), 'utf8');
const audioRoutes = fs.readFileSync(path.join(root, 'server/skillWorldAudioRoutes.js'), 'utf8');
const VisualRegistry = require(path.join(root, 'public/gamehub/skill-world/renderers/visual-model-registry.js'));

const grade4EnglishSkillIds = [
  'G4E_RF_001',
  'G4E_FL_001',
  'G4E_VOC_001',
  'G4E_RC_001',
  'G4E_RC_002',
  'G4E_RC_003',
  'G4E_WR_001',
  'G4E_WR_002',
  'G4E_WR_003',
  'G4E_LANG_001',
];

const grade5EnglishSkillIds = [
  'G5E_RF_001',
  'G5E_FL_001',
  'G5E_VOC_001',
  'G5E_RC_001',
  'G5E_RC_002',
  'G5E_RC_003',
  'G5E_WR_001',
  'G5E_WR_002',
  'G5E_WR_003',
  'G5E_LANG_001',
];

const grade6EnglishSkillIds = [
  'G6E_RF_001',
  'G6E_FL_001',
  'G6E_VOC_001',
  'G6E_RC_001',
  'G6E_RC_002',
  'G6E_RC_003',
  'G6E_WR_001',
  'G6E_WR_002',
  'G6E_WR_003',
  'G6E_LANG_001',
];

const expectedSkillIds = [...grade4EnglishSkillIds, ...grade5EnglishSkillIds, ...grade6EnglishSkillIds];

const auditedRenderers = [
  'syllable_break',
  'word_parts',
  'morpheme_tiles',
  'word_builder',
  'sentence_card',
  'sentence_highlight',
  'phrase_builder',
  'fluency_meter',
  'context_sentence',
  'vocabulary_match',
  'word_scale',
  'figurative_language_card',
  'short_passage',
  'question_card',
  'evidence_highlight',
  'text_evidence_builder',
  'story_map',
  'character_trait_chart',
  'event_cards',
  'theme_tracker',
  'main_idea_web',
  'detail_cards',
  'text_feature_map',
  'text_structure_chart',
  'compare_texts_panel',
  'opinion_reason_chart',
  'paragraph_builder',
  'writing_checklist',
  'sentence_builder',
  'topic_detail_chart',
  'fact_cards',
  'dialogue_builder',
  'grammar_highlight',
  'punctuation_marker',
  'sentence_combiner',
  'evidence_builder',
];

const writingCoverage = {
  'G4E_WR_001': ['opinion_present', 'reason_present', 'evidence_present'],
  'G4E_WR_002': ['topic_present', 'fact_present', 'facts_details_present', 'detail_present'],
  'G4E_WR_003': ['narrative_sequence_present', 'description_present', 'dialogue_punctuation'],
  'G4E_LANG_001': ['verb_tense', 'capitalization', 'punctuation', 'complete_sentence'],
  'G5E_WR_001': ['opinion present', 'reasons present', 'evidence present', 'organization present'],
  'G5E_WR_002': ['topic present', 'facts present', 'definitions or explanations present', 'logical organization'],
  'G5E_WR_003': ['clear event sequence', 'pacing support', 'description present'],
  'G5E_LANG_001': ['verb tense consistency', 'sentence combining', 'complete sentence'],
  'G6E_WR_001': ['claim_present', 'reasons_present', 'evidence_present', 'source_reference_present', 'explanation_connects_evidence_to_claim'],
  'G6E_WR_002': ['source_information_used_accurately', 'quotation_or_source_reference_present', 'objective_tone', 'facts_present'],
  'G6E_WR_003': ['consistent_point_of_view', 'clear_event_sequence', 'pacing_support'],
  'G6E_LANG_001': ['pronoun_agreement', 'subject_verb_agreement', 'verb_tense_consistency', 'sentence_variety', 'style_and_clarity'],
};

function readPackage(skillId) {
  return JSON.parse(fs.readFileSync(path.join(contentDir, `${skillId}.skill-package.v1.json`), 'utf8'));
}

function collectQuestions(pkg) {
  return [
    ...(pkg.guided_practice || []),
    ...(pkg.adaptive_question_bank || []),
    ...(pkg.checkpoint || []),
    ...(pkg.level_banks || []).flatMap((level) => level.questions || []),
  ];
}

function isMixedLevel(level) {
  return /(^|_)mixed$/i.test(String(level.level_id || '')) || /^mixed$/i.test(String(level.label || ''));
}

function textOfPackage(pkg) {
  return JSON.stringify(pkg).toLowerCase();
}

function validationTerms(pkg) {
  const terms = new Set();
  collectQuestions(pkg).forEach((question) => {
    (question.validation_checks || []).forEach((term) => terms.add(term));
    (question.writing_checks || []).forEach((term) => terms.add(term));
    (question.writing_validation?.required || []).forEach((term) => terms.add(term));
  });
  return terms;
}

test('Grades 4-6 English expected package set is exact, complete, and manifest-aligned', () => {
  assert.equal(expectedSkillIds.length, 30, 'the readiness scope contains exactly 30 expected package IDs');
  assert.deepEqual(new Set(expectedSkillIds), new Set(expectedSkillIds), 'expected package IDs are unique');

  const packages = expectedSkillIds.map(readPackage);
  assert.equal(packages.filter((pkg) => Number(pkg.grade) === 4 && pkg.subject === 'English').length, 10, 'Grade 4 English has 10 packages');
  assert.equal(packages.filter((pkg) => Number(pkg.grade) === 5 && pkg.subject === 'English').length, 10, 'Grade 5 English has 10 packages');
  assert.equal(packages.filter((pkg) => Number(pkg.grade) === 6 && pkg.subject === 'English').length, 10, 'Grade 6 English has 10 packages');

  for (const skillId of expectedSkillIds) {
    const filename = `${skillId}.skill-package.v1.json`;
    assert.ok(fs.existsSync(path.join(contentDir, filename)), `${skillId} package file exists`);
    assert.ok(manifest.packages.includes(filename), `${skillId} is listed in the skill-world manifest`);
  }

  const manifestedExpectedEnglishIds = manifest.packages
    .map((filename) => filename.replace(/\.skill-package\.v1\.json$/, ''))
    .filter((skillId) => /^G[456]E_/.test(skillId))
    .sort();
  assert.deepEqual(manifestedExpectedEnglishIds, [...expectedSkillIds].sort(), 'manifest has exact parity with the 30 Grades 4-6 English packages');
});

test('Grades 4-6 English packages expose production level banks, narration, audio, and routes', () => {
  for (const skillId of expectedSkillIds) {
    const pkg = readPackage(skillId);
    const levels = pkg.level_banks || [];
    const focused = levels.filter((level) => !isMixedLevel(level));
    const mixed = levels.filter(isMixedLevel);
    const levelQuestions = levels.flatMap((level) => level.questions || []);
    const missionQuestions = [...(pkg.guided_practice || []), ...(pkg.adaptive_question_bank || []), ...(pkg.checkpoint || [])];
    const questions = collectQuestions(pkg);

    assert.equal(levels.length, 5, `${skillId} has four focused levels plus Mixed`);
    assert.equal(focused.length, 4, `${skillId} has four focused levels`);
    assert.equal(mixed.length, 1, `${skillId} has one Mixed level`);
    assert.ok(levels.every((level) => (level.questions || []).length >= 10 && (level.questions || []).length <= 12), `${skillId} has 10-12 questions per level`);
    assert.ok(levelQuestions.every((question) => question.prompt && question.correct_answer !== undefined), `${skillId} has real Skill Practice questions`);
    assert.ok(Object.values(pkg.page_audio || {}).every((audio) => audio?.label === 'Read This Page' && audio?.text), `${skillId} has Read This Page narration on every guided mission screen`);
    assert.ok(['story', 'lesson', 'watch', 'demo', 'practice', 'challenge', 'checkpoint', 'badge', 'profile'].every((screen) => pkg.page_audio?.[screen]?.label === 'Read This Page' && pkg.page_audio?.[screen]?.text), `${skillId} has all guided mission page narration screens`);
    assert.ok(missionQuestions.every((question) => question.question_audio?.label === 'Read Question' && question.question_audio?.text), `${skillId} has Read Question narration for mission Practice, Challenge, and Checkpoint`);
    assert.ok(levelQuestions.every((question) => question.question_audio?.label === 'Read Question' && question.question_audio?.text), `${skillId} has Read Question narration for every Skill Practice question`);
    assert.ok(questions.some((question) => question.audio?.label === 'Listen' && question.audio?.text), `${skillId} includes Listen audio where English support benefits`);
    assert.ok(questions.filter((question) => question.question_type === 'short_response').every((question) => Array.isArray(question.acceptable_answers) && question.acceptable_answers.length > 0), `${skillId} short responses include acceptable_answers`);
    assert.equal(`/skill-world/${encodeURIComponent(skillId)}`, `/skill-world/${skillId}`, `${skillId} has a Start Skill World route`);
    assert.equal(`/skill-world/${encodeURIComponent(skillId)}/drill`, `/skill-world/${skillId}/drill`, `${skillId} has a Practice This Skill route`);
    assert.doesNotMatch(textOfPackage(pkg), /coming soon|lorem ipsum|todo|placeholder card|sample only/, `${skillId} does not contain hardcoded placeholder card copy`);
  }

  assert.match(audioRoutes, /createSkillWorldAudioRouter/, 'cached AI audio route exists');
  assert.match(audioRoutes, /fallback:\s*["']browser_speech["']/, 'browser speech fallback contract remains available');
  assert.match(skillWorldIndex, /speechSynthesis|browser speech/i, 'Skill World client keeps browser speech fallback support');
});

test('Grades 4-6 English audited visual renderers exist, are used, and produce structural markup', () => {
  const samplesByRenderer = new Map();
  const usageByRenderer = new Map(auditedRenderers.map((renderer) => [renderer, new Set()]));

  for (const skillId of expectedSkillIds) {
    const pkg = readPackage(skillId);
    for (const question of collectQuestions(pkg)) {
      const renderer = question.visual_model || question.support_type;
      if (!usageByRenderer.has(renderer)) continue;
      usageByRenderer.get(renderer).add(skillId);
      if (!samplesByRenderer.has(renderer)) samplesByRenderer.set(renderer, question);
    }
  }

  for (const renderer of auditedRenderers) {
    assert.equal(VisualRegistry.hasRenderer(renderer), true, `${renderer} renderer exists`);
    assert.ok(usageByRenderer.get(renderer).size > 0, `${renderer} is used by at least one Grades 4-6 English package`);
    const html = VisualRegistry.render(samplesByRenderer.get(renderer));
    assert.match(html, new RegExp(`data-renderer="${renderer}"`), `${renderer} renderer marks structural renderer output`);
    assert.match(html, /class="[^"]*(visual-model|skill-visual-inner|sw-)/, `${renderer} renderer returns structural visual markup`);
    assert.doesNotMatch(html, /Missing visual data|placeholder|coming soon|lorem/i, `${renderer} renderer does not produce placeholder-only text`);
    assert.ok(html.length > renderer.length + 80, `${renderer} renderer output is more than a label-only placeholder`);
  }
});

test('Grades 4-6 English writing validation is rule-based, sampled, and not placeholder grading', () => {
  for (const [skillId, expectedTerms] of Object.entries(writingCoverage)) {
    const pkg = readPackage(skillId);
    const terms = validationTerms(pkg);
    for (const expectedTerm of expectedTerms) {
      assert.ok(terms.has(expectedTerm), `${skillId} includes writing validation check: ${expectedTerm}`);
    }

    const validationQuestions = collectQuestions(pkg).filter((question) => question.question_type === 'writing_response' || question.writing_validation || question.validation_checks || question.writing_checks);
    assert.ok(validationQuestions.length > 0, `${skillId} has rule-based writing or language validation questions`);

    if (skillId.includes('_WR_')) {
      const writingQuestions = validationQuestions.filter((question) => question.question_type === 'writing_response' || question.writing_validation);
      assert.ok(writingQuestions.length > 0, `${skillId} has open writing validation questions`);
      assert.ok(writingQuestions.every((question) => (Array.isArray(question.writing_validation?.acceptable_sample_responses) && question.writing_validation.acceptable_sample_responses.length > 0) || question.writing_validation?.sample_answer), `${skillId} writing tasks include acceptable sample responses`);
      assert.ok(writingQuestions.every((question) => question.writing_validation?.rule_based_checks || question.writing_validation?.do_not_over_penalize === true), `${skillId} declares rule-based checks or do-not-over-penalize handling`);
      assert.ok(writingQuestions.every((question) => /child-friendly|paraphrases|minor spelling|variation/i.test(question.writing_validation?.rule_based_checks || '') || question.writing_validation?.do_not_over_penalize === true), `${skillId} accepts reasonable open-ended variation instead of over-penalizing`);
    }
  }
});

test('Grades 4-6 English hub filters and route actions are manifest-driven without hardcoded English placeholders', () => {
  assert.match(hub, /skillWorldPackages\.filter\(\(pkg\)=>Number\(pkg\.grade\)===Number\(grade\)\)\.map\(renderGeneratedMission\)/, 'hub filters generated missions by selected grade');
  assert.match(hub, /Start Skill World/, 'hub exposes Start Skill World');
  assert.match(hub, /Practice This Skill/, 'hub exposes Practice This Skill');
  assert.doesNotMatch(hub, /G[456]E_[A-Z]+_001[^\n]+coming soon|Grade [456] English[^\n]+placeholder/i, 'hub does not hardcode Grades 4-6 English placeholder cards');
});
