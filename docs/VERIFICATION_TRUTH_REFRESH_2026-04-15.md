# Verification Truth Refresh — Love / Loyalty / Leadership (2026-04-15)

## Scope
This report is a verification-truth refresh only.
No runtime code, routing, scoring logic, UI behavior, or backend behavior was changed for this phase.

## 1) Current engine status

### Love
- **Engine status:** live and route-backed for first attempt + retake flows.
- **Authored-first / governed-retake:** first attempt resolves to `AUTHORED_BANK_1`; retake resolves to approved generated bank when available and otherwise reports generated-bank unavailable.
- **Generator / validator / artifact / manifest:** generator + validation + promotion review workflow exist and are exercised by tests and artifact outputs (`artifacts/love-banks/*`, promotion manifest present).
- **UI depth status:** deep rendering and attribution continuity are covered by assessment/experience tests.

### Loyalty
- **Engine status:** live and route-backed with canonical scoring metrics and UI messaging.
- **Authored-first / governed-retake:** first attempt uses authored bank; retake is governed via promotion manifest and does not fall back to authored content.
- **Generator / validator / artifact / manifest:** governed generator and validator paths are covered by tests; generated artifact + promotion manifest are present under `artifacts/loyalty-banks/`.
- **UI depth status:** loyalty-native labels/messaging and rendered output permutations are covered.

### Leadership
- **Engine status:** live and route-backed with canonical scoring metrics and deep-dive rendering.
- **Authored-first / governed-retake:** first attempt uses authored bank; retake is governed via promotion manifest and is explicit 409 when no approved generated bank is available.
- **Generator / validator / artifact / manifest:** deterministic generator + validator are covered by tests; generated artifact + promotion manifest are present under `artifacts/leadership-banks/`.
- **UI depth status:** leadership-native deep-dive sections and realistic payload permutations are covered.

## 2) Verification command summary (executed 2026-04-15)

### Targeted passing suites (strong regression protection)
- `tests/archetype-engines/archetype-engines.test.js`:
  - route contracts live for Love/Loyalty/Leadership
  - authored-first + governed-retake lifecycle protections
  - leadership/loyalty first-attempt non-skeleton protections
- `tests/archetype-engines/experience-rendering.test.js`:
  - loyalty and leadership render-path depth checks
- `tests/archetype-engines/loyalty-generator.test.js`:
  - deterministic generation + governed-retake availability guard + malformed payload rejection
- `tests/archetype-engines/leadership-generator.test.js`:
  - deterministic generation + validator acceptance/rejection + governed-retake availability guard

### Broader failing suites
- `node --test tests/*.test.js tests/archetype-engines/*.test.js tests/tap-crm-phase*.test.js`
- Result: **106 tests total, 96 pass, 10 fail**.

#### Failures observed (treated as pre-existing in this truth phase)
1. `tests/archetype-engines/love-bank-generator.test.js`
   - generated bank structural/natural-speech validation failures (multiple option-level assertions).
2. `tests/archetype-engines/love-scoring-audit.test.js`
   - bank-scoped scoring runtime error (`Cannot read properties of undefined (reading 'map')`).
   - distribution/class/pair-balance assertions failing vs expected targets.
3. `tests/tap-crm-phase1.test.js`
   - access status expectations (400/403) mismatching current 409 behavior and allow-case expectation mismatch.
4. `tests/tap-crm-phase2-schema.test.js`
   - schema verification expected clean state assertion mismatch.

## 3) Stale doc audit (conflicts with current repo reality)

1. `archetype-engines/README.md`
   - stale claim: leadership/loyalty are "scoring scaffold" only.
   - current reality: both are route-live with canonical scoring + governed retake controls under test.

2. `docs/SYSTEM_REPORT.md`
   - stale claim: "GARVEY SYSTEM FULLY OPERATIONAL (PHASES 1–11 COMPLETE)" + broad PASS framing.
   - current reality: current broad automated run is **not all-green** (96 pass / 10 fail).

## 4) Recommended single truth source
- **Recommended truth source after this refresh:** `docs/VERIFICATION_TRUTH_REFRESH_2026-04-15.md` (this file).
- Reason: this is the narrow, current-state, command-backed verification snapshot specific to Love/Loyalty/Leadership lifecycle truth and present failing/passing status.

## 5) Known remaining gaps
- Love generator wording/quality validator parity remains failing in current automated suite.
- Love scoring audit distribution assumptions and a bank-scoped runtime-path error remain unresolved.
- Tap CRM phase1/phase2 test expectation drift remains unresolved.
- This phase intentionally performs no refactor/feature/runtime behavior changes; gaps are documented only.

## 6) Runtime change statement
- **Explicit confirmation:** no runtime behavior changed in this phase.
