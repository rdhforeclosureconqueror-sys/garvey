# Shared ruler renderer contract and repository audit

## Answer-leakage audit

The shared registry is the single implementation of `visual_model: "ruler"`. It is called directly by registry consumers and indirectly by question cards, lesson samples, guided demos, and drill screens in the Skill World renderer. A repository-wide search found 24 canonical ruler questions, all in `G2M_MD_001`; guided-practice and checkpoint views reuse those question shapes. The same generated markup therefore affected every canonical ruler activity and every UI surface that embeds it.

The leakage root cause was presentation code that appended the computed `end - start` span to both the visible caption and the `role="img"` accessible name. Geometry normalization did not read `correct_answer`, but presenting its computed equivalent still disclosed the solution before interaction.

| Renderer output | Leaking output before this fix | Expected output | Leakage before fix | Leakage after fix |
|---|---|---|---|---|
| Visible `.sw-visual-caption`, interval task | “The distance is 6 inches.” | Task-oriented direction to use the marked endpoints | Yes | No |
| `role="img"` accessible name, interval task | “…spanning 6 inches.” | Ruler range, units, and object start/end marks | Yes | No |
| Visible caption, endpoint-reading task | Stated the endpoint value as an instruction | Ask the learner to read the mark where the object ends | Yes | No solution statement |
| Tick labels and object geometry | Ruler marks, start/end positions | Preserve the authored ruler and endpoint information | No; these are the problem representation | No |
| `data-*` geometry contract | Normalized range, endpoints, and span | Preserve internal renderer/test geometry; it is not exposed as visible or accessibility text | Not presented to learners | No presented leakage |
| Hidden/screen-reader nodes | None | None; the accessible name is the sole generated description | No additional node | No |
| Tooltips (`title`) | None | None | No | No |
| Fallback/placeholder output | None for valid metadata | Complete, nonblank ruler output | No | No |

## Accessibility contract

A complete ruler is one image whose accessible name identifies the ruler range and units, then identifies the object's authored start and end marks. It communicates the information a learner needs to perform the measurement without naming a computed distance, span, correct answer, or hidden solution. The visible caption likewise gives a measurement action rather than a result. For example: “A ruler marked from 0 to 10 inches. The object begins at the 2-inch mark and ends at the 8-inch mark.”

Endpoint-reading uses the same endpoint-rich accessible description, while its visible instruction asks the learner to read the ending mark. Tick-mark visuals remain `aria-hidden` because their information is consolidated in the image name. Invalid metadata remains a deterministic, accessible error rather than a silently altered diagram.

## Root cause and scope

The former production renderer treated `length` (or, unsafely, `correct_answer`) as an endpoint, always placed the object at zero, and always instructed the learner to start at zero. It had no interval model. Consequently, an authored interval such as 2–8 was silently changed into 0–6. This contract covers the shared `ruler` renderer only; no curriculum data is changed.

The repository-wide audit (all `*.skill-package.v1.json` files under `public/gamehub/skill-world/content`) found one package and 24 canonical level-bank/checkpoint activities using `visual_model: "ruler"`. The lesson-level renderer declaration is configuration, not an activity. Guided-practice entries duplicate level IDs and shapes. No Grade 1, Grade 3, or later-grade canonical package currently selects this renderer. No ruler-specific nested object or fractional tick data is currently authored.

## Usage and impact matrix

All entries use the flat `{ unit, length }` legacy shape; explicit endpoints are authored in prompt text where shown. “0–N” below means a zero-based bar ending at N. Before this fix the renderer displayed 0–`length` for every row.

