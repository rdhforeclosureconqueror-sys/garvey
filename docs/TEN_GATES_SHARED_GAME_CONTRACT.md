# LOCKED: Shared Games Across All Ten Gates

Owner decision (2026-10-27): **Every day of every Gate must use the same three original Gate One games.** This is a platform-wide product contract, not an optional design suggestion.

## Required canonical games
1. **Original Gate One symbol memory + picture puzzle**: show the actual day symbol artwork for a timed memory moment, hide it, then reconstruct the same full picture using the original four-piece swap mechanic. Reveal the name/teaching only after solving. Do not substitute cropped poster tiles with unrelated random symbols.
2. **Original Gate One picture-to-name-and-meaning matching**: pair actual symbol image with its correct name and meaning. Do not substitute picture-to-picture pairs.
3. **Original Gate One Adinkra Symbol Cascade**: reuse `public/gate-adinkra-cascade.js` and its original rules, falling animation, match behavior, and three speed modes. Do not clone or redesign it.

All seven days of each Gate must expose the games. Gate-specific content changes, but mechanics do not. At most **one additional unique game per Gate** may be introduced without a new owner decision.

## Implementation requirements
- Extract the existing Gate One picture puzzle and picture-to-meaning matching into shared modules, preserving their exact mechanics and progression. Both Gate One and Gate Two must consume the shared implementation; future Gates must import it too.
- Replace the temporary Gate Two `practice-grid` picture-to-picture matching and poster-crop puzzle. These are **not accepted** as the canonical games.
- Gate Two now mounts the actual Cascade script and shares its styles. Verify iPhone rendering, speed selector, falling symbols, swap/match, game reset, and day-to-day persistence. Do not assume a merged PR means device-tested.
- Symbol identity is governed by `docs/ADINKRA_POSTER_PDF_ORDER_CONTRACT.md`; names must match the PDF's exact order and actual artwork. Do not mark symbol-to-name pairings verified based on matching arrays alone.
- Per-day story, decision, reflection and Keeper Recognition remain distinct from game scores. No game result automatically grants Gate Recognition.

## Acceptance gate
On mobile, test Sunday through Saturday in Gate One and Gate Two. For each day: picture displays, disappears on schedule, puzzle restores the image, matching uses picture↔name/meaning, Cascade drops and resolves symbols, narration and reflection remain functional. Add automated regression checks for shared component presence and PDF identity contract. Do not mark the Ten Gates core games complete until this passes.
