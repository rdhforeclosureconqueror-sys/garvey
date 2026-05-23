# GameHub Shared Content Foundation (PR2)

## Schemas
- `word-bank-item`: id, word, definition (+ optional example, grade, sentence, template, synonym, antonym)
- `question-bank-item`: id, prompt, answer
- `lesson-pool`: id, title, wordBankPath
- `difficulty-config`: id, label (+ optional maxItems)
- `mode-preset`: id, label (+ optional allowHints)

## Folder structure
- `public/gamehub/schema/` schema contracts
- `public/gamehub/content/` small sample banks and pools
- `public/gamehub/config/` small sample difficulty and mode presets
- `public/gamehub/shared-content-loader.js` lightweight loader/validators/adapters

## Game migration notes
- `spelling` remains fallback-safe and consumes shared word-bank items through `fromWordBankToSpellingLesson`.
- `1stgradesightwords` remains fallback-safe and consumes shared word-bank items through `fromWordBankToSightWordsDeck`.
- `game6` now consumes shared word-bank items through `fromWordBankToGame6Set`, while keeping internal arena content as fallback.

## Unified word-bank compatibility notes
One shared bank now supports all three games with a normalized core:
- Required core: `id`, `word`, `definition`
- Literacy support fields: `example`, `sentence`, `template`, `grade`
- Word-relation support fields: `synonym`, `antonym`

Normalization adjustments used by adapters:
- `game6` maps `synonym`/`antonym` into `syn`/`ant` runtime fields.
- `spelling` prefers `example` but can also consume `sentence` when present.
- `1stgradesightwords` only consumes `word`, making richer fields non-breaking.

Field gaps observed:
- Banks without `synonym`/`antonym` are still valid and load safely; game6 adapter falls back to definition text for those rounds.

## Recommended future literacy content structure
Use one additive bank per grade cluster with this shape:
- core: `id`, `word`, `definition`, `grade`
- reading context: `example`, `sentence`, `template`
- vocabulary relations: `synonym`, `antonym`

Keep content progressive and migration-safe:
1. Start with small mixed-grade banks.
2. Expand by grade-specific files.
3. Introduce larger libraries only after gameplay validation per game.
4. Keep tracking/Gates concerns in separate PRs.

## PR3 adaptive_learning migration notes
- `adaptive_learning` now attempts to load `/gamehub/content/question-bank.sample.json` through `GamehubSharedContent.loadQuestionBank`.
- Runtime behavior remains fallback-safe: the existing in-file `QUESTION_BANK` is still the default when external content is missing or invalid.
- A shared adapter `fromQuestionBankToAdaptiveItems` now maps compatible question-bank entries to adaptive runtime fields without changing session flow or scoring behavior.

## Question-bank compatibility notes
Required core remains minimal and backward compatible:
- `id`, `prompt`, `answer`

Optional compatibility fields now supported for adaptive extraction:
- `grade`, `domain`, `skill`, `prerequisite_skill`, `difficulty`, `explanation`, `subject`, `tags`, `choices`

Normalization behavior for adaptive runtime:
- `answer` -> `correct_answer`
- `explanation` -> `correct_explanation`
- missing `choices` are safely defaulted to `[answer]`
- missing `grade`/`difficulty` are safely defaulted to grade 7 / difficulty 2

## Future content-loading guidance
1. Keep shared question banks additive and small while validating gameplay parity.
2. Expand libraries only after separate review of pacing, distribution, and difficulty balance.
3. Keep tracking/Gates integration out of this lane and ship those concerns in dedicated PRs.
4. Preserve in-file fallbacks until all GameHub games have mature external content paths.

## Remaining cleanup risks
- If shared content has incomplete optional metadata, reports may be less specific (domain/skill labels), but gameplay still runs safely.
- Choice quality and distractor quality are not yet validated by schema; this remains a future content-governance concern.
- Adaptive item defaults (grade/difficulty) are intentionally conservative and may need tuning once larger curated banks are introduced.
