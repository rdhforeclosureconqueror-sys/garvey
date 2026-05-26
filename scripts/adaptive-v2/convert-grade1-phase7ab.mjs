import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const phaseConfigs = [
  { phaseFolder: 'Phase 7A', subjectPath: 'math', outDir: 'public/gamehub/content/adaptive-v2/grades/grade1/math/skills', phaseId: 'phase-7a' },
  { phaseFolder: 'Phase 7B', subjectPath: 'reading-english', outDir: 'public/gamehub/content/adaptive-v2/grades/grade1/reading-english/skills', phaseId: 'phase-7b' }
];

const parseBlocks = (text) => [...text.matchAll(/```json[^\n]*\n([\s\S]*?)```/g)].map((m) => JSON.parse(m[1]));

const toSteps = (obj) => Object.keys(obj).filter((k) => /^step_\d+$/.test(k)).sort().map((k, i) => ({ label: `step_${i+1}`, content: obj[k] }));

const makeArtifacts = (filePath, phaseId) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  const blocks = parseBlocks(raw);
  const skillMeta = blocks.find((b) => b.skill_id);
  const lesson = blocks.find((b) => b.lesson_id);
  const worked = blocks.find((b) => b.example_id);
  const hint = blocks.find((b) => b.hint_1 && b.hint_2 && b.hint_3);
  const guided = blocks.filter((b) => b.practice_id);
  const checkpointSrc = blocks.find((b) => b.checkpoint_id && Array.isArray(b.questions));

  if (!skillMeta || !lesson || !worked || !hint || guided.length === 0 || !checkpointSrc) {
    throw new Error(`Missing required blocks in ${filePath}`);
  }

  const skillCode = skillMeta.skill_id;
  const lessonPackage = {
    schema_version: 'v1',
    lesson_package_id: `${skillCode}_LP1`,
    phase_id: phaseId,
    grade: skillMeta.grade,
    subject: skillMeta.subject,
    domain: skillMeta.domain,
    skill: skillMeta.skill,
    lesson_snippet: {
      key_vocabulary: lesson.key_vocabulary ?? [],
      concept_explanation: lesson.concept_explanation,
      visual_model: lesson.visual_model,
      common_misconception: lesson.common_misconception,
      real_world_connection: lesson.real_world_connection,
      lesson_summary: lesson.lesson_summary
    },
    worked_example: {
      problem: worked.problem,
      steps: toSteps(worked),
      thinking_notes: worked.thinking_notes,
      final_answer: worked.final_answer,
      reflection_prompt: worked.reflection_prompt
    },
    hint_ladder: {
      hint_1: hint.hint_1,
      hint_2: hint.hint_2,
      hint_3: hint.hint_3
    },
    guided_practice: guided.map((g) => ({
      practice_id: g.practice_id,
      support_type: g.support_type,
      prompt: g.prompt,
      choices: g.choices,
      correct_answer: g.correct_answer,
      coaching_feedback: g.coaching_feedback
    })),
    checkpoint_ref: { checkpoint_id: checkpointSrc.checkpoint_id },
    next_practice_recommendation: {
      pathway: 'needs_review',
      reason: 'Converted planning artifact only; runtime pathway mapping pending.'
    },
    mastery_support_metadata: {
      mastery_target_percent: skillMeta.mastery_threshold,
      source_difficulty_range: skillMeta.difficulty_range
    },
    source_metadata: {
      source_phase_folder: phaseId,
      source_file: path.basename(filePath)
    }
  };

  const checkpoint = {
    schema_version: 'v1',
    checkpoint_id: checkpointSrc.checkpoint_id,
    skill: checkpointSrc.skill,
    questions: checkpointSrc.questions.map((q, idx) => ({ question_id: `${checkpointSrc.checkpoint_id}_Q${idx+1}`, prompt: q.prompt, answer: q.answer })),
    pass_threshold: Number((checkpointSrc.pass_score / 100).toFixed(2)),
    feedback_rules: [
      { condition: 'score >= pass_threshold', feedback: 'Advance to next practice set.' },
      { condition: 'score < pass_threshold', feedback: 'Assign mini-reteach and guided practice loop.' }
    ],
    pathway_recommendation: { if_pass: 'adaptive_practice', if_fail: 'lesson_support_loop' },
    source_metadata: {
      source_phase_folder: phaseId,
      source_file: path.basename(filePath)
    }
  };

  return { skillCode, lessonPackage, checkpoint };
};

for (const cfg of phaseConfigs) {
  const sourceDir = path.join(ROOT, 'public/gamehub/content/curriculum-source', cfg.phaseFolder);
  fs.mkdirSync(path.join(ROOT, cfg.outDir), { recursive: true });
  for (const f of fs.readdirSync(sourceDir)) {
    const full = path.join(sourceDir, f);
    if (!fs.statSync(full).isFile()) continue;
    const { skillCode, lessonPackage, checkpoint } = makeArtifacts(full, cfg.phaseId);
    const outBase = path.join(ROOT, cfg.outDir, skillCode.toLowerCase());
    fs.writeFileSync(`${outBase}.lesson-package.v1.json`, JSON.stringify(lessonPackage, null, 2) + '\n');
    fs.writeFileSync(`${outBase}.checkpoint.v1.json`, JSON.stringify(checkpoint, null, 2) + '\n');
  }
}
