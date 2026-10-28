# Adinkra Symbol Library and Cross-Gate Rotation — Product Requirement

Status: **Approved product direction; implementation deferred until Gate Two is complete.** Do not build the library in this milestone.

## Purpose
Build a single child-friendly Adinkra reference library for the entire Garvey Ten Gates Rite of Passage and African diaspora / melanin-enriched worldwide community. Make it accessible from Gate One, Gate Two, and subsequent Gates. The platform must not portray Africa as one village or conflate diverse diaspora cultures.

## Rotation rule
- Maintain one canonical registry of symbol identity, accepted Akan name/spelling variants, traditional meaning, artwork provenance, pronunciation review, usage per Gate/day, and child-facing interpretation.
- Prefer **symbols not yet assigned in any prior Gate** when selecting a symbol for a new daily lesson. Cover the library broadly before repeating symbols; reuse only when the connection is particularly meaningful and record a reason.
- Do not confuse a symbol's established traditional meaning with a **proposed application** to a particular emotion. A symbol does not represent an emotion merely because a story uses it.
- Before approving each Gate's seven symbols, automatically show a cross-Gate usage report, unused symbols, duplicates, and reasons for justified reuse. Keep a canonical alias mapping (e.g., spelling variations, two Sankofa variants) to avoid accidental repeats.
- Gate One already uses: Mate Masie, Akoben, Hwe Mu Dua, Nyansapo, Ani Bere A Enso Gya, Sesa Wo Suban, Sankofa. Gate Two should avoid these when equally fitting alternatives exist.

## Child-facing symbol library
Each symbol entry must show:
1. High-quality, correctly attributed artwork; traditional name and pronunciation (reviewed by a knowledgeable Akan speaker).
2. A faithful, clearly labeled traditional meaning and cultural context.
3. A short child-friendly explanation and two everyday examples from diverse diaspora experiences (school, home, sports, arts, friendship, community).
4. A one-sentence action prompt and age-appropriate reflection.
5. **OpenAI voice narration**, with text always visible, play/replay/pause and graceful fallback; pronunciations must be reviewed, not assumed correct from English TTS.
6. Related Gate(s), emotion(s), stories, and teaching uses, with a distinction between traditional symbolism and curriculum interpretation.
7. Accessible mobile UI, keyboard/screen reader support, and no gatekeeping of cultural reference material.

Example of desired child-friendly treatment (a modern lesson, **not** a claim about a specific Adinkra symbol): “Courage is not having no fear. Courage can mean moving forward while fear is present, or using fear to prepare carefully before acting.” Show an everyday example, then a choice and reflection.

## Technical acceptance
- Source-of-truth data in versioned JSON, validated against unique IDs and symbol artwork inventory.
- Gate/day assignment registry and tests that warn on repeated symbols and missing provenance.
- One shared component for all Gates; no copies of 62 names and artwork positions embedded separately in each page.
- AI voice service uses existing Garvey audio integration where authorized; no API secrets in the browser; text-only fallback.
- Editorial review and provenance required before publishing cultural descriptions.
- Library must not change Keeper Recognition or make game scores gate passage criteria.

## Timing
**After Gate Two:** Build and review the library and retrofit Gate One and Gate Two. For now, finish Gate Two's seven emotion stories, symbol references, accessible interactions and game experience. Keep unverified mappings explicitly marked draft.
