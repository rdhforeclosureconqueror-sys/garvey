# Bar-model renderer contract and repository audit

## Contract

`bar_model` consumes `equation`, `prompt`, and the normal answer fields. Authors may
disambiguate a structure with `bar_model.structure`, `problem_structure`, or
`problem_type`. Legacy `a`, `b`, `parts`, `total`, and `labels` remain accepted.
The equation is the source of truth: numeric operands are known, `?` is unknown,
and, when an authored equation shows its result, the renderer still treats that
result as unknown because the activity asks the learner to produce it.

| Structure | Inputs | Required visual and labels | Known | Unknown |
| --- | --- | --- | --- | --- |
| part-part-whole / result-unknown addition | `x + y = ?` | one whole over `part 1`, `part 2` | both parts | whole |
| change-unknown | `start + ? = result` | whole over starting part and missing change | start, result | change |
| start-unknown / missing addend | `? + change = result` | whole over missing starting part and change | change, result | start/addend |
| result-unknown subtraction | `whole - change = ?` | whole over amount left and change | whole, change | amount left |
| missing subtrahend | `whole - ? = result` | whole over amount left and missing change | whole, result | change/subtrahend |
| missing minuend | `? - change = result` | missing whole over amount left and change | change, result | whole/minuend |
| compare-more / compare-less | larger minus smaller | larger bar over smaller amount and difference | larger, smaller | difference |
| multi-step | an expression with two or more operations | one labeled bar per operand and one result bar | operands | final result |

Every model has `role="img"` and a complete accessible name containing its
structure, labels, known values, and question mark. Unknown values are rendered
only as `?`; answer fields are never used as display values. Each visual carries
`data-renderer`, `data-structure`, and per-bar `data-quantity` hooks for reusable
validation.

## Repository-wide usage audit (before the fix)

Only two packages select this renderer. Repeated IDs below also occur in exemplar
or mixed-bank copies; the repository search counted every occurrence.

| Package | Activity IDs | Mathematical structure | Expected | Previous representation | Correct? |
| --- | --- | --- | --- | --- | --- |
| `G2M_WP_001` | `LVL1_Q1`, `LVL1_Q4`, `LVL1_Q10`, `MIXED_Q1` | result-unknown addition | two known parts, unknown whole | answer labeled whole plus extra unknown | No |
| `G2M_WP_001` | `LVL1_Q7` | start-unknown addition | known change/whole, unknown start | answer labeled whole plus extra unknown | No |
| `G2M_WP_001` | `LVL2_Q1`, `LVL2_Q4`, `LVL2_Q10`, `MIXED_Q3` | result-unknown subtraction | known whole/change, unknown remainder | answer labeled whole plus extra unknown | No |
| `G2M_WP_001` | `LVL2_Q7` | missing minuend | unknown whole, known change/remainder | answer labeled whole plus extra unknown | No |
| `G2M_WP_001` | `LVL3_Q3`, `LVL3_Q6`, `LVL3_Q9`, `MIXED_Q7` | compare-less/more | known larger/smaller, unknown difference | difference leaked in parts plus extra unknown | No |
| `G2M_WP_001` | `LVL4_Q2`, `LVL4_Q5`, `LVL4_Q8`, `MIXED_Q9` | two-step addition/subtraction | operands and unknown final result | answer labeled whole, incomplete operands, extra unknown | No |
| `G3M_WP_001` | `LVL1_Q1`, `LVL1_Q5`, `LVL1_Q9` | result-unknown addition | two known parts, unknown whole | answer labeled whole plus extra unknown | No |
| `G3M_WP_001` | `LVL2_Q1`, `LVL2_Q5`, `LVL2_Q9`, `LVL3_Q1`, `LVL3_Q5`, `LVL3_Q9`, `LVL4_Q1`, `LVL4_Q5`, `LVL4_Q9`, `MIXED_Q1`, `MIXED_Q5`, `MIXED_Q9` | two-step mixed operations | all operands and unknown final result | answer labeled whole plus extra unknown; operands absent | No |

Synthetic regression fixtures additionally lock the reusable contract for
part-part-whole, change-unknown, missing addend, missing subtrahend, and every
other unknown position even where no current package happens to exercise it.
