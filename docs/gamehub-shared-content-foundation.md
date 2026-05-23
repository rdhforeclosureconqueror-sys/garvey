# GameHub Shared Content Foundation (PR1)

## Schemas
- `word-bank-item`: id, word, definition (+ optional example, grade)
- `question-bank-item`: id, prompt, answer
- `lesson-pool`: id, title, wordBankPath
- `difficulty-config`: id, label (+ optional maxItems)
- `mode-preset`: id, label (+ optional allowHints)

## Folder structure
- `public/gamehub/schema/` schema contracts
- `public/gamehub/content/` small sample banks and pools
- `public/gamehub/config/` small sample difficulty and mode presets
- `public/gamehub/shared-content-loader.js` lightweight loader/validators/adapters

## Adding future content
1. Add JSON file into `public/gamehub/content/` or `public/gamehub/config/`.
2. Keep required fields in each schema.
3. Validate through loader helper before wiring into gameplay.
4. Start with additive content, preserving in-game fallback arrays.

## Migration order for remaining games
1. Word-first games (matching, spelling, sight words variants)
2. Question-driven quiz games
3. Adaptive/mode-heavy games (after config presets mature)
4. Gates-linked score-aware games last (separate PR)
