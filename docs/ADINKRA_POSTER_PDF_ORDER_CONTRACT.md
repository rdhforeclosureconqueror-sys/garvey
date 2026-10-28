# Adinkra Poster-to-PDF Identity Contract (Mandatory)

**Owner-approved rule:** The nameless 62-symbol poster is ordered identically to `adinkra-symbols-and-meanings(2).pdf`. PDF entry **1** corresponds to poster cell **1**, PDF entry **2** to poster cell **2**, and so on through **62**. This order is the source of truth for every Gate, game, story card, and future Adinkra library.

## Index conversion
- PDF numbering is **1-based**. Code arrays are **0-based**: `posterIndex = pdfNumber - 1`.
- The poster has **8 columns**, traversed **left-to-right, top-to-bottom**. Use `column = posterIndex % 8`, `row = Math.floor(posterIndex / 8)`; 62 symbols occupy eight rows with the final two cells unused.
- Never alphabetize, group by Gate, or filter the master array before calculating the artwork position. Do not use an independently ordered symbol list for the poster. Preserve both Sankofa entries as distinct **PDF #2** and **PDF #3**, while grouping their meaning for reuse analysis.
- Show names only when the exact poster-to-PDF mapping has been validated. If a discrepancy is observed, mark the relevant image/name pairing unverified and do not silently guess.
- The repo currently contains separate 62-name arrays in `public/gate-adinkra-cascade.js` and `public/gate-two-experience.html`; consolidate these into a **single versioned registry** in the future library work. In the interim, keep them identical and guard them with a test.

## Required acceptance test
For every PDF entry 1..62, verify the name in the registry equals the name in that PDF row, and that its sprite uses poster cell (entry - 1). Spot-check poster art against the PDF figure, especially PDF #1, #2, #3, #14, #31, #47, #61 and #62. Compare actual rendered artwork, not just the name arrays. The owner reports current name/image mismatches; **do not consider them fixed merely because the arrays match**.

## Child-facing display
The name and artwork must be verified together before displaying as authoritative. The child-friendly explanation and OpenAI narration requirement is in `docs/ADINKRA_LIBRARY_CROSS_GATE_ROTATION_REQUIREMENTS.md`. Gate Two's seven pairings are editorial proposals pending review.
