# Love Generator Validation Pass — 2026-04-14

## 1) Seed outputs generated
- BANK_A: bank export `artifacts/love-banks/bank_a.generated.json`, audit artifact `artifacts/love-banks/bank_a.audit.json`.
- BANK_B: bank export `artifacts/love-banks/bank_b.generated.json`, audit artifact `artifacts/love-banks/bank_b.audit.json`.
- BANK_C: bank export `artifacts/love-banks/bank_c.generated.json`, audit artifact `artifacts/love-banks/bank_c.audit.json`.

## 2) Audit result summary for each
- **BANK_A**: class counts valid=true; primary counts valid=true; pair spread=0; weighted opportunity keys=RS, AL, EC, AV, ES; schema validity=true.
- **BANK_B**: class counts valid=true; primary counts valid=true; pair spread=2; weighted opportunity keys=RS, AL, EC, AV, ES; schema validity=true.
- **BANK_C**: class counts valid=true; primary counts valid=true; pair spread=0; weighted opportunity keys=RS, AL, EC, AV, ES; schema validity=true.

## 3) Simulation result summary
- **BANK_A**
  - RS-heavy: primary=RS, secondary=AL, hybrid=none, ranks=[1:RS(100), 2:AL(20.19), 3:ES(17.22), 4:AV(16.43), 5:EC(13.21)]
  - AL-heavy: primary=AL, secondary=AV, hybrid=none, ranks=[1:AL(100), 2:AV(18.84), 3:EC(18.4), 4:RS(15.02), 5:ES(14.83)]
  - EC-heavy: primary=EC, secondary=RS, hybrid=none, ranks=[1:EC(100), 2:RS(17.84), 3:AL(16.9), 4:ES(16.75), 5:AV(15.94)]
  - AV-heavy: primary=AV, secondary=EC, hybrid=none, ranks=[1:AV(100), 2:EC(25.94), 3:ES(16.75), 4:AL(14.55), 5:RS(12.21)]
  - ES-heavy: primary=ES, secondary=AL, hybrid=none, ranks=[1:ES(100), 2:AL(21.13), 3:RS(17.84), 4:AV(17.39), 5:EC(12.26)]
  - balanced-mixed: primary=RS, secondary=EC, hybrid=RS-EC, ranks=[1:RS(41.31), 2:EC(40.57), 3:ES(33.49), 4:AL(28.17), 5:AV(24.15)]
- **BANK_B**
  - RS-heavy: primary=RS, secondary=AV, hybrid=none, ranks=[1:RS(100), 2:AV(24.64), 3:AL(19.72), 4:EC(13.24), 5:ES(9.39)]
  - AL-heavy: primary=AL, secondary=AV, hybrid=none, ranks=[1:AL(100), 2:AV(22.75), 3:ES(18.31), 4:EC(16.18), 5:RS(9.86)]
  - EC-heavy: primary=EC, secondary=AL, hybrid=none, ranks=[1:EC(100), 2:AL(23.47), 3:ES(19.25), 4:RS(17.37), 5:AV(10.43)]
  - AV-heavy: primary=AV, secondary=AL, hybrid=none, ranks=[1:AV(100), 2:AL(25.82), 3:ES(19.25), 4:EC(16.67), 5:RS(6.1)]
  - ES-heavy: primary=ES, secondary=AL, hybrid=none, ranks=[1:ES(100), 2:AL(18.78), 3:RS(16.9), 4:EC(16.18), 5:AV(15.17)]
  - balanced-mixed: primary=ES, secondary=RS, hybrid=none, ranks=[1:ES(46.95), 2:RS(35.21), 3:AL(33.8), 4:EC(27.94), 5:AV(23.7)]
- **BANK_C**
  - RS-heavy: primary=RS, secondary=AL, hybrid=none, ranks=[1:RS(100), 2:AL(23), 3:EC(19.34), 4:ES(15.96), 5:AV(15.05)]
  - AL-heavy: primary=AL, secondary=AV, hybrid=none, ranks=[1:AL(100), 2:AV(22.33), 3:ES(20.66), 4:EC(18.4), 5:RS(6.03)]
  - EC-heavy: primary=EC, secondary=AV, hybrid=none, ranks=[1:EC(100), 2:AV(26.21), 3:ES(16.43), 4:AL(13.15), 5:RS(12.56)]
  - AV-heavy: primary=AV, secondary=RS, hybrid=none, ranks=[1:AV(100), 2:RS(26.13), 3:AL(20.66), 4:ES(14.08), 5:EC(10.38)]
  - ES-heavy: primary=ES, secondary=AL, hybrid=none, ranks=[1:ES(100), 2:AL(22.54), 3:RS(19.6), 4:AV(16.99), 5:EC(8.96)]
  - balanced-mixed: primary=RS, secondary=AV, hybrid=RS-AV, ranks=[1:RS(46.73), 2:AV(42.72), 3:EC(36.32), 4:AL(25.35), 5:ES(19.72)]

## 4) Cross-bank stability summary
- **FIXED_PROFILE_ALPHA**: rankingStable=true; primaries=BANK_A:RS, BANK_B:RS, BANK_C:RS.
  - Deltas vs BANK_A: {"BANK_B":{"RS":4.23,"AL":2.35,"EC":1.54,"AV":2.67,"ES":-9.24},"BANK_C":{"RS":6.99,"AL":4.69,"EC":-0.47,"AV":0.04,"ES":-5.95}}.
- **FIXED_PROFILE_BETA**: rankingStable=true; primaries=BANK_A:AV, BANK_B:AV, BANK_C:AV.
  - Deltas vs BANK_A: {"BANK_B":{"RS":-2.34,"AL":-9.39,"EC":2.99,"AV":7.32,"ES":0.15},"BANK_C":{"RS":-0.54,"AL":18.31,"EC":-2.83,"AV":-14.62,"ES":-0.32}}.

## 5) Wording/desirability findings
- Strong: no desirability warnings were emitted by validation in all three generated banks.
- Mechanical: repeated option stems are high (top repeated stems 10-14 repeats), especially “ask for reassurance”, “talk it through”, and “focus on consistent”.
- Rewriting rules needed: diversify option openers, enforce per-bank cap on repeated first-3-word stems, and add synonym rotation for common action verbs.

## 6) Recommendation
- **generator needs wording-rule refinement before promotion**.