| Package | Canonical activity IDs | Unit | Authored start → end; length | Expected visual | Former visual | Formerly correct? |
|---|---|---|---|---|---|---|
| G2M_MD_001 | LVL1_Q1 | inches | 0 → 5; 5 | 0–5 | 0–5 | Yes |
| G2M_MD_001 | LVL1_Q2 | inches | 0 → 4; 4 | 0–4 | 0–4 | Yes |
| G2M_MD_001 | LVL1_Q3 | inches | 0 → 9; 9 | 0–9 | 0–9 | Yes |
| G2M_MD_001 | LVL1_Q4 | inches | inferred 0 → 6; 6 | direct 0–6 measurement | 0–6 | Yes |
| G2M_MD_001 | LVL1_Q5 | inches | inferred 0 → 7; 7 | direct 0–7 measurement | 0–7 | Yes |
| G2M_MD_001 | LVL1_Q6 | inches | 2 → 8; 6 | object at 2–8 | 0–6 | **No** |
| G2M_MD_001 | LVL1_Q7 | inches | 1 → 6; 5 | object at 1–6 | 0–5 | **No** |
| G2M_MD_001 | LVL1_Q8 | inches | inferred 0 → 10; 10 | direct 0–10 measurement | 0–10 | Yes |
| G2M_MD_001 | LVL1_Q9 | inches | 0 → 3; 3 | 0–3 | 0–3 | Yes |
| G2M_MD_001 | LVL1_Q10 | inches | inferred 0 → 8; 8 | direct 0–8 measurement | 0–8 | Yes |
| G2M_MD_001 | LVL2_Q1 | centimeters | 0 → 8; 8 | 0–8 | 0–8 | Yes |
| G2M_MD_001 | LVL2_Q2 | centimeters | inferred 0 → 5; 5 | direct 0–5 measurement | 0–5 | Yes |
| G2M_MD_001 | LVL2_Q3 | centimeters | inferred 0 → 12; 12 | direct 0–12 measurement | 0–12 | Yes |
| G2M_MD_001 | LVL2_Q4 | centimeters | 0 → 4; 4 | 0–4 | 0–4 | Yes |
| G2M_MD_001 | LVL2_Q5 | centimeters | inferred 0 → 14; 14 | direct 0–14 measurement | 0–14 | Yes |
| G2M_MD_001 | LVL2_Q6 | centimeters | 3 → 10; 7 | object at 3–10 | 0–7 | **No** |
| G2M_MD_001 | LVL2_Q7 | centimeters | 1 → 6; 5 | object at 1–6 | 0–5 | **No** |
| G2M_MD_001 | LVL2_Q8 | centimeters | inferred 0 → 11; 11 | direct 0–11 measurement | 0–11 | Yes |
| G2M_MD_001 | LVL2_Q9 | centimeters | inferred 0 → 6; 6 | direct 0–6 measurement | 0–6 | Yes |
| G2M_MD_001 | LVL2_Q10 | centimeters | 0 → 9; 9 | 0–9 | 0–9 | Yes |
| G2M_MD_001 | MIXED_Q1 | inches | 0 → 5; 5 | 0–5 | 0–5 | Yes |
| G2M_MD_001 | MIXED_Q2 | inches | 0 → 4; 4 | 0–4 | 0–4 | Yes |
| G2M_MD_001 | MIXED_Q3 | centimeters | 0 → 8; 8 | 0–8 | 0–8 | Yes |
| G2M_MD_001 | MIXED_Q4 | centimeters | inferred 0 → 5; 5 | direct 0–5 measurement | 0–5 | Yes |

## Supported structures and normalization

| Structure | Required | Optional/defaults | Meaning and output |
|---|---|---|---|
| Zero-based direct measurement | `unit`, `length` | `start=0`, `end=length` | Object spans zero to the authored known length. `correct_answer` is never read. |
| Zero/off-zero interval | `unit`, start and end aliases | `length=end-start`; structure inferred | Object is positioned at authored endpoints. Length is distance, never an endpoint. |
| Prompt-authored interval (legacy) | `unit`, `length`, unambiguous “starts/begins/lined up … ends/to …” prompt | endpoints parsed from prompt | Preserves current canonical content while metadata is absent. Explicit metadata must agree with the prompt. |
| Endpoint reading | `unit`, `measurement_structure: endpoint-reading`, `endpoint`/end alias | `start=0` | Marks the known endpoint and asks the learner to read it; this is distinct from subtraction. |
| Fractional ruler | either structure above | `tick_interval=0.5`; default `1` | Whole and half-unit ticks. Current content uses whole units only. |

`unit` accepts inch/inches/in and centimeter/centimeters/cm and normalizes to plural labels. Start aliases are `start`, `start_point`, and `from`; end aliases are `end`, `end_point`, `to`, `endpoint`, and legacy `value`. The same keys may be nested under `ruler`, whose values override flat values. `min`/`minimum` defaults to zero. `max`/`maximum` defaults to at least 6 and two ticks beyond the endpoint. `tick_interval`/`tickInterval`/`increment` defaults to 1. The ruler spans min–max; the object spans start–end.

Complete output exposes renderer, render status, normalized start, end, length, unit, structure, bounds, tick interval, individual tick values, and object span as `data-*` geometry metadata. Its image label states only the ruler range, units, and authored endpoints. Its visible caption asks the learner to measure or read the endpoint; neither presentation channel states the computed span.

Invalid output is deterministic `data-renderer="ruler" data-render-status="invalid"`, remains nonblank and accessible, and explains why it refuses to draw. Invalid cases include missing interval endpoints, conflicting aliases or prompt/metadata, inconsistent length, reversed/out-of-range endpoints, unsupported or missing units, and unsupported tick intervals. It never falls back or silently changes the model.
