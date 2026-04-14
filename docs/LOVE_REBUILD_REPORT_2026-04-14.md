# Love Archetype Engine Rebuild Report (2026-04-14)

## Final Distribution Matrix

| Archetype | Primary | Secondary | Weighted Max Contribution | ID Signals | BH Signals | SC Signals | ST Signals | DS Signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| RS | 60 | 60 | 212.5 | 24 | 29 | 29 | 28 | 10 |
| AL | 60 | 60 | 212.5 | 24 | 28 | 30 | 28 | 10 |
| EC | 60 | 60 | 212.25 | 24 | 28 | 29 | 29 | 10 |
| AV | 60 | 60 | 212.5 | 24 | 29 | 28 | 30 | 9 |
| ES | 60 | 60 | 212.25 | 24 | 30 | 28 | 29 | 9 |

## Bank Class Distribution

| Bank | ID | BH | SC | ST | DS |
|---|---:|---:|---:|---:|---:|
| BANK_1 | 5 | 6 | 6 | 6 | 2 |
| BANK_2 | 5 | 6 | 6 | 6 | 2 |
| BANK_3 | 5 | 6 | 6 | 6 | 2 |

## Pair Distribution (Unordered, all 10 pairs)

| Pair | Count |
|---|---:|
| AL-AV | 30 |
| AL-EC | 30 |
| AL-ES | 30 |
| AL-RS | 30 |
| AV-EC | 30 |
| AV-ES | 30 |
| AV-RS | 30 |
| EC-ES | 30 |
| EC-RS | 30 |
| ES-RS | 30 |

## Before vs After (Key Bias Indicators)

| Metric | Before | After |
|---|---:|---:|
| ES primary count (all banks) | 9 | 60 |
| ES secondary count (all banks) | 40 | 60 |
| AL primary count (all banks) | 78 | 60 |
| EC primary count (all banks) | 72 | 60 |

## Validation Summary

- Structural distribution audit: complete (counts, classes, and pair matrices generated).
- Archetype dominance simulations: each target archetype wins in each bank in heavy-answer simulation runs.
- Hybrid threshold checks: retained in scorer output; no scoring multiplier changes were made in this rebuild.
- Cross-bank stability checks: bank-specific max-possible score envelopes remain tightly aligned (52.75–53.25).
