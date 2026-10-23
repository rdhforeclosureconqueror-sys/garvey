# Garvey Ten Gates — Adinkra architecture (Gate 1)

## Scope
This is **only** for Garvey's children's Rite of Passage. The Pan-African Connection eight-week yoga program belongs in its own curriculum and must not reuse the Gate lesson IDs or progress records. Shared traditional Adinkra metadata may eventually live in a neutral reference catalog.

## Curriculum rule
Each gate has **one primary symbol**, with **seven recurring weekday practices**, each linked to an Adinkra symbol. The primary symbol may also be a daily symbol; no requirement for eight unique glyphs. The cycle repeats Sunday–Saturday for as many weeks as needed. Repeat symbols intentionally for memory and recognition; vary age-appropriate stories and challenges, retain dated reflections, and advance only after a mentor-reviewed demonstration of learning. This is a design hypothesis, not a proven mastery intervention.

## Gate One
**Attention — primary: Mate Masie** (proposed; pending cultural review). Meaning: “I have heard and kept it,” wisdom, knowledge and prudence. Source: https://www.adinkrasymbols.org/symbols/mate-masie/

| Day | Symbol | Source-supported meaning | Original Garvey learning goal | PDF reference |
|---|---|---|---|---|
| sunday | [Mate Masie](https://www.adinkrasymbols.org/symbols/mate-masie/) | I have heard and kept it; wisdom, knowledge, prudence | listen | Not in supplied PDF |
| monday | [Akoben](https://www.adinkrasymbols.org/symbols/akoben/) | War horn; readiness, call to action, voluntarism | notice | Entry 16 |
| tuesday | [Hwehwemudua](https://www.adinkrasymbols.org/symbols/hwehwemudua/) | Measuring rod; knowledge and critical examination | examine | Entry 38 |
| wednesday | [Nyansapo](https://www.adinkrasymbols.org/symbols/nyansapo/) | Wisdom knot; wisdom, ingenuity, intelligence, patience | focus | Not in supplied PDF |
| thursday | [Ani Bere A Enso Gya](https://www.adinkrasymbols.org/symbols/ani-bere-a-enso-gya/) | Patience, self-containment, self-discipline and self-control | pause | Entry 22 |
| friday | [Sesa Wo Suban](https://www.adinkrasymbols.org/symbols/sesa-wo-suban/) | Change your character; warning against arrogance and dishonorable behavior | return-and-improve | Not in supplied PDF |
| saturday | [Sankofa](https://www.adinkrasymbols.org/symbols/sankofa/) | Learn from the past to build for the future | reflect | Entry 2 |

## Provenance and accuracy
- The supplied PDF lists 62 numbered entries and cites adinkrasymbols.org. Mate Masie, Nyansapo and Sesa Wo Suban are **not** in that PDF but are documented on individual symbol pages on the same site. Do not describe them as sourced from the PDF.
- Hwehwemudua is the source spelling; earlier pilot uses “Hwe Mu Dua.” Preserve a searchable alias and request Akan-language review.
- Traditional meanings must be distinguished from Garvey's modern exercises. No source establishes Sunday–Saturday correspondences as traditional Akan practice.
- No image reuse rights have been established. Do not copy illustrations from websites or the PDF into public assets without permission or appropriate licensing. Uploaded images from the prior screenshot largely depict other symbols; do not relabel them as these seven.
- Sources provide **cultural documentation**, not experimental proof that repeating a seven-day schedule improves children's attention. Assess usability and learning outcomes separately.

## Implementation contract
- Canonical curriculum: `gates-v2/content/adinkra/gate-attention.recurring.json`.
- Future adapters should read the seven weekday mappings from this file; the older pilot's seven days are a *single-pass preview*, not a progress or scheduling engine.
- Do not delete the existing working pilot or silently convert a learner's historical progress.
- Build: verified glyph inventory → age-appropriate variable story bank → learner-local weekday selection → dated reflection history → mentor assessment → tested migration → live rollout.
- Never advance a child solely because seven calendar days elapsed. Never require daily attendance for advancement.
