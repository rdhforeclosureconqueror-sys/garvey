# Shared renderer contracts: analog clock and money counting

These contracts apply to the production visual-model registry and every Skill World question card that embeds it. They describe the learner-facing renderer behavior; curriculum content remains independently authored.

## `analog_clock`

### Supported structures

* **Learner reading (default):** an object with `visual_model: "analog_clock"`, integer `hour` from 1–12, and integer `minute` from 0–59. Whole hours, half hours, and arbitrary minutes (including five-minute intervals) are supported. The hour hand advances one half-degree per minute.
* **Known-time illustration:** `presentation_mode: "known_time_illustration"` (or legacy `mode`) with valid `hour`/`minute`, or the existing elapsed-time structure with a `time` string in `h:mm` form and no `hour`/`minute`. This explicitly instructional mode may name the known time because reading it is not the learner’s answer.

Missing, fractional, out-of-range, array, and malformed values are invalid. Invalid input produces deterministic `data-render-status="invalid"` output rather than guessing from `correct_answer`.

### Presentation, accessibility, and leakage rules

Learner-reading output preserves all twelve numerals, the clock face, and correct minute/hour hand geometry. Its visible caption is only “Read the time shown on the clock.” Its accessible description identifies where the long hand points and whether the short hand is at or between numerals; it never formats or states the digital answer. The decorative face is hidden from accessibility APIs so that no duplicate answer-bearing label is exposed. Only explicit known-time illustrations may show and announce their authored time.

## `money_counting`

### Supported structures

`coins` must be a nonempty array. Each entry is either a denomination string or `{ denomination, count }` (legacy `{ coin, count }` is also accepted). Supported denominations are `penny`, `nickel`, `dime`, `quarter`, `half_dollar`, and `dollar`; counts are nonnegative integers. A supplied integer `total_cents` is validation metadata only and must equal the coin sum.

Missing denominations, unknown denominations, negative/fractional counts, malformed/non-array collections, and conflicting or non-integer totals are invalid. Invalid metadata produces deterministic invalid output and never silently substitutes or drops money.

### Presentation, accessibility, and leakage rules

Output preserves authored order/group expansion, denomination names, individual denomination labels (`1¢`, `5¢`, `10¢`, `25¢`, `50¢`, `$1`), and coin count. Visible and accessible instructions say “Count the total value of the coins shown.” Running totals, cumulative labels, `Total shown` captions, and any computed aggregate amount are forbidden before submission. Accessibility may enumerate each coin and its individual denomination, but must not announce their sum.

## Repository audit scope

Canonical Skill World activities select `analog_clock` in the Grade 1 time package, Grade 2 time-and-money package, and Grade 3 measurement/data package; they select `money_counting` in the Grade 2 time-and-money package. Production presentation occurs through the shared registry directly, through mission and drill question cards, and—only for analog clocks—through the Assessment MVP public-stimulus selector and browser renderer. Assessment public payload normalization deliberately replaces even an authored answer-bearing accessibility string with the same hand-position description. Planning files, schemas, reports, and renderer enum declarations select or document renderer names but do not create learner-facing presentation.

### Why the Assessment MVP files are in scope

Changing the Skill World registry alone is insufficient because Assessment MVP does not call that registry. It has an independent production adapter and browser renderer for the same canonical `analog_clock` model:

1. `assessment-mvp/selectAssessmentItems.js` converts a canonical clock question into its public learner stimulus. Before this audit, that adapter generated `accessibility_text` in the form “Analog clock showing h:mm.”
2. `public/assessment-mvp/app.js` normalizes stored/public stimuli and renders the learner-facing clock. Before this audit, both normalization and the browser fallback accepted or generated the same answer-bearing digital-time description.

Those paths exposed the exact answer to assistive technology even after the Skill World renderer was corrected. Their changes are therefore shared presentation-infrastructure fixes for the repository-wide `analog_clock` contract, not assessment-specific instructional behavior. They only replace learner-facing clock descriptions with hand-position descriptions. They do not alter assessment item eligibility or selection, response handling, answer choices, scoring, correctness evaluation, session behavior, or authored curriculum/package content.
