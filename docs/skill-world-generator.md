# Skill World Generator

## What the generator does
Renders a SkillPackage JSON into a playable skill-world flow with learner attempts, answer validation, hint usage, and growth-data persistence.

## SkillPackage JSON format
Required: `skill_id`, `grade`, `subject`, `domain`, `skill`, and question arrays (`guided_practice`, `adaptive_question_bank`, `checkpoint`).
Questions support `question_id` (auto-derived if missing), `question_type`, `visual_model`, `correct_answer`/`answer`, `acceptable_answers`, `misconception_tag`, and optional explanation/feedback fields.

## How to add a new skill
1. Copy an existing `*.skill-package.v1.json` file.
2. Update metadata and banks.
3. Ensure each question has `question_type`, prompt, answer, and optionally `visual_model`.
4. Load with route `/skill-world/<SKILL_ID>`.

## How to choose a visual_model
Use models matching question semantics (number bonds, comparison, number line, shapes, etc.).
If data is incomplete, renderer falls back safely with placeholder text.

## How growth data works
On completion, payload is saved with learner identity, attempts/correct, accuracy, stars, mastery status, recommendation, misconception watchlist, and timestamp.

## How recommendation works
`recommendation-helper` returns next skill when mastery threshold is met; otherwise remediation skill is recommended.

## How to test a skill package
- Run `node tests/gamehub/skill-world/skill-world-generator.test.js`.
- Validate schema using `SkillPackageSchema.validateSkillPackage(package)`.
- Run local route and verify multiple-choice, short-response, and show-answer behavior.

## Known limitations
- Visual renderers are intentionally lightweight HTML (non-canvas).
- No server-side attempt sync yet.
- Accessibility polish (focus states/audio prompts) still pending.
